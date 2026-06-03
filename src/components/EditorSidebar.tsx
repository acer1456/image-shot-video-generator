import { useState } from 'react'
import { Button } from '@/components/ui/button'
import CameraPanel from '@/components/CameraPanel'
import CaptionEditor from '@/components/CaptionEditor'
import AssistPanel from '@/components/AssistPanel'
import { Settings, ChevronLeft, Sparkles, X } from 'lucide-react'
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
  handlers: EditorSidebarHandlers
}

export function EditorSidebar({
  points, activeIndex, activeTab, activePoint, activeCaptionIndex,
  image, backgroundSettings,
  handlers,
}: EditorSidebarProps) {
  const hasImage = !!image
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  return (
    <>
      <aside className="w-96 flex-shrink-0 rounded-xl border border-border bg-card overflow-y-auto">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="text-base font-bold">{activeIndex >= 0 ? `目前鏡頭： ${activeIndex + 1}` : '目前未選擇鏡頭'}</h2>
          <Button variant="ghost" size="icon" className="h-7 w-7" title="輸出設定" onClick={() => setIsSettingsOpen(true)}>
            <Settings className="h-4 w-4" />
          </Button>
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
