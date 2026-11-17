// 跑法：npm test
// ponytail: 只驗剪一刀這條純邏輯，音訊不進瀏覽器也能算
import assert from 'node:assert'
import test from 'node:test'
import { buildDraftSubtitleCues, isDraftCue, parseNarrationInput, splitNarrationAt } from './narration'
import type { NarrationTrack } from '@/types'

const RATE = 100

function track(over: Partial<NarrationTrack> = {}): NarrationTrack {
  return {
    id: 't1', text: 'hello world', voice: 'upload', speed: 1, pauseIntensity: 0,
    startTime: 1, duration: 4,
    audioData: new Float32Array(400).fill(0.5),
    samplingRate: RATE,
    segments: [], words: [], phonemes: [],
    ...over,
  }
}

test('整軌沒切過時，剪一刀變成兩段且音訊接得回原長', () => {
  const out = splitNarrationAt(track(), 2.5) // 軌道起點 1s → 片段內 1.5s
  assert.equal(out.segments.length, 2)
  const [head, tail] = out.segments
  assert.deepEqual([head.startTime, head.duration], [0, 1.5])
  assert.deepEqual([tail.startTime, tail.duration], [1.5, 2.5])
  assert.equal(head.audioData!.length, 150)
  assert.equal(tail.audioData!.length, 250)
})

test('切點不在任何片段上就原樣回傳', () => {
  const original = track()
  assert.equal(splitNarrationAt(original, 99), original)
  assert.equal(splitNarrationAt(original, 1.01), original) // 太靠邊，不切出零長度
})

test('切點之後的字改掛後半段，文字跟著重組', () => {
  const words = [
    { word: 'hello', startTime: 0.2, duration: 0.5, segmentId: 's1' },
    { word: 'world', startTime: 2.0, duration: 0.5, segmentId: 's1' },
  ]
  const out = splitNarrationAt(track({
    words,
    segments: [{
      id: 's1', text: 'hello world', startTime: 0, duration: 4,
      audioData: new Float32Array(400), samplingRate: RATE,
      pauseAfterMs: 0, wordStartIndex: 0, wordEndIndex: 1,
    }],
  }), 2.5)
  const [head, tail] = out.segments
  assert.equal(head.text, 'hello')
  assert.equal(tail.text, 'world')
  assert.equal(out.words[0].segmentId, head.id)
  assert.equal(out.words[1].segmentId, tail.id)
})

test('AI 中英旁白格式：每行英文配到正下方中文，中文不進 TTS，段落空行保留', () => {
  const raw = 'She was told not to look back.\n有人警告她，千萬別回頭。\nShe looked.\n她還是回頭了。\n\nLook at her feet.\n看看她的腳。'
  const { ttsText, lines } = parseNarrationInput(raw)
  assert.equal(ttsText, 'She was told not to look back.\nShe looked.\n\nLook at her feet.')
  assert.deepEqual(lines.map(l => [l.english, l.translation]), [
    ['She was told not to look back.', '有人警告她，千萬別回頭。'],
    ['She looked.', '她還是回頭了。'],
    ['Look at her feet.', '看看她的腳。'],
  ])
})

test('AI 旁白草稿字幕：中文掛回所屬英文行、時間遞增、全部標成草稿', () => {
  const cues = buildDraftSubtitleCues('Why is everyone waiting for the answer?\n為什麼大家都在等一個答案？\nLook closer.\n再看仔細一點。')
  assert.ok(cues.length >= 2)
  assert.ok(cues.every(isDraftCue))
  assert.equal(cues[0].translation, '為什麼大家都在等一個答案？')
  assert.equal(cues[cues.length - 1].text, 'Look closer.')
  assert.equal(cues[cues.length - 1].translation, '再看仔細一點。')
  for (let i = 1; i < cues.length; i++) assert.ok(cues[i].startTime >= cues[i - 1].startTime + cues[i - 1].duration)
})
