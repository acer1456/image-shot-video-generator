import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertCircle, CheckCircle2, ChevronDown, Loader2, RefreshCw, Sparkles, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createAiTimeoutSignal, fetchOpenRouterModels, isAbortError, parseAiJsonObject, type OpenRouterModelInfo } from '@/lib/openrouter'
import type { SubtitleCue } from '@/types'

const LS_KEY_KEY = 'openrouter_api_key'
const LS_KEY_MODEL = 'openrouter_model'
const LS_KEY_MODEL_NAME = 'openrouter_model_name'

const STORY_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['narrationInputText'],
  properties: {
    narrationInputText: { type: 'string' },
  },
}

function buildCameraSchema(subtitleCues: SubtitleCue[]) {
  const cueIds = subtitleCues.map(cue => cue.id)
  return {
  type: 'object',
  additionalProperties: false,
  required: ['cameraBeats'],
  properties: {
    cameraBeats: {
      type: 'array',
      minItems: Math.max(1, cueIds.length),
      maxItems: Math.max(1, cueIds.length),
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['cueId', 'x', 'y', 'zoom', 'move', 'moveDuration', 'captionX', 'captionY'],
        properties: {
          cueId: cueIds.length ? { type: 'string', enum: cueIds } : { type: 'string' },
          x: { type: 'number' },
          y: { type: 'number' },
          zoom: { type: 'number' },
          move: { type: 'string', enum: ['slide', 'jump'] },
          moveDuration: { type: 'number' },
          captionX: { type: 'number' },
          captionY: { type: 'number' },
        },
      },
    },
  },
}
}

const DEFAULT_SCRIPT_PROMPT = `You are a scriptwriter who specializes in Instagram Reels voiceover scripts for art analysis.

Based on the artwork information I provide, write a voiceover script suitable for a {{MIN_SECONDS}}-{{MAX_SECONDS}} second Instagram Reel.
The style should feel like "a quiet story with hidden tension," not an academic lecture.

First, search online for the painting's introduction, historical background, museum information, and other reviews or interpretations.
Use them as reference, but do not overload the final script with facts.
Do not invent unsupported stories about the painting.

Please follow this style:
1. The opening must be compelling and make people want to keep watching.
2. Sentences should be short and subtitle-friendly.
3. Avoid sounding too academic. Make it feel visual and story-like.
4. Describe the figures, gestures, expressions, positions, and symbolic details in the painting.
5. Give the script a clear narrative structure: beginning, development, turn, ending.
6. You may describe emotion, conflict, and a sense of fate, but do not fabricate a story without support.
7. If the painting includes saints, donors, mythological figures, historical figures, or symbols, verify them and include them clearly when relevant.
8. If something is uncertain, use careful language such as "possibly," "believed to be," or "the painting makes us feel."
9. The overall tone should be story-driven, quiet, mysterious, and slightly reverent.
10. Avoid heavy art-historical jargon.

Return only JSON:
{ "narrationInputText": "English voiceover script only." }`

export type NarrationAIMode = 'story' | 'camera'

export interface NarrationAIStoryResult {
  narrationInputText: string
}

export interface NarrationAICameraResult {
  points: NarrationAIPoint[]
}

export interface NarrationAIPoint {
  x: number
  y: number
  zoom: number
  move: 'slide' | 'jump'
  moveDuration: number
  holdDuration: number
  caption: {
    text: string
    subtitle: string
    x?: number
    y?: number
    captionX?: number
    captionY?: number
  }
}

interface CameraBeatResponse {
  cameraBeats: Array<{
    cueId: string
    x: number
    y: number
    zoom: number
    move: 'slide' | 'jump'
    moveDuration: number
    captionX: number
    captionY: number
  }>
}

interface NarrationAIPanelProps {
  mode: NarrationAIMode
  image: HTMLImageElement | null
  subtitleCues?: SubtitleCue[]
  narrationDuration?: number
  onApplyStory: (result: NarrationAIStoryResult) => void
  onApplyCamera: (result: NarrationAICameraResult) => void
  onClose: () => void
}

type Status = 'idle' | 'loading' | 'success' | 'error'

