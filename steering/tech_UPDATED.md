# ⚙️ RapidCare Technical Architecture

## 🏗 System Overview

RapidCare is built on a modern, scalable architecture designed to handle the critical demands of emergency medical resource booking. The system follows a client-server model with a React-based frontend and Node.js backend, optimized for performance, security, and reliability in life-critical situations.

## 🏢 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                            CLIENT LAYER                             │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────┐ │
│  │   Web Browser   │  │   Mobile App    │  │   Admin Dashboard   │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────────┘ │
└─────────────────────────────────┬───────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         API GATEWAY LAYER                           │
├─────────────────────────────────────────────────────────────────────┤
│                    Load Balancer / CDN / Security                   │
└─────────────────────────────────┬───────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                           SERVICE LAYER                             │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────┐ │
│  │   Frontend      │  │   Backend API   │  │   Notification      │ │
│  │   (Next.js)     │  │   (Express.js)  │  │   Service           │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────────┘ │
└─────────────────────────────────┬───────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                          DATA LAYER                                 │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────┐ │
│  │   Database      │  │   Cache         │  │   File Storage      │ │
│  │   (SQLite)      │  │   (Redis)       │  │   (Cloud Storage)   │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

## 🧱 Backend Architecture (Node.js + Express.js)

### Core Components

#### 1. Application Layer
- **Express.js Framework**: RESTful API server with middleware support
- **Routing System**: Feature-based route organization
- **Middleware Chain**: Authentication, validation, error handling
- **Configuration Management**: Environment-based configuration

#### 2. Business Logic Layer
- **Service Layer**: Encapsulated business logic for each domain
- **Validation Services**: Input validation and sanitization
- **Payment Processing**: bKash integration with fraud detection
- **Notification System**: Real-time alerts and updates
- **Audit Trail**: Comprehensive activity logging

#### 3. Data Access Layer
- **Database Models**: ORM-like abstraction for database operations
- **Query Builder**: Optimized database queries
- **Migration System**: Schema versioning and updates
- **Transaction Management**: ACID compliance for critical operations

#### 4. External Integrations
- **Payment Gateway**: bKash API integration
- **SMS Service**: Emergency notifications
- **Email Service**: Transactional emails
- **Analytics**: Usage tracking and reporting

### Backend Technology Stack

- **Runtime**: Node.js 18+ with Express.js framework
- **Database**: SQLite with better-sqlite3 driver (scalable to PostgreSQL/MySQL)
- **Authentication**: JWT (JSON Web Tokens) with role-based access control
- **Password Security**: bcryptjs for secure password hashing
- **Environment Management**: dotenv for configuration
- **Development Tools**: nodemon for hot reloading
- **Testing Framework**: Mocha, Chai, Sinon, Supertest
- **Background Jobs**: node-cron for scheduled tasks
- **Payment Integration**: bKash payment gateway
- **Real-time Features**: Custom polling system for live updates
- **Error Handling**: Centralized error management
- **Logging**: Structured logging with Winston
- **Security**: Helmet.js, CORS configuration, rate limiting

### Backend Directory Structure

```
back-end/
├── config/                    # Application configuration
│   ├── config.js             # General app configuration
│   └── database.js           # Database setup and schema
├── controllers/              # Request handlers
│   ├── adminController.js    # Admin endpoints
│   ├── authController.js     # Authentication endpoints
│   ├── bloodController.js    # Blood donation endpoints
│   ├── bookingController.js  # Booking management endpoints
│   ├── hospitalController.js # Hospital management endpoints
│   └── ...                   # Other controllers
├── middleware/               # Middleware functions
│   ├── auth.js               # JWT authentication
│   ├── financialAuth.js      # Financial operations auth
│   └── errorHandler.js       # Global error handling
├── models/                   # Database models
│   ├── Booking.js            # Booking data model
│   ├── Hospital.js           # Hospital data model
│   ├── User.js               # User data model
│   └── ...                   # Other models
├── routes/                   # API route definitions
│   ├── admin.js              # Admin-only endpoints
│   ├── auth.js               # Authentication endpoints
│   ├── blood.js              # Blood donation endpoints
│   ├── bookings.js           # Booking endpoints
│   ├── hospitals.js          # Hospital endpoints
│   └── ...                   # Other route files
├── services/                 # Business logic layer
│   ├── bookingService.js     # Booking business logic
│   ├── hospitalService.js    # Hospital business logic
│   ├── paymentService.js     # Payment processing
│   ├── notificationService.js # Notification system
│   └── ...                   # Other services
├── utils/                    # Utility functions
│   ├── currencyUtils.js      # Currency handling
│   ├── securityUtils.js      # Security utilities
│   └── ...                   # Other utilities
├── migrations/               # Database migrations
├── jobs/                     # Background jobs
├── tests/                    # Test suite
└── index.js                  # Server entry point
```

