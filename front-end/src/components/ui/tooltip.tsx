"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

// Simple tooltip implementation without Radix UI
interface TooltipProps {
  children: React.ReactNode
  content: React.ReactNode
  className?: string
}

const TooltipProvider = ({ children }: { children: React.ReactNode }) => (
  <>{children}</>
)

const Tooltip = ({ children, content, className }: TooltipProps) => {
  const [isVisible, setIsVisible] = React.useState(false)
  
  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
      >
        {children}
      </div>
      {isVisible && (
        <div
          className={cn(
            "absolute z-50 px-3 py-1.5 text-sm text-white bg-gray-900 rounded-md shadow-lg -top-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap",
            className
          )}
        >
          {content}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" />
        </div>
      )}
    </div>
  )
}

const TooltipTrigger = ({ children }: { children: React.ReactNode }) => (
  <>{children}</>
)

const TooltipContent = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={className}>{children}</div>
)

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }