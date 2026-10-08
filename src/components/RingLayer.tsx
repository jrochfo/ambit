import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMap } from '@vis.gl/react-google-maps';
import type { Ring } from '../../shared/isochrones';
import { toPolygonPaths, topPoint } from '../lib/geojson';
import { ringStyle } from '../lib/rings';
import { RING_SHAPE_KEY, readRingShape, shapePolygons } from '../lib/ringShape';
import { MapOverlay, OVERLAY_Z } from './MapOverlay';
import { RingLabel } from './MapParts';

/** One walking ring; `rank` is its position among active rings (0 = smallest). */
export function RingLayer({ ring, rank, count }: { ring: Ring; rank: number; count: number }) {
  const map = useMap();
  const shape = useRingShape();
  const paths = useMemo(() => shapePolygons(toPolygonPaths(ring.geoJson), shape), [ring.geoJson, shape]);
  const labelAt = useMemo(() => topPoint(paths), [paths]);

  const polygons = useRef<google.maps.Polygon[]>([]);
  // How much of the ring's style is showing (0–1), eased when it's added or removed.
  const level = useRef(0);
  const restyle = useCallback(() => {
    const style = ringStyle(rank, count);
    // Google polygons need a literal color; take the theme's data color.
    const color = getComputedStyle(document.documentElement).getPropertyValue('--data').trim() || '#0e7c74';
    for (const p of polygons.current)
      p.setOptions({ fillColor: color, strokeColor: color, fillOpacity: style.fill * level.current, strokeOpacity: style.stroke * level.current, zIndex: style.z });
  }, [rank, count]);
  const restyleRef = useRef(restyle);
  restyleRef.current = restyle;
  const styleRef = useRef(ringStyle(rank, count));
  styleRef.current = ringStyle(rank, count);

  // Draw the ring and fade it in; on removal, fade it out, then take it off the map.
  useEffect(() => {
    if (!map) return;
    const drawn = paths.map((p) => new google.maps.Polygon({ map, paths: p, clickable: false, strokeWeight: 2 }));
    polygons.current = drawn;
    level.current = 0;
    restyleRef.current();
    const stopIn = fade(0, 1, (v) => {
      level.current = v;
      restyleRef.current();
    });
    return () => {
      stopIn();
      const from = level.current;
      fade(from, 0, (v) => {
        const style = styleRef.current;
        for (const p of drawn) p.setOptions({ fillOpacity: style.fill * v, strokeOpacity: style.stroke * v });
      }, () => drawn.forEach((p) => p.setMap(null)));
    };
    // rank/count changes restyle in place (below) rather than redrawing.
  }, [map, paths]);

  useEffect(restyle, [restyle]);

  if (!labelAt) return null;
  return (
    <MapOverlay position={labelAt} zIndex={OVERLAY_Z.ringLabel}>
      <RingLabel minutes={ring.minutes} />
    </MapOverlay>
  );
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
function useRingShape() {
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
