import { useCallback, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import { normalizePoint, type AppStore } from '@/hooks/useAppStore'
import type { CameraPoint, ActiveTab, NarrationAudioSegment, NarrationSegment, NarrationTrack, SubtitleCue, SubtitleStyle } from '@/types'
import { DEFAULT_SUBTITLE_STYLE } from '@/types'
import { OUTPUT_W, OUTPUT_H, clamp, normalizeProjectName, sanitizeFileName, getTodayString } from '@/lib/utils'

interface UseProjectIOOptions {
  narrationInputText: string
  narrationTrack: NarrationTrack | null
  subtitleCues: SubtitleCue[]
  setNarrationInputText: Dispatch<SetStateAction<string>>
  setNarrationTrack: Dispatch<SetStateAction<NarrationTrack | null>>
  setSubtitleCues: Dispatch<SetStateAction<SubtitleCue[]>>
}

function normalizeSubtitleStyle(value: unknown): SubtitleStyle {
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

function normalizeNarrationSegments(value: unknown): NarrationSegment[] {
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

function normalizeNarrationAudioSegments(value: unknown, trackId: string, text: string, duration: number): NarrationAudioSegment[] {
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

function normalizeNarrationTrack(value: unknown, legacySegments: NarrationSegment[]): NarrationTrack | null {
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

function normalizeSubtitleCues(value: unknown, legacySegments: NarrationSegment[], legacyStyle: SubtitleStyle): SubtitleCue[] {
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

export function useProjectIO(store: AppStore, triggerRedraw: () => void, options?: UseProjectIOOptions) {
  const [loadingPainting, setLoadingPainting] = useState(false)

  /** 從 URL 載入畫作到 canvas（名畫庫使用） */
  const loadImageFromUrl = useCallback(async (url: string, title: string) => {
    setLoadingPainting(true)
    try {
      const safeUrl = url.replace(/^http:\/\//, 'https://')
      let blob: Blob | undefined

      // 1st attempt: direct fetch (works for CORS-enabled servers e.g. ARTIC IIIF)
      try {
        const res = await fetch(safeUrl)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        blob = await res.blob()
      } catch {
        // 2nd attempt: images.weserv.nl — dedicated image proxy with CORS headers
        const proxyUrl = `https://images.weserv.nl/?url=${encodeURIComponent(safeUrl)}&w=1600&output=jpg`
        const res2 = await fetch(proxyUrl)
        if (!res2.ok) throw new Error(`proxy HTTP ${res2.status}`)
        blob = await res2.blob()
      }

      const ext = safeUrl.split('.').pop()?.split('?')[0]?.toLowerCase() ?? 'jpg'
      const file = new File([blob], `${title}.${ext}`, { type: blob.type || 'image/jpeg' })
      store.loadImageFile(file, !store.image, store.imageUrl)
    } catch (err) {
      console.error('[loadImageFromUrl]', err)
      alert('載入名畫失敗，請稍後再試')
    } finally {
      setLoadingPainting(false)
    }
  }, [store])

  const saveProject = useCallback(async () => {
    try {
      const name = normalizeProjectName(store.projectName)
      let imageDataUrl: string | null = null
      if (store.image) {
        const tmp = document.createElement('canvas')
        tmp.width = store.image.width; tmp.height = store.image.height
        tmp.getContext('2d')!.drawImage(store.image, 0, 0)
        imageDataUrl = tmp.toDataURL('image/png')
      }
      const project = {
        app: 'auto-art-camera-tour', version: 1, name,
        savedAt: new Date().toISOString(),
        output: { width: OUTPUT_W, height: OUTPUT_H, ratio: '9:16' },
        image: imageDataUrl ? { dataUrl: imageDataUrl, width: store.image!.width, height: store.image!.height } : null,
        backgroundSettings: store.backgroundSettings,
        activeIndex: store.activeIndex,
        activeTab: store.activeTab,
        points: store.points,
        narrationInputText: options?.narrationInputText ?? '',
        narrationTrack: options?.narrationTrack ? {
          id: options.narrationTrack.id,
          text: options.narrationTrack.text,
          voice: options.narrationTrack.voice,
          speed: options.narrationTrack.speed,
          pauseIntensity: options.narrationTrack.pauseIntensity,
          startTime: options.narrationTrack.startTime,
          duration: options.narrationTrack.duration,
          samplingRate: options.narrationTrack.samplingRate,
          segments: options.narrationTrack.segments,
          words: options.narrationTrack.words,
          phonemes: options.narrationTrack.phonemes,
        } : null,
        subtitleCues: options?.subtitleCues ?? [],
      }
      const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = `${sanitizeFileName(name)}-${getTodayString()}.json`
      document.body.appendChild(a); a.click(); a.remove()
      URL.revokeObjectURL(url)
    } catch (err) { console.error(err); alert('保存失敗') }
  }, [store, options])

  const loadProject = useCallback(async (file: File) => {
    try {
      const text = await file.text()
      const project = JSON.parse(text)
      if (project.app !== 'auto-art-camera-tour') throw new Error('不是正確的專案檔')
      store.setProjectName(normalizeProjectName(project.name || '未命名專案'))
      store.setBackgroundSettings({
        mode: project.backgroundSettings?.mode === 'blur' ? 'blur' : 'color',
        color: project.backgroundSettings?.color || '#111827',
        blur: clamp(Number(project.backgroundSettings?.blur ?? 18), 0, 50),
      })
      const pts: CameraPoint[] = Array.isArray(project.points)
        ? project.points.map(normalizePoint) : []
      store.setPoints(pts)
      const ai = clamp(Number(project.activeIndex ?? -1), -1, Math.max(-1, pts.length - 1))
      store.setActiveIndex(ai)
      const tab: ActiveTab = ['camera', 'caption', 'assist'].includes(project.activeTab) ? project.activeTab : 'camera'
      store.setActiveTab(tab)
      options?.setNarrationInputText(typeof project.narrationInputText === 'string' ? project.narrationInputText : '')
      const legacyStyle = normalizeSubtitleStyle(project.subtitleStyle)
      const legacySegments = normalizeNarrationSegments(project.narrationSegments)
      options?.setNarrationTrack(normalizeNarrationTrack(project.narrationTrack, legacySegments))
      options?.setSubtitleCues(normalizeSubtitleCues(project.subtitleCues, legacySegments, legacyStyle))
      if (project.image?.dataUrl) store.loadImageDataUrl(project.image.dataUrl)
      else triggerRedraw()
    } catch (err) { console.error(err); alert('載入失敗：請確認檔案正確') }
  }, [store, triggerRedraw, options])

  return { loadingPainting, loadImageFromUrl, saveProject, loadProject }
}
