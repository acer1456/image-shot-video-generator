import type { NarrationWordTimestamp } from '@/types'

// wav2vec2 CTC 強制對齊。
//
// 與 Whisper 路徑的根本差異：Whisper 是「先辨識、再把結果跟稿子做序列對齊」，
// 沒對上的字只能內插。CTC 是把**已知的稿子**當成目標序列，用 Viterbi 在聲學
// emission 矩陣上找最佳路徑 —— 每一個字都由聲學證據定位，完全不需要內插。
//
// ponytail: 只用兩條 rolling row + Uint8 backpointer，不存完整 T×L 的 float trellis。
// 5 分鐘旁白 T≈15000、L≈3500，完整 trellis 是 210MB，backpointer 只要 52MB。
// 上限：仍與 T×L 成正比，超長音訊（>10 分鐘）需要改成分段對齊。

export interface CtcVocab {
  /** 字元 → token id（wav2vec2-base-960h 是 A-Z 與 '） */
  charToId: Map<string, number>
  blankId: number
}

export interface CtcAlignResult {
  words: NarrationWordTimestamp[]
  /** 對齊路徑的平均對數機率，越接近 0 越可信 */
  score: number
}

interface TokenSpan {
  wordIndex: number
  tokenId: number
}

/** 把稿子攤成 CTC 目標 token 序列；不在 vocab 的字元（數字、標點）直接略過 */
function buildTargetTokens(scriptWords: string[], vocab: CtcVocab): TokenSpan[] {
  const tokens: TokenSpan[] = []
  scriptWords.forEach((word, wordIndex) => {
    for (const ch of word.toUpperCase()) {
      const tokenId = vocab.charToId.get(ch)
      if (tokenId !== undefined && tokenId !== vocab.blankId) {
        tokens.push({ wordIndex, tokenId })
      }
    }
  })
  return tokens
}

/**
 * Viterbi 強制對齊。
 * @param emissions 攤平的 [numFrames × vocabSize] log 機率
 * @returns 每個 token 的起始 frame，長度等於 tokens.length
 */
export function viterbiAlign(
  emissions: Float32Array,
  numFrames: number,
  vocabSize: number,
  tokens: TokenSpan[],
  blankId: number,
): { startFrame: Int32Array; score: number } {
  const L = tokens.length
  // 狀態 0 是「開頭靜音」哨兵，只吐 blank。少了它，開頭的靜音會被算進 token 0，
  // 導致第一個字永遠回報 frame 0（開頭有前奏時整段字幕就會被往前釘死）。
  const S = L + 1
  const NEG = -1e30
  const em = (t: number, id: number) => emissions[t * vocabSize + id]

  let prev = new Float32Array(S).fill(NEG)
  let cur = new Float32Array(S).fill(NEG)
  // back[t*S + j] = 1 代表在 frame t 由 j-1 前進到 j（j>=1 時即 token j-1 的起點）
  const back = new Uint8Array(numFrames * S)

  prev[0] = em(0, blankId)
  prev[1] = em(0, tokens[0].tokenId)

  for (let t = 1; t < numFrames; t++) {
    const blank = em(t, blankId)
    // 每 frame 最多前進一格，且必須留夠 frame 走完剩下的狀態
    const jMax = Math.min(S - 1, t + 1)
    const jMin = Math.max(0, S - 1 - (numFrames - 1 - t))
    for (let j = jMax; j >= jMin; j--) {
      if (j === 0) { cur[0] = prev[0] <= NEG ? NEG : prev[0] + blank; back[t * S] = 0; continue }
      const tok = em(t, tokens[j - 1].tokenId)
      // 停留：吐 blank，或重複同一個字元（長音會連續吐同字元）
      const stay = prev[j] <= NEG ? NEG : prev[j] + Math.max(blank, tok)
      const advance = prev[j - 1] <= NEG ? NEG : prev[j - 1] + tok
      if (advance > stay) {
        cur[j] = advance
        back[t * S + j] = 1
      } else {
        cur[j] = stay
        back[t * S + j] = 0
      }
    }
    for (let j = 0; j < jMin; j++) cur[j] = NEG
    for (let j = jMax + 1; j < S; j++) cur[j] = NEG
    const swap = prev
    prev = cur
    cur = swap
  }

  // 從最後一個狀態回溯；進入狀態 j 的 frame 就是 token j-1 的起點
  const startFrame = new Int32Array(L)
  let j = S - 1
  for (let t = numFrames - 1; t >= 1 && j >= 1; t--) {
    if (back[t * S + j] === 1) {
      startFrame[j - 1] = t
      j--
    }
  }
  // 走到 frame 0 仍未回溯完，代表剩下的 token 都在 frame 0 起始
  for (let k = j - 1; k >= 0; k--) startFrame[k] = 0

  return { startFrame, score: prev[S - 1] / numFrames }
}

/**
 * 把稿子的每個字對齊到音訊。回傳長度等於 scriptWords，時間單調遞增。
 * 完全沒有可辨識字元的字（例如純數字）會落在前後兩字之間。
 */
export function alignWordsCtc(
  emissions: Float32Array,
  numFrames: number,
  vocabSize: number,
  scriptWords: string[],
  vocab: CtcVocab,
  secondsPerFrame: number,
  totalDuration: number,
): CtcAlignResult {
  if (!scriptWords.length) return { words: [], score: 0 }
  const tokens = buildTargetTokens(scriptWords, vocab)
  if (!tokens.length || tokens.length > numFrames) {
    // 目標比 frame 數還長就無法對齊（音訊太短或稿子不符），退回等分。
    // score 回傳極低值，呼叫端據此警告使用者 —— 等分結果不可當成對齊成功。
    const each = totalDuration / scriptWords.length
    return {
      words: scriptWords.map((word, i) => ({
        word, startTime: i * each, duration: each,
      })),
      score: NEG_SCORE,
    }
  }

  const { startFrame, score } = viterbiAlign(emissions, numFrames, vocabSize, tokens, vocab.blankId)

  // 每個字的起點 = 它第一個 token 的起始 frame
  const wordStart = new Array<number | null>(scriptWords.length).fill(null)
  for (let k = 0; k < tokens.length; k++) {
    const w = tokens[k].wordIndex
    if (wordStart[w] === null) wordStart[w] = startFrame[k] * secondsPerFrame
  }

  // 沒有可辨識字元的字：夾在前後有時間的字之間
  const times = new Array<number>(scriptWords.length)
  let lastKnown = 0
  for (let i = 0; i < scriptWords.length; i++) {
    if (wordStart[i] !== null) { times[i] = wordStart[i]!; lastKnown = times[i] }
    else times[i] = lastKnown
  }
  // 強制單調（Viterbi 保證，但補洞的字可能與後一個同值）
  for (let i = 1; i < times.length; i++) times[i] = Math.max(times[i], times[i - 1])

  const words = scriptWords.map((word, i) => {
    const start = times[i]
    const next = i + 1 < times.length ? times[i + 1] : Math.max(totalDuration, start + 0.05)
    return { word, startTime: start, duration: Math.max(0.05, next - start) }
  })
  return { words, score }
}

const NEG_SCORE = -1e9
