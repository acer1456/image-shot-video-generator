import type { NarrationAudioSegment, NarrationSegment, NarrationTrack, SubtitleCue, SubtitleStyle } from '@/types'
import { DEFAULT_SUBTITLE_STYLE } from '@/types'

// 專案檔 / 自動暫存共用的還原正規化邏輯（useProjectIO 與 useAutosave 各自維護過一份，已合併於此）

export function normalizeSubtitleStyle(value: unknown): SubtitleStyle {
  if (!value || typeof value !== 'object') return DEFAULT_SUBTITLE_STYLE
  const s = value as Record<string, unknown>
  return {
    fontFamily: typeof s.fontFamily === 'string' ? s.fontFamily : DEFAULT_SUBTITLE_STYLE.fontFamily,
    fontSizeRatio: typeof s.fontSizeRatio === 'number' ? s.fontSizeRatio : DEFAULT_SUBTITLE_STYLE.fontSizeRatio,
    shadowEnabled: typeof s.shadowEnabled === 'boolean' ? s.shadowEnabled : DEFAULT_SUBTITLE_STYLE.shadowEnabled,
    shadowBlur: typeof s.shadowBlur === 'number' ? s.shadowBlur : DEFAULT_SUBTITLE_STYLE.shadowBlur,
    shadowOpacity: typeof s.shadowOpacity === 'number' ? s.shadowOpacity : DEFAULT_SUBTITLE_STYLE.shadowOpacity,
    subtitlePosition: s.subtitlePosition && typeof (s.subtitlePosition as Record<string, unknown>).x === 'number'
      ? s.subtitlePosition as { x: number; y: number }
      : DEFAULT_SUBTITLE_STYLE.subtitlePosition,
  }
}

export function normalizeNarrationSegments(value: unknown): NarrationSegment[] {
  if (!Array.isArray(value)) return []
  return (value as Partial<NarrationSegment>[]).map(s => ({
    id: String(s.id ?? crypto.randomUUID()),
    text: String(s.text ?? ''),
    startTime: Number(s.startTime ?? 0),
    duration: Number(s.duration ?? 0),
    samplingRate: s.samplingRate != null ? Number(s.samplingRate) : undefined,
    audioData: undefined,
  }))
}

export function normalizeNarrationAudioSegments(value: unknown, trackId: string, text: string, duration: number): NarrationAudioSegment[] {
  if (Array.isArray(value)) {
    return (value as Partial<NarrationAudioSegment>[]).map(segment => ({
      id: String(segment.id ?? crypto.randomUUID()),
      text: String(segment.text ?? ''),
      startTime: Number(segment.startTime ?? 0),
      duration: Number(segment.duration ?? 0),
      pauseAfterMs: Number(segment.pauseAfterMs ?? 0),
      wordStartIndex: Number(segment.wordStartIndex ?? 0),
      wordEndIndex: Number(segment.wordEndIndex ?? 0),
    }))
  }
  if (duration <= 0) return []
  return [{
    id: `${trackId}-segment-0`,
    text,
    startTime: 0,
    duration,
    pauseAfterMs: 0,
    wordStartIndex: 0,
    wordEndIndex: 0,
  }]
}

export function normalizeNarrationTrack(value: unknown, legacySegments: NarrationSegment[]): NarrationTrack | null {
  if (value && typeof value === 'object') {
    const t = value as Partial<NarrationTrack>
    const id = String(t.id ?? crypto.randomUUID())
    const text = String(t.text ?? '')
    const duration = Number(t.duration ?? 0)
    return {
      id,
      text,
      voice: String(t.voice ?? 'af_heart'),
      speed: Number(t.speed ?? 1),
      pauseIntensity: Math.max(0, Math.min(6, Math.round(Number(t.pauseIntensity ?? 1)))),
      startTime: Number(t.startTime ?? 0),
      duration,
      audioData: undefined,
      samplingRate: t.samplingRate != null ? Number(t.samplingRate) : undefined,
      segments: normalizeNarrationAudioSegments(t.segments, id, text, duration),
      words: Array.isArray(t.words) ? t.words.map(w => ({
        word: String(w.word ?? ''),
        startTime: Number(w.startTime ?? 0),
        duration: Number(w.duration ?? 0),
        segmentId: typeof w.segmentId === 'string' ? w.segmentId : undefined,
      })) : [],
      phonemes: Array.isArray(t.phonemes) ? t.phonemes.map(p => ({
        phoneme: String(p.phoneme ?? ''),
        startTime: Number(p.startTime ?? 0),
        duration: Number(p.duration ?? 0),
        segmentId: typeof p.segmentId === 'string' ? p.segmentId : undefined,
      })) : [],
    }
  }
  if (!legacySegments.length) return null
  const id = crypto.randomUUID()
  const duration = legacySegments.reduce((max, s) => Math.max(max, s.startTime + s.duration), 0)
  return {
    id,
    text: legacySegments.map(s => s.text).join(' '),
    voice: 'af_heart',
    speed: 1,
    pauseIntensity: 1,
    startTime: 0,
    duration,
    audioData: undefined,
    samplingRate: undefined,
    segments: legacySegments.map((segment, index) => ({
      id: segment.id || `${id}-segment-${index}`,
      text: segment.text,
      startTime: segment.startTime,
      duration: segment.duration,
      pauseAfterMs: 0,
      wordStartIndex: 0,
      wordEndIndex: 0,
    })),
    words: [],
    phonemes: [],
  }
}

export function normalizeSubtitleCues(value: unknown, legacySegments: NarrationSegment[], legacyStyle: SubtitleStyle): SubtitleCue[] {
  if (Array.isArray(value)) {
    return (value as Partial<SubtitleCue>[]).map(cue => ({
      id: String(cue.id ?? crypto.randomUUID()),
      narrationId: String(cue.narrationId ?? ''),
      segmentId: typeof cue.segmentId === 'string' ? cue.segmentId : undefined,
      text: String(cue.text ?? ''),
      translation: String(cue.translation ?? ''),
      startTime: Number(cue.startTime ?? 0),
      duration: Number(cue.duration ?? 0),
      style: normalizeSubtitleStyle(cue.style),
      wordStartIndex: Number(cue.wordStartIndex ?? 0),
      wordEndIndex: Number(cue.wordEndIndex ?? 0),
    }))
  }
  return legacySegments.map(s => ({
    id: crypto.randomUUID(),
    narrationId: '',
    segmentId: s.id,
    text: s.text,
    translation: '',
    startTime: s.startTime,
    duration: s.duration,
    style: legacyStyle,
    wordStartIndex: 0,
    wordEndIndex: 0,
  }))
}
