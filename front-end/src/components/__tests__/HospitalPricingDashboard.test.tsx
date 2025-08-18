import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import HospitalPricingDashboard from '../HospitalPricingDashboard';
import { pricingAPI } from '@/lib/api';
import { HospitalPricing } from '@/lib/types';

// Mock the API
jest.mock('@/lib/api', () => ({
  pricingAPI: {
    getHospitalPricing: jest.fn(),
    updateHospitalPricing: jest.fn(),
    getPricingHistory: jest.fn(),
    calculateBookingAmount: jest.fn(),
  },
}));

const mockPricingAPI = pricingAPI as jest.Mocked<typeof pricingAPI>;

const mockPricing: Record<string, HospitalPricing | null> = {
  beds: {
    id: 1,
    hospitalId: 1,
    resourceType: 'beds',
    baseRate: 100,
    hourlyRate: 10,
    minimumCharge: 50,
    maximumCharge: 500,
    currency: 'USD',
    effectiveFrom: '2024-01-01T00:00:00Z',
    effectiveTo: null,
    isActive: true,
    createdBy: 1,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    hospitalName: 'Test Hospital',
    createdByName: 'Test User'
  },
  icu: null,
  operationTheatres: null
};

const mockPricingHistory = [
  {
    id: 1,
    hospitalId: 1,
    resourceType: 'beds' as const,
    baseRate: 100,
    hourlyRate: 10,
    minimumCharge: 50,
    maximumCharge: 500,
    currency: 'USD',
    effectiveFrom: '2024-01-01T00:00:00Z',
    effectiveTo: null,
    isActive: true,
    createdBy: 1,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    createdByName: 'Test User'
  }
];

const mockCalculation = {
  baseRate: 100,
  hourlyRate: 10,
  duration: 48,
  calculatedAmount: 340,
  minimumCharge: 50,
  maximumCharge: 500,
  currency: 'USD'
};

