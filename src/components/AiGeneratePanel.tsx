import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  fetchOpenRouterModels, generateWithAi,
  type AiGenerateResult, type OpenRouterModelInfo,
} from '@/lib/openrouter'
import { Sparkles, X, Eye, EyeOff, AlertCircle, CheckCircle2, Loader2, ChevronDown, RefreshCw } from 'lucide-react'

const LS_KEY_KEY        = 'openrouter_api_key'
const LS_KEY_MODEL      = 'openrouter_model'
const LS_KEY_MODEL_NAME = 'openrouter_model_name'

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
  const [showKey, setShowKey]     = useState(false)
  const [status, setStatus]       = useState<Status>('idle')
  const [errorMsg, setErrorMsg]   = useState('')
  const [isLeaving, setIsLeaving] = useState(false)

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
      const result  = await generateWithAi({ apiKey: apiKey.trim(), model }, dataUrl)
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
          <button onClick={handleClose}
            className="h-7 w-7 rounded-full flex items-center justify-center hover:bg-muted transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 flex flex-col gap-4 rounded-b-2xl bg-card">
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