function imageToDataUrl(img: HTMLImageElement): string {
  const canvas = document.createElement('canvas')
  const MAX = 1024
  const scale = Math.min(1, MAX / Math.max(img.naturalWidth, img.naturalHeight))
  canvas.width = Math.round(img.naturalWidth * scale)
  canvas.height = Math.round(img.naturalHeight * scale)
  canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/jpeg', 0.85)
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Number.isFinite(value) ? value : min))
}

function formatPrice(p: string): string {
  const n = parseFloat(p)
  if (!n || Number.isNaN(n)) return '免費'
  const per1m = n * 1_000_000
  return per1m < 0.01 ? `$${per1m.toFixed(4)}/1M` : `$${per1m.toFixed(2)}/1M`
}

function normalizeStoryResult(raw: unknown): NarrationAIStoryResult {
  const data = raw as Partial<NarrationAIStoryResult>
  return { narrationInputText: String(data.narrationInputText ?? '').trim() }
}

function getCueSpanDuration(cues: SubtitleCue[], index: number, narrationDuration: number) {
  const cue = cues[index]
  const next = cues[index + 1]
  const endTime = next
    ? next.startTime
    : Math.max(narrationDuration, cue.startTime + cue.duration)
  return Math.max(0.2, endTime - cue.startTime)
}

function isSameCamera(a: { x: number; y: number; zoom: number } | null, b: { x: number; y: number; zoom: number }) {
  if (!a) return false
  return Math.abs(a.x - b.x) < 0.015 && Math.abs(a.y - b.y) < 0.015 && Math.abs(a.zoom - b.zoom) < 0.08
}

function normalizeMoveDuration(value: number, spanDuration: number, hasVisualMove: boolean, isFirst: boolean) {
  if (isFirst || !hasVisualMove) return Math.min(0.1, spanDuration)
  const holdTarget = spanDuration >= 3 ? 1 : Math.min(0.5, spanDuration * 0.35)
  const maxMove = Math.max(0.1, spanDuration - holdTarget)
  const minMove = Math.min(1.5, maxMove)
  return clamp(value || 1.7, minMove, Math.min(2, maxMove))
}

function normalizeCameraResult(raw: CameraBeatResponse, subtitleCues: SubtitleCue[], narrationDuration: number): NarrationAICameraResult {
  const cameraMap = new Map((Array.isArray(raw.cameraBeats) ? raw.cameraBeats : [])
    .filter(beat => subtitleCues.some(cue => cue.id === String(beat.cueId)))
    .map(beat => [String(beat.cueId), beat]))
  let previousCamera: { x: number; y: number; zoom: number } | null = null
  return {
    points: subtitleCues.map((cue, index) => {
      const beat = cameraMap.get(cue.id)
      const spanDuration = getCueSpanDuration(subtitleCues, index, narrationDuration)
      const camera = {
        x: clamp(Number(beat?.x ?? previousCamera?.x ?? 0.5), 0, 1),
        y: clamp(Number(beat?.y ?? previousCamera?.y ?? 0.5), 0, 1),
        zoom: clamp(Number(beat?.zoom ?? previousCamera?.zoom ?? (index === 0 ? 1 : 2)), 1, 15),
      }
      const hasVisualMove = !isSameCamera(previousCamera, camera)
      const moveDuration = normalizeMoveDuration(Number(beat?.moveDuration) || 0, spanDuration, hasVisualMove, index === 0)
      previousCamera = camera
      return {
        x: camera.x,
        y: camera.y,
        zoom: camera.zoom,
        move: beat?.move === 'jump' ? 'jump' : 'slide',
        moveDuration,
        holdDuration: Math.max(0.1, spanDuration - moveDuration),
        caption: {
          text: '',
          subtitle: '',
          x: clamp(Number(beat?.captionX ?? cue.style?.subtitlePosition?.x ?? 0.5), 0, 1),
          y: clamp(Number(beat?.captionY ?? cue.style?.subtitlePosition?.y ?? 0.87), 0, 1),
        },
      }
    }),
  }
}

