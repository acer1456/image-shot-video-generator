/**
 * MasterworkPickerModal.tsx  —  名畫庫選擇器
 *
 * 支援多個 API 來源。新增來源只需在 ART_SOURCES 陣列中 push 一個
 * 符合 ArtApiAdapter 介面的物件，無需修改元件本身。
 *
 * 目前內建三個來源（均無需 API Key，所有作品為公版可商業使用）：
 *   1. Art Institute of Chicago (ARTIC)  — IIIF 高畫質影像
 *   2. The Metropolitan Museum of Art   — 需個別 fetch 物件，最後以批次完成
 *   3. Cleveland Museum of Art          — 單一端點包含完整 metadata
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  X, Search, RefreshCw, ChevronLeft,
  MapPin, User, Calendar, Database,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

// ── Shared types ──────────────────────────────────────────────────────────────

export interface Artwork {
  id: string
  title: string
  artist: string
  year: string
  location: string
  thumbnailUrl: string
  imageUrl: string        // 高解析度，載入 canvas 用
  description: string
  sourceId: string
}

export interface ArtApiAdapter {
  id: string
  label: string
  shortLabel: string
  /**
   * 取得一批畫作。
   * @param effectiveQuery  搜尋詞 + 分類詞的組合；空字串 = 隨機/精選
   * @param page            1-based 頁碼
   */
  fetchBatch(
    effectiveQuery: string,
    page: number,
  ): Promise<{ artworks: Artwork[]; hasMore: boolean }>
}

// ── Categories (shared across all sources as keyword modifiers) ───────────────

export const ART_CATEGORIES = [
  { id: '',             label: '全部',    term: '' },
  { id: 'portrait',    label: '肖像',    term: 'portrait' },
  { id: 'landscape',   label: '風景',    term: 'landscape' },
  { id: 'still-life',  label: '靜物',    term: 'still life' },
  { id: 'impressionism', label: '印象派', term: 'impressionism' },
  { id: 'renaissance', label: '文藝復興', term: 'renaissance' },
  { id: 'baroque',     label: '巴洛克',  term: 'baroque' },
  { id: 'religious',   label: '宗教',    term: 'religious art' },
  { id: 'mythology',   label: '神話',    term: 'mythology' },
] as const

// ── Utility helpers ───────────────────────────────────────────────────────────

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

function buildEffectiveQuery(search: string, categoryId: string): string {
  const cat = ART_CATEGORIES.find(c => c.id === categoryId)
  return [search.trim(), cat?.term ?? ''].filter(Boolean).join(' ')
}

// ── 1. Art Institute of Chicago (ARTIC) ───────────────────────────────────────

const ARTIC_FIELDS =
  'id,title,artist_title,date_display,place_of_origin,image_id,thumbnail,department_title,description'
const ARTIC_KEYWORDS = [
  'impressionist painting', 'renaissance portrait', 'baroque masterpiece',
  'landscape painting', 'still life painting', 'figurative oil painting',
  'neoclassical painting', 'romanticism landscape', 'dutch golden age',
  'modern art figure', 'french portrait', 'american realism',
]
const PAGE_SIZE = 20

function articToArtwork(a: Record<string, unknown>): Artwork | null {
  const imageId = a.image_id as string | null
  if (!imageId) return null
  const thumb = a.thumbnail as { alt_text?: string } | null
  const desc =
    thumb?.alt_text ||
    (a.description ? stripHtml(a.description as string).slice(0, 300) : '') ||
    ''
  return {
    id: `artic-${a.id}`,
    title: (a.title as string) || '無題',
    artist: (a.artist_title as string) || '作者不詳',
    year: (a.date_display as string) || '',
    location: [a.place_of_origin, 'Art Institute of Chicago'].filter(Boolean).join(' · '),
    thumbnailUrl: `https://www.artic.edu/iiif/2/${imageId}/full/400,/0/default.jpg`,
    imageUrl:    `https://www.artic.edu/iiif/2/${imageId}/full/1600,/0/default.jpg`,
    description: desc,
    sourceId: 'artic',
  }
}

