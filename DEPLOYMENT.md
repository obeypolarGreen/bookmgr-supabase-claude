# Deployment Guide

## Quick Deployment Options

### 1. Vercel (Recommended - Easiest)

**Why Vercel?**
- Zero configuration needed
- Automatic HTTPS
- Global CDN
- Free tier available
- Perfect for React/Vite apps

**Steps:**

#### Method A: GitHub Integration (Recommended)
1. Push code to GitHub
2. Go to https://vercel.com
3. Sign up/login
4. Click "New Project"
5. Import your GitHub repository
6. Vercel auto-detects Vite
7. Click "Deploy"
8. Done! Your app is live

#### Method B: Vercel CLI
```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy (first time)
vercel

# Follow prompts, then deploy to production
vercel --prod
```

**Configuration:**
The included `vercel.json` is already optimized:
```json
{
  "version": 2,
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite"
}
```

### 2. Railway

**Why Railway?**
- Simple deployment
- Free tier with 500 hours/month
- Automatic HTTPS
- Easy environment variables

**Steps:**
1. Create account at https://railway.app
2. Click "New Project"
3. Choose "Deploy from GitHub repo"
4. Select your repository
5. Railway auto-detects and builds
6. Get your deployment URL

**Environment Variables:**
Add in Railway dashboard if needed:
```
NODE_VERSION=18
```

### 3. Netlify

**Why Netlify?**
- Great for static sites
- Generous free tier
- Form handling
- Serverless functions support

**Steps:**

#### Method A: Drag & Drop
1. Build locally: `npm run build`
2. Go to https://app.netlify.com
3. Drag the `dist` folder to deploy

#### Method B: GitHub Integration
1. Push to GitHub
2. Login to Netlify
3. Click "New site from Git"
4. Select repository
5. Build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
6. Deploy

#### Method C: Netlify CLI
```bash
# Install CLI
npm install -g netlify-cli

# Build
npm run build

# Deploy
netlify deploy --prod --dir=dist
```

### 4. GitHub Pages

**Steps:**
1. Install gh-pages:
```bash
npm install --save-dev gh-pages
```

2. Update `package.json`:
```json
{
  "homepage": "https://yourusername.github.io/bookmark-manager",
  "scripts": {
    "predeploy": "npm run build",
    "deploy": "gh-pages -d dist"
  }
}
```

3. Update `vite.config.js`:
```javascript
export default defineConfig({
  base: '/bookmark-manager/',
  plugins: [react()]
})
```

4. Deploy:
```bash
npm run deploy
```

## Environment Setup

### Development
```bash
npm install
npm run dev
```

### Production Build
```bash
npm run build
npm run preview  # Test production build locally
```

## Post-Deployment Checklist

### ✅ Essential Checks
- [ ] App loads without errors
- [ ] Authentication works
- [ ] Can add bookmarks
- [ ] Can create folders
- [ ] Drag and drop works
- [ ] Search functionality works
- [ ] Tags can be added
- [ ] Sharing generates links
- [ ] Data persists (local storage)

### ✅ Performance Checks
- [ ] Page load time < 3s
- [ ] Images load properly
- [ ] No console errors
- [ ] Responsive on mobile
- [ ] Works in all major browsers

### ✅ SEO & Meta Tags
Add to `index.html`:
```html
<meta property="og:title" content="Bookmark Manager">
<meta property="og:description" content="Organize your bookmarks with tags and folders">
<meta property="og:image" content="/preview.png">
<meta name="twitter:card" content="summary_large_image">
```

## Production Enhancements

### 1. Add Real Backend

**Replace Local Storage with API:**
```javascript
// Instead of localStorage
const API_URL = 'https://your-api.com';

const saveBookmark = async (bookmark) => {
  const response = await fetch(`${API_URL}/bookmarks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(bookmark)
  });
  return response.json();
};
```

**Backend Options:**
- Node.js + Express + PostgreSQL
- Firebase (fastest setup)
- Supabase (PostgreSQL + Auth)
- AWS Amplify
- Cloudflare Workers

### 2. Implement Real Authentication

**OAuth Integration:**
```bash
npm install @auth0/auth0-react
# or
npm install firebase
```

**Example with Firebase:**
```javascript
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = { /* your config */ };
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const signInWithGoogle = () => {
  const provider = new GoogleAuthProvider();
  signInWithPopup(auth, provider);
};
```

### 3. Add URL Metadata API

**Backend Endpoint:**
```javascript
// Express.js example
import axios from 'axios';
import cheerio from 'cheerio';

app.post('/api/fetch-metadata', async (req, res) => {
  const { url } = req.body;
  
  try {
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);
    
    const metadata = {
      title: $('title').text() || $('meta[property="og:title"]').attr('content'),
      description: $('meta[name="description"]').attr('content') || $('meta[property="og:description"]').attr('content'),
      image: $('meta[property="og:image"]').attr('content'),
      favicon: `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=128`
    };
    
    res.json(metadata);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch metadata' });
  }
});
```

### 4. Add Analytics

**Google Analytics:**
```html
<!-- Add to index.html -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_MEASUREMENT_ID');
</script>
```

**Or use Vercel Analytics:**
```bash
npm install @vercel/analytics
```

```javascript
import { Analytics } from '@vercel/analytics/react';

// Add to your app
<Analytics />
```

## Custom Domain Setup

### Vercel
1. Go to project settings
2. Click "Domains"
3. Add your domain
4. Update DNS records as shown

### Netlify
1. Go to "Domain settings"
2. Add custom domain
3. Configure DNS

### DNS Records Example
```
Type: CNAME
Name: www
Value: your-app.vercel.app
```

## Monitoring & Maintenance

### Error Tracking
```bash
npm install @sentry/react
```

```javascript
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "YOUR_SENTRY_DSN",
  integrations: [new Sentry.BrowserTracing()],
  tracesSampleRate: 1.0,
});
```

### Uptime Monitoring
- UptimeRobot (free)
- Pingdom
- StatusCake

## Troubleshooting

### Build Fails on Vercel
```bash
# Check Node version in vercel.json
{
  "buildCommand": "npm run build",
  "installCommand": "npm install",
  "framework": "vite"
}
```

### 404 Errors on Refresh
Add redirect rules:

**Vercel (vercel.json):**
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

**Netlify (_redirects file):**
```
/*    /index.html   200
```

### Environment Variables
On deployment platform, add:
```
VITE_API_URL=https://api.example.com
VITE_AUTH_DOMAIN=your-domain.auth0.com
```

Access in code:
```javascript
const apiUrl = import.meta.env.VITE_API_URL;
```

## Cost Estimates

### Free Tier Limits

**Vercel:**
- 100 deployments/month
- Unlimited bandwidth
- Free SSL

**Railway:**
- 500 hours/month
- 100GB egress
- 8GB RAM

**Netlify:**
- 100GB bandwidth
- 300 build minutes
- Unlimited sites

**For most personal projects, free tier is sufficient!**

## Support

Need help? Check:
- Platform documentation
- Community forums
- Platform status pages
- This project's README

---

**Ready to deploy? Start with Vercel for the easiest experience!**
