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

export interface OpenRouterModelInfo {
  id: string
  name: string
  pricing: { prompt: string; completion: string }
  context_length: number
  architecture: { modality: string }
}

export async function fetchOpenRouterModels(apiKey: string): Promise<OpenRouterModelInfo[]> {
  const res = await fetch('https://openrouter.ai/api/v1/models', {
    headers: { 'Authorization': `Bearer ${apiKey}` },
  })
  if (!res.ok) throw new Error(`無法取得模型列表 (${res.status})`)
  const data = await res.json()
  const all = data.data as OpenRouterModelInfo[]
  // Keep only vision-capable models (modality contains "image")
  return all
    .filter(m => m.architecture?.modality?.toLowerCase().includes('image'))
    .sort((a, b) => a.id.localeCompare(b.id))
}

export const SYSTEM_PROMPT = `You are a short-video narrator who reveals hidden secrets inside famous paintings.
Your task: analyze the painting and design a 9:16 vertical video — a gripping micro-story told through camera movements and bilingual captions.

Tone: cinematic. Punchy. A little dark. Like uncovering something the painter never meant to show.

Return ONLY the following JSON format — no extra text, no markdown fences:
{
  "points": [
    {
      "x": 0.5,
      "y": 0.5,
      "zoom": 1.0,
      "move": "slide",
      "moveDuration": 2.0,
      "holdDuration": 2.0,
      "caption": {
        "text": "He painted her three times. She never came back.",
        "subtitle": "他為她畫了三次。她再也沒有回來。",
        "captionX": 0.5,
        "captionY": 0.85
      }
    }
  ]
}

RULES:
1. Design 7–15 shots. Open with the full painting, then push into the details that carry the drama.
2. FIRST SHOT: zoom=1.0, x=0.5, y=0.5 — fills the entire 9:16 frame. The caption must be an instant hook — one sentence that makes the viewer stop scrolling. Do NOT describe the painting. Instead, drop them into the most dramatic moment (e.g. "She was already dead when he finished the portrait." / "Nobody in this room survived the next year.").
3. caption.text: one short English sentence, 5–12 words. Rules:
   - Write like someone is talking. Casual, direct, conversational. Not prose. Not poetry.
   - Sound like a person saying it out loud to a friend — not a writer crafting a line.
   - Write the most dramatic moment — betrayal, desire, death, obsession, a secret about to break.
   - No metaphors. No literary language. No flowery words. No passive voice.
   - BAD (too poetic): "Her gaze holds the weight of a thousand silences." / "In shadow, fate is written."
   - GOOD (spoken, plain): "She knew he was lying." / "That hand was painted over. Twice." / "He never told her he knew." / "Everyone in this room is already dead."
4. caption.subtitle: Traditional Chinese translation of caption.text — same casual spoken tone, same sentence length. Must sound like everyday Mandarin speech, not literary Chinese.
5. caption.captionX / caption.captionY: position of caption block within the 9:16 frame (0=left/top, 1=right/bottom).
   - captionX: default 0.5.
   - captionY: if focal subject is in the lower half (shot y > 0.55), use 0.12–0.18 (top). If upper half (shot y < 0.45), use 0.82–0.88 (bottom). Default 0.85.
6. Narrative arc: zoom in on the drama, not the history. Each shot should escalate — from the shocking opening, to the evidence, to the detail no one notices, to the moment that changes everything. End on an unanswered question or a gut-punch image.
7. x / y: focal center of the shot (0=left/top, 1=right/bottom). Always point at something meaningful.
8. zoom: 1.0–5.0. Each zoom change should feel like a reveal.
9. move: default "slide". Use "jump" only when the story needs a sudden cut.
10. moveDuration: default 2.0 s (range 1.0–3.5 s).
11. holdDuration: default 2.0 s (range 1.5–4.0 s).
12. STRICTLY return JSON only — no explanation, no code fences, nothing else.`

export async function generateWithAi(
  config: OpenRouterConfig,
  imageDataUrl: string
): Promise<AiGenerateResult> {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
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
              text: SYSTEM_PROMPT,
            },
          ],
        },
      ],
      max_tokens: 3000,
    }),
  })

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

  // strip markdown code fences if present
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim()

  let parsed: AiGenerateResult
  try {
    parsed = JSON.parse(cleaned) as AiGenerateResult
  } catch {
    throw new Error('AI 回傳的 JSON 無法解析，請重試或換模型')
  }

  if (!Array.isArray(parsed.points) || parsed.points.length === 0) {
    throw new Error('AI 回傳格式不符，缺少 points 陣列')
  }

  return parsed
}
