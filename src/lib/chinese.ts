import { Converter } from 'opencc-js'
import type { CameraPoint } from '@/types'

export type ChineseConversion = 'original' | 'tw' | 'cn'

let _twConv: ((s: string) => string) | null = null
let _cnConv: ((s: string) => string) | null = null

function getTwConv() {
  return _twConv ?? (_twConv = Converter({ from: 'cn', to: 'tw' }))
}

function getCnConv() {
  return _cnConv ?? (_cnConv = Converter({ from: 'tw', to: 'cn' }))
}

export function convertChinese(text: string, mode: 'tw' | 'cn'): string {
  if (!text) return text
  return mode === 'tw' ? getTwConv()(text) : getCnConv()(text)
}

export function convertPointsCaptions(points: CameraPoint[], mode: 'tw' | 'cn'): CameraPoint[] {
  const conv = (s: string) => convertChinese(s, mode)
  return points.map(p => ({
    ...p,
    caption: {
      ...p.caption,
      text: conv(p.caption.text),
      subtitle: conv(p.caption.subtitle),
    }
  }))
}
