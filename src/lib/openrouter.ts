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

const SYSTEM_PROMPT = `You are a professional art storyteller and video narrative designer.
Your task: analyze the provided painting image and design a 9:16 vertical short video with camera paths and bilingual captions, focusing on CHARACTER STORIES and SYMBOLIC MEANINGS.

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
        "text": "She gazes into the distance, carrying a secret no one dares to ask.",
        "subtitle": "她凝視遠方，心懷一個無人敢問的秘密。",
        "captionX": 0.5,
        "captionY": 0.85
      }
    }
  ]
}

RULES:
1. Design 7–15 shots total. Start broad, then guide viewers through meaningful details.
2. FIRST SHOT: zoom must be 1.0, x=0.5, y=0.5 — fill the full 9:16 frame. Give it a compelling hook title that makes viewers want to keep watching (e.g. "A Secret Hidden for 500 Years").
3. caption.text MUST be a natural English spoken sentence (3–12 words) — NOT a title. Write as if narrating to a viewer, e.g. "She holds a pearl earring."
4. caption.subtitle MUST be the Traditional Chinese translation of caption.text — a full sentence, same meaning, same tone.
5. caption.captionX / caption.captionY: normalized position (0=left/top, 1=right/bottom) of the caption block within the 9:16 frame. Choose a position that does NOT overlap the focal subject of that shot:
   - captionX: default 0.5 (centered horizontally).
   - captionY: if the shot's focal subject is in the lower half (shot y > 0.55), place caption near top (0.12–0.18). If the subject is in the upper half (shot y < 0.45), place near bottom (0.82–0.88). Otherwise default to 0.85.
6. Narrative focus: character identity, emotions, relationships, symbolic objects, hidden meanings, historical context, and compositional secrets.
7. x / y: normalized focal center (0=left/top, 1=right/bottom). Pick visually significant areas.
8. zoom: 1.0–5.0. Vary meaningfully between shots.
9. move: default "slide" (smooth). Use "jump" only for dramatic narrative cuts.
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
