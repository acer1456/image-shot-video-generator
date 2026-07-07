import { useCallback, useEffect, useRef, useState } from 'react'
import type { NarrationAudioSegment, NarrationPhonemeTimestamp, NarrationTrack, NarrationWordTimestamp, SubtitleCue } from '@/types'
import { DEFAULT_SUBTITLE_STYLE } from '@/types'
import { OUTPUT_W } from '@/lib/utils'

const HEADTTS_VERSION = '1.3.0'
const HEADTTS_BASE = `https://cdn.jsdelivr.net/npm/@met4citizen/headtts@${HEADTTS_VERSION}`
const HEADTTS_MODULE_URL = `${HEADTTS_BASE}/+esm`
const HEADTTS_WORKER_URL = `${HEADTTS_BASE}/modules/worker-tts.mjs`
const HEADTTS_DICTIONARY_URL = `${HEADTTS_BASE}/dictionaries/`

export const HEADTTS_VOICES = [
  { value: 'af_heart', label: 'Heart（女聲・溫暖）' },
  { value: 'af_sky', label: 'Sky（女聲・明亮）' },
  { value: 'af_bella', label: 'Bella（女聲・優雅）' },
  { value: 'af_sarah', label: 'Sarah（女聲）' },
  { value: 'af_nova', label: 'Nova（女聲）' },
  { value: 'af_nicole', label: 'Nicole（女聲）' },
  { value: 'am_adam', label: 'Adam（男聲）' },
  { value: 'am_michael', label: 'Michael（男聲）' },
  { value: 'am_echo', label: 'Echo（男聲）' },
  { value: 'am_liam', label: 'Liam（男聲）' },
  { value: 'bf_emma', label: 'Emma（英式女聲）' },
  { value: 'bf_isabella', label: 'Isabella（英式女聲）' },
  { value: 'bm_george', label: 'George（英式男聲）' },
  { value: 'bm_lewis', label: 'Lewis（英式男聲）' },
]

type HeadTTSMessage = {
  type: 'audio' | 'error'
  data?: {
    audio?: AudioBuffer
    words?: string[]
    wtimes?: number[]
    wdurations?: number[]
    phonemes?: string[]
    vtimes?: number[]
    vdurations?: number[]
    error?: string
  }
}

type HeadTTSInstance = {
  connect: (settings?: unknown, onprogress?: (event: ProgressEvent) => void) => Promise<void>
  setup: (data: { voice?: string; language?: string; speed?: number; audioEncoding?: 'wav' | 'pcm' }) => Promise<void>
  synthesize: (data: { input: string; voice?: string; language?: string; speed?: number; audioEncoding?: 'wav' | 'pcm' }) => Promise<HeadTTSMessage[]>
  clear: () => void
  ww?: Worker | null
  ws?: WebSocket | null
  rest?: unknown
  isConnected?: boolean
  isConnecting?: boolean
  settings?: {
    audioCtx?: AudioContext | null
  }
}

type Status =
  | { phase: 'idle'; message: string; progress: number }
  | { phase: 'loading'; message: string; progress: number }
  | { phase: 'generating'; message: string; progress: number }
  | { phase: 'error'; message: string; progress: number }

export interface HeadTTSResult {
  track: NarrationTrack
  subtitleCues: SubtitleCue[]
}

function concatFloat32(parts: Float32Array[]) {
  const total = parts.reduce((sum, part) => sum + part.length, 0)
  const out = new Float32Array(total)
  let offset = 0
  for (const part of parts) {
    out.set(part, offset)
    offset += part.length
  }
  return out
}

function cloneStyle() {
  return {
    ...DEFAULT_SUBTITLE_STYLE,
    subtitlePosition: { ...DEFAULT_SUBTITLE_STYLE.subtitlePosition },
  }
}

function wordEndsSentence(word: string) {
  return /[.!?;:]$/.test(word.trim())
}

export function clampPauseIntensity(value: number) {
  return Math.max(0, Math.min(6, Math.round(value)))
}

const PAUSE_PRESETS = [
  { comma: 0, sentence: 0, line: 0, paragraph: 0 },
  { comma: 0, sentence: 120, line: 220, paragraph: 360 },
  { comma: 60, sentence: 200, line: 360, paragraph: 560 },
  { comma: 100, sentence: 280, line: 500, paragraph: 760 },
  { comma: 140, sentence: 360, line: 650, paragraph: 950 },
  { comma: 190, sentence: 470, line: 820, paragraph: 1200 },
  { comma: 240, sentence: 600, line: 1050, paragraph: 1500 },
]

