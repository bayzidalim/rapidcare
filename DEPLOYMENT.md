# RapidCare Deployment Guide

This guide provides detailed instructions for deploying RapidCare to Vercel (frontend) and Render (backend).

## Prerequisites

- Git repository with your RapidCare code
- [Vercel account](https://vercel.com) for frontend deployment
- [Render account](https://render.com) for backend deployment

## Frontend Deployment (Vercel)

### Step 1: Prepare Repository
Ensure your code is pushed to a Git repository (GitHub, GitLab, etc.):

```bash
git add .
git commit -m "Prepare for deployment"
git push origin main
```

### Step 2: Deploy to Vercel

1. **Go to Vercel Dashboard**
   - Visit [vercel.com/dashboard](https://vercel.com/dashboard)
   - Click "New Project"

2. **Import Repository**
   - Connect your Git provider (GitHub, GitLab, etc.)
   - Select your `rapidcare` repository
   - Click "Import"

3. **Configure Project Settings**
   - **Project Name**: `rapidcare-frontend` (or your preferred name)
   - **Framework Preset**: Next.js (should be auto-detected)
   - **Root Directory**: `front-end` ⚠️ **CRITICAL - Must be set to `front-end`**
   - **Build Command**: Leave default (`npm run build`)
   - **Output Directory**: Leave default (`.next`)
   - **Install Command**: Leave default (`npm install`)

4. **Environment Variables**
   Add these environment variables in Vercel:
   ```
   NEXT_PUBLIC_API_URL=https://your-backend-url.onrender.com/api
   NEXT_PUBLIC_ENABLE_POLLING=true
   ```
   
   **Note**: You'll get the backend URL after deploying to Render (Step 3)

5. **Deploy**
   - Click "Deploy"
   - Wait for the build to complete
   - Your frontend will be available at `https://your-project.vercel.app`

### Step 3: Update Backend URL
After deploying the backend (see below), return to Vercel:
1. Go to Project Settings → Environment Variables
2. Update `NEXT_PUBLIC_API_URL` with your actual Render backend URL
3. Redeploy the frontend

## Backend Deployment (Render)

### Step 1: Deploy to Render

1. **Go to Render Dashboard**
   - Visit [dashboard.render.com](https://dashboard.render.com)
   - Click "New +" → "Web Service"

2. **Connect Repository**
   - Connect your Git provider
   - Select your `rapidcare` repository
   - Click "Connect"

3. **Configure Service**
   - **Name**: `rapidcare-backend`
   - **Root Directory**: `back-end`
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`

4. **Environment Variables**
   Add these environment variables in Render:
   ```
   NODE_ENV=production
   PORT=10000
   JWT_SECRET=your-super-secure-jwt-secret-change-this-32-chars-min
   FRONTEND_URL=https://your-project.vercel.app
   ```

5. **Deploy**
   - Click "Create Web Service"
   - Wait for the build and deployment to complete
   - Your API will be available at `https://your-service.onrender.com`

### Step 2: Update Frontend Configuration
1. Copy your Render backend URL
2. Go back to Vercel project settings
3. Update `NEXT_PUBLIC_API_URL` environment variable
4. Redeploy frontend

## Post-Deployment Verification

### Test Frontend
1. Visit your Vercel URL
2. Check that the app loads correctly
3. Test user registration and login
4. Verify hospital search functionality

### Test Backend
1. Visit `https://your-backend.onrender.com/api/health`
2. Should return a JSON health status
3. Test API endpoints with a tool like Postman

### Test Integration
1. Try registering a new user from the frontend
2. Test hospital search and booking functionality
3. Verify that frontend and backend communicate properly

## Troubleshooting

### Common Vercel Issues

#### "No Next.js version detected"
**Cause**: Root directory not set correctly
**Solution**: 
1. Go to Vercel Project Settings → General
2. Set Root Directory to `front-end`
3. Redeploy

#### Build Failures
**Solution**:
1. Check build locally: `cd front-end && npm run build`
2. Ensure all dependencies are in `package.json`
3. Check Vercel build logs for specific errors

#### Environment Variables Not Working
**Solution**:
1. Ensure variables start with `NEXT_PUBLIC_` for client-side access
2. Check variable names are exactly correct (case-sensitive)
3. Redeploy after changing environment variables

### Common Render Issues

#### Service Won't Start
**Solution**:
1. Check that `back-end/package.json` has correct start script
2. Verify all required environment variables are set
3. Check Render logs for specific errors

#### better-sqlite3 Build Errors (Node.js/Python Issues)
**Cause**: `better-sqlite3` requires Python and build tools to compile native binaries
**Solutions**:
1. **Automatic**: The app will fallback to `sqlite3` if `better-sqlite3` fails
2. **Manual Fix**: In Render dashboard, try these environment variables:
   ```
   PYTHON=/usr/bin/python3
   ```
3. **Alternative**: Use the provided Dockerfile which includes Python

#### Database Issues
**Solution**:
1. Ensure SQLite database is created on startup
2. Check migration logs in Render console
3. Verify file permissions for database file

#### CORS Errors
**Solution**:
1. Ensure `FRONTEND_URL` matches your Vercel URL exactly
2. Check that CORS is configured in backend
3. Verify no trailing slashes in URLs

## Environment Variables Reference

### Frontend (Vercel)
| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Yes | Backend API URL | `https://rapidcare-backend.onrender.com/api` |
| `NEXT_PUBLIC_ENABLE_POLLING` | No | Enable real-time updates | `true` |
| `NEXT_PUBLIC_APP_VERSION` | No | App version | `1.0.0` |

### Backend (Render)
| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `NODE_ENV` | Yes | Environment | `production` |
| `PORT` | Yes | Server port | `10000` |
| `JWT_SECRET` | Yes | JWT signing secret (32+ chars) | `your-super-secure-secret-32-chars-minimum` |
| `FRONTEND_URL` | Yes | Frontend URL for CORS | `https://rapidcare.vercel.app` |
| `SEED_DATA` | No | Seed sample data | `false` |

## Deployment Checklist

- [ ] Code pushed to Git repository
- [ ] Backend deployed to Render with correct environment variables
- [ ] Frontend deployed to Vercel with Root Directory set to `front-end`
- [ ] Frontend environment variables updated with backend URL
- [ ] Both services are accessible via their URLs
- [ ] Health checks pass (`/api/health` endpoints)
- [ ] User registration and login work
- [ ] Hospital search and booking functionality work
- [ ] No CORS errors in browser console

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review deployment logs in Vercel/Render dashboards
3. Test locally first: `npm run dev` in both directories
4. Ensure all environment variables are set correctly

## Production Considerations

### Security
- Use strong JWT secrets (32+ characters)
- Enable HTTPS (automatic on Vercel/Render)
- Regularly update dependencies

### Performance
- Monitor response times
- Consider upgrading Render plan for better performance
- Use Vercel Analytics for frontend monitoring

### Maintenance
- Regularly backup database (if using persistent storage)
- Monitor error logs
- Keep dependencies updated
- Test deployments in staging environment first