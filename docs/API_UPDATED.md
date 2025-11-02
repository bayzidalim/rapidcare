# 🔌 API Documentation

This document provides comprehensive documentation for the RapidCare API - your emergency care partner for fast access to critical medical resources.

## 🌐 Base URL

- **Development**: `http://localhost:5000/api`
- **Production**: `https://rapidcare-api.render.com/api`

## 🔐 Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```http
Authorization: Bearer <your-jwt-token>
```

### Authentication Flow

1. **Register/Login** → Receive JWT token
2. **Include token** in subsequent requests
3. **Token expires** after 24 hours (configurable)

## 📋 Response Format

All RapidCare API responses follow this professional structure:

```json
{
  "success": true,
  "data": {},
  "message": "Operation completed successfully",
  "timestamp": "2025-01-03T10:00:00.000Z"
}
```

### Error Response

```json
{
  "success": false,
  "error": "We're unable to process your request right now. Please try again or contact support.",
  "code": "ERROR_CODE",
  "timestamp": "2025-01-03T10:00:00.000Z"
}
```

## 🔑 Authentication Endpoints

### Register User

Create a new RapidCare account to access emergency medical resources.

```http
POST /api/auth/register
```

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securePassword123",
  "phone": "+1234567890",
  "userType": "user"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "userType": "user"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "message": "Welcome to RapidCare! Your account has been created successfully."
}
```

### Login User

Sign in to your RapidCare account to access emergency medical services.

```http
POST /api/auth/login
```

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "securePassword123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "userType": "user"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "message": "Welcome back to RapidCare! You're now signed in."
}
```

### Get Current User

Retrieve your RapidCare account information and profile details.

```http
GET /api/auth/me
```

**Headers:**
```http
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "userType": "user",
    "phone": "+1234567890"
  },
  "message": "Profile information retrieved successfully."
}
```

## 🏥 Hospital Endpoints

### Get All Hospitals

Find hospitals with available medical resources for emergency care.

```http
GET /api/hospitals
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `search` (optional): Search term for hospital name or services
- `city` (optional): Filter by city location

**Response:**
```json
{
  "success": true,
  "data": {
    "hospitals": [
      {
        "id": 1,
        "name": "City General Hospital",
        "address": "123 Main St, City",
        "phone": "+1234567890",
        "email": "info@citygeneral.com",
        "services": ["Emergency", "Surgery", "ICU"],
        "resources": {
          "beds": { "total": 100, "available": 25 },
          "icu": { "total": 20, "available": 5 },
          "operationTheatres": { "total": 8, "available": 2 }
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
}
```

### Get Hospital by ID

Get detailed information about a specific hospital and its available resources.

```http
GET /api/hospitals/:id
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "City General Hospital",
    "address": "123 Main St, City",
    "phone": "+1234567890",
    "email": "info@citygeneral.com",
    "services": ["Emergency", "Surgery", "ICU"],
    "resources": {
      "beds": { "total": 100, "available": 25 },
      "icu": { "total": 20, "available": 5 },
      "operationTheatres": { "total": 8, "available": 2 }
    },
    "surgeons": [
      {
        "id": 1,
        "name": "Dr. Smith",
        "specialization": "Cardiology",
        "available": true
      }
    ]
  }
}
```

### Search Hospitals

Search for hospitals based on location, services, and resource availability for emergency care.

```http
GET /api/hospitals/search
```

**Query Parameters:**
- `q`: Search query for hospital name or services
- `city`: Filter by city location
- `services`: Service filter (comma-separated)
- `hasAvailability`: Filter by resource availability

**Response:**
```json
{
  "success": true,
  "data": {
    "hospitals": [...],
    "filters": {
      "cities": ["New York", "Los Angeles"],
      "services": ["Emergency", "Surgery", "ICU"]
    }
  }
}
```

### Create Hospital (Hospital Authority Only)

Register your hospital with RapidCare to provide emergency medical services to patients.

