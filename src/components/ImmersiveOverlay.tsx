import CanvasEditor from '@/components/canvas/CanvasEditor'
import { X } from 'lucide-react'

type CanvasEditorProps = React.ComponentPropsWithoutRef<typeof CanvasEditor>

interface ImmersiveOverlayProps {
  isLeaving: boolean
  onClose: () => void
  canvasEditorProps: CanvasEditorProps
}

export function ImmersiveOverlay({ isLeaving, onClose, canvasEditorProps }: ImmersiveOverlayProps) {
  return (
    <div className={`${isLeaving ? 'immersive-leave' : 'immersive-enter'} fixed inset-0 z-[95] bg-black/90 flex items-center justify-center`}>
      {/* Close button */}
      <button
        className="absolute top-4 right-4 z-10 h-9 w-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
        onClick={onClose}
        title="離開沉浸式定位 (Esc)"
      >
        <X className="h-5 w-5" />
      </button>

      {/* 9:16 canvas container */}
      <div
        className={`${isLeaving ? 'immersive-canvas-leave' : 'immersive-canvas-enter'} relative rounded-2xl overflow-hidden border border-white/10`}
        style={{
          aspectRatio: '9 / 16',
          maxHeight: 'calc(100vh - 32px)',
          maxWidth: 'calc(100vw - 32px)',
        }}
      >
        <CanvasEditor {...canvasEditorProps} />
      </div>
    </div>
  )
}