type SpeechSegment = {
  text: string
  pauseAfterMs: number
}

function normalizePauseMs(value: number) {
  return Math.max(0, Math.min(5000, Math.round(value)))
}

function pushSpeechSegment(segments: SpeechSegment[], text: string, pauseAfterMs: number) {
  const normalized = text.replace(/\s+/g, ' ').trim()
  const pause = normalizePauseMs(pauseAfterMs)
  if (!normalized) {
    const last = segments[segments.length - 1]
    if (last) last.pauseAfterMs = Math.max(last.pauseAfterMs, pause)
    return
  }
  segments.push({ text: normalized, pauseAfterMs: pause })
}

export function parseNarrationSpeechSegments(text: string, pauseIntensity: number): SpeechSegment[] {
  const preset = PAUSE_PRESETS[clampPauseIntensity(pauseIntensity)]
  const segments: SpeechSegment[] = []
  let buffer = ''

  for (let i = 0; i < text.length; i++) {
    const manualPause = text.slice(i).match(/^\[pause\s+(\d{1,5})\]/i)
    if (manualPause) {
      pushSpeechSegment(segments, buffer, Number(manualPause[1]))
      buffer = ''
      i += manualPause[0].length - 1
      continue
    }

    const char = text[i]
    if (char === '\n') {
      let newlineCount = 1
      while (text[i + 1] === '\n') {
        newlineCount += 1
        i += 1
      }
      const pause = newlineCount >= 2 ? preset.paragraph : preset.line
      pushSpeechSegment(segments, buffer, pause)
      buffer = ''
      continue
    }

    buffer += char
    const pause =
      /[,:;]/.test(char) ? preset.comma :
      /[.!?]/.test(char) ? preset.sentence :
      0
    const shouldSplit = pause > 0 || /[.!?]/.test(char)
    if (shouldSplit) {
      pushSpeechSegment(segments, buffer, pause)
      buffer = ''
    }
  }

  pushSpeechSegment(segments, buffer, 0)
  if (!segments.length) {
    const fallback = text.replace(/\s+/g, ' ').trim()
    if (fallback) segments.push({ text: fallback, pauseAfterMs: 0 })
  }
  return segments
}

function createSilence(ms: number, samplingRate: number) {
  const samples = Math.round(ms / 1000 * samplingRate)
  return samples > 0 ? new Float32Array(samples) : null
}

let measureCtx: CanvasRenderingContext2D | null = null

function getSubtitleMeasureContext() {
  if (measureCtx) return measureCtx
  const canvas = document.createElement('canvas')
  canvas.width = OUTPUT_W
  canvas.height = 1
  measureCtx = canvas.getContext('2d')
  return measureCtx
}

function fitsSubtitleWidth(text: string) {
  const ctx = getSubtitleMeasureContext()
  if (!ctx) return text.length <= 34
  const fontSize = Math.round(OUTPUT_W * DEFAULT_SUBTITLE_STYLE.fontSizeRatio)
  const sidePadding = Math.round(OUTPUT_W * 0.06)
  ctx.font = `700 ${fontSize}px ${DEFAULT_SUBTITLE_STYLE.fontFamily}`
  return ctx.measureText(text).width <= OUTPUT_W - sidePadding * 2
}

function buildSubtitleCues(narrationId: string, words: NarrationWordTimestamp[]): SubtitleCue[] {
  const cues: SubtitleCue[] = []
  const maxWords = 3.5
  const maxDuration = 3.2
  let startIndex = 0
  let textWords: string[] = []

  const flush = (endIndex: number) => {
    if (!textWords.length) return
    const first = words[startIndex]
    const last = words[endIndex]
    const startTime = first.startTime
    const endTime = last.startTime + last.duration
    cues.push({
      id: crypto.randomUUID(),
      narrationId,
      segmentId: first.segmentId,
      text: textWords.join(' ').replace(/\s+([,.!?;:])/g, '$1'),
      translation: '',
      startTime,
      duration: Math.max(0.2, endTime - startTime),
      style: cloneStyle(),
      wordStartIndex: startIndex,
      wordEndIndex: endIndex,
    })
    textWords = []
    startIndex = endIndex + 1
  }

  for (let i = 0; i < words.length; i++) {
    const word = words[i].word.trim()
    if (!word) {
      if (!textWords.length) startIndex = i + 1
      continue
    }
    const candidateWords = [...textWords, word]
    const candidateText = candidateWords.join(' ')
    if (textWords.length && !fitsSubtitleWidth(candidateText)) {
      flush(i - 1)
    }
    textWords.push(word)
    const currentFirst = words[startIndex]
    const elapsed = words[i].startTime + words[i].duration - currentFirst.startTime
    const shouldBreak =
      textWords.length >= maxWords ||
      elapsed >= maxDuration ||
      wordEndsSentence(word)
    if (shouldBreak) flush(i)
  }
  if (textWords.length) flush(words.length - 1)
  return cues
}

