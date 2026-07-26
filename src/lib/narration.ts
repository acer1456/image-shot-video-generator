import type { MutableRefObject } from 'react'
import type { NarrationAudioSegment, NarrationTrack, SubtitleCue } from '@/types'
import { buildSubtitleCues, parseNarrationSpeechSegments } from '@/hooks/useheadTTS'
import { alignWordsCtc } from '@/lib/ctcAlign'
import type { CtcEmissions } from '@/lib/asr'

const CJK_REGEX = /[㐀-鿿]/

interface NarrationInputLine {
  english: string
  translation: string
}

// ponytail: 用「是否含中日韓字元」判斷行別，不用整段模式偵測；純英文與英中交錯輸入都能直接吃這一條路徑
export function parseNarrationInput(raw: string): { ttsText: string; lines: NarrationInputLine[] } {
  const lines: NarrationInputLine[] = []
  const ttsLines: string[] = []
  let pendingEnglish: string | null = null

  for (const rawLine of raw.split('\n')) {
    const line = rawLine.trim()
    if (!line) { ttsLines.push(''); continue }
    if (CJK_REGEX.test(line)) {
      if (pendingEnglish !== null) {
        lines.push({ english: pendingEnglish, translation: line })
        pendingEnglish = null
      }
      continue
    }
    if (pendingEnglish !== null) lines.push({ english: pendingEnglish, translation: '' })
    pendingEnglish = line
    ttsLines.push(line)
  }
  if (pendingEnglish !== null) lines.push({ english: pendingEnglish, translation: '' })

  return { ttsText: ttsLines.join('\n'), lines }
}

// 每個英文輸入行在 TTS 內部會被切成 1 個以上的語音片段（句尾標點、換行都會強制斷句）
// parseNarrationSpeechSegments 是純函式，單獨對一行呼叫即可還原它在完整文本中會產生的片段數，藉此對齊 track.segments 的順序
export function applyNarrationLineTranslations(
  cues: SubtitleCue[],
  segments: NarrationAudioSegment[],
  lines: NarrationInputLine[],
  pauseIntensity: number,
): SubtitleCue[] {
  let segmentCursor = 0
  const ranges: Array<{ translation: string; startWord: number; endWord: number }> = []
  for (const line of lines) {
    const segCount = parseNarrationSpeechSegments(line.english, pauseIntensity).length
    const group = segments.slice(segmentCursor, segmentCursor + segCount)
    segmentCursor += segCount
    if (!line.translation || !group.length) continue
    ranges.push({
      translation: line.translation,
      startWord: Math.min(...group.map(s => s.wordStartIndex)),
      endWord: Math.max(...group.map(s => s.wordEndIndex)),
    })
  }
  if (!ranges.length) return cues
  return cues.map(cue => {
    const match = ranges.find(r => cue.wordStartIndex >= r.startWord && cue.wordStartIndex <= r.endWord)
    return match ? { ...cue, translation: match.translation } : cue
  })
}

