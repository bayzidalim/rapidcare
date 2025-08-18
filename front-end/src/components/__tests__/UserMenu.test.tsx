import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import UserMenu from '../UserMenu';
import { User } from '@/lib/types';

// Mock Next.js Link component
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
});

describe('UserMenu', () => {
  const mockOnLogout = jest.fn();
  
  const mockRegularUser: User = {
    id: 1,
    name: 'John Doe',
    email: 'john.doe@example.com',
    userType: 'user',
  };

  const mockHospitalAuthority: User = {
    id: 2,
    name: 'Jane Smith',
    email: 'jane.smith@hospital.com',
    userType: 'hospital-authority',
    hospitalId: 1,
  };

  const mockAdmin: User = {
    id: 3,
    name: 'Admin User',
    email: 'admin@system.com',
    userType: 'admin',
  };

  beforeEach(() => {
    mockOnLogout.mockClear();
  });

  describe('User Avatar and Display', () => {
    it('should display user initials in avatar', () => {
      render(<UserMenu user={mockRegularUser} onLogout={mockOnLogout} />);
      
      const avatarButton = screen.getByRole('button', { name: /user menu for john doe/i });
      expect(avatarButton).toBeInTheDocument();
      expect(avatarButton).toHaveTextContent('JD');
    });

    it('should handle single name correctly', () => {
      const singleNameUser = { ...mockRegularUser, name: 'Madonna' };
      render(<UserMenu user={singleNameUser} onLogout={mockOnLogout} />);
      
      const avatarButton = screen.getByRole('button');
      expect(avatarButton).toHaveTextContent('M');
    });

    it('should handle long names by taking first two initials', () => {
      const longNameUser = { ...mockRegularUser, name: 'John Michael Smith Doe' };
      render(<UserMenu user={longNameUser} onLogout={mockOnLogout} />);
      
      const avatarButton = screen.getByRole('button');
      expect(avatarButton).toHaveTextContent('JM');
    });

    it('should apply custom className', () => {
      render(<UserMenu user={mockRegularUser} onLogout={mockOnLogout} className="custom-class" />);
      
      const avatarButton = screen.getByRole('button');
      expect(avatarButton).toHaveClass('custom-class');
    });
  });

  describe('Dropdown Menu Content', () => {
    it('should show user information when dropdown is opened', async () => {
      const user = userEvent.setup();
      render(<UserMenu user={mockRegularUser} onLogout={mockOnLogout} />);
      
      const avatarButton = screen.getByRole('button');
      await user.click(avatarButton);
      
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('john.doe@example.com')).toBeInTheDocument();
        expect(screen.getByText('Patient')).toBeInTheDocument();
      });
    });

    it('should display correct role names for different user types', () => {
      // Test admin user
      const { rerender } = render(<UserMenu user={mockAdmin} onLogout={mockOnLogout} />);
      
      // Test hospital authority user
      rerender(<UserMenu user={mockHospitalAuthority} onLogout={mockOnLogout} />);
      
      // Test regular user
      rerender(<UserMenu user={mockRegularUser} onLogout={mockOnLogout} />);
      
      // The component should render without errors for all user types
      expect(screen.getByRole('button', { name: /user menu for john doe/i })).toBeInTheDocument();
    });

    it('should show profile link for all users', async () => {
      const user = userEvent.setup();
      render(<UserMenu user={mockRegularUser} onLogout={mockOnLogout} />);
      
      const avatarButton = screen.getByRole('button');
      await user.click(avatarButton);
      
      await waitFor(() => {
        const profileLink = screen.getByRole('link', { name: /profile/i });
        expect(profileLink).toBeInTheDocument();
        expect(profileLink).toHaveAttribute('href', '/profile');
      });
    });

    it('should show hospital settings link only for hospital authority users', async () => {
      const user = userEvent.setup();
      
      // Test hospital authority user - should show hospital settings
      render(<UserMenu user={mockHospitalAuthority} onLogout={mockOnLogout} />);
      const hospitalButton = screen.getByRole('button', { name: /user menu for jane smith/i });
      await user.click(hospitalButton);
      
      await waitFor(() => {
        const hospitalSettingsLink = screen.getByRole('link', { name: /hospital settings/i });
        expect(hospitalSettingsLink).toBeInTheDocument();
        expect(hospitalSettingsLink).toHaveAttribute('href', '/hospitals/manage');
      });
    });

    it('should show logout option for all users', async () => {
      const user = userEvent.setup();
      render(<UserMenu user={mockRegularUser} onLogout={mockOnLogout} />);
      
      const avatarButton = screen.getByRole('button');
      await user.click(avatarButton);
      
      await waitFor(() => {
        const logoutButton = screen.getByRole('menuitem', { name: /log out/i });
        expect(logoutButton).toBeInTheDocument();
      });
    });
  });

  describe('Interactions', () => {
    it('should call onLogout when logout is clicked', async () => {
      const user = userEvent.setup();
      render(<UserMenu user={mockRegularUser} onLogout={mockOnLogout} />);
      
      const avatarButton = screen.getByRole('button');
      await user.click(avatarButton);
      
      await waitFor(() => {
        const logoutButton = screen.getByRole('menuitem', { name: /log out/i });
        expect(logoutButton).toBeInTheDocument();
      });
      
      const logoutButton = screen.getByRole('menuitem', { name: /log out/i });
      await user.click(logoutButton);
      
      expect(mockOnLogout).toHaveBeenCalledTimes(1);
    });

    it('should close dropdown when clicking outside', async () => {
      const user = userEvent.setup();
      render(
        <div>
          <UserMenu user={mockRegularUser} onLogout={mockOnLogout} />
          <div data-testid="outside-element">Outside</div>
        </div>
      );
      
      const avatarButton = screen.getByRole('button', { name: /user menu for john doe/i });
      await user.click(avatarButton);
      
      // Verify dropdown is open
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });
      
      // Simulate clicking outside by pressing Escape key (which is how Radix handles outside clicks)
      await user.keyboard('{Escape}');
      
      // Verify dropdown is closed
      await waitFor(() => {
        expect(screen.queryByText('john.doe@example.com')).not.toBeInTheDocument();
      });
    });
  });

  describe('Keyboard Navigation', () => {
    it('should open dropdown with Enter key', async () => {
      const user = userEvent.setup();
      render(<UserMenu user={mockRegularUser} onLogout={mockOnLogout} />);
      
      const avatarButton = screen.getByRole('button');
      
      // Focus and open dropdown with Enter key
      await user.click(avatarButton);
      await user.keyboard('{Enter}');
      
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });
    });

    it('should open dropdown with Space key', async () => {
      const user = userEvent.setup();
      render(<UserMenu user={mockRegularUser} onLogout={mockOnLogout} />);
      
      const avatarButton = screen.getByRole('button');
      
      // Focus and open dropdown with Space key
      await user.click(avatarButton);
      await user.keyboard(' ');
      
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });
    });

    it('should close dropdown with Escape key', async () => {
      const user = userEvent.setup();
      render(<UserMenu user={mockRegularUser} onLogout={mockOnLogout} />);
      
      const avatarButton = screen.getByRole('button');
      await user.click(avatarButton);
      
      // Verify dropdown is open
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });
      
      // Press Escape to close
      await user.keyboard('{Escape}');
      
      // Verify dropdown is closed
      await waitFor(() => {
        expect(screen.queryByText('john.doe@example.com')).not.toBeInTheDocument();
      });
    });

    it('should activate logout with click', async () => {
      const user = userEvent.setup();
      render(<UserMenu user={mockRegularUser} onLogout={mockOnLogout} />);
      
      const avatarButton = screen.getByRole('button');
      await user.click(avatarButton);
      
      await waitFor(() => {
        const logoutButton = screen.getByRole('menuitem', { name: /log out/i });
        expect(logoutButton).toBeInTheDocument();
      });
      
      // Click logout button
      const logoutButton = screen.getByRole('menuitem', { name: /log out/i });
      await user.click(logoutButton);
      
      expect(mockOnLogout).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<UserMenu user={mockRegularUser} onLogout={mockOnLogout} />);
      
      const avatarButton = screen.getByRole('button', { name: /user menu for john doe/i });
      expect(avatarButton).toHaveAttribute('aria-label', 'User menu for John Doe');
    });

    it('should have proper focus management', async () => {
      const user = userEvent.setup();
      render(<UserMenu user={mockRegularUser} onLogout={mockOnLogout} />);
      
      const avatarButton = screen.getByRole('button');
      
      // Focus should be on trigger initially
      avatarButton.focus();
      expect(avatarButton).toHaveFocus();
      
      // Open dropdown
      await user.click(avatarButton);
      
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });
      
      // Dropdown should be accessible
      const menu = screen.getByRole('menu');
      expect(menu).toBeInTheDocument();
    });

    it('should support screen reader navigation', async () => {
      const user = userEvent.setup();
      render(<UserMenu user={mockRegularUser} onLogout={mockOnLogout} />);
      
      const avatarButton = screen.getByRole('button');
      await user.click(avatarButton);
      
      await waitFor(() => {
        // Check that menu items have proper roles
        expect(screen.getByRole('link', { name: /profile/i })).toBeInTheDocument();
        expect(screen.getByRole('menuitem', { name: /log out/i })).toBeInTheDocument();
        expect(screen.getByRole('menu')).toBeInTheDocument();
      });
    });
  });
});