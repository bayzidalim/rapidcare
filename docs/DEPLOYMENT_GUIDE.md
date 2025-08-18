# RapidCare Hospital Booking System - Deployment Guide

## Table of Contents
1. [Overview](#overview)
2. [System Requirements](#system-requirements)
3. [Environment Setup](#environment-setup)
4. [Development Deployment](#development-deployment)
5. [Production Deployment](#production-deployment)
6. [Docker Deployment](#docker-deployment)
7. [Database Setup](#database-setup)
8. [Environment Variables](#environment-variables)
9. [SSL/TLS Configuration](#ssltls-configuration)
10. [Monitoring and Logging](#monitoring-and-logging)
11. [Backup and Recovery](#backup-and-recovery)
12. [Troubleshooting](#troubleshooting)

## Overview

This guide provides comprehensive instructions for deploying the RapidCare Hospital Booking System in various environments, from local development to production servers.

### Architecture Overview
- **Frontend**: Next.js application (Static/SSR)
- **Backend**: Node.js Express API server
- **Database**: SQLite (development) / PostgreSQL (production)
- **Payment**: bKash payment gateway integration
- **Deployment**: Docker containers or traditional hosting

## System Requirements

### Minimum Requirements
- **CPU**: 2 cores
- **RAM**: 4GB
- **Storage**: 20GB SSD
- **OS**: Ubuntu 20.04+ / CentOS 8+ / macOS 10.15+ / Windows 10+
- **Node.js**: 18.x or higher
- **npm**: 8.x or higher

### Recommended Requirements
- **CPU**: 4 cores
- **RAM**: 8GB
- **Storage**: 50GB SSD
- **Load Balancer**: Nginx or Apache
- **SSL Certificate**: Let's Encrypt or commercial
- **Monitoring**: PM2, New Relic, or similar

### Network Requirements
- **Ports**: 3000 (frontend), 5000 (backend), 80/443 (web)
- **Outbound**: HTTPS access for payment gateway
- **Inbound**: HTTP/HTTPS from users

## Environment Setup

### Node.js Installation
```bash
# Using Node Version Manager (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 18
nvm use 18

# Verify installation
node --version
npm --version
```

### Git Repository Setup
```bash
# Clone the repository
git clone https://github.com/your-org/rapidcare.git
cd rapidcare

# Install dependencies for both frontend and backend
npm run install:all
```

### Database Setup
```bash
# Navigate to backend directory
cd back-end

# Run database migrations
npm run migrate

# Seed database with sample data (optional)
npm run seed
```

## Development Deployment

### Quick Start
```bash
# From project root
npm run dev
```

This command starts both frontend (port 3000) and backend (port 5000) in development mode with hot reloading.

### Individual Services
```bash
# Start backend only
cd back-end
npm run dev

# Start frontend only (in another terminal)
cd front-end
npm run dev
```

### Environment Configuration
Create environment files:

**Backend (.env)**
```bash
cd back-end
cp .env.example .env
```

**Frontend (.env.local)**
```bash
cd front-end
cp .env.example .env.local
```

### Development Database
```bash
# Reset database (development only)
cd back-end
rm database.sqlite
npm run migrate
npm run seed
```

## Production Deployment

### Option 1: Traditional Server Deployment

#### 1. Server Preparation
```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 for process management
sudo npm install -g pm2

# Install Nginx for reverse proxy
sudo apt install nginx -y
```

#### 2. Application Setup
```bash
# Clone repository
git clone https://github.com/your-org/rapidcare.git
cd rapidcare

# Install dependencies
npm run install:all

# Build applications
npm run build

# Set up environment variables
cp back-end/.env.example back-end/.env
cp front-end/.env.example front-end/.env.local

# Edit environment files with production values
nano back-end/.env
nano front-end/.env.local
```

#### 3. Database Setup
```bash
cd back-end
npm run migrate
```

#### 4. PM2 Configuration
Create `ecosystem.config.js`:
```javascript
module.exports = {
  apps: [
    {
      name: 'rapidcare-backend',
      script: 'back-end/index.js',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 5000
      },
      error_file: './logs/backend-error.log',
      out_file: './logs/backend-out.log',
      log_file: './logs/backend-combined.log',
      time: true
    },
    {
      name: 'rapidcare-frontend',
      script: 'front-end/server.js',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: './logs/frontend-error.log',
      out_file: './logs/frontend-out.log',
      log_file: './logs/frontend-combined.log',
      time: true
    }
  ]
};
```

#### 5. Start Services
```bash
# Create logs directory
mkdir logs

# Start applications with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Set up PM2 to start on boot
pm2 startup
```

#### 6. Nginx Configuration
Create `/etc/nginx/sites-available/rapidcare`:
```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;
    
    # SSL Configuration
    ssl_certificate /path/to/ssl/certificate.crt;
    ssl_certificate_key /path/to/ssl/private.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    
    # Frontend (Next.js)
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Backend API
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private must-revalidate auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss;
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/rapidcare /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Option 2: Vercel Deployment (Frontend)

#### 1. Vercel Setup
```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy from frontend directory
cd front-end
vercel --prod
```

#### 2. Environment Variables
Set environment variables in Vercel dashboard:
- `NEXT_PUBLIC_API_URL`: Your backend API URL
- `NEXT_PUBLIC_PAYMENT_GATEWAY_URL`: Payment gateway URL

#### 3. Build Configuration
Ensure `next.config.ts` is properly configured:
```typescript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    outputFileTracingRoot: path.join(__dirname, '../../'),
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
}

module.exports = nextConfig
```

## Docker Deployment

### Docker Compose Setup
Create `docker-compose.prod.yml`:
```yaml
version: '3.8'

services:
  backend:
    build:
      context: ./back-end
      dockerfile: Dockerfile
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - JWT_SECRET=${JWT_SECRET}
      - DATABASE_URL=${DATABASE_URL}
    volumes:
      - ./back-end/database.sqlite:/app/database.sqlite
      - ./logs:/app/logs
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  frontend:
    build:
      context: ./front-end
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_API_URL=http://backend:5000/api
    depends_on:
      - backend
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000"]
      interval: 30s
      timeout: 10s
      retries: 3

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

volumes:
  database:
  logs:
```

### Backend Dockerfile
```dockerfile
# back-end/Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Create logs directory
RUN mkdir -p logs

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5000/api/health || exit 1

# Start application
CMD ["npm", "start"]
```

### Frontend Dockerfile
```dockerfile
# front-end/Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build application
RUN npm run build

# Production stage
FROM node:18-alpine AS runner

WORKDIR /app

# Copy built application
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000 || exit 1

# Start application
CMD ["node", "server.js"]
```

### Deploy with Docker
```bash
# Build and start services
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Scale services
docker-compose -f docker-compose.prod.yml up -d --scale backend=3 --scale frontend=2
```

## Database Setup

### SQLite (Development/Small Production)
```bash
cd back-end

# Run migrations
npm run migrate

# Seed with sample data
npm run seed
```

### PostgreSQL (Large Production)
```bash
# Install PostgreSQL
sudo apt install postgresql postgresql-contrib

# Create database and user
sudo -u postgres psql
CREATE DATABASE rapidcare;
CREATE USER rapidcare_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE rapidcare TO rapidcare_user;
\q

# Update environment variables
DATABASE_URL=postgresql://rapidcare_user:secure_password@localhost:5432/rapidcare
```

### Database Migration
```bash
# Run migrations
cd back-end
npm run migrate

# Rollback migration (if needed)
npm run migrate:rollback
```

## Environment Variables

### Backend Environment Variables
```bash
# back-end/.env
NODE_ENV=production
PORT=5000
JWT_SECRET=your-super-secure-jwt-secret-key-here
DATABASE_URL=sqlite:./database.sqlite

# Payment Gateway
BKASH_APP_KEY=your-bkash-app-key
BKASH_APP_SECRET=your-bkash-app-secret
BKASH_USERNAME=your-bkash-username
BKASH_PASSWORD=your-bkash-password
BKASH_BASE_URL=https://tokenized.pay.bka.sh/v1.2.0-beta

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Security
CORS_ORIGIN=https://your-domain.com
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
LOG_FILE=./logs/app.log
```

### Frontend Environment Variables
```bash
# front-end/.env.local
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://api.your-domain.com/api
NEXT_PUBLIC_APP_URL=https://your-domain.com

# Payment Gateway
NEXT_PUBLIC_BKASH_SCRIPT_URL=https://scripts.pay.bka.sh/versions/1.2.0-beta/checkout/bKash-checkout.js

# Analytics (optional)
NEXT_PUBLIC_GA_TRACKING_ID=GA_TRACKING_ID
NEXT_PUBLIC_HOTJAR_ID=HOTJAR_ID

# Feature Flags
NEXT_PUBLIC_ENABLE_BLOOD_DONATION=true
NEXT_PUBLIC_ENABLE_PAYMENT_GATEWAY=true
```

## SSL/TLS Configuration

### Let's Encrypt (Free SSL)
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Auto-renewal setup
sudo crontab -e
# Add this line:
0 12 * * * /usr/bin/certbot renew --quiet
```

### Manual SSL Certificate
```bash
# Generate private key
openssl genrsa -out private.key 2048

# Generate certificate signing request
openssl req -new -key private.key -out certificate.csr

# Install certificate files
sudo cp certificate.crt /etc/ssl/certs/
sudo cp private.key /etc/ssl/private/
sudo chmod 600 /etc/ssl/private/private.key
```

## Monitoring and Logging

### PM2 Monitoring
```bash
# Monitor processes
pm2 monit

# View logs
pm2 logs

# Restart applications
pm2 restart all

# Reload applications (zero downtime)
pm2 reload all
```

### Log Rotation
Create `/etc/logrotate.d/rapidcare`:
```
/path/to/rapidcare/logs/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
    postrotate
        pm2 reloadLogs
    endscript
}
```

### Health Checks
Create health check endpoints:

**Backend Health Check**
```javascript
// back-end/routes/health.js
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    database: 'connected' // Add database check
  });
});
```

**Frontend Health Check**
```javascript
// front-end/pages/api/health.js
export default function handler(req, res) {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
}
```

### Monitoring Tools Setup
```bash
# Install monitoring tools
npm install -g pm2-logrotate
pm2 install pm2-logrotate

# Configure log rotation
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30
pm2 set pm2-logrotate:compress true
```

## Backup and Recovery

### Automated Backup Script
```bash
#!/bin/bash
# backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/rapidcare"
APP_DIR="/path/to/rapidcare"

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database
cp $APP_DIR/back-end/database.sqlite $BACKUP_DIR/database_$DATE.sqlite

# Backup uploaded files (if any)
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz $APP_DIR/uploads/

# Backup configuration files
tar -czf $BACKUP_DIR/config_$DATE.tar.gz $APP_DIR/back-end/.env $APP_DIR/front-end/.env.local

# Remove backups older than 30 days
find $BACKUP_DIR -name "*.sqlite" -mtime +30 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete

echo "Backup completed: $DATE"
```

### Automated Backup with Cron
```bash
# Add to crontab
crontab -e

# Daily backup at 2 AM
0 2 * * * /path/to/backup.sh >> /var/log/rapidcare-backup.log 2>&1
```

### Recovery Procedure
```bash
#!/bin/bash
# restore.sh

if [ -z "$1" ]; then
  echo "Usage: $0 <backup_date>"
  exit 1
fi

BACKUP_DATE=$1
BACKUP_DIR="/backups/rapidcare"
APP_DIR="/path/to/rapidcare"

# Stop applications
pm2 stop all

# Restore database
cp $BACKUP_DIR/database_$BACKUP_DATE.sqlite $APP_DIR/back-end/database.sqlite

# Restore uploads
tar -xzf $BACKUP_DIR/uploads_$BACKUP_DATE.tar.gz -C $APP_DIR/

# Restore configuration
tar -xzf $BACKUP_DIR/config_$BACKUP_DATE.tar.gz -C $APP_DIR/

# Start applications
pm2 start all

echo "Restore completed from backup: $BACKUP_DATE"
```

## Troubleshooting

### Common Issues

#### Application Won't Start
```bash
# Check logs
pm2 logs

# Check port availability
netstat -tlnp | grep :3000
netstat -tlnp | grep :5000

# Check environment variables
pm2 env 0

# Restart applications
pm2 restart all
```

#### Database Connection Issues
```bash
# Check database file permissions
ls -la back-end/database.sqlite

# Test database connection
cd back-end
node -e "const db = require('./config/database'); console.log('Database connected');"

# Run database integrity check
sqlite3 back-end/database.sqlite "PRAGMA integrity_check;"
```

#### SSL Certificate Issues
```bash
# Check certificate validity
openssl x509 -in /etc/ssl/certs/certificate.crt -text -noout

# Test SSL configuration
openssl s_client -connect your-domain.com:443

# Renew Let's Encrypt certificate
sudo certbot renew --dry-run
```

#### Performance Issues
```bash
# Check system resources
htop
df -h
free -m

# Check application performance
pm2 monit

# Analyze slow queries (if using PostgreSQL)
# Enable slow query logging in postgresql.conf
```

#### Payment Gateway Issues
```bash
# Check bKash API connectivity
curl -X POST https://tokenized.pay.bka.sh/v1.2.0-beta/tokenized/checkout/token/grant \
  -H "Content-Type: application/json" \
  -d '{"app_key":"your-app-key","app_secret":"your-app-secret"}'

# Check payment logs
grep "payment" back-end/logs/app.log
```

### Log Analysis
```bash
# View recent errors
tail -f logs/backend-error.log

# Search for specific errors
grep -i "error" logs/backend-combined.log | tail -20

# Monitor real-time logs
pm2 logs --lines 100
```

### Performance Optimization
```bash
# Enable Nginx caching
# Add to nginx.conf
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}

# Enable compression
gzip on;
gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
```

### Security Hardening
```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Configure firewall
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable

# Secure SSH
sudo nano /etc/ssh/sshd_config
# Set: PermitRootLogin no
# Set: PasswordAuthentication no
sudo systemctl restart ssh
```

### Monitoring Commands
```bash
# System monitoring
htop
iotop
nethogs

# Application monitoring
pm2 monit
pm2 status
pm2 logs --lines 50

# Database monitoring
sqlite3 database.sqlite ".schema"
sqlite3 database.sqlite "SELECT COUNT(*) FROM bookings;"

# Network monitoring
netstat -tlnp
ss -tlnp
```

---

This deployment guide provides comprehensive instructions for deploying RapidCare in various environments. For additional deployment support, please contact the development team or refer to the troubleshooting section.