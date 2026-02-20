# Visteria

A React dashboard for tracking visits across your own websites.

## Deploy to Vercel (Recommended)

1. Push your code to GitHub
2. Import the repo in [Vercel](https://vercel.com/new)
3. Add environment variables in Vercel dashboard:
   - `VISTERIA_API_KEY` - your secret API key
   - `MONGODB_URI` - MongoDB Atlas connection string
   - `MONGODB_DB_NAME` - database name (default: visteria)
4. Deploy!

Your app will be available at `https://your-app.vercel.app`

## Local development

```bash
npm install
npm run dev
```

## Backend (local)

1. Create a local env file:

```bash
# macOS/Linux
cp .env.example .env

# Windows (PowerShell)
Copy-Item .env.example .env
```

2. Set at least `VISTERIA_API_KEY` in `.env`.
3. Set `MONGODB_URI` to your MongoDB Atlas/cluster connection string.

4. Start the API:

```bash
npm run api
```

The backend runs on `http://localhost:8787` by default and stores data in your MongoDB cluster.

## What is implemented now

- API config form (base URL + API key), saved in browser localStorage.
- Project stats table (loads from your API, falls back to starter data).
- Tracking script generator you can paste into each of your sites.

## Expected API shape

### Track a visit

- Endpoint: `POST /api/visits/track`
- Header: `x-api-key: <your-api-key>`
- Body:

```json
{
	"siteId": "portfolio-main",
	"url": "https://example.com/",
	"referrer": "https://google.com/",
	"userAgent": "Mozilla/5.0 ...",
	"visitedAt": "2026-02-20T08:00:00.000Z"
}
```

### Dashboard project list

- Endpoint: `GET /api/projects`
- Header: `x-api-key: <your-api-key>`
- Response:

```json
{
	"projects": [
		{
			"siteId": "portfolio-main",
			"siteName": "Portfolio",
			"todayVisits": 12,
			"totalVisits": 420,
			"uniqueVisitors": 280
		}
	]
}
```

## Frontend config to use local backend

Set these in your frontend env (`.env` or `.env.local`):

```bash
VITE_TRACKING_API_BASE_URL=http://localhost:8787
VITE_TRACKING_API_KEY=<same-as-VISTERIA_API_KEY>
```
