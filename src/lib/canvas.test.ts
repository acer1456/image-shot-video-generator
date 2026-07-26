// 跑法：npm test
// ponytail: assert-based self-check，用 node 內建 test runner，不裝測試框架
//
// layersFor 是純函式，所以整份測試不需要瀏覽器、不需要 canvas、不需要假的 ctx——
// 只要注入一個確定性的 measure。見 CONTEXT.md 的 Layer / Measure。
import assert from 'node:assert'
import { layersFor, subtitleLayout, type FrameState, type Layer, type Target } from './canvas'
import type { CaptionData, ImageOverlay, MosaicStroke } from '@/types'

// 每個字元固定 10px，跟字型無關 → 換行結果可預期
const measure: Target['measure'] = (text) => text.length * 10

const target: Target = { width: 1080, height: 1920, measure }

function caption(over: Partial<CaptionData> = {}): CaptionData {
  return {
    text: '', subtitle: '', x: 0.5, y: 0.8, scale: 1, subtitleScale: 1,
    fontFamily: '', subtitleFontFamily: '', boxScaleX: 1, boxScaleY: 1,
    textColor: '#fff', subTextColor: '#fff',
    strokeEnabled: false, strokeColor: '#000', strokeWidth: 4,
    shadowColor: '#000', shadowAlpha: 0.48, shadowBoxVisible: true,
    textShadowEnabled: true, textShadowBlur: 10, textShadowOpacity: 0.7,
    ...over,
  }
}

function overlay(over: Partial<ImageOverlay> = {}): ImageOverlay {
  return {
    id: 'o1', name: 'o', dataUrl: 'data:image/png;base64,x',
    x: 0.5, y: 0.5, scale: 0.4, opacity: 1, startTime: 0, duration: 10,
    ...over,
  }
}

// 筆刷點是 0–1 正規化座標（mosaic.ts 繪製時才乘上原圖尺寸）
const stroke: MosaicStroke = { id: 's1', brushSize: 40, points: [{ x: 0.25, y: 0.3 }] }

function state(over: Partial<FrameState> = {}): FrameState {
  return {
    // 4000×3000 的來源圖，source 在排版階段完全用不到
    image: { width: 4000, height: 3000, source: null as never },
    background: { mode: 'color', color: '#000000', blur: 0 },
    camera: { cx: 2000, cy: 1500, zoom: 1 },
    captions: [],
    overlays: [],
    mosaic: [],
    subtitle: null,
    ...over,
  }
}

const kinds = (layers: Layer[]) => layers.map(l => l.kind)

// 幾何是浮點運算，比對到 1e-6 就夠
function assertRect(actual: { x: number; y: number; w: number; h: number }, expected: typeof actual, msg?: string) {
  for (const k of ['x', 'y', 'w', 'h'] as const) {
    assert.ok(Math.abs(actual[k] - expected[k]) < 1e-6, `${msg ?? 'rect'}.${k}: ${actual[k]} !== ${expected[k]}`)
  }
}

// 1. 繪製順序：背景 → 影像 → 疊加圖 → 字幕 → 旁白字幕
{
  const layers = layersFor(state({
    captions: [caption({ text: 'A' }), caption({ text: 'B' })],
    overlays: [overlay()],
    subtitle: { text: 'hello' },
  }), target)
  assert.deepEqual(kinds(layers), ['background', 'image', 'overlay', 'caption', 'caption', 'subtitle'])
}

// 2. 相機取景：4:3 的寬圖放進 9:16 輸出，zoom=1 時整張圖都看得到，上下留背景
{
  const [, image] = layersFor(state(), target)
  assert.equal(image.kind, 'image')
  if (image.kind !== 'image') throw new Error('unreachable')
  // baseW = 4000（滿寬），baseH = 4000 / (1080/1920) = 7111.11 → 比圖還高，所以上下夾住
  assertRect(image.src, { x: 0, y: 0, w: 4000, h: 3000 }, 'zoom=1 應取用整張圖')
  assertRect(image.dest, { x: 0, y: 555, w: 1080, h: 810 })
  assert.ok(Math.abs((image.dest.y + image.dest.h) - (1920 - 555)) < 1e-6, '上下留白要對稱')
}

// 3. zoom 會縮小取景範圍：橫向開始裁切，縱向留白變少
{
  const [, image] = layersFor(state({ camera: { cx: 2000, cy: 1500, zoom: 2 } }), target)
  if (image.kind !== 'image') throw new Error('expected image layer')
  assertRect(image.src, { x: 1000, y: 0, w: 2000, h: 3000 }, '橫向裁掉一半')
  assertRect(image.dest, { x: 0, y: 150, w: 1080, h: 1620 })
}

// 4. 取景超出圖片邊界時裁切，目標矩形跟著縮——不是拉伸
{
  const [, image] = layersFor(state({ camera: { cx: 100, cy: 1500, zoom: 1 } }), target)
  if (image.kind !== 'image') throw new Error('expected image layer')
  assert.equal(image.src.x, 0, '左邊界要夾住')
  assert.ok(image.dest.x > 0, '左側留白，不能把裁切後的影像拉滿')
  assert.ok(image.dest.w < 1080)
}

