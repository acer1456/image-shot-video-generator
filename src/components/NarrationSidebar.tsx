import { useState, useCallback, useRef } from 'react'
import {
  ChevronLeft, ChevronRight, Mic, Play, Pause, Trash2,
  ArrowUp, ArrowDown, Loader2, PenLine, RotateCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Slider } from '@/components/ui/slider'
import type { NarrationSegment, SubtitleStyle } from '@/types'
import { useKokoroTTS, splitIntoSentences } from '@/hooks/useKokoroTTS'

// ── Voice definitions ───────────────────────────────────────────────────
const VOICES = [
  { value: 'af_heart',   label: 'Heart (英式女聲・溫暖)' },
  { value: 'af_sky',     label: 'Sky (美式女聲・明亮)' },
  { value: 'af_bella',   label: 'Bella (美式女聲・優雅)' },
  { value: 'af_sarah',   label: 'Sarah (美式女聲)' },
  { value: 'af_nova',    label: 'Nova (美式女聲)' },
  { value: 'af_nicole',  label: 'Nicole (美式女聲)' },
  { value: 'am_adam',    label: 'Adam (美式男聲)' },
  { value: 'am_michael', label: 'Michael (美式男聲)' },
  { value: 'am_echo',    label: 'Echo (美式男聲)' },
  { value: 'am_liam',    label: 'Liam (美式男聲)' },
  { value: 'bf_emma',    label: 'Emma (英式女聲)' },
  { value: 'bf_isabella',label: 'Isabella (英式女聲)' },
  { value: 'bm_george',  label: 'George (英式男聲)' },
  { value: 'bm_lewis',   label: 'Lewis (英式男聲)' },
]

const FONT_OPTIONS = [
  { value: "Georgia, 'Times New Roman', serif", label: 'Georgia（Classic 襯線）' },
  { value: "'Arial', Helvetica, sans-serif", label: 'Arial（現代無襯線）' },
  { value: "Impact, 'Arial Black', sans-serif", label: 'Impact（衝擊粗體）' },
  { value: "'Courier New', Courier, monospace", label: 'Courier（等寬體）' },
]

export interface NarrationSidebarProps {
  segments: NarrationSegment[]
  onSegmentsChange: (segs: NarrationSegment[]) => void
  inputText: string
  onInputTextChange: (text: string) => void
  subtitleStyle: SubtitleStyle
  onSubtitleStyleChange: (style: SubtitleStyle) => void
  collapsed: boolean
  onToggleCollapse: () => void
}

function formatSecs(s: number) {
  return `${s.toFixed(1)}s`
}

// Play a single segment's audio via Web Audio
function playSegmentAudio(seg: NarrationSegment, audioCtxRef: React.RefObject<AudioContext | null>) {
  if (!seg.audioData || !seg.samplingRate) return
  if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
    audioCtxRef.current = new AudioContext()
  }
  const ctx = audioCtxRef.current
  const buffer = ctx.createBuffer(1, seg.audioData.length, seg.samplingRate)
  buffer.copyToChannel(seg.audioData, 0)
  const source = ctx.createBufferSource()
  source.buffer = buffer
  source.connect(ctx.destination)
  source.start()
  return source
}

