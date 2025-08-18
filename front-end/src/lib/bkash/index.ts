/**
 * bKash Utilities and Components Index
 * Centralized exports for all bKash-related functionality
 */

// Currency utilities
export * from '../currency';
export * from '../currency-conversion';

// Theme and styling
export * from '../bkash-theme';

// Re-export components for convenience
export { BkashButton } from '../../components/ui/bkash-button';
export { BkashInput } from '../../components/ui/bkash-input';
export { BkashCard } from '../../components/ui/bkash-card';
export { BkashAlert } from '../../components/ui/bkash-alert';
export { BkashSpinner } from '../../components/ui/bkash-spinner';
export {
  BkashForm,
  BkashFormField,
  BkashFormLabel,
  BkashFormError,
  BkashFormSuccess,
  BkashFormActions
} from '../../components/ui/bkash-form';

// Type definitions for bKash components
export type { BkashButtonProps } from '../../components/ui/bkash-button';
export type { BkashInputProps } from '../../components/ui/bkash-input';
export type { BkashCardProps } from '../../components/ui/bkash-card';
export type { BkashAlertProps } from '../../components/ui/bkash-alert';
export type { BkashSpinnerProps } from '../../components/ui/bkash-spinner';
export type {
  BkashFormProps,
  BkashFormFieldProps,
  BkashFormLabelProps,
  BkashFormErrorProps,
  BkashFormSuccessProps,
  BkashFormActionsProps
} from '../../components/ui/bkash-form';

// Currency types
export type { TakaAmount } from '../currency';
export type { CurrencyConversionOptions, AmountDisplayOptions } from '../currency-conversion';