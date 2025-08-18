/**
 * Example component demonstrating bKash utilities and styling
 * This component showcases all the implemented utilities and components
 */
'use client';

import React, { useState } from 'react';
import {
  BkashButton,
  BkashInput,
  BkashCard,
  BkashAlert,
  BkashSpinner,
  BkashForm,
  BkashFormField,
  BkashFormLabel,
  BkashFormError,
  BkashFormSuccess,
  BkashFormActions,
  formatTaka,
  parseTakaInput,
  validateTakaAmount,
  formatAmountForDisplay,
  getAmountDisplayHelpers,
  bkashColors
} from '@/lib/bkash';

export const BkashUtilitiesExample: React.FC = () => {
  const [amount, setAmount] = useState<number>(0);
  const [inputValue, setInputValue] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [showSuccess, setShowSuccess] = useState<boolean>(false);
  const [showError, setShowError] = useState<boolean>(false);

  const helpers = getAmountDisplayHelpers();

  const handleAmountChange = (value: string | number) => {
    const numericValue = typeof value === 'string' ? parseTakaInput(value) : value;
    setAmount(numericValue);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      if (amount > 0) {
        setShowSuccess(true);
        setShowError(false);
      } else {
        setShowError(true);
        setShowSuccess(false);
      }
    }, 2000);
  };

  const validation = validateTakaAmount(amount, { min: 100, max: 100000 });

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2" style={{ color: bkashColors.primary }}>
          bKash Utilities & Components Demo
        </h1>
        <p className="text-gray-600">
          Comprehensive demonstration of Taka currency utilities and bKash-style components
        </p>
      </div>

      {/* Currency Formatting Examples */}
      <BkashCard elevated>
        <h2 className="text-xl font-semibold mb-4" style={{ color: bkashColors.primary }}>
          Currency Formatting Examples
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="font-medium mb-2">Display Formats</h3>
            <ul className="space-y-1 text-sm">
              <li><strong>Standard:</strong> {formatTaka(12345.67)}</li>
              <li><strong>Compact:</strong> {formatAmountForDisplay(150000, 'compact')}</li>
              <li><strong>Receipt:</strong> {formatAmountForDisplay(12345.67, 'receipt')}</li>
              <li><strong>Input:</strong> {formatAmountForDisplay(12345.67, 'input')}</li>
            </ul>
          </div>
          <div>
            <h3 className="font-medium mb-2">Helper Functions</h3>
            <ul className="space-y-1 text-sm">
              <li><strong>Service Charge (5%):</strong> {helpers.formatForDisplay(helpers.calculateServiceCharge(1000))}</li>
              <li><strong>Revenue Split:</strong></li>
              <ul className="ml-4 space-y-1">
                {helpers.splitRevenue(1000).map((split, index) => (
                  <li key={index}>
                    {split.name}: {helpers.formatForDisplay(split.amount)}
                  </li>
                ))}
              </ul>
            </ul>
          </div>
        </div>
      </BkashCard>

      {/* Interactive Form Example */}
      <BkashCard>
        <h2 className="text-xl font-semibold mb-4" style={{ color: bkashColors.primary }}>
          Interactive Payment Form
        </h2>
        
        <BkashForm onSubmit={handleSubmit}>
          <BkashFormField>
            <BkashFormLabel required>Payment Amount</BkashFormLabel>
            <BkashInput
              isTakaCurrency
              value={amount === 0 ? '' : amount.toString()}
              onValueChange={handleAmountChange}
              placeholder="Enter amount in Taka"
              takaValidation={{ min: 100, max: 100000 }}
            />
            {!validation.isValid && validation.error && (
              <BkashFormError>{validation.error}</BkashFormError>
            )}
            {validation.isValid && amount > 0 && (
              <BkashFormSuccess>Valid amount entered</BkashFormSuccess>
            )}
          </BkashFormField>

          <BkashFormField>
            <BkashFormLabel required>Mobile Number</BkashFormLabel>
            <BkashInput
              type="tel"
              value={inputValue}
              onValueChange={setInputValue}
              placeholder="+880 1XXXXXXXXX"
            />
          </BkashFormField>

          <BkashFormActions>
            <BkashButton variant="secondary" type="button">
              Cancel
            </BkashButton>
            <BkashButton 
              type="submit" 
              loading={loading}
              disabled={!validation.isValid || !inputValue}
            >
              {loading ? 'Processing...' : 'Pay Now'}
            </BkashButton>
          </BkashFormActions>
        </BkashForm>

        {/* Status Alerts */}
        {showSuccess && (
          <div className="mt-4">
            <BkashAlert type="success" title="Payment Successful">
              Your payment of {formatTaka(amount)} has been processed successfully.
            </BkashAlert>
          </div>
        )}

        {showError && (
          <div className="mt-4">
            <BkashAlert type="error" title="Payment Failed">
              Please enter a valid amount and try again.
            </BkashAlert>
          </div>
        )}
      </BkashCard>

      {/* Component Showcase */}
      <BkashCard>
        <h2 className="text-xl font-semibold mb-4" style={{ color: bkashColors.primary }}>
          Component Showcase
        </h2>
        
        <div className="space-y-6">
          {/* Buttons */}
          <div>
            <h3 className="font-medium mb-3">Button Variants</h3>
            <div className="flex flex-wrap gap-3">
              <BkashButton variant="primary">Primary</BkashButton>
              <BkashButton variant="secondary">Secondary</BkashButton>
              <BkashButton variant="success">Success</BkashButton>
              <BkashButton variant="error">Error</BkashButton>
              <BkashButton variant="outline">Outline</BkashButton>
              <BkashButton loading>Loading</BkashButton>
            </div>
          </div>

          {/* Alerts */}
          <div>
            <h3 className="font-medium mb-3">Alert Types</h3>
            <div className="space-y-3">
              <BkashAlert type="success">
                Payment of {formatTaka(5000)} completed successfully!
              </BkashAlert>
              <BkashAlert type="error">
                Insufficient balance. Current balance: {formatTaka(2500)}
              </BkashAlert>
              <BkashAlert type="warning">
                Service charge of {formatTaka(250)} will be applied.
              </BkashAlert>
              <BkashAlert type="info">
                Exchange rate: 1 USD = {formatTaka(110)}
              </BkashAlert>
            </div>
          </div>

          {/* Spinner */}
          <div>
            <h3 className="font-medium mb-3">Loading Spinners</h3>
            <div className="flex items-center gap-4">
              <BkashSpinner size="sm" />
              <BkashSpinner size="md" />
              <BkashSpinner size="lg" />
              <BkashSpinner color="white" className="bg-gray-800 p-2 rounded" />
            </div>
          </div>
        </div>
      </BkashCard>

      {/* Validation Examples */}
      <BkashCard>
        <h2 className="text-xl font-semibold mb-4" style={{ color: bkashColors.primary }}>
          Validation Examples
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-medium mb-3">Amount Validation</h3>
            <div className="space-y-2 text-sm">
              <div>
                <strong>Booking Amount (৳500):</strong>
                <span className={helpers.validateBookingAmount(500).isValid ? 'text-green-600' : 'text-red-600'}>
                  {helpers.validateBookingAmount(500).isValid ? ' ✓ Valid' : ' ✗ Invalid'}
                </span>
              </div>
              <div>
                <strong>Booking Amount (৳50):</strong>
                <span className={helpers.validateBookingAmount(50).isValid ? 'text-green-600' : 'text-red-600'}>
                  {helpers.validateBookingAmount(50).isValid ? ' ✓ Valid' : ' ✗ Invalid'}
                </span>
                {!helpers.validateBookingAmount(50).isValid && (
                  <div className="text-red-500 text-xs mt-1">
                    {helpers.validateBookingAmount(50).error}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="font-medium mb-3">Parsing Examples</h3>
            <div className="space-y-2 text-sm">
              <div><strong>Input:</strong> "৳1,500.50" → <strong>Parsed:</strong> {parseTakaInput('৳1,500.50')}</div>
              <div><strong>Input:</strong> "2,000" → <strong>Parsed:</strong> {parseTakaInput('2,000')}</div>
              <div><strong>Input:</strong> "invalid" → <strong>Parsed:</strong> {parseTakaInput('invalid')}</div>
            </div>
          </div>
        </div>
      </BkashCard>
    </div>
  );
};