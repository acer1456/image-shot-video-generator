import { useCallback, useEffect, useState } from 'react'
import type { BackgroundSettings, CameraPoint, CaptionData, CarouselCard, CarouselInsight, CarouselNotes } from '@/types'
import { normalizePoint } from '@/hooks/useAppStore'
import { cardPointTemplate } from '@/lib/card'
import { clamp } from '@/lib/utils'
import { boxToPoint } from '@/lib/canvas'

const LS_CAROUSEL_CREDIT = 'carousel_credit'

/** IG 輪播固定 4:5 */
export const CAROUSEL_OUTPUT = { width: 1080, height: 1350 }
/**
 * 輪播字幕版面：置中在畫面正中央，字比影片小一號（英文 45px、中文 27px）；
 * 文字框加寬一點，讓一行英文（AI 提示詞限 34 字元）不必換行。字型、顏色仍沿用上次的字幕樣式。
 */
export const CAROUSEL_CAPTION = { x: 0.5, y: 0.5, scale: 0.8, subtitleScale: 1, boxScaleX: 1.1 } satisfies Partial<CaptionData>
/** IG 輪播預設原圖填滿模糊，與影片的純黑底獨立 */
export const DEFAULT_CAROUSEL_BACKGROUND: BackgroundSettings = { mode: 'blur', color: '#000000', blur: 18 }

/**
 * 輪播投影片：一份獨立於影片鏡頭的 CameraPoint 清單，用同一套編輯器以 4:5 編輯。
 * useAppStore 的 mutator 都綁死在 store.points 上，所以這裡自己寫一組同形狀的處理器。
 * ponytail: 投影片直接沿用 CameraPoint，move/時長欄位放著不用，換來 CanvasEditor、
 * CaptionEditor、ScreenDownload、normalizePoint 全部零改動。
 */
