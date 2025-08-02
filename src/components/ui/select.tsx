import * as React from "react"
import { cn } from "@/lib/utils"

interface SelectProps {
  value?: string
  onValueChange?: (value: string) => void
  children: React.ReactNode
}

interface SelectTriggerProps {
  className?: string
  children: React.ReactNode
}

interface SelectContentProps {
  children: React.ReactNode
}

interface SelectItemProps {
  value: string
  children: React.ReactNode
}

const Select = ({ value, onValueChange, children }: SelectProps) => {
  return (
    <div className="relative">
      {children}
    </div>
  )
}

const SelectTrigger = React.forwardRef<HTMLButtonElement, SelectTriggerProps>(
  ({ className, children, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "flex h-10 w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
        className
      )}
      {...props}
    >
      {children}
      <svg className="h-4 w-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </button>
  )
)
SelectTrigger.displayName = "SelectTrigger"

const SelectContent = ({ children }: SelectContentProps) => {
  return (
    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
      {children}
    </div>
  )
}

const SelectItem = ({ value, children }: SelectItemProps) => {
  return (
    <div className="px-3 py-2 text-sm hover:bg-gray-100 cursor-pointer">
      {children}
    </div>
  )
}

const SelectValue = ({ children }: { children: React.ReactNode }) => {
  return <span>{children}</span>
}

export {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} 