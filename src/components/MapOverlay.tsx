import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useMap } from '@vis.gl/react-google-maps';

/**
 * Pins arbitrary HTML to a lat/lng. Used for the origin dot and ring labels so
 * they can share the page's fonts; AdvancedMarker would need a cloud map ID,
 * which disables the custom basemap style.
 */
export function MapOverlay({
  position,
  interactive = false,
  children,
}: {
  position: google.maps.LatLngLiteral;
  /** Interactive overlays sit in the pane that receives mouse events and don't pan the map. */
  interactive?: boolean;
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
    ov.onAdd = () => {
      const panes = ov.getPanes();
      (interactive ? panes?.overlayMouseTarget : panes?.floatPane)?.appendChild(container);
    };
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
    };
    overlay.draw();
  }, [overlay, position, container]);

  return createPortal(children, container);
}
