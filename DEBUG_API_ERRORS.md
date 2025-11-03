# Debugging API Errors - "V" Error Fix

Your frontend is correctly connecting to `https://rapidcare-backend.onrender.com/api`, but requests are failing with error "V" (minified error).

## What I've Done

1. ✅ Added enhanced error logging - will show full error details
2. ✅ Backend health check works: https://rapidcare-backend.onrender.com/api/health

## Next Steps to Debug

### Step 1: Check Browser Console After Redeploy

After the new deployment completes (with enhanced logging):

1. **Open:** https://rapidcare.vercel.app
2. **Open Developer Tools** (F12)
3. **Go to Console tab**
4. **Look for:** `🔴 API Error Details:`
5. **Check these fields:**
   - `message` - What's the actual error message?
   - `code` - Error code (ECONNREFUSED, NETWORK_ERROR, etc.)
   - `status` - HTTP status code (404, 500, etc.)
   - `statusText` - HTTP status text
   - `data` - Backend error response

### Step 2: Check Network Tab

1. **Open Developer Tools** (F12)
2. **Go to "Network" tab**
3. **Clear the log** (🚫 icon)
4. **Try to login or load a page**
5. **Click on a failed request** (red status)
6. **Check:**
   - **Status Code:** What HTTP status? (200, 404, 500, etc.)
   - **Headers:** Check Response Headers for CORS errors
   - **Response:** What does the backend return?

### Common Issues Based on Error Code

#### If `code: "ERR_NETWORK"` or `ECONNREFUSED`
- Backend might be sleeping (Render free tier sleeps after inactivity)
- **Fix:** First request might take 30-60 seconds to wake up backend
- **Test:** Visit https://rapidcare-backend.onrender.com/api/health first

#### If `status: 404`
- Backend route doesn't exist
- **Check:** Is the route `/api/hospitals` or `/hospitals`?
- **Fix:** Update backend routes

#### If `status: 500`
- Backend server error
- **Check:** Render logs for backend errors
- **Fix:** Backend needs debugging

#### If `status: 0` or `CORS error`
- CORS (Cross-Origin Resource Sharing) issue
- **Fix:** Update backend CORS settings (see below)

#### If `status: 401`
- Authentication required
- **Fix:** This is normal for protected routes - need to login first

### Step 3: Check Backend CORS

The backend uses basic CORS (`app.use(cors())`) which should allow all origins. But let's verify:

1. **Check backend code:** `back-end/index.js` line 11
   ```javascript
   app.use(cors());
   ```
   This should allow all origins ✅

2. **If you want specific CORS:**
   ```javascript
   app.use(cors({
     origin: process.env.FRONTEND_URL || 'https://rapidcare.vercel.app',
     credentials: true
   }));
   ```

3. **Set FRONTEND_URL in Render:**
   - Go to Render Dashboard → Your service → Environment
   - Add: `FRONTEND_URL` = `https://rapidcare.vercel.app`
   - Redeploy backend

### Step 4: Check Render Backend Logs

1. **Go to Render Dashboard:** https://dashboard.render.com
2. **Click on "rapidcare-backend"**
3. **Click "Logs" tab**
4. **Look for:**
   - Error messages
   - Request logs
   - Database errors

### Step 5: Test Specific Endpoints

Test these endpoints directly in your browser:

1. **Health:** https://rapidcare-backend.onrender.com/api/health
   - ✅ Should work (you already tested this)

2. **Hospitals:** https://rapidcare-backend.onrender.com/api/hospitals
   - Check if this works

3. **Login:** https://rapidcare-backend.onrender.com/api/auth/login
   - Check CORS/preflight (might need Postman/curl to test POST)

### Step 6: Check for Render Free Tier Sleep

Render free tier services sleep after 15 minutes of inactivity.

**Symptoms:**
- First request takes 30-60 seconds
- Subsequent requests are fast
- Error might appear then succeed on retry

**Solution:**
- First request after sleep will be slow - this is normal
- Consider upgrading to paid tier for always-on service

## Quick Test Commands

### Test backend from terminal:
```bash
# Health check
curl https://rapidcare-backend.onrender.com/api/health

# Get hospitals (should return JSON)
curl https://rapidcare-backend.onrender.com/api/hospitals

# Test CORS headers
curl -H "Origin: https://rapidcare.vercel.app" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     https://rapidcare-backend.onrender.com/api/hospitals -v
```

## After Getting Error Details

Once you see the `🔴 API Error Details:` in console:

1. **Share the details** with me
2. I'll help fix the specific issue

## Most Likely Issues (in order)

1. 🔴 **Backend sleeping** (Render free tier) - First request slow
2. 🔴 **CORS issue** - Need to update backend CORS
3. 🔴 **Backend route mismatch** - Route doesn't exist
4. 🔴 **Network timeout** - Backend too slow to respond
5. 🔴 **Backend error** - Check Render logs

## Temporary Workaround

While debugging, you can test if it's a timing issue:

1. **Open backend health first:** https://rapidcare-backend.onrender.com/api/health
2. **Wait 2-3 seconds** (wakes up backend)
3. **Then try your frontend** - might work better

