// 真實模型的手動端到端檢查（會下載約 450MB、需要數分鐘，故不納入一般測試）：
//   npx tsx src/lib/ctcAlign.probe.mts          # 稿子正確 → score ≈ -0.72
//   WRONG=1 npx tsx src/lib/ctcAlign.probe.mts  # 稿子不符 → score ≈ -2.88
// 用 kokoro（既有依賴）合成已知語音、前置 3 秒靜音，再跑完整 wav2vec2 + Viterbi。
// NarrationSidebar 的警告門檻 -2 就是由這兩個數字定出來的。
// 快速的合成矩陣測試在 ctcAlign.test.ts。
import { AutoProcessor, AutoModelForCTC, AutoTokenizer } from '@huggingface/transformers'
import { KokoroTTS } from 'kokoro-js'
import { alignWordsCtc, type CtcVocab } from './ctcAlign.ts'

const SCRIPT = 'The garden is quiet and the morning light falls softly across the old stone wall'
const LEAD_SILENCE = 3.0   // 開頭插入 3 秒靜音，重現「前面一大段沒放上時間軸」

console.log('用 kokoro 合成真實語音…')
const tts = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', { dtype: 'q8' })
const spoken: any = await tts.generate(SCRIPT, { voice: 'af_heart' })
const src: Float32Array = spoken.audio
const srcRate: number = spoken.sampling_rate
console.log(`合成完成：${(src.length/srcRate).toFixed(2)}s @ ${srcRate}Hz`)

// 線性重取樣到 16k（node 沒有 OfflineAudioContext），並在前面加靜音
const R = 16000
const lead = Math.round(LEAD_SILENCE * R)
const body = Math.round(src.length / srcRate * R)
const audio = new Float32Array(lead + body)
for (let i = 0; i < body; i++) {
  const pos = i * srcRate / R
  const i0 = Math.floor(pos), frac = pos - i0
  audio[lead + i] = src[i0] * (1 - frac) + (src[i0+1] ?? src[i0]) * frac
}
const duration = audio.length / R
console.log(`加上 ${LEAD_SILENCE}s 前導靜音後：${duration.toFixed(2)}s`)

console.log('\n跑 wav2vec2…')
const [processor, model, tokenizer] = await Promise.all([
  AutoProcessor.from_pretrained('Xenova/wav2vec2-base-960h'),
  AutoModelForCTC.from_pretrained('Xenova/wav2vec2-base-960h'),
  AutoTokenizer.from_pretrained('Xenova/wav2vec2-base-960h'),
])
const t2i = (tokenizer as any).model.tokens_to_ids
const charToId = new Map<string, number>()
for (const [tok, id] of t2i) if (tok.length === 1) charToId.set(tok.toUpperCase(), id)
const vocab: CtcVocab = { charToId, blankId: (tokenizer as any).pad_token_id ?? 0 }

const out: any = await model(await processor(audio) as any)
const [, numFrames, vocabSize] = out.logits.dims
const em = out.logits.data.slice() as Float32Array
// log_softmax
for (let t = 0; t < numFrames; t++) {
  const b = t * vocabSize
  let mx = -Infinity
  for (let v = 0; v < vocabSize; v++) if (em[b+v] > mx) mx = em[b+v]
  let s = 0
  for (let v = 0; v < vocabSize; v++) s += Math.exp(em[b+v] - mx)
  const ls = mx + Math.log(s)
  for (let v = 0; v < vocabSize; v++) em[b+v] -= ls
}

const words = (process.env.WRONG ? 'completely different words about elephants dancing on submarines in winter' : SCRIPT).split(' ')
const spf = duration / numFrames
const res = alignWordsCtc(em, numFrames, vocabSize, words, vocab, spf, duration)
console.log(`\nframes=${numFrames}  secondsPerFrame=${spf.toFixed(4)}  score=${res.score.toFixed(3)}`)
console.log('\n對齊結果：')
for (const w of res.words) console.log(`  ${w.startTime.toFixed(2)}s +${w.duration.toFixed(2)}s  ${w.word}`)

// 驗證
const first = res.words[0].startTime
console.log(`\n第一個字 "${res.words[0].word}" = ${first.toFixed(2)}s （前導靜音 ${LEAD_SILENCE}s）`)
console.log(first > LEAD_SILENCE - 0.5 && first < LEAD_SILENCE + 1.0
  ? '✅ 前導靜音正確跳過'
  : `❌ 開頭對齊錯誤：應 ≈${LEAD_SILENCE}s`)
let mono = true
for (let i = 1; i < res.words.length; i++) if (res.words[i].startTime < res.words[i-1].startTime) mono = false
console.log(mono ? '✅ 時間單調遞增' : '❌ 時間非單調')
const last = res.words[res.words.length - 1]
console.log(last.startTime < duration ? '✅ 末字在音訊範圍內' : '❌ 末字超出音訊')
console.log(`\n>>> 真實語音的 score 基準 = ${res.score.toFixed(3)}（用來校準警告門檻）`)
