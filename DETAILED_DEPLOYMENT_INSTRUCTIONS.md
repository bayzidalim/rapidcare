# 🚀 Complete Deployment Guide: Vercel + Render

**Your Repository:** https://github.com/bayzidalim/rapidcare.git

---

# 📦 PART 1: Deploy Backend on Render (15-20 minutes)

## Why Render?
- ✅ Free tier with 750 hours/month
- ✅ Persistent disk storage for SQLite
- ✅ Automatic HTTPS
- ✅ Auto-deploy from GitHub
- ✅ Easy environment variables management

---

## Step 1.1: Create Render Account

1. **Open your browser** and go to: **https://render.com**

2. **Click "Get Started for Free"** (top right corner)

3. **Sign up with GitHub:**
   - Click **"Sign up with GitHub"**
   - Enter your GitHub credentials if prompted
   - Click **"Authorize Render"** when asked
   - ✅ You're now logged into Render!

---

## Step 1.2: Create New Web Service

1. **After login**, you'll see the Render Dashboard

2. **Click the "New +" button** (top right, blue button)

3. **Select "Web Service"** from the dropdown menu

4. You'll see a page titled "Create a new Web Service"

---

## Step 1.3: Connect Your GitHub Repository

### If this is your first time:

1. **Click "Connect account"** under GitHub section

2. **A popup will open** - Click **"Install Render"**

3. **Choose repository access:**
   - Select **"Only select repositories"**
   - Find and check **"rapidcare"** (or your repository name)
   - Click **"Install"**

4. **You'll be redirected back** to Render

### If you've already connected GitHub:

1. You'll see a list of your repositories

2. **Find "rapidcare"** in the list

3. **Click "Connect"** button next to it

---

## Step 1.4: Configure Backend Service Settings

Now you'll see a configuration form. Fill it out **EXACTLY** as follows:

### Basic Settings:

