import { useMemo, useCallback, useRef, useEffect, useLayoutEffect, forwardRef, useImperativeHandle, useState } from 'react'
import { Timeline } from '@xzdarcy/react-timeline-editor'
import type { TimelineState } from '@xzdarcy/react-timeline-editor'
import type { TimelineRow, TimelineEffect, TimelineAction } from '@xzdarcy/timeline-engine'
import type { CameraPoint, ImageOverlay, NarrationTrack, SubtitleCue } from '@/types'
import { DEFAULT_SUBTITLE_STYLE } from '@/types'
import { formatTime } from '@/lib/utils'
import { buildTimeline } from '@/lib/canvas'
import { rippleRow, type Clip } from '@/lib/ripple'
import { splitNarrationAt } from '@/lib/narration'
import { useTheme } from 'next-themes'
import { Play, Pause, ChevronsUpDown, ChevronsDownUp, Trash2, Lock, LockOpen } from 'lucide-react'

// Extended action type that carries our app-specific metadata
type RichAction = TimelineAction & {
  data?: {
    label: string
    pointIndex: number
    type: string
    trackId?: string
    cueId?: string
    segmentId?: string
    overlayId?: string
    waveform?: number[]
    /** 旁白：音訊本身的長度（秒），拉伸不得超過 */
    maxDuration?: number
  }
}

/** Imperative handle exposed to parent for direct cursor control (bypasses React state) */
export interface TimelinePanelHandle {
  setTimeCursor: (time: number) => void
  revealTime: (time: number, smooth?: boolean) => void
}

const EFFECTS: Record<string, TimelineEffect> = {
  move:      { id: 'move',      name: '移動' },
  hold:      { id: 'hold',      name: '停留' },
  caption:   { id: 'caption',   name: '旁白' },
  music:     { id: 'music',     name: '音樂' },
  narration: { id: 'narration', name: '旁白' },
  subtitle:  { id: 'subtitle',  name: '字幕' },
  overlay:   { id: 'overlay',   name: '圖片' },
}

const ROW_CAMERA    = 'row-camera'
const ROW_NARRATION = 'row-narration'
const ROW_SUBTITLE  = 'row-subtitle'
const ROW_MUSIC     = 'row-music'
const ROW_OVERLAY   = 'row-overlay'

const ROW_LABELS: Record<string, string> = {
  [ROW_CAMERA]:    '鏡頭',
  [ROW_NARRATION]: '旁白',
  [ROW_SUBTITLE]:  '字幕',
  [ROW_MUSIC]:     '音樂',
  [ROW_OVERLAY]:   '圖片',
}

const NUM_ROWS = 5

/** 最短片段長度（秒）——縮到比這短就當作這麼長 */
const MIN_CLIP = 0.1

/** 旁白可拉到的最長長度＝音訊本身長度（拿不到就用當下長度，等於不准變長） */
function narrationMax(action: TimelineAction): number {
  return (action as RichAction).data?.maxDuration ?? action.end - action.start
}

/** 把 anchor 放到拖曳後的新位置，再把同列其他片段推開，回傳 id → 新位置 */
function layoutRow(clips: Clip[], anchorId: string, start: number, end: number): Map<string, Clip> {
  const anchorStart = Math.max(0, start)
  const next = clips.map(clip => clip.id === anchorId
    ? { ...clip, start: anchorStart, end: Math.max(anchorStart + MIN_CLIP, end) }
    : clip)
  return new Map(rippleRow(next, anchorId).map(clip => [clip.id, clip]))
}

/** Pixels rendered for 1-second scale mark */
const SCALE_WIDTH  = 80
/** Left margin reserved for row labels */
const START_LEFT   = 60
/** Height of each row in px (normal mode) */
const ROW_HEIGHT          = 36
/** Height of each row in px (expanded mode) */
const ROW_HEIGHT_EXPANDED = 72
/** Height of the top ruler — must match .timeline-editor-time-area height in index.css */
const SCALE_HEIGHT = 28

function getActionColors(effectId: string, rowId: string): { bg: string; fg: string } {
  if (rowId === ROW_OVERLAY)   return { bg: 'rgba(236,72,153,.85)',  fg: '#ffffff' }
  if (rowId === ROW_MUSIC)     return { bg: 'rgba(168,85,247,.82)',  fg: '#ffffff' }
  if (rowId === ROW_NARRATION) return { bg: 'rgba(251,146,60,.88)',  fg: '#ffffff' }
  if (rowId === ROW_SUBTITLE)  return { bg: 'rgba(14,165,233,.86)',  fg: '#ffffff' }
  switch (effectId) {
    case 'move':    return { bg: 'rgba(37,99,235,.85)',  fg: '#ffffff' }
    case 'hold':    return { bg: 'rgba(16,185,129,.82)', fg: '#ffffff' }
    case 'caption': return { bg: 'rgba(234,179,8,.90)',  fg: '#1a1a1a' }
    default:        return { bg: 'rgba(100,100,100,.6)', fg: '#ffffff' }
  }
}

