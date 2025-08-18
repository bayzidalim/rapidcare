"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface ResponsiveContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg" | "xl" | "full"
}

const ResponsiveContainer = React.forwardRef<HTMLDivElement, ResponsiveContainerProps>(
  ({ className, size = "lg", ...props }, ref) => {
    const sizeClasses = {
      sm: "max-w-2xl",
      md: "max-w-4xl", 
      lg: "max-w-6xl",
      xl: "max-w-7xl",
      full: "max-w-none"
    }

    return (
      <div
        ref={ref}
        className={cn(
          "mx-auto px-4 sm:px-6 lg:px-8",
          sizeClasses[size],
          className
        )}
        {...props}
      />
    )
  }
)
ResponsiveContainer.displayName = "ResponsiveContainer"

// Grid system
interface ResponsiveGridProps extends React.HTMLAttributes<HTMLDivElement> {
  cols?: {
    default?: number
    sm?: number
    md?: number
    lg?: number
    xl?: number
  }
  gap?: number
}

const ResponsiveGrid = React.forwardRef<HTMLDivElement, ResponsiveGridProps>(
  ({ className, cols = { default: 1, md: 2, lg: 3 }, gap = 4, ...props }, ref) => {
    const gridClasses = [
      `grid`,
      `gap-${gap}`,
      cols.default && `grid-cols-${cols.default}`,
      cols.sm && `sm:grid-cols-${cols.sm}`,
      cols.md && `md:grid-cols-${cols.md}`,
      cols.lg && `lg:grid-cols-${cols.lg}`,
      cols.xl && `xl:grid-cols-${cols.xl}`,
    ].filter(Boolean).join(" ")

    return (
      <div
        ref={ref}
        className={cn(gridClasses, className)}
        {...props}
      />
    )
  }
)
ResponsiveGrid.displayName = "ResponsiveGrid"

// Responsive stack
interface ResponsiveStackProps extends React.HTMLAttributes<HTMLDivElement> {
  direction?: "vertical" | "horizontal" | "responsive"
  gap?: number
  align?: "start" | "center" | "end" | "stretch"
  justify?: "start" | "center" | "end" | "between" | "around"
}

const ResponsiveStack = React.forwardRef<HTMLDivElement, ResponsiveStackProps>(
  ({ 
    className, 
    direction = "vertical", 
    gap = 4, 
    align = "stretch",
    justify = "start",
    ...props 
  }, ref) => {
    const directionClasses = {
      vertical: "flex flex-col",
      horizontal: "flex flex-row",
      responsive: "flex flex-col sm:flex-row"
    }

    const alignClasses = {
      start: "items-start",
      center: "items-center", 
      end: "items-end",
      stretch: "items-stretch"
    }

    const justifyClasses = {
      start: "justify-start",
      center: "justify-center",
      end: "justify-end", 
      between: "justify-between",
      around: "justify-around"
    }

    return (
      <div
        ref={ref}
        className={cn(
          directionClasses[direction],
          alignClasses[align],
          justifyClasses[justify],
          `gap-${gap}`,
          className
        )}
        {...props}
      />
    )
  }
)
ResponsiveStack.displayName = "ResponsiveStack"

export {
  ResponsiveContainer,
  ResponsiveGrid,
  ResponsiveStack,
}