import type { MutableRefObject } from 'react'
import type { NarrationSegment, SubtitleStyle } from '@/types'
import { OUTPUT_W } from '@/lib/utils'
import { wrapWordsToLines } from '@/lib/canvas'

function splitToLineGroups(words: string[], wordsPerLine = 4): string[][] {
  const groups: string[][] = []
  for (let i = 0; i < words.length; i += wordsPerLine) {
    groups.push(words.slice(i, i + wordsPerLine))
  }
  return groups
}

export function getNarrationVisibleText(
  segs: NarrationSegment[],
  time: number,
  measureCtx?: CanvasRenderingContext2D | null,
  measureStyle?: SubtitleStyle | null,
): string {
  const seg = segs.find(s => time >= s.startTime && time < s.startTime + s.duration)
  if (!seg || !seg.text) return ''
  const words = seg.text.split(' ').filter(w => w.length > 0)
  if (!words.length) return ''
  const elapsed = time - seg.startTime

  let cardWordLists: string[][]

  if (measureCtx) {
    const sizeRatio = measureStyle?.fontSizeRatio ?? 0.055
    const fontFamily = measureStyle?.fontFamily ?? "Georgia, 'Times New Roman', serif"
    const fontSize = Math.round(OUTPUT_W * sizeRatio)
    const sidePadding = Math.round(OUTPUT_W * 0.06)
    const maxLineWidth = OUTPUT_W - sidePadding * 2
    const prevFont = measureCtx.font
    measureCtx.font = `700 ${fontSize}px ${fontFamily}`
    const allLines = wrapWordsToLines(words, measureCtx, maxLineWidth)
    measureCtx.font = prevFont
    cardWordLists = []
    for (let i = 0; i < allLines.length; i += 2) {
      cardWordLists.push(
        allLines.slice(i, i + 2).join(' ').split(' ').filter(w => w.length > 0)
      )
    }
  } else {
    const lineGroups = splitToLineGroups(words, 4)
    cardWordLists = []
    for (let i = 0; i < lineGroups.length; i += 2) {
      cardWordLists.push(lineGroups.slice(i, i + 2).flat())
    }
  }

  const cardChars = cardWordLists.map(wl => wl.reduce((s, w) => s + Math.max(w.length, 1), 0))
  const totalChars = cardChars.reduce((a, b) => a + b, 0)
  let cumChars = 0
  const cardOnsets = cardChars.map(count => {
    const onset = (cumChars / totalChars) * seg.duration
    cumChars += count
    return onset
  })

  const effectiveElapsed = elapsed + 0.1
  let cardIndex = 0
  for (let i = 0; i < cardOnsets.length; i++) {
    if (cardOnsets[i] <= effectiveElapsed) cardIndex = i
  }

  const cardWords = cardWordLists[cardIndex]
  const cardStart = cardOnsets[cardIndex]
  const cardEnd = cardIndex + 1 < cardOnsets.length ? cardOnsets[cardIndex + 1] : seg.duration
  const cardDuration = Math.max(cardEnd - cardStart, 0.01)

  const wordChars = cardWords.map(w => Math.max(w.length, 1))
  const cardTotalChars = wordChars.reduce((a, b) => a + b, 0)
  let cumWordChars = 0
  const wordOnsets = wordChars.map(count => {
    const onset = cardStart + (cumWordChars / cardTotalChars) * cardDuration
    cumWordChars += count
    return onset
  })

  let wordsToShow = 1
  for (let i = 0; i < wordOnsets.length; i++) {
    if (wordOnsets[i] <= effectiveElapsed) wordsToShow = i + 1
  }
  return cardWords.slice(0, wordsToShow).join(' ')
}

export function getNarrationFullText(segs: NarrationSegment[], time: number): string {
  const seg = segs.find(s => time >= s.startTime && time < s.startTime + s.duration)
  return seg?.text ?? ''
}

export function scheduleNarrationAudio(
  segs: NarrationSegment[],
  fromTime: number,
  ctxRef: MutableRefObject<AudioContext | null>,
  sourcesRef: MutableRefObject<AudioBufferSourceNode[]>,
) {
  for (const src of sourcesRef.current) { try { src.stop() } catch { /* already stopped */ } }
  sourcesRef.current = []
  if (!segs.length) return
  if (!ctxRef.current || ctxRef.current.state === 'closed') {
    ctxRef.current = new AudioContext()
  }
  const ctx = ctxRef.current
  for (const seg of segs) {
    if (!seg.audioData || !seg.samplingRate) continue
    if (seg.startTime + seg.duration <= fromTime) continue
    const buffer = ctx.createBuffer(1, seg.audioData.length, seg.samplingRate)
    buffer.copyToChannel(seg.audioData, 0)
    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.connect(ctx.destination)
    const delay = seg.startTime - fromTime
    if (delay >= 0) {
      source.start(ctx.currentTime + delay)
    } else {
      const offset = Math.min(-delay, seg.duration - 0.01)
      source.start(ctx.currentTime, offset)
    }
    sourcesRef.current.push(source)
  }
}

export function stopNarrationAudio(sourcesRef: MutableRefObject<AudioBufferSourceNode[]>) {
  for (const src of sourcesRef.current) { try { src.stop() } catch { /* already stopped */ } }
  sourcesRef.current = []
}
