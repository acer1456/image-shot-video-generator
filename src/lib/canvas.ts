import type { CameraPoint, CaptionData, BackgroundSettings } from '@/types'
import {
  OUTPUT_W, OUTPUT_H, OUTPUT_RATIO, DEFAULT_FONT,
  clamp, mix, easeInOut, hexToRgba, roundRect,
  wrapText, measureText
} from './utils'

export interface FitRect {
  x: number; y: number; w: number; h: number; scale: number
}

export interface Camera {
  cx: number; cy: number; zoom: number
}

export interface CaptionLayout {
  fontFamily: string
  subtitleFontFamily: string
  mainLines: string[]
  subLines: string[]
  mainSize: number
  subSize: number
  mainLine: number
  subLine: number
  gap: number
  textH: number
  width: number
  height: number
  x: number
  y: number
  cx: number
  cy: number
}

export function fitImageRect(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement
): FitRect {
  const scale = Math.min(canvas.width / image.width, canvas.height / image.height)
  const w = image.width * scale
  const h = image.height * scale
  return { x: (canvas.width - w) / 2, y: (canvas.height - h) / 2, w, h, scale }
}

export function getCameraSourceRect(image: HTMLImageElement, p: CameraPoint) {
  const naturalRatio = image.width / image.height
  let baseW: number, baseH: number
  if (naturalRatio > OUTPUT_RATIO) {
    baseW = image.width
    baseH = baseW / OUTPUT_RATIO
  } else {
    baseH = image.height
    baseW = baseH * OUTPUT_RATIO
  }
  const sw = baseW / p.zoom
  const sh = baseH / p.zoom
  const sx = p.x * image.width - sw / 2
  const sy = p.y * image.height - sh / 2
  return { sx, sy, sw, sh }
}

export function imageToCanvasPoint(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  p: CameraPoint
) {
  const r = fitImageRect(canvas, image)
  return { x: r.x + p.x * r.w, y: r.y + p.y * r.h }
}

export function canvasToImageRatio(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  x: number, y: number
) {
  const r = fitImageRect(canvas, image)
  return {
    x: clamp((x - r.x) / r.w, 0, 1),
    y: clamp((y - r.y) / r.h, 0, 1)
  }
}

export function getCameraForPoint(image: HTMLImageElement, p: CameraPoint): Camera {
  return { cx: p.x * image.width, cy: p.y * image.height, zoom: p.zoom }
}

export function getViewBoxCanvas(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  p: CameraPoint
) {
  const r = fitImageRect(canvas, image)
  const src = getCameraSourceRect(image, p)
  const x = r.x + (src.sx / image.width) * r.w
  const y = r.y + (src.sy / image.height) * r.h
  const w = (src.sw / image.width) * r.w
  const h = (src.sh / image.height) * r.h
  return { x, y, w, h, handleX: x + w, handleY: y + h }
}

export function getCaptionLayout(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  point: CameraPoint
): CaptionLayout {
  const cap = point.caption
  const fontFamily = cap.fontFamily || DEFAULT_FONT
  const subtitleFontFamily = cap.subtitleFontFamily || DEFAULT_FONT
  const mainSize = 56 * cap.scale
  const subSize = 34 * cap.scale * (cap.subtitleScale || 1)
  const mainLine = mainSize * 1.25
  const subLine = subSize * 1.28
  const baseTextMaxW = canvas.width * 0.78
  const boxScaleX = cap.boxScaleX || 1
  const textMaxW = baseTextMaxW * boxScaleX
  const mainLines = wrapText(ctx, cap.text || '', textMaxW, `800 ${mainSize}px ${fontFamily}`)
  const subLines = wrapText(ctx, cap.subtitle || '', textMaxW, `650 ${subSize}px ${subtitleFontFamily}`)
  const mainW = mainLines.length ? Math.max(...mainLines.map(l => measureText(ctx, l, `800 ${mainSize}px ${fontFamily}`))) : 0
  const subW = subLines.length ? Math.max(...subLines.map(l => measureText(ctx, l, `650 ${subSize}px ${subtitleFontFamily}`))) : 0
  void mainW; void subW
  const gap = mainLines.length && subLines.length ? 18 * cap.scale : 0
  const textH = mainLines.length * mainLine + gap + subLines.length * subLine
  const padX = 38 * cap.scale
  const padY = 24 * cap.scale
  const baseW = Math.max(240, ...mainLines.map(l => measureText(ctx, l, `800 ${mainSize}px ${fontFamily}`)), ...subLines.map(l => measureText(ctx, l, `650 ${subSize}px ${subtitleFontFamily}`))) + padX * 2
  void baseW
  const baseH = Math.max(70, textH + padY * 2)
  const width = Math.min(canvas.width * 0.94, Math.max(baseTextMaxW * boxScaleX + padX * 2, 240 + padX * 2))
  const height = Math.min(canvas.height * 0.5, baseH * (cap.boxScaleY || 1))
  const cx = cap.x * canvas.width
  const cy = cap.y * canvas.height
  return {
    fontFamily, subtitleFontFamily, mainLines, subLines,
    mainSize, subSize, mainLine, subLine, gap, textH,
    width, height, x: cx - width / 2, y: cy - height / 2, cx, cy
  }
}

