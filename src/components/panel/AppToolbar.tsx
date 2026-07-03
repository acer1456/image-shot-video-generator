import { useRef, useState } from 'react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import {
  Sun, Moon, Save, FolderOpen, Trash2, Film,
  Maximize, Upload, ChevronDown, Sparkles, Palette, Loader2,
} from 'lucide-react'
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu'
import { normalizeProjectName } from '@/lib/utils'
import type { ChineseConversion } from '@/lib/chinese'
import type { VideoRenderMethod } from '@/hooks/useVideoRender'
import ScreenDownload from '@/components/ScreenDownload'
import type { BackgroundSettings, CameraPoint } from '@/types'


interface AppToolbarProps {
  isDisabled: boolean
  loadingPainting: boolean
  isRendering: boolean
  renderProgress: number
  hasImage: boolean
  hasPoints: boolean
  image: HTMLImageElement | null
  points: CameraPoint[]
  backgroundSettings: BackgroundSettings
  projectName: string
  fileInputRef: React.RefObject<HTMLInputElement>
  loadProjectInputRef: React.RefObject<HTMLInputElement>
  onProjectNameChange: (name: string) => void
  onImageFile: (file: File, isFirst: boolean) => void
  onLoadFile: (file: File) => void
  onOpenMasterworkPicker: () => void
  onOpenAiPanel: () => void
  onRenderVideo: (conv: ChineseConversion, method: VideoRenderMethod) => void | Promise<void>
  onSave: () => void
  onClearPoints: () => void
  onRequestFullscreen: () => void
}

export function AppToolbar({
  isDisabled, loadingPainting, isRendering, renderProgress,
  hasImage, hasPoints, image, points, backgroundSettings, projectName,
  fileInputRef, loadProjectInputRef,
  onProjectNameChange, onImageFile, onLoadFile,
  onOpenMasterworkPicker, onOpenAiPanel, onRenderVideo,
  onSave, onClearPoints, onRequestFullscreen,
}: AppToolbarProps) {
  const { theme, setTheme } = useTheme()
  const [renderMethod, setRenderMethod] = useState<VideoRenderMethod>('mediaRecorder')
  const supportsWebCodecs =
    typeof window !== 'undefined' &&
    'VideoEncoder' in window &&
    'VideoFrame' in window

  return (
    <header className="flex items-center gap-2 px-3 py-2 border-b border-border bg-card/80 backdrop-blur-sm flex-shrink-0">
      {/* Branding */}
      <div className="flex-shrink-0 flex flex-col mr-1 leading-tight">
        <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground whitespace-nowrap">9:16 Video Studio</span>
        <span className="text-sm font-extrabold whitespace-nowrap">畫作鏡頭影片產生器</span>
      </div>

      <Separator orientation="vertical" className="h-8" />

      {/* Image upload */}
      <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()} disabled={isDisabled || loadingPainting}>
        <Upload className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">上傳圖片</span>
      </Button>
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

      {/* Masterwork picker */}
      <Button
        variant="outline"
        size="sm"
        onClick={onOpenMasterworkPicker}
        disabled={isDisabled || loadingPainting}
        title="從名畫庫選擇圖片"
      >
        {loadingPainting
          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
          : <Palette className="h-3.5 w-3.5" />}
        <span className="hidden sm:inline">{loadingPainting ? '載入中...' : '名畫庫'}</span>
      </Button>

      {/* Project name */}
      <Input
        value={projectName}
        onChange={e => onProjectNameChange(normalizeProjectName(e.target.value))}
        className="h-8 w-36 text-xs"
        placeholder="專案名稱"
      />

      <Separator orientation="vertical" className="h-8" />

      {/* Render dropdown */}
      <DropdownMenuPrimitive.Root>
        <DropdownMenuPrimitive.Trigger asChild>
          <Button size="sm" disabled={isDisabled || !hasImage || !hasPoints}>
            <Film className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">下載影片</span>
            <ChevronDown className="h-3 w-3 ml-0.5" />
          </Button>
        </DropdownMenuPrimitive.Trigger>
        <DropdownMenuPrimitive.Portal>
          <DropdownMenuPrimitive.Content
            align="end"
            sideOffset={4}
            className="z-50 min-w-[230px] rounded-md border border-border bg-popover p-1 shadow-md animate-in fade-in-0 zoom-in-95"
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
              className="cursor-pointer rounded px-3 py-1.5 text-sm outline-none select-none hover:bg-accent focus:bg-accent"
              onSelect={() => onRenderVideo('original', renderMethod)}
            >
              下載此版本影片
            </DropdownMenuPrimitive.Item>
            <DropdownMenuPrimitive.Item
              className="cursor-pointer rounded px-3 py-1.5 text-sm outline-none select-none hover:bg-accent focus:bg-accent"
              onSelect={() => onRenderVideo('tw', renderMethod)}
            >
              下載繁體中文影片
            </DropdownMenuPrimitive.Item>
            <DropdownMenuPrimitive.Item
              className="cursor-pointer rounded px-3 py-1.5 text-sm outline-none select-none hover:bg-accent focus:bg-accent"
              onSelect={() => onRenderVideo('cn', renderMethod)}
            >
              下載簡體中文影片
            </DropdownMenuPrimitive.Item>
            <DropdownMenuPrimitive.Separator className="my-1 h-px bg-border" />
            <DropdownMenuPrimitive.Item
              className="cursor-pointer rounded px-3 py-1.5 text-sm outline-none select-none hover:bg-accent focus:bg-accent font-medium"
              onSelect={async () => {
                // 批次輸出：依序產生三個語言版本，各自下載
                for (const conv of ['original', 'tw', 'cn'] as const) {
                  await onRenderVideo(conv, renderMethod)
                }
              }}
            >
              批次下載三版本（原文＋繁＋簡）
            </DropdownMenuPrimitive.Item>
          </DropdownMenuPrimitive.Content>
        </DropdownMenuPrimitive.Portal>
      </DropdownMenuPrimitive.Root>

      <ScreenDownload
        image={image}
        points={points}
        backgroundSettings={backgroundSettings}
        projectName={projectName}
        disabled={isDisabled || isRendering}
      />

      {/* Render progress bar */}
      {isRendering && (
        <div className="flex items-center gap-1.5 ml-2">
          <div className="w-28 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-100"
              style={{ width: `${renderProgress}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground tabular-nums w-8 text-right">{renderProgress}%</span>
        </div>
      )}

      {/* Right actions */}
      <div className="ml-auto flex items-center gap-1.5">
        <Button variant="ghost" size="icon" onClick={onOpenAiPanel} title="AI 自動產生內容" className="text-primary">
          <Sparkles className="h-4 w-4" />
        </Button>

        <Separator orientation="vertical" className="h-8" />

        <Button variant="ghost" size="icon" onClick={onSave} title="保存專案">
          <Save className="h-4 w-4" />
        </Button>

        <Button variant="ghost" size="icon" onClick={() => loadProjectInputRef.current?.click()} title="載入專案">
          <FolderOpen className="h-4 w-4" />
        </Button>
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

        <Button variant="ghost" size="icon" onClick={onClearPoints} title="清除所有點位" disabled={!hasPoints}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>

        <Separator orientation="vertical" className="h-8" />

        <Button variant="ghost" size="icon" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} title="切換深淺色模式">
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        <Button variant="ghost" size="icon" onClick={onRequestFullscreen} title="全螢幕">
          <Maximize className="h-4 w-4" />
        </Button>
      </div>
    </header>
  )
}