```http
POST /api/hospitals
```

**Headers:**
```http
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "name": "New Hospital",
  "address": "456 Oak St, City",
  "phone": "+1234567890",
  "email": "info@newhospital.com",
  "services": ["Emergency", "Surgery"],
  "resources": {
    "beds": { "total": 50 },
    "icu": { "total": 10 },
    "operationTheatres": { "total": 4 }
  }
}
```

### Update Hospital Resources

Update real-time availability of hospital resources for emergency bookings.

```http
PUT /api/hospitals/:id/resources
```

**Headers:**
```http
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "beds": { "available": 30 },
  "icu": { "available": 8 },
  "operationTheatres": { "available": 3 }
}
```

## 📅 Booking Endpoints

### Create Booking

Book critical medical resources when every second counts.

```http
POST /api/bookings
```

**Headers:**
```http
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "hospitalId": 1,
  "resourceType": "bed",
  "patientName": "Jane Doe",
  "patientAge": 30,
  "patientGender": "female",
  "contactNumber": "+1234567890",
  "emergencyContact": "+0987654321",
  "medicalCondition": "Chest pain",
  "preferredDate": "2025-01-04",
  "preferredTime": "14:00",
  "surgeonId": 1
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "hospitalId": 1,
    "userId": 1,
    "resourceType": "bed",
    "patientName": "Jane Doe",
    "status": "pending",
    "bookingDate": "2025-01-04T14:00:00.000Z",
    "amount": 500,
    "serviceCharge": 150,
    "totalAmount": 650
  },
  "message": "Your booking has been submitted successfully. The hospital will confirm availability shortly."
}
```

### Get User Bookings

View your RapidCare booking history and current reservations.

```http
GET /api/bookings/user/:userId
```

**Headers:**
```http
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "bookings": [
      {
        "id": 1,
        "hospital": {
          "name": "City General Hospital",
          "address": "123 Main St"
        },
        "resourceType": "bed",
        "status": "confirmed",
        "bookingDate": "2025-01-04T14:00:00.000Z",
        "totalAmount": 650
      }
    ]
  }
}
```

### Update Booking Status

Update the status of a medical resource booking (Hospital Authority only).

```http
PUT /api/bookings/:id/status
```

**Headers:**
```http
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "status": "confirmed",
  "notes": "Your booking has been confirmed. Please arrive 15 minutes early."
}
```

### Cancel Booking

Cancel a medical resource booking when circumstances change.

```http
DELETE /api/bookings/:id
```

**Headers:**
```http
Authorization: Bearer <token>
```

## 🩸 Blood Request Endpoints

### Create Blood Request

Request emergency blood donations through RapidCare's donor network.

```http
POST /api/blood/request
```

**Headers:**
```http
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "patientName": "John Smith",
  "bloodType": "O+",
  "unitsNeeded": 2,
  "hospitalId": 1,
  "urgency": "high",
  "contactNumber": "+1234567890",
  "medicalCondition": "Surgery preparation",
  "requiredBy": "2025-01-05T10:00:00.000Z"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "patientName": "John Smith",
    "bloodType": "O+",
    "unitsNeeded": 2,
    "status": "active",
    "urgency": "high",
    "hospital": {
      "name": "City General Hospital",
      "address": "123 Main St"
    }
  },
  "message": "Blood request submitted successfully. Donors are being notified immediately."
}
```

### Get Blood Requests

Find active blood donation requests in your area to help save lives.

```http
GET /api/blood/requests
```

**Query Parameters:**
- `bloodType`: Filter by blood type compatibility
- `urgency`: Filter by urgency level (high, medium, low)
- `status`: Filter by request status
- `city`: Filter by city location

