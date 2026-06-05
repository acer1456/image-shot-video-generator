import type { MutableRefObject } from 'react'
import type { NarrationTrack, SubtitleCue } from '@/types'

export function getActiveSubtitleCue(cues: SubtitleCue[], time: number): SubtitleCue | null {
  return cues.find(cue => time >= cue.startTime && time < cue.startTime + cue.duration) ?? null
}

export function getSubtitleRenderText(cue: SubtitleCue | null): string {
  if (!cue) return ''
  const main = cue.text.trim()
  const sub = cue.translation.trim()
  if (main && sub) return `${main}\n${sub}`
  return main || sub
}

export function scheduleNarrationAudio(
  track: NarrationTrack | null,
  fromTime: number,
  ctxRef: MutableRefObject<AudioContext | null>,
  sourcesRef: MutableRefObject<AudioBufferSourceNode[]>,
) {
  for (const src of sourcesRef.current) { try { src.stop() } catch { /* already stopped */ } }
  sourcesRef.current = []
  if (!track?.audioData || !track.samplingRate) return
  if (track.startTime + track.duration <= fromTime) return

  if (!ctxRef.current || ctxRef.current.state === 'closed') {
    ctxRef.current = new AudioContext()
  }
  const ctx = ctxRef.current
  const buffer = ctx.createBuffer(1, track.audioData.length, track.samplingRate)
  buffer.copyToChannel(track.audioData, 0)
  const source = ctx.createBufferSource()
  source.buffer = buffer
  source.connect(ctx.destination)
  const delay = track.startTime - fromTime
  if (delay >= 0) {
    source.start(ctx.currentTime + delay)
  } else {
    const offset = Math.min(-delay, track.duration - 0.01)
    source.start(ctx.currentTime, Math.max(0, offset))
  }
  sourcesRef.current.push(source)
}

export function stopNarrationAudio(sourcesRef: MutableRefObject<AudioBufferSourceNode[]>) {
  for (const src of sourcesRef.current) { try { src.stop() } catch { /* already stopped */ } }
  sourcesRef.current = []
}
