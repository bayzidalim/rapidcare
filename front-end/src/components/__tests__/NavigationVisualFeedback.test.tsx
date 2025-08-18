import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { usePathname } from 'next/navigation';
import Navigation from '../Navigation';
import * as auth from '@/lib/auth';

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
}));

// Mock auth module
jest.mock('@/lib/auth', () => ({
  isAuthenticated: jest.fn(),
  getCurrentUser: jest.fn(),
  logout: jest.fn(),
}));

// Mock notification hook
jest.mock('@/lib/hooks/useNotificationCount', () => ({
  useNotificationCount: jest.fn(),
}));

const mockUsePathname = usePathname as jest.MockedFunction<typeof usePathname>;
const mockIsAuthenticated = auth.isAuthenticated as jest.MockedFunction<typeof auth.isAuthenticated>;
const mockGetCurrentUser = auth.getCurrentUser as jest.MockedFunction<typeof auth.getCurrentUser>;
const mockUseNotificationCount = jest.requireMock('@/lib/hooks/useNotificationCount').useNotificationCount as jest.MockedFunction<() => any>;

describe('Navigation Visual Feedback and Interactions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePathname.mockReturnValue('/');
    // Default mock for notification hook
    mockUseNotificationCount.mockReturnValue({
      count: 3,
      loading: false,
      error: null,
      refetch: jest.fn(),
    });
  });

  describe('Hover Effects', () => {
    it('should apply hover effects to navigation items', async () => {
      mockIsAuthenticated.mockReturnValue(true);
      mockGetCurrentUser.mockReturnValue({
        id: 1,
        name: 'Test User',
        email: 'test@example.com',
        userType: 'user',
      });

      render(<Navigation />);
      
      const homeLink = screen.getByRole('link', { name: /home/i });
      
      // Check that hover classes are present in the className
      expect(homeLink).toHaveClass('hover:bg-gradient-to-r');
      expect(homeLink).toHaveClass('hover:from-blue-50');
      expect(homeLink).toHaveClass('hover:to-indigo-50');
      expect(homeLink).toHaveClass('hover:scale-[1.02]');
      expect(homeLink).toHaveClass('hover:shadow-sm');
    });

    it('should apply hover effects to logo', () => {
      render(<Navigation />);
      
      const logoLink = screen.getByRole('link', { name: /instant hospitalization/i });
      
      expect(logoLink).toHaveClass('hover:scale-105');
    });

    it('should apply hover effects to mobile menu button', () => {
      render(<Navigation />);
      
      const mobileMenuButton = screen.getByRole('button', { name: /open menu/i });
      
      expect(mobileMenuButton).toHaveClass('hover:bg-blue-50');
    });
  });

  describe('Click Feedback Animations', () => {
    it('should apply click feedback classes to navigation items', () => {
      mockIsAuthenticated.mockReturnValue(true);
      mockGetCurrentUser.mockReturnValue({
        id: 1,
        name: 'Test User',
        email: 'test@example.com',
        userType: 'user',
      });

      render(<Navigation />);
      
      const homeLink = screen.getByRole('link', { name: /home/i });
      
      // Check that click feedback classes are present
      expect(homeLink).toHaveClass('active:scale-[0.98]');
      expect(homeLink).toHaveClass('active:shadow-inner');
    });

    it('should apply click feedback to mobile menu button', () => {
      render(<Navigation />);
      
      const mobileMenuButton = screen.getByRole('button', { name: /open menu/i });
      
      expect(mobileMenuButton).toHaveClass('active:scale-95');
      expect(mobileMenuButton).toHaveClass('active:bg-blue-100');
    });

    it('should apply touch-friendly interactions to mobile navigation items', () => {
      mockIsAuthenticated.mockReturnValue(true);
      mockGetCurrentUser.mockReturnValue({
        id: 1,
        name: 'Test User',
        email: 'test@example.com',
        userType: 'user',
      });

      render(<Navigation />);
      
      // Open mobile menu
      const mobileMenuButton = screen.getByRole('button', { name: /open menu/i });
      fireEvent.click(mobileMenuButton);
      
      // Check mobile navigation items have touch-friendly classes
      const mobileLinks = screen.getAllByRole('link');
      const mobileNavLinks = mobileLinks.filter(link => 
        link.className.includes('touch-manipulation')
      );
      
      expect(mobileNavLinks.length).toBeGreaterThan(0);
      mobileNavLinks.forEach(link => {
        expect(link).toHaveClass('touch-manipulation');
        expect(link).toHaveClass('select-none');
        expect(link).toHaveClass('active:scale-95');
        expect(link).toHaveClass('min-h-[48px]'); // Minimum touch target size
      });
    });
  });

  describe('Active Page Highlighting', () => {
    it('should highlight active navigation item for home page', () => {
      mockUsePathname.mockReturnValue('/');
      mockIsAuthenticated.mockReturnValue(true);
      mockGetCurrentUser.mockReturnValue({
        id: 1,
        name: 'Test User',
        email: 'test@example.com',
        userType: 'user',
      });

      render(<Navigation />);
      
      const homeLink = screen.getByRole('link', { name: /home/i });
      
      // Check active state classes
      expect(homeLink).toHaveClass('bg-gradient-to-r');
      expect(homeLink).toHaveClass('from-blue-100');
      expect(homeLink).toHaveClass('to-indigo-100');
      expect(homeLink).toHaveClass('text-blue-700');
      expect(homeLink).toHaveClass('shadow-sm');
      expect(homeLink).toHaveClass('border-blue-200/50');
    });

    it('should highlight active navigation item for hospitals page', () => {
      mockUsePathname.mockReturnValue('/hospitals');
      mockIsAuthenticated.mockReturnValue(true);
      mockGetCurrentUser.mockReturnValue({
        id: 1,
        name: 'Test User',
        email: 'test@example.com',
        userType: 'user',
      });

      render(<Navigation />);
      
      const hospitalsLink = screen.getByRole('link', { name: /hospitals/i });
      
      // Check active state classes
      expect(hospitalsLink).toHaveClass('bg-gradient-to-r');
      expect(hospitalsLink).toHaveClass('from-blue-100');
      expect(hospitalsLink).toHaveClass('to-indigo-100');
      expect(hospitalsLink).toHaveClass('text-blue-700');
    });

    it('should highlight active navigation item for nested routes', () => {
      mockUsePathname.mockReturnValue('/hospitals/123');
      mockIsAuthenticated.mockReturnValue(true);
      mockGetCurrentUser.mockReturnValue({
        id: 1,
        name: 'Test User',
        email: 'test@example.com',
        userType: 'user',
      });

      render(<Navigation />);
      
      const hospitalsLink = screen.getByRole('link', { name: /hospitals/i });
      
      // Should still be active for nested routes
      expect(hospitalsLink).toHaveClass('bg-gradient-to-r');
      expect(hospitalsLink).toHaveClass('text-blue-700');
    });

    it('should show active indicator line for active items', () => {
      mockUsePathname.mockReturnValue('/hospitals');
      mockIsAuthenticated.mockReturnValue(true);
      mockGetCurrentUser.mockReturnValue({
        id: 1,
        name: 'Test User',
        email: 'test@example.com',
        userType: 'user',
      });

      render(<Navigation />);
      
      const hospitalsLink = screen.getByRole('link', { name: /hospitals/i });
      const activeIndicator = hospitalsLink.querySelector('.animate-enhanced-pulse');
      
      expect(activeIndicator).toBeInTheDocument();
      expect(activeIndicator).toHaveClass('bg-gradient-to-r');
      expect(activeIndicator).toHaveClass('from-blue-500');
      expect(activeIndicator).toHaveClass('to-indigo-500');
    });
  });

  describe('Loading States', () => {
    it('should show loading state when navigation action is triggered', async () => {
      mockIsAuthenticated.mockReturnValue(true);
      mockGetCurrentUser.mockReturnValue({
        id: 1,
        name: 'Test User',
        email: 'test@example.com',
        userType: 'user',
      });

      render(<Navigation />);
      
      const hospitalsLink = screen.getByRole('link', { name: /hospitals/i });
      
      // Simulate click to trigger loading state
      fireEvent.click(hospitalsLink);
      
      // Check for loading classes (opacity and cursor changes)
      expect(hospitalsLink).toHaveClass('opacity-75');
      expect(hospitalsLink).toHaveClass('cursor-wait');
      
      // Check for loading animation on icon
      const icon = hospitalsLink.querySelector('svg');
      expect(icon).toHaveClass('animate-pulse');
      
      // Check for shimmer effect
      const shimmerEffect = hospitalsLink.querySelector('.animate-shimmer');
      expect(shimmerEffect).toBeInTheDocument();
    });

    it('should show loading state for notification bell', () => {
      // Mock the notification hook to return loading state
      mockUseNotificationCount.mockReturnValue({
        count: 3,
        loading: true, // Set loading to true
        error: null,
        refetch: jest.fn(),
      });

      mockIsAuthenticated.mockReturnValue(true);
      mockGetCurrentUser.mockReturnValue({
        id: 1,
        name: 'Test User',
        email: 'test@example.com',
        userType: 'user',
      });

      render(<Navigation />);
      
      const notificationBell = screen.getByRole('button', { name: /notifications/i });
      
      // Should have loading opacity when notification hook is loading
      expect(notificationBell).toHaveClass('opacity-75');
    });
  });

  describe('Icon Animations', () => {
    it('should animate icons on hover', () => {
      mockIsAuthenticated.mockReturnValue(true);
      mockGetCurrentUser.mockReturnValue({
        id: 1,
        name: 'Test User',
        email: 'test@example.com',
        userType: 'user',
      });

      render(<Navigation />);
      
      const homeLink = screen.getByRole('link', { name: /home/i });
      const icon = homeLink.querySelector('svg');
      
      expect(icon).toHaveClass('group-hover:scale-110');
      expect(icon).toHaveClass('group-hover:rotate-3');
      expect(icon).toHaveClass('group-active:scale-95');
    });

    it('should animate logo icon on hover', () => {
      render(<Navigation />);
      
      const logoLink = screen.getByRole('link', { name: /instant hospitalization/i });
      const logoIcon = logoLink.querySelector('svg');
      
      expect(logoIcon).toHaveClass('group-hover:scale-110');
    });
  });

  describe('Transition Effects', () => {
    it('should have smooth transitions on navigation items', () => {
      mockIsAuthenticated.mockReturnValue(true);
      mockGetCurrentUser.mockReturnValue({
        id: 1,
        name: 'Test User',
        email: 'test@example.com',
        userType: 'user',
      });

      render(<Navigation />);
      
      const homeLink = screen.getByRole('link', { name: /home/i });
      
      expect(homeLink).toHaveClass('transition-all');
      expect(homeLink).toHaveClass('duration-200');
      expect(homeLink).toHaveClass('ease-in-out');
    });

    it('should have smooth transitions on icons', () => {
      mockIsAuthenticated.mockReturnValue(true);
      mockGetCurrentUser.mockReturnValue({
        id: 1,
        name: 'Test User',
        email: 'test@example.com',
        userType: 'user',
      });

      render(<Navigation />);
      
      const homeLink = screen.getByRole('link', { name: /home/i });
      const icon = homeLink.querySelector('svg');
      
      expect(icon).toHaveClass('transition-all');
      expect(icon).toHaveClass('duration-200');
      expect(icon).toHaveClass('ease-in-out');
    });
  });

  describe('Focus States', () => {
    it('should have proper focus ring on navigation items', () => {
      mockIsAuthenticated.mockReturnValue(true);
      mockGetCurrentUser.mockReturnValue({
        id: 1,
        name: 'Test User',
        email: 'test@example.com',
        userType: 'user',
      });

      render(<Navigation />);
      
      const homeLink = screen.getByRole('link', { name: /home/i });
      
      expect(homeLink).toHaveClass('focus:outline-none');
      expect(homeLink).toHaveClass('focus:ring-2');
      expect(homeLink).toHaveClass('focus:ring-blue-500');
      expect(homeLink).toHaveClass('focus:ring-offset-2');
    });

    it('should have proper focus ring on mobile menu button', () => {
      render(<Navigation />);
      
      const mobileMenuButton = screen.getByRole('button', { name: /open menu/i });
      
      expect(mobileMenuButton).toHaveClass('focus:outline-none');
      expect(mobileMenuButton).toHaveClass('focus:ring-2');
      expect(mobileMenuButton).toHaveClass('focus:ring-blue-500');
      expect(mobileMenuButton).toHaveClass('focus:ring-offset-2');
    });
  });

  describe('Mobile Menu Interactions', () => {
    it('should close mobile menu when clicking outside', async () => {
      render(<Navigation />);
      
      const mobileMenuButton = screen.getByRole('button', { name: /open menu/i });
      
      // Open mobile menu
      fireEvent.click(mobileMenuButton);
      
      // Check menu is open
      expect(screen.getByRole('button', { name: /close menu/i })).toBeInTheDocument();
      
      // Click outside (on the backdrop)
      const backdrop = document.querySelector('.fixed.inset-0.bg-black\\/20');
      expect(backdrop).toBeInTheDocument();
      
      if (backdrop) {
        fireEvent.click(backdrop);
      }
      
      // Menu should close
      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /close menu/i })).not.toBeInTheDocument();
      });
    });

    it('should close mobile menu on escape key', async () => {
      render(<Navigation />);
      
      const mobileMenuButton = screen.getByRole('button', { name: /open menu/i });
      
      // Open mobile menu
      fireEvent.click(mobileMenuButton);
      
      // Press escape key
      fireEvent.keyDown(document, { key: 'Escape' });
      
      // Menu should close
      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /close menu/i })).not.toBeInTheDocument();
      });
    });
  });
});