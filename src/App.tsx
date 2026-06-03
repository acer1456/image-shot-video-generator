import { useRef, useCallback, useState, useEffect } from 'react'
import { ThemeProvider } from 'next-themes'
import CanvasEditor from '@/components/CanvasEditor'
import TimelinePanel from '@/components/TimelinePanel'
import type { TimelinePanelHandle } from '@/components/TimelinePanel'
import AiGeneratePanel from '@/components/AiGeneratePanel'
import { MasterworkPickerModal } from '@/components/MasterworkPickerModal'
import { AppToolbar } from '@/components/AppToolbar'
import { CanvasSection } from '@/components/CanvasSection'
import { EditorSidebar } from '@/components/EditorSidebar'
import { NarrationSidebar } from '@/components/NarrationSidebar'
import { ImmersiveOverlay } from '@/components/ImmersiveOverlay'
import { Button } from '@/components/ui/button'
import { useAppStore, normalizePoint } from '@/hooks/useAppStore'
import type { CameraPoint, CaptionData, DragState, ActiveTab, NarrationSegment, SubtitleStyle } from '@/types'
import { DEFAULT_SUBTITLE_STYLE } from '@/types'
import {
  clamp, normalizeProjectName,
  sanitizeFileName, getTodayString, nextFrame, wait,
  getBestVideoMimeType,
} from '@/lib/utils'
import {
  drawCamera as doDrawCamera,
  getTimelineStateAt, buildTimeline,
  wrapWordsToLines,
} from '@/lib/canvas'
import { convertPointsCaptions, type ChineseConversion } from '@/lib/chinese'
import type { AiGenerateResult } from '@/lib/openrouter'
import { OUTPUT_W, OUTPUT_H } from '@/lib/utils'

const AUTOSAVE_KEY = 'artful_autosave'

// Returns the visible (accumulated) text for narration subtitles at a given time.
// Characters reveal linearly across the segment duration.
/** Split words into groups of up to wordsPerLine words each (line heuristic). */
function splitToLineGroups(words: string[], wordsPerLine = 4): string[][] {
  const groups: string[][] = []
  for (let i = 0; i < words.length; i += wordsPerLine) {
    groups.push(words.slice(i, i + wordsPerLine))
  }
  return groups
}

/**
 * Returns the visible (progressive-reveal) narration subtitle text at the given time.
 *
 * When measureCtx + measureStyle are provided the card boundaries are built using
 * the SAME pixel-measured word-wrap as drawNarrationSubtitle, so every word that
 * belongs to a card is guaranteed to fit within 2 rendered lines.  No words are
 * ever lost due to a line-count cap in the renderer.
 *
 * When measureCtx is absent (e.g. during SSR or unit tests) the function falls back
 * to the 4-words-per-line heuristic.
 */
function getNarrationVisibleText(
  segs: NarrationSegment[],
  time: number,
  measureCtx?: CanvasRenderingContext2D | null,
  measureStyle?: SubtitleStyle | null,
): string {
  const seg = segs.find(s => time >= s.startTime && time < s.startTime + s.duration)
  if (!seg || !seg.text) return ''
  const words = seg.text.split(' ').filter(w => w.length > 0)
  if (!words.length) return ''
  const elapsed = time - seg.startTime

  // ── Card building ────────────────────────────────────────────────────────────
  // A "card" is the group of words shown during one display window (≤ 2 rendered
  // lines).  Cards must be built with the same wrapping logic used by the renderer
  // so that every word in a card is guaranteed to appear on screen.
  let cardWordLists: string[][]

  if (measureCtx) {
    // Pixel-aware path: measure with the exact same font as drawNarrationSubtitle.
    const sizeRatio = measureStyle?.fontSizeRatio ?? 0.055
    const fontFamily = measureStyle?.fontFamily ?? "Georgia, 'Times New Roman', serif"
    const fontSize = Math.round(OUTPUT_W * sizeRatio)
    const sidePadding = Math.round(OUTPUT_W * 0.06)
    const maxLineWidth = OUTPUT_W - sidePadding * 2
    const prevFont = measureCtx.font
    measureCtx.font = `700 ${fontSize}px ${fontFamily}`
    const allLines = wrapWordsToLines(words, measureCtx, maxLineWidth)
    measureCtx.font = prevFont  // restore canvas state
    // Group pixel-wrapped lines into cards of ≤ 2 lines each.
    cardWordLists = []
    for (let i = 0; i < allLines.length; i += 2) {
      cardWordLists.push(
        allLines.slice(i, i + 2).join(' ').split(' ').filter(w => w.length > 0)
      )
    }
  } else {
    // Fallback: 4 words per line, 2 lines per card (character heuristic).
    const lineGroups = splitToLineGroups(words, 4)
    cardWordLists = []
    for (let i = 0; i < lineGroups.length; i += 2) {
      cardWordLists.push(lineGroups.slice(i, i + 2).flat())
    }
  }

  // ── Timing ───────────────────────────────────────────────────────────────────
  // Time budget per card proportional to its character count.
  const cardChars = cardWordLists.map(wl => wl.reduce((s, w) => s + Math.max(w.length, 1), 0))
  const totalChars = cardChars.reduce((a, b) => a + b, 0)
  let cumChars = 0
  const cardOnsets = cardChars.map(count => {
    const onset = (cumChars / totalChars) * seg.duration
    cumChars += count
    return onset
  })

  // Small advance (100 ms) to compensate for visual perception lag.
  const effectiveElapsed = elapsed + 0.1

  let cardIndex = 0
  for (let i = 0; i < cardOnsets.length; i++) {
    if (cardOnsets[i] <= effectiveElapsed) cardIndex = i
  }

  const cardWords = cardWordLists[cardIndex]
  const cardStart = cardOnsets[cardIndex]
  const cardEnd = cardIndex + 1 < cardOnsets.length ? cardOnsets[cardIndex + 1] : seg.duration
  const cardDuration = Math.max(cardEnd - cardStart, 0.01)

  // ── Progressive word reveal within the card ───────────────────────────────
  const wordChars = cardWords.map(w => Math.max(w.length, 1))
  const cardTotalChars = wordChars.reduce((a, b) => a + b, 0)
  let cumWordChars = 0
  const wordOnsets = wordChars.map(count => {
    const onset = cardStart + (cumWordChars / cardTotalChars) * cardDuration
    cumWordChars += count
    return onset
  })

  let wordsToShow = 1
  for (let i = 0; i < wordOnsets.length; i++) {
    if (wordOnsets[i] <= effectiveElapsed) wordsToShow = i + 1
  }
  return cardWords.slice(0, wordsToShow).join(' ')
}

