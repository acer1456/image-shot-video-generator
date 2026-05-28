import { useRef, useCallback, useState, useEffect } from 'react'
import { ThemeProvider, useTheme } from 'next-themes'
import CanvasEditor from '@/components/CanvasEditor'
import CameraPanel from '@/components/CameraPanel'
import CaptionEditor from '@/components/CaptionEditor'
import AssistPanel from '@/components/AssistPanel'
import TimelinePanel from '@/components/TimelinePanel'
import type { TimelinePanelHandle } from '@/components/TimelinePanel'
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
  Maximize, Maximize2, Upload, Camera, Type, Settings, MoreHorizontal, ChevronDown, X
} from 'lucide-react'
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu'
import { convertPointsCaptions, type ChineseConversion } from '@/lib/chinese'

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

  const triggerRedraw = useCallback(() => setForceRedraw(n => n + 1), [])

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

  // Draw a frame using an explicit set of points (used for video export to support Chinese conversion).
  // Mirrors drawTimelineTime's behaviour (including setActiveIndex) so the RAF / React scheduler
  // cycle stays consistent and the render loop terminates at the correct wall-clock time.
  const drawFrameWithPoints = useCallback((time: number, points: CameraPoint[]) => {
    const canvas = getCanvas()
    if (!canvas || !store.image) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const state = getTimelineStateAt(store.image, points, time)
    if (!state) return
    store.setActiveIndex(state.pointIndex)
    doDrawCamera(canvas, ctx, store.image, state.camera, store.backgroundSettings, state.captionPoint, false, false, snapGuide)
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
      const canvas = getCanvas()
      if (!canvas) throw new Error('Canvas not found')
      canvas.width = OUTPUT_W
      canvas.height = OUTPUT_H
      const renderPoints = captionConversion === 'original'
        ? store.points
        : convertPointsCaptions(store.points, captionConversion)
      const { totalDuration: td } = buildTimeline(renderPoints)
      // Prime the canvas with frame 0 BEFORE starting the recorder
      // to prevent a transparent/white opening frame in the exported video
      drawFrameWithPoints(0, renderPoints)
      await nextFrame()
      const stream = canvas.captureStream(30)
      const chunks: BlobPart[] = []
      const mimeType = getBestVideoMimeType()
      const recorder = new MediaRecorder(stream, { mimeType })
      recorder.ondataavailable = event => { if (event.data.size > 0) chunks.push(event.data) }
      const done = new Promise<void>(resolve => { recorder.onstop = () => resolve() })
      recorder.start()
      const start = performance.now()
      while (true) {
        const elapsed = (performance.now() - start) / 1000
        const t = Math.min(elapsed, td)
        drawFrameWithPoints(t, renderPoints)
        if (t >= td) break
        await nextFrame()
      }
      await wait(150)
      recorder.stop()
      await done
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
  }, [store, getCanvas, drawFrameWithPoints, triggerRedraw])

  // ---------- Save / Load project ----------
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

  const handleCaptionMove = useCallback((index: number, x: number, y: number) => {
    const next = store.updateCaptionField(index, 'x', x, store.points)
    store.updateCaptionField(index, 'y', y, next)
    store.rememberCaptionStyle(index, next)
    triggerRedraw()
  }, [store, triggerRedraw])

  const handleCaptionFontResize = useCallback((index: number, scale: number) => {
    const next = store.updateCaptionField(index, 'scale', scale, store.points)
    store.updateCaptionField(index, 'subtitleScale', scale, next)
    store.rememberCaptionStyle(index, next)
    triggerRedraw()
  }, [store, triggerRedraw])

  const handleCaptionBoxWidth = useCallback((index: number, boxScaleX: number) => {
    store.updateCaptionField(index, 'boxScaleX', boxScaleX, store.points)
    triggerRedraw()
  }, [store, triggerRedraw])

  const handleCaptionBoxHeight = useCallback((index: number, boxScaleY: number) => {
    store.updateCaptionField(index, 'boxScaleY', boxScaleY, store.points)
    triggerRedraw()
  }, [store, triggerRedraw])

  const handleUpdateCaption = useCallback(<K extends keyof CaptionData>(field: K, value: CaptionData[K]) => {
    if (store.activeIndex < 0) return
    const next = store.updateCaptionField(store.activeIndex, field, value, store.points)
    store.rememberCaptionStyle(store.activeIndex, next)
    triggerRedraw()
  }, [store, triggerRedraw])

  const handleUpdateHold = useCallback((value: number) => {
    if (store.activeIndex < 0) return
    store.updatePointField(store.activeIndex, 'holdDuration', value, store.points)
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
    setIsImmersiveMode(false)
    setSnapGuide({ x: false, y: false })
    triggerRedraw()
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
        <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()} disabled={isDisabled}>
          <Upload className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">上傳圖片</span>
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => {
            const file = e.target.files?.[0]
            if (file) store.loadImageFile(file, true, store.imageUrl)
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

        <div className="ml-auto flex items-center gap-1.5">
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
                onUpdateCaption={handleUpdateCaption}
                onUpdateHold={handleUpdateHold}
                onCenter={() => {
                  if (store.activeIndex >= 0) {
                    const next = store.updateCaptionField(store.activeIndex, 'x', 0.5, store.points)
                    store.updateCaptionField(store.activeIndex, 'y', 0.82, next)
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

      {isImmersiveMode && (
        <div className="fixed inset-0 z-[95] bg-black/90 flex items-center justify-center">
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
            className="relative rounded-2xl overflow-hidden border border-white/10"
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
