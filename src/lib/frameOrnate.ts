/**
 * 浮雕金框引擎：一個框 = 由外而內的多層「線腳」(band)，每層有自己的剖面光影
 * （平面／凹／凸／S 形）與沿邊重複的雕花（珠鍊、蛋鏢、莨苕葉、蘆葦紋、繩紋、緞帶、月桂），
 * 四角與四邊中點再放獨立雕飾。全部程序化用 canvas 畫，不用素材。
 *
 * 光源固定在左上：每個 band 依所在邊調整明暗，浮雕靠「暗影偏右下、亮邊偏左上」的
 * 三次描繪做出來，偏移量以世界座標計算，所以四邊的受光方向一致。
 */
import { OUTPUT_W, mix } from './utils'

export interface Rect { x: number; y: number; w: number; h: number }

export type Motif =
  | 'flat' | 'cove' | 'torus' | 'ogee'
  | 'bead' | 'eggdart' | 'leaf' | 'reed' | 'rope' | 'ribbon' | 'laurel'

export interface Band {
  w: number            // 寬度（以 1080 輸出寬為單位）
  motif: Motif
  tone?: number        // 整體明暗偏移 -1..1
  color?: string       // 覆寫底色（帝政風的黑漆體）
}

export type CornerOrnament = 'cartouche' | 'shell' | 'rosette' | 'scroll' | 'none'
export type CenterOrnament = 'palmette' | 'shell' | 'none'

export interface FrameSpec {
  bands: Band[]
  corner: CornerOrnament
  center: CenterOrnament
  /** 角飾的大小（相對於框總寬） */
  cornerScale?: number
}

export function specWidth(spec: FrameSpec) {
  return spec.bands.reduce((sum, b) => sum + b.w, 0)
}

// ─── 顏色 ────────────────────────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', '').padEnd(6, '0').slice(0, 6), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function rgbToHex(c: [number, number, number]) {
  return `#${c.map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')}`
}

const HIGHLIGHT: [number, number, number] = [255, 248, 222]   // 暖白高光
const SHADOW: [number, number, number] = [38, 24, 4]          // 深褐陰影

/** t>0 往暖白提亮，t<0 往深褐壓暗 */
export function shade(hex: string, t: number) {
  const c = hexToRgb(hex)
  const target = t >= 0 ? HIGHLIGHT : SHADOW
  const k = Math.min(1, Math.abs(t))
  return rgbToHex([mix(c[0], target[0], k), mix(c[1], target[1], k), mix(c[2], target[2], k)])
}

// ─── 幾何工具 ────────────────────────────────────────────────────────────

type Side = 0 | 1 | 2 | 3   // top, right, bottom, left

/** 各邊的受光：上最亮、左次之、右偏暗、下最暗 */
const SIDE_LIGHT: Record<Side, number> = { 0: 0.22, 1: -0.1, 2: -0.28, 3: 0.06 }

interface Local {
  ctx: CanvasRenderingContext2D
  unit: number
  /** 世界座標的光影偏移換到目前旋轉座標系 */
  offset: (dx: number, dy: number) => [number, number]
}

function localOffset(angle: number) {
  const c = Math.cos(-angle), s = Math.sin(-angle)
  return (dx: number, dy: number): [number, number] => [dx * c - dy * s, dx * s + dy * c]
}

/**
 * 浮雕三次描繪：暗影往右下、亮邊往左上、最後本體。
 * build 只負責建路徑（內含 beginPath）。
 */
function relief(L: Local, build: () => void, fill: string | CanvasGradient, dark: string, light: string, depth = 1) {
  const { ctx, unit } = L
  const d = depth * 1.3 * unit
  const [sx, sy] = L.offset(d, d)
  const [lx, ly] = L.offset(-d * 0.8, -d * 0.8)
  ctx.save()
  ctx.translate(sx, sy); ctx.fillStyle = dark; build(); ctx.fill()
  ctx.restore()
  ctx.save()
  ctx.translate(lx, ly); ctx.fillStyle = light; build(); ctx.fill()
  ctx.restore()
  ctx.fillStyle = fill; build(); ctx.fill()
}

