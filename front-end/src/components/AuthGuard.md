# AuthGuard Component

The `AuthGuard` component provides flexible authentication protection for routes with support for guest browsing mode and return URL functionality.

## Features

- **Return URL Support**: Automatically redirects users back to their intended destination after login
- **Flexible Fallback**: Show custom content for unauthenticated users instead of redirecting
- **Friendly Messages**: Customizable authentication required messages
- **Loading States**: Smooth loading experience during authentication checks

## Basic Usage

### Simple Protection (Redirect to Login)

```tsx
import AuthGuard from '@/components/AuthGuard';

function ProtectedPage() {
  return (
    <AuthGuard>
      <div>This content requires authentication</div>
    </AuthGuard>
  );
}
```

### Custom Fallback for Guest Browsing

```tsx
import AuthGuard from '@/components/AuthGuard';

function PartiallyProtectedPage() {
  const guestFallback = (
    <div className="text-center p-8">
      <h3>Sign in to access full features</h3>
      <p>You can browse as a guest, but booking requires an account.</p>
      <Button onClick={() => router.push('/login')}>
        Sign In
      </Button>
    </div>
  );

  return (
    <div>
      <h1>Hospital Listings</h1>
      {/* Public content visible to everyone */}
      <HospitalList />
      
      {/* Protected content with fallback */}
      <AuthGuard fallback={guestFallback}>
        <BookingInterface />
      </AuthGuard>
    </div>
  );
}
```

### Custom Messages and Redirect

```tsx
<AuthGuard
  title="Premium Feature"
  message="This feature requires a premium account."
  redirectTo="/upgrade"
>
  <PremiumContent />
</AuthGuard>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `React.ReactNode` | - | Content to show when authenticated |
| `fallback` | `React.ReactNode` | `undefined` | Custom content to show when not authenticated (prevents redirect) |
| `redirectTo` | `string` | `'/login'` | URL to redirect to when not authenticated |
| `message` | `string` | `'You need to be logged in to access this feature.'` | Message shown in default auth required screen |
| `title` | `string` | `'Authentication Required'` | Title shown in default auth required screen |

## Return URL Functionality

When a user is redirected to login, the AuthGuard automatically:

1. Captures the current URL (including query parameters)
2. Encodes it as a `returnUrl` parameter
3. Redirects to `/login?returnUrl=encoded-current-url`
4. The login page handles the return URL and redirects back after successful authentication

Example flow:
1. User visits `/booking/123?step=payment`
2. AuthGuard redirects to `/login?returnUrl=%2Fbooking%2F123%3Fstep%3Dpayment`
3. User logs in successfully
4. Login page redirects to `/booking/123?step=payment`

## Migration from ProtectedRoute

Replace existing `ProtectedRoute` usage:

```tsx
// Before
import ProtectedRoute from '@/components/ProtectedRoute';

<ProtectedRoute>
  <MyComponent />
</ProtectedRoute>

// After
import AuthGuard from '@/components/AuthGuard';

<AuthGuard>
  <MyComponent />
</AuthGuard>
```

## Best Practices

1. **Use fallback for guest browsing**: When content should be partially accessible to guests
2. **Customize messages**: Provide context-specific authentication messages
3. **Wrap entire pages**: Place AuthGuard at the page level for full protection
4. **Combine with public content**: Use fallback to show public content while protecting specific features

## Examples

### Hospital Booking Page
```tsx
// Full page protection with return URL
<AuthGuard 
  message="Please log in to book medical resources."
  title="Booking Requires Account"
>
  <BookingForm />
</AuthGuard>
```

### Dashboard with Guest Preview
```tsx
// Show limited content to guests
<AuthGuard fallback={<GuestDashboard />}>
  <FullDashboard />
</AuthGuard>
```

### Admin Section
```tsx
// Custom redirect for admin features
<AuthGuard 
  redirectTo="/admin/login"
  title="Admin Access Required"
  message="This section requires administrator privileges."
>
  <AdminPanel />
</AuthGuard>
```