export interface OpenRouterConfig {
  apiKey: string
  model: string
}

export interface AiCameraPoint {
  x: number
  y: number
  zoom: number
  move: 'slide' | 'jump'
  moveDuration: number
  holdDuration: number
  caption: {
    text: string
    subtitle: string
    captionX: number
    captionY: number
  }
}

export interface AiGenerateResult {
  points: AiCameraPoint[]
}

export interface NarrationTranslationCueInput {
  id: string
  index: number
  text: string
  startTime: number
  duration: number
}

export interface NarrationCueTranslation {
  cueIndex: number
  translation: string
}

export interface NarrationTranslationResult {
  cues: NarrationCueTranslation[]
}

export interface PaintingInfo {
  title: string
  year: string
  artist: string
  collection: string
  visualDescription: string
  theme: string
}

export interface OpenRouterModelInfo {
  id: string
  name: string
  pricing: { prompt: string; completion: string }
  context_length: number
  architecture: { modality: string }
}

async function fetchAllOpenRouterModels(apiKey: string): Promise<OpenRouterModelInfo[]> {
  const res = await fetch('https://openrouter.ai/api/v1/models', {
    headers: { 'Authorization': `Bearer ${apiKey}` },
  })
  if (!res.ok) throw new Error(`無法取得模型列表 (${res.status})`)
  const data = await res.json()
  return data.data as OpenRouterModelInfo[]
}

export async function fetchAllTranslationModels(apiKey: string): Promise<OpenRouterModelInfo[]> {
  const all = await fetchAllOpenRouterModels(apiKey)
  return all.sort((a, b) => a.id.localeCompare(b.id))
}

export async function fetchOpenRouterModels(apiKey: string): Promise<OpenRouterModelInfo[]> {
  const all = await fetchAllOpenRouterModels(apiKey)
  // Keep only vision-capable models (modality contains "image")
  return all
    .filter(m => m.architecture?.modality?.toLowerCase().includes('image'))
    .sort((a, b) => a.id.localeCompare(b.id))
}

