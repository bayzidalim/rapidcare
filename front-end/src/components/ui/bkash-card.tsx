/**
 * bKash-style Card Component
 */
import React from 'react';
import { cn } from '@/lib/utils';

export interface BkashCardProps extends React.HTMLAttributes<HTMLDivElement> {
  elevated?: boolean;
  padding?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

const BkashCard = React.forwardRef<HTMLDivElement, BkashCardProps>(
  ({ className, elevated = false, padding = 'md', children, ...props }, ref) => {
    const baseClasses = 'bg-white rounded-xl border border-gray-200 transition-all duration-200';
    
    const elevationClasses = elevated 
      ? 'shadow-lg hover:shadow-xl' 
      : 'shadow-sm hover:shadow-md';

    const paddingClasses = {
      sm: 'p-4',
      md: 'p-6',
      lg: 'p-8'
    };

    return (
      <div
        className={cn(
          baseClasses,
          elevationClasses,
          paddingClasses[padding],
          className
        )}
        ref={ref}
        {...props}
      >
        {children}
      </div>
    );
  }
);

BkashCard.displayName = 'BkashCard';

export { BkashCard };