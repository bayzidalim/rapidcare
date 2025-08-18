import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { jest } from '@jest/globals';
import BookingForm from '../BookingForm';

// Mock the API module
jest.mock('../../lib/api', () => ({
  createBooking: jest.fn(),
  getHospitals: jest.fn(),
}));

// Mock the auth module
jest.mock('../../lib/auth', () => ({
  useAuth: () => ({
    user: { id: 1, name: 'Test User', email: 'test@example.com' },
    isAuthenticated: true,
  }),
}));

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
  }),
}));

const mockHospitals = [
  {
    id: 1,
    name: 'Test Hospital',
    address: { city: 'Test City' },
    resources: {
      beds: { available: 5, total: 10 },
      icu: { available: 2, total: 5 },
      operationTheatres: { available: 1, total: 3 },
    },
  },
  {
    id: 2,
    name: 'Another Hospital',
    address: { city: 'Another City' },
    resources: {
      beds: { available: 3, total: 8 },
      icu: { available: 0, total: 4 },
      operationTheatres: { available: 2, total: 2 },
    },
  },
];

describe('BookingForm', () => {
  const mockOnSubmit = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    const { getHospitals } = require('../../lib/api');
    getHospitals.mockResolvedValue({ data: mockHospitals });
  });

  const renderBookingForm = (props = {}) => {
    return render(
      <BookingForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        {...props}
      />
    );
  };

  describe('Form Rendering', () => {
    it('should render all required form fields', async () => {
      renderBookingForm();

      await waitFor(() => {
        expect(screen.getByLabelText(/hospital/i)).toBeInTheDocument();
      });

      expect(screen.getByLabelText(/resource type/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/patient name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/patient age/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/patient gender/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/medical condition/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/urgency level/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/emergency contact name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/emergency contact phone/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/relationship/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/scheduled date/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/estimated duration/i)).toBeInTheDocument();
    });

    it('should render submit and cancel buttons', () => {
      renderBookingForm();

      expect(screen.getByRole('button', { name: /submit booking/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('should load and display hospitals', async () => {
      renderBookingForm();

      await waitFor(() => {
        expect(screen.getByText('Test Hospital')).toBeInTheDocument();
        expect(screen.getByText('Another Hospital')).toBeInTheDocument();
      });
    });
  });

  describe('Form Validation', () => {
    it('should show validation errors for empty required fields', async () => {
      const user = userEvent.setup();
      renderBookingForm();

      const submitButton = screen.getByRole('button', { name: /submit booking/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/patient name is required/i)).toBeInTheDocument();
        expect(screen.getByText(/patient age is required/i)).toBeInTheDocument();
        expect(screen.getByText(/medical condition is required/i)).toBeInTheDocument();
      });
    });

    it('should validate patient age range', async () => {
      const user = userEvent.setup();
      renderBookingForm();

      const ageInput = screen.getByLabelText(/patient age/i);
      await user.type(ageInput, '200');

      const submitButton = screen.getByRole('button', { name: /submit booking/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/age must be between 1 and 150/i)).toBeInTheDocument();
      });
    });

    it('should validate phone number format', async () => {
      const user = userEvent.setup();
      renderBookingForm();

      const phoneInput = screen.getByLabelText(/emergency contact phone/i);
      await user.type(phoneInput, 'invalid-phone');

      const submitButton = screen.getByRole('button', { name: /submit booking/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/invalid phone number format/i)).toBeInTheDocument();
      });
    });

    it('should validate scheduled date is in the future', async () => {
      const user = userEvent.setup();
      renderBookingForm();

      const dateInput = screen.getByLabelText(/scheduled date/i);
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);
      
      await user.type(dateInput, pastDate.toISOString().split('T')[0]);

      const submitButton = screen.getByRole('button', { name: /submit booking/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/scheduled date must be in the future/i)).toBeInTheDocument();
      });
    });

    it('should validate medical condition minimum length', async () => {
      const user = userEvent.setup();
      renderBookingForm();

      const conditionInput = screen.getByLabelText(/medical condition/i);
      await user.type(conditionInput, 'flu');

      const submitButton = screen.getByRole('button', { name: /submit booking/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/medical condition must be at least 10 characters/i)).toBeInTheDocument();
      });
    });
  });

  describe('Form Interaction', () => {
    it('should update resource availability when hospital is selected', async () => {
      const user = userEvent.setup();
      renderBookingForm();

      await waitFor(() => {
        expect(screen.getByText('Test Hospital')).toBeInTheDocument();
      });

      const hospitalSelect = screen.getByLabelText(/hospital/i);
      await user.selectOptions(hospitalSelect, '1');

      await waitFor(() => {
        expect(screen.getByText(/beds: 5 available/i)).toBeInTheDocument();
        expect(screen.getByText(/icu: 2 available/i)).toBeInTheDocument();
        expect(screen.getByText(/operation theatres: 1 available/i)).toBeInTheDocument();
      });
    });

    it('should disable resource types that are not available', async () => {
      const user = userEvent.setup();
      renderBookingForm();

      await waitFor(() => {
        expect(screen.getByText('Another Hospital')).toBeInTheDocument();
      });

      const hospitalSelect = screen.getByLabelText(/hospital/i);
      await user.selectOptions(hospitalSelect, '2');

      await waitFor(() => {
        const icuOption = screen.getByRole('option', { name: /icu/i });
        expect(icuOption).toBeDisabled();
      });
    });

    it('should show urgency level descriptions', async () => {
      const user = userEvent.setup();
      renderBookingForm();

      const urgencySelect = screen.getByLabelText(/urgency level/i);
      await user.selectOptions(urgencySelect, 'critical');

      expect(screen.getByText(/life-threatening emergency/i)).toBeInTheDocument();
    });

    it('should estimate duration based on resource type', async () => {
      const user = userEvent.setup();
      renderBookingForm();

      const resourceSelect = screen.getByLabelText(/resource type/i);
      await user.selectOptions(resourceSelect, 'operationTheatres');

      const durationInput = screen.getByLabelText(/estimated duration/i);
      expect(durationInput.value).toBe('4'); // Default for operation theatres
    });
  });

  describe('Form Submission', () => {
    const validFormData = {
      hospitalId: '1',
      resourceType: 'beds',
      patientName: 'John Doe',
      patientAge: '30',
      patientGender: 'male',
      medicalCondition: 'Emergency surgery required for appendicitis',
      urgency: 'high',
      emergencyContactName: 'Jane Doe',
      emergencyContactPhone: '+8801234567890',
      emergencyContactRelationship: 'spouse',
      scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      estimatedDuration: '48',
      notes: 'Patient requires immediate attention',
    };

    it('should submit form with valid data', async () => {
      const user = userEvent.setup();
      const { createBooking } = require('../../lib/api');
      createBooking.mockResolvedValue({
        success: true,
        data: { id: 1, bookingReference: 'BK-20241201-ABC123' },
      });

      renderBookingForm();

      // Fill out the form
      await waitFor(() => {
        expect(screen.getByLabelText(/hospital/i)).toBeInTheDocument();
      });

      for (const [field, value] of Object.entries(validFormData)) {
        const input = screen.getByLabelText(new RegExp(field.replace(/([A-Z])/g, ' $1').toLowerCase(), 'i'));
        if (input.tagName === 'SELECT') {
          await user.selectOptions(input, value);
        } else {
          await user.clear(input);
          await user.type(input, value);
        }
      }

      const submitButton = screen.getByRole('button', { name: /submit booking/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(createBooking).toHaveBeenCalledWith(expect.objectContaining({
          hospitalId: 1,
          resourceType: 'beds',
          patientName: 'John Doe',
          patientAge: 30,
        }));
      });

      expect(mockOnSubmit).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          id: 1,
          bookingReference: 'BK-20241201-ABC123',
        }),
      }));
    });

    it('should handle API errors gracefully', async () => {
      const user = userEvent.setup();
      const { createBooking } = require('../../lib/api');
      createBooking.mockRejectedValue(new Error('Network error'));

      renderBookingForm();

      // Fill out the form with valid data
      await waitFor(() => {
        expect(screen.getByLabelText(/hospital/i)).toBeInTheDocument();
      });

      for (const [field, value] of Object.entries(validFormData)) {
        const input = screen.getByLabelText(new RegExp(field.replace(/([A-Z])/g, ' $1').toLowerCase(), 'i'));
        if (input.tagName === 'SELECT') {
          await user.selectOptions(input, value);
        } else {
          await user.clear(input);
          await user.type(input, value);
        }
      }

      const submitButton = screen.getByRole('button', { name: /submit booking/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to submit booking/i)).toBeInTheDocument();
      });
    });

    it('should show loading state during submission', async () => {
      const user = userEvent.setup();
      const { createBooking } = require('../../lib/api');
      
      // Mock a delayed response
      createBooking.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          success: true,
          data: { id: 1, bookingReference: 'BK-20241201-ABC123' }
        }), 100))
      );

      renderBookingForm();

      // Fill out the form
      await waitFor(() => {
        expect(screen.getByLabelText(/hospital/i)).toBeInTheDocument();
      });

      for (const [field, value] of Object.entries(validFormData)) {
        const input = screen.getByLabelText(new RegExp(field.replace(/([A-Z])/g, ' $1').toLowerCase(), 'i'));
        if (input.tagName === 'SELECT') {
          await user.selectOptions(input, value);
        } else {
          await user.clear(input);
          await user.type(input, value);
        }
      }

      const submitButton = screen.getByRole('button', { name: /submit booking/i });
      await user.click(submitButton);

      // Check for loading state
      expect(screen.getByText(/submitting/i)).toBeInTheDocument();
      expect(submitButton).toBeDisabled();

      // Wait for completion
      await waitFor(() => {
        expect(screen.queryByText(/submitting/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Cancel Functionality', () => {
    it('should call onCancel when cancel button is clicked', async () => {
      const user = userEvent.setup();
      renderBookingForm();

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(mockOnCancel).toHaveBeenCalled();
    });

    it('should show confirmation dialog when form has unsaved changes', async () => {
      const user = userEvent.setup();
      renderBookingForm();

      // Make some changes to the form
      const nameInput = screen.getByLabelText(/patient name/i);
      await user.type(nameInput, 'John Doe');

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(screen.getByText(/unsaved changes/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /discard changes/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /continue editing/i })).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', () => {
      renderBookingForm();

      expect(screen.getByRole('form')).toBeInTheDocument();
      expect(screen.getByLabelText(/patient name/i)).toHaveAttribute('aria-required', 'true');
      expect(screen.getByLabelText(/patient age/i)).toHaveAttribute('aria-required', 'true');
      expect(screen.getByLabelText(/medical condition/i)).toHaveAttribute('aria-required', 'true');
    });

    it('should associate error messages with form fields', async () => {
      const user = userEvent.setup();
      renderBookingForm();

      const submitButton = screen.getByRole('button', { name: /submit booking/i });
      await user.click(submitButton);

      await waitFor(() => {
        const nameInput = screen.getByLabelText(/patient name/i);
        const errorMessage = screen.getByText(/patient name is required/i);
        
        expect(nameInput).toHaveAttribute('aria-describedby');
        expect(errorMessage).toHaveAttribute('id', nameInput.getAttribute('aria-describedby'));
      });
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      renderBookingForm();

      await waitFor(() => {
        expect(screen.getByLabelText(/hospital/i)).toBeInTheDocument();
      });

      // Tab through form fields
      await user.tab();
      expect(screen.getByLabelText(/hospital/i)).toHaveFocus();

      await user.tab();
      expect(screen.getByLabelText(/resource type/i)).toHaveFocus();

      await user.tab();
      expect(screen.getByLabelText(/patient name/i)).toHaveFocus();
    });
  });

  describe('Responsive Design', () => {
    it('should adapt to mobile viewport', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      renderBookingForm();

      const form = screen.getByRole('form');
      expect(form).toHaveClass('mobile-responsive');
    });

    it('should stack form fields vertically on small screens', () => {
      // Mock small viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 320,
      });

      renderBookingForm();

      const formContainer = screen.getByTestId('form-container');
      expect(formContainer).toHaveClass('flex-col');
    });
  });
});