import type { BackgroundSettings } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { clamp } from '@/lib/utils'
import { Paintbrush } from 'lucide-react'

interface AssistPanelProps {
  backgroundSettings: BackgroundSettings
  onBackgroundChange: (settings: BackgroundSettings) => void
}

export default function AssistPanel({
  backgroundSettings, onBackgroundChange,
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
    </div>
  )
}
