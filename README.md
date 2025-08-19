# 🏥 RapidCare

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)

Emergency Care, Delivered Fast. A comprehensive emergency medical resource booking platform that connects patients with hospitals in real-time. Find and book hospital beds, ICUs, operation theatres, and surgeons while facilitating blood donation requests when every second counts.

## 🌟 Live Demo

- **Frontend**: Deploy to Vercel for live demo
- **Backend API**: Deploy to Railway/Render for API access
- **Documentation**: Complete API documentation available in [docs/API.md](docs/API.md)

## 🚀 Features

### Core Functionality
- **Real-time Hospital Search**: Find hospitals with available resources
- **Resource Booking**: Book beds, ICUs, and operation theatres
- **Surgeon Availability**: Check and book qualified surgeons
- **Blood Donation Network**: Request and manage blood donations
- **User Dashboard**: Track all bookings and requests
- **Payment Integration**: Secure payment processing with 30% service charge
- **Hospital Management**: Add, edit, and manage hospitals (hospital authority users)
- **Resource Management**: Update hospital resources and availability in real-time

### Technical Features
- **Responsive Design**: Mobile-first approach for emergency situations
- **Real-time Updates**: Live resource availability tracking
- **Form Validation**: Comprehensive validation with Zod
- **Modern UI**: Clean interface using shadcn/ui components
- **Type Safety**: Full TypeScript implementation

## 🏗️ Architecture

The project consists of two main parts:

### Backend (`rapidcare-backend/`)
- **Runtime**: Node.js + Express.js
- **Database**: SQLite with better-sqlite3
- **Authentication**: JWT tokens
- **API**: RESTful endpoints
- **Deployment**: Render/Railway

### Frontend (`rapidcare-frontend/`)
- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Forms**: React Hook Form + Zod
- **Deployment**: Vercel

## 📁 Project Structure

```
rapidcare/
├── back-end/                           # Express.js API Server
│   ├── config/                         # Database and app configuration
│   ├── controllers/                    # Request handlers
│   ├── middleware/                     # Authentication & validation
│   ├── models/                         # Database models
│   ├── routes/                         # API route definitions
│   ├── services/                       # Business logic layer
│   ├── utils/                          # Helper utilities
│   ├── migrations/                     # Database migrations
│   ├── index.js                        # Server entry point
│   └── package.json                    # Backend dependencies
├── front-end/                          # Next.js React Application
│   ├── src/
│   │   ├── app/                        # Next.js 14 App Router pages
│   │   │   ├── admin/                  # Admin dashboard
│   │   │   ├── booking/                # Booking management
│   │   │   ├── dashboard/              # User dashboard
│   │   │   ├── hospitals/              # Hospital listings
│   │   │   ├── login/                  # Authentication
│   │   │   └── ...                     # Other pages
│   │   ├── components/                 # Reusable React components
│   │   │   ├── ui/                     # shadcn/ui components
│   │   │   ├── __tests__/              # Component tests
│   │   │   └── ...                     # Feature components
│   │   └── lib/                        # Utilities and configurations
│   │       ├── hooks/                  # Custom React hooks
│   │       ├── __tests__/              # Library tests
│   │       ├── api.ts                  # API client
│   │       ├── auth.ts                 # Authentication utilities
│   │       ├── types.ts                # TypeScript definitions
│   │       └── utils.ts                # Helper functions
│   ├── public/                         # Static assets
│   ├── tailwind.config.js              # Tailwind CSS configuration
│   ├── next.config.ts                  # Next.js configuration
│   └── package.json                    # Frontend dependencies
├── docs/                               # Project documentation
├── .gitignore                          # Git ignore rules
├── LICENSE                             # MIT License
├── CONTRIBUTING.md                     # Contribution guidelines
└── README.md                           # This file
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- SQLite (included with Node.js)
- npm or yarn

### One-Command Setup

```bash
# Clone the repository
git clone https://github.com/your-username/rapidcare.git
cd rapidcare

# Install all dependencies
npm run install:all

# Set up environment variables
cp back-end/.env.example back-end/.env
cp front-end/.env.example front-end/.env.local

# Start both servers
npm run dev
```

### Manual Setup

#### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd back-end
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. (Optional) Seed the database with sample data:
   ```bash
   npm run seed
   ```

#### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd front-end
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

### Docker Setup (Alternative)

```bash
# Build and run with Docker Compose
docker-compose up --build

