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
   - `VITE_TRACKING_API_KEY` - Same as above (used by the frontend)
   - `VITE_API_BASE_URL` - Optional. Overrides the API base URL (defaults to the deployed Vercel URL). Useful when self-hosting on a different domain.
   - `VISTERIA_TRACKING_ALLOWED_HOSTS` - Comma-separated host allowlist for tracking (e.g. `mysite.com,www.mysite.com`)
   - `VISTERIA_TRACKING_SITE_HOSTS_JSON` - Optional strict per-site host mapping (e.g. `{"portfolio":["nixsh.dev","www.nixsh.dev"]}`)
   - `VISTERIA_TRACKING_ALLOWED_SITE_IDS` - Optional comma-separated site IDs allowed to send tracking events
   - `MONGODB_URI` - MongoDB Atlas connection string
   - `MONGODB_DB_NAME` - Database name (default: `visteria`)
   - `MONGODB_VISITS_COLLECTION` - Collection name (default: `visits`)

   > Note: `VITE_*` variables are embedded in the built client bundle. Anyone viewing
   > your deployed dashboard can read `VITE_TRACKING_API_KEY` from the page source,
   > so the dashboard is effectively readable by anyone. Use it to track your own
   > personal sites, not for private data.
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
<script type="module">
(function() {
  const SITE_ID = 'your-site-id';
  const SITE_URL = 'https://yoursite.com';
  const API_URL = 'https://visteria.vercel.app/api/visits/track';
  const COOLDOWN_MS = 2000;

  const createVisitorId = () => {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      return window.crypto.randomUUID();
    }
    return 'v_' + Date.now() + '_' + Math.random().toString(36).slice(2);
  };

  const getVisitorId = () => {
    try {
      const key = 'visteria_vid_' + SITE_ID;
      const existing = localStorage.getItem(key);
      if (existing) return existing;
      const created = createVisitorId();
      localStorage.setItem(key, created);
      return created;
    } catch {
      return createVisitorId();
    }
  };

  const lastTracked = sessionStorage.getItem('visteria_last_' + SITE_ID);
  const now = Date.now();
  if (lastTracked && now - parseInt(lastTracked) < COOLDOWN_MS) return;
  if (document.hidden) return;
  sessionStorage.setItem('visteria_last_' + SITE_ID, now.toString());

  fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      siteId: SITE_ID,
      siteUrl: SITE_URL,
      visitorId: getVisitorId(),
      url: location.href,
      referrer: document.referrer,
      userAgent: navigator.userAgent,
      visitedAt: new Date().toISOString(),
    }),
    keepalive: true,
  }).catch(() => {});
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

Tracking hardening:
- If no allowlist env vars are set, tracking stays open (backward compatible).
- If any allowlist var is set, `/api/visits/track` only accepts events whose
  `Origin`/`Referer` header **and** claimed URL/site URL host match the configured
  `siteId` and host rules. Origin/Referer is required (cannot be bypassed just by
  editing the JSON body).
- Recommended: use `VISTERIA_TRACKING_SITE_HOSTS_JSON` to lock each `siteId` to
  explicit domains.
- The endpoint is rate-limited (60 req/min per client IP) and rejects payloads
  larger than 32 KB.

### Protected Endpoints (API Key Required)

**Get Site Details**
```
GET /api/sites/:siteId
Header: x-api-key: your-api-key
```
Pagination: `?limit=200` (default, max 200) and `?skip=0`. The response includes
`totalVisitors` so you can page through large sites. Totals (`totalVisits`,
`uniqueVisitors`) are always computed server-side over the whole site.

**Get Global Timeline**
```
GET /api/timeline?mode=all|year|month|week|day
Header: x-api-key: your-api-key
```
Returns aggregated visit counts for the global trend chart without downloading
every visitor record. Defaults to `year`. The `all` mode charts every month since
tracking began.

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
