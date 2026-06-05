import { useRef, useCallback, useState, useEffect } from 'react'
import { ThemeProvider, useTheme } from 'next-themes'
import CanvasEditor from '@/components/CanvasEditor'
import CameraPanel from '@/components/CameraPanel'
import CaptionEditor from '@/components/CaptionEditor'
import AssistPanel from '@/components/AssistPanel'
import TimelinePanel from '@/components/TimelinePanel'
import type { TimelinePanelHandle } from '@/components/TimelinePanel'
import AiGeneratePanel from '@/components/AiGeneratePanel'
import { MasterworkPickerModal } from '@/components/MasterworkPickerModal'
import ScreenDownload from '@/components/screenDownload'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { useAppStore, normalizePoint } from '@/hooks/useAppStore'
import type { CameraPoint, CaptionData, DragState, ActiveTab } from '@/types'
import {
  OUTPUT_W, OUTPUT_H, clamp, normalizeProjectName,
  sanitizeFileName, getTodayString, nextFrame, wait,
  getBestVideoMimeType, formatTime
} from '@/lib/utils'
import {
  drawCamera as doDrawCamera, drawOutputBackground,
  getTimelineStateAt, buildTimeline
} from '@/lib/canvas'
import {
  Sun, Moon, Save, FolderOpen, Trash2, Film,
  Maximize, Maximize2, Upload, Camera, Type, Settings, MoreHorizontal, ChevronDown, X,
  Sparkles, Palette, Loader2, Check
} from 'lucide-react'
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu'
import { convertPointsCaptions, type ChineseConversion } from '@/lib/chinese'
import type { AiGenerateResult } from '@/lib/openrouter'

