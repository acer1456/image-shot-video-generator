import type { ImageOverlay } from '@/types'
import { clamp } from '@/lib/utils'

// dataUrl -> HTMLImageElement 快取（keyed by overlay.id）
const overlayImageCache = new Map<string, { src: string; img: HTMLImageElement; loaded: boolean }>()

export function getOverlayImage(overlay: ImageOverlay, onLoad?: () => void): HTMLImageElement | null {
  let entry = overlayImageCache.get(overlay.id)
  if (!entry || entry.src !== overlay.dataUrl) {
    const img = new Image()
    const next = { src: overlay.dataUrl, img, loaded: false }
    overlayImageCache.set(overlay.id, next)
    img.onload = () => {
      next.loaded = true
      onLoad?.()
    }
    img.src = overlay.dataUrl
    entry = next
  }
  return entry.loaded ? entry.img : null
}

export function isOverlayActiveAt(overlay: ImageOverlay, time: number) {
  return time >= overlay.startTime && time < overlay.startTime + overlay.duration
}

export function getOverlayCanvasRect(
  canvas: { width: number; height: number },
  overlay: ImageOverlay,
) {
  const entry = overlayImageCache.get(overlay.id)
  const ratio = entry?.loaded && entry.img.naturalWidth > 0
    ? entry.img.naturalHeight / entry.img.naturalWidth
    : 1
  const w = overlay.scale * canvas.width
  const h = w * ratio
  return { x: overlay.x * canvas.width - w / 2, y: overlay.y * canvas.height - h / 2, w, h }
}

export function drawOverlays(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  overlays: ImageOverlay[],
  time: number,
  options?: { guides?: boolean; onImageLoad?: () => void },
) {
  for (const overlay of overlays) {
    if (!isOverlayActiveAt(overlay, time)) continue
    const img = getOverlayImage(overlay, options?.onImageLoad)
    const rect = getOverlayCanvasRect(canvas, overlay)
    if (img) {
      ctx.save()
      ctx.globalAlpha = clamp(overlay.opacity, 0, 1)
      ctx.drawImage(img, rect.x, rect.y, rect.w, rect.h)
      ctx.restore()
    }
    if (options?.guides) {
      ctx.save()
      ctx.setLineDash([12, 10])
      ctx.lineWidth = 4
      ctx.strokeStyle = 'rgba(236,72,153,.9)'
      ctx.strokeRect(rect.x, rect.y, rect.w, rect.h)
      ctx.setLineDash([])
      // 右下角縮放 handle
      ctx.beginPath()
      ctx.arc(rect.x + rect.w, rect.y + rect.h, 16, 0, Math.PI * 2)
      ctx.fillStyle = 'white'
      ctx.fill()
      ctx.strokeStyle = '#ec4899'
      ctx.lineWidth = 5
      ctx.stroke()
      ctx.restore()
    }
  }
}

/** 由上而下找命中的疊加圖（後加的先命中）；回傳 hit 類型 */
export function findOverlayHit(
  canvas: { width: number; height: number },
  overlays: ImageOverlay[],
  time: number,
  x: number,
  y: number,
): { overlay: ImageOverlay; type: 'overlayMove' | 'overlayResize' } | null {
  for (let i = overlays.length - 1; i >= 0; i--) {
    const overlay = overlays[i]
    if (!isOverlayActiveAt(overlay, time)) continue
    const rect = getOverlayCanvasRect(canvas, overlay)
    const dx = x - (rect.x + rect.w)
    const dy = y - (rect.y + rect.h)
    if (Math.sqrt(dx * dx + dy * dy) <= 32) return { overlay, type: 'overlayResize' }
    if (x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h) {
      return { overlay, type: 'overlayMove' }
    }
  }
  return null
}

/** 上傳的疊加圖縮到最大邊 800px，控制 dataUrl 體積（專案檔/自動暫存） */
export function fileToOverlayDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      const MAX = 800
      const scale = Math.min(1, MAX / Math.max(img.naturalWidth, img.naturalHeight))
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(img.naturalWidth * scale))
      canvas.height = Math.max(1, Math.round(img.naturalHeight * scale))
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
      // PNG 保留透明背景（logo / 去背貼圖常見）
      resolve(canvas.toDataURL('image/png'))
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('不支援的圖片格式'))
    }
    img.src = url
  })
}
