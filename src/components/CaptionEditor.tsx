import type { CameraPoint, CaptionData } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { clamp } from '@/lib/utils'
import { AlignCenter } from 'lucide-react'

const FONT_OPTIONS = [
  { group: 'Noto / 實用字體', options: [
    { value: 'Noto Sans TC, Microsoft JhengHei, sans-serif', label: 'Noto Sans TC 繁體中文' },
    { value: 'Noto Sans, Arial, sans-serif', label: 'Noto Sans 英文' },
    { value: 'Noto Serif TC, PMingLiU, serif', label: 'Noto Serif TC 繁中襯線' },
    { value: 'Noto Serif, Georgia, serif', label: 'Noto Serif 英文襯線' },
    { value: 'system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif', label: '系統預設' },
    { value: 'Arial, sans-serif', label: 'Arial' },
    { value: 'Georgia, serif', label: 'Georgia' },
    { value: 'Verdana, sans-serif', label: 'Verdana' },
    { value: 'Roboto, Arial, sans-serif', label: 'Roboto' },
    { value: 'Courier New, monospace', label: '等寬字' },
  ]},
  { group: '藝術 / 展示字體', options: [
    { value: 'Playfair Display, Noto Serif TC, serif', label: 'Playfair Display 藝術襯線' },
    { value: 'Cormorant Garamond, Noto Serif TC, serif', label: 'Cormorant Garamond 優雅襯線' },
    { value: 'DM Serif Display, Noto Serif TC, serif', label: 'DM Serif Display 展示襯線' },
    { value: 'Cinzel, Noto Serif TC, serif', label: 'Cinzel 古典碑刻感' },
    { value: 'Spectral, Noto Serif TC, serif', label: 'Spectral 文學感' },
    { value: 'Great Vibes, Noto Serif TC, cursive', label: 'Great Vibes 手寫英文字' },
  ]},
  { group: '系統中文備援', options: [
    { value: 'Microsoft JhengHei, Noto Sans TC, sans-serif', label: '微軟正黑體' },
    { value: 'PMingLiU, MingLiU, Noto Serif TC, serif', label: '新細明體 / 明體' },
  ]},
]

interface CaptionEditorProps {
  point: CameraPoint | null
  disabled: boolean
  activeCaptionIndex: number
  onSetActiveCaptionIndex: (i: number) => void
  onAddCaption: () => void
  onDeleteCaption: (extraIndex: number) => void
  onUpdateCaption: <K extends keyof CaptionData>(field: K, value: CaptionData[K]) => void
  onUpdateHold: (value: number) => void
  onCenter: () => void
}