/** 剖面光影：回傳沿 band 深度 (0=外緣, 1=內緣) 的明暗曲線取樣點 */
function profileStops(motif: Motif): [number, number][] {
  switch (motif) {
    case 'cove': return [[0, -0.32], [0.5, -0.05], [1, 0.34]]
    case 'torus': return [[0, -0.4], [0.3, 0.42], [0.55, 0.05], [1, -0.45]]
    case 'ogee': return [[0, -0.2], [0.25, 0.38], [0.55, -0.05], [0.8, -0.35], [1, 0.1]]
    case 'reed': case 'rope': case 'ribbon': case 'laurel': case 'leaf': case 'eggdart': case 'bead':
      return [[0, -0.25], [0.5, 0.05], [1, -0.3]]
    default: return [[0, 0.08], [1, -0.08]]
  }
}

// ─── 沿邊雕花 ────────────────────────────────────────────────────────────

/** 在局部座標系內畫一段 band 的雕花：x 沿邊，y 為深度 0..w，長度 len */
function paintMotif(L: Local, motif: Motif, len: number, w: number, base: string, sideLight: number) {
  const { ctx } = L
  const lit = (t: number) => shade(base, t + sideLight)
  const dark = lit(-0.75), light = lit(0.7)
  const pattern = (step: number, draw: (x: number) => void) => {
    const n = Math.max(1, Math.floor((len - w * 2) / step))
    const start = (len - n * step) / 2 + step / 2
    for (let i = 0; i < n; i++) draw(start + i * step)
  }

  switch (motif) {
    case 'bead': {
      const r = w * 0.4
      pattern(r * 2.35, x => {
        const g = ctx.createRadialGradient(x - r * 0.35, w / 2 - r * 0.35, r * 0.1, x, w / 2, r)
        g.addColorStop(0, lit(0.85)); g.addColorStop(0.5, lit(0.1)); g.addColorStop(1, lit(-0.6))
        relief(L, () => { ctx.beginPath(); ctx.arc(x, w / 2, r, 0, Math.PI * 2) }, g, dark, light, 0.6)
      })
      break
    }
    case 'eggdart': {
      const step = w * 1.15
      pattern(step, x => {
        // 蛋
        const g = ctx.createRadialGradient(x - w * 0.1, w * 0.35, w * 0.05, x, w * 0.5, w * 0.45)
        g.addColorStop(0, lit(0.8)); g.addColorStop(0.55, lit(0.05)); g.addColorStop(1, lit(-0.55))
        relief(L, () => { ctx.beginPath(); ctx.ellipse(x, w * 0.5, w * 0.3, w * 0.4, 0, 0, Math.PI * 2) }, g, dark, light, 0.8)
        // 蛋殼外圈（凹槽）
        ctx.beginPath(); ctx.ellipse(x, w * 0.5, w * 0.36, w * 0.46, 0, 0, Math.PI * 2)
        ctx.strokeStyle = lit(-0.5); ctx.lineWidth = w * 0.05; ctx.stroke()
        // 鏢
        const dx = x + step / 2
        relief(L, () => {
          ctx.beginPath()
          ctx.moveTo(dx, w * 0.1); ctx.lineTo(dx + w * 0.09, w * 0.5); ctx.lineTo(dx, w * 0.92); ctx.lineTo(dx - w * 0.09, w * 0.5); ctx.closePath()
        }, lit(0.35), dark, light, 0.6)
      })
      break
    }
    case 'leaf': {
      // 連續莨苕葉：每片葉子往前傾，葉緣有三個裂片，中肋一道亮線
      const step = w * 1.5
      pattern(step, x => {
        const leaf = () => {
          ctx.beginPath()
          ctx.moveTo(x - step * 0.45, w * 0.92)
          ctx.bezierCurveTo(x - step * 0.4, w * 0.55, x - step * 0.2, w * 0.25, x + step * 0.05, w * 0.12)
          ctx.quadraticCurveTo(x, w * 0.3, x + step * 0.12, w * 0.3)      // 裂片 1 凹口
          ctx.bezierCurveTo(x + step * 0.25, w * 0.1, x + step * 0.4, w * 0.08, x + step * 0.55, w * 0.1)
          ctx.quadraticCurveTo(x + step * 0.35, w * 0.35, x + step * 0.42, w * 0.45)  // 裂片 2 凹口
          ctx.bezierCurveTo(x + step * 0.5, w * 0.5, x + step * 0.52, w * 0.7, x + step * 0.4, w * 0.92)
          ctx.closePath()
        }
        const g = ctx.createLinearGradient(x - step * 0.4, w * 0.9, x + step * 0.4, w * 0.15)
        g.addColorStop(0, lit(-0.35)); g.addColorStop(0.5, lit(0.3)); g.addColorStop(1, lit(0.65))
        relief(L, leaf, g, dark, light, 1)
        // 中肋與葉脈
        ctx.strokeStyle = lit(-0.6); ctx.lineWidth = w * 0.035
        ctx.beginPath(); ctx.moveTo(x - step * 0.4, w * 0.9); ctx.quadraticCurveTo(x + step * 0.05, w * 0.5, x + step * 0.5, w * 0.14); ctx.stroke()
        ctx.strokeStyle = lit(0.75); ctx.lineWidth = w * 0.025
        ctx.beginPath(); ctx.moveTo(x - step * 0.38, w * 0.86); ctx.quadraticCurveTo(x + step * 0.06, w * 0.46, x + step * 0.5, w * 0.12); ctx.stroke()
        ctx.strokeStyle = lit(-0.45); ctx.lineWidth = w * 0.02
        ctx.beginPath(); ctx.moveTo(x - step * 0.1, w * 0.6); ctx.quadraticCurveTo(x + step * 0.05, w * 0.4, x + step * 0.1, w * 0.3); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(x + step * 0.15, w * 0.55); ctx.quadraticCurveTo(x + step * 0.3, w * 0.45, x + step * 0.42, w * 0.46); ctx.stroke()
      })
      break
    }
    case 'reed': {
      // 蘆葦紋：一根根凸起的圓桿並排
      const step = w * 0.5
      pattern(step, x => {
        const g = ctx.createLinearGradient(x - step * 0.4, 0, x + step * 0.4, 0)
        g.addColorStop(0, lit(-0.55)); g.addColorStop(0.35, lit(0.6)); g.addColorStop(0.7, lit(0)); g.addColorStop(1, lit(-0.6))
        ctx.fillStyle = g
        ctx.fillRect(x - step * 0.4, 0, step * 0.8, w)
      })
      break
    }
    case 'rope': {
      // 繩紋：斜向的股，一股接一股
      const step = w * 0.72
      pattern(step, x => {
        const g = ctx.createLinearGradient(x - w * 0.3, w * 0.2, x + w * 0.3, w * 0.8)
        g.addColorStop(0, lit(-0.5)); g.addColorStop(0.45, lit(0.65)); g.addColorStop(1, lit(-0.55))
        relief(L, () => {
          ctx.beginPath()
          ctx.ellipse(x, w / 2, w * 0.62, w * 0.3, -Math.PI / 3.4, 0, Math.PI * 2)
        }, g, dark, light, 0.5)
      })
      break
    }
    case 'ribbon': {
      // 緞帶纏桿：桿子（凸面）上斜繞的帶子
      const step = w * 1.6
      pattern(step, x => {
        const g = ctx.createLinearGradient(x, 0, x + w * 0.5, w)
        g.addColorStop(0, lit(0.55)); g.addColorStop(0.5, lit(0.1)); g.addColorStop(1, lit(-0.4))
        relief(L, () => {
          ctx.beginPath()
          ctx.moveTo(x, 0); ctx.lineTo(x + w * 0.42, 0); ctx.lineTo(x + w * 0.42 + w * 0.7, w); ctx.lineTo(x + w * 0.7, w); ctx.closePath()
        }, g, dark, light, 0.9)
      })
      break
    }
    case 'laurel': {
      // 月桂：成對的葉子沿莖排列
      const step = w * 0.62
      ctx.strokeStyle = lit(-0.5); ctx.lineWidth = w * 0.06
      ctx.beginPath(); ctx.moveTo(w, w / 2); ctx.lineTo(len - w, w / 2); ctx.stroke()
      pattern(step, x => {
        for (const dir of [-1, 1]) {
          const cy = w / 2 + dir * w * 0.24
          const g = ctx.createLinearGradient(x - w * 0.3, cy, x + w * 0.3, cy)
          g.addColorStop(0, lit(-0.3)); g.addColorStop(0.5, lit(0.55)); g.addColorStop(1, lit(-0.2))
          relief(L, () => {
            ctx.beginPath()
            ctx.ellipse(x, cy, w * 0.38, w * 0.17, dir * -0.55, 0, Math.PI * 2)
          }, g, dark, light, 0.5)
          ctx.strokeStyle = lit(-0.55); ctx.lineWidth = w * 0.025
          ctx.beginPath(); ctx.moveTo(x - w * 0.3, cy + dir * w * 0.14); ctx.lineTo(x + w * 0.3, cy - dir * w * 0.14); ctx.stroke()
        }
      })
      break
    }
    default:
      break
  }
}

