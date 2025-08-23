'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { 
  Building2,
  Menu,
  X,
  LogIn,
  Lock,
  Info
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { isAuthenticated, logout, getCurrentUser } from '@/lib/auth';
import { createNavigationConfigFromAuth } from '@/lib/navigationConfig';
import { useNotificationCount } from '@/lib/hooks/useNotificationCount';
import NotificationBell from './NotificationBell';
import UserMenu from './UserMenu';
import type { NavigationConfig, NavigationItem, ActionItem } from '@/lib/navigationConfig';

const Navigation = () => {
  const pathname = usePathname();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [user, setUser] = useState<NavigationUser | null>(null);
  const [navigationConfig, setNavigationConfig] = useState<NavigationConfig>({
    primaryItems: [],
    secondaryItems: [],
    actionItems: [],
    mobileItems: []
  });

  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
  const [showLoginTooltip, setShowLoginTooltip] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const mobileButtonRef = useRef<HTMLButtonElement>(null);

  // Use notification count hook with real-time updates
  const { 
    count: notificationCount, 
    loading: notificationLoading, 
    error: notificationError,
    refetch: refetchNotifications 
  } = useNotificationCount(30000, authenticated); // 30 second polling, only when authenticated

  useEffect(() => {
    const auth = isAuthenticated();
    const currentUser = getCurrentUser();
    
    // Handle smooth transition when auth state changes
    if (authenticated !== auth) {
      setIsTransitioning(true);
      setTimeout(() => setIsTransitioning(false), 300);
    }
    
    setAuthenticated(auth);
    setUser(currentUser);
    
    // Get navigation configuration based on current auth state
    const config = createNavigationConfigFromAuth();
    setNavigationConfig(config);
  }, [authenticated]);

  // Handle mobile menu interactions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isMobileMenuOpen &&
        mobileMenuRef.current &&
        mobileButtonRef.current &&
        !mobileMenuRef.current.contains(event.target as Node) &&
        !mobileButtonRef.current.contains(event.target as Node)
      ) {
        setIsMobileMenuOpen(false);
      }
    };

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
        mobileButtonRef.current?.focus(); // Return focus to menu button
      }
    };

    const handleResize = () => {
      // Close mobile menu when switching to desktop view
      if (window.innerWidth >= 768 && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }
    };

    if (isMobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscapeKey);
      window.addEventListener('resize', handleResize);
      // Prevent body scroll when mobile menu is open
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscapeKey);
      window.removeEventListener('resize', handleResize);
      document.body.style.overflow = 'unset';
    };
  }, [isMobileMenuOpen]);

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(href);
  };

  const handleLogout = () => {
    setIsTransitioning(true);
    logout();
    setAuthenticated(false);
    setUser(null);
    // Refresh navigation config after logout
    const config = createNavigationConfigFromAuth();
    setNavigationConfig(config);
    setTimeout(() => setIsTransitioning(false), 300);
  };

  // Handle clicks on restricted features for guests
  const handleRestrictedClick = (e: React.MouseEvent, item: NavigationItem) => {
    if (!authenticated && item.requiresAuth) {
      e.preventDefault();
      // Store intended destination for post-login redirect
      sessionStorage.setItem('intendedDestination', item.href);
      // Show friendly message and redirect to login
      router.push(`/login?returnTo=${encodeURIComponent(item.href)}&message=${encodeURIComponent(`Please log in to access ${item.label}`)}`);
    }
  };

  // Check if an item requires authentication but user is not authenticated
  const isRestrictedForGuest = (item: NavigationItem) => {
    return !authenticated && item.requiresAuth;
  };

  // Handle navigation loading states
  const handleNavigationStart = (href: string) => {
    setLoadingStates(prev => ({ ...prev, [href]: true }));
  };

  const handleNavigationEnd = (href: string) => {
    setLoadingStates(prev => ({ ...prev, [href]: false }));
  };

  // Handle notification bell click - refetch count when user views notifications
  const handleNotificationClick = () => {
    handleNavigationStart('/notifications');
    // Refetch notifications after a short delay to account for potential status updates
    setTimeout(() => {
      refetchNotifications();
      handleNavigationEnd('/notifications');
    }, 1000);
  };

  // Render navigation items
  const renderNavigationItem = (item: NavigationItem) => {
    const Icon = item.icon;
    const active = isActive(item.href);
    const isLoading = loadingStates[item.href] || false;
    const restricted = isRestrictedForGuest(item);
    
    const linkElement = (
      <Link
        key={item.href}
        href={restricted ? '#' : item.href}
        className={cn(
          'group relative flex items-center space-x-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ease-in-out',
          'hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50',
          'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
          'transform hover:scale-[1.02] hover:shadow-sm',
          'active:scale-[0.98] active:shadow-inner', // Click feedback
          active
            ? 'bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 shadow-sm border border-blue-200/50'
            : 'text-gray-700 hover:text-blue-700 border border-transparent hover:border-blue-100/50',
          isLoading && 'opacity-75 cursor-wait',
          restricted && 'opacity-75 cursor-pointer hover:bg-gradient-to-r hover:from-amber-50 hover:to-orange-50 hover:border-amber-200/50',
          isTransitioning && 'transition-all duration-300 ease-in-out'
        )}
        onClick={(e) => {
          if (restricted) {
            handleRestrictedClick(e, item);
          } else {
            handleNavigationStart(item.href);
          }
        }}
        onMouseEnter={() => {
          if (restricted) {
            setShowLoginTooltip(item.href);
          }
        }}
        onMouseLeave={() => {
          if (restricted) {
            setShowLoginTooltip(null);
          }
        }}
      >
        <Icon className={cn(
          'w-4 h-4 transition-all duration-200 ease-in-out',
          'group-hover:scale-110 group-hover:rotate-3',
          'group-active:scale-95', // Click feedback for icon
          active ? 'text-blue-600' : 'text-gray-500 group-hover:text-blue-600',
          isLoading && 'animate-pulse',
          restricted && 'text-amber-600 group-hover:text-orange-600'
        )} />
        <span className="relative flex items-center space-x-1">
          <span>{item.label}</span>
          {restricted && (
            <Lock className="w-3 h-3 text-amber-600 opacity-75" />
          )}
          {active && (
            <div className="absolute -bottom-1 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full animate-enhanced-pulse" />
          )}
          {isLoading && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent animate-shimmer" />
          )}
        </span>
        
        {/* Login required tooltip */}
        {restricted && showLoginTooltip === item.href && (
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg z-50 whitespace-nowrap">
            <div className="flex items-center space-x-1">
              <Info className="w-3 h-3" />
              <span>Login required to access {item.label}</span>
            </div>
            <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
          </div>
        )}
      </Link>
    );

    return linkElement;
  };

  // Render mobile navigation items with improved touch interactions
  const renderMobileNavigationItem = (item: NavigationItem) => {
    const Icon = item.icon;
    const active = isActive(item.href);
    const isLoading = loadingStates[item.href] || false;
    const restricted = isRestrictedForGuest(item);
    
    return (
      <Link
        key={item.href}
        href={restricted ? '#' : item.href}
        className={cn(
          'group flex items-center space-x-4 px-4 py-3.5 rounded-xl text-base font-medium transition-all duration-200 ease-in-out',
          'touch-manipulation select-none', // Touch-friendly interactions
          'active:scale-95 active:bg-blue-200/50', // Touch feedback
          'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
          'min-h-[48px]', // Minimum touch target size
          active
            ? 'bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 shadow-sm border border-blue-200/50'
            : 'text-gray-700 hover:text-blue-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 border border-transparent hover:border-blue-100/50',
          isLoading && 'opacity-75 cursor-wait',
          restricted && 'opacity-75 cursor-pointer hover:bg-gradient-to-r hover:from-amber-50 hover:to-orange-50 hover:border-amber-200/50',
          isTransitioning && 'transition-all duration-300 ease-in-out'
        )}
        onClick={(e) => {
          if (restricted) {
            handleRestrictedClick(e, item);
            setIsMobileMenuOpen(false);
          } else {
            handleNavigationStart(item.href);
            setIsMobileMenuOpen(false);
          }
        }}
      >
        <Icon className={cn(
          'w-5 h-5 transition-all duration-200 ease-in-out flex-shrink-0',
          'group-active:scale-110', // Touch feedback for icon
          active ? 'text-blue-600' : 'text-gray-500 group-hover:text-blue-600',
          isLoading && 'animate-pulse',
          restricted && 'text-amber-600 group-hover:text-orange-600'
        )} />
        <span className="relative flex-1 flex items-center justify-between">
          <span className="flex items-center space-x-2">
            <span>{item.label}</span>
            {restricted && (
              <Lock className="w-3 h-3 text-amber-600 opacity-75" />
            )}
          </span>
          {restricted && (
            <span className="text-xs text-amber-600 opacity-75">Login required</span>
          )}
          {active && (
            <div className="absolute -bottom-1 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full animate-enhanced-pulse" />
          )}
          {isLoading && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent animate-shimmer" />
          )}
        </span>
      </Link>
    );
  };

  // Render action items
  const renderActionItem = (actionItem: ActionItem) => {
    switch (actionItem.type) {
      case 'notification':
        return (
          <div key="notification-bell" className="relative">
            <NotificationBell
              unreadCount={notificationCount}
              onClick={handleNotificationClick}
              className={cn(
                "transition-all duration-200 ease-in-out hover:scale-110 hover:bg-blue-50 rounded-full p-2",
                notificationLoading && "opacity-75",
                notificationError && "opacity-50"
              )}
            />
            {/* Show error indicator if there's an error loading notifications */}
            {notificationError && (
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-500 rounded-full" 
                   title={`Error loading notifications: ${notificationError}`} />
            )}
          </div>
        );
      case 'user-menu':
        return user ? (
          <div key="user-menu" className="relative">
            <UserMenu
              user={user}
              onLogout={handleLogout}
              className="transition-all duration-200 ease-in-out hover:scale-105"
            />
          </div>
        ) : null;
      case 'auth':
        return !authenticated ? (
          <Link key="auth-button" href="/login">
            <Button 
              variant="outline" 
              size="sm" 
              className={cn(
                "transition-all duration-200 ease-in-out",
                "hover:scale-105 hover:shadow-md",
                "hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50",
                "hover:border-blue-300 hover:text-blue-700",
                "focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
                "group"
              )}
            >
              <LogIn className="w-4 h-4 mr-2 transition-transform duration-200 group-hover:rotate-12 group-hover:scale-110" />
              Login
            </Button>
          </Link>
        ) : null;
      default:
        return null;
    }
  };

  return (
    <>
      <nav className="bg-white/95 backdrop-blur-sm shadow-lg border-b border-gray-200/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* Logo */}
            <div className="flex items-center">
              <Link 
                href="/" 
                className="group flex items-center space-x-3 transition-all duration-200 ease-in-out hover:scale-105"
              >
                <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-md group-hover:shadow-lg transition-all duration-200">
                  <Building2 className="w-5 h-5 text-white group-hover:scale-110 transition-transform duration-200" />
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent group-hover:from-blue-700 group-hover:to-indigo-700 transition-all duration-200">
                  RapidCare
                </span>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center">
              {/* Guest Mode Indicator */}
              {!authenticated && (
                <div className="flex items-center space-x-2 mr-6 px-3 py-1.5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/50 rounded-full">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <span className="text-xs font-medium text-blue-700">Guest Mode</span>
                  <Info className="w-3 h-3 text-blue-600 opacity-75" />
                </div>
              )}
              
              {/* Primary Navigation Items */}
              <div className={cn(
                "flex items-center space-x-1 mr-8 transition-all duration-300 ease-in-out",
                isTransitioning && "opacity-50 scale-95"
              )}>
                {navigationConfig.primaryItems.map(renderNavigationItem)}
              </div>
              
              {/* Secondary Navigation Items */}
              {navigationConfig.secondaryItems.length > 0 && (
                <div className={cn(
                  "flex items-center space-x-1 mr-8 pl-8 border-l border-gray-200 transition-all duration-300 ease-in-out",
                  isTransitioning && "opacity-50 scale-95"
                )}>
                  {navigationConfig.secondaryItems.map(renderNavigationItem)}
                </div>
              )}
              
              {/* Action Items */}
              <div className={cn(
                "flex items-center space-x-3 pl-6 border-l border-gray-200 transition-all duration-300 ease-in-out",
                isTransitioning && "opacity-50 scale-95"
              )}>
                {navigationConfig.actionItems.map(renderActionItem)}
              </div>
            </div>

            {/* Mobile menu button with improved touch target */}
            <div className="md:hidden flex items-center">
              <Button
                ref={mobileButtonRef}
                variant="ghost"
                size="sm"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className={cn(
                  "min-h-[44px] min-w-[44px] p-2", // Minimum touch target size
                  "touch-manipulation select-none",
                  "transition-all duration-200 ease-in-out",
                  "hover:bg-blue-50 active:scale-95 active:bg-blue-100",
                  "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                )}
                aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
                aria-expanded={isMobileMenuOpen}
              >
                {isMobileMenuOpen ? (
                  <X className="w-5 h-5 transition-transform duration-200 ease-in-out" />
                ) : (
                  <Menu className="w-5 h-5 transition-transform duration-200 ease-in-out" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Navigation with improved layout and animations */}
      {isMobileMenuOpen && (
        <>
          {/* Backdrop overlay */}
          <div 
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          
          {/* Mobile menu */}
          <div 
            ref={mobileMenuRef}
            className="fixed top-16 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-gray-200/50 shadow-lg z-50 md:hidden"
          >
            <div className="px-4 pt-4 pb-6 space-y-2 max-h-[calc(100vh-4rem)] overflow-y-auto">
              {/* Guest Mode Indicator for Mobile */}
              {!authenticated && (
                <div className="mb-4 space-y-3">
                  <div className="flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/50 rounded-xl">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium text-blue-700">Browsing as Guest</span>
                    <Info className="w-4 h-4 text-blue-600 opacity-75" />
                  </div>
                  <div className="px-4 py-3 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200/50 rounded-xl">
                    <div className="text-xs text-green-700 font-medium mb-1">Available to you:</div>
                    <div className="text-xs text-green-600 space-y-1">
                      <div>• Browse hospitals and services</div>
                      <div>• Donate blood without registration</div>
                      <div>• View real-time availability</div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Mobile Navigation Items */}
              <div className={cn(
                "space-y-1 transition-all duration-300 ease-in-out",
                isTransitioning && "opacity-50 scale-95"
              )}>
                {navigationConfig.mobileItems.map(renderMobileNavigationItem)}
              </div>
              
              {/* Mobile Action Items */}
              <div className={cn(
                "border-t border-gray-200/50 pt-4 mt-4 transition-all duration-300 ease-in-out",
                isTransitioning && "opacity-50 scale-95"
              )}>
                {authenticated && user ? (
                  <div className="space-y-3">
                    <div className="px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100/50">
                      <div className="text-sm font-medium text-gray-700 mb-1">Welcome back!</div>
                      <div className="text-base font-semibold text-blue-700">{user.name}</div>
                    </div>
                    <div className="flex items-center justify-center space-x-4 px-4 py-3 bg-gray-50/50 rounded-xl">
                      <div className="flex-1 flex justify-center relative">
                        <NotificationBell
                          unreadCount={notificationCount}
                          onClick={handleNotificationClick}
                          className={cn(
                            "transition-all duration-200 ease-in-out",
                            "hover:scale-105 active:scale-95",
                            "min-h-[44px] min-w-[44px] flex items-center justify-center",
                            "rounded-full hover:bg-blue-50",
                            notificationLoading && "opacity-75",
                            notificationError && "opacity-50"
                          )}
                        />
                        {/* Show error indicator if there's an error loading notifications */}
                        {notificationError && (
                          <div className="absolute top-0 right-0 w-2 h-2 bg-yellow-500 rounded-full" 
                               title={`Error loading notifications: ${notificationError}`} />
                        )}
                      </div>
                      <div className="w-px h-8 bg-gray-300"></div>
                      <div className="flex-1 flex justify-center">
                        <UserMenu
                          user={user}
                          onLogout={() => {
                            handleLogout();
                            setIsMobileMenuOpen(false);
                          }}
                          className={cn(
                            "transition-all duration-200 ease-in-out",
                            "hover:scale-105 active:scale-95"
                          )}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="px-2 space-y-3">
                    <Link href="/login" onClick={() => setIsMobileMenuOpen(false)}>
                      <Button 
                        variant="outline" 
                        size="lg" 
                        className={cn(
                          "w-full min-h-[48px] text-base font-medium",
                          "transition-all duration-200 ease-in-out",
                          "touch-manipulation select-none",
                          "hover:scale-[1.02] active:scale-95",
                          "hover:shadow-md hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50",
                          "hover:border-blue-300 hover:text-blue-700",
                          "focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                        )}
                      >
                        <LogIn className="w-5 h-5 mr-3 transition-transform duration-200" />
                        Login to Access All Features
                      </Button>
                    </Link>
                    <div className="text-center">
                      <span className="text-xs text-gray-500">
                        Login to book resources and access your dashboard
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default Navigation;