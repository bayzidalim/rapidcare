import { LucideIcon } from 'lucide-react';
import {
    Home,
    Building2,
    Calendar,
    Droplets,
    User,
    Shield,
    Bell,
    Settings,
    LogIn,
    LogOut,
    TestTube,
    Sparkles,
    MessageSquare,
    Activity,
    Users
} from 'lucide-react';

// User role types
export type UserRole = 'user' | 'hospital-authority' | 'admin';

// Navigation item priority levels
export type NavigationPriority = 'primary' | 'secondary' | 'action';

// Navigation item interface
export interface NavigationItem {
    href: string;
    label: string;
    icon: LucideIcon;
    description?: string;
    badge?: string;
    roles?: UserRole[];
    showOnMobile?: boolean;
    priority: NavigationPriority;
    requiresAuth?: boolean;
    excludeRoles?: UserRole[];
}

// Mega menu group interface
export interface MegaMenuGroup {
    id: string;
    label: string;
    icon: LucideIcon;
    items: NavigationItem[];
    priority: NavigationPriority;
    showOnMobile?: boolean;
    requiresAuth?: boolean;
    roles?: UserRole[];
}

// Action item types for special navigation elements
export type ActionItemType = 'notification' | 'user-menu' | 'auth';

// Action item interface
export interface ActionItem {
    type: ActionItemType;
    component: string; // Component name to render
    props?: Record<string, any>;
    roles?: UserRole[];
    requiresAuth?: boolean;
}

// Complete navigation configuration
export interface NavigationConfig {
    primaryItems: NavigationItem[];
    secondaryItems: NavigationItem[];
    megaMenuGroups: MegaMenuGroup[];
    actionItems: ActionItem[];
    mobileItems: NavigationItem[];
}

// User context for navigation
export interface NavigationUser {
    id: number;
    name: string;
    email: string;
    userType: UserRole;
    avatar?: string;
}

// Authentication state
export interface AuthState {
    isAuthenticated: boolean;
    user: NavigationUser | null;
}

// Mega menu groups configuration
const BASE_MEGA_MENU_GROUPS: MegaMenuGroup[] = [
    {
        id: 'emergency-services',
        label: 'Emergency Services',
        icon: Activity,
        priority: 'primary',
        showOnMobile: true,
        items: [
            {
                href: '/booking',
                label: 'Book Now',
                icon: Calendar,
                description: 'Book hospital beds, ICU, or operation theatres',
                priority: 'primary',
                showOnMobile: true,
                requiresAuth: true,
                roles: ['user'],
                excludeRoles: ['hospital-authority']
            },
            {
                href: '/rapid-collection',
                label: 'Rapid Collection',
                icon: TestTube,
                description: 'Home sample collection service',
                priority: 'primary',
                showOnMobile: true,
                requiresAuth: false
            },
            {
                href: '/rapid-analyze',
                label: 'Rapid Analyze',
                icon: Sparkles,
                description: 'Medicine information and alternatives',
                badge: 'New',
                priority: 'primary',
                showOnMobile: true,
                requiresAuth: true,
                roles: ['user']
            }
        ]
    },
    {
        id: 'community',
        label: 'Community',
        icon: Users,
        priority: 'primary',
        showOnMobile: true,
        items: [
            {
                href: '/donate-blood',
                label: 'Blood Donation',
                icon: Droplets,
                description: 'Donate blood and save lives',
                priority: 'primary',
                showOnMobile: true,
                requiresAuth: false
            },
            {
                href: '/rapid-social',
                label: 'Rapid Social',
                icon: MessageSquare,
                description: 'Connect with the healthcare community',
                priority: 'primary',
                showOnMobile: true,
                requiresAuth: false
            }
        ]
    }
];

// Base navigation items configuration (standalone items)
const BASE_NAVIGATION_ITEMS: NavigationItem[] = [
    {
        href: '/',
        label: 'Home',
        icon: Home,
        priority: 'primary',
        showOnMobile: true,
        requiresAuth: false
    },
    {
        href: '/hospitals',
        label: 'Hospitals',
        icon: Building2,
        priority: 'primary',
        showOnMobile: true,
        requiresAuth: false
    },
    {
        href: '/dashboard',
        label: 'Dashboard',
        icon: User,
        priority: 'secondary',
        showOnMobile: true,
        requiresAuth: true,
        roles: ['user', 'hospital-authority'],
        excludeRoles: ['admin'] // Admin users don't see regular dashboard
    },
    {
        href: '/profile',
        label: 'Profile',
        icon: User,
        priority: 'secondary',
        showOnMobile: true,
        requiresAuth: true,
        roles: ['user', 'hospital-authority']
    },
    {
        href: '/hospitals/manage',
        label: 'Manage Hospitals',
        icon: Building2,
        priority: 'secondary',
        showOnMobile: true,
        requiresAuth: true,
        roles: ['admin'], // Removed hospital-authority
        excludeRoles: ['hospital-authority'] // Explicitly exclude hospital-authority
    },
    {
        href: '/admin',
        label: 'Admin',
        icon: Shield,
        priority: 'secondary',
        showOnMobile: true,
        requiresAuth: true,
        roles: ['admin']
    }
];

// Action items configuration
const BASE_ACTION_ITEMS: ActionItem[] = [
    {
        type: 'notification',
        component: 'NotificationBell',
        requiresAuth: true,
        roles: ['user', 'hospital-authority', 'admin']
    },
    {
        type: 'user-menu',
        component: 'UserMenu',
        requiresAuth: true,
        roles: ['user', 'hospital-authority', 'admin']
    },
    {
        type: 'auth',
        component: 'AuthButton',
        requiresAuth: false
    }
];

/**
 * Filters navigation items based on user authentication state and role
 */
