import { useState } from 'react'
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu'
import { ChevronDown, Download, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { BackgroundSettings, CameraPoint } from '@/types'
import { drawCaption, drawOutputBackground, getAllCaptions } from '@/lib/canvas'
import { OUTPUT_H, OUTPUT_W, getTodayString, sanitizeFileName } from '@/lib/utils'

type ScreenDownloadSize = 'portrait-4-5' | 'square-1-1' | 'original'

interface ScreenDownloadProps {
  image: HTMLImageElement | null
  points: CameraPoint[]
  backgroundSettings: BackgroundSettings
  projectName: string
  disabled?: boolean
}

const SCREEN_DOWNLOAD_SIZES: Record<ScreenDownloadSize, { label: string; width: number; height: number }> = {
  'portrait-4-5': { label: '4:5（直式）1080×1350', width: 1080, height: 1350 },
  'square-1-1': { label: '1:1（正方形）1080×1080', width: 1080, height: 1080 },
  original: { label: '原本 canvas 原尺寸', width: OUTPUT_W, height: OUTPUT_H },
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[i] = c >>> 0
  }
  return table
})()

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff
  for (let i = 0; i < bytes.length; i++) crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function dosDateTime(date: Date) {
  const time = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2)
  const dosDate = ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate()
  return { time, date: dosDate }
}

function writeU16(view: DataView, offset: number, value: number) {
  view.setUint16(offset, value, true)
}

function writeU32(view: DataView, offset: number, value: number) {
  view.setUint32(offset, value >>> 0, true)
}

function concatBytes(parts: Uint8Array[]) {
  const size = parts.reduce((sum, part) => sum + part.length, 0)
  const result = new Uint8Array(size)
  let offset = 0
  parts.forEach(part => {
    result.set(part, offset)
    offset += part.length
  })
  return result
}

function makeZip(files: { path: string; bytes: Uint8Array }[]) {
  const encoder = new TextEncoder()
  const now = dosDateTime(new Date())
  const localParts: Uint8Array[] = []
  const centralParts: Uint8Array[] = []
  let offset = 0

  files.forEach(file => {
    const name = encoder.encode(file.path)
    const crc = crc32(file.bytes)

    const local = new Uint8Array(30 + name.length)
    const localView = new DataView(local.buffer)
    writeU32(localView, 0, 0x04034b50)
    writeU16(localView, 4, 20)
    writeU16(localView, 6, 0x0800)
    writeU16(localView, 8, 0)
    writeU16(localView, 10, now.time)
    writeU16(localView, 12, now.date)
    writeU32(localView, 14, crc)
    writeU32(localView, 18, file.bytes.length)
    writeU32(localView, 22, file.bytes.length)
    writeU16(localView, 26, name.length)
    writeU16(localView, 28, 0)
    local.set(name, 30)
    localParts.push(local, file.bytes)

    const central = new Uint8Array(46 + name.length)
    const centralView = new DataView(central.buffer)
    writeU32(centralView, 0, 0x02014b50)
    writeU16(centralView, 4, 20)
    writeU16(centralView, 6, 20)
    writeU16(centralView, 8, 0x0800)
    writeU16(centralView, 10, 0)
    writeU16(centralView, 12, now.time)
    writeU16(centralView, 14, now.date)
    writeU32(centralView, 16, crc)
    writeU32(centralView, 20, file.bytes.length)
    writeU32(centralView, 24, file.bytes.length)
    writeU16(centralView, 28, name.length)
    writeU16(centralView, 30, 0)
    writeU16(centralView, 32, 0)
    writeU16(centralView, 34, 0)
    writeU16(centralView, 36, 0)
    writeU32(centralView, 38, 0)
    writeU32(centralView, 42, offset)
    central.set(name, 46)
    centralParts.push(central)

    offset += local.length + file.bytes.length
  })

  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0)
  const end = new Uint8Array(22)
  const endView = new DataView(end.buffer)
  writeU32(endView, 0, 0x06054b50)
  writeU16(endView, 4, 0)
  writeU16(endView, 6, 0)
  writeU16(endView, 8, files.length)
  writeU16(endView, 10, files.length)
  writeU32(endView, 12, centralSize)
  writeU32(endView, 16, offset)
  writeU16(endView, 20, 0)

  return new Blob([concatBytes([...localParts, ...centralParts, end])], { type: 'application/zip' })
}

