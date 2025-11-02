# 📁 RapidCare Project Structure

## 🌳 Root Directory Organization

```
rapidcare/
├── back-end/           # Node.js Express API server
├── front-end/          # Next.js React application
├── .github/            # GitHub workflows and CI/CD
├── docs/               # Project documentation
├── scripts/            # Deployment and utility scripts
├── docker-compose.yml  # Docker Compose configuration
├── package.json        # Root package.json for monorepo scripts
└── README_UPDATED.md   # Updated project documentation
```

## 🏢 Backend Structure (`back-end/`)

The backend is organized following a service-oriented architecture with clear separation of concerns:

```
back-end/
├── config/
│   ├── config.js       # Application configuration
│   └── database.js     # SQLite database setup and schema
├── controllers/        # Request handlers and business logic
│   ├── adminController.js
│   ├── auditController.js
│   ├── authController.js
│   ├── bloodController.js
│   ├── bookingController.js
│   ├── hospitalController.js
│   ├── notificationController.js
│   ├── reconciliationController.js
│   └── sampleCollectionController.js
├── jobs/               # Background job schedulers
│   └── reconciliationScheduler.js
├── middleware/
│   ├── auth.js         # JWT authentication middleware
│   └── financialAuth.js # Financial operations authentication
├── migrations/         # Database migration files
│   ├── 001_add_financial_tables.js
│   ├── 001_hospital_approval_system.js
│   ├── 002_resource_booking_management.js
│   ├── 003_notification_system.js
│   ├── 005_notifications_system.js
│   ├── 006_audit_trail_system.js
│   ├── 008_create_reconciliation_tables.js
│   ├── 009_add_user_balance_and_simple_pricing.js
│   ├── 010_sample_collection_system.js
│   ├── 011_allow_null_user_id_sample_requests.js
│   └── migrate.js
├── models/             # Database models
│   ├── BalanceTransaction.js
│   ├── BloodRequest.js
│   ├── Booking.js
│   ├── BookingStatusHistory.js
│   ├── CollectionAgent.js
│   ├── Hospital.js
│   ├── HospitalPricing.js
│   ├── PaymentConfig.js
│   ├── ResourceAuditLog.js
│   ├── SampleCollection.js
│   ├── Transaction.js
│   ├── User.js
│   └── UserBalance.js
├── routes/             # API route definitions
│   ├── admin.js        # Admin-only endpoints
│   ├── audit.js        # Audit trail endpoints
│   ├── auth.js         # Authentication endpoints
│   ├── blood.js        # Blood donation endpoints
│   ├── bookings.js     # Hospital booking endpoints
│   ├── hospitals.js    # Hospital management endpoints
│   ├── notifications.js # Notification system endpoints
│   ├── payments.js     # Payment processing endpoints
│   ├── polling.js      # Real-time polling endpoints
│   ├── pricing.js      # Pricing management endpoints
│   ├── reconciliation.js # Financial reconciliation endpoints
│   ├── revenue.js      # Revenue analytics endpoints
│   ├── sampleCollection.js # Sample collection endpoints
│   ├── security.js     # Security and fraud detection endpoints
│   └── test.js         # Test endpoints (development only)
├── services/           # Business logic layer
│   ├── analyticsService.js
│   ├── auditService.js
│   ├── auditTrailService.js
│   ├── bloodRequestService.js
│   ├── bookingApprovalService.js
│   ├── bookingService.js
│   ├── financialReconciliationService.js
│   ├── fraudDetectionService.js
│   ├── hospitalService.js
│   ├── notificationService.js
│   ├── paymentProcessingService.js
│   ├── pollingService.js
│   ├── pricingManagementService.js
│   ├── resourceManagementService.js
│   ├── revenueManagementService.js
│   ├── sampleCollectionService.js
│   ├── securePaymentDataService.js
│   ├── userService.js
│   └── validationService.js
├── tests/              # Comprehensive test suite
│   ├── comprehensive/  # End-to-end comprehensive tests
│   ├── consistency/    # Data consistency tests
│   ├── e2e/           # End-to-end tests
│   ├── integration/   # Integration tests
│   ├── models/        # Model unit tests
│   ├── performance/   # Performance tests
│   ├── routes/        # Route tests
│   ├── security/      # Security tests
│   ├── services/      # Service tests
│   ├── utils/         # Utility tests
│   └── run-bkash-tests.js
├── utils/
│   ├── currencyUtils.js
│   ├── errorHandler.js
│   ├── financialSeeder.js
│   ├── notificationProcessor.js
│   ├── pollingClient.js
│   ├── securityUtils.js
│   └── seeder.js       # Database seeding utility
├── .env                # Environment variables
├── .env.example        # Environment template
├── database.sqlite     # SQLite database file
├── Dockerfile          # Docker configuration
├── index.js            # Server entry point
├── package.json
├── server.log          # Application logs
└── vercel.json         # Vercel deployment configuration
```