export function useCarouselSlides() {
  const [slides, setSlides] = useState<CameraPoint[]>([])
  const [activeIndex, setActiveIndex] = useState(-1)
  const [tab, setTab] = useState<'camera' | 'caption'>('camera')
  const [background, setBackground] = useState<BackgroundSettings>(DEFAULT_CAROUSEL_BACKGROUND)
  // AI 解析的敘事企劃／審核資料：隨專案存檔，面板開關不存
  const [notes, setNotes] = useState<CarouselNotes | null>(null)
  const [notesOpen, setNotesOpen] = useState(false)
  // 每張底部的 IG 署名是帳號層級的設定：存在這台電腦、所有專案共用，不進專案檔
  const [credit, setCredit] = useState(() => localStorage.getItem(LS_CAROUSEL_CREDIT) ?? '')
  useEffect(() => { localStorage.setItem(LS_CAROUSEL_CREDIT, credit) }, [credit])

  // 封面固定第一張、封底固定最後一張；其餘操作都不能越過它們
  const coverIndex = slides[0]?.card?.kind === 'cover' ? 0 : -1
  const outroIndex = slides.length && slides[slides.length - 1]?.card?.kind === 'outro' ? slides.length - 1 : -1
  const firstSlide = coverIndex + 1
  const endSlide = outroIndex === -1 ? slides.length : outroIndex   // 一般投影片區間 [firstSlide, endSlide)

  const makeSlide = useCallback((x: number, y: number, zoom: number, style: Partial<CaptionData> | null) => {
    // normalizePoint 的 caption 型別是交集寫法，部分欄位要用 cast 餵進去（App.tsx 也是這樣做）
    return normalizePoint({ x, y, zoom, caption: { ...(style || {}), ...CAROUSEL_CAPTION } as CaptionData })
  }, [])

  const patchSlide = useCallback((index: number, patch: Partial<CameraPoint>) => {
    setSlides(prev => prev.map((s, i) => i === index ? { ...s, ...patch } : s))
  }, [])

  const patchCaption = useCallback((index: number, captionIndex: number, patch: Partial<CaptionData>) => {
    setSlides(prev => prev.map((s, i) => {
      if (i !== index) return s
      if (captionIndex === 0) return { ...s, caption: { ...s.caption, ...patch } }
      const extra = [...(s.extraCaptions || [])]
      if (!extra[captionIndex - 1]) return s
      extra[captionIndex - 1] = { ...extra[captionIndex - 1], ...patch }
      return { ...s, extraCaptions: extra }
    }))
  }, [])

  const add = useCallback((x: number, y: number, style: Partial<CaptionData> | null) => {
    const slide = makeSlide(x, y, endSlide - firstSlide === 0 ? 1 : 2, style)
    setSlides([...slides.slice(0, endSlide), slide, ...slides.slice(endSlide)])
    setActiveIndex(endSlide)
  }, [slides, makeSlide, firstSlide, endSlide])

  const addCard = useCallback((kind: CarouselCard['kind'], style: Partial<CaptionData> | null) => {
    if ((kind === 'cover' ? coverIndex : outroIndex) !== -1) return
    const card = normalizePoint(cardPointTemplate(kind, style) as unknown as Parameters<typeof normalizePoint>[0])
    if (kind === 'cover') { setSlides([card, ...slides]); setActiveIndex(0) }
    else { setSlides([...slides, card]); setActiveIndex(slides.length) }
    setTab('camera')
  }, [slides, coverIndex, outroIndex])

  const updateCard = useCallback((index: number, patch: Partial<CarouselCard>) => {
    setSlides(prev => prev.map((s, i) => i === index && s.card ? { ...s, card: { ...s.card, ...patch } } : s))
  }, [])

  const remove = useCallback((index: number) => {
    setSlides(prev => prev.filter((_, i) => i !== index))
    setActiveIndex(cur => cur === index ? -1 : cur > index ? cur - 1 : cur)
  }, [])

  const duplicate = useCallback((index: number) => {
    const src = slides[index]
    if (!src || src.card) return
    const copy: CameraPoint = { ...src, caption: { ...src.caption }, extraCaptions: src.extraCaptions?.map(c => ({ ...c })) }
    setSlides([...slides.slice(0, index + 1), copy, ...slides.slice(index + 1)])
    setActiveIndex(index + 1)
  }, [slides])

  const move = useCallback((index: number, dir: -1 | 1) => {
    const to = index + dir
    if (index < firstSlide || to < firstSlide || to >= endSlide) return
    const next = [...slides]
    ;[next[index], next[to]] = [next[to], next[index]]
    setSlides(next)
    setActiveIndex(to)
  }, [slides, firstSlide, endSlide])

  /** 從影片鏡頭匯入：每個鏡頭變一張投影片，字幕位置與大小改用輪播預設 */
  const importFromPoints = useCallback((points: CameraPoint[]) => {
    const imported = points.map(p => normalizePoint({
      ...p,
      caption: { ...p.caption, ...CAROUSEL_CAPTION },
    }))
    if (!imported.length) return
    setSlides([...slides.slice(0, endSlide), ...imported, ...slides.slice(endSlide)])
    setActiveIndex(endSlide)
  }, [slides, endSlide])

  /** AI 解析：每個框換算成 4:5 取景，英文進主字幕、中文進副字幕；插在封底之前 */
  const importInsights = useCallback((
    insights: CarouselInsight[],
    image: { width: number; height: number },
    style: Partial<CaptionData> | null,
  ) => {
    const ratio = CAROUSEL_OUTPUT.width / CAROUSEL_OUTPUT.height
    const added = insights.map(({ box, en, zh }) => {
      const { x, y, zoom } = boxToPoint(image, box, ratio)
      const slide = makeSlide(x, y, zoom, style)
      return { ...slide, caption: { ...slide.caption, text: en, subtitle: zh } }
    })
    if (!added.length) return
    setSlides([...slides.slice(0, endSlide), ...added, ...slides.slice(endSlide)])
    setActiveIndex(endSlide)
  }, [slides, endSlide, makeSlide])

  const addCaption = useCallback((index: number, style: Partial<CaptionData> | null) => {
    setSlides(prev => prev.map((s, i) => {
      if (i !== index) return s
      const base = normalizePoint({ caption: { ...(style || {}), ...CAROUSEL_CAPTION } as CaptionData }).caption
      return { ...s, extraCaptions: [...(s.extraCaptions || []), base] }
    }))
  }, [])

  const removeCaption = useCallback((index: number, extraIndex: number) => {
    setSlides(prev => prev.map((s, i) =>
      i === index ? { ...s, extraCaptions: (s.extraCaptions || []).filter((_, k) => k !== extraIndex) } : s
    ))
  }, [])

  return {
    slides, setSlides,
    activeIndex, setActiveIndex,
    tab, setTab,
    background, setBackground,
    notes, setNotes,
    notesOpen, setNotesOpen,
    credit, setCredit,
    coverIndex, outroIndex, firstSlide, endSlide,
    add, addCard, updateCard, remove, duplicate, move, importFromPoints, importInsights,
    addCaption, removeCaption,
    // 與 canvasEditorProps 同形狀的處理器
    onPointMove: (index: number, x: number, y: number) => patchSlide(index, { x: clamp(x, 0, 1), y: clamp(y, 0, 1) }),
    onPointResize: (index: number, zoom: number) => patchSlide(index, { zoom: clamp(zoom, 1, 15) }),
    onCaptionMove: (index: number, captionIndex: number, x: number, y: number) => patchCaption(index, captionIndex, { x, y }),
    onCaptionFontResize: (index: number, captionIndex: number, scale: number) => patchCaption(index, captionIndex, { scale, subtitleScale: scale }),
    onCaptionBoxWidth: (index: number, captionIndex: number, boxScaleX: number) => patchCaption(index, captionIndex, { boxScaleX }),
    onCaptionBoxHeight: (index: number, captionIndex: number, boxScaleY: number) => patchCaption(index, captionIndex, { boxScaleY }),
    updateCaption: <K extends keyof CaptionData>(index: number, captionIndex: number, field: K, value: CaptionData[K]) =>
      patchCaption(index, captionIndex, { [field]: value } as Partial<CaptionData>),
  }
}

export type CarouselSlides = ReturnType<typeof useCarouselSlides>