/** 畫一層 band 的四邊（含斜切接角、剖面光影與雕花） */
function paintBand(ctx: CanvasRenderingContext2D, outer: Rect, band: Band, base: string, unit: number) {
  const w = band.w * unit
  const color = band.color ?? base
  const sides: { side: Side; x: number; y: number; angle: number; len: number }[] = [
    { side: 0, x: outer.x, y: outer.y, angle: 0, len: outer.w },
    { side: 1, x: outer.x + outer.w, y: outer.y, angle: Math.PI / 2, len: outer.h },
    { side: 2, x: outer.x + outer.w, y: outer.y + outer.h, angle: Math.PI, len: outer.w },
    { side: 3, x: outer.x, y: outer.y + outer.h, angle: -Math.PI / 2, len: outer.h },
  ]
  for (const s of sides) {
    ctx.save()
    ctx.translate(s.x, s.y)
    ctx.rotate(s.angle)
    // 斜切梯形：外緣全長，內緣兩端各縮 w
    ctx.beginPath()
    ctx.moveTo(0, 0); ctx.lineTo(s.len, 0); ctx.lineTo(s.len - w, w); ctx.lineTo(w, w); ctx.closePath()
    ctx.clip()

    const sideLight = SIDE_LIGHT[s.side] + (band.tone ?? 0)
    const g = ctx.createLinearGradient(0, 0, 0, w)
    for (const [pos, t] of profileStops(band.motif)) g.addColorStop(pos, shade(color, t + sideLight))
    ctx.fillStyle = g
    ctx.fillRect(-w, -1, s.len + w * 2, w + 2)

    const L: Local = { ctx, unit, offset: localOffset(s.angle) }
    paintMotif(L, band.motif, s.len, w, color, sideLight)
    ctx.restore()
  }
}

