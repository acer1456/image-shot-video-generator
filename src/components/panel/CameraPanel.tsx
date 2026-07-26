import { useRef, useEffect, useState } from 'react'
import type { CameraPoint } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Separator } from '@/components/ui/separator'
import { clamp } from '@/lib/utils'
import { GripVertical, Plus, Trash2, Copy, ChevronsLeft, ChevronsRight, ChevronDown, ChevronUp, Type } from 'lucide-react'
import { drawPointThumbnail, type Scene } from '@/lib/canvas'
import { CAMERA_TEMPLATES } from '@/lib/cameraTemplates'

interface CameraPanelProps {
  points: CameraPoint[]
  activeIndex: number
  hasImage: boolean
  scene: Scene
  onSelect: (index: number) => void
  onRemove: (index: number) => void
  onUpdateField: <K extends keyof CameraPoint>(index: number, field: K, value: CameraPoint[K]) => void
  onAddStart: () => void
  onAddEnd: () => void
  onInsertAfter: (afterIndex: number) => void
  onDuplicate: (index: number) => void
  onReorder: (newPoints: CameraPoint[], newActiveIndex: number) => void
  onOpenCaption: (index: number) => void
}

// 縮圖子元件：在 off-screen canvas 上用 drawPointThumbnail 繪製後顯示
function CameraThumbnail({
  scene, pointIndex,
}: {
  scene: Scene
  pointIndex: number
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !scene.image) return
    canvas.width = 90
    canvas.height = 160
    drawPointThumbnail(canvas, scene, pointIndex)
  }, [scene, pointIndex])

  return (
    <canvas
      ref={canvasRef}
      className="rounded flex-shrink-0 border border-border bg-muted"
      style={{ width: 45, height: 80 }}
    />
  )
}

