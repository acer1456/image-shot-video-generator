import type { CameraPoint } from '@/types'
import { normalizePoint } from '@/hooks/useAppStore'

export interface CameraTemplate {
  id: string
  label: string
  description: string
  /** 給 AI 配鏡頭用的風格指引（英文，會附加在 camera prompt 後） */
  aiStyleHint: string
  build: () => CameraPoint[]
}

type RawPoint = Parameters<typeof normalizePoint>[0]

function pts(list: RawPoint[]): CameraPoint[] {
  return list.map(normalizePoint)
}

/**
 * 運鏡模板：一鍵產生常用的解說影片鏡頭路徑，之後可再逐點微調。
 * x/y 為畫面焦點（0–1 正規化座標），第一個鏡頭固定從全圖開始。
 */
export const CAMERA_TEMPLATES: CameraTemplate[] = [
  {
    id: 'ken-burns',
    label: '經典推進（全圖 → 細節 → 全圖）',
    description: '慢速推入畫面中心與上半部細節，最後拉回全圖。',
    aiStyleHint: 'Classic push-in arc: open on the full painting, push progressively deeper into the key details with slow slides (moveDuration 1.5–2s where the cue span allows), and return to the full painting for the final cues. Zoom stays moderate (2–4). Every camera change should feel like a deliberate step deeper into the story.',
    build: () => pts([
      { x: 0.5, y: 0.5, zoom: 1, move: 'jump', moveDuration: 0.1, holdDuration: 2 },
      { x: 0.5, y: 0.5, zoom: 2.4, move: 'slide', moveDuration: 2.5, holdDuration: 2.5 },
      { x: 0.5, y: 0.35, zoom: 4, move: 'slide', moveDuration: 2, holdDuration: 2 },
      { x: 0.5, y: 0.5, zoom: 1, move: 'slide', moveDuration: 2.5, holdDuration: 1.5 },
    ]),
  },
  {
    id: 'three-details',
    label: '三段細節巡禮',
    description: '全圖開場後依序走訪左上、右中、下方三個細節，收在全圖。',
    aiStyleHint: 'Structure the video as: full painting → exactly three distinct detail regions in different areas of the painting → back to the full painting. Group the cues so each detail region is held across 2–3 consecutive cues (identical x/y/zoom), with a smooth slide between regions. Choose the three regions that best match the narration.',
    build: () => pts([
      { x: 0.5, y: 0.5, zoom: 1, move: 'jump', moveDuration: 0.1, holdDuration: 2 },
      { x: 0.32, y: 0.3, zoom: 3, move: 'slide', moveDuration: 2, holdDuration: 2 },
      { x: 0.68, y: 0.45, zoom: 3.5, move: 'slide', moveDuration: 2, holdDuration: 2 },
      { x: 0.5, y: 0.7, zoom: 3, move: 'slide', moveDuration: 2, holdDuration: 2 },
      { x: 0.5, y: 0.5, zoom: 1, move: 'slide', moveDuration: 2.5, holdDuration: 1.5 },
    ]),
  },
  {
    id: 'slow-gaze',
    label: '緩慢凝視（沉靜長鏡頭）',
    description: '少量鏡頭、長停留，適合情緒沉靜的旁白解說。',
    aiStyleHint: 'Contemplative long takes: change the camera at most once every 3–4 cues. Use very slow push-ins (moveDuration close to the maximum the cue span allows) and low zoom levels (1.5–3). Never jump. The camera should feel like a quiet, patient gaze resting on the painting.',
    build: () => pts([
      { x: 0.5, y: 0.5, zoom: 1, move: 'jump', moveDuration: 0.1, holdDuration: 3 },
      { x: 0.5, y: 0.45, zoom: 2, move: 'slide', moveDuration: 4, holdDuration: 4 },
      { x: 0.5, y: 0.38, zoom: 2.8, move: 'slide', moveDuration: 3.5, holdDuration: 3 },
    ]),
  },
  {
    id: 'jump-cuts',
    label: '快節奏跳切（四角細節）',
    description: '全圖後快速跳切四個角落細節，節奏明快。',
    aiStyleHint: 'Fast rhythmic editing: use "jump" for most camera changes, cutting between clearly different detail regions at high zoom (3.5–5). Change the camera every 1–2 cues. moveDuration 0.1 for jumps. Open on the full painting and end with a jump back to the full painting.',
    build: () => pts([
      { x: 0.5, y: 0.5, zoom: 1, move: 'jump', moveDuration: 0.1, holdDuration: 1.5 },
      { x: 0.3, y: 0.3, zoom: 4, move: 'jump', moveDuration: 0.1, holdDuration: 1.2 },
      { x: 0.7, y: 0.3, zoom: 4, move: 'jump', moveDuration: 0.1, holdDuration: 1.2 },
      { x: 0.7, y: 0.7, zoom: 4, move: 'jump', moveDuration: 0.1, holdDuration: 1.2 },
      { x: 0.3, y: 0.7, zoom: 4, move: 'jump', moveDuration: 0.1, holdDuration: 1.2 },
      { x: 0.5, y: 0.5, zoom: 1, move: 'slide', moveDuration: 2, holdDuration: 1.5 },
    ]),
  },
]