export const SYSTEM_PROMPT = `You are a cinematic short-video narrator and creator specializing in art history, literary storytelling, and famous painting analysis. You reveal hidden emotional tension inside paintings and turn them into gripping 9:16 micro-stories for Instagram Reels / TikTok.

Your task is to analyze the painting information I provide and design a 9:16 vertical video storyboard told through camera movements and bilingual captions.

The video should feel like a high-quality art commentary short: cinematic, quiet, deep, slightly dark, emotionally restrained, and suitable for slow push-ins, close-up details, low voiceover, and classical music.

Creative direction:

1. Begin with the full painting, then push into the visual details that carry the drama.
2. Do not simply introduce art history. Interpret the painting as a story about humanity, belief, loneliness, pain, love, death, fate, sacrifice, dignity, or redemption.
3. The narration must contain a turn: first pull the viewer into the visible image, then reveal a deeper emotional or human meaning.
4. Preserve the painting title, year, artist, and collection location somewhere in the narrative arc, but keep them concise and cinematic.
5. Avoid sounding like an encyclopedia. Do not be academic.
6. Chinese subtitles must use Traditional Chinese and sound natural, spoken, and emotionally restrained.
7. English captions must remain short, direct, conversational, and dramatic.

Painting information:

Painting title: [Insert painting title]
Year: [Insert year]
Artist: [Insert artist]
Collection location: [Insert collection location]
Visual description: [Describe the people, setting, light, gestures, expressions, background, and important details in the painting]
Theme I want to emphasize: [For example: faith, betrayal, loneliness, sacrifice, motherly love, death, fate, dignity after humiliation]

Return ONLY the following JSON format — no extra text, no markdown fences:
{
“points”: [
{
“x”: 0.5,
“y”: 0.5,
“zoom”: 1.0,
“move”: “slide”,
“moveDuration”: 2.0,
“holdDuration”: 2.0,
“caption”: {
“text”: “He painted her three times. She never came back.”,
“subtitle”: “他為她畫了三次。她再也沒有回來。”,
“captionX”: 0.5,
“captionY”: 0.85
}
}
]
}

RULES:

1. Design 7–15 shots. Open with the full painting, then push into the details that carry the drama.
2. FIRST SHOT: zoom=1.0, x=0.5, y=0.5 — fills the entire 9:16 frame. The caption must be an instant hook — one sentence that makes the viewer stop scrolling. Do NOT describe the painting. Instead, drop them into the most dramatic moment, for example: “She was already dead when he finished the portrait.” / “Nobody in this room survived the next year.”
3. caption.text: one short English sentence, 5–12 words. Rules:
    * Write like someone is talking. Casual, direct, conversational. Not prose. Not poetry.
    * Sound like a person saying it out loud to a friend — not a writer crafting a line.
    * Write the most dramatic moment — betrayal, desire, death, obsession, a secret about to break.
    * No metaphors. No literary language. No flowery words. No passive voice.
    * BAD, too poetic: “Her gaze holds the weight of a thousand silences.” / “In shadow, fate is written.”
    * GOOD, spoken and plain: “She knew he was lying.” / “That hand was painted over. Twice.” / “He never told her he knew.” / “Everyone in this room is already dead.”
4. caption.subtitle: Traditional Chinese translation of caption.text — same casual spoken tone, same sentence length. Must sound like everyday Mandarin speech, not literary Chinese.
5. caption.captionX / caption.captionY: position of caption block within the 9:16 frame, where 0=left/top and 1=right/bottom.
    * captionX: default 0.5.
    * captionY: if focal subject is in the lower half, shot y > 0.55, use 0.12–0.18, near the top.
    * If focal subject is in the upper half, shot y < 0.45, use 0.82–0.88, near the bottom.
    * Default captionY is 0.85.
6. Narrative arc: zoom in on the drama, not the history. Each shot should escalate — from the shocking opening, to the evidence, to the detail no one notices, to the moment that changes everything. End on an unanswered question or a gut-punch image.
7. x / y: focal center of the shot, where 0=left/top and 1=right/bottom. Always point at something meaningful.
8. zoom: 1.0–15.0. Each zoom change should feel like a reveal.
9. Camera position continuity:
    * If two or more important details are very close together in the painting, do NOT force a new camera position for each line.
    * You may keep the same x/y position and change only zoom, caption, or holdDuration.
    * You may also stay on the same framing when the emotional meaning changes but the visual focus remains almost the same.
    * Avoid unnecessary tiny camera shifts. The movement should feel intentional, not restless.
10. move:

* Default move is “slide”.
* Use “jump” only when the story needs a sudden cut, shock, contradiction, or emotional break.
* When staying on nearly the same point, still use “slide” unless a sharp cut is narratively necessary.

11. moveDuration:

* Minimum: 1.0 second.
* Default: 2.0 seconds.
* Range: 1.0–3.5 seconds.
* Use longer movement for slow reveals, especially when pushing from the full painting into a face, hand, wound, object, or background figure.

12. holdDuration:

* Minimum: 1.0 second.
* Default: 2.0 seconds.
* Range: 1.0–4.0 seconds.
* Use longer holds when the viewer needs time to feel the detail, read the caption, or notice a hidden emotional clue.

13. Do not create cuts just to satisfy the shot count. If the drama is carried by one area of the painting, let the camera stay there longer and let the captions deepen the meaning.
14. STRICTLY return JSON only — no explanation, no code fences, nothing else.`

// export const SYSTEM_PROMPT = `You are a short-video narrator who reveals hidden secrets inside famous paintings.
// Your task: analyze the painting and design a 9:16 vertical video — a gripping micro-story told through camera movements and bilingual captions.

// Tone: cinematic. Punchy. A little dark. Like uncovering something the painter never meant to show.

// Return ONLY the following JSON format — no extra text, no markdown fences:
// {
//   "points": [
//     {
//       "x": 0.5,
//       "y": 0.5,
//       "zoom": 1.0,
//       "move": "slide",
//       "moveDuration": 2.0,
//       "holdDuration": 2.0,
//       "caption": {
//         "text": "He painted her three times. She never came back.",
//         "subtitle": "他為她畫了三次。她再也沒有回來。",
//         "captionX": 0.5,
//         "captionY": 0.85
//       }
//     }
//   ]
// }

