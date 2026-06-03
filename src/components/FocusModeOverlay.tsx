import CanvasEditor from '@/components/CanvasEditor'
import CameraPanel from '@/components/CameraPanel'
import { Button } from '@/components/ui/button'
import { Maximize, X } from 'lucide-react'
import type { CameraPoint, BackgroundSettings } from '@/types'

type CanvasEditorProps = React.ComponentPropsWithoutRef<typeof CanvasEditor>

interface FocusModeOverlayProps {
  points: CameraPoint[]
  activeIndex: number
  image: HTMLImageElement | null
  backgroundSettings: BackgroundSettings
  canvasEditorProps: CanvasEditorProps
  onClose: () => void
  onRequestFullscreen: () => void
  onSelect: (i: number) => void
  onRemovePoint: (i: number) => void
  onUpdateField: <K extends keyof CameraPoint>(i: number, k: K, v: CameraPoint[K]) => void
  onAddStart: () => void
  onAddEnd: () => void
  onInsertAfter: (i: number) => void
  onDuplicate: (i: number) => void
  onReorder: (pts: CameraPoint[], ai: number) => void
  onOpenCaption?: (i: number) => void
}

export function FocusModeOverlay({
  points, activeIndex, image, backgroundSettings,
  canvasEditorProps, onClose, onRequestFullscreen,
  onSelect, onRemovePoint, onUpdateField, onAddStart, onAddEnd,
  onInsertAfter, onDuplicate, onReorder, onOpenCaption,
}: FocusModeOverlayProps) {
  return (
    <div className="fixed inset-0 z-[80] bg-background/90 backdrop-blur-sm">
      <div className="h-full p-3 md:p-5 flex flex-col gap-3">
        {/* Header bar */}
        <div className="rounded-xl border border-border bg-card px-3 py-2.5 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm md:text-base font-bold">鏡頭定位模式</h3>
            <p className="text-xs text-muted-foreground">拖曳畫布上的藍點或白色框角落調整鏡頭。按 Esc 或「完成定位」回到原本介面。</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onRequestFullscreen}>
              <Maximize className="h-3.5 w-3.5" />全螢幕
            </Button>
            <Button size="sm" onClick={onClose}>
              <X className="h-3.5 w-3.5" />完成定位
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 flex gap-3">
          {/* Canvas */}
          <div className="flex-1 min-w-0 rounded-2xl border border-border bg-card overflow-hidden flex items-center justify-center">
            <CanvasEditor {...canvasEditorProps} />
          </div>

          {/* Camera panel (desktop only) */}
          <aside className="hidden lg:block w-80 xl:w-96 rounded-2xl border border-border bg-card overflow-y-auto">
            <div className="p-4 border-b border-border">
              <h4 className="text-sm font-bold">快速鏡頭清單</h4>
              <p className="text-xs text-muted-foreground mt-1">可直接切換鏡頭、調整 zoom 與停留秒數，並即時在放大畫布定位。</p>
            </div>
            <div className="p-4">
              <CameraPanel
                points={points}
                activeIndex={activeIndex}
                hasImage={!!image}
                image={image}
                backgroundSettings={backgroundSettings}
                onSelect={onSelect}
                onRemove={onRemovePoint}
                onUpdateField={onUpdateField}
                onAddStart={onAddStart}
                onAddEnd={onAddEnd}
                onInsertAfter={onInsertAfter}
                onDuplicate={onDuplicate}
                onReorder={onReorder}
                onOpenCaption={onOpenCaption ?? (() => {})}
              />
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
