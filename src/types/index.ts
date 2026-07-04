export interface CaptionData {
  text: string
  subtitle: string
  x: number
  y: number
  scale: number
  subtitleScale: number
  fontFamily: string
  subtitleFontFamily: string
  boxScaleX: number
  boxScaleY: number
  // ── Shadow box ─────────────────────
  shadowColor: string
  shadowAlpha: number
  shadowBoxVisible: boolean
  // ── Main text shadow ───────────────
  textShadowColor: string
  textShadowAlpha: number
  textShadowAngle: number
  textShadowDistance: number
  // ── Subtitle text shadow ───────────
  subTextShadowColor: string
  subTextShadowAlpha: number
  subTextShadowAngle: number
  subTextShadowDistance: number
}

export interface CameraPoint {
  x: number
  y: number
  zoom: number
  move: 'slide' | 'jump'
  moveDuration: number
  holdDuration: number
  caption: CaptionData
  extraCaptions?: CaptionData[]
}

export interface BackgroundSettings {
  mode: 'color' | 'blur'
  color: string
  blur: number
}

export interface SafeAreaVisibility {
  ig: boolean
  shorts: boolean
  tiktok: boolean
}

export interface TimelineItem {
  type: 'move' | 'hold' | 'caption'
  pointIndex: number
  start: number
  end: number
  label: string
}

export interface Camera {
  cx: number
  cy: number
  zoom: number
}

export type ActiveTab = 'camera' | 'caption' | 'assist'

export interface ProjectData {
  app: string
  version: number
  name: string
  savedAt: string
  output: { width: number; height: number; ratio: string }
  image: { dataUrl: string; width: number; height: number } | null
  backgroundSettings: BackgroundSettings
  activeIndex: number
  activeTab: ActiveTab
  points: CameraPoint[]
  narrationInputText?: string
  narrationTrack?: NarrationTrack | null
  subtitleCues?: SubtitleCue[]
}

export interface DragState {
  type: 'move' | 'resize' | 'captionMove' | 'captionFontResize' | 'captionBoxWidth' | 'captionBoxHeight' | 'subtitleMove'
  index: number
  captionIndex?: number  // 0 = primary caption, 1+ = extraCaptions[captionIndex-1]
  offsetX?: number       // image-space offset for move-handle drag
  offsetY?: number
}

export interface SnapGuide {
  x: boolean
  y: boolean
}

export interface NarrationSegment {
  id: string
  text: string
  startTime: number       // position in timeline (seconds)
  duration: number        // audio duration (seconds)
  audioData?: Float32Array
  samplingRate?: number
}

export interface NarrationWordTimestamp {
  word: string
  startTime: number
  duration: number
  segmentId?: string
}

export interface NarrationPhonemeTimestamp {
  phoneme: string
  startTime: number
  duration: number
  segmentId?: string
}

export interface NarrationAudioSegment {
  id: string
  text: string
  startTime: number
  duration: number
  audioData?: Float32Array
  samplingRate?: number
  pauseAfterMs: number
  wordStartIndex: number
  wordEndIndex: number
}

export interface NarrationTrack {
  id: string
  text: string
  voice: string
  speed: number
  pauseIntensity: number
  startTime: number
  duration: number
  audioData?: Float32Array
  samplingRate?: number
  segments: NarrationAudioSegment[]
  words: NarrationWordTimestamp[]
  phonemes: NarrationPhonemeTimestamp[]
}

export interface SubtitleStyle {
  fontFamily: string      // CSS font-family string
  fontSizeRatio: number   // fraction of canvas.width, e.g. 0.055
  shadowEnabled: boolean
  shadowBlur: number      // 0–24 px
  shadowOpacity: number   // 0–1
  subtitlePosition: { x: number; y: number }  // normalized 0–1
  color: string           // 主字幕文字顏色
  translationScale: number // 副（翻譯）字幕相對主字幕的大小，0.5–1
  strokeEnabled: boolean  // 文字描邊
  strokeColor: string
  strokeWidth: number     // px（以 1080 寬為基準）
  backgroundEnabled: boolean  // 半透明背景條
  backgroundOpacity: number   // 0–1
}

export interface SubtitleCue {
  id: string
  narrationId: string
  segmentId?: string
  text: string
  translation: string
  startTime: number
  duration: number
  style: SubtitleStyle
  wordStartIndex: number
  wordEndIndex: number
}

export const DEFAULT_SUBTITLE_STYLE: SubtitleStyle = {
  fontFamily: "Georgia, 'Times New Roman', serif",
  fontSizeRatio: 0.055,
  shadowEnabled: true,
  shadowBlur: 10,
  shadowOpacity: 0.9,
  subtitlePosition: { x: 0.5, y: 0.87 },
  color: '#ffffff',
  translationScale: 0.72,
  strokeEnabled: false,
  strokeColor: '#000000',
  strokeWidth: 4,
  backgroundEnabled: false,
  backgroundOpacity: 0.45,
}