// ─── 角飾與中飾 ──────────────────────────────────────────────────────────

/** 渦卷：從 (0,0) 往外捲的螺線，用連續圓弧近似 */
function scrollPath(ctx: CanvasRenderingContext2D, r: number, turns = 2.2, dir = 1) {
  ctx.beginPath()
  let radius = r
  let a = 0
  ctx.moveTo(radius, 0)
  const step = Math.PI / 10
  for (let i = 0; a < Math.PI * 2 * turns; i++) {
    a += step
    radius *= 0.93
    ctx.lineTo(Math.cos(a * dir) * radius, Math.sin(a * dir) * radius)
  }
}

function strokeRelief(L: Local, build: () => void, width: number, color: string, dark: string, light: string) {
  const { ctx, unit } = L
  const d = 1.2 * unit
  const [sx, sy] = L.offset(d, d)
  const [lx, ly] = L.offset(-d * 0.8, -d * 0.8)
  ctx.lineCap = 'round'; ctx.lineJoin = 'round'
  ctx.save(); ctx.translate(sx, sy); ctx.strokeStyle = dark; ctx.lineWidth = width; build(); ctx.stroke(); ctx.restore()
  ctx.save(); ctx.translate(lx, ly); ctx.strokeStyle = light; ctx.lineWidth = width; build(); ctx.stroke(); ctx.restore()
  ctx.strokeStyle = color; ctx.lineWidth = width; build(); ctx.stroke()
}

/** 單片葉：從原點往 +x 伸出的尖葉，帶中肋 */
function leafAt(L: Local, x: number, y: number, len: number, wid: number, angle: number, base: string, lightT: number) {
  const { ctx } = L
  ctx.save()
  ctx.translate(x, y); ctx.rotate(angle)
  const lit = (t: number) => shade(base, t + lightT)
  const g = ctx.createLinearGradient(0, -wid, 0, wid)
  g.addColorStop(0, lit(0.6)); g.addColorStop(0.5, lit(0.05)); g.addColorStop(1, lit(-0.5))
  const build = () => {
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.bezierCurveTo(len * 0.25, -wid, len * 0.7, -wid * 0.9, len, 0)
    ctx.bezierCurveTo(len * 0.7, wid * 0.9, len * 0.25, wid, 0, 0)
    ctx.closePath()
  }
  const local: Local = { ...L, offset: (dx, dy) => { const [a, b] = L.offset(dx, dy); const c = Math.cos(-angle), s = Math.sin(-angle); return [a * c - b * s, a * s + b * c] } }
  relief(local, build, g, lit(-0.75), lit(0.7), 0.8)
  ctx.strokeStyle = lit(-0.6); ctx.lineWidth = Math.max(0.6, wid * 0.08)
  ctx.beginPath(); ctx.moveTo(len * 0.05, 0); ctx.lineTo(len * 0.92, 0); ctx.stroke()
  ctx.strokeStyle = lit(0.7); ctx.lineWidth = Math.max(0.5, wid * 0.05)
  ctx.beginPath(); ctx.moveTo(len * 0.05, -wid * 0.06); ctx.lineTo(len * 0.9, -wid * 0.04); ctx.stroke()
  ctx.restore()
}

