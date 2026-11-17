import { useCallback, useEffect, useState } from 'react'
import { AlertCircle, CheckCircle2, Loader2, Sparkles, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ModelCombobox } from '@/components/ModelCombobox'
import { createAiTimeoutSignal, isAbortError, parseAiJsonObject } from '@/lib/openrouter'
import { CAMERA_TEMPLATES } from '@/lib/cameraTemplates'
import type { SubtitleCue } from '@/types'

const LS_KEY_KEY = 'openrouter_api_key'
const LS_KEY_MODEL = 'openrouter_model'
const LS_KEY_MODEL_NAME = 'openrouter_model_name'

const STORY_PAIR = {
  type: 'object',
  additionalProperties: false,
  required: ['en', 'zh'],
  properties: { en: { type: 'string' }, zh: { type: 'string' } },
}

// sourceNotes 放最前面：讓模型先整理研究結果再寫稿
const STORY_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['sourceNotes', 'lines', 'altHook', 'altEnding', 'sources'],
  properties: {
    sourceNotes: { type: 'string' },
    lines: { type: 'array', items: STORY_PAIR },
    altHook: STORY_PAIR,
    altEnding: STORY_PAIR,
    sources: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'url', 'note'],
        properties: { name: { type: 'string' }, url: { type: 'string' }, note: { type: 'string' } },
      },
    },
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

export const DEFAULT_SCRIPT_PROMPT = `請先上網研究以下畫作，再撰寫 Instagram Reels 旁白字幕。

畫作資訊：
{{ARTWORK_INFO}}
（另附畫作圖片。資訊不完整時，請依圖片與研究結果判斷；無法確認就不要虛構。）

資料要求：
至少參考 5 個可信來源，並包含至少 1 個官方或權威來源，例如博物館、拍賣行、學術機構或藝術資料庫。其餘可參考藝術評論、專欄、部落格或藝術史網站。
若不同來源對年份、名稱、收藏地或畫作解讀有差異，請在 sourceNotes 簡短說明，不要武斷下結論。
不得虛構人物心理、事件或隱藏故事。屬於推測的內容，請使用「可能」「可理解為」「常被視為」等保守語氣（英文用 maybe、may、is often seen as）。
旁白提到的畫面細節，必須是圖片中真的看得到的。

請將研究結果寫成一段 {{MIN_SECONDS}}–{{MAX_SECONDS}} 秒內可講完的短影音旁白。

旁白結構：
以一句極短、帶疑問感的 hook 開場，讓人想知道「為什麼」，但不要獵奇或誇大。
接著用非常口語、簡單的方式介紹畫中場景、人物與背景，再說明畫家為何選擇這個主題，以及它在當時社會、文化或藝術市場中的意義。
自然帶入畫面細節，包括人物位置、空間、光線、顏色、視線、姿態與重要物件。不要只描述看見什麼，要說明這些細節如何支撐畫作主題。
最後用一句留有思考空間的話收尾，讓觀眾願意停留或重看。不給答案，也不說教。

語氣要求：
像一位懂藝術史、但說話很日常的老師。小學生也能聽懂。句子短、清楚、有畫面感，不要像論文，也不要堆砌術語。
用心理學角度來製作旁白故事：說出畫中人物此刻可能的處境、渴望或掙扎，讓人可以帶入角色去體會意涵。這些內容同樣要有根據，或明確標示為推測。
避免空泛語句，例如「很有張力」「引人深思」。請具體說明張力來自哪個動作、視線、距離或構圖。
文字要自然、有節奏，避免「首先、其次、最後、總之」等制式連接詞。可加入少量口語轉折，例如「說起來」「其實」「或許」，也可穿插一兩句反問，讓旁白更像真人說話。

輸出格式（只回傳 JSON，欄位如下）：
- sourceNotes：來源之間的差異說明；沒有差異就寫「各來源一致」。
- lines：旁白正文，共 {{MIN_LINES}}–{{MAX_LINES}} 句，每句一個 { "en", "zh" }：
  - en：一句英文，盡量不超過 12 個單字。這行會被語音朗讀，不可包含任何中文字（中文人名、地名請用英文拼寫）。
  - zh：緊接的繁體中文翻譯，自然口語的台灣用語，不要生硬直譯。只當字幕顯示，不會被唸出。
  - 例：{ "en": "Why is everyone waiting for the answer?", "zh": "為什麼大家都在等一個答案？" }
- altHook：一句備用 hook，英文與繁體中文對照 { "en", "zh" }。
- altEnding：一句更有力的結尾，英文與繁體中文對照 { "en", "zh" }。
- sources：參考來源列表，每項 { "name", "url", "note" }：來源名稱、網址（沒有就留空字串）、該來源的重點，簡短即可。

請直接輸出完成稿，不要解釋修改過程。`