export function useheadTTS() {
  const headttsRef = useRef<HeadTTSInstance | null>(null)
  const loadedVoiceRef = useRef<string | null>(null)
  const connectedRef = useRef(false)
  const generatingRef = useRef(false)
  const [status, setStatus] = useState<Status>({ phase: 'idle', message: '', progress: 0 })

  const releaseHeadTTS = useCallback(() => {
    const headtts = headttsRef.current
    headttsRef.current = null
    loadedVoiceRef.current = null
    connectedRef.current = false
    if (!headtts) return
    try {
      headtts.clear()
    } catch {
      // Best-effort cleanup; generation errors are reported by generate().
    }
    try {
      headtts.ww?.terminate()
    } catch {
      // The worker may already have stopped after an inference error.
    }
    try {
      headtts.ws?.close()
    } catch {
      // The socket may already be closed.
    }
    const audioCtx = headtts.settings?.audioCtx
    if (audioCtx && audioCtx.state !== 'closed') {
      void audioCtx.close().catch(() => undefined)
    }
    headtts.ww = null
    headtts.ws = null
    headtts.rest = null
    if (headtts.settings) headtts.settings.audioCtx = null
    headtts.isConnected = false
    headtts.isConnecting = false
  }, [])

  const getHeadTTS = useCallback(async (voice: string, speed: number) => {
    // 實例是以特定 voice 預載建立的；換聲音時重建，同聲音則重用（免重新下載模型）
    if (headttsRef.current && loadedVoiceRef.current !== voice) {
      releaseHeadTTS()
    }
    if (!headttsRef.current) {
      setStatus({ phase: 'loading', message: '載入 HeadTTS…', progress: 0 })
      const moduleUrl = HEADTTS_MODULE_URL
      const mod = await import(/* @vite-ignore */ moduleUrl) as { HeadTTS: new (settings: unknown) => HeadTTSInstance }
      headttsRef.current = new mod.HeadTTS({
        endpoints: ['webgpu', 'wasm'],
        dtypeWebgpu: 'fp32',
        dtypeWasm: 'q4',
        languages: ['en-us'],
        voices: [voice],
        splitSentences: true,
        splitLength: 420,
        defaultVoice: voice,
        defaultLanguage: 'en-us',
        defaultSpeed: 1,
        defaultAudioEncoding: 'wav',
        workerModule: HEADTTS_WORKER_URL,
        dictionaryURL: HEADTTS_DICTIONARY_URL,
      })
      loadedVoiceRef.current = voice
    }

    if (!connectedRef.current) {
      await headttsRef.current.connect(null, event => {
        const progress = event.lengthComputable ? Math.round(event.loaded / event.total * 100) : 15
        setStatus({ phase: 'loading', message: '載入 HeadTTS 模型…', progress })
      })
      connectedRef.current = true
    }

    await headttsRef.current.setup({
      voice,
      language: 'en-us',
      speed,
      audioEncoding: 'wav',
    })

    return headttsRef.current
  }, [releaseHeadTTS])

  useEffect(() => () => {
    releaseHeadTTS()
  }, [releaseHeadTTS])

  const generate = useCallback(async (text: string, voice: string, speed = 1, pauseIntensity = 1): Promise<HeadTTSResult> => {
    if (generatingRef.current) throw new Error('HeadTTS 正在生成中')
    generatingRef.current = true
    try {
      const trimmed = text.trim()
      if (!trimmed) throw new Error('請先輸入旁白內容')
      const normalizedPauseIntensity = clampPauseIntensity(pauseIntensity)
      const speechSegments = parseNarrationSpeechSegments(trimmed, normalizedPauseIntensity)
      setStatus({ phase: 'generating', message: '生成旁白語音…', progress: 0 })
      const headtts = await getHeadTTS(voice, speed)

      const segments: NarrationAudioSegment[] = []
      const words: NarrationWordTimestamp[] = []
      const phonemes: NarrationPhonemeTimestamp[] = []
      let samplingRate = 24000
      let offset = 0

      for (let segmentIndex = 0; segmentIndex < speechSegments.length; segmentIndex++) {
        const speechSegment = speechSegments[segmentIndex]
        const segmentId = crypto.randomUUID()
        const segmentStartTime = offset
        const segmentAudioParts: Float32Array[] = []
        const wordStartIndex = words.length
        const messages = await headtts.synthesize({
          input: speechSegment.text,
          voice,
          language: 'en-us',
          speed,
          audioEncoding: 'wav',
        })

        for (const message of messages) {
          if (message.type === 'error') {
            throw new Error(message.data?.error || 'HeadTTS 生成失敗')
          }
          const audio = message.data?.audio
          if (!audio) continue
          const channel = audio.getChannelData(0)
          segmentAudioParts.push(new Float32Array(channel))
          samplingRate = audio.sampleRate

          const rawWords = message.data?.words ?? []
          const wtimes = message.data?.wtimes ?? []
          const wdurations = message.data?.wdurations ?? []
          rawWords.forEach((word, index) => {
            words.push({
              word: word.trim(),
              startTime: offset + (wtimes[index] ?? 0) / 1000,
              duration: Math.max(0.03, (wdurations[index] ?? 80) / 1000),
              segmentId,
            })
          })

          const rawPhonemes = message.data?.phonemes ?? []
          const vtimes = message.data?.vtimes ?? []
          const vdurations = message.data?.vdurations ?? []
          rawPhonemes.forEach((phoneme, index) => {
            phonemes.push({
              phoneme,
              startTime: offset + (vtimes[index] ?? 0) / 1000,
              duration: Math.max(0.01, (vdurations[index] ?? 40) / 1000),
              segmentId,
            })
          })

          offset += audio.duration
        }

        const segmentDuration = Math.max(0, offset - segmentStartTime)
        if (segmentDuration > 0) {
          const segmentAudioData = concatFloat32(segmentAudioParts)
          segments.push({
            id: segmentId,
            text: speechSegment.text,
            startTime: segmentStartTime,
            duration: segmentDuration,
            audioData: segmentAudioData,
            samplingRate,
            pauseAfterMs: speechSegment.pauseAfterMs,
            wordStartIndex,
            wordEndIndex: words.length - 1,
          })
        }

        const silence = createSilence(speechSegment.pauseAfterMs, samplingRate)
        if (silence) {
          offset += silence.length / samplingRate
        }

        setStatus({
          phase: 'generating',
          message: `生成旁白語音… ${segmentIndex + 1}/${speechSegments.length}`,
          progress: Math.min(95, Math.round((segmentIndex + 1) / speechSegments.length * 95)),
        })
      }

      if (!segments.length) throw new Error('HeadTTS 沒有回傳音訊')

      const narrationId = crypto.randomUUID()
      const duration = segments.reduce((max, segment) => Math.max(max, segment.startTime + segment.duration), 0)
      const track: NarrationTrack = {
        id: narrationId,
        text: trimmed,
        voice,
        speed,
        pauseIntensity: normalizedPauseIntensity,
        startTime: 0,
        duration,
        audioData: undefined,
        samplingRate,
        segments,
        words,
        phonemes,
      }

      const subtitleCues = buildSubtitleCues(narrationId, words)
      setStatus({ phase: 'idle', message: '', progress: 100 })
      return { track, subtitleCues }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'HeadTTS 生成失敗'
      setStatus({ phase: 'error', message, progress: 0 })
      // 出錯時 worker 狀態不可信，整組釋放；成功時保留實例供下次重用
      releaseHeadTTS()
      throw error
    } finally {
      generatingRef.current = false
    }
  }, [getHeadTTS, releaseHeadTTS])

  const cancel = useCallback(() => {
    generatingRef.current = false
    releaseHeadTTS()
    setStatus({ phase: 'idle', message: '', progress: 0 })
  }, [releaseHeadTTS])

  return { generate, cancel, status, voices: HEADTTS_VOICES }
}