**Response:**
```json
{
  "success": true,
  "data": {
    "requests": [
      {
        "id": 1,
        "patientName": "John Smith",
        "bloodType": "O+",
        "unitsNeeded": 2,
        "status": "active",
        "urgency": "high",
        "hospital": {
          "name": "City General Hospital",
          "address": "123 Main St"
        },
        "requiredBy": "2025-01-05T10:00:00.000Z"
      }
    ]
  }
}
```

### Match Donor to Blood Request

Connect with patients in need by offering to donate blood through RapidCare.

```http
POST /api/blood/requests/:id/match
```

**Headers:**
```http
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "donorName": "Alice Johnson",
  "donorPhone": "+1234567890",
  "donorEmail": "alice@example.com",
  "unitsOffered": 1
}
```

## 🧪 Sample Collection Endpoints

### Get Hospitals with Sample Collection

Find hospitals that offer home medical sample collection services.

```http
GET /api/sample-collection/hospitals
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "City General Hospital",
      "address": "123 Main St, City",
      "phone": "+1234567890",
      "email": "info@citygeneral.com",
      "available_tests": 15
    }
  ]
}
```

### Get All Test Types

Retrieve all available medical test types for home sample collection.

```http
GET /api/sample-collection/test-types
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Complete Blood Count",
      "description": "Measures various components of blood",
      "base_price": 500,
      "estimated_time": "24 hours"
    }
  ]
}
```

### Get Hospital Test Types

Get available test types at a specific hospital.

```http
GET /api/sample-collection/hospitals/:hospitalId/test-types
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Complete Blood Count",
      "description": "Measures various components of blood",
      "base_price": 500,
      "estimated_time": "24 hours",
      "hospital_price": 550
    }
  ]
}
```

### Calculate Pricing

Calculate the estimated price for selected tests at a hospital.

```http
POST /api/sample-collection/calculate-pricing
```

**Request Body:**
```json
{
  "hospitalId": 1,
  "testTypeIds": [1, 2, 3]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "pricing": {
      "subtotal": 1650,
      "serviceCharge": 495,
      "total": 2145
    },
    "testDetails": [
      {
        "id": 1,
        "name": "Complete Blood Count",
        "base_price": 500,
        "hospital_price": 550
      }
    ]
  }
}
```

### Submit Collection Request

Create a new home sample collection request.

```http
POST /api/sample-collection/submit-request
```

**Headers:**
```http
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "hospitalId": 1,
  "testTypeIds": [1, 2],
  "patientName": "John Doe",
  "patientPhone": "+1234567890",
  "collectionAddress": "123 Main St, City",
  "preferredTime": "2025-01-05T10:00:00.000Z",
  "specialInstructions": "Ring doorbell twice"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "user_id": 1,
    "hospital_id": 1,
    "patient_name": "John Doe",
    "patient_phone": "+1234567890",
    "collection_address": "123 Main St, City",
    "preferred_time": "2025-01-05T10:00:00.000Z",
    "status": "pending",
    "pricing": {
      "subtotal": 1100,
      "serviceCharge": 330,
      "total": 1430
    }
  },
  "message": "Request created successfully. An agent will be assigned shortly."
}
```

### Get User Collection Requests

Retrieve your home sample collection requests.

```http
GET /api/sample-collection/requests
```

**Headers:**
```http
Authorization: Bearer <token>
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "hospital_id": 1,
      "patient_name": "John Doe",
      "collection_address": "123 Main St, City",
      "status": "assigned",
      "created_at": "2025-01-03T10:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "hasMore": false
  }
}
```

### Get Specific Collection Request

Get details of a specific collection request.

```http
GET /api/sample-collection/requests/:requestId
```

**Headers:**
```http
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "user_id": 1,
    "hospital_id": 1,
    "patient_name": "John Doe",
    "patient_phone": "+1234567890",
    "collection_address": "123 Main St, City",
    "preferred_time": "2025-01-05T10:00:00.000Z",
    "status": "assigned",
    "agent_id": 1,
    "testDetails": [
      {
        "id": 1,
        "name": "Complete Blood Count",
        "description": "Measures various components of blood",
        "base_price": 500,
        "hospital_price": 550
      }
    ]
  }
}
```

