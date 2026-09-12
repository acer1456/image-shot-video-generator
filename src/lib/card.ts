import type { CameraPoint, CaptionData, CardFrame, CarouselCard } from '@/types'
import { OUTPUT_W, clamp, hexToRgba, mix } from './utils'

export interface Rect { x: number; y: number; w: number; h: number }

/** 每種框的預設色：金框是金色、相紙是米白、線框是白 */
export const CARD_FRAMES: { value: CardFrame; label: string; color: string }[] = [
  { value: 'museum', label: '美術館金框', color: '#c9a227' },
  { value: 'double', label: '雙線畫廊框', color: '#ffffff' },
  { value: 'thin', label: '細線框', color: '#ffffff' },
  { value: 'polaroid', label: '相紙白框', color: '#f4f1ea' },
  { value: 'none', label: '無框', color: '#ffffff' },
]

export const DEFAULT_CARD: Omit<CarouselCard, 'kind'> = {
  frame: 'museum',
  frameColor: '#c9a227',
  imageWidth: 0.72,
  imageY: 0.42,
}

export function normalizeCard(raw: Partial<CarouselCard> | undefined): CarouselCard {
  const frame = CARD_FRAMES.some(f => f.value === raw?.frame) ? raw!.frame! : DEFAULT_CARD.frame
  return {
    kind: raw?.kind === 'outro' ? 'outro' : 'cover',
    frame,
    frameColor: typeof raw?.frameColor === 'string' ? raw.frameColor : DEFAULT_CARD.frameColor,
    imageWidth: clamp(Number(raw?.imageWidth ?? DEFAULT_CARD.imageWidth), 0.4, 0.95),
    imageY: clamp(Number(raw?.imageY ?? DEFAULT_CARD.imageY), 0.1, 0.9),
  }
}

/** 卡片文字用的 caption 預設：白字、無底框、細陰影 */
function cardCaption(text: string, subtitle: string, y: number, scale: number, style: Partial<CaptionData> | null): Partial<CaptionData> {
  return {
    ...(style || {}),
    text, subtitle, x: 0.5, y, scale, subtitleScale: 1,
    shadowBoxVisible: false,
    textShadowEnabled: true, textShadowBlur: 12, textShadowOpacity: 0.6,
  }
}

/**
 * 封面／封底的預設內容。文字全部是 caption，之後由使用者自由改字、拖曳。
 * 回傳 normalizePoint 的原始輸入，呼叫端負責 normalize。
 */
export function cardPointTemplate(kind: CarouselCard['kind'], style: Partial<CaptionData> | null, logoText = 'ArtLearning.cc') {
  const logo = { ...cardCaption(logoText, '', 0.045, 0.5, style), x: 0.84 }
  const captions = kind === 'cover'
    ? [
        cardCaption('畫作標題', '畫家', 0.8, 1, style),
        cardCaption('年代 · 地點', '', 0.9, 0.6, style),
      ]
    : [
        cardCaption('喜歡這幅作品嗎？', '❤ 按讚　➕ 追蹤', 0.8, 1, style),
        cardCaption('下載 ArtLearning App', '', 0.9, 0.6, style),
      ]
  return {
    x: 0.5, y: 0.5, zoom: 1, move: 'jump' as const, moveDuration: 0.1, holdDuration: 1,
    caption: captions[0] as CaptionData,
    extraCaptions: [captions[1], logo] as CaptionData[],
    card: { kind, ...DEFAULT_CARD },
  }
}

export function isCardPoint(p: CameraPoint | undefined | null): boolean {
  return !!p?.card
}

/** 畫框佔的寬度（以 1080 寬為基準，隨畫布縮放） */
function frameInset(frame: CardFrame, unit: number): { side: number; bottom: number } {
  switch (frame) {
    case 'thin': return { side: 22 * unit, bottom: 22 * unit }
    case 'double': return { side: 34 * unit, bottom: 34 * unit }
    case 'museum': return { side: 64 * unit, bottom: 64 * unit }
    case 'polaroid': return { side: 36 * unit, bottom: 110 * unit }
    default: return { side: 0, bottom: 0 }
  }
}

/** 畫作在卡片上的位置：等比縮放到 imageWidth，連框一起不超出畫布 */
export function cardImageRect(
  card: CarouselCard,
  image: { width: number; height: number },
  target: { width: number; height: number },
): Rect {
  const unit = target.width / OUTPUT_W
  const inset = frameInset(card.frame, unit)
  const maxW = card.imageWidth * target.width
  const maxH = target.height * 0.78 - inset.side - inset.bottom
  const scale = Math.min(maxW / image.width, maxH / image.height)
  const w = image.width * scale
  const h = image.height * scale
  const cx = target.width / 2
  const cy = clamp(card.imageY * target.height, h / 2 + inset.side, target.height - h / 2 - inset.bottom)
  return { x: cx - w / 2, y: cy - h / 2, w, h }
}

function strokeBand(ctx: CanvasRenderingContext2D, r: Rect, pad: number, width: number, color: string | CanvasGradient) {
  ctx.lineWidth = width
  ctx.strokeStyle = color
  ctx.strokeRect(r.x - pad - width / 2, r.y - pad - width / 2, r.w + (pad + width / 2) * 2, r.h + (pad + width / 2) * 2)
}

function lighten(hex: string, t: number) {
  const n = parseInt(hex.replace('#', '').padEnd(6, '0').slice(0, 6), 16)
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => Math.round(t >= 0 ? mix(v, 255, t) : mix(v, 0, -t)))
  return `#${c.map(v => v.toString(16).padStart(2, '0')).join('')}`
}

