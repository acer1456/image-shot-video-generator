import { useMemo, useCallback, useRef, useEffect, forwardRef, useImperativeHandle, useState } from 'react'
import { Timeline } from '@xzdarcy/react-timeline-editor'
import type { TimelineState } from '@xzdarcy/react-timeline-editor'
import type { TimelineRow, TimelineEffect, TimelineAction } from '@xzdarcy/timeline-engine'
import type { CameraPoint, NarrationTrack, SubtitleCue } from '@/types'
import { DEFAULT_SUBTITLE_STYLE } from '@/types'
import { formatTime } from '@/lib/utils'
import { buildTimeline } from '@/lib/canvas'
import { useTheme } from 'next-themes'
import { Play, Pause, ChevronsUpDown, ChevronsDownUp, Trash2 } from 'lucide-react'

// Extended action type that carries our app-specific metadata
type RichAction = TimelineAction & {
  data?: { label: string; pointIndex: number; type: string; trackId?: string; cueId?: string }
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
}

const ROW_CAMERA    = 'row-camera'
const ROW_NARRATION = 'row-narration'
const ROW_SUBTITLE  = 'row-subtitle'
const ROW_MUSIC     = 'row-music'

const ROW_LABELS: Record<string, string> = {
  [ROW_CAMERA]:    '鏡頭',
  [ROW_NARRATION]: '旁白',
  [ROW_SUBTITLE]:  '字幕',
  [ROW_MUSIC]:     '音樂',
}

const NUM_ROWS = 4

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
}