/** Returns the full text of the narration segment at the given time (no progressive reveal). */
function getNarrationFullText(segs: NarrationSegment[], time: number): string {
  const seg = segs.find(s => time >= s.startTime && time < s.startTime + s.duration)
  return seg?.text ?? ''
}

// Schedule narration audio segments from the given start time using Web Audio API.
function scheduleNarrationAudio(
  segs: NarrationSegment[],
  fromTime: number,
  ctxRef: React.MutableRefObject<AudioContext | null>,
  sourcesRef: React.MutableRefObject<AudioBufferSourceNode[]>
) {
  // Stop previously scheduled sources
  for (const src of sourcesRef.current) { try { src.stop() } catch { /* already stopped */ } }
  sourcesRef.current = []
  if (!segs.length) return
  if (!ctxRef.current || ctxRef.current.state === 'closed') {
    ctxRef.current = new AudioContext()
  }
  const ctx = ctxRef.current
  for (const seg of segs) {
    if (!seg.audioData || !seg.samplingRate) continue
    if (seg.startTime + seg.duration <= fromTime) continue  // already past
    const buffer = ctx.createBuffer(1, seg.audioData.length, seg.samplingRate)
    buffer.copyToChannel(seg.audioData, 0)
    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.connect(ctx.destination)
    const delay = seg.startTime - fromTime
    if (delay >= 0) {
      source.start(ctx.currentTime + delay)
    } else {
      const offset = Math.min(-delay, seg.duration - 0.01)
      source.start(ctx.currentTime, offset)
    }
    sourcesRef.current.push(source)
  }
}

function stopNarrationAudio(sourcesRef: React.MutableRefObject<AudioBufferSourceNode[]>) {
  for (const src of sourcesRef.current) { try { src.stop() } catch { /* already stopped */ } }
  sourcesRef.current = []
}

