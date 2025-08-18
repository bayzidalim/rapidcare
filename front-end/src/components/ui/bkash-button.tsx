/**
 * bKash-style Button Component
 */
import React from 'react';
import { cn } from '@/lib/utils';
import { bkashColors, bkashSpacing, bkashBorderRadius, bkashFontSizes, bkashFontWeights } from '@/lib/bkash-theme';

export interface BkashButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'error' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

const BkashButton = React.forwardRef<HTMLButtonElement, BkashButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading = false, icon, children, disabled, ...props }, ref) => {
    const baseClasses = 'inline-flex items-center justify-center font-semibold transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
    
    const variantClasses = {
      primary: 'bg-[#E2136E] text-white hover:bg-[#C10E5F] focus:ring-[#E2136E] shadow-md hover:shadow-lg active:transform active:translate-y-px',
      secondary: 'bg-white text-[#E2136E] border-2 border-[#E2136E] hover:bg-gray-50 focus:ring-[#E2136E]',
      success: 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500',
      error: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
      outline: 'bg-transparent text-[#E2136E] border-2 border-[#E2136E] hover:bg-[#E2136E] hover:text-white focus:ring-[#E2136E]'
    };

    const sizeClasses = {
      sm: 'px-3 py-2 text-sm rounded-md gap-1',
      md: 'px-6 py-3 text-base rounded-lg gap-2',
      lg: 'px-8 py-4 text-lg rounded-xl gap-3'
    };

    return (
      <button
        className={cn(
          baseClasses,
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        disabled={disabled || loading}
        ref={ref}
        {...props}
      >
        {loading && (
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
        )}
        {!loading && icon && icon}
        {children}
      </button>
    );
  }
);

BkashButton.displayName = 'BkashButton';

export { BkashButton };