function validateCameraMotion(result: NarrationAICameraResult) {
  if (result.points.length <= 1) return
  let visualMoveCount = 0
  for (let index = 1; index < result.points.length; index++) {
    const previous = result.points[index - 1]
    const current = result.points[index]
    if (!isSameCamera(previous, current)) visualMoveCount++
  }
  const transitionCount = result.points.length - 1
  const minVisualMoves = Math.max(1, Math.ceil(transitionCount * 0.15))
  const maxVisualMoves = Math.max(1, Math.ceil(transitionCount * 0.6))
  if (visualMoveCount < minVisualMoves) {
    throw new Error(`AI 鏡頭變化太少（${visualMoveCount}/${transitionCount}），請重新產生更明顯的鏡頭移動`)
  }
  if (visualMoveCount > maxVisualMoves) {
    throw new Error(`AI 鏡頭變化太頻繁（${visualMoveCount}/${transitionCount}），請讓每 2–3 個字幕共用一個鏡頭`)
  }
}

function validateCameraCoverage(raw: CameraBeatResponse, subtitleCues: SubtitleCue[]) {
  if (!Array.isArray(raw.cameraBeats)) throw new Error('缺少 cameraBeats 陣列')
  const cueIds = new Set(subtitleCues.map(cue => cue.id))
  const returnedIds = new Set(raw.cameraBeats.map(beat => String(beat.cueId)))
  const missing = [...cueIds].filter(id => !returnedIds.has(id))
  if (missing.length) {
    throw new Error(`AI 缺少 ${missing.length} 個字幕鏡頭`)
  }
}

function buildStoryInstruction(
  info: { title: string; artist: string; year: string; location: string },
  minSeconds: number,
  maxSeconds: number,
) {
  const prompt = DEFAULT_SCRIPT_PROMPT
    .replace('{{MIN_SECONDS}}', String(minSeconds))
    .replace('{{MAX_SECONDS}}', String(maxSeconds))
  return `${prompt}

Artwork information:
Title: ${info.title || '(unknown)'}
Artist: ${info.artist || '(unknown)'}
Year: ${info.year || '(unknown)'}
Current location: ${info.location || '(unknown)'}`
}

function buildCameraInstruction(subtitleCues: SubtitleCue[]) {
  return `You are a cinematic camera planner for a 9:16 art analysis video.

The voiceover audio and subtitle timeline already exist. Do not change any text or timing.
Use the artwork image and the timeline cues to choose one camera position for each cue.

Return only JSON:
{
  "cameraBeats": [
    {
      "cueId": "same cue id",
      "x": 0.5,
      "y": 0.5,
      "zoom": 1,
      "move": "slide",
      "moveDuration": 0.1,
      "captionX": 0.5,
      "captionY": 0.87
    }
  ]
}

Rules:
- Return exactly one cameraBeat for each input cueId.
- cameraBeats.length must be exactly ${subtitleCues.length}.
- cueId must be copied exactly from the input cueId values.
- Do not invent or alter subtitle timing.
- First cue should usually show the full painting: x=0.5, y=0.5, zoom=1, moveDuration=0.1.
- x/y are normalized focal centers from 0 to 1.
- zoom is 1 to 15.
- Use "slide" for almost every camera change. Use "jump" only for a rare, intentional scene break.
- Do not create a new camera position for every cue.
- Normally group 2–3 adjacent cues into one shot by repeating exactly the same x/y/zoom for every cue in that group.
- A single-cue shot is allowed only for an important reveal or a clearly different visual detail.
- Aim for only 30–50% of adjacent cameraBeats to change x, y, or zoom.
- Plan camera positions as a continuous visual path across the painting. Prefer nearby focal points and smooth directional pans instead of jumping between distant areas.
- When changing camera position or zoom, moveDuration should be 1.5-2.0 seconds when the cue span allows it.
- Leave at least 1-2 seconds of hold time after a move when possible. For very short cues, choose the closest slower move that still leaves visible hold time.
- Choose camera positions that visually match the cue's story meaning.
- captionX/captionY controls the narration subtitle position. Default 0.5/0.87, move it only if it covers important visual details.

Subtitle timeline:
${JSON.stringify(subtitleCues.map(cue => ({
    cueId: cue.id,
    text: cue.text,
    translation: cue.translation,
    startTime: cue.startTime,
    duration: cue.duration,
  })), null, 2)}`
}

