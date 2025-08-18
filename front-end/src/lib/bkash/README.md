# bKash Utilities and Components

This directory contains comprehensive utilities and components for implementing bKash-style payment interfaces with Bangladeshi Taka (৳) currency support.

## Features

- **Taka Currency Formatting**: Complete utilities for formatting, parsing, and validating Bangladeshi Taka amounts
- **bKash UI Theme**: Consistent color scheme, spacing, and styling constants matching bKash design
- **React Components**: Pre-built components with bKash styling for buttons, inputs, cards, alerts, and forms
- **Currency Conversion**: Utilities for amount display, validation, and conversion between different formats
- **Comprehensive Testing**: Full test coverage for all utilities and functions

## Quick Start

```typescript
import {
  formatTaka,
  BkashButton,
  BkashInput,
  BkashCard,
  getAmountDisplayHelpers
} from '@/lib/bkash';

// Format currency
const amount = formatTaka(1500); // "৳1,500.00"

// Use components
<BkashCard>
  <BkashInput 
    isTakaCurrency 
    placeholder="Enter amount" 
    takaValidation={{ min: 100, max: 10000 }}
  />
  <BkashButton variant="primary">Pay Now</BkashButton>
</BkashCard>
```

## Currency Utilities

### Basic Formatting

```typescript
import { formatTaka, parseTakaInput, validateTakaAmount } from '@/lib/bkash';

// Format amounts
formatTaka(1500);           // "৳1,500.00"
formatTaka(0);              // "৳0.00"
formatTaka(1000000);        // "৳1,000,000.00"

// Parse user input
parseTakaInput('৳1,500');   // 1500
parseTakaInput('1500.50');  // 1500.5
parseTakaInput('invalid');  // 0

// Validate amounts
const validation = validateTakaAmount(500, {
  min: 100,
  max: 10000,
  allowZero: false
});
// { isValid: true, value: 500 }
```

### Advanced Formatting

```typescript
import { formatAmountForDisplay, getAmountDisplayHelpers } from '@/lib/bkash';

const helpers = getAmountDisplayHelpers();

// Different display contexts
formatAmountForDisplay(1500, 'display');  // "৳1,500.00"
formatAmountForDisplay(1500, 'compact');  // "৳1.5K"
formatAmountForDisplay(1500, 'receipt');  // "৳ 1,500.00"
formatAmountForDisplay(1500, 'input');    // "1500.00"

// Helper functions
helpers.formatForDisplay(1000);           // "৳1,000.00"
helpers.calculateServiceCharge(1000, 5);  // 50 (5% of 1000)
helpers.validateBookingAmount(500);       // { isValid: true }
```

## bKash Theme System

### Colors

```typescript
import { bkashColors } from '@/lib/bkash';

// Primary colors
bkashColors.primary;        // "#E2136E" (bKash Pink)
bkashColors.primaryDark;    // "#C10E5F"
bkashColors.secondary;      // "#FFFFFF"

// Status colors
bkashColors.success;        // "#28A745"
bkashColors.error;          // "#DC3545"
bkashColors.warning;        // "#FFC107"
```

### Styling Functions

```typescript
import { getBkashButtonStyles, getBkashInputStyles } from '@/lib/bkash';

// Get button styles
const primaryButton = getBkashButtonStyles('primary');
const secondaryButton = getBkashButtonStyles('secondary');

// Get input styles
const defaultInput = getBkashInputStyles('default');
const errorInput = getBkashInputStyles('error');
```

## React Components

### Buttons

```typescript
import { BkashButton } from '@/lib/bkash';

<BkashButton variant="primary" size="md" loading={false}>
  Pay Now
</BkashButton>

<BkashButton variant="secondary" icon={<Icon />}>
  Cancel
</BkashButton>
```

**Variants**: `primary`, `secondary`, `success`, `error`, `outline`
**Sizes**: `sm`, `md`, `lg`

### Inputs

```typescript
import { BkashInput } from '@/lib/bkash';

<BkashInput
  label="Payment Amount"
  isTakaCurrency={true}
  takaValidation={{ min: 100, max: 10000 }}
  onValueChange={(value) => setAmount(value)}
  placeholder="Enter amount"
/>
```

### Cards

