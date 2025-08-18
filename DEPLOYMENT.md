# 🚀 RapidCare Deployment Guide

This guide provides step-by-step instructions for deploying RapidCare to production environments.

## 📋 Prerequisites

- Node.js 18+ installed
- Git repository access
- Vercel account (for frontend)
- Railway/Render account (for backend)

## 🏗️ Project Structure for Deployment

```
rapidcare/
├── back-end/           # Express.js API Server
├── front-end/          # Next.js React Application
├── docs/               # Documentation
├── .gitignore          # Git ignore rules
├── package.json        # Root package configuration
├── README.md           # Project documentation
└── DEPLOYMENT.md       # This file
```

## 🌐 Frontend Deployment (Vercel)

### Step 1: Prepare Frontend for Deployment

1. **Navigate to frontend directory:**
   ```bash
   cd front-end
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Build the application:**
   ```bash
   npm run build
   ```

4. **Test the build locally:**
   ```bash
   npm start
   ```

### Step 2: Deploy to Vercel

#### Option A: Vercel CLI (Recommended)

1. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel:**
   ```bash
   vercel login
   ```

3. **Deploy from root directory:**
   ```bash
   vercel --prod
   ```

4. **Configure project settings:**
   - Root Directory: `front-end`
   - Build Command: `npm run build`
   - Output Directory: `.next`
   - Install Command: `npm install`

#### Option B: GitHub Integration

1. **Push to GitHub:**
   ```bash
   git add .
   git commit -m "Prepare for deployment"
   git push origin main
   ```

2. **Connect to Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Set Root Directory to `front-end`
   - Configure environment variables

### Step 3: Environment Variables (Vercel)

Add these environment variables in Vercel dashboard:

```env
NEXT_PUBLIC_API_URL=https://your-backend-url.railway.app/api
```

## 🔧 Backend Deployment (Railway)

### Step 1: Prepare Backend for Deployment

1. **Navigate to backend directory:**
   ```bash
   cd back-end
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Test the application:**
   ```bash
   npm start
   ```

### Step 2: Deploy to Railway

#### Option A: Railway CLI

1. **Install Railway CLI:**
   ```bash
   npm install -g @railway/cli
   ```

2. **Login to Railway:**
   ```bash
   railway login
   ```

3. **Initialize project:**
   ```bash
   railway init
   ```

4. **Deploy:**
   ```bash
   railway up
   ```

#### Option B: GitHub Integration

1. **Connect to Railway:**
   - Go to [railway.app](https://railway.app)
   - Create new project from GitHub
   - Select your repository
   - Set Root Directory to `back-end`

### Step 3: Environment Variables (Railway)

Add these environment variables in Railway dashboard:

```env
NODE_ENV=production
JWT_SECRET=your-super-secure-jwt-secret-key-change-this
PORT=5000
```

### Step 4: Database Setup

Railway will automatically create a SQLite database. For production, consider upgrading to PostgreSQL:

1. **Add PostgreSQL service in Railway**
2. **Update database configuration in `back-end/config/database.js`**
3. **Run migrations on deployment**

## 🐳 Docker Deployment (Alternative)

### Step 1: Build Docker Images

1. **Backend Dockerfile** (`back-end/Dockerfile`):
   ```dockerfile
   FROM node:18-alpine
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci --only=production
   COPY . .
   EXPOSE 5000
   CMD ["npm", "start"]
   ```

2. **Frontend Dockerfile** (`front-end/Dockerfile`):
   ```dockerfile
   FROM node:18-alpine AS builder
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci
   COPY . .
   RUN npm run build

   FROM node:18-alpine AS runner
   WORKDIR /app
   COPY --from=builder /app/.next ./.next
   COPY --from=builder /app/public ./public
   COPY --from=builder /app/package*.json ./
   RUN npm ci --only=production
   EXPOSE 3000
   CMD ["npm", "start"]
   ```

### Step 2: Docker Compose

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'
services:
  backend:
    build: ./back-end
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - JWT_SECRET=${JWT_SECRET}
    volumes:
      - ./data:/app/data

  frontend:
    build: ./front-end
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://backend:5000/api
    depends_on:
      - backend
```

### Step 3: Deploy with Docker

```bash
docker-compose -f docker-compose.prod.yml up -d
```

## 🔒 Security Checklist

### Backend Security

- [ ] Strong JWT secret (32+ characters)
- [ ] CORS properly configured
- [ ] Input validation on all endpoints
- [ ] Rate limiting implemented
- [ ] HTTPS enforced in production
- [ ] Environment variables secured
- [ ] Database credentials protected

### Frontend Security

- [ ] API URLs use HTTPS
- [ ] No sensitive data in client-side code
- [ ] Content Security Policy configured
- [ ] XSS protection enabled

## 📊 Performance Optimization

### Backend Optimization

1. **Enable compression:**
   ```javascript
   const compression = require('compression');
   app.use(compression());
   ```

2. **Database optimization:**
   - Add proper indexes
   - Use connection pooling
   - Implement caching

3. **API optimization:**
   - Implement pagination
   - Use response compression
   - Add request caching

### Frontend Optimization

1. **Next.js optimizations:**
   - Image optimization enabled
   - Bundle analyzer for size monitoring
   - Static generation where possible

2. **Performance monitoring:**
   - Core Web Vitals tracking
   - Error boundary implementation
   - Loading states for better UX

## 🔍 Monitoring and Logging

### Backend Monitoring

1. **Add logging middleware:**
   ```javascript
   const morgan = require('morgan');
   app.use(morgan('combined'));
   ```

2. **Error tracking:**
   - Implement error logging
   - Set up alerts for critical errors
   - Monitor API response times

### Frontend Monitoring

1. **Analytics setup:**
   - Google Analytics integration
   - User behavior tracking
   - Performance monitoring

2. **Error tracking:**
   - Client-side error logging
   - User feedback collection

## 🧪 Testing Before Deployment

### Backend Testing

```bash
cd back-end
npm test
npm run lint
```

### Frontend Testing

```bash
cd front-end
npm test
npm run lint
npm run build
```

### Integration Testing

1. **Test API endpoints**
2. **Verify authentication flow**
3. **Check database connections**
4. **Validate environment variables**

## 🚀 Deployment Checklist

### Pre-deployment

- [ ] All tests passing
- [ ] Code linted and formatted
- [ ] Environment variables configured
- [ ] Database migrations ready
- [ ] Security checklist completed

### Post-deployment

- [ ] Health checks passing
- [ ] API endpoints responding
- [ ] Frontend loading correctly
- [ ] Database connections working
- [ ] Monitoring systems active

## 🆘 Troubleshooting

### Common Issues

1. **Build failures:**
   - Check Node.js version compatibility
   - Verify all dependencies installed
   - Review build logs for errors

2. **Environment variable issues:**
   - Verify all required variables set
   - Check variable naming (NEXT_PUBLIC_ prefix for frontend)
   - Ensure no trailing spaces in values

3. **Database connection issues:**
   - Verify database URL format
   - Check network connectivity
   - Ensure database service is running

4. **CORS errors:**
   - Configure allowed origins
   - Check request headers
   - Verify API URL configuration

### Getting Help

- Check deployment platform documentation
- Review application logs
- Test locally with production environment variables
- Contact support if issues persist

## 📞 Support

For deployment support:
- Create an issue in the GitHub repository
- Check the troubleshooting section
- Review platform-specific documentation
- Contact the development team

---

**Note**: This deployment guide assumes a standard production setup. Adjust configurations based on your specific requirements and infrastructure.