export default function CameraPanel({
  points, activeIndex, hasImage, scene,
  onSelect, onRemove, onUpdateField, onAddStart, onAddEnd,
  onInsertAfter, onDuplicate, onReorder, onOpenCaption,
}: CameraPanelProps) {
  const listRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<Array<HTMLDivElement | null>>([])
  const dragIndexRef = useRef<number>(-1)
  const [dragOverIndex, setDragOverIndex] = useState<number>(-1)
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    itemRefs.current.length = points.length
  }, [points.length])

  // 選取後自動捲動到畫面內
  useEffect(() => {
    if (activeIndex < 0) return
    const container = listRef.current
    const target = itemRefs.current[activeIndex]
    if (!container || !target) return
    const cRect = container.getBoundingClientRect()
    const tRect = target.getBoundingClientRect()
    const outOfView = tRect.top < cRect.top || tRect.bottom > cRect.bottom
    if (outOfView) target.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [activeIndex])

  // ── 拖曳排序處理 ──────────────────────────────────────────────────────
  const handleDragStart = (e: React.DragEvent, index: number) => {
    dragIndexRef.current = index
    setIsDragging(true)
    e.dataTransfer.effectAllowed = 'move'
    // 讓拖曳時的元素半透明延遲一幀才生效
    requestAnimationFrame(() => {
      const el = itemRefs.current[index]
      if (el) el.style.opacity = '0.4'
    })
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverIndex(index)
  }

  const handleDrop = (e: React.DragEvent, dropTarget: number) => {
    e.preventDefault()
    const from = dragIndexRef.current
    if (from < 0 || from === dropTarget) {
      resetDrag()
      return
    }
    // 建立新排序：移除 from，插入到 dropTarget 前
    const arr = [...points]
    const [moved] = arr.splice(from, 1)
    const insertAt = from < dropTarget ? dropTarget - 1 : dropTarget
    arr.splice(insertAt, 0, moved)

    // 更新 activeIndex
    let newActive = activeIndex
    if (activeIndex === from) {
      newActive = insertAt
    } else if (from < insertAt && activeIndex > from && activeIndex <= insertAt) {
      newActive = activeIndex - 1
    } else if (from > insertAt && activeIndex >= insertAt && activeIndex < from) {
      newActive = activeIndex + 1
    }

    onReorder(arr, newActive)
    resetDrag()
  }

  const handleDragEnd = () => {
    // 還原透明度
    const el = itemRefs.current[dragIndexRef.current]
    if (el) el.style.opacity = ''
    resetDrag()
  }

  function resetDrag() {
    dragIndexRef.current = -1
    setDragOverIndex(-1)
    setIsDragging(false)
    // 還原全部透明度
    itemRefs.current.forEach(el => { if (el) el.style.opacity = '' })
  }

  return (
    <div className="flex flex-col gap-3 min-h-0">
      {/* 頂部全圖快捷按鈕 */}
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" className="flex-1" disabled={!hasImage} onClick={onAddStart}>
          <ChevronsLeft className="h-3.5 w-3.5" />
          加入全圖起點
        </Button>
        <Button variant="secondary" size="sm" className="flex-1" disabled={!hasImage} onClick={onAddEnd}>
          加入全圖末點
          <ChevronsRight className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* 運鏡模板：一鍵套用常用鏡頭路徑 */}
      <div>
        <Select
          value=""
          disabled={!hasImage}
          className="h-8 text-xs"
          onChange={e => {
            const template = CAMERA_TEMPLATES.find(t => t.id === e.target.value)
            if (!template) return
            e.target.value = ''
            if (points.length > 0 && !confirm(`套用「${template.label}」會取代目前 ${points.length} 個鏡頭，確定要繼續嗎？`)) return
            onReorder(template.build(), 0)
          }}
        >
          <option value="">套用運鏡模板…</option>
          {CAMERA_TEMPLATES.map(t => (
            <option key={t.id} value={t.id} title={t.description}>{t.label}</option>
          ))}
        </Select>
      </div>

      {points.length === 0 && (
        <div className="text-muted-foreground text-xs py-4 text-center">
          點擊畫布新增鏡頭，或使用上方按鈕加入全圖起訖點。
        </div>
      )}

      {/* 鏡頭清單 */}
      <div
        ref={listRef}
        className="flex flex-col overflow-y-auto pr-1"
        style={{ maxHeight: 'calc(100vh - 380px)' }}
      >
        {points.map((p, index) => {
          const isActive = index === activeIndex
          const isDragTarget = isDragging && dragOverIndex === index && dragIndexRef.current !== index

          return (
            <div key={index}>
              {/* 拖曳落點指示線：顯示在目標項目上方 */}
              {isDragTarget && (
                <div className="h-0.5 bg-primary rounded mx-2 mb-0.5 transition-all" />
              )}

              {/* 鏡頭項目卡片 */}
              <div
                ref={el => { itemRefs.current[index] = el }}
                draggable
                onDragStart={e => handleDragStart(e, index)}
                onDragOver={e => handleDragOver(e, index)}
                onDrop={e => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                className={`rounded-xl border transition-all mb-1 ${
                  isActive
                    ? 'border-primary ring-2 ring-primary/20 bg-card'
                    : 'border-border bg-card hover:border-muted-foreground/40'
                }`}
              >
                {/* ── 標題列（點擊選取 / 展開；再次點擊摺疊） ── */}
                <div
                  className="flex items-center gap-2 p-2 cursor-pointer select-none"
                  onClick={() => onSelect(isActive ? -1 : index)}
                >
                  {/* 拖曳把手 */}
                  <GripVertical
                    className="h-4 w-4 text-muted-foreground flex-shrink-0 cursor-grab active:cursor-grabbing"
                    onMouseDown={e => e.stopPropagation()}
                  />

                  {/* 9:16 縮圖 */}
                  <CameraThumbnail scene={scene} pointIndex={index} />

                  {/* 鏡頭資訊 */}
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold">鏡頭 {index + 1}</div>
                    <div className="text-[10px] text-muted-foreground truncate">
                      {p.move === 'jump' ? '直接跳' : '滑動'} {p.moveDuration.toFixed(1)}s
                      {p.holdDuration > 0 ? ` · 停 ${p.holdDuration.toFixed(1)}s` : ''}
                      {' '}· zoom {p.zoom.toFixed(1)}x
                    </div>
                    {(p.caption?.text || '').trim() && (
                      <div className="text-[10px] text-muted-foreground truncate opacity-60">
                        「{p.caption.text}」
                      </div>
                    )}
                  </div>

                  {/* 展開指示 + 字幕 + 複製 + 刪除 */}
                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    {isActive
                      ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                      : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                    }
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-yellow-500 hover:text-yellow-400 hover:bg-yellow-500/10"
                      onClick={e => { e.stopPropagation(); onOpenCaption(index) }}
                      title="編輯字幕"
                    >
                      <Type className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={e => { e.stopPropagation(); onDuplicate(index) }}
                      title="複製鏡頭"
                    >
                      <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={e => { e.stopPropagation(); onRemove(index) }}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>

                {/* ── 展開編輯區（僅 active 顯示） ── */}
                {isActive && (
                  <div className="px-3 pb-3 space-y-2 border-t border-border pt-2">
                    <div>
                      <Label className="mb-1 block">可視範圍 (Zoom {p.zoom.toFixed(2)}x)</Label>
                      <Slider
                        value={p.zoom}
                        min={1} max={15} step={0.05}
                        onChange={v => onUpdateField(index, 'zoom', clamp(v, 1, 15))}
                      />
                    </div>

                    <div>
                      <Label className="mb-1 block">移動方式</Label>
                      <Select
                        value={p.move}
                        onChange={e => onUpdateField(index, 'move', e.target.value as 'slide' | 'jump')}
                        className="h-8 text-xs"
                      >
                        <option value="slide">滑動</option>
                        <option value="jump">直接跳過去</option>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="mb-1 block">移動秒數</Label>
                        <Input
                          type="number"
                          min={0.1} max={20} step={0.1}
                          value={p.moveDuration}
                          onChange={e => onUpdateField(index, 'moveDuration', clamp(Number(e.target.value), 0.1, 20))}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div>
                        <Label className="mb-1 block">停留秒數</Label>
                        <Input
                          type="number"
                          min={0} max={20} step={0.1}
                          value={p.holdDuration}
                          onChange={e => onUpdateField(index, 'holdDuration', clamp(Number(e.target.value), 0, 20))}
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* ── 鏡頭間插入按鈕 ── */}
              {!isDragging && (
                <div className="group flex items-center gap-1 my-0.5 h-5 cursor-pointer">
                  <div className="flex-1 h-px bg-transparent group-hover:bg-primary/30 transition-colors" />
                  <button
                    className="h-5 w-5 rounded-full flex items-center justify-center
                               text-transparent bg-transparent
                               group-hover:bg-primary group-hover:text-primary-foreground
                               transition-all duration-150 flex-shrink-0"
                    onClick={() => onInsertAfter(index)}
                    title={`在鏡頭 ${index + 1} 後插入新鏡頭`}
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                  <div className="flex-1 h-px bg-transparent group-hover:bg-primary/30 transition-colors" />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {points.length > 0 && (
        <>
          <Separator />
          <div className="text-xs text-muted-foreground text-center">
            共 {points.length} 個鏡頭 · 拖曳 <GripVertical className="inline h-3 w-3" /> 可調整順序
          </div>
        </>
      )}
    </div>
  )
}