// RULES:
// 1. Design 7–15 shots. Open with the full painting, then push into the details that carry the drama.
// 2. FIRST SHOT: zoom=1.0, x=0.5, y=0.5 — fills the entire 9:16 frame. The caption must be an instant hook — one sentence that makes the viewer stop scrolling. Do NOT describe the painting. Instead, drop them into the most dramatic moment (e.g. "She was already dead when he finished the portrait." / "Nobody in this room survived the next year.").
// 3. caption.text: one short English sentence, 5–12 words. Rules:
//    - Write like someone is talking. Casual, direct, conversational. Not prose. Not poetry.
//    - Sound like a person saying it out loud to a friend — not a writer crafting a line.
//    - Write the most dramatic moment — betrayal, desire, death, obsession, a secret about to break.
//    - No metaphors. No literary language. No flowery words. No passive voice.
//    - BAD (too poetic): "Her gaze holds the weight of a thousand silences." / "In shadow, fate is written."
//    - GOOD (spoken, plain): "She knew he was lying." / "That hand was painted over. Twice." / "He never told her he knew." / "Everyone in this room is already dead."
// 4. caption.subtitle: Traditional Chinese translation of caption.text — same casual spoken tone, same sentence length. Must sound like everyday Mandarin speech, not literary Chinese.
// 5. caption.captionX / caption.captionY: position of caption block within the 9:16 frame (0=left/top, 1=right/bottom).
//    - captionX: default 0.5.
//    - captionY: if focal subject is in the lower half (shot y > 0.55), use 0.12–0.18 (top). If upper half (shot y < 0.45), use 0.82–0.88 (bottom). Default 0.85.
// 6. Narrative arc: zoom in on the drama, not the history. Each shot should escalate — from the shocking opening, to the evidence, to the detail no one notices, to the moment that changes everything. End on an unanswered question or a gut-punch image.
// 7. x / y: focal center of the shot (0=left/top, 1=right/bottom). Always point at something meaningful.
// 8. zoom: 1.0–5.0. Each zoom change should feel like a reveal.
// 9. move: default "slide". Use "jump" only when the story needs a sudden cut.
// 10. moveDuration: default 2.0 s (range 1.0–3.5 s).
// 11. holdDuration: default 2.0 s (range 1.5–4.0 s).
// 12. STRICTLY return JSON only — no explanation, no code fences, nothing else.`

const AI_REQUEST_TIMEOUT_MS = 180_000

export function createAiTimeoutSignal(): AbortSignal | undefined {
  return typeof AbortSignal !== 'undefined' && 'timeout' in AbortSignal
    ? AbortSignal.timeout(AI_REQUEST_TIMEOUT_MS)
    : undefined
}

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && (error.name === 'TimeoutError' || error.name === 'AbortError')
}

/**
 * 盡可能從模型輸出解析出 JSON 物件：
 * 1. 去掉 markdown code fences 後直接 parse
 * 2. 擷取第一個 { 到最後一個 } 之間的內容再 parse
 * 3. 最後手段：把彎引號換成直引號再試（部分模型會模仿 prompt 中的彎引號）
 */
export function parseAiJsonObject<T>(raw: string, errorMessage: string): T {
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim()
  const candidates = [cleaned]
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start >= 0 && end > start) candidates.push(cleaned.slice(start, end + 1))
  for (const candidate of candidates) {
    try { return JSON.parse(candidate) as T } catch { /* try next */ }
    try { return JSON.parse(candidate.replace(/[“”„]/g, '"').replace(/[‘’]/g, "'")) as T } catch { /* try next */ }
  }
  throw new Error(errorMessage)
}

export function buildPrompt(basePrompt: string, info: PaintingInfo): string {
  return basePrompt
    .replace('[Insert painting title]', info.title || '（未提供）')
    .replace('[Insert year]', info.year || '（未提供）')
    .replace('[Insert artist]', info.artist || '（未提供）')
    .replace('[Insert collection location]', info.collection || '（未提供）')
    .replace(
      '[Describe the people, setting, light, gestures, expressions, background, and important details in the painting]',
      info.visualDescription || '（未提供）',
    )
    .replace(
      '[For example: faith, betrayal, loneliness, sacrifice, motherly love, death, fate, dignity after humiliation]',
      info.theme || '（未提供）',
    )
}

export async function generateWithAi(
  config: OpenRouterConfig,
  imageDataUrl: string,
  paintingInfo?: PaintingInfo,
  customBasePrompt?: string
): Promise<AiGenerateResult> {
  let response: Response
  try {
    response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      signal: createAiTimeoutSignal(),
      method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': window.location.origin,
      'X-Title': 'Image Shot Video Generator',
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: imageDataUrl },
            },
            {
              type: 'text',
              text: paintingInfo
                ? buildPrompt(customBasePrompt ?? SYSTEM_PROMPT, paintingInfo)
                : (customBasePrompt ?? SYSTEM_PROMPT),
            },
          ],
        },
      ],
      max_tokens: 3000,
    }),
    })
  } catch (error) {
    if (isAbortError(error)) throw new Error('AI 請求逾時，請重試或換模型')
    throw error
  }

  if (!response.ok) {
    let msg = `API 錯誤 ${response.status}`
    try {
      const err = await response.json()
      if (err?.error?.message) msg = err.error.message
    } catch { /* ignore */ }
    throw new Error(msg)
  }

  const data = await response.json()
  const raw: string = data.choices?.[0]?.message?.content ?? ''

  if (!raw) throw new Error('AI 未回傳任何內容')

  const parsed = parseAiJsonObject<AiGenerateResult>(raw, 'AI 回傳的 JSON 無法解析，請重試或換模型')

  if (!Array.isArray(parsed.points) || parsed.points.length === 0) {
    throw new Error('AI 回傳格式不符，缺少 points 陣列')
  }

  return parsed
}

