import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useMap } from '@vis.gl/react-google-maps';

/** Stacking order of overlays, which all share one pane (spot cards must top ring labels). */
export const OVERLAY_Z = { ringLabel: 1, pin: 2, origin: 3, openPin: 10 } as const;

/**
 * Pins arbitrary HTML to a lat/lng. Used for the origin dot, ring labels and spot pins so
 * they can share the page's fonts; AdvancedMarker would need a cloud map ID,
 * which disables the custom basemap style.
 */
export function MapOverlay({
  position,
  interactive = false,
  zIndex,
  children,
}: {
  position: google.maps.LatLngLiteral;
  /** Interactive overlays take mouse events without panning or clicking the map. */
  interactive?: boolean;
  /** See OVERLAY_Z. */
  zIndex?: number;
  children: ReactNode;
}) {
  const map = useMap();
  const container = useMemo(() => {
    const el = document.createElement('div');
    el.style.position = 'absolute';
    return el;
  }, []);
  const [overlay, setOverlay] = useState<google.maps.OverlayView | null>(null);

  useEffect(() => {
    if (!map) return;
    const ov = new google.maps.OverlayView();
    // One pane for everything, so z-index alone decides what's on top.
    ov.onAdd = () => ov.getPanes()?.floatPane.appendChild(container);
    if (interactive) google.maps.OverlayView.preventMapHitsAndGesturesFrom(container);
    ov.onRemove = () => container.remove();
    ov.setMap(map);
    setOverlay(ov);
    return () => {
      ov.setMap(null);
      setOverlay(null);
    };
  }, [map, container, interactive]);

  useEffect(() => {
    if (!overlay) return;
    overlay.draw = () => {
      const point = overlay.getProjection()?.fromLatLngToDivPixel(position);
      if (!point) return;
      container.style.left = `${point.x}px`;
      container.style.top = `${point.y}px`;
      // Flag overlays near the map's top so popups open downward (see .spot-card); sideways, the
      // card shifts itself to stay inside the map (CategoryPin).
      const onScreen = overlay.getProjection()?.fromLatLngToContainerPixel(position);
      const mapDiv = overlay.getMap() instanceof google.maps.Map ? (overlay.getMap() as google.maps.Map).getDiv() : null;
      if (onScreen && mapDiv) {
        container.dataset.edgeTop = String(onScreen.y < 190);
      }
    };
    overlay.draw();
  }, [overlay, position, container]);

  useEffect(() => {
    container.style.zIndex = zIndex === undefined ? '' : String(zIndex);
  }, [container, zIndex]);

  return createPortal(children, container);
}