function rosette(L: Local, cx: number, cy: number, r: number, base: string, lightT: number, petals = 8) {
  const { ctx } = L
  const lit = (t: number) => shade(base, t + lightT)
  for (let layer = 0; layer < 2; layer++) {
    const rr = r * (layer === 0 ? 1 : 0.62)
    const off = layer === 0 ? 0 : Math.PI / petals
    for (let i = 0; i < petals; i++) {
      const a = off + (i / petals) * Math.PI * 2
      leafAt(L, cx + Math.cos(a) * rr * 0.15, cy + Math.sin(a) * rr * 0.15, rr * 0.85, rr * 0.3, a, base, lightT + layer * 0.1)
    }
  }
  const g = ctx.createRadialGradient(cx - r * 0.1, cy - r * 0.1, 0, cx, cy, r * 0.3)
  g.addColorStop(0, lit(0.85)); g.addColorStop(0.6, lit(0.1)); g.addColorStop(1, lit(-0.6))
  relief(L, () => { ctx.beginPath(); ctx.arc(cx, cy, r * 0.28, 0, Math.PI * 2) }, g, lit(-0.75), lit(0.7), 0.8)
}

function shell(L: Local, cx: number, cy: number, r: number, base: string, lightT: number, ridges = 9, spread = Math.PI * 0.95, facing = -Math.PI / 4) {
  const { ctx } = L
  const lit = (t: number) => shade(base, t + lightT)
  // 扇形底
  const g0 = ctx.createRadialGradient(cx, cy, r * 0.1, cx, cy, r)
  g0.addColorStop(0, lit(-0.3)); g0.addColorStop(1, lit(0.2))
  relief(L, () => {
    ctx.beginPath(); ctx.moveTo(cx, cy)
    ctx.arc(cx, cy, r, facing - spread / 2, facing + spread / 2); ctx.closePath()
  }, g0, lit(-0.75), lit(0.7), 1.2)
  // 放射的稜
  for (let i = 0; i < ridges; i++) {
    const a0 = facing - spread / 2 + (i / ridges) * spread
    const a1 = a0 + spread / ridges
    const am = (a0 + a1) / 2
    const g = ctx.createLinearGradient(cx + Math.cos(a0) * r, cy + Math.sin(a0) * r, cx + Math.cos(a1) * r, cy + Math.sin(a1) * r)
    g.addColorStop(0, lit(-0.5)); g.addColorStop(0.45, lit(0.55)); g.addColorStop(1, lit(-0.45))
    ctx.fillStyle = g
    ctx.beginPath(); ctx.moveTo(cx, cy)
    ctx.lineTo(cx + Math.cos(a0) * r * 0.98, cy + Math.sin(a0) * r * 0.98)
    ctx.arc(cx, cy, r * 1.02, a0, a1)
    ctx.lineTo(cx + Math.cos(am) * r * 1.06, cy + Math.sin(am) * r * 1.06)
    ctx.closePath(); ctx.fill()
  }
  // 扇根的小珠
  const gb = ctx.createRadialGradient(cx - r * 0.05, cy - r * 0.05, 0, cx, cy, r * 0.18)
  gb.addColorStop(0, lit(0.8)); gb.addColorStop(1, lit(-0.5))
  relief(L, () => { ctx.beginPath(); ctx.arc(cx, cy, r * 0.16, 0, Math.PI * 2) }, gb, lit(-0.75), lit(0.7), 0.6)
}

