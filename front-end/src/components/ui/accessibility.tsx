"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

// Skip links for keyboard navigation
interface SkipLinksProps {
  links?: Array<{
    href: string
    label: string
  }>
}

export const SkipLinks: React.FC<SkipLinksProps> = ({ 
  links = [
    { href: "#main-content", label: "Skip to main content" },
    { href: "#navigation", label: "Skip to navigation" }
  ]
}) => (
  <div className="sr-only focus-within:not-sr-only">
    <div className="fixed top-0 left-0 z-50 bg-blue-600 text-white p-2 space-x-2">
      {links.map((link, index) => (
        <a
          key={index}
          href={link.href}
          className="underline hover:no-underline focus:outline-none focus:ring-2 focus:ring-white"
        >
          {link.label}
        </a>
      ))}
    </div>
  </div>
)

// Screen reader only text
interface ScreenReaderOnlyProps extends React.HTMLAttributes<HTMLSpanElement> {}

export const ScreenReaderOnly = React.forwardRef<HTMLSpanElement, ScreenReaderOnlyProps>(
  ({ className, ...props }, ref) => (
    <span
      ref={ref}
      className={cn("sr-only", className)}
      {...props}
    />
  )
)
ScreenReaderOnly.displayName = "ScreenReaderOnly"

// Accessible heading with proper hierarchy
interface AccessibleHeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {
  level: 1 | 2 | 3 | 4 | 5 | 6
  visualLevel?: 1 | 2 | 3 | 4 | 5 | 6
}

export const AccessibleHeading = React.forwardRef<HTMLHeadingElement, AccessibleHeadingProps>(
  ({ level, visualLevel, className, ...props }, ref) => {
    const Tag = `h${level}` as keyof JSX.IntrinsicElements
    
    const visualClasses = {
      1: "text-4xl font-bold",
      2: "text-3xl font-bold", 
      3: "text-2xl font-semibold",
      4: "text-xl font-semibold",
      5: "text-lg font-medium",
      6: "text-base font-medium"
    }

    return (
      <Tag
        ref={ref as any}
        className={cn(
          visualClasses[visualLevel || level],
          className
        )}
        {...props}
      />
    )
  }
)
AccessibleHeading.displayName = "AccessibleHeading"

// Focus trap for modals and dialogs
interface FocusTrapProps {
  children: React.ReactNode
  enabled?: boolean
  restoreFocus?: boolean
}

export const FocusTrap: React.FC<FocusTrapProps> = ({ 
  children, 
  enabled = true,
  restoreFocus = true 
}) => {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const previousActiveElement = React.useRef<HTMLElement | null>(null)

  React.useEffect(() => {
    if (!enabled) return

    // Store the previously focused element
    previousActiveElement.current = document.activeElement as HTMLElement

    const container = containerRef.current
    if (!container) return

    // Get all focusable elements
    const getFocusableElements = () => {
      return container.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      ) as NodeListOf<HTMLElement>
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return

      const focusableElements = getFocusableElements()
      if (focusableElements.length === 0) return

      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]

      if (event.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          event.preventDefault()
          lastElement.focus()
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          event.preventDefault()
          firstElement.focus()
        }
      }
    }

    // Focus the first focusable element
    const focusableElements = getFocusableElements()
    if (focusableElements.length > 0) {
      focusableElements[0].focus()
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      
      // Restore focus to the previously focused element
      if (restoreFocus && previousActiveElement.current) {
        previousActiveElement.current.focus()
      }
    }
  }, [enabled, restoreFocus])

  if (!enabled) {
    return <>{children}</>
  }

  return (
    <div ref={containerRef}>
      {children}
    </div>
  )
}

// Accessible status announcements
interface StatusAnnouncementProps {
  message: string
  priority?: "polite" | "assertive"
  clearAfter?: number
}

export const StatusAnnouncement: React.FC<StatusAnnouncementProps> = ({
  message,
  priority = "polite",
  clearAfter = 5000
}) => {
  const [currentMessage, setCurrentMessage] = React.useState(message)

  React.useEffect(() => {
    setCurrentMessage(message)
    
    if (clearAfter > 0) {
      const timer = setTimeout(() => {
        setCurrentMessage("")
      }, clearAfter)
      
      return () => clearTimeout(timer)
    }
  }, [message, clearAfter])

  return (
    <div
      role="status"
      aria-live={priority}
      aria-atomic="true"
      className="sr-only"
    >
      {currentMessage}
    </div>
  )
}

// Accessible progress indicator
interface AccessibleProgressProps {
  value: number
  max?: number
  label?: string
  description?: string
  className?: string
}

export const AccessibleProgress: React.FC<AccessibleProgressProps> = ({
  value,
  max = 100,
  label,
  description,
  className
}) => {
  const percentage = Math.round((value / max) * 100)

  return (
    <div className={className}>
      {label && (
        <div className="flex justify-between text-sm mb-1">
          <span>{label}</span>
          <span>{percentage}%</span>
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label}
        aria-describedby={description ? "progress-description" : undefined}
        className="w-full bg-gray-200 rounded-full h-2"
      >
        <div
          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
      {description && (
        <p id="progress-description" className="text-xs text-gray-600 mt-1">
          {description}
        </p>
      )}
    </div>
  )
}

// High contrast mode detection
export const useHighContrastMode = () => {
  const [isHighContrast, setIsHighContrast] = React.useState(false)

  React.useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-contrast: high)')
    
    setIsHighContrast(mediaQuery.matches)
    
    const handleChange = (e: MediaQueryListEvent) => {
      setIsHighContrast(e.matches)
    }
    
    mediaQuery.addEventListener('change', handleChange)
    
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  return isHighContrast
}

// Reduced motion detection
export const useReducedMotion = () => {
  const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(false)

  React.useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    
    setPrefersReducedMotion(mediaQuery.matches)
    
    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches)
    }
    
    mediaQuery.addEventListener('change', handleChange)
    
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  return prefersReducedMotion
}