## 🎨 Frontend Structure (`front-end/`)

The frontend follows Next.js 15 App Router conventions with a component-based architecture:

```
front-end/
├── src/
│   ├── app/            # Next.js App Router pages
│   │   ├── admin/      # Admin dashboard
│   │   ├── booking/    # Booking management
│   │   │   └── payment/ # Payment processing pages
│   │   ├── dashboard/  # User dashboard
│   │   ├── donate-blood/ # Blood donation
│   │   ├── hospitals/  # Hospital listings and management
│   │   │   ├── [id]/   # Dynamic hospital pages
│   │   │   ├── add/    # Add hospital form
│   │   │   └── manage/ # Hospital management
│   │   ├── login/      # Authentication
│   │   ├── notifications/ # Notification center
│   │   ├── profile/    # User profile
│   │   ├── rapid-collection/ # Home sample collection service
│   │   ├── register/   # User registration
│   │   ├── layout.tsx  # Root layout
│   │   └── page.tsx    # Home page
│   ├── components/     # Reusable React components
│   │   ├── __tests__/  # Component tests
│   │   ├── examples/   # Example components
│   │   ├── ui/         # shadcn/ui components + bKash UI components
│   │   ├── AdminFinancialDashboard.tsx
│   │   ├── AdminProtectedRoute.tsx
│   │   ├── AnalyticsDashboard.tsx
│   │   ├── AuditTrailViewer.tsx
│   │   ├── BookingApprovalInterface.tsx
│   │   ├── BookingCancellationModal.tsx
│   │   ├── BookingCardWithPayment.tsx
│   │   ├── EnhancedErrorDisplay.tsx
│   │   ├── ErrorHandlingDemo.tsx
│   │   ├── HospitalApprovalStatus.tsx
│   │   ├── HospitalAuthorityResourceManager.tsx
│   │   ├── HospitalPricingDashboard.tsx
│   │   ├── HospitalPricingManagement.tsx
│   │   ├── Navigation.tsx
│   │   ├── NavigationExample.tsx
│   │   ├── NotificationBell.tsx
│   │   ├── NotificationHistory.tsx
│   │   ├── NotificationPreferences.tsx
│   │   ├── PatientNotificationCenter.tsx
│   │   ├── PaymentFailurePage.tsx
│   │   ├── PaymentHistoryCard.tsx
│   │   ├── PaymentModal.tsx
│   │   ├── PaymentProcessingInterface.tsx
│   │   ├── PaymentReceiptModal.tsx
│   │   ├── PaymentSuccessPage.tsx
│   │   ├── PaymentWorkflow.tsx
│   │   ├── ProtectedRoute.tsx
│   │   ├── ResourceManagementDashboard.tsx
│   │   ├── ResourceManager.tsx
│   │   ├── RevenueAnalyticsDashboard.tsx
│   │   ├── SampleCollectionAgentAssignment.tsx
│   │   ├── SampleCollectionDashboard.tsx
│   │   ├── SampleCollectionForm.tsx
│   │   ├── SampleCollectionHistory.tsx
│   │   ├── SampleCollectionRequestCard.tsx
│   │   ├── SampleCollectionRequestDetails.tsx
│   │   ├── SampleCollectionScheduler.tsx
│   │   ├── SampleCollectionStatusTracker.tsx
│   │   ├── SampleCollectionTrackingView.tsx
│   │   ├── UserMenu.tsx
│   │   └── ...         # Additional components
│   ├── hooks/          # Custom React hooks
│   │   ├── __tests__/  # Hook tests
│   │   ├── useNotificationCount.ts
│   │   ├── usePolling.ts
│   │   ├── useRetry.ts
│   │   └── useSampleCollection.ts
│   └── lib/            # Utilities and configurations
│       ├── __tests__/  # Library tests
│       ├── bkash/      # bKash payment integration
│       │   ├── index.ts
│       │   └── README.md
│       ├── hooks/      # Custom hooks
│       │   ├── __tests__/
│       │   └── useNotificationCount.ts
│       ├── api.ts      # API client and endpoints
│       ├── auth.ts     # Authentication utilities
│       ├── bkash-theme.ts # bKash UI theming
│       ├── bookingTransformer.ts # Data transformation utilities
│       ├── currency-conversion.ts # Currency utilities
│       ├── currency.ts # Currency formatting
│       ├── errorHandler.ts # Error handling utilities
│       ├── errorHandling.ts # Enhanced error handling
│       ├── logger.ts   # Logging utilities
│       ├── navigationConfig.ts # Navigation configuration
│       ├── paymentValidator.ts # Payment validation
│       ├── pollingClient.ts # Real-time polling client
│       ├── receiptUtils.ts # Payment receipt utilities
│       ├── sampleCollectionUtils.ts # Sample collection utilities
│       ├── types.ts    # TypeScript type definitions
│       └── utils.ts    # General utilities
├── public/             # Static assets
├── .env.local          # Environment variables
├── .env.example        # Environment template
├── components.json     # shadcn/ui configuration
├── Dockerfile          # Docker configuration
├── jest.config.js      # Jest testing configuration
├── jest.setup.js       # Jest setup file
├── next.config.ts      # Next.js configuration
├── package.json
├── postcss.config.mjs  # PostCSS configuration
├── tailwind.config.js  # Tailwind CSS configuration
└── tsconfig.json       # TypeScript configuration
```

