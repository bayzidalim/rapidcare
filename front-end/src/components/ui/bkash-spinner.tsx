/**
 * bKash-style Loading Spinner Component
 */
import React from 'react';
import { cn } from '@/lib/utils';

export interface BkashSpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'white' | 'gray';
}

const BkashSpinner = React.forwardRef<HTMLDivElement, BkashSpinnerProps>(
  ({ className, size = 'md', color = 'primary', ...props }, ref) => {
    const sizeClasses = {
      sm: 'w-4 h-4 border-2',
      md: 'w-6 h-6 border-2',
      lg: 'w-8 h-8 border-3'
    };

    const colorClasses = {
      primary: 'border-gray-300 border-t-[#E2136E]',
      white: 'border-white/30 border-t-white',
      gray: 'border-gray-300 border-t-gray-600'
    };

    return (
      <div
        className={cn(
          'animate-spin rounded-full',
          sizeClasses[size],
          colorClasses[color],
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);

BkashSpinner.displayName = 'BkashSpinner';

export { BkashSpinner };