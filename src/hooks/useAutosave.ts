import { useCallback, useEffect, useRef, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import { normalizePoint, type AppStore } from '@/hooks/useAppStore'
import type { ActiveTab, CameraPoint, NarrationTrack, SubtitleCue } from '@/types'
import { clamp, normalizeProjectName } from '@/lib/utils'
import {
  normalizeNarrationSegments,
  normalizeNarrationTrack,
  normalizeSubtitleCues,
  normalizeSubtitleStyle,
} from '@/lib/projectNormalize'

const AUTOSAVE_KEY = 'artful_autosave'
const AUTOSAVE_DB_NAME = 'artful_autosave_assets'
const AUTOSAVE_DB_VERSION = 1
const AUTOSAVE_IMAGE_STORE = 'images'
const AUTOSAVE_IMAGE_KEY = 'current'

function openAutosaveDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(AUTOSAVE_DB_NAME, AUTOSAVE_DB_VERSION)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(AUTOSAVE_IMAGE_STORE)) {
        request.result.createObjectStore(AUTOSAVE_IMAGE_STORE)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function useAutosaveImageStore<T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>,
) {
  const db = await openAutosaveDb()
  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = db.transaction(AUTOSAVE_IMAGE_STORE, mode)
      const request = operation(transaction.objectStore(AUTOSAVE_IMAGE_STORE))
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
      transaction.onabort = () => reject(transaction.error)
    })
  } finally {
    db.close()
  }
}

function saveAutosaveImage(blob: Blob) {
  return useAutosaveImageStore('readwrite', store => store.put(blob, AUTOSAVE_IMAGE_KEY))
}

function loadAutosaveImage() {
  return useAutosaveImageStore<Blob | undefined>('readonly', store => store.get(AUTOSAVE_IMAGE_KEY))
}

function deleteAutosaveImage() {
  return useAutosaveImageStore('readwrite', store => store.delete(AUTOSAVE_IMAGE_KEY))
}

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
    if (!store.image?.src) return
    let cancelled = false
    void fetch(store.image.src)
      .then(response => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        return response.blob()
      })
      .then(blob => {
        if (!cancelled) return saveAutosaveImage(blob)
      })
      .catch(err => console.warn('[autosave image]', err))
    return () => { cancelled = true }
  }, [store.image])

  useEffect(() => {
    if (!store.points.length && !store.image) return
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current)
    autosaveTimerRef.current = setTimeout(() => {
      try {
        const data = {
          app: 'auto-art-camera-tour', version: 2,
          name: store.projectName, savedAt: new Date().toISOString(),
          image: store.image ? {
            storage: 'indexeddb',
            width: store.image.width,
            height: store.image.height,
          } : null,
          backgroundSettings: store.backgroundSettings,
          activeIndex: store.activeIndex, activeTab: store.activeTab,
          points: store.points,
          narrationInputText,
          narrationTrack: narrationTrack ? {
            id: narrationTrack.id,
            text: narrationTrack.text,
            voice: narrationTrack.voice,
            speed: narrationTrack.speed,
            pauseIntensity: narrationTrack.pauseIntensity,
            startTime: narrationTrack.startTime,
            duration: narrationTrack.duration,
            samplingRate: narrationTrack.samplingRate,
            segments: narrationTrack.segments,
            words: narrationTrack.words,
            phonemes: narrationTrack.phonemes,
          } : null,
          subtitleCues,
        }
        localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(data))
      } catch (err) {
        console.warn('[autosave]', err)
      }
    }, 2000)
    return () => { if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current) }
  }, [store.points, store.image, store.projectName, store.backgroundSettings, store.activeIndex, store.activeTab, narrationTrack, subtitleCues, narrationInputText])

  const handleRestoreAutosave = useCallback(async () => {
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
    if (img?.dataUrl) {
      store.loadImageDataUrl(String(img.dataUrl))
    } else if (img?.storage === 'indexeddb') {
      try {
        const blob = await loadAutosaveImage()
        if (blob) {
          store.loadImageFile(new File([blob], 'autosave-image', { type: blob.type }), false, store.imageUrl)
        } else {
          triggerRedraw()
        }
      } catch (err) {
        console.warn('[autosave restore image]', err)
        triggerRedraw()
      }
    } else {
      triggerRedraw()
    }
    if (typeof project.narrationInputText === 'string') setNarrationInputText(project.narrationInputText)
    const legacyStyle = normalizeSubtitleStyle(project.subtitleStyle)
    const legacySegments = normalizeNarrationSegments(project.narrationSegments)
    setNarrationTrack(normalizeNarrationTrack(project.narrationTrack, legacySegments))
    setSubtitleCues(normalizeSubtitleCues(project.subtitleCues, legacySegments, legacyStyle))
    setPendingRestore(null)
    setShowRestoreModal(false)
  }, [pendingRestore, store, triggerRedraw, setNarrationInputText, setNarrationTrack, setSubtitleCues])

  const handleDiscardAutosave = useCallback(() => {
    localStorage.removeItem(AUTOSAVE_KEY)
    void deleteAutosaveImage().catch(err => console.warn('[autosave discard image]', err))
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
