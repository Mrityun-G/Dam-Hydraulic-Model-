<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/1382783a-d5df-4f69-bda4-73d1678f0be1

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Unified application URL

The production server hosts both interfaces on one origin:

- `/` — Hydro-Sim dashboard and simulations
- `/monitoring` — DamSentinel monitoring UI

Run `npm run build` from this folder to build the monitoring app and bundle it under
the Hydro-Sim app automatically. The Hydro-Sim header also includes a `Monitoring UI`
link for navigation.

## Deploy

Deploy the full Express/Vite app to Render as a Node web service:

- Build command: `npm ci && npm run build`
- Start command: `npm start`
- Environment variable: `NODE_ENV=production`
- Add `GEMINI_API_KEY` and `FEATHERLESS_API_KEY` as Render secrets when needed.
- Never add either server API key to Vercel or any `VITE_*` variable; Vite variables are public.

For a separate Vercel frontend deployment, use this folder as the project root and set
`VITE_API_URL` to the public Render service URL, such as
`https://your-render-service.onrender.com`. The included `render.yaml` and `vercel.json`
contain the matching defaults.
