import { useRef, useState } from 'react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import {
  Sun, Moon, Save, FolderOpen, Trash2, Film,
  Maximize, Upload, ChevronDown, Sparkles, Palette, Loader2, ImagePlus,
  MoreHorizontal, Download, Undo2, Redo2,
} from 'lucide-react'
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu'
import { normalizeProjectName } from '@/lib/utils'
import type { ChineseConversion } from '@/lib/chinese'
import type { VideoRenderMethod } from '@/hooks/useVideoRender'
import ScreenDownload from '@/components/ScreenDownload'
import type { ActiveTab } from '@/types'
import type { Scene } from '@/lib/canvas'


interface AppToolbarProps {
  isDisabled: boolean
  loadingPainting: boolean
  isRendering: boolean
  renderProgress: number
  hasImage: boolean
  hasPoints: boolean
  scene: Scene
  projectName: string
  activeTab: ActiveTab
  onTabChange: (tab: 'camera' | 'caption') => void
  fileInputRef: React.RefObject<HTMLInputElement>
  loadProjectInputRef: React.RefObject<HTMLInputElement>
  onProjectNameChange: (name: string) => void
  onImageFile: (file: File, isFirst: boolean) => void
  onOverlayImageFile?: (file: File) => void
  onLoadFile: (file: File) => void
  onOpenMasterworkPicker: () => void
  onOpenAiPanel: () => void
  onRenderVideo: (conv: ChineseConversion, method: VideoRenderMethod) => void | Promise<void>
  onSave: () => void
  onClearPoints: () => void
  onRequestFullscreen: () => void
  onUndo: () => void
  onRedo: () => void
  canUndo: boolean
  canRedo: boolean
}