export function drawOutputBackground(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement | null,
  bg: BackgroundSettings
) {
  ctx.fillStyle = bg.color || '#000000'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  if (!image || bg.mode !== 'blur') return
  ctx.save()
  ctx.filter = `blur(${bg.blur || 0}px)`
  const scale = Math.max(canvas.width / image.width, canvas.height / image.height)
  const dw = image.width * scale
  const dh = image.height * scale
  const dx = (canvas.width - dw) / 2
  const dy = (canvas.height - dh) / 2
  const bleed = Math.max(0, (bg.blur || 0) * 2)
  ctx.drawImage(image, dx - bleed, dy - bleed, dw + bleed * 2, dh + bleed * 2)
  ctx.restore()
}

export function drawCamera(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  camera: Camera,
  bg: BackgroundSettings,
  captionPoint: CameraPoint | null,
  includeGuides: boolean,
  showCaptionBox: boolean,
  snapGuide: { x: boolean; y: boolean }
) {
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  const p = { x: camera.cx / image.width, y: camera.cy / image.height, zoom: camera.zoom }
  const src = getCameraSourceRect(image, p as CameraPoint)
  drawOutputBackground(canvas, ctx, image, bg)
  const ix = Math.max(0, src.sx)
  const iy = Math.max(0, src.sy)
  const ix2 = Math.min(image.width, src.sx + src.sw)
  const iy2 = Math.min(image.height, src.sy + src.sh)
  const iw = ix2 - ix
  const ih = iy2 - iy
  if (iw > 0 && ih > 0) {
    const dx = ((ix - src.sx) / src.sw) * canvas.width
    const dy = ((iy - src.sy) / src.sh) * canvas.height
    const dw = (iw / src.sw) * canvas.width
    const dh = (ih / src.sh) * canvas.height
    ctx.drawImage(image, ix, iy, iw, ih, dx, dy, dw, dh)
  }
  if (captionPoint) {
    drawCaption(canvas, ctx, captionPoint, includeGuides && showCaptionBox, snapGuide)
  }
}