# Access the application
# Frontend: http://localhost:3000
# Backend: http://localhost:5000
```

## 📚 API Documentation

### Hospital Endpoints
- `GET /api/hospitals` - Get all hospitals
- `GET /api/hospitals/search` - Search hospitals
- `GET /api/hospitals/resources` - Get hospitals with available resources
- `GET /api/hospitals/:id` - Get specific hospital
- `GET /api/hospitals/my-hospitals` - Get hospitals managed by current user (hospital authority)
- `POST /api/hospitals` - Create new hospital (hospital authority only)
- `PUT /api/hospitals/:id` - Update hospital (hospital authority only)
- `PUT /api/hospitals/:id/resources` - Update hospital resources (hospital authority only)
- `DELETE /api/hospitals/:id` - Delete hospital (hospital authority only)

### Booking Endpoints
- `POST /api/bookings` - Create new booking
- `GET /api/bookings/user/:userId` - Get user bookings
- `GET /api/bookings/:id` - Get specific booking
- `PUT /api/bookings/:id/status` - Update booking status
- `DELETE /api/bookings/:id` - Cancel booking

### Blood Request Endpoints
- `POST /api/blood/request` - Create blood request
- `GET /api/blood/requests` - Get all blood requests
- `GET /api/blood/requests/search` - Search blood requests
- `PUT /api/blood/requests/:id/status` - Update blood request status
- `POST /api/blood/requests/:id/match` - Match donor to blood request

## 🎨 UI Components

The frontend uses shadcn/ui components for a consistent design:

- **Navigation**: Responsive navigation with mobile menu
- **Cards**: Hospital listings and booking forms
- **Forms**: Validated forms with React Hook Form
- **Tables**: Data display for bookings and requests
- **Modals**: Confirmation dialogs and detailed views
- **Badges**: Status indicators and resource availability

## 🔧 Development

### Backend Development
```bash
cd back-end
npm run dev          # Start development server with nodemon
npm run start        # Start production server
npm run seed         # Seed database with sample data
npm test             # Run test suite
npm run lint         # Run ESLint
```

### Frontend Development
```bash
cd front-end
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm test             # Run Jest tests
npm run test:watch   # Run tests in watch mode
```

### Root Level Commands
```bash
npm run dev          # Start both frontend and backend
npm run build        # Build both applications
npm run test         # Run all tests
npm run lint         # Lint both applications
npm run install:all  # Install all dependencies
```

### Database Schema

The application uses SQLite with the following main tables:

#### Users
- User authentication (email, password)
- User information (name, phone)
- User type (user, hospital-authority, admin)
- Account status

#### Hospitals
- Basic information (name, address, contact)
- Resource availability (beds, ICUs, operation theatres)
- Surgeon information and availability
- Services offered

#### Bookings
- Patient information
- Resource type and hospital
- Scheduling details
- Payment information
- Status tracking

#### Blood Requests
- Requester information
- Blood type and units needed
- Hospital and patient details
- Donor matching system

#### Additional Tables
- **Hospital Authorities**: Links users to hospitals with roles
- **Surgeons**: Hospital surgeons with schedules
- **Hospital Resources**: Resource availability tracking
- **Matched Donors**: Donor matching for blood requests

## 🚀 Deployment

### Prerequisites for Deployment
- Git repository (GitHub, GitLab, etc.)
- Vercel account for frontend deployment
- Render account for backend deployment

### Frontend Deployment (Vercel)

1. **Connect Repository to Vercel**
   ```bash
   # Push your code to Git repository first
   git add .
   git commit -m "Prepare for deployment"
   git push origin main
   ```

2. **Configure Vercel Project**
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "New Project" and import your repository
   - Vercel will automatically detect the configuration from `vercel.json`
   - **Framework**: Next.js (auto-detected)
   - **Root Directory**: `front-end` (configured in vercel.json)
   - **Build Command**: `cd front-end && npm run build` (configured in vercel.json)
   - **Output Directory**: `front-end/.next` (configured in vercel.json)

3. **Environment Variables in Vercel**
   ```
   NEXT_PUBLIC_API_URL=https://your-backend-url.render.com/api
   NEXT_PUBLIC_ENABLE_POLLING=true
   ```

4. **Deploy**
   - Click "Deploy" - Vercel will automatically build and deploy
   - Your frontend will be available at `https://your-project.vercel.app`

### Backend Deployment (Render)