export const ARTIC_ADAPTER: ArtApiAdapter = {
  id: 'artic',
  label: 'Art Institute of Chicago',
  shortLabel: 'ARTIC',
  async fetchBatch(effectiveQuery, page) {
    const keyword = effectiveQuery.trim() ||
      ARTIC_KEYWORDS[Math.floor(Math.random() * ARTIC_KEYWORDS.length)]
    const from = (page - 1) * PAGE_SIZE
    const url =
      `https://api.artic.edu/api/v1/artworks/search` +
      `?q=${encodeURIComponent(keyword)}` +
      `&fields=${ARTIC_FIELDS}&limit=${PAGE_SIZE}&from=${from}`
    const res = await fetch(url)
    if (!res.ok) throw new Error(`ARTIC ${res.status}`)
    const json = await res.json() as { data?: unknown[]; pagination?: { total?: number } }
    const artworks = ((json.data ?? []) as Record<string, unknown>[])
      .map(articToArtwork).filter((a): a is Artwork => a !== null)
    const total = json.pagination?.total ?? artworks.length
    return { artworks, hasMore: from + PAGE_SIZE < total }
  },
}

// ── 2. The Metropolitan Museum of Art ─────────────────────────────────────────

const MET_KEYWORDS = [
  'impressionist painting', 'renaissance portrait', 'baroque painting',
  'landscape oil painting', 'still life dutch', 'religious painting',
  'mythology painting', 'american painting', 'japanese art',
  'neoclassical figure', 'portrait oil', 'french masterpiece',
]

// Module-level cache so pagination can reuse the ID list across page changes
let _metCache: { query: string; ids: number[] } = { query: '__init__', ids: [] }

async function fetchMetObject(id: number): Promise<Artwork | null> {
  try {
    const res = await fetch(
      `https://collectionapi.metmuseum.org/public/collection/v1/objects/${id}`
    )
    if (!res.ok) return null
    const a = await res.json() as Record<string, unknown>
    if (!a.primaryImageSmall && !a.primaryImage) return null
    const thumb = (a.primaryImageSmall as string) || (a.primaryImage as string)
    const full = (a.primaryImage as string) || thumb
    return {
      id: `met-${a.objectID}`,
      title: (a.title as string) || '無題',
      artist: (a.artistDisplayName as string) || '作者不詳',
      year: (a.objectDate as string) || '',
      location: (a.repository as string) || 'The Metropolitan Museum of Art',
      thumbnailUrl: thumb,
      imageUrl: full,
      description: (a.objectDescription as string) ||
        (a.creditLine as string) || '',
      sourceId: 'met',
    }
  } catch { return null }
}

export const MET_ADAPTER: ArtApiAdapter = {
  id: 'met',
  label: 'The Metropolitan Museum of Art',
  shortLabel: 'The Met',
  async fetchBatch(effectiveQuery, page) {
    const keyword = effectiveQuery.trim() ||
      MET_KEYWORDS[Math.floor(Math.random() * MET_KEYWORDS.length)]
    const isHighlight = !effectiveQuery.trim()

    // Only re-fetch the ID list when the query changes
    if (keyword !== _metCache.query) {
      const params = new URLSearchParams({
        q: keyword,
        isPublicDomain: 'true',
        hasImages: 'true',
        medium: 'Paintings',
      })
      if (isHighlight) params.set('isHighlight', 'true')
      const res = await fetch(
        `https://collectionapi.metmuseum.org/public/collection/v1/search?${params}`
      )
      if (!res.ok) throw new Error(`Met search ${res.status}`)
      const json = await res.json() as { objectIDs?: number[] }
      _metCache = { query: keyword, ids: (json.objectIDs ?? []).slice(0, 200) }
    }

    const start = (page - 1) * PAGE_SIZE
    const pageIds = _metCache.ids.slice(start, start + PAGE_SIZE)
    const artworks = (await Promise.all(pageIds.map(fetchMetObject)))
      .filter((a): a is Artwork => a !== null)
    return { artworks, hasMore: start + PAGE_SIZE < _metCache.ids.length }
  },
}

// ── 3. Cleveland Museum of Art ────────────────────────────────────────────────

const CLEVELAND_KEYWORDS = [
  'portrait', 'landscape', 'religious', 'mythology',
  'impressionist', 'renaissance', 'baroque', 'still life', 'masterpiece',
]

function extractClevelandArtist(description: string): string {
  if (!description) return '作者不詳'
  // Format: "Last, First, Nationality, 1800-1900"  →  "Last, First"
  const parts = description.split(',').map(s => s.trim())
  if (parts.length >= 2 && !/\d/.test(parts[1])) return `${parts[0]}, ${parts[1]}`
  return parts[0] || description
}

