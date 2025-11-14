# Emergency Map Dashboard

Emergency Map is a React + Vite kiosk application that monitors Seattle Fire and Police dispatch feeds, combines the most recent 30 minutes of incidents, and plots them on a MapTiler map with animated markers. A sidebar lists the same incidents, highlights totals, and shows when the next automatic refresh will occur. The app is designed to run unattended (for example, on a Raspberry Pi kiosk) where it keeps polling in the background without user input.

## Features
- Live aggregation of Seattle Fire incidents from Open Data (Police feed temporarily disabled due to API changes)
- Animated MapTiler markers with resilient popup rendering and cached tiles for kiosk reliability
- Lazy-loaded map experience to keep the initial bundle lean while deferring heavy MapTiler code
- Offline-friendly tile prefetching and optional watchdog heartbeat pings
- Dockerfile and nginx config for predictable kiosk deployments

## Requirements
- Node.js 20 or newer
- MapTiler API key (for the basemap)
- Seattle Open Data App Token (for API rate limits)

## Quick Start
1. **Install dependencies**
   ```bash
   npm install
   ```
2. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   Fill in the tokens described below.
3. **Run the dev server**
   ```bash
   npm run dev
   ```
   Visit the printed URL to view the live dashboard.
4. **Create a production build** (for kiosk deployment)
   ```bash
   npm run build
   npm run preview   # Optional: smoke-test the build locally
   ```

Deploy the contents of `dist/` to your static host or kiosk image. The app automatically fetches new incidents every five minutes once it is running.

## Environment Variables
| Variable | Required | Description |
| --- | --- | --- |
| `VITE_APP_TOKEN` | ✅ | Seattle Open Data app token (prevents throttling).
| `VITE_API_KEY` | ✅ | MapTiler API key used for map tiles and sprites.
| `VITE_MAP_STYLE_URL` | ➖ | Optional override for the MapTiler style URL.
| `VITE_HEARTBEAT_URL` | ➖ | Optional watchdog endpoint pinged every two seconds.

See `.env.example` for default values.

## Data Sources
- Fire incidents: [`Seattle realtime fire 911 calls`](https://data.seattle.gov/Public-Safety/Fire-911/kzjm-xkqj)
- Police incidents: feed currently offline (`event_number` column removed). The app skips police polling until the dataset is restored.

## Project Scripts
- `npm run dev` – Start Vite dev server
- `npm run build` – Create production bundle
- `npm run preview` – Serve the production bundle locally
- `npm run lint` – Run ESLint
- `npm run lint:fix` – Auto-fix simple lint issues

## Raspberry Pi Watchdog Heartbeat
If your kiosk image exposes an HTTP watchdog, set `VITE_HEARTBEAT_URL` (for example `http://localhost/heartbeat.php`) before building and the app will ping it every two seconds. Leaving the variable empty disables the heartbeat (the default in local development).

## Docker Deployment (Internal Hosting)
1. **Build the image** (pass your production tokens so Vite can embed them):
   ```bash
   docker build \
     --build-arg VITE_APP_TOKEN=your_socrata_token \
     --build-arg VITE_API_KEY=your_maptiler_key \
     --build-arg VITE_MAP_STYLE_URL=https://api.maptiler.com/maps/dataviz-dark/style.json \
     -t emergency-map:latest .
   ```
2. **Run the container**:
   ```bash
   docker run --name emergency-map --rm -p 8080:80 emergency-map:latest
   ```
   Visit `http://localhost:8080` (or your internal host) to view the kiosk build being served by nginx.
3. **Optional tweaks**: provide a different style URL or bake in offline tiles by pointing `VITE_MAP_STYLE_URL` at your internal TileServer GL endpoint before building.

## Contributing
Please read [CONTRIBUTING.md](CONTRIBUTING.md) for instructions on how to get started and submit pull requests.

## Security
Responsible disclosure guidelines are outlined in [SECURITY.md](SECURITY.md).

## License
Released under the [MIT License](LICENSE).