// 上傳音訊路徑：用 wav2vec2 CTC 對已知稿子做強制對齊（每個字都由聲學證據定位，
// 不做內插），再交給 TTS 那條路徑同一個 buildSubtitleCues 產生字幕 ——
// 斷句與外觀因此與生成的旁白完全一致。
// 每行一個 segment（而非整段一塊）：時間軸波形每塊固定 32 條，整段塞一塊會被壓成實心方塊。
// subarray 共用同一份 buffer，不額外複製；encodeAudioB64 逐 index 讀，存檔也安全。
export function buildUploadedNarration(
  raw: string,
  audioData: Float32Array,
  sampleRate: number,
  ctc: CtcEmissions,
): { track: NarrationTrack; cues: SubtitleCue[]; score: number } {
  const { lines } = parseNarrationInput(raw)
  const duration = audioData.length / sampleRate
  const narrationId = crypto.randomUUID()

  // 攤平成一串字，同時記住每個字屬於哪一行（之後回填中文字幕與切 segment 都要用）
  const scriptWords: string[] = []
  const wordLine: number[] = []
  lines.forEach((line, i) => {
    for (const w of line.english.split(/\s+/).filter(Boolean)) {
      scriptWords.push(w)
      wordLine.push(i)
    }
  })

  const { words, score } = alignWordsCtc(
    ctc.emissions, ctc.numFrames, ctc.vocabSize,
    scriptWords, ctc.vocab, ctc.secondsPerFrame, duration,
  )

  // 行邊界 = 該行第一個字的起點；由對齊結果推得，比靜音偵測準
  const lineStart = (i: number) => {
    const k = wordLine.indexOf(i)
    return k === -1 ? duration : words[k]?.startTime ?? duration
  }
  const bounds = lines.map((_, i) => (i === 0 ? 0 : lineStart(i)))
  bounds.push(duration)
  // 強制單調，避免空行或對齊異常造成負長度
  for (let i = 1; i < bounds.length; i++) bounds[i] = Math.max(bounds[i], bounds[i - 1] + 0.05)

  const segments = lines.map((line, i) => ({
    id: crypto.randomUUID(),
    text: line.english || line.translation,
    startTime: bounds[i],
    duration: Math.max(0.2, bounds[i + 1] - bounds[i]),
    audioData: audioData.subarray(
      Math.min(audioData.length, Math.round(bounds[i] * sampleRate)),
      Math.min(audioData.length, Math.round(bounds[i + 1] * sampleRate)),
    ),
    samplingRate: sampleRate,
    pauseAfterMs: 0,
    wordStartIndex: wordLine.indexOf(i),
    wordEndIndex: wordLine.lastIndexOf(i),
  }))

  // 每個字掛上所屬 segment，buildSubtitleCues 會把它帶進 cue.segmentId
  const wordsWithSegment = words.map((w, k) => ({ ...w, segmentId: segments[wordLine[k]]?.id }))

  const track: NarrationTrack = {
    id: narrationId,
    text: raw,
    voice: 'upload',
    speed: 1,
    pauseIntensity: 0,
    startTime: 0,
    duration,
    audioData,
    samplingRate: sampleRate,
    segments,
    words: wordsWithSegment,
    phonemes: [],
  }

  // 直接重用 TTS 的字幕切分：寬度、字數、時長、句末標點規則全部一致
  const cues = buildSubtitleCues(narrationId, wordsWithSegment).map(cue => ({
    ...cue,
    // 該 cue 的第一個字屬於哪一行，就填哪一行的中文（與 TTS 路徑行為一致）
    translation: lines[wordLine[cue.wordStartIndex]]?.translation ?? '',
  }))

  return { track, cues, score }
}

// 已有字幕時：只放入音訊、不做辨識也不動字幕。
// segment 邊界沿用現有字幕的起訖，波形密度因此與對齊路徑一致（而非整段一塊壓成實心）。
export function buildAudioOnlyNarration(
  raw: string,
  audioData: Float32Array,
  sampleRate: number,
  cues: SubtitleCue[],
): NarrationTrack {
  const duration = audioData.length / sampleRate
  // 用字幕起始時間當切點；沒有字幕就整段一塊
  const starts = [...new Set(cues.map(c => c.startTime))].sort((a, b) => a - b)
  const bounds = (starts[0] ?? 0) > 0 ? [0, ...starts] : (starts.length ? starts : [0])
  bounds.push(duration)
  for (let i = 1; i < bounds.length; i++) bounds[i] = Math.max(bounds[i], bounds[i - 1] + 0.05)

  return {
    id: crypto.randomUUID(),
    text: raw,
    voice: 'upload',
    speed: 1,
    pauseIntensity: 0,
    startTime: 0,
    duration,
    audioData,
    samplingRate: sampleRate,
    segments: bounds.slice(0, -1).map((start, i) => ({
      id: crypto.randomUUID(),
      text: '',
      startTime: start,
      duration: Math.max(0.2, bounds[i + 1] - start),
      audioData: audioData.subarray(
        Math.min(audioData.length, Math.round(start * sampleRate)),
        Math.min(audioData.length, Math.round(bounds[i + 1] * sampleRate)),
      ),
      samplingRate: sampleRate,
      pauseAfterMs: 0,
      wordStartIndex: 0,
      wordEndIndex: 0,
    })),
    words: [],
    phonemes: [],
  }
}

/**
 * 整體平移所有字幕（正值＝延後），用來一次校正系統性偏移，不必逐行拖拉。
 * 夾在「最早的字幕不早於 0」這個下限：夾的是 delta 而不是各別 cue，
 * 所以句距永遠不變、滑桿來回拖曳可完全還原。
 * 回傳實際套用的位移量，呼叫端據此同步滑桿位置。
 */
export function shiftSubtitleCues(
  cues: SubtitleCue[],
  delta: number,
): { cues: SubtitleCue[]; applied: number } {
  if (!delta || !cues.length) return { cues, applied: 0 }
  const minStart = Math.min(...cues.map(cue => cue.startTime))
  const applied = Math.max(delta, -minStart)
  if (!applied) return { cues, applied: 0 }
  return { cues: cues.map(cue => ({ ...cue, startTime: cue.startTime + applied })), applied }
}

export function getActiveSubtitleCue(cues: SubtitleCue[], time: number): SubtitleCue | null {
  return cues.find(cue => time >= cue.startTime && time < cue.startTime + cue.duration) ?? null
}

export function getSubtitleRenderText(cue: SubtitleCue | null): string {
  if (!cue) return ''
  const main = cue.text.trim()
  const sub = cue.translation.trim()
  if (main && sub) return `${main}\n${sub}`
  return main || sub
}

