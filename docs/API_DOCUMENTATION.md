# RapidCare Hospital Booking System - API Documentation

## Table of Contents
1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Base URL and Headers](#base-url-and-headers)
4. [Error Handling](#error-handling)
5. [Authentication Endpoints](#authentication-endpoints)
6. [Hospital Endpoints](#hospital-endpoints)
7. [Booking Endpoints](#booking-endpoints)
8. [Notification Endpoints](#notification-endpoints)
9. [Payment Endpoints](#payment-endpoints)
10. [Admin Endpoints](#admin-endpoints)
11. [Polling Endpoints](#polling-endpoints)
12. [Rate Limiting](#rate-limiting)

## Overview

The RapidCare API is a RESTful API that provides access to hospital booking, resource management, and payment processing functionality. All API responses are in JSON format.

### API Version
Current Version: v1

### Supported HTTP Methods
- GET: Retrieve data
- POST: Create new resources
- PUT: Update existing resources
- DELETE: Remove resources

## Authentication

The API uses JWT (JSON Web Token) based authentication. Include the token in the Authorization header for all authenticated requests.

### Token Format
```
Authorization: Bearer <jwt_token>
```

### Token Expiration
- Access tokens expire after 24 hours
- Refresh tokens expire after 7 days
- Tokens are automatically refreshed by the frontend

## Base URL and Headers

### Base URL
```
Production: https://api.rapidcare.com/api
Development: http://localhost:5000/api
```

### Required Headers
```
Content-Type: application/json
Authorization: Bearer <jwt_token> (for authenticated endpoints)
```

## Error Handling

### Error Response Format
```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {
    "field": "validation error details"
  }
}
```

### HTTP Status Codes
- 200: Success
- 201: Created
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 409: Conflict
- 422: Validation Error
- 500: Internal Server Error

## Authentication Endpoints

### Register User
Create a new user account.

**Endpoint:** `POST /auth/register`

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securepassword123",
  "phone": "+8801234567890",
  "role": "user"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "role": "user"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Login User
Authenticate user and receive access token.

**Endpoint:** `POST /auth/login`

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "securepassword123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "role": "user"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Refresh Token
Refresh expired access token.

**Endpoint:** `POST /auth/refresh`

**Headers:** `Authorization: Bearer <refresh_token>`

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

## Hospital Endpoints

### Get All Hospitals
Retrieve list of all approved hospitals with resource availability.

**Endpoint:** `GET /hospitals`

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `search` (optional): Search by hospital name
- `location` (optional): Filter by location

**Response:**
```json
{
  "success": true,
  "hospitals": [
    {
      "id": 1,
      "name": "City General Hospital",
      "address": "123 Main Street, Dhaka",
      "phone": "+8801234567890",
      "email": "info@citygeneral.com",
      "status": "approved",
      "resources": {
        "beds": {
          "total": 100,
          "available": 25,
          "occupied": 70,
          "maintenance": 5
        },
        "icu": {
          "total": 20,
          "available": 5,
          "occupied": 15,
          "maintenance": 0
        },
        "operationTheatres": {
          "total": 8,
          "available": 3,
          "occupied": 4,
          "maintenance": 1
        }
      },
      "pricing": {
        "beds": 2000,
        "icu": 8000,
        "operationTheatres": 15000
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 50,
    "pages": 5
  }
}
```

### Get Hospital Details
Retrieve detailed information about a specific hospital.

**Endpoint:** `GET /hospitals/:id`

**Response:**
```json
{
  "success": true,
  "hospital": {
    "id": 1,
    "name": "City General Hospital",
    "address": "123 Main Street, Dhaka",
    "phone": "+8801234567890",
    "email": "info@citygeneral.com",
    "website": "https://citygeneral.com",
    "description": "Leading healthcare provider in Dhaka",
    "specialties": ["Cardiology", "Neurology", "Orthopedics"],
    "facilities": ["24/7 Emergency", "ICU", "Operation Theatre"],
    "resources": {
      "beds": {
        "total": 100,
        "available": 25,
        "occupied": 70,
        "maintenance": 5
      },
      "icu": {
        "total": 20,
        "available": 5,
        "occupied": 15,
        "maintenance": 0
      },
      "operationTheatres": {
        "total": 8,
        "available": 3,
        "occupied": 4,
        "maintenance": 1
      }
    },
    "pricing": {
      "beds": 2000,
      "icu": 8000,
      "operationTheatres": 15000
    }
  }
}
```

### Update Hospital Resources
Update resource availability (Hospital Authority only).

**Endpoint:** `PUT /hospitals/:id/resources`

**Authentication:** Required (Hospital Authority)

**Request Body:**
```json
{
  "resourceType": "beds",
  "total": 100,
  "available": 30,
  "occupied": 65,
  "maintenance": 5
}
```

**Response:**
```json
{
  "success": true,
  "message": "Resources updated successfully",
  "resources": {
    "beds": {
      "total": 100,
      "available": 30,
      "occupied": 65,
      "maintenance": 5
    }
  }
}
```

## Booking Endpoints

### Create Booking
Create a new booking request.

**Endpoint:** `POST /bookings`

**Authentication:** Required

**Request Body:**
```json
{
  "hospitalId": 1,
  "resourceType": "beds",
  "patientName": "Jane Smith",
  "patientAge": 35,
  "patientGender": "female",
  "medicalCondition": "Chest pain and shortness of breath",
  "urgency": "high",
  "emergencyContactName": "John Smith",
  "emergencyContactPhone": "+8801234567890",
  "emergencyContactRelationship": "husband",
  "scheduledDate": "2024-01-15T10:00:00Z",
  "estimatedDuration": 48
}
```

**Response:**
```json
{
  "success": true,
  "message": "Booking created successfully",
  "booking": {
    "id": 123,
    "bookingReference": "RC-2024-001-123",
    "userId": 1,
    "hospitalId": 1,
    "resourceType": "beds",
    "patientName": "Jane Smith",
    "patientAge": 35,
    "patientGender": "female",
    "medicalCondition": "Chest pain and shortness of breath",
    "urgency": "high",
    "status": "pending",
    "scheduledDate": "2024-01-15T10:00:00Z",
    "estimatedDuration": 48,
    "createdAt": "2024-01-10T08:30:00Z"
  }
}
```

### Get User Bookings
Retrieve all bookings for the authenticated user.

**Endpoint:** `GET /bookings/user`

**Authentication:** Required

**Query Parameters:**
- `status` (optional): Filter by status
- `page` (optional): Page number
- `limit` (optional): Items per page

**Response:**
```json
{
  "success": true,
  "bookings": [
    {
      "id": 123,
      "bookingReference": "RC-2024-001-123",
      "hospitalName": "City General Hospital",
      "resourceType": "beds",
      "patientName": "Jane Smith",
      "status": "approved",
      "scheduledDate": "2024-01-15T10:00:00Z",
      "createdAt": "2024-01-10T08:30:00Z",
      "approvedAt": "2024-01-10T09:15:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 5,
    "pages": 1
  }
}
```

### Get Booking Details
Retrieve detailed information about a specific booking.

**Endpoint:** `GET /bookings/:id`

**Authentication:** Required

**Response:**
```json
{
  "success": true,
  "booking": {
    "id": 123,
    "bookingReference": "RC-2024-001-123",
    "userId": 1,
    "hospitalId": 1,
    "hospitalName": "City General Hospital",
    "resourceType": "beds",
    "patientName": "Jane Smith",
    "patientAge": 35,
    "patientGender": "female",
    "medicalCondition": "Chest pain and shortness of breath",
    "urgency": "high",
    "emergencyContactName": "John Smith",
    "emergencyContactPhone": "+8801234567890",
    "emergencyContactRelationship": "husband",
    "status": "approved",
    "scheduledDate": "2024-01-15T10:00:00Z",
    "estimatedDuration": 48,
    "approvedBy": 5,
    "approvedAt": "2024-01-10T09:15:00Z",
    "authorityNotes": "Approved for immediate admission",
    "createdAt": "2024-01-10T08:30:00Z",
    "updatedAt": "2024-01-10T09:15:00Z"
  }
}
```

### Get Hospital Pending Bookings
Retrieve pending bookings for a hospital (Hospital Authority only).

**Endpoint:** `GET /bookings/hospital/:hospitalId/pending`

**Authentication:** Required (Hospital Authority)

**Response:**
```json
{
  "success": true,
  "bookings": [
    {
      "id": 124,
      "bookingReference": "RC-2024-001-124",
      "patientName": "Mike Johnson",
      "patientAge": 42,
      "medicalCondition": "Severe abdominal pain",
      "urgency": "critical",
      "resourceType": "icu",
      "scheduledDate": "2024-01-15T14:00:00Z",
      "createdAt": "2024-01-10T10:30:00Z",
      "emergencyContactName": "Sarah Johnson",
      "emergencyContactPhone": "+8801234567891"
    }
  ]
}
```

### Approve Booking
Approve a pending booking request (Hospital Authority only).

**Endpoint:** `PUT /bookings/:id/approve`

**Authentication:** Required (Hospital Authority)

**Request Body:**
```json
{
  "authorityNotes": "Approved for immediate admission. ICU bed 12 allocated."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Booking approved successfully",
  "booking": {
    "id": 124,
    "status": "approved",
    "approvedBy": 5,
    "approvedAt": "2024-01-10T11:00:00Z",
    "authorityNotes": "Approved for immediate admission. ICU bed 12 allocated."
  }
}
```

### Decline Booking
Decline a pending booking request (Hospital Authority only).

**Endpoint:** `PUT /bookings/:id/decline`

**Authentication:** Required (Hospital Authority)

**Request Body:**
```json
{
  "declineReason": "Resource unavailable",
  "authorityNotes": "All ICU beds are currently occupied. Please try again in 4-6 hours."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Booking declined",
  "booking": {
    "id": 124,
    "status": "declined",
    "declineReason": "Resource unavailable",
    "authorityNotes": "All ICU beds are currently occupied. Please try again in 4-6 hours.",
    "updatedAt": "2024-01-10T11:00:00Z"
  }
}
```

### Cancel Booking
Cancel a booking (User or Hospital Authority).

**Endpoint:** `PUT /bookings/:id/cancel`

**Authentication:** Required

**Request Body:**
```json
{
  "reason": "Patient condition improved"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Booking cancelled successfully",
  "booking": {
    "id": 123,
    "status": "cancelled",
    "updatedAt": "2024-01-10T12:00:00Z"
  }
}
```

## Notification Endpoints

### Get User Notifications
Retrieve notifications for the authenticated user.

**Endpoint:** `GET /notifications`

**Authentication:** Required

**Query Parameters:**
- `unread` (optional): Filter unread notifications (true/false)
- `page` (optional): Page number
- `limit` (optional): Items per page

**Response:**
```json
{
  "success": true,
  "notifications": [
    {
      "id": 1,
      "type": "booking_approved",
      "title": "Booking Approved",
      "message": "Your booking RC-2024-001-123 has been approved by City General Hospital",
      "bookingId": 123,
      "isRead": false,
      "createdAt": "2024-01-10T09:15:00Z"
    }
  ],
  "unreadCount": 3
}
```

### Mark Notification as Read
Mark a specific notification as read.

**Endpoint:** `PUT /notifications/:id/read`

**Authentication:** Required

**Response:**
```json
{
  "success": true,
  "message": "Notification marked as read"
}
```

### Mark All Notifications as Read
Mark all notifications as read for the user.

**Endpoint:** `PUT /notifications/read-all`

**Authentication:** Required

**Response:**
```json
{
  "success": true,
  "message": "All notifications marked as read"
}
```

## Payment Endpoints

### Create Payment
Initiate a payment for a booking.

**Endpoint:** `POST /payments`

**Authentication:** Required

**Request Body:**
```json
{
  "bookingId": 123,
  "amount": 2000,
  "currency": "BDT",
  "paymentMethod": "bkash"
}
```

**Response:**
```json
{
  "success": true,
  "payment": {
    "id": "pay_123456",
    "bookingId": 123,
    "amount": 2000,
    "currency": "BDT",
    "status": "pending",
    "paymentUrl": "https://checkout.bkash.com/pay_123456"
  }
}
```

### Get Payment Status
Check the status of a payment.

**Endpoint:** `GET /payments/:paymentId/status`

**Authentication:** Required

**Response:**
```json
{
  "success": true,
  "payment": {
    "id": "pay_123456",
    "status": "completed",
    "amount": 2000,
    "currency": "BDT",
    "transactionId": "TXN789012",
    "completedAt": "2024-01-10T10:30:00Z"
  }
}
```

## Admin Endpoints

### Get All Users
Retrieve all users (Admin only).

**Endpoint:** `GET /admin/users`

**Authentication:** Required (Admin)

**Response:**
```json
{
  "success": true,
  "users": [
    {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "role": "user",
      "status": "active",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### Get System Statistics
Retrieve system-wide statistics (Admin only).

**Endpoint:** `GET /admin/stats`

**Authentication:** Required (Admin)

**Response:**
```json
{
  "success": true,
  "stats": {
    "totalUsers": 1250,
    "totalHospitals": 45,
    "totalBookings": 3420,
    "pendingBookings": 23,
    "approvedBookings": 2890,
    "totalRevenue": 6840000,
    "averageResponseTime": 45
  }
}
```

## Polling Endpoints

### Get Real-time Updates
Get real-time updates for bookings and resources.

**Endpoint:** `GET /polling/updates`

**Authentication:** Required

**Query Parameters:**
- `lastUpdate` (optional): Timestamp of last update
- `types` (optional): Comma-separated list of update types

**Response:**
```json
{
  "success": true,
  "updates": {
    "bookings": [
      {
        "id": 123,
        "status": "approved",
        "updatedAt": "2024-01-10T09:15:00Z"
      }
    ],
    "resources": [
      {
        "hospitalId": 1,
        "resourceType": "beds",
        "available": 24,
        "updatedAt": "2024-01-10T09:20:00Z"
      }
    ],
    "notifications": [
      {
        "id": 1,
        "type": "booking_approved",
        "createdAt": "2024-01-10T09:15:00Z"
      }
    ]
  },
  "timestamp": "2024-01-10T09:25:00Z"
}
```

## Rate Limiting

### Rate Limits
- Authentication endpoints: 5 requests per minute
- Booking creation: 10 requests per hour per user
- General API endpoints: 100 requests per minute per user
- Polling endpoints: 1 request per 3 seconds

### Rate Limit Headers
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1641811200
```

### Rate Limit Exceeded Response
```json
{
  "success": false,
  "error": "Rate limit exceeded",
  "code": "RATE_LIMIT_EXCEEDED",
  "retryAfter": 60
}
```

## Webhooks

### Webhook Events
- `booking.created`: New booking created
- `booking.approved`: Booking approved
- `booking.declined`: Booking declined
- `booking.cancelled`: Booking cancelled
- `payment.completed`: Payment completed
- `payment.failed`: Payment failed

### Webhook Payload Example
```json
{
  "event": "booking.approved",
  "data": {
    "bookingId": 123,
    "hospitalId": 1,
    "userId": 1,
    "status": "approved",
    "timestamp": "2024-01-10T09:15:00Z"
  }
}
```

## SDK and Libraries

### JavaScript/Node.js
```bash
npm install rapidcare-api-client
```

### Usage Example
```javascript
const RapidCare = require('rapidcare-api-client');

const client = new RapidCare({
  apiKey: 'your-api-key',
  baseURL: 'https://api.rapidcare.com/api'
});

// Create a booking
const booking = await client.bookings.create({
  hospitalId: 1,
  resourceType: 'beds',
  patientName: 'John Doe',
  // ... other fields
});
```

---

For additional API support or questions, please contact our technical support team at tech-support@rapidcare.com.