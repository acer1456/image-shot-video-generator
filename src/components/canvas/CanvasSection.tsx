import { useState, useRef } from 'react'
import CanvasEditor from '@/components/canvas/CanvasEditor'
import { Switch } from '@/components/ui/switch'
import { Hand, Maximize2 } from 'lucide-react'
import type { ActiveTab, SafeAreaVisibility } from '@/types'

type CanvasEditorProps = React.ComponentPropsWithoutRef<typeof CanvasEditor>

interface CanvasSectionProps {
  isDisabled: boolean
  hasImage: boolean
  activeTab: ActiveTab
  onTabChange: (tab: 'camera' | 'caption') => void
  onOpenImmersiveMode: () => void
  showAllPoints: boolean
  onlyActiveBox: boolean
  showCaptionBox: boolean
  showGuidesInPreview: boolean
  showNarrationInOutput: boolean
  showCameraCaptionsInOutput: boolean
  onToggle: (
    key:
      | 'showAllPoints'
      | 'onlyActiveBox'
      | 'showCaptionBox'
      | 'showGuidesInPreview'
      | 'showNarrationInOutput'
      | 'showCameraCaptionsInOutput',
    val: boolean
  ) => void
  safeAreaVisibility: SafeAreaVisibility
  onSafeAreaChange: (key: keyof SafeAreaVisibility, val: boolean) => void
  canvasEditorProps: CanvasEditorProps
}

