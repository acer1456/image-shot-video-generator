import { useRef, useCallback, useState, useEffect, useMemo } from 'react'
import { ThemeProvider } from 'next-themes'
import CanvasEditor from '@/components/canvas/CanvasEditor'
import TimelinePanel from '@/components/panel/TimelinePanel'
import type { TimelinePanelHandle } from '@/components/panel/TimelinePanel'
import AiGeneratePanel from '@/components/panel/AiGeneratePanel'
import { MasterworkPickerModal } from '@/components/panel/MasterworkPickerModal'
import { AppToolbar } from '@/components/panel/AppToolbar'
import { CanvasSection } from '@/components/canvas/CanvasSection'
import { EditorSidebar } from '@/components/panel/EditorSidebar'
import { NarrationSidebar } from '@/components/panel/NarrationSidebar'
import type { NarrationAICameraResult, NarrationAIStoryResult } from '@/components/panel/NarrationAIPanel'
import { ImmersiveOverlay } from '@/components/ImmersiveOverlay'
import { Button } from '@/components/ui/button'
import { useAppStore, normalizePoint } from '@/hooks/useAppStore'
import { useAutosave } from '@/hooks/useAutosave'
import { useProjectIO } from '@/hooks/useProjectIO'
import { useVideoRender } from '@/hooks/useVideoRender'
import type { CameraPoint, CaptionData, DragState, ImageOverlay, NarrationTrack, SubtitleCue, SubtitleStyle } from '@/types'
import { fileToOverlayDataUrl, getOverlayImage } from '@/lib/overlays'
import { OUTPUT_W, clamp, normalizeProjectName, nextFrame } from '@/lib/utils'
import {
  drawCamera as doDrawCamera,
  getTimelineStateAt, buildTimeline,
} from '@/lib/canvas'
import type { AiGenerateResult } from '@/lib/openrouter'
import {
  getActiveSubtitleCue,
  getNarrationDuration,
  getSubtitleRenderText,
  scheduleNarrationAudio,
  stopNarrationAudio,
} from '@/lib/narration'