export function filterNavigationItems(
    items: NavigationItem[],
    authState: AuthState
): NavigationItem[] {
    return items.filter(item => {
        // Check authentication requirement
        if (item.requiresAuth && !authState.isAuthenticated) {
            return false;
        }

        // If not authenticated and item doesn't require auth, show it
        if (!authState.isAuthenticated && !item.requiresAuth) {
            return true;
        }

        // If authenticated, check role-based access
        if (authState.isAuthenticated && authState.user) {
            const userRole = authState.user.userType;

            // Check if user role is excluded
            if (item.excludeRoles && item.excludeRoles.includes(userRole)) {
                return false;
            }

            // Check if user role is allowed (if roles are specified)
            if (item.roles && item.roles.length > 0) {
                return item.roles.includes(userRole);
            }

            // If no specific roles defined and user is authenticated, show item
            return true;
        }

        return false;
    });
}

/**
 * Filters mega menu groups based on user authentication state and role
 */
export function filterMegaMenuGroups(
    groups: MegaMenuGroup[],
    authState: AuthState
): MegaMenuGroup[] {
    return groups
        .map(group => {
            // Filter items within the group
            const filteredItems = filterNavigationItems(group.items, authState);
            
            // Only return group if it has visible items
            if (filteredItems.length === 0) {
                return null;
            }

            return {
                ...group,
                items: filteredItems
            };
        })
        .filter((group): group is MegaMenuGroup => group !== null);
}

/**
 * Filters action items based on user authentication state and role
 */
export function filterActionItems(
    items: ActionItem[],
    authState: AuthState
): ActionItem[] {
    return items.filter(item => {
        // Check authentication requirement
        if (item.requiresAuth && !authState.isAuthenticated) {
            return false;
        }

        // If not authenticated and item doesn't require auth, show it
        if (!authState.isAuthenticated && !item.requiresAuth) {
            return true;
        }

        // If authenticated, check role-based access
        if (authState.isAuthenticated && authState.user) {
            const userRole = authState.user.userType;

            // Check if user role is allowed (if roles are specified)
            if (item.roles && item.roles.length > 0) {
                return item.roles.includes(userRole);
            }

            // If no specific roles defined and user is authenticated, show item
            return true;
        }

        return false;
    });
}

/**
 * Creates navigation configuration based on user authentication state and role
 */
export function createNavigationConfig(authState: AuthState): NavigationConfig {
    // Filter all navigation items
    const filteredItems = filterNavigationItems(BASE_NAVIGATION_ITEMS, authState);
    const filteredMegaMenuGroups = filterMegaMenuGroups(BASE_MEGA_MENU_GROUPS, authState);
    const filteredActionItems = filterActionItems(BASE_ACTION_ITEMS, authState);

    // Separate items by priority
    const primaryItems = filteredItems.filter(item => item.priority === 'primary');
    const secondaryItems = filteredItems.filter(item => item.priority === 'secondary');

    // Mobile items include all filtered items that should show on mobile
    // Plus all items from mega menu groups
    const megaMenuMobileItems = filteredMegaMenuGroups.flatMap(group => 
        group.items.filter(item => item.showOnMobile)
    );
    const mobileItems = [...filteredItems.filter(item => item.showOnMobile), ...megaMenuMobileItems];

    return {
        primaryItems,
        secondaryItems,
        megaMenuGroups: filteredMegaMenuGroups,
        actionItems: filteredActionItems,
        mobileItems
    };
}

/**
 * Gets navigation configuration for a specific user role
 */
export function getNavigationConfigForRole(
    userRole: UserRole | null,
    isAuthenticated: boolean = false,
    user: NavigationUser | null = null
): NavigationConfig {
    const authState: AuthState = {
        isAuthenticated,
        user
    };

    return createNavigationConfig(authState);
}

/**
 * Utility function to check if a navigation item should be shown for a user
 */
export function shouldShowNavigationItem(
    item: NavigationItem,
    authState: AuthState
): boolean {
    const filteredItems = filterNavigationItems([item], authState);
    return filteredItems.length > 0;
}

/**
 * Utility function to get role-specific navigation items
 */
export function getRoleSpecificItems(userRole: UserRole): NavigationItem[] {
    const authState: AuthState = {
        isAuthenticated: true,
        user: {
            id: 1,
            name: 'Test User',
            email: 'test@example.com',
            userType: userRole
        }
    };

    return filterNavigationItems(BASE_NAVIGATION_ITEMS, authState);
}

/**
 * Navigation configuration factory that integrates with the existing auth system
 * This is the main function components should use to get navigation configuration
 */
export function createNavigationConfigFromAuth(): NavigationConfig {
    // Check if we're in a browser environment
    if (typeof window === 'undefined') {
        // Return minimal config for SSR - only public items
        const unauthenticatedState: AuthState = {
            isAuthenticated: false,
            user: null
        };
        return createNavigationConfig(unauthenticatedState);
    }

    // Import auth functions dynamically to avoid SSR issues
    const { isAuthenticated, getCurrentUser } = require('./auth');

    const authenticated = isAuthenticated();
    const user = getCurrentUser();

    const authState: AuthState = {
        isAuthenticated: authenticated,
        user: user ? {
            id: user.id,
            name: user.name,
            email: user.email,
            userType: user.userType
        } : null
    };

    return createNavigationConfig(authState);
}

/**
 * Hook-like function to get navigation configuration with auth state
 * This can be used in React components that need navigation config
 */
export function useNavigationConfig(): NavigationConfig {
    return createNavigationConfigFromAuth();
}

// Export base configurations for testing
export { BASE_NAVIGATION_ITEMS, BASE_MEGA_MENU_GROUPS, BASE_ACTION_ITEMS };