export function NarrationSidebar({
  segments, onSegmentsChange, inputText, onInputTextChange,
  subtitleStyle, onSubtitleStyleChange, collapsed, onToggleCollapse,
}: NarrationSidebarProps) {
  const [voice, setVoice] = useState('af_heart')
  const [showInput, setShowInput] = useState(true)
  const { generate, status, cancel } = useKokoroTTS()
  const audioCtxRef = useRef<AudioContext | null>(null)
  const [playingId, setPlayingId] = useState<string | null>(null)
  const playingSourceRef = useRef<AudioBufferSourceNode | null>(null)

  const isGenerating = status.phase === 'loading_model' || status.phase === 'generating'
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null)

  // ── Generate handler ──────────────────────────────────────────────────
  const cursorRef = useRef(0)

  const handleGenerate = useCallback(async () => {
    const trimmed = inputText.trim()
    if (!trimmed || isGenerating) return
    const sentences = splitIntoSentences(trimmed)
    if (!sentences.length) return

    // Reset before starting a new batch
    cursorRef.current = 0
    onSegmentsChange([])

    // Auto-hide input area after generation starts so style panel is visible
    setShowInput(false)

    // Accumulate segments locally; push the full array to parent on each new card
    // so the UI always sees the growing list without needing a functional updater.
    const acc: NarrationSegment[] = []

    await generate(sentences, voice, (r) => {
      const start = cursorRef.current
      cursorRef.current += r.duration
      acc.push({
        id: r.id,
        text: r.text,
        startTime: start,
        duration: r.duration,
        audioData: r.audioData,
        samplingRate: r.samplingRate,
      })
      onSegmentsChange([...acc])
    })
  }, [inputText, voice, isGenerating, generate, onSegmentsChange])

  // ── Single-segment regenerate ─────────────────────────────────────
  const handleRegenerateSegment = useCallback(async (id: string) => {
    if (isGenerating) return
    const seg = segments.find(s => s.id === id)
    if (!seg || !seg.text.trim()) return
    setRegeneratingId(id)
    try {
      await generate([seg.text], voice, (r) => {
        onSegmentsChange(segments.map(s =>
          s.id === id ? { ...s, audioData: r.audioData, samplingRate: r.samplingRate, duration: r.duration } : s
        ))
      })
    } finally {
      setRegeneratingId(null)
    }
  }, [isGenerating, segments, generate, voice, onSegmentsChange])

  // ── Segment card operations ───────────────────────────────────────────
  const updateSegment = useCallback((id: string, patch: Partial<NarrationSegment>) => {
    onSegmentsChange(segments.map(s => s.id === id ? { ...s, ...patch } : s))
  }, [segments, onSegmentsChange])

  const deleteSegment = useCallback((id: string) => {
    onSegmentsChange(segments.filter(s => s.id !== id))
  }, [segments, onSegmentsChange])

  const moveSegment = useCallback((id: string, dir: 'up' | 'down') => {
    const idx = segments.findIndex(s => s.id === id)
    if (idx < 0) return
    const next = [...segments]
    const other = dir === 'up' ? idx - 1 : idx + 1
    if (other < 0 || other >= next.length) return
    // Swap startTimes so their positions follow the new order
    const tmpTime = next[idx].startTime
    next[idx] = { ...next[idx], startTime: next[other].startTime }
    next[other] = { ...next[other], startTime: tmpTime }
    // Swap array positions
    ;[next[idx], next[other]] = [next[other], next[idx]]
    onSegmentsChange(next)
  }, [segments, onSegmentsChange])

  const handlePlayPause = useCallback((seg: NarrationSegment) => {
    if (playingId === seg.id) {
      playingSourceRef.current?.stop()
      playingSourceRef.current = null
      setPlayingId(null)
      return
    }
    // Stop previous
    playingSourceRef.current?.stop()
    playingSourceRef.current = null
    const source = playSegmentAudio(seg, audioCtxRef)
    if (source) {
      playingSourceRef.current = source
      setPlayingId(seg.id)
      source.onended = () => {
        if (playingSourceRef.current === source) {
          playingSourceRef.current = null
          setPlayingId(null)
        }
      }
    }
  }, [playingId])

  // ── Collapsed strip ───────────────────────────────────────────────────
  if (collapsed) {
    return (
      <div
        className="flex-shrink-0 rounded-xl border border-border bg-card flex flex-col items-center justify-between py-4 cursor-pointer select-none"
        style={{ width: 36 }}
        onClick={onToggleCollapse}
        title="展開旁白面板"
      >
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
        <span
          className="text-[11px] font-semibold text-muted-foreground"
          style={{ writingMode: 'vertical-rl', textOrientation: 'upright', letterSpacing: 2 }}
        >
          旁白
        </span>
        <Mic className="h-4 w-4 text-muted-foreground" />
      </div>
    )
  }

  // ── Status message ────────────────────────────────────────────────────
  let statusNode: React.ReactNode = null
  if (status.phase === 'loading_model') {
    statusNode = (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        <span>{status.message}</span>
        <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-primary transition-all" style={{ width: `${status.progress}%` }} />
        </div>
      </div>
    )
  } else if (status.phase === 'generating') {
    statusNode = (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        <span>生成第 {status.segIndex + 1} / {status.total} 句…</span>
      </div>
    )
  } else if (status.phase === 'error') {
    statusNode = (
      <div className="text-xs text-red-500 rounded-md bg-red-500/10 px-2 py-1">
        {status.message}
      </div>
    )
  }

  return (
    <aside className="w-72 flex-shrink-0 rounded-xl border border-border bg-card flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-3 border-b border-border flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-1.5">
          <Mic className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-bold">旁白</h2>
          {segments.length > 0 && (
            <span className="text-xs text-muted-foreground bg-muted rounded px-1">
              {segments.length}段
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost" size="icon" className="h-7 w-7"
            onClick={() => setShowInput(v => !v)}
            title={showInput ? '隱藏輸入框，顯示字幕樣式' : '顯示輸入框'}
          >
            <PenLine className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onToggleCollapse} title="收合旁白面板">
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Input area (toggle) */}
      {showInput ? (
        <div className="p-3 border-b border-border flex flex-col gap-2 flex-shrink-0">
          <Textarea
            placeholder="輸入旁白內容（支援多句，按句子分段生成）…"
            className="text-xs resize-none min-h-[80px]"
            value={inputText}
            onChange={e => onInputTextChange(e.target.value)}
            disabled={isGenerating}
          />
          <div className="flex gap-2">
            <select
              className="flex-1 text-xs rounded-md border border-input bg-background px-2 py-1.5 outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
              value={voice}
              onChange={e => setVoice(e.target.value)}
              disabled={isGenerating}
            >
              {VOICES.map(v => (
                <option key={v.value} value={v.value}>{v.label}</option>
              ))}
            </select>
            {isGenerating ? (
              <Button size="sm" variant="destructive" className="text-xs px-3" onClick={cancel}>
                取消
              </Button>
            ) : (
              <Button
                size="sm"
                className="text-xs px-3"
                disabled={!inputText.trim()}
                onClick={handleGenerate}
              >
                生成
              </Button>
            )}
          </div>
          {statusNode}
        </div>
      ) : (
        /* Subtitle style panel */
        <div className="p-3 border-b border-border flex flex-col gap-3 flex-shrink-0">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">字幕樣式</p>

          {/* Font family */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">字體</label>
            <select
              className="text-xs rounded-md border border-input bg-background px-2 py-1.5 outline-none focus:ring-1 focus:ring-ring"
              value={subtitleStyle.fontFamily}
              onChange={e => onSubtitleStyleChange({ ...subtitleStyle, fontFamily: e.target.value })}
            >
              {FONT_OPTIONS.map(f => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>

          {/* Font size */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <label className="text-xs text-muted-foreground">字體大小</label>
              <span className="text-[10px] text-muted-foreground">{Math.round(subtitleStyle.fontSizeRatio * 1000) / 10}%</span>
            </div>
            <Slider
              min={35} max={80} step={5}
              value={Math.round(subtitleStyle.fontSizeRatio * 1000)}
              onChange={v => onSubtitleStyleChange({ ...subtitleStyle, fontSizeRatio: v / 1000 })}
            />
          </div>

          {/* Shadow toggle */}
          <div className="flex items-center justify-between">
            <label className="text-xs text-muted-foreground">陰影</label>
            <button
              className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                subtitleStyle.shadowEnabled
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-muted text-muted-foreground border-border'
              }`}
              onClick={() => onSubtitleStyleChange({ ...subtitleStyle, shadowEnabled: !subtitleStyle.shadowEnabled })}
            >
              {subtitleStyle.shadowEnabled ? '開' : '關'}
            </button>
          </div>

          {subtitleStyle.shadowEnabled && (
            <>
              {/* Shadow blur */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-muted-foreground">模糊強度</label>
                  <span className="text-[10px] text-muted-foreground">{subtitleStyle.shadowBlur}</span>
                </div>
                <Slider
                  min={0} max={24} step={1}
                  value={subtitleStyle.shadowBlur}
                  onChange={v => onSubtitleStyleChange({ ...subtitleStyle, shadowBlur: v })}
                />
              </div>

              {/* Shadow opacity */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-muted-foreground">陰影透明度</label>
                  <span className="text-[10px] text-muted-foreground">{Math.round(subtitleStyle.shadowOpacity * 100)}%</span>
                </div>
                <Slider
                  min={10} max={100} step={5}
                  value={Math.round(subtitleStyle.shadowOpacity * 100)}
                  onChange={v => onSubtitleStyleChange({ ...subtitleStyle, shadowOpacity: v / 100 })}
                />
              </div>
            </>
          )}

          {statusNode && <div>{statusNode}</div>}
        </div>
      )}

      {/* Segment cards */}
      <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-2">
        {segments.length === 0 && !isGenerating && (
          <p className="text-xs text-muted-foreground text-center py-6 px-2 opacity-60">
            輸入文字並點擊「生成」後，旁白片段會出現在這裡
          </p>
        )}
        {segments.map((seg, idx) => (
          <SegmentCard
            key={seg.id}
            seg={seg}
            index={idx}
            total={segments.length}
            isPlaying={playingId === seg.id}
            isRegenerating={regeneratingId === seg.id}
            isGenerating={isGenerating}
            onTextChange={text => updateSegment(seg.id, { text })}
            onStartTimeChange={startTime => updateSegment(seg.id, { startTime })}
            onDelete={() => deleteSegment(seg.id)}
            onMoveUp={() => moveSegment(seg.id, 'up')}
            onMoveDown={() => moveSegment(seg.id, 'down')}
            onPlayPause={() => handlePlayPause(seg)}
            onRegenerate={() => handleRegenerateSegment(seg.id)}
          />
        ))}
      </div>
    </aside>
  )
}

// ── SegmentCard sub-component ─────────────────────────────────────────────
interface SegmentCardProps {
  seg: NarrationSegment
  index: number
  total: number
  isPlaying: boolean
  isRegenerating?: boolean
  isGenerating?: boolean
  onTextChange: (text: string) => void
  onStartTimeChange: (t: number) => void
  onDelete: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  onPlayPause: () => void
  onRegenerate?: () => void
}

function SegmentCard({
  seg, index, total, isPlaying, isRegenerating, isGenerating,
  onTextChange, onStartTimeChange, onDelete, onMoveUp, onMoveDown, onPlayPause, onRegenerate,
}: SegmentCardProps) {
  const [editingText, setEditingText] = useState(false)
  const [localText, setLocalText] = useState(seg.text)
  const [localStart, setLocalStart] = useState(String(seg.startTime.toFixed(1)))

  const commitText = () => {
    setEditingText(false)
    const t = localText.trim()
    if (t && t !== seg.text) onTextChange(t)
    else setLocalText(seg.text)
  }

  const commitStart = () => {
    const v = parseFloat(localStart)
    if (!isNaN(v) && v >= 0) onStartTimeChange(Math.round(v * 10) / 10)
    else setLocalStart(String(seg.startTime.toFixed(1)))
  }

  return (
    <div className="rounded-lg border border-border bg-background/60 p-2 flex flex-col gap-1.5">
      {/* Row 1: index + time badge + actions */}
      <div className="flex items-center gap-1">
        <span className="text-[10px] font-bold text-muted-foreground w-4 text-center">{index + 1}</span>
        {/* Start time */}
        <input
          className="w-12 text-[10px] text-center bg-muted/60 border border-transparent focus:border-border rounded px-1 py-0.5 outline-none"
          value={localStart}
          onChange={e => setLocalStart(e.target.value)}
          onBlur={commitStart}
          onKeyDown={e => e.key === 'Enter' && commitStart()}
          title="起始時間 (秒)"
        />
        <span className="text-[10px] text-muted-foreground">+{formatSecs(seg.duration)}</span>
        <div className="flex-1" />
        {/* Play/pause */}
        {seg.audioData && (
          <button
            className="p-1 rounded hover:bg-muted/80 text-primary"
            onClick={onPlayPause}
            title={isPlaying ? '暫停' : '播放'}
          >
            {isPlaying
              ? <Pause className="h-3 w-3" />
              : <Play className="h-3 w-3" />}
          </button>
        )}
        {/* Regenerate audio */}
        <button
          className="p-1 rounded hover:bg-muted/80 text-muted-foreground disabled:opacity-30"
          onClick={onRegenerate}
          disabled={isGenerating}
          title={seg.audioData ? '重新生成語音' : '生成語音'}
        >
          {isRegenerating
            ? <Loader2 className="h-3 w-3 animate-spin" />
            : <RotateCw className="h-3 w-3" />}
        </button>
        {/* Move up */}
        <button
          className="p-1 rounded hover:bg-muted/80 text-muted-foreground disabled:opacity-30"
          onClick={onMoveUp}
          disabled={index === 0}
          title="上移"
        >
          <ArrowUp className="h-3 w-3" />
        </button>
        {/* Move down */}
        <button
          className="p-1 rounded hover:bg-muted/80 text-muted-foreground disabled:opacity-30"
          onClick={onMoveDown}
          disabled={index === total - 1}
          title="下移"
        >
          <ArrowDown className="h-3 w-3" />
        </button>
        {/* Delete */}
        <button
          className="p-1 rounded hover:bg-red-500/20 text-muted-foreground hover:text-red-500"
          onClick={onDelete}
          title="刪除"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>

      {/* Row 2: text */}
      {editingText ? (
        <textarea
          autoFocus
          className="w-full text-xs bg-muted/60 border border-border rounded px-2 py-1 resize-none outline-none focus:ring-1 focus:ring-ring"
          rows={2}
          value={localText}
          onChange={e => setLocalText(e.target.value)}
          onBlur={commitText}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commitText() } }}
        />
      ) : (
        <p
          className="text-xs text-foreground leading-relaxed cursor-text rounded px-1 hover:bg-muted/40 transition-colors"
          onClick={() => { setLocalText(seg.text); setEditingText(true) }}
          title="點擊編輯文字"
        >
          {seg.text || <span className="italic text-muted-foreground">（空白）</span>}
        </p>
      )}
    </div>
  )
}