### Cancel Collection Request

Cancel a home sample collection request.

```http
PUT /api/sample-collection/requests/:requestId/cancel
```

**Headers:**
```http
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "reason": "Changed my mind"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Request cancelled successfully"
}
```

## 💰 Payment Endpoints

### Initiate bKash Payment

Start a bKash payment for a booking or collection request.

```http
POST /api/payments/initiate
```

**Headers:**
```http
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "bookingId": 1,
  "amount": 650,
  "currency": "BDT"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "paymentId": "bkash_1234567890",
    "amount": 650,
    "currency": "BDT",
    "status": "pending"
  },
  "message": "Payment initiated successfully. Please complete the payment in the bKash app."
}
```

### Verify bKash Payment

Verify the status of a bKash payment.

```http
POST /api/payments/verify
```

**Headers:**
```http
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "paymentId": "bkash_1234567890"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "paymentId": "bkash_1234567890",
    "amount": 650,
    "currency": "BDT",
    "status": "completed",
    "transactionId": "trx_1234567890"
  },
  "message": "Payment verified successfully."
}
```

### Get Payment History

Retrieve your payment history.

```http
GET /api/payments/history
```

**Headers:**
```http
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "userId": 1,
      "bookingId": 1,
      "amount": 650,
      "currency": "BDT",
      "status": "completed",
      "transactionId": "trx_1234567890",
      "createdAt": "2025-01-03T10:00:00.000Z"
    }
  ]
}
```

### Get Payment Receipt

Get a payment receipt for a booking.

```http
GET /api/payments/receipt/:bookingId
```

**Headers:**
```http
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "receiptId": "receipt_1234567890",
    "bookingId": 1,
    "hospitalName": "City General Hospital",
    "resourceType": "bed",
    "amount": 500,
    "serviceCharge": 150,
    "totalAmount": 650,
    "transactionId": "trx_1234567890",
    "paymentDate": "2025-01-03T10:00:00.000Z"
  }
}
```

## 👨‍⚕️ Admin Endpoints

### Get System Statistics

Monitor RapidCare platform performance and usage metrics.

```http
GET /api/admin/stats
```

**Headers:**
```http
Authorization: Bearer <admin-token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "users": {
      "total": 1000,
      "active": 850,
      "new": 50
    },
    "hospitals": {
      "total": 25,
      "active": 23
    },
    "bookings": {
      "total": 500,
      "pending": 25,
      "confirmed": 400,
      "completed": 75
    },
    "bloodRequests": {
      "total": 100,
      "active": 15,
      "fulfilled": 85
    },
    "sampleCollections": {
      "total": 200,
      "pending": 30,
      "assigned": 120,
      "completed": 50
    }
  }
}
```

### Manage Users

Administer RapidCare user accounts and access permissions.

```http
GET /api/admin/users
PUT /api/admin/users/:id/status
DELETE /api/admin/users/:id
```

### Manage Hospitals

Oversee hospital registrations and service quality on the RapidCare platform.

```http
GET /api/admin/hospitals
PUT /api/admin/hospitals/:id/approve
DELETE /api/admin/hospitals/:id
```

## 📊 Error Codes

| Code | Description | Professional Message |
|------|-------------|---------------------|
| `AUTH_REQUIRED` | Authentication required | Please sign in to access RapidCare services |
| `INVALID_TOKEN` | Invalid or expired token | Your session has expired. Please sign in again |
| `INSUFFICIENT_PERMISSIONS` | User lacks required permissions | You don't have permission to perform this action |
| `VALIDATION_ERROR` | Request validation failed | Please check your information and try again |
| `RESOURCE_NOT_FOUND` | Requested resource not found | The requested resource is not available |
| `RESOURCE_UNAVAILABLE` | Resource not available for booking | This resource is no longer available. Please select another option |
| `BOOKING_CONFLICT` | Booking time conflict | Booking conflict detected. Please choose a different time |
| `PAYMENT_FAILED` | Payment processing failed | Payment processing failed. Please verify your payment information |
| `SERVER_ERROR` | Internal server error | We're experiencing technical difficulties. Our team has been notified |