```typescript
import { BkashCard } from '@/lib/bkash';

<BkashCard elevated={true} padding="lg">
  <h2>Payment Details</h2>
  <p>Amount: {formatTaka(1500)}</p>
</BkashCard>
```

### Alerts

```typescript
import { BkashAlert } from '@/lib/bkash';

<BkashAlert type="success" title="Payment Successful">
  Your payment of {formatTaka(1500)} has been processed.
</BkashAlert>

<BkashAlert type="error" onClose={() => setShowError(false)}>
  Payment failed. Please try again.
</BkashAlert>
```

**Types**: `success`, `error`, `warning`, `info`

### Forms

```typescript
import {
  BkashForm,
  BkashFormField,
  BkashFormLabel,
  BkashFormError,
  BkashFormActions
} from '@/lib/bkash';

<BkashForm onSubmit={handleSubmit}>
  <BkashFormField>
    <BkashFormLabel required>Amount</BkashFormLabel>
    <BkashInput isTakaCurrency />
    <BkashFormError>Please enter a valid amount</BkashFormError>
  </BkashFormField>
  
  <BkashFormActions align="right">
    <BkashButton variant="secondary">Cancel</BkashButton>
    <BkashButton type="submit">Submit</BkashButton>
  </BkashFormActions>
</BkashForm>
```

## Currency Conversion & Validation

### Amount Validation

```typescript
import { validateAmountRange } from '@/lib/bkash';

// Context-specific validation
validateAmountRange(500, 'booking');   // { isValid: true }
validateAmountRange(50, 'booking');    // { isValid: false, error: "Amount must be at least ৳100.00" }
validateAmountRange(1000, 'payment');  // { isValid: true }
validateAmountRange(100, 'pricing');   // { isValid: true }
```

### Revenue Splitting

```typescript
import { splitAmount } from '@/lib/bkash';

const splits = splitAmount(1000, [
  { name: 'Service Charge', percentage: 5 },
  { name: 'Hospital Amount', percentage: 95 }
]);
// [
//   { name: 'Service Charge', amount: 50, percentage: 5 },
//   { name: 'Hospital Amount', amount: 950, percentage: 95 }
// ]
```

### Amount Breakdown

```typescript
import { formatAmountBreakdown } from '@/lib/bkash';

const breakdown = formatAmountBreakdown([
  { label: 'Base Amount', amount: 1000 },
  { label: 'Service Charge', amount: 50 },
  { label: 'Discount', amount: 100, type: 'discount' }
]);
// "Base Amount: +৳1,000.00\nService Charge: +৳50.00\nDiscount: -৳100.00\n\nTotal: ৳950.00"
```

## Testing

All utilities include comprehensive unit tests:

```bash
# Run currency utility tests
npm test src/lib/__tests__/currency.test.ts

# Run theme utility tests
npm test src/lib/__tests__/bkash-theme.test.ts

# Run conversion utility tests
npm test src/lib/__tests__/currency-conversion.test.ts

# Run all bKash-related tests
npm test src/lib/__tests__/
```

## CSS Integration

Generate CSS custom properties for consistent theming:

```typescript
import { generateBkashCSSVariables } from '@/lib/bkash';

// Add to your CSS
const cssVars = generateBkashCSSVariables();
// Outputs CSS custom properties like:
// :root {
//   --bkash-primary: #E2136E;
//   --bkash-success: #28A745;
//   --bkash-spacing-lg: 1rem;
//   ...
// }
```

## Best Practices

1. **Always use Taka formatting** for displaying monetary values
2. **Validate amounts** before processing payments
3. **Use consistent bKash styling** across payment interfaces
4. **Handle edge cases** like zero amounts and invalid inputs
5. **Test thoroughly** with different amount ranges and formats

## Examples

See `front-end/src/components/examples/BkashUtilitiesExample.tsx` for a comprehensive demonstration of all utilities and components in action.

## Requirements Covered

This implementation covers the following requirements:
- **1.2**: bKash-style payment form with mobile number input and PIN entry
- **1.3**: Payment confirmation steps with Taka currency formatting
- **1.5**: bKash-style success page with booking confirmation
- **2.1**: User dashboard with payment status and Taka amounts
- **3.1**: Hospital pricing settings with Taka currency validation
- **4.2**: Revenue analytics with Taka formatting