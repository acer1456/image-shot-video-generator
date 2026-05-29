import { useRef, useEffect, useCallback } from 'react'
import type { CameraPoint, BackgroundSettings, SafeAreaVisibility, ActiveTab, DragState } from '@/types'
import {
  OUTPUT_W, OUTPUT_H, clamp, distance
} from '@/lib/utils'
import {
  fitImageRect, getCameraForPoint, getViewBoxCanvas,
  drawCamera, drawCaptionSafeArea, getCaptionLayout, getAllCaptions,
  imageToCanvasPoint, canvasToImageRatio, drawOutputBackground
} from '@/lib/canvas'
import { useTheme } from 'next-themes'

interface CanvasEditorProps {
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
}

export default function CanvasEditor({
  image, points, activeIndex, activeTab,
  backgroundSettings, safeAreaVisibility,
  showAllPoints, onlyActiveBox, showCaptionBox, showGuidesInPreview,
  isRendering, isPreviewing,
  onPointAdd, onPointMove, onPointResize, onPointSelect,
  onCaptionMove, onCaptionFontResize, onCaptionBoxWidth, onCaptionBoxHeight,
  onDragEnd, snapGuide, setSnapGuide, dragStateRef, currentTimeRef, forceRedraw,
  onPointDelete, onEnterCaption, onBackToCamera,
  activeCaptionIndex = 0, onCaptionSelect,
}: CanvasEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
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
    if (isRendering) return

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = OUTPUT_W
    canvas.height = OUTPUT_H
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    const isDark = resolvedTheme === 'dark'
    const canvasBg = isDark ? '#030712' : '#f1f5f9'
    const textMuted = isDark ? '#94a3b8' : '#64748b'

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

    if (activeTab === 'caption' && activeIndex >= 0 && points[activeIndex]) {
      const camera = getCameraForPoint(image, points[activeIndex])
      drawCamera(canvas, ctx, image, camera, backgroundSettings, points[activeIndex], showGuides && showCaptionBox, showCaptionBox, snapGuide, activeCaptionIndex)
      if (showGuides) drawCaptionSafeArea(canvas, ctx, safeAreaVisibility)
      return
    }

    const r = fitImageRect(canvas, image)
    ctx.fillStyle = canvasBg
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(image, r.x, r.y, r.w, r.h)

    if (showGuides) drawEditorGuides(canvas, ctx)
  }, [image, points, activeIndex, activeTab, backgroundSettings, safeAreaVisibility, showAllPoints, onlyActiveBox, showCaptionBox, showGuidesInPreview, isRendering, isPreviewing, snapGuide, resolvedTheme, activeCaptionIndex])

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

    if (activeTab === 'caption') {
      const hit = getCaptionHit(pos.x, pos.y)
      if (hit) {
        if (hit.captionIndex !== activeCaptionIndex && onCaptionSelect) {
          onCaptionSelect(hit.captionIndex)
        }
        dragStateRef.current = { type: hit.type as DragState['type'], index: activeIndex, captionIndex: hit.captionIndex }
        return
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

    const hitPoint = findHitPoint(pos.x, pos.y)
    if (hitPoint >= 0) {
      onPointSelect(hitPoint)
      dragStateRef.current = { type: 'move', index: hitPoint }
      return
    }

    if (activeTab === 'camera') {
      const canvas = canvasRef.current
      if (!canvas) return
      const ratio = canvasToImageRatio(canvas, image, pos.x, pos.y)
      onPointAdd(ratio.x, ratio.y)
      dragStateRef.current = { type: 'move', index: points.length }
    }
  }

  const handlePointerMove = (event: React.PointerEvent) => {
    const canvas = canvasRef.current
    if (!canvas || !image || !dragStateRef.current || isRendering) return
    const pos = getCanvasPointer(event)
    const drag = dragStateRef.current
    const p = points[drag.index]
    if (!p) return

    if (drag.type === 'move') {
      const ratio = canvasToImageRatio(canvas, image, pos.x, pos.y)
      onPointMove(drag.index, ratio.x, ratio.y)
    }
    if (drag.type === 'resize') {
      const r = fitImageRect(canvas, image)
      const center = imageToCanvasPoint(canvas, image, p)
      const desiredW = Math.abs(pos.x - center.x) * 2 / r.w * image.width
      const desiredH = Math.abs(pos.y - center.y) * 2 / r.h * image.height
      const naturalRatio = image.width / image.height
      let baseW: number, baseH: number
      const OUTPUT_RATIO = OUTPUT_W / OUTPUT_H
      if (naturalRatio > OUTPUT_RATIO) { baseW = image.width; baseH = baseW / OUTPUT_RATIO }
      else { baseH = image.height; baseW = baseH * OUTPUT_RATIO }
      const zoom = clamp(Math.min(baseW / Math.max(1, desiredW), baseH / Math.max(1, desiredH)), 1, 8)
      onPointResize(drag.index, zoom)
    }
    if (drag.type === 'captionMove') {
      const snapPx = 28
      let nextX = pos.x / canvas.width
      let nextY = pos.y / canvas.height
      const newSnap = {
        x: Math.abs(pos.x - canvas.width / 2) <= snapPx,
        y: Math.abs(pos.y - canvas.height / 2) <= snapPx
      }
      setSnapGuide(newSnap)
      if (newSnap.x) nextX = 0.5
      if (newSnap.y) nextY = 0.5
      onCaptionMove(drag.index, drag.captionIndex ?? 0, clamp(nextX, 0.03, 0.97), clamp(nextY, 0.03, 0.97))
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

  const handlePointerUp = () => {
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
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
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
          cursor: 'crosshair',
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
