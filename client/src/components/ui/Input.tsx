import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-12 w-full rounded-2xl border-2 border-white/50 bg-white/70 px-4 py-2 text-lg font-medium shadow-inner transition-all",
          "placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-200 focus-visible:border-sky-400 focus-visible:bg-white",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