/** 角飾：在框的四個角（局部座標：原點在外角，x 向右、y 向下，框往 +x +y 延伸） */
function paintCorner(ctx: CanvasRenderingContext2D, outer: Rect, kind: CornerOrnament, fw: number, base: string, unit: number, scale: number) {
  if (kind === 'none') return
  const corners: { x: number; y: number; angle: number; light: number }[] = [
    { x: outer.x, y: outer.y, angle: 0, light: 0.18 },
    { x: outer.x + outer.w, y: outer.y, angle: Math.PI / 2, light: 0.02 },
    { x: outer.x + outer.w, y: outer.y + outer.h, angle: Math.PI, light: -0.2 },
    { x: outer.x, y: outer.y + outer.h, angle: -Math.PI / 2, light: -0.02 },
  ]
  for (const c of corners) {
    ctx.save()
    ctx.translate(c.x, c.y); ctx.rotate(c.angle)
    const L: Local = { ctx, unit, offset: localOffset(c.angle) }
    const lit = (t: number) => shade(base, t + c.light)
    const dark = lit(-0.75), light = lit(0.7)
    const s = fw * scale
    const cx = fw * 0.5, cy = fw * 0.5   // 角飾中心：斜切線上

    switch (kind) {
      case 'rosette':
        rosette(L, cx, cy, s * 0.42, base, c.light)
        break
      case 'shell':
        shell(L, cx * 0.9, cy * 0.9, s * 0.62, base, c.light, 11, Math.PI * 0.9, Math.PI / 4)
        leafAt(L, cx * 1.15, cy * 0.35, s * 0.75, s * 0.14, 0.05, base, c.light)
        leafAt(L, cx * 0.35, cy * 1.15, s * 0.75, s * 0.14, Math.PI / 2 - 0.05, base, c.light)
        break
      case 'scroll': {
        // 洛可可 C 形渦卷：兩道相對的渦卷，尾端帶小葉
        const r = s * 0.5
        for (const [ox, oy, dir, rot] of [[cx * 1.6, cy * 0.55, 1, -0.5], [cx * 0.55, cy * 1.6, -1, Math.PI / 2 + 0.5]] as [number, number, number, number][]) {
          ctx.save(); ctx.translate(ox, oy); ctx.rotate(rot)
          const Lr: Local = { ctx, unit, offset: localOffset(c.angle + rot) }
          strokeRelief(Lr, () => scrollPath(ctx, r, 2.1, dir), Math.max(1, s * 0.11), lit(0.25), dark, light)
          ctx.restore()
        }
        leafAt(L, cx * 0.9, cy * 0.9, s * 1.0, s * 0.22, Math.PI / 4, base, c.light)
        leafAt(L, cx * 0.7, cy * 0.7, s * 0.6, s * 0.14, Math.PI / 4 + 0.6, base, c.light)
        leafAt(L, cx * 0.7, cy * 0.7, s * 0.6, s * 0.14, Math.PI / 4 - 0.6, base, c.light)
        leafAt(L, cx * 0.85, cy * 0.85, s * 0.55, s * 0.14, Math.PI + Math.PI / 4, base, c.light)
        break
      }
      case 'cartouche': {
        // 凡爾賽風角飾：中央玫瑰花結，兩側沿邊各一組渦卷＋莨苕葉扇，斜角一片大葉往外角伸
        // 沿邊的葉扇
        for (let i = 0; i < 3; i++) {
          const a = -0.32 + i * 0.3
          leafAt(L, cx * 1.05, cy * 0.7, s * (0.78 - i * 0.1), s * 0.19, a, base, c.light + 0.05)
          leafAt(L, cx * 0.7, cy * 1.05, s * (0.78 - i * 0.1), s * 0.19, Math.PI / 2 - a, base, c.light + 0.05)
        }
        // 兩道渦卷
        const r = s * 0.28
        for (const [ox, oy, dir, rot] of [[cx * 1.7, cy * 0.5, 1, 0.3], [cx * 0.5, cy * 1.7, -1, Math.PI / 2 - 0.3]] as [number, number, number, number][]) {
          ctx.save(); ctx.translate(ox, oy); ctx.rotate(rot)
          const Lr: Local = { ctx, unit, offset: localOffset(c.angle + rot) }
          strokeRelief(Lr, () => scrollPath(ctx, r, 1.8, dir), Math.max(1, s * 0.08), lit(0.3), dark, light)
          ctx.restore()
        }
        // 往外角伸的大葉與兩側小葉
        leafAt(L, cx * 0.95, cy * 0.95, s * 0.9, s * 0.26, Math.PI + Math.PI / 4, base, c.light)
        leafAt(L, cx * 0.8, cy * 0.8, s * 0.6, s * 0.18, Math.PI + Math.PI / 4 + 0.6, base, c.light)
        leafAt(L, cx * 0.8, cy * 0.8, s * 0.6, s * 0.18, Math.PI + Math.PI / 4 - 0.6, base, c.light)
        // 中央玫瑰花結
        rosette(L, cx, cy, s * 0.36, base, c.light, 10)
        break
      }
      default:
        break
    }
    ctx.restore()
  }
}

