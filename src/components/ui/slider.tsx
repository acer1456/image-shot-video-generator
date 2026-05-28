import * as React from "react"
import { cn } from "@/lib/utils"

interface SliderProps {
  value: number
  min: number
  max: number
  step: number
  onChange: (value: number) => void
  className?: string
  disabled?: boolean
}

const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
  ({ value, min, max, step, onChange, className, disabled }, ref) => {
    return (
      <input
        ref={ref}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={e => onChange(Number(e.target.value))}
        className={cn(
          "w-full h-2 accent-primary cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed",
          className
        )}
      />
    )
  }
)
Slider.displayName = "Slider"

export { Slider }
