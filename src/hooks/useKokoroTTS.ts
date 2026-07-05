import { useRef, useState, useCallback } from 'react'

export interface GeneratedSegment {
  id: string
  text: string
  audioData: Float32Array
  samplingRate: number
  duration: number
}

export type TtsStatus =
  | { phase: 'idle' }
  | { phase: 'loading_model'; progress: number; message: string }
  | { phase: 'generating'; segIndex: number; total: number }
  | { phase: 'done' }
  | { phase: 'error'; message: string }

// Split text into sentences for per-segment generation
export function splitIntoSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?。！？])\s+|(?<=[.!?。！？])$/)
    .map(s => s.trim())
    .filter(s => s.length > 0)
}

// Yield to the main thread so the browser can repaint between ONNX calls
function yieldToMain(): Promise<void> {
  // Use scheduler.yield() when available (Chrome 115+), else fall back to setTimeout
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (typeof (globalThis as any).scheduler?.yield === 'function') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (globalThis as any).scheduler.yield()
  }
  return new Promise(resolve => setTimeout(resolve, 0))
}

export function useKokoroTTS() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const modelRef = useRef<any>(null)
  const [status, setStatus] = useState<TtsStatus>({ phase: 'idle' })
  const cancelRef = useRef(false)

  const generate = useCallback(
    async (
      sentences: string[],
      voice: string,
      onSegment?: (seg: GeneratedSegment, index: number) => void,
    ): Promise<GeneratedSegment[] | null> => {
      cancelRef.current = false

      // ── 1. Load model (once) ──────────────────────────────────────────
      if (!modelRef.current) {
        try {
          setStatus({ phase: 'loading_model', progress: 0, message: '載入模型中…' })

          // Import KokoroTTS from kokoro-js (ESM-only, lazy-loaded)
          const { KokoroTTS } = await import('kokoro-js')

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const progressCallback = (p: any) => {
            if (p.status === 'progress' || p.status === 'downloading') {
              const pct = Math.round((p.loaded ?? 0) / Math.max(1, p.total ?? 1) * 100)
              setStatus({ phase: 'loading_model', progress: pct, message: `下載模型 ${p.file ?? ''}… ${pct}%` })
            } else if (p.status === 'loading') {
              setStatus({ phase: 'loading_model', progress: 99, message: '初始化模型中…' })
            }
          }

          modelRef.current = await KokoroTTS.from_pretrained(
            'onnx-community/Kokoro-82M-v1.0-ONNX',
            { dtype: 'q8', progress_callback: progressCallback }
          )
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          setStatus({ phase: 'error', message: `模型載入失敗：${msg}` })
          return null
        }
      }

      // ── 2. Generate audio per sentence ───────────────────────────────
      const results: GeneratedSegment[] = []

      for (let i = 0; i < sentences.length; i++) {
        if (cancelRef.current) break
        setStatus({ phase: 'generating', segIndex: i, total: sentences.length })

        // Yield before each inference so React can flush state + browser can repaint
        await yieldToMain()

        if (cancelRef.current) break

        try {
          const output = await modelRef.current.generate(sentences[i], { voice })
          // RawAudio has .audio (Float32Array) and .sampling_rate
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const rawAudio = output as any
          const audioData = (rawAudio.audio ?? rawAudio) as Float32Array
          const samplingRate = (rawAudio.sampling_rate as number) ?? 24000
          const duration = audioData.length / samplingRate
          const seg: GeneratedSegment = {
            id: `seg-${Date.now()}-${i}`,
            text: sentences[i],
            audioData,
            samplingRate,
            duration,
          }
          results.push(seg)
          // Notify caller immediately so the card appears before next inference starts
          onSegment?.(seg, i)

          // Yield again after inference to let React commit the new card
          await yieldToMain()
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          setStatus({ phase: 'error', message: `生成第 ${i + 1} 段失敗：${msg}` })
          return null
        }
      }

      setStatus({ phase: 'done' })
      return cancelRef.current ? null : results
    },
    []
  )

  const cancel = useCallback(() => {
    cancelRef.current = true
    setStatus({ phase: 'idle' })
  }, [])

  const resetStatus = useCallback(() => {
    setStatus({ phase: 'idle' })
  }, [])

  return { generate, status, cancel, resetStatus }
}
