import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  fetchOpenRouterModels, generateWithAi, SYSTEM_PROMPT,
  type AiGenerateResult, type OpenRouterModelInfo, type PaintingInfo,
} from '@/lib/openrouter'
import { Sparkles, X, Eye, EyeOff, AlertCircle, CheckCircle2, Loader2, ChevronDown, RefreshCw, FileText, RotateCcw } from 'lucide-react'

const LS_KEY_KEY        = 'openrouter_api_key'
const LS_KEY_MODEL      = 'openrouter_model'
const LS_KEY_MODEL_NAME = 'openrouter_model_name'
const LS_KEY_CUSTOM_PROMPT = 'openrouter_custom_prompt'

const VISUAL_DESC_OPTS: { value: string; label: string }[] = [
  { value: '人物肖像為主，面部表情、眼神與手勢細節突出，背景簡潔', label: '人物肖像' },
  { value: '宗教場景，天使、聖人、神聖光芒，充滿符號與神學象徵', label: '宗教神聖' },
  { value: '明暗對比強烈，強光從單一方向打入，背景深暗，卡拉瓦喬式戟劇性光影', label: '戟劇光影' },
  { value: '多人群像構圖，歷史或神話場景，人物動態豐富，空間層次感強', label: '歷史群像' },
  { value: '室內場景，日常生活細節豐富，物件象徵意涵濃厚', label: '室內日常' },
  { value: '自然風景為主，天空、光線與大氣效果細腥，人物為輔或缺席', label: '自然風景' },
  { value: '神話傳說場景，神祘、怪物或傳說人物，充滿寓意與象徵', label: '神話傳說' },
  { value: '戰爭、衝突或英雄場景，動態張力強，情緒激烈', label: '戰爭衝突' },
  { value: '__custom__', label: '自訂描述…' },
]

const THEME_OPTS = [
  '信仰與神聖', '背叛與謊言', '孤獨與疏離', '犊牲與痛苦',
  '愛與渴望', '死亡與命運', '榮耀與尊嚴', '母愛與守護',
  '恐懼與劉傷', '救贎與希望', '權力與控制', '自由與束縛',
]

interface AiGeneratePanelProps {
  image: HTMLImageElement | null
  onGenerated: (result: AiGenerateResult) => void
  onClose: () => void
}

type Status = 'idle' | 'loading' | 'success' | 'error'

function imageToDataUrl(img: HTMLImageElement): string {
  const canvas = document.createElement('canvas')
  const MAX = 1024
  const scale = Math.min(1, MAX / Math.max(img.naturalWidth, img.naturalHeight))
  canvas.width  = Math.round(img.naturalWidth  * scale)
  canvas.height = Math.round(img.naturalHeight * scale)
  canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/jpeg', 0.85)
}

function formatPrice(p: string): string {
  const n = parseFloat(p)
  if (!n || isNaN(n)) return '免費'
  const per1m = n * 1_000_000
  return per1m < 0.01 ? `$${per1m.toFixed(4)}/1M` : `$${per1m.toFixed(2)}/1M`
}

// ── Model Combobox ────────────────────────────────────────────────────────────────────────────
interface ModelComboboxProps {
  apiKey: string
  selectedId: string
  selectedName: string
  onSelect: (id: string, name: string) => void
}

