import { useRef, useEffect, useCallback } from 'react'
import type { CameraPoint, BackgroundSettings, ImageOverlay, MosaicStroke, SafeAreaVisibility, ActiveTab, DragState, SubtitleStyle } from '@/types'
import { drawOverlays, findOverlayHit, getOverlayCanvasRect } from '@/lib/overlays'
import { getMosaickedImage } from '@/lib/mosaic'
import {
  OUTPUT_W, OUTPUT_H, clamp, distance
} from '@/lib/utils'
import {
  fitImageRect, getViewBoxCanvas, getCameraSourceRect,
  composeFrame, drawChrome, timeOfPoint, drawCaptionSafeArea,
  getCaptionLayout, getAllCaptions,
  imageToCanvasPoint, canvasToImageRatio, type Scene
} from '@/lib/canvas'
import { useTheme } from 'next-themes'

interface CanvasEditorProps {
  /** 編輯器要畫的內容。與匯出共用同一組 layer，只是多疊一層 chrome。 */
  scene: Scene
  image: HTMLImageElement | null
  points: CameraPoint[]
  activeIndex: number
  activeTab: ActiveTab
  backgroundSettings: BackgroundSettings
  safeAreaVisibility: SafeAreaVisibility
  showAllPoints: boolean
  onlyActiveBox: boolean
  showCaptionBox: boolean
  showGuidesInPreview: boolean
  showCameraCaptionsInOutput: boolean
  isRendering: boolean
  isPreviewing: boolean
  onPointAdd: (x: number, y: number) => void
  onPointMove: (index: number, x: number, y: number) => void
  onPointResize: (index: number, zoom: number) => void
  onPointSelect: (index: number) => void
  onCaptionMove: (index: number, captionIndex: number, x: number, y: number) => void
  onCaptionFontResize: (index: number, captionIndex: number, scale: number) => void
  onCaptionBoxWidth: (index: number, captionIndex: number, boxScaleX: number) => void
  onCaptionBoxHeight: (index: number, captionIndex: number, boxScaleY: number) => void
  onDragEnd: () => void
  snapGuide: { x: boolean; y: boolean }
  setSnapGuide: (guide: { x: boolean; y: boolean }) => void
  dragStateRef: React.MutableRefObject<DragState | null>
  currentTimeRef: React.MutableRefObject<number>
  forceRedraw: number
  onPointDelete?: (index: number) => void
  onEnterCaption?: () => void
  onBackToCamera?: () => void
  activeCaptionIndex?: number
  onCaptionSelect?: (captionIndex: number) => void
  narrationText?: string
  subtitleStyle?: SubtitleStyle
  onSubtitlePositionChange?: (pos: { x: number; y: number }) => void
  imageOverlays?: ImageOverlay[]
  overlaysLocked?: boolean
  onOverlayChange?: (id: string, patch: Partial<ImageOverlay>) => void
  mosaicStrokes?: MosaicStroke[]
  showMosaic?: boolean
  isMosaicPaintMode?: boolean
  onMosaicStrokeChange?: (stroke: MosaicStroke) => void
}

interface CaptionDragPreview {
  pointIndex: number
  captionIndex: number
  x: number
  y: number
  snapGuide: { x: boolean; y: boolean }
}