export function CanvasSection({
  isDisabled, hasImage, activeTab, onTabChange,
  onOpenImmersiveMode,
  showAllPoints, onlyActiveBox, showCaptionBox, showGuidesInPreview,
  showNarrationInOutput, showCameraCaptionsInOutput, onToggle,
  safeAreaVisibility, onSafeAreaChange,
  canvasEditorProps,
}: CanvasSectionProps) {
  const [canvasScale, setCanvasScale] = useState(1)
  const [panX, setPanX] = useState(0)
  const [panY, setPanY] = useState(0)
  const [isPanMode, setIsPanMode] = useState(false)
  const [isPanning, setIsPanning] = useState(false)
  const panDragRef = useRef<{ startX: number; startY: number; basePanX: number; basePanY: number } | null>(null)
  const SCALE_STEP = 0.25
  const SCALE_MIN  = 0.25
  const SCALE_MAX  = 4

  function zoom(delta: number) {
    setCanvasScale(s => Math.min(SCALE_MAX, Math.max(SCALE_MIN, Math.round((s + delta) * 100) / 100)))
  }

  function resetView() {
    setCanvasScale(1)
    setPanX(0)
    setPanY(0)
  }
  return (
    <div className="flex-1 min-w-0 min-h-0">
      <div className="relative h-full min-h-0 rounded-xl border border-border bg-card overflow-hidden flex items-center justify-center">
        <div style={{ transform: `translate(${panX}px, ${panY}px) scale(${canvasScale})`, transformOrigin: 'center center', width: '100%', height: '100%' }}>
          <CanvasEditor {...canvasEditorProps} />
        </div>

        {/* Pan overlay: above canvas (z-[9]), below UI buttons (z-10) */}
        {isPanMode && (
          <div
            className="absolute inset-0 z-[9] touch-none select-none"
            style={{ cursor: isPanning ? 'grabbing' : 'grab' }}
            onPointerDown={e => {
              e.currentTarget.setPointerCapture(e.pointerId)
              panDragRef.current = { startX: e.clientX, startY: e.clientY, basePanX: panX, basePanY: panY }
              setIsPanning(true)
            }}
            onPointerMove={e => {
              if (!panDragRef.current) return
              setPanX(panDragRef.current.basePanX + e.clientX - panDragRef.current.startX)
              setPanY(panDragRef.current.basePanY + e.clientY - panDragRef.current.startY)
            }}
            onPointerUp={() => { panDragRef.current = null; setIsPanning(false) }}
            onPointerCancel={() => { panDragRef.current = null; setIsPanning(false) }}
          />
        )}

        {/* 鎖頭/字幕 tab switch */}
        <div className="absolute top-2 right-2 z-10">
          <label className="flex items-center gap-1.5 cursor-pointer select-none rounded-lg bg-secondary/80 backdrop-blur-sm border border-border/50 px-2.5 py-1 h-8">
            <span className={`text-xs transition-colors ${activeTab !== 'caption' ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>鏡頭</span>
            <Switch
              checked={activeTab === 'caption'}
              onCheckedChange={v => onTabChange(v ? 'caption' : 'camera')}
              disabled={isDisabled || !hasImage}
            />
            <span className={`text-xs transition-colors ${activeTab === 'caption' ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>字幕</span>
          </label>
        </div>

        <div className="absolute top-14 left-2 z-10 flex flex-col gap-2 p-2.5 rounded-xl bg-secondary/80 backdrop-blur-sm border border-border/50 min-w-[132px]">
          <p className="text-[9px] font-semibold text-secondary-foreground text-center">輸出內容</p>
          <label className="flex items-center justify-between gap-3 cursor-pointer select-none">
            <span className="text-xs">旁白字幕</span>
            <Switch checked={showNarrationInOutput} onCheckedChange={v => onToggle('showNarrationInOutput', v)} />
          </label>
          <label className="flex items-center justify-between gap-3 cursor-pointer select-none">
            <span className="text-xs">鏡頭字幕</span>
            <Switch checked={showCameraCaptionsInOutput} onCheckedChange={v => onToggle('showCameraCaptionsInOutput', v)} />
          </label>
        </div>

        {/* Combined panel: contextual toggles + platform preview */}
        <div className="absolute top-14 right-2 z-10 flex flex-col gap-2 p-2.5 rounded-xl bg-secondary/80 backdrop-blur-sm border border-border/50 min-w-[108px]">
          <p className="text-[9px] font-semibold text-secondary-foreground text-center">輔助顯示</p>
          {activeTab === 'camera' && (
            <>
              <label className="flex items-center justify-between gap-3 cursor-pointer select-none">
                <span className="text-xs">全部點位</span>
                <Switch checked={showAllPoints} onCheckedChange={v => onToggle('showAllPoints', v)} />
              </label>
              <label className="flex items-center justify-between gap-3 cursor-pointer select-none">
                <span className="text-xs">視野框</span>
                <Switch checked={onlyActiveBox} onCheckedChange={v => onToggle('onlyActiveBox', v)} />
              </label>
            </>
          )}
          {activeTab === 'caption' && (
            <label className="flex items-center justify-between gap-3 cursor-pointer select-none">
              <span className="text-xs">字幕框</span>
              <Switch checked={showCaptionBox} onCheckedChange={v => onToggle('showCaptionBox', v)} />
            </label>
          )}
          <label className="flex items-center justify-between gap-3 cursor-pointer select-none">
            <span className="text-xs">預覽輔助</span>
            <Switch checked={showGuidesInPreview} onCheckedChange={v => onToggle('showGuidesInPreview', v)} />
          </label>

          {activeTab === 'caption' && (
            <>
              <div className="w-full h-px bg-border/60" />
              <p className="text-[9px] font-semibold text-secondary-foreground text-center">平台預覽</p>
              {(['ig', 'shorts', 'tiktok'] as const).map(key => (
                <label key={key} className="flex items-center justify-between gap-3 cursor-pointer select-none">
                <span className="text-[10px] text-muted-foreground">
                    {{ ig: 'IG Reels', shorts: 'YT Shorts', tiktok: 'TikTok' }[key]}
                </span>
                <Switch
                    checked={safeAreaVisibility[key]}
                    onCheckedChange={val => onSafeAreaChange(key, val)}
                />
                </label>
            ))}
            </>
          )}
        </div>
       
        {/* Viewport zoom controls */}
        <div className="absolute bottom-2 right-2 z-10 flex items-center gap-0.5 rounded-lg bg-secondary/80 backdrop-blur-sm border border-border/50 p-0.5">
          <button
            onClick={() => setIsPanMode(v => !v)}
            className={`h-6 w-6 flex items-center justify-center rounded-md hover:bg-muted transition-colors ${
              isPanMode ? 'bg-primary/20 text-primary' : 'text-muted-foreground'
            }`}
            title={isPanMode ? '關閉移動模式' : '開啟移動模式（拖曳平移視圖）'}
          ><Hand className="h-3 w-3" /></button>
          <div className="w-px h-3.5 bg-border/60 mx-0.5" />
          <button
            onClick={() => zoom(-SCALE_STEP)}
            disabled={canvasScale <= SCALE_MIN}
            className="h-6 w-6 flex items-center justify-center rounded-md text-sm font-bold hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-foreground"
            title="縮小畫布視圖"
          >−</button>
          <button
            onClick={resetView}
            className="h-6 px-1.5 flex items-center justify-center rounded-md text-[10px] font-mono hover:bg-muted transition-colors text-muted-foreground"
            title="回到原始大小並重置位置"
          >{Math.round(canvasScale * 100)}%</button>
          <button
            onClick={() => zoom(+SCALE_STEP)}
            disabled={canvasScale >= SCALE_MAX}
            className="h-6 w-6 flex items-center justify-center rounded-md text-sm font-bold hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-foreground"
            title="放大畫布視圖"
          >+</button>
          <div className="w-px h-3.5 bg-border/60 mx-0.5" />
          <button
            onClick={onOpenImmersiveMode}
            disabled={isDisabled || !hasImage}
            className="h-6 w-6 flex items-center justify-center rounded-md hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-muted-foreground"
            title="沉浸式定位"
          ><Maximize2 className="h-3 w-3" /></button>
        </div>
      </div>
    </div>
  )
}
