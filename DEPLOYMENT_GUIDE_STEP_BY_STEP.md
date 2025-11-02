# 🚀 Step-by-Step Deployment Guide for RapidCare

**Your code is already on GitHub! Let's deploy it now.** 🎉

---

## 📋 What You'll Get:
- ✅ **Backend API** deployed on Render (Free)
- ✅ **Frontend Website** deployed on Vercel (Free)
- ✅ **100% Free Hosting** with HTTPS
- ✅ **Auto-deploy** on every push to GitHub

---

## 🎯 STEP 1: Deploy Backend on Render (15 minutes)

### 1.1 Create Render Account
1. Go to **[https://render.com](https://render.com)**
2. Click **"Get Started"**
3. Sign up with **GitHub** (easiest option)
4. Authorize Render to access your repositories

### 1.2 Create New Web Service
1. After logging in, click **"New +"** button (top right)
2. Select **"Web Service"**
3. Connect your GitHub repository:
   - Click **"Connect account"** if needed
   - Find and select your **`instant-hospitalization`** repository
   - Click **"Connect"**

### 1.3 Configure Backend Service
Fill in these settings:

| Field | Value |
|-------|-------|
| **Name** | `rapidcare-backend` (or any name you like) |
| **Region** | Choose closest to you (e.g., Oregon, Frankfurt) |
| **Branch** | `main` (or `master` if that's your branch name) |
| **Root Directory** | `back-end` |
| **Runtime** | Node |
| **Build Command** | `npm install && npm run migrate` |
| **Start Command** | `npm start` |
| **Plan** | **Free** ⚠️ IMPORTANT: Select "Free" |

### 1.4 Add Environment Variables
Scroll down to **"Environment Variables"** section and add these:

Click **"Add Environment Variable"** for each:

1. **NODE_ENV**
   - Value: `production`

2. **JWT_SECRET**
   - Value: `RapidCare2024SecureJWTSecretKeyForProductionDeployment!@#$%^&*()` 
   - (Or generate your own 50+ character random string)

3. **PORT**
   - Value: `10000`

4. **FRONTEND_URL**
   - Value: `*` (we'll update this later with Vercel URL)

5. **DATABASE_URL**
   - Value: `./database.sqlite`

### 1.5 Deploy Backend
1. Click **"Create Web Service"** button at the bottom
2. Wait for deployment (5-10 minutes)
3. ⏳ You'll see logs... wait for "✅ Deploy successful"
4. 📝 **IMPORTANT:** Copy your backend URL (looks like: `https://rapidcare-backend-xyz.onrender.com`)
   - Save this URL somewhere - you'll need it for frontend!

### 1.6 Test Backend
1. Visit: `https://your-backend-url.onrender.com/api/health`
2. You should see: `{"status":"OK","message":"RapidCare API is running"...}`
3. ✅ If you see this, backend is working!

---

## 🎨 STEP 2: Deploy Frontend on Vercel (10 minutes)

### 2.1 Create Vercel Account
1. Go to **[https://vercel.com](https://vercel.com)**
2. Click **"Start Deploying"** or **"Sign Up"**
3. Sign up with **GitHub** (same account as Render)
4. Authorize Vercel to access your repositories

### 2.2 Import Your Project
1. After logging in, click **"Add New..."** → **"Project"**
2. Find your **`instant-hospitalization`** repository
3. Click **"Import"**

### 2.3 Configure Frontend Settings
Fill in these settings:

| Field | Value |
|-------|-------|
| **Framework Preset** | Next.js (should auto-detect) |
| **Root Directory** | Click **"Edit"** → Enter `front-end` → Click **"Continue"** |
| **Build Command** | `npm run build` (auto-filled) |
| **Output Directory** | `.next` (auto-filled) |
| **Install Command** | `npm install` (auto-filled) |

### 2.4 Add Environment Variable
1. Expand **"Environment Variables"** section
2. Click **"Add"**
3. Enter:
   - **Name:** `NEXT_PUBLIC_API_URL`
   - **Value:** `https://your-backend-url.onrender.com/api`
   - ⚠️ **IMPORTANT:** Replace `your-backend-url` with your actual Render URL from Step 1.5
   - ⚠️ **IMPORTANT:** Add `/api` at the end!
   - Example: `https://rapidcare-backend-xyz.onrender.com/api`

### 2.5 Deploy Frontend
1. Click **"Deploy"** button
2. Wait for deployment (3-5 minutes)
3. ⏳ Watch the build logs...
4. 🎉 You'll see "Congratulations!" when done
5. 📝 Copy your website URL (looks like: `https://your-project.vercel.app`)

### 2.6 Test Frontend
1. Click **"Visit"** or go to your Vercel URL
2. You should see your RapidCare homepage!
3. Try registering a new user
4. Try logging in

---

## 🔄 STEP 3: Update Backend with Frontend URL

Now that you have your Vercel URL, let's update the backend:

1. Go back to **[Render Dashboard](https://dashboard.render.com)**
2. Click on your **`rapidcare-backend`** service
3. Click **"Environment"** in the left sidebar
4. Find **FRONTEND_URL** variable
5. Click **"Edit"**
6. Change value from `*` to your Vercel URL (e.g., `https://your-project.vercel.app`)
7. Click **"Save Changes"**
8. Backend will automatically redeploy (1-2 minutes)

---

## ✅ STEP 4: Final Testing

### 4.1 Test Complete Flow
Visit your website and test:

1. **Homepage loads** ✅
2. **Register new user** ✅
3. **Login** ✅
4. **View hospitals list** ✅
5. **Make a booking** ✅
6. **Submit a review** ✅

### 4.2 If Something Doesn't Work

**Backend not responding?**
- Check Render logs: Dashboard → Your Service → "Logs" tab
- Backend might be sleeping (first request takes 30-60 seconds)
- Try refreshing the page after 1 minute

**Frontend shows connection error?**
1. Check your environment variable in Vercel
2. Make sure it ends with `/api`
3. Make sure backend URL is correct
4. Redeploy frontend: Vercel Dashboard → Deployments → Click "..." → "Redeploy"

**Still not working?**
- Check browser console (F12 → Console tab)
- Check Network tab for failed requests
- Verify environment variables are correct

---

## 🎊 SUCCESS! Your App is Live!

Share your links:
- **Frontend:** `https://your-project.vercel.app`
- **Backend API:** `https://your-backend.onrender.com/api`

---

## 🔧 Bonus: Keep Backend Awake (Optional)

Render free tier sleeps after 15 minutes of inactivity. To keep it awake:

### Option A: UptimeRobot (Recommended)
1. Go to **[https://uptimerobot.com](https://uptimerobot.com)** (Free)
2. Create account
3. Add New Monitor:
   - Monitor Type: **HTTP(s)**
   - URL: `https://your-backend-url.onrender.com/api/health`
   - Monitoring Interval: **5 minutes**
4. Save
5. ✅ Your backend will never sleep!

### Option B: Cron-job.org
1. Go to **[https://cron-job.org](https://cron-job.org)** (Free)
2. Create account
3. Create cronjob to ping your backend every 5 minutes

---

## 📱 Share Your Website

Your RapidCare website is now live! Share it with:
- Friends and family
- On your resume/portfolio
- On LinkedIn
- In your GitHub README

---

## 🔄 Auto-Deploy Feature

Now whenever you:
1. Make changes to your code
2. Commit and push to GitHub
3. **Both Vercel and Render will automatically redeploy!** 🚀

No manual deployment needed anymore!

---

## 📊 Monitoring Your Apps

### Vercel Dashboard
- **URL:** https://vercel.com/dashboard
- View: Deployments, Analytics, Logs

### Render Dashboard  
- **URL:** https://dashboard.render.com
- View: Deployments, Logs, Metrics

---

## 🆘 Need Help?

If you encounter any issues:

1. **Check Logs:**
   - Render: Dashboard → Service → Logs tab
   - Vercel: Dashboard → Project → Deployments → Click deployment → View Function Logs

2. **Common Issues:**
   - ❌ 504 Gateway Timeout → Backend is sleeping, wait 1 minute
   - ❌ CORS Error → Check FRONTEND_URL in Render matches Vercel URL
   - ❌ API Connection Error → Check NEXT_PUBLIC_API_URL in Vercel

3. **Still stuck?** Share the error message and I'll help!

---

## 🎉 Congratulations!

You've successfully deployed a full-stack application! 

**What you accomplished:**
- ✅ Deployed Node.js backend with SQLite database
- ✅ Deployed Next.js frontend with TypeScript
- ✅ Set up environment variables correctly
- ✅ Configured CORS and API connections
- ✅ Enabled auto-deployment from GitHub
- ✅ Got a production website with HTTPS

**Your achievement:** 🏆 Full-Stack Developer!

---

**Ready to deploy? Let's do this!** 💪

Start with Step 1 above and follow along. I'm here if you need any help!

