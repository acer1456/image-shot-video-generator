import { useCallback, useState } from 'react'
import { useAppStore } from '@/hooks/useAppStore'
import { buildTimeline, drawCamera as doDrawCamera, getTimelineStateAt } from '@/lib/canvas'
import { OUTPUT_W, OUTPUT_H, sanitizeFileName, getTodayString, wait, getBestVideoMimeType } from '@/lib/utils'
import { convertPointsCaptions, type ChineseConversion } from '@/lib/chinese'

export function useVideoRender(
  getCanvas: () => HTMLCanvasElement | null,
  triggerRedraw: () => void,
) {
  const store = useAppStore()
  const [renderProgress, setRenderProgress] = useState(0)

  const renderVideo = useCallback(async (captionConversion: ChineseConversion = 'original') => {
    if (!store.image || !store.points.length || store.isRendering) return
    store.setIsRendering(true)
    store.setIsPreviewing(false)
    try {
      const renderPoints = captionConversion === 'original'
        ? store.points
        : convertPointsCaptions(store.points, captionConversion)
      const { totalDuration: td } = buildTimeline(renderPoints)
      const RENDER_FPS = 30
      const FRAME_MS = Math.ceil(1000 / RENDER_FPS) // ~34 ms per frame
      const totalFrames = Math.ceil(td * RENDER_FPS) + 1

      // Dedicated offscreen canvas — isolated from the editor canvas.
      // captureStream(0) = manual frame mode, necessary for offscreen canvases.
      const off = document.createElement('canvas')
      off.width = OUTPUT_W
      off.height = OUTPUT_H
      const offCtx = off.getContext('2d')!

      const editorCanvas = getCanvas()
      const editorCtx = editorCanvas?.getContext('2d') ?? null

      const drawFrame = (t: number) => {
        const state = getTimelineStateAt(store.image!, renderPoints, t)
        if (!state) return
        doDrawCamera(off, offCtx, store.image!, state.camera, store.backgroundSettings, state.captionPoint, false, false, { x: false, y: false })
        if (editorCanvas && editorCtx) {
          doDrawCamera(editorCanvas, editorCtx, store.image!, state.camera, store.backgroundSettings, state.captionPoint, false, false, { x: false, y: false })
        }
      }

      const stream = off.captureStream(0)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const captureTrack = stream.getVideoTracks()[0] as any
      const chunks: BlobPart[] = []
      const mimeType = getBestVideoMimeType()
      const recorder = new MediaRecorder(stream, { mimeType })
      recorder.ondataavailable = event => { if (event.data.size > 0) chunks.push(event.data) }
      const done = new Promise<void>((resolve, reject) => {
        recorder.onstop = () => resolve()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        recorder.onerror = (e: Event) => reject(new Error('MediaRecorder: ' + ((e as any).error?.message ?? 'unknown error')))
      })
      recorder.start()

      setRenderProgress(0)
      for (let frame = 0; frame < totalFrames; frame++) {
        drawFrame(Math.min(frame / RENDER_FPS, td))
        captureTrack.requestFrame?.()
        setRenderProgress(Math.round((frame + 1) / totalFrames * 100))
        if (frame < totalFrames - 1) await wait(FRAME_MS)
      }

      await wait(300)
      recorder.stop()
      await done
      stream.getTracks().forEach(track => track.stop())

      const blob = new Blob(chunks, { type: mimeType })
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
  }, [store, getCanvas, triggerRedraw])

  return { renderVideo, renderProgress }
}
