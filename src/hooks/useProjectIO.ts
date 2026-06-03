import { useCallback, useState } from 'react'
import { useAppStore, normalizePoint } from '@/hooks/useAppStore'
import type { CameraPoint, ActiveTab } from '@/types'
import { OUTPUT_W, OUTPUT_H, clamp, normalizeProjectName, sanitizeFileName, getTodayString } from '@/lib/utils'

export function useProjectIO(triggerRedraw: () => void) {
  const store = useAppStore()
  const [loadingPainting, setLoadingPainting] = useState(false)

  /** 從 URL 載入畫作到 canvas（名畫庫使用） */
  const loadImageFromUrl = useCallback(async (url: string, title: string) => {
    setLoadingPainting(true)
    try {
      const safeUrl = url.replace(/^http:\/\//, 'https://')
      let blob: Blob | undefined

      // 1st attempt: direct fetch (works for CORS-enabled servers e.g. ARTIC IIIF)
      try {
        const res = await fetch(safeUrl)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        blob = await res.blob()
      } catch {
        // 2nd attempt: images.weserv.nl — dedicated image proxy with CORS headers
        const proxyUrl = `https://images.weserv.nl/?url=${encodeURIComponent(safeUrl)}&w=1600&output=jpg`
        const res2 = await fetch(proxyUrl)
        if (!res2.ok) throw new Error(`proxy HTTP ${res2.status}`)
        blob = await res2.blob()
      }

      const ext = safeUrl.split('.').pop()?.split('?')[0]?.toLowerCase() ?? 'jpg'
      const file = new File([blob], `${title}.${ext}`, { type: blob.type || 'image/jpeg' })
      store.loadImageFile(file, !store.image, store.imageUrl)
    } catch (err) {
      console.error('[loadImageFromUrl]', err)
      alert('載入名畫失敗，請稍後再試')
    } finally {
      setLoadingPainting(false)
    }
  }, [store])

  const saveProject = useCallback(async () => {
    try {
      const name = normalizeProjectName(store.projectName)
      let imageDataUrl: string | null = null
      if (store.image) {
        const tmp = document.createElement('canvas')
        tmp.width = store.image.width; tmp.height = store.image.height
        tmp.getContext('2d')!.drawImage(store.image, 0, 0)
        imageDataUrl = tmp.toDataURL('image/png')
      }
      const project = {
        app: 'auto-art-camera-tour', version: 1, name,
        savedAt: new Date().toISOString(),
        output: { width: OUTPUT_W, height: OUTPUT_H, ratio: '9:16' },
        image: imageDataUrl ? { dataUrl: imageDataUrl, width: store.image!.width, height: store.image!.height } : null,
        backgroundSettings: store.backgroundSettings,
        activeIndex: store.activeIndex,
        activeTab: store.activeTab,
        points: store.points,
      }
      const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = `${sanitizeFileName(name)}-${getTodayString()}.json`
      document.body.appendChild(a); a.click(); a.remove()
      URL.revokeObjectURL(url)
    } catch (err) { console.error(err); alert('保存失敗') }
  }, [store])

  const loadProject = useCallback(async (file: File) => {
    try {
      const text = await file.text()
      const project = JSON.parse(text)
      if (project.app !== 'auto-art-camera-tour') throw new Error('不是正確的專案檔')
      store.setProjectName(normalizeProjectName(project.name || '未命名專案'))
      store.setBackgroundSettings({
        mode: project.backgroundSettings?.mode === 'blur' ? 'blur' : 'color',
        color: project.backgroundSettings?.color || '#111827',
        blur: clamp(Number(project.backgroundSettings?.blur ?? 18), 0, 50),
      })
      const pts: CameraPoint[] = Array.isArray(project.points)
        ? project.points.map(normalizePoint) : []
      store.setPoints(pts)
      const ai = clamp(Number(project.activeIndex ?? -1), -1, Math.max(-1, pts.length - 1))
      store.setActiveIndex(ai)
      const tab: ActiveTab = ['camera', 'caption', 'assist'].includes(project.activeTab) ? project.activeTab : 'camera'
      store.setActiveTab(tab)
      if (project.image?.dataUrl) store.loadImageDataUrl(project.image.dataUrl)
      else triggerRedraw()
    } catch (err) { console.error(err); alert('載入失敗：請確認檔案正確') }
  }, [store, triggerRedraw])

  return { loadingPainting, loadImageFromUrl, saveProject, loadProject }
}
