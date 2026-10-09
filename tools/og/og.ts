// Draws the rings for og.html from the local isochrone sample.
/* eslint-disable */
// @ts-nocheck
import sample from '../../src/styleguide/fixtures/iso-sample.json';
import { toPolygonPaths } from '../../src/lib/geojson';
import { shapePolygons, DEFAULT_RING_SHAPE } from '../../src/lib/ringShape';
import { ringBand } from '../../src/lib/ringBands';
import { ringStyle } from '../../src/lib/rings';

const svg = document.getElementById('map')!;
const ns = 'http://www.w3.org/2000/svg';
const el = (name, attrs, parent = svg) => { const e = document.createElementNS(ns, name); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); parent.append(e); return e; };
const shaped = sample.rings.map((r) => shapePolygons(toPolygonPaths(r.geoJson), DEFAULT_RING_SHAPE));
const pts = shaped.flat(3);
const minLat = Math.min(...pts.map((p) => p.lat)), maxLat = Math.max(...pts.map((p) => p.lat));
const minLng = Math.min(...pts.map((p) => p.lng)), maxLng = Math.max(...pts.map((p) => p.lng));
const kx = Math.cos(((minLat + maxLat) / 2) * Math.PI / 180);
const H = 630, pad = 70;
const scale = (H - 2 * pad) / (maxLat - minLat);
const w = (maxLng - minLng) * kx * scale;
const ox = 760 - w - 100, oy = pad;
const x = (p) => ox + (p.lng - minLng) * kx * scale, y = (p) => oy + (maxLat - p.lat) * scale;
const d = (polys) => polys.map((rs) => rs.map((r) => `M${r.map((p) => `${x(p).toFixed(1)} ${y(p).toFixed(1)}`).join(' L')}Z`).join(' ')).join(' ');
// A quiet street grid, tilted like a real one.
const grid = el('g', { transform: 'rotate(-8 380 315)', stroke: 'var(--map-road)', 'stroke-width': 5 });
el('rect', { x: -200, y: -200, width: 1100, height: 1030, fill: 'var(--map-land)' }, svg).before(grid);
for (let i = -10; i < 30; i++) { el('line', { x1: -300, x2: 1000, y1: i * 48, y2: i * 48 }, grid); el('line', { y1: -300, y2: 1000, x1: i * 48, x2: i * 48 }, grid); }
svg.append(grid);
const count = shaped.length;
shaped.forEach((polys, rank) => {
  const st = ringStyle(rank, count);
  el('path', { d: d(ringBand(polys, shaped[rank - 1] ?? null)), 'fill-rule': 'evenodd', style: `fill: var(${st.fillVar}); fill-opacity: var(--map-ring-fill)` });
  el('path', { d: d(polys), fill: 'none', style: 'stroke: var(--data)', 'stroke-opacity': st.stroke, 'stroke-width': 3, 'stroke-linejoin': 'round' });
});
// The origin: the point the walk starts from.
const cx = shaped[0][0][0].reduce((s, p) => s + x(p), 0) / shaped[0][0][0].length;
const cy = shaped[0][0][0].reduce((s, p) => s + y(p), 0) / shaped[0][0][0].length;
el('circle', { cx, cy, r: 13, style: 'fill: var(--card); stroke: var(--ink)', 'stroke-width': 0 });
el('circle', { cx, cy, r: 8, style: 'fill: var(--ink)' });
document.body.dataset.ready = 'true';
