import { useMemo, useCallback, useRef, useEffect, forwardRef, useImperativeHandle } from 'react'
import { Timeline } from '@xzdarcy/react-timeline-editor'
import type { TimelineState } from '@xzdarcy/react-timeline-editor'
import type { TimelineRow, TimelineEffect, TimelineAction } from '@xzdarcy/timeline-engine'
import type { CameraPoint } from '@/types'
import { formatTime } from '@/lib/utils'
import { buildTimeline } from '@/lib/canvas'
import { useTheme } from 'next-themes'
import { Play, Pause } from 'lucide-react'

// Extended action type that carries our app-specific metadata
type RichAction = TimelineAction & {
  data?: { label: string; pointIndex: number; type: string }
}

/** Imperative handle exposed to parent for direct cursor control (bypasses React state) */
export interface TimelinePanelHandle {
  setTimeCursor: (time: number) => void
  revealTime: (time: number, smooth?: boolean) => void
}

const EFFECTS: Record<string, TimelineEffect> = {
  move:    { id: 'move',    name: '移動' },
  hold:    { id: 'hold',    name: '停留' },
  caption: { id: 'caption', name: '字幕' },
}

const ROW_CAMERA  = 'row-camera'
const ROW_CAPTION = 'row-caption'

/** Pixels rendered for 1-second scale mark */
const SCALE_WIDTH  = 80
/** Left margin reserved for row labels */
const START_LEFT   = 60
/** Height of each row in px */
const ROW_HEIGHT   = 30
/** Height of the top ruler */
const SCALE_HEIGHT = 32

interface TimelinePanelProps {
  points:              CameraPoint[]
  currentTime:         number
  totalDuration:       number
  isPreviewing:        boolean
  isDisabled:          boolean
  onTimeChange:        (time: number) => void
  onPointSelect:       (index: number) => void
  onHoldDurationChange:(pointIndex: number, duration: number) => void
  onMoveDurationChange:(pointIndex: number, duration: number) => void
  onPlay:              () => void
  onPause:             () => void
}

