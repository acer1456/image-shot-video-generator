import { useCallback, useEffect, useRef, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import { normalizePoint, type AppStore } from '@/hooks/useAppStore'
import type { ActiveTab, CameraPoint, NarrationSegment, NarrationTrack, SubtitleCue, SubtitleStyle } from '@/types'
import { DEFAULT_SUBTITLE_STYLE } from '@/types'
import { clamp, normalizeProjectName } from '@/lib/utils'

const AUTOSAVE_KEY = 'artful_autosave'

interface UseAutosaveOptions {
  store: AppStore
  narrationInputText: string
  narrationTrack: NarrationTrack | null
  subtitleCues: SubtitleCue[]
  setNarrationInputText: Dispatch<SetStateAction<string>>
  setNarrationTrack: Dispatch<SetStateAction<NarrationTrack | null>>
  setSubtitleCues: Dispatch<SetStateAction<SubtitleCue[]>>
  triggerRedraw: () => void
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

function normalizeLegacySegments(value: unknown): NarrationSegment[] {
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

export function useAutosave({
  store,
  narrationInputText,
  narrationTrack,
  subtitleCues,
  setNarrationInputText,
  setNarrationTrack,
  setSubtitleCues,
  triggerRedraw,
}: UseAutosaveOptions) {
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [showRestoreModal, setShowRestoreModal] = useState(false)
  const [pendingRestore, setPendingRestore] = useState<Record<string, unknown> | null>(null)

  useEffect(() => {
    const saved = localStorage.getItem(AUTOSAVE_KEY)
    if (!saved) return
    try {
      const data = JSON.parse(saved) as Record<string, unknown>
      const hasContent = (Array.isArray(data.points) && (data.points as unknown[]).length > 0) || !!data.image
      if (data.app === 'auto-art-camera-tour' && hasContent) {
        setPendingRestore(data)
        setShowRestoreModal(true)
      } else {
        localStorage.removeItem(AUTOSAVE_KEY)
      }
    } catch {
      localStorage.removeItem(AUTOSAVE_KEY)
    }
  }, [])

  useEffect(() => {
    if (!store.points.length && !store.image) return
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current)
    autosaveTimerRef.current = setTimeout(() => {
      try {
        let imageDataUrl: string | null = null
        if (store.image) {
          const tmp = document.createElement('canvas')
          tmp.width = store.image.width; tmp.height = store.image.height
          tmp.getContext('2d')!.drawImage(store.image, 0, 0)
          imageDataUrl = tmp.toDataURL('image/jpeg', 0.7)
        }
        const data = {
          app: 'auto-art-camera-tour', version: 1,
          name: store.projectName, savedAt: new Date().toISOString(),
          image: imageDataUrl ? { dataUrl: imageDataUrl, width: store.image!.width, height: store.image!.height } : null,
          backgroundSettings: store.backgroundSettings,
          activeIndex: store.activeIndex, activeTab: store.activeTab,
          points: store.points,
          narrationInputText,
          narrationTrack: narrationTrack ? {
            id: narrationTrack.id,
            text: narrationTrack.text,
            voice: narrationTrack.voice,
            speed: narrationTrack.speed,
            startTime: narrationTrack.startTime,
            duration: narrationTrack.duration,
            samplingRate: narrationTrack.samplingRate,
            words: narrationTrack.words,
            phonemes: narrationTrack.phonemes,
          } : null,
          subtitleCues,
        }
        try {
          localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(data))
        } catch {
          localStorage.setItem(AUTOSAVE_KEY, JSON.stringify({ ...data, image: null }))
        }
      } catch (err) {
        console.warn('[autosave]', err)
      }
    }, 2000)
    return () => { if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current) }
  }, [store.points, store.image, store.projectName, store.backgroundSettings, store.activeIndex, store.activeTab, narrationTrack, subtitleCues, narrationInputText])

  const handleRestoreAutosave = useCallback(() => {
    if (!pendingRestore) return
    const project = pendingRestore
    store.setProjectName(normalizeProjectName(String(project.name || '未命名專案')))
    store.setBackgroundSettings({
      mode: (project.backgroundSettings as Record<string, unknown>)?.mode === 'blur' ? 'blur' : 'color',
      color: String((project.backgroundSettings as Record<string, unknown>)?.color || '#000000'),
      blur: clamp(Number((project.backgroundSettings as Record<string, unknown>)?.blur ?? 18), 0, 50),
    })
    const pts: CameraPoint[] = Array.isArray(project.points)
      ? (project.points as Partial<CameraPoint>[]).map(normalizePoint) : []
    store.setPoints(pts)
    store.setActiveIndex(clamp(Number(project.activeIndex ?? -1), -1, Math.max(-1, pts.length - 1)))
    const tab: ActiveTab = ['camera', 'caption', 'assist'].includes(String(project.activeTab))
      ? project.activeTab as ActiveTab : 'camera'
    store.setActiveTab(tab)
    const img = project.image as Record<string, unknown> | null
    if (img?.dataUrl) store.loadImageDataUrl(String(img.dataUrl))
    else triggerRedraw()
    if (typeof project.narrationInputText === 'string') setNarrationInputText(project.narrationInputText)
    const legacyStyle = normalizeSubtitleStyle(project.subtitleStyle)
    const legacySegments = normalizeLegacySegments(project.narrationSegments)
    const track = project.narrationTrack && typeof project.narrationTrack === 'object'
      ? project.narrationTrack as Partial<NarrationTrack>
      : null
    setNarrationTrack(track ? {
      id: String(track.id ?? crypto.randomUUID()),
      text: String(track.text ?? ''),
      voice: String(track.voice ?? 'af_heart'),
      speed: Number(track.speed ?? 1),
      startTime: Number(track.startTime ?? 0),
      duration: Number(track.duration ?? 0),
      audioData: undefined,
      samplingRate: track.samplingRate != null ? Number(track.samplingRate) : undefined,
      words: Array.isArray(track.words) ? track.words.map(w => ({
        word: String(w.word ?? ''),
        startTime: Number(w.startTime ?? 0),
        duration: Number(w.duration ?? 0),
      })) : [],
      phonemes: Array.isArray(track.phonemes) ? track.phonemes.map(p => ({
        phoneme: String(p.phoneme ?? ''),
        startTime: Number(p.startTime ?? 0),
        duration: Number(p.duration ?? 0),
      })) : [],
    } : legacySegments.length ? {
      id: crypto.randomUUID(),
      text: legacySegments.map(s => s.text).join(' '),
      voice: 'af_heart',
      speed: 1,
      startTime: 0,
      duration: legacySegments.reduce((max, s) => Math.max(max, s.startTime + s.duration), 0),
      audioData: undefined,
      samplingRate: undefined,
      words: [],
      phonemes: [],
    } : null)
    setSubtitleCues(Array.isArray(project.subtitleCues)
      ? (project.subtitleCues as Partial<SubtitleCue>[]).map(cue => ({
        id: String(cue.id ?? crypto.randomUUID()),
        narrationId: String(cue.narrationId ?? ''),
        text: String(cue.text ?? ''),
        translation: String(cue.translation ?? ''),
        startTime: Number(cue.startTime ?? 0),
        duration: Number(cue.duration ?? 0),
        style: normalizeSubtitleStyle(cue.style),
        wordStartIndex: Number(cue.wordStartIndex ?? 0),
        wordEndIndex: Number(cue.wordEndIndex ?? 0),
      }))
      : legacySegments.map(s => ({
        id: crypto.randomUUID(),
        narrationId: '',
        text: s.text,
        translation: '',
        startTime: s.startTime,
        duration: s.duration,
        style: legacyStyle,
        wordStartIndex: 0,
        wordEndIndex: 0,
      })))
    setPendingRestore(null)
    setShowRestoreModal(false)
  }, [pendingRestore, store, triggerRedraw, setNarrationInputText, setNarrationTrack, setSubtitleCues])

  const handleDiscardAutosave = useCallback(() => {
    localStorage.removeItem(AUTOSAVE_KEY)
    setPendingRestore(null)
    setShowRestoreModal(false)
  }, [])

  return {
    showRestoreModal,
    pendingRestore,
    handleRestoreAutosave,
    handleDiscardAutosave,
  }
}
