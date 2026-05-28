import type { BackgroundSettings } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { clamp } from '@/lib/utils'
import { Paintbrush } from 'lucide-react'

interface AssistPanelProps {
  backgroundSettings: BackgroundSettings
  onBackgroundChange: (settings: BackgroundSettings) => void
  showAllPoints: boolean
  onlyActiveBox: boolean
  showCaptionBox: boolean
  showGuidesInPreview: boolean
  onToggle: (key: 'showAllPoints' | 'onlyActiveBox' | 'showCaptionBox' | 'showGuidesInPreview', val: boolean) => void
  safeAreaVisibility: { ig: boolean; shorts: boolean; tiktok: boolean }
  onSafeAreaChange: (key: 'ig' | 'shorts' | 'tiktok', val: boolean) => void
}

export default function AssistPanel({
  backgroundSettings, onBackgroundChange,
  showAllPoints, onlyActiveBox, showCaptionBox, showGuidesInPreview, onToggle,
  safeAreaVisibility, onSafeAreaChange
}: AssistPanelProps) {
  return (
    <div className="flex flex-col gap-3 overflow-y-auto pr-1" style={{ maxHeight: 'calc(100vh - 320px)' }}>
      <p className="text-sm font-semibold">輸出背景</p>

      <div>
        <Label className="mb-1 block">背景模式</Label>
        <Select
          value={backgroundSettings.mode}
          onChange={e => onBackgroundChange({ ...backgroundSettings, mode: e.target.value as 'color' | 'blur' })}
          className="h-8 text-xs"
        >
          <option value="color">純色背景</option>
          <option value="blur">原圖填滿模糊</option>
        </Select>
      </div>

      <div>
        <Label className="mb-1 block">背景顏色</Label>
        <input
          type="color"
          value={backgroundSettings.color}
          onChange={e => onBackgroundChange({ ...backgroundSettings, color: e.target.value })}
          className="w-full h-9 rounded-lg border border-input cursor-pointer"
        />
      </div>

      <div>
        <Label className="mb-1 block">模糊程度 ({backgroundSettings.blur})</Label>
        <div className="flex gap-2 items-center">
          <Slider
            value={backgroundSettings.blur}
            min={0} max={50} step={1}
            onChange={v => onBackgroundChange({ ...backgroundSettings, blur: clamp(v, 0, 50) })}
            className="flex-1"
          />
          <Input
            type="number"
            min={0} max={50} step={1}
            value={backgroundSettings.blur}
            onChange={e => onBackgroundChange({ ...backgroundSettings, blur: clamp(Number(e.target.value), 0, 50) })}
            className="w-20 h-8 text-xs"
          />
        </div>
      </div>

      <Button
        variant="secondary"
        size="sm"
        className="w-full"
        onClick={() => onBackgroundChange({ ...backgroundSettings, mode: 'blur' })}
      >
        <Paintbrush className="h-3.5 w-3.5" />
        使用原圖填滿並模糊化
      </Button>

      <p className="text-xs text-muted-foreground">當 9:16 鏡頭框超出原圖時，露出的留白會使用背景設定，並會一起輸出到影片。</p>

      <Separator />

      <p className="text-sm font-semibold">平台預覽</p>

      {(['ig', 'shorts', 'tiktok'] as const).map(key => (
        <div key={key} className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {{ ig: 'IG Reels UI', shorts: 'YouTube Shorts UI', tiktok: 'TikTok UI' }[key]}
          </span>
          <Switch
            checked={safeAreaVisibility[key]}
            onCheckedChange={val => onSafeAreaChange(key, val)}
          />
        </div>
      ))}

      <Separator />

      <p className="text-sm font-semibold">畫布輔助顯示</p>

      {([
        { key: 'showAllPoints', label: '顯示所有鏡頭點位', value: showAllPoints },
        { key: 'onlyActiveBox', label: '只顯示目前鏡頭視野框', value: onlyActiveBox },
        { key: 'showCaptionBox', label: '顯示字幕編輯框', value: showCaptionBox },
        { key: 'showGuidesInPreview', label: '預覽時顯示編輯輔助', value: showGuidesInPreview },
      ] as const).map(item => (
        <div key={item.key} className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{item.label}</span>
          <Switch
            checked={item.value}
            onCheckedChange={val => onToggle(item.key, val)}
          />
        </div>
      ))}

      <p className="text-xs text-muted-foreground">產生影片時不會輸出藍色點、白色框或控制點，只會輸出畫作與字幕。</p>
    </div>
  )
}