export default forwardRef<TimelinePanelHandle, TimelinePanelProps>(function TimelinePanel({
  points, currentTime, totalDuration, isPreviewing, isDisabled,
  onTimeChange, onPointSelect, onHoldDurationChange, onMoveDurationChange, onPlay, onPause
}, ref) {
  const { resolvedTheme } = useTheme()
  const isDark      = resolvedTheme === 'dark'
  const timelineRef = useRef<TimelineState>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  const revealTime = useCallback((time: number, smooth = true) => {
    const root = rootRef.current
    if (!root) return

    const grid = root.querySelector('.timeline-editor-edit-area .ReactVirtualized__Grid') as HTMLElement | null
    const scroller = grid || (root.querySelector('.timeline-editor-edit-area') as HTMLElement | null)
    if (!scroller) return

    const targetX = START_LEFT + Math.max(0, time) * SCALE_WIDTH
    const viewLeft = scroller.scrollLeft
    const viewRight = viewLeft + scroller.clientWidth
    const margin = 64

    if (!smooth) {
      // Playback follow mode: keep cursor near a stable focus point and move continuously.
      const focusX = scroller.clientWidth * 0.38
      const desiredLeft = Math.max(0, targetX - focusX)
      const delta = desiredLeft - viewLeft
      if (Math.abs(delta) < 0.5) return
      scroller.scrollLeft = viewLeft + delta * 0.22
      return
    }

    if (targetX < viewLeft + margin || targetX > viewRight - margin) {
      const nextLeft = Math.max(0, targetX - scroller.clientWidth * 0.35)
      scroller.scrollTo({ left: nextLeft, behavior: 'smooth' })
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

  // ── Build timeline items ────────────────────────────────────────────────
  const { items } = useMemo(() => buildTimeline(points), [points])

  const editorData: TimelineRow[] = useMemo(() => {
    const cameraActions:  TimelineAction[] = []
    const captionActions: TimelineAction[] = []

    items.forEach(item => {
      const action: RichAction = {
        id:       `${item.type}-${item.pointIndex}-${Math.round(item.start * 1000)}`,
        start:    item.start,
        end:      item.end,
        effectId: item.type,
        movable:  false,
        // move and hold blocks can be resized (right edge only)
        flexible: item.type === 'hold' || item.type === 'move',
        data: { label: item.label, pointIndex: item.pointIndex, type: item.type },
      }
      if (item.type === 'caption') captionActions.push(action as TimelineAction)
      else                         cameraActions.push(action as TimelineAction)
    })

    return [
      { id: ROW_CAMERA,  actions: cameraActions  },
      { id: ROW_CAPTION, actions: captionActions },
    ]
  }, [items])

  // ── Scale count: ensure enough tick marks to cover all content ──────────
  const scaleCount = Math.max(20, Math.ceil(totalDuration) + 4)

  // ── Callbacks ───────────────────────────────────────────────────────────
  const handleClickTime = useCallback(
    (time: number): boolean | undefined => {
      onTimeChange(time)
      return undefined
    },
    [onTimeChange]
  )

  // Stop preview while dragging, then scrub in real-time
  const handleCursorDragStart = useCallback(
    (time: number) => {
      onPause()
      onTimeChange(time)
    },
    [onPause, onTimeChange]
  )

  const handleCursorDrag = useCallback(
    (time: number) => { onTimeChange(time) },
    [onTimeChange]
  )

  // ── Move/Hold-block resize (right edge only) ────────────────────────────
  const handleResizing = useCallback(
    (params: { action: TimelineAction; row: TimelineRow; start: number; end: number; dir: 'right' | 'left' }): boolean | void => {
      // Block left-edge drag — only allow right edge
      if (params.dir === 'left') return false
      return undefined
    },
    []
  )

  const handleResizeEnd = useCallback(
    (params: { action: TimelineAction; row: TimelineRow; start: number; end: number; dir: 'right' | 'left' }) => {
      const rich = params.action as RichAction
      if (rich.data?.pointIndex === undefined) return
      const newDuration = Math.max(0.1, params.end - params.start)
      if (rich.effectId === 'hold') {
        onHoldDurationChange(rich.data.pointIndex, newDuration)
      } else if (rich.effectId === 'move') {
        onMoveDurationChange(rich.data.pointIndex, newDuration)
      }
    },
    [onHoldDurationChange, onMoveDurationChange]
  )

  const handleClickAction = useCallback(
    (_e: React.MouseEvent, params: { action: TimelineAction; row: TimelineRow; time: number }) => {
      const rich = params.action as RichAction
      if (rich.data?.pointIndex !== undefined) onPointSelect(rich.data.pointIndex)
    },
    [onPointSelect]
  )

  // ── Theme-aware colours ─────────────────────────────────────────────────
  const labelBg    = isDark ? 'hsl(217.2 32.6% 8%)'       : 'hsl(0 0% 100%)'
  const labelColor = isDark ? 'rgba(255,255,255,.50)'      : 'rgba(0,0,0,.45)'
  const borderCol  = isDark ? 'hsl(217.2 32.6% 17.5%)'    : 'hsl(214.3 31.8% 91.4%)'
  const scaleFg    = isDark ? 'rgba(255,255,255,.40)'      : 'rgba(0,0,0,.38)'
  const totalH     = SCALE_HEIGHT + ROW_HEIGHT * 2

  const getActionColors = (effectId: string) => {
    switch (effectId) {
      case 'move':    return { bg: 'rgba(37,99,235,.85)',  fg: '#ffffff' }
      case 'hold':    return { bg: 'rgba(16,185,129,.82)', fg: '#ffffff' }
      case 'caption': return { bg: 'rgba(234,179,8,.90)',  fg: '#1a1a1a' }
      default:        return { bg: 'rgba(100,100,100,.6)', fg: '#ffffff' }
    }
  }

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
      </div>

      {/* ── Main container with fixed height ── */}
      <div
        ref={rootRef}
        className="rounded-xl border overflow-hidden relative"
        style={{ height: totalH, background: labelBg, borderColor: borderCol }}
      >
        {items.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
            新增鏡頭後，這裡會顯示移動、停留與字幕區塊。
          </div>
        ) : (
          <>
            {/* ── Row labels (overlay above Timeline's startLeft area) ── */}
            <div
              className="absolute z-20 pointer-events-none"
              style={{ top: SCALE_HEIGHT, left: 0, width: START_LEFT, height: ROW_HEIGHT * 2 }}
            >
              {(['鏡頭', '字幕'] as const).map(label => (
                <div
                  key={label}
                  className="flex items-center justify-center text-[11px] font-medium"
                  style={{
                    height:      ROW_HEIGHT,
                    color:       labelColor,
                    background:  labelBg,
                    borderRight: `1px solid ${borderCol}`,
                  }}
                >
                  {label}
                </div>
              ))}
            </div>

            {/* ── Timeline component ── */}
            <Timeline
              ref={timelineRef}
              editorData={editorData}
              effects={EFFECTS}
              /* 1 second per tick mark; SCALE_WIDTH px per mark */
              scale={1}
              scaleSplitCount={4}
              scaleWidth={SCALE_WIDTH}
              startLeft={START_LEFT}
              rowHeight={ROW_HEIGHT}
              minScaleCount={scaleCount}
              maxScaleCount={scaleCount}
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
              onClickAction={handleClickAction}
              getActionRender={(action: TimelineAction) => {
                const { bg, fg } = getActionColors(action.effectId)
                const rich = action as RichAction
                return (
                  <div
                    style={{
                      width: '100%', height: '100%',
                      borderRadius: 5,
                      background: bg, color: fg,
                      display: 'flex', alignItems: 'center',
                      paddingLeft: 6,
                      fontSize: 11, fontWeight: 700,
                      overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                      cursor: 'pointer',
                    }}
                  >
                    {rich.data?.label ?? ''}
                  </div>
                )
              }}
            />
          </>
        )}
      </div>

      {/* ── Legend ── */}
      {/* {items.length > 0 && (
        <div className="flex gap-4 text-xs text-muted-foreground px-1 flex-wrap">
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-sm" style={{ background: 'rgba(37,99,235,.85)' }} />移動
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-sm" style={{ background: 'rgba(16,185,129,.82)' }} />停留
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-sm" style={{ background: 'rgba(234,179,8,.90)' }} />字幕
          </span>
          <span className="ml-auto">總時長 {formatTime(totalDuration)}</span>
        </div>
      )} */}
    </div>
  )
})
