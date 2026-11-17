import { NotebookText, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { CarouselNotes } from '@/types'

interface CarouselNotesPanelProps {
  notes: CarouselNotes
  onClose: () => void
}

/** AI 解析筆記：輪播模式的左欄，跟右側字幕編輯並排，邊看邊改。內容只給創作者，不放進圖片。 */
export function CarouselNotesPanel({ notes, onClose }: CarouselNotesPanelProps) {
  return (
    <aside className="w-full lg:w-80 flex-shrink-0 rounded-2xl border border-border bg-card flex flex-col overflow-hidden max-h-[70vh] lg:max-h-none">
      <div className="p-3 border-b border-border flex items-center justify-between flex-shrink-0">
        <h2 className="text-[13px] font-semibold flex items-center gap-1.5">
          <NotebookText className="h-4 w-4 text-primary" />AI 解析筆記
        </h2>
        <Button variant="ghost" size="icon" className="h-7 w-7" title="關閉筆記" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-3 flex flex-col gap-2 text-xs leading-relaxed select-text">
        {notes.plan && (
          <details open className="rounded-lg border border-border bg-muted/30 p-3">
            <summary className="font-medium cursor-pointer">敘事企劃</summary>
            <p className="mt-2 whitespace-pre-wrap">{notes.plan}</p>
          </details>
        )}
        {notes.research && (
          <details open className="rounded-lg border border-border bg-muted/30 p-3">
            <summary className="font-medium cursor-pointer">審核資料（史實／傳說／詮釋）</summary>
            <p className="mt-2 whitespace-pre-wrap text-muted-foreground">{notes.research}</p>
          </details>
        )}
        {notes.sources.length > 0 && (
          <details open className="rounded-lg border border-border bg-muted/30 p-3">
            <summary className="font-medium cursor-pointer">參考來源</summary>
            <ul className="mt-2 flex flex-col gap-1.5">
              {notes.sources.map((source, i) => (
                <li key={i}>
                  {/* 網址來自模型輸出，只接受 http(s) 才做成連結 */}
                  {/^https?:\/\//i.test(source.url)
                    ? <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">{source.name}</a>
                    : source.name}
                  {source.note && <span className="text-muted-foreground">：{source.note}</span>}
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </aside>
  )
}