async function requestStructuredJson(params: {
  apiKey: string
  model: string
  image: HTMLImageElement
  prompt: string
  schema: Record<string, unknown>
  schemaName: string
  maxTokens: number
}) {
  let response: Response
  try {
    response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    signal: createAiTimeoutSignal(),
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${params.apiKey.trim()}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': window.location.origin,
      'X-Title': 'Artful Learning Narration AI',
    },
    body: JSON.stringify({
      model: params.model,
      provider: { require_parameters: true },
      messages: [{
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: imageToDataUrl(params.image) } },
          { type: 'text', text: params.prompt },
        ],
      }],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: params.schemaName,
          strict: true,
          schema: params.schema,
        },
      },
      max_tokens: params.maxTokens,
    }),
    })
  } catch (error) {
    if (isAbortError(error)) throw new Error('AI 請求逾時，請重試或換模型')
    throw error
  }

  if (!response.ok) {
    let message = `API 錯誤 ${response.status}`
    try {
      const err = await response.json()
      if (err?.error?.message) message = err.error.message
    } catch { /* ignore */ }
    throw new Error(message)
  }

  const data = await response.json()
  const raw = String(data.choices?.[0]?.message?.content ?? '')
  if (!raw) throw new Error('AI 未回傳任何內容')
  return parseAiJsonObject<unknown>(raw, 'AI 回傳的 JSON 無法解析')
}

interface ModelComboboxProps {
  apiKey: string
  selectedId: string
  selectedName: string
  onSelect: (id: string, name: string) => void
}

