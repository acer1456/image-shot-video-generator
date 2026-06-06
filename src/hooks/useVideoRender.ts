import { useCallback, useState } from 'react'
import { Muxer, ArrayBufferTarget } from 'webm-muxer'
import type { AppStore } from '@/hooks/useAppStore'
import { buildTimeline, drawCamera as doDrawCamera, getTimelineStateAt } from '@/lib/canvas'
import { OUTPUT_W, OUTPUT_H, sanitizeFileName, getTodayString, wait } from '@/lib/utils'
import { convertPointsCaptions, convertSubtitleCues, type ChineseConversion } from '@/lib/chinese'
import type { NarrationTrack, SubtitleCue } from '@/types'
import { getActiveSubtitleCue, getSubtitleRenderText } from '@/lib/narration'

export type VideoRenderMethod = 'mediaRecorder' | 'webCodecs'

const RENDER_FPS = 30
const FRAME_DURATION_US = Math.round(1_000_000 / RENDER_FPS)
const WEB_CODECS_MAX_QUEUE_SIZE = 2
const OPUS_FRAME_MS = 20

interface UseVideoRenderOptions {
  store: AppStore
  getCanvas: () => HTMLCanvasElement | null
  triggerRedraw: () => void
  narrationTrack: NarrationTrack | null
  subtitleCues: SubtitleCue[]
  showNarration: boolean
  showCameraCaptions: boolean
}

function getBestMediaRecorderMimeType() {
  const candidates = [
    'video/mp4;codecs=h264,aac',
    'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
    'video/mp4',
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
  ]
  return candidates.find(type => MediaRecorder.isTypeSupported(type)) || 'video/webm'
}

function createProgressReporter(setRenderProgress: (progress: number) => void) {
  let lastProgress = -1
  let lastUpdate = 0

  return (frame: number, totalFrames: number) => {
    const progress = Math.round((frame + 1) / totalFrames * 100)
    const now = performance.now()
    if (progress === lastProgress || (now - lastUpdate < 250 && progress < 100)) return
    lastProgress = progress
    lastUpdate = now
    setRenderProgress(progress)
  }
}

function hasNarrationAudio(track: NarrationTrack | null) {
  return !!track?.audioData && !!track.samplingRate && track.duration > 0
}

function getNarrationFrameSample(track: NarrationTrack, sampleIndex: number) {
  const startFrame = Math.max(0, Math.round(track.startTime * track.samplingRate!))
  const sourceIndex = sampleIndex - startFrame
  if (sourceIndex < 0 || sourceIndex >= track.audioData!.length) return 0
  return track.audioData![sourceIndex]
}

async function createNarrationAudioTrack(track: NarrationTrack | null) {
  if (!hasNarrationAudio(track)) return null
  const audioCtx = new AudioContext({ sampleRate: track!.samplingRate })
  await audioCtx.resume()
  const destination = audioCtx.createMediaStreamDestination()
  const buffer = audioCtx.createBuffer(1, track!.audioData!.length, track!.samplingRate!)
  buffer.copyToChannel(track!.audioData!, 0)
  const source = audioCtx.createBufferSource()
  source.buffer = buffer
  source.connect(destination)
  return { audioCtx, destination, source }
}