export default forwardRef<TimelinePanelHandle, TimelinePanelProps>(function TimelinePanel({
  points, currentTime, totalDuration, isPreviewing, isDisabled,
  expanded = false, onToggleExpanded,
  onTimeChange, onPointSelect, onHoldDurationChange, onMoveDurationChange, onPlay, onPause,
  narrationTrack, onNarrationTrackChange, subtitleCues, onSubtitleCuesChange, onSubtitleSelect,
}, ref) {
  const { resolvedTheme } = useTheme()
  const isDark      = resolvedTheme === 'dark'
  const timelineRef = useRef<TimelineState>(null)
  const rootRef     = useRef<HTMLDivElement>(null)

  // ── Row order + local music state ────────────────────────────────────────
  const [rowOrder, setRowOrder]     = useState<string[]>([ROW_CAMERA, ROW_NARRATION, ROW_SUBTITLE, ROW_MUSIC])
  const [localMusic, setLocalMusic] = useState<TimelineAction[]>([])
  // Incrementing forces editorData useMemo to recompute → camera/narration blocks snap back
  const [snapKey, setSnapKey]       = useState(0)

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
    setTimeCursor: (time: number) => { timelineRef.current?.setTime(time) },
    revealTime,
  }), [revealTime])

  // Sync cursor for non-animation cases (scrub clicks, seeks, initial load)
  useEffect(() => {
    timelineRef.current?.setTime(currentTime)
  }, [currentTime])

  // ── Build timeline items ──────────────────────────────────────────────────
  const { items } = useMemo(() => buildTimeline(points), [points])

  // Camera row: hold/move blocks are resizable (right edge) but NOT draggable —
  // sequential packing means any move would create a gap.
  const cameraActions = useMemo<TimelineAction[]>(() =>
    items.filter(i => i.type !== 'caption').map(item => ({
      id:       `${item.type}-${item.pointIndex}-${Math.round(item.start * 1000)}`,
      start:    item.start,
      end:      item.end,
      effectId: item.type,
      movable:  false,
      flexible: true,
      data:     { label: item.label, pointIndex: item.pointIndex, type: item.type },
    } as RichAction as TimelineAction)),
    [items],
  )

  const narrationActions = useMemo<TimelineAction[]>(() => {
    if (!narrationTrack || narrationTrack.duration <= 0) return []
    if (narrationTrack.segments?.length) {
      return narrationTrack.segments.map((segment, index) => ({
        id:       `narration-${segment.id}`,
        start:    narrationTrack.startTime + segment.startTime,
        end:      narrationTrack.startTime + segment.startTime + segment.duration,
        effectId: 'narration',
        movable:  false,
        flexible: false,
        data: {
          label: segment.text.slice(0, 24) || `旁白 ${index + 1}`,
          pointIndex: index,
          type: 'narration',
          trackId: narrationTrack.id,
        },
      } as RichAction as TimelineAction))
    }
    return [{
      id:       `narration-${narrationTrack.id}`,
      start:    narrationTrack.startTime,
      end:      narrationTrack.startTime + narrationTrack.duration,
      effectId: 'narration',
      movable:  false,
      flexible: false,
      data: { label: '旁白音訊', pointIndex: -1, type: 'narration', trackId: narrationTrack.id },
    } as RichAction as TimelineAction]
  }, [narrationTrack])

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
  // `snapKey` included in deps so incrementing it creates a new array ref →
  // autoReRender detects the change → camera/narration blocks snap back.
  const editorData = useMemo<TimelineRow[]>(() => {
    const rowMap: Record<string, TimelineRow> = {
      [ROW_CAMERA]:    { id: ROW_CAMERA,    actions: cameraActions },
      [ROW_NARRATION]: { id: ROW_NARRATION, actions: narrationActions },
      [ROW_SUBTITLE]:  { id: ROW_SUBTITLE,  actions: subtitleActions },
      [ROW_MUSIC]:     { id: ROW_MUSIC,     actions: localMusic },
    }
    void snapKey
    return rowOrder.map(id => rowMap[id])
  }, [cameraActions, narrationActions, subtitleActions, localMusic, rowOrder, snapKey])

  // ── Scale count: ensure enough tick marks to cover all content ──────────
  const scaleCount = Math.max(20, Math.ceil(totalDuration) + 4)

  const rowH   = expanded ? ROW_HEIGHT_EXPANDED : ROW_HEIGHT
  const totalH = SCALE_HEIGHT + rowH * NUM_ROWS

  // ── Callbacks ─────────────────────────────────────────────────────────────
  const handleClickTime = useCallback(
    (time: number): boolean | undefined => {
      onTimeChange(time)
      return undefined
    },
    [onTimeChange],
  )

  const handleCursorDragStart = useCallback(
    (time: number) => { onPause(); onTimeChange(time) },
    [onPause, onTimeChange],
  )

  const handleCursorDrag = useCallback(
    (time: number) => { onTimeChange(time) },
    [onTimeChange],
  )

  // Camera row: block left-edge resize. Commit duration at resize end to keep drag smooth.
  const handleResizing = useCallback(
    (params: { action: TimelineAction; row: TimelineRow; start: number; end: number; dir: 'right' | 'left' }): boolean | void => {
      const { row, dir } = params
      if (row.id === ROW_CAMERA) {
        if (dir === 'left') return false
      }
      if (row.id === ROW_NARRATION) return false
      return undefined
    },
    [],
  )

  const handleResizeEnd = useCallback(
    (params: { action: TimelineAction; row: TimelineRow; start: number; end: number; dir: 'right' | 'left' }) => {
      const { action, row, start, end } = params
      const rich = action as RichAction
      if (row.id === ROW_CAMERA) {
        if (rich.data?.pointIndex === undefined) return
        const newDuration = Math.max(0.1, end - start)
        if (rich.effectId === 'hold')      onHoldDurationChange(rich.data.pointIndex, newDuration)
        else if (rich.effectId === 'move') onMoveDurationChange(rich.data.pointIndex, newDuration)
      } else if (row.id === ROW_SUBTITLE && onSubtitleCuesChange && subtitleCues) {
        const cueId = rich.data?.cueId
        if (cueId) {
          const newDuration = Math.max(0.1, end - start)
          onSubtitleCuesChange(subtitleCues.map(cue =>
            cue.id === cueId ? { ...cue, startTime: start, duration: newDuration } : cue
          ))
        }
      } else if (row.id === ROW_MUSIC) {
        setLocalMusic(prev => prev.map(a => a.id === action.id ? { ...a, start, end } : a))
      } else {
        setSnapKey(k => k + 1)
      }
    },
    [onHoldDurationChange, onMoveDurationChange, subtitleCues, onSubtitleCuesChange],
  )

  const handleMoveEnd = useCallback(
    (params: { action: TimelineAction; row: TimelineRow; start: number; end: number }) => {
      const { action, row, start, end } = params
      const rich = action as RichAction
      if (row.id === ROW_SUBTITLE && onSubtitleCuesChange && subtitleCues) {
        const cueId = rich.data?.cueId
        if (cueId) {
          const duration = end - start
          onSubtitleCuesChange(subtitleCues.map(cue =>
            cue.id === cueId ? { ...cue, startTime: start, duration: Math.max(0.1, duration) } : cue
          ))
        }
      } else if (row.id === ROW_MUSIC) {
        setLocalMusic(prev => prev.map(a => a.id === action.id ? { ...a, start, end } : a))
      } else {
        // Camera: snap back (positions are fully derived from store)
        setSnapKey(k => k + 1)
      }
    },
    [subtitleCues, onSubtitleCuesChange],
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

  // Double-click music/subtitle action → remove it
  const handleDoubleClickAction = useCallback(
    (event: React.MouseEvent, params: { action: TimelineAction; row: TimelineRow }) => {
      event.stopPropagation()
      if (params.row.id === ROW_MUSIC) {
        setLocalMusic(prev => prev.filter(a => a.id !== params.action.id))
      } else if (params.row.id === ROW_SUBTITLE && onSubtitleCuesChange && subtitleCues) {
        const rich = params.action as RichAction
        const cueId = rich.data?.cueId ?? String(params.action.id).replace(/^subtitle-/, '')
        if (cueId) {
          if (!window.confirm('確定要刪除這個字幕嗎？')) return
          onSubtitleCuesChange(subtitleCues.filter(cue => cue.id !== cueId))
        }
      }
    },
    [onSubtitleCuesChange, subtitleCues],
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
  const labelBg    = isDark ? 'hsl(217.2 32.6% 8%)'       : 'hsl(0 0% 100%)'
  const labelColor = isDark ? 'rgba(255,255,255,.50)'      : 'rgba(0,0,0,.45)'
  const borderCol  = isDark ? 'hsl(217.2 32.6% 17.5%)'    : 'hsl(214.3 31.8% 91.4%)'
  const scaleFg    = isDark ? 'rgba(255,255,255,.40)'      : 'rgba(0,0,0,.38)'

  const hasContent = items.length > 0 || localMusic.length > 0 || !!narrationTrack || (subtitleCues?.length ?? 0) > 0

  return (
    <div className="flex flex-col gap-2 select-none" style={{ margin: '-10px' }}>
      {/* ── Header ── */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
        <span className="font-semibold text-foreground">預覽時間軸</span>
        <button
          className="flex items-center gap-1 px-2 py-0.5 rounded bg-primary/10 hover:bg-primary/20 text-primary font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          disabled={isDisabled || points.length === 0}
          onClick={isPreviewing ? onPause : onPlay}
          title={isPreviewing ? '暫停預覽' : '播放預覽'}
        >
          {isPreviewing
            ? <><Pause className="h-3 w-3" /><span>暫停</span></>
            : <><Play  className="h-3 w-3" /><span>播放</span></>}
        </button>
        <span className="ml-auto">{formatTime(currentTime)} / {formatTime(totalDuration)}</span>
        {onToggleExpanded && (
          <button
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-muted hover:bg-muted/80 text-muted-foreground font-medium transition-colors"
            onClick={onToggleExpanded}
            title={expanded ? '收合時間軸' : '展開時間軸'}
          >
            {expanded
              ? <><ChevronsDownUp className="h-3 w-3" /><span className="text-xs">收合</span></>
              : <><ChevronsUpDown className="h-3 w-3" /><span className="text-xs">展開</span></>}
          </button>
        )}
      </div>

      {/* ── Main container with fixed height ── */}
      <div
        ref={rootRef}
        className="rounded-xl border overflow-hidden relative"
        style={{ height: totalH, background: labelBg, borderColor: borderCol, transition: 'height 0.2s ease' }}
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
                </div>
              ))}
            </div>

            {/* ── Timeline component ── */}
            <Timeline
              key={rowH}
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
              autoReRender
              style={{ width: '100%', height: totalH, background: 'transparent' }}
              onChange={() => {}}
              getScaleRender={(scale: number) => (
                <span style={{ fontSize: 10, color: scaleFg }}>{scale}s</span>
              )}
              onClickTimeArea={handleClickTime}
              onCursorDragStart={handleCursorDragStart}
              onCursorDrag={handleCursorDrag}
              onActionResizing={handleResizing}
              onActionResizeEnd={handleResizeEnd}
              onActionMoveEnd={handleMoveEnd}
              onRowDragEnd={handleRowDragEnd}
              onClickAction={handleClickAction}
              onDoubleClickRow={handleDoubleClickRow}
              onDoubleClickAction={handleDoubleClickAction}
              getActionRender={(action: TimelineAction, row: TimelineRow) => {
                const rich = action as RichAction
                const dur  = (action.end - action.start).toFixed(1)
                const { bg, fg } = getActionColors(action.effectId, row.id)
                return (
                  <div
                    title={row.id === ROW_MUSIC || row.id === ROW_SUBTITLE ? '雙擊刪除' : undefined}
                    style={{
                      width: '100%', height: '100%',
                      borderRadius: 3,
                      background: bg, color: fg,
                      display: 'flex', alignItems: 'center',
                      paddingLeft: 6, paddingRight: 5,
                      fontSize: 11, fontWeight: 700,
                      overflow: 'hidden',
                      cursor: 'pointer',
                      userSelect: 'none',
                    }}
                  >
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {rich.data?.label ?? ''}
                    </span>
                    <span style={{ fontSize: 10, opacity: 0.72, marginLeft: 4, flexShrink: 0, fontWeight: 500 }}>
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