function clevelandToArtwork(a: Record<string, unknown>): Artwork | null {
  const images = a.images as Record<string, { url?: string }> | null
  const thumbUrl = images?.web?.url
  if (!thumbUrl) return null
  const creators = (a.creators as Array<{ description?: string }> | null) ?? []
  const artist = extractClevelandArtist(creators[0]?.description ?? '')
  return {
    id: `cleveland-${a.id}`,
    title: (a.title as string) || '無題',
    artist,
    year: (a.creation_date as string) || '',
    location: [a.current_location, 'Cleveland Museum of Art'].filter(Boolean).join(' · '),
    thumbnailUrl: thumbUrl,
    imageUrl: images?.print?.url || thumbUrl,
    description: a.description
      ? stripHtml(a.description as string).slice(0, 300) : '',
    sourceId: 'cleveland',
  }
}

export const CLEVELAND_ADAPTER: ArtApiAdapter = {
  id: 'cleveland',
  label: 'Cleveland Museum of Art',
  shortLabel: 'Cleveland',
  async fetchBatch(effectiveQuery, page) {
    const keyword = effectiveQuery.trim() ||
      CLEVELAND_KEYWORDS[Math.floor(Math.random() * CLEVELAND_KEYWORDS.length)]
    const skip = (page - 1) * PAGE_SIZE
    const params = new URLSearchParams({
      has_image: '1',
      cc0: '1',
      type: 'Painting',
      limit: String(PAGE_SIZE),
      skip: String(skip),
    })
    if (keyword) params.set('q', keyword)
    const res = await fetch(
      `https://openaccess-api.clevelandart.org/api/artworks?${params}`
    )
    if (!res.ok) throw new Error(`Cleveland ${res.status}`)
    const json = await res.json() as { data?: unknown[]; info?: { total?: number } }
    const artworks = ((json.data ?? []) as Record<string, unknown>[])
      .map(clevelandToArtwork).filter((a): a is Artwork => a !== null)
    const total = json.info?.total ?? artworks.length
    return { artworks, hasMore: skip + PAGE_SIZE < total }
  },
}

// ── All registered API sources ────────────────────────────────────────────────
// To add a new source: push a new ArtApiAdapter to this array.

export const ART_SOURCES: ArtApiAdapter[] = [
  ARTIC_ADAPTER,
  MET_ADAPTER,
  CLEVELAND_ADAPTER,
  // RIJKS_ADAPTER,   // 未來: Rijksmuseum (需要免費 API Key)
  // HARVARD_ADAPTER, // 未來: Harvard Art Museums (需要免費 API Key)
]

// ── UI sub-components ─────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="rounded-lg overflow-hidden border border-border bg-card animate-pulse">
      <div className="aspect-[3/4] bg-muted" />
      <div className="p-2 space-y-1.5">
        <div className="h-3 bg-muted rounded w-4/5" />
        <div className="h-2.5 bg-muted rounded w-3/5" />
        <div className="h-2.5 bg-muted rounded w-2/5" />
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

interface MasterworkPickerModalProps {
  open: boolean
  onClose: () => void
  onSelectImage: (imageUrl: string, title: string) => void
}

