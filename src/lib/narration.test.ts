// 跑法：npm test
// ponytail: 只驗剪一刀這條純邏輯，音訊不進瀏覽器也能算
import assert from 'node:assert'
import test from 'node:test'
import { splitNarrationAt } from './narration'
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
