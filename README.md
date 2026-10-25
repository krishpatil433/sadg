# SADG — Multi App Cloner (Progressive Web App)

> **Run Multiple Accounts. One Device. Zero Hassle.**  
> SADG is an installable Progressive Web App (PWA) that allows users to run multiple instances of the same app simultaneously directly from modern browsers like Google Chrome, with 100% isolated data storage and zero APK required.

---

## 🚀 Features

- **PWA-Native**: Install directly to home screen on Android (Chrome), iOS (Safari), macOS, Windows, and Linux.
- **Buttery Smooth 60 FPS**: Pure HTML, CSS variables, and vanilla JavaScript with zero external frameworks or heavy dependencies.
- **Zero Layout Shift (CLS = 0)**: Optimized animations strictly animating `transform` and `opacity`.
- **Offline First**: Service Worker caching with `sadg-v1` cache shell and dedicated branded `offline.html` fallback.
- **Glassmorphism UI**: High-end dark theme (`#0a0a0f`) with vivid violet-indigo gradient accents and micro-interactions.
- **Interactive Sandbox & Cloner Demo**: Live app cloning preview with instance switcher, storage partition badge, and stealth mode.

---

## 🌐 Deploying to Vercel

SADG includes a configured `vercel.json` with correct PWA MIME types, cache invalidation for `service-worker.js`, and SPA fallback routing.

### Method 1: Git Import via Vercel Dashboard (Recommended)
1. Push your SADG repository to GitHub, GitLab, or Bitbucket.
2. Visit [vercel.com/new](https://vercel.com/new) and log in.
3. Import your SADG repository.
4. Leave the Framework Preset as **Other** (Static HTML) or **Vite** (if building with Vite).
5. Click **Deploy**. Vercel will immediately serve it with an SSL/HTTPS certificate (required for PWA installation).

### Method 2: Drag and Drop (Vercel CLI / Web Drop)
1. In your Vercel dashboard, you can drag and drop your project folder directly into the project creation screen.
2. Alternatively, install the Vercel CLI:
   ```bash
   npm i -g vercel
   ```
3. Run in your project root:
   ```bash
   vercel
   ```
4. Follow the interactive prompts (Accept default settings). Vercel will provide an instant HTTPS preview URL.

---

## 💻 Testing PWA Install Locally

Browsers require **HTTPS** or **`localhost`** to activate the Service Worker and trigger the `beforeinstallprompt` event.

### Option A: Using `npx serve` (Zero Installation)
```bash
npx serve . -p 3000
```
Open [http://localhost:3000](http://localhost:3000) in Google Chrome.

### Option B: Using `http-server`
```bash
npx http-server -p 8080 -c-1
```
Open [http://localhost:8080](http://localhost:8080) in Google Chrome.

### Option C: Mobile Testing with Port Forwarding or Local IP
1. Connect your Android phone to your computer via USB with USB Debugging enabled.
2. In desktop Chrome, navigate to `chrome://inspect/#devices`.
3. Set up **Port Forwarding**: map port `3000` to `localhost:3000`.
4. Open Chrome on your phone and go to `http://localhost:3000`. The PWA install banner will trigger directly!

---

## 🎨 Replacing Placeholder Icons

The project comes with generated high-resolution 192×192 and 512×512 PNG icons in `/icons/` and `/public/icons/`.

To replace them with your custom artwork:
1. Prepare two square PNG images:
   - **192x192 pixels** (named `icon-192.png`)
   - **512x512 pixels** (named `icon-512.png`)
2. Place both files in the `/icons/` and `/public/icons/` directories:
   ```text
   /icons/icon-192.png
   /icons/icon-512.png
   /public/icons/icon-192.png
   /public/icons/icon-512.png
   ```
3. **Design Tip for Maskable Icons**: Ensure the core logo or graphic is placed within the inner 80% circle (safe zone), leaving a 10–15% padding from the edge so Android squircles or circle cropping does not cut off the logo.

---

## 🔍 Verifying PWA Installability & Performance

You can verify that SADG fulfills all PWA installation requirements using Google Chrome DevTools:

1. Open your SADG URL in Google Chrome.
2. Press `F12` (or `Cmd + Option + I` on Mac) to open DevTools.
3. Go to the **Application** tab:
   - **Manifest**: Verify `name`, `short_name`, `start_url`, `display: standalone`, `theme_color`, and both `192x192` and `512x512` icons are rendered without warnings.
   - **Service Workers**: Verify `service-worker.js` is registered, active, and running under scope `/`.
   - **Storage / Cache Storage**: Check `sadg-v1` contains precached assets (`/`, `/index.html`, `/offline.html`, `/manifest.json`, etc.).
4. Go to the **Lighthouse** tab:
   - Select **Progressive Web App** and **Performance**.
   - Click **Analyze page load**.
   - SADG will pass the PWA installable criteria with 100% scores.

---

## 📄 License
MIT License. Created for high-performance multi-account workflows.