/** 中飾：四邊中點 */
function paintCenter(ctx: CanvasRenderingContext2D, outer: Rect, kind: CenterOrnament, fw: number, base: string, unit: number) {
  if (kind === 'none') return
  const mids: { x: number; y: number; angle: number; light: number }[] = [
    { x: outer.x + outer.w / 2, y: outer.y, angle: 0, light: 0.2 },
    { x: outer.x + outer.w, y: outer.y + outer.h / 2, angle: Math.PI / 2, light: -0.08 },
    { x: outer.x + outer.w / 2, y: outer.y + outer.h, angle: Math.PI, light: -0.25 },
    { x: outer.x, y: outer.y + outer.h / 2, angle: -Math.PI / 2, light: 0.05 },
  ]
  for (const m of mids) {
    ctx.save()
    ctx.translate(m.x, m.y); ctx.rotate(m.angle)
    const L: Local = { ctx, unit, offset: localOffset(m.angle) }
    const s = fw
    if (kind === 'shell') {
      shell(L, 0, s * 0.62, s * 0.5, base, m.light, 9, Math.PI * 0.85, -Math.PI / 2)
    } else {
      // 棕葉飾：從基部珠往外扇開的葉片
      const n = 7
      for (let i = 0; i < n; i++) {
        const a = -Math.PI / 2 + (i - (n - 1) / 2) * 0.28
        const len = s * (0.62 - Math.abs(i - (n - 1) / 2) * 0.07)
        leafAt(L, 0, s * 0.72, len, s * 0.09, a, base, m.light)
      }
      const lit = (t: number) => shade(base, t + m.light)
      const g = ctx.createRadialGradient(-s * 0.03, s * 0.68, 0, 0, s * 0.72, s * 0.12)
      g.addColorStop(0, lit(0.85)); g.addColorStop(1, lit(-0.55))
      relief(L, () => { ctx.beginPath(); ctx.arc(0, s * 0.72, s * 0.11, 0, Math.PI * 2) }, g, lit(-0.75), lit(0.7), 0.7)
    }
    ctx.restore()
  }
}

// ─── 對外 ────────────────────────────────────────────────────────────────

/**
 * 畫整個浮雕框。rect 是畫作矩形，框往外長。
 * 呼叫端已 save/restore，這裡只管畫。
 */
export function paintOrnateFrame(ctx: CanvasRenderingContext2D, spec: FrameSpec, base: string, rect: Rect) {
  const unit = ctx.canvas.width / OUTPUT_W
  const fw = specWidth(spec) * unit
  const outer: Rect = { x: rect.x - fw, y: rect.y - fw, w: rect.w + fw * 2, h: rect.h + fw * 2 }

  // 整個框投在背景上的陰影
  ctx.save()
  ctx.shadowColor = 'rgba(0,0,0,0.55)'
  ctx.shadowBlur = 46 * unit
  ctx.shadowOffsetY = 16 * unit
  ctx.fillStyle = shade(base, -0.6)
  ctx.fillRect(outer.x, outer.y, outer.w, outer.h)
  ctx.restore()

  let cur = outer
  for (const band of spec.bands) {
    paintBand(ctx, cur, band, base, unit)
    const w = band.w * unit
    cur = { x: cur.x + w, y: cur.y + w, w: cur.w - w * 2, h: cur.h - w * 2 }
  }

  // 金屬光澤：整個框環帶一道斜向的亮→暗掃光，讓鍍金有反光感
  ctx.save()
  ctx.beginPath()
  ctx.rect(outer.x, outer.y, outer.w, outer.h)
  ctx.rect(rect.x, rect.y, rect.w, rect.h)
  ctx.clip('evenodd')
  const sheen = ctx.createLinearGradient(outer.x, outer.y, outer.x + outer.w, outer.y + outer.h)
  sheen.addColorStop(0, 'rgba(255,250,230,0.22)')
  sheen.addColorStop(0.35, 'rgba(255,250,230,0)')
  sheen.addColorStop(0.6, 'rgba(0,0,0,0)')
  sheen.addColorStop(1, 'rgba(40,20,0,0.28)')
  ctx.fillStyle = sheen
  ctx.fillRect(outer.x, outer.y, outer.w, outer.h)
  ctx.restore()

  paintCenter(ctx, outer, spec.center, fw, base, unit)
  paintCorner(ctx, outer, spec.corner, fw, base, unit, spec.cornerScale ?? 1)
}