## 🔄 Rate Limiting

- **General endpoints**: 100 requests per 15 minutes
- **Authentication endpoints**: 5 requests per 15 minutes
- **Search endpoints**: 50 requests per 15 minutes

## 📝 Request/Response Examples

### Complete Booking Flow

1. **Search Hospitals**
```http
GET /api/hospitals/search?city=NewYork&services=Emergency
```

2. **Get Hospital Details**
```http
GET /api/hospitals/1
```

3. **Create Booking**
```http
POST /api/bookings
{
  "hospitalId": 1,
  "resourceType": "bed",
  "patientName": "Jane Doe",
  ...
}
```

4. **Initiate Payment**
```http
POST /api/payments/initiate
{
  "bookingId": 1,
  "amount": 650,
  "currency": "BDT"
}
```

5. **Verify Payment**
```http
POST /api/payments/verify
{
  "paymentId": "bkash_1234567890"
}
```

6. **Check Booking Status**
```http
GET /api/bookings/user/1
```

### Blood Request Flow

1. **Create Request**
```http
POST /api/blood/request
{
  "patientName": "John Smith",
  "bloodType": "O+",
  ...
}
```

2. **Search Active Requests**
```http
GET /api/blood/requests?bloodType=O+&status=active
```

3. **Match Donor**
```http
POST /api/blood/requests/1/match
{
  "donorName": "Alice Johnson",
  ...
}
```

### Sample Collection Flow

1. **Find Collection Hospitals**
```http
GET /api/sample-collection/hospitals
```

2. **Get Test Types**
```http
GET /api/sample-collection/hospitals/1/test-types
```

3. **Calculate Pricing**
```http
POST /api/sample-collection/calculate-pricing
{
  "hospitalId": 1,
  "testTypeIds": [1, 2]
}
```

4. **Submit Request**
```http
POST /api/sample-collection/submit-request
{
  "hospitalId": 1,
  "testTypeIds": [1, 2],
  "patientName": "John Doe",
  ...
}
```

5. **Check Request Status**
```http
GET /api/sample-collection/requests
```

## 🧪 Testing the API

### Using cURL

```bash
# Register for RapidCare
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"password123","userType":"user"}'

# Sign in to RapidCare
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Find emergency care hospitals
curl -X GET http://localhost:5000/api/hospitals \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# Submit a sample collection request
curl -X POST http://localhost:5000/api/sample-collection/submit-request \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{"hospitalId":1,"testTypeIds":[1,2],"patientName":"John Doe","patientPhone":"+1234567890","collectionAddress":"123 Main St, City","preferredTime":"2025-01-05T10:00:00.000Z"}'
```

### Using Postman

1. Import the RapidCare API collection: [Download Postman Collection](./postman-collection.json)
2. Set environment variables:
   - `baseUrl`: `http://localhost:5000/api`
   - `token`: Your RapidCare JWT token

## 🔒 Security Considerations

- All API endpoints require HTTPS in production
- JWT tokens are signed with a secret key and have expiration times
- Role-based access control prevents unauthorized access to sensitive endpoints
- Input validation prevents injection attacks
- Financial operations require additional authentication layers
- All payment data is encrypted and securely handled
- Audit trails log all system activities for compliance
- Rate limiting prevents abuse of API endpoints

## 📞 Support

For RapidCare API support:
- Review the professional error message and code
- Verify your authentication token is valid
- Check the request format against our documentation
- Contact our support team for emergency assistance
- Report issues via GitHub for non-urgent matters

**Emergency Support**: When every second counts, our technical team is here to help ensure uninterrupted access to critical medical resources.