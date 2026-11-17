import { useCallback, useEffect, useState } from 'react'
import { AlertCircle, CheckCircle2, Loader2, Sparkles, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ModelCombobox } from '@/components/ModelCombobox'
import { createAiTimeoutSignal, isAbortError, parseAiJsonObject } from '@/lib/openrouter'
import { CAMERA_TEMPLATES } from '@/lib/cameraTemplates'
import { normalizeSources } from '@/lib/projectNormalize'
import type { CarouselInsight, CarouselNotes, SubtitleCue } from '@/types'

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
      sources: normalizeSources(data.sources),
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

function formatArtwork(info: StoryArtwork) {
  return [
    `🖼️ ${info.title || '（未提供）'}`,
    `🪄 ${info.artist || '（未提供）'}`,
    `📅 ${info.year || '（未提供）'}`,
    `📍 ${info.location || '（未提供）'}`,
  ].join('｜')
    + (info.visualDescription ? `\n畫面描述：${info.visualDescription}` : '')
    + (info.theme ? `\n想強調的主題：${info.theme}` : '')
}

function buildStoryInstruction(info: StoryArtwork, minSeconds: number, maxSeconds: number, basePrompt = DEFAULT_SCRIPT_PROMPT) {
  // ponytail: 句數照原提示詞「20–40 秒 12–18 句」的比例換算，秒數改了句數跟著縮放
  const minLines = Math.max(4, Math.round(minSeconds * 0.6))
  const maxLines = Math.max(minLines, Math.round(maxSeconds * 0.45))
  return basePrompt
    .replace('{{ARTWORK_INFO}}', formatArtwork(info))
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

// ── 輪播「隱藏意涵解析」：每張 = 原圖上的一個框 + 一段中文 + 英文版本 ──

export const CAROUSEL_AI_MAX_SLIDES = 30

/** 輪播 AI 的研究提示詞（輪播的 source of truth）；輸出欄位必須與 buildInsightSchema、normalizeInsights 一致 */
const DEFAULT_CAROUSEL_PROMPT = `你是一位頂尖的藝術史研究者、電影編劇、視覺敘事導演、文學創作者與 Instagram 藝術內容策展人。

你擅長從一幅靜態畫作中，還原一個完整而具有情緒張力的故事，並透過電影式分鏡、懸念安排、歷史背景、人物心理、象徵隱喻與認知反轉，讓觀眾逐步理解畫作。

你的任務不是介紹一幅畫，而是將一幅畫變成一部可以透過滑動閱讀的微型電影。
根據附上的畫作圖片與以下資訊，創作一組適合 Instagram 輪播貼文（4:5 直式）的藝術敘事文案。

畫作資訊：
{{ARTWORK_INFO}}
（資訊不完整時，請依圖片與研究結果判斷；無法確認就不要虛構。）

所有圖片均來自同一幅原始畫作，透過不同的裁切、局部放大、視角轉換與文字，形成連續的故事。

{{COUNT_RULE}}

## 一、創作前的分析

在撰寫文案前，先完成以下分析：

1. 畫作基本研究
- 畫作名稱、作者、創作年代。
- 畫作所描繪的歷史事件、神話、宗教故事、文學情節或生活場景。
- 人物身分及彼此之間的關係。
- 事件發生之前、當下與之後的故事。
- 畫作的創作背景及相關藝術史資料。

2. 視覺線索研究
仔細觀察畫作中的：
- 人物的眼神、表情、姿態與動作。
- 雙手、雙腳、衣著、飾品與武器。
- 信件、書籍、器皿、花朵及其他物件。
- 背景人物、門窗、建築與遠方景色。
- 雕刻、浮雕、文字、圖案與宗教符號。
- 光影、色彩、人物位置與空間關係。
- 容易被觀眾忽略，卻可能具有敘事意義的細節。
特別尋找那些看似只是裝飾，實際上可能與人物命運、歷史事件、故事結局或畫作主題產生呼應的元素。

3. 尋找核心矛盾
- 這幅畫最不尋常的地方是什麼？
- 哪個畫面最能引起觀眾的疑問？
- 人物的表情與正在發生的事情是否存在反差？
- 人物的身分與行為是否存在反差？
- 誰掌握權力？誰失去了權力？
- 觀眾第一眼的理解，是否會因為知道背景而改變？
- 是否存在值得在故事後段才揭露的細節？
- 畫作之外是否有更具震撼力的前因或後果？
從中選擇最有敘事價值的核心矛盾，作為整組內容的主軸。

## 二、敘事模型

不要將所有畫作套用同一種模板。根據畫作的特性，從以下敘事模型中選擇一種或混合多種。

A. 歷史事件型：適合戰爭、政治事件、歷史人物與國家命運。
異常畫面 → 人物觀察 → 歷史線索 → 事件背景 → 人物反差 → 歷史重量 → 情緒收束。

B. 戲劇情節型：適合復仇、背叛、愛情、犧牲、衝突、死亡與命運轉折。
戲劇性瞬間 → 人物身分 → 事件起因 → 情緒反差 → 回到當下 → 事件發展 → 意外結局。

C. 隱藏象徵型：適合具有大量象徵、神話、宗教意涵及隱藏細節的畫作。
表面場景 → 發現異常 → 局部線索 → 象徵揭露 → 故事呼應 → 重新理解整幅畫。

D. 人性心理型：適合孤獨、悲傷、失落、家庭關係、內心衝突與人物肖像。
安靜場景 → 人物特寫 → 情緒察覺 → 環境對照 → 人物處境 → 內在矛盾 → 情緒留白。

E. 命運反轉型：適合人物地位反轉、權力消長、受害者反抗、英雄悲劇與歷史結局。
異常結果 → 回溯過去 → 原始處境 → 關鍵決定 → 局勢反轉 → 最終命運。

F. 日常詩意型：適合風景、靜物、日常生活、光影與沒有明確戲劇事件的畫作。
場景建立 → 細節觀察 → 時間與空間感 → 生活痕跡 → 情緒累積 → 安靜收束。

如果畫作本身沒有劇烈衝突，不要刻意製造悲劇或反轉。

## 三、第一張

第一張必須直接描繪畫作中最具有敘事張力的場景。
不要以畫家介紹、創作年代、藝術流派或百科知識作為開場。
不要使用「今天我們來欣賞一幅世界名畫。」「你知道這幅畫背後的故事嗎？」「這幅畫隱藏著一個驚人的秘密。」
應直接讓觀眾進入故事，例如：
「昏暗的房間裡，一名小丑獨自坐著。」
「一名女子，正將一個男人推向井口。」
「所有人都朝著同一個方向望去，只有她低著頭。」
第一張文字本身就應該讓觀眾產生疑問，不需要刻意提出問題。

## 四、揭露節奏

將自己視為一位掌握觀眾注意力的電影編劇。你知道完整的故事，但觀眾不知道。
不要一次交代人物身分、事情起因、象徵意義與最終結局。
每張圖片只推進一個主要資訊，讓觀眾不斷修正自己對畫面的理解。
先呈現結果，再揭露原因。先呈現異常，再解釋異常。先讓觀眾看見人物，再讓觀眾理解人物。
人物姓名只有在有助於敘事時才揭露。

## 五、時間線

將畫作視為一個被凝結的瞬間。故事可以在三條時間線之間切換：
- 畫作當下：人物正在做什麼。
- 畫作之前：什麼事件導致這一幕。
- 畫作之後：這個瞬間最終造成什麼結果。
根據故事需要，可以從當下倒敘過去，再回到當下，最後延伸至未來。
不必遵循歷史事件原本的時間順序，但必須讓觀眾清楚理解前因後果。

## 六、情緒與反差

不要直接告訴觀眾人物有多悲傷、勇敢、憤怒或絕望。優先透過人物的行為、表情、身分與環境，讓觀眾自行感受到情緒。
善用以下反差：歡樂與悲傷、平靜與暴力、沉默與喧囂、權力與無力、高貴身分與卑劣行為、渺小人物與重大歷史、柔和表情與激烈動作、表面的勝利與真正的失去、人物原本的角色與最終的命運。
讓情緒來自畫面及事件本身，而不是堆疊形容詞。

## 七、第二層敘事

若畫作存在具有敘事價值的細節，不要急著在前幾張全部揭露。
可以先講述主要人物的故事，直到觀眾以為已經理解畫作，再將視角移向不起眼的物件、背景、浮雕、文字或象徵圖案，藉此展開第二層敘事。
若有可靠依據，說明這些細節如何與主角的處境、事件結局或命運形成呼應，讓觀眾產生重新觀看畫作的理由。
但若不存在可靠的隱藏象徵，不要強行創造秘密。

## 八、敘事高潮

當畫作具備足夠的故事素材，可以設計兩個敘事高潮：
- 第一個高潮：揭露主要事件的轉折或結果。
- 第二個高潮：揭露畫中的隱藏象徵、人物後續命運、歷史結局或更深層的矛盾。
不要讓第二個高潮只是重複第一個高潮的情緒。如果故事本身已經完整，一個高潮即可。

## 九、結尾

先收束故事，依照畫作特性選擇最適合的方式：
- 歷史結局：交代人物最後的命運。
- 身分反轉：重新定義觀眾對人物的認知。
- 情緒留白：停留在一個表情、動作或場景。
- 象徵呼應：讓畫中的物件與故事結局形成連結。
- 首尾呼應：回到第一張畫面，賦予它新的意義。
- 人性洞察：以克制的文字呈現故事中的深層矛盾。

收束之後，最後一到兩張一定要留下一個觀點，讓觀眾帶走一件事。從以下三種擇一或結合：
- 心理：這幅畫戳中的人心。畫中人的處境、渴望或掙扎，其實也是每個人會有的。
- 未來：這個瞬間之後發生了什麼，或今天的我們怎麼延續這件事。
- 省思：一個從故事自然長出來、讓人停下來想一想的問題或看法。
這個觀點必須從前面講過的故事和畫面長出來，具體、說人話，像朋友講完故事後順口說的一句話。
不要說教，不要勵志語錄，不要空泛的大道理，也不要用「這幅畫告訴我們……」「這提醒了我們……」開頭。
例如（只示範語氣，不要照抄）：
en「We all wait for someone to notice.」／zh「我們都在等，有人注意到自己。」
en「Who in your life is the jester?」／zh「你身邊，誰是那個小丑？」
最好的結尾，是故事已經說完，觀眾卻多想了一下，甚至想回頭再看一次畫作。

## 十、文字

每張圖片只有兩行字：一行英文（主字幕，字較大）、一行繁體中文（副字幕，字較小）。不要換行，不要第三行。
- en：一句英文，最多 34 個字元（含空格，大約 6 個單字），要能一行放下。不要全大寫，不可包含中文字。
- zh：一句繁體中文，最多 18 個字，符合台灣讀者的閱讀習慣。
- 兩行說同一件事，各自用該語言最自然的說法，不要逐字翻譯。
- 一張只說一件事。一句話放不下，就拆到下一張，不要硬塞。
可以讓一句話跨越兩至三張圖片，形成等待與懸念。例如：
第1張：en「The king didn't carry this.」／zh「扛下這一切的，不是國王。」
第2張：en「It was the jester they mocked.」／zh「而是那個被大家嘲笑的小丑。」
或是：
第1張：en「No tears. No begging.」／zh「她沒有哭，也沒有求饒。」
第2張：en「Her face is calm. Almost cold.」／zh「她的臉很平靜，平靜到有點冷。」
文字應該像一個完整故事被切成數個鏡頭，而不是數十句彼此獨立的名言。

### 說人話，不要 AI 感

寫給一般人看，不是寫給評審看。想像你是一個懂畫的朋友，指著畫，跟旁邊的人講這個故事：
- 用日常口語和常見的字。主詞和動作要清楚，一讀就知道在說誰、在做什麼。
- 寫具體的東西：誰、手上拿著什麼、看向哪裡、後來發生什麼。少寫抽象的感覺。
- 第三人稱、冷靜、克制；有歷史重量，但不用教科書口吻；有心理張力，但不替人物過度解釋。
- 平鋪直敘就好，不要為了有文采硬用比喻、排比、對仗。
- 轉折用口語的詞：但是、後來、直到、其實、結果。不要用書面語：然而、此刻、唯有、彼時、宛如。
- 避開常見的 AI 腔：彷彿在訴說、無聲的、靜靜地、凝視、交織、見證、命運的齒輪、時間的痕跡、不僅……更是……、一場關於……的……、永恆。
- 英文也一樣：用簡單常見的字，像真人說話。不要用 whisper、echo、tapestry、testament、silent witness、frozen in time、unveil、delve、timeless、more than just。
- 寫完唸一遍：如果一般人要想一下才懂，就改得更白話。

## 十一、分鏡與裁切

所有圖片使用同一幅原始畫作，不需要生成新畫面，也不得修改原畫內容。
透過全景、中景、近景、特寫與視角切換，建立電影式的閱讀體驗：
- 全景：交代人物、環境與事件。
- 中景：呈現人物之間的關係。
- 近景：突顯人物姿態或情緒。
- 臉部特寫：放大眼神與表情。
- 動作特寫：聚焦雙手、雙腿與肢體動作。
- 物件特寫：引導觀眾發現重要線索。
- 背景特寫：揭露容易被忽略的人物與場景。
- 對比切換：在不同人物之間反覆切換。
- 回到全景：讓觀眾在理解背景後重新觀看畫作。
每張圖片的裁切位置應服務當下的文字內容。
允許重複使用同一人物或局部畫面，但每一次出現都應帶來不同的資訊或情緒意義。
敘述畫作之外的歷史事件時，可以搭配相關人物特寫，但不得假裝該事件實際出現在原畫中。
不要為了變換畫面而裁切沒有敘事價值的區域。

## 十二、研究與查證

創作前必須上網查證相關資料。優先參考：博物館與美術館官方資料、收藏機構的作品說明、藝術史研究與學術文獻、可靠的歷史文獻與原始史料、相關神話、宗教或文學原典。
必須區分以下四個層級：
1. 畫面中實際可見的內容。
2. 有可靠資料支持的歷史事實。
3. 古代文獻、神話、傳說或文學記載。
4. 藝術史詮釋與合理的主觀感受。
不得將傳說直接描述成已被證實的歷史事實。
不得捏造人物對話、呼吸、聲音、心理活動、信件內容或畫家創作意圖。
不得因為某個象徵看似合理，就斷言它一定是畫家刻意留下的伏筆。
如有不確定的象徵，用「可能」、「也許」、「常被認為」等口語說法（英文用 may、maybe、is often read as）。
如果無法查證，應保留不確定性，不要為了故事效果而補寫不存在的史實。
歷史準確性必須優先於戲劇效果。

## 十三、避免

- 不要使用百科全書式開場。
- 不要使用聳動或農場標題。
- 不要每張都刻意製造懸念。
- 不要過度使用「真正」、「最」、「從來」、「原來」等強調詞。
- 不要使用空泛的哲學與勵志金句。
- 不要將所有畫作都解讀成孤獨、清醒、勇氣或反抗。
- 不要過度渲染暴力、悲傷或苦難。
- 不要重複相同資訊來增加圖片張數。
- 不要讓文案看起來像美術館導覽手冊。
- 不要使用 Emoji、Hashtag、感嘆號或行銷式用語。
- 不要將自己的詮釋包裝成畫家的原始意圖。

## 十四、輸出格式（只回傳 JSON）

- plan：敘事企劃，每行一個欄位：畫作名稱、畫家、創作年代、核心故事、核心矛盾、選擇的敘事類型、主要視覺線索、第一敘事高潮、第二敘事高潮（若有）、預計圖片張數、結尾方式、結尾觀點。
- research：創作者審核資料，僅供審核，不放入圖片中：完整故事背景；重要歷史事件及其出處；畫中細節與象徵意義；哪些內容屬於史實、哪些屬於傳說或文獻記載、哪些屬於藝術詮釋；尚未確認的資訊。
- sources：參考資料，每項 { "name", "url", "note" }：來源名稱、網址（沒有就留空字串）、該來源的重點。
- slides：依上述張數，依閱讀順序排列，每項：
  - crop：畫面裁切，描述原畫中應聚焦的區域。
  - shot：鏡頭類型，全景／中景／近景／特寫 擇一。
  - left、top、right、bottom：crop 所描述的區域在「原圖」上的框，0–1 正規化座標，左上角為 (0,0)、右下角為 (1,1)。這個框會被放進直式 4:5 畫面並自動留一點邊：全景框整幅畫 (0, 0, 1, 1)；特寫要緊貼主體。框必須真的框到 crop 描述的東西。
  - en：一行英文主字幕（規則見「十、文字」）。
  - zh：一行中文副字幕（規則見「十、文字」）。
  兩行都不要換行，也不要標註標題、敘事階段、引用資料或創作說明。

## 十五、輸出前自我檢查

完成草稿後，請自行檢查並修正：
1. 第一張是否能在沒有任何背景知識的情況下引起注意？
2. 故事是否具有清楚的核心矛盾？
3. 每一張是否都提供了新的資訊、視覺角度或情緒推進？
4. 資訊是否按照最具吸引力的順序揭露？
5. 畫作當下、過去與未來是否銜接自然？
6. 文字是否與裁切畫面相互呼應？
7. 是否存在多餘、重複或過度解釋的文字？
8. 是否把推測或傳說誤寫成史實？
9. 最後一到兩張是否留下一個從故事長出來的觀點（心理、未來或省思），而且具體、不說教？
10. 觀眾滑到最後一張後，是否會對第一張畫面產生不同的理解？
11. 每張是否只有一行英文、一行中文，而且一般人一讀就懂、沒有 AI 腔？
若某張圖片刪除後不影響故事的理解與情緒節奏，就考慮刪除該張。
最後只輸出修正完成的版本。

不只告訴觀眾畫中有什麼，而是讓觀眾理解，為什麼畫中的一切會停留在這個瞬間。
將畫作視為故事的入口，而不是故事的全部。
用畫面吸引觀眾。用懸念維持注意。用歷史建立重量。用細節改變認知。用反差創造情緒。用結局留下餘韻。
讓觀眾不是在閱讀一篇藝術文章，而是在經歷一個故事。

現在開始研究、分析並創作。`

function buildInsightSchema(count: number | null) {
  return {
    type: 'object',
    additionalProperties: false,
    required: ['plan', 'research', 'sources', 'slides'],
    properties: {
      plan: { type: 'string' },
      research: { type: 'string' },
      sources: STORY_SCHEMA.properties.sources,
      slides: {
        type: 'array',
        minItems: count ?? 3,
        maxItems: count ?? CAROUSEL_AI_MAX_SLIDES,
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['crop', 'shot', 'left', 'top', 'right', 'bottom', 'en', 'zh'],
          properties: {
            crop: { type: 'string' },
            shot: { type: 'string', enum: ['全景', '中景', '近景', '特寫'] },
            left: { type: 'number' },
            top: { type: 'number' },
            right: { type: 'number' },
            bottom: { type: 'number' },
            en: { type: 'string' },
            zh: { type: 'string' },
          },
        },
      },
    },
  }
}