function ModelCombobox({ apiKey, selectedId, selectedName, onSelect }: ModelComboboxProps) {
  const [models, setModels] = useState<OpenRouterModelInfo[]>([])
  const [fetchStatus, setFetchStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [fetchError, setFetchError] = useState('')
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const loadModels = useCallback(async () => {
    if (!apiKey.trim()) return
    setFetchStatus('loading')
    setFetchError('')
    try {
      const list = await fetchOpenRouterModels(apiKey.trim())
      setModels(list)
      setFetchStatus('done')
    } catch (error) {
      setFetchError(error instanceof Error ? error.message : '載入失敗')
      setFetchStatus('error')
    }
  }, [apiKey])

  useEffect(() => {
    if (isOpen && fetchStatus === 'idle' && apiKey.trim()) loadModels()
  }, [apiKey, fetchStatus, isOpen, loadModels])

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filtered = query.trim()
    ? models.filter(model =>
      model.id.toLowerCase().includes(query.toLowerCase()) ||
      model.name.toLowerCase().includes(query.toLowerCase()),
    )
    : models

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => {
          setIsOpen(true)
          setTimeout(() => inputRef.current?.focus(), 10)
        }}
        className="w-full h-9 px-3 flex items-center gap-2 rounded-lg border border-input bg-background text-sm text-left hover:bg-accent transition-colors"
      >
        <span className="flex-1 truncate text-foreground">{selectedName || selectedId || '選擇模型…'}</span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      </button>
      {isOpen && (
        <div className="absolute z-[110] mt-1 w-full rounded-xl border border-border bg-card shadow-xl overflow-hidden">
          <div className="flex gap-1 p-2 border-b border-border">
            <Input
              ref={inputRef}
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="搜尋模型…"
              className="h-8 text-xs flex-1"
            />
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={loadModels} disabled={!apiKey.trim() || fetchStatus === 'loading'}>
              <RefreshCw className={`h-3.5 w-3.5 ${fetchStatus === 'loading' ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          <div className="max-h-64 overflow-y-auto p-1">
            {!apiKey.trim() && <div className="p-3 text-xs text-muted-foreground">請先輸入 API Key</div>}
            {fetchStatus === 'error' && <div className="p-3 text-xs text-red-500">{fetchError}</div>}
            {fetchStatus === 'loading' && <div className="p-3 text-xs text-muted-foreground">載入模型中…</div>}
            {fetchStatus === 'done' && filtered.length === 0 && <div className="p-3 text-xs text-muted-foreground">沒有符合的模型</div>}
            {filtered.map(model => (
              <button
                key={model.id}
                type="button"
                onClick={() => {
                  onSelect(model.id, model.name)
                  setIsOpen(false)
                  setQuery('')
                }}
                className={`w-full text-left px-3 py-2 rounded-lg hover:bg-accent transition-colors ${model.id === selectedId ? 'bg-primary/10 text-primary' : ''}`}
              >
                <div className="text-xs font-medium truncate">{model.name || model.id}</div>
                <div className="text-[10px] text-muted-foreground truncate">{model.id} · {formatPrice(model.pricing?.prompt)}</div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function NarrationAIPanel({
  mode, image, subtitleCues = [], narrationDuration = 0, onApplyStory, onApplyCamera, onClose,
}: NarrationAIPanelProps) {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem(LS_KEY_KEY) ?? '')
  const [model, setModel] = useState(() => localStorage.getItem(LS_KEY_MODEL) ?? '')
  const [modelName, setModelName] = useState(() => localStorage.getItem(LS_KEY_MODEL_NAME) ?? '')
  const [title, setTitle] = useState('')
  const [artist, setArtist] = useState('')
  const [year, setYear] = useState('')
  const [location, setLocation] = useState('')
  const [minSeconds, setMinSeconds] = useState('40')
  const [maxSeconds, setMaxSeconds] = useState('60')
  const [status, setStatus] = useState<Status>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [isLeaving, setIsLeaving] = useState(false)

  useEffect(() => { if (apiKey) localStorage.setItem(LS_KEY_KEY, apiKey) }, [apiKey])
  useEffect(() => { if (model) localStorage.setItem(LS_KEY_MODEL, model) }, [model])
  useEffect(() => { if (modelName) localStorage.setItem(LS_KEY_MODEL_NAME, modelName) }, [modelName])

  const handleClose = useCallback(() => {
    setIsLeaving(true)
    setTimeout(onClose, 200)
  }, [onClose])

  const handleGenerate = useCallback(async () => {
    if (!apiKey.trim()) { setErrorMsg('請先輸入 OpenRouter API Key'); setStatus('error'); return }
    if (!model.trim()) { setErrorMsg('請先選擇 AI 模型'); setStatus('error'); return }
    if (!image) { setErrorMsg('請先載入畫作圖片'); setStatus('error'); return }
    if (mode === 'story' && !title.trim()) { setErrorMsg('請至少輸入 Title'); setStatus('error'); return }
    if (mode === 'camera' && !subtitleCues.length) { setErrorMsg('請先生成旁白語音與字幕'); setStatus('error'); return }
    const parsedMinSeconds = Math.round(Number(minSeconds))
    const parsedMaxSeconds = Math.round(Number(maxSeconds))
    if (mode === 'story' && (!Number.isFinite(parsedMinSeconds) || parsedMinSeconds <= 0)) {
      setErrorMsg('最短秒數必須大於 0')
      setStatus('error')
      return
    }
    if (mode === 'story' && (!Number.isFinite(parsedMaxSeconds) || parsedMaxSeconds < parsedMinSeconds)) {
      setErrorMsg('最長秒數不得小於最短秒數')
      setStatus('error')
      return
    }

    setStatus('loading')
    setErrorMsg('')
    try {
      const isCameraMode = mode === 'camera'
      if (isCameraMode) {
        let result: NarrationAICameraResult | null = null
        let lastError = ''
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            const parsed = await requestStructuredJson({
              apiKey,
              model,
              image,
              prompt: `${buildCameraInstruction(subtitleCues)}${lastError ? `\n\nPrevious output failed validation: ${lastError}\nReturn the complete structured JSON again and correct the camera pacing according to that validation error.` : ''}`,
              schema: buildCameraSchema(subtitleCues),
              schemaName: 'narration_camera_beats',
              maxTokens: 8000,
            })
            validateCameraCoverage(parsed as CameraBeatResponse, subtitleCues)
            const nextResult = normalizeCameraResult(parsed as CameraBeatResponse, subtitleCues, narrationDuration)
            if (!nextResult.points.length) throw new Error('AI 回傳資料不完整，缺少鏡頭')
            validateCameraMotion(nextResult)
            result = nextResult
            break
          } catch (error) {
            lastError = error instanceof Error ? error.message : '格式驗證失敗'
          }
        }
        if (!result) {
          throw new Error(lastError || 'AI 配鏡頭失敗，請換支援結構化輸出的模型後再試一次')
        }
        onApplyCamera(result)
      } else {
        const parsed = await requestStructuredJson({
          apiKey,
          model,
          image,
          prompt: buildStoryInstruction({ title, artist, year, location }, parsedMinSeconds, parsedMaxSeconds),
          schema: STORY_SCHEMA,
          schemaName: 'narration_story',
          maxTokens: 5000,
        })
        const result = normalizeStoryResult(parsed)
        if (!result.narrationInputText) throw new Error('AI 回傳資料不完整，缺少英文旁白')
        onApplyStory(result)
      }

      setStatus('success')
      setTimeout(handleClose, 500)
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : '未知錯誤')
      setStatus('error')
    }
  }, [apiKey, artist, handleClose, image, location, maxSeconds, minSeconds, mode, model, narrationDuration, onApplyCamera, onApplyStory, subtitleCues, title, year])

  const isCameraMode = mode === 'camera'

  return (
    <div className={`fixed inset-0 z-[100] flex items-end sm:items-center justify-center ${isLeaving ? 'immersive-leave' : 'immersive-enter'}`}>
      <div className="absolute inset-0 bg-black/60" onClick={handleClose} />
      <div className={`relative z-10 w-full max-w-xl mx-4 mb-4 sm:mb-0 rounded-2xl border border-border bg-card shadow-2xl ${isLeaving ? 'immersive-canvas-leave' : 'immersive-canvas-enter'}`}>
        <div className="flex items-center gap-2 px-5 pt-5 pb-4 border-b border-border rounded-t-2xl bg-card">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="font-bold text-base flex-1">{isCameraMode ? 'AI 配鏡頭' : 'AI 產生英文旁白'}</h2>
          <button onClick={handleClose} className="h-7 w-7 rounded-full flex items-center justify-center hover:bg-muted transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-4 flex flex-col gap-4 rounded-b-2xl bg-card max-h-[78vh] overflow-y-auto">
          <div className="grid gap-2">
            <Label>OpenRouter API Key</Label>
            <Input type="password" value={apiKey} onChange={event => setApiKey(event.target.value)} placeholder="sk-or-..." />
          </div>

          <div className="grid gap-2">
            <Label>AI 模型</Label>
            <ModelCombobox
              apiKey={apiKey}
              selectedId={model}
              selectedName={modelName}
              onSelect={(id, name) => { setModel(id); setModelName(name) }}
            />
          </div>

          {!isCameraMode && (
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>最短秒數</Label>
                <Input
                  type="number"
                  min={1}
                  step={1}
                  value={minSeconds}
                  onChange={event => setMinSeconds(event.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label>最長秒數</Label>
                <Input
                  type="number"
                  min={1}
                  step={1}
                  value={maxSeconds}
                  onChange={event => setMaxSeconds(event.target.value)}
                />
              </div>
              <div className="grid gap-2 col-span-2">
                <Label>Title</Label>
                <Input value={title} onChange={event => setTitle(event.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>Artist</Label>
                <Input value={artist} onChange={event => setArtist(event.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>Year</Label>
                <Input value={year} onChange={event => setYear(event.target.value)} />
              </div>
              <div className="grid gap-2 col-span-2">
                <Label>Current location</Label>
                <Input value={location} onChange={event => setLocation(event.target.value)} />
              </div>
            </div>
          )}

          {isCameraMode && (
            <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground leading-relaxed">
              將依照已生成的 {subtitleCues.length} 個旁白字幕時間點，為每段字幕配置鏡頭位置。AI 不會改動旁白文字、中文字幕或時間。
            </div>
          )}

          <p className="text-[11px] text-muted-foreground leading-relaxed">
            {isCameraMode
              ? '鏡頭時間會直接使用已生成字幕的真實 duration，因此不會再出現鏡頭比旁白先結束。'
              : '此步驟只產生英文故事內容。產生後請先用 HeadTTS 生成旁白語音與字幕，再使用 AI 配鏡頭。'}
          </p>

          {status === 'error' && (
            <div className="flex items-start gap-2 text-xs text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg p-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}
          {status === 'success' && (
            <div className="flex items-center gap-2 text-xs text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2">
              <CheckCircle2 className="h-4 w-4" />
              <span>{isCameraMode ? '已產生鏡頭，正在套用…' : '已產生英文旁白，正在套用…'}</span>
            </div>
          )}

          <Button className="w-full h-10" disabled={status === 'loading'} onClick={handleGenerate}>
            {status === 'loading' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {status === 'loading' ? '產生中…' : isCameraMode ? '產生鏡頭位置' : '產生英文旁白'}
          </Button>
        </div>
      </div>
    </div>
  )
}