function AppInner() {
  const store = useAppStore()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const loadProjectInputRef = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const dragStateRef = useRef<DragState | null>(null)
  const currentTimeRef = useRef(0)
  const previewCancelRef = useRef(false)
  const timelinePanelRef = useRef<TimelinePanelHandle>(null)
  const lastUiUpdateRef = useRef(0)
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [snapGuide, setSnapGuide] = useState({ x: false, y: false })
  const [forceRedraw, setForceRedraw] = useState(0)
  const [showRestoreModal, setShowRestoreModal] = useState(false)
  const [pendingRestore, setPendingRestore] = useState<Record<string, unknown> | null>(null)
  const [totalDuration, setTotalDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [isImmersiveMode, setIsImmersiveMode] = useState(false)
  const [isImmersiveLeaving, setIsImmersiveLeaving] = useState(false)
  const [isAiPanelOpen, setIsAiPanelOpen] = useState(false)
  const [isMasterworkPickerOpen, setIsMasterworkPickerOpen] = useState(false)
  const [loadingPainting, setLoadingPainting] = useState(false)
  const [activeCaptionIndex, setActiveCaptionIndex] = useState(0)
  const [renderProgress, setRenderProgress] = useState(0)
  const [isTimelineExpanded, setIsTimelineExpanded] = useState(false)
  const [narrationSegments, setNarrationSegments] = useState<NarrationSegment[]>([])
  const [narrationInputText, setNarrationInputText] = useState('')
  const [subtitleStyle, setSubtitleStyle] = useState<SubtitleStyle>(DEFAULT_SUBTITLE_STYLE)
  const [isNarrationCollapsed, setIsNarrationCollapsed] = useState(false)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const narrationSourcesRef = useRef<AudioBufferSourceNode[]>([])

  useEffect(() => { setActiveCaptionIndex(0) }, [store.activeIndex])

  // 啟動時檢查是否有自動暫存資料
  useEffect(() => {
    const saved = localStorage.getItem(AUTOSAVE_KEY)
    if (!saved) return
    try {
      const data = JSON.parse(saved) as Record<string, unknown>
      const hasContent = (Array.isArray(data.points) && (data.points as unknown[]).length > 0) || !!data.image
      if (data.app === 'auto-art-camera-tour' && hasContent) {
        setPendingRestore(data)
        setShowRestoreModal(true)
      } else {
        localStorage.removeItem(AUTOSAVE_KEY)
      }
    } catch {
      localStorage.removeItem(AUTOSAVE_KEY)
    }
  }, [])

  // 自動暫存（防抖 2 秒）
  useEffect(() => {
    if (!store.points.length && !store.image) return
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current)
    autosaveTimerRef.current = setTimeout(() => {
      try {
        let imageDataUrl: string | null = null
        if (store.image) {
          const tmp = document.createElement('canvas')
          tmp.width = store.image.width; tmp.height = store.image.height
          tmp.getContext('2d')!.drawImage(store.image, 0, 0)
          imageDataUrl = tmp.toDataURL('image/jpeg', 0.7)
        }
        const data = {
          app: 'auto-art-camera-tour', version: 1,
          name: store.projectName, savedAt: new Date().toISOString(),
          image: imageDataUrl ? { dataUrl: imageDataUrl, width: store.image!.width, height: store.image!.height } : null,
          backgroundSettings: store.backgroundSettings,
          activeIndex: store.activeIndex, activeTab: store.activeTab,
          points: store.points,
          narrationInputText,
          narrationSegments: narrationSegments.map(({ id, text, startTime, duration, samplingRate }) => ({ id, text, startTime, duration, samplingRate })),
          subtitleStyle,
        }
        try {
          localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(data))
        } catch {
          // 空間不足時不含圖片重試
          localStorage.setItem(AUTOSAVE_KEY, JSON.stringify({ ...data, image: null }))
        }
      } catch (err) {
        console.warn('[autosave]', err)
      }
    }, 2000)
    return () => { if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current) }
  }, [store.points, store.image, store.projectName, store.backgroundSettings, store.activeIndex, store.activeTab, narrationSegments, narrationInputText, subtitleStyle])

  const triggerRedraw = useCallback(() => setForceRedraw(n => n + 1), [])

  const handleRestoreAutosave = useCallback(() => {
    if (!pendingRestore) return
    const project = pendingRestore
    store.setProjectName(normalizeProjectName(String(project.name || '未命名專案')))
    store.setBackgroundSettings({
      mode: (project.backgroundSettings as Record<string, unknown>)?.mode === 'blur' ? 'blur' : 'color',
      color: String((project.backgroundSettings as Record<string, unknown>)?.color || '#000000'),
      blur: clamp(Number((project.backgroundSettings as Record<string, unknown>)?.blur ?? 18), 0, 50),
    })
    const pts: CameraPoint[] = Array.isArray(project.points)
      ? (project.points as Partial<CameraPoint>[]).map(normalizePoint) : []
    store.setPoints(pts)
    store.setActiveIndex(clamp(Number(project.activeIndex ?? -1), -1, Math.max(-1, pts.length - 1)))
    const tab: ActiveTab = ['camera', 'caption', 'assist'].includes(String(project.activeTab))
      ? project.activeTab as ActiveTab : 'camera'
    store.setActiveTab(tab)
    const img = project.image as Record<string, unknown> | null
    if (img?.dataUrl) store.loadImageDataUrl(String(img.dataUrl))
    else triggerRedraw()
    // Restore narration input text
    if (typeof project.narrationInputText === 'string') setNarrationInputText(project.narrationInputText)
    // Restore narration segments (metadata only; audio must be regenerated)
    if (Array.isArray(project.narrationSegments)) {
      setNarrationSegments((project.narrationSegments as Partial<NarrationSegment>[]).map(s => ({
        id: String(s.id ?? crypto.randomUUID()),
        text: String(s.text ?? ''),
        startTime: Number(s.startTime ?? 0),
        duration: Number(s.duration ?? 0),
        samplingRate: s.samplingRate != null ? Number(s.samplingRate) : undefined,
        audioData: undefined,
      })))
    }
    // Restore subtitle style
    if (project.subtitleStyle && typeof project.subtitleStyle === 'object') {
      const s = project.subtitleStyle as Record<string, unknown>
      setSubtitleStyle({
        fontFamily: typeof s.fontFamily === 'string' ? s.fontFamily : DEFAULT_SUBTITLE_STYLE.fontFamily,
        fontSizeRatio: typeof s.fontSizeRatio === 'number' ? s.fontSizeRatio : DEFAULT_SUBTITLE_STYLE.fontSizeRatio,
        shadowEnabled: typeof s.shadowEnabled === 'boolean' ? s.shadowEnabled : DEFAULT_SUBTITLE_STYLE.shadowEnabled,
        shadowBlur: typeof s.shadowBlur === 'number' ? s.shadowBlur : DEFAULT_SUBTITLE_STYLE.shadowBlur,
        shadowOpacity: typeof s.shadowOpacity === 'number' ? s.shadowOpacity : DEFAULT_SUBTITLE_STYLE.shadowOpacity,
        subtitlePosition: s.subtitlePosition && typeof (s.subtitlePosition as Record<string, unknown>).x === 'number'
          ? s.subtitlePosition as { x: number; y: number }
          : DEFAULT_SUBTITLE_STYLE.subtitlePosition,
      })
    }
    setPendingRestore(null)
    setShowRestoreModal(false)
  }, [pendingRestore, store, triggerRedraw])

  const handleDiscardAutosave = useCallback(() => {
    localStorage.removeItem(AUTOSAVE_KEY)
    setPendingRestore(null)
    setShowRestoreModal(false)
  }, [])

  const loadImageFromUrl = useCallback(async (url: string, title: string) => {
    setLoadingPainting(true)
    try {
      const safeUrl = url.replace(/^http:\/\//, 'https://')
      let blob: Blob | undefined
      try {
        const res = await fetch(safeUrl)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        blob = await res.blob()
      } catch {
        const proxyUrl = `https://images.weserv.nl/?url=${encodeURIComponent(safeUrl)}&w=1600&output=jpg`
        const res2 = await fetch(proxyUrl)
        if (!res2.ok) throw new Error(`proxy HTTP ${res2.status}`)
        blob = await res2.blob()
      }
      const ext = safeUrl.split('.').pop()?.split('?')[0]?.toLowerCase() ?? 'jpg'
      const file = new File([blob], `${title}.${ext}`, { type: blob.type || 'image/jpeg' })
      store.loadImageFile(file, !store.image, store.imageUrl)
    } catch (err) {
      console.error('[loadImageFromUrl]', err)
      alert('載入名畫失敗，請稍後再試')
    } finally {
      setLoadingPainting(false)
    }
  }, [store])

  // Sync total duration whenever points change
  useEffect(() => {
    const { totalDuration: td } = buildTimeline(store.points)
    setTotalDuration(td)
  }, [store.points])

  // ---------- Canvas drawing helpers exposed to parent ----------
  const getCanvas = useCallback((): HTMLCanvasElement | null => {
    if (canvasRef.current) return canvasRef.current
    const el = document.querySelector('canvas') as HTMLCanvasElement | null
    canvasRef.current = el
    return el
  }, [])

  const drawTimelineTime = useCallback((time: number, guides: boolean) => {
    const canvas = getCanvas()
    if (!canvas || !store.image) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const state = getTimelineStateAt(store.image, store.points, time)
    if (!state) return
    store.setActiveIndex(state.pointIndex)
    const narrationText = getNarrationVisibleText(narrationSegments, time, ctx, subtitleStyle)
    doDrawCamera(canvas, ctx, store.image, state.camera, store.backgroundSettings, state.captionPoint, guides && store.showCaptionBox, store.showCaptionBox, snapGuide, 0, narrationText || undefined, subtitleStyle)
  }, [getCanvas, store, snapGuide, narrationSegments])

  const getPointFocusTime = useCallback((pointIndex: number) => {
    const { items } = buildTimeline(store.points)
    const holdItem = items.find(item => item.pointIndex === pointIndex && item.type === 'hold')
    if (holdItem) return holdItem.start
    const moveItem = items.find(item => item.pointIndex === pointIndex && item.type === 'move')
    if (moveItem) return moveItem.start
    return 0
  }, [store.points])

  const selectPointAndSyncTimeline = useCallback((pointIndex: number) => {
    if (pointIndex < 0) {
      store.setActiveIndex(-1)
      triggerRedraw()
      return
    }
    if (pointIndex >= store.points.length) return
    previewCancelRef.current = true
    store.setIsPreviewing(false)
    store.setActiveIndex(pointIndex)
    const t = getPointFocusTime(pointIndex)
    drawTimelineTime(t, store.showGuidesInPreview)
    timelinePanelRef.current?.setTimeCursor(t)
    timelinePanelRef.current?.revealTime(t)
    currentTimeRef.current = t
    setCurrentTime(t)
    triggerRedraw()
  }, [store, getPointFocusTime, drawTimelineTime, triggerRedraw])

  // ---------- Preview ----------
  const previewPath = useCallback(async () => {
    if (!store.image || !store.points.length || store.isRendering) return
    previewCancelRef.current = false
    store.setIsPreviewing(true)
    // Start from current cursor position (not always from 0)
    const startTime = currentTimeRef.current >= totalDuration ? 0 : currentTimeRef.current
    // Schedule narration audio from the start position
    scheduleNarrationAudio(narrationSegments, startTime, audioCtxRef, narrationSourcesRef)
    const wallStart = performance.now()
    while (true) {
      if (previewCancelRef.current) break
      const elapsed = (performance.now() - wallStart) / 1000
      const t = Math.min(startTime + elapsed, totalDuration)
      drawTimelineTime(t, store.showGuidesInPreview)
      // Move cursor imperatively every frame — no React re-render needed
      timelinePanelRef.current?.setTimeCursor(t)
      timelinePanelRef.current?.revealTime(t, false)
      currentTimeRef.current = t
      // Throttle React state update (~15fps) — only drives the time display text
      const now = performance.now()
      if (now - lastUiUpdateRef.current >= 66) {
        setCurrentTime(t)
        lastUiUpdateRef.current = now
      }
      if (t >= totalDuration) break
      await nextFrame()
    }
    stopNarrationAudio(narrationSourcesRef)
    // Final accurate update for time display and cursor after playback ends
    setCurrentTime(currentTimeRef.current)
    timelinePanelRef.current?.setTimeCursor(currentTimeRef.current)
    store.setIsPreviewing(false)
    triggerRedraw()
  }, [store, totalDuration, drawTimelineTime, triggerRedraw, narrationSegments])

  // ---------- Render video ----------
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

      // captureStream(0) = manual frame mode: frames are only captured when
      // requestFrame() is explicitly called. This is necessary for offscreen
      // canvases because the browser's compositor never visits them, so
      // captureStream(N) with a non-zero rate never actually samples any pixels,
      // causing the stream to produce no data and recorder.onstop to hang forever.
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
      // Fixed-step render: t = frame / FPS — each frame is explicitly pushed to the
      // stream via requestFrame(), ensuring reliable capture for offscreen canvases.
      for (let frame = 0; frame < totalFrames; frame++) {
        drawFrame(Math.min(frame / RENDER_FPS, td))
        captureTrack.requestFrame?.()
        setRenderProgress(Math.round((frame + 1) / totalFrames * 100))
        if (frame < totalFrames - 1) await wait(FRAME_MS)
      }

      // Give the stream enough time to capture the final frame before stopping.
      await wait(300)
      recorder.stop()
      await done
      // Explicitly stop the track so the canvas is no longer held by this stream.
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
  }, [store, getCanvas, triggerRedraw, narrationSegments])
  const saveProject = useCallback(async () => {
    try {
      const name = normalizeProjectName(store.projectName)
      let imageDataUrl: string | null = null
      if (store.image) {
        const tmp = document.createElement('canvas')
        tmp.width = store.image.width; tmp.height = store.image.height
        tmp.getContext('2d')!.drawImage(store.image, 0, 0)
        imageDataUrl = tmp.toDataURL('image/png')
      }
      const project = {
        app: 'auto-art-camera-tour', version: 1, name,
        savedAt: new Date().toISOString(),
        output: { width: OUTPUT_W, height: OUTPUT_H, ratio: '9:16' },
        image: imageDataUrl ? { dataUrl: imageDataUrl, width: store.image!.width, height: store.image!.height } : null,
        backgroundSettings: store.backgroundSettings,
        activeIndex: store.activeIndex,
        activeTab: store.activeTab,
        points: store.points
      }
      const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = `${sanitizeFileName(name)}-${getTodayString()}.json`
      document.body.appendChild(a); a.click(); a.remove()
      URL.revokeObjectURL(url)
    } catch (err) { console.error(err); alert('保存失敗') }
  }, [store])

  const loadProject = useCallback(async (file: File) => {
    try {
      const text = await file.text()
      const project = JSON.parse(text)
      if (project.app !== 'auto-art-camera-tour') throw new Error('不是正確的專案檔')
      store.setProjectName(normalizeProjectName(project.name || '未命名專案'))
      store.setBackgroundSettings({
        mode: project.backgroundSettings?.mode === 'blur' ? 'blur' : 'color',
        color: project.backgroundSettings?.color || '#111827',
        blur: clamp(Number(project.backgroundSettings?.blur ?? 18), 0, 50)
      })
      const pts: CameraPoint[] = Array.isArray(project.points)
        ? project.points.map(normalizePoint) : []
      store.setPoints(pts)
      const ai = clamp(Number(project.activeIndex ?? -1), -1, Math.max(-1, pts.length - 1))
      store.setActiveIndex(ai)
      const tab: ActiveTab = ['camera', 'caption', 'assist'].includes(project.activeTab) ? project.activeTab : 'camera'
      store.setActiveTab(tab)
      if (project.image?.dataUrl) store.loadImageDataUrl(project.image.dataUrl)
      else triggerRedraw()
    } catch (err) { console.error(err); alert('載入失敗：請確認檔案正確') }
  }, [store, triggerRedraw])

  // ---------- Point management helpers ----------
  const handlePointAdd = useCallback((x: number, y: number) => {
    store.addPoint(x, y, store.points, store.lastCaptionStyle, store.lastCameraSettings)
    triggerRedraw()
  }, [store, triggerRedraw])

  const handlePointMove = useCallback((index: number, x: number, y: number) => {
    const next = store.updatePointField(index, 'x', x, store.points)
    store.updatePointField(index, 'y', y, next)
    triggerRedraw()
  }, [store, triggerRedraw])

  const handlePointResize = useCallback((index: number, zoom: number) => {
    store.updatePointField(index, 'zoom', zoom, store.points)
    store.rememberCameraSettings(index, store.points)
    triggerRedraw()
  }, [store, triggerRedraw])

  const handleCaptionMove = useCallback((index: number, captionIndex: number, x: number, y: number) => {
    if (captionIndex === 0) {
      const next = store.updateCaptionField(index, 'x', x, store.points)
      store.updateCaptionField(index, 'y', y, next)
      store.rememberCaptionStyle(index, next)
    } else {
      const extraIndex = captionIndex - 1
      const next = store.updateExtraCaptionField(index, extraIndex, 'x', x, store.points)
      store.updateExtraCaptionField(index, extraIndex, 'y', y, next)
    }
    triggerRedraw()
  }, [store, triggerRedraw])

  const handleCaptionFontResize = useCallback((index: number, captionIndex: number, scale: number) => {
    if (captionIndex === 0) {
      const next = store.updateCaptionField(index, 'scale', scale, store.points)
      store.updateCaptionField(index, 'subtitleScale', scale, next)
      store.rememberCaptionStyle(index, next)
    } else {
      const extraIndex = captionIndex - 1
      const next = store.updateExtraCaptionField(index, extraIndex, 'scale', scale, store.points)
      store.updateExtraCaptionField(index, extraIndex, 'subtitleScale', scale, next)
    }
    triggerRedraw()
  }, [store, triggerRedraw])

  const handleCaptionBoxWidth = useCallback((index: number, captionIndex: number, boxScaleX: number) => {
    if (captionIndex === 0) {
      store.updateCaptionField(index, 'boxScaleX', boxScaleX, store.points)
    } else {
      store.updateExtraCaptionField(index, captionIndex - 1, 'boxScaleX', boxScaleX, store.points)
    }
    triggerRedraw()
  }, [store, triggerRedraw])

  const handleCaptionBoxHeight = useCallback((index: number, captionIndex: number, boxScaleY: number) => {
    if (captionIndex === 0) {
      store.updateCaptionField(index, 'boxScaleY', boxScaleY, store.points)
    } else {
      store.updateExtraCaptionField(index, captionIndex - 1, 'boxScaleY', boxScaleY, store.points)
    }
    triggerRedraw()
  }, [store, triggerRedraw])

  const handleUpdateCaption = useCallback(<K extends keyof CaptionData>(field: K, value: CaptionData[K]) => {
    if (store.activeIndex < 0) return
    if (activeCaptionIndex === 0) {
      const next = store.updateCaptionField(store.activeIndex, field, value, store.points)
      store.rememberCaptionStyle(store.activeIndex, next)
    } else {
      store.updateExtraCaptionField(store.activeIndex, activeCaptionIndex - 1, field, value, store.points)
    }
    triggerRedraw()
  }, [store, activeCaptionIndex, triggerRedraw])

  const handleUpdateHold = useCallback((value: number) => {
    if (store.activeIndex < 0) return
    store.updatePointField(store.activeIndex, 'holdDuration', value, store.points)
    triggerRedraw()
  }, [store, triggerRedraw])

  const handleAddCaption = useCallback(() => {
    if (store.activeIndex < 0) return
    const curExtrasLen = store.points[store.activeIndex]?.extraCaptions?.length || 0
    store.addExtraCaption(store.activeIndex, store.points)
    setActiveCaptionIndex(curExtrasLen + 1)
    triggerRedraw()
  }, [store, triggerRedraw])

  const handleDeleteCaption = useCallback((extraIndex: number) => {
    if (store.activeIndex < 0) return
    store.removeExtraCaption(store.activeIndex, extraIndex, store.points)
    setActiveCaptionIndex(0)
    triggerRedraw()
  }, [store, triggerRedraw])

  const handleUpdatePointField = useCallback(<K extends keyof CameraPoint>(index: number, field: K, value: CameraPoint[K]) => {
    const next = store.updatePointField(index, field, value, store.points)
    store.rememberCameraSettings(index, next)
    triggerRedraw()
  }, [store, triggerRedraw])

  const handleInsertAfter = useCallback((afterIndex: number) => {
    store.insertPointAfter(afterIndex, store.points, store.lastCaptionStyle, store.lastCameraSettings)
    triggerRedraw()
  }, [store, triggerRedraw])

  const handleDuplicatePoint = useCallback((index: number) => {
    store.duplicatePoint(index, store.points)
    triggerRedraw()
  }, [store, triggerRedraw])

  const handleAiGenerated = useCallback((result: AiGenerateResult) => {
    const newPoints = result.points.map(p => {
      const pt = normalizePoint({
        x: p.x, y: p.y, zoom: p.zoom,
        move: p.move, moveDuration: p.moveDuration, holdDuration: p.holdDuration,
      })
      pt.caption.text     = p.caption.text
      pt.caption.subtitle  = p.caption.subtitle
      if (p.caption.captionX != null) pt.caption.x = Math.max(0, Math.min(1, p.caption.captionX))
      if (p.caption.captionY != null) pt.caption.y = Math.max(0, Math.min(1, p.caption.captionY))
      return pt
    })
    store.setPoints(newPoints)
    store.setActiveIndex(0)
    store.setActiveTab('camera')
    triggerRedraw()
  }, [store, triggerRedraw])

  const handleReorderPoints = useCallback((newPoints: CameraPoint[], newActiveIndex: number) => {
    store.reorderPoints(newPoints, newActiveIndex)
    triggerRedraw()
  }, [store, triggerRedraw])

  // ---------- Fullscreen ----------
  const requestFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen()
    } else {
      document.documentElement.requestFullscreen()
    }
  }, [])

  const openImmersiveMode = useCallback(() => {
    if (!store.image || store.isRendering) return
    previewCancelRef.current = true
    store.setIsPreviewing(false)
    store.setActiveTab('camera')
    setIsImmersiveMode(true)
    triggerRedraw()
  }, [store, triggerRedraw])

  const closeImmersiveMode = useCallback(() => {
    setIsImmersiveLeaving(true)
    setTimeout(() => {
      setIsImmersiveMode(false)
      setIsImmersiveLeaving(false)
      setSnapGuide({ x: false, y: false })
      triggerRedraw()
    }, 210)
  }, [triggerRedraw])

  useEffect(() => {
    if (!isImmersiveMode) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeImmersiveMode()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isImmersiveMode, closeImmersiveMode])

  // ---------- Global Space = play / pause ----------
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== ' ') return
      const tag = (event.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if ((event.target as HTMLElement).isContentEditable) return
      event.preventDefault()
      if (store.isRendering) return
      if (store.isPreviewing) {
        previewCancelRef.current = true
        store.setIsPreviewing(false)
      } else {
        previewPath()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [store, previewPath])

  // ---------- Render ----------
  const activePoint = store.points[store.activeIndex] || null
  const isDisabled = store.isRendering

  const canvasEditorProps = {
    image: store.image,
    points: store.points,
    activeIndex: store.activeIndex,
    activeTab: store.activeTab,
    backgroundSettings: store.backgroundSettings,
    safeAreaVisibility: store.safeAreaVisibility,
    showAllPoints: store.showAllPoints,
    onlyActiveBox: store.onlyActiveBox,
    showCaptionBox: store.showCaptionBox,
    showGuidesInPreview: store.showGuidesInPreview,
    isRendering: store.isRendering,
    isPreviewing: store.isPreviewing,
    onPointAdd: handlePointAdd,
    onPointMove: handlePointMove,
    onPointResize: handlePointResize,
    onPointSelect: selectPointAndSyncTimeline,
    onCaptionMove: handleCaptionMove,
    onCaptionFontResize: handleCaptionFontResize,
    onCaptionBoxWidth: handleCaptionBoxWidth,
    onCaptionBoxHeight: handleCaptionBoxHeight,
    onDragEnd: triggerRedraw,
    onPointDelete: (i: number) => { store.removePoint(i, store.points, store.activeIndex); triggerRedraw() },
    onEnterCaption: () => { store.setActiveTab('caption'); triggerRedraw() },
    onBackToCamera: () => { store.setActiveTab('camera'); triggerRedraw() },
    activeCaptionIndex,
    onCaptionSelect: setActiveCaptionIndex,
    snapGuide,
    setSnapGuide,
    dragStateRef,
    currentTimeRef,
    forceRedraw,
    narrationText: narrationSegments.length > 0
      ? getNarrationFullText(narrationSegments, getPointFocusTime(store.activeIndex)) || undefined
      : undefined,
    subtitleStyle,
    onSubtitlePositionChange: (pos: { x: number; y: number }) =>
      setSubtitleStyle(s => ({ ...s, subtitlePosition: pos })),
  } as React.ComponentPropsWithoutRef<typeof CanvasEditor>

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background text-foreground">
      <AppToolbar
        isDisabled={isDisabled}
        loadingPainting={loadingPainting}
        isRendering={store.isRendering}
        renderProgress={renderProgress}
        hasImage={!!store.image}
        hasPoints={!!store.points.length}
        projectName={store.projectName}
        fileInputRef={fileInputRef as React.RefObject<HTMLInputElement>}
        loadProjectInputRef={loadProjectInputRef as React.RefObject<HTMLInputElement>}
        onProjectNameChange={name => store.setProjectName(normalizeProjectName(name))}
        onImageFile={file => store.loadImageFile(file, !store.image, store.imageUrl)}
        onLoadFile={loadProject}
        onOpenMasterworkPicker={() => setIsMasterworkPickerOpen(true)}
        onOpenAiPanel={() => setIsAiPanelOpen(true)}
        onRenderVideo={renderVideo}
        onSave={saveProject}
        onClearPoints={() => store.clearPoints()}
        onRequestFullscreen={requestFullscreen}
      />

      <div className="flex flex-1 min-h-0 flex-col overflow-hidden p-3 gap-3">
        <div className="flex flex-1 min-h-0 overflow-hidden gap-3">
          <NarrationSidebar
            segments={narrationSegments}
            onSegmentsChange={setNarrationSegments}
            inputText={narrationInputText}
            onInputTextChange={setNarrationInputText}
            subtitleStyle={subtitleStyle}
            onSubtitleStyleChange={setSubtitleStyle}
            collapsed={isNarrationCollapsed}
            onToggleCollapse={() => setIsNarrationCollapsed(v => !v)}
          />
          <CanvasSection
            isDisabled={isDisabled}
            hasImage={!!store.image}
            activeTab={store.activeTab}
            onTabChange={tab => { store.setActiveTab(tab); triggerRedraw() }}
            onOpenImmersiveMode={openImmersiveMode}
            showAllPoints={store.showAllPoints}
            onlyActiveBox={store.onlyActiveBox}
            showCaptionBox={store.showCaptionBox}
            showGuidesInPreview={store.showGuidesInPreview}
            onToggle={(key, val) => {
              if (key === 'showAllPoints') store.setShowAllPoints(val)
              else if (key === 'onlyActiveBox') store.setOnlyActiveBox(val)
              else if (key === 'showCaptionBox') store.setShowCaptionBox(val)
              else if (key === 'showGuidesInPreview') store.setShowGuidesInPreview(val)
              triggerRedraw()
            }}
            safeAreaVisibility={store.safeAreaVisibility}
            onSafeAreaChange={(key, val) => { store.setSafeAreaVisibility({ ...store.safeAreaVisibility, [key]: val }); triggerRedraw() }}
            canvasEditorProps={canvasEditorProps}
          />

          <EditorSidebar
            points={store.points}
            activeIndex={store.activeIndex}
            activeTab={store.activeTab}
            activePoint={activePoint}
            activeCaptionIndex={activeCaptionIndex}
            image={store.image}
            backgroundSettings={store.backgroundSettings}
            handlers={{
              onSelect: selectPointAndSyncTimeline,
              onRemovePoint: i => { store.removePoint(i, store.points, store.activeIndex); triggerRedraw() },
              onUpdateField: handleUpdatePointField,
              onAddStart: () => { store.addFullFramePoint('start', store.points, store.lastCaptionStyle, store.lastCameraSettings); triggerRedraw() },
              onAddEnd: () => { store.addFullFramePoint('end', store.points, store.lastCaptionStyle, store.lastCameraSettings); triggerRedraw() },
              onInsertAfter: handleInsertAfter,
              onDuplicate: handleDuplicatePoint,
              onReorder: handleReorderPoints,
              onOpenCaption: i => { selectPointAndSyncTimeline(i); store.setActiveTab('caption'); triggerRedraw() },
              onApplyCaptionAsGlobal: () => {
                const pt = store.points[store.activeIndex]
                if (!pt) return
                const { text: _t, subtitle: _s, x: _x, y: _y, ...style } = pt.caption
                // 套用樣式到所有現有鏡頭（保留各自的文字與位置）
                const updated = store.points.map(p => ({
                  ...p,
                  caption: { ...p.caption, ...style },
                  extraCaptions: p.extraCaptions?.map(ec => ({ ...ec, ...style })),
                }))
                store.setPoints(updated)
                // 同步設為未來新增鏡頭的預設樣式
                store.setLastCaptionStyle(style)
                triggerRedraw()
              },
              onSetActiveCaptionIndex: setActiveCaptionIndex,
              onAddCaption: handleAddCaption,
              onDeleteCaption: handleDeleteCaption,
              onUpdateCaption: handleUpdateCaption,
              onUpdateHold: handleUpdateHold,
              onCenterCaption: () => {
                if (store.activeIndex >= 0) {
                  if (activeCaptionIndex === 0) {
                    const next = store.updateCaptionField(store.activeIndex, 'x', 0.5, store.points)
                    store.updateCaptionField(store.activeIndex, 'y', 0.82, next)
                  } else {
                    const extraIndex = activeCaptionIndex - 1
                    const next = store.updateExtraCaptionField(store.activeIndex, extraIndex, 'x', 0.5, store.points)
                    store.updateExtraCaptionField(store.activeIndex, extraIndex, 'y', 0.82, next)
                  }
                  triggerRedraw()
                }
              },
              onTabChange: tab => { store.setActiveTab(tab); triggerRedraw() },
              onBackgroundChange: s => { store.setBackgroundSettings(s); triggerRedraw() },
            }}
          />
        </div>

        <div className="flex-shrink-0 rounded-xl border border-border bg-card p-3">
          <TimelinePanel
            ref={timelinePanelRef}
            points={store.points}
            currentTime={currentTime}
            totalDuration={totalDuration}
            isPreviewing={store.isPreviewing}
            isDisabled={isDisabled || !store.image}
            expanded={isTimelineExpanded}
            onToggleExpanded={() => setIsTimelineExpanded(v => !v)}
            onTimeChange={t => {
              store.setIsPreviewing(false)
              drawTimelineTime(t, store.showGuidesInPreview)
              timelinePanelRef.current?.setTimeCursor(t)
              setCurrentTime(t)
              currentTimeRef.current = t
              triggerRedraw()
            }}
            onHoldDurationChange={(index, duration) => {
              store.updatePointField(index, 'holdDuration', duration, store.points)
              triggerRedraw()
            }}
            onMoveDurationChange={(index, duration) => {
              store.updatePointField(index, 'moveDuration', duration, store.points)
              triggerRedraw()
            }}
            onPlay={previewPath}
            onPause={() => { previewCancelRef.current = true; store.setIsPreviewing(false); stopNarrationAudio(narrationSourcesRef) }}
            onPointSelect={selectPointAndSyncTimeline}
            narrationSegments={narrationSegments}
            onNarrationSegmentsChange={setNarrationSegments}
          />
        </div>
      </div>

      {isAiPanelOpen && (
        <AiGeneratePanel
          image={store.image}
          onGenerated={handleAiGenerated}
          onClose={() => setIsAiPanelOpen(false)}
        />
      )}

      <MasterworkPickerModal
        open={isMasterworkPickerOpen}
        onClose={() => setIsMasterworkPickerOpen(false)}
        onSelectImage={(url, title) => loadImageFromUrl(url, title)}
      />

      {isImmersiveMode && (
        <ImmersiveOverlay
          isLeaving={isImmersiveLeaving}
          onClose={closeImmersiveMode}
          canvasEditorProps={canvasEditorProps}
        />
      )}

      {/* 自動暫存還原 Modal */}
      {showRestoreModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-xl p-6 w-80 shadow-2xl flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <h2 className="text-base font-semibold">發現未完成的工作</h2>
              <p className="text-sm text-muted-foreground">
                找到上次未完成的專案「{String(pendingRestore?.name ?? '未命名')}」，要繼續編輯嗎？
              </p>
              {Boolean(pendingRestore?.savedAt) && (
                <p className="text-xs text-muted-foreground">
                  暫存於 {new Date(String(pendingRestore!.savedAt)).toLocaleString('zh-TW')}
                </p>
              )}
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={handleDiscardAutosave}>重新開始</Button>
              <Button size="sm" onClick={handleRestoreAutosave}>繼續編輯</Button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} storageKey="artful-theme">
      <AppInner />
    </ThemeProvider>
  )
}
