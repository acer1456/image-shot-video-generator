import { useCallback, useState } from 'react'
import type { AppStore } from '@/hooks/useAppStore'
import { buildTimeline, drawCamera as doDrawCamera, getTimelineStateAt } from '@/lib/canvas'
import { OUTPUT_W, OUTPUT_H, sanitizeFileName, getTodayString, wait } from '@/lib/utils'
import { convertPointsCaptions, type ChineseConversion } from '@/lib/chinese'
import type { NarrationSegment, SubtitleStyle } from '@/types'
import { getNarrationVisibleText } from '@/lib/narration'

export type VideoRenderMethod = 'mediaRecorder' | 'webCodecs'

const RENDER_FPS = 30
const FRAME_MS = Math.ceil(1000 / RENDER_FPS)
const FRAME_DURATION_US = Math.round(1_000_000 / RENDER_FPS)
const WEBM_TIMECODE_SCALE = 1_000_000 // 1 ms
const WEBM_CLUSTER_MAX_MS = 5_000
const WEB_CODECS_MAX_QUEUE_SIZE = 2

interface UseVideoRenderOptions {
  store: AppStore
  getCanvas: () => HTMLCanvasElement | null
  triggerRedraw: () => void
  narrationSegments: NarrationSegment[]
  subtitleStyle: SubtitleStyle
}

interface EncodedFrame {
  data: Uint8Array
  timestampUs: number
  keyFrame: boolean
}

function bytes(...values: number[]) {
  return new Uint8Array(values)
}

function concatBytes(parts: Uint8Array[]) {
  const total = parts.reduce((sum, part) => sum + part.length, 0)
  const out = new Uint8Array(total)
  let offset = 0
  for (const part of parts) {
    out.set(part, offset)
    offset += part.length
  }
  return out
}

function textBytes(text: string) {
  return new TextEncoder().encode(text)
}

function uintBytes(value: number) {
  if (value === 0) return bytes(0)
  const out: number[] = []
  let next = value
  while (next > 0) {
    out.unshift(next & 0xff)
    next = Math.floor(next / 256)
  }
  return new Uint8Array(out)
}

function float64Bytes(value: number) {
  const out = new Uint8Array(8)
  new DataView(out.buffer).setFloat64(0, value, false)
  return out
}

function int16Bytes(value: number) {
  const out = new Uint8Array(2)
  new DataView(out.buffer).setInt16(0, value, false)
  return out
}

function vintSizeBytes(size: number) {
  for (let length = 1; length <= 8; length++) {
    const max = Math.pow(2, 7 * length) - 1
    if (size <= max) {
      const out = new Uint8Array(length)
      let value = size
      for (let i = length - 1; i >= 0; i--) {
        out[i] = value & 0xff
        value = Math.floor(value / 256)
      }
      out[0] |= 1 << (8 - length)
      return out
    }
  }
  throw new Error('WebM chunk is too large')
}

function ebml(id: Uint8Array, data: Uint8Array | string | number) {
  const payload = typeof data === 'string'
    ? textBytes(data)
    : typeof data === 'number'
      ? uintBytes(data)
      : data
  return concatBytes([id, vintSizeBytes(payload.length), payload])
}

function ebmlPartHeader(id: Uint8Array, payloadSize: number) {
  return concatBytes([id, vintSizeBytes(payloadSize)])
}

function ebmlParts(id: Uint8Array, payloadParts: Uint8Array[]) {
  const payloadSize = payloadParts.reduce((sum, part) => sum + part.length, 0)
  return [ebmlPartHeader(id, payloadSize), ...payloadParts]
}

function simpleBlockParts(frame: EncodedFrame, clusterTimeMs: number) {
  const relativeTime = Math.round(frame.timestampUs / 1000) - clusterTimeMs
  const blockHeader = concatBytes([
    bytes(0x81),
    int16Bytes(relativeTime),
    bytes(frame.keyFrame ? 0x80 : 0x00),
  ])
  return ebmlParts(
    bytes(0xa3),
    [blockHeader, frame.data]
  )
}

function webmClusterParts(frames: EncodedFrame[], clusterTimeMs: number) {
  return ebmlParts(
    bytes(0x1f, 0x43, 0xb6, 0x75),
    [
      ebml(bytes(0xe7), clusterTimeMs),
      ...frames.flatMap(frame => simpleBlockParts(frame, clusterTimeMs)),
    ]
  )
}

