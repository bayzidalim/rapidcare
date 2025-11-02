/**
 * Currency Conversion Utilities
 * Provides conversion between different currency formats and display helpers
 */

import { formatTaka, parseTakaInput } from './currency';

export interface CurrencyConversionOptions {
  fromCurrency?: string;
  toCurrency?: string;
  exchangeRate?: number;
}

export interface AmountDisplayOptions {
  showCurrency?: boolean;
  showSymbol?: boolean;
  compact?: boolean;
  precision?: number;
}

/**
 * Convert amount between currencies (for future expansion)
 * Currently focused on Taka but structured for multi-currency support
 */
export const convertCurrency = (
  amount: number,
  options: CurrencyConversionOptions = {}
): number => {
  const { fromCurrency = 'BDT', toCurrency = 'BDT', exchangeRate = 1 } = options;
  
  if (fromCurrency === toCurrency) {
    return amount;
  }
  
  // For now, return the same amount as we're only dealing with Taka
  // In future, this could integrate with exchange rate APIs
  return amount * exchangeRate;
};

/**
 * Format amount for different display contexts
 */
export const formatAmountForDisplay = (
  amount: number,
  context: 'input' | 'display' | 'compact' | 'receipt' = 'display',
  options: AmountDisplayOptions = {}
): string => {
  const {
    showCurrency = true,
    showSymbol = true,
    compact = false,
    precision = 2
  } = options;

  if (isNaN(amount) || amount === null || amount === undefined) {
    return showSymbol ? '৳0.00' : '0.00';
  }

  switch (context) {
    case 'input':
      // For input fields, show plain number
      return amount === 0 ? '' : amount.toFixed(precision);
      
    case 'compact':
      // For compact display (e.g., in lists)
      if (amount >= 100000) {
        return `৳${(amount / 100000).toFixed(1)}L`; // Lakh
      } else if (amount >= 1000) {
        return `৳${(amount / 1000).toFixed(1)}K`; // Thousand
      }
      return formatTaka(amount);
      
    case 'receipt':
      // For receipts and formal documents
      const formatted = amount.toLocaleString('en-BD', {
        minimumFractionDigits: precision,
        maximumFractionDigits: precision
      });
      return showSymbol ? `৳ ${formatted}` : formatted;
      
    case 'display':
    default:
      return formatTaka(amount);
  }
};

/**
 * Parse amount from various input formats
 */
export const parseAmountFromInput = (
  input: string | number,
  context: 'user-input' | 'api-response' | 'calculation' = 'user-input'
): number => {
  if (typeof input === 'number') {
    return isNaN(input) ? 0 : input;
  }

  if (!input || typeof input !== 'string') {
    return 0;
  }

  switch (context) {
    case 'user-input':
      return parseTakaInput(input);
      
    case 'api-response':
      // Handle API responses that might be strings
      const cleaned = input.replace(/[^\d.-]/g, '');
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? 0 : parsed;
      
    case 'calculation':
      // For internal calculations, expect clean numeric strings
      const calculated = parseFloat(input);
      return isNaN(calculated) ? 0 : calculated;
      
    default:
      return parseTakaInput(input);
  }
};

/**
 * Calculate percentage amounts with proper rounding
 */
export const calculatePercentageAmount = (
  baseAmount: number,
  percentage: number,
  roundingMode: 'up' | 'down' | 'nearest' = 'nearest'
): number => {
  if (isNaN(baseAmount) || isNaN(percentage)) {
    return 0;
  }

  const calculated = (baseAmount * percentage) / 100;

  switch (roundingMode) {
    case 'up':
      return Math.ceil(calculated * 100) / 100;
    case 'down':
      return Math.floor(calculated * 100) / 100;
    case 'nearest':
    default:
      return Math.round(calculated * 100) / 100;
  }
};

/**
 * Split amount into components (useful for service charges, taxes, etc.)
 */
