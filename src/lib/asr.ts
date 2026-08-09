import type { CtcVocab } from '@/lib/ctcAlign'

// wav2vec2 CTC 聲學模型，只取每個 frame 的字元機率（emission 矩陣），不做辨識解碼。
// 對齊由 ctcAlign.ts 用已知稿子做 Viterbi 完成 —— 每個字都由聲學證據定位，不需內插。
// @huggingface/transformers 已是既有依賴（kokoro-js 也用它），不新增套件。
const CTC_MODEL = 'Xenova/wav2vec2-base-960h'

/** wav2vec2 要求 16kHz 單聲道；直接餵原始取樣率會靜默產生錯誤的對齊 */
const TARGET_SAMPLE_RATE = 16000

/** 一次送進模型的最長秒數。太長會爆記憶體；分段之間直接接續 frame。 */
const SEGMENT_SECONDS = 60

export interface CtcEmissions {
  /** 攤平的 [numFrames × vocabSize] log 機率 */
  emissions: Float32Array
  numFrames: number
  vocabSize: number
  secondsPerFrame: number
  vocab: CtcVocab
}

interface Loaded {
  processor: (audio: Float32Array) => Promise<Record<string, unknown>>
  model: (inputs: Record<string, unknown>) => Promise<{ logits: { dims: number[]; data: Float32Array } }>
  vocab: CtcVocab
}

let loadedPromise: Promise<Loaded> | null = null

async function getModel(onProgress?: (ratio: number) => void): Promise<Loaded> {
  if (loadedPromise) return loadedPromise
  loadedPromise = (async () => {
    const { AutoProcessor, AutoModelForCTC, AutoTokenizer } = await import('@huggingface/transformers')
    const progress_callback = (p: { status?: string; progress?: number }) => {
      if (p.status === 'progress' && typeof p.progress === 'number') onProgress?.(p.progress / 100)
    }
    const device = 'gpu' in navigator ? 'webgpu' : 'wasm'
    const [processor, model, tokenizer] = await Promise.all([
      AutoProcessor.from_pretrained(CTC_MODEL, { progress_callback }),
      AutoModelForCTC.from_pretrained(CTC_MODEL, { device, progress_callback }),
      AutoTokenizer.from_pretrained(CTC_MODEL, { progress_callback }),
    ])
    // wav2vec2 的 tokenizer 是字元級，vocab 只有大寫 A-Z、'、|、<pad> 等 32 項。
    // 這裡取的是 tokenizer 內部結構，版本升級可能改路徑 —— 取不到時必須明確失敗，
    // 不能讓 charToId 是空的：那會讓對齊靜默退回等分，正是先前被否決的結果。
    const tokensToIds = (tokenizer as unknown as { model?: { tokens_to_ids?: Map<string, number> } }).model?.tokens_to_ids
    const charToId = new Map<string, number>()
    if (tokensToIds) {
      for (const [token, id] of tokensToIds) {
        if (token.length === 1) charToId.set(token.toUpperCase(), id)
      }
    }
    const hasAlphabet = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'].every(c => charToId.has(c))
    if (!hasAlphabet) throw new Error('無法從 tokenizer 取得 CTC 字元表，對齊中止')
    const blankId = (tokenizer as unknown as { pad_token_id?: number }).pad_token_id ?? 0
    return {
      processor: processor as unknown as Loaded['processor'],
      model: model as unknown as Loaded['model'],
      vocab: { charToId, blankId },
    }
  })()
  try {
    return await loadedPromise
  } catch (err) {
    loadedPromise = null  // 允許重試
    throw err
  }
}

/** 重取樣到 16kHz 單聲道 */
export async function resampleTo16k(audioData: Float32Array, sampleRate: number): Promise<Float32Array> {
  if (sampleRate === TARGET_SAMPLE_RATE) return audioData
  const frames = Math.max(1, Math.round((audioData.length / sampleRate) * TARGET_SAMPLE_RATE))
  const offline = new OfflineAudioContext(1, frames, TARGET_SAMPLE_RATE)
  const source = offline.createBufferSource()
  const buffer = offline.createBuffer(1, audioData.length, sampleRate)
  buffer.copyToChannel(audioData, 0)
  source.buffer = buffer
  source.connect(offline.destination)
  source.start()
  const rendered = await offline.startRendering()
  return rendered.getChannelData(0).slice()
}

/** 就地取 log_softmax（模型輸出是未正規化的 logits） */
export function logSoftmaxInPlace(data: Float32Array, numFrames: number, vocabSize: number) {
  for (let t = 0; t < numFrames; t++) {
    const base = t * vocabSize
    let max = -Infinity
    for (let v = 0; v < vocabSize; v++) if (data[base + v] > max) max = data[base + v]
    let sum = 0
    for (let v = 0; v < vocabSize; v++) sum += Math.exp(data[base + v] - max)
    const logSum = max + Math.log(sum)
    for (let v = 0; v < vocabSize; v++) data[base + v] -= logSum
  }
}

/**
 * 產生整段音訊的 CTC emission 矩陣。
 * 模型第一次使用會下載（約 100MB），之後由瀏覽器快取。
 */
export async function getCtcEmissions(
  audioData: Float32Array,
  sampleRate: number,
  onProgress?: (stage: 'model' | 'analyze', ratio: number) => void,
): Promise<CtcEmissions> {
  const { processor, model, vocab } = await getModel(r => onProgress?.('model', r))
  onProgress?.('analyze', 0)
  const audio = await resampleTo16k(audioData, sampleRate)

  // 分段推論，避免長音訊一次佔用過多記憶體
  const segmentSamples = SEGMENT_SECONDS * TARGET_SAMPLE_RATE
  const parts: Array<{ data: Float32Array; frames: number }> = []
  let vocabSize = 0
  for (let offset = 0; offset < audio.length; offset += segmentSamples) {
    const slice = audio.subarray(offset, Math.min(audio.length, offset + segmentSamples))
    const inputs = await processor(slice)
    const output = await model(inputs)
    const [, frames, vSize] = output.logits.dims
    vocabSize = vSize
    const data = output.logits.data.slice() as Float32Array
    logSoftmaxInPlace(data, frames, vSize)
    parts.push({ data, frames })
    onProgress?.('analyze', Math.min(1, (offset + segmentSamples) / audio.length))
  }

  const numFrames = parts.reduce((a, p) => a + p.frames, 0)
  if (!numFrames || !vocabSize) throw new Error('CTC 模型未回傳有效輸出')
  const emissions = new Float32Array(numFrames * vocabSize)
  let cursor = 0
  for (const part of parts) {
    emissions.set(part.data.subarray(0, part.frames * vocabSize), cursor)
    cursor += part.frames * vocabSize
  }

  return {
    emissions,
    numFrames,
    vocabSize,
    // 由實際 frame 數反推，不寫死 20ms（不同模型的 conv stride 可能不同）
    secondsPerFrame: audio.length / TARGET_SAMPLE_RATE / numFrames,
    vocab,
  }
}