## 📚 Documentation Structure (`docs/`)

```
docs/
├── API.md              # API documentation
├── DEPLOYMENT.md       # Deployment guide
├── SECURITY.md         # Security guidelines
├── TESTING.md          # Testing procedures
├── TROUBLESHOOTING.md  # Troubleshooting guide
└── CHANGELOG.md        # Version history
```

## 🎯 Steering Documents (`steering/`)

```
steering/
├── product.md          # Product overview and vision
├── tech.md             # Technical architecture
├── structure.md        # Project structure (this document)
├── roadmap.md          # Development roadmap
└── governance.md       # Project governance
```

## 🔧 Development Scripts (`scripts/`)

```
scripts/
├── deploy.sh           # Deployment script
├── backup.sh           # Database backup script
├── restore.sh          # Database restore script
├── seed.sh             # Database seeding script
└── test.sh             # Test execution script
```

## 🌐 NGINX Configuration (`nginx/`)

```
nginx/
├── conf.d/
│   └── rapidcare.conf  # NGINX server configuration
└── nginx.conf          # Main NGINX configuration
```

## 🐳 Docker Configuration

### Root Docker Compose (`docker-compose.yml`)
```yaml
version: '3.8'
services:
  backend:
    build: ./back-end
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=development
    volumes:
      - ./back-end:/app
      - /app/node_modules
    depends_on:
      - database
  
  frontend:
    build: ./front-end
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:5000/api
    volumes:
      - ./front-end:/app
      - /app/node_modules
    depends_on:
      - backend
  
  database:
    image: sqlite:latest
    volumes:
      - ./back-end/database.sqlite:/data/database.sqlite
```

## 📦 Package Management

