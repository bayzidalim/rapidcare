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

## Key Architectural Patterns

### Backend Patterns
- **MVC Architecture**: Controllers handle requests, Services contain business logic, Models define data structure
- **Middleware Chain**: Authentication, CORS, JSON parsing, error handling
- **Service Layer**: Separation of business logic from controllers
- **Route Organization**: Feature-based route grouping (`/api/auth`, `/api/hospitals`, etc.)

### Frontend Patterns
- **App Router**: Next.js 14 file-based routing with layouts
- **Component Composition**: Reusable UI components with shadcn/ui
- **Custom Hooks**: Authentication and API state management
- **Type Safety**: Comprehensive TypeScript definitions in `lib/types.ts`
- **API Layer**: Centralized API client with interceptors

### Database Schema
- **Users**: Authentication and role management with balance tracking
- **Hospitals**: Hospital information, resources, and pricing configuration
- **Bookings**: Medical resource reservations with status history
- **Blood Requests**: Blood donation management and matching
- **Financial Tables**: Transactions, balance tracking, and reconciliation
- **Audit Tables**: Complete activity logging and audit trails
- **Notification Tables**: Real-time notification management
- **Payment Tables**: Payment processing and configuration
- **Relationships**: Foreign keys with cascade operations and referential integrity

### Authentication Flow
1. JWT tokens stored in localStorage with secure handling
2. Axios interceptors add tokens to requests with retry logic
3. Backend middleware validates tokens with role verification
4. Multi-tier role-based access control (user/hospital-authority/admin)
5. Automatic redirect on token expiration with session recovery
6. Financial operations require additional authentication layer
7. Audit trail logging for all authentication events

### Payment Processing Flow
1. User initiates payment through booking interface
2. Payment modal with bKash-themed UI components
3. Secure payment data collection and validation
4. bKash gateway integration for payment processing
5. Real-time payment status updates via polling
6. Automated reconciliation and balance updates
7. Payment receipt generation and audit logging
8. Error handling with retry mechanisms and user feedback

### Real-time Update System
1. Frontend polling client with configurable intervals
2. Backend polling endpoints with optimized queries
3. Resource availability updates every 3-5 seconds
4. Notification delivery with real-time status updates
5. Booking status changes with immediate UI updates
6. Payment status tracking with live feedback
7. Error handling and connection recovery mechanisms

### File Naming Conventions
- **Backend**: camelCase for files, PascalCase for models
- **Frontend**: PascalCase for components, camelCase for utilities
- **Routes**: kebab-case for URLs, camelCase for file names
- **Database**: snake_case for table/column names
###
 Testing Architecture
- **Backend Testing**: Comprehensive test suite with Mocha, Chai, and Sinon
  - Unit tests for models, services, and utilities
  - Integration tests for API endpoints
  - End-to-end tests for complete workflows
  - Performance tests for high-load scenarios
  - Security tests for authentication and authorization
  - bKash integration tests for payment processing
- **Frontend Testing**: Jest and React Testing Library
  - Component unit tests with mocking
  - Integration tests for user workflows
  - Accessibility testing compliance
  - Visual regression testing for UI components

### Deployment Structure
- **Docker Configuration**: Multi-stage builds for both frontend and backend
- **Environment Management**: Separate configurations for development, staging, and production
- **CI/CD Pipeline**: GitHub Actions for automated testing and deployment
- **Database Migrations**: Automated migration system with rollback capabilities
- **Monitoring**: Application logging, error tracking, and performance monitoring
- **Security**: Environment variable management and secure deployment practices

### Development Workflow
- **Monorepo Structure**: Unified development with shared scripts and configurations
- **Hot Reloading**: Development servers with live reload for both frontend and backend
- **Code Quality**: ESLint, TypeScript strict mode, and automated formatting
- **Git Workflow**: Feature branches with pull request reviews and automated testing
- **Documentation**: Comprehensive README files and inline code documentation