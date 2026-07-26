import type { CameraPoint, CaptionData, BackgroundSettings, ImageOverlay, MosaicStroke, SubtitleCue, SubtitleStyle } from '@/types'
import { convertPointsCaptions, convertSubtitleCues, type ChineseConversion } from './chinese'
import { getOverlayImage, getOverlayRatio, isOverlayActiveAt, paintOverlayGuides } from './overlays'
import { getMosaickedImage } from './mosaic'
import {
  OUTPUT_W, OUTPUT_H, OUTPUT_RATIO, DEFAULT_FONT,
  clamp, mix, easeInOut, hexToRgba, roundRect,
  wrapText, canvasMeasure, type Measure
} from './utils'

export type { Measure }

export interface FitRect {
  x: number; y: number; w: number; h: number; scale: number
}

export interface Rect { x: number; y: number; w: number; h: number }

/** 來源圖：排版只需要尺寸，繪製才需要真正的 image。見 CONTEXT.md 的 Scene。 */
export interface SourceImage {
  width: number
  height: number
  source: CanvasImageSource
}

/** 一次繪製的目標畫布：尺寸決定所有幾何，measure 決定文字排版。 */
export interface Target {
  width: number
  height: number
  measure: Measure
  /** 疊加圖的高寬比（解碼後才知道）。未提供時當作 1。 */
  overlayRatio?: (overlay: ImageOverlay) => number
}

/** 已解出的一格畫面內容——不含時間，不含 store，不含 React。 */
export interface FrameState {
  /** 這個時間點落在哪一個鏡頭點上；預覽用它同步選取狀態。 */
  pointIndex: number
  image: SourceImage
  background: BackgroundSettings
  camera: Camera
  captions: CaptionData[]
  overlays: ImageOverlay[]
  mosaic: MosaicStroke[]
  subtitle: { text: string; style?: SubtitleStyle } | null
  /**
   * ponytail: 編輯輔助線暫時留在 layer 上，好讓 step 1 逐像素不變。
   * 之後 drawChrome 拆出去時整組移走，composeFrame 就再也畫不出輔助線。
   */
  chrome?: {
    includeGuides: boolean
    showCaptionBox: boolean
    activeCaptionIndex: number
    snapGuide: { x: boolean; y: boolean }
    overlayGuides: boolean
  }
}

/**
 * 一層要畫的東西。陣列順序就是繪製順序，所以 hit-test 反向走訪不可能跟畫面不一致。
 * 幾何都已解出（需要量測的部分在 layersFor 內算完），paint 只負責塗。
 */
export type Layer =
  | { kind: 'background'; color: string; blur: { image: SourceImage; blurPx: number } | null }
  | { kind: 'image'; image: SourceImage; src: Rect; dest: Rect; mosaic: MosaicStroke[] }
  | { kind: 'overlay'; overlay: ImageOverlay; rect: Rect; opacity: number; guides: boolean }
  | { kind: 'caption'; captionIndex: number; cap: CaptionData; layout: CaptionLayout; guides: boolean; snapGuide: { x: boolean; y: boolean } }
  | { kind: 'subtitle'; style: SubtitleStyle | undefined; layout: SubtitleLayout }

/** 旁白字幕的量測結果：行、位置、字型都算好，背景條算好或為 null。 */
export interface SubtitleLayout {
  lines: { text: string; x: number; y: number; font: string }[]
  box: Rect | null
  boxRadius: number
  strokeWidth: number
}