export function MasterworkPickerModal({
  open,
  onClose,
  onSelectImage,
}: MasterworkPickerModalProps) {
  const [activeSourceId, setActiveSourceId] = useState(ART_SOURCES[0].id)
  const [activeCategoryId, setActiveCategoryId] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [artworks, setArtworks] = useState<Artwork[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [page, setPage] = useState(1)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<Artwork | null>(null)

  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fetchVersionRef = useRef(0)

  const getSource = useCallback(
    (id: string) => ART_SOURCES.find(s => s.id === id) ?? ART_SOURCES[0],
    []
  )

  // ── Fetch page 1 fresh ──────────────────────────────────────────────────────
  const fetchFresh = useCallback(async (
    sourceId: string,
    search: string,
    categoryId: string,
  ) => {
    const version = ++fetchVersionRef.current
    setLoading(true)
    setError(null)
    setSelected(null)
    setArtworks([])
    setHasMore(false)
    setPage(1)
    try {
      const query = buildEffectiveQuery(search, categoryId)
      const { artworks: result, hasMore: more } =
        await getSource(sourceId).fetchBatch(query, 1)
      if (fetchVersionRef.current !== version) return
      setArtworks(result)
      setHasMore(more)
    } catch {
      if (fetchVersionRef.current !== version) return
      setError('載入失敗，請檢查網路後再試')
    } finally {
      if (fetchVersionRef.current === version) setLoading(false)
    }
  }, [getSource])

  // ── Load more ───────────────────────────────────────────────────────────────
  const fetchMore = useCallback(async () => {
    if (!hasMore || loadingMore) return
    setLoadingMore(true)
    try {
      const nextPage = page + 1
      const query = buildEffectiveQuery(searchQuery, activeCategoryId)
      const { artworks: result, hasMore: more } =
        await getSource(activeSourceId).fetchBatch(query, nextPage)
      setArtworks(prev => [...prev, ...result])
      setHasMore(more)
      setPage(nextPage)
    } catch {
      // silently ignore
    } finally {
      setLoadingMore(false)
    }
  }, [activeSourceId, searchQuery, activeCategoryId, hasMore, loadingMore, page, getSource])

  // ── Fetch when modal opens, source, or category changes ────────────────────
  useEffect(() => {
    if (!open) return
    fetchFresh(activeSourceId, searchQuery, activeCategoryId)
    // intentionally not including searchQuery — handled by debounce
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, activeSourceId, activeCategoryId])

  // ── Event handlers ──────────────────────────────────────────────────────────
  const handleSourceChange = useCallback((id: string) => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    setActiveSourceId(id)
    setActiveCategoryId('')
    setSearchQuery('')
  }, [])

  const handleCategoryChange = useCallback((id: string) => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    setActiveCategoryId(id)
  }, [])

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value)
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    searchDebounceRef.current = setTimeout(() => {
      fetchFresh(activeSourceId, value, activeCategoryId)
    }, 600)
  }, [activeSourceId, activeCategoryId, fetchFresh])

  const handleRefresh = useCallback(() => {
    fetchFresh(activeSourceId, searchQuery, activeCategoryId)
  }, [activeSourceId, searchQuery, activeCategoryId, fetchFresh])

  const handleUseArtwork = useCallback((artwork: Artwork) => {
    onSelectImage(artwork.imageUrl, artwork.title)
    onClose()
  }, [onSelectImage, onClose])

  if (!open) return null

  const activeSource = getSource(activeSourceId)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="relative flex flex-col bg-card border border-border rounded-xl shadow-2xl w-full max-w-5xl overflow-hidden"
        style={{ height: 'min(90vh, 820px)' }}
      >
        {/* ── Header ── */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border flex-shrink-0">
          <span className="text-base font-bold">名畫庫</span>
          <span className="text-xs text-muted-foreground hidden sm:inline">
            — 公版名畫 · 可商業使用
          </span>
          <div className="flex items-center gap-2 ml-auto">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <Input
                className="pl-8 h-8 w-44 text-xs"
                placeholder="搜尋畫作 / 藝術家..."
                value={searchQuery}
                onChange={e => handleSearchChange(e.target.value)}
              />
            </div>
            <Button
              variant="ghost" size="icon" className="h-8 w-8"
              title="重新整理" onClick={handleRefresh} disabled={loading}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* ── Source tabs ── */}
        <div className="flex border-b border-border flex-shrink-0 px-1 bg-muted/30">
          {ART_SOURCES.map(src => (
            <button
              key={src.id}
              onClick={() => handleSourceChange(src.id)}
              className={`px-3 py-2 text-xs font-medium transition-colors border-b-2 -mb-px whitespace-nowrap
                ${activeSourceId === src.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'}`}
            >
              {src.shortLabel}
            </button>
          ))}
        </div>

        {/* ── Category pills ── */}
        <div className="flex items-center gap-1.5 px-3 py-2 border-b border-border overflow-x-auto flex-shrink-0 scrollbar-none">
          {ART_CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => handleCategoryChange(cat.id)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-colors flex-shrink-0
                ${activeCategoryId === cat.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'}`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* ── Body ── */}
        <div className="flex flex-1 overflow-hidden min-h-0">

          {/* Grid column */}
          <div className={`flex flex-col overflow-hidden ${selected ? 'hidden sm:flex sm:w-[58%] lg:w-[62%]' : 'w-full'}`}>
            <div className="flex-1 overflow-y-auto p-3">
              {error && (
                <div className="flex items-center justify-center h-32 text-sm text-destructive">{error}</div>
              )}
              {loading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {Array.from({ length: 12 }).map((_, i) => <SkeletonCard key={i} />)}
                </div>
              ) : artworks.length === 0 && !error ? (
                <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
                  找不到相關畫作
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {artworks.map(artwork => (
                    <button
                      key={artwork.id}
                      onClick={() => setSelected(artwork)}
                      className={`group rounded-lg overflow-hidden border text-left transition-all
                        hover:shadow-md hover:border-primary focus:outline-none
                        focus-visible:ring-2 focus-visible:ring-primary
                        ${selected?.id === artwork.id
                          ? 'border-primary ring-2 ring-primary shadow-md'
                          : 'border-border'}`}
                    >
                      <div className="aspect-[3/4] bg-muted overflow-hidden">
                        <img
                          src={artwork.thumbnailUrl}
                          alt={artwork.title}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={e => { (e.target as HTMLImageElement).style.visibility = 'hidden' }}
                        />
                      </div>
                      <div className="p-2">
                        <p className="text-xs font-medium leading-tight line-clamp-2">{artwork.title}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{artwork.artist}</p>
                        {artwork.year && (
                          <p className="text-[10px] text-muted-foreground">{artwork.year}</p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Load more */}
              {hasMore && !loading && (
                <div className="flex justify-center pt-4 pb-2">
                  <Button
                    variant="outline" size="sm"
                    onClick={fetchMore}
                    disabled={loadingMore}
                    className="text-xs gap-2"
                  >
                    {loadingMore
                      ? <><RefreshCw className="h-3.5 w-3.5 animate-spin" />載入中...</>
                      : '載入更多'}
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* ── Detail panel ── */}
          {selected && (
            <div className="w-full sm:w-[42%] lg:w-[38%] border-l border-border flex flex-col overflow-hidden">
              {/* Back button (mobile only) */}
              <div className="flex items-center px-3 py-2 border-b border-border sm:hidden flex-shrink-0">
                <Button
                  variant="ghost" size="sm"
                  className="h-7 gap-1 text-xs"
                  onClick={() => setSelected(null)}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />返回列表
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 min-h-0">
                {/* Preview image */}
                <div
                  className="rounded-lg overflow-hidden bg-muted flex-shrink-0 flex items-center justify-center"
                  style={{ maxHeight: '240px' }}
                >
                  <img
                    src={selected.thumbnailUrl}
                    alt={selected.title}
                    className="w-full object-contain"
                    style={{ maxHeight: '240px' }}
                  />
                </div>

                {/* Metadata */}
                <div>
                  <h3 className="text-sm font-bold leading-snug">{selected.title}</h3>
                  <div className="mt-2 space-y-1.5 text-xs">
                    <div className="flex items-start gap-1.5 text-muted-foreground">
                      <User className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                      <span>{selected.artist}</span>
                    </div>
                    {selected.year && (
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
                        <span>{selected.year}</span>
                      </div>
                    )}
                    {selected.location && (
                      <div className="flex items-start gap-1.5 text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                        <span>{selected.location}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Description */}
                {selected.description && (
                  <p className="text-xs text-muted-foreground leading-relaxed border-t border-border pt-3">
                    {selected.description}
                  </p>
                )}

                {/* Source credit */}
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground border-t border-border pt-2">
                  <Database className="h-3 w-3 flex-shrink-0" />
                  <span>
                    資料來源：{ART_SOURCES.find(s => s.id === selected.sourceId)?.label ?? selected.sourceId}
                  </span>
                </div>
              </div>

              {/* Action button */}
              <div className="p-3 border-t border-border flex-shrink-0">
                <Button className="w-full" size="sm" onClick={() => handleUseArtwork(selected)}>
                  使用此畫作為底圖
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="px-4 py-2 border-t border-border flex-shrink-0 flex items-center justify-between flex-wrap gap-1">
          <span className="text-[10px] text-muted-foreground">
            目前來源：{activeSource.label}　｜　所有畫作均為公版授權，可免費商業使用
          </span>
        </div>
      </div>
    </div>
  )
}

