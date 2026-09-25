# 🚀 ORCA Deployment Guide: Render & Vercel

ORCA is architected as a **unified full-stack application**. In production, the compiled React/Vite client in `dist/` is served directly by the Express Node.js backend. This allows you to deploy the entire application on **Render with 1 click**, or deploy on **Vercel**.

---

## 🌟 Option 1: Deploy on Render (Recommended — Full-Stack in 1 Service)

Render runs both the **Frontend** and **Backend** together on a single URL on the **Free Tier**.

### Step 1: Push Code to GitHub
Ensure your latest changes are pushed to your GitHub repository:
```bash
git add .
git commit -m "Configure production deployment for Render and Vercel"
git push origin main
```

### Step 2: Create a New Web Service on Render
1. Go to [dashboard.render.com](https://dashboard.render.com) and log in.
2. Click **New +** ➔ **Web Service**.
3. Connect your GitHub repository.
4. Fill in the following settings:
   - **Name**: `orca-marine-intelligence` (or your choice)
   - **Region**: Any (e.g. `Oregon (US West)` or `Singapore`)
   - **Branch**: `main`
   - **Root Directory**: *(leave blank)*
   - **Runtime**: `Node`
   - **Build Command**:
     ```bash
     npm install --include=dev && npm run build
     ```
   - **Start Command**:
     ```bash
     npm start
     ```
   - **Plan**: `Free`

### Step 3: Add Environment Variables
In the **Environment Variables** section on Render, add:
| Key | Value | Description |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Enables production mode |
| `PORT` | `10000` | (Render assigns this automatically) |
| `HOST` | `0.0.0.0` | Listens on all interfaces (required on Render) |
| `DATA_MODE` | `LIVE` | Live marine observations |
| `GEMINI_API_KEY` | *(your Gemini API key)* | Optional: For Gemini AI Assistant & Voice |
| `GEMINI_MODEL` | `gemini-3.8-flash` | Gemini model name |
| `GOOGLE_MAPS_API_KEY` | *(your Google Maps key)* | Optional: Google satellite tiles (Leaflet fallback built-in) |
| `MONGODB_URI` | *(your MongoDB URI)* | Optional: Cloud database (in-memory fallback built-in) |
| `WEATHER_PROVIDER` | `open-meteo` | Live weather telemetry |
| `MARINE_PROVIDER` | `open-meteo` | Live wave & current telemetry |

### Step 4: Click "Create Web Service"
Render will automatically build and deploy. Once finished, your app will be live at:
`https://your-service-name.onrender.com`

---

## ⚡ Option 2: Deploy on Vercel

### Step 1: Deploy Frontend on Vercel
1. Go to [vercel.com](https://vercel.com) and click **Add New...** ➔ **Project**.
2. Import your GitHub repository.
3. Vercel will detect Vite automatically using the included `vercel.json`:
   - **Framework Preset**: `Vite`
   - **Build Command**: `vite build --configLoader runner`
   - **Output Directory**: `dist`
4. Click **Deploy**.

### Step 2: Connect Backend API
Since Vercel static hosting does not run long-running Node.js background processes or the Express server continuously:
1. Deploy the backend to **Render** using Option 1 above (e.g. `https://orca-api.onrender.com`).
2. In `vercel.json`, you can configure API rewrites to forward `/api/*` requests to your Render backend:
```json
{
  "version": 2,
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "https://your-render-backend.onrender.com/api/$1"
    },
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

---

## ✅ Verifying Your Deployment
Once deployed, check the following endpoints:
1. **Frontend App**: `https://<your-app-url>/`
2. **Health Check**: `https://<your-app-url>/api/health`
3. **Koli Local Knowledge**: `https://<your-app-url>/api/marine/local-knowledge?latitude=18.95&longitude=72.82`

---

## 🛠️ Common Render Issues & How to Fix Them

### 1. Build Failed with `tsc: not found` or `vite: not found`
- **Cause**: By default, setting `NODE_ENV=production` makes `npm install` omit development dependencies (`typescript`, `vite`).
- **Fix**: 
  - Ensure your Render **Build Command** is set to:
    ```bash
    npm install --include=dev && npm run build
    ```
  - We have also moved `typescript` and `vite` into `dependencies` in `package.json` so standard `npm install` installs them in all environments.

### 2. "Port scan timeout" or Service Fails to Deploy
- **Cause**: The application was binding to `localhost` or `127.0.0.1` instead of `0.0.0.0`, or not listening on Render's assigned `$PORT`.
- **Fix**:
  - The server now explicitly binds to `0.0.0.0` and `process.env.PORT`.
  - In Render **Environment Variables**, make sure `HOST` is set to `0.0.0.0` or left unset.

### 3. "API route not found" on Root URL `/`
- **Cause**: The production build `dist/` directory was not generated or not found by the Node process.
- **Fix**:
  - Ensure the build command runs `npm run build` so `dist/` and `server/dist/` are created.
  - The server now uses multi-path fallback discovery to locate `dist/index.html` regardless of the working directory.

### 4. 502 Bad Gateway / Long Loading Times
- **Cause**: On Render's Free tier, the service automatically sleeps after 15 minutes of inactivity. The first visitor triggers a cold start taking 50–90 seconds.
- **Fix**:
  - Wait 60 seconds on first request.
  - Set up one of the keep-alive solutions below to prevent sleeping.

---

## ⏰ Preventing Render from Sleeping (Keep-Alive Cron)

Render's free tier spins down web services after **15 minutes of inactivity**. We have provided **two automated solutions** to keep your application awake 24/7:

### Solution A: GitHub Actions Cron (Recommended — 100% Free & Cloud-Based)
A pre-configured GitHub Actions workflow is included at [`.github/workflows/render-keep-alive.yml`](file:///.github/workflows/render-keep-alive.yml).
1. Go to your GitHub repository ➔ **Settings** ➔ **Secrets and variables** ➔ **Actions**.
2. Add a **Repository secret** or **Variable**:
   - Name: `RENDER_URL`
   - Value: `https://your-service-name.onrender.com`
3. The workflow runs every 14 minutes (`*/14 * * * *`) via GitHub's cloud servers, automatically pinging `/api/health` to keep your Render instance awake 24/7 without needing your personal computer on.

### Solution B: Standalone Node.js Keep-Alive Script
Run the dedicated [cron-keep-alive.js](file:///cron-keep-alive.js) script:
```bash
npm run cron:keepalive https://your-service-name.onrender.com
```
Or directly:
```bash
node cron-keep-alive.js https://your-service-name.onrender.com
```
This script sends a lightweight HTTP GET request to `/api/health` every 14 minutes with latency logs and automatic error recovery.

### Solution C: Free Third-Party Ping Service (Zero Code)
1. Go to [cron-job.org](https://cron-job.org) or [uptimerobot.com](https://uptimerobot.com).
2. Create a free HTTP monitor pinging:
   `https://your-service-name.onrender.com/api/health`
3. Set the interval to **every 10 or 14 minutes**.
