import { useEffect, useState } from 'react'
import { AlertCircle, Loader2, Sparkles, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { ModelCombobox } from '@/components/ModelCombobox'
import { CAROUSEL_AI_MAX_SLIDES, generateCarouselInsights, type CarouselInsightResult } from '@/components/panel/NarrationAIPanel'
import { clamp } from '@/lib/utils'

// 與工具列 AI、旁白 AI 共用同一組 key／模型設定
const LS_KEY_KEY = 'openrouter_api_key'
const LS_KEY_MODEL = 'openrouter_model'
const LS_KEY_MODEL_NAME = 'openrouter_model_name'

interface CarouselInsightPanelProps {
  image: HTMLImageElement
  /** 投影片與筆記都交給呼叫端；筆記會在左欄「AI 解析筆記」打開 */
  onApply: (result: CarouselInsightResult) => void
  onClose: () => void
}

/** 輪播「AI 解析」：AI 看畫、上網研究，把畫作寫成一組電影式敘事輪播 */
export function CarouselInsightPanel({ image, onApply, onClose }: CarouselInsightPanelProps) {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem(LS_KEY_KEY) ?? '')
  const [model, setModel] = useState(() => localStorage.getItem(LS_KEY_MODEL) ?? '')
  const [modelName, setModelName] = useState(() => localStorage.getItem(LS_KEY_MODEL_NAME) ?? '')
  const [title, setTitle] = useState('')
  const [artist, setArtist] = useState('')
  const [autoCount, setAutoCount] = useState(true)
  const [count, setCount] = useState(12)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { if (apiKey) localStorage.setItem(LS_KEY_KEY, apiKey) }, [apiKey])
  useEffect(() => { if (model) localStorage.setItem(LS_KEY_MODEL, model) }, [model])
  useEffect(() => { if (modelName) localStorage.setItem(LS_KEY_MODEL_NAME, modelName) }, [modelName])

  async function handleGenerate() {
    if (!apiKey.trim()) { setError('請先輸入 OpenRouter API Key'); return }
    if (!model) { setError('請先選擇 AI 模型'); return }
    setLoading(true)
    setError('')
    try {
      onApply(await generateCarouselInsights({
        apiKey: apiKey.trim(), model, image,
        count: autoCount ? null : count,
        info: { title, artist, year: '', location: '' },
      }))
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : '未知錯誤')
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => !loading && onClose()}>
      <div className="bg-card rounded-xl border border-border p-5 w-[28rem] max-w-[calc(100vw-32px)] shadow-xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold flex items-center gap-1.5"><Sparkles className="h-4 w-4 text-primary" />AI 解析隱藏意涵</h3>
          <Button variant="ghost" size="icon" className="h-6 w-6" disabled={loading} onClick={onClose}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>

        <p className="text-[11px] text-muted-foreground mb-4 leading-relaxed">
          AI 會上網研究畫作（聯網搜尋另計少量費用），把畫作寫成一組電影式的敘事輪播：每張框選一個畫面，配一行英文（主）與一行中文（副），新增在封底之前。敘事企劃與審核資料會放在左欄「AI 解析筆記」，可以邊看邊改。
        </p>

        <div className="space-y-3">
          <div>
            <Label className="mb-1 block text-xs">OpenRouter API Key</Label>
            <Input type="password" placeholder="sk-or-v1-..." value={apiKey} onChange={e => setApiKey(e.target.value)} className="font-mono text-xs h-8" autoComplete="off" />
          </div>
          <div>
            <Label className="mb-1 block text-xs">AI 模型（需支援圖片）</Label>
            <ModelCombobox apiKey={apiKey} selectedId={model} selectedName={modelName} onSelect={(id, name) => { setModel(id); setModelName(name) }} />
          </div>
          <div className="flex gap-2">
            <div className="flex-1 min-w-0">
              <Label className="mb-1 block text-xs text-muted-foreground">畫作標題（選填）</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="例：阿諾菲尼夫婦像" className="h-8 text-sm" />
            </div>
            <div className="flex-1 min-w-0">
              <Label className="mb-1 block text-xs text-muted-foreground">藝術家（選填）</Label>
              <Input value={artist} onChange={e => setArtist(e.target.value)} placeholder="例：范艾克" className="h-8 text-sm" />
            </div>
          </div>
          <div>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={autoCount}
                onChange={e => setAutoCount(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-input accent-primary cursor-pointer"
              />
              <span className="text-xs">張數由 AI 依故事決定（最多可達 {CAROUSEL_AI_MAX_SLIDES} 張）</span>
            </label>
            {!autoCount && (
              <div className="mt-2">
                <Label className="mb-1 block text-xs">張數（{count} 張）</Label>
                <Slider value={count} min={3} max={CAROUSEL_AI_MAX_SLIDES} step={1} onChange={v => setCount(clamp(Math.round(v), 3, CAROUSEL_AI_MAX_SLIDES))} />
              </div>
            )}
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-2.5 text-destructive text-xs">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <Button className="w-full h-9 text-sm font-semibold" disabled={loading} onClick={handleGenerate}>
            {loading
              ? <><Loader2 className="h-4 w-4 animate-spin" />研究畫作、構思分鏡⋯（約 1–3 分鐘）</>
              : <><Sparkles className="h-4 w-4" />{autoCount ? '產生敘事輪播' : `產生 ${count} 張輪播`}</>}
          </Button>
        </div>
      </div>
    </div>
  )
}