/** 各種美術館框的規格（寬度以 1080 為單位） */
export const ORNATE_SPECS: Record<string, FrameSpec> = {
  // 凡爾賽：路易十四風，最華麗——珠鍊、S 形線腳、連續莨苕葉、蘆葦紋、蛋鏢，角飾為渦卷葉扇花結
  versailles: {
    bands: [
      { w: 6, motif: 'bead' },
      { w: 3, motif: 'flat', tone: -0.2 },
      { w: 12, motif: 'ogee' },
      { w: 26, motif: 'leaf' },
      { w: 3, motif: 'flat', tone: -0.3 },
      { w: 10, motif: 'reed' },
      { w: 8, motif: 'cove' },
      { w: 14, motif: 'eggdart' },
      { w: 3, motif: 'flat', tone: -0.25 },
      { w: 6, motif: 'bead' },
      { w: 4, motif: 'flat', tone: 0.1 },
    ],
    corner: 'cartouche', center: 'palmette', cornerScale: 1.15,
  },
  // 巴洛克：厚重的大圓凸面、繩紋、莨苕葉，角飾為貝殼
  baroque: {
    bands: [
      { w: 4, motif: 'flat', tone: -0.2 },
      { w: 22, motif: 'torus' },
      { w: 12, motif: 'rope' },
      { w: 6, motif: 'cove' },
      { w: 28, motif: 'leaf' },
      { w: 4, motif: 'flat', tone: -0.3 },
      { w: 7, motif: 'bead' },
      { w: 4, motif: 'flat', tone: 0.1 },
    ],
    corner: 'shell', center: 'shell', cornerScale: 1.05,
  },
  // 洛可可：輕盈——緞帶纏桿、月桂，角飾為 C 形渦卷
  rococo: {
    bands: [
      { w: 5, motif: 'flat', tone: -0.15 },
      { w: 10, motif: 'cove' },
      { w: 14, motif: 'ribbon' },
      { w: 4, motif: 'flat', tone: -0.3 },
      { w: 18, motif: 'laurel' },
      { w: 8, motif: 'cove' },
      { w: 5, motif: 'bead' },
      { w: 4, motif: 'flat', tone: 0.1 },
    ],
    corner: 'scroll', center: 'none', cornerScale: 1.35,
  },
  // 新古典：克制——蘆葦紋主體、蛋鏢、珠鍊，角飾為玫瑰花結
  neoclassic: {
    bands: [
      { w: 5, motif: 'flat', tone: -0.1 },
      { w: 22, motif: 'reed' },
      { w: 4, motif: 'flat', tone: -0.3 },
      { w: 13, motif: 'eggdart' },
      { w: 3, motif: 'flat', tone: -0.25 },
      { w: 6, motif: 'bead' },
      { w: 4, motif: 'flat', tone: 0.1 },
    ],
    corner: 'rosette', center: 'none', cornerScale: 0.95,
  },
  // 帝政：黑漆體配鍍金月桂與珠鍊
  empire: {
    bands: [
      { w: 5, motif: 'flat' },
      { w: 3, motif: 'flat', tone: -0.3 },
      { w: 34, motif: 'ogee', color: '#151210' },
      { w: 12, motif: 'laurel' },
      { w: 3, motif: 'flat', color: '#151210' },
      { w: 6, motif: 'bead' },
      { w: 4, motif: 'flat', tone: 0.1 },
    ],
    corner: 'rosette', center: 'palmette', cornerScale: 0.8,
  },
  // 簡約金框：只有線腳光影，沒有雕花
  museum: {
    bands: [
      { w: 4, motif: 'flat', tone: -0.2 },
      { w: 24, motif: 'torus' },
      { w: 4, motif: 'flat', tone: -0.3 },
      { w: 12, motif: 'cove' },
      { w: 3, motif: 'flat', tone: -0.25 },
      { w: 7, motif: 'bead' },
      { w: 4, motif: 'flat', tone: 0.1 },
    ],
    corner: 'none', center: 'none',
  },
}
