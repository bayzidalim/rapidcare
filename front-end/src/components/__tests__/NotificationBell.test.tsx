import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import NotificationBell from '../NotificationBell';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

const mockPush = jest.fn();
const mockRouter = {
  push: mockPush,
  back: jest.fn(),
  forward: jest.fn(),
  refresh: jest.fn(),
  replace: jest.fn(),
  prefetch: jest.fn(),
};

describe('NotificationBell', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
  });

  it('renders bell icon correctly', () => {
    render(<NotificationBell />);
    
    const button = screen.getByRole('button', { name: /notifications/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('aria-label', 'Notifications');
    expect(button).toHaveAttribute('title', 'Notifications');
  });

  it('does not show notification badge when unreadCount is 0', () => {
    render(<NotificationBell unreadCount={0} />);
    
    const badge = screen.queryByText('0');
    expect(badge).not.toBeInTheDocument();
  });

  it('shows notification badge with correct count when unreadCount > 0', () => {
    render(<NotificationBell unreadCount={5} />);
    
    const badge = screen.getByText('5');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('bg-red-500', 'text-white', 'animate-pulse');
  });

  it('shows "99+" when unreadCount is greater than 99', () => {
    render(<NotificationBell unreadCount={150} />);
    
    const badge = screen.getByText('99+');
    expect(badge).toBeInTheDocument();
  });

  it('navigates to notifications page when clicked (default behavior)', () => {
    render(<NotificationBell />);
    
    const button = screen.getByRole('button', { name: /notifications/i });
    fireEvent.click(button);
    
    expect(mockPush).toHaveBeenCalledWith('/notifications');
  });

  it('calls custom onClick handler when provided', () => {
    const mockOnClick = jest.fn();
    render(<NotificationBell onClick={mockOnClick} />);
    
    const button = screen.getByRole('button', { name: /notifications/i });
    fireEvent.click(button);
    
    expect(mockOnClick).toHaveBeenCalledTimes(1);
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('shows tooltip on hover', async () => {
    render(<NotificationBell />);
    
    const button = screen.getByRole('button', { name: /notifications/i });
    
    // Initially tooltip should not be visible
    expect(screen.queryByText('Notifications')).not.toBeInTheDocument();
    
    // Hover over the button
    fireEvent.mouseEnter(button);
    
    await waitFor(() => {
      expect(screen.getByText('Notifications')).toBeInTheDocument();
    });
  });

  it('hides tooltip on mouse leave', async () => {
    render(<NotificationBell />);
    
    const button = screen.getByRole('button', { name: /notifications/i });
    
    // Hover over the button
    fireEvent.mouseEnter(button);
    
    await waitFor(() => {
      expect(screen.getByText('Notifications')).toBeInTheDocument();
    });
    
    // Mouse leave
    fireEvent.mouseLeave(button);
    
    await waitFor(() => {
      expect(screen.queryByText('Notifications')).not.toBeInTheDocument();
    });
  });

  it('applies custom className', () => {
    render(<NotificationBell className="custom-class" />);
    
    const button = screen.getByRole('button', { name: /notifications/i });
    expect(button).toHaveClass('custom-class');
  });

  it('has proper accessibility attributes', () => {
    render(<NotificationBell />);
    
    const button = screen.getByRole('button', { name: /notifications/i });
    expect(button).toHaveAttribute('aria-label', 'Notifications');
    expect(button).toHaveAttribute('title', 'Notifications');
  });

  it('has focus styles for keyboard navigation', () => {
    render(<NotificationBell />);
    
    const button = screen.getByRole('button', { name: /notifications/i });
    expect(button).toHaveClass('focus:outline-none', 'focus:ring-2', 'focus:ring-blue-500', 'focus:ring-offset-2');
  });

  it('changes icon color on hover', async () => {
    render(<NotificationBell />);
    
    const button = screen.getByRole('button', { name: /notifications/i });
    const bellIcon = button.querySelector('svg');
    
    expect(bellIcon).toHaveClass('text-gray-600');
    
    fireEvent.mouseEnter(button);
    
    await waitFor(() => {
      expect(bellIcon).toHaveClass('text-gray-900');
    });
    
    fireEvent.mouseLeave(button);
    
    await waitFor(() => {
      expect(bellIcon).toHaveClass('text-gray-600');
    });
  });

  it('badge has correct positioning and styling', () => {
    render(<NotificationBell unreadCount={3} />);
    
    const badge = screen.getByText('3');
    expect(badge).toHaveClass(
      'absolute',
      '-top-1',
      '-right-1',
      'bg-red-500',
      'text-white',
      'text-xs',
      'font-bold',
      'rounded-full',
      'min-w-[18px]',
      'h-[18px]',
      'flex',
      'items-center',
      'justify-center',
      'px-1',
      'animate-pulse'
    );
  });
});