export function useVideoRender({
  store,
  getCanvas,
  triggerRedraw,
  narrationTrack,
  subtitleCues,
  showNarration,
  showCameraCaptions,
}: UseVideoRenderOptions) {
  const [renderProgress, setRenderProgress] = useState(0)

  const renderVideo = useCallback(async (
    captionConversion: ChineseConversion = 'original',
    method: VideoRenderMethod = 'mediaRecorder',
  ) => {
    if (!store.image || !store.points.length || store.isRendering) return
    store.setIsRendering(true)
    store.setIsPreviewing(false)
    try {
      const renderPoints = captionConversion === 'original'
        ? store.points
        : await convertPointsCaptions(store.points, captionConversion)
      const renderSubtitleCues = !showNarration
        ? []
        : captionConversion === 'original'
        ? subtitleCues
        : await convertSubtitleCues(subtitleCues, captionConversion)
      const { totalDuration: td } = buildTimeline(renderPoints)
      const renderNarrationTrack = showNarration ? narrationTrack : null
      const narrationEnd = renderNarrationTrack ? renderNarrationTrack.startTime + renderNarrationTrack.duration : 0
      const subtitleEnd = renderSubtitleCues.reduce((max, cue) => Math.max(max, cue.startTime + cue.duration), 0)
      const renderDuration = Math.max(td, narrationEnd, subtitleEnd)
      const totalFrames = Math.ceil(renderDuration * RENDER_FPS) + 1

      // Dedicated offscreen canvas — completely isolated from the editor canvas.
      // Prevents React re-renders / drawBase() effects from interfering with the
      // capture stream, which caused progressive data loss on repeated exports.
      // Also lets us use fixed time-step rendering without touching the editor view.
      const off = document.createElement('canvas')
      off.width = OUTPUT_W
      off.height = OUTPUT_H
      const offCtx = off.getContext('2d')!

      // Also grab the editor canvas for live preview during export.
      // Since isRendering=true, CanvasEditor's drawBase() has an early-return guard
      // and won't interfere. Drawing to both canvases is synchronous and completes
      // well within the 34ms frame budget, so the recording is not affected.
      const editorCanvas = getCanvas()
      const editorCtx = editorCanvas?.getContext('2d') ?? null

      const drawFrame = (t: number) => {
        const state = getTimelineStateAt(store.image!, renderPoints, t)
        if (!state) return
        const cue = getActiveSubtitleCue(renderSubtitleCues, t)
        const narText = getSubtitleRenderText(cue) || undefined
        const captionPoint = showCameraCaptions ? state.captionPoint : null
        doDrawCamera(off, offCtx, store.image!, state.camera, store.backgroundSettings, captionPoint, false, false, { x: false, y: false }, 0, narText, cue?.style)
        if (editorCanvas && editorCtx) {
          doDrawCamera(editorCanvas, editorCtx, store.image!, state.camera, store.backgroundSettings, captionPoint, false, false, { x: false, y: false }, 0, narText, cue?.style)
        }
      }

      setRenderProgress(0)
      const { blob, mimeType } = method === 'mediaRecorder'
        ? await renderWithMediaRecorder(off, drawFrame, renderDuration, totalFrames, setRenderProgress, renderNarrationTrack)
        : await renderWithWebCodecs(off, drawFrame, renderDuration, totalFrames, setRenderProgress, renderNarrationTrack)
      if (store.lastVideoUrl) URL.revokeObjectURL(store.lastVideoUrl)
      const url = URL.createObjectURL(blob)
      store.setLastVideoUrl(url)
      const ext = mimeType.includes('mp4') ? 'mp4' : 'webm'
      const suffix = captionConversion === 'tw' ? '-繁中' : captionConversion === 'cn' ? '-简中' : ''
      const a = document.createElement('a')
      a.href = url
      a.download = `${sanitizeFileName(store.projectName)}-${getTodayString()}${suffix}.${ext}`
      document.body.appendChild(a); a.click(); a.remove()
    } catch (err) {
      console.error(err)
      alert('影片產生失敗，請打開 Console 查看錯誤。')
    } finally {
      store.setIsRendering(false)
      triggerRedraw()
    }
  }, [store, getCanvas, triggerRedraw, narrationTrack, subtitleCues, showNarration, showCameraCaptions])

  return { renderVideo, renderProgress }
}

