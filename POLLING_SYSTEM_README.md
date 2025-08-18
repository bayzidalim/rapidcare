# Polling System Configuration

## Overview

The RapidCare system includes a real-time polling system for live updates of hospital resources, bookings, and dashboard data. This system is designed to provide real-time updates to hospital authorities and administrators.

## Current Status

⚠️ **Polling is disabled by default** to prevent 404 errors during development and testing.

## Configuration

### Environment Variables

Create a `.env.local` file in the `front-end` directory with the following variables:

```bash
# Enable real-time polling (set to 'true' to enable)
NEXT_PUBLIC_ENABLE_POLLING=false

# API base URL
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

### Enabling Polling

To enable real-time polling:

1. Set `NEXT_PUBLIC_ENABLE_POLLING=true` in your `.env.local` file
2. Ensure the backend server is running with all polling endpoints implemented
3. Restart the frontend development server

### Manual Control

Users can also control polling through the UI:
- Hospital authorities see a "Pause/Resume" button in the Resource Management Dashboard
- The button shows the current polling status with a colored indicator:
  - 🟢 Green: Connected and receiving updates
  - 🟡 Yellow: Reconnecting after error
  - ⚪ Gray: Polling disabled or disconnected

## Polling Endpoints

The system uses the following polling endpoints:

### Hospital-Specific Endpoints
- `GET /api/hospitals/:id/polling/resources` - Resource updates
- `GET /api/hospitals/:id/polling/bookings` - Booking updates  
- `GET /api/hospitals/:id/polling/dashboard` - Combined dashboard updates
- `GET /api/hospitals/:id/polling/changes` - Change detection
- `GET /api/hospitals/:id/polling/config` - Polling configuration

### System-Wide Endpoints
- `GET /api/polling/resources` - System resource updates
- `GET /api/polling/bookings` - System booking updates
- `GET /api/polling/combined` - Combined system updates
- `GET /api/polling/audit` - Audit log updates
- `GET /api/polling/changes` - System change detection
- `GET /api/polling/config` - System polling configuration
- `GET /api/polling/health` - Polling system health check

## Error Handling

The polling system includes comprehensive error handling:

### 404 Errors
- When a polling endpoint returns 404, polling for that endpoint stops automatically
- This prevents continuous failed requests and console spam
- Users can manually restart polling using the UI controls

### Authentication Errors
- The system automatically refreshes authentication tokens
- If authentication fails, polling stops gracefully
- Users need to re-authenticate to resume polling

### Network Errors
- Implements exponential backoff for temporary network issues
- Automatically retries up to 3 times before stopping
- Shows connection status in the UI

## Development

### Testing Polling Endpoints

To test if polling endpoints are working:

```bash
# Start the backend server
cd back-end
npm run dev

# Test a polling endpoint
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     http://localhost:5000/api/hospitals/1/polling/resources
```

### Debugging

Enable polling debug logs by setting:
```bash
NEXT_PUBLIC_DEBUG_POLLING=true
```

This will show detailed polling activity in the browser console.

## Production Deployment

For production deployment:

1. Ensure all polling endpoints are implemented and tested
2. Set `NEXT_PUBLIC_ENABLE_POLLING=true` in production environment
3. Configure appropriate polling intervals for your server capacity
4. Monitor polling endpoint performance and error rates

## Troubleshooting

### Common Issues

**404 Errors in Console**
- Solution: Keep `NEXT_PUBLIC_ENABLE_POLLING=false` until all endpoints are implemented
- Alternative: Implement missing polling endpoints in the backend

**High Server Load**
- Solution: Increase polling intervals in the polling client configuration
- Check: Review the number of concurrent polling sessions

**Authentication Issues**
- Solution: Ensure JWT tokens are properly configured and not expired
- Check: Verify authentication middleware is working correctly

### Support

If you encounter issues with the polling system:

1. Check the browser console for error messages
2. Verify backend polling endpoints are accessible
3. Confirm authentication tokens are valid
4. Review environment variable configuration

## Future Enhancements

Planned improvements for the polling system:

- WebSocket support for more efficient real-time updates
- Server-sent events (SSE) as an alternative to polling
- Configurable polling intervals per endpoint
- Advanced error recovery mechanisms
- Polling analytics and monitoring dashboard