function buildWaveformPeaks(audioData: Float32Array | undefined, bars = 32) {
  if (!audioData?.length) return undefined
  const peaks: number[] = []
  const samplesPerBar = Math.max(1, Math.floor(audioData.length / bars))
  for (let bar = 0; bar < bars; bar++) {
    const start = bar * samplesPerBar
    const end = bar === bars - 1 ? audioData.length : Math.min(audioData.length, start + samplesPerBar)
    let peak = 0
    for (let i = start; i < end; i++) {
      const value = Math.abs(audioData[i])
      if (value > peak) peak = value
    }
    peaks.push(Math.min(1, peak))
  }
  const maxPeak = Math.max(...peaks)
  return maxPeak > 0 ? peaks.map(peak => Math.max(0.08, peak / maxPeak)) : peaks
}

interface TimelinePanelProps {
  points:                      CameraPoint[]
  currentTime:                 number
  totalDuration:               number
  isPreviewing:                boolean
  isDisabled:                  boolean
  expanded?:                   boolean
  onToggleExpanded?:           () => void
  onTimeChange:                (time: number) => void
  onPointSelect:               (index: number) => void
  onHoldDurationChange:        (pointIndex: number, duration: number) => void
  onMoveDurationChange:        (pointIndex: number, duration: number) => void
  onPlay:                      () => void
  onPause:                     () => void
  narrationTrack?:             NarrationTrack | null
  onNarrationTrackChange?:     (track: NarrationTrack | null) => void
  subtitleCues?:               SubtitleCue[]
  onSubtitleCuesChange?:       (cues: SubtitleCue[]) => void
  onSubtitleSelect?:           (id: string) => void
  imageOverlays?:              ImageOverlay[]
  onImageOverlaysChange?:      (overlays: ImageOverlay[]) => void
  overlaysLocked?:             boolean
  onToggleOverlaysLocked?:     () => void
}

