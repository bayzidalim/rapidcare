/**
 * Taka Currency Utilities
 * Provides formatting, validation, and parsing functions for Bangladeshi Taka (৳)
 */

export interface TakaAmount {
  value: number;
  formatted: string;
  symbol: string;
}

/**
 * Format amount as Taka currency with Bengali symbol and proper separators
 * @param amount - Numeric amount to format
 * @returns Formatted Taka string (৳X,XXX.XX)
 */
export const formatTaka = (amount: number): string => {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return '৳0.00';
  }

  return `৳${amount.toLocaleString('en-BD', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
};

/**
 * Format amount for display with custom options
 * @param amount - Numeric amount to format
 * @param options - Formatting options
 */
export const formatTakaWithOptions = (
  amount: number,
  options: {
    showSymbol?: boolean;
    decimalPlaces?: number;
    showZero?: boolean;
  } = {}
): string => {
  const {
    showSymbol = true,
    decimalPlaces = 2,
    showZero = true
  } = options;

  if (!showZero && amount === 0) {
    return '';
  }

  if (isNaN(amount) || amount === null || amount === undefined) {
    return showSymbol ? '৳0.00' : '0.00';
  }

  const formatted = amount.toLocaleString('en-BD', {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces
  });

  return showSymbol ? `৳${formatted}` : formatted;
};

/**
 * Parse Taka input string to numeric value
 * @param input - String input that may contain Taka symbol and separators
 * @returns Parsed numeric value
 */
export const parseTakaInput = (input: string): number => {
  if (!input || typeof input !== 'string') {
    return 0;
  }

  // Remove Taka symbol, commas, and whitespace
  const cleaned = input.replace(/[৳,\s]/g, '');
  const parsed = parseFloat(cleaned);
  
  return isNaN(parsed) ? 0 : parsed;
};

/**
 * Validate Taka amount input
 * @param input - Input value to validate
 * @param options - Validation options
 */
export const validateTakaAmount = (
  input: string | number,
  options: {
    min?: number;
    max?: number;
    allowZero?: boolean;
    allowNegative?: boolean;
  } = {}
): { isValid: boolean; error?: string; value?: number } => {
  const {
    allowZero = true,
    allowNegative = false
  } = options;
  
  const min = options.min !== undefined ? options.min : (allowNegative ? Number.MIN_SAFE_INTEGER : 0);
  const max = options.max !== undefined ? options.max : Number.MAX_SAFE_INTEGER;

  let value: number;

  if (typeof input === 'string') {
    value = parseTakaInput(input);
  } else if (typeof input === 'number') {
    value = input;
  } else {
    return { isValid: false, error: 'Invalid input type' };
  }

  if (isNaN(value)) {
    return { isValid: false, error: 'Invalid amount format' };
  }

  if (!allowZero && value === 0) {
    return { isValid: false, error: 'Amount cannot be zero' };
  }

  if (!allowNegative && value < 0) {
    return { isValid: false, error: 'Amount cannot be negative' };
  }

  if (value < min) {
    return { isValid: false, error: `Amount must be at least ${formatTaka(min)}` };
  }

  if (value > max) {
    return { isValid: false, error: `Amount cannot exceed ${formatTaka(max)}` };
  }

  return { isValid: true, value };
};

/**
 * Create TakaAmount object with formatted display
 * @param amount - Numeric amount
 */
export const createTakaAmount = (amount: number): TakaAmount => {
  return {
    value: amount,
    formatted: formatTaka(amount),
    symbol: '৳'
  };
};

/**
 * Calculate percentage of Taka amount
 * @param amount - Base amount
 * @param percentage - Percentage (0-100)
 */
export const calculateTakaPercentage = (amount: number, percentage: number): number => {
  if (isNaN(amount) || isNaN(percentage)) {
    return 0;
  }
  return (amount * percentage) / 100;
};

/**
 * Add two Taka amounts safely
 * @param amount1 - First amount
 * @param amount2 - Second amount
 */
export const addTakaAmounts = (amount1: number, amount2: number): number => {
  const a1 = isNaN(amount1) ? 0 : amount1;
  const a2 = isNaN(amount2) ? 0 : amount2;
  return Math.round((a1 + a2) * 100) / 100; // Avoid floating point precision issues
};

/**
 * Subtract Taka amounts safely
 * @param amount1 - Amount to subtract from
 * @param amount2 - Amount to subtract
 */
export const subtractTakaAmounts = (amount1: number, amount2: number): number => {
  const a1 = isNaN(amount1) ? 0 : amount1;
  const a2 = isNaN(amount2) ? 0 : amount2;
  return Math.round((a1 - a2) * 100) / 100;
};

/**
 * Format Taka amount for input fields
 * @param amount - Amount to format for input
 */
export const formatTakaForInput = (amount: number): string => {
  if (isNaN(amount) || amount === 0) {
    return '';
  }
  return amount.toString();
};

/**
 * Get Taka currency info
 */
export const getTakaCurrencyInfo = () => {
  return {
    symbol: '৳',
    code: 'BDT',
    name: 'Bangladeshi Taka',
    locale: 'en-BD',
    decimalPlaces: 2
  };
};