"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface PaginationProps extends React.ComponentProps<"nav"> {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  showFirstLast?: boolean
  showPrevNext?: boolean
  maxVisiblePages?: number
}

const Pagination = React.forwardRef<HTMLElement, PaginationProps>(
  ({ 
    className, 
    currentPage, 
    totalPages, 
    onPageChange, 
    showFirstLast = true,
    showPrevNext = true,
    maxVisiblePages = 5,
    ...props 
  }, ref) => {
    const getVisiblePages = () => {
      const pages: (number | string)[] = []
      
      if (totalPages <= maxVisiblePages) {
        // Show all pages if total is less than max
        for (let i = 1; i <= totalPages; i++) {
          pages.push(i)
        }
      } else {
        // Calculate start and end of visible range
        let start = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2))
        let end = Math.min(totalPages, start + maxVisiblePages - 1)
        
        // Adjust start if we're near the end
        if (end - start + 1 < maxVisiblePages) {
          start = Math.max(1, end - maxVisiblePages + 1)
        }
        
        // Add first page and ellipsis if needed
        if (start > 1) {
          pages.push(1)
          if (start > 2) {
            pages.push('...')
          }
        }
        
        // Add visible pages
        for (let i = start; i <= end; i++) {
          pages.push(i)
        }
        
        // Add ellipsis and last page if needed
        if (end < totalPages) {
          if (end < totalPages - 1) {
            pages.push('...')
          }
          pages.push(totalPages)
        }
      }
      
      return pages
    }

    const visiblePages = getVisiblePages()

    return (
      <nav
        ref={ref}
        role="navigation"
        aria-label="pagination"
        className={cn("mx-auto flex w-full justify-center", className)}
        {...props}
      >
        <div className="flex flex-row items-center gap-1">
          {/* First page button */}
          {showFirstLast && currentPage > 1 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(1)}
              aria-label="Go to first page"
            >
              First
            </Button>
          )}
          
          {/* Previous page button */}
          {showPrevNext && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage <= 1}
              aria-label="Go to previous page"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="sr-only">Previous</span>
            </Button>
          )}

          {/* Page numbers */}
          {visiblePages.map((page, index) => (
            <React.Fragment key={index}>
              {page === '...' ? (
                <span className="flex h-9 w-9 items-center justify-center">
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">More pages</span>
                </span>
              ) : (
                <Button
                  variant={currentPage === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => onPageChange(page as number)}
                  aria-label={`Go to page ${page}`}
                  aria-current={currentPage === page ? "page" : undefined}
                  className="h-9 w-9"
                >
                  {page}
                </Button>
              )}
            </React.Fragment>
          ))}

          {/* Next page button */}
          {showPrevNext && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage >= totalPages}
              aria-label="Go to next page"
            >
              <ChevronRight className="h-4 w-4" />
              <span className="sr-only">Next</span>
            </Button>
          )}

          {/* Last page button */}
          {showFirstLast && currentPage < totalPages && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(totalPages)}
              aria-label="Go to last page"
            >
              Last
            </Button>
          )}
        </div>
      </nav>
    )
  }
)
Pagination.displayName = "Pagination"

// Pagination info component
interface PaginationInfoProps {
  currentPage: number
  totalPages: number
  totalItems: number
  itemsPerPage: number
  className?: string
}

const PaginationInfo: React.FC<PaginationInfoProps> = ({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  className
}) => {
  const startItem = (currentPage - 1) * itemsPerPage + 1
  const endItem = Math.min(currentPage * itemsPerPage, totalItems)

  return (
    <div className={cn("text-sm text-muted-foreground", className)}>
      Showing {startItem} to {endItem} of {totalItems} results
    </div>
  )
}

// Items per page selector
interface ItemsPerPageSelectorProps {
  itemsPerPage: number
  onItemsPerPageChange: (itemsPerPage: number) => void
  options?: number[]
  className?: string
}

const ItemsPerPageSelector: React.FC<ItemsPerPageSelectorProps> = ({
  itemsPerPage,
  onItemsPerPageChange,
  options = [10, 20, 50, 100],
  className
}) => {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="text-sm text-muted-foreground">Show</span>
      <select
        value={itemsPerPage}
        onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
        className="h-8 rounded border border-input bg-background px-2 text-sm"
      >
        {options.map(option => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <span className="text-sm text-muted-foreground">per page</span>
    </div>
  )
}

export { Pagination, PaginationInfo, ItemsPerPageSelector }