export function drawCaption(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  point: CameraPoint,
  includeGuides: boolean,
  snapGuide: { x: boolean; y: boolean }
) {
  const cap = point.caption
  const hasText = !!((cap.text || '').trim() || (cap.subtitle || '').trim())
  if (!hasText && !includeGuides) return
  const layout = getCaptionLayout(canvas, ctx, point)
  ctx.save()
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  if (hasText) {
    // ── Shadow box (hideable) ─────────────────────────────────────────
    if (cap.shadowBoxVisible !== false) {
      roundRect(ctx, layout.x, layout.y, layout.width, layout.height, 28 * cap.scale)
      ctx.fillStyle = hexToRgba(cap.shadowColor || '#000000', cap.shadowAlpha ?? 0.48)
      ctx.fill()
    }
    let y = layout.cy - layout.textH / 2
    // ── Main caption ──────────────────────────────────────────────────
    if (layout.mainLines.length) {
      ctx.font = `800 ${layout.mainSize}px ${layout.fontFamily}`
      ctx.fillStyle = 'white'
      const mainDist = cap.textShadowDistance ?? 0
      if (mainDist > 0) {
        const rad = ((cap.textShadowAngle ?? 120) * Math.PI) / 180
        ctx.shadowOffsetX = mainDist * Math.cos(rad)
        ctx.shadowOffsetY = mainDist * Math.sin(rad)
        ctx.shadowColor = hexToRgba(cap.textShadowColor || '#000000', cap.textShadowAlpha ?? 0.7)
        ctx.shadowBlur = Math.max(2, mainDist * 0.3)
      }
      layout.mainLines.forEach(line => {
        const lineY = y + layout.mainLine / 2
        ctx.fillText(line, layout.cx, lineY)
        y += layout.mainLine
      })
      if (mainDist > 0) {
        ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0
        ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0
      }
    }
    if (layout.mainLines.length && layout.subLines.length) y += layout.gap
    // ── Subtitle ──────────────────────────────────────────────────────
    if (layout.subLines.length) {
      ctx.font = `650 ${layout.subSize}px ${layout.subtitleFontFamily}`
      ctx.fillStyle = 'rgba(255,255,255,.92)'
      const subDist = cap.subTextShadowDistance ?? 0
      if (subDist > 0) {
        const rad = ((cap.subTextShadowAngle ?? 120) * Math.PI) / 180
        ctx.shadowOffsetX = subDist * Math.cos(rad)
        ctx.shadowOffsetY = subDist * Math.sin(rad)
        ctx.shadowColor = hexToRgba(cap.subTextShadowColor || '#000000', cap.subTextShadowAlpha ?? 0.7)
        ctx.shadowBlur = Math.max(2, subDist * 0.3)
      }
      layout.subLines.forEach(line => {
        const lineY = y + layout.subLine / 2
        ctx.fillText(line, layout.cx, lineY)
        y += layout.subLine
      })
      if (subDist > 0) {
        ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0
        ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0
      }
    }
  }
  if (includeGuides) {
    drawSnapGuides(canvas, ctx, snapGuide)
    ctx.setLineDash([14, 10])
    ctx.lineWidth = 4
    ctx.strokeStyle = 'rgba(251,191,36,.95)'
    ctx.strokeRect(layout.x, layout.y, layout.width, layout.height)
    ctx.setLineDash([])
    ctx.fillStyle = '#fbbf24'
    ctx.fillRect(layout.x + layout.width - 28, layout.y + layout.height - 28, 28, 28)
    ctx.fillStyle = '#60a5fa'
    ctx.fillRect(layout.x + layout.width - 14, layout.y + layout.height / 2 - 34, 28, 68)
    ctx.fillStyle = '#34d399'
    ctx.fillRect(layout.x + layout.width / 2 - 34, layout.y + layout.height - 14, 68, 28)
  }
  ctx.restore()
}

function drawSnapGuides(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  snap: { x: boolean; y: boolean }
) {
  if (!snap.x && !snap.y) return
  ctx.save()
  ctx.setLineDash([20, 12])
  ctx.lineWidth = 4
  ctx.strokeStyle = 'rgba(96,165,250,.95)'
  if (snap.x) {
    ctx.beginPath()
    ctx.moveTo(canvas.width / 2, 0)
    ctx.lineTo(canvas.width / 2, canvas.height)
    ctx.stroke()
  }
  if (snap.y) {
    ctx.beginPath()
    ctx.moveTo(0, canvas.height / 2)
    ctx.lineTo(canvas.width, canvas.height / 2)
    ctx.stroke()
  }
  ctx.restore()
}

export function getTimelineStateAt(
  image: HTMLImageElement,
  points: CameraPoint[],
  time: number
): { pointIndex: number; camera: Camera; captionPoint: CameraPoint } | null {
  if (!points.length) return null
  let cursor = 0
  for (let i = 0; i < points.length; i++) {
    const p = points[i]
    const moveDuration = Math.max(0.1, Number(p.moveDuration) || 0.1)
    const holdDuration = Math.max(0, Number(p.holdDuration) || 0)
    const moveStart = cursor
    const moveEnd = cursor + moveDuration
    const from = i === 0 ? getCameraForPoint(image, p) : getCameraForPoint(image, points[i - 1])
    const to = getCameraForPoint(image, p)
    if (time <= moveEnd) {
      const rawT = clamp((time - moveStart) / moveDuration, 0, 1)
      const t = p.move === 'jump' ? 1 : easeInOut(rawT)
      return {
        pointIndex: i,
        camera: { cx: mix(from.cx, to.cx, t), cy: mix(from.cy, to.cy, t), zoom: mix(from.zoom, to.zoom, t) },
        captionPoint: p
      }
    }
    if (time <= moveEnd + holdDuration) return { pointIndex: i, camera: to, captionPoint: p }
    cursor = moveEnd + holdDuration
  }
  const last = points[points.length - 1]
  return { pointIndex: points.length - 1, camera: getCameraForPoint(image, last), captionPoint: last }
}