function AppInner() {
  const store = useAppStore()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const loadProjectInputRef = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const dragStateRef = useRef<DragState | null>(null)
  const currentTimeRef = useRef(0)
  const previewCancelRef = useRef(false)
  const timelinePanelRef = useRef<TimelinePanelHandle>(null)
  const lastUiUpdateRef = useRef(0)
  const [snapGuide, setSnapGuide] = useState({ x: false, y: false })
  const [forceRedraw, setForceRedraw] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [isImmersiveMode, setIsImmersiveMode] = useState(false)
  const [isImmersiveLeaving, setIsImmersiveLeaving] = useState(false)
  const [isAiPanelOpen, setIsAiPanelOpen] = useState(false)
  const [isMasterworkPickerOpen, setIsMasterworkPickerOpen] = useState(false)
  const [activeCaptionIndex, setActiveCaptionIndex] = useState(0)
  const [isTimelineExpanded, setIsTimelineExpanded] = useState(false)
  const [narrationTrack, setNarrationTrack] = useState<NarrationTrack | null>(null)
  const [subtitleCues, setSubtitleCues] = useState<SubtitleCue[]>([])
  const [imageOverlays, setImageOverlays] = useState<ImageOverlay[]>([])
  const [overlaysLocked, setOverlaysLocked] = useState(false)
  const [activeSubtitleId, setActiveSubtitleId] = useState<string | null>(null)
  const [narrationInputText, setNarrationInputText] = useState('')
  const [isNarrationCollapsed, setIsNarrationCollapsed] = useState(false)
  const [isEditorSidebarCollapsed, setIsEditorSidebarCollapsed] = useState(false)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const narrationSourcesRef = useRef<AudioBufferSourceNode[]>([])

  useEffect(() => { setActiveCaptionIndex(0) }, [store.activeIndex])

  const triggerRedraw = useCallback(() => setForceRedraw(n => n + 1), [])

  const releasePreviewNarrationAudio = useCallback(() => {
    stopNarrationAudio(narrationSourcesRef)
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      audioCtxRef.current.close().catch(() => undefined)
    }
    audioCtxRef.current = null
  }, [])

  const handleNarrationTrackChange = useCallback((track: NarrationTrack | null) => {
    releasePreviewNarrationAudio()
    setNarrationTrack(track)
  }, [releasePreviewNarrationAudio])

  const { loadingPainting, loadImageFromUrl, saveProject, loadProject } = useProjectIO(store, triggerRedraw, {
    narrationInputText,
    narrationTrack,
    subtitleCues,
    imageOverlays,
    overlaysLocked,
    setNarrationInputText,
    setNarrationTrack,
    setSubtitleCues,
    setImageOverlays,
    setOverlaysLocked,
  })
  const { showRestoreModal, pendingRestore, handleRestoreAutosave, handleDiscardAutosave } = useAutosave({
    store,
    narrationInputText,
    narrationTrack,
    subtitleCues,
    imageOverlays,
    overlaysLocked,
    setNarrationInputText,
    setNarrationTrack,
    setSubtitleCues,
    setImageOverlays,
    setOverlaysLocked,
    triggerRedraw,
  })

  const totalDuration = useMemo(() => {
    const { totalDuration: td } = buildTimeline(store.points)
    const narrationEnd = store.showNarrationInOutput && narrationTrack ? narrationTrack.startTime + getNarrationDuration(narrationTrack) : 0
    const subtitleEnd = store.showNarrationInOutput
      ? subtitleCues.reduce((max, cue) => Math.max(max, cue.startTime + cue.duration), 0)
      : 0
    const overlayEnd = imageOverlays.reduce((max, overlay) => Math.max(max, overlay.startTime + overlay.duration), 0)
    return Math.max(td, narrationEnd, subtitleEnd, overlayEnd)
  }, [store.points, store.showNarrationInOutput, narrationTrack, subtitleCues, imageOverlays])

  // ---------- Canvas drawing helpers exposed to parent ----------
  const getCanvas = useCallback((): HTMLCanvasElement | null => {
    if (canvasRef.current) return canvasRef.current
    const el = document.querySelector('canvas') as HTMLCanvasElement | null
    canvasRef.current = el
    return el
  }, [])

  const { renderVideo, renderProgress } = useVideoRender({
    store,
    getCanvas,
    triggerRedraw,
    narrationTrack,
    subtitleCues,
    imageOverlays,
    showNarration: store.showNarrationInOutput,
    showCameraCaptions: store.showCameraCaptionsInOutput,
  })

  // ---------- 疊加圖片 ----------
  const handleOverlayImageFile = useCallback(async (file: File) => {
    try {
      const dataUrl = await fileToOverlayDataUrl(file)
      const overlay: ImageOverlay = {
        id: crypto.randomUUID(),
        name: file.name.replace(/\.[^.]+$/, '') || '圖片',
        dataUrl,
        x: 0.5,
        y: 0.35,
        scale: 0.4,
        opacity: 1,
        startTime: Math.max(0, currentTimeRef.current),
        duration: 4,
      }
      getOverlayImage(overlay, triggerRedraw)
      setImageOverlays(prev => [...prev, overlay])
      triggerRedraw()
    } catch (err) {
      alert(err instanceof Error ? err.message : '疊加圖片載入失敗')
    }
  }, [triggerRedraw])

  const handleOverlayChange = useCallback((id: string, patch: Partial<ImageOverlay>) => {
    setImageOverlays(prev => prev.map(overlay => overlay.id === id ? { ...overlay, ...patch } : overlay))
    triggerRedraw()
  }, [triggerRedraw])

  const handleImageOverlaysChange = useCallback((overlays: ImageOverlay[]) => {
    for (const overlay of overlays) getOverlayImage(overlay, triggerRedraw)
    setImageOverlays(overlays)
    triggerRedraw()
  }, [triggerRedraw])

  const drawTimelineTime = useCallback((time: number, guides: boolean) => {
    const canvas = getCanvas()
    if (!canvas || !store.image) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const state = getTimelineStateAt(store.image, store.points, time)
    if (!state) return
    store.setActiveIndex(state.pointIndex)
    const cue = store.showNarrationInOutput ? getActiveSubtitleCue(subtitleCues, time) : null
    const narrationText = getSubtitleRenderText(cue)
    const captionPoint = store.showCameraCaptionsInOutput ? state.captionPoint : null
    doDrawCamera(canvas, ctx, store.image, state.camera, store.backgroundSettings, captionPoint, guides && store.showCaptionBox, store.showCaptionBox, snapGuide, 0, narrationText || undefined, cue?.style, imageOverlays, time, false)
  }, [getCanvas, store, snapGuide, subtitleCues, imageOverlays])

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
    // Schedule narration audio from the start position
    if (store.showNarrationInOutput) {
      scheduleNarrationAudio(narrationTrack, startTime, audioCtxRef, narrationSourcesRef)
    } else {
      stopNarrationAudio(narrationSourcesRef)
    }
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
    stopNarrationAudio(narrationSourcesRef)
    // Final accurate update for time display and cursor after playback ends
    setCurrentTime(currentTimeRef.current)
    timelinePanelRef.current?.setTimeCursor(currentTimeRef.current)
    store.setIsPreviewing(false)
    triggerRedraw()
  }, [store, totalDuration, drawTimelineTime, triggerRedraw, narrationTrack])

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
    const next = store.updateCaptionPosition(index, captionIndex, x, y, store.points)
    if (captionIndex === 0) store.rememberCaptionStyle(index, next)
  }, [store])

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

  // 把旁白字幕卡片的 SubtitleStyle 對應轉成鏡頭字幕（CaptionData）欄位，套用到目前選取的鏡頭
  const handleApplySubtitleStyleToCameraCaption = useCallback((style: SubtitleStyle) => {
    if (store.activeIndex < 0 || !store.points[store.activeIndex]) {
      alert('請先在時間軸或鏡頭列表選擇一個鏡頭')
      return
    }
    // 鏡頭字幕主字 = 56px × scale（以 1080 輸出寬為基準）；字幕卡片主字 = fontSizeRatio × 1080
    const scale = clamp(style.fontSizeRatio * OUTPUT_W / 56, 0.3, 3)
    // 副字 = 34px × scale × subtitleScale，要等於主字 × translationScale
    const subtitleScale = clamp(style.translationScale * 56 / 34, 0.3, 3)
    const patch: Partial<CaptionData> = {
      fontFamily: style.fontFamily,
      subtitleFontFamily: style.fontFamily,
      scale,
      subtitleScale,
      x: style.subtitlePosition.x,
      y: style.subtitlePosition.y,
      textColor: style.color,
      subTextColor: style.color,
      strokeEnabled: style.strokeEnabled,
      strokeColor: style.strokeColor,
      strokeWidth: style.strokeWidth,
      shadowBoxVisible: style.backgroundEnabled,
      shadowColor: '#000000',
      shadowAlpha: style.backgroundOpacity,
      // 陰影參數模型已與字幕卡片一致，直接一對一對應
      textShadowEnabled: style.shadowEnabled,
      textShadowBlur: style.shadowBlur,
      textShadowOpacity: style.shadowOpacity,
    }
    let next = store.points
    for (const [field, value] of Object.entries(patch)) {
      next = store.updateCaptionField(store.activeIndex, field as keyof CaptionData, value as never, next)
    }
    store.rememberCaptionStyle(store.activeIndex, next)
    triggerRedraw()
  }, [store, triggerRedraw])

  const handleNarrationAiStoryApply = useCallback((result: NarrationAIStoryResult) => {
    setNarrationInputText(result.narrationInputText)
  }, [])

  const handleNarrationAiCameraApply = useCallback((result: NarrationAICameraResult) => {
    const newPoints = result.points.map(point => {
      const rawPoint = {
        x: point.x,
        y: point.y,
        zoom: point.zoom,
        move: point.move,
        moveDuration: point.moveDuration,
        holdDuration: point.holdDuration,
        caption: {
          text: point.caption.text,
          subtitle: point.caption.subtitle,
          x: point.caption.x ?? point.caption.captionX ?? 0.5,
          y: point.caption.y ?? point.caption.captionY ?? 0.85,
        },
      } as unknown as Parameters<typeof normalizePoint>[0]
      return normalizePoint(rawPoint)
    })
    store.setPoints(newPoints)
    store.setActiveIndex(newPoints.length ? 0 : -1)
    store.setActiveTab('camera')
    currentTimeRef.current = 0
    setCurrentTime(0)
    timelinePanelRef.current?.setTimeCursor(0)
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
    if (!isImmersiveMode) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeImmersiveMode()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isImmersiveMode, closeImmersiveMode])

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
  const activeSubtitleCue = store.showNarrationInOutput ? subtitleCues.find(cue => cue.id === activeSubtitleId) ?? null : null
  const currentSubtitleCue = activeSubtitleCue ?? (store.showNarrationInOutput ? getActiveSubtitleCue(subtitleCues, currentTimeRef.current) : null)
  const updateActiveSubtitleStyle = (pos: { x: number; y: number }) => {
    if (!currentSubtitleCue) return
    setSubtitleCues(cues => cues.map(cue =>
      cue.id === currentSubtitleCue.id
        ? { ...cue, style: { ...cue.style, subtitlePosition: pos } }
        : cue
    ))
  }

  const canvasEditorProps = {
    image: store.image,
    points: store.points,
    activeIndex: store.activeIndex,
    activeTab: store.activeTab,
    backgroundSettings: store.backgroundSettings,
    safeAreaVisibility: store.safeAreaVisibility,
    showAllPoints: store.showAllPoints,
    onlyActiveBox: store.onlyActiveBox,
    showCaptionBox: store.showCaptionBox,
    showGuidesInPreview: store.showGuidesInPreview,
    showCameraCaptionsInOutput: store.showCameraCaptionsInOutput,
    isRendering: store.isRendering,
    isPreviewing: store.isPreviewing,
    onPointAdd: handlePointAdd,
    onPointMove: handlePointMove,
    onPointResize: handlePointResize,
    onPointSelect: selectPointAndSyncTimeline,
    onCaptionMove: handleCaptionMove,
    onCaptionFontResize: handleCaptionFontResize,
    onCaptionBoxWidth: handleCaptionBoxWidth,
    onCaptionBoxHeight: handleCaptionBoxHeight,
    onDragEnd: triggerRedraw,
    onPointDelete: (i: number) => { store.removePoint(i, store.points, store.activeIndex); triggerRedraw() },
    onEnterCaption: () => { store.setActiveTab('caption'); triggerRedraw() },
    onBackToCamera: () => { store.setActiveTab('camera'); triggerRedraw() },
    activeCaptionIndex,
    onCaptionSelect: setActiveCaptionIndex,
    snapGuide,
    setSnapGuide,
    dragStateRef,
    currentTimeRef,
    forceRedraw,
    narrationText: getSubtitleRenderText(currentSubtitleCue) || undefined,
    subtitleStyle: currentSubtitleCue?.style,
    onSubtitlePositionChange: updateActiveSubtitleStyle,
    imageOverlays,
    overlaysLocked,
    onOverlayChange: handleOverlayChange,
  } as React.ComponentPropsWithoutRef<typeof CanvasEditor>

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background text-foreground">
      <AppToolbar
        isDisabled={isDisabled}
        loadingPainting={loadingPainting}
        isRendering={store.isRendering}
        renderProgress={renderProgress}
        hasImage={!!store.image}
        hasPoints={!!store.points.length}
        image={store.image}
        points={store.points}
        backgroundSettings={store.backgroundSettings}
        projectName={store.projectName}
        fileInputRef={fileInputRef as React.RefObject<HTMLInputElement>}
        loadProjectInputRef={loadProjectInputRef as React.RefObject<HTMLInputElement>}
        onProjectNameChange={name => store.setProjectName(normalizeProjectName(name))}
        onImageFile={file => store.loadImageFile(file, !store.image, store.imageUrl)}
        onOverlayImageFile={handleOverlayImageFile}
        onLoadFile={loadProject}
        onOpenMasterworkPicker={() => setIsMasterworkPickerOpen(true)}
        onOpenAiPanel={() => setIsAiPanelOpen(true)}
        onRenderVideo={renderVideo}
        onSave={saveProject}
        onClearPoints={() => store.clearPoints()}
        onRequestFullscreen={requestFullscreen}
      />

      <div className="flex flex-1 min-h-0 flex-col overflow-hidden p-2 gap-2">
        <div className="flex flex-1 min-h-0 overflow-hidden gap-2">
          <NarrationSidebar
            track={narrationTrack}
            onTrackChange={handleNarrationTrackChange}
            subtitleCues={subtitleCues}
            onSubtitleCuesChange={setSubtitleCues}
            activeSubtitleId={activeSubtitleId}
            onActiveSubtitleIdChange={setActiveSubtitleId}
            inputText={narrationInputText}
            onInputTextChange={setNarrationInputText}
            image={store.image}
            onApplyAiStory={handleNarrationAiStoryApply}
            onApplyAiCamera={handleNarrationAiCameraApply}
            onApplyStyleToCameraCaption={handleApplySubtitleStyleToCameraCaption}
            collapsed={isNarrationCollapsed}
            onToggleCollapse={() => setIsNarrationCollapsed(v => !v)}
          />
          <CanvasSection
            isDisabled={isDisabled}
            hasImage={!!store.image}
            activeTab={store.activeTab}
            onTabChange={tab => { store.setActiveTab(tab); triggerRedraw() }}
            onOpenImmersiveMode={openImmersiveMode}
            showAllPoints={store.showAllPoints}
            onlyActiveBox={store.onlyActiveBox}
            showCaptionBox={store.showCaptionBox}
            showGuidesInPreview={store.showGuidesInPreview}
            showNarrationInOutput={store.showNarrationInOutput}
            showCameraCaptionsInOutput={store.showCameraCaptionsInOutput}
            onToggle={(key, val) => {
              if (key === 'showAllPoints') store.setShowAllPoints(val)
              else if (key === 'onlyActiveBox') store.setOnlyActiveBox(val)
              else if (key === 'showCaptionBox') store.setShowCaptionBox(val)
              else if (key === 'showGuidesInPreview') store.setShowGuidesInPreview(val)
              else if (key === 'showNarrationInOutput') {
                store.setShowNarrationInOutput(val)
                if (!val) stopNarrationAudio(narrationSourcesRef)
              }
              else if (key === 'showCameraCaptionsInOutput') store.setShowCameraCaptionsInOutput(val)
              triggerRedraw()
            }}
            safeAreaVisibility={store.safeAreaVisibility}
            onSafeAreaChange={(key, val) => { store.setSafeAreaVisibility({ ...store.safeAreaVisibility, [key]: val }); triggerRedraw() }}
            canvasEditorProps={canvasEditorProps}
          />

          <EditorSidebar
            points={store.points}
            activeIndex={store.activeIndex}
            activeTab={store.activeTab}
            activePoint={activePoint}
            activeCaptionIndex={activeCaptionIndex}
            image={store.image}
            backgroundSettings={store.backgroundSettings}
            collapsed={isEditorSidebarCollapsed}
            onToggleCollapse={() => setIsEditorSidebarCollapsed(v => !v)}
            handlers={{
              onSelect: selectPointAndSyncTimeline,
              onRemovePoint: i => { store.removePoint(i, store.points, store.activeIndex); triggerRedraw() },
              onUpdateField: handleUpdatePointField,
              onAddStart: () => { store.addFullFramePoint('start', store.points, store.lastCaptionStyle, store.lastCameraSettings); triggerRedraw() },
              onAddEnd: () => { store.addFullFramePoint('end', store.points, store.lastCaptionStyle, store.lastCameraSettings); triggerRedraw() },
              onInsertAfter: handleInsertAfter,
              onDuplicate: handleDuplicatePoint,
              onReorder: handleReorderPoints,
              onOpenCaption: i => { selectPointAndSyncTimeline(i); store.setActiveTab('caption'); triggerRedraw() },
              onApplyCaptionAsGlobal: () => {
                const pt = store.points[store.activeIndex]
                if (!pt) return
                const { text: _t, subtitle: _s, x: _x, y: _y, ...style } = pt.caption
                // 套用樣式到所有現有鏡頭（保留各自的文字與位置）
                const updated = store.points.map(p => ({
                  ...p,
                  caption: { ...p.caption, ...style },
                  extraCaptions: p.extraCaptions?.map(ec => ({ ...ec, ...style })),
                }))
                store.setPoints(updated)
                // 同步設為未來新增鏡頭的預設樣式
                store.setLastCaptionStyle(style)
                triggerRedraw()
              },
              onSetActiveCaptionIndex: setActiveCaptionIndex,
              onAddCaption: handleAddCaption,
              onDeleteCaption: handleDeleteCaption,
              onUpdateCaption: handleUpdateCaption,
              onUpdateHold: handleUpdateHold,
              onCenterCaption: () => {
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
              },
              onTabChange: tab => { store.setActiveTab(tab); triggerRedraw() },
              onBackgroundChange: s => { store.setBackgroundSettings(s); triggerRedraw() },
            }}
          />
        </div>

        <div className="flex-shrink-0 rounded-lg border border-border bg-card p-3">
          <TimelinePanel
            ref={timelinePanelRef}
            points={store.points}
            currentTime={currentTime}
            totalDuration={totalDuration}
            isPreviewing={store.isPreviewing}
            isDisabled={isDisabled || !store.image}
            expanded={isTimelineExpanded}
            onToggleExpanded={() => setIsTimelineExpanded(v => !v)}
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
            onPause={() => { previewCancelRef.current = true; store.setIsPreviewing(false); stopNarrationAudio(narrationSourcesRef) }}
            onPointSelect={selectPointAndSyncTimeline}
            narrationTrack={narrationTrack}
            onNarrationTrackChange={handleNarrationTrackChange}
            subtitleCues={subtitleCues}
            onSubtitleCuesChange={setSubtitleCues}
            onSubtitleSelect={setActiveSubtitleId}
            imageOverlays={imageOverlays}
            onImageOverlaysChange={handleImageOverlaysChange}
            overlaysLocked={overlaysLocked}
            onToggleOverlaysLocked={() => setOverlaysLocked(v => !v)}
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
        <ImmersiveOverlay
          isLeaving={isImmersiveLeaving}
          onClose={closeImmersiveMode}
          canvasEditorProps={canvasEditorProps}
        />
      )}

      {/* 自動暫存還原 Modal */}
      {showRestoreModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-xl p-6 w-80 shadow-2xl flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <h2 className="text-base font-semibold">發現未完成的工作</h2>
              <p className="text-sm text-muted-foreground">
                找到上次未完成的專案「{String(pendingRestore?.name ?? '未命名')}」，要繼續編輯嗎？
              </p>
              {Boolean(pendingRestore?.savedAt) && (
                <p className="text-xs text-muted-foreground">
                  暫存於 {new Date(String(pendingRestore!.savedAt)).toLocaleString('zh-TW')}
                </p>
              )}
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={handleDiscardAutosave}>重新開始</Button>
              <Button size="sm" onClick={handleRestoreAutosave}>繼續編輯</Button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} storageKey="artful-theme">
      <AppInner />
    </ThemeProvider>
  )
}