export const splitAmount = (
  totalAmount: number,
  splits: { name: string; percentage: number; fixed?: number }[]
): { name: string; amount: number; percentage?: number }[] => {
  if (isNaN(totalAmount) || totalAmount <= 0) {
    return splits.map(split => ({ name: split.name, amount: 0, percentage: split.percentage }));
  }

  const result: { name: string; amount: number; percentage?: number }[] = [];
  let remainingAmount = totalAmount;

  // First, handle fixed amounts
  splits.forEach(split => {
    if (split.fixed && split.fixed > 0) {
      const amount = Math.min(split.fixed, remainingAmount);
      result.push({ name: split.name, amount });
      remainingAmount -= amount;
    }
  });

  // Then handle percentage-based splits
  splits.forEach(split => {
    if (!split.fixed && split.percentage > 0) {
      const amount = calculatePercentageAmount(totalAmount, split.percentage);
      result.push({ name: split.name, amount, percentage: split.percentage });
      remainingAmount -= amount;
    }
  });

  return result;
};

/**
 * Validate amount ranges for different contexts
 */
export const validateAmountRange = (
  amount: number,
  context: 'booking' | 'payment' | 'refund' | 'pricing' = 'booking'
): { isValid: boolean; error?: string; suggestion?: string } => {
  if (isNaN(amount)) {
    return { isValid: false, error: 'Invalid amount format' };
  }

  const ranges = {
    booking: { min: 100, max: 1000000 }, // 100 Taka to 10 Lakh
    payment: { min: 1, max: 1000000 },
    refund: { min: 1, max: 1000000 },
    pricing: { min: 50, max: 100000 } // 50 Taka to 1 Lakh per hour
  };

  const range = ranges[context];

  if (amount < range.min) {
    return {
      isValid: false,
      error: `Amount must be at least ${formatTaka(range.min)}`,
      suggestion: `Minimum amount for ${context} is ${formatTaka(range.min)}`
    };
  }

  if (amount > range.max) {
    return {
      isValid: false,
      error: `Amount cannot exceed ${formatTaka(range.max)}`,
      suggestion: `Maximum amount for ${context} is ${formatTaka(range.max)}`
    };
  }

  return { isValid: true };
};

/**
 * Format amount breakdown for receipts and summaries
 */
export const formatAmountBreakdown = (
  breakdown: { label: string; amount: number; type?: 'charge' | 'discount' | 'tax' }[]
): string => {
  let result = '';
  let total = 0;

  breakdown.forEach(item => {
    const sign = item.type === 'discount' ? '-' : '+';
    const formattedAmount = formatTaka(Math.abs(item.amount));
    result += `${item.label}: ${sign}${formattedAmount}\n`;
    total += item.type === 'discount' ? -item.amount : item.amount;
  });

  result += `\nTotal: ${formatTaka(total)}`;
  return result;
};

/**
 * Get amount display helpers for different UI contexts
 */
export const getAmountDisplayHelpers = () => {
  return {
    // For form inputs
    formatForInput: (amount: number) => formatAmountForDisplay(amount, 'input'),
    
    // For display in lists and cards
    formatForDisplay: (amount: number) => formatAmountForDisplay(amount, 'display'),
    
    // For compact display in tight spaces
    formatCompact: (amount: number) => formatAmountForDisplay(amount, 'compact'),
    
    // For receipts and formal documents
    formatForReceipt: (amount: number) => formatAmountForDisplay(amount, 'receipt'),
    
    // Parse user input
    parseUserInput: (input: string) => parseAmountFromInput(input, 'user-input'),
    
    // Validate for different contexts
    validateBookingAmount: (amount: number) => validateAmountRange(amount, 'booking'),
    validatePaymentAmount: (amount: number) => validateAmountRange(amount, 'payment'),
    validatePricingAmount: (amount: number) => validateAmountRange(amount, 'pricing'),
    
    // Calculate common percentages
    calculateServiceCharge: (amount: number, rate: number = 5) => 
      calculatePercentageAmount(amount, rate),
    
    // Split amounts for revenue distribution
    splitRevenue: (total: number, serviceChargeRate: number = 5) => 
      splitAmount(total, [
        { name: 'Service Charge', percentage: serviceChargeRate },
        { name: 'Hospital Amount', percentage: 100 - serviceChargeRate }
      ])
  };
};