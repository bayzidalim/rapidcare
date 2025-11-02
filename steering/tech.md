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

## Development Tools
- **Linting**: ESLint with Next.js configuration
- **Package Manager**: npm
- **Build Tool**: Next.js built-in bundler
- **CSS Processing**: PostCSS with Autoprefixer
- **Containerization**: Docker with multi-stage builds
- **Deployment**: Vercel for frontend, flexible backend deployment
- **Monorepo Management**: Concurrently for running multiple services
- **Database Migrations**: Custom migration system
- **CI/CD**: GitHub Actions workflows

## Common Commands

### Root Level Commands
```bash
npm run dev          # Start both backend and frontend in development
npm run build        # Build both backend and frontend
npm run start        # Start both services in production
npm run test         # Run all tests
npm run install:all  # Install dependencies for all packages
npm run setup        # Initial project setup with environment files
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
npm run test:coverage # Run tests with coverage
npm run lint         # Run ESLint
npm start            # Production server
```

### Database Management
- Database file: `back-end/database.sqlite`
- Migrations: Located in `back-end/migrations/`
- Seeding: Run `npm run seed` in backend directory

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
- RESTful API design
- JWT-based authentication with middleware
- Role-based access control (user, hospital-authority, admin)
- Centralized error handling
- Request/response interceptors for token management
- Real-time polling system for live updates
- Financial reconciliation and audit trails
- Payment processing with bKash integration
- Notification system with real-time delivery
- Comprehensive logging and monitoring
- Background job scheduling for maintenance tasks

## Payment Integration
- **bKash Gateway**: Integrated payment processing
- **Currency Support**: BDT (Bangladeshi Taka)
- **Payment Methods**: Mobile financial services
- **Security**: Encrypted payment data handling
- **Reconciliation**: Automated financial reconciliation
- **Audit Trail**: Complete payment history tracking

## Real-time Features
- **Polling System**: Custom polling client for live updates
- **Notification System**: Real-time notification delivery
- **Resource Updates**: Live hospital resource availability
- **Booking Status**: Real-time booking status updates
- **Payment Status**: Live payment processing updates