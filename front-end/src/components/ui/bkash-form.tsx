/**
 * bKash-style Form Components
 */
import React from 'react';
import { cn } from '@/lib/utils';
import { BkashInput } from './bkash-input';
import { BkashButton } from './bkash-button';
import { BkashAlert } from './bkash-alert';

export interface BkashFormProps extends React.FormHTMLAttributes<HTMLFormElement> {
  children: React.ReactNode;
}

const BkashForm = React.forwardRef<HTMLFormElement, BkashFormProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <form
        className={cn('space-y-6', className)}
        ref={ref}
        {...props}
      >
        {children}
      </form>
    );
  }
);

BkashForm.displayName = 'BkashForm';

export interface BkashFormFieldProps {
  children: React.ReactNode;
  className?: string;
}

const BkashFormField = React.forwardRef<HTMLDivElement, BkashFormFieldProps>(
  ({ className, children }, ref) => {
    return (
      <div className={cn('space-y-2', className)} ref={ref}>
        {children}
      </div>
    );
  }
);

BkashFormField.displayName = 'BkashFormField';

export interface BkashFormLabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
  children: React.ReactNode;
}

const BkashFormLabel = React.forwardRef<HTMLLabelElement, BkashFormLabelProps>(
  ({ className, required = false, children, ...props }, ref) => {
    return (
      <label
        className={cn(
          'block text-sm font-medium text-gray-700',
          className
        )}
        ref={ref}
        {...props}
      >
        {children}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
    );
  }
);

BkashFormLabel.displayName = 'BkashFormLabel';

export interface BkashFormErrorProps {
  children: React.ReactNode;
  className?: string;
}

const BkashFormError = React.forwardRef<HTMLParagraphElement, BkashFormErrorProps>(
  ({ className, children }, ref) => {
    return (
      <p
        className={cn('text-sm text-red-600 flex items-center gap-1', className)}
        ref={ref}
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
        {children}
      </p>
    );
  }
);

BkashFormError.displayName = 'BkashFormError';

export interface BkashFormSuccessProps {
  children: React.ReactNode;
  className?: string;
}

const BkashFormSuccess = React.forwardRef<HTMLParagraphElement, BkashFormSuccessProps>(
  ({ className, children }, ref) => {
    return (
      <p
        className={cn('text-sm text-green-600 flex items-center gap-1', className)}
        ref={ref}
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
        {children}
      </p>
    );
  }
);

BkashFormSuccess.displayName = 'BkashFormSuccess';

export interface BkashFormActionsProps {
  children: React.ReactNode;
  className?: string;
  align?: 'left' | 'center' | 'right';
}

const BkashFormActions = React.forwardRef<HTMLDivElement, BkashFormActionsProps>(
  ({ className, children, align = 'right' }, ref) => {
    const alignClasses = {
      left: 'justify-start',
      center: 'justify-center',
      right: 'justify-end'
    };

    return (
      <div
        className={cn(
          'flex gap-3 pt-4',
          alignClasses[align],
          className
        )}
        ref={ref}
      >
        {children}
      </div>
    );
  }
);

BkashFormActions.displayName = 'BkashFormActions';

export {
  BkashForm,
  BkashFormField,
  BkashFormLabel,
  BkashFormError,
  BkashFormSuccess,
  BkashFormActions
};