async function renderWithMediaRecorder(
  canvas: HTMLCanvasElement,
  drawFrame: (time: number) => void,
  totalDuration: number,
  totalFrames: number,
  setRenderProgress: (progress: number) => void,
  narrationTrack: NarrationTrack | null,
) {
  const frameIntervalMs = 1000 / RENDER_FPS
  const startDelayMs = 100
  // captureStream(0) = manual frame mode: frames are only captured when
  // requestFrame() is explicitly called. This is necessary for offscreen
  // canvases because the browser's compositor never visits them, so
  // captureStream(N) with a non-zero rate never actually samples any pixels,
  // causing the stream to produce no data and recorder.onstop to hang forever.
  const stream = canvas.captureStream(0)
  const narrationAudio = await createNarrationAudioTrack(narrationTrack)
  if (narrationAudio) {
    for (const track of narrationAudio.destination.stream.getAudioTracks()) {
      stream.addTrack(track)
    }
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const captureTrack = stream.getVideoTracks()[0] as any
    const chunks: BlobPart[] = []
    const mimeType = getBestMediaRecorderMimeType()
    const recorder = new MediaRecorder(stream, { mimeType })
    const reportProgress = createProgressReporter(setRenderProgress)
    recorder.ondataavailable = event => { if (event.data.size > 0) chunks.push(event.data) }
    const done = new Promise<void>((resolve, reject) => {
      recorder.onstop = () => resolve()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recorder.onerror = (e: Event) => reject(new Error('MediaRecorder: ' + ((e as any).error?.message ?? 'unknown error')))
    })
    recorder.start()
    const wallStart = performance.now() + startDelayMs
    if (narrationAudio) {
      const delay = Math.max(0, narrationTrack!.startTime)
      narrationAudio.source.start(narrationAudio.audioCtx.currentTime + startDelayMs / 1000 + delay)
    }

    // MediaRecorder timestamps frames using real capture time, so draw from the
    // same wall clock as AudioContext. Absolute deadlines prevent per-frame timer
    // and drawing costs from accumulating into subtitle/audio drift.
    let frame = 0
    while (true) {
      const targetTime = wallStart + frame * frameIntervalMs
      const waitMs = targetTime - performance.now()
      if (waitMs > 0) await wait(waitMs)

      const elapsed = Math.min(
        totalDuration,
        Math.max(0, (performance.now() - wallStart) / 1000),
      )
      drawFrame(elapsed)
      captureTrack.requestFrame?.()
      reportProgress(Math.min(totalFrames - 1, Math.floor(elapsed * RENDER_FPS)), totalFrames)
      if (elapsed >= totalDuration) break

      // Skip nominal frames that are already in the past instead of rendering
      // them late with stale subtitle timestamps.
      const currentFrame = Math.floor(elapsed * RENDER_FPS)
      frame = Math.max(frame + 1, currentFrame + 1)
    }

    // Give the stream enough time to capture the final frame before stopping.
    await wait(300)
    recorder.stop()
    await done

    return {
      blob: new Blob(chunks, { type: mimeType }),
      mimeType,
    }
  } finally {
    if (narrationAudio) {
      try { narrationAudio.source.stop() } catch { /* already stopped */ }
      narrationAudio.destination.stream.getTracks().forEach(track => track.stop())
      await narrationAudio.audioCtx.close().catch(() => undefined)
    }
    // Explicitly stop the track so the canvas is no longer held by this stream.
    stream.getTracks().forEach(track => track.stop())
  }
}