## 🎨 Frontend Architecture (Next.js 15)

### Core Components

#### 1. Presentation Layer
- **Next.js App Router**: File-based routing system
- **React Components**: Reusable UI components with TypeScript
- **State Management**: React hooks and context API
- **Styling**: Tailwind CSS with utility-first approach

#### 2. Business Logic Layer
- **API Client**: Centralized HTTP client with interceptors
- **Authentication**: JWT token management
- **Data Fetching**: Server-side rendering and client-side fetching
- **Form Handling**: React Hook Form with Zod validation

#### 3. Data Management
- **State Management**: React hooks for component state
- **Context API**: Global state management
- **Caching**: Client-side caching for performance
- **Real-time Updates**: Polling client for live data

### Frontend Technology Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript for type safety
- **Styling**: Tailwind CSS v4 with utility-first approach
- **UI Components**: shadcn/ui component library + custom bKash components
- **Forms**: React Hook Form with Zod validation
- **HTTP Client**: Axios with interceptors
- **Icons**: Lucide React icon library
- **Testing**: Jest, React Testing Library
- **Charts**: Recharts for analytics dashboards
- **Real-time Updates**: Custom polling client
- **Payment UI**: Custom bKash-themed components
- **Error Handling**: Comprehensive error boundary system
- **Performance**: Code splitting, lazy loading, image optimization

### Frontend Directory Structure

```
front-end/
├── src/
│   ├── app/                  # Next.js App Router pages
│   │   ├── admin/            # Admin dashboard
│   │   ├── booking/          # Booking management
│   │   ├── dashboard/        # User dashboard
│   │   ├── hospitals/        # Hospital listings
│   │   ├── login/            # Authentication
│   │   └── ...               # Other pages
│   ├── components/           # Reusable React components
│   │   ├── ui/               # shadcn/ui components
│   │   ├── BookingForm.tsx   # Booking form component
│   │   ├── HospitalCard.tsx  # Hospital display component
│   │   └── ...               # Other components
│   ├── hooks/                # Custom React hooks
│   │   └── usePolling.ts     # Real-time polling hook
│   ├── lib/                  # Utilities and configurations
│   │   ├── api.ts            # API client
│   │   ├── auth.ts           # Authentication utilities
│   │   ├── types.ts          # TypeScript definitions
│   │   └── ...               # Other utilities
│   └── public/               # Static assets
├── tailwind.config.js        # Tailwind CSS configuration
├── next.config.ts            # Next.js configuration
└── tsconfig.json             # TypeScript configuration
```

## 🗄 Database Architecture

### Database Design Principles

1. **Normalization**: Properly normalized schema to reduce redundancy
2. **Indexing**: Strategic indexes for performance optimization
3. **Referential Integrity**: Foreign key constraints with cascade operations
4. **Data Types**: Appropriate data types for medical and financial data
5. **Security**: Encrypted storage for sensitive information

### Core Tables