export function canvasTarget(ctx: CanvasRenderingContext2D, overlayRatio?: (overlay: ImageOverlay) => number): Target {
  return {
    width: ctx.canvas.width,
    height: ctx.canvas.height,
    measure: canvasMeasure(ctx),
    overlayRatio,
  }
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

/**
 * 取景範圍。輸出比例是「目標畫布」的性質，不是常數——4:5 或 1:1 的截圖
 * 跟 9:16 的影片共用同一套取景邏輯，只是比例不同。ScreenDownload 當初就是
 * 為了這個參數才自己複製了一份。
 */
export function getCameraSourceRect(
  image: { width: number; height: number },
  p: CameraPoint,
  outputRatio: number = OUTPUT_RATIO,
) {
  const naturalRatio = image.width / image.height
  let baseW: number, baseH: number
  if (naturalRatio > outputRatio) {
    baseW = image.width
    baseH = baseW / outputRatio
  } else {
    baseH = image.height
    baseW = baseH * outputRatio
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

export function getCameraForPoint(image: { width: number; height: number }, p: CameraPoint): Camera {
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

export function getAllCaptions(point: CameraPoint): CaptionData[] {
  return [point.caption, ...(point.extraCaptions || [])]
}

// 字幕排版快取：CaptionData 在 store 內是 immutable 更新（每次編輯都是新物件），
// 所以能以物件參照為 key。字型載入完成會使 measureText 結果改變，用 generation 使快取失效。
const captionLayoutCache = new WeakMap<CaptionData, { key: string; layout: CaptionLayout }>()
let fontGeneration = 0
if (typeof document !== 'undefined' && document.fonts?.addEventListener) {
  document.fonts.addEventListener('loadingdone', () => { fontGeneration++ })
}

/** 既有呼叫端（CanvasEditor 的命中測試）用的形式；內部一律走 captionLayout(target, cap)。 */
export function getCaptionLayout(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  cap: CaptionData
): CaptionLayout {
  return captionLayout(canvasTarget(ctx), cap)
}

export function captionLayout(target: Target, cap: CaptionData): CaptionLayout {
  const cacheKey = `${target.width}x${target.height}|${fontGeneration}`
  const cached = captionLayoutCache.get(cap)
  if (cached && cached.key === cacheKey) return cached.layout
  const layout = computeCaptionLayout(target, cap)
  captionLayoutCache.set(cap, { key: cacheKey, layout })
  return layout
}

function computeCaptionLayout(
  target: Target,
  cap: CaptionData
): CaptionLayout {
  const fontFamily = cap.fontFamily || DEFAULT_FONT
  const subtitleFontFamily = cap.subtitleFontFamily || DEFAULT_FONT
  const mainSize = 56 * cap.scale
  const subSize = 34 * cap.scale * (cap.subtitleScale || 1)
  const mainLine = mainSize * 1.25
  const subLine = subSize * 1.28
  const baseTextMaxW = target.width * 0.78
  const boxScaleX = cap.boxScaleX || 1
  const textMaxW = baseTextMaxW * boxScaleX
  const mainLines = wrapText(target.measure, cap.text || '', textMaxW, `800 ${mainSize}px ${fontFamily}`)
  const subLines = wrapText(target.measure, cap.subtitle || '', textMaxW, `650 ${subSize}px ${subtitleFontFamily}`)
  const gap = mainLines.length && subLines.length ? 18 * cap.scale : 0
  const textH = mainLines.length * mainLine + gap + subLines.length * subLine
  const padX = 38 * cap.scale
  const padY = 24 * cap.scale
  const baseH = Math.max(70, textH + padY * 2)
  const width = Math.min(target.width * 0.94, Math.max(baseTextMaxW * boxScaleX + padX * 2, 240 + padX * 2))
  const height = Math.min(target.height * 0.5, baseH * (cap.boxScaleY || 1))
  const cx = cap.x * target.width
  const cy = cap.y * target.height
  return {
    fontFamily, subtitleFontFamily, mainLines, subLines,
    mainSize, subSize, mainLine, subLine, gap, textH,
    width, height, x: cx - width / 2, y: cy - height / 2, cx, cy
  }
}

// 模糊背景在預覽 / 匯出時每一幀都相同，但 ctx.filter blur 在 1080×1920 非常昂貴。
// 以 image 為 key 快取模糊結果，同一張圖 + 相同設定只算一次。
const blurBackgroundCache = new WeakMap<HTMLImageElement, Map<string, HTMLCanvasElement>>()

function getBlurredBackground(canvas: HTMLCanvasElement, image: HTMLImageElement, blurPx: number) {
  const key = `${blurPx}|${canvas.width}x${canvas.height}`
  let perImage = blurBackgroundCache.get(image)
  if (!perImage) {
    perImage = new Map()
    blurBackgroundCache.set(image, perImage)
  }
  const cached = perImage.get(key)
  if (cached) return cached
  const off = document.createElement('canvas')
  off.width = canvas.width
  off.height = canvas.height
  const offCtx = off.getContext('2d')!
  offCtx.filter = `blur(${blurPx}px)`
  const scale = Math.max(off.width / image.width, off.height / image.height)
  const dw = image.width * scale
  const dh = image.height * scale
  const dx = (off.width - dw) / 2
  const dy = (off.height - dh) / 2
  const bleed = Math.max(0, blurPx * 2)
  offCtx.drawImage(image, dx - bleed, dy - bleed, dw + bleed * 2, dh + bleed * 2)
  // 編輯畫布與匯出畫布尺寸不同會各留一份；超過 4 份時清掉最舊的
  if (perImage.size >= 4) perImage.delete(perImage.keys().next().value!)
  perImage.set(key, off)
  return off
}

/**
 * 一格畫面 = 一串 layer。純函式：只讀 state 與 target，不碰 canvas、不碰 React。
 * 陣列順序就是繪製順序。
 */
export function layersFor(state: FrameState, target: Target): Layer[] {
  const { image, camera, mosaic, chrome } = state
  const layers: Layer[] = []

  layers.push({
    kind: 'background',
    color: state.background.color || '#000000',
    blur: state.background.mode === 'blur' ? { image, blurPx: state.background.blur || 0 } : null,
  })

  const p = { x: camera.cx / image.width, y: camera.cy / image.height, zoom: camera.zoom }
  const src = getCameraSourceRect(image, p as CameraPoint, target.width / target.height)
  const ix = Math.max(0, src.sx)
  const iy = Math.max(0, src.sy)
  const ix2 = Math.min(image.width, src.sx + src.sw)
  const iy2 = Math.min(image.height, src.sy + src.sh)
  const iw = ix2 - ix
  const ih = iy2 - iy
  if (iw > 0 && ih > 0) {
    layers.push({
      kind: 'image',
      image,
      src: { x: ix, y: iy, w: iw, h: ih },
      dest: {
        x: ((ix - src.sx) / src.sw) * target.width,
        y: ((iy - src.sy) / src.sh) * target.height,
        w: (iw / src.sw) * target.width,
        h: (ih / src.sh) * target.height,
      },
      mosaic,
    })
  }

  const ratioOf = target.overlayRatio ?? (() => 1)
  for (const overlay of state.overlays) {
    const w = overlay.scale * target.width
    const h = w * ratioOf(overlay)
    layers.push({
      kind: 'overlay',
      overlay,
      rect: {
        x: overlay.x * target.width - w / 2,
        y: overlay.y * target.height - h / 2,
        w,
        h,
      },
      opacity: clamp(overlay.opacity, 0, 1),
      guides: chrome?.overlayGuides ?? false,
    })
  }

  state.captions.forEach((cap, i) => {
    layers.push({
      kind: 'caption',
      captionIndex: i,
      cap,
      layout: captionLayout(target, cap),
      guides: !!chrome && chrome.includeGuides && i === chrome.activeCaptionIndex && chrome.showCaptionBox,
      snapGuide: chrome?.snapGuide ?? { x: false, y: false },
    })
  })

  if (state.subtitle) {
    layers.push({
      kind: 'subtitle',
      style: state.subtitle.style,
      layout: subtitleLayout(target, state.subtitle.text, state.subtitle.style),
    })
  }

  return layers
}

/** 把 layer 依序塗上去。所有幾何都已算好，這裡只做 canvas 呼叫。 */
export function paint(layers: Layer[], ctx: CanvasRenderingContext2D) {
  const canvas = ctx.canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  for (const layer of layers) {
    switch (layer.kind) {
      case 'background': {
        ctx.fillStyle = layer.color
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        if (layer.blur) {
          ctx.drawImage(getBlurredBackground(canvas, layer.blur.image.source as HTMLImageElement, layer.blur.blurPx), 0, 0)
        }
        break
      }
      case 'image': {
        const source = layer.mosaic.length
          ? getMosaickedImage(layer.image.source as HTMLImageElement, layer.mosaic)
          : layer.image.source
        ctx.drawImage(source, layer.src.x, layer.src.y, layer.src.w, layer.src.h,
          layer.dest.x, layer.dest.y, layer.dest.w, layer.dest.h)
        break
      }
      case 'overlay': {
        const img = getOverlayImage(layer.overlay)
        if (img) {
          ctx.save()
          ctx.globalAlpha = layer.opacity
          ctx.drawImage(img, layer.rect.x, layer.rect.y, layer.rect.w, layer.rect.h)
          ctx.restore()
        }
        if (layer.guides) paintOverlayGuides(ctx, layer.rect)
        break
      }
      case 'caption':
        paintCaption(ctx, layer.cap, layer.layout, layer.guides, layer.snapGuide)
        break
      case 'subtitle':
        paintSubtitle(ctx, layer.layout, layer.style)
        break
    }
  }
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
  snapGuide: { x: boolean; y: boolean },
  activeCaptionIndex = 0,
  narrationText?: string,
  subtitleStyle?: SubtitleStyle,
  overlays?: ImageOverlay[],
  overlayTime?: number,
  overlayGuides?: boolean,
  mosaicStrokes?: MosaicStroke[],
  showMosaic = true
) {
  const state: FrameState = {
    pointIndex: 0,
    image: { width: image.width, height: image.height, source: image },
    background: bg,
    camera,
    captions: captionPoint ? getAllCaptions(captionPoint) : [],
    overlays: overlays?.length && overlayTime != null
      ? overlays.filter(o => isOverlayActiveAt(o, overlayTime))
      : [],
    mosaic: showMosaic && mosaicStrokes?.length ? mosaicStrokes : [],
    subtitle: narrationText ? { text: narrationText, style: subtitleStyle } : null,
    chrome: {
      includeGuides,
      showCaptionBox,
      activeCaptionIndex,
      snapGuide,
      overlayGuides: overlayGuides ?? false,
    },
  }
  paint(layersFor(state, canvasTarget(ctx, getOverlayRatio)), ctx)
}

// ─── Scene：一支影片的完整內容，與時間無關 ───────────────────────────────
// 顯示與否已經解析成資料：旁白字幕隱藏就是 cues 為空、馬賽克關閉就是 mosaic 為空。
// 見 CONTEXT.md 的 Scene。

export interface Scene {
  /** 尚未載入圖片的專案也是合法的 Scene——只是畫不出畫面。 */
  image: SourceImage | null
  background: BackgroundSettings
  points: CameraPoint[]
  /** 空陣列＝不顯示旁白字幕 */
  cues: SubtitleCue[]
  overlays: ImageOverlay[]
  /** 空陣列＝不套用馬賽克 */
  mosaic: MosaicStroke[]
  /**
   * 鏡頭字幕是掛在 points 上的，沒辦法像 cues 那樣用空陣列表示隱藏，
   * 所以這裡留一個必填欄位——必填就不可能忘記給。
   */
  showCameraCaptions: boolean
  /** 音訊結束時間（秒）。影片不能比旁白短，所以它參與長度計算。 */
  audioEnd: number
}

/**
 * 影片長度：鏡頭路徑、旁白字幕、疊加圖、旁白音訊四者取最長。
 * 這個公式原本在 App.tsx 與 useVideoRender.ts 各有一份。
 */
export function sceneDuration(scene: Scene): number {
  const { totalDuration } = buildTimeline(scene.points)
  const cueEnd = scene.cues.reduce((max, cue) => Math.max(max, cue.startTime + cue.duration), 0)
  const overlayEnd = scene.overlays.reduce((max, o) => Math.max(max, o.startTime + o.duration), 0)
  return Math.max(totalDuration, cueEnd, overlayEnd, scene.audioEnd)
}

/**
 * 鏡頭點 index 對應的時間點——停留區段的開頭，沒有停留就用移動的開頭。
 * 以點為單位思考的呼叫端（縮圖、時間軸選取）用它換成時間，畫面一律以時間定址。
 */
export function timeOfPoint(points: CameraPoint[], index: number): number {
  const { items } = buildTimeline(points)
  const hold = items.find(item => item.pointIndex === index && item.type === 'hold')
  if (hold) return hold.start
  const move = items.find(item => item.pointIndex === index && item.type === 'move')
  return move ? move.start : 0
}

export function getActiveSubtitleCue(cues: SubtitleCue[], time: number): SubtitleCue | null {
  return cues.find(cue => time >= cue.startTime && time < cue.startTime + cue.duration) ?? null
}

export function getSubtitleRenderText(cue: SubtitleCue | null): string {
  if (!cue) return ''
  const main = cue.text.trim()
  const sub = cue.translation.trim()
  if (main && sub) return `${main}\n${sub}`
  return main || sub
}

/** 把 Scene 在時間 t 解成一格畫面。沒有鏡頭點時回傳 null。 */
export function frameStateAt(scene: Scene, t: number, chrome?: FrameState['chrome']): FrameState | null {
  const image = scene.image
  if (!image) return null
  const timeline = getTimelineStateAt(image, scene.points, t)
  if (!timeline) return null
  const cue = getActiveSubtitleCue(scene.cues, t)
  const text = getSubtitleRenderText(cue)
  return {
    pointIndex: timeline.pointIndex,
    image,
    background: scene.background,
    camera: timeline.camera,
    captions: scene.showCameraCaptions ? getAllCaptions(timeline.captionPoint) : [],
    overlays: scene.overlays.filter(o => isOverlayActiveAt(o, t)),
    mosaic: scene.mosaic,
    subtitle: text ? { text, style: cue?.style } : null,
    chrome,
  }
}

export function layersAt(scene: Scene, t: number, target: Target, chrome?: FrameState['chrome']): Layer[] {
  const state = frameStateAt(scene, t, chrome)
  return state ? layersFor(state, target) : []
}

/**
 * 匯出／預覽都走這一支。沒有鏡頭點時不動畫布，維持原本 drawFrame 的行為。
 * 回傳畫出來的 FrameState，呼叫端若需要 pointIndex 之類的資訊可以直接拿，
 * 不必再解一次時間軸。
 */
export function composeFrame(
  scene: Scene,
  t: number,
  ctx: CanvasRenderingContext2D,
  chrome?: FrameState['chrome'],
): FrameState | null {
  const state = frameStateAt(scene, t, chrome)
  if (!state) return null
  paint(layersFor(state, canvasTarget(ctx, getOverlayRatio)), ctx)
  return state
}

/** 匯出時才做的繁簡轉換：Scene 進、Scene 出，所以預覽與匯出的差別就是這一行。 */
export async function convertScene(scene: Scene, mode: ChineseConversion): Promise<Scene> {
  if (mode === 'original') return scene
  const [points, cues] = await Promise.all([
    convertPointsCaptions(scene.points, mode),
    convertSubtitleCues(scene.cues, mode),
  ])
  return { ...scene, points, cues }
}

/**
 * Greedily wraps words into lines that each fit within maxWidth.
 * No text deformation or font-size changes — lines simply break at word boundaries.
 */
export function wrapWordsToLines(
  words: string[],
  measure: Measure,
  font: string,
  maxWidth: number
): string[] {
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word
    if (current && measure(candidate, font) > maxWidth) {
      lines.push(current)
      current = word
    } else {
      current = candidate
    }
  }
  if (current) lines.push(current)
  return lines
}

function hasCjkText(text: string) {
  return /[\u3400-\u9fff]/.test(text)
}

/** 純排版：算出每一行的位置與字型、背景條的方框。不碰 canvas。 */
export function subtitleLayout(target: Target, text: string, style?: SubtitleStyle): SubtitleLayout {
  const sizeRatio = style?.fontSizeRatio ?? 0.055
  const fontFamily = style?.fontFamily ?? "Georgia, 'Times New Roman', serif"
  const fontSize = Math.round(target.width * sizeRatio)
  const mainFont = `700 ${fontSize}px ${fontFamily}`

  // Fixed side padding — text stays within this boundary, font size never changes.
  const sidePadding = Math.round(target.width * 0.06)
  const maxLineWidth = target.width - sidePadding * 2

  const [mainText = '', subText = ''] = text.split('\n')
  const mainLines = mainText.trim() ? [mainText.trim()] : []
  const subFontSize = Math.round(fontSize * (style?.translationScale ?? 0.72))
  const subFont = `650 ${subFontSize}px ${fontFamily}`
  const trimmedSubText = subText.trim()
  const subLines = trimmedSubText
    ? hasCjkText(trimmedSubText)
      ? wrapWordsToLines(Array.from(trimmedSubText), target.measure, subFont, maxLineWidth).map(line => line.replace(/\s+/g, ''))
      : wrapWordsToLines(trimmedSubText.split(/\s+/), target.measure, subFont, maxLineWidth)
    : []

  const posX = style?.subtitlePosition?.x ?? 0.5
  const posY = style?.subtitlePosition?.y ?? 0.87
  const cx = target.width * posX
  const lineHeight = Math.round(fontSize * 1.35)
  const subLineHeight = Math.round(subFontSize * 1.35)
  const centerY = Math.round(target.height * posY)

  const totalHeight = Math.max(0, mainLines.length * lineHeight + subLines.length * subLineHeight)

  // ── 半透明背景條 ────────────────────────────────────────────────
  let box: Rect | null = null
  if ((style?.backgroundEnabled ?? false) && totalHeight > 0) {
    let maxWidth = mainLines.reduce((w, line) => Math.max(w, target.measure(line, mainFont)), 0)
    maxWidth = subLines.reduce((w, line) => Math.max(w, target.measure(line, subFont)), maxWidth)
    const padX = Math.round(fontSize * 0.5)
    const padY = Math.round(fontSize * 0.3)
    const boxW = Math.min(target.width * 0.96, maxWidth + padX * 2)
    const boxH = totalHeight + padY * 2
    box = { x: cx - boxW / 2, y: centerY - boxH / 2, w: boxW, h: boxH }
  }

  const lines: SubtitleLayout['lines'] = []
  let y = centerY - totalHeight / 2 + lineHeight / 2
  for (const line of mainLines) {
    lines.push({ text: line, x: cx, y, font: mainFont })
    y += lineHeight
  }
  for (const line of subLines) {
    lines.push({ text: line, x: cx, y: y - (lineHeight - subLineHeight) / 2, font: subFont })
    y += subLineHeight
  }

  return {
    lines,
    box,
    boxRadius: Math.round(fontSize * 0.25),
    strokeWidth: Math.max(1, (style?.strokeWidth ?? 4) / 1080 * target.width),
  }
}

function paintSubtitle(ctx: CanvasRenderingContext2D, layout: SubtitleLayout, style?: SubtitleStyle) {
  if (!layout.lines.length && !layout.box) return
  ctx.save()
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  if (layout.box) {
    ctx.fillStyle = `rgba(0,0,0,${style?.backgroundOpacity ?? 0.45})`
    roundRect(ctx, layout.box.x, layout.box.y, layout.box.w, layout.box.h, layout.boxRadius)
    ctx.fill()
  }

  const shadowEnabled = style?.shadowEnabled ?? true
  ctx.shadowColor = shadowEnabled ? `rgba(0,0,0,${style?.shadowOpacity ?? 0.9})` : 'transparent'
  ctx.shadowBlur = shadowEnabled ? (style?.shadowBlur ?? 10) : 0
  ctx.shadowOffsetX = shadowEnabled ? 2 : 0
  ctx.shadowOffsetY = shadowEnabled ? 2 : 0
  ctx.fillStyle = style?.color ?? '#ffffff'

  const strokeEnabled = style?.strokeEnabled ?? false
  if (strokeEnabled) {
    ctx.strokeStyle = style?.strokeColor ?? '#000000'
    ctx.lineWidth = layout.strokeWidth
    ctx.lineJoin = 'round'
  }

  for (const line of layout.lines) {
    ctx.font = line.font
    if (strokeEnabled) {
      // 描邊不帶陰影，避免疊出雙重黑邊
      const sc = ctx.shadowColor
      ctx.shadowColor = 'transparent'
      ctx.strokeText(line.text, line.x, line.y)
      ctx.shadowColor = sc
    }
    ctx.fillText(line.text, line.x, line.y)
  }

  ctx.restore()
}

function paintCaption(
  ctx: CanvasRenderingContext2D,
  cap: CaptionData,
  layout: CaptionLayout,
  includeGuides: boolean,
  snapGuide: { x: boolean; y: boolean }
) {
  const canvas = ctx.canvas
  const hasText = !!((cap.text || '').trim() || (cap.subtitle || '').trim())
  if (!hasText && !includeGuides) return
  ctx.save()
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  // 描邊設定（strokeWidth 以 1080 輸出寬為基準換算）
  const strokeEnabled = cap.strokeEnabled === true
  if (strokeEnabled) {
    ctx.strokeStyle = cap.strokeColor || '#000000'
    ctx.lineWidth = Math.max(0.5, (cap.strokeWidth ?? 4) / OUTPUT_W * canvas.width)
    ctx.lineJoin = 'round'
  }
  const fillLine = (line: string, x: number, y: number) => {
    if (strokeEnabled) {
      const sc = ctx.shadowColor
      ctx.shadowColor = 'transparent'
      ctx.strokeText(line, x, y)
      ctx.shadowColor = sc
    }
    ctx.fillText(line, x, y)
  }
  if (hasText) {
    // ── Shadow box (hideable) ─────────────────────────────────────────
    if (cap.shadowBoxVisible !== false) {
      roundRect(ctx, layout.x, layout.y, layout.width, layout.height, 28 * cap.scale)
      ctx.fillStyle = hexToRgba(cap.shadowColor || '#000000', cap.shadowAlpha ?? 0.48)
      ctx.fill()
    }
    let y = layout.cy - layout.textH / 2
    // ── 文字陰影：與旁白字幕卡片相同的模型（開關＋模糊＋透明度，固定 offset 2,2、黑色）──
    const shadowEnabled = cap.textShadowEnabled ?? true
    ctx.shadowColor = shadowEnabled ? `rgba(0,0,0,${cap.textShadowOpacity ?? 0.7})` : 'transparent'
    ctx.shadowBlur = shadowEnabled ? (cap.textShadowBlur ?? 10) : 0
    ctx.shadowOffsetX = shadowEnabled ? 2 : 0
    ctx.shadowOffsetY = shadowEnabled ? 2 : 0
    // ── Main caption ──────────────────────────────────────────────────
    if (layout.mainLines.length) {
      ctx.font = `800 ${layout.mainSize}px ${layout.fontFamily}`
      ctx.fillStyle = cap.textColor || '#ffffff'
      layout.mainLines.forEach(line => {
        const lineY = y + layout.mainLine / 2
        fillLine(line, layout.cx, lineY)
        y += layout.mainLine
      })
    }
    if (layout.mainLines.length && layout.subLines.length) y += layout.gap
    // ── Subtitle ──────────────────────────────────────────────────────
    if (layout.subLines.length) {
      ctx.font = `650 ${layout.subSize}px ${layout.subtitleFontFamily}`
      ctx.fillStyle = hexToRgba(cap.subTextColor || '#ffffff', 0.92)
      layout.subLines.forEach(line => {
        const lineY = y + layout.subLine / 2
        fillLine(line, layout.cx, lineY)
        y += layout.subLine
      })
    }
    ctx.shadowColor = 'transparent'
    ctx.shadowBlur = 0
    ctx.shadowOffsetX = 0
    ctx.shadowOffsetY = 0
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
  image: { width: number; height: number },
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
export function drawPointThumbnail(canvas: HTMLCanvasElement, scene: Scene, pointIndex: number) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  // 縮圖只呈現鏡頭取景，所以拿掉字幕、旁白與疊加圖——但馬賽克留著，
  // 它是「圖片內容」而不是疊加物。之前縮圖只傳 17 個參數中的 9 個，
  // 馬賽克就這樣被預設值悄悄關掉了。
  const bare: Scene = { ...scene, cues: [], overlays: [], showCameraCaptions: false }
  composeFrame(bare, timeOfPoint(bare.points, pointIndex), ctx)
}
