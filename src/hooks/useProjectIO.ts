import { useCallback, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import { normalizePoint, type AppStore } from '@/hooks/useAppStore'
import type { CameraPoint, ActiveTab, ImageOverlay, MosaicStroke, NarrationTrack, SubtitleCue } from '@/types'
import { normalizeMosaicStrokes } from '@/lib/mosaic'
import { OUTPUT_W, OUTPUT_H, clamp, normalizeProjectName, sanitizeFileName, getTodayString } from '@/lib/utils'
import {
  normalizeImageOverlays,
  normalizeNarrationSegments,
  normalizeNarrationTrack,
  normalizeSubtitleCues,
  normalizeSubtitleStyle,
} from '@/lib/projectNormalize'
import { encodeAudioB64 } from '@/lib/audioCodec'

interface UseProjectIOOptions {
  narrationInputText: string
  narrationTrack: NarrationTrack | null
  subtitleCues: SubtitleCue[]
  imageOverlays?: ImageOverlay[]
  overlaysLocked?: boolean
  mosaicStrokes?: MosaicStroke[]
  showMosaicInOutput?: boolean
  setNarrationInputText: Dispatch<SetStateAction<string>>
  setNarrationTrack: Dispatch<SetStateAction<NarrationTrack | null>>
  setSubtitleCues: Dispatch<SetStateAction<SubtitleCue[]>>
  setImageOverlays?: Dispatch<SetStateAction<ImageOverlay[]>>
  setOverlaysLocked?: Dispatch<SetStateAction<boolean>>
  setMosaicStrokes?: Dispatch<SetStateAction<MosaicStroke[]>>
  setShowMosaicInOutput?: Dispatch<SetStateAction<boolean>>
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
        // ponytail: JPEG 0.92 讓專案檔比 PNG 小 5–10 倍；畫作幾乎不含透明，若之後需要保留 alpha 再改回 PNG
        imageDataUrl = tmp.toDataURL('image/jpeg', 0.92)
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
          // Float32Array 不能直接進 JSON（會展開成 {"0":..} 巨型物件）；
          // 改存 base64 Int16 PCM，載入時由 normalizeNarrationAudioSegments 還原
          segments: options.narrationTrack.segments.map(({ audioData, ...rest }) => ({
            ...rest,
            audioB64: audioData ? encodeAudioB64(audioData) : undefined,
          })),
          words: options.narrationTrack.words,
          phonemes: options.narrationTrack.phonemes,
        } : null,
        subtitleCues: options?.subtitleCues ?? [],
        imageOverlays: options?.imageOverlays ?? [],
        overlaysLocked: options?.overlaysLocked ?? false,
        mosaicStrokes: options?.mosaicStrokes ?? [],
        showMosaicInOutput: options?.showMosaicInOutput ?? true,
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
      options?.setImageOverlays?.(normalizeImageOverlays(project.imageOverlays))
      options?.setOverlaysLocked?.(project.overlaysLocked === true)
      options?.setMosaicStrokes?.(normalizeMosaicStrokes(project.mosaicStrokes))
      options?.setShowMosaicInOutput?.(project.showMosaicInOutput !== false)
      if (project.image?.dataUrl) store.loadImageDataUrl(project.image.dataUrl)
      else triggerRedraw()
    } catch (err) { console.error(err); alert('載入失敗：請確認檔案正確') }
  }, [store, triggerRedraw, options])

  return { loadingPainting, loadImageFromUrl, saveProject, loadProject }
}