#### Users Table
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  userType TEXT NOT NULL CHECK(userType IN ('user', 'hospital-authority', 'admin')),
  hospital_id INTEGER,
  can_add_hospital BOOLEAN DEFAULT 1,
  isActive BOOLEAN DEFAULT 1,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (hospital_id) REFERENCES hospitals (id)
);
```

#### Hospitals Table
```sql
CREATE TABLE hospitals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT DEFAULT 'General',
  street TEXT,
  city TEXT,
  state TEXT,
  zipCode TEXT,
  country TEXT,
  phone TEXT,
  email TEXT,
  emergency TEXT,
  total_beds INTEGER DEFAULT 0,
  icu_beds INTEGER DEFAULT 0,
  operation_theaters INTEGER DEFAULT 0,
  approval_status TEXT DEFAULT 'pending' CHECK(approval_status IN ('pending', 'approved', 'rejected')),
  approved_by INTEGER,
  approved_at DATETIME,
  rejection_reason TEXT,
  submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  rating REAL DEFAULT 0,
  isActive BOOLEAN DEFAULT 1,
  lastUpdated DATETIME DEFAULT CURRENT_TIMESTAMP,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (approved_by) REFERENCES users (id)
);
```

#### Bookings Table
```sql
CREATE TABLE bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER NOT NULL,
  hospitalId INTEGER,
  resourceType TEXT NOT NULL,
  patientName TEXT NOT NULL,
  patientAge INTEGER NOT NULL,
  patientGender TEXT NOT NULL,
  emergencyContactName TEXT,
  emergencyContactPhone TEXT,
  emergencyContactRelationship TEXT,
  medicalCondition TEXT NOT NULL,
  urgency TEXT DEFAULT 'medium',
  surgeonId INTEGER,
  scheduledDate DATETIME NOT NULL,
  estimatedDuration INTEGER DEFAULT 24,
  status TEXT DEFAULT 'pending',
  paymentAmount REAL NOT NULL,
  paymentStatus TEXT DEFAULT 'pending',
  paymentMethod TEXT,
  transactionId TEXT,
  notes TEXT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users (id),
  FOREIGN KEY (hospitalId) REFERENCES hospitals (id),
  FOREIGN KEY (surgeonId) REFERENCES surgeons (id)
);
```

#### Financial Tables
```sql
CREATE TABLE transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bookingId INTEGER NOT NULL,
  userId INTEGER NOT NULL,
  hospitalId INTEGER NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  serviceCharge DECIMAL(10,2) NOT NULL,
  hospitalAmount DECIMAL(10,2) NOT NULL,
  paymentMethod TEXT NOT NULL,
  transactionId TEXT UNIQUE,
  status TEXT NOT NULL CHECK(status IN ('pending', 'completed', 'failed', 'refunded')),
  paymentData TEXT,
  processedAt DATETIME,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (bookingId) REFERENCES bookings (id),
  FOREIGN KEY (userId) REFERENCES users (id),
  FOREIGN KEY (hospitalId) REFERENCES hospitals (id)
);
```

### Database Relationships

```
Users 1─────┬─────────────────────────────────────────────────────────────┐
            │                                                             │
            ▼                                                             ▼
     Hospital Authorities 1──────────────┬────────────────────┬─────────────┬──────────────┐
                                        ▼                    ▼             ▼              ▼
                                   Hospitals 1───────────┬────┬───────┬────────┬────────┬────────┬─────────┐
                                                         ▼    ▼       ▼        ▼        ▼        ▼         ▼
                                                    Resources Services Surgeons Bookings Payments Audits  Pricing
                                                         ▲    ▲       ▲        ▲        ▲        ▲         ▲
                                                         │    │       │        │        │        │         │
                                                         └────┴───────┴────────┴────────┴────────┴─────────┘
                                                                           ▲
                                                                           │
                                                                           ▼
                                                                      Transactions
