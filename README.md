# Emergency Map Dashboard

Emergency Map is a React + Vite kiosk application that monitors Seattle Fire and Police dispatch feeds, combines the most recent 30 minutes of incidents, and plots them on a MapTiler map with animated markers. A sidebar lists the same incidents, highlights counts, and shows when the next automatic refresh will occur. The app is designed to run unattended on a Raspberry Pi in kiosk mode, so everything loads full screen and keeps polling in the background without user input.

## Quick Start
1. **Install dependencies**
   ```bash
   npm install
   ```
2. **Configure API tokens**
   - Create a `.env` file (or use your preferred secure secret store).
   - Set `VITE_APP_TOKEN` to your Seattle Open Data app token.
   - Set `VITE_API_KEY` to your MapTiler API key.
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

Deploy the contents of `dist/` to the Raspberry Pi’s static server or include them in your kiosk image. The app will automatically fetch new incidents every five minutes once it is running.