export function AppToolbar({
  isDisabled, loadingPainting, isRendering, renderProgress,
  hasImage, hasPoints, scene, projectName,
  activeTab, onTabChange,
  fileInputRef, loadProjectInputRef,
  onProjectNameChange, onImageFile, onOverlayImageFile, onLoadFile,
  onOpenMasterworkPicker, onOpenAiPanel, onRenderVideo,
  onSave, onClearPoints, onRequestFullscreen,
  onUndo, onRedo, canUndo, canRedo,
}: AppToolbarProps) {
  const { theme, setTheme } = useTheme()
  const overlayInputRef = useRef<HTMLInputElement>(null)
  const [renderMethod, setRenderMethod] = useState<VideoRenderMethod>('mediaRecorder')
  const supportsWebCodecs =
    typeof window !== 'undefined' &&
    'VideoEncoder' in window &&
    'VideoFrame' in window

  return (
    <header className="flex items-center gap-1 px-2 sm:px-3 h-12 border-b border-border bg-card flex-shrink-0 overflow-x-auto overflow-y-hidden">
      {/* Branding + 專案名稱（無框、hover 才浮現底色） */}
      <div className="flex-shrink-0 flex items-center gap-1.5 sm:gap-2.5 select-none">
        <span className="h-7 w-7 rounded-xl bg-gradient-to-br from-primary to-primary/60 text-primary-foreground flex items-center justify-center shadow-sm">
          <Film className="h-3.5 w-3.5" />
        </span>
        <Input
          value={projectName}
          onChange={e => onProjectNameChange(normalizeProjectName(e.target.value))}
          className="h-8 w-20 sm:w-40 text-[13px] font-semibold border-transparent bg-transparent shadow-none hover:bg-muted/70 focus-visible:bg-muted/70 focus-visible:ring-1 transition-colors rounded-lg px-2"
          placeholder="未命名專案"
          title="專案名稱"
        />
      </div>

      <Separator orientation="vertical" className="h-6 mx-1.5 opacity-60" />

      {/* 返回上一步 / 重做 */}
      <div className="flex items-center gap-0.5">
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground" onClick={onUndo} disabled={isDisabled || !canUndo} title="返回上一步（⌘/Ctrl+Z）">
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground" onClick={onRedo} disabled={isDisabled || !canRedo} title="重做（⌘⇧Z / Ctrl+Y）">
          <Redo2 className="h-4 w-4" />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-6 mx-1.5 opacity-60" />

      {/* 素材動作群 */}
      <div className="flex items-center gap-0.5">
        <Button variant="ghost" size="sm" className="h-8 gap-1.5 rounded-lg text-muted-foreground hover:text-foreground" onClick={() => fileInputRef.current?.click()} disabled={isDisabled || loadingPainting}>
          <Upload className="h-4 w-4" />
          <span className="hidden md:inline text-xs">上傳圖片</span>
        </Button>
        <Button variant="ghost" size="sm" className="h-8 gap-1.5 rounded-lg text-muted-foreground hover:text-foreground" onClick={onOpenMasterworkPicker} disabled={isDisabled || loadingPainting} title="從名畫庫選擇圖片">
          {loadingPainting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Palette className="h-4 w-4" />}
          <span className="hidden md:inline text-xs">{loadingPainting ? '載入中…' : '名畫庫'}</span>
        </Button>
        {onOverlayImageFile && (
          <Button variant="ghost" size="sm" className="h-8 gap-1.5 rounded-lg text-muted-foreground hover:text-foreground" onClick={() => overlayInputRef.current?.click()} disabled={isDisabled || !hasImage} title="加入疊加圖片（顯示於時間軸圖片列，可在畫布拖曳）">
            <ImagePlus className="h-4 w-4" />
            <span className="hidden md:inline text-xs">疊加</span>
          </Button>
        )}
        <Button variant="ghost" size="sm" className="h-8 gap-1.5 rounded-lg text-primary hover:text-primary" onClick={onOpenAiPanel} title="AI 自動產生內容">
          <Sparkles className="h-4 w-4" />
          <span className="hidden md:inline text-xs">AI 生成</span>
        </Button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0]
          if (file) onImageFile(file, !hasImage)
          e.target.value = ''
        }}
      />
      {onOverlayImageFile && (
        <input
          ref={overlayInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => {
            const file = e.target.files?.[0]
            if (file) onOverlayImageFile(file)
            e.target.value = ''
          }}
        />
      )}

      {/* 鏡頭 / 字幕 切換（置於工具列，不佔用畫布空間） */}
      <div className="flex items-center rounded-full bg-secondary/70 p-0.5 ml-1 flex-shrink-0">
        {(['camera', 'caption'] as const).map(tab => (
          <button
            key={tab}
            disabled={isDisabled || !hasImage}
            onClick={() => onTabChange(tab)}
            className={`h-7 px-3 rounded-full text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
              activeTab === tab || (tab === 'camera' && activeTab !== 'caption')
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab === 'camera' ? '鏡頭' : '字幕'}
          </button>
        ))}
      </div>

      {/* Render progress */}
      {isRendering && (
        <div className="flex items-center gap-1.5 ml-3">
          <div className="w-28 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-100"
              style={{ width: `${renderProgress}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground tabular-nums w-8 text-right">{renderProgress}%</span>
        </div>
      )}

      {/* 右側：主題 / 下載畫面 / 更多 / 匯出 */}
      <div className="ml-auto flex items-center gap-1">
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} title="切換深淺色模式">
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        <ScreenDownload
          scene={scene}
          projectName={projectName}
          disabled={isDisabled || isRendering}
        />

        {/* 更多動作（儲存 / 載入 / 清除 / 全螢幕） */}
        <DropdownMenuPrimitive.Root>
          <DropdownMenuPrimitive.Trigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground" title="更多">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuPrimitive.Trigger>
          <DropdownMenuPrimitive.Portal>
            <DropdownMenuPrimitive.Content
              align="end"
              sideOffset={6}
              className="z-50 min-w-[190px] rounded-xl border border-border bg-popover p-1.5 shadow-xl animate-in fade-in-0 zoom-in-95"
            >
              <DropdownMenuPrimitive.Item
                className="cursor-pointer rounded-lg px-3 py-2 text-sm outline-none select-none hover:bg-accent focus:bg-accent flex items-center gap-2.5"
                onSelect={onSave}
              >
                <Save className="h-4 w-4 text-muted-foreground" />儲存專案
              </DropdownMenuPrimitive.Item>
              <DropdownMenuPrimitive.Item
                className="cursor-pointer rounded-lg px-3 py-2 text-sm outline-none select-none hover:bg-accent focus:bg-accent flex items-center gap-2.5"
                onSelect={() => loadProjectInputRef.current?.click()}
              >
                <FolderOpen className="h-4 w-4 text-muted-foreground" />載入專案
              </DropdownMenuPrimitive.Item>
              <DropdownMenuPrimitive.Item
                className="cursor-pointer rounded-lg px-3 py-2 text-sm outline-none select-none hover:bg-accent focus:bg-accent flex items-center gap-2.5"
                onSelect={onRequestFullscreen}
              >
                <Maximize className="h-4 w-4 text-muted-foreground" />全螢幕
              </DropdownMenuPrimitive.Item>
              <DropdownMenuPrimitive.Separator className="my-1 h-px bg-border" />
              <DropdownMenuPrimitive.Item
                className="cursor-pointer rounded-lg px-3 py-2 text-sm outline-none select-none hover:bg-destructive/10 focus:bg-destructive/10 text-destructive flex items-center gap-2.5 data-[disabled]:opacity-40 data-[disabled]:pointer-events-none"
                disabled={!hasPoints}
                onSelect={onClearPoints}
              >
                <Trash2 className="h-4 w-4" />清除所有鏡頭
              </DropdownMenuPrimitive.Item>
            </DropdownMenuPrimitive.Content>
          </DropdownMenuPrimitive.Portal>
        </DropdownMenuPrimitive.Root>

        <input
          ref={loadProjectInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={e => {
            const file = e.target.files?.[0]
            if (file) onLoadFile(file)
            e.target.value = ''
          }}
        />

        {/* 匯出（主要動作） */}
        <DropdownMenuPrimitive.Root>
          <DropdownMenuPrimitive.Trigger asChild>
            <Button size="sm" disabled={isDisabled || !hasImage || !hasPoints} className="h-8 rounded-full px-4 gap-1.5 font-semibold shadow-sm">
              <Download className="h-3.5 w-3.5" />
              匯出
              <ChevronDown className="h-3 w-3 opacity-70" />
            </Button>
          </DropdownMenuPrimitive.Trigger>
          <DropdownMenuPrimitive.Portal>
            <DropdownMenuPrimitive.Content
              align="end"
              sideOffset={6}
              className="z-50 min-w-[240px] rounded-xl border border-border bg-popover p-1.5 shadow-xl animate-in fade-in-0 zoom-in-95"
            >
            <div className="flex items-center justify-between gap-3 rounded px-3 py-2">
              <div className="flex flex-col leading-tight">
                <span className="text-xs font-medium">輸出方法</span>
                <span className="text-[10px] text-muted-foreground">
                  {renderMethod === 'webCodecs' ? 'WebCodecs' : 'MediaRecorder'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground">MR</span>
                <Switch
                  checked={renderMethod === 'webCodecs'}
                  disabled={!supportsWebCodecs || isRendering}
                  onCheckedChange={checked => setRenderMethod(checked ? 'webCodecs' : 'mediaRecorder')}
                />
                <span className="text-[10px] text-muted-foreground">WC</span>
              </div>
            </div>
            {!supportsWebCodecs && (
              <div className="px-3 pb-2 text-[10px] text-muted-foreground">
                此瀏覽器不支援 WebCodecs
              </div>
            )}
            <DropdownMenuPrimitive.Separator className="my-1 h-px bg-border" />
            <DropdownMenuPrimitive.Item
              className="cursor-pointer rounded-lg px-3 py-2 text-sm outline-none select-none hover:bg-accent focus:bg-accent"
              onSelect={() => onRenderVideo('original', renderMethod)}
            >
              匯出此版本影片
            </DropdownMenuPrimitive.Item>
            <DropdownMenuPrimitive.Item
              className="cursor-pointer rounded-lg px-3 py-2 text-sm outline-none select-none hover:bg-accent focus:bg-accent"
              onSelect={() => onRenderVideo('tw', renderMethod)}
            >
              匯出繁體中文影片
            </DropdownMenuPrimitive.Item>
            <DropdownMenuPrimitive.Item
              className="cursor-pointer rounded-lg px-3 py-2 text-sm outline-none select-none hover:bg-accent focus:bg-accent"
              onSelect={() => onRenderVideo('cn', renderMethod)}
            >
              匯出簡體中文影片
            </DropdownMenuPrimitive.Item>
            <DropdownMenuPrimitive.Separator className="my-1 h-px bg-border" />
            <DropdownMenuPrimitive.Item
              className="cursor-pointer rounded-lg px-3 py-2 text-sm outline-none select-none hover:bg-accent focus:bg-accent font-medium"
              onSelect={async () => {
                // 批次輸出：依序產生三個語言版本，各自下載
                for (const conv of ['original', 'tw', 'cn'] as const) {
                  await onRenderVideo(conv, renderMethod)
                }
              }}
            >
              批次匯出三版本（原文＋繁＋簡）
            </DropdownMenuPrimitive.Item>
          </DropdownMenuPrimitive.Content>
        </DropdownMenuPrimitive.Portal>
      </DropdownMenuPrimitive.Root>
      </div>
    </header>
  )
}
