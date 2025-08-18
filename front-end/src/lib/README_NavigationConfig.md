# Navigation Configuration System

This document describes the new navigation configuration system that provides role-based navigation item filtering and a clean, maintainable way to manage navigation across the application.

## Overview

The navigation configuration system replaces the hardcoded navigation logic with a flexible, role-based system that:

- Automatically filters navigation items based on user authentication state and role
- Separates navigation items by priority (primary, secondary, action)
- Provides consistent mobile and desktop navigation configurations
- Supports easy testing and maintenance
- Handles SSR (Server-Side Rendering) gracefully

## Key Components

### Types and Interfaces

```typescript
// User role types
type UserRole = 'user' | 'hospital-authority' | 'admin';

// Navigation item priority levels
type NavigationPriority = 'primary' | 'secondary' | 'action';

// Navigation item interface
interface NavigationItem {
  href: string;
  label: string;
  icon: LucideIcon;
  roles?: UserRole[];
  showOnMobile?: boolean;
  priority: NavigationPriority;
  requiresAuth?: boolean;
  excludeRoles?: UserRole[];
}

// Complete navigation configuration
interface NavigationConfig {
  primaryItems: NavigationItem[];
  secondaryItems: NavigationItem[];
  actionItems: ActionItem[];
  mobileItems: NavigationItem[];
}
```

### Core Functions

#### `createNavigationConfig(authState: AuthState): NavigationConfig`
Creates a complete navigation configuration based on the user's authentication state and role.

#### `createNavigationConfigFromAuth(): NavigationConfig`
Main factory function that integrates with the existing auth system. This is the primary function components should use.

#### `useNavigationConfig(): NavigationConfig`
Hook-like function for React components to get navigation configuration.

#### `filterNavigationItems(items: NavigationItem[], authState: AuthState): NavigationItem[]`
Filters navigation items based on authentication state and user role.

#### `getRoleSpecificItems(userRole: UserRole): NavigationItem[]`
Utility function to get navigation items for a specific role (useful for testing).

## Usage Examples

### Basic Usage in Components

```typescript
import { useNavigationConfig } from '@/lib/navigationConfig';

const Navigation = () => {
  const navigationConfig = useNavigationConfig();

  return (
    <nav>
      {/* Primary navigation items */}
      {navigationConfig.primaryItems.map((item) => (
        <Link key={item.href} href={item.href}>
          <item.icon />
          {item.label}
        </Link>
      ))}

      {/* Secondary navigation items */}
      {navigationConfig.secondaryItems.map((item) => (
        <Link key={item.href} href={item.href}>
          <item.icon />
          {item.label}
        </Link>
      ))}

      {/* Action items (notifications, user menu, auth) */}
      {navigationConfig.actionItems.map((actionItem) => (
        <div key={actionItem.type}>
          {/* Render appropriate component based on actionItem.type */}
        </div>
      ))}
    </nav>
  );
};
```

### Testing Navigation for Specific Roles

```typescript
import { getRoleSpecificItems, getNavigationConfigForRole } from '@/lib/navigationConfig';

// Get items for a specific role
const adminItems = getRoleSpecificItems('admin');

// Get full config for a role
const adminConfig = getNavigationConfigForRole('admin', true, mockAdminUser);
```

### Custom Navigation Filtering

```typescript
import { filterNavigationItems, BASE_NAVIGATION_ITEMS } from '@/lib/navigationConfig';

const customAuthState = {
  isAuthenticated: true,
  user: { userType: 'hospital-authority' }
};

const filteredItems = filterNavigationItems(BASE_NAVIGATION_ITEMS, customAuthState);
```

## Navigation Item Configuration

### Current Navigation Items

#### Primary Items (Always Visible)
- **Home** (`/`) - Public, all users
- **Hospitals** (`/hospitals`) - Public, all users  
- **Book Now** (`/booking`) - Authenticated users (user, hospital-authority)
- **Blood Donation** (`/donate-blood`) - Public, all users

