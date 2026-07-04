import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ArrowDown, ArrowLeft, ArrowLeftRight, ArrowRight, ArrowUp, Camera,
  ChevronLeft, ChevronRight, FileText, Languages, Loader2, Mic, Pause, Play, SlidersHorizontal,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Slider } from '@/components/ui/slider'
import type { NarrationTrack, SubtitleCue, SubtitleStyle } from '@/types'
import { DEFAULT_SUBTITLE_STYLE } from '@/types'
import { clampPauseIntensity, useheadTTS } from '@/hooks/useheadTTS'
import { translateNarrationCues } from '@/lib/openrouter'
import {
  NarrationAIPanel,
  type NarrationAICameraResult,
  type NarrationAIMode,
  type NarrationAIStoryResult,
} from '@/components/panel/NarrationAIPanel'
import { createNarrationMixdown, getNarrationDuration } from '@/lib/narration'

const FONT_OPTIONS = [
  { value: "Georgia, 'Times New Roman', serif", label: 'Georgia（Classic 襯線）' },
  { value: "'Arial', Helvetica, sans-serif", label: 'Arial（現代無襯線）' },
  { value: "Impact, 'Arial Black', sans-serif", label: 'Impact（衝擊粗體）' },
  { value: "'Courier New', Courier, monospace", label: 'Courier（等寬體）' },
]

const PAUSE_LABELS = ['關閉', '很短', '短', '自然', '明顯', '偏慢', '慢節奏']

export interface NarrationSidebarProps {
  track: NarrationTrack | null
  onTrackChange: (track: NarrationTrack | null) => void
  subtitleCues: SubtitleCue[]
  onSubtitleCuesChange: (cues: SubtitleCue[]) => void
  activeSubtitleId: string | null
  onActiveSubtitleIdChange: (id: string | null) => void
  inputText: string
  onInputTextChange: (text: string) => void
  image: HTMLImageElement | null
  onApplyAiStory: (result: NarrationAIStoryResult) => void
  onApplyAiCamera: (result: NarrationAICameraResult) => void
  onApplyStyleToCameraCaption?: (style: SubtitleStyle) => void
  collapsed: boolean
  onToggleCollapse: () => void
}

function formatSecs(s: number) {
  return `${s.toFixed(1)}s`
}

function clampPosition(value: number, min = 0.05, max = 0.95) {
  return Math.max(min, Math.min(max, value))
}

function updateCueStyle(cue: SubtitleCue, patch: Partial<SubtitleStyle>): SubtitleCue {
  return {
    ...cue,
    style: {
      ...cue.style,
      ...patch,
      subtitlePosition: patch.subtitlePosition
        ? { ...patch.subtitlePosition }
        : { ...cue.style.subtitlePosition },
    },
  }
}

function writeString(view: DataView, offset: number, value: string) {
  for (let i = 0; i < value.length; i++) {
    view.setUint8(offset + i, value.charCodeAt(i))
  }
}

function createWavUrl(audioData: Float32Array, sampleRate: number) {
  const bytesPerSample = 2
  const dataSize = audioData.length * bytesPerSample
  const buffer = new ArrayBuffer(44 + dataSize)
  const view = new DataView(buffer)
  writeString(view, 0, 'RIFF')
  view.setUint32(4, 36 + dataSize, true)
  writeString(view, 8, 'WAVE')
  writeString(view, 12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * bytesPerSample, true)
  view.setUint16(32, bytesPerSample, true)
  view.setUint16(34, 8 * bytesPerSample, true)
  writeString(view, 36, 'data')
  view.setUint32(40, dataSize, true)
  let offset = 44
  for (let i = 0; i < audioData.length; i++) {
    const sample = Math.max(-1, Math.min(1, audioData[i]))
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true)
    offset += bytesPerSample
  }
  return URL.createObjectURL(new Blob([buffer], { type: 'audio/wav' }))
}

