import type { CameraPoint, SubtitleCue } from '@/types'

export type ChineseConversion = 'original' | 'tw' | 'cn'

let _twConv: Promise<(s: string) => string> | null = null
let _cnConv: Promise<(s: string) => string> | null = null

function getTwConv() {
  return _twConv ?? (_twConv = import('opencc-js/cn2t').then(({ Converter }) => Converter({ from: 'cn', to: 'tw' })))
}

function getCnConv() {
  return _cnConv ?? (_cnConv = import('opencc-js/t2cn').then(({ Converter }) => Converter({ from: 'tw', to: 'cn' })))
}

export async function convertChinese(text: string, mode: 'tw' | 'cn'): Promise<string> {
  if (!text) return text
  const conv = mode === 'tw' ? await getTwConv() : await getCnConv()
  return conv(text)
}

export async function convertPointsCaptions(points: CameraPoint[], mode: 'tw' | 'cn'): Promise<CameraPoint[]> {
  const conv = mode === 'tw' ? await getTwConv() : await getCnConv()
  return points.map(p => ({
    ...p,
    caption: {
      ...p.caption,
      text: conv(p.caption.text),
      subtitle: conv(p.caption.subtitle),
    }
  }))
}

export async function convertSubtitleCues(cues: SubtitleCue[], mode: 'tw' | 'cn'): Promise<SubtitleCue[]> {
  const conv = mode === 'tw' ? await getTwConv() : await getCnConv()
  return cues.map(cue => ({
    ...cue,
    text: conv(cue.text),
    translation: conv(cue.translation),
  }))
}