/** count = null：張數交給 AI 依故事決定 */
function buildInsightInstruction(info: StoryArtwork, count: number | null) {
  const countRule = count
    ? `共 ${count} 張。在這個張數內安排完整的故事：不要為了湊足張數而重複內容，也不要為了縮短篇幅而犧牲故事的完整性。`
    : `依照畫作本身的故事複雜度、視覺細節與敘事節奏，自行決定最適合的張數：通常 10 張以上，故事夠豐富時最多可達 ${CAROUSEL_AI_MAX_SLIDES} 張。
不要為了湊足張數而重複內容，也不要為了縮短篇幅而犧牲故事的完整性。`
  return DEFAULT_CAROUSEL_PROMPT
    .replace('{{ARTWORK_INFO}}', formatArtwork(info))
    .replace('{{COUNT_RULE}}', countRule)
}

export interface CarouselInsightResult extends CarouselNotes {
  insights: CarouselInsight[]
}

// 模型偶爾把換行多跳脫一次，變成字面上的 "\n"
const cleanCopy = (v: unknown) => String(v ?? '').replace(/\\n/g, '\n').trim()
// 字幕一張只要一行：模型若還是換行，英文併成空格、中文直接接起來
const oneLine = (v: unknown, joiner: string) => String(v ?? '').replace(/\s*(?:\\n|\n)\s*/g, joiner).trim()