function getNarrationAudioCacheKey(track: NarrationTrack) {
  const segmentsKey = track.segments
    .map(segment => `${segment.id}:${segment.startTime}:${segment.duration}`)
    .join('|')
  return `${track.id}:${track.startTime}:${track.duration}:${segmentsKey}`
}

export function NarrationSidebar({
  track, onTrackChange,
  subtitleCues, onSubtitleCuesChange,
  activeSubtitleId, onActiveSubtitleIdChange,
  inputText, onInputTextChange,
  image, onApplyAiStory, onApplyAiCamera, onApplyStyleToCameraCaption,
  collapsed, onToggleCollapse,
}: NarrationSidebarProps) {
  const { generate, cancel, status, voices } = useheadTTS()
  const [voice, setVoice] = useState(track?.voice ?? 'af_heart')
  const [speed, setSpeed] = useState(track?.speed ?? 1)
  const [pauseIntensity, setPauseIntensity] = useState(clampPauseIntensity(track?.pauseIntensity ?? 1))
  const [playing, setPlaying] = useState(false)
  const [showPrompt, setShowPrompt] = useState(() => !inputText.trim())
  const [showSubtitleStyle, setShowSubtitleStyle] = useState(false)
  const [aiPanelMode, setAiPanelMode] = useState<NarrationAIMode | null>(null)
  const [isTranslating, setIsTranslating] = useState(false)
  const [translationError, setTranslationError] = useState('')
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const audioUrlRef = useRef<{ trackId: string; url: string } | null>(null)

  const isGenerating = status.phase === 'loading' || status.phase === 'generating'
  const activeCue = subtitleCues.find(cue => cue.id === activeSubtitleId) ?? subtitleCues[0] ?? null

  const releasePlaybackAudio = useCallback(() => {
    audioRef.current?.pause()
    audioRef.current = null
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current.url)
      audioUrlRef.current = null
    }
    setPlaying(false)
  }, [])

  useEffect(() => {
    if (track?.voice) setVoice(track.voice)
  }, [track?.voice])

  useEffect(() => {
    if (track?.speed) setSpeed(track.speed)
  }, [track?.speed])

  useEffect(() => {
    if (track?.pauseIntensity != null) setPauseIntensity(clampPauseIntensity(track.pauseIntensity))
  }, [track?.pauseIntensity])

  const handleGenerate = useCallback(async () => {
    const trimmed = inputText.trim()
    if (!trimmed || isGenerating) return
    releasePlaybackAudio()
    const shouldCreateSubtitles = subtitleCues.length === 0
    onTrackChange(null)
    if (shouldCreateSubtitles) {
      onSubtitleCuesChange([])
      onActiveSubtitleIdChange(null)
    }
    try {
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
      const result = await generate(trimmed, voice, speed, pauseIntensity)
      onTrackChange(result.track)
      if (shouldCreateSubtitles) {
        onSubtitleCuesChange(result.subtitleCues)
        onActiveSubtitleIdChange(result.subtitleCues[0]?.id ?? null)
      }
      setShowPrompt(false)
    } catch {
      // useheadTTS owns the visible status text.
    }
  }, [generate, inputText, isGenerating, onActiveSubtitleIdChange, onSubtitleCuesChange, onTrackChange, pauseIntensity, releasePlaybackAudio, speed, subtitleCues.length, voice])

  const handlePlayPause = useCallback(() => {
    if (!track) return
    if (playing) {
      audioRef.current?.pause()
      audioRef.current = null
      setPlaying(false)
      return
    }
    const mixdown = createNarrationMixdown(track)
    if (!mixdown) return
    const audioKey = getNarrationAudioCacheKey(track)
    if (audioUrlRef.current?.trackId !== audioKey) {
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current.url)
      audioUrlRef.current = {
        trackId: audioKey,
        url: createWavUrl(mixdown.audioData, mixdown.sampleRate),
      }
    }
    const source = new Audio(audioUrlRef.current.url)
    audioRef.current = source
    setPlaying(true)
    source.onended = () => {
      if (audioRef.current === source) {
        audioRef.current = null
        setPlaying(false)
      }
    }
    source.play().catch(() => {
      if (audioRef.current === source) audioRef.current = null
      setPlaying(false)
    })
  }, [playing, track])

  useEffect(() => {
    if (!track || (audioUrlRef.current && audioUrlRef.current.trackId !== track.id)) {
      releasePlaybackAudio()
    }
  }, [releasePlaybackAudio, track])

  useEffect(() => () => {
    audioRef.current?.pause()
    if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current.url)
  }, [])

  const updateActiveCue = useCallback((patch: Partial<SubtitleCue>) => {
    if (!activeCue) return
    onSubtitleCuesChange(subtitleCues.map(cue =>
      cue.id === activeCue.id ? { ...cue, ...patch } : cue
    ))
  }, [activeCue, onSubtitleCuesChange, subtitleCues])

  const swapAllCueText = useCallback(() => {
    if (!subtitleCues.length) return
    onSubtitleCuesChange(subtitleCues.map(cue => ({
      ...cue,
      text: cue.translation,
      translation: cue.text,
    })))
  }, [onSubtitleCuesChange, subtitleCues])

  const updateActiveCueStyle = useCallback((patch: Partial<SubtitleStyle>) => {
    if (!activeCue) return
    onSubtitleCuesChange(subtitleCues.map(cue =>
      cue.id === activeCue.id ? updateCueStyle(cue, patch) : cue
    ))
  }, [activeCue, onSubtitleCuesChange, subtitleCues])

  const updateActiveCuePosition = useCallback((patch: Partial<{ x: number; y: number }>) => {
    if (!activeCue) return
    const current = activeCue.style.subtitlePosition
    updateActiveCueStyle({
      subtitlePosition: {
        x: clampPosition(patch.x ?? current.x),
        y: clampPosition(patch.y ?? current.y, 0.1, 0.97),
      },
    })
  }, [activeCue, updateActiveCueStyle])

  const applyActivePositionToAll = useCallback(() => {
    if (!activeCue) return
    const position = { ...activeCue.style.subtitlePosition }
    onSubtitleCuesChange(subtitleCues.map(cue => updateCueStyle(cue, { subtitlePosition: position })))
  }, [activeCue, onSubtitleCuesChange, subtitleCues])

  const applyActiveStyleToAll = useCallback(() => {
    if (!activeCue) return
    const style = {
      ...activeCue.style,
      subtitlePosition: { ...activeCue.style.subtitlePosition },
    }
    onSubtitleCuesChange(subtitleCues.map(cue => ({ ...cue, style })))
  }, [activeCue, onSubtitleCuesChange, subtitleCues])

  const handleTranslate = useCallback(async () => {
    if (isTranslating) return
    const apiKey = localStorage.getItem('openrouter_api_key') ?? ''
    if (!apiKey.trim()) {
      setTranslationError('請先在 AI 面板輸入 OpenRouter API Key')
      return
    }
    const narrationText = (track?.text || inputText).trim()
    if (!narrationText || !subtitleCues.length) return
    setIsTranslating(true)
    setTranslationError('')
    try {
      const result = await translateNarrationCues(
        apiKey.trim(),
        narrationText,
        subtitleCues.map((cue, index) => ({
          id: cue.id,
          index,
          text: cue.text,
          startTime: cue.startTime,
          duration: cue.duration,
        })),
      )
      const translations = new Map(result.cues.map(cue => [cue.cueIndex, cue.translation]))
      onSubtitleCuesChange(subtitleCues.map((cue, index) => ({
        ...cue,
        translation: translations.get(index) ?? cue.translation,
      })))
    } catch (error) {
      setTranslationError(error instanceof Error ? error.message : '中文字幕產生失敗')
    } finally {
      setIsTranslating(false)
    }
  }, [inputText, isTranslating, onSubtitleCuesChange, subtitleCues, track])

  let statusNode: React.ReactNode = null
  if (status.phase === 'loading') {
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
        <span>{status.message}</span>
      </div>
    )
  } else if (status.phase === 'error') {
    statusNode = (
      <div className="text-xs text-red-500 rounded-md bg-red-500/10 px-2 py-1">
        {status.message}
      </div>
    )
  }

  if (collapsed) {
    return (
      <div
        className="flex-shrink-0 rounded-2xl border border-border bg-card flex flex-row lg:flex-col items-center justify-between lg:justify-between px-4 py-2 lg:py-4 cursor-pointer select-none w-full lg:w-9"
        onClick={onToggleCollapse}
        title="展開旁白面板"
      >
        <ChevronRight className="h-4 w-4 text-muted-foreground rotate-90 lg:rotate-0" />
        <span className="text-[12px] font-semibold text-muted-foreground lg:[writing-mode:vertical-rl] lg:[text-orientation:upright] lg:tracking-[2px]">
          旁白
        </span>
        <Mic className="h-4 w-4 text-muted-foreground" />
      </div>
    )
  }

  const cueStyle = activeCue?.style ?? DEFAULT_SUBTITLE_STYLE

  return (
    <aside className="w-full lg:w-72 flex-shrink-0 rounded-2xl border border-border bg-card flex flex-col overflow-hidden max-h-[70vh] lg:max-h-none">
      <div className="p-3 border-b border-border flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-1.5">
          <Mic className="h-3.5 w-3.5 text-primary" />
          <h2 className="text-[13px] font-semibold">旁白</h2>
          {track && (
            <span className="text-xs text-muted-foreground bg-muted rounded px-1">
              {formatSecs(getNarrationDuration(track))}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setAiPanelMode('story')}
            title="AI 產生英文旁白"
            className="h-7 w-7 rounded-full flex items-center justify-center hover:bg-muted transition-colors text-primary disabled:opacity-40 disabled:cursor-not-allowed"
            disabled={!image}
          >
            <Mic className="h-4 w-4" />
          </button>
          {track && subtitleCues.length > 0 && (
            <button
              onClick={() => setAiPanelMode('camera')}
              title="AI 配鏡頭"
              className="h-7 w-7 rounded-full flex items-center justify-center hover:bg-muted transition-colors text-primary disabled:opacity-40 disabled:cursor-not-allowed"
              disabled={!image}
            >
              <Camera className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={() => setShowPrompt(v => !v)}
            title="查看目前旁白內容"
            className={`h-7 w-7 rounded-full flex items-center justify-center hover:bg-muted transition-colors ${showPrompt ? 'text-primary' : 'text-muted-foreground'}`}
          >
            <FileText className="h-4 w-4" />
          </button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onToggleCollapse} title="收合旁白面板">
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {aiPanelMode && (
        <NarrationAIPanel
          mode={aiPanelMode}
          image={image}
          subtitleCues={subtitleCues}
          narrationDuration={track?.duration ?? 0}
          onApplyStory={result => {
            onApplyAiStory(result)
            setShowPrompt(true)
          }}
          onApplyCamera={onApplyAiCamera}
          onClose={() => setAiPanelMode(null)}
        />
      )}

      {showPrompt && (
        <div className="p-3 flex flex-col gap-2 flex-shrink-0">
          <Textarea
            placeholder="輸入完整英文旁白內容…"
            className="text-xs resize-none min-h-[96px]"
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
              {voices.map(v => (
                <option key={v.value} value={v.value}>{v.label}</option>
              ))}
            </select>
            {isGenerating ? (
              <Button size="sm" variant="destructive" className="text-xs px-3" onClick={cancel}>
                取消
              </Button>
            ) : (
              <Button size="sm" className="text-xs px-3" disabled={!inputText.trim()} onClick={handleGenerate}>
                生成
              </Button>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <label className="text-xs text-muted-foreground">語速</label>
              <span className="text-[10px] text-muted-foreground">{speed.toFixed(2)}x</span>
            </div>
            <Slider
              min={60} max={160} step={5}
              value={Math.round(speed * 100)}
              onChange={v => setSpeed(v / 100)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <label className="text-xs text-muted-foreground" title="可在旁白文字中加入 [pause 800] 指定停頓毫秒數">停頓感</label>
              <span className="text-[10px] text-muted-foreground">{PAUSE_LABELS[pauseIntensity]}</span>
            </div>
            <Slider
              min={0} max={6} step={1}
              value={pauseIntensity}
              onChange={v => setPauseIntensity(clampPauseIntensity(v))}
            />
          </div>
          {statusNode}
        </div>
      )}
      {!showPrompt && statusNode && (
        <div className="px-3 py-2 border-b border-border flex-shrink-0">
          {statusNode}
        </div>
      )}
      {showPrompt && track && (
        <div className="px-3 pb-3 border-b border-border flex items-center gap-2 text-xs text-muted-foreground flex-shrink-0">
          <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={handlePlayPause}>
            {playing ? <Pause className="h-3 w-3 mr-1" /> : <Play className="h-3 w-3 mr-1" />}
            {playing ? '暫停' : '播放'}
          </Button>
          <span>{subtitleCues.length} 個字幕</span>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
        {!activeCue ? (
          <p className="text-xs text-muted-foreground text-center py-6 px-2 opacity-60">
            生成旁白後，點擊時間軸上的字幕區塊即可編輯字幕卡片
          </p>
        ) : (
          <>
            <div className="rounded-lg border border-border bg-background/60 p-2 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-muted-foreground">字幕卡片</span>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-muted-foreground">
                    {formatSecs(activeCue.startTime)} / {formatSecs(activeCue.duration)}
                  </span>
                  <button
                    onClick={swapAllCueText}
                    title="對調全部英文與中文字幕"
                    className="h-6 w-6 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"
                  >
                    <ArrowLeftRight className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setShowSubtitleStyle(v => !v)}
                    title="字幕樣式"
                    className={`h-6 w-6 rounded-full flex items-center justify-center hover:bg-muted transition-colors ${showSubtitleStyle ? 'text-primary' : 'text-muted-foreground'}`}
                  >
                    <SlidersHorizontal className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <Textarea
                className="text-xs resize-none min-h-[64px]"
                value={activeCue.text}
                onChange={e => updateActiveCue({ text: e.target.value })}
              />
              <Textarea
                placeholder="中文字幕／副字幕"
                className="text-xs resize-none min-h-[64px]"
                value={activeCue.translation}
                onChange={e => updateActiveCue({ translation: e.target.value })}
              />
              <div className="flex flex-col gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs justify-center"
                  disabled={isTranslating || subtitleCues.length === 0 || !(track?.text || inputText).trim()}
                  onClick={handleTranslate}
                >
                  {isTranslating
                    ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                    : <Languages className="h-3.5 w-3.5 mr-1" />}
                  產生中文字幕
                </Button>
                {translationError && (
                  <p className="text-[10px] text-red-500 leading-snug">{translationError}</p>
                )}
              </div>
            </div>
          
          {showSubtitleStyle && (
            <div className="rounded-lg border border-border bg-background/60 p-2 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-muted-foreground">字幕位置</span>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 px-2 text-[10px]"
                  onClick={applyActivePositionToAll}
                >
                  全局位置
                </Button>
              </div>

              <div className="grid grid-cols-[1fr_auto_1fr] grid-rows-3 items-center gap-1">
                <span />
                <button
                  className="h-7 w-7 rounded border border-border bg-muted/40 hover:bg-muted flex items-center justify-center text-muted-foreground"
                  title="上移"
                  onClick={() => updateActiveCuePosition({ y: cueStyle.subtitlePosition.y - 0.01 })}
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </button>
                <span />
                <button
                  className="h-7 w-7 rounded border border-border bg-muted/40 hover:bg-muted flex items-center justify-center text-muted-foreground justify-self-end"
                  title="左移"
                  onClick={() => updateActiveCuePosition({ x: cueStyle.subtitlePosition.x - 0.01 })}
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                </button>
                <span className="text-[8px] text-muted-foreground text-center">
                  {Math.round(cueStyle.subtitlePosition.x * 100)}%H <br/>{Math.round(cueStyle.subtitlePosition.y * 100)}%V
                </span>
                <button
                  className="h-7 w-7 rounded border border-border bg-muted/40 hover:bg-muted flex items-center justify-center text-muted-foreground"
                  title="右移"
                  onClick={() => updateActiveCuePosition({ x: cueStyle.subtitlePosition.x + 0.01 })}
                >
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
                <span />
                <button
                  className="h-7 w-7 rounded border border-border bg-muted/40 hover:bg-muted flex items-center justify-center text-muted-foreground"
                  title="下移"
                  onClick={() => updateActiveCuePosition({ y: cueStyle.subtitlePosition.y + 0.01 })}
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </button>
                <span />
              </div>

              {/* <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-muted-foreground">左右</label>
                  <span className="text-[10px] text-muted-foreground">{Math.round(cueStyle.subtitlePosition.x * 100)}%</span>
                </div>
                <Slider
                  min={1} max={95} step={1}
                  value={Math.round(cueStyle.subtitlePosition.x * 100)}
                  onChange={v => updateActiveCuePosition({ x: v / 100 })}
                />
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-muted-foreground">上下</label>
                  <span className="text-[10px] text-muted-foreground">{Math.round(cueStyle.subtitlePosition.y * 100)}%</span>
                </div>
                <Slider
                  min={1} max={97} step={1}
                  value={Math.round(cueStyle.subtitlePosition.y * 100)}
                  onChange={v => updateActiveCuePosition({ y: v / 100 })}
                />
              </div> */}
            </div>
           )}

            {showSubtitleStyle && (
            <div className="rounded-lg border border-border bg-background/60 p-2 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold text-muted-foreground">字幕樣式</p>
                <div className="flex items-center gap-1">
                  {onApplyStyleToCameraCaption && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 px-2 text-[10px]"
                      title="把這組字幕樣式對應套用到目前選取鏡頭的鏡頭字幕"
                      onClick={() => onApplyStyleToCameraCaption(cueStyle)}
                    >
                      套用到鏡頭字幕
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 px-2 text-[10px]"
                    onClick={applyActiveStyleToAll}
                  >
                    套用全部
                  </Button>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">字體</label>
                <select
                  className="text-xs rounded-md border border-input bg-background px-2 py-1.5 outline-none focus:ring-1 focus:ring-ring"
                  value={cueStyle.fontFamily}
                  onChange={e => updateActiveCueStyle({ fontFamily: e.target.value })}
                >
                  {FONT_OPTIONS.map(f => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-muted-foreground">字體大小</label>
                  <span className="text-[10px] text-muted-foreground">{Math.round(cueStyle.fontSizeRatio * 1000) / 10}%</span>
                </div>
                <Slider
                  min={35} max={80} step={5}
                  value={Math.round(cueStyle.fontSizeRatio * 1000)}
                  onChange={v => updateActiveCueStyle({ fontSizeRatio: v / 1000 })}
                />
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-muted-foreground">中文字幕大小</label>
                  <span className="text-[10px] text-muted-foreground">{Math.round(cueStyle.translationScale * 100)}%</span>
                </div>
                <Slider
                  min={50} max={100} step={2}
                  value={Math.round(cueStyle.translationScale * 100)}
                  onChange={v => updateActiveCueStyle({ translationScale: v / 100 })}
                />
              </div>

              <div className="flex items-center justify-between">
                <label className="text-xs text-muted-foreground">文字顏色</label>
                <input
                  type="color"
                  value={cueStyle.color}
                  onChange={e => updateActiveCueStyle({ color: e.target.value })}
                  className="h-6 w-10 rounded border border-border bg-transparent cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between">
                <label className="text-xs text-muted-foreground">描邊</label>
                <div className="flex items-center gap-2">
                  {cueStyle.strokeEnabled && (
                    <input
                      type="color"
                      value={cueStyle.strokeColor}
                      onChange={e => updateActiveCueStyle({ strokeColor: e.target.value })}
                      className="h-6 w-10 rounded border border-border bg-transparent cursor-pointer"
                    />
                  )}
                  <button
                    className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                      cueStyle.strokeEnabled
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-muted text-muted-foreground border-border'
                    }`}
                    onClick={() => updateActiveCueStyle({ strokeEnabled: !cueStyle.strokeEnabled })}
                  >
                    {cueStyle.strokeEnabled ? '開' : '關'}
                  </button>
                </div>
              </div>
              {cueStyle.strokeEnabled && (
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-muted-foreground">描邊粗細</label>
                    <span className="text-[10px] text-muted-foreground">{cueStyle.strokeWidth}px</span>
                  </div>
                  <Slider
                    min={1} max={12} step={1}
                    value={cueStyle.strokeWidth}
                    onChange={v => updateActiveCueStyle({ strokeWidth: v })}
                  />
                </div>
              )}

              <div className="flex items-center justify-between">
                <label className="text-xs text-muted-foreground">背景條</label>
                <button
                  className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                    cueStyle.backgroundEnabled
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-muted text-muted-foreground border-border'
                  }`}
                  onClick={() => updateActiveCueStyle({ backgroundEnabled: !cueStyle.backgroundEnabled })}
                >
                  {cueStyle.backgroundEnabled ? '開' : '關'}
                </button>
              </div>
              {cueStyle.backgroundEnabled && (
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-muted-foreground">背景不透明度</label>
                    <span className="text-[10px] text-muted-foreground">{Math.round(cueStyle.backgroundOpacity * 100)}%</span>
                  </div>
                  <Slider
                    min={10} max={90} step={5}
                    value={Math.round(cueStyle.backgroundOpacity * 100)}
                    onChange={v => updateActiveCueStyle({ backgroundOpacity: v / 100 })}
                  />
                </div>
              )}

              <div className="flex items-center justify-between">
                <label className="text-xs text-muted-foreground">陰影</label>
                <button
                  className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                    cueStyle.shadowEnabled
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-muted text-muted-foreground border-border'
                  }`}
                  onClick={() => updateActiveCueStyle({ shadowEnabled: !cueStyle.shadowEnabled })}
                >
                  {cueStyle.shadowEnabled ? '開' : '關'}
                </button>
              </div>

              {cueStyle.shadowEnabled && (
                <>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs text-muted-foreground">模糊強度</label>
                      <span className="text-[10px] text-muted-foreground">{cueStyle.shadowBlur}</span>
                    </div>
                    <Slider
                      min={0} max={24} step={1}
                      value={cueStyle.shadowBlur}
                      onChange={v => updateActiveCueStyle({ shadowBlur: v })}
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs text-muted-foreground">陰影透明度</label>
                      <span className="text-[10px] text-muted-foreground">{Math.round(cueStyle.shadowOpacity * 100)}%</span>
                    </div>
                    <Slider
                      min={10} max={100} step={5}
                      value={Math.round(cueStyle.shadowOpacity * 100)}
                      onChange={v => updateActiveCueStyle({ shadowOpacity: v / 100 })}
                    />
                  </div>
                </>
              )}
            </div>
            )}
          </>
        )}
      </div>
    </aside>
  )
}