/**
 * 畫框全部用 canvas 畫，不用素材。分兩趟：under 在畫作之前（紙、斜面、陰影），
 * over 在畫作之後（壓在畫作邊緣的內陰影）。
 */
export function paintCardFrame(ctx: CanvasRenderingContext2D, card: CarouselCard, rect: Rect, phase: 'under' | 'over') {
  const unit = ctx.canvas.width / OUTPUT_W
  const color = card.frameColor || DEFAULT_CARD.frameColor
  ctx.save()
  ctx.lineJoin = 'miter'

  if (phase === 'over') {
    if (card.frame === 'museum' || card.frame === 'double') {
      // 畫作邊緣的內陰影，讓畫作像嵌進框裡
      const d = 16 * unit
      const edges: [number, number, number, number][] = [
        [rect.x, rect.y, rect.x, rect.y + d], [rect.x, rect.y + rect.h, rect.x, rect.y + rect.h - d],
        [rect.x, rect.y, rect.x + d, rect.y], [rect.x + rect.w, rect.y, rect.x + rect.w - d, rect.y],
      ]
      for (const [x0, y0, x1, y1] of edges) {
        const g = ctx.createLinearGradient(x0, y0, x1, y1)
        g.addColorStop(0, 'rgba(0,0,0,0.38)')
        g.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.fillStyle = g
        ctx.fillRect(rect.x, rect.y, rect.w, rect.h)
      }
    } else if (card.frame === 'polaroid') {
      ctx.strokeStyle = 'rgba(0,0,0,0.18)'
      ctx.lineWidth = 2 * unit
      ctx.strokeRect(rect.x + unit, rect.y + unit, rect.w - unit * 2, rect.h - unit * 2)
    }
    ctx.restore()
    return
  }

  switch (card.frame) {
    case 'thin': {
      strokeBand(ctx, rect, 10 * unit, 3 * unit, color)
      break
    }
    case 'double': {
      strokeBand(ctx, rect, 22 * unit, 8 * unit, color)
      strokeBand(ctx, rect, 8 * unit, 2 * unit, color)
      break
    }
    case 'polaroid': {
      const side = 36 * unit, bottom = 110 * unit
      ctx.shadowColor = 'rgba(0,0,0,0.45)'
      ctx.shadowBlur = 40 * unit
      ctx.shadowOffsetY = 14 * unit
      ctx.fillStyle = color
      ctx.fillRect(rect.x - side, rect.y - side, rect.w + side * 2, rect.h + side + bottom)
      ctx.shadowColor = 'transparent'
      break
    }
    case 'museum': {
      // 由外而內：外緣暗邊 → 斜面主體（漸層，模擬鍍金弧面）→ 內唇亮線 → 內唇暗線 → 畫作內陰影
      const outer = 64 * unit
      const light = lighten(color, 0.45)
      const dark = lighten(color, -0.45)
      const deep = lighten(color, -0.7)

      // 整個框投到背景上的陰影
      ctx.shadowColor = 'rgba(0,0,0,0.55)'
      ctx.shadowBlur = 48 * unit
      ctx.shadowOffsetY = 18 * unit
      ctx.fillStyle = deep
      ctx.fillRect(rect.x - outer, rect.y - outer, rect.w + outer * 2, rect.h + outer * 2)
      ctx.shadowColor = 'transparent'

      // 斜面主體：對角漸層讓四邊有受光差
      const g = ctx.createLinearGradient(rect.x - outer, rect.y - outer, rect.x + rect.w + outer, rect.y + rect.h + outer)
      g.addColorStop(0, light)
      g.addColorStop(0.35, color)
      g.addColorStop(0.5, light)
      g.addColorStop(0.65, color)
      g.addColorStop(1, dark)
      strokeBand(ctx, rect, 6 * unit, outer - 12 * unit, g)

      // 外緣細亮線與內唇：亮 → 暗 兩道，做出立體台階
      strokeBand(ctx, rect, outer - 5 * unit, 2 * unit, hexToRgba(light, 0.9))
      strokeBand(ctx, rect, 4 * unit, 3 * unit, light)
      strokeBand(ctx, rect, 1 * unit, 3 * unit, dark)

      // 中段一道細凹槽，讓寬框不呆板
      strokeBand(ctx, rect, outer * 0.55, 1.5 * unit, hexToRgba(dark, 0.7))
      strokeBand(ctx, rect, outer * 0.55 + 2 * unit, 1 * unit, hexToRgba(light, 0.7))

      // 四角裝飾：小菱形，金框常見的角飾
      const cornerR = outer * 0.5
      const corners = [
        [rect.x - cornerR, rect.y - cornerR], [rect.x + rect.w + cornerR, rect.y - cornerR],
        [rect.x - cornerR, rect.y + rect.h + cornerR], [rect.x + rect.w + cornerR, rect.y + rect.h + cornerR],
      ]
      for (const [cx, cy] of corners) {
        const s = outer * 0.26
        ctx.beginPath()
        ctx.moveTo(cx, cy - s); ctx.lineTo(cx + s, cy); ctx.lineTo(cx, cy + s); ctx.lineTo(cx - s, cy); ctx.closePath()
        ctx.fillStyle = light
        ctx.fill()
        ctx.lineWidth = 1.5 * unit
        ctx.strokeStyle = dark
        ctx.stroke()
      }
      break
    }
    default:
      break
  }
  ctx.restore()
}
