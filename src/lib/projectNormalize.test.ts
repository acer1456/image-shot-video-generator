// 跑法：npm test
// ponytail: 只驗 AI 解析筆記的還原——它來自專案檔／自動暫存，屬於外部輸入
import assert from 'node:assert'
import test from 'node:test'
import { normalizeCarouselNotes } from './projectNormalize'

test('沒有筆記或內容全空 → null', () => {
  assert.equal(normalizeCarouselNotes(undefined), null)
  assert.equal(normalizeCarouselNotes(null), null)
  assert.equal(normalizeCarouselNotes('壞掉的字串'), null)
  assert.equal(normalizeCarouselNotes({ plan: '  ', research: '', sources: [] }), null)
})

test('型別不對的欄位丟掉，來源沒名字的濾掉', () => {
  const notes = normalizeCarouselNotes({
    plan: ' 核心矛盾：… ',
    research: { nested: true },
    sources: [{ name: '大都會博物館', url: 'https://www.metmuseum.org', note: 7 }, { url: 'https://x' }, 'junk'],
  })
  assert.deepEqual(notes, {
    plan: '核心矛盾：…',
    research: '',
    sources: [{ name: '大都會博物館', url: 'https://www.metmuseum.org', note: '7' }],
  })
})