describe('HospitalPricingDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPricingAPI.getHospitalPricing.mockResolvedValue({
      data: { success: true, data: { pricing: mockPricing } }
    } as any);
    mockPricingAPI.getPricingHistory.mockResolvedValue({
      data: { success: true, data: mockPricingHistory }
    } as any);
    mockPricingAPI.calculateBookingAmount.mockResolvedValue({
      data: { success: true, data: mockCalculation }
    } as any);
  });

  it('renders pricing dashboard with current pricing', async () => {
    render(
      <HospitalPricingDashboard 
        hospitalId={1} 
        currentPricing={mockPricing}
      />
    );

    expect(screen.getByText('Pricing Management')).toBeInTheDocument();
    expect(screen.getByText('Manage rates for your hospital resources')).toBeInTheDocument();
    
    // Check resource type cards
    expect(screen.getByText('General Beds')).toBeInTheDocument();
    expect(screen.getByText('ICU Beds')).toBeInTheDocument();
    expect(screen.getByText('Operation Theatres')).toBeInTheDocument();
    
    // Check pricing display for beds
    expect(screen.getByText('$100.00')).toBeInTheDocument(); // Base rate
    expect(screen.getByText('$10.00')).toBeInTheDocument(); // Hourly rate
  });

  it('loads pricing data when not provided initially', async () => {
    render(<HospitalPricingDashboard hospitalId={1} />);
    
    await waitFor(() => {
      expect(mockPricingAPI.getHospitalPricing).toHaveBeenCalledWith(1);
    });
  });

  it('loads pricing history on mount', async () => {
    render(<HospitalPricingDashboard hospitalId={1} />);
    
    await waitFor(() => {
      expect(mockPricingAPI.getPricingHistory).toHaveBeenCalledWith(1, { limit: 20 });
    });
  });

  it('allows editing pricing for a resource', async () => {
    render(
      <HospitalPricingDashboard 
        hospitalId={1} 
        currentPricing={mockPricing}
      />
    );

    // Find and click edit button for beds
    const editButtons = screen.getAllByText('Edit');
    fireEvent.click(editButtons[0]);

    // Check that form fields appear
    expect(screen.getByLabelText('Base Rate *')).toBeInTheDocument();
    expect(screen.getByLabelText('Hourly Rate')).toBeInTheDocument();
    expect(screen.getByLabelText('Minimum Charge')).toBeInTheDocument();
    expect(screen.getByLabelText('Maximum Charge')).toBeInTheDocument();

    // Check that current values are populated
    expect(screen.getByDisplayValue('100')).toBeInTheDocument();
    expect(screen.getByDisplayValue('10')).toBeInTheDocument();
  });

  it('validates pricing data before saving', async () => {
    render(
      <HospitalPricingDashboard 
        hospitalId={1} 
        currentPricing={mockPricing}
      />
    );

    // Start editing
    const editButtons = screen.getAllByText('Edit');
    fireEvent.click(editButtons[0]);

    // Set invalid data (negative base rate)
    const baseRateInput = screen.getByLabelText('Base Rate *');
    fireEvent.change(baseRateInput, { target: { value: '-10' } });

    // Try to save
    const saveButton = screen.getByText('Save');
    fireEvent.click(saveButton);

    // Check for validation error
    await waitFor(() => {
      expect(screen.getByText('Base rate must be a positive number')).toBeInTheDocument();
    });

    // API should not be called
    expect(mockPricingAPI.updateHospitalPricing).not.toHaveBeenCalled();
  });

  it('saves valid pricing updates', async () => {
    const mockUpdatedPricing = {
      ...mockPricing.beds!,
      baseRate: 120,
      updatedAt: '2024-01-02T00:00:00Z'
    };

    mockPricingAPI.updateHospitalPricing.mockResolvedValue({
      data: { success: true, data: { pricing: mockUpdatedPricing } }
    } as any);

    const onPricingUpdate = jest.fn();

    render(
      <HospitalPricingDashboard 
        hospitalId={1} 
        currentPricing={mockPricing}
        onPricingUpdate={onPricingUpdate}
      />
    );

    // Start editing
    const editButtons = screen.getAllByText('Edit');
    fireEvent.click(editButtons[0]);

    // Update base rate
    const baseRateInput = screen.getByLabelText('Base Rate *');
    fireEvent.change(baseRateInput, { target: { value: '120' } });

    // Save
    const saveButton = screen.getByText('Save');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockPricingAPI.updateHospitalPricing).toHaveBeenCalledWith(1, {
        resourceType: 'beds',
        baseRate: 120,
        hourlyRate: 10,
        minimumCharge: 50,
        maximumCharge: 500,
        currency: 'USD'
      });
    });

    // Check that callback is called
    await waitFor(() => {
      expect(onPricingUpdate).toHaveBeenCalled();
    });
  });

  it('cancels editing without saving', async () => {
    render(
      <HospitalPricingDashboard 
        hospitalId={1} 
        currentPricing={mockPricing}
      />
    );

    // Start editing
    const editButtons = screen.getAllByText('Edit');
    fireEvent.click(editButtons[0]);

    // Change value
    const baseRateInput = screen.getByLabelText('Base Rate *');
    fireEvent.change(baseRateInput, { target: { value: '200' } });

    // Cancel
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    // Form should be hidden
    expect(screen.queryByLabelText('Base Rate *')).not.toBeInTheDocument();
    
    // Original value should still be displayed
    expect(screen.getByText('$100.00')).toBeInTheDocument();
  });

  it('displays pricing history', async () => {
    render(
      <HospitalPricingDashboard 
        hospitalId={1} 
        currentPricing={mockPricing}
      />
    );

    // Wait for component to load
    await waitFor(() => {
      expect(screen.getByText('Pricing Management')).toBeInTheDocument();
    });

    // Switch to history tab
    const historyTab = screen.getByText('Pricing History');
    expect(historyTab).toBeInTheDocument();
    fireEvent.click(historyTab);

    // Verify the API was called to load history
    await waitFor(() => {
      expect(mockPricingAPI.getPricingHistory).toHaveBeenCalledWith(1, { limit: 20 });
    });
  });

  it('calculates pricing preview', async () => {
    render(
      <HospitalPricingDashboard 
        hospitalId={1} 
        currentPricing={mockPricing}
      />
    );

    // Click preview button for beds
    const previewButton = screen.getByText('Preview Calculation');
    fireEvent.click(previewButton);

    await waitFor(() => {
      expect(mockPricingAPI.calculateBookingAmount).toHaveBeenCalledWith({
        hospitalId: 1,
        resourceType: 'beds',
        duration: 24
      });
    });
  });

  it('shows pricing preview tab with calculation functionality', async () => {
    render(
      <HospitalPricingDashboard 
        hospitalId={1} 
        currentPricing={mockPricing}
      />
    );

    // Wait for component to load
    await waitFor(() => {
      expect(screen.getByText('Pricing Management')).toBeInTheDocument();
    });

    // Switch to preview tab
    const previewTab = screen.getByText('Pricing Preview');
    expect(previewTab).toBeInTheDocument();
    fireEvent.click(previewTab);

    // Verify tab exists and can be clicked
    expect(previewTab).toBeInTheDocument();
  });

  it('handles API errors gracefully', async () => {
    mockPricingAPI.updateHospitalPricing.mockRejectedValue({
      response: { data: { error: 'Server error' } }
    });

    render(
      <HospitalPricingDashboard 
        hospitalId={1} 
        currentPricing={mockPricing}
      />
    );

    // Start editing and try to save
    const editButtons = screen.getAllByText('Edit');
    fireEvent.click(editButtons[0]);

    const saveButton = screen.getByText('Save');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('Server error')).toBeInTheDocument();
    });
  });

  it('displays no pricing message for unconfigured resources', async () => {
    render(
      <HospitalPricingDashboard 
        hospitalId={1} 
        currentPricing={mockPricing}
      />
    );

    // ICU should show no pricing message
    const icuCard = screen.getByText('ICU Beds').closest('.relative');
    expect(icuCard).toHaveTextContent('No pricing configured');
    expect(icuCard).toHaveTextContent('Click Edit to set rates');
  });

  it('validates minimum and maximum charge constraints', async () => {
    render(
      <HospitalPricingDashboard 
        hospitalId={1} 
        currentPricing={mockPricing}
      />
    );

    // Start editing
    const editButtons = screen.getAllByText('Edit');
    fireEvent.click(editButtons[0]);

    // Set minimum > maximum
    const minChargeInput = screen.getByLabelText('Minimum Charge');
    const maxChargeInput = screen.getByLabelText('Maximum Charge');
    
    fireEvent.change(minChargeInput, { target: { value: '600' } });
    fireEvent.change(maxChargeInput, { target: { value: '500' } });

    // Try to save
    const saveButton = screen.getByText('Save');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('Minimum charge cannot be greater than maximum charge')).toBeInTheDocument();
    });
  });

  it('refreshes pricing data when refresh button is clicked', async () => {
    render(
      <HospitalPricingDashboard 
        hospitalId={1} 
        currentPricing={mockPricing}
      />
    );

    // Wait for component to load
    await waitFor(() => {
      expect(screen.getByText('Pricing Management')).toBeInTheDocument();
    });

    const refreshButton = screen.getByText('Refresh');
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(mockPricingAPI.getHospitalPricing).toHaveBeenCalledWith(1);
    });
  });
});