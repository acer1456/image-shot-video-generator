// 手動跑：npx tsx --tsconfig tsconfig.app.json src/lib/ctcAlign.test.ts
// ponytail: assert-based self-check，不裝測試框架
import assert from 'node:assert'
import { alignWordsCtc, viterbiAlign, type CtcVocab } from './ctcAlign'

// 迷你 vocab：0=blank, 1..26 = A-Z
const charToId = new Map<string, number>()
for (let i = 0; i < 26; i++) charToId.set(String.fromCharCode(65 + i), i + 1)
const vocab: CtcVocab = { charToId, blankId: 0 }
const V = 27
const SPF = 0.02  // 20ms/frame，與 wav2vec2-base 相同

/**
 * 合成 emission：依 script 給定「每個字元佔哪些 frame」，其餘 frame 為 blank。
 * plan = [[字元, 起始frame, 結束frame(不含)], ...]
 */
function synthEmissions(numFrames: number, plan: Array<[string, number, number]>): Float32Array {
  const em = new Float32Array(numFrames * V).fill(Math.log(0.001))
  // 預設每個 frame 都是 blank
  for (let t = 0; t < numFrames; t++) em[t * V + 0] = Math.log(0.9)
  for (const [ch, from, to] of plan) {
    const id = charToId.get(ch)!
    for (let t = from; t < to; t++) {
      em[t * V + 0] = Math.log(0.05)     // 該 frame 不是 blank
      em[t * V + id] = Math.log(0.9)
    }
  }
  return em
}

// 1. 單字 "CAT"：C 在 10-14、A 在 14-18、T 在 18-22 → 起點應為 0.20s
{
  const T = 40
  const em = synthEmissions(T, [['C',10,14],['A',14,18],['T',18,22]])
  const { words } = alignWordsCtc(em, T, V, ['cat'], vocab, SPF, T * SPF)
  assert.strictEqual(words.length, 1)
  assert.ok(Math.abs(words[0].startTime - 0.20) < 0.03,
    `"cat" 應始於 ≈0.20s，得到 ${words[0].startTime}`)
}

// 2. 兩個字，中間有長靜音 → 第二個字必須定位到它真正發音的位置
{
  const T = 100
  const em = synthEmissions(T, [
    ['H',5,9],['I',9,13],                      // "HI" 在 0.10~0.26s
    ['B',70,74],['Y',74,78],['E',78,82],       // "BYE" 在 1.40~1.64s
  ])
  const { words } = alignWordsCtc(em, T, V, ['hi','bye'], vocab, SPF, T * SPF)
  assert.ok(Math.abs(words[0].startTime - 0.10) < 0.04, `"hi" 應 ≈0.10s，得到 ${words[0].startTime}`)
  assert.ok(Math.abs(words[1].startTime - 1.40) < 0.06, `"bye" 應 ≈1.40s，得到 ${words[1].startTime}`)
  // 這是重點：靜音沒有被平均攤掉，第二個字沒有被往前拉
  assert.ok(words[1].startTime > 1.2, '長靜音後的字不應被內插往前拉')
}

// 3. 開頭有長前奏（前 3 秒沒有語音）→ 第一個字不應被釘在 0
{
  const T = 250
  const em = synthEmissions(T, [
    ['T',150,155],['H',155,160],['E',160,165],    // 3.00s 才開始說話
    ['E',200,205],['N',205,210],['D',210,215],
  ])
  const { words } = alignWordsCtc(em, T, V, ['the','end'], vocab, SPF, T * SPF)
  assert.ok(words[0].startTime > 2.5,
    `開頭有前奏時第一個字不應被釘在 0，得到 ${words[0].startTime}`)
  assert.ok(Math.abs(words[0].startTime - 3.0) < 0.15, `"the" 應 ≈3.0s，得到 ${words[0].startTime}`)
}

// 4. 重複字元 "LL"（CTC 需要中間有 blank 才能區分兩個 L）
{
  const T = 60
  const em = synthEmissions(T, [
    ['H',5,9],['E',9,13],['L',13,17],['L',19,23],['O',23,27],
  ])
  const { words } = alignWordsCtc(em, T, V, ['hello'], vocab, SPF, T * SPF)
  assert.ok(Math.abs(words[0].startTime - 0.10) < 0.04, `"hello" 應 ≈0.10s，得到 ${words[0].startTime}`)
}

// 5. 多字句子：時間必須嚴格單調且落在各自發音區
{
  const T = 200
  const plan: Array<[string, number, number]> = []
  const words = ['one','two','three','four']
  let f = 20
  const expect: number[] = []
  for (const w of words) {
    expect.push(f * SPF)
    for (const ch of w.toUpperCase()) { plan.push([ch, f, f + 4]); f += 4 }
    f += 12   // 字間留白
  }
  const em = synthEmissions(T, plan)
  const res = alignWordsCtc(em, T, V, words, vocab, SPF, T * SPF)
  for (let i = 1; i < res.words.length; i++)
    assert.ok(res.words[i].startTime > res.words[i-1].startTime, `時間非遞增 @${i}`)
  res.words.forEach((w, i) => {
    assert.ok(Math.abs(w.startTime - expect[i]) < 0.10,
      `"${w.word}" 應 ≈${expect[i].toFixed(2)}s，得到 ${w.startTime.toFixed(2)}s`)
  })
}

// 6. 稿子含數字（不在 vocab）→ 不可產生 NaN，時間仍單調
{
  const T = 100
  const em = synthEmissions(T, [['A',10,14],['B',60,64]])
  const { words } = alignWordsCtc(em, T, V, ['a','2024','b'], vocab, SPF, T * SPF)
  assert.strictEqual(words.length, 3)
  for (const w of words) {
    assert.ok(Number.isFinite(w.startTime) && Number.isFinite(w.duration), `NaN: ${JSON.stringify(w)}`)
    assert.ok(w.duration > 0)
  }
  for (let i = 1; i < words.length; i++)
    assert.ok(words[i].startTime >= words[i-1].startTime, '含無法辨識字時仍需單調')
}

// 7. viterbiAlign 直接檢查：token 起始 frame 必須嚴格遞增
{
  const T = 60
  const em = synthEmissions(T, [['A',5,10],['B',15,20],['C',30,35]])
  const tokens = [
    { wordIndex: 0, tokenId: charToId.get('A')! },
    { wordIndex: 0, tokenId: charToId.get('B')! },
    { wordIndex: 0, tokenId: charToId.get('C')! },
  ]
  const { startFrame } = viterbiAlign(em, T, V, tokens, 0)
  assert.strictEqual(startFrame.length, 3)
  for (let i = 1; i < startFrame.length; i++)
    assert.ok(startFrame[i] > startFrame[i-1], `token frame 非遞增: ${Array.from(startFrame)}`)
}

// 8. 邊界：空稿、token 比 frame 多
assert.deepStrictEqual(alignWordsCtc(new Float32Array(0), 0, V, [], vocab, SPF, 1).words, [])
{
  const T = 3
  const em = synthEmissions(T, [])
  const { words } = alignWordsCtc(em, T, V, ['extraordinarily','long','script'], vocab, SPF, T * SPF)
  assert.strictEqual(words.length, 3, '無法對齊時仍須回傳完整長度')
  for (const w of words) assert.ok(Number.isFinite(w.startTime) && w.duration > 0)
}

console.log('ctcAlign self-check passed')
