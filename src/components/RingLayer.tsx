import { useEffect, useMemo, useRef, useState } from 'react';
import { useMap } from '@vis.gl/react-google-maps';
import type { Ring } from '../../shared/isochrones';
import { toPolygonPaths, topPoint } from '../lib/geojson';
import type { Theme } from '../lib/theme';
import { ringStyle } from '../lib/rings';
import { RING_SHAPE_KEY, readRingShape } from '../lib/ringShape';
import { MapOverlay, OVERLAY_Z } from './MapOverlay';
import { RingLabel } from './MapParts';

/**
 * One walking ring, drawn as its band (`band`: the ring minus the next smaller shown ring) filled
 * with its pill color, plus its full outline (`outline`). `rank` is its position among all rings
 * (0 = smallest), as on its pill. Both layers fade in and out.
 */
export function RingLayer({
  minutes,
  outline,
  band,
  rank,
  count,
  theme,
}: {
  minutes: number;
  outline: LatLng[][][];
  band: LatLng[][][];
  rank: number;
  count: number;
  theme: Theme;
}) {
  const labelAt = useMemo(() => topPoint(outline), [outline]);
  const style = useMemo(() => {
    const st = ringStyle(rank, count);
    // Google polygons need literal colors; read the theme's tokens (theme is a dependency so a
    // theme switch recolors them).
    void theme;
    const css = getComputedStyle(document.documentElement);
    return {
      ...st,
      fill: css.getPropertyValue(st.fillVar).trim() || '#ecbd51',
      fillOpacity: Number(css.getPropertyValue('--map-ring-fill')) || 0.5,
      line: css.getPropertyValue('--data').trim() || '#a27900',
    };
  }, [rank, count, theme]);

  useFadedPolygons(band, (level) => ({ fillColor: style.fill, fillOpacity: style.fillOpacity * level, strokeWeight: 0, zIndex: 0 }));
  useFadedPolygons(outline, (level) => ({ fillOpacity: 0, strokeColor: style.line, strokeOpacity: style.stroke * level, strokeWeight: 2, zIndex: style.z }));

  if (!labelAt) return null;
  return (
    <MapOverlay position={labelAt} zIndex={OVERLAY_Z.ringLabel}>
      <RingLabel minutes={minutes} />
    </MapOverlay>
  );
}

type LatLng = google.maps.LatLngLiteral;

/**
 * Draws polygons on the map, fading them in when they appear and out when they're replaced or
 * removed. `styleAt(level)` gives their options at a fade level (0–1); style changes apply in place.
 */
function useFadedPolygons(paths: LatLng[][][], styleAt: (level: number) => google.maps.PolygonOptions) {
  const map = useMap();
  const level = useRef(0);
  const drawnRef = useRef<google.maps.Polygon[]>([]);
  const styleRef = useRef(styleAt);
  styleRef.current = styleAt;

  useEffect(() => {
    if (!map) return;
    const drawn = paths.map((p) => new google.maps.Polygon({ map, paths: p, clickable: false, ...styleRef.current(0) }));
    drawnRef.current = drawn;
    level.current = 0;
    const apply = (polys: google.maps.Polygon[], v: number) => polys.forEach((p) => p.setOptions(styleRef.current(v)));
    const stopIn = fade(0, 1, (v) => {
      level.current = v;
      apply(drawn, v);
    });
    return () => {
      stopIn();
      fade(level.current, 0, (v) => apply(drawn, v), () => drawn.forEach((p) => p.setMap(null)));
    };
  }, [map, paths]);

  // Restyle in place (rank, count, or theme changed) at the current fade level.
  useEffect(() => {
    drawnRef.current.forEach((p) => p.setOptions(styleAt(level.current)));
  });
}

/** Zooms to a ring (the largest) whenever it changes. */
export function FitToRing({ ring }: { ring: Ring | undefined }) {
  const map = useMap();
  useEffect(() => {
    if (!map || !ring) return;
    const bounds = new google.maps.LatLngBounds();
    toPolygonPaths(ring.geoJson).forEach(([outer]) => outer?.forEach((p) => bounds.extend(p)));
    if (!bounds.isEmpty()) map.fitBounds(bounds, 48);
  }, [map, ring]);
  return null;
}

/** The ring display treatment; on localhost it follows the style guide's live preview. */
export function useRingShape() {
  const [shape, setShape] = useState(readRingShape);
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const onStorage = (e: StorageEvent) => {
      if (e.key === RING_SHAPE_KEY) setShape(readRingShape());
    };
    addEventListener('storage', onStorage);
    return () => removeEventListener('storage', onStorage);
  }, []);
  return shape;
}

const RING_FADE_MS = 150;

/** Eases a value from `from` to `to` over RING_FADE_MS (instant with reduced motion). Returns a stop function. */
function fade(from: number, to: number, step: (v: number) => void, done?: () => void): () => void {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    step(to);
    done?.();
    return () => {};
  }
  const t0 = performance.now();
  let frame = 0;
  const tick = (now: number) => {
    const t = Math.min(1, (now - t0) / RING_FADE_MS);
    step(from + (to - from) * (1 - (1 - t) * (1 - t)));
    if (t < 1) frame = requestAnimationFrame(tick);
    else done?.();
  };
  frame = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(frame);
}
