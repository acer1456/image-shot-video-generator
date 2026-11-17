import { useEffect, useRef, useState } from 'react'
import type { CameraPoint, CaptionData, CardFrame } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Separator } from '@/components/ui/separator'
import CaptionEditor from '@/components/CaptionEditor'
import AssistPanel from '@/components/panel/AssistPanel'
import { clamp } from '@/lib/utils'
import { drawPointThumbnail, type Scene } from '@/lib/canvas'
import { CARD_FRAMES } from '@/lib/card'
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Copy, Import, Plus, Settings, Trash2, Type, X } from 'lucide-react'
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
  const { slides, activeIndex, coverIndex, outroIndex } = carousel
  const active = slides[activeIndex] || null
  const hasImage = !!scene.image
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const slideLabel = (index: number) => {
    const card = slides[index]?.card
    if (card) return card.kind === 'cover' ? '封面' : '封底'
    return `輪播 ${index - carousel.firstSlide + 1}`
  }

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
    <>
    <aside className="w-full lg:w-96 flex-shrink-0 rounded-2xl border border-border bg-card overflow-y-auto max-h-[70vh] lg:max-h-none">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <Button variant="ghost" size="icon" className="h-7 w-7" title="收合輪播面板" onClick={onToggleCollapse}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        <h2 className="text-[13px] font-semibold">
          {activeIndex >= 0 ? slideLabel(activeIndex) : '輪播'}
          <span className="ml-2 text-[10px] font-normal text-muted-foreground">4:5</span>
        </h2>
        <Button variant="ghost" size="icon" className="h-7 w-7" title="輪播背景設定" onClick={() => setIsSettingsOpen(true)}>
          <Settings className="h-4 w-4" />
        </Button>
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
              <Button variant="secondary" size="sm" className="flex-1" disabled={!hasImage || coverIndex !== -1} title="第一張：畫作加框、標題與 logo" onClick={() => act(() => carousel.addCard('cover', lastCaptionStyle))}>
                <Plus className="h-3.5 w-3.5" />加封面
              </Button>
              <Button variant="secondary" size="sm" className="flex-1" disabled={!hasImage || outroIndex !== -1} title="最後一張：按讚、追蹤、下載 App" onClick={() => act(() => carousel.addCard('outro', lastCaptionStyle))}>
                <Plus className="h-3.5 w-3.5" />加封底
              </Button>
            </div>
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
                const card = s.card
                const canMoveUp = !card && index > carousel.firstSlide
                const canMoveDown = !card && index < carousel.endSlide - 1
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
                        <div className="text-xs font-semibold">{slideLabel(index)}</div>
                        <div className="text-[10px] text-muted-foreground truncate">
                          {card ? CARD_FRAMES.find(f => f.value === card.frame)?.label : `zoom ${s.zoom.toFixed(1)}x`}
                        </div>
                        {(s.caption?.text || '').trim() && (
                          <div className="text-[10px] text-muted-foreground truncate opacity-60">「{s.caption.text}」</div>
                        )}
                      </div>
                      <div className="flex items-center gap-0.5 flex-shrink-0">
                        {!card && (
                          <>
                            <Button variant="ghost" size="icon" className="h-7 w-7" disabled={!canMoveUp} title="往前移" onClick={e => { e.stopPropagation(); act(() => carousel.move(index, -1)) }}>
                              <ArrowUp className="h-3.5 w-3.5 text-muted-foreground" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" disabled={!canMoveDown} title="往後移" onClick={e => { e.stopPropagation(); act(() => carousel.move(index, 1)) }}>
                              <ArrowDown className="h-3.5 w-3.5 text-muted-foreground" />
                            </Button>
                          </>
                        )}
                        <Button
                          variant="ghost" size="icon"
                          className="h-7 w-7 text-yellow-500 hover:text-yellow-400 hover:bg-yellow-500/10"
                          title="編輯文字"
                          onClick={e => { e.stopPropagation(); act(() => { carousel.setActiveIndex(index); carousel.setTab('caption') }) }}
                        >
                          <Type className="h-3.5 w-3.5" />
                        </Button>
                        {!card && (
                          <Button variant="ghost" size="icon" className="h-7 w-7" title="複製" onClick={e => { e.stopPropagation(); act(() => carousel.duplicate(index)) }}>
                            <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-7 w-7" title="刪除" onClick={e => { e.stopPropagation(); act(() => carousel.remove(index)) }}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    </div>

                    {isActive && !card && (
                      <div className="px-3 pb-3 border-t border-border pt-2">
                        <Label className="mb-1 block">可視範圍 (Zoom {s.zoom.toFixed(2)}x)</Label>
                        <Slider
                          value={s.zoom}
                          min={1} max={15} step={0.05}
                          onChange={v => act(() => carousel.onPointResize(index, clamp(v, 1, 15)))}
                        />
                      </div>
                    )}
                    {isActive && card && (
                      <div className="px-3 pb-3 border-t border-border pt-2 space-y-2">
                        <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
                          <div>
                            <Label className="mb-1 block">畫框</Label>
                            <Select
                              value={card.frame}
                              onChange={e => act(() => {
                                const next = CARD_FRAMES.find(f => f.value === e.target.value)
                                if (next) carousel.updateCard(index, { frame: next.value, frameColor: next.color })
                              })}
                              className="h-8 text-xs"
                            >
                              {CARD_FRAMES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                            </Select>
                          </div>
                          <div>
                            <Label className="mb-1 block">框色</Label>
                            <Input
                              type="color"
                              value={card.frameColor}
                              onChange={e => act(() => carousel.updateCard(index, { frameColor: e.target.value }))}
                              className="h-8 w-12 p-1"
                              title="畫框顏色"
                            />
                          </div>
                        </div>
                        <div>
                          <Label className="mb-1 block">畫作大小 ({Math.round(card.imageWidth * 100)}%)</Label>
                          <Slider
                            value={card.imageWidth}
                            min={0.4} max={0.95} step={0.01}
                            onChange={v => act(() => carousel.updateCard(index, { imageWidth: clamp(v, 0.4, 0.95) }))}
                          />
                        </div>
                        <div>
                          <Label className="mb-1 block">畫作位置 ({Math.round(card.imageY * 100)}%)</Label>
                          <Slider
                            value={card.imageY}
                            min={0.1} max={0.9} step={0.01}
                            onChange={v => act(() => carousel.updateCard(index, { imageY: clamp(v, 0.1, 0.9) }))}
                          />
                        </div>
                        <p className="text-[10px] text-muted-foreground">標題、畫家、logo 等文字按 <Type className="inline h-3 w-3 text-yellow-500" /> 編輯，也可以直接在畫布上拖曳。</p>
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
                  共 {slides.length} 張{coverIndex !== -1 || outroIndex !== -1 ? '（含封面／封底）' : ''} · 工具列「下載輪播」可輸出 zip
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </aside>

    {isSettingsOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setIsSettingsOpen(false)}>
        <div className="bg-card rounded-xl border border-border p-5 w-80 shadow-xl max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold">輪播背景設定</h3>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsSettingsOpen(false)}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground mb-3">與影片的背景設定各自獨立。</p>
          <AssistPanel
            backgroundSettings={carousel.background}
            onBackgroundChange={bg => act(() => carousel.setBackground(bg))}
          />
        </div>
      </div>
    )}
    </>
  )
}