#### Secondary Items (Role-Specific)
- **Dashboard** (`/dashboard`) - Regular users and hospital authorities (excluded for admin)
- **Profile** (`/profile`) - Regular users and hospital authorities
- **Manage Hospitals** (`/hospitals/manage`) - Hospital authorities and admins
- **Admin** (`/admin`) - Admin users only

#### Action Items
- **Notification Bell** - All authenticated users
- **User Menu** - All authenticated users
- **Auth Button** - All users (login/logout)

### Role-Based Access

#### Unauthenticated Users
- Home, Hospitals, Blood Donation
- Auth button (login)

#### Regular Users (`user`)
- All primary items
- Dashboard, Profile (secondary)
- Notification bell, User menu, Auth button (actions)

#### Hospital Authority (`hospital-authority`)
- All primary items
- Dashboard, Profile, Manage Hospitals (secondary)
- Notification bell, User menu, Auth button (actions)

#### Admin Users (`admin`)
- Home, Hospitals, Blood Donation (primary)
- Admin, Manage Hospitals (secondary) - No regular dashboard or profile
- Notification bell, User menu, Auth button (actions)

## Adding New Navigation Items

### Step 1: Add to BASE_NAVIGATION_ITEMS

```typescript
const newItem: NavigationItem = {
  href: '/new-feature',
  label: 'New Feature',
  icon: NewFeatureIcon,
  priority: 'secondary',
  showOnMobile: true,
  requiresAuth: true,
  roles: ['admin'] // Only admins can see this
};

// Add to BASE_NAVIGATION_ITEMS array
```

### Step 2: Update Tests

Add test cases for the new navigation item in `navigationConfig.test.ts`:

```typescript
it('should show new feature to admin users', () => {
  const items = getRoleSpecificItems('admin');
  const hrefs = items.map(item => item.href);
  expect(hrefs).toContain('/new-feature');
});
```

## Configuration Options

### Navigation Item Properties

- **href**: Route path
- **label**: Display text
- **icon**: Lucide React icon component
- **priority**: 'primary' | 'secondary' | 'action'
- **showOnMobile**: Whether to show in mobile navigation (default: true)
- **requiresAuth**: Whether authentication is required (default: false)
- **roles**: Array of roles that can see this item (optional)
- **excludeRoles**: Array of roles that should NOT see this item (optional)

### Action Item Properties

- **type**: 'notification' | 'user-menu' | 'auth'
- **component**: Component name to render
- **requiresAuth**: Whether authentication is required
- **roles**: Array of roles that can see this action (optional)

## Best Practices

1. **Use the factory function**: Always use `useNavigationConfig()` or `createNavigationConfigFromAuth()` in components
2. **Test role-based access**: Write tests for each user role to ensure proper navigation filtering
3. **Keep items organized**: Use priority levels to organize navigation items logically
4. **Consider mobile experience**: Set `showOnMobile` appropriately for each item
5. **Handle edge cases**: Test with unauthenticated users and role changes

## Testing

The navigation configuration system includes comprehensive tests covering:

- Role-based filtering for all user types
- Authentication state handling
- Edge cases and error conditions
- Configuration consistency
- SSR compatibility

Run tests with:
```bash
npm test navigationConfig.test.ts
```

## Migration Guide

To migrate existing navigation components:

1. Replace hardcoded navigation arrays with `useNavigationConfig()`
2. Remove manual role checking logic
3. Use the provided navigation configuration structure
4. Update tests to use the new system
5. Verify all user roles have correct navigation access

## Performance Considerations

- Navigation configuration is computed on each call
- Consider memoization for frequently re-rendered components
- SSR-friendly with minimal server-side computation
- Lazy loading of auth functions prevents SSR issues

## Future Enhancements

Potential improvements to consider:

- Caching navigation configuration
- Dynamic navigation items from API
- Permission-based navigation (beyond roles)
- Navigation analytics and usage tracking
- A/B testing for navigation layouts