// 跑法：npm test
// ponytail: assert-based self-check，用 node 內建 test runner
import assert from 'node:assert'
import test from 'node:test'
import { rippleRow, type Clip } from './ripple'

const clip = (id: string, start: number, end: number): Clip => ({ id, start, end })
const layout = (clips: Clip[]) =>
  clips.map(c => `${c.id}:${c.start}-${c.end}`).join(' ')

const noOverlap = (clips: Clip[]) => {
  const sorted = [...clips].sort((a, b) => a.start - b.start)
  for (let i = 1; i < sorted.length; i++) {
    assert.ok(sorted[i].start >= sorted[i - 1].end - 1e-9, `重疊：${layout(sorted)}`)
    assert.ok(sorted[i - 1].start >= -1e-9, `跑到負數：${layout(sorted)}`)
  }
}

test('沒重疊就不動任何人', () => {
  const clips = [clip('a', 0, 2), clip('b', 3, 5)]
  assert.equal(layout(rippleRow(clips, 'b')), 'a:0-2 b:3-5')
})

test('往左拖蓋到前面的，前面的被推左邊', () => {
  const out = rippleRow([clip('a', 2, 4), clip('b', 3, 6)], 'b')
  assert.equal(layout(out), 'a:1-3 b:3-6')
  noOverlap(out)
})

test('被推到 0 之前時整列往右擠回來', () => {
  const out = rippleRow([clip('a', 0, 2), clip('b', 1, 4)], 'b')
  assert.equal(layout(out), 'a:0-2 b:2-5')
  noOverlap(out)
})

test('拉長右邊界會把後面兩塊依序往右推', () => {
  const out = rippleRow([clip('a', 0, 6), clip('b', 2, 3), clip('c', 3, 4)], 'a')
  assert.equal(layout(out), 'a:0-6 b:6-7 c:7-8')
  noOverlap(out)
})

test('整塊蓋在別人身上也推得開', () => {
  const out = rippleRow([clip('a', 1, 2), clip('b', 4, 5), clip('c', 1.5, 4.5)], 'c')
  assert.equal(layout(out), 'a:0.5-1.5 c:1.5-4.5 b:4.5-5.5')
  noOverlap(out)
})

test('左邊塞不下時連 anchor 都會被往右擠', () => {
  const out = rippleRow([clip('a', 0, 1), clip('b', 2, 3), clip('c', 0.5, 2.5)], 'c')
  assert.equal(layout(out), 'a:0-1 c:1-3 b:3-4')
  noOverlap(out)
})

test('拖到空白處不會把別人拉過來', () => {
  const out = rippleRow([clip('a', 0, 1), clip('b', 10, 11)], 'b')
  assert.equal(layout(out), 'a:0-1 b:10-11')
})