export const DEFAULT_NARRATION_TRANSLATION_MODEL = 'google/gemma-4-31b-it:free'

const NARRATION_TRANSLATION_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['cues'],
  properties: {
    cues: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['cueIndex', 'translation'],
        properties: {
          cueIndex: { type: 'number' },
          translation: { type: 'string' },
        },
      },
    },
  },
}

export async function translateNarrationCues(
  apiKey: string,
  model: string,
  narrationText: string,
  cues: NarrationTranslationCueInput[],
): Promise<NarrationTranslationResult> {
  if (!apiKey.trim()) throw new Error('請先輸入 OpenRouter API Key')
  if (!narrationText.trim()) throw new Error('缺少完整旁白內容')
  if (!cues.length) throw new Error('目前沒有英文字幕可翻譯')

  let response: Response
  try {
    response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      signal: createAiTimeoutSignal(),
      method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': window.location.origin,
      'X-Title': 'Artful Learning Narration Translator',
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'system',
          content: [
            'You translate English voiceover subtitles into natural Traditional Chinese for vertical short videos.',
            'The English cues are short timing chunks, not translation units.',
            'First understand and translate the full narration naturally, then distribute the Chinese translation across the cue indexes.',
            'Each output item must contain only the Chinese text that should appear during that one cue.',
            'Never repeat a full sentence across multiple cues.',
            'If one Chinese sentence spans several cues, split the sentence into natural short parts across those cues.',
            'If a cue should not show Chinese text, return an empty translation for that cue.',
            'Use Traditional Chinese. Keep the tone spoken, cinematic, restrained, and natural.',
            'Do not translate each English cue literally. Preserve meaning, sequence, emotional tone, and timing.',
            'Return only structured JSON matching the schema.',
          ].join('\n'),
        },
        {
          role: 'user',
          content: JSON.stringify({
            narrationText,
            cues: cues.map(cue => ({
              index: cue.index,
              id: cue.id,
              text: cue.text,
              startTime: cue.startTime,
              duration: cue.duration,
            })),
            instructions: {
              output: 'Create one Traditional Chinese translation item for each cue index.',
              grouping: 'Use the full narration for natural meaning, but split the final Chinese text back into cue-sized display parts.',
              timing: 'Use cueIndex to point to the cue where that Chinese text should appear.',
              style: 'Natural spoken Mandarin used in Taiwan, not literary Chinese, not word-for-word translation.',
              avoid: 'Do not put the entire Chinese translation into every cue. Do not repeat the same long translation across cues.',
            },
          }),
        },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'narration_cue_translations',
          strict: true,
          schema: NARRATION_TRANSLATION_SCHEMA,
        },
      },
      max_tokens: 3000,
    }),
    })
  } catch (error) {
    if (isAbortError(error)) throw new Error('翻譯請求逾時，請重試')
    throw error
  }

  if (!response.ok) {
    let msg = `翻譯 API 錯誤 ${response.status}`
    try {
      const err = await response.json()
      if (err?.error?.message) msg = err.error.message
    } catch { /* ignore */ }
    throw new Error(msg)
  }

  const data = await response.json()
  const raw: string = data.choices?.[0]?.message?.content ?? ''
  if (!raw) throw new Error('翻譯模型未回傳任何內容')

  const parsed = parseAiJsonObject<NarrationTranslationResult>(raw, '翻譯模型回傳的 JSON 無法解析，請重試')

  if (!Array.isArray(parsed.cues)) {
    throw new Error('翻譯模型回傳格式不符，缺少 cues')
  }

  const maxIndex = cues.length - 1
  return {
    cues: parsed.cues
      .map(cue => ({
        cueIndex: Math.max(0, Math.min(maxIndex, Math.floor(Number(cue.cueIndex)))),
        translation: String(cue.translation ?? '').trim(),
      }))
      .filter(cue => cue.cueIndex >= 0),
  }
}
