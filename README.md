# Ambit

*What's within a walk of here?* Planned home: ambit.zone

A web app that answers: **"What is within a 5, 10, or 15 minute walk of this address?"**

Enter an address. The app draws walking isochrones (real street-network reach, not a circle) on a Google map, then checks which place categories (grocery, pharmacy, nightclub, salon, etc.) fall inside each ring. Save several addresses and compare them side by side.

Origin: comparing apartment locations during a move. Google Maps has no "show me everything within N minutes' walk of a point" view.

## Status

Phases 1–4 built and live behind Cloudflare Access at ambit.zone: walking rings (custom times), preset and custom categories with pins and spot cards, saved addresses with a comparison grid. Next: phase 5 (polish, see the backlog below).

## Run locally

```sh
npm install
cp .env.example .env   # then fill in both keys
npm run dev            # http://localhost:5173 — serves the app and the /api/isochrones proxy
```

- `src/`: React app. `worker/index.ts`: Cloudflare Worker proxy that holds the server key and makes the three Isochrones calls. `shared/`: types used by both.
- The browser key's HTTP referrer restrictions need `http://localhost:5173/*` for local dev.
- Deploy (later): `npx wrangler secret put GOOGLE_ISOCHRONES_SERVER_KEY`, then `npm run deploy`. The browser key is baked in at build time from `VITE_GOOGLE_MAPS_BROWSER_KEY`.

## Design sandbox

`npm run dev`, then open http://localhost:5173/sandbox. It renders the real components (sidebar, ring picker, categories and custom categories, save control, spot cards, comparison grid) with deterministic fake data on a drawn map, and makes no Google calls, so styling can be edited without spending quota. Everything is interactive (add rings, categories, custom categories, focus a category, click grid cells), and the floating panel at the bottom (hide it to a "Sandbox" pill with the arrow) switches between states: mapped or empty map, loaded / loading / daily-limit results, saved addresses or none.

- App styles: `src/styles.css` (color and type tokens at the top). Edits hot-reload in both the app and the sandbox.
- The real map's basemap colors live in `src/lib/mapStyle.ts`; the sandbox's drawn map only approximates them.
- Sandbox code is in `src/sandbox/` and is never part of the deployed build.

**Brand stylesheet:** http://localhost:5173/styleguide shows every token and component style, light and dark side by side, read live from `src/styles.css` (with contrast checks where WCAG sets a minimum), plus the values that live in code: ring pill colors and opacities (`src/lib/rings.ts`), category colors (`src/lib/categories.ts`), icons (`src/components/Icon.tsx`) and the Google basemap colors (`src/lib/mapStyle.ts`). Also dev-only. Open it beside the sandbox while editing.

**Type lab:** http://localhost:5173/typelab compares wordmark (display) candidates and UI sans candidates, each in a real slice of the interface, with a check that numbers line up (tabular figures). "Preview in sandbox" applies a choice to an open sandbox tab live; the deployed app is unaffected until a font is chosen in `src/styles.css` (`--font`, `--font-display` and the `--display-*` tokens).

**Color lab:** http://localhost:5173/colorlab shows 14 generated palettes (hue swaps of the current structure, plus further-out directions), each in light and dark with real components. Palettes come from a few choices in `src/lib/palette.ts` (accent hue and chroma, neutral tint, ring hues); every text and outline color is solved in OKLCH until it meets WCAG contrast, and each card lists its checks. "Preview in sandbox" recolors an open sandbox tab live. The real app keeps the palette in `src/styles.css` until one is chosen.

## Terms

Use these consistently in UI copy and when discussing the app.

- **Category**: a row in "What's nearby" (Coffee shop, Grocery store, or one you add, like Climbing gym).
- **Spot**: a real place found for a category (La Noisette, Mission Cliffs). Spots are the pins on the map.
- **Ring**: a walking-time area (5, 10, 15 min, or a custom time).
- **Pick**: the spot that counts for a category at an address. The nearest by default; choose another from a focused category's spot cards ("Make this my park pick").

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

## Polish backlog

Running list for phase 5 (polish). Add to it as things come up.

**Done 2026-10-08:** palette switched to Gold & ink (lime read sickly on the map; Iris was runner-up), grain texture, header control sizes, line-length tokens, smoothed ring outlines and pill-colored ring bands (display only), spot card redesign, subtle motion pass, multi-add time menu, rename from the sidebar, "Walking times".

**Check on the real map** (needs live calls, untested so far): gold bands on the basemap, smoothed outlines, ring toggle crossfade, spot card flipping near the map's edges.

- **Accessibility pass**: automated audit (axe-core, WCAG 2.2 AA) passes except overlapping pins near the origin (touch-target size). Still to do by hand: a VoiceOver run-through, keyboard flow when a focused category shows many pins, ring coverage for non-visual users, 200% zoom.
- **Spot details on hover (paid, opt-in)**: hours / open now, rating, price level, website via Place Details only when a spot's tooltip opens (cached per spot, about 1,000 free per month). Never add these fields to searches: that moves every search to the Enterprise tier.
- **Exact walking minutes**: Routes API for the nearest 2–3 spots per category (about 10–15 calls per address), instead of ring buckets.
- **Overlapping pins** near the origin.
- **Picking on touch devices**: spot cards are hover-only, so phones can't choose a pick yet (needs a tap-friendly path, e.g. from the focused category's row).

## Sources

- https://developers.google.com/maps/documentation/isochrones/key-concepts
- https://developers.google.com/maps/documentation/isochrones/usage-and-billing
- https://developers.google.com/maps/billing-and-pricing/pricing