async function renderWithWebCodecs(
  canvas: HTMLCanvasElement,
  drawFrame: (time: number) => void,
  totalDuration: number,
  totalFrames: number,
  setRenderProgress: (progress: number) => void,
  narrationTrack: NarrationTrack | null,
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const VideoEncoderCtor = (globalThis as any).VideoEncoder
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const VideoFrameCtor = (globalThis as any).VideoFrame
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const AudioEncoderCtor = (globalThis as any).AudioEncoder
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const AudioDataCtor = (globalThis as any).AudioData
  if (!VideoEncoderCtor || !VideoFrameCtor) {
    throw new Error('此瀏覽器不支援 WebCodecs VideoEncoder。')
  }
  if (hasNarrationAudio(narrationTrack) && (!AudioEncoderCtor || !AudioDataCtor)) {
    throw new Error('此瀏覽器不支援 WebCodecs AudioEncoder，請改用 MediaRecorder 輸出含旁白影片。')
  }

  const target = new ArrayBufferTarget()
  const muxer = new Muxer({
    target,
    video: {
      codec: 'V_VP8',
      width: OUTPUT_W,
      height: OUTPUT_H,
      frameRate: RENDER_FPS,
    },
    ...(hasNarrationAudio(narrationTrack)
      ? {
        audio: {
          codec: 'A_OPUS',
          numberOfChannels: 1,
          sampleRate: narrationTrack!.samplingRate!,
        },
      }
      : {}),
  })
  const errors: Error[] = []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let encoder: any | null = new VideoEncoderCtor({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    output: (chunk: any, meta: any) => muxer.addVideoChunk(chunk, meta),
    error: (error: Error) => errors.push(error),
  })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let audioEncoder: any | null = null
  let audioEncodeController: { encodeUntil: (timeSeconds: number) => Promise<void> } | null = null
  const reportProgress = createProgressReporter(setRenderProgress)

  const config = {
    codec: 'vp8',
    width: OUTPUT_W,
    height: OUTPUT_H,
    framerate: RENDER_FPS,
    bitrate: 8_000_000,
  }

  if (typeof VideoEncoderCtor.isConfigSupported === 'function') {
    const support = await VideoEncoderCtor.isConfigSupported(config)
    if (!support.supported) throw new Error('此瀏覽器不支援 VP8 WebCodecs 編碼。')
  }
  if (hasNarrationAudio(narrationTrack)) {
    const audioConfig = {
      codec: 'opus',
      sampleRate: narrationTrack!.samplingRate!,
      numberOfChannels: 1,
      bitrate: 96_000,
    }
    if (typeof AudioEncoderCtor.isConfigSupported === 'function') {
      const support = await AudioEncoderCtor.isConfigSupported(audioConfig)
      if (!support.supported) throw new Error('此瀏覽器不支援 Opus WebCodecs 音訊編碼，請改用 MediaRecorder。')
    }
    audioEncoder = new AudioEncoderCtor({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      output: (chunk: any, meta: any) => muxer.addAudioChunk(chunk, meta),
      error: (error: Error) => errors.push(error),
    })
    audioEncoder.configure(audioConfig)
    audioEncodeController = createNarrationAudioEncodeController(audioEncoder, AudioDataCtor, narrationTrack!, totalDuration)
  }
  try {
    encoder.configure(config)

    for (let frame = 0; frame < totalFrames; frame++) {
      const time = Math.min(frame / RENDER_FPS, totalDuration)
      drawFrame(time)
      const videoFrame = new VideoFrameCtor(canvas, {
        timestamp: frame * FRAME_DURATION_US,
        duration: FRAME_DURATION_US,
      })
      encoder.encode(videoFrame, { keyFrame: frame % (RENDER_FPS * 2) === 0 })
      videoFrame.close()
      if (audioEncodeController) await audioEncodeController.encodeUntil(time + 1 / RENDER_FPS)
      await waitForEncoderQueue(encoder, WEB_CODECS_MAX_QUEUE_SIZE)
      reportProgress(frame, totalFrames)
      if (frame % 10 === 0) await wait(0)
      if (errors.length) throw errors[0]
    }

    await encoder.flush()
    if (audioEncoder && audioEncodeController) {
      await audioEncodeController.encodeUntil(totalDuration)
      await audioEncoder.flush()
    }
    if (errors.length) throw errors[0]
  } finally {
    encoder?.close()
    encoder = null
    audioEncoder?.close()
    audioEncoder = null
  }

  muxer.finalize()
  const mimeType = hasNarrationAudio(narrationTrack) ? 'video/webm;codecs=vp8,opus' : 'video/webm;codecs=vp8'
  return {
    blob: new Blob([target.buffer], { type: mimeType }),
    mimeType,
  }
}

function createNarrationAudioEncodeController(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  audioEncoder: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  AudioDataCtor: any,
  track: NarrationTrack,
  totalDuration: number,
) {
  const sampleRate = track.samplingRate!
  const framesPerChunk = Math.max(1, Math.round(sampleRate * OPUS_FRAME_MS / 1000))
  const totalAudioFrames = Math.ceil(Math.min(totalDuration, track.startTime + track.duration) * sampleRate)
  let frameOffset = 0

  return {
    encodeUntil: async (timeSeconds: number) => {
      const targetFrame = Math.min(totalAudioFrames, Math.ceil(timeSeconds * sampleRate))
      while (frameOffset < targetFrame) {
        const frameCount = Math.min(framesPerChunk, targetFrame - frameOffset)
        const samples = new Float32Array(frameCount)
        for (let i = 0; i < frameCount; i++) {
          samples[i] = getNarrationFrameSample(track, frameOffset + i)
        }
        const audioData = new AudioDataCtor({
          format: 'f32-planar',
          sampleRate,
          numberOfFrames: frameCount,
          numberOfChannels: 1,
          timestamp: Math.round(frameOffset / sampleRate * 1_000_000),
          data: samples,
        })
        audioEncoder.encode(audioData)
        audioData.close()
        frameOffset += frameCount
        while (audioEncoder.encodeQueueSize > WEB_CODECS_MAX_QUEUE_SIZE) {
          await wait(0)
        }
      }
    },
  }
}

async function waitForEncoderQueue(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  encoder: any,
  maxQueueSize: number,
) {
  while (encoder.encodeQueueSize > maxQueueSize) {
    await wait(0)
  }
}
