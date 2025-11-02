/**
 * bKash-style Alert Component
 */
import React from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react';

export interface BkashAlertProps extends React.HTMLAttributes<HTMLDivElement> {
  type?: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  children: React.ReactNode;
  showIcon?: boolean;
  onClose?: () => void;
}

const BkashAlert = React.forwardRef<HTMLDivElement, BkashAlertProps>(
  ({ className, type = 'info', title, children, showIcon = true, onClose, ...props }, ref) => {
    const baseClasses = 'p-4 rounded-lg border flex items-start gap-3 font-medium';
    
    const typeClasses = {
      success: 'bg-green-50 border-green-200 text-green-800',
      error: 'bg-red-50 border-red-200 text-red-800',
      warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
      info: 'bg-blue-50 border-blue-200 text-blue-800'
    };

    const icons = {
      success: CheckCircle,
      error: XCircle,
      warning: AlertTriangle,
      info: Info
    };

    const iconColors = {
      success: 'text-green-500',
      error: 'text-red-500',
      warning: 'text-yellow-500',
      info: 'text-blue-500'
    };

    const Icon = icons[type];

    return (
      <div
        className={cn(
          baseClasses,
          typeClasses[type],
          className
        )}
        ref={ref}
        {...props}
      >
        {showIcon && (
          <Icon className={cn('w-5 h-5 flex-shrink-0 mt-0.5', iconColors[type])} />
        )}
        
        <div className="flex-1">
          {title && (
            <h4 className="font-semibold mb-1">{title}</h4>
          )}
          <div className="text-sm">{children}</div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="flex-shrink-0 ml-2 p-1 rounded-md hover:bg-black/5 transition-colors"
          >
            <XCircle className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  }
);

BkashAlert.displayName = 'BkashAlert';

export { BkashAlert };