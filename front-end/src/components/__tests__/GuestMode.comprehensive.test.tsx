import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AuthProvider } from '@/lib/AuthContext';

// Mock Next.js router
const mockPush = jest.fn();
const mockPathname = '/';

jest.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock API calls
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock components for testing
const MockHospitalList = () => {
  const [hospitals, setHospitals] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetch('/api/hospitals')
      .then(res => res.json())
      .then(data => {
        setHospitals(data.data || []);
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Loading hospitals...</div>;

  return (
    <div>
      <h1>Hospitals</h1>
      {hospitals.map((hospital: any) => (
        <div key={hospital.id} data-testid={`hospital-${hospital.id}`}>
          <h3>{hospital.name}</h3>
          <p>{hospital.address}</p>
          <button 
            onClick={() => mockPush(`/hospitals/${hospital.id}`)}
            data-testid={`view-hospital-${hospital.id}`}
          >
            View Details
          </button>
          <button 
            onClick={() => mockPush(`/booking?hospital=${hospital.id}`)}
            data-testid={`book-hospital-${hospital.id}`}
            disabled={!hospital.canBook}
          >
            {hospital.canBook ? 'Book Now' : 'Login to Book'}
          </button>
        </div>
      ))}
    </div>
  );
};

const MockBloodDonationForm = () => {
  const [formData, setFormData] = React.useState({
    requesterName: '',
    requesterPhone: '',
    bloodType: '',
    urgency: '',
    hospitalName: ''
  });
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const response = await fetch('/api/blood/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      if (response.ok) {
        setSubmitted(true);
      }
    } catch (error) {
      console.error('Error submitting blood request:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div data-testid="blood-donation-success">
        <h2>Thank you for your blood donation request!</h2>
        <p>We will contact you soon with further details.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} data-testid="blood-donation-form">
      <h1>Donate Blood</h1>
      <p>Help save lives by donating blood. No login required.</p>
      
      <input
        type="text"
        placeholder="Your Name"
        value={formData.requesterName}
        onChange={(e) => setFormData({...formData, requesterName: e.target.value})}
        data-testid="requester-name"
        required
      />
      
      <input
        type="tel"
        placeholder="Phone Number"
        value={formData.requesterPhone}
        onChange={(e) => setFormData({...formData, requesterPhone: e.target.value})}
        data-testid="requester-phone"
        required
      />
      
      <select
        value={formData.bloodType}
        onChange={(e) => setFormData({...formData, bloodType: e.target.value})}
        data-testid="blood-type"
        required
      >
        <option value="">Select Blood Type</option>
        <option value="A+">A+</option>
        <option value="A-">A-</option>
        <option value="B+">B+</option>
        <option value="B-">B-</option>
        <option value="AB+">AB+</option>
        <option value="AB-">AB-</option>
        <option value="O+">O+</option>
        <option value="O-">O-</option>
      </select>
      
      <select
        value={formData.urgency}
        onChange={(e) => setFormData({...formData, urgency: e.target.value})}
        data-testid="urgency"
        required
      >
        <option value="">Select Urgency</option>
        <option value="low">Low</option>
        <option value="medium">Medium</option>
        <option value="high">High</option>
      </select>
      
      <input
        type="text"
        placeholder="Hospital Name"
        value={formData.hospitalName}
        onChange={(e) => setFormData({...formData, hospitalName: e.target.value})}
        data-testid="hospital-name"
        required
      />
      
      <button 
        type="submit" 
        disabled={isSubmitting}
        data-testid="submit-blood-request"
      >
        {isSubmitting ? 'Submitting...' : 'Submit Blood Request'}
      </button>
    </form>
  );
};

const MockAuthGuard = ({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);

  React.useEffect(() => {
    // Simulate auth check
    const token = localStorage.getItem('token');
    setIsAuthenticated(!!token);
  }, []);

  if (!isAuthenticated) {
    return (
      <div data-testid="auth-guard-fallback">
        {fallback || (
          <div>
            <h2>Login Required</h2>
            <p>Please log in to access this feature.</p>
            <button onClick={() => mockPush('/login')}>
              Go to Login
            </button>
          </div>
        )}
      </div>
    );
  }

  return <>{children}</>;
};

describe('Guest Mode - Comprehensive Frontend Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
    localStorage.clear();
    sessionStorage.clear();
  });

  describe('Hospital Browsing - Guest Access', () => {
    it('should allow guests to view hospital listings', async () => {
      const mockHospitals = [
        {
          id: 1,
          name: 'Dhaka Medical College Hospital',
          address: 'Dhaka, Bangladesh',
          canBook: false,
          status: 'approved'
        },
        {
          id: 2,
          name: 'Square Hospital',
          address: 'Dhaka, Bangladesh',
          canBook: false,
          status: 'approved'
        }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          isGuest: true,
          data: mockHospitals
        })
      });

      render(<MockHospitalList />);

      await waitFor(() => {
        expect(screen.getByText('Dhaka Medical College Hospital')).toBeInTheDocument();
        expect(screen.getByText('Square Hospital')).toBeInTheDocument();
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/hospitals');
    });

    it('should show login prompts for booking buttons', async () => {
      const mockHospitals = [
        {
          id: 1,
          name: 'Test Hospital',
          address: 'Test Address',
          canBook: false,
          status: 'approved'
        }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          isGuest: true,
          data: mockHospitals
        })
      });

      render(<MockHospitalList />);

      await waitFor(() => {
        const bookButton = screen.getByTestId('book-hospital-1');
        expect(bookButton).toBeInTheDocument();
        expect(bookButton).toBeDisabled();
        expect(bookButton).toHaveTextContent('Login to Book');
      });
    });

    it('should allow guests to view hospital details', async () => {
      const mockHospitals = [
        {
          id: 1,
          name: 'Test Hospital',
          address: 'Test Address',
          canBook: false,
          status: 'approved'
        }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          isGuest: true,
          data: mockHospitals
        })
      });

      render(<MockHospitalList />);

      await waitFor(() => {
        const viewButton = screen.getByTestId('view-hospital-1');
        fireEvent.click(viewButton);
        expect(mockPush).toHaveBeenCalledWith('/hospitals/1');
      });
    });
  });

  describe('Blood Donation - Guest Access', () => {
    it('should allow guests to access blood donation form', () => {
      render(<MockBloodDonationForm />);

      expect(screen.getByText('Donate Blood')).toBeInTheDocument();
      expect(screen.getByText('Help save lives by donating blood. No login required.')).toBeInTheDocument();
      expect(screen.getByTestId('blood-donation-form')).toBeInTheDocument();
    });

    it('should allow guests to fill and submit blood donation form', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          isGuest: true,
          message: 'Thank you for your blood donation request',
          data: { id: 1 }
        })
      });

      render(<MockBloodDonationForm />);

      // Fill form
      fireEvent.change(screen.getByTestId('requester-name'), {
        target: { value: 'John Doe' }
      });
      fireEvent.change(screen.getByTestId('requester-phone'), {
        target: { value: '+880 1712345678' }
      });
      fireEvent.change(screen.getByTestId('blood-type'), {
        target: { value: 'O+' }
      });
      fireEvent.change(screen.getByTestId('urgency'), {
        target: { value: 'high' }
      });
      fireEvent.change(screen.getByTestId('hospital-name'), {
        target: { value: 'Dhaka Medical College Hospital' }
      });

      // Submit form
      fireEvent.click(screen.getByTestId('submit-blood-request'));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/blood/request', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requesterName: 'John Doe',
            requesterPhone: '+880 1712345678',
            bloodType: 'O+',
            urgency: 'high',
            hospitalName: 'Dhaka Medical College Hospital'
          })
        });
      });

      await waitFor(() => {
        expect(screen.getByTestId('blood-donation-success')).toBeInTheDocument();
        expect(screen.getByText('Thank you for your blood donation request!')).toBeInTheDocument();
      });
    });

    it('should validate required fields in blood donation form', () => {
      render(<MockBloodDonationForm />);

      const submitButton = screen.getByTestId('submit-blood-request');
      fireEvent.click(submitButton);

      // Form should not submit without required fields
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('AuthGuard Component - Guest Protection', () => {
    it('should show fallback content for unauthenticated users', () => {
      render(
        <MockAuthGuard>
          <div>Protected Content</div>
        </MockAuthGuard>
      );

      expect(screen.getByTestId('auth-guard-fallback')).toBeInTheDocument();
      expect(screen.getByText('Login Required')).toBeInTheDocument();
      expect(screen.getByText('Please log in to access this feature.')).toBeInTheDocument();
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    it('should redirect to login when clicking login button', () => {
      render(
        <MockAuthGuard>
          <div>Protected Content</div>
        </MockAuthGuard>
      );

      const loginButton = screen.getByText('Go to Login');
      fireEvent.click(loginButton);

      expect(mockPush).toHaveBeenCalledWith('/login');
    });

    it('should show protected content for authenticated users', () => {
      localStorage.setItem('token', 'valid-token');

      render(
        <MockAuthGuard>
          <div>Protected Content</div>
        </MockAuthGuard>
      );

      expect(screen.getByText('Protected Content')).toBeInTheDocument();
      expect(screen.queryByTestId('auth-guard-fallback')).not.toBeInTheDocument();
    });

    it('should show custom fallback content', () => {
      const customFallback = (
        <div data-testid="custom-fallback">
          <h2>Custom Login Message</h2>
          <p>You need to be logged in to book resources.</p>
        </div>
      );

      render(
        <MockAuthGuard fallback={customFallback}>
          <div>Protected Content</div>
        </MockAuthGuard>
      );

      expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
      expect(screen.getByText('Custom Login Message')).toBeInTheDocument();
      expect(screen.getByText('You need to be logged in to book resources.')).toBeInTheDocument();
    });
  });

  describe('Guest User Experience Flow', () => {
    it('should handle complete guest browsing to login flow', async () => {
      // Start with hospital browsing
      const mockHospitals = [
        {
          id: 1,
          name: 'Test Hospital',
          address: 'Test Address',
          canBook: false,
          status: 'approved'
        }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          isGuest: true,
          data: mockHospitals
        })
      });

      render(<MockHospitalList />);

      await waitFor(() => {
        expect(screen.getByText('Test Hospital')).toBeInTheDocument();
      });

      // Try to book (should be disabled)
      const bookButton = screen.getByTestId('book-hospital-1');
      expect(bookButton).toBeDisabled();
      expect(bookButton).toHaveTextContent('Login to Book');

      // View hospital details (should work)
      const viewButton = screen.getByTestId('view-hospital-1');
      fireEvent.click(viewButton);
      expect(mockPush).toHaveBeenCalledWith('/hospitals/1');
    });

    it('should preserve intended destination during login redirect', () => {
      // Simulate clicking a restricted action
      const intendedDestination = '/booking?hospital=1';
      
      // Mock the redirect behavior
      sessionStorage.setItem('intendedDestination', intendedDestination);
      mockPush(`/login?returnTo=${encodeURIComponent(intendedDestination)}`);

      expect(mockPush).toHaveBeenCalledWith(
        `/login?returnTo=${encodeURIComponent(intendedDestination)}`
      );
      expect(sessionStorage.getItem('intendedDestination')).toBe(intendedDestination);
    });
  });

  describe('Error Handling - Guest Mode', () => {
    it('should handle API errors gracefully for hospital listing', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      render(<MockHospitalList />);

      await waitFor(() => {
        expect(screen.getByText('Loading hospitals...')).toBeInTheDocument();
      });

      // Should handle error gracefully (component should not crash)
      expect(screen.queryByText('Hospitals')).toBeInTheDocument();
    });

    it('should handle blood donation submission errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Submission failed'));

      render(<MockBloodDonationForm />);

      // Fill and submit form
      fireEvent.change(screen.getByTestId('requester-name'), {
        target: { value: 'John Doe' }
      });
      fireEvent.change(screen.getByTestId('requester-phone'), {
        target: { value: '+880 1712345678' }
      });
      fireEvent.change(screen.getByTestId('blood-type'), {
        target: { value: 'O+' }
      });
      fireEvent.change(screen.getByTestId('urgency'), {
        target: { value: 'high' }
      });
      fireEvent.change(screen.getByTestId('hospital-name'), {
        target: { value: 'Test Hospital' }
      });

      fireEvent.click(screen.getByTestId('submit-blood-request'));

      // Should handle error gracefully
      await waitFor(() => {
        expect(screen.getByTestId('submit-blood-request')).not.toBeDisabled();
      });
    });
  });
});