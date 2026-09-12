import { useEffect, useRef } from 'react'
import type { CameraPoint, CaptionData } from '@/types'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Separator } from '@/components/ui/separator'
import CaptionEditor from '@/components/CaptionEditor'
import { clamp } from '@/lib/utils'
import { drawPointThumbnail, type Scene } from '@/lib/canvas'
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Copy, Import, Plus, Trash2, Type } from 'lucide-react'
import type { CarouselSlides } from '@/hooks/useCarouselSlides'

function SlideThumbnail({ scene, index }: { scene: Scene; index: number }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current
    if (!canvas || !scene.image) return
    canvas.width = 96
    canvas.height = 120
    drawPointThumbnail(canvas, scene, index)
  }, [scene, index])
  return <canvas ref={ref} className="rounded flex-shrink-0 border border-border bg-muted" style={{ width: 48, height: 60 }} />
}

interface CarouselPanelProps {
  carousel: CarouselSlides
  /** 以投影片為 points 的 Scene，縮圖用 */
  scene: Scene
  videoPoints: CameraPoint[]
  activeCaptionIndex: number
  onSetActiveCaptionIndex: (i: number) => void
  lastCaptionStyle: Partial<CaptionData> | null
  collapsed: boolean
  onToggleCollapse: () => void
  onChanged: () => void
}