function getCameraSourceRect(image: HTMLImageElement, point: CameraPoint, outputRatio: number) {
  const naturalRatio = image.width / image.height
  let baseW: number
  let baseH: number
  if (naturalRatio > outputRatio) {
    baseW = image.width
    baseH = baseW / outputRatio
  } else {
    baseH = image.height
    baseW = baseH * outputRatio
  }
  const sw = baseW / point.zoom
  const sh = baseH / point.zoom
  return {
    sx: point.x * image.width - sw / 2,
    sy: point.y * image.height - sh / 2,
    sw,
    sh,
  }
}

function drawScreen(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  point: CameraPoint,
  backgroundSettings: BackgroundSettings
) {
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('無法取得 canvas context')
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  drawOutputBackground(canvas, ctx, image, backgroundSettings)

  const src = getCameraSourceRect(image, point, canvas.width / canvas.height)
  const ix = Math.max(0, src.sx)
  const iy = Math.max(0, src.sy)
  const ix2 = Math.min(image.width, src.sx + src.sw)
  const iy2 = Math.min(image.height, src.sy + src.sh)
  const iw = ix2 - ix
  const ih = iy2 - iy

  if (iw > 0 && ih > 0) {
    const dx = ((ix - src.sx) / src.sw) * canvas.width
    const dy = ((iy - src.sy) / src.sh) * canvas.height
    const dw = (iw / src.sw) * canvas.width
    const dh = (ih / src.sh) * canvas.height
    ctx.drawImage(image, ix, iy, iw, ih, dx, dy, dw, dh)
  }

  getAllCaptions(point).forEach(cap => {
    drawCaption(canvas, ctx, cap, false, { x: false, y: false })
  })
}

function canvasToPngBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(blob => {
      if (blob) resolve(blob)
      else reject(new Error('PNG 產生失敗'))
    }, 'image/png')
  })
}

export default function ScreenDownload({
  image,
  points,
  backgroundSettings,
  projectName,
  disabled = false,
}: ScreenDownloadProps) {
  const [isDownloading, setIsDownloading] = useState(false)

  const downloadScreens = async (sizeKey: ScreenDownloadSize) => {
    if (!image || !points.length || isDownloading) return
    setIsDownloading(true)
    try {
      const size = SCREEN_DOWNLOAD_SIZES[sizeKey]
      const canvas = document.createElement('canvas')
      canvas.width = size.width
      canvas.height = size.height
      const baseName = sanitizeFileName(projectName)
      const folderName = `${baseName}-${size.width}x${size.height}`
      const files = []

      for (let i = 0; i < points.length; i++) {
        drawScreen(canvas, image, points[i], backgroundSettings)
        const blob = await canvasToPngBlob(canvas)
        files.push({
          path: `${folderName}/${baseName}-${String(i + 1).padStart(2, '0')}.png`,
          bytes: new Uint8Array(await blob.arrayBuffer()),
        })
      }

      const zip = makeZip(files)
      const url = URL.createObjectURL(zip)
      const a = document.createElement('a')
      a.href = url
      a.download = `${folderName}-${getTodayString()}.zip`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('[screenDownload]', err)
      alert('鏡頭圖片下載失敗，請打開 Console 查看錯誤。')
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <DropdownMenuPrimitive.Root>
      <DropdownMenuPrimitive.Trigger asChild>
        <Button size="sm" variant="outline" disabled={disabled || !image || !points.length || isDownloading}>
          {isDownloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
          <span className="hidden sm:inline">下載畫面</span>
          <ChevronDown className="h-3 w-3 ml-0.5" />
        </Button>
      </DropdownMenuPrimitive.Trigger>
      <DropdownMenuPrimitive.Portal>
        <DropdownMenuPrimitive.Content
          align="end"
          sideOffset={4}
          className="z-50 min-w-[210px] rounded-md border border-border bg-popover p-1 shadow-md animate-in fade-in-0 zoom-in-95"
        >
          {(Object.entries(SCREEN_DOWNLOAD_SIZES) as [ScreenDownloadSize, typeof SCREEN_DOWNLOAD_SIZES[ScreenDownloadSize]][]).map(([key, size]) => (
            <DropdownMenuPrimitive.Item
              key={key}
              className="cursor-pointer rounded px-3 py-1.5 text-sm outline-none select-none hover:bg-accent focus:bg-accent"
              onSelect={() => void downloadScreens(key)}
            >
              {size.label}
            </DropdownMenuPrimitive.Item>
          ))}
        </DropdownMenuPrimitive.Content>
      </DropdownMenuPrimitive.Portal>
    </DropdownMenuPrimitive.Root>
  )
}