export function buildTimeline(points: CameraPoint[]) {
  const items: Array<{
    type: 'move' | 'hold' | 'caption'
    pointIndex: number
    start: number
    end: number
    label: string
  }> = []
  let cursor = 0
  points.forEach((p, index) => {
    const moveDuration = Math.max(0.1, Number(p.moveDuration) || 0.1)
    const holdDuration = Math.max(0, Number(p.holdDuration) || 0)
    items.push({ type: 'move', pointIndex: index, start: cursor, end: cursor + moveDuration, label: `鏡頭 ${index + 1} ${p.move === 'jump' ? '跳轉' : '移動'}` })
    cursor += moveDuration
    if (holdDuration > 0) {
      items.push({ type: 'hold', pointIndex: index, start: cursor, end: cursor + holdDuration, label: `鏡頭 ${index + 1} 停留` })
      if ((p.caption.text || '').trim() || (p.caption.subtitle || '').trim()) {
        items.push({ type: 'caption', pointIndex: index, start: cursor, end: cursor + holdDuration, label: `字幕 ${index + 1}` })
      }
      cursor += holdDuration
    }
  })
  return { items, totalDuration: cursor }
}

// Platform preview helpers
export function pxX(canvas: HTMLCanvasElement, px: number) { return px / OUTPUT_W * canvas.width }
export function pxY(canvas: HTMLCanvasElement, px: number) { return px / OUTPUT_H * canvas.height }
export function pxS(canvas: HTMLCanvasElement, px: number) { return px / OUTPUT_W * canvas.width }

export function drawCaptionSafeArea(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  visibility: { ig: boolean; shorts: boolean; tiktok: boolean }
) {
  if (visibility.ig) drawPlatformPreviewIG(canvas, ctx)
  if (visibility.shorts) drawPlatformPreviewShorts(canvas, ctx)
  if (visibility.tiktok) drawPlatformPreviewTikTok(canvas, ctx)
}

function drawUiScrim(ctx: CanvasRenderingContext2D, color: string, x: number, y: number, w: number, h: number) {
  ctx.fillStyle = color
  ctx.fillRect(x, y, w, h)
}

function drawTopLabel(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, text: string, color: string, x: number, y: number) {
  ctx.save()
  ctx.font = `${pxS(canvas, 25)}px system-ui`
  ctx.textBaseline = 'top'
  ctx.fillStyle = color
  ctx.fillText(text, x, y)
  ctx.restore()
}

function drawBottomTextBlock(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, text: string, color: string, x: number, y: number, width: number) {
  ctx.save()
  ctx.fillStyle = color
  ctx.font = `700 ${pxS(canvas, 25)}px system-ui`
  ctx.textBaseline = 'top'
  ctx.fillText(text, x, y)
  ctx.globalAlpha = 0.75
  ctx.fillRect(x, y + pxY(canvas, 46), width, pxY(canvas, 12))
  ctx.globalAlpha = 0.5
  ctx.fillRect(x, y + pxY(canvas, 76), width * 0.72, pxY(canvas, 12))
  ctx.restore()
}