export function getNarrationSampleRate(track: NarrationTrack | null): number | null {
  if (!track) return null
  return track.samplingRate ?? track.segments.find(segment => segment.samplingRate)?.samplingRate ?? null
}

export function getNarrationDuration(track: NarrationTrack | null): number {
  if (!track) return 0
  const segmentDuration = track.segments.reduce(
    (max, segment) => Math.max(max, segment.startTime + segment.duration),
    0,
  )
  return Math.max(track.duration, segmentDuration)
}

export function hasNarrationAudio(track: NarrationTrack | null): boolean {
  if (!track) return false
  const hasSegments = track.segments.some(segment => !!segment.audioData && !!(segment.samplingRate ?? track.samplingRate))
  return hasSegments || (!!track.audioData && !!track.samplingRate && track.duration > 0)
}

export function createNarrationMixdown(track: NarrationTrack): { audioData: Float32Array; sampleRate: number } | null {
  const sampleRate = getNarrationSampleRate(track)
  if (!sampleRate || !hasNarrationAudio(track)) return null
  const endTime = track.startTime + getNarrationDuration(track)
  const totalFrames = Math.max(1, Math.ceil(endTime * sampleRate))
  const audioData = new Float32Array(totalFrames)
  const segmentAudio = track.segments.filter(segment => segment.audioData && (segment.samplingRate ?? sampleRate) === sampleRate)
  if (segmentAudio.length) {
    for (const segment of segmentAudio) {
      const startFrame = Math.max(0, Math.round((track.startTime + segment.startTime) * sampleRate))
      const src = segment.audioData!
      const count = Math.min(src.length, totalFrames - startFrame)
      for (let i = 0; i < count; i++) audioData[startFrame + i] += src[i]
    }
    for (let i = 0; i < totalFrames; i++) {
      audioData[i] = Math.max(-1, Math.min(1, audioData[i]))
    }
  } else if (track.audioData && track.samplingRate) {
    const startFrame = Math.max(0, Math.round(track.startTime * track.samplingRate))
    const count = Math.min(track.audioData.length, totalFrames - startFrame)
    if (count > 0) audioData.set(track.audioData.subarray(0, count), startFrame)
  }
  return { audioData, sampleRate }
}

export function scheduleNarrationAudio(
  track: NarrationTrack | null,
  fromTime: number,
  ctxRef: MutableRefObject<AudioContext | null>,
  sourcesRef: MutableRefObject<AudioBufferSourceNode[]>,
) {
  for (const src of sourcesRef.current) { try { src.stop() } catch { /* already stopped */ } }
  sourcesRef.current = []
  if (!track || !hasNarrationAudio(track)) return
  if (track.startTime + getNarrationDuration(track) <= fromTime) return

  if (!ctxRef.current || ctxRef.current.state === 'closed') {
    ctxRef.current = new AudioContext()
  }
  const ctx = ctxRef.current
  const segmentAudio = track.segments.filter(segment => segment.audioData && !!(segment.samplingRate ?? track.samplingRate))
  if (segmentAudio.length) {
    for (const segment of segmentAudio) {
      const samplingRate = segment.samplingRate ?? track.samplingRate!
      const segmentEnd = track.startTime + segment.startTime + segment.duration
      if (segmentEnd <= fromTime) continue
      const buffer = ctx.createBuffer(1, segment.audioData!.length, samplingRate)
      buffer.copyToChannel(segment.audioData!, 0)
      const source = ctx.createBufferSource()
      source.buffer = buffer
      source.connect(ctx.destination)
      const delay = track.startTime + segment.startTime - fromTime
      if (delay >= 0) {
        source.start(ctx.currentTime + delay)
      } else {
        const offset = Math.min(-delay, segment.duration - 0.01)
        source.start(ctx.currentTime, Math.max(0, offset))
      }
      sourcesRef.current.push(source)
    }
    return
  }

  if (!track.audioData || !track.samplingRate) return
  const buffer = ctx.createBuffer(1, track.audioData.length, track.samplingRate)
  buffer.copyToChannel(track.audioData, 0)
  const source = ctx.createBufferSource()
  source.buffer = buffer
  source.connect(ctx.destination)
  const delay = track.startTime - fromTime
  if (delay >= 0) source.start(ctx.currentTime + delay)
  else source.start(ctx.currentTime, Math.max(0, Math.min(-delay, track.duration - 0.01)))
  sourcesRef.current.push(source)
}

export function stopNarrationAudio(sourcesRef: MutableRefObject<AudioBufferSourceNode[]>) {
  for (const src of sourcesRef.current) { try { src.stop() } catch { /* already stopped */ } }
  sourcesRef.current = []
}