function normalizeInsights(raw: unknown): CarouselInsightResult {
  const data = (raw ?? {}) as Record<string, unknown>
  const num = (v: unknown, fallback: number) => clamp(Number.isFinite(Number(v)) ? Number(v) : fallback, 0, 1)
  return {
    insights: (Array.isArray(data.slides) ? data.slides : []).map(item => {
      const s = (item ?? {}) as Record<string, unknown>
      return {
        box: { left: num(s.left, 0), top: num(s.top, 0), right: num(s.right, 1), bottom: num(s.bottom, 1) },
        en: oneLine(s.en, ' '),
        zh: oneLine(s.zh, ''),
      }
    }).filter(s => s.zh || s.en).slice(0, CAROUSEL_AI_MAX_SLIDES),
    plan: cleanCopy(data.plan),
    research: cleanCopy(data.research),
    sources: normalizeSources(data.sources),
  }
}

export async function generateCarouselInsights(params: {
  apiKey: string
  model: string
  image: HTMLImageElement
  info: StoryArtwork
  count: number | null
}): Promise<CarouselInsightResult> {
  const parsed = await requestStructuredJson({
    apiKey: params.apiKey,
    model: params.model,
    image: params.image,
    prompt: buildInsightInstruction(params.info, params.count),
    schema: buildInsightSchema(params.count),
    schemaName: 'carousel_insights',
    // 最多 30 張＋企劃＋審核資料，8000 不夠
    maxTokens: 16000,
    webSearch: true,
  })
  const result = normalizeInsights(parsed)
  if (!result.insights.length) throw new Error('AI 回傳資料不完整，缺少輪播內容')
  return result
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