function ModelCombobox({ apiKey, selectedId, selectedName, onSelect }: ModelComboboxProps) {
  const [models, setModels]           = useState<OpenRouterModelInfo[]>([])
  const [fetchStatus, setFetchStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [fetchError, setFetchError]   = useState('')
  const [query, setQuery]             = useState('')
  const [isOpen, setIsOpen]           = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef     = useRef<HTMLInputElement>(null)

  const loadModels = useCallback(async () => {
    if (!apiKey.trim()) return
    setFetchStatus('loading')
    setFetchError('')
    try {
      const list = await fetchOpenRouterModels(apiKey.trim())
      setModels(list)
      setFetchStatus('done')
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : '載入失敗')
      setFetchStatus('error')
    }
  }, [apiKey])

  // Auto-load when first opened and key is ready
  useEffect(() => {
    if (isOpen && fetchStatus === 'idle' && apiKey.trim()) loadModels()
  }, [isOpen, fetchStatus, apiKey, loadModels])

  // Click outside → close
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false); setQuery('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filtered = query.trim()
    ? models.filter(m =>
        m.id.toLowerCase().includes(query.toLowerCase()) ||
        m.name.toLowerCase().includes(query.toLowerCase())
      )
    : models

  function openDropdown() {
    setIsOpen(true)
    setTimeout(() => inputRef.current?.focus(), 10)
  }

  function selectModel(m: OpenRouterModelInfo) {
    onSelect(m.id, m.name)
    setIsOpen(false)
    setQuery('')
  }

  const displayLabel = selectedName || selectedId || '選擇模型…'

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger */}
      <button
        type="button" onClick={openDropdown}
        className="w-full h-9 px-3 flex items-center gap-2 rounded-lg border border-input bg-background text-sm text-left hover:bg-accent transition-colors"
      >
        <span className="flex-1 truncate text-foreground">{displayLabel}</span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-border bg-card shadow-xl overflow-hidden">
          {/* Search + refresh */}
          <div className="flex gap-1 p-2 border-b border-border">
            <Input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="輸入關鍵字簽選模型…"
              className="h-8 text-xs flex-1"
            />
            <button
              type="button" title="重新載入模型列表"
              onClick={() => { setFetchStatus('idle'); loadModels() }}
              className="h-8 w-8 shrink-0 flex items-center justify-center rounded-md hover:bg-muted transition-colors text-muted-foreground"
            >
              {fetchStatus === 'loading'
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <RefreshCw className="h-3.5 w-3.5" />
              }
            </button>
          </div>

          {/* List */}
          <div className="max-h-56 overflow-y-auto">
            {fetchStatus === 'loading' && (
              <div className="flex items-center justify-center gap-2 py-6 text-xs text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />正在從 OpenRouter 載入模型列表…
              </div>
            )}
            {fetchStatus === 'error' && (
              <div className="px-3 py-4 text-xs text-destructive text-center">{fetchError}</div>
            )}
            {fetchStatus !== 'loading' && fetchStatus !== 'done' && !apiKey.trim() && (
              <div className="px-3 py-4 text-xs text-muted-foreground text-center">
                請先輸入 API Key 以載入模型列表
              </div>
            )}
            {fetchStatus === 'done' && filtered.length === 0 && (
              <div className="px-3 py-4 text-xs text-muted-foreground text-center">無符合結果</div>
            )}
            {fetchStatus === 'done' && filtered.map(m => {
              const promptPrice = formatPrice(m.pricing?.prompt ?? '0')
              return (
                <button
                  key={m.id} type="button" onClick={() => selectModel(m)}
                  className={`w-full px-3 py-2 flex flex-col items-start text-left hover:bg-accent transition-colors border-b border-border/40 last:border-0
                    ${m.id === selectedId ? 'bg-primary/10' : ''}`}
                >
                  <span className="text-xs font-medium truncate w-full">{m.name || m.id}</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-muted-foreground truncate flex-1">{m.id}</span>
                    <span className={`text-[10px] shrink-0 font-mono ${promptPrice === '免費' ? 'text-green-500' : 'text-muted-foreground'}`}>
                      {promptPrice}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>

          {fetchStatus === 'done' && (
            <div className="px-3 py-1.5 text-[10px] text-muted-foreground border-t border-border bg-muted/30">
              共 {filtered.length} / {models.length} 個視覺模型
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main Panel ────────────────────────────────────────────────────────────────────────────
export default function AiGeneratePanel({ image, onGenerated, onClose }: AiGeneratePanelProps) {
  const [apiKey, setApiKey]       = useState(() => localStorage.getItem(LS_KEY_KEY)       ?? '')
  const [model, setModel]         = useState(() => localStorage.getItem(LS_KEY_MODEL)     ?? '')
  const [modelName, setModelName] = useState(() => localStorage.getItem(LS_KEY_MODEL_NAME) ?? '')
  const [customPrompt, setCustomPrompt] = useState(() => localStorage.getItem(LS_KEY_CUSTOM_PROMPT) ?? SYSTEM_PROMPT)
  const [showKey, setShowKey]     = useState(false)
  const [status, setStatus]       = useState<Status>('idle')
  const [errorMsg, setErrorMsg]   = useState('')
  const [isLeaving, setIsLeaving] = useState(false)
  const [showPrompt, setShowPrompt] = useState(false)
  const [unknownPainting, setUnknownPainting] = useState(false)
  // 畫作資訊
  const [paintTitle, setPaintTitle]             = useState('')
  const [paintYear, setPaintYear]               = useState('')
  const [paintArtist, setPaintArtist]           = useState('')
  const [paintCollection, setPaintCollection]   = useState('')
  const [paintVisualSel, setPaintVisualSel]     = useState('')
  const [paintVisualCustom, setPaintVisualCustom] = useState('')
  const [paintTheme, setPaintTheme]             = useState('')

  useEffect(() => { if (apiKey)    localStorage.setItem(LS_KEY_KEY,        apiKey)    }, [apiKey])
  useEffect(() => { if (model)     localStorage.setItem(LS_KEY_MODEL,      model)     }, [model])
  useEffect(() => { if (modelName) localStorage.setItem(LS_KEY_MODEL_NAME, modelName) }, [modelName])

  function handleClose() {
    setIsLeaving(true)
    setTimeout(onClose, 200)
  }

  async function handleGenerate() {
    if (!apiKey.trim()) { setErrorMsg('請先輸入 OpenRouter API Key'); setStatus('error'); return }
    if (!model)         { setErrorMsg('請先選擇 AI 模型');              setStatus('error'); return }
    if (!image)         { setErrorMsg('請先上傳圖片');                   setStatus('error'); return }
    setStatus('loading')
    setErrorMsg('')
    try {
      const dataUrl = imageToDataUrl(image)
      const info: PaintingInfo = unknownPainting ? {
        title: '', year: '', artist: '', collection: '', visualDescription: '', theme: '',
      } : {
        title: paintTitle,
        year: paintYear,
        artist: paintArtist,
        collection: paintCollection,
        visualDescription: paintVisualSel === '__custom__' ? paintVisualCustom : paintVisualSel,
        theme: paintTheme,
      }
      const result = await generateWithAi(
        { apiKey: apiKey.trim(), model },
        dataUrl,
        info,
        customPrompt !== SYSTEM_PROMPT ? customPrompt : undefined,
      )
      setStatus('success')
      setTimeout(() => { onGenerated(result); handleClose() }, 800)
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : '未知錯誤')
      setStatus('error')
    }
  }

  return (
    <div className={`fixed inset-0 z-[90] flex items-end sm:items-center justify-center
      ${isLeaving ? 'immersive-leave' : 'immersive-enter'}`}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={handleClose} />

      {/* Panel */}
      <div className={`relative z-10 w-full max-w-lg mx-4 mb-4 sm:mb-0 rounded-2xl border border-border
        bg-card shadow-2xl
        ${isLeaving ? 'immersive-canvas-leave' : 'immersive-canvas-enter'}`}>

        {/* Header */}
        <div className="flex items-center gap-2 px-5 pt-5 pb-4 border-b border-border rounded-t-2xl bg-card">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="font-bold text-base flex-1">AI 自動產生內容</h2>
          <button onClick={() => setShowPrompt(v => !v)} title="查看目前 Prompt"
            className={`h-7 w-7 rounded-full flex items-center justify-center hover:bg-muted transition-colors ${showPrompt ? 'text-primary' : 'text-muted-foreground'}`}>
            <FileText className="h-4 w-4" />
          </button>
          <button onClick={handleClose}
            className="h-7 w-7 rounded-full flex items-center justify-center hover:bg-muted transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 flex flex-col gap-4 rounded-b-2xl bg-card">
          {/* Prompt preview */}
          {showPrompt && (
            <div className="rounded-xl border border-border bg-muted/40 overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/60">
                <span className="text-xs font-medium text-muted-foreground">Prompt 編輯器（含佔位符）</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => { setCustomPrompt(SYSTEM_PROMPT); localStorage.setItem(LS_KEY_CUSTOM_PROMPT, SYSTEM_PROMPT) }}
                    title="重置為預設 Prompt"
                    className="h-5 w-5 flex items-center justify-center rounded hover:bg-muted transition-colors text-muted-foreground">
                    <RotateCcw className="h-3 w-3" />
                  </button>
                  <button onClick={() => setShowPrompt(false)}
                    className="h-5 w-5 flex items-center justify-center rounded hover:bg-muted transition-colors text-muted-foreground">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </div>
              <textarea
                value={customPrompt}
                onChange={e => { setCustomPrompt(e.target.value); localStorage.setItem(LS_KEY_CUSTOM_PROMPT, e.target.value) }}
                className="w-full text-[11px] leading-relaxed text-foreground/80 p-3 h-56 overflow-y-auto font-mono bg-transparent resize-none border-0 focus:outline-none"
                spellCheck={false}
              />
            </div>
          )}

          <p className="text-xs text-muted-foreground leading-relaxed">
            上傳名畫後，AI 將自動分析畫作並產生鏡頭路徑與繁體中文介紹字幕。需要{' '}
            <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer"
              className="text-primary underline underline-offset-2">OpenRouter API Key</a>。
          </p>

          <Separator />

          {/* API Key */}
          <div>
            <Label className="mb-1.5 block text-sm">OpenRouter API Key</Label>
            <div className="flex gap-2">
              <Input
                type={showKey ? 'text' : 'password'}
                placeholder="sk-or-v1-..."
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                className="flex-1 font-mono text-xs h-9"
                autoComplete="off"
              />
              <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0"
                onClick={() => setShowKey(v => !v)} type="button">
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Key 僅存於本機 localStorage，只傳給 OpenRouter API。
            </p>
          </div>

          {/* Model combobox */}
          <div>
            <Label className="mb-1.5 block text-sm">AI 模型</Label>
            <ModelCombobox
              apiKey={apiKey}
              selectedId={model}
              selectedName={modelName}
              onSelect={(id, name) => { setModel(id); setModelName(name) }}
            />
            <p className="text-xs text-muted-foreground mt-1">
              點擊後自動載入全部視覺模型，輸入關鍵字即時篩選。定價為輸入 token 費用。
            </p>
          </div>

          <Separator />

          {/* 畫作資訊 */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">畫作資訊 <span className="text-xs text-muted-foreground font-normal">（提供越完整，AI 分析越精準）</span></p>
              <label className="flex items-center gap-1.5 cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={unknownPainting}
                  onChange={e => setUnknownPainting(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-input accent-primary cursor-pointer"
                />
                <span className="text-xs text-muted-foreground whitespace-nowrap">不知道，讓 AI 自行辨識</span>
              </label>
            </div>
            {!unknownPainting && (<>
              <div className="flex gap-2">
                <div className="flex-1 min-w-0">
                  <Label className="mb-1 block text-xs text-muted-foreground">畫作標題</Label>
                  <Input value={paintTitle} onChange={e => setPaintTitle(e.target.value)} placeholder="例：蒙娜麗莎" className="h-8 text-sm" />
                </div>
                <div className="w-20 shrink-0">
                  <Label className="mb-1 block text-xs text-muted-foreground">年份</Label>
                  <Input value={paintYear} onChange={e => setPaintYear(e.target.value)} placeholder="1503" className="h-8 text-sm" />
                </div>
              </div>
              <div className="flex gap-2">
                <div className="flex-1 min-w-0">
                  <Label className="mb-1 block text-xs text-muted-foreground">藝術家</Label>
                  <Input value={paintArtist} onChange={e => setPaintArtist(e.target.value)} placeholder="例：達文西" className="h-8 text-sm" />
                </div>
                <div className="flex-1 min-w-0">
                  <Label className="mb-1 block text-xs text-muted-foreground">收藏地點</Label>
                  <Input value={paintCollection} onChange={e => setPaintCollection(e.target.value)} placeholder="例：羅浮宮" className="h-8 text-sm" />
                </div>
              </div>
              <div>
                <Label className="mb-1 block text-xs text-muted-foreground">視覺描述風格</Label>
                <Select value={paintVisualSel} onChange={e => setPaintVisualSel(e.target.value)}>
                  <option value="">請選擇描述風格…</option>
                  {VISUAL_DESC_OPTS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </Select>
                {paintVisualSel === '__custom__' && (
                  <Textarea
                    value={paintVisualCustom}
                    onChange={e => setPaintVisualCustom(e.target.value)}
                    placeholder="請描述畫作中的人物、場景、光線、手勢、表情、背景等細節…"
                    className="mt-2 text-sm"
                  />
                )}
              </div>
              <div>
                <Label className="mb-1 block text-xs text-muted-foreground">強調主題</Label>
                <Select value={paintTheme} onChange={e => setPaintTheme(e.target.value)}>
                  <option value="">請選擇主題…</option>
                  {THEME_OPTS.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </Select>
              </div>
            </>)}
          </div>

          {/* Status messages */}
          {status === 'error' && (
            <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-destructive text-xs">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}
          {status === 'success' && (
            <div className="flex items-center gap-2 rounded-lg bg-green-500/10 border border-green-500/20 p-3 text-green-600 dark:text-green-400 text-xs">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>產生成功！正在套用內容⋯</span>
            </div>
          )}

          {/* Generate button */}
          <Button className="w-full h-10 text-sm font-semibold"
            onClick={handleGenerate}
            disabled={status === 'loading' || status === 'success' || !image}>
            {status === 'loading' ? (
              <><Loader2 className="h-4 w-4 animate-spin" />AI 分析中，請稍候⋯</>
            ) : (
              <><Sparkles className="h-4 w-4" />{image ? '自動產生鏡頭與字幕' : '請先上傳圖片'}</>
            )}
          </Button>

          {!image && (
            <p className="text-xs text-muted-foreground text-center -mt-2">上傳圖片後即可使用 AI 功能</p>
          )}
        </div>
      </div>
    </div>
  )
}