```

## 🔐 Security Architecture

### Authentication Flow

1. **User Registration**
   - Password hashing with bcrypt
   - Email verification (optional)
   - Role assignment
   - JWT token generation

2. **User Login**
   - Credential validation
   - JWT token issuance
   - Session management
   - Rate limiting

3. **Token Management**
   - JWT with 24-hour expiration
   - Secure HTTP-only cookies
   - Token refresh mechanisms
   - Automatic logout on inactivity

### Authorization System

- **Role-Based Access Control (RBAC)**
  - User roles: `user`, `hospital-authority`, `admin`
  - Permission-based access to endpoints
  - Fine-grained access control for sensitive operations
  - Hierarchical permission system

- **Financial Operations Security**
  - Additional authentication for payment processing
  - Fraud detection for suspicious transactions
  - Audit trails for all financial activities
  - Secure handling of payment data

### Data Protection

- **Encryption**
  - Passwords: bcrypt hashing
  - Sensitive data: AES-256 encryption
  - Data in transit: TLS 1.3
  - Database encryption: File-level encryption

- **Privacy Compliance**
  - GDPR compliance measures
  - Data minimization principles
  - User data portability
  - Right to deletion implementation

### Security Monitoring

- **Threat Detection**
  - Rate limiting for API endpoints
  - Brute force attack prevention
  - Suspicious activity monitoring
  - Automated security scanning

- **Incident Response**
  - Security event logging
  - Automated alerting systems
  - Incident response procedures
  - Regular security audits

## 💰 Payment Architecture

### Payment Flow

1. **Booking Creation**
   - Resource availability check
   - Price calculation with 30% service charge
   - Booking record creation

2. **Payment Processing**
   - bKash payment initiation
   - Transaction record creation
   - Fraud detection analysis
   - Payment confirmation

3. **Financial Distribution**
   - Service charge calculation
   - Hospital payment allocation
   - Transaction completion
   - Audit trail creation

### Payment Security

- **Data Handling**
  - No storage of sensitive payment information
  - Tokenization for payment processing
  - PCI DSS compliance measures
  - Secure API communication

- **Fraud Prevention**
  - Transaction pattern analysis
  - Risk scoring algorithms
  - Suspicious activity detection
  - Automated blocking mechanisms

### Reconciliation System

- **Automated Reconciliation**
  - Daily financial reconciliation
  - Discrepancy detection
  - Correction workflows
  - Audit trail maintenance

- **Reporting**
  - Financial transaction reports
  - Revenue distribution reports
  - Service charge tracking
  - Hospital payment history

## 📡 Real-time Architecture

### Polling System

- **Client-Side Polling**
  - Configurable polling intervals (3-5 seconds)
  - Smart polling based on user activity
  - Error handling and retry mechanisms
  - Connection state management

- **Server-Side Optimization**
  - Efficient database queries
  - Caching for frequently accessed data
  - Load balancing for high-traffic periods
  - Response optimization

### Notification System

- **Real-time Updates**
  - Booking status changes
  - Payment confirmations
  - Hospital approval notifications
  - Emergency alerts

- **Delivery Mechanisms**
  - WebSocket-like polling
  - SMS notifications for critical updates
  - Email notifications for non-urgent updates
  - In-app notification center

## 📊 Monitoring and Analytics

### Application Monitoring

- **Performance Metrics**
  - API response times
  - Database query performance
  - Frontend load times
  - User interaction metrics

- **Error Tracking**
  - Centralized error logging
  - Error categorization and prioritization
  - Automated alerting for critical errors
  - Error resolution tracking

### Business Analytics

- **Usage Analytics**
  - User engagement metrics
  - Booking conversion rates
  - Resource utilization statistics
  - Geographic distribution data

- **Financial Analytics**
  - Revenue tracking
  - Payment success rates
  - Service charge analysis
  - Hospital performance metrics

### Health Monitoring

- **System Health**
  - Server uptime monitoring
  - Database health checks
  - API endpoint availability
  - Third-party service status

- **Emergency Response Metrics**
  - Response time tracking
  - Critical booking completion rates
  - System availability during peak hours
  - User satisfaction scores

## 🚀 Deployment Architecture

### Containerization

- **Docker Implementation**
  - Multi-stage Docker builds
  - Environment-specific configurations
  - Container orchestration with Docker Compose
  - Image optimization for production

- **Kubernetes Support**
  - Deployment manifests
  - Service discovery
  - Auto-scaling configurations
  - Health check implementations

### Cloud Deployment

- **Multi-Cloud Strategy**
  - AWS deployment options
  - Google Cloud Platform support
  - Microsoft Azure compatibility
  - Hybrid deployment capabilities

- **Serverless Options**
  - AWS Lambda for backend functions
  - Vercel for frontend deployment
  - Firebase for real-time features
  - Cloud Functions for background jobs

### CI/CD Pipeline

- **Automated Testing**
  - Unit test execution
  - Integration testing
  - End-to-end testing
  - Security scanning

- **Deployment Automation**
  - Environment promotion
  - Rollback capabilities
  - Blue-green deployment
  - Canary release strategy

### Backup and Recovery

- **Data Protection**
  - Automated database backups
  - Cross-region replication
  - Point-in-time recovery
  - Backup verification processes

- **Disaster Recovery**
  - Recovery time objectives (RTO)
  - Recovery point objectives (RPO)
  - Failover procedures
  - Business continuity planning

## 🧪 Testing Architecture

### Test Strategy

- **Unit Testing**
  - Component-level testing
  - Service function testing
  - Utility function validation
  - Model validation testing

- **Integration Testing**
  - API endpoint testing
  - Database integration testing
  - Third-party service integration
  - Authentication flow testing

- **End-to-End Testing**
  - User journey testing
  - Booking flow validation
  - Payment process testing
  - Admin functionality testing

### Tools and Frameworks

- **Backend Testing**
  - Mocha for test framework
  - Chai for assertions
  - Sinon for mocking
  - Supertest for API testing
  - Jest for unit testing

- **Frontend Testing**
  - Jest for unit testing
  - React Testing Library for component testing
  - Cypress for end-to-end testing
  - Storybook for component development
  - Accessibility testing tools

### Test Coverage

- **Code Coverage Goals**
  - Unit tests: 80%+ coverage
  - Integration tests: 70%+ coverage
  - End-to-end tests: 60%+ coverage
  - Critical path: 95%+ coverage

- **Performance Testing**
  - Load testing with Artillery
  - Stress testing for peak usage
  - Response time monitoring
  - Database performance testing

## 📈 Performance Optimization

### Frontend Performance

- **Bundle Optimization**
  - Code splitting for lazy loading
  - Tree shaking for unused code
  - Image optimization and compression
  - Minification and compression

- **Caching Strategy**
  - Browser caching for static assets
  - Service worker implementation
  - CDN integration
  - API response caching

### Backend Performance

- **Database Optimization**
  - Query optimization
  - Indexing strategies
  - Connection pooling
  - Read replicas for scaling

- **API Optimization**
  - Response compression
  - Pagination for large datasets
  - Caching for frequently accessed data
  - Efficient data serialization

### Scaling Considerations

- **Horizontal Scaling**
  - Load balancer configuration
  - Microservices architecture
  - Database sharding strategies
  - CDN implementation

- **Vertical Scaling**
  - Server resource allocation
  - Database optimization
  - Memory management
  - CPU optimization

## 🔧 Development Tools

### Development Environment

- **IDE Support**
  - VS Code extensions
  - IntelliJ IDEA plugins
  - Debugging configurations
  - Code formatting tools

- **Development Workflow**
  - Git branching strategy
  - Pull request templates
  - Code review processes
  - Continuous integration setup

### Build Tools

- **Frontend Build**
  - Next.js build optimization
  - TypeScript compilation
  - Asset optimization
  - Bundle analysis

- **Backend Build**
  - Node.js packaging
  - Dependency management
  - Environment configuration
  - Deployment packaging

### Package Management

- **Dependency Management**
  - npm for package management
  - Security audit tools
  - Dependency update strategies
  - Version pinning

- **Monorepo Management**
  - Concurrently for running multiple services
  - Shared configuration management
  - Cross-package dependencies
  - Workspace management

## 🌐 API Architecture

### RESTful Design Principles

- **Resource-Based URLs**
  - Nouns for resources
  - Plural naming conventions
  - Hierarchical relationships
  - Consistent endpoint structure

- **HTTP Methods**
  - GET for retrieving resources
  - POST for creating resources
  - PUT for updating resources
  - DELETE for removing resources
  - PATCH for partial updates

### API Versioning

- **Versioning Strategy**
  - URL versioning (`/api/v1/`)
  - Header-based versioning
  - Backward compatibility
  - Deprecation policies

- **Documentation**
  - OpenAPI/Swagger documentation
  - Interactive API explorer
  - Code examples
  - Error code documentation

### Rate Limiting

- **Throttling Implementation**
  - Per-endpoint rate limits
  - User-based rate limiting
  - IP-based rate limiting
  - Burst rate allowances

- **Quota Management**
  - Daily usage quotas
  - Monthly usage limits
  - Premium tier benefits
  - Usage monitoring

## 📊 Data Architecture

### Data Flow

- **Request Processing**
  - Input validation
  - Business logic execution
  - Database operations
  - Response formatting

- **Event Processing**
  - Asynchronous job processing
  - Event-driven architecture
  - Message queue integration
  - Real-time updates

### Data Consistency

- **Transaction Management**
  - ACID compliance
  - Database transactions
  - Rollback mechanisms
  - Consistency checks

- **Data Validation**
  - Input sanitization
  - Business rule validation
  - Cross-field validation
  - Data integrity checks

### Backup Strategy

- **Automated Backups**
  - Daily database backups
  - Incremental backup strategy
  - Offsite backup storage
  - Backup retention policies

- **Disaster Recovery**
  - Recovery point objectives
  - Recovery time objectives
  - Failover procedures
  - Data restoration testing

## 🛡 Compliance and Regulations

### Medical Data Compliance

- **HIPAA Compliance**
  - Protected health information handling
  - Access control measures
  - Audit logging requirements
  - Data transmission security

- **GDPR Compliance**
  - User consent management
  - Data portability features
  - Right to deletion implementation
  - Privacy policy compliance

### Financial Regulations

- **PCI DSS Compliance**
  - Payment card data protection
  - Network security requirements
  - Vulnerability management
  - Regular security testing

- **Financial Reporting**
  - Audit trail maintenance
  - Transaction logging
  - Financial reconciliation
  - Regulatory reporting

## 🚀 Future Architecture Improvements

### Microservices Migration

- **Service Decomposition**
  - Booking service separation
  - Payment service isolation
  - Notification service independence
  - User management service

- **Communication Patterns**
  - REST APIs for service communication
  - Message queues for async processing
  - Event streaming for real-time updates
  - Service mesh for traffic management

### Advanced Features

- **Machine Learning Integration**
  - Predictive resource allocation
  - Intelligent matching algorithms
  - Anomaly detection for fraud
  - User behavior analysis

- **IoT Integration**
  - Smart hospital equipment connectivity
  - Real-time patient monitoring
  - Automated resource updates
  - Emergency response systems

### Cloud-Native Architecture

- **Container Orchestration**
  - Kubernetes deployment
  - Auto-scaling policies
  - Service discovery
  - Load balancing

- **Serverless Components**
  - Function-as-a-Service for background jobs
  - Event-driven processing
  - Cost optimization
  - Scalability improvements

## 📚 Technical Debt Management

### Code Quality

- **Code Review Process**
  - Automated code quality checks
  - Security scanning integration
  - Performance benchmarking
  - Documentation requirements

- **Refactoring Strategy**
  - Technical debt tracking
  - Refactoring prioritization
  - Backward compatibility
  - Testing during refactoring

### Architecture Evolution

- **Continuous Improvement**
  - Regular architecture reviews
  - Performance optimization cycles
  - Security assessment updates
  - Scalability planning

- **Technology Updates**
  - Framework version upgrades
  - Dependency security updates
  - Performance enhancement adoption
  - Best practice implementation

## 📞 Support and Maintenance

### Monitoring and Alerting

- **System Monitoring**
  - Infrastructure health checks
  - Application performance monitoring
  - Database performance tracking
  - API response time monitoring

- **Alerting System**
  - Critical issue notifications
  - Performance degradation alerts
  - Security incident notifications
  - Automated incident response

### Maintenance Windows

- **Scheduled Maintenance**
  - Database maintenance windows
  - System updates and patches
  - Backup verification processes
  - Performance optimization tasks

- **Emergency Maintenance**
  - Critical security patches
  - Urgent bug fixes
  - Infrastructure repairs
  - Disaster recovery procedures

---

This technical architecture document provides a comprehensive overview of the RapidCare system's design, implementation, and operational considerations. The architecture is designed to be scalable, secure, and reliable to meet the critical needs of emergency medical resource booking.

# Technology Stack

## Backend
- **Runtime**: Node.js with Express.js framework
- **Database**: SQLite with better-sqlite3 driver
- **Authentication**: JWT (JSON Web Tokens) with role-based access control
- **Password Hashing**: bcryptjs for secure password storage
- **Environment**: dotenv for configuration management
- **Development**: nodemon for hot reloading during development
- **Testing**: Mocha, Chai, Sinon, Supertest for comprehensive testing
- **Background Jobs**: node-cron for scheduled tasks and reconciliation
- **Payment Integration**: bKash payment gateway with secure processing
- **Real-time Features**: Custom polling-based updates for live data
- **Error Handling**: Centralized error management with detailed logging
- **Validation**: Zod schema validation for data integrity
- **Security**: Comprehensive security measures including CORS, rate limiting, and input sanitization

## Frontend
- **Framework**: Next.js 15 with App Router for modern React development
- **Language**: TypeScript for end-to-end type safety
- **Styling**: Tailwind CSS v4 with utility-first approach
- **UI Components**: shadcn/ui component library + custom bKash-themed components
- **Forms**: React Hook Form with Zod validation for robust form handling
- **HTTP Client**: Axios with interceptors for API communication
- **Icons**: Lucide React for consistent iconography
- **Testing**: Jest, React Testing Library for component and integration testing
- **Charts**: Recharts for analytics dashboards and data visualization
- **Real-time Updates**: Custom polling client for live resource availability
- **Payment UI**: Custom bKash-themed payment components for seamless integration
- **State Management**: React Context API for application state
- **Accessibility**: WCAG 2.1 AA compliance for inclusive design

## Development Tools
- **Linting**: ESLint with Next.js configuration for code quality
- **Package Manager**: npm for dependency management
- **Build Tool**: Next.js built-in bundler with optimizations
- **CSS Processing**: PostCSS with Autoprefixer for cross-browser compatibility
- **Containerization**: Docker with multi-stage builds for consistent environments
- **Deployment**: Vercel for frontend, flexible backend deployment options
- **Monorepo Management**: Concurrently for running multiple services
- **Database Migrations**: Custom migration system for schema evolution
- **CI/CD**: GitHub Actions workflows for automated testing and deployment
- **Code Formatting**: Prettier for consistent code style
- **Version Control**: Git with conventional commit messages

## Common Commands

### Root Level Commands
```bash
npm run dev          # Start both backend and frontend in development
npm run build        # Build both backend and frontend
npm run start        # Start both services in production
npm run test         # Run all tests
npm run install:all  # Install dependencies for all packages
npm run setup        # Initial project setup with environment files
npm run seed         # Seed database with sample data
npm run lint         # Lint all code
```

### Backend Development
```bash
cd back-end
npm install          # Install dependencies
npm run dev          # Start development server (port 5000)
npm run seed         # Seed database with sample data
npm run seed:financial # Seed financial test data
npm run migrate      # Run database migrations
npm run test         # Run all tests
npm run test:bkash   # Run bKash integration tests
npm run test:financial # Run comprehensive financial tests
npm run test:coverage # Run tests with coverage report
npm run lint         # Run ESLint
npm start            # Production server
```

### Frontend Development
```bash
cd front-end
npm install          # Install dependencies
npm run dev          # Start development server (port 3000)
npm run build        # Build for production
npm run test         # Run Jest tests
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Run tests with coverage report
npm run lint         # Run ESLint
npm start            # Production server
```

### Database Management
- Database file: `back-end/database.sqlite`
- Migrations: Located in `back-end/migrations/`
- Seeding: Run `npm run seed` in backend directory
- Financial Seeding: Run `npm run seed:financial` for payment test data

## Environment Variables

### Backend (.env)
```
PORT=5000
JWT_SECRET=your-jwt-secret
NODE_ENV=development
```

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

## API Architecture
- **RESTful API Design**: Consistent endpoint structure and HTTP methods
- **JWT-based Authentication**: Secure token management with middleware
- **Role-based Access Control**: User, hospital-authority, and admin permissions
- **Centralized Error Handling**: Unified error response format
- **Request/Response Interceptors**: Token management and response processing
- **Real-time Polling System**: Custom client for live updates
- **Financial Reconciliation**: Automated payment and audit trail management
- **Payment Processing**: Secure bKash integration with validation
- **Notification System**: Real-time delivery with status tracking
- **Comprehensive Logging**: Detailed audit trails and system monitoring
- **Background Job Scheduling**: Automated tasks with node-cron
- **Rate Limiting**: Protection against API abuse
- **Input Validation**: Zod schema validation for all endpoints
- **Security Middleware**: CORS, helmet, and other security measures

## Payment Integration
- **bKash Gateway**: Integrated mobile financial services payment processing
- **Currency Support**: BDT (Bangladeshi Taka) with proper formatting
- **Payment Methods**: Mobile financial services integration
- **Security**: Encrypted payment data handling with PCI compliance
- **Reconciliation**: Automated financial reconciliation processes
- **Audit Trail**: Complete payment history tracking with detailed logs
- **Error Handling**: Robust error management for payment failures
- **Callback Processing**: Secure handling of payment gateway responses
- **Transaction Verification**: Double-checking payment status for accuracy

## Real-time Features
- **Polling System**: Custom polling client for live resource updates
- **Notification System**: Real-time alert delivery with multiple channels
- **Resource Updates**: Live hospital resource availability tracking
- **Booking Status**: Instant booking status changes with user notifications
- **Payment Status**: Live payment processing updates
- **Collection Requests**: Real-time tracking of home sample collection
- **Agent Assignment**: Instant notification of collection agent assignments
- **Connection Recovery**: Automatic reconnection for interrupted polling
- **Optimized Intervals**: Configurable polling frequencies based on data criticality

## Database Schema
- **Users**: Authentication, role management, and profile information
- **Hospitals**: Hospital information, resources, and pricing configuration
- **Bookings**: Medical resource reservations with status history
- **Blood Requests**: Blood donation management and matching system
- **Financial Tables**: Transactions, balance tracking, and reconciliation
- **Audit Tables**: Complete activity logging and audit trails
- **Notification Tables**: Real-time notification management system
- **Payment Tables**: Payment processing and configuration data
- **Sample Collection**: Home collection requests and agent management
- **Test Types**: Available medical tests for sample collection
- **Collection Agents**: Professional agents for home sample collection
- **Pricing Tables**: Service pricing and configuration
- **Relationships**: Foreign keys with cascade operations and referential integrity

## Authentication Flow
1. **JWT Token Generation**: Secure token creation with expiration
2. **Axios Interceptors**: Automatic token addition to API requests
3. **Middleware Validation**: Backend token verification with role checking
4. **Multi-tier Access Control**: User, hospital-authority, and admin permissions
5. **Session Management**: Automatic redirect on token expiration
6. **Financial Authentication**: Additional security layer for payment operations
7. **Audit Trail Logging**: Comprehensive logging of all authentication events
8. **Rate Limiting**: Protection against authentication abuse
9. **Password Security**: bcryptjs hashing for secure password storage

## Payment Processing Flow
1. **User Initiation**: Payment request through booking or collection interface
2. **Payment Modal**: bKash-themed UI components for payment collection
3. **Secure Data Handling**: Validation and encryption of payment information
4. **bKash Gateway Integration**: Communication with payment provider
5. **Real-time Status Updates**: Live payment status tracking via polling
6. **Automated Reconciliation**: Balance updates and audit logging
7. **Payment Receipt Generation**: Automated receipt creation
8. **Error Handling**: Retry mechanisms and user feedback for failures
9. **Transaction Verification**: Double-checking payment status for accuracy
10. **Audit Trail**: Complete logging of all payment activities

## Testing Architecture
- **Backend Testing**: Comprehensive test suite with Mocha, Chai, and Sinon
  - Unit tests for models, services, and utilities
  - Integration tests for API endpoints
  - End-to-end tests for complete workflows
  - Performance tests for high-load scenarios
  - Security tests for authentication and authorization
  - bKash integration tests for payment processing
  - Financial tests for reconciliation processes
- **Frontend Testing**: Jest and React Testing Library
  - Component unit tests with mocking
  - Integration tests for user workflows
  - Accessibility testing compliance
  - Performance testing for critical paths
  - Browser compatibility testing
- **Test Data Management**: Factories and seeders for consistent test data
- **Continuous Integration**: Automated testing in GitHub Actions
- **Coverage Reports**: Code coverage tracking for quality assurance

## Deployment Architecture
- **Docker Configuration**: Multi-stage builds for both frontend and backend
- **Environment Management**: Separate configurations for development, staging, and production
- **CI/CD Pipeline**: GitHub Actions for automated testing and deployment
- **Database Migrations**: Automated migration system with rollback capabilities
- **Monitoring**: Application logging, error tracking, and performance monitoring
- **Security**: Environment variable management and secure deployment practices
- **Scalability**: Horizontal scaling capabilities for high-demand periods
- **Backup Systems**: Automated database backups and disaster recovery
- **Health Checks**: Comprehensive system health monitoring

## Security Architecture
- **Input Sanitization**: Prevention of injection attacks
- **Output Encoding**: Prevention of XSS attacks
- **Authentication Security**: JWT with secure secret management
- **Authorization**: Role-based access control with middleware
- **Rate Limiting**: Protection against abuse and DDoS attacks
- **CORS Configuration**: Controlled cross-origin resource sharing
- **HTTPS Enforcement**: Secure communication in production
- **Data Encryption**: Protection of sensitive information
- **Audit Logging**: Comprehensive tracking of system activities
- **Financial Security**: Additional layers for payment operations
- **Fraud Detection**: Mechanisms to identify suspicious activities
- **Security Headers**: Protection against common web vulnerabilities

## Monitoring and Observability
- **Application Logging**: Detailed logs for debugging and monitoring
- **Error Tracking**: Automated error detection and reporting
- **Performance Metrics**: Real-time system health and performance tracking
- **API Monitoring**: Endpoint response times and availability
- **Database Performance**: Query performance and optimization
- **User Analytics**: Insights into platform usage and behavior
- **Financial Monitoring**: Payment processing and reconciliation tracking
- **Alerting System**: Automated notifications for critical issues
- **Dashboard Views**: Visual representations of system health
- **Audit Trails**: Complete logging of all system activities

## Development Workflow
- **Monorepo Structure**: Unified development with shared scripts and configurations
- **Hot Reloading**: Development servers with live reload for both frontend and backend
- **Code Quality**: ESLint, TypeScript strict mode, and automated formatting
- **Git Workflow**: Feature branches with pull request reviews and automated testing
- **Documentation**: Comprehensive README files and inline code documentation
- **Testing**: Comprehensive test coverage with multiple testing frameworks
- **Continuous Integration**: Automated testing and quality checks
- **Deployment**: Streamlined deployment processes with rollback capabilities
