# Ambit

*What's within a walk of here?* Planned home: ambit.zone

A web app that answers: **"What is within a 5, 10, or 15 minute walk of this address?"**

Enter an address. The app draws walking isochrones (real street-network reach, not a circle) on a Google map, then checks which place categories (grocery, pharmacy, nightclub, salon, etc.) fall inside each ring. Save several addresses and compare them side by side.

Origin: comparing apartment locations during a move. Google Maps has no "show me everything within N minutes' walk of a point" view.

## Status

Phases 1–3 built and live behind Cloudflare Access at ambit.zone: walking rings (custom times), preset and custom categories with pins. Next: phase 4 (saved addresses + comparison grid).

## Run locally

```sh
npm install
cp .env.example .env   # then fill in both keys
npm run dev            # http://localhost:5173 — serves the app and the /api/isochrones proxy
```

- `src/`: React app. `worker/index.ts`: Cloudflare Worker proxy that holds the server key and makes the three Isochrones calls. `shared/`: types used by both.
- The browser key's HTTP referrer restrictions need `http://localhost:5173/*` for local dev.
- Deploy (later): `npx wrangler secret put GOOGLE_ISOCHRONES_SERVER_KEY`, then `npm run deploy`. The browser key is baked in at build time from `VITE_GOOGLE_MAPS_BROWSER_KEY`.

## Terms

Use these consistently in UI copy and when discussing the app.

- **Category**: a row in "What's nearby" (Coffee shop, Grocery store, or one you add, like Climbing gym).
- **Spot**: a real place found for a category (La Noisette, Mission Cliffs). Spots are the pins on the map.
- **Ring**: a walking-time area (5, 10, 15 min, or a custom time).

## Goals

- Walking isochrones at 5, 10, and 15 minutes from any address.
- Preset categories plus user-defined custom categories ("custom fields"), each answered as yes/no, count, and nearest ring.
- Saved addresses and a comparison grid (categories x addresses).
- Free to run for personal use.

## Non-goals (for now)

- Transit or driving modes.
- Accounts, sync across devices, or public sharing.
- Counting exact numbers of places in dense categories (see "Known limits").

## Stack

| Layer | Choice | Notes |
|---|---|---|
| Language | TypeScript | |
| Build | Vite | Static output |
| UI | React + `@vis.gl/react-google-maps` | Plain TS is fine for a first prototype |
| Map | Google Maps JavaScript API | Polygons, markers, address autocomplete |
| Geometry | Turf.js (`@turf/boolean-point-in-polygon`) | Point-in-polygon in the browser |
| Storage | `localStorage` first | Saved addresses and custom categories |
| Hosting | Cloudflare Pages / Vercel / Netlify | Free tier, also hosts the proxy |
| Proxy | One serverless function | Holds the server-side key, forwards Isochrones requests |

Verify early whether the Isochrones API can be called safely from the browser. If not, the proxy is required so the key stays off the page.

## How it works

1. Geocode the address to coordinates.
2. Request walking isochrones for 5, 10, and 15 minutes. Google returns one isochrone per request, so that is three calls (run in parallel). Use high polygon fidelity with smoothing off, since the docs recommend that for point-in-polygon tests.
3. For each category, run one Places API (New) Nearby Search around the origin: a circle covering the 15-minute ring, ranked by distance.
4. Filter results with Turf to the polygons. Ring membership (5/10/15) is each place's walking-time bucket, which avoids paying for a routing API.
5. Custom categories: pick a Google place type from a preset list, or enter free text (Text Search with a location bias, then filter to the polygon).
6. Comparison grid: categories as rows, saved addresses as columns, nearest ring in each cell.

## Google Cloud setup

1. Create a Google Cloud project and attach a billing account.
2. Enable: Maps JavaScript API, Geocoding API, Places API (New), Isochrones API. (Legacy Places API cannot be enabled on new projects. Use the new one.)
3. Create two keys:
   - Browser key, restricted to the site's HTTP referrers, for Maps JS and Places.
   - Server key, for the proxy.
4. **Before writing code:** set budget alerts and per-API quotas. Google does not apply a default spending cap.
5. Keep keys in a local `.env` file and add it to `.gitignore`. Never commit keys.

## Costs (USD per 1,000 requests, verified Oct 2026)

| Service | Free per month | After free cap |
|---|---|---|
| Isochrones API | 10,000 | ~$3.00 to $5.00 (pages conflict; check console; product pre-GA) |
| Places Nearby Search (Pro) | 5,000 | $32.00 |
| Dynamic Maps (map loads) | 10,000 | $7.00 |
| Geocoding | 10,000 | $5.00 |

- Free caps are per SKU and do not pool.
- Places bills at the highest SKU tier among requested fields. Names and locations land in Pro.
- One analysis (3 rings, 8 categories) is roughly 3 isochrone calls, 8 Nearby Searches, 1 geocode, 1 map load. About 600 addresses per month fit in the free Nearby Search cap, so personal use is $0.
- If ever public: roughly $0.28 per analysis past the free caps. Reduce by limiting default categories and caching.
- Check Google's current terms on caching Places data before building a cache (place IDs are generally storable, most other fields have short limits).

## Known limits and risks

- Isochrones API is new: pricing and limits may still change, and it accepts one origin per request.
- Origin must be near a road. The API returns 404 if no suitable segment is within about 100 m.
- Nearby Search returns a limited number of results per call (about 20 as far as I know). "Is there a pharmacy" is reliable. "How many restaurants" is not.
- Fallback if Google gets too costly or restrictive: OpenStreetMap data with OpenRouteService or Valhalla for isochrones (free, thinner business data). TravelTime sells unlimited isochrones for a fixed annual fee but does not solve place search.

## Build phases

1. Map, address search, three rings.
2. Preset categories with pins and a yes/no checklist.
3. Custom category fields.
4. Saved addresses and comparison grid.
5. Polish, quota and budget guardrails, deploy.

## Suggested first prompt for Claude Code

> Read README.md. Scaffold a Vite + React + TypeScript app with `@vis.gl/react-google-maps`. Start with phase 1: address search that draws 5, 10, and 15 minute walking isochrones. Read the API key from `.env`, add `.env` to `.gitignore`, and build a small serverless proxy for the Isochrones call. Ask me before enabling anything that could incur cost.

## Sources

- https://developers.google.com/maps/documentation/isochrones/key-concepts
- https://developers.google.com/maps/documentation/isochrones/usage-and-billing
- https://developers.google.com/maps/billing-and-pricing/pricing