function AppInner() {
  const store = useAppStore()
  const { theme, setTheme } = useTheme()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const loadProjectInputRef = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const dragStateRef = useRef<DragState | null>(null)
  const currentTimeRef = useRef(0)
  const previewCancelRef = useRef(false)
  const timelinePanelRef = useRef<TimelinePanelHandle>(null)
  /** Timestamp of last setCurrentTime call — used to throttle React re-renders to ~15fps */
  const lastUiUpdateRef = useRef(0)
  const [snapGuide, setSnapGuide] = useState({ x: false, y: false })
  const [forceRedraw, setForceRedraw] = useState(0)
  const [totalDuration, setTotalDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [isFocusMode, setIsFocusMode] = useState(false)
  const [isImmersiveMode, setIsImmersiveMode] = useState(false)
  const [isImmersiveLeaving, setIsImmersiveLeaving] = useState(false)
  const [isAiPanelOpen, setIsAiPanelOpen] = useState(false)
  const [isMasterworkPickerOpen, setIsMasterworkPickerOpen] = useState(false)
  const [loadingPainting, setLoadingPainting] = useState(false)
  const [activeCaptionIndex, setActiveCaptionIndex] = useState(0)
  const [renderProgress, setRenderProgress] = useState(0)

  // Reset active caption to primary whenever the selected camera point changes
  useEffect(() => { setActiveCaptionIndex(0) }, [store.activeIndex])

  const triggerRedraw = useCallback(() => setForceRedraw(n => n + 1), [])

  /** 從 URL 載入畫作到 canvas（名畫庫使用） */
  const loadImageFromUrl = useCallback(async (url: string, title: string) => {
    setLoadingPainting(true)
    try {
      // Force HTTPS to avoid mixed-content blocks in PWA
      const safeUrl = url.replace(/^http:\/\//, 'https://')

      let blob: Blob | undefined

      // 1st attempt: direct fetch (works for CORS-enabled servers e.g. ARTIC IIIF)
      try {
        const res = await fetch(safeUrl)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        blob = await res.blob()
      } catch {
        // 2nd attempt: images.weserv.nl — dedicated image proxy with CORS headers;
        // also resizes to 1600px to reduce file size for large print-quality images
        const proxyUrl = `https://images.weserv.nl/?url=${encodeURIComponent(safeUrl)}&w=3000&output=webp`
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

  // Sync total duration whenever points change
  useEffect(() => {
    const { totalDuration: td } = buildTimeline(store.points)
    setTotalDuration(td)
  }, [store.points])

  // ---------- Canvas drawing helpers exposed to parent ----------
  const getCanvas = useCallback((): HTMLCanvasElement | null => {
    if (canvasRef.current) return canvasRef.current
    const el = document.querySelector('canvas') as HTMLCanvasElement | null
    canvasRef.current = el
    return el
  }, [])

  const drawTimelineTime = useCallback((time: number, guides: boolean) => {
    const canvas = getCanvas()
    if (!canvas || !store.image) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const state = getTimelineStateAt(store.image, store.points, time)
    if (!state) return
    store.setActiveIndex(state.pointIndex)
    doDrawCamera(canvas, ctx, store.image, state.camera, store.backgroundSettings, state.captionPoint, guides && store.showCaptionBox, store.showCaptionBox, snapGuide)
  }, [getCanvas, store, snapGuide])

  const getPointFocusTime = useCallback((pointIndex: number) => {
    const { items } = buildTimeline(store.points)
    const holdItem = items.find(item => item.pointIndex === pointIndex && item.type === 'hold')
    if (holdItem) return holdItem.start
    const moveItem = items.find(item => item.pointIndex === pointIndex && item.type === 'move')
    if (moveItem) return moveItem.start
    return 0
  }, [store.points])

  const selectPointAndSyncTimeline = useCallback((pointIndex: number) => {
    if (pointIndex < 0) {
      store.setActiveIndex(-1)
      triggerRedraw()
      return
    }
    if (pointIndex >= store.points.length) return
    previewCancelRef.current = true
    store.setIsPreviewing(false)
    store.setActiveIndex(pointIndex)
    const t = getPointFocusTime(pointIndex)
    drawTimelineTime(t, store.showGuidesInPreview)
    timelinePanelRef.current?.setTimeCursor(t)
    timelinePanelRef.current?.revealTime(t)
    currentTimeRef.current = t
    setCurrentTime(t)
    triggerRedraw()
  }, [store, getPointFocusTime, drawTimelineTime, triggerRedraw])

  // ---------- Preview ----------
  const previewPath = useCallback(async () => {
    if (!store.image || !store.points.length || store.isRendering) return
    previewCancelRef.current = false
    store.setIsPreviewing(true)
    // Start from current cursor position (not always from 0)
    const startTime = currentTimeRef.current >= totalDuration ? 0 : currentTimeRef.current
    const wallStart = performance.now()
    while (true) {
      if (previewCancelRef.current) break
      const elapsed = (performance.now() - wallStart) / 1000
      const t = Math.min(startTime + elapsed, totalDuration)
      drawTimelineTime(t, store.showGuidesInPreview)
      // Move cursor imperatively every frame — no React re-render needed
      timelinePanelRef.current?.setTimeCursor(t)
      timelinePanelRef.current?.revealTime(t, false)
      currentTimeRef.current = t
      // Throttle React state update (~15fps) — only drives the time display text
      const now = performance.now()
      if (now - lastUiUpdateRef.current >= 66) {
        setCurrentTime(t)
        lastUiUpdateRef.current = now
      }
      if (t >= totalDuration) break
      await nextFrame()
    }
    // Final accurate update for time display and cursor after playback ends
    setCurrentTime(currentTimeRef.current)
    timelinePanelRef.current?.setTimeCursor(currentTimeRef.current)
    store.setIsPreviewing(false)
    triggerRedraw()
  }, [store, totalDuration, drawTimelineTime, triggerRedraw])

  // ---------- Render video ----------
  const renderVideo = useCallback(async (captionConversion: ChineseConversion = 'original') => {
    if (!store.image || !store.points.length || store.isRendering) return
    store.setIsRendering(true)
    store.setIsPreviewing(false)
    try {
      const renderPoints = captionConversion === 'original'
        ? store.points
        : convertPointsCaptions(store.points, captionConversion)
      const { totalDuration: td } = buildTimeline(renderPoints)
      const RENDER_FPS = ({ '1080p': 30, '2k': 30, '4k': 24 } as const)[store.renderResolution] ?? 30
      const FRAME_MS = Math.ceil(1000 / RENDER_FPS) // 4K→42ms, others→34ms
      const totalFrames = Math.ceil(td * RENDER_FPS) + 1

      // Dedicated offscreen canvas — completely isolated from the editor canvas.
      // Prevents React re-renders / drawBase() effects from interfering with the
      // capture stream, which caused progressive data loss on repeated exports.
      // Also lets us use fixed time-step rendering without touching the editor view.
      const off = document.createElement('canvas')
      const RENDER_RESOLUTIONS = { '1080p': [1080, 1920], '2k': [1440, 2560], '4k': [2160, 3840] } as const
      const [rw, rh] = RENDER_RESOLUTIONS[store.renderResolution] ?? [OUTPUT_W, OUTPUT_H]
      off.width = rw
      off.height = rh
      const offCtx = off.getContext('2d')!
      offCtx.imageSmoothingEnabled = true
      offCtx.imageSmoothingQuality = 'high'

      // Also grab the editor canvas for live preview during export.
      // Since isRendering=true, CanvasEditor's drawBase() has an early-return guard
      // and won't interfere. Drawing to both canvases is synchronous and completes
      // well within the 34ms frame budget, so the recording is not affected.
      const editorCanvas = getCanvas()
      const editorCtx = editorCanvas?.getContext('2d') ?? null

      const drawFrame = (t: number) => {
        const state = getTimelineStateAt(store.image!, renderPoints, t)
        if (!state) return
        doDrawCamera(off, offCtx, store.image!, state.camera, store.backgroundSettings, state.captionPoint, false, false, { x: false, y: false })
        if (editorCanvas && editorCtx) {
          doDrawCamera(editorCanvas, editorCtx, store.image!, state.camera, store.backgroundSettings, state.captionPoint, false, false, { x: false, y: false })
        }
      }

      // captureStream(0) = manual frame mode: frames are only captured when
      // requestFrame() is explicitly called. This is necessary for offscreen
      // canvases because the browser's compositor never visits them, so
      // captureStream(N) with a non-zero rate never actually samples any pixels,
      // causing the stream to produce no data and recorder.onstop to hang forever.
      const stream = off.captureStream(0)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const captureTrack = stream.getVideoTracks()[0] as any
      const chunks: BlobPart[] = []
      const mimeType = getBestVideoMimeType()
      const RENDER_BITRATES = { '1080p': 25_000_000, '2k': 50_000_000, '4k': 80_000_000 } as const
      const videoBitsPerSecond = RENDER_BITRATES[store.renderResolution] ?? 25_000_000
      const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond })
      recorder.ondataavailable = event => { if (event.data.size > 0) chunks.push(event.data) }
      const done = new Promise<void>((resolve, reject) => {
        recorder.onstop = () => resolve()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        recorder.onerror = (e: Event) => reject(new Error('MediaRecorder: ' + ((e as any).error?.message ?? 'unknown error')))
      })
      recorder.start()

      setRenderProgress(0)
      // Fixed-step render: t = frame / FPS — each frame is explicitly pushed to the
      // stream via requestFrame(), ensuring reliable capture for offscreen canvases.
      for (let frame = 0; frame < totalFrames; frame++) {
        drawFrame(Math.min(frame / RENDER_FPS, td))
        captureTrack.requestFrame?.()
        setRenderProgress(Math.round((frame + 1) / totalFrames * 100))
        if (frame < totalFrames - 1) await wait(FRAME_MS)
      }

      // Give the stream enough time to capture the final frame before stopping.
      await wait(300)
      recorder.stop()
      await done
      // Explicitly stop the track so the canvas is no longer held by this stream.
      stream.getTracks().forEach(track => track.stop())

      const blob = new Blob(chunks, { type: mimeType })
      if (store.lastVideoUrl) URL.revokeObjectURL(store.lastVideoUrl)
      const url = URL.createObjectURL(blob)
      store.setLastVideoUrl(url)
      const ext = mimeType.includes('mp4') ? 'mp4' : 'webm'
      const suffix = captionConversion === 'tw' ? '-繁中' : captionConversion === 'cn' ? '-简中' : ''
      const a = document.createElement('a')
      a.href = url
      a.download = `${sanitizeFileName(store.projectName)}-${getTodayString()}${suffix}.${ext}`
      document.body.appendChild(a); a.click(); a.remove()
    } catch (err) {
      console.error(err)
      alert('影片產生失敗，請打開 Console 查看錯誤。')
    } finally {
      store.setIsRendering(false)
      triggerRedraw()
    }
  }, [store, getCanvas, triggerRedraw])
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
        points: store.points
      }
      const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = `${sanitizeFileName(name)}-${getTodayString()}.json`
      document.body.appendChild(a); a.click(); a.remove()
      URL.revokeObjectURL(url)
    } catch (err) { console.error(err); alert('保存失敗') }
  }, [store])

  const loadProject = useCallback(async (file: File) => {
    try {
      const text = await file.text()
      const project = JSON.parse(text)
      if (project.app !== 'auto-art-camera-tour') throw new Error('不是正確的專案檔')
      store.setProjectName(normalizeProjectName(project.name || '未命名專案'))
      store.setBackgroundSettings({
        mode: project.backgroundSettings?.mode === 'blur' ? 'blur' : 'color',
        color: project.backgroundSettings?.color || '#111827',
        blur: clamp(Number(project.backgroundSettings?.blur ?? 18), 0, 50)
      })
      const pts: CameraPoint[] = Array.isArray(project.points)
        ? project.points.map(normalizePoint) : []
      store.setPoints(pts)
      const ai = clamp(Number(project.activeIndex ?? -1), -1, Math.max(-1, pts.length - 1))
      store.setActiveIndex(ai)
      const tab: ActiveTab = ['camera', 'caption', 'assist'].includes(project.activeTab) ? project.activeTab : 'camera'
      store.setActiveTab(tab)
      if (project.image?.dataUrl) store.loadImageDataUrl(project.image.dataUrl)
      else triggerRedraw()
    } catch (err) { console.error(err); alert('載入失敗：請確認檔案正確') }
  }, [store, triggerRedraw])

  // ---------- Point management helpers ----------
  const handlePointAdd = useCallback((x: number, y: number) => {
    store.addPoint(x, y, store.points, store.lastCaptionStyle, store.lastCameraSettings)
    triggerRedraw()
  }, [store, triggerRedraw])

  const handlePointMove = useCallback((index: number, x: number, y: number) => {
    const next = store.updatePointField(index, 'x', x, store.points)
    store.updatePointField(index, 'y', y, next)
    triggerRedraw()
  }, [store, triggerRedraw])

  const handlePointResize = useCallback((index: number, zoom: number) => {
    store.updatePointField(index, 'zoom', zoom, store.points)
    store.rememberCameraSettings(index, store.points)
    triggerRedraw()
  }, [store, triggerRedraw])

  const handleCaptionMove = useCallback((index: number, captionIndex: number, x: number, y: number) => {
    if (captionIndex === 0) {
      const next = store.updateCaptionField(index, 'x', x, store.points)
      store.updateCaptionField(index, 'y', y, next)
      store.rememberCaptionStyle(index, next)
    } else {
      const extraIndex = captionIndex - 1
      const next = store.updateExtraCaptionField(index, extraIndex, 'x', x, store.points)
      store.updateExtraCaptionField(index, extraIndex, 'y', y, next)
    }
    triggerRedraw()
  }, [store, triggerRedraw])

  const handleCaptionFontResize = useCallback((index: number, captionIndex: number, scale: number) => {
    if (captionIndex === 0) {
      const next = store.updateCaptionField(index, 'scale', scale, store.points)
      store.updateCaptionField(index, 'subtitleScale', scale, next)
      store.rememberCaptionStyle(index, next)
    } else {
      const extraIndex = captionIndex - 1
      const next = store.updateExtraCaptionField(index, extraIndex, 'scale', scale, store.points)
      store.updateExtraCaptionField(index, extraIndex, 'subtitleScale', scale, next)
    }
    triggerRedraw()
  }, [store, triggerRedraw])

  const handleCaptionBoxWidth = useCallback((index: number, captionIndex: number, boxScaleX: number) => {
    if (captionIndex === 0) {
      store.updateCaptionField(index, 'boxScaleX', boxScaleX, store.points)
    } else {
      store.updateExtraCaptionField(index, captionIndex - 1, 'boxScaleX', boxScaleX, store.points)
    }
    triggerRedraw()
  }, [store, triggerRedraw])

  const handleCaptionBoxHeight = useCallback((index: number, captionIndex: number, boxScaleY: number) => {
    if (captionIndex === 0) {
      store.updateCaptionField(index, 'boxScaleY', boxScaleY, store.points)
    } else {
      store.updateExtraCaptionField(index, captionIndex - 1, 'boxScaleY', boxScaleY, store.points)
    }
    triggerRedraw()
  }, [store, triggerRedraw])

  const handleUpdateCaption = useCallback(<K extends keyof CaptionData>(field: K, value: CaptionData[K]) => {
    if (store.activeIndex < 0) return
    if (activeCaptionIndex === 0) {
      const next = store.updateCaptionField(store.activeIndex, field, value, store.points)
      store.rememberCaptionStyle(store.activeIndex, next)
    } else {
      store.updateExtraCaptionField(store.activeIndex, activeCaptionIndex - 1, field, value, store.points)
    }
    triggerRedraw()
  }, [store, activeCaptionIndex, triggerRedraw])

  const handleUpdateHold = useCallback((value: number) => {
    if (store.activeIndex < 0) return
    store.updatePointField(store.activeIndex, 'holdDuration', value, store.points)
    triggerRedraw()
  }, [store, triggerRedraw])

  const handleAddCaption = useCallback(() => {
    if (store.activeIndex < 0) return
    const curExtrasLen = store.points[store.activeIndex]?.extraCaptions?.length || 0
    store.addExtraCaption(store.activeIndex, store.points)
    setActiveCaptionIndex(curExtrasLen + 1)
    triggerRedraw()
  }, [store, triggerRedraw])

  const handleDeleteCaption = useCallback((extraIndex: number) => {
    if (store.activeIndex < 0) return
    store.removeExtraCaption(store.activeIndex, extraIndex, store.points)
    setActiveCaptionIndex(0)
    triggerRedraw()
  }, [store, triggerRedraw])

  const handleUpdatePointField = useCallback(<K extends keyof CameraPoint>(index: number, field: K, value: CameraPoint[K]) => {
    const next = store.updatePointField(index, field, value, store.points)
    store.rememberCameraSettings(index, next)
    triggerRedraw()
  }, [store, triggerRedraw])

  const handleInsertAfter = useCallback((afterIndex: number) => {
    store.insertPointAfter(afterIndex, store.points, store.lastCaptionStyle, store.lastCameraSettings)
    triggerRedraw()
  }, [store, triggerRedraw])

  const handleDuplicatePoint = useCallback((index: number) => {
    store.duplicatePoint(index, store.points)
    triggerRedraw()
  }, [store, triggerRedraw])

  const handleAiGenerated = useCallback((result: AiGenerateResult) => {
    const newPoints = result.points.map(p => {
      const pt = normalizePoint({
        x: p.x, y: p.y, zoom: p.zoom,
        move: p.move, moveDuration: p.moveDuration, holdDuration: p.holdDuration,
      })
      pt.caption.text     = p.caption.text
      pt.caption.subtitle  = p.caption.subtitle
      if (p.caption.captionX != null) pt.caption.x = Math.max(0, Math.min(1, p.caption.captionX))
      if (p.caption.captionY != null) pt.caption.y = Math.max(0, Math.min(1, p.caption.captionY))
      return pt
    })
    store.setPoints(newPoints)
    store.setActiveIndex(0)
    store.setActiveTab('camera')
    triggerRedraw()
  }, [store, triggerRedraw])

  const handleReorderPoints = useCallback((newPoints: CameraPoint[], newActiveIndex: number) => {
    store.reorderPoints(newPoints, newActiveIndex)
    triggerRedraw()
  }, [store, triggerRedraw])

  // ---------- Fullscreen ----------
  const requestFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen()
    } else {
      document.documentElement.requestFullscreen()
    }
  }, [])

  const openFocusMode = useCallback(() => {
    if (!store.image || store.isRendering) return
    previewCancelRef.current = true
    store.setIsPreviewing(false)
    store.setActiveTab('camera')
    setIsFocusMode(true)
    triggerRedraw()
  }, [store, triggerRedraw])

  const closeFocusMode = useCallback(() => {
    setIsFocusMode(false)
    setSnapGuide({ x: false, y: false })
    triggerRedraw()
  }, [triggerRedraw])

  const openImmersiveMode = useCallback(() => {
    if (!store.image || store.isRendering) return
    previewCancelRef.current = true
    store.setIsPreviewing(false)
    store.setActiveTab('camera')
    setIsImmersiveMode(true)
    triggerRedraw()
  }, [store, triggerRedraw])

  const closeImmersiveMode = useCallback(() => {
    setIsImmersiveLeaving(true)
    setTimeout(() => {
      setIsImmersiveMode(false)
      setIsImmersiveLeaving(false)
      setSnapGuide({ x: false, y: false })
      triggerRedraw()
    }, 210)
  }, [triggerRedraw])

  useEffect(() => {
    if (!isFocusMode && !isImmersiveMode) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (isFocusMode) closeFocusMode()
        if (isImmersiveMode) closeImmersiveMode()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isFocusMode, isImmersiveMode, closeFocusMode, closeImmersiveMode])

  // ---------- Global Space = play / pause ----------
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== ' ') return
      const tag = (event.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if ((event.target as HTMLElement).isContentEditable) return
      event.preventDefault()
      if (store.isRendering) return
      if (store.isPreviewing) {
        previewCancelRef.current = true
        store.setIsPreviewing(false)
      } else {
        previewPath()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [store, previewPath])

  // ---------- Render ----------
  const activePoint = store.points[store.activeIndex] || null
  const isDisabled = store.isRendering

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background text-foreground">
      {/* Top Toolbar */}
      <header className="flex items-center gap-2 px-3 py-2 border-b border-border bg-card/80 backdrop-blur-sm flex-shrink-0">
        <div className="flex-shrink-0 flex flex-col mr-1 leading-tight">
          <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground whitespace-nowrap">9:16 Video Studio</span>
          <span className="text-sm font-extrabold whitespace-nowrap">畫作鏡頭影片產生器</span>
        </div>

        <Separator orientation="vertical" className="h-8" />

        {/* File upload */}
        <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()} disabled={isDisabled || loadingPainting}>
          <Upload className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">上傳圖片</span>
        </Button>

        {/* Masterwork picker */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsMasterworkPickerOpen(true)}
          disabled={isDisabled || loadingPainting}
          title="從名畫庫選擇圖片"
        >
          {loadingPainting
            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
            : <Palette className="h-3.5 w-3.5" />}
          <span className="hidden sm:inline">{loadingPainting ? '載入中...' : '名畫庫'}</span>
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => {
            const file = e.target.files?.[0]
            // 已有圖片時只換底圖，保留所有鏡頭/字幕設定；第一次上傳才重置專案
            if (file) store.loadImageFile(file, !store.image, store.imageUrl)
            e.target.value = ''
          }}
        />

        {/* Project name */}
        <Input
          value={store.projectName}
          onChange={e => store.setProjectName(normalizeProjectName(e.target.value))}
          className="h-8 w-36 text-xs"
          placeholder="專案名稱"
        />

        <Separator orientation="vertical" className="h-8" />

        <DropdownMenuPrimitive.Root>
          <DropdownMenuPrimitive.Trigger asChild>
            <Button size="sm" variant="outline" title="輸出解析度">
              <span className="text-xs font-mono">{store.renderResolution.toUpperCase()}</span>
              <ChevronDown className="h-3 w-3 ml-0.5" />
            </Button>
          </DropdownMenuPrimitive.Trigger>
          <DropdownMenuPrimitive.Portal>
            <DropdownMenuPrimitive.Content
              align="end"
              sideOffset={4}
              className="z-50 min-w-[170px] rounded-md border border-border bg-popover p-1 shadow-md animate-in fade-in-0 zoom-in-95"
            >
              <DropdownMenuPrimitive.RadioGroup
                value={store.renderResolution}
                onValueChange={v => store.setRenderResolution(v as '1080p' | '2k' | '4k')}
              >
                {(['1080p', '2k', '4k'] as const).map(r => (
                  <DropdownMenuPrimitive.RadioItem
                    key={r}
                    value={r}
                    className="cursor-pointer rounded px-3 py-1.5 text-sm outline-none select-none hover:bg-accent focus:bg-accent flex items-center gap-2"
                  >
                    <DropdownMenuPrimitive.ItemIndicator>
                      <Check className="h-3 w-3" />
                    </DropdownMenuPrimitive.ItemIndicator>
                    {r === '1080p' ? '1080p  1080×1920' : r === '2k' ? '2K  1440×2560' : '4K  2160×3840'}
                  </DropdownMenuPrimitive.RadioItem>
                ))}
              </DropdownMenuPrimitive.RadioGroup>
            </DropdownMenuPrimitive.Content>
          </DropdownMenuPrimitive.Portal>
        </DropdownMenuPrimitive.Root>

        <DropdownMenuPrimitive.Root>
          <DropdownMenuPrimitive.Trigger asChild>
            <Button size="sm" disabled={isDisabled || !store.image || !store.points.length}>
              <Film className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">下載 MP4</span>
              <ChevronDown className="h-3 w-3 ml-0.5" />
            </Button>
          </DropdownMenuPrimitive.Trigger>
          <DropdownMenuPrimitive.Portal>
            <DropdownMenuPrimitive.Content
              align="end"
              sideOffset={4}
              className="z-50 min-w-[170px] rounded-md border border-border bg-popover p-1 shadow-md animate-in fade-in-0 zoom-in-95"
            >
              <DropdownMenuPrimitive.Item
                className="cursor-pointer rounded px-3 py-1.5 text-sm outline-none select-none hover:bg-accent focus:bg-accent"
                onSelect={() => renderVideo('original')}
              >
                下載此版本影片
              </DropdownMenuPrimitive.Item>
              <DropdownMenuPrimitive.Item
                className="cursor-pointer rounded px-3 py-1.5 text-sm outline-none select-none hover:bg-accent focus:bg-accent"
                onSelect={() => renderVideo('tw')}
              >
                下載繁體中文影片
              </DropdownMenuPrimitive.Item>
              <DropdownMenuPrimitive.Item
                className="cursor-pointer rounded px-3 py-1.5 text-sm outline-none select-none hover:bg-accent focus:bg-accent"
                onSelect={() => renderVideo('cn')}
              >
                下載簡體中文影片
              </DropdownMenuPrimitive.Item>
            </DropdownMenuPrimitive.Content>
          </DropdownMenuPrimitive.Portal>
        </DropdownMenuPrimitive.Root>

        <ScreenDownload
          image={store.image}
          points={store.points}
          backgroundSettings={store.backgroundSettings}
          projectName={store.projectName}
          disabled={isDisabled || store.isRendering}
        />

        {store.isRendering && (
          <div className="flex items-center gap-1.5 ml-2">
            <div className="w-28 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-100"
                style={{ width: `${renderProgress}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground tabular-nums w-8 text-right">{renderProgress}%</span>
          </div>
        )}

        <div className="ml-auto flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsAiPanelOpen(true)}
            title="AI 自動產生內容"
            className="text-primary"
          >
            <Sparkles className="h-4 w-4" />
          </Button>

          <Separator orientation="vertical" className="h-8" />

          <Button
            variant="ghost"
            size="icon"
            onClick={saveProject}
            title="保存專案"
          >
            <Save className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => loadProjectInputRef.current?.click()}
            title="載入專案"
          >
            <FolderOpen className="h-4 w-4" />
          </Button>
          <input
            ref={loadProjectInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={e => {
              const file = e.target.files?.[0]
              if (file) loadProject(file)
              e.target.value = ''
            }}
          />

          <Button
            variant="ghost"
            size="icon"
            onClick={() => store.clearPoints()}
            title="清除所有點位"
            disabled={!store.points.length}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>

          <Separator orientation="vertical" className="h-8" />

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            title="切換深淺色模式"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={requestFullscreen}
            title="全螢幕"
          >
            <Maximize className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1 min-h-0 flex-col overflow-hidden p-3 gap-3">
        <div className="flex flex-1 min-h-0 overflow-hidden gap-3">
          {/* Left: Canvas */}
          <div className="flex-1 min-w-0 min-h-0">
            <div className="relative h-full min-h-0 rounded-xl border border-border bg-card overflow-hidden flex items-center justify-center">
              {!isFocusMode ? (
                <CanvasEditor
                  image={store.image}
                  points={store.points}
                  activeIndex={store.activeIndex}
                  activeTab={store.activeTab}
                  backgroundSettings={store.backgroundSettings}
                  safeAreaVisibility={store.safeAreaVisibility}
                  showAllPoints={store.showAllPoints}
                  onlyActiveBox={store.onlyActiveBox}
                  showCaptionBox={store.showCaptionBox}
                  showGuidesInPreview={store.showGuidesInPreview}
                  isRendering={store.isRendering}
                  isPreviewing={store.isPreviewing}
                  onPointAdd={handlePointAdd}
                  onPointMove={handlePointMove}
                  onPointResize={handlePointResize}
                  onPointSelect={selectPointAndSyncTimeline}
                  onCaptionMove={handleCaptionMove}
                  onCaptionFontResize={handleCaptionFontResize}
                  onCaptionBoxWidth={handleCaptionBoxWidth}
                  onCaptionBoxHeight={handleCaptionBoxHeight}
                  onDragEnd={triggerRedraw}
                  onPointDelete={i => { store.removePoint(i, store.points, store.activeIndex); triggerRedraw() }}
                  onEnterCaption={() => { store.setActiveTab('caption'); triggerRedraw() }}
                  onBackToCamera={() => { store.setActiveTab('camera'); triggerRedraw() }}
                  activeCaptionIndex={activeCaptionIndex}
                  onCaptionSelect={setActiveCaptionIndex}
                  snapGuide={snapGuide}
                  setSnapGuide={setSnapGuide}
                  dragStateRef={dragStateRef}
                  currentTimeRef={currentTimeRef}
                  forceRedraw={forceRedraw}
                />
              ) : (
                <div className="text-sm text-muted-foreground">定位模式進行中，畫布已放大到前景。</div>
              )}

              <div className="absolute top-2 right-2 z-10 flex gap-1.5">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={isDisabled || !store.image}
                  onClick={openFocusMode}
                >
                  <Maximize className="h-3.5 w-3.5" />
                  定位模式
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={isDisabled || !store.image}
                  onClick={openImmersiveMode}
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                  沉浸式定位
                </Button>
              </div>

              {store.activeTab === 'caption' && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 z-10 flex flex-col gap-3 p-3 rounded-xl bg-black/60 backdrop-blur-sm">
                  <p className="text-[10px] font-semibold text-white text-center">平台預覽</p>
                  {(['ig', 'shorts', 'tiktok'] as const).map(key => (
                    <div key={key} className="flex flex-col items-center gap-1.5">
                      <span className="text-[9px] text-white/80 text-center leading-tight">
                        {{ ig: 'IG Reels', shorts: 'YT Shorts', tiktok: 'TikTok' }[key]}
                      </span>
                      <Switch
                        checked={store.safeAreaVisibility[key]}
                        onCheckedChange={val => {
                          store.setSafeAreaVisibility({ ...store.safeAreaVisibility, [key]: val })
                          triggerRedraw()
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}

              <div className="absolute bottom-2 left-2 z-10 px-2 py-0.5 rounded-md bg-black/50 backdrop-blur-sm text-[10px] font-mono text-white/70 select-none pointer-events-none">
                {({ '1080p': '1080×1920', '2k': '1440×2560', '4k': '2160×3840' } as const)[store.renderResolution]}
              </div>
            </div>
          </div>

          {/* Right: Panel */}
          <aside className="w-96 flex-shrink-0 rounded-xl border border-border bg-card overflow-y-auto">
          <div className="p-4 border-b border-border">
            <h2 className="text-base font-bold">鏡頭編輯器</h2>
            <p className="text-xs text-muted-foreground mt-1">
              {store.activeIndex >= 0
                ? `目前選擇：鏡頭 ${store.activeIndex + 1}`
                : '目前未選擇鏡頭'
              }
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {store.activeTab === 'caption'
                ? '字幕分頁顯示該鏡頭實際輸出畫面；可拖曳字幕與控制點。'
                : '點擊畫作新增鏡頭；拖曳藍色點改位置；拖曳白色框角落改 zoom。'
              }
            </p>
          </div>

          <div className="p-4">
            {/* Tab switcher */}
            <Tabs className="mb-4">
              <TabsList>
                <TabsTrigger
                  active={store.activeTab === 'camera'}
                  onClick={() => { store.setActiveTab('camera'); triggerRedraw() }}
                >
                  <Camera className="h-3.5 w-3.5" />
                  鏡頭
                </TabsTrigger>
                <TabsTrigger
                  active={store.activeTab === 'caption'}
                  onClick={() => { store.setActiveTab('caption'); triggerRedraw() }}
                >
                  <Type className="h-3.5 w-3.5" />
                  字幕
                </TabsTrigger>
                <TabsTrigger
                  active={store.activeTab === 'assist'}
                  onClick={() => { store.setActiveTab('assist'); triggerRedraw() }}
                >
                  <Settings className="h-3.5 w-3.5" />
                  輔助
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {store.activeTab === 'camera' && (
              <CameraPanel
                points={store.points}
                activeIndex={store.activeIndex}
                hasImage={!!store.image}
                image={store.image}
                backgroundSettings={store.backgroundSettings}
                onSelect={selectPointAndSyncTimeline}
                onRemove={i => { store.removePoint(i, store.points, store.activeIndex); triggerRedraw() }}
                onUpdateField={handleUpdatePointField}
                onAddStart={() => { store.addFullFramePoint('start', store.points, store.lastCaptionStyle, store.lastCameraSettings); triggerRedraw() }}
                onAddEnd={() => { store.addFullFramePoint('end', store.points, store.lastCaptionStyle, store.lastCameraSettings); triggerRedraw() }}
                onInsertAfter={handleInsertAfter}
                onDuplicate={handleDuplicatePoint}
                onReorder={handleReorderPoints}
              />
            )}

            {store.activeTab === 'caption' && (
              <CaptionEditor
                point={activePoint}
                disabled={!activePoint}
                activeCaptionIndex={activeCaptionIndex}
                onSetActiveCaptionIndex={setActiveCaptionIndex}
                onAddCaption={handleAddCaption}
                onDeleteCaption={handleDeleteCaption}
                onUpdateCaption={handleUpdateCaption}
                onUpdateHold={handleUpdateHold}
                onCenter={() => {
                  if (store.activeIndex >= 0) {
                    if (activeCaptionIndex === 0) {
                      const next = store.updateCaptionField(store.activeIndex, 'x', 0.5, store.points)
                      store.updateCaptionField(store.activeIndex, 'y', 0.82, next)
                    } else {
                      const extraIndex = activeCaptionIndex - 1
                      const next = store.updateExtraCaptionField(store.activeIndex, extraIndex, 'x', 0.5, store.points)
                      store.updateExtraCaptionField(store.activeIndex, extraIndex, 'y', 0.82, next)
                    }
                    triggerRedraw()
                  }
                }}
              />
            )}

            {store.activeTab === 'assist' && (
              <AssistPanel
                backgroundSettings={store.backgroundSettings}
                onBackgroundChange={s => { store.setBackgroundSettings(s); triggerRedraw() }}
                showAllPoints={store.showAllPoints}
                onlyActiveBox={store.onlyActiveBox}
                showCaptionBox={store.showCaptionBox}
                showGuidesInPreview={store.showGuidesInPreview}
                onToggle={(key, val) => {
                  if (key === 'showAllPoints') store.setShowAllPoints(val)
                  else if (key === 'onlyActiveBox') store.setOnlyActiveBox(val)
                  else if (key === 'showCaptionBox') store.setShowCaptionBox(val)
                  else if (key === 'showGuidesInPreview') store.setShowGuidesInPreview(val)
                  triggerRedraw()
                }}
                safeAreaVisibility={store.safeAreaVisibility}
                onSafeAreaChange={(key, val) => {
                  store.setSafeAreaVisibility({ ...store.safeAreaVisibility, [key]: val })
                  triggerRedraw()
                }}
              />
            )}
          </div>
        </aside>

        </div>

        {/* Timeline - full width */}
        <div className="flex-shrink-0 rounded-xl border border-border bg-card p-3">
          <TimelinePanel
            ref={timelinePanelRef}
            points={store.points}
            currentTime={currentTime}
            totalDuration={totalDuration}
            isPreviewing={store.isPreviewing}
            isDisabled={isDisabled || !store.image}
            onTimeChange={t => {
              store.setIsPreviewing(false)
              drawTimelineTime(t, store.showGuidesInPreview)
              timelinePanelRef.current?.setTimeCursor(t)
              setCurrentTime(t)
              currentTimeRef.current = t
              triggerRedraw()
            }}
            onHoldDurationChange={(index, duration) => {
              store.updatePointField(index, 'holdDuration', duration, store.points)
              triggerRedraw()
            }}
            onMoveDurationChange={(index, duration) => {
              store.updatePointField(index, 'moveDuration', duration, store.points)
              triggerRedraw()
            }}
            onPlay={previewPath}
            onPause={() => { previewCancelRef.current = true; store.setIsPreviewing(false) }}
            onPointSelect={selectPointAndSyncTimeline}
          />
        </div>
      </div>

      {isAiPanelOpen && (
        <AiGeneratePanel
          image={store.image}
          onGenerated={handleAiGenerated}
          onClose={() => setIsAiPanelOpen(false)}
        />
      )}

      <MasterworkPickerModal
        open={isMasterworkPickerOpen}
        onClose={() => setIsMasterworkPickerOpen(false)}
        onSelectImage={(url, title) => loadImageFromUrl(url, title)}
      />

      {isImmersiveMode && (
        <div className={`${isImmersiveLeaving ? 'immersive-leave' : 'immersive-enter'} fixed inset-0 z-[95] bg-black/90 flex items-center justify-center`}>
          {/* 關閉按鈕 */}
          <button
            className="absolute top-4 right-4 z-10 h-9 w-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
            onClick={closeImmersiveMode}
            title="離開沉浸式定位 (Esc)"
          >
            <X className="h-5 w-5" />
          </button>

          {/* 9:16 畫布容器，盡量撐大但不超出視窗 */}
          <div
            className={`${isImmersiveLeaving ? 'immersive-canvas-leave' : 'immersive-canvas-enter'} relative rounded-2xl overflow-hidden border border-white/10`}
            style={{
              aspectRatio: '9 / 16',
              maxHeight: 'calc(100vh - 32px)',
              maxWidth: 'calc(100vw - 32px)',
            }}
          >
            <CanvasEditor
              image={store.image}
              points={store.points}
              activeIndex={store.activeIndex}
              activeTab={store.activeTab}
              backgroundSettings={store.backgroundSettings}
              safeAreaVisibility={store.safeAreaVisibility}
              showAllPoints={store.showAllPoints}
              onlyActiveBox={store.onlyActiveBox}
              showCaptionBox={store.showCaptionBox}
              showGuidesInPreview={store.showGuidesInPreview}
              isRendering={store.isRendering}
              isPreviewing={store.isPreviewing}
              onPointAdd={handlePointAdd}
              onPointMove={handlePointMove}
              onPointResize={handlePointResize}
              onPointSelect={selectPointAndSyncTimeline}
              onCaptionMove={handleCaptionMove}
              onCaptionFontResize={handleCaptionFontResize}
              onCaptionBoxWidth={handleCaptionBoxWidth}
              onCaptionBoxHeight={handleCaptionBoxHeight}
              onDragEnd={triggerRedraw}
              onPointDelete={i => { store.removePoint(i, store.points, store.activeIndex); triggerRedraw() }}
              onEnterCaption={() => { store.setActiveTab('caption'); triggerRedraw() }}
              onBackToCamera={() => { store.setActiveTab('camera'); triggerRedraw() }}
              activeCaptionIndex={activeCaptionIndex}
              onCaptionSelect={setActiveCaptionIndex}
              snapGuide={snapGuide}
              setSnapGuide={setSnapGuide}
              dragStateRef={dragStateRef}
              currentTimeRef={currentTimeRef}
              forceRedraw={forceRedraw}
            />
          </div>
        </div>
      )}

      {isFocusMode && (
        <div className="fixed inset-0 z-[80] bg-background/90 backdrop-blur-sm">
          <div className="h-full p-3 md:p-5 flex flex-col gap-3">
            <div className="rounded-xl border border-border bg-card px-3 py-2.5 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm md:text-base font-bold">鏡頭定位模式</h3>
                <p className="text-xs text-muted-foreground">拖曳畫布上的藍點或白色框角落調整鏡頭。按 Esc 或「完成定位」回到原本介面。</p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={requestFullscreen}>
                  <Maximize className="h-3.5 w-3.5" />
                  全螢幕
                </Button>
                <Button size="sm" onClick={closeFocusMode}>
                  <X className="h-3.5 w-3.5" />
                  完成定位
                </Button>
              </div>
            </div>

            <div className="flex-1 min-h-0 flex gap-3">
              <div className="flex-1 min-w-0 rounded-2xl border border-border bg-card overflow-hidden flex items-center justify-center">
                <CanvasEditor
                  image={store.image}
                  points={store.points}
                  activeIndex={store.activeIndex}
                  activeTab={store.activeTab}
                  backgroundSettings={store.backgroundSettings}
                  safeAreaVisibility={store.safeAreaVisibility}
                  showAllPoints={store.showAllPoints}
                  onlyActiveBox={store.onlyActiveBox}
                  showCaptionBox={store.showCaptionBox}
                  showGuidesInPreview={store.showGuidesInPreview}
                  isRendering={store.isRendering}
                  isPreviewing={store.isPreviewing}
                  onPointAdd={handlePointAdd}
                  onPointMove={handlePointMove}
                  onPointResize={handlePointResize}
                    onPointSelect={selectPointAndSyncTimeline}
                  onCaptionMove={handleCaptionMove}
                  onCaptionFontResize={handleCaptionFontResize}
                  onCaptionBoxWidth={handleCaptionBoxWidth}
                  onCaptionBoxHeight={handleCaptionBoxHeight}
                  onDragEnd={triggerRedraw}
                  onPointDelete={i => { store.removePoint(i, store.points, store.activeIndex); triggerRedraw() }}
                  onEnterCaption={() => { store.setActiveTab('caption'); triggerRedraw() }}
                  onBackToCamera={() => { store.setActiveTab('camera'); triggerRedraw() }}
                  activeCaptionIndex={activeCaptionIndex}
                  onCaptionSelect={setActiveCaptionIndex}
                  snapGuide={snapGuide}
                  setSnapGuide={setSnapGuide}
                  dragStateRef={dragStateRef}
                  currentTimeRef={currentTimeRef}
                  forceRedraw={forceRedraw}
                />
              </div>

              <aside className="hidden lg:block w-80 xl:w-96 rounded-2xl border border-border bg-card overflow-y-auto">
                <div className="p-4 border-b border-border">
                  <h4 className="text-sm font-bold">快速鏡頭清單</h4>
                  <p className="text-xs text-muted-foreground mt-1">可直接切換鏡頭、調整 zoom 與停留秒數，並即時在放大畫布定位。</p>
                </div>
                <div className="p-4">
                  <CameraPanel
                    points={store.points}
                    activeIndex={store.activeIndex}
                    hasImage={!!store.image}
                    image={store.image}
                    backgroundSettings={store.backgroundSettings}
                    onSelect={selectPointAndSyncTimeline}
                    onRemove={i => { store.removePoint(i, store.points, store.activeIndex); triggerRedraw() }}
                    onUpdateField={handleUpdatePointField}
                    onAddStart={() => { store.addFullFramePoint('start', store.points, store.lastCaptionStyle, store.lastCameraSettings); triggerRedraw() }}
                    onAddEnd={() => { store.addFullFramePoint('end', store.points, store.lastCaptionStyle, store.lastCameraSettings); triggerRedraw() }}
                    onInsertAfter={handleInsertAfter}
                    onDuplicate={handleDuplicatePoint}
                    onReorder={handleReorderPoints}
                  />
                </div>
              </aside>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} storageKey="artful-theme">
      <AppInner />
    </ThemeProvider>
  )
}