function drawRightActionRail(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, color: string, x: number, y: number, icons: string[]) {
  ctx.save()
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = `700 ${pxS(canvas, 32)}px system-ui`
  icons.forEach((icon, i) => {
    const cy = y + i * pxY(canvas, 132)
    ctx.fillStyle = 'rgba(0,0,0,.28)'
    ctx.beginPath()
    ctx.arc(x, cy, pxS(canvas, 42), 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = color
    ctx.fillText(icon, x, cy)
  })
  ctx.restore()
}

function drawProgressBar(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, color: string) {
  ctx.save()
  ctx.fillStyle = 'rgba(255,255,255,.22)'
  ctx.fillRect(0, canvas.height - pxY(canvas, 10), canvas.width, pxY(canvas, 6))
  ctx.fillStyle = color
  ctx.fillRect(0, canvas.height - pxY(canvas, 10), canvas.width * 0.38, pxY(canvas, 6))
  ctx.restore()
}

function drawPlatformPreviewIG(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
  // IG Reels 2025 safe zone — top 240px, bottom 400px (1080×1920 reference)
  // Colour: Instagram classic purple-pink #c13584
  const ig = (a: number) => `rgba(193,53,132,${a})`
  ctx.save()
  drawUiScrim(ctx, ig(0.18), 0, 0, canvas.width, pxY(canvas, 240))
  drawUiScrim(ctx, ig(0.22), 0, canvas.height - pxY(canvas, 400), canvas.width, pxY(canvas, 400))
  drawRightActionRail(canvas, ctx, ig(0.82), pxX(canvas, 965), pxY(canvas, 1060), ['♡', '💬', '↗', '⋯'])
  drawTopLabel(canvas, ctx, 'IG Reels preview', ig(0.95), pxX(canvas, 38), pxY(canvas, 46))
  drawBottomTextBlock(canvas, ctx, 'IG username / caption / audio', ig(0.88), pxX(canvas, 42), canvas.height - pxY(canvas, 290), pxX(canvas, 670))
  drawProgressBar(canvas, ctx, ig(0.95))
  ctx.restore()
}

function drawPlatformPreviewShorts(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
  // YouTube Shorts 2025 safe zone — top 150px, bottom 350px (1080×1920 reference)
  // Colour: YouTube red #FF0000
  const yt = (a: number) => `rgba(255,0,0,${a})`
  ctx.save()
  drawUiScrim(ctx, yt(0.16), 0, 0, canvas.width, pxY(canvas, 150))
  drawUiScrim(ctx, yt(0.22), 0, canvas.height - pxY(canvas, 350), canvas.width, pxY(canvas, 350))
  drawRightActionRail(canvas, ctx, yt(0.86), pxX(canvas, 965), pxY(canvas, 920), ['👍', '👎', '💬', '↗', '⋯'])
  drawTopLabel(canvas, ctx, 'YouTube Shorts preview', yt(0.95), pxX(canvas, 38), pxY(canvas, 44))
  drawBottomTextBlock(canvas, ctx, '@channel / title / sound', yt(0.9), pxX(canvas, 42), canvas.height - pxY(canvas, 234), pxX(canvas, 690))
  ctx.restore()
}

function drawPlatformPreviewTikTok(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
  // TikTok 2025 safe zone — top 165px, bottom 410px (1080×1920 reference)
  ctx.save()
  drawUiScrim(ctx, 'rgba(52,211,153,.16)', 0, 0, canvas.width, pxY(canvas, 165))
  drawUiScrim(ctx, 'rgba(52,211,153,.23)', 0, canvas.height - pxY(canvas, 410), canvas.width, pxY(canvas, 410))
  drawUiScrim(ctx, 'rgba(52,211,153,.14)', canvas.width - pxX(canvas, 185), pxY(canvas, 700), pxX(canvas, 185), pxY(canvas, 850))
  drawRightActionRail(canvas, ctx, 'rgba(52,211,153,.88)', pxX(canvas, 960), pxY(canvas, 820), ['●', '♡', '💬', '↗', '♫'])
  drawTopLabel(canvas, ctx, 'TikTok preview', 'rgba(52,211,153,.95)', pxX(canvas, 38), pxY(canvas, 44))
  drawBottomTextBlock(canvas, ctx, '@user / caption / music', 'rgba(52,211,153,.9)', pxX(canvas, 42), canvas.height - pxY(canvas, 290), pxX(canvas, 680))
  ctx.restore()
}

/**
 * 在指定 canvas 上繪製指定鏡頭的 9:16 縮圖（不含字幕、不含 guide）。
 * 呼叫前需確保 canvas.width / canvas.height 已設定為目標像素尺寸。
 */
export function drawPointThumbnail(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  point: CameraPoint,
  bg: BackgroundSettings
) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const camera = getCameraForPoint(image, point)
  drawCamera(canvas, ctx, image, camera, bg, null, false, false, { x: false, y: false })
}