### Root `package.json`
```json
{
  "name": "rapidcare",
  "version": "2.0.0",
  "description": "Emergency Medical Resource Booking Platform",
  "scripts": {
    "dev": "concurrently \"npm run dev --prefix back-end\" \"npm run dev --prefix front-end\"",
    "build": "npm run build --prefix back-end && npm run build --prefix front-end",
    "test": "npm run test --prefix back-end && npm run test --prefix front-end",
    "lint": "npm run lint --prefix back-end && npm run lint --prefix front-end",
    "install:all": "npm install && npm install --prefix back-end && npm install --prefix front-end",
    "setup": "cp back-end/.env.example back-end/.env && cp front-end/.env.example front-end/.env.local"
  },
  "devDependencies": {
    "concurrently": "^7.6.0"
  }
}
```

## 🏗 Key Architectural Patterns

### Backend Patterns

1. **MVC Architecture**
   - **Models**: Database interaction and data structure
   - **Views**: JSON responses and data transformation
   - **Controllers**: Request handling and response formatting
   - **Services**: Business logic separation

2. **Middleware Chain**
   - Authentication middleware for secure endpoints
   - Error handling middleware for centralized error management
   - Validation middleware for input sanitization
   - Logging middleware for audit trails

3. **Service Layer Architecture**
   - Decoupled business logic from controllers
   - Reusable service functions
   - Testable business operations
   - Clear separation of concerns

4. **Route Organization**
   - Feature-based route grouping
   - Versioned API endpoints
   - Consistent URL structure
   - Role-based route protection

### Frontend Patterns

1. **App Router Architecture**
   - File-based routing system
   - Nested layouts for consistent UI
   - Dynamic routes for data-driven pages
   - Route groups for logical organization

2. **Component Composition**
   - Atomic design principles
   - Reusable UI components
   - Compound components for complex interactions
   - Context providers for global state

3. **State Management**
   - React hooks for component state
   - Context API for global state
   - Custom hooks for shared logic
   - Server-side rendering for initial data

4. **API Layer**
   - Centralized HTTP client
   - Type-safe API responses
   - Error handling abstraction
   - Request/response interceptors

### Database Schema Organization

1. **Normalized Structure**
   - Proper foreign key relationships
   - Index optimization for queries
   - Data type consistency
   - Referential integrity constraints

2. **Migration System**
   - Version-controlled schema changes
   - Rollback capabilities
   - Automated migration execution
   - Schema documentation

3. **Data Relationships**
   - One-to-many relationships
   - Many-to-many relationships
   - Self-referencing relationships
   - Cascade operations

### Authentication Flow

1. **JWT Token Management**
   - Secure token generation
   - Token refresh mechanisms
   - Role-based access control
   - Token expiration handling

2. **Session Management**
   - User session tracking
   - Activity-based timeout
   - Concurrent session handling
   - Session cleanup procedures

3. **Multi-tier Access Control**
   - User role permissions
   - Hospital authority restrictions
   - Administrative privileges
   - Financial operation security

### Payment Processing Flow

1. **Transaction Management**
   - Payment initiation
   - Transaction record creation
   - Fraud detection integration
   - Payment confirmation

2. **Financial Reconciliation**
   - Automated daily reconciliation
   - Discrepancy detection
   - Correction workflows
   - Audit trail maintenance

3. **Revenue Distribution**
   - Service charge calculation
   - Hospital payment allocation
   - Balance tracking
   - Withdrawal processing

### Real-time Update System

1. **Polling Client**
   - Configurable polling intervals
   - Error handling and retry logic
   - Connection state management
   - Performance optimization

2. **Server-side Polling Endpoints**
   - Efficient database queries
   - Caching strategies
   - Response optimization
   - Load balancing

3. **Notification Delivery**
   - WebSocket-like real-time updates
   - SMS notifications for critical alerts
   - Email notifications for non-urgent updates
   - In-app notification center

## 📁 File Naming Conventions

