# 🚀 Quick Deployment Reference Card

## Your GitHub Repository
**URL:** https://github.com/bayzidalim/rapidcare.git
**Branch:** main

---

## 📝 Step 1: Deploy Backend (Render)

### Go to: [https://render.com](https://render.com)

**Settings to Enter:**

| Setting | Value |
|---------|-------|
| Name | `rapidcare-backend` |
| Root Directory | `back-end` |
| Build Command | `npm install && npm run migrate` |
| Start Command | `npm start` |
| Plan | **Free** |

**Environment Variables:**
```
NODE_ENV=production
JWT_SECRET=RapidCare2024SecureJWTSecretKeyForProductionDeployment!@#$%^&*()
PORT=10000
FRONTEND_URL=*
DATABASE_URL=./database.sqlite
```

**Save Backend URL:** `https://______________________.onrender.com`

---

## 🎨 Step 2: Deploy Frontend (Vercel)

### Go to: [https://vercel.com](https://vercel.com)

**Settings to Enter:**

| Setting | Value |
|---------|-------|
| Framework | Next.js |
| Root Directory | `front-end` |
| Build Command | `npm run build` |
| Output Directory | `.next` |

**Environment Variable:**
```
NEXT_PUBLIC_API_URL=https://[YOUR-BACKEND-URL].onrender.com/api
```

⚠️ **Replace `[YOUR-BACKEND-URL]` with actual URL from Step 1**

**Save Frontend URL:** `https://______________________.vercel.app`

---

## 🔄 Step 3: Update Backend FRONTEND_URL

1. Go to Render Dashboard
2. Click your backend service
3. Go to "Environment" tab
4. Change `FRONTEND_URL` from `*` to your Vercel URL
5. Save (it will auto-redeploy)

---

## ✅ Test URLs

After deployment, test these:

1. **Backend Health:** `https://[YOUR-BACKEND].onrender.com/api/health`
   - Should show: `{"status":"OK"...}`

2. **Frontend:** `https://[YOUR-FRONTEND].vercel.app`
   - Should show: RapidCare homepage

3. **Full Flow:**
   - Register user
   - Login
   - View hospitals
   - Make booking
   - Leave review

---

## 🆘 Troubleshooting

**Backend takes long to respond?**
- First request after sleep takes 30-60 seconds
- Just wait and refresh

**CORS Error?**
- Check `FRONTEND_URL` in Render matches Vercel URL
- Make sure no trailing slash

**API Connection Error?**
- Check `NEXT_PUBLIC_API_URL` in Vercel
- Must end with `/api`
- Must match backend URL exactly

**Build Failed?**
- Check logs in Render/Vercel dashboard
- Verify environment variables are set correctly

---

## 📊 Dashboard URLs

- **Render:** https://dashboard.render.com
- **Vercel:** https://vercel.com/dashboard

---

## 🎉 After Successful Deployment

Your URLs will be:
- **Website:** `https://your-project.vercel.app`
- **API:** `https://your-backend.onrender.com/api`

**Auto-Deploy Enabled:**
Every push to GitHub will automatically deploy! 🚀

---

**Need detailed instructions?** See: `DEPLOYMENT_GUIDE_STEP_BY_STEP.md`

