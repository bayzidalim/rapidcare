# Troubleshoot Frontend-Backend Connection

Your `NEXT_PUBLIC_API_URL` is set, but the frontend still isn't connecting to the backend. Follow these steps:

## Step 1: Verify Environment Variable in Vercel

1. **Go to Vercel Dashboard:** https://vercel.com/dashboard
2. **Select your project** (rapidcare)
3. **Click "Settings"** → **"Environment Variables"**
4. **Verify the following:**
   - **Name:** `NEXT_PUBLIC_API_URL` (must be EXACT, case-sensitive)
   - **Value:** `https://rapidcare-backend.onrender.com/api` (must end with `/api`)
   - **Environment:** Should include at least "Production"
   - ✅ Check if it shows for "Production", "Preview", and "Development"

5. **If it's wrong or missing:**
   - **Edit** the existing one OR **Add New**
   - Set exactly: `https://rapidcare-backend.onrender.com/api`
   - Select all environments: Production, Preview, Development
   - **Save**

## Step 2: Force Redeploy After Environment Variable Change

**IMPORTANT:** Environment variables only apply to NEW deployments!

1. **Go to "Deployments" tab** in Vercel
2. **Click the "..." (three dots)** on the latest deployment
3. **Click "Redeploy"**
4. **Leave "Use existing Build Cache" unchecked** (to ensure env vars are picked up)
5. **Click "Redeploy"**
6. **Wait for deployment to complete** (2-3 minutes)

## Step 3: Test Backend Directly

Verify your backend is accessible:

1. **Open:** https://rapidcare-backend.onrender.com/api/health
   - Should return JSON like: `{"status":"ok"}`
   - If this fails, your backend is down

2. **Test login endpoint:**
   - Open browser console (F12)
   - Go to Network tab
   - Try to login on your frontend
   - Look for the API request URL
   - Should show: `https://rapidcare-backend.onrender.com/api/auth/login`

## Step 4: Check Browser Console for Errors

1. **Open your live site:** https://rapidcare.vercel.app/login
2. **Open Developer Tools** (F12)
3. **Go to "Console" tab**
4. **Try to login**
5. **Look for errors:**

### Common Errors:

**❌ CORS Error:**
```
Access to XMLHttpRequest at 'https://rapidcare-backend.onrender.com/api/...' from origin 'https://rapidcare.vercel.app' has been blocked by CORS policy
```
**Fix:** Update backend CORS (see Step 5)

**❌ Network Error / Failed to fetch:**
```
Failed to fetch
NetworkError when attempting to fetch resource
```
**Possible causes:**
- Backend is down
- Wrong URL
- Network issue

**❌ 404 Not Found:**
```
GET https://rapidcare-backend.onrender.com/api/auth/login 404
```
**Fix:** Check backend URL ends with `/api`

**❌ Still using localhost:**
```
GET http://localhost:5000/api/auth/login
```
**Fix:** Environment variable not set correctly (go back to Step 1)

## Step 5: Update Backend CORS (If Needed)

If you see CORS errors, update the backend:

1. **Go to Render Dashboard:** https://dashboard.render.com
2. **Click on "rapidcare-backend" service**
3. **Go to "Environment" tab**
4. **Add/Update:** `FRONTEND_URL`
   - **Value:** `https://rapidcare.vercel.app`
   - **Important:** No trailing slash!
5. **Save** (backend will auto-redeploy)

Then update the backend code if it uses FRONTEND_URL:

1. **Check:** `back-end/index.js` line 11
2. **Should be:** `app.use(cors());` (allows all origins - this is fine)
3. **OR if you want specific CORS:**
   ```javascript
   app.use(cors({
     origin: process.env.FRONTEND_URL || '*',
     credentials: true
   }));
   ```

## Step 6: Verify API Calls in Network Tab

1. **Open your site:** https://rapidcare.vercel.app
2. **Open Developer Tools** (F12)
3. **Go to "Network" tab**
4. **Clear the network log** (🚫 icon)
5. **Try to login**
6. **Look for requests:**
   - Should see requests to: `rapidcare-backend.onrender.com`
   - Should NOT see requests to: `localhost:5000`
   - Check the "Request URL" column

**If you see `localhost:5000`:**
- Environment variable is not being used
- Need to redeploy (Step 2)

## Step 7: Hard Refresh Your Browser

Sometimes the browser caches the old code:

1. **Windows/Linux:** `Ctrl + Shift + R`
2. **Mac:** `Cmd + Shift + R`
3. **Or:** Clear browser cache

## Step 8: Check Deployment Logs

1. **Go to Vercel Dashboard** → Your Project → **"Deployments"**
2. **Click on the latest deployment**
3. **Check the build logs:**
   - Look for any errors
   - Check if environment variables are being read

## Quick Debug Checklist

✅ `NEXT_PUBLIC_API_URL` is set to `https://rapidcare-backend.onrender.com/api`  
✅ Value ends with `/api` (not `/api/`)  
✅ Redeployed AFTER setting the environment variable  
✅ Backend is accessible: https://rapidcare-backend.onrender.com/api/health  
✅ Browser console shows requests to `rapidcare-backend.onrender.com` (not localhost)  
✅ No CORS errors in browser console  
✅ Hard refreshed the browser  

## Still Not Working?

### Option 1: Add Debug Logging

Temporarily add this to see what URL is being used:

1. **Edit:** `front-end/src/lib/api.ts`
2. **Add after line 4:**
   ```typescript
   console.log('API_BASE_URL:', API_BASE_URL);
   ```
3. **Commit and push** to see the actual URL in browser console

### Option 2: Contact Support

If all else fails:
1. Screenshot your Vercel environment variables
2. Screenshot browser console errors
3. Screenshot Network tab showing the failed request
4. Share these for further debugging

## Most Common Issue

**95% of the time, it's one of these:**
1. ❌ Environment variable not redeployed (Step 2)
2. ❌ Wrong value (missing `/api` at end)
3. ❌ Browser cache (hard refresh needed)

**Double-check these three things first!**

