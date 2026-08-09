// 跑法：npm test
// ponytail: 只測堆疊搬移這段純邏輯，hook 本身交給實際操作驗
import assert from 'node:assert'
import test from 'node:test'
import { applyStep, pushHistory, type History } from './useHistory'

const start: History<string> = { past: [], future: [], present: 'A' }

test('沒東西可回時原樣回傳', () => {
  assert.equal(applyStep(start, 'undo'), start)
  assert.equal(applyStep(start, 'redo'), start)
})

test('回上一步再重做會回到原地', () => {
  const edited = pushHistory(start, 'B')
  const undone = applyStep(edited, 'undo')
  assert.equal(undone.present, 'A')
  assert.deepEqual(undone.future, ['B'])
  assert.equal(applyStep(undone, 'redo').present, 'B')
})

test('連回兩步是 C→B→A，重做再走回來', () => {
  let state = pushHistory(pushHistory(start, 'B'), 'C')
  state = applyStep(state, 'undo')
  assert.equal(state.present, 'B')
  state = applyStep(state, 'undo')
  assert.equal(state.present, 'A')
  assert.deepEqual(state.past, [])
  state = applyStep(state, 'redo')
  assert.equal(state.present, 'B')
  state = applyStep(state, 'redo')
  assert.equal(state.present, 'C')
  assert.deepEqual(state.future, [])
})

test('回上一步後又編輯，重做鏈作廢', () => {
  const state = pushHistory(applyStep(pushHistory(start, 'B'), 'undo'), 'X')
  assert.deepEqual(state.future, [])
  assert.equal(state.present, 'X')
  assert.equal(applyStep(state, 'undo').present, 'A')
})

test('歷史有上限，最舊的先掉', () => {
  let state = start
  for (let i = 0; i < 80; i++) state = pushHistory(state, `s${i}`)
  assert.equal(state.past.length, 50)
  assert.equal(state.past[0], 's29')
})
