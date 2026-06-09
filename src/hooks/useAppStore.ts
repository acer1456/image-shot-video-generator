import { useState, useCallback } from 'react'
import type {
  CameraPoint, CaptionData, BackgroundSettings,
  SafeAreaVisibility, ActiveTab
} from '@/types'
import { DEFAULT_FONT, clamp, normalizeProjectName } from '@/lib/utils'

const CAPTION_STYLE_KEYS: (keyof CaptionData)[] = [
  'x', 'y', 'scale', 'subtitleScale', 'fontFamily', 'subtitleFontFamily',
  'boxScaleX', 'boxScaleY', 'shadowColor', 'shadowAlpha', 'shadowBoxVisible',
  'textShadowColor', 'textShadowAlpha', 'textShadowAngle', 'textShadowDistance',
  'subTextShadowColor', 'subTextShadowAlpha', 'subTextShadowAngle', 'subTextShadowDistance',
]

function makeCaption(
  lastCaptionStyle: Partial<CaptionData> | null,
  overrides: Partial<CaptionData> = {}
): CaptionData {
  const base: CaptionData = {
    text: '', subtitle: '', x: 0.5, y: 0.82, scale: 1, subtitleScale: 1,
    fontFamily: 'Georgia', subtitleFontFamily: 'Georgia',
    boxScaleX: 1, boxScaleY: 1, shadowColor: '#000000', shadowAlpha: 0.48,
    shadowBoxVisible: false,
    textShadowColor: '#000000', textShadowAlpha: 0.7, textShadowAngle: 50, textShadowDistance: 5,
    subTextShadowColor: '#000000', subTextShadowAlpha: 0.7, subTextShadowAngle: 50, subTextShadowDistance: 5,
  }
  return { ...base, ...(lastCaptionStyle || {}), text: '', subtitle: '', ...overrides }
}

function makePoint(
  x: number, y: number, zoom: number,
  move: 'slide' | 'jump',
  moveDuration: number, holdDuration: number,
  lastCameraSettings: Partial<CameraPoint> | null,
  lastCaptionStyle: Partial<CaptionData> | null
): CameraPoint {
  const remembered = lastCameraSettings || {}
  return {
    x, y,
    zoom: (remembered.zoom as number) ?? zoom,
    move: (remembered.move as 'slide' | 'jump') ?? move,
    moveDuration: (remembered.moveDuration as number) ?? moveDuration,
    holdDuration: (remembered.holdDuration as number) ?? holdDuration,
    caption: makeCaption(lastCaptionStyle)
  }
}

export function normalizePoint(raw: Partial<CameraPoint> & { caption?: Partial<CaptionData> }): CameraPoint {
  return {
    x: clamp(Number(raw?.x ?? 0.5), 0, 1),
    y: clamp(Number(raw?.y ?? 0.5), 0, 1),
    zoom: clamp(Number(raw?.zoom ?? 1), 1, 15),
    move: raw?.move === 'jump' ? 'jump' : 'slide',
    moveDuration: clamp(Number(raw?.moveDuration ?? 2), 0.1, 20),
    holdDuration: clamp(Number(raw?.holdDuration ?? 0.8), 0, 20),
    caption: makeCaption(null, raw?.caption || {}),
    extraCaptions: (raw?.extraCaptions || []).map(c => makeCaption(null, c))
  }
}

