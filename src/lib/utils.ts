import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const OUTPUT_W = 1080
export const OUTPUT_H = 1920
export const OUTPUT_RATIO = OUTPUT_W / OUTPUT_H
export const DEFAULT_FONT = 'Noto Sans TC, Microsoft JhengHei, sans-serif'

export function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

export function mix(a: number, b: number, t: number) {
  return a + (b - a) * t
}

export function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
}

export function distance(x1: number, y1: number, x2: number, y2: number) {
  return Math.hypot(x1 - x2, y1 - y2)
}

export function hexToRgba(hex: string, alpha: number) {
  const clean = String(hex || '#000000').replace('#', '')
  const full = clean.length === 3 ? clean.split('').map(ch => ch + ch).join('') : clean
  const r = parseInt(full.slice(0, 2), 16) || 0
  const g = parseInt(full.slice(2, 4), 16) || 0
  const b = parseInt(full.slice(4, 6), 16) || 0
  return `rgba(${r},${g},${b},${clamp(Number(alpha), 0, 1)})`
}

export function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
) {
  const radius = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + w, y, x + w, y + h, radius)
  ctx.arcTo(x + w, y + h, x, y + h, radius)
  ctx.arcTo(x, y + h, x, y, radius)
  ctx.arcTo(x, y, x + w, y, radius)
  ctx.closePath()
}

export function formatTime(seconds: number) {
  const safe = Math.max(0, seconds || 0)
  const m = Math.floor(safe / 60)
  const s = safe - m * 60
  return `${String(m).padStart(2, '0')}:${s.toFixed(1).padStart(4, '0')}`
}

export function normalizeProjectName(name: string) {
  const trimmed = String(name || '').trim()
  return trimmed || '未命名專案'
}

export function sanitizeFileName(name: string) {
  const invalidChars = ['\\', '/', ':', '*', '?', '"', '<', '>', '|']
  let safe = normalizeProjectName(name)
  invalidChars.forEach(ch => { safe = safe.split(ch).join('-') })
  safe = safe.split(' ').filter(Boolean).join('-')
  while (safe.includes('--')) safe = safe.split('--').join('-')
  safe = safe.replace(/^-+/, '').replace(/-+$/, '')
  return safe || '未命名專案'
}

export function getTodayString() {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return y + '-' + m + '-' + d
}

export function nextFrame() {
  return new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
}

export function wait(ms: number) {
  return new Promise<void>(resolve => setTimeout(resolve, ms))
}

/**
 * 量測文字寬度的接縫。正式環境用 canvas 量；測試傳入確定性的假量測器，
 * 讓排版計算不需要 DOM。見 CONTEXT.md 的 Measure。
 */
export type Measure = (text: string, font: string) => number

export function canvasMeasure(ctx: CanvasRenderingContext2D): Measure {
  return (text, font) => measureText(ctx, text, font)
}

export function measureText(ctx: CanvasRenderingContext2D, text: string, font: string) {
  ctx.save()
  ctx.font = font
  const width = ctx.measureText(text).width
  ctx.restore()
  return width
}

export function wrapText(
  measure: Measure,
  text: string,
  maxWidth: number,
  font: string
): string[] {
  if (!text.trim()) return []
  const result: string[] = []
  text.split('\n').forEach(paragraph => {
    const tokens = paragraph.match(/[A-Za-z0-9]+(?:[-'][A-Za-z0-9]+)*|\s+|[^\sA-Za-z0-9]+/g) || ['']
    let line = ''
    const flushLine = () => {
      if (line.trim()) result.push(line.trimEnd())
      line = ''
    }
    const appendPiece = (piece: string) => {
      if (!piece) return
      if (!line) {
        if (measure(piece, font) <= maxWidth) {
          line = piece
          return
        }
        Array.from(piece).forEach(char => appendPiece(char))
        return
      }
      const test = line + piece
      if (measure(test, font) <= maxWidth) {
        line = test
        return
      }
      flushLine()
      if (measure(piece, font) <= maxWidth) {
        line = piece
        return
      }
      Array.from(piece).forEach(char => appendPiece(char))
    }
    tokens.forEach(token => {
      const isSpace = /^\s+$/.test(token)
      if (isSpace) {
        line += token
      } else {
        appendPiece(token)
      }
    })
    if (line.trim()) result.push(line.trimEnd())
    else if (!paragraph.trim()) result.push(' ')
  })
  return result
}
