// 跑法：npm test
// ponytail: assert-based self-check，用 node 內建 test runner，不裝測試框架
//
// layersFor 是純函式，所以整份測試不需要瀏覽器、不需要 canvas、不需要假的 ctx——
// 只要注入一個確定性的 measure。見 CONTEXT.md 的 Layer / Measure。
import assert from 'node:assert'
import { drawChrome, frameStateAt, layersAt, layersFor, sceneDuration, subtitleLayout, timeOfPoint, type FrameState, type Layer, type Scene, type Target } from './canvas'
import type { CameraPoint, CaptionData, ImageOverlay, MosaicStroke, SubtitleCue, SubtitleStyle } from '@/types'

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
    pointIndex: 0,
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

// 記錄用的假 ctx：drawChrome 只做繪圖呼叫，不讀回任何東西，所以這樣就夠測。
function recordingCtx(width: number, height: number) {
  const calls: { name: string; args: unknown[] }[] = []
  const ctx = new Proxy({} as Record<string, unknown>, {
    get(_t, prop: string) {
      if (prop === 'canvas') return { width, height }
      if (prop === 'measureText') return (text: string) => ({ width: text.length * 10 })
      return (...args: unknown[]) => { calls.push({ name: prop, args }) }
    },
    set() { return true },
  }) as unknown as CanvasRenderingContext2D
  return { ctx, calls }
}

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

// 7. layer 上根本沒有輔助線資料——匯出畫不出 chrome 是型別層面的事實，
//    不是「記得傳 false」。
{
  const layers = layersFor(state({
    captions: [caption({ text: 'A' })],
    overlays: [overlay()],
  }), target)
  for (const l of layers) {
    assert.ok(!('guides' in l), `${l.kind} layer 不該帶輔助線旗標`)
    assert.ok(!('snapGuide' in l), `${l.kind} layer 不該帶吸附線`)
  }
}

