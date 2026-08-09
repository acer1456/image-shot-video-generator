import type { MosaicStroke } from '@/types'
import { clamp } from './utils'

const mosaicCache = new WeakMap<HTMLImageElement, Map<string, HTMLCanvasElement>>()

function getMosaicCacheKey(image: HTMLImageElement, strokes: MosaicStroke[]) {
  return `${image.width}x${image.height}|${strokes.length}|${strokes.map(stroke => {
    const points = stroke.points.map(point => `${point.x.toFixed(4)},${point.y.toFixed(4)}`).join(';')
    return `${stroke.id}:${stroke.brushSize}:${points}`
  }).join('|')}`
}

export function normalizeMosaicStrokes(value: unknown): MosaicStroke[] {
  if (!Array.isArray(value)) return []
  return (value as Partial<MosaicStroke>[])
    .map(stroke => ({
      id: String(stroke.id ?? crypto.randomUUID()),
      brushSize: clamp(Number(stroke.brushSize ?? 56), 8, 260),
      points: Array.isArray(stroke.points)
        ? stroke.points
          .map(point => ({
            x: clamp(Number(point?.x ?? 0), 0, 1),
            y: clamp(Number(point?.y ?? 0), 0, 1),
          }))
          .filter(point => Number.isFinite(point.x) && Number.isFinite(point.y))
        : [],
    }))
    .filter(stroke => stroke.points.length > 0)
}

export function getMosaickedImage(image: HTMLImageElement, strokes: MosaicStroke[]): HTMLCanvasElement | HTMLImageElement {
  if (!strokes.length) return image

  const key = getMosaicCacheKey(image, strokes)
  let imageCache = mosaicCache.get(image)
  if (!imageCache) {
    imageCache = new Map()
    mosaicCache.set(image, imageCache)
  }
  const cached = imageCache.get(key)
  if (cached) return cached

  const output = document.createElement('canvas')
  output.width = image.width
  output.height = image.height
  const outCtx = output.getContext('2d')
  if (!outCtx) return image
  outCtx.drawImage(image, 0, 0)

  const block = Math.max(6, Math.round(Math.min(image.width, image.height) / 90))
  const small = document.createElement('canvas')
  small.width = Math.max(1, Math.ceil(image.width / block))
  small.height = Math.max(1, Math.ceil(image.height / block))
  const smallCtx = small.getContext('2d')
  if (!smallCtx) return image
  smallCtx.imageSmoothingEnabled = true
  smallCtx.drawImage(image, 0, 0, small.width, small.height)

  const pixelated = document.createElement('canvas')
  pixelated.width = image.width
  pixelated.height = image.height
  const pixCtx = pixelated.getContext('2d')
  if (!pixCtx) return image
  pixCtx.imageSmoothingEnabled = false
  pixCtx.drawImage(small, 0, 0, image.width, image.height)

  const mask = document.createElement('canvas')
  mask.width = image.width
  mask.height = image.height
  const maskCtx = mask.getContext('2d')
  if (!maskCtx) return image
  maskCtx.lineCap = 'round'
  maskCtx.lineJoin = 'round'
  maskCtx.strokeStyle = '#fff'
  maskCtx.fillStyle = '#fff'
  for (const stroke of strokes) {
    maskCtx.lineWidth = stroke.brushSize
    const first = stroke.points[0]
    if (!first) continue
    if (stroke.points.length === 1) {
      maskCtx.beginPath()
      maskCtx.arc(first.x * image.width, first.y * image.height, stroke.brushSize / 2, 0, Math.PI * 2)
      maskCtx.fill()
      continue
    }
    maskCtx.beginPath()
    maskCtx.moveTo(first.x * image.width, first.y * image.height)
    for (const point of stroke.points.slice(1)) {
      maskCtx.lineTo(point.x * image.width, point.y * image.height)
    }
    maskCtx.stroke()
  }

  pixCtx.globalCompositeOperation = 'destination-in'
  pixCtx.drawImage(mask, 0, 0)
  pixCtx.globalCompositeOperation = 'source-over'
  outCtx.drawImage(pixelated, 0, 0)
  // 每一筆都是一份原圖大小的 canvas（4000×3000 ≈ 48MB）。塗馬賽克時每移動一點
  // 就換一個 key，不設上限會在幾秒內把記憶體吃光。只有最後一版會被重複命中。
  if (imageCache.size >= 2) imageCache.delete(imageCache.keys().next().value!)
  imageCache.set(key, output)
  return output
}