export type NarrationAIMode = 'story' | 'camera'

export interface NarrationAIStoryResult {
  narrationInputText: string
}

interface StoryPair { en: string; zh: string }

// 正文以外的附帶資訊，只顯示在面板裡給使用者參考，不進旁白
export interface StoryExtras {
  sourceNotes: string
  altHook: StoryPair
  altEnding: StoryPair
  sources: Array<{ name: string; url: string; note: string }>
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

function normalizePair(raw: unknown): StoryPair {
  const pair = (raw ?? {}) as Partial<StoryPair>
  return { en: String(pair.en ?? '').trim(), zh: String(pair.zh ?? '').trim() }
}

// 每句英文後緊接一行中文：正是旁白欄的中英交錯格式，parseNarrationInput 會把中文掛到該句字幕
function normalizeStoryResult(raw: unknown): { narrationInputText: string; extras: StoryExtras } {
  const data = (raw ?? {}) as Record<string, unknown>
  const lines = (Array.isArray(data.lines) ? data.lines : []).map(normalizePair).filter(line => line.en)
  return {
    narrationInputText: lines.map(line => (line.zh ? `${line.en}\n${line.zh}` : line.en)).join('\n'),
    extras: {
      sourceNotes: String(data.sourceNotes ?? '').trim(),
      altHook: normalizePair(data.altHook),
      altEnding: normalizePair(data.altEnding),
      sources: (Array.isArray(data.sources) ? data.sources : []).map(item => {
        const source = (item ?? {}) as Record<string, unknown>
        return { name: String(source.name ?? '').trim(), url: String(source.url ?? '').trim(), note: String(source.note ?? '').trim() }
      }).filter(source => source.name),
    },
  }
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

export interface StoryArtwork {
  title: string
  artist: string
  year: string
  location: string
  visualDescription?: string
  theme?: string
}

function buildStoryInstruction(info: StoryArtwork, minSeconds: number, maxSeconds: number, basePrompt = DEFAULT_SCRIPT_PROMPT) {
  // ponytail: 句數照原提示詞「20–40 秒 12–18 句」的比例換算，秒數改了句數跟著縮放
  const minLines = Math.max(4, Math.round(minSeconds * 0.6))
  const maxLines = Math.max(minLines, Math.round(maxSeconds * 0.45))
  const artwork = [
    `🖼️ ${info.title || '（未提供）'}`,
    `🪄 ${info.artist || '（未提供）'}`,
    `📅 ${info.year || '（未提供）'}`,
    `📍 ${info.location || '（未提供）'}`,
  ].join('｜')
    + (info.visualDescription ? `\n畫面描述：${info.visualDescription}` : '')
    + (info.theme ? `\n想強調的主題：${info.theme}` : '')
  return basePrompt
    .replace('{{ARTWORK_INFO}}', artwork)
    .replace('{{MIN_SECONDS}}', String(minSeconds))
    .replace('{{MAX_SECONDS}}', String(maxSeconds))
    .replace('{{MIN_LINES}}', String(minLines))
    .replace('{{MAX_LINES}}', String(maxLines))
}

function buildCameraInstruction(subtitleCues: SubtitleCue[], templateId?: string) {
  const template = CAMERA_TEMPLATES.find(t => t.id === templateId)
  const templateSection = template
    ? `\n\nCamera style template (follow this pacing and structure; it overrides the generic grouping rules above):\n${template.aiStyleHint}`
    : ''
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
- captionX/captionY controls the narration subtitle position. Default 0.5/0.87, move it only if it covers important visual details.${templateSection}

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
  webSearch?: boolean
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
      // OpenRouter 聯網搜尋（另計少量搜尋費用）：旁白要求先查證多個來源，不開會讓模型憑記憶編來源
      ...(params.webSearch ? { plugins: [{ id: 'web', max_results: 8 }] } : {}),
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

// 研究提示詞 → 中英旁白（左側旁白欄與工具列 AI 共用）
export async function generateStory(params: {
  apiKey: string
  model: string
  image: HTMLImageElement
  info: StoryArtwork
  minSeconds: number
  maxSeconds: number
  basePrompt?: string
}): Promise<{ narrationInputText: string; extras: StoryExtras }> {
  const parsed = await requestStructuredJson({
    apiKey: params.apiKey,
    model: params.model,
    image: params.image,
    prompt: buildStoryInstruction(params.info, params.minSeconds, params.maxSeconds, params.basePrompt),
    schema: STORY_SCHEMA,
    schemaName: 'narration_story',
    maxTokens: 8000,
    webSearch: true,
  })
  const result = normalizeStoryResult(parsed)
  if (!result.narrationInputText) throw new Error('AI 回傳資料不完整，缺少旁白')
  return result
}

// 依字幕時間軸配鏡頭（AI 配鏡頭與工具列 AI 共用）；驗證不過會帶著錯誤訊息重試一次
export async function generateCameraForCues(params: {
  apiKey: string
  model: string
  image: HTMLImageElement
  cues: SubtitleCue[]
  narrationDuration: number
  templateId?: string
}): Promise<NarrationAICameraResult> {
  const { cues, templateId } = params
  let lastError = ''
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const parsed = await requestStructuredJson({
        apiKey: params.apiKey,
        model: params.model,
        image: params.image,
        prompt: `${buildCameraInstruction(cues, templateId)}${lastError ? `\n\nPrevious output failed validation: ${lastError}\nReturn the complete structured JSON again and correct the camera pacing according to that validation error.` : ''}`,
        schema: buildCameraSchema(cues),
        schemaName: 'narration_camera_beats',
        maxTokens: 8000,
      })
      validateCameraCoverage(parsed as CameraBeatResponse, cues)
      const result = normalizeCameraResult(parsed as CameraBeatResponse, cues, params.narrationDuration)
      if (!result.points.length) throw new Error('AI 回傳資料不完整，缺少鏡頭')
      // 選了模板時節奏由模板定義，不用通用的鏡頭變化頻率驗證
      if (!templateId) validateCameraMotion(result)
      return result
    } catch (error) {
      lastError = error instanceof Error ? error.message : '格式驗證失敗'
    }
  }
  throw new Error(lastError || 'AI 配鏡頭失敗，請換支援結構化輸出的模型後再試一次')
}

export function StoryExtrasView({ extras }: { extras: StoryExtras }) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs leading-relaxed flex flex-col gap-3 select-text">
      {([['備用 Hook', extras.altHook], ['更有力的結尾', extras.altEnding]] as const).map(([label, pair]) => pair.en && (
        <div key={label}>
          <p className="font-medium mb-0.5">{label}</p>
          <p>{pair.en}</p>
          <p className="text-muted-foreground">{pair.zh}</p>
        </div>
      ))}
      {extras.sourceNotes && (
        <div>
          <p className="font-medium mb-0.5">來源差異</p>
          <p className="text-muted-foreground">{extras.sourceNotes}</p>
        </div>
      )}
      {extras.sources.length > 0 && (
        <div>
          <p className="font-medium mb-0.5">參考來源</p>
          <ul className="flex flex-col gap-1">
            {extras.sources.map((source, i) => (
              <li key={i}>
                {/* 網址來自模型輸出，只接受 http(s) 才做成連結 */}
                {/^https?:\/\//i.test(source.url)
                  ? <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">{source.name}</a>
                  : source.name}
                {source.note && <span className="text-muted-foreground">：{source.note}</span>}
              </li>
            ))}
          </ul>
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
  const [minSeconds, setMinSeconds] = useState('20')
  const [maxSeconds, setMaxSeconds] = useState('40')
  const [cameraTemplateId, setCameraTemplateId] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [isLeaving, setIsLeaving] = useState(false)
  const [extras, setExtras] = useState<StoryExtras | null>(null)

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
      if (mode === 'camera') {
        onApplyCamera(await generateCameraForCues({ apiKey, model, image, cues: subtitleCues, narrationDuration, templateId: cameraTemplateId }))
      } else {
        const { narrationInputText, extras: storyExtras } = await generateStory({
          apiKey, model, image, info: { title, artist, year, location }, minSeconds: parsedMinSeconds, maxSeconds: parsedMaxSeconds,
        })
        onApplyStory({ narrationInputText })
        // 旁白模式不自動關閉：留著備用 hook／結尾／來源給使用者看
        setExtras(storyExtras)
        setStatus('success')
        return
      }

      setStatus('success')
      setTimeout(handleClose, 500)
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : '未知錯誤')
      setStatus('error')
    }
  }, [apiKey, artist, cameraTemplateId, handleClose, image, location, maxSeconds, minSeconds, mode, model, narrationDuration, onApplyCamera, onApplyStory, subtitleCues, title, year])

  const isCameraMode = mode === 'camera'

  return (
    <div className={`fixed inset-0 z-[100] flex items-end sm:items-center justify-center ${isLeaving ? 'immersive-leave' : 'immersive-enter'}`}>
      <div className="absolute inset-0 bg-black/60" onClick={handleClose} />
      <div className={`relative z-10 w-full max-w-xl mx-4 mb-4 sm:mb-0 rounded-2xl border border-border bg-card shadow-2xl ${isLeaving ? 'immersive-canvas-leave' : 'immersive-canvas-enter'}`}>
        <div className="flex items-center gap-2 px-5 pt-5 pb-4 border-b border-border rounded-t-2xl bg-card">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="font-bold text-base flex-1">{isCameraMode ? 'AI 配鏡頭' : 'AI 產生中英旁白'}</h2>
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
            <div className="grid gap-2">
              <Label>運鏡模板</Label>
              <select
                className="text-sm rounded-lg border border-input bg-background px-3 h-9 outline-none focus:ring-1 focus:ring-ring"
                value={cameraTemplateId}
                onChange={event => setCameraTemplateId(event.target.value)}
              >
                <option value="">自動（依旁白節奏配置）</option>
                {CAMERA_TEMPLATES.map(t => (
                  <option key={t.id} value={t.id} title={t.description}>{t.label}</option>
                ))}
              </select>
              {cameraTemplateId && (
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  {CAMERA_TEMPLATES.find(t => t.id === cameraTemplateId)?.description}
                </p>
              )}
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
              : 'AI 會先上網研究畫作（OpenRouter 聯網搜尋，另計少量費用），再寫中英交錯旁白：填入左側旁白欄，並在時間軸排上草稿字幕。用 HeadTTS 產生語音或上傳音訊後，字幕會換成真實時間，再使用 AI 配鏡頭。'}
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
              <span>{isCameraMode ? '已產生鏡頭，正在套用…' : '已填入旁白欄與時間軸字幕（草稿時間）'}</span>
            </div>
          )}

          {extras && <StoryExtrasView extras={extras} />}

          {extras ? (
            <Button className="w-full h-10" onClick={handleClose}>完成</Button>
          ) : (
            <Button className="w-full h-10" disabled={status === 'loading'} onClick={handleGenerate}>
              {status === 'loading' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {status === 'loading' ? '產生中…' : isCameraMode ? '產生鏡頭位置' : '產生中英旁白'}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