// 8. drawChrome 只替 active 的那一則字幕畫框，而且用的是跟畫面同一組 layer，
//    所以框線位置不可能跟畫出來的字幕對不上。
{
  const s = scene({ points: [point({
    caption: caption({ text: 'A' }),
    extraCaptions: [caption({ text: 'B', y: 0.5 }), caption({ text: 'C', y: 0.3 })],
  }) ] })
  const t = timeOfPoint(s.points, 0)
  const layers = layersAt(s, t, target)
  const captions = layers.filter(l => l.kind === 'caption')
  assert.equal(captions.length, 3)

  const { ctx, calls } = recordingCtx(1080, 1920)
  drawChrome(s, t, ctx, { activeCaptionIndex: 1, captionBox: true, snapGuide: { x: false, y: false }, overlayGuides: false })

  const boxes = calls.filter(c => c.name === 'strokeRect')
  assert.equal(boxes.length, 1, '只有一個字幕框')
  const want = captions[1]
  if (want.kind !== 'caption') throw new Error('unreachable')
  assert.deepEqual(boxes[0].args, [want.layout.x, want.layout.y, want.layout.width, want.layout.height])

  // 沒開 captionBox 就什麼都不畫
  const off = recordingCtx(1080, 1920)
  drawChrome(s, t, off.ctx, { activeCaptionIndex: 1, captionBox: false, snapGuide: { x: false, y: false }, overlayGuides: false })
  assert.equal(off.calls.filter(c => c.name === 'strokeRect').length, 0)
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

// ─── Scene 層級：時間解析與長度 ─────────────────────────────────────────

function cue(over: Partial<SubtitleCue> = {}): SubtitleCue {
  return {
    id: 'c1', narrationId: 'n1', text: 'hello', translation: '',
    startTime: 0, duration: 2, style: {} as SubtitleStyle,
    wordStartIndex: 0, wordEndIndex: 1,
    ...over,
  }
}

function point(over: Partial<CameraPoint> = {}): CameraPoint {
  return { x: .5, y: .5, zoom: 1, move: 'slide', moveDuration: 1, holdDuration: 2, caption: caption(), ...over }
}

function scene(over: Partial<Scene> = {}): Scene {
  return {
    image: { width: 4000, height: 3000, source: null as never },
    background: { mode: 'color', color: '#000000', blur: 0 },
    points: [point()],
    cues: [],
    overlays: [],
    mosaic: [],
    showCameraCaptions: true,
    audioEnd: 0,
    ...over,
  }
}

// 14. 影片長度取四者最長：鏡頭路徑 / 旁白字幕 / 疊加圖 / 音訊
{
  // 一個 point：moveDuration 1 + holdDuration 2 = 3
  assert.equal(sceneDuration(scene()), 3, '只有鏡頭路徑')
  assert.equal(sceneDuration(scene({ cues: [cue({ startTime: 8, duration: 2 })] })), 10, '字幕比較長')
  assert.equal(sceneDuration(scene({ overlays: [overlay({ startTime: 20, duration: 5 })] })), 25, '疊加圖比較長')
  assert.equal(sceneDuration(scene({ audioEnd: 42 })), 42, '旁白音訊比較長')
  assert.equal(
    sceneDuration(scene({ cues: [cue({ startTime: 8, duration: 2 })], overlays: [overlay({ startTime: 1, duration: 1 })], audioEnd: 6 })),
    10,
    '取最長的那個',
  )
}

// 15. layersAt 解出時間：hold 區間內用該點的鏡頭與字幕
{
  const s = scene({ points: [point({ caption: caption({ text: 'first' }) }), point({ caption: caption({ text: 'second' }) })] })
  const at1 = layersAt(s, 1.5, target)   // 第一點的 hold
  const at5 = layersAt(s, 5, target)     // 第二點的 hold
  const textOf = (ls: Layer[]) => ls.filter(l => l.kind === 'caption').map(l => l.kind === 'caption' ? l.cap.text : '')
  assert.deepEqual(textOf(at1), ['first'])
  assert.deepEqual(textOf(at5), ['second'])
}

// 16. showCameraCaptions=false → 完全沒有 caption layer
{
  const s = scene({ points: [point({ caption: caption({ text: 'hidden me' }) })], showCameraCaptions: false })
  assert.equal(layersAt(s, 1.5, target).filter(l => l.kind === 'caption').length, 0)
}

// 17. 疊加圖依時間過濾
{
  const s = scene({ overlays: [overlay({ id: 'a', startTime: 0, duration: 1 }), overlay({ id: 'b', startTime: 5, duration: 5 })] })
  const idsAt = (t: number) => layersAt(s, t, target).flatMap(l => l.kind === 'overlay' ? [l.overlay.id] : [])
  assert.deepEqual(idsAt(0.5), ['a'])
  assert.deepEqual(idsAt(6), ['b'])
  assert.deepEqual(idsAt(3), [], '兩個都不在時間內')
}

// 18. 旁白字幕只在該 cue 的時間內出現，主文＋譯文以換行合併
{
  const s = scene({ cues: [cue({ startTime: 1, duration: 2, text: 'Hello', translation: '你好' })] })
  const subAt = (t: number) => layersAt(s, t, target).find(l => l.kind === 'subtitle')
  assert.equal(subAt(0.5), undefined, 'cue 還沒開始')
  assert.equal(subAt(3.5), undefined, 'cue 已結束')
  const shown = subAt(2)
  if (shown?.kind !== 'subtitle') throw new Error('expected subtitle layer')
  assert.equal(shown.layout.lines.length, 2, '主文與譯文各一行')
}

// 19. 沒有鏡頭點就沒有畫面——composeFrame 靠這個維持「不動畫布」的舊行為
{
  assert.deepEqual(layersAt(scene({ points: [] }), 0, target), [])
}

// 20. timeOfPoint：鏡頭抵達該點的瞬間
{
  const points = [
    point({ moveDuration: 1.2, holdDuration: 1.5 }),
    point({ moveDuration: .8, holdDuration: 2 }),
    point({ moveDuration: 1, holdDuration: 0 }),   // 沒有停留
  ]
  assert.equal(timeOfPoint(points, 0), 1.2)
  assert.equal(timeOfPoint(points, 1), 1.2 + 1.5 + .8)
  assert.equal(timeOfPoint(points, 2), 1.2 + 1.5 + .8 + 2 + 1, '沒有停留時是移動段的結尾')
  assert.equal(timeOfPoint(points, 99), 0, '超出範圍回 0')

  // 關鍵：在這個時間點解出來的鏡頭，必須就是該點自己的鏡頭，
  // 停留時間為 0 也一樣（用移動起點的話會拿到前一個點的取景）
  const s = scene({ points })
  for (let i = 0; i < points.length; i++) {
    const st = frameStateAt(s, timeOfPoint(points, i))
    assert.equal(st?.pointIndex, i, `point ${i} 應該解到自己`)
    assert.equal(st?.camera.zoom, points[i].zoom)
  }
}

// 21. 縮圖：拿掉字幕／旁白／疊加圖，但馬賽克必須留著。
//     舊的 drawPointThumbnail 只傳 17 個參數中的 9 個，馬賽克被預設值關掉了。
{
  const s = scene({
    points: [point({ caption: caption({ text: 'caption' }) })],
    cues: [cue({ startTime: 0, duration: 99 })],
    overlays: [overlay()],
    mosaic: [stroke],
  })
  // drawPointThumbnail 內部就是這個轉換
  const bare: Scene = { ...s, cues: [], overlays: [], showCameraCaptions: false }
  const layers = layersAt(bare, timeOfPoint(bare.points, 0), target)
  assert.deepEqual(kinds(layers), ['background', 'image'], '縮圖只有背景與影像')
  const img = layers[1]
  if (img.kind !== 'image') throw new Error('expected image layer')
  assert.deepEqual(img.mosaic, [stroke], '馬賽克不能被縮圖丟掉')
}

// 22. Scene 沒有圖片時畫不出任何東西，但長度照算
{
  const s = scene({ image: null, cues: [cue({ startTime: 0, duration: 7 })] })
  assert.deepEqual(layersAt(s, 1, target), [])
  assert.equal(sceneDuration(s), 7, '沒有圖片也還是有時間軸長度')
}

// 23. 輸出比例來自目標畫布，不是常數。ScreenDownload 的 4:5 / 1:1 靠這個，
//     它當初就是為了這個參數才自己複製了一份取景邏輯。
{
  const square: Target = { width: 1080, height: 1080, measure }
  const [, img] = layersFor(state(), square)
  if (img.kind !== 'image') throw new Error('expected image layer')
  // 4000×3000 放進 1:1：baseW = 4000、baseH = 4000 → 上下各裁掉 500
  assertRect(img.src, { x: 0, y: 0, w: 4000, h: 3000 }, '1:1 取景')
  assertRect(img.dest, { x: 0, y: 135, w: 1080, h: 810 })

  const portrait45: Target = { width: 1080, height: 1350, measure }
  const [, img45] = layersFor(state(), portrait45)
  if (img45.kind !== 'image') throw new Error('expected image layer')
  assertRect(img45.dest, { x: 0, y: 270, w: 1080, h: 810 }, '4:5 取景')

  // 同一個 state 在不同比例下必須給出不同的目標矩形，否則就是又寫死了
  const [, img916] = layersFor(state(), target)
  if (img916.kind !== 'image') throw new Error('expected image layer')
  assert.notEqual(img916.dest.y, img.dest.y, '9:16 與 1:1 的留白不該一樣')
}

// 24. 直式來源圖走另一個分支：以高度為基準，左右裁切
{
  const tall = state({ image: { width: 1000, height: 4000, source: null as never }, camera: { cx: 500, cy: 2000, zoom: 1 } })
  const [, img] = layersFor(tall, target)
  if (img.kind !== 'image') throw new Error('expected image layer')
  // naturalRatio 0.25 < 0.5625 → baseH = 4000、baseW = 2250 → 比圖寬，左右夾住
  assertRect(img.src, { x: 0, y: 0, w: 1000, h: 4000 }, '整張直式圖都取用')
  assert.ok(img.dest.x > 0 && img.dest.w < 1080, '左右留白')
  assert.equal(img.dest.y, 0)
  assert.equal(img.dest.h, 1920, '高度滿版')
}

// 25. frameStateAt 回報目前落在哪一個鏡頭點——預覽用它同步選取，
//     不必自己再解一次時間軸。
{
  const s = scene({ points: [
    point({ moveDuration: 1, holdDuration: 2 }),   // 0..3
    point({ moveDuration: 1, holdDuration: 2 }),   // 3..6
  ] })
  const idxAt = (t: number) => frameStateAt(s, t)?.pointIndex
  assert.equal(idxAt(0), 0)
  assert.equal(idxAt(2.9), 0)
  assert.equal(idxAt(3.5), 1)
  assert.equal(idxAt(99), 1, '超過長度後停在最後一點')
  assert.equal(frameStateAt(scene({ image: null }), 0), null, '沒有圖片就沒有畫面')
}

console.log('canvas layers self-check passed')