| Field | What to Enter | Example |
|-------|---------------|---------|
| **Name** | `rapidcare-backend` | (or any name you prefer) |
| **Region** | Select closest to you | `Oregon (US West)` or `Frankfurt (EU)` |
| **Branch** | `main` | (or `master` if that's your branch) |
| **Root Directory** | `back-end` | ⚠️ IMPORTANT: Exact spelling! |
| **Runtime** | Select `Node` | Should auto-detect |
| **Build Command** | `npm install && npm run migrate` | ⚠️ Copy this exactly! |
| **Start Command** | `npm start` | Should auto-fill |

### Important Notes:
- ⚠️ **Root Directory is CRITICAL** - must be exactly `back-end`
- The build command runs migrations automatically
- Don't change the start command

---

## Step 1.5: Select Free Plan

1. **Scroll down** to "Instance Type" section

2. **Click on "Free"** plan
   - Shows: `$0/month`
   - 512 MB RAM
   - Shared CPU
   - Sleeps after 15 min of inactivity

3. **This is perfect for your project!** ✅

---

## Step 1.6: Add Environment Variables

**CRITICAL STEP!** Scroll down to "Environment Variables" section.

### Click "Add Environment Variable" and add each of these:

#### Variable 1: NODE_ENV
```
Key: NODE_ENV
Value: production
```

#### Variable 2: JWT_SECRET
```
Key: JWT_SECRET
Value: RapidCare2024SecureJWTSecretKeyForProductionDeployment!@#$%^&*()
```
**Note:** This is a secure 64-character secret. You can use this or generate your own.

#### Variable 3: PORT
```
Key: PORT
Value: 10000
```
**Note:** Render uses port 10000 by default for free tier.

#### Variable 4: FRONTEND_URL
```
Key: FRONTEND_URL
Value: *
```
**Note:** We'll update this later with your Vercel URL. The `*` allows all origins temporarily.

#### Variable 5: DATABASE_URL
```
Key: DATABASE_URL
Value: ./database.sqlite
```
**Note:** This tells the app to use SQLite in the current directory.

#### Variable 6: SEED_DATA (Optional)
```
Key: SEED_DATA
Value: false
```
**Note:** Set to `true` if you want sample data on first deploy.

### Your environment variables should look like this:
```
NODE_ENV = production
JWT_SECRET = RapidCare2024SecureJWTSecretKeyForProductionDeployment!@#$%^&*()
PORT = 10000
FRONTEND_URL = *
DATABASE_URL = ./database.sqlite
SEED_DATA = false
```

---

## Step 1.7: Deploy Backend

1. **Double-check all settings** (scroll up to verify)

2. **Click "Create Web Service"** button at the bottom

3. **Deployment starts automatically!** 🚀

4. **You'll see the deployment logs** streaming in real-time:
   ```
   ==> Cloning from https://github.com/bayzidalim/rapidcare...
   ==> Checking out commit...
   ==> Installing dependencies...
   ==> Running build command...
   ==> Starting service...
   ```

5. **Wait for completion** (5-10 minutes first time)
   - You'll see: `✅ Your service is live`
   - Status will change from "Building" to "Live"

---

## Step 1.8: Save Your Backend URL

1. **Look at the top of the page** - you'll see your service URL

2. **It looks like:** `https://rapidcare-backend-xyz.onrender.com`
   - The `xyz` part is random characters Render assigns

3. **COPY THIS URL!** Write it down somewhere safe:
   ```
   Backend URL: https://______________________________________.onrender.com
   ```

4. **Test your backend:**
   - Open a new browser tab
   - Go to: `https://[YOUR-URL].onrender.com/api/health`
   - You should see: `{"status":"OK","message":"RapidCare API is running"...}`
   - ✅ If you see this, backend is working perfectly!

---

## Step 1.9: Verify Backend Deployment

### Check the Logs:
1. Click **"Logs"** tab in Render dashboard
2. You should see:
   ```
   Database tables created successfully
   ✅ Admin balance initialized successfully
   Server running on port 10000
   ```

### Test API Endpoints:
Open these URLs in your browser (replace with your actual URL):

1. **Health Check:**
   ```
   https://[YOUR-URL].onrender.com/api/health
   ```
   Should return: `{"status":"OK"...}`

2. **Hospitals List:**
   ```
   https://[YOUR-URL].onrender.com/api/hospitals
   ```
   Should return: List of hospitals or empty array

✅ **Backend deployment complete!** Now let's deploy the frontend.

---

# 🎨 PART 2: Deploy Frontend on Vercel (10-15 minutes)

## Why Vercel?
- ✅ Made specifically for Next.js (your frontend framework)
- ✅ Unlimited bandwidth
- ✅ Global CDN for fast loading
- ✅ Automatic HTTPS
- ✅ Zero configuration needed
- ✅ Perfect for React/Next.js apps

---

## Step 2.1: Create Vercel Account

1. **Open your browser** and go to: **https://vercel.com**

2. **Click "Start Deploying"** or **"Sign Up"** (top right)

3. **Sign up with GitHub:**
   - Click **"Continue with GitHub"**
   - Enter your GitHub credentials if prompted
   - Click **"Authorize Vercel"** when asked
   - ✅ You're now logged into Vercel!

---

## Step 2.2: Import Your Project

1. **You'll see the Vercel Dashboard**

2. **Click "Add New..."** button (top right)

3. **Select "Project"** from dropdown

4. **You'll see "Import Git Repository" page**

---

## Step 2.3: Select Your Repository

### If this is your first time:

1. **Click "Add GitHub Account"** or "Import Git Repository"

2. **A popup will open** - Click **"Install Vercel"**

3. **Choose repository access:**
   - Select **"Only select repositories"**
   - Find and check **"rapidcare"** (your repository)
   - Click **"Install"**

4. **You'll be redirected back** to Vercel

### If you've already connected GitHub:

1. **You'll see a list** of your repositories

2. **Find "rapidcare"** (you can use the search box)

3. **Click "Import"** button next to it

---

## Step 2.4: Configure Project Settings

You'll now see "Configure Project" page.

### Framework Preset:
- **Vercel will auto-detect:** `Next.js`
- ✅ This is correct - don't change it!

### Root Directory:
**IMPORTANT:** You need to change this!

1. **Click "Edit"** button next to "Root Directory"

2. **In the input field, type:** `front-end`
   - ⚠️ Exact spelling: `front-end` (with hyphen)
   - ⚠️ No leading or trailing spaces

3. **Click "Continue"**

### Build and Output Settings:
These should auto-fill correctly:
- **Build Command:** `npm run build` ✅
- **Output Directory:** `.next` ✅
- **Install Command:** `npm install` ✅

✅ **Don't change these** - they're perfect!

---

## Step 2.5: Add Environment Variable

**CRITICAL STEP!** Scroll down to "Environment Variables" section.

1. **Click to expand** "Environment Variables" if collapsed

2. **You'll see three fields:** Name, Value, and Environment

### Add Your Backend URL:

**In the "Name" field, type:**
```
NEXT_PUBLIC_API_URL
```
⚠️ **IMPORTANT:** Must start with `NEXT_PUBLIC_` and be EXACT!

**In the "Value" field, enter:**
```
https://[YOUR-BACKEND-URL].onrender.com/api
```

**Replace `[YOUR-BACKEND-URL]` with the actual URL from Step 1.8!**

**Example:**
```
Name: NEXT_PUBLIC_API_URL
Value: https://rapidcare-backend-xyz.onrender.com/api
```

**CRITICAL NOTES:**
- ⚠️ Must end with `/api`
- ⚠️ No trailing slash after `/api`
- ⚠️ Must be your exact Render URL
- ⚠️ Must include `https://`

3. **Environment selection:** Leave as "Production" (default)

4. **Click "Add"** button

✅ You should now see your environment variable listed!

---

## Step 2.6: Deploy Frontend

1. **Double-check everything:**
   - ✅ Root Directory: `front-end`
   - ✅ Framework: Next.js
   - ✅ Environment variable added with `/api` at end

2. **Click "Deploy"** button at the bottom

3. **Deployment starts!** 🚀

4. **You'll see the build process:**
   ```
   Building...
   Cloning repository...
   Installing dependencies...
   Running build command...
   Deploying...
   ```

5. **Watch the logs** - it's satisfying! 😊

6. **Wait for completion** (3-5 minutes)

---

## Step 2.7: Celebrate Your Deployment! 🎉

When deployment completes, you'll see:

### Congratulations Screen! 🎊
- Large confetti animation
- "Congratulations!" message
- Your deployed URL
- Preview of your website

### Your Website URL:
You'll see something like:
```
https://rapidcare-abc123.vercel.app
```
or
```
https://your-project-name.vercel.app
```

**SAVE THIS URL!** Write it down:
```
Frontend URL: https://______________________________________.vercel.app
```

---

## Step 2.8: Test Your Frontend

1. **Click "Visit"** button or copy the URL

2. **Your website opens!** 🎉

3. **You should see:**
   - RapidCare homepage
   - Navigation menu
   - Hospital listings
   - Login/Register buttons

4. **Test the features:**
   - Click "Register" and create an account
   - Try logging in
   - View hospitals list
   - Navigate to different pages

✅ **If everything loads, frontend is working!**

---

# 🔄 PART 3: Connect Frontend and Backend (5 minutes)

Now we need to update the backend to recognize your frontend URL.

## Step 3.1: Update Backend FRONTEND_URL

1. **Go back to Render Dashboard:** https://dashboard.render.com

2. **Click on your "rapidcare-backend" service**

3. **Click "Environment"** tab in the left sidebar

4. **Find the "FRONTEND_URL" variable**

5. **Click "Edit"** (pencil icon) next to it

6. **Change the value from `*` to your Vercel URL:**
   ```
   https://your-project-name.vercel.app
   ```
   ⚠️ **Important:** 
   - Use your EXACT Vercel URL
   - No trailing slash!
   - Include `https://`

7. **Click "Save Changes"**

8. **Backend will automatically redeploy** (1-2 minutes)
   - You'll see "Deploying..." status
   - Wait for it to show "Live" again

---

## Step 3.2: Test Everything Together

### Open your Vercel website and test:

1. **Register a new user:**
   - Click "Register"
   - Fill in the form
   - Submit
   - ✅ Should redirect to login or dashboard

2. **Login:**
   - Enter your credentials
   - Click "Login"
   - ✅ Should redirect to dashboard

3. **View Hospitals:**
   - Navigate to "Hospitals"
   - ✅ Should see list of hospitals

4. **Make a Booking:**
   - Select a hospital
   - Book a resource
   - ✅ Should create booking successfully

5. **Submit a Review** (if you have completed bookings):
   - Go to "My Bookings"
   - Click "Review" on completed booking
   - ✅ Should submit review

### If everything works: 🎉 **DEPLOYMENT SUCCESSFUL!**

---

# 📊 PART 4: Monitor Your Deployments

## Render Dashboard

**URL:** https://dashboard.render.com

### What you can do:
- ✅ View deployment logs
- ✅ Check service status
- ✅ Monitor resource usage
- ✅ Update environment variables
- ✅ View metrics and analytics

### Useful Tabs:
- **Events:** See deployment history
- **Logs:** Real-time server logs
- **Metrics:** CPU, Memory usage
- **Environment:** Manage variables
- **Settings:** Service configuration

## Vercel Dashboard

**URL:** https://vercel.com/dashboard

### What you can do:
- ✅ View deployment history
- ✅ Check build logs
- ✅ Monitor performance
- ✅ Update environment variables
- ✅ Configure domains

### Useful Sections:
- **Deployments:** See all deploys
- **Analytics:** Usage statistics
- **Settings:** Environment variables, domains
- **Logs:** Function execution logs

---

# 🎯 Your Deployment URLs

Save these important URLs:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🌐 YOUR LIVE APPLICATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Frontend (Website):
https://__________________________________.vercel.app

Backend (API):
https://__________________________________.onrender.com

API Endpoint:
https://__________________________________.onrender.com/api

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 DASHBOARDS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Render Dashboard:
https://dashboard.render.com

Vercel Dashboard:
https://vercel.com/dashboard

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💾 SOURCE CODE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

GitHub Repository:
https://github.com/bayzidalim/rapidcare.git

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

# 🚨 Troubleshooting Common Issues

## Issue 1: Backend Returns 504 Timeout

**Problem:** First request takes very long or times out

**Cause:** Render free tier sleeps after 15 minutes of inactivity

**Solution:** 
- ✅ Wait 30-60 seconds for backend to wake up
- ✅ Refresh the page
- ✅ First request is always slow, subsequent requests are fast

**Prevent this:** Use UptimeRobot (free) to ping every 5 minutes

---

## Issue 2: CORS Error in Browser Console

**Problem:** Browser shows "CORS policy" error

**Cause:** Frontend URL not configured correctly in backend

**Solution:**
1. Go to Render Dashboard
2. Click your backend service
3. Go to "Environment" tab
4. Check `FRONTEND_URL` matches your Vercel URL exactly
5. Should be: `https://your-project.vercel.app` (no trailing slash)
6. Save and wait for redeploy

---

## Issue 3: Frontend Can't Connect to Backend

**Problem:** "Network Error" or "API Connection Failed"

**Cause:** Wrong API URL in frontend environment variable

**Solution:**
1. Go to Vercel Dashboard
2. Click your project
3. Go to "Settings" → "Environment Variables"
4. Check `NEXT_PUBLIC_API_URL` value
5. Must be: `https://your-backend.onrender.com/api`
6. Must end with `/api`
7. Must not have trailing slash after `/api`
8. Save and redeploy: Deployments → Latest → Menu → Redeploy

---

## Issue 4: "Module not found" Error

**Problem:** Build fails with missing module error

**Cause:** Wrong root directory or dependencies not installed

**Solution for Backend (Render):**
1. Check Root Directory is exactly `back-end`
2. Check Build Command is `npm install && npm run migrate`
3. Redeploy service

**Solution for Frontend (Vercel):**
1. Check Root Directory is exactly `front-end`
2. Check Build Command is `npm run build`
3. Redeploy

---

## Issue 5: Database Not Working

**Problem:** No hospitals showing, bookings fail

**Cause:** Migrations didn't run or database not persisted

**Solution:**
1. Check Render logs for migration errors
2. Verify `DATABASE_URL=./database.sqlite`
3. Make sure build command includes `npm run migrate`
4. Redeploy service

---

## Issue 6: Environment Variables Not Working

**Problem:** App behaves as if variables aren't set

**Cause:** Variables not set correctly or need redeploy

**Solution for Backend (Render):**
1. Go to Environment tab
2. Check all variables are set (see Step 1.6)
3. Each value should have no extra spaces
4. Save changes
5. Service will auto-redeploy

**Solution for Frontend (Vercel):**
1. Go to Settings → Environment Variables
2. Check `NEXT_PUBLIC_API_URL` is set
3. Must start with `NEXT_PUBLIC_`
4. Save changes
5. Go to Deployments → Click latest → Redeploy

---

# 💡 Pro Tips

## 1. Keep Backend Awake (Highly Recommended!)

**Use UptimeRobot (100% Free):**

1. Go to https://uptimerobot.com
2. Sign up (free account)
3. Add New Monitor:
   - Type: HTTP(s)
   - URL: `https://your-backend.onrender.com/api/health`
   - Interval: 5 minutes
4. Save
5. ✅ Your backend will NEVER sleep!

## 2. Custom Domain (Optional)

### For Frontend (Vercel):
1. Buy a domain (Namecheap, GoDaddy, etc.)
2. In Vercel: Settings → Domains
3. Add your domain
4. Follow DNS instructions
5. ✅ Your site will be at your custom domain!

### For Backend (Render):
- Free tier doesn't support custom domains
- Upgrade to paid tier if needed

## 3. Monitor Performance

### Vercel Analytics:
- Automatically tracks page views
- Shows Core Web Vitals
- Free for hobby projects

### Render Metrics:
- CPU and Memory usage
- Response times
- Request counts

## 4. View Logs

**Backend Logs (Render):**
- Dashboard → Service → Logs tab
- Real-time server logs
- Search and filter available

**Frontend Logs (Vercel):**
- Dashboard → Project → Deployments
- Click deployment → View Function Logs
- Shows runtime errors

## 5. Rollback Deployments

**Render:**
- Events tab → Find previous deploy
- Click "Redeploy"

**Vercel:**
- Deployments → Find old deploy
- Click Menu → "Promote to Production"

---

# 🎊 Congratulations!

You've successfully deployed a full-stack application!

## What You Achieved:

✅ **Backend API** - Node.js + Express + SQLite on Render  
✅ **Frontend** - Next.js + TypeScript on Vercel  
✅ **Database** - SQLite with persistent storage  
✅ **Authentication** - JWT-based secure login  
✅ **HTTPS** - Automatic SSL certificates  
✅ **Auto-Deploy** - GitHub integration  
✅ **Environment** - Production-ready configuration  
✅ **Monitoring** - Dashboard access  

## Your Stack:

```
Frontend:  Next.js 14 + TypeScript + TailwindCSS
Backend:   Node.js + Express.js
Database:  SQLite
Auth:      JWT
Hosting:   Vercel (Frontend) + Render (Backend)
Cost:      $0.00/month (100% FREE!)
```

## Share Your Work:

📱 **Add to your portfolio**  
💼 **Update your resume**  
🔗 **Share on LinkedIn**  
📝 **Update GitHub README**  
👥 **Show friends and family**  

---

# 📞 Need More Help?

### Resources:
- **Render Docs:** https://render.com/docs
- **Vercel Docs:** https://vercel.com/docs
- **Next.js Docs:** https://nextjs.org/docs

### Support:
- Check deployment logs first
- Review this troubleshooting section
- Search Render/Vercel documentation
- Ask in their community forums

---

**You did it! Your RapidCare application is now live on the internet!** 🚀🎉

**Deployment Date:** _______________  
**Frontend URL:** _______________  
**Backend URL:** _______________  

**Enjoy your deployed application!** 💪