export function CarouselPanel({
  carousel, scene, videoPoints, activeCaptionIndex, onSetActiveCaptionIndex,
  lastCaptionStyle, collapsed, onToggleCollapse, onChanged,
}: CarouselPanelProps) {
  const { slides, activeIndex } = carousel
  const active = slides[activeIndex] || null
  const hasImage = !!scene.image

  if (collapsed) {
    return (
      <div
        className="flex-shrink-0 rounded-2xl border border-border bg-card flex flex-row lg:flex-col items-center justify-between px-4 py-2 lg:py-4 cursor-pointer select-none w-full lg:w-9"
        onClick={onToggleCollapse}
        title="展開輪播面板"
      >
        <ChevronLeft className="h-4 w-4 text-muted-foreground -rotate-90 lg:rotate-0" />
        <span className="text-[12px] font-semibold text-muted-foreground lg:[writing-mode:vertical-rl] lg:[text-orientation:upright] lg:tracking-[2px]">
          輪播
        </span>
        <span className="w-4" />
      </div>
    )
  }

  const act = <T,>(fn: () => T) => { fn(); onChanged() }

  return (
    <aside className="w-full lg:w-96 flex-shrink-0 rounded-2xl border border-border bg-card overflow-y-auto max-h-[70vh] lg:max-h-none">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <Button variant="ghost" size="icon" className="h-7 w-7" title="收合輪播面板" onClick={onToggleCollapse}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        <h2 className="text-[13px] font-semibold">
          {activeIndex >= 0 ? `輪播 ${activeIndex + 1}` : '輪播'}
        </h2>
        <span className="text-[10px] text-muted-foreground">4:5 · 1080×1350</span>
      </div>

      <div className="p-4">
        {carousel.tab === 'caption' ? (
          <>
            <div className="flex items-center justify-between gap-2 mb-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => act(() => carousel.setTab('camera'))}
                className="gap-1 px-2 bg-transparent border border-border text-red-500 hover:text-red-400 hover:bg-red-500/10"
              >
                <ChevronLeft className="h-3.5 w-3.5" />返回輪播
              </Button>
            </div>
            <CaptionEditor
              point={active}
              disabled={!active}
              hideHold
              activeCaptionIndex={activeCaptionIndex}
              onSetActiveCaptionIndex={onSetActiveCaptionIndex}
              onAddCaption={() => act(() => {
                carousel.addCaption(activeIndex, lastCaptionStyle)
                onSetActiveCaptionIndex((active?.extraCaptions?.length || 0) + 1)
              })}
              onDeleteCaption={extraIndex => act(() => {
                carousel.removeCaption(activeIndex, extraIndex)
                onSetActiveCaptionIndex(0)
              })}
              onUpdateCaption={(field, value) => act(() => carousel.updateCaption(activeIndex, activeCaptionIndex, field, value))}
              onUpdateHold={() => undefined}
              onCenter={() => act(() => {
                carousel.updateCaption(activeIndex, activeCaptionIndex, 'x', 0.5)
                carousel.updateCaption(activeIndex, activeCaptionIndex, 'y', 0.85)
              })}
            />
          </>
        ) : (
          <div className="flex flex-col gap-3 min-h-0">
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" className="flex-1" disabled={!hasImage} onClick={() => act(() => carousel.add(0.5, 0.5, lastCaptionStyle))}>
                <Plus className="h-3.5 w-3.5" />新增輪播
              </Button>
              <Button
                variant="secondary" size="sm" className="flex-1"
                disabled={!hasImage || !videoPoints.length}
                title="把影片的每個鏡頭各匯入成一張輪播"
                onClick={() => act(() => carousel.importFromPoints(videoPoints))}
              >
                <Import className="h-3.5 w-3.5" />從鏡頭匯入
              </Button>
            </div>

            {slides.length === 0 && (
              <div className="text-muted-foreground text-xs py-4 text-center">
                點擊畫布新增輪播，或從影片鏡頭匯入。每張輪播都以 4:5 取景輸出。
              </div>
            )}

            <div className="flex flex-col overflow-y-auto pr-1" style={{ maxHeight: 'calc(100vh - 300px)' }}>
              {slides.map((s, index) => {
                const isActive = index === activeIndex
                return (
                  <div
                    key={index}
                    className={`rounded-xl border transition-all mb-1.5 ${
                      isActive ? 'border-primary ring-2 ring-primary/20 bg-card' : 'border-border bg-card hover:border-muted-foreground/40'
                    }`}
                  >
                    <div
                      className="flex items-center gap-2 p-2 cursor-pointer select-none"
                      onClick={() => act(() => carousel.setActiveIndex(isActive ? -1 : index))}
                    >
                      <SlideThumbnail scene={scene} index={index} />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold">輪播 {index + 1}</div>
                        <div className="text-[10px] text-muted-foreground truncate">zoom {s.zoom.toFixed(1)}x</div>
                        {(s.caption?.text || '').trim() && (
                          <div className="text-[10px] text-muted-foreground truncate opacity-60">「{s.caption.text}」</div>
                        )}
                      </div>
                      <div className="flex items-center gap-0.5 flex-shrink-0">
                        <Button variant="ghost" size="icon" className="h-7 w-7" disabled={index === 0} title="往前移" onClick={e => { e.stopPropagation(); act(() => carousel.move(index, -1)) }}>
                          <ArrowUp className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" disabled={index === slides.length - 1} title="往後移" onClick={e => { e.stopPropagation(); act(() => carousel.move(index, 1)) }}>
                          <ArrowDown className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                        <Button
                          variant="ghost" size="icon"
                          className="h-7 w-7 text-yellow-500 hover:text-yellow-400 hover:bg-yellow-500/10"
                          title="編輯文字"
                          onClick={e => { e.stopPropagation(); act(() => { carousel.setActiveIndex(index); carousel.setTab('caption') }) }}
                        >
                          <Type className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" title="複製" onClick={e => { e.stopPropagation(); act(() => carousel.duplicate(index)) }}>
                          <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" title="刪除" onClick={e => { e.stopPropagation(); act(() => carousel.remove(index)) }}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    </div>

                    {isActive && (
                      <div className="px-3 pb-3 border-t border-border pt-2">
                        <Label className="mb-1 block">可視範圍 (Zoom {s.zoom.toFixed(2)}x)</Label>
                        <Slider
                          value={s.zoom}
                          min={1} max={15} step={0.05}
                          onChange={v => act(() => carousel.onPointResize(index, clamp(v, 1, 15)))}
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {slides.length > 0 && (
              <>
                <Separator />
                <div className="text-xs text-muted-foreground text-center">
                  共 {slides.length} 張 · 工具列「下載輪播」可輸出 zip
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </aside>
  )
}
