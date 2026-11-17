import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { composeFrame, timeOfPoint, type Scene } from '@/lib/canvas'
import { CAROUSEL_OUTPUT } from '@/hooks/useCarouselSlides'
import { clamp } from '@/lib/utils'

interface CarouselPreviewProps {
  scene: Scene
  startIndex: number
  slideLabel: (index: number) => string
  onClose: () => void
}

/** 輪播成品預覽：與「下載輪播」同一套 composeFrame，逐張上下翻看；← → 換張、Esc 關閉 */
export function CarouselPreview({ scene, startIndex, slideLabel, onClose }: CarouselPreviewProps) {
  const total = scene.points.length
  const [index, setIndex] = useState(() => clamp(startIndex, 0, total - 1))
  const ref = useRef<HTMLCanvasElement>(null)
  const prev = () => setIndex(i => Math.max(0, i - 1))
  const next = () => setIndex(i => Math.min(total - 1, i + 1))

  useEffect(() => {
    const ctx = ref.current?.getContext('2d')
    if (!ctx || !scene.image || !total) return
    composeFrame({ ...scene, cues: [], overlays: [], showCameraCaptions: true }, timeOfPoint(scene.points, index), ctx)
  }, [scene, index, total])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') setIndex(i => Math.max(0, i - 1))
      else if (event.key === 'ArrowRight') setIndex(i => Math.min(total - 1, i + 1))
      else if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [total, onClose])

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-black/85 p-4" onClick={onClose}>
      <Button variant="ghost" size="icon" className="absolute top-3 right-3 h-9 w-9 text-white hover:bg-white/10 hover:text-white" title="關閉預覽（Esc）" onClick={onClose}>
        <X className="h-5 w-5" />
      </Button>
      <canvas
        ref={ref}
        width={CAROUSEL_OUTPUT.width}
        height={CAROUSEL_OUTPUT.height}
        className="min-h-0 w-auto h-auto max-w-full max-h-[calc(100vh-120px)] rounded-lg bg-black shadow-2xl"
        onClick={e => e.stopPropagation()}
      />
      <div className="flex items-center gap-3 text-white" onClick={e => e.stopPropagation()}>
        <Button variant="secondary" size="sm" disabled={index <= 0} title="上一張（←）" onClick={prev}>
          <ChevronLeft className="h-4 w-4" />上一張
        </Button>
        <span className="text-xs tabular-nums min-w-[96px] text-center">
          {slideLabel(index)} · {index + 1} / {total}
        </span>
        <Button variant="secondary" size="sm" disabled={index >= total - 1} title="下一張（→）" onClick={next}>
          下一張<ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