export function useAppStore() {
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [points, setPoints] = useState<CameraPoint[]>([])
  const [activeIndex, setActiveIndex] = useState<number>(-1)
  const [activeTab, setActiveTab] = useState<ActiveTab>('camera')
  const [isRendering, setIsRendering] = useState(false)
  const [isPreviewing, setIsPreviewing] = useState(false)
  const [projectName, setProjectName] = useState('未命名專案')
  const [backgroundSettings, setBackgroundSettings] = useState<BackgroundSettings>({
    mode: 'color', color: '#000000', blur: 18
  })
  const [safeAreaVisibility, setSafeAreaVisibility] = useState<SafeAreaVisibility>({
    ig: false, shorts: false, tiktok: false
  })
  const [showAllPoints, setShowAllPoints] = useState(true)
  const [onlyActiveBox, setOnlyActiveBox] = useState(true)
  const [showCaptionBox, setShowCaptionBox] = useState(true)
  const [showGuidesInPreview, setShowGuidesInPreview] = useState(false)
  const [showNarrationInOutput, setShowNarrationInOutput] = useState(true)
  const [showCameraCaptionsInOutput, setShowCameraCaptionsInOutput] = useState(true)
  const [lastCaptionStyle, setLastCaptionStyle] = useState<Partial<CaptionData> | null>(null)
  const [lastCameraSettings, setLastCameraSettings] = useState<Partial<CameraPoint> | null>(null)
  const [lastVideoUrl, setLastVideoUrl] = useState<string | null>(null)
  const [previewCancelToken, setPreviewCancelToken] = useState(0)

  const rememberCaptionStyle = useCallback((idx: number, pts: CameraPoint[]) => {
    if (!pts[idx]) return
    const cap = pts[idx].caption
    const style = Object.fromEntries(CAPTION_STYLE_KEYS.map(k => [k, cap[k]])) as Partial<CaptionData>
    setLastCaptionStyle(style)
  }, [])

  const rememberCameraSettings = useCallback((idx: number, pts: CameraPoint[]) => {
    if (!pts[idx]) return
    const p = pts[idx]
    setLastCameraSettings({ zoom: p.zoom, move: p.move, moveDuration: p.moveDuration, holdDuration: p.holdDuration })
  }, [])

  const loadImageFile = useCallback((
    file: File,
    resetProject: boolean,
    currentImageUrl: string | null
  ) => {
    if (currentImageUrl) URL.revokeObjectURL(currentImageUrl)
    const url = URL.createObjectURL(file)
    setImageUrl(url)
    const img = new Image()
    img.onload = () => {
      setImage(img)
      if (resetProject) {
        setPoints([])
        setActiveIndex(-1)
        setLastCaptionStyle(null)
        setLastCameraSettings(null)
        const baseName = file.name ? file.name.replace(/\.[^.]+$/, '') : '未命名專案'
        setProjectName(normalizeProjectName(baseName))
      }
    }
    img.src = url
  }, [])

  const loadImageDataUrl = useCallback((dataUrl: string) => {
    const img = new Image()
    img.onload = () => {
      setImage(img)
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl)
        setImageUrl(null)
      }
    }
    img.src = dataUrl
  }, [imageUrl])

  const addPoint = useCallback((x: number, y: number, currentPoints: CameraPoint[], currentLast: Partial<CaptionData> | null, currentCameraSettings: Partial<CameraPoint> | null) => {
    const zoom = currentPoints.length === 0 ? 1 : 3
    const newPt = makePoint(x, y, zoom, 'slide', 2, 0.8, currentCameraSettings, currentLast)
    const next = [...currentPoints, newPt]
    setPoints(next)
    setActiveIndex(next.length - 1)
    return next
  }, [])

  const addFullFramePoint = useCallback((where: 'start' | 'end', currentPoints: CameraPoint[], currentLast: Partial<CaptionData> | null, currentCameraSettings: Partial<CameraPoint> | null) => {
    const move: 'jump' | 'slide' = where === 'start' ? 'jump' : 'slide'
    const moveDuration = where === 'start' ? 0.1 : 2
    const newPt = makePoint(0.5, 0.5, 1, move, moveDuration, 1, currentCameraSettings, currentLast)
    if (where === 'start') {
      const next = [newPt, ...currentPoints]
      setPoints(next)
      setActiveIndex(0)
      return next
    } else {
      const next = [...currentPoints, newPt]
      setPoints(next)
      setActiveIndex(next.length - 1)
      return next
    }
  }, [])

  const removePoint = useCallback((index: number, currentPoints: CameraPoint[], currentActive: number) => {
    const next = currentPoints.filter((_, i) => i !== index)
    let nextActive = currentActive
    if (currentActive === index) nextActive = -1
    else if (currentActive > index) nextActive = currentActive - 1
    setPoints(next)
    setActiveIndex(nextActive)
    return next
  }, [])

  const updatePointField = useCallback(<K extends keyof CameraPoint>(
    index: number, field: K, value: CameraPoint[K], currentPoints: CameraPoint[]
  ) => {
    const next = currentPoints.map((p, i) => i === index ? { ...p, [field]: value } : p)
    setPoints(next)
    return next
  }, [])

  const updateCaptionField = useCallback(<K extends keyof CaptionData>(
    index: number, field: K, value: CaptionData[K], currentPoints: CameraPoint[]
  ) => {
    const next = currentPoints.map((p, i) =>
      i === index ? { ...p, caption: { ...p.caption, [field]: value } } : p
    )
    setPoints(next)
    return next
  }, [])

  const updateCaptionPosition = useCallback((
    pointIndex: number,
    captionIndex: number,
    x: number,
    y: number,
    currentPoints: CameraPoint[],
  ) => {
    const next = currentPoints.map((point, index) => {
      if (index !== pointIndex) return point
      if (captionIndex === 0) {
        return { ...point, caption: { ...point.caption, x, y } }
      }
      const extraIndex = captionIndex - 1
      const extraCaptions = [...(point.extraCaptions || [])]
      if (!extraCaptions[extraIndex]) return point
      extraCaptions[extraIndex] = { ...extraCaptions[extraIndex], x, y }
      return { ...point, extraCaptions }
    })
    setPoints(next)
    return next
  }, [])

  const clearPoints = useCallback(() => {
    setPoints([])
    setActiveIndex(-1)
    setLastCaptionStyle(null)
    setLastCameraSettings(null)
  }, [])

  const insertPointAfter = useCallback((
    afterIndex: number,
    currentPoints: CameraPoint[],
    currentLast: Partial<CaptionData> | null,
    currentCameraSettings: Partial<CameraPoint> | null
  ) => {
    const ref = currentPoints[afterIndex]
    const newPt = makePoint(
      ref ? ref.x : 0.5,
      ref ? ref.y : 0.5,
      ref ? clamp(ref.zoom, 1, 15) : 3,
      'slide', 2, 0.8,
      currentCameraSettings, currentLast
    )
    const next = [
      ...currentPoints.slice(0, afterIndex + 1),
      newPt,
      ...currentPoints.slice(afterIndex + 1),
    ]
    setPoints(next)
    setActiveIndex(afterIndex + 1)
    return next
  }, [])

  const duplicatePoint = useCallback((index: number, currentPoints: CameraPoint[]) => {
    const src = currentPoints[index]
    if (!src) return currentPoints
    const copy: CameraPoint = JSON.parse(JSON.stringify(src))
    const next = [
      ...currentPoints.slice(0, index + 1),
      copy,
      ...currentPoints.slice(index + 1),
    ]
    setPoints(next)
    setActiveIndex(index + 1)
    return next
  }, [])

  const reorderPoints = useCallback((newPoints: CameraPoint[], newActiveIndex: number) => {
    setPoints(newPoints)
    setActiveIndex(newActiveIndex)
    return newPoints
  }, [])

  const addExtraCaption = useCallback((pointIndex: number, currentPoints: CameraPoint[]) => {
    const p = currentPoints[pointIndex]
    if (!p) return currentPoints
    const newCap = makeCaption(null, { y: 0.15, x: 0.5 })
    const extra = [...(p.extraCaptions || []), newCap]
    const next = currentPoints.map((pt, i) => i === pointIndex ? { ...pt, extraCaptions: extra } : pt)
    setPoints(next)
    return next
  }, [])

  const removeExtraCaption = useCallback((pointIndex: number, extraIndex: number, currentPoints: CameraPoint[]) => {
    const p = currentPoints[pointIndex]
    if (!p) return currentPoints
    const extra = (p.extraCaptions || []).filter((_, i) => i !== extraIndex)
    const next = currentPoints.map((pt, i) => i === pointIndex ? { ...pt, extraCaptions: extra } : pt)
    setPoints(next)
    return next
  }, [])

  const updateExtraCaptionField = useCallback(<K extends keyof CaptionData>(
    pointIndex: number, extraIndex: number, field: K, value: CaptionData[K], currentPoints: CameraPoint[]
  ) => {
    const next = currentPoints.map((p, i) => {
      if (i !== pointIndex) return p
      const extra = [...(p.extraCaptions || [])]
      if (!extra[extraIndex]) return p
      extra[extraIndex] = { ...extra[extraIndex], [field]: value }
      return { ...p, extraCaptions: extra }
    })
    setPoints(next)
    return next
  }, [])

  return {
    image, setImage,
    imageUrl, setImageUrl,
    points, setPoints,
    activeIndex, setActiveIndex,
    activeTab, setActiveTab,
    isRendering, setIsRendering,
    isPreviewing, setIsPreviewing,
    projectName, setProjectName,
    backgroundSettings, setBackgroundSettings,
    safeAreaVisibility, setSafeAreaVisibility,
    showAllPoints, setShowAllPoints,
    onlyActiveBox, setOnlyActiveBox,
    showCaptionBox, setShowCaptionBox,
    showGuidesInPreview, setShowGuidesInPreview,
    showNarrationInOutput, setShowNarrationInOutput,
    showCameraCaptionsInOutput, setShowCameraCaptionsInOutput,
    lastCaptionStyle, setLastCaptionStyle,
    lastCameraSettings, setLastCameraSettings,
    lastVideoUrl, setLastVideoUrl,
    previewCancelToken, setPreviewCancelToken,
    rememberCaptionStyle,
    rememberCameraSettings,
    loadImageFile,
    loadImageDataUrl,
    addPoint,
    addFullFramePoint,
    removePoint,
    updatePointField,
    updateCaptionField,
    updateCaptionPosition,
    clearPoints,
    insertPointAfter,
    duplicatePoint,
    reorderPoints,
    addExtraCaption,
    removeExtraCaption,
    updateExtraCaptionField,
  }
}

export type AppStore = ReturnType<typeof useAppStore>