export default forwardRef<TimelinePanelHandle, TimelinePanelProps>(function TimelinePanel({
  points, currentTime, totalDuration, isPreviewing, isDisabled,
  expanded = false, onToggleExpanded,
  onTimeChange, onPointSelect, onHoldDurationChange, onMoveDurationChange, onPlay, onPause,
  narrationTrack, onNarrationTrackChange, subtitleCues, onSubtitleCuesChange, onSubtitleSelect,
  imageOverlays, onImageOverlaysChange, overlaysLocked = false, onToggleOverlaysLocked,
}, ref) {
  const { resolvedTheme } = useTheme()
  const isDark      = resolvedTheme === 'dark'
  const timelineRef = useRef<TimelineState>(null)
  const rootRef     = useRef<HTMLDivElement>(null)
  const lastScrollLeftRef = useRef(0)
  const pendingScrollLeftRef = useRef<number | null>(null)
  const readoutRef  = useRef<HTMLSpanElement>(null)

  // ── Row order + local music state ────────────────────────────────────────
  const [rowOrder, setRowOrder]     = useState<string[]>([ROW_CAMERA, ROW_OVERLAY, ROW_NARRATION, ROW_SUBTITLE, ROW_MUSIC])
  const [localMusic, setLocalMusic] = useState<TimelineAction[]>([])
  // Incrementing forces editorData useMemo to recompute → camera/narration blocks snap back
  const [snapKey, setSnapKey]       = useState(0)
  // 拖曳/縮放中的即時時間讀數（顯示在標頭）
  const [dragReadout, setDragReadout] = useState<string | null>(null)

  const revealTime = useCallback((time: number, smooth = true) => {
    const root = rootRef.current
    if (!root) return

    const grid     = root.querySelector('.timeline-editor-edit-area .ReactVirtualized__Grid') as HTMLElement | null
    const scroller = grid || (root.querySelector('.timeline-editor-edit-area') as HTMLElement | null)
    if (!scroller) return

    const targetX  = START_LEFT + Math.max(0, time) * SCALE_WIDTH
    const viewLeft  = scroller.scrollLeft
    const viewRight = viewLeft + scroller.clientWidth
    const margin    = 64

    if (!smooth) {
      // Playback follow mode: cursor runs freely across the visible area.
      // Only scroll when cursor is within rightPad pixels of the right edge
      // (or has gone off the left edge after a backward seek).
      const rightPad = 56
      const leftPad  = 20
      if (targetX > viewRight - rightPad) {
        // Cursor near right edge — advance scroll so cursor stays at rightPad from right.
        scroller.scrollLeft = targetX - scroller.clientWidth + rightPad
      } else if (targetX < viewLeft + leftPad) {
        // Backward seek — snap scroll so cursor is near left with a small buffer.
        scroller.scrollLeft = Math.max(0, targetX - leftPad)
      }
      return
    }

    if (targetX < viewLeft + margin || targetX > viewRight - margin) {
      scroller.scrollTo({ left: Math.max(0, targetX - scroller.clientWidth * 0.35), behavior: 'smooth' })
    }
  }, [])

  // Expose imperative cursor control so the parent can move the playhead
  // directly every rAF frame without triggering a React re-render
  useImperativeHandle(ref, () => ({
    setTimeCursor: (time: number) => {
      timelineRef.current?.setTime(time)
      // 讀數也走命令式。播放時若靠 state 更新，整棵 App（含 N 個鏡頭卡片）
      // 每秒要重繪十幾次，鏡頭一多就把主執行緒塞死。
      if (readoutRef.current) readoutRef.current.textContent = formatTime(time)
    },
    revealTime,
  }), [revealTime])

  // Sync cursor for non-animation cases (scrub clicks, seeks, initial load)
  useEffect(() => {
    timelineRef.current?.setTime(currentTime)
  }, [currentTime])

  // Caption position/style changes do not affect the camera timeline.
  // Keep camera actions stable so the third-party editor does not rebuild its
  // virtualized grid while a caption is being edited.
  const cameraTimingKey = points
    .map(point => `${point.move}:${point.moveDuration}:${point.holdDuration}`)
    .join('|')
  const cameraItems = useMemo(
    () => buildTimeline(points).items.filter(item => item.type !== 'caption'),
    [cameraTimingKey],
  )

  // Camera row: hold/move blocks are resizable (right edge) but NOT draggable —
  // sequential packing means any move would create a gap.
  const cameraActions = useMemo<TimelineAction[]>(() =>
    cameraItems.map(item => ({
      id:       `${item.type}-${item.pointIndex}-${Math.round(item.start * 1000)}`,
      start:    item.start,
      end:      item.end,
      effectId: item.type,
      movable:  false,
      flexible: true,
      data:     { label: item.label, pointIndex: item.pointIndex, type: item.type },
    } as RichAction as TimelineAction)),
    [cameraItems],
  )

  const narrationActions = useMemo<TimelineAction[]>(() => {
    if (!narrationTrack || narrationTrack.duration <= 0) return []
    const audioSeconds = (data: Float32Array | undefined, rate: number | undefined) =>
      data?.length && rate ? data.length / rate : undefined
    if (narrationTrack.segments.length) {
      return narrationTrack.segments.map((segment, index) => ({
        id:       `narration-${segment.id}`,
        start:    narrationTrack.startTime + segment.startTime,
        end:      narrationTrack.startTime + segment.startTime + segment.duration,
        effectId: 'narration',
        movable:  true,
        flexible: true,
        data: {
          label: segment.text.slice(0, 24) || `旁白 ${index + 1}`,
          pointIndex: index,
          type: 'narration',
          trackId: narrationTrack.id,
          segmentId: segment.id,
          waveform: buildWaveformPeaks(segment.audioData),
          maxDuration: audioSeconds(segment.audioData, segment.samplingRate ?? narrationTrack.samplingRate) ?? segment.duration,
        },
      } as RichAction as TimelineAction))
    }
    return [{
      id:       `narration-${narrationTrack.id}`,
      start:    narrationTrack.startTime,
      end:      narrationTrack.startTime + narrationTrack.duration,
      effectId: 'narration',
      movable:  true,
      flexible: true,
      data: {
        label: '旁白音訊',
        pointIndex: -1,
        type: 'narration',
        trackId: narrationTrack.id,
        waveform: buildWaveformPeaks(narrationTrack.audioData),
        maxDuration: audioSeconds(narrationTrack.audioData, narrationTrack.samplingRate) ?? narrationTrack.duration,
      },
    } as RichAction as TimelineAction]
  }, [narrationTrack])

  const overlayActions = useMemo<TimelineAction[]>(() =>
    (imageOverlays ?? []).map((overlay, i) => ({
      id:       `overlay-${overlay.id}`,
      start:    overlay.startTime,
      end:      overlay.startTime + overlay.duration,
      effectId: 'overlay',
      movable:  !overlaysLocked,
      flexible: !overlaysLocked,
      data: { label: overlay.name || `圖片 ${i + 1}`, pointIndex: i, type: 'overlay', overlayId: overlay.id },
    } as RichAction as TimelineAction)),
    [imageOverlays, overlaysLocked],
  )

  const subtitleActions = useMemo<TimelineAction[]>(() =>
    (subtitleCues ?? []).map((cue, i) => ({
      id:       `subtitle-${cue.id}`,
      start:    cue.startTime,
      end:      cue.startTime + cue.duration,
      effectId: 'subtitle',
      movable:  true,
      flexible: true,
      data: { label: cue.text.slice(0, 24) || `字幕 ${i + 1}`, pointIndex: i, type: 'subtitle', cueId: cue.id },
    } as RichAction as TimelineAction)),
    [subtitleCues],
  )

  // Full editorData: row order drives display sequence.
  const editorData = useMemo<TimelineRow[]>(() => {
    const rowMap: Record<string, TimelineRow> = {
      [ROW_CAMERA]:    { id: ROW_CAMERA,    actions: cameraActions },
      [ROW_NARRATION]: { id: ROW_NARRATION, actions: narrationActions },
      [ROW_SUBTITLE]:  { id: ROW_SUBTITLE,  actions: subtitleActions },
      [ROW_MUSIC]:     { id: ROW_MUSIC,     actions: localMusic },
      [ROW_OVERLAY]:   { id: ROW_OVERLAY,   actions: overlayActions },
    }
    return rowOrder.map(id => rowMap[id])
  }, [cameraActions, narrationActions, subtitleActions, localMusic, overlayActions, rowOrder])

  // react-timeline-editor 1.0 uses react-virtualized's forceUpdate when
  // editorData changes, which can recurse under React 19. Remount only when
  // actual timeline data changes instead of updating a mounted instance.
  const timelineDataKey = useMemo(
    () => editorData.map(row =>
      `${row.id}:${row.actions.map(action =>
        `${action.id}:${action.start}:${action.end}`,
      ).join(',')}`,
    ).join('|'),
    [editorData],
  )

  // ── Scale count: ensure enough tick marks to cover all content ──────────
  const scaleCount = Math.max(20, Math.ceil(totalDuration) + 4)

  const rowH   = expanded ? ROW_HEIGHT_EXPANDED : ROW_HEIGHT
  const totalH = SCALE_HEIGHT + rowH * NUM_ROWS
  const timelineInstanceKey = `${rowH}:${snapKey}:${timelineDataKey}`
  const previousTimelineInstanceKeyRef = useRef(timelineInstanceKey)

  if (previousTimelineInstanceKeyRef.current !== timelineInstanceKey) {
    pendingScrollLeftRef.current = lastScrollLeftRef.current
    previousTimelineInstanceKeyRef.current = timelineInstanceKey
  }

  useLayoutEffect(() => {
    const scrollLeft = pendingScrollLeftRef.current
    if (scrollLeft == null) return

    const restore = () => {
      timelineRef.current?.setScrollLeft(scrollLeft)
      timelineRef.current?.setTime(currentTime)
    }

    restore()
    const frame = requestAnimationFrame(() => {
      restore()
      lastScrollLeftRef.current = scrollLeft
      pendingScrollLeftRef.current = null
    })
    return () => cancelAnimationFrame(frame)
  }, [currentTime, timelineInstanceKey])

  const handleTimelineScroll = useCallback((params: { scrollLeft: number }) => {
    if (pendingScrollLeftRef.current == null) {
      lastScrollLeftRef.current = params.scrollLeft
    }
  }, [])

  // ── Callbacks ─────────────────────────────────────────────────────────────
  const handleClickTime = useCallback(
    (time: number): boolean | undefined => {
      onTimeChange(time)
      return undefined
    },
    [onTimeChange],
  )

  const handleTimelineClickCapture = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const target = event.target as HTMLElement
      const timeArea = target.closest('.timeline-editor-time-area-interact') as HTMLElement | null
      if (!timeArea) return

      const root = rootRef.current
      const scroller = root?.querySelector('.timeline-editor-edit-area .ReactVirtualized__Grid') as HTMLElement | null
      if (!scroller) return

      // The timeline package subtracts scrollLeft twice in its ruler boundary
      // check, so clicks past roughly half of a long timeline are ignored.
      event.preventDefault()
      event.stopPropagation()
      const rect = timeArea.getBoundingClientRect()
      const pixel = event.clientX - rect.left + scroller.scrollLeft
      const time = Math.min(totalDuration, Math.max(0, (pixel - START_LEFT) / SCALE_WIDTH))
      onTimeChange(time)
    },
    [onTimeChange, totalDuration],
  )

  const handleCursorDragStart = useCallback(
    (time: number) => { onPause(); onTimeChange(time) },
    [onPause, onTimeChange],
  )

  const handleCursorDrag = useCallback(
    (time: number) => { onTimeChange(time) },
    [onTimeChange],
  )

  const formatDragReadout = useCallback((action: TimelineAction, start: number, end: number) => {
    const rich = action as RichAction
    const label = rich.data?.label ?? ''
    setDragReadout(`${label}　${start.toFixed(2)}s → ${end.toFixed(2)}s（${(end - start).toFixed(2)}s）`)
  }, [])

  // Camera row: block left-edge resize. Commit duration at resize end to keep drag smooth.
  const handleResizing = useCallback(
    (params: { action: TimelineAction; row: TimelineRow; start: number; end: number; dir: 'right' | 'left' }): boolean | void => {
      const { row, dir, action, start, end } = params
      // 鏡頭列連續排版、旁白沒有音訊 head offset → 只給右邊界拉伸
      // ponytail: 旁白要左邊 trim 得先在 segment 存音訊起點，等真的有人要再說
      if ((row.id === ROW_CAMERA || row.id === ROW_NARRATION) && dir === 'left') return false
      if (row.id === ROW_OVERLAY && overlaysLocked) return false
      // 旁白拉到音訊原長就停住，再拉也不會變長
      if (row.id === ROW_NARRATION && end - start > narrationMax(action)) return false
      formatDragReadout(action, start, end)
      return undefined
    },
    [overlaysLocked, formatDragReadout],
  )

  const handleMoving = useCallback(
    (params: { action: TimelineAction; row: TimelineRow; start: number; end: number }): boolean | void => {
      formatDragReadout(params.action, params.start, params.end)
      return undefined
    },
    [formatDragReadout],
  )

  // Move 與 resize 收尾走同一條路：把整列的新位置算出來（含推開鄰居）再寫回。
  const commitAction = useCallback(
    (params: { action: TimelineAction; row: TimelineRow; start: number; end: number }) => {
      setDragReadout(null)
      const { action, row, start, end } = params
      const rich = action as RichAction

      if (row.id === ROW_CAMERA) {
        // 鏡頭列是連續排版，位置全由 store 推導，只吃時長變更
        if (rich.data?.pointIndex === undefined) { setSnapKey(k => k + 1); return }
        const newDuration = Math.max(MIN_CLIP, end - start)
        if (rich.effectId === 'hold')      onHoldDurationChange(rich.data.pointIndex, newDuration)
        else if (rich.effectId === 'move') onMoveDurationChange(rich.data.pointIndex, newDuration)
        else setSnapKey(k => k + 1)
        return
      }

      if (row.id === ROW_NARRATION && narrationTrack && onNarrationTrackChange) {
        const segmentId = rich.data?.segmentId
        // 拉伸封頂在音訊原長
        const cappedEnd = Math.min(end, start + narrationMax(action))
        if (!segmentId) {
          onNarrationTrackChange({
            ...narrationTrack,
            startTime: Math.max(0, start),
            duration:  Math.max(MIN_CLIP, cappedEnd - start),
          })
          return
        }
        const clips = narrationTrack.segments.map(segment => ({
          id:    `narration-${segment.id}`,
          start: narrationTrack.startTime + segment.startTime,
          end:   narrationTrack.startTime + segment.startTime + segment.duration,
        }))
        const next = layoutRow(clips, String(action.id), start, cappedEnd)
        const nextSegments = narrationTrack.segments.map(segment => {
          const clip = next.get(`narration-${segment.id}`)!
          return {
            ...segment,
            startTime: Math.max(0, clip.start - narrationTrack.startTime),
            duration:  clip.end - clip.start,
          }
        })
        const duration = nextSegments.reduce((max, segment) => Math.max(max, segment.startTime + segment.duration), 0)
        onNarrationTrackChange({ ...narrationTrack, duration, segments: nextSegments })
        return
      }

      if (row.id === ROW_SUBTITLE && onSubtitleCuesChange && subtitleCues) {
        const clips = subtitleCues.map(cue => ({
          id: `subtitle-${cue.id}`, start: cue.startTime, end: cue.startTime + cue.duration,
        }))
        const next = layoutRow(clips, String(action.id), start, end)
        onSubtitleCuesChange(subtitleCues.map(cue => {
          const clip = next.get(`subtitle-${cue.id}`)!
          return { ...cue, startTime: clip.start, duration: clip.end - clip.start }
        }))
        return
      }

      if (row.id === ROW_OVERLAY && onImageOverlaysChange && imageOverlays) {
        const clips = imageOverlays.map(overlay => ({
          id: `overlay-${overlay.id}`, start: overlay.startTime, end: overlay.startTime + overlay.duration,
        }))
        const next = layoutRow(clips, String(action.id), start, end)
        onImageOverlaysChange(imageOverlays.map(overlay => {
          const clip = next.get(`overlay-${overlay.id}`)!
          return { ...overlay, startTime: clip.start, duration: clip.end - clip.start }
        }))
        return
      }

      if (row.id === ROW_MUSIC) {
        setLocalMusic(prev => {
          const next = layoutRow(prev.map(a => ({ id: String(a.id), start: a.start, end: a.end })), String(action.id), start, end)
          return prev.map(a => ({ ...a, ...next.get(String(a.id))!, id: a.id }))
        })
        return
      }

      setSnapKey(k => k + 1)
    },
    [onHoldDurationChange, onMoveDurationChange, narrationTrack, onNarrationTrackChange,
     subtitleCues, onSubtitleCuesChange, imageOverlays, onImageOverlaysChange],
  )

  // 右鍵旁白片段 → 在游標處剪成兩段
  const handleContextMenuAction = useCallback(
    (event: React.MouseEvent, params: { action: TimelineAction; row: TimelineRow; time: number }) => {
      if (params.row.id !== ROW_NARRATION || !narrationTrack || !onNarrationTrackChange) return
      event.preventDefault()
      event.stopPropagation()
      const next = splitNarrationAt(narrationTrack, params.time)
      if (next !== narrationTrack) onNarrationTrackChange(next)
    },
    [narrationTrack, onNarrationTrackChange],
  )

  const handleRowDragEnd = useCallback(
    ({ editorData: newData }: { row: TimelineRow; editorData: TimelineRow[] }) => {
      setRowOrder(newData.map(r => r.id))
    },
    [],
  )

  const handleClickAction = useCallback(
    (_e: React.MouseEvent, params: { action: TimelineAction; row: TimelineRow; time: number }) => {
      const rich = params.action as RichAction
      if (params.row.id === ROW_CAMERA && rich.data?.pointIndex !== undefined) {
        onPointSelect(rich.data.pointIndex)
      } else if (params.row.id === ROW_SUBTITLE && rich.data?.cueId) {
        onSubtitleSelect?.(rich.data.cueId)
      }
    },
    [onPointSelect, onSubtitleSelect],
  )

  // Double-click music row → add a 4-second music block at cursor position
  const handleDoubleClickRow = useCallback(
    (_e: React.MouseEvent, params: { row: TimelineRow; time: number }) => {
      if (params.row.id === ROW_SUBTITLE && onSubtitleCuesChange) {
        if (!window.confirm('確定要新增一個字幕嗎？')) return
        const id = crypto.randomUUID()
        const start = Math.max(0, params.time)
        const cue: SubtitleCue = {
          id,
          narrationId: narrationTrack?.id ?? '',
          text: '新字幕',
          translation: '',
          startTime: start,
          duration: 2,
          style: {
            ...DEFAULT_SUBTITLE_STYLE,
            subtitlePosition: { ...DEFAULT_SUBTITLE_STYLE.subtitlePosition },
          },
          wordStartIndex: 0,
          wordEndIndex: 0,
        }
        onSubtitleCuesChange([...(subtitleCues ?? []), cue])
        onSubtitleSelect?.(id)
        return
      }

      if (params.row.id === ROW_MUSIC) {
        const start      = Math.max(0, params.time - 2)
        const end        = start + 4
        const newAction: TimelineAction = {
          id:       `music-${Date.now()}`,
          start,
          end,
          effectId: 'music',
          movable:  true,
          flexible: true,
          data:     { label: '音樂', pointIndex: -1, type: 'music' },
        } as RichAction as TimelineAction
        setLocalMusic(prev => [...prev, newAction])
      }
    },
    [narrationTrack, onSubtitleCuesChange, onSubtitleSelect, subtitleCues],
  )

  // Double-click music/narration/subtitle action → remove it
  const handleDoubleClickAction = useCallback(
    (event: React.MouseEvent, params: { action: TimelineAction; row: TimelineRow }) => {
      event.stopPropagation()
      if (params.row.id === ROW_MUSIC) {
        setLocalMusic(prev => prev.filter(a => a.id !== params.action.id))
      } else if (params.row.id === ROW_NARRATION && narrationTrack && onNarrationTrackChange) {
        const rich = params.action as RichAction
        const segmentId = rich.data?.segmentId
        if (!window.confirm('確定要刪除這段旁白音訊嗎？')) return
        if (!segmentId) {
          onNarrationTrackChange(null)
          return
        }
        const nextSegments = narrationTrack.segments.filter(segment => segment.id !== segmentId)
        if (!nextSegments.length) {
          onNarrationTrackChange(null)
          return
        }
        const duration = nextSegments.reduce((max, segment) => Math.max(max, segment.startTime + segment.duration), 0)
        onNarrationTrackChange({ ...narrationTrack, duration, segments: nextSegments })
      } else if (params.row.id === ROW_SUBTITLE && onSubtitleCuesChange && subtitleCues) {
        const rich = params.action as RichAction
        const cueId = rich.data?.cueId ?? String(params.action.id).replace(/^subtitle-/, '')
        if (cueId) {
          if (!window.confirm('確定要刪除這個字幕嗎？')) return
          onSubtitleCuesChange(subtitleCues.filter(cue => cue.id !== cueId))
        }
      } else if (params.row.id === ROW_OVERLAY && onImageOverlaysChange && imageOverlays) {
        if (overlaysLocked) return
        const rich = params.action as RichAction
        const overlayId = rich.data?.overlayId
        if (overlayId) {
          if (!window.confirm('確定要刪除這張疊加圖片嗎？')) return
          onImageOverlaysChange(imageOverlays.filter(overlay => overlay.id !== overlayId))
        }
      }
    },
    [narrationTrack, onNarrationTrackChange, onSubtitleCuesChange, subtitleCues, imageOverlays, onImageOverlaysChange, overlaysLocked],
  )

  const handleClearNarrationRow = useCallback((event: React.MouseEvent) => {
    event.stopPropagation()
    if (!narrationTrack || !onNarrationTrackChange) return
    if (!window.confirm('確定要刪除旁白音訊嗎？')) return
    onNarrationTrackChange(null)
  }, [narrationTrack, onNarrationTrackChange])

  const handleClearSubtitleRow = useCallback((event: React.MouseEvent) => {
    event.stopPropagation()
    if (!subtitleCues?.length || !onSubtitleCuesChange) return
    if (!window.confirm('確定要刪除所有字幕嗎？')) return
    onSubtitleCuesChange([])
  }, [onSubtitleCuesChange, subtitleCues])

  // ── Theme-aware colours ────────────────────────────────────────────────
  const labelBg    = 'hsl(var(--card))'
  const labelColor = isDark ? 'rgba(255,255,255,.50)'      : 'rgba(0,0,0,.45)'
  const borderCol  = 'hsl(var(--border))'
  const scaleFg    = isDark ? 'rgba(255,255,255,.40)'      : 'rgba(0,0,0,.38)'

  const hasContent = points.length > 0 || localMusic.length > 0 || !!narrationTrack || (subtitleCues?.length ?? 0) > 0 || (imageOverlays?.length ?? 0) > 0

  return (
    <div className="flex flex-col gap-2 select-none" style={{ margin: '-10px' }}>
      {/* ── Header：左標籤 / 中央傳輸控制 / 右展開 ── */}
      <div className="grid grid-cols-3 items-center px-1 min-h-[30px] text-xs text-muted-foreground">
        <span className="text-[13px] font-semibold text-foreground justify-self-start">時間軸</span>
        <div className="flex items-center gap-2.5 justify-self-center">
          <button
            className="h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-sm hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
            disabled={isDisabled || points.length === 0}
            onClick={isPreviewing ? onPause : onPlay}
            title={isPreviewing ? '暫停預覽' : '播放預覽'}
          >
            {isPreviewing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 ml-0.5" />}
          </button>
          <span className="text-xs text-muted-foreground tabular-nums">
            <span ref={readoutRef} className="text-foreground font-medium">{formatTime(currentTime)}</span>
            <span className="mx-1 opacity-50">/</span>
            {formatTime(totalDuration)}
          </span>
          {dragReadout && (
            <span className="px-2 py-0.5 rounded-full bg-primary/15 text-primary text-[11px] tabular-nums">
              {dragReadout}
            </span>
          )}
        </div>
        <div className="justify-self-end">
          {onToggleExpanded && (
            <button
              className="flex items-center gap-1 h-6 px-2.5 rounded-full bg-muted hover:bg-muted/80 text-muted-foreground text-xs font-medium transition-colors"
              onClick={onToggleExpanded}
              title={expanded ? '收合時間軸' : '展開時間軸'}
            >
              {expanded
                ? <><ChevronsDownUp className="h-3 w-3" /><span>收合</span></>
                : <><ChevronsUpDown className="h-3 w-3" /><span>展開</span></>}
            </button>
          )}
        </div>
      </div>

      {/* ── Main container with fixed height ── */}
      <div
        ref={rootRef}
        className="rounded-xl border overflow-hidden relative"
        style={{ height: totalH, background: labelBg, borderColor: borderCol, transition: 'height 0.2s ease' }}
        onClickCapture={handleTimelineClickCapture}
      >
        {!hasContent ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-xs text-muted-foreground">
            <span>新增鏡頭後，這裡會顯示移動、停留與旁白區塊。</span>
            <span style={{ fontSize: 10, opacity: 0.6 }}>雙擊音樂列可新增音樂片段</span>
          </div>
        ) : (
          <>
            {/* ── Row labels (overlay above Timeline's startLeft area) ── */}
            <div
              className="absolute z-20 pointer-events-none"
              style={{ top: SCALE_HEIGHT, left: 0, width: START_LEFT, height: rowH * NUM_ROWS }}
            >
              {rowOrder.map((id, i) => (
                <div
                  key={id}
                  className="absolute flex items-center justify-center gap-1 text-[11px] font-medium"
                  style={{
                    top:          i * rowH,
                    left:         0,
                    width:        START_LEFT,
                    height:       rowH,
                    color:        labelColor,
                    background:   labelBg,
                    borderRight:  `1px solid ${borderCol}`,
                    borderBottom: i < NUM_ROWS - 1 ? `1px solid ${borderCol}` : 'none',
                  }}
                >
                  <span>{ROW_LABELS[id]}</span>
                  {id === ROW_NARRATION && narrationTrack && onNarrationTrackChange && (
                    <button
                      className="pointer-events-auto h-5 w-5 rounded flex items-center justify-center hover:bg-muted transition-colors"
                      title="刪除旁白音訊"
                      onClick={handleClearNarrationRow}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                  {id === ROW_SUBTITLE && (subtitleCues?.length ?? 0) > 0 && onSubtitleCuesChange && (
                    <button
                      className="pointer-events-auto h-5 w-5 rounded flex items-center justify-center hover:bg-muted transition-colors"
                      title="刪除所有字幕"
                      onClick={handleClearSubtitleRow}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                  {id === ROW_OVERLAY && onToggleOverlaysLocked && (
                    <button
                      className={`pointer-events-auto h-5 w-5 rounded flex items-center justify-center hover:bg-muted transition-colors ${overlaysLocked ? 'text-amber-500' : ''}`}
                      title={overlaysLocked ? '解鎖圖片列（可在畫布拖曳）' : '鎖定圖片列（畫布不可選取）'}
                      onClick={event => { event.stopPropagation(); onToggleOverlaysLocked() }}
                    >
                      {overlaysLocked ? <Lock className="h-3 w-3" /> : <LockOpen className="h-3 w-3" />}
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* ── Timeline component ── */}
            <Timeline
              key={timelineInstanceKey}
              ref={timelineRef}
              editorData={editorData}
              effects={EFFECTS}
              scale={1}
              scaleSplitCount={10}
              scaleWidth={SCALE_WIDTH}
              startLeft={START_LEFT}
              rowHeight={rowH}
              minScaleCount={scaleCount}
              maxScaleCount={scaleCount}
              gridSnap
              dragLine
              enableRowDrag
              autoScroll
              autoReRender={false}
              onScroll={handleTimelineScroll}
              style={{ width: '100%', height: totalH, background: 'transparent' }}
              onChange={() => {}}
              getScaleRender={(scale: number) => (
                <span style={{ fontSize: 10, color: scaleFg }}>{scale}s</span>
              )}
              onClickTimeArea={handleClickTime}
              onCursorDragStart={handleCursorDragStart}
              onCursorDrag={handleCursorDrag}
              onActionResizing={handleResizing}
              onActionResizeEnd={commitAction}
              onActionMoving={handleMoving}
              onActionMoveEnd={commitAction}
              onRowDragEnd={handleRowDragEnd}
              onClickAction={handleClickAction}
              onDoubleClickRow={handleDoubleClickRow}
              onDoubleClickAction={handleDoubleClickAction}
              onContextMenuAction={handleContextMenuAction}
              getActionRender={(action: TimelineAction, row: TimelineRow) => {
                const rich = action as RichAction
                const dur  = (action.end - action.start).toFixed(1)
                const { bg, fg } = getActionColors(action.effectId, row.id)
                const waveform = row.id === ROW_NARRATION ? rich.data?.waveform : undefined
                return (
                  <div
                    title={
                      row.id === ROW_NARRATION ? '右鍵剪一刀，雙擊刪除'
                      : row.id === ROW_MUSIC || row.id === ROW_SUBTITLE ? '雙擊刪除'
                      : undefined
                    }
                    style={{
                      width: '100%', height: '100%',
                      borderRadius: 3,
                      background: bg, color: fg,
                      position: 'relative',
                      display: 'flex', alignItems: 'center',
                      paddingLeft: 6, paddingRight: 5,
                      fontSize: 11, fontWeight: 700,
                      overflow: 'hidden',
                      cursor: 'pointer',
                      userSelect: 'none',
                    }}
                  >
                    {waveform && (
                      <div
                        aria-hidden="true"
                        style={{
                          position: 'absolute',
                          inset: '4px 5px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                          opacity: 0.48,
                          pointerEvents: 'none',
                        }}
                      >
                        {waveform.map((peak, index) => (
                          <span
                            key={index}
                            style={{
                              flex: 1,
                              minWidth: 1,
                              height: `${Math.max(10, peak * 100)}%`,
                              borderRadius: 999,
                              background: 'rgba(255,255,255,.78)',
                            }}
                          />
                        ))}
                      </div>
                    )}
                    <span style={{ position: 'relative', zIndex: 1, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {rich.data?.label ?? ''}
                    </span>
                    <span style={{ position: 'relative', zIndex: 1, fontSize: 10, opacity: 0.82, marginLeft: 4, flexShrink: 0, fontWeight: 500 }}>
                      {dur}s
                    </span>
                  </div>
                )
              }}
            />

            {/* Music row hint when empty */}
            {localMusic.length === 0 && (
              <div
                className="absolute pointer-events-none flex items-center text-[10px]"
                style={{
                  top:     SCALE_HEIGHT + rowOrder.indexOf(ROW_MUSIC) * rowH,
                  left:    START_LEFT + 8,
                  height:  rowH,
                  color:   labelColor,
                  opacity: 0.5,
                }}
              >
                雙擊新增音樂片段
              </div>
            )}

            {(subtitleCues?.length ?? 0) === 0 && (
              <div
                className="absolute pointer-events-none flex items-center text-[10px]"
                style={{
                  top:     SCALE_HEIGHT + rowOrder.indexOf(ROW_SUBTITLE) * rowH,
                  left:    START_LEFT + 8,
                  height:  rowH,
                  color:   labelColor,
                  opacity: 0.5,
                }}
              >
                雙擊新增字幕
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
})