### Backend Conventions
- **Files**: camelCase (`hospitalService.js`)
- **Classes**: PascalCase (`HospitalService`)
- **Functions**: camelCase (`getHospitalById`)
- **Variables**: camelCase (`hospitalId`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_BOOKING_DURATION`)

### Frontend Conventions
- **Components**: PascalCase (`HospitalCard.tsx`)
- **Files**: camelCase (`useHospital.ts`)
- **Functions**: camelCase (`getHospitalData`)
- **Variables**: camelCase (`hospitalData`)
- **Constants**: UPPER_SNAKE_CASE (`API_ENDPOINTS`)

### Database Conventions
- **Tables**: snake_case (`hospital_resources`)
- **Columns**: snake_case (`hospital_id`)
- **Indexes**: prefixed with `idx_` (`idx_hospitals_approval_status`)
- **Foreign Keys**: suffixed with `_id` (`hospital_id`)

## 🧪 Testing Architecture

### Backend Testing
- **Unit Tests**: Individual function testing
- **Integration Tests**: API endpoint testing
- **Service Tests**: Business logic validation
- **Model Tests**: Database operation testing
- **Security Tests**: Authentication and authorization
- **Performance Tests**: Load and stress testing

### Frontend Testing
- **Component Tests**: UI component rendering
- **Hook Tests**: Custom hook functionality
- **Integration Tests**: User flow testing
- **Accessibility Tests**: WCAG compliance
- **Performance Tests**: Bundle size and load times

### Test Directory Structure
```
tests/
├── unit/              # Unit tests
│   ├── models/       # Model tests
│   ├── services/     # Service tests
│   └── utils/        # Utility tests
├── integration/       # Integration tests
│   ├── api/          # API endpoint tests
│   └── database/     # Database integration tests
├── e2e/              # End-to-end tests
│   ├── user-flows/   # User journey tests
│   └── admin-flows/  # Administrative tests
└── performance/      # Performance tests
    ├── load/         # Load testing
    └── stress/       # Stress testing
```

## 🚀 Deployment Structure

### Docker Configuration
- **Multi-stage builds** for optimized images
- **Environment-specific configurations**
- **Volume mounting** for data persistence
- **Network isolation** for security

### Environment Management
- **Development**: Local development settings
- **Staging**: Pre-production testing environment
- **Production**: Live deployment configuration
- **Testing**: Automated testing environment

### CI/CD Pipeline
- **GitHub Actions** for automated workflows
- **Testing automation** for quality assurance
- **Security scanning** for vulnerability detection
- **Deployment automation** for consistent releases

## 🛡 Security Structure

### Access Control
- **Role-based permissions** for user access
- **Resource-based permissions** for data access
- **Operation-based permissions** for actions
- **Time-based permissions** for temporal access

### Data Protection
- **Encryption at rest** for sensitive data
- **Encryption in transit** for communications
- **Data masking** for PII protection
- **Audit logging** for compliance

### Network Security
- **Firewall configuration** for access control
- **Rate limiting** for abuse prevention
- **DDoS protection** for availability
- **Intrusion detection** for threat monitoring

## 📊 Monitoring and Logging

### Application Monitoring
- **Performance metrics** for response times
- **Error tracking** for bug detection
- **User behavior** for analytics
- **System health** for uptime monitoring

### Log Management
- **Structured logging** for data analysis
- **Log rotation** for disk space management
- **Log aggregation** for centralized viewing
- **Log retention** for compliance requirements

## 🏗 Development Workflow

### Monorepo Structure
- **Shared dependencies** for consistency
- **Cross-package linking** for development
- **Unified build processes** for efficiency
- **Centralized configuration** for maintainability

### Git Workflow
- **Feature branches** for development isolation
- **Pull requests** for code review
- **Automated testing** for quality assurance
- **Continuous integration** for immediate feedback

### Code Quality
- **Linting rules** for code consistency
- **Formatting standards** for readability
- **Type checking** for error prevention
- **Security scanning** for vulnerability detection

---

This project structure document provides a comprehensive overview of the RapidCare codebase organization, architectural patterns, and development conventions. The structure is designed to promote maintainability, scalability, and collaboration while supporting the critical needs of emergency medical resource booking.