export default function CaptionEditor({ point, disabled, activeCaptionIndex, onSetActiveCaptionIndex, onAddCaption, onDeleteCaption, onUpdateCaption, onUpdateHold, onCenter }: CaptionEditorProps) {
  const allCaps = point ? [point.caption, ...(point.extraCaptions || [])] : []
  const cap = activeCaptionIndex === 0
    ? point?.caption
    : point?.extraCaptions?.[activeCaptionIndex - 1]

  const RangeNumber = ({
    label, value, min, max, step, field
  }: {
    label: string
    value: number
    min: number
    max: number
    step: number
    field: keyof CaptionData
  }) => (
    <div>
      <Label className="mb-1 block">{label} ({value.toFixed(2)})</Label>
      <div className="flex gap-2 items-center">
        <Slider
          value={value}
          min={min} max={max} step={step}
          onChange={v => onUpdateCaption(field, clamp(v, min, max))}
          disabled={disabled}
          className="flex-1"
        />
        <Input
          type="number"
          min={min} max={max} step={step}
          value={value}
          disabled={disabled}
          onChange={e => onUpdateCaption(field, clamp(Number(e.target.value), min, max))}
          className="w-20 h-8 text-xs"
        />
      </div>
    </div>
  )

  return (
    <div className="flex flex-col gap-3 overflow-y-auto pr-1" style={{ maxHeight: 'calc(100vh - 320px)' }}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">目前鏡頭字幕</span>
        <Button
          variant="secondary"
          size="sm"
          disabled={disabled}
          onClick={onCenter}
        >
          <AlignCenter className="h-3.5 w-3.5" />
          字幕置中
        </Button>
      </div>

      {/* Caption selector tabs */}
      {!disabled && (
        <div className="flex items-center gap-1 flex-wrap">
          {allCaps.map((_, i) => (
            <button
              key={i}
              onClick={() => onSetActiveCaptionIndex(i)}
              className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
                activeCaptionIndex === i
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted/80'
              }`}
            >
              字幕 {i + 1}
            </button>
          ))}
          <button
            onClick={onAddCaption}
            className="text-xs px-2.5 py-1 rounded-md bg-muted hover:bg-muted/80 transition-colors"
          >
            + 新增
          </button>
          {activeCaptionIndex > 0 && (
            <button
              onClick={() => onDeleteCaption(activeCaptionIndex - 1)}
              className="text-xs px-2.5 py-1 rounded-md text-destructive hover:bg-destructive/10 transition-colors"
            >
              刪除
            </button>
          )}
        </div>
      )}

      {disabled ? (
        <div className="text-xs text-muted-foreground py-4 text-center">請先選擇一個鏡頭</div>
      ) : (
        <>
          <div>
            <Label className="mb-1 block">主字幕字體</Label>
            <Select
              value={cap?.fontFamily}
              onChange={e => onUpdateCaption('fontFamily', e.target.value)}
              className="text-xs h-8"
            >
              {FONT_OPTIONS.map(g => (
                <optgroup key={g.group} label={g.group}>
                  {g.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </optgroup>
              ))}
            </Select>
          </div>

          <div>
            <Label className="mb-1 block">副字幕字體</Label>
            <Select
              value={cap?.subtitleFontFamily}
              onChange={e => onUpdateCaption('subtitleFontFamily', e.target.value)}
              className="text-xs h-8"
            >
              {FONT_OPTIONS.map(g => (
                <optgroup key={g.group} label={g.group}>
                  {g.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </optgroup>
              ))}
            </Select>
          </div>

          <div>
            <Label className="mb-1 block">主字幕</Label>
            <Textarea
              value={cap?.text || ''}
              placeholder="輸入主字幕，可換行"
              onChange={e => onUpdateCaption('text', e.target.value)}
              className="text-sm"
            />
          </div>

          <div>
            <Label className="mb-1 block">副字幕</Label>
            <Textarea
              value={cap?.subtitle || ''}
              placeholder="輸入副字幕，會顯示在主字幕下方"
              onChange={e => onUpdateCaption('subtitle', e.target.value)}
              className="text-sm"
            />
          </div>

          <Separator />

          <RangeNumber label="主字幕大小" value={cap?.scale ?? 1} min={0.5} max={3} step={0.05} field="scale" />
          <RangeNumber label="副字幕大小" value={cap?.subtitleScale ?? 1} min={0.5} max={3} step={0.05} field="subtitleScale" />

          <p className="text-xs text-muted-foreground">拖曳黃色角點可同步調整整體大小。</p>

          <Separator />

          {/* ── 字幕陰影框 ──────────────────────────────────────── */}
          <p className="text-xs font-semibold">字幕陰影框</p>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={cap?.shadowBoxVisible !== false}
              onChange={e => onUpdateCaption('shadowBoxVisible', e.target.checked)}
              disabled={disabled}
              className="rounded"
            />
            <span className="text-xs">顯示陰影框</span>
          </label>

          {cap?.shadowBoxVisible !== false && (
            <div className="grid grid-cols-2 gap-3">
              <RangeNumber label="陰影框寬度" value={cap?.boxScaleX ?? 1} min={0.6} max={2.4} step={0.05} field="boxScaleX" />
              <RangeNumber label="陰影框高度" value={cap?.boxScaleY ?? 1} min={0.6} max={2.4} step={0.05} field="boxScaleY" />
              <div>
                <Label className="mb-1 block">框色</Label>
                <input
                  type="color"
                  value={cap?.shadowColor || '#000000'}
                  onChange={e => onUpdateCaption('shadowColor', e.target.value)}
                  className="w-full h-9 rounded-lg border border-input cursor-pointer"
                  disabled={disabled}
                />
              </div>
              <RangeNumber label="框深淺" value={cap?.shadowAlpha ?? 0.48} min={0} max={1} step={0.05} field="shadowAlpha" />
            </div>
          )}

          <p className="text-xs text-muted-foreground">拖曳黃色框移動字幕；右下黃點調字體；右側藍點調陰影框寬度；底部綠點調陰影框高度。</p>

          <Separator />

          {/* ── 文字顏色 ────────────────────────────────────────── */}
          <p className="text-xs font-semibold">文字顏色</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1 block">主字幕顏色</Label>
              <input
                type="color"
                value={cap?.textColor || '#ffffff'}
                onChange={e => onUpdateCaption('textColor', e.target.value)}
                className="w-full h-9 rounded-lg border border-input cursor-pointer"
                disabled={disabled}
              />
            </div>
            <div>
              <Label className="mb-1 block">副字幕顏色</Label>
              <input
                type="color"
                value={cap?.subTextColor || '#ffffff'}
                onChange={e => onUpdateCaption('subTextColor', e.target.value)}
                className="w-full h-9 rounded-lg border border-input cursor-pointer"
                disabled={disabled}
              />
            </div>
          </div>

          <Separator />

          {/* ── 文字描邊 ────────────────────────────────────────── */}
          <p className="text-xs font-semibold">文字描邊</p>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={cap?.strokeEnabled === true}
              onChange={e => onUpdateCaption('strokeEnabled', e.target.checked)}
              disabled={disabled}
              className="rounded"
            />
            <span className="text-xs">啟用描邊</span>
          </label>
          {cap?.strokeEnabled && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1 block">描邊顏色</Label>
                <input
                  type="color"
                  value={cap?.strokeColor || '#000000'}
                  onChange={e => onUpdateCaption('strokeColor', e.target.value)}
                  className="w-full h-9 rounded-lg border border-input cursor-pointer"
                  disabled={disabled}
                />
              </div>
              <RangeNumber label="描邊粗細 (px)" value={cap?.strokeWidth ?? 4} min={1} max={16} step={1} field="strokeWidth" />
            </div>
          )}

          <Separator />

          {/* ── 文字陰影（與旁白字幕卡片相同的調整方式）────────── */}
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold">文字陰影</p>
            <button
              className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                (cap?.textShadowEnabled ?? true)
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-muted text-muted-foreground border-border'
              }`}
              onClick={() => onUpdateCaption('textShadowEnabled', !(cap?.textShadowEnabled ?? true))}
              disabled={disabled}
            >
              {(cap?.textShadowEnabled ?? true) ? '開' : '關'}
            </button>
          </div>

          {(cap?.textShadowEnabled ?? true) && (
            <>
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">模糊強度</Label>
                  <span className="text-[10px] text-muted-foreground">{cap?.textShadowBlur ?? 10}</span>
                </div>
                <Slider
                  min={0} max={24} step={1}
                  value={cap?.textShadowBlur ?? 10}
                  onChange={v => onUpdateCaption('textShadowBlur', v)}
                  disabled={disabled}
                />
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">陰影透明度</Label>
                  <span className="text-[10px] text-muted-foreground">{Math.round((cap?.textShadowOpacity ?? 0.7) * 100)}%</span>
                </div>
                <Slider
                  min={10} max={100} step={5}
                  value={Math.round((cap?.textShadowOpacity ?? 0.7) * 100)}
                  onChange={v => onUpdateCaption('textShadowOpacity', v / 100)}
                  disabled={disabled}
                />
              </div>
            </>
          )}

          <Separator />

          <div>
            <Label className="mb-1 block">停留秒數</Label>
            <Input
              type="number"
              min={0} max={20} step={0.1}
              value={point?.holdDuration ?? 0}
              onChange={e => onUpdateHold(clamp(Number(e.target.value), 0, 20))}
              className="h-8 text-xs"
            />
          </div>
        </>
      )}
    </div>
  )
}
