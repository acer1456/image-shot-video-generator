import { useState } from 'react'
import { Button } from '@/components/ui/button'
import CameraPanel from '@/components/panel/CameraPanel'
import CaptionEditor from '@/components/CaptionEditor'
import AssistPanel from '@/components/panel/AssistPanel'
import { Settings, ChevronLeft, ChevronRight, Sparkles, X } from 'lucide-react'
import type { CameraPoint, CaptionData, ActiveTab, BackgroundSettings } from '@/types'

export interface EditorSidebarHandlers {
  // camera panel
  onSelect: (i: number) => void
  onRemovePoint: (i: number) => void
  onUpdateField: <K extends keyof CameraPoint>(i: number, k: K, v: CameraPoint[K]) => void
  onAddStart: () => void
  onAddEnd: () => void
  onInsertAfter: (i: number) => void
  onDuplicate: (i: number) => void
  onReorder: (pts: CameraPoint[], ai: number) => void
  onOpenCaption: (i: number) => void
  onApplyCaptionAsGlobal: () => void
  // caption panel
  onSetActiveCaptionIndex: (i: number) => void
  onAddCaption: () => void
  onDeleteCaption: (i: number) => void
  onUpdateCaption: <K extends keyof CaptionData>(k: K, v: CaptionData[K]) => void
  onUpdateHold: (v: number) => void
  onCenterCaption: () => void
  // tab
  onTabChange: (tab: ActiveTab) => void
  // assist panel
  onBackgroundChange: (s: BackgroundSettings) => void
}

interface EditorSidebarProps {
  points: CameraPoint[]
  activeIndex: number
  activeTab: ActiveTab
  activePoint: CameraPoint | null
  activeCaptionIndex: number
  image: HTMLImageElement | null
  backgroundSettings: BackgroundSettings
  collapsed: boolean
  onToggleCollapse: () => void
  handlers: EditorSidebarHandlers
}

export function EditorSidebar({
  points, activeIndex, activeTab, activePoint, activeCaptionIndex,
  image, backgroundSettings, collapsed, onToggleCollapse,
  handlers,
}: EditorSidebarProps) {
  const hasImage = !!image
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  if (collapsed) {
    return (
      <div
        className="flex-shrink-0 rounded-2xl border border-border bg-card flex flex-row lg:flex-col items-center justify-between px-4 py-2 lg:py-4 cursor-pointer select-none w-full lg:w-9"
        onClick={onToggleCollapse}
        title="展開鏡頭面板"
      >
        <ChevronLeft className="h-4 w-4 text-muted-foreground -rotate-90 lg:rotate-0" />
        <span className="text-[12px] font-semibold text-muted-foreground lg:[writing-mode:vertical-rl] lg:[text-orientation:upright] lg:tracking-[2px]">
          鏡頭
        </span>
        <Settings className="h-4 w-4 text-muted-foreground" />
      </div>
    )
  }

  return (
    <>
      <aside className="w-full lg:w-96 flex-shrink-0 rounded-2xl border border-border bg-card overflow-y-auto max-h-[70vh] lg:max-h-none">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <Button variant="ghost" size="icon" className="h-7 w-7" title="收合鏡頭面板" onClick={onToggleCollapse}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          <h2 className="text-[13px] font-semibold">
            {activeIndex >= 0 ? `鏡頭 ${activeIndex + 1}` : '鏡頭'}
          </h2>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" title="輸出設定" onClick={() => setIsSettingsOpen(true)}>
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="p-4">
          {activeTab === 'caption' ? (
            <>
              {/* Caption mode top actions */}
              <div className="flex items-center justify-between gap-2 mb-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handlers.onTabChange('camera')}
                  className="gap-1 px-2 bg-transparent border border-border text-red-500 hover:text-red-400 hover:bg-red-500/10"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />返回鏡頭
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={!activePoint}
                  onClick={handlers.onApplyCaptionAsGlobal}
                  className="gap-1 text-xs"
                >
                  <Sparkles className="h-3.5 w-3.5" />設為全局字幕樣式
                </Button>
              </div>
              <CaptionEditor
                point={activePoint}
                disabled={!activePoint}
                activeCaptionIndex={activeCaptionIndex}
                onSetActiveCaptionIndex={handlers.onSetActiveCaptionIndex}
                onAddCaption={handlers.onAddCaption}
                onDeleteCaption={handlers.onDeleteCaption}
                onUpdateCaption={handlers.onUpdateCaption}
                onUpdateHold={handlers.onUpdateHold}
                onCenter={handlers.onCenterCaption}
              />
            </>
          ) : (
            <CameraPanel
              points={points}
              activeIndex={activeIndex}
              hasImage={hasImage}
              image={image}
              backgroundSettings={backgroundSettings}
              onSelect={handlers.onSelect}
              onRemove={handlers.onRemovePoint}
              onUpdateField={handlers.onUpdateField}
              onAddStart={handlers.onAddStart}
              onAddEnd={handlers.onAddEnd}
              onInsertAfter={handlers.onInsertAfter}
              onDuplicate={handlers.onDuplicate}
              onReorder={handlers.onReorder}
              onOpenCaption={handlers.onOpenCaption}
            />
          )}
        </div>
      </aside>

      {isSettingsOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setIsSettingsOpen(false)}
        >
          <div
            className="bg-card rounded-xl border border-border p-5 w-80 shadow-xl max-h-[80vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold">輸出設定</h3>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsSettingsOpen(false)}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
            <AssistPanel
              backgroundSettings={backgroundSettings}
              onBackgroundChange={handlers.onBackgroundChange}
            />
          </div>
        </div>
      )}
    </>
  )
}
