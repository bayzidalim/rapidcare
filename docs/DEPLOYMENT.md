# 🚀 Deployment Guide

This guide covers deploying the RapidCare emergency medical platform to various production environments. When every second counts, reliable deployment is critical.

## 📋 Prerequisites

- Node.js 18+
- Git repository
- Environment variables configured

## 🌐 Platform-Specific Deployments

### Vercel (Frontend) + Render (Backend)

#### Frontend Deployment (Vercel)

1. **Connect Repository**
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "New Project"
   - Import your GitHub repository
   - Select the `front-end` directory as root

2. **Configure Build Settings**
   ```bash
   # Build Command
   npm run build
   
   # Output Directory
   .next
   
   # Install Command
   npm install
   ```

3. **Environment Variables**
   ```env
   NEXT_PUBLIC_API_URL=https://your-backend-url.render.com/api
   ```

4. **Deploy**
   - Click "Deploy"
   - Your RapidCare frontend will be available at `https://your-app.vercel.app`

#### Backend Deployment (Render)

1. **Create Web Service**
   - Go to [Render Dashboard](https://render.com/dashboard)
   - Click "New" → "Web Service"
   - Connect your GitHub repository
   - Select the `back-end` directory as root

2. **Configure Service**
   ```bash
   # Build Command
   npm install
   
   # Start Command
   npm start
   
   # Environment
   Node
   ```

3. **Environment Variables**
   ```env
   NODE_ENV=production
   JWT_SECRET=your-super-secure-jwt-secret
   PORT=5000
   ```

4. **Deploy**
   - Click "Create Web Service"
   - Your backend will be available at `https://your-app.render.com`

### Railway (Full Stack)

1. **Deploy Backend**
   ```bash
   # Install Railway CLI
   npm install -g @railway/cli
   
   # Login
   railway login
   
   # Deploy backend
   cd back-end
   railway deploy
   ```

2. **Deploy Frontend**
   ```bash
   cd front-end
   railway deploy
   ```

3. **Configure Environment Variables**
   ```bash
   # Backend
   railway variables set JWT_SECRET=your-secret
   railway variables set NODE_ENV=production
   
   # Frontend
   railway variables set NEXT_PUBLIC_API_URL=https://your-backend.railway.app/api
   ```

### Docker Deployment

#### Local Docker

```bash
# Build and run
docker-compose up --build

# Run in background
docker-compose up -d

# Stop services
docker-compose down
```

#### Production Docker

1. **Create production docker-compose.yml**
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
       restart: unless-stopped
   
     frontend:
       build: ./front-end
       ports:
         - "3000:3000"
       environment:
         - NEXT_PUBLIC_API_URL=http://backend:5000/api
       depends_on:
         - backend
       restart: unless-stopped
   
     nginx:
       image: nginx:alpine
       ports:
         - "80:80"
         - "443:443"
       volumes:
         - ./nginx.conf:/etc/nginx/nginx.conf
         - ./ssl:/etc/nginx/ssl
       depends_on:
         - frontend
         - backend
       restart: unless-stopped
   ```

2. **Deploy**
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

### AWS Deployment

#### Using AWS Amplify (Frontend) + AWS Lambda (Backend)

1. **Frontend (Amplify)**
   ```bash
   # Install Amplify CLI
   npm install -g @aws-amplify/cli
   
   # Configure
   amplify configure
   
   # Initialize
   cd front-end
   amplify init
   
   # Add hosting
   amplify add hosting
   
   # Deploy
   amplify publish
   ```

2. **Backend (Lambda + API Gateway)**
   ```bash
   # Install Serverless Framework
   npm install -g serverless
   
   # Deploy
   cd back-end
   serverless deploy
   ```

## 🔧 Environment Configuration

### Production Environment Variables

#### Backend (.env)
```env
NODE_ENV=production
PORT=5000
JWT_SECRET=your-super-secure-jwt-secret-min-32-chars
DATABASE_URL=your-database-url
CORS_ORIGIN=https://your-frontend-domain.com
```

#### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=https://your-backend-domain.com/api
NEXT_PUBLIC_APP_ENV=production
```

### Security Considerations

1. **JWT Secret**
   - Use a strong, random secret (minimum 32 characters)
   - Never commit secrets to version control
   - Rotate secrets regularly

2. **CORS Configuration**
   - Set specific origins in production
   - Avoid using wildcards (`*`)

3. **HTTPS**
   - Always use HTTPS in production
   - Configure SSL certificates
   - Redirect HTTP to HTTPS

## 📊 Monitoring and Logging

### Application Monitoring

1. **Vercel Analytics**
   ```bash
   npm install @vercel/analytics
   ```

2. **Render Metrics**
   - Built-in metrics dashboard
   - Custom health checks

3. **Error Tracking**
   ```bash
   # Install Sentry
   npm install @sentry/nextjs @sentry/node
   ```

### Health Checks

#### Backend Health Check
```javascript
// Add to your Express app
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});
```

#### Frontend Health Check
```typescript
// pages/api/health.ts
export default function handler(req, res) {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
}
```

## 🔄 CI/CD Pipeline

### GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm run install:all
      
      - name: Run tests
        run: npm test
      
      - name: Run linting
        run: npm run lint

  deploy-backend:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to Render
        uses: render-deploy-action@v1
        with:
          service-id: ${{ secrets.RENDER_SERVICE_ID }}
          api-key: ${{ secrets.RENDER_API_KEY }}

  deploy-frontend:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
```

## 🚨 Troubleshooting

### Common Issues

1. **Build Failures**
   ```bash
   # Clear caches
   npm run clean
   npm run install:all
   
   # Check Node version
   node --version  # Should be 18+
   ```

2. **Environment Variables Not Loading**
   - Check variable names (case-sensitive)
   - Verify platform-specific prefixes
   - Restart services after changes

3. **CORS Errors**
   - Verify API URL in frontend env
   - Check backend CORS configuration
   - Ensure protocols match (http/https)

4. **Database Connection Issues**
   - Check database URL format
   - Verify network connectivity
   - Check firewall settings

### Performance Optimization

1. **Frontend**
   - Enable Next.js Image Optimization
   - Use dynamic imports for large components
   - Implement proper caching headers

2. **Backend**
   - Add database indexes
   - Implement response caching
   - Use compression middleware

3. **Database**
   - Optimize queries
   - Add proper indexes
   - Monitor query performance

## 📞 Support

For deployment issues:
- Check platform-specific documentation
- Review application logs
- Contact support through GitHub issues

## 🔗 Useful Links

- [Vercel Documentation](https://vercel.com/docs)
- [Render Documentation](https://render.com/docs)
- [Railway Documentation](https://docs.railway.app)
- [Docker Documentation](https://docs.docker.com)
- [AWS Amplify Documentation](https://docs.amplify.aws)