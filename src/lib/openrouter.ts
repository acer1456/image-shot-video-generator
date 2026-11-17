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
