import type { MutableRefObject } from 'react'
import type { NarrationAudioSegment, NarrationTrack, SubtitleCue } from '@/types'
import { parseNarrationSpeechSegments } from '@/hooks/useheadTTS'

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
