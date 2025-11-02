/**
 * bKash-style Input Component
 */
import React from 'react';
import { cn } from '@/lib/utils';
import { formatTaka, parseTakaInput, validateTakaAmount } from '@/lib/currency';

export interface BkashInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label?: string;
  error?: string;
  success?: string;
  isTakaCurrency?: boolean;
  onValueChange?: (value: string | number) => void;
  takaValidation?: {
    min?: number;
    max?: number;
    allowZero?: boolean;
  };
}

const BkashInput = React.forwardRef<HTMLInputElement, BkashInputProps>(
  ({ 
    className, 
    label, 
    error, 
    success, 
    isTakaCurrency = false, 
    onValueChange,
    takaValidation,
    value,
    ...props 
  }, ref) => {
    const [internalValue, setInternalValue] = React.useState<string>('');
    const [validationError, setValidationError] = React.useState<string>('');

    const displayValue = value !== undefined ? String(value) : internalValue;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;
      
      if (isTakaCurrency) {
        // For Taka currency, validate and format
        const numericValue = parseTakaInput(inputValue);
        
        if (takaValidation) {
          const validation = validateTakaAmount(numericValue, takaValidation);
          if (!validation.isValid) {
            setValidationError(validation.error || '');
          } else {
            setValidationError('');
          }
        }
        
        setInternalValue(inputValue);
        onValueChange?.(numericValue);
      } else {
        setInternalValue(inputValue);
        onValueChange?.(inputValue);
      }
    };

    const baseClasses = 'w-full px-4 py-3 text-base border-2 rounded-lg transition-all duration-200 ease-in-out focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed';
    
    const stateClasses = error || validationError
      ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-200'
      : success
      ? 'border-green-500 focus:border-green-500 focus:ring-2 focus:ring-green-200'
      : 'border-gray-300 focus:border-[#E2136E] focus:ring-2 focus:ring-[#E2136E]/20';

    const displayError = error || validationError;

    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {label}
            {isTakaCurrency && <span className="text-gray-500 ml-1">(৳)</span>}
          </label>
        )}
        
        <div className="relative">
          {isTakaCurrency && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-500 text-base">৳</span>
            </div>
          )}
          
          <input
            className={cn(
              baseClasses,
              stateClasses,
              isTakaCurrency && 'pl-8',
              className
            )}
            value={displayValue}
            onChange={handleChange}
            ref={ref}
            {...props}
          />
        </div>

        {displayError && (
          <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {displayError}
          </p>
        )}

        {success && !displayError && (
          <p className="mt-2 text-sm text-green-600 flex items-center gap-1">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            {success}
          </p>
        )}
      </div>
    );
  }
);

BkashInput.displayName = 'BkashInput';

export { BkashInput };