function muxVp8Webm(frames: EncodedFrame[], durationSeconds: number) {
  const header = ebml(bytes(0x1a, 0x45, 0xdf, 0xa3), concatBytes([
    ebml(bytes(0x42, 0x86), 1),
    ebml(bytes(0x42, 0xf7), 1),
    ebml(bytes(0x42, 0xf2), 4),
    ebml(bytes(0x42, 0xf3), 8),
    ebml(bytes(0x42, 0x82), 'webm'),
    ebml(bytes(0x42, 0x87), 2),
    ebml(bytes(0x42, 0x85), 2),
  ]))

  const info = ebml(bytes(0x15, 0x49, 0xa9, 0x66), concatBytes([
    ebml(bytes(0x2a, 0xd7, 0xb1), WEBM_TIMECODE_SCALE),
    ebml(bytes(0x4d, 0x80), 'artful-learning'),
    ebml(bytes(0x57, 0x41), 'artful-learning'),
    ebml(bytes(0x44, 0x89), float64Bytes(durationSeconds * 1000)),
  ]))

  const tracks = ebml(bytes(0x16, 0x54, 0xae, 0x6b), ebml(bytes(0xae), concatBytes([
    ebml(bytes(0xd7), 1),
    ebml(bytes(0x73, 0xc5), 1),
    ebml(bytes(0x83), 1),
    ebml(bytes(0x86), 'V_VP8'),
    ebml(bytes(0xe0), concatBytes([
      ebml(bytes(0xb0), OUTPUT_W),
      ebml(bytes(0xba), OUTPUT_H),
    ])),
  ])))

  const clusters: Uint8Array[] = []
  let clusterFrames: EncodedFrame[] = []
  let clusterTimeMs = 0
  for (const frame of frames) {
    const frameTimeMs = Math.round(frame.timestampUs / 1000)
    if (!clusterFrames.length) {
      clusterTimeMs = frameTimeMs
    } else if (frameTimeMs - clusterTimeMs > WEBM_CLUSTER_MAX_MS) {
      clusters.push(...webmClusterParts(clusterFrames, clusterTimeMs))
      clusterFrames = []
      clusterTimeMs = frameTimeMs
    }
    clusterFrames.push(frame)
  }
  if (clusterFrames.length) clusters.push(...webmClusterParts(clusterFrames, clusterTimeMs))

  const segmentParts = [info, tracks, ...clusters]
  return new Blob(
    [header, ebmlPartHeader(bytes(0x18, 0x53, 0x80, 0x67), segmentParts.reduce((sum, part) => sum + part.length, 0)), ...segmentParts],
    { type: 'video/webm;codecs=vp8' }
  )
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

export function useVideoRender({
  store,
  getCanvas,
  triggerRedraw,
  narrationSegments,
  subtitleStyle,
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
      const { totalDuration: td } = buildTimeline(renderPoints)
      const totalFrames = Math.ceil(td * RENDER_FPS) + 1

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
        const narText = getNarrationVisibleText(narrationSegments, t, offCtx, subtitleStyle) || undefined
        doDrawCamera(off, offCtx, store.image!, state.camera, store.backgroundSettings, state.captionPoint, false, false, { x: false, y: false }, 0, narText, subtitleStyle)
        if (editorCanvas && editorCtx) {
          doDrawCamera(editorCanvas, editorCtx, store.image!, state.camera, store.backgroundSettings, state.captionPoint, false, false, { x: false, y: false }, 0, narText, subtitleStyle)
        }
      }

      setRenderProgress(0)
      const { blob, mimeType } = method === 'webCodecs'
        ? await renderWithWebCodecs(off, drawFrame, td, totalFrames, setRenderProgress)
        : await renderWithMediaRecorder(off, drawFrame, td, totalFrames, setRenderProgress)
      if (store.lastVideoUrl) URL.revokeObjectURL(store.lastVideoUrl)
      const url = URL.createObjectURL(blob)
      store.setLastVideoUrl(url)
      const ext = method === 'webCodecs' ? 'webm' : mimeType.includes('mp4') ? 'mp4' : 'webm'
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
  }, [store, getCanvas, triggerRedraw, narrationSegments, subtitleStyle])

  return { renderVideo, renderProgress }
}

async function renderWithMediaRecorder(
  canvas: HTMLCanvasElement,
  drawFrame: (time: number) => void,
  totalDuration: number,
  totalFrames: number,
  setRenderProgress: (progress: number) => void,
) {
  // captureStream(0) = manual frame mode: frames are only captured when
  // requestFrame() is explicitly called. This is necessary for offscreen
  // canvases because the browser's compositor never visits them, so
  // captureStream(N) with a non-zero rate never actually samples any pixels,
  // causing the stream to produce no data and recorder.onstop to hang forever.
  const stream = canvas.captureStream(0)
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

    // Fixed-step render: t = frame / FPS — each frame is explicitly pushed to the
    // stream via requestFrame(), ensuring reliable capture for offscreen canvases.
    for (let frame = 0; frame < totalFrames; frame++) {
      drawFrame(Math.min(frame / RENDER_FPS, totalDuration))
      captureTrack.requestFrame?.()
      reportProgress(frame, totalFrames)
      if (frame < totalFrames - 1) await wait(FRAME_MS)
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
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const VideoEncoderCtor = (globalThis as any).VideoEncoder
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const VideoFrameCtor = (globalThis as any).VideoFrame
  if (!VideoEncoderCtor || !VideoFrameCtor) {
    throw new Error('此瀏覽器不支援 WebCodecs VideoEncoder。')
  }

  const chunks: EncodedFrame[] = []
  const errors: Error[] = []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let encoder: any | null = new VideoEncoderCtor({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    output: (chunk: any) => {
      const data = new Uint8Array(chunk.byteLength)
      chunk.copyTo(data)
      chunks.push({
        data,
        timestampUs: Number(chunk.timestamp ?? 0),
        keyFrame: chunk.type === 'key',
      })
    },
    error: (error: Error) => errors.push(error),
  })
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
  try {
    encoder.configure(config)

    for (let frame = 0; frame < totalFrames; frame++) {
      drawFrame(Math.min(frame / RENDER_FPS, totalDuration))
      const videoFrame = new VideoFrameCtor(canvas, {
        timestamp: frame * FRAME_DURATION_US,
        duration: FRAME_DURATION_US,
      })
      encoder.encode(videoFrame, { keyFrame: frame % (RENDER_FPS * 2) === 0 })
      videoFrame.close()
      await waitForEncoderQueue(encoder, WEB_CODECS_MAX_QUEUE_SIZE)
      reportProgress(frame, totalFrames)
      if (frame % 10 === 0) await wait(0)
      if (errors.length) throw errors[0]
    }

    await encoder.flush()
    if (errors.length) throw errors[0]
  } finally {
    encoder?.close()
    encoder = null
  }

  return {
    blob: muxVp8Webm(chunks, totalDuration),
    mimeType: 'video/webm;codecs=vp8',
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