export default function CanvasEditor({
  scene,
  image, points, activeIndex, activeTab,
  backgroundSettings, safeAreaVisibility,
  showAllPoints, onlyActiveBox, showCaptionBox, showGuidesInPreview, showCameraCaptionsInOutput,
  isRendering, isPreviewing,
  onPointAdd, onPointMove, onPointResize, onPointSelect,
  onCaptionMove, onCaptionFontResize, onCaptionBoxWidth, onCaptionBoxHeight,
  onDragEnd, snapGuide, setSnapGuide, dragStateRef, currentTimeRef, forceRedraw,
  onPointDelete, onEnterCaption, onBackToCamera,
  activeCaptionIndex = 0, onCaptionSelect,
  narrationText, subtitleStyle, onSubtitlePositionChange,
  imageOverlays = [], overlaysLocked = false, onOverlayChange,
  mosaicStrokes = [], showMosaic = true, isMosaicPaintMode = false, onMosaicStrokeChange,
}: CanvasEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawBaseRef = useRef<(() => void) | null>(null)
  const captionDragPreviewRef = useRef<CaptionDragPreview | null>(null)
  const captionDragFrameRef = useRef<number | null>(null)
  const mosaicStrokeRef = useRef<MosaicStroke | null>(null)
  // 疊加圖拖曳／縮放：合併到每個動畫幀套一次。React onPointerMove 不會合併原生事件，
  // 高頻指標裝置一幀內可觸發數十次；若每次都 setState + 全幅重繪會塞爆主執行緒導致當機。
  const overlayDragFrameRef = useRef<number | null>(null)
  const overlayDragPatchRef = useRef<{ id: string; patch: Partial<ImageOverlay> } | null>(null)
  const { resolvedTheme } = useTheme()

  const getCssVar = useCallback((name: string, fallback: string) => {
    const el = document.documentElement
    return getComputedStyle(el).getPropertyValue(name).trim() || fallback
  }, [])

  const drawBase = useCallback(() => {
    // During video export the renderVideo loop owns the canvas exclusively.
    // A React re-render caused by setActiveIndex would otherwise call drawBase(),
    // which resets canvas.width (clears it) and draws the editor overview —
    // causing a corrupted frame to be captured by captureStream.
    // During preview the drawTimelineTime loop owns the canvas; drawBase must
    // not overwrite those frames (it lacks the progressive narration text).
    if (isRendering || isPreviewing) return

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    if (canvas.width !== OUTPUT_W) canvas.width = OUTPUT_W
    if (canvas.height !== OUTPUT_H) canvas.height = OUTPUT_H
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    const isDark = resolvedTheme === 'dark'
    const canvasBg = isDark ? '#0e0e10' : '#e9ebee'
    const textMuted = isDark ? '#8b8f96' : '#64748b'

    if (!image) {
      ctx.fillStyle = canvasBg
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = textMuted
      ctx.font = '44px system-ui'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('請先上傳一張畫作圖片', canvas.width / 2, canvas.height / 2)
      return
    }

    const showGuides = !isRendering && (!isPreviewing || showGuidesInPreview)

    const scheduleOverlayRedraw = () => requestAnimationFrame(() => drawBaseRef.current?.())

    if (activeTab === 'caption' && activeIndex >= 0 && points[activeIndex]) {
      const t = timeOfPoint(scene.points, activeIndex)
      composeFrame(scene, t, ctx)
      if (showGuides) {
        drawChrome(scene, t, ctx, {
          activeCaptionIndex,
          captionBox: showCaptionBox,
          snapGuide,
          overlayGuides: !overlaysLocked,
          safeArea: safeAreaVisibility,
        })
      }
      return
    }

    const r = fitImageRect(canvas, image)
    ctx.fillStyle = canvasBg
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    const imageSource = showMosaic && mosaicStrokes.length ? getMosaickedImage(image, mosaicStrokes) : image
    ctx.drawImage(imageSource, r.x, r.y, r.w, r.h)

    if (showGuides) drawEditorGuides(canvas, ctx)
    // 疊加圖以輸出畫面座標繪製；編輯模式下顯示框線與縮放 handle（鎖定時只顯示不可拖）
    if (imageOverlays.length) {
      drawOverlays(canvas, ctx, imageOverlays, currentTimeRef.current, {
        guides: showGuides && !overlaysLocked,
        onImageLoad: scheduleOverlayRedraw,
      })
    }
  }, [scene, image, points, activeIndex, activeTab, safeAreaVisibility, showAllPoints, onlyActiveBox, showCaptionBox, showGuidesInPreview, isRendering, isPreviewing, snapGuide, resolvedTheme, activeCaptionIndex, imageOverlays, overlaysLocked, mosaicStrokes, showMosaic, currentTimeRef])

  const drawCaptionDragPreview = useCallback((preview: CaptionDragPreview) => {
    const canvas = canvasRef.current
    const point = points[preview.pointIndex]
    if (!canvas || !image || !point || isRendering || isPreviewing) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let previewPoint: CameraPoint
    if (preview.captionIndex === 0) {
      previewPoint = {
        ...point,
        caption: { ...point.caption, x: preview.x, y: preview.y },
      }
    } else {
      const extraIndex = preview.captionIndex - 1
      const extraCaptions = [...(point.extraCaptions || [])]
      if (!extraCaptions[extraIndex]) return
      extraCaptions[extraIndex] = {
        ...extraCaptions[extraIndex],
        x: preview.x,
        y: preview.y,
      }
      previewPoint = { ...point, extraCaptions }
    }

    const showGuides = !isRendering && (!isPreviewing || showGuidesInPreview)
    // 拖曳中的字幕位置以 Scene 表示，不另外開一條繪製路徑
    const previewScene: Scene = {
      ...scene,
      points: scene.points.map((p, i) => i === preview.pointIndex ? previewPoint : p),
    }
    const t = timeOfPoint(previewScene.points, preview.pointIndex)
    composeFrame(previewScene, t, ctx)
    if (showGuides) {
      drawChrome(previewScene, t, ctx, {
        activeCaptionIndex: preview.captionIndex,
        captionBox: showCaptionBox,
        snapGuide: preview.snapGuide,
        // ponytail: 沿用原本行為——拖曳字幕時不畫疊加圖把手。
        // 與 drawBase 的 !overlaysLocked 不一致，是既有的閃爍，不在本次改動範圍。
        overlayGuides: false,
        safeArea: safeAreaVisibility,
      })
    }
  }, [
    scene,
    image,
    isPreviewing,
    isRendering,
    points,
    safeAreaVisibility,
    showCaptionBox,
    showGuidesInPreview,
  ])

  const scheduleCaptionDragPreview = useCallback((preview: CaptionDragPreview) => {
    captionDragPreviewRef.current = preview
    if (captionDragFrameRef.current != null) return
    captionDragFrameRef.current = requestAnimationFrame(() => {
      captionDragFrameRef.current = null
      const current = captionDragPreviewRef.current
      if (current) drawCaptionDragPreview(current)
    })
  }, [drawCaptionDragPreview])

  const scheduleOverlayDrag = useCallback((id: string, patch: Partial<ImageOverlay>) => {
    overlayDragPatchRef.current = { id, patch }
    if (overlayDragFrameRef.current != null) return
    overlayDragFrameRef.current = requestAnimationFrame(() => {
      overlayDragFrameRef.current = null
      const pending = overlayDragPatchRef.current
      if (pending) onOverlayChange?.(pending.id, pending.patch)
    })
  }, [onOverlayChange])

  useEffect(() => () => {
    if (captionDragFrameRef.current != null) cancelAnimationFrame(captionDragFrameRef.current)
    if (overlayDragFrameRef.current != null) cancelAnimationFrame(overlayDragFrameRef.current)
  }, [])

  const drawEditorGuides = useCallback((canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => {
    if (!image || !points.length) return

    points.forEach((p, i) => {
      if (!onlyActiveBox || i === activeIndex) drawViewBox(canvas, ctx, p, i === activeIndex)
    })

    if (showAllPoints) {
      points.forEach((p, i) => {
        const c = imageToCanvasPoint(canvas, image, p)
        if (i > 0) {
          const prev = imageToCanvasPoint(canvas, image, points[i - 1])
          ctx.beginPath()
          ctx.moveTo(prev.x, prev.y)
          ctx.lineTo(c.x, c.y)
          ctx.strokeStyle = 'rgba(255,255,255,.28)'
          ctx.lineWidth = 5
          ctx.stroke()
        }
        drawPointMarker(ctx, c, i, i === activeIndex)
      })
    } else if (activeIndex >= 0 && points[activeIndex]) {
      drawPointMarker(ctx, imageToCanvasPoint(canvas, image, points[activeIndex]), activeIndex, true)
    }
  }, [image, points, activeIndex, showAllPoints, onlyActiveBox])

  const drawViewBox = (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, p: CameraPoint, active: boolean) => {
    if (!image) return
    const box = getViewBoxCanvas(canvas, image, p)
    if (active) {
      const r = fitImageRect(canvas, image)
      ctx.save()
      ctx.fillStyle = 'rgba(17,24,39,.62)'
      ctx.beginPath()
      ctx.rect(r.x, r.y, r.w, r.h)
      ctx.rect(box.x, box.y, box.w, box.h)
      ctx.fill('evenodd')
      ctx.restore()
    }
    ctx.save()
    ctx.setLineDash(active ? [] : [18, 14])
    ctx.lineWidth = active ? 7 : 4
    ctx.strokeStyle = active ? 'rgba(255,255,255,.95)' : 'rgba(255,255,255,.35)'
    ctx.strokeRect(box.x, box.y, box.w, box.h)
    ctx.restore()
    if (active) {
      // 移動 handle（左下角）
      const moveHX = box.x
      const moveHY = box.y + box.h
      ctx.beginPath()
      ctx.arc(moveHX, moveHY, 18, 0, Math.PI * 2)
      ctx.fillStyle = 'white'
      ctx.fill()
      ctx.strokeStyle = '#22c55e'
      ctx.lineWidth = 6
      ctx.stroke()
      ctx.save()
      ctx.strokeStyle = '#22c55e'
      ctx.lineWidth = 4
      ctx.lineCap = 'round'
      const ms = 7
      ctx.beginPath()
      ctx.moveTo(moveHX - ms, moveHY)
      ctx.lineTo(moveHX + ms, moveHY)
      ctx.moveTo(moveHX, moveHY - ms)
      ctx.lineTo(moveHX, moveHY + ms)
      ctx.stroke()
      ctx.restore()

      // resize handle（右下角）
      ctx.fillStyle = 'white'
      ctx.beginPath()
      ctx.arc(box.handleX, box.handleY, 18, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = '#2563eb'
      ctx.lineWidth = 6
      ctx.stroke()

      // 字幕模式 T 按鈕（右上角）
      ctx.beginPath()
      ctx.arc(box.x + box.w, box.y, 18, 0, Math.PI * 2)
      ctx.fillStyle = '#eab308'
      ctx.fill()
      ctx.strokeStyle = 'white'
      ctx.lineWidth = 3
      ctx.stroke()
      ctx.save()
      ctx.fillStyle = 'white'
      ctx.font = 'bold 22px system-ui'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('T', box.x + box.w, box.y)
      ctx.restore()

      // 刪除 X 按鈕（左上角）
      ctx.beginPath()
      ctx.arc(box.x, box.y, 18, 0, Math.PI * 2)
      ctx.fillStyle = '#ef4444'
      ctx.fill()
      ctx.strokeStyle = 'white'
      ctx.lineWidth = 3
      ctx.stroke()
      ctx.save()
      ctx.strokeStyle = 'white'
      ctx.lineWidth = 4
      ctx.lineCap = 'round'
      const s = 7
      ctx.beginPath()
      ctx.moveTo(box.x - s, box.y - s)
      ctx.lineTo(box.x + s, box.y + s)
      ctx.moveTo(box.x + s, box.y - s)
      ctx.lineTo(box.x - s, box.y + s)
      ctx.stroke()
      ctx.restore()
    }
  }

  const drawPointMarker = (ctx: CanvasRenderingContext2D, c: { x: number; y: number }, i: number, active: boolean) => {
    ctx.beginPath()
    ctx.arc(c.x, c.y, active ? 28 : 23, 0, Math.PI * 2)
    ctx.fillStyle = active ? 'rgba(96,165,250,.95)' : 'rgba(37,99,235,.9)'
    ctx.fill()
    ctx.lineWidth = 5
    ctx.strokeStyle = 'white'
    ctx.stroke()
    ctx.fillStyle = 'white'
    ctx.font = 'bold 28px system-ui'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(String(i + 1), c.x, c.y)
  }

  useEffect(() => { drawBaseRef.current = drawBase }, [drawBase])
  useEffect(() => { drawBase() }, [drawBase, forceRedraw])

  const getCanvasPointer = (event: React.PointerEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    return {
      x: (event.clientX - rect.left) * canvas.width / rect.width,
      y: (event.clientY - rect.top) * canvas.height / rect.height
    }
  }

  const isOnMoveHandle = (x: number, y: number) => {
    const canvas = canvasRef.current
    if (!canvas || !image || activeIndex < 0 || !points[activeIndex]) return false
    const box = getViewBoxCanvas(canvas, image, points[activeIndex])
    return distance(x, y, box.x, box.y + box.h) <= 36
  }

  const isOnActiveResizeHandle = (x: number, y: number) => {
    const canvas = canvasRef.current
    if (!canvas || !image || activeIndex < 0 || !points[activeIndex]) return false
    const box = getViewBoxCanvas(canvas, image, points[activeIndex])
    return distance(x, y, box.handleX, box.handleY) <= 36
  }

  const isOnDeleteHandle = (x: number, y: number) => {
    const canvas = canvasRef.current
    if (!canvas || !image || activeIndex < 0 || !points[activeIndex]) return false
    const box = getViewBoxCanvas(canvas, image, points[activeIndex])
    return distance(x, y, box.x, box.y) <= 36
  }

  const isOnCaptionHandle = (x: number, y: number) => {
    const canvas = canvasRef.current
    if (!canvas || !image || activeIndex < 0 || !points[activeIndex]) return false
    const box = getViewBoxCanvas(canvas, image, points[activeIndex])
    return distance(x, y, box.x + box.w, box.y) <= 36
  }

  const getCaptionHit = (x: number, y: number): { type: string; captionIndex: number } | null => {
    const canvas = canvasRef.current
    if (!canvas || activeIndex < 0 || !points[activeIndex]) return null
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    const allCaps = getAllCaptions(points[activeIndex])

    // Check active caption's resize handles first (highest priority)
    const activeCap = allCaps[activeCaptionIndex]
    if (activeCap) {
      const layout = getCaptionLayout(canvas, ctx, activeCap)
      const onFont = x >= layout.x + layout.width - 46 && x <= layout.x + layout.width + 14 && y >= layout.y + layout.height - 46 && y <= layout.y + layout.height + 14
      const onWidth = x >= layout.x + layout.width - 34 && x <= layout.x + layout.width + 34 && y >= layout.y + layout.height / 2 - 52 && y <= layout.y + layout.height / 2 + 52
      const onHeight = x >= layout.x + layout.width / 2 - 52 && x <= layout.x + layout.width / 2 + 52 && y >= layout.y + layout.height - 34 && y <= layout.y + layout.height + 34
      if (onFont) return { type: 'captionFontResize', captionIndex: activeCaptionIndex }
      if (onWidth) return { type: 'captionBoxWidth', captionIndex: activeCaptionIndex }
      if (onHeight) return { type: 'captionBoxHeight', captionIndex: activeCaptionIndex }
    }

    // Check all captions for captionMove (reverse order for z-order: last drawn on top)
    for (let i = allCaps.length - 1; i >= 0; i--) {
      const cap = allCaps[i]
      if (!cap) continue
      const layout = getCaptionLayout(canvas, ctx, cap)
      const inBox = x >= layout.x && x <= layout.x + layout.width && y >= layout.y && y <= layout.y + layout.height
      if (inBox) return { type: 'captionMove', captionIndex: i }
    }
    return null
  }

  const findHitPoint = (x: number, y: number) => {
    const canvas = canvasRef.current
    if (!canvas || !image) return -1
    if (!showAllPoints) {
      if (activeIndex < 0 || !points[activeIndex]) return -1
      const c = imageToCanvasPoint(canvas, image, points[activeIndex])
      return distance(x, y, c.x, c.y) <= 42 ? activeIndex : -1
    }
    for (let i = points.length - 1; i >= 0; i--) {
      const c = imageToCanvasPoint(canvas, image, points[i])
      if (distance(x, y, c.x, c.y) <= 42) return i
    }
    return -1
  }

  const handlePointerDown = (event: React.PointerEvent) => {
    if (!image || isRendering) return
    const target = event.currentTarget as HTMLElement
    target.setPointerCapture(event.pointerId)
    const pos = getCanvasPointer(event)

    if (isMosaicPaintMode && onMosaicStrokeChange && canvasRef.current) {
      const rect = fitImageRect(canvasRef.current, image)
      if (pos.x < rect.x || pos.x > rect.x + rect.w || pos.y < rect.y || pos.y > rect.y + rect.h) return
      const ratio = canvasToImageRatio(canvasRef.current, image, pos.x, pos.y)
      const stroke: MosaicStroke = {
        id: crypto.randomUUID(),
        brushSize: Math.max(18, Math.round(image.width * 0.045)),
        points: [ratio],
      }
      mosaicStrokeRef.current = stroke
      onMosaicStrokeChange(stroke)
      return
    }

    // 疊加圖優先命中（未鎖定時）；鎖定後 canvas 完全不理會疊加圖
    if (!overlaysLocked && imageOverlays.length && onOverlayChange && canvasRef.current) {
      const hit = findOverlayHit(canvasRef.current, imageOverlays, currentTimeRef.current, pos.x, pos.y)
      if (hit) {
        const rect = getOverlayCanvasRect(canvasRef.current, hit.overlay)
        dragStateRef.current = {
          type: hit.type,
          index: -1,
          overlayId: hit.overlay.id,
          offsetX: pos.x - (rect.x + rect.w / 2),
          offsetY: pos.y - (rect.y + rect.h / 2),
        }
        return
      }
    }

    if (activeTab === 'caption') {
      // Camera captions use precise box hit-testing and take priority over narration subtitles.
      const hit = getCaptionHit(pos.x, pos.y)
      if (hit) {
        if (hit.captionIndex !== activeCaptionIndex && onCaptionSelect) {
          onCaptionSelect(hit.captionIndex)
        }
        const caption = getAllCaptions(points[activeIndex])[hit.captionIndex]
        dragStateRef.current = {
          type: hit.type as DragState['type'],
          index: activeIndex,
          captionIndex: hit.captionIndex,
          offsetX: hit.type === 'captionMove' && caption ? pos.x - caption.x * (canvasRef.current?.width ?? 0) : undefined,
          offsetY: hit.type === 'captionMove' && caption ? pos.y - caption.y * (canvasRef.current?.height ?? 0) : undefined,
        }
        return
      }

      // Narration subtitle drag: check if pointer is near subtitle area.
      if (narrationText && subtitleStyle && onSubtitlePositionChange) {
        const canvas = canvasRef.current
        if (canvas) {
          const subX = canvas.width * (subtitleStyle.subtitlePosition?.x ?? 0.5)
          const subY = canvas.height * (subtitleStyle.subtitlePosition?.y ?? 0.895)
          const hitRadius = canvas.height * 0.07
          if (Math.abs(pos.y - subY) < hitRadius) {
            dragStateRef.current = {
              type: 'subtitleMove',
              index: activeIndex,
              offsetX: pos.x - subX,
              offsetY: pos.y - subY,
            }
            return
          }
        }
      }
    }

    if (isOnDeleteHandle(pos.x, pos.y)) {
      onPointDelete?.(activeIndex)
      return
    }

    if (isOnCaptionHandle(pos.x, pos.y)) {
      onEnterCaption?.()
      return
    }

    if (isOnActiveResizeHandle(pos.x, pos.y)) {
      dragStateRef.current = { type: 'resize', index: activeIndex }
      return
    }

    if (isOnMoveHandle(pos.x, pos.y)) {
      const canvas = canvasRef.current!
      const p = points[activeIndex]
      const center = imageToCanvasPoint(canvas, image, p)
      dragStateRef.current = {
        type: 'move',
        index: activeIndex,
        offsetX: pos.x - center.x,
        offsetY: pos.y - center.y,
      }
      return
    }

    const hitPoint = findHitPoint(pos.x, pos.y)
    if (hitPoint >= 0) {
      onPointSelect(hitPoint)
      dragStateRef.current = { type: 'move', index: hitPoint }
      return
    }

    if (activeTab === 'camera') {
      const canvas = canvasRef.current
      if (!canvas) return
      const r = fitImageRect(canvas, image)
      if (pos.x < r.x || pos.x > r.x + r.w || pos.y < r.y || pos.y > r.y + r.h) return
      const ratio = canvasToImageRatio(canvas, image, pos.x, pos.y)
      onPointAdd(ratio.x, ratio.y)
      dragStateRef.current = { type: 'move', index: points.length }
    }
  }

  const handlePointerMove = (event: React.PointerEvent) => {
    const canvas = canvasRef.current
    if (!canvas || !image || isRendering) return
    const pos = getCanvasPointer(event)

    if (isMosaicPaintMode && mosaicStrokeRef.current && onMosaicStrokeChange) {
      const rect = fitImageRect(canvas, image)
      if (pos.x < rect.x || pos.x > rect.x + rect.w || pos.y < rect.y || pos.y > rect.y + rect.h) return
      const ratio = canvasToImageRatio(canvas, image, pos.x, pos.y)
      const current = mosaicStrokeRef.current
      const last = current.points[current.points.length - 1]
      if (!last || distance(ratio.x, ratio.y, last.x, last.y) >= 0.003) {
        const next = { ...current, points: [...current.points, ratio] }
        mosaicStrokeRef.current = next
        onMosaicStrokeChange(next)
      }
      return
    }

    if (!dragStateRef.current) return
    const drag = dragStateRef.current

    if (drag.type === 'overlayMove' || drag.type === 'overlayResize') {
      if (!onOverlayChange || !drag.overlayId) return
      const overlay = imageOverlays.find(o => o.id === drag.overlayId)
      if (!overlay) return
      if (drag.type === 'overlayMove') {
        scheduleOverlayDrag(overlay.id, {
          x: clamp((pos.x - (drag.offsetX ?? 0)) / canvas.width, 0, 1),
          y: clamp((pos.y - (drag.offsetY ?? 0)) / canvas.height, 0, 1),
        })
      } else {
        // 以中心到指標的水平距離推導寬度
        const halfW = Math.abs(pos.x - overlay.x * canvas.width)
        scheduleOverlayDrag(overlay.id, { scale: clamp(halfW * 2 / canvas.width, 0.05, 1.5) })
      }
      return
    }

    if (drag.type === 'subtitleMove') {
      if (onSubtitlePositionChange) {
        const snapPx = 28
        const rawX = pos.x - (drag.offsetX ?? 0)
        const rawY = pos.y - (drag.offsetY ?? 0)
        const newSnap = {
          x: Math.abs(rawX - canvas.width / 2) <= snapPx,
          y: Math.abs(rawY - canvas.height / 2) <= snapPx,
        }
        setSnapGuide(newSnap)
        let nextX = clamp(rawX / canvas.width, 0.05, 0.95)
        let nextY = clamp(rawY / canvas.height, 0.1, 0.97)
        if (newSnap.x) nextX = 0.5
        if (newSnap.y) nextY = 0.5
        onSubtitlePositionChange({ x: nextX, y: nextY })
      }
      return
    }

    const p = points[drag.index]
    if (!p) return

    if (drag.type === 'move') {
      const ratio = canvasToImageRatio(canvas, image, pos.x - (drag.offsetX ?? 0), pos.y - (drag.offsetY ?? 0))
      onPointMove(drag.index, ratio.x, ratio.y)
    }
    if (drag.type === 'resize') {
      const r = fitImageRect(canvas, image)
      const center = imageToCanvasPoint(canvas, image, p)
      const desiredW = Math.abs(pos.x - center.x) * 2 / r.w * image.width
      const desiredH = Math.abs(pos.y - center.y) * 2 / r.h * image.height
      // zoom=1 的取景範圍就是 base 尺寸；共用 getCameraSourceRect，不再自己算一次
      const base = getCameraSourceRect(image, { ...p, zoom: 1 })
      const zoom = clamp(Math.min(base.sw / Math.max(1, desiredW), base.sh / Math.max(1, desiredH)), 1, 15)
      onPointResize(drag.index, zoom)
    }
    if (drag.type === 'captionMove') {
      const snapPx = 28
      const rawX = pos.x - (drag.offsetX ?? 0)
      const rawY = pos.y - (drag.offsetY ?? 0)
      let nextX = rawX / canvas.width
      let nextY = rawY / canvas.height
      const newSnap = {
        x: Math.abs(rawX - canvas.width / 2) <= snapPx,
        y: Math.abs(rawY - canvas.height / 2) <= snapPx
      }
      if (newSnap.x) nextX = 0.5
      if (newSnap.y) nextY = 0.5
      scheduleCaptionDragPreview({
        pointIndex: drag.index,
        captionIndex: drag.captionIndex ?? 0,
        x: clamp(nextX, 0.03, 0.97),
        y: clamp(nextY, 0.03, 0.97),
        snapGuide: newSnap,
      })
    }
    if (drag.type === 'captionFontResize') {
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      const captionIndex = drag.captionIndex ?? 0
      const allCaps = getAllCaptions(p)
      const cap = allCaps[captionIndex]
      if (!cap) return
      const layout = getCaptionLayout(canvas, ctx, cap)
      const dist = distance(pos.x, pos.y, layout.cx, layout.cy)
      const next = clamp(dist / (Math.min(canvas.width, canvas.height) * 0.22), 0.5, 3)
      onCaptionFontResize(drag.index, captionIndex, next)
    }
    if (drag.type === 'captionBoxWidth') {
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      const captionIndex = drag.captionIndex ?? 0
      const allCaps = getAllCaptions(p)
      const cap = allCaps[captionIndex]
      if (!cap) return
      const layout = getCaptionLayout(canvas, ctx, cap)
      const baseHalf = Math.max(120, layout.width / 2 / (cap.boxScaleX || 1))
      const boxScaleX = clamp(Math.max(120, Math.abs(pos.x - layout.cx)) / baseHalf, 0.6, 2.4)
      onCaptionBoxWidth(drag.index, captionIndex, boxScaleX)
    }
    if (drag.type === 'captionBoxHeight') {
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      const captionIndex = drag.captionIndex ?? 0
      const allCaps = getAllCaptions(p)
      const cap = allCaps[captionIndex]
      if (!cap) return
      const layout = getCaptionLayout(canvas, ctx, cap)
      const baseHalf = Math.max(40, layout.height / 2 / (cap.boxScaleY || 1))
      const boxScaleY = clamp(Math.max(40, Math.abs(pos.y - layout.cy)) / baseHalf, 0.6, 2.4)
      onCaptionBoxHeight(drag.index, captionIndex, boxScaleY)
    }
  }

  const finishPointerDrag = (commitCaptionMove: boolean) => {
    const drag = dragStateRef.current
    const preview = captionDragPreviewRef.current
    if (captionDragFrameRef.current != null) {
      cancelAnimationFrame(captionDragFrameRef.current)
      captionDragFrameRef.current = null
    }
    if (
      commitCaptionMove &&
      drag?.type === 'captionMove' &&
      preview &&
      preview.pointIndex === drag.index &&
      preview.captionIndex === (drag.captionIndex ?? 0)
    ) {
      onCaptionMove(preview.pointIndex, preview.captionIndex, preview.x, preview.y)
    }
    captionDragPreviewRef.current = null
    mosaicStrokeRef.current = null
    dragStateRef.current = null
    setSnapGuide({ x: false, y: false })
    onDragEnd()
  }

  // Expose drawBase and canvas for parent to call
  useEffect(() => {
    if (!canvasRef.current) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(canvasRef.current as any).__drawBase = drawBase
  }, [drawBase])

  return (
    <div
      className="relative flex items-center justify-center h-full min-h-0"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={() => finishPointerDrag(true)}
      onPointerCancel={() => finishPointerDrag(false)}
    >
      <canvas
        ref={canvasRef}
        style={{
          /* Height-constrained: fills available height, width computed from 9:16 ratio */
          height: '100%',
          width: 'auto',
          maxWidth: '100%',
          aspectRatio: '9/16',
          display: 'block',
          cursor: isMosaicPaintMode ? 'cell' : 'crosshair',
          borderRadius: '12px',
          border: '1px solid hsl(var(--border))',
        }}
      />
      {activeTab === 'caption' ? (
        <button
          className="absolute top-2.5 left-2.5 px-3 py-1 rounded-full bg-black/55 text-white text-xs flex items-center gap-1 hover:bg-black/75 transition-colors"
          onPointerDown={e => e.stopPropagation()}
          onClick={onBackToCamera}
        >
          ← 返回定位
        </button>
      ) : (
        <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-full bg-black/55 text-white text-xs pointer-events-none">
          9:16 輸出取景框
        </div>
      )}
    </div>
  )
}