1. **Connect Repository to Render**
   - Go to [Render Dashboard](https://dashboard.render.com/)
   - Click "New +" → "Web Service"
   - Connect your Git repository

2. **Configure Render Service**
   - **Name**: `rapidcare-backend`
   - **Root Directory**: `back-end`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`

3. **Environment Variables in Render**
   ```
   NODE_ENV=production
   PORT=10000
   JWT_SECRET=your-super-secure-jwt-secret-change-this
   FRONTEND_URL=https://your-project.vercel.app
   ```

4. **Deploy**
   - Click "Create Web Service"
   - Render will build and deploy automatically
   - Your API will be available at `https://your-service.onrender.com`

### Post-Deployment Setup

1. **Update Frontend Environment**
   - Go back to Vercel dashboard
   - Update `NEXT_PUBLIC_API_URL` with your Render backend URL
   - Redeploy frontend

2. **Test Deployment**
   - Visit your frontend URL
   - Test user registration and login
   - Verify API connectivity
   - Check hospital search functionality

### Database Considerations

- **Development**: Uses SQLite (included in repository)
- **Production**: SQLite works on Render, but consider PostgreSQL for production scale
- **Migrations**: Run automatically on backend startup
- **Seeding**: Optional - set environment variable `SEED_DATA=true` to seed initial data

### Troubleshooting Deployment

#### Common Issues

1. **Build Failures**
   ```bash
   # Check build locally first
   cd front-end && npm run build
   cd back-end && npm start
   ```

2. **Environment Variables**
   - Ensure all required variables are set in platform dashboards
   - Check variable names match exactly (case-sensitive)

3. **CORS Issues**
   - Verify `FRONTEND_URL` is set correctly in backend
   - Check that frontend `NEXT_PUBLIC_API_URL` points to backend

4. **Database Issues**
   - Check backend logs for migration errors
   - Ensure database file permissions are correct

### Environment Variables Reference

#### Backend (.env) - Required Variables
```bash
# Server Configuration
NODE_ENV=production                    # Environment: development/production
PORT=10000                            # Server port (Render uses 10000)
JWT_SECRET=your-32-char-secret        # JWT signing secret (min 32 chars)
FRONTEND_URL=https://your-app.vercel.app  # Frontend URL for CORS

# Database Configuration
DATABASE_URL=./database.sqlite        # SQLite for simple deployment
# DATABASE_URL=postgresql://user:pass@host:port/db  # PostgreSQL for production
```

#### Backend (.env) - Optional Variables
```bash
# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Security & Performance
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
ENABLE_SECURITY_HEADERS=true
LOG_LEVEL=info

# Development Only
SEED_DATA=false                       # Set to true to seed sample data
```

#### Frontend (.env.local) - Required Variables
```bash
# API Configuration
NEXT_PUBLIC_API_URL=https://your-backend.onrender.com/api  # Backend API URL
NEXT_PUBLIC_ENABLE_POLLING=true       # Enable real-time updates
```

#### Frontend (.env.local) - Optional Variables
```bash
# Feature Configuration
NEXT_PUBLIC_POLLING_INTERVAL=10000    # Polling interval in milliseconds
NEXT_PUBLIC_API_TIMEOUT=30000         # API request timeout
NEXT_PUBLIC_ENABLE_NOTIFICATIONS=true
NEXT_PUBLIC_ENABLE_BLOOD_REQUESTS=true

# Analytics & Monitoring
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
NEXT_PUBLIC_SENTRY_DSN=your-sentry-dsn
NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING=true

# Maps & Payment (Future Features)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-maps-key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_your_key
```

### Deployment Checklist

- [ ] Code pushed to Git repository
- [ ] Backend deployed to Render with correct environment variables
- [ ] Frontend deployed to Vercel with correct API URL
- [ ] Database migrations completed successfully
- [ ] CORS configured properly
- [ ] Test user registration and login
- [ ] Verify hospital search and booking functionality
- [ ] Check mobile responsiveness on deployed site

For detailed deployment troubleshooting, see [DEPLOYMENT.md](DEPLOYMENT.md).

## 🔒 Security Considerations

- JWT authentication for API endpoints
- Input validation with Zod schemas
- CORS configuration for cross-origin requests
- Environment variable management
- Secure payment processing (to be implemented)

## 📱 Mobile Responsiveness

The application is designed with a mobile-first approach:

- Responsive navigation with hamburger menu
- Touch-friendly buttons and forms
- Optimized layouts for small screens
- Fast loading times for emergency situations

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

### Quick Start for Contributors

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes and add tests
4. Commit your changes (`git commit -m 'Add some amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the [API documentation](docs/API.md)
- Review the [deployment guide](DEPLOYMENT.md)
- See [contributing guidelines](CONTRIBUTING.md)

## 🙏 Acknowledgments

- **Next.js Team** - Amazing React framework
- **shadcn/ui** - Beautiful UI components
- **Tailwind CSS** - Utility-first CSS framework
- **Express.js** - Fast, unopinionated web framework
- **SQLite** - Lightweight database solution

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**RapidCare** - Emergency Care, Delivered Fast 🚑 # rapidcare
