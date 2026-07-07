import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronDown, RefreshCw, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { fetchOpenRouterModels, type OpenRouterModelInfo } from '@/lib/openrouter'

function formatPrice(p: string): string {
  const n = parseFloat(p)
  if (!n || isNaN(n)) return '免費'
  const per1m = n * 1_000_000
  return per1m < 0.01 ? `$${per1m.toFixed(4)}/1M` : `$${per1m.toFixed(2)}/1M`
}

export interface ModelComboboxProps {
  apiKey: string
  selectedId: string
  selectedName: string
  onSelect: (id: string, name: string) => void
  requireVision?: boolean
}

export function ModelCombobox({ apiKey, selectedId, selectedName, onSelect, requireVision = true }: ModelComboboxProps) {
  const [models, setModels] = useState<OpenRouterModelInfo[]>([])
  const [fetchStatus, setFetchStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [fetchError, setFetchError] = useState('')
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const loadModels = useCallback(async () => {
    if (!apiKey.trim()) return
    setFetchStatus('loading')
    setFetchError('')
    try {
      const list = await fetchOpenRouterModels(apiKey.trim(), { requireVision })
      setModels(list)
      setFetchStatus('done')
    } catch (error) {
      setFetchError(error instanceof Error ? error.message : '載入失敗')
      setFetchStatus('error')
    }
  }, [apiKey, requireVision])

  useEffect(() => {
    if (isOpen && fetchStatus === 'idle' && apiKey.trim()) loadModels()
  }, [apiKey, fetchStatus, isOpen, loadModels])

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filtered = query.trim()
    ? models.filter(model =>
      model.id.toLowerCase().includes(query.toLowerCase()) ||
      model.name.toLowerCase().includes(query.toLowerCase()),
    )
    : models

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => {
          setIsOpen(true)
          setTimeout(() => inputRef.current?.focus(), 10)
        }}
        className="w-full h-9 px-3 flex items-center gap-2 rounded-lg border border-input bg-background text-sm text-left hover:bg-accent transition-colors"
      >
        <span className="flex-1 truncate text-foreground">{selectedName || selectedId || '選擇模型…'}</span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      </button>
      {isOpen && (
        <div className="absolute z-[110] mt-1 w-full rounded-xl border border-border bg-card shadow-xl overflow-hidden">
          <div className="flex gap-1 p-2 border-b border-border">
            <Input
              ref={inputRef}
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="搜尋模型…"
              className="h-8 text-xs flex-1"
            />
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={loadModels} disabled={!apiKey.trim() || fetchStatus === 'loading'}>
              <RefreshCw className={`h-3.5 w-3.5 ${fetchStatus === 'loading' ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          <div className="max-h-64 overflow-y-auto p-1">
            {!apiKey.trim() && <div className="p-3 text-xs text-muted-foreground">請先輸入 API Key</div>}
            {fetchStatus === 'error' && <div className="p-3 text-xs text-red-500">{fetchError}</div>}
            {fetchStatus === 'loading' && (
              <div className="flex items-center gap-2 p-3 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />載入模型中…
              </div>
            )}
            {fetchStatus === 'done' && filtered.length === 0 && <div className="p-3 text-xs text-muted-foreground">沒有符合的模型</div>}
            {filtered.map(model => (
              <button
                key={model.id}
                type="button"
                onClick={() => {
                  onSelect(model.id, model.name)
                  setIsOpen(false)
                  setQuery('')
                }}
                className={`w-full text-left px-3 py-2 rounded-lg hover:bg-accent transition-colors ${model.id === selectedId ? 'bg-primary/10 text-primary' : ''}`}
              >
                <div className="text-xs font-medium truncate">{model.name || model.id}</div>
                <div className="text-[10px] text-muted-foreground truncate">{model.id} · {formatPrice(model.pricing?.prompt)}</div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