// 5. 馬賽克一定跟著 image layer 走。這是 ScreenDownload / 縮圖漏畫馬賽克的那一類 bug：
//    馬賽克不再是「可以忘記傳」的參數，而是 layer 上的資料。
{
  const [, withMosaic] = layersFor(state({ mosaic: [stroke] }), target)
  if (withMosaic.kind !== 'image') throw new Error('expected image layer')
  assert.deepEqual(withMosaic.mosaic, [stroke])

  const [, without] = layersFor(state(), target)
  if (without.kind !== 'image') throw new Error('expected image layer')
  assert.deepEqual(without.mosaic, [])
}

// 6. 疊加圖矩形：寬 = scale × 畫布寬，高比由注入的 overlayRatio 決定，以中心點定位
{
  const layers = layersFor(state({ overlays: [overlay({ x: 0.5, y: 0.25, scale: 0.5 })] }), {
    ...target,
    overlayRatio: () => 0.5,
  })
  const o = layers.find(l => l.kind === 'overlay')
  if (o?.kind !== 'overlay') throw new Error('expected overlay layer')
  assert.equal(o.rect.w, 540)
  assert.equal(o.rect.h, 270)
  assert.equal(o.rect.x, 1080 * 0.5 - 270)
  assert.equal(o.rect.y, 1920 * 0.25 - 135)
}

// 7. 沒有 chrome 就沒有輔助線。匯出路徑靠這一點，而不是靠記得傳 false。
{
  const layers = layersFor(state({
    captions: [caption({ text: 'A' })],
    overlays: [overlay()],
  }), target)
  for (const l of layers) {
    if (l.kind === 'caption') assert.equal(l.guides, false)
    if (l.kind === 'overlay') assert.equal(l.guides, false)
  }
}

// 8. 有 chrome 時，只有 active 的那一則字幕會拿到輔助線
{
  const layers = layersFor(state({
    captions: [caption({ text: 'A' }), caption({ text: 'B' }), caption({ text: 'C' })],
    chrome: {
      includeGuides: true, showCaptionBox: true, activeCaptionIndex: 1,
      snapGuide: { x: false, y: false }, overlayGuides: false,
    },
  }), target)
  const captions = layers.filter(l => l.kind === 'caption')
  assert.deepEqual(captions.map(c => c.kind === 'caption' && c.guides), [false, true, false])
}

// 9. 字幕排版走注入的 measure：每字 10px，可用寬度 1080×0.78 = 842.4 → 84 字一行
{
  // 注意：captionLayout 以 CaptionData 物件參照做快取，所以每個案例都用新物件
  const layers = layersFor(state({ captions: [caption({ text: 'x'.repeat(100) })] }), target)
  const c = layers.find(l => l.kind === 'caption')
  if (c?.kind !== 'caption') throw new Error('expected caption layer')
  assert.equal(c.layout.mainLines.length, 2, '100 字在 842.4px 內要斷成兩行')
  assert.equal(c.layout.mainLines[0].length, 84)
  assert.equal(c.layout.cx, 540)
  assert.equal(c.layout.cy, 1536)
}

// 10. 旁白字幕：主行 + 譯文行的位置，背景條預設關閉
{
  const layout = subtitleLayout(target, 'Hello\n你好', undefined)
  assert.equal(layout.lines.length, 2)
  assert.equal(layout.box, null, '背景條預設關閉')
  assert.equal(layout.lines[0].x, 540)
  assert.equal(layout.lines[1].x, 540)
  assert.ok(layout.lines[1].y > layout.lines[0].y, '譯文在主行下方')
  // fontSize = round(1080 × 0.055) = 59；譯文 = round(59 × 0.72) = 42
  assert.match(layout.lines[0].font, /^700 59px /)
  assert.match(layout.lines[1].font, /^650 42px /)
}

// 11. 開啟背景條時要算出方框，且不超過畫布 96%
{
  const layout = subtitleLayout(target, 'Hello', { backgroundEnabled: true } as never)
  assert.ok(layout.box, '背景條要存在')
  assert.ok(layout.box!.w <= 1080 * 0.96)
  assert.equal(layout.box!.x + layout.box!.w / 2, 540, '背景條要置中')
}

// 12. 空字串不產生任何行
{
  const layout = subtitleLayout(target, '   ', undefined)
  assert.deepEqual(layout.lines, [])
  assert.equal(layout.box, null)
}

// 13. 只在時間內的疊加圖會進 layer——不過過濾發生在呼叫端，
//     layersFor 收到什麼就畫什麼，這裡確認它不會自作主張丟掉
{
  const layers = layersFor(state({ overlays: [overlay({ id: 'a' }), overlay({ id: 'b' })] }), target)
  assert.equal(layers.filter(l => l.kind === 'overlay').length, 2)
}

console.log('canvas layers self-check passed')
