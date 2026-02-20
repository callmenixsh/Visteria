# Visteria

A simple, privacy-focused analytics dashboard for tracking visits across your websites.

## Features

- 📊 Real-time visitor tracking across multiple sites
- 🌙 Dark/light theme support
- 📈 Beautiful charts showing visits by day, hour, and trends over time
- 🔒 Privacy-first: minimal tracking, no cookies, session-based deduplication
- ⚡ Optimized tracking snippet with cooldown and visibility checks
- 🚀 Serverless deployment on Vercel with MongoDB Atlas

## Deploy to Vercel

1. **Fork/Clone this repo**
2. **Create MongoDB Atlas database** (free tier works great)
3. **Import to [Vercel](https://vercel.com/new)**
4. **Add environment variables** in Vercel dashboard:
   - `VISTERIA_API_KEY` - Your secret API key for dashboard access
   - `VITE_TRACKING_API_KEY` - Same as above (for frontend)
   - `MONGODB_URI` - MongoDB Atlas connection string
   - `MONGODB_DB_NAME` - Database name (default: `visteria`)
   - `MONGODB_VISITS_COLLECTION` - Collection name (default: `visits`)
5. **Deploy!** 🎉

## Local Development

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env and add your MongoDB URI and API key

# Start dev server
npm run dev
```

Visit `http://localhost:5173` to see your dashboard.

## Adding Tracking to Your Sites

1. Go to **Settings** in your Visteria dashboard
2. Enter your **Site ID** (e.g., `my-portfolio`) and **Site URL**
3. Copy the generated tracking snippet
4. Paste it in the `<head>` of your website
5. Deploy and watch your visits roll in! 📈

### Example Tracking Snippet

```html
<script>
(function() {
  const SITE_ID = 'your-site-id';
  const SITE_URL = 'https://yoursite.com';
  const API_URL = 'https://visteria.vercel.app/api/visits/track';
  const COOLDOWN_MS = 2000;

  const lastTracked = sessionStorage.getItem('visteria_last_' + SITE_ID);
  const now = Date.now();
  if (lastTracked && now - parseInt(lastTracked) < COOLDOWN_MS) return;
  if (document.hidden) return;

  sessionStorage.setItem('visteria_last_' + SITE_ID, now.toString());

  navigator.sendBeacon(API_URL, JSON.stringify({
    siteId: SITE_ID,
    siteUrl: SITE_URL,
    url: window.location.href,
    referrer: document.referrer || '',
    userAgent: navigator.userAgent,
    visitedAt: new Date().toISOString()
  }));
})();
</script>
```

## API Endpoints

### Public Endpoint (No Auth Required)

**Track Visit**
```
POST /api/visits/track
Content-Type: application/json

{
  "siteId": "my-site",
  "siteUrl": "https://mysite.com",
  "url": "https://mysite.com/page",
  "referrer": "https://google.com/",
  "userAgent": "Mozilla/5.0...",
  "visitedAt": "2026-02-21T10:00:00.000Z"
}
```

### Protected Endpoints (API Key Required)

**Get Site Details**
```
GET /api/sites/:siteId
Header: x-api-key: your-api-key
```

## Tech Stack

- **Frontend:** React 19 + Vite
- **Styling:** Tailwind CSS
- **Icons:** Lucide React
- **Backend:** Vercel Serverless Functions
- **Database:** MongoDB Atlas
- **Deployment:** Vercel

## Privacy & Performance

Visteria is designed with privacy and performance in mind:
- No cookies or persistent tracking
- Session-based deduplication (2-second cooldown)
- Skips tracking when tab is hidden
- Uses `sendBeacon` for reliable, non-blocking requests
- Minimal data collection (URL, referrer, user agent, timestamp)

## License

MIT

---

Made with ❤️ by [@callmenixsh](https://github.com/callmenixsh)
