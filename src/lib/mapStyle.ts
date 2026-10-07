// Muted basemap that lets the teal rings carry the color, matching the mock-up's
// greys, pale water and soft parks. Only applies to maps without a mapId.
export const MAP_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#eef1ef' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#55625e' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#eef1ef' }] },
  { featureType: 'poi', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi', elementType: 'labels.text', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#dae7db' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#d9dfdc' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#c6cec9' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#f7f8f7' }] },
  { featureType: 'transit', elementType: 'labels.icon', stylers: [{ saturation: -100 }, { lightness: 20 }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#d4e3ea' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#7d959f' }] },
];

// Dark counterpart, matching the dark theme's tokens in styles.css.
export const MAP_STYLE_DARK: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#1b2524' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#9aaba7' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1b2524' }] },
  { featureType: 'poi', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi', elementType: 'labels.text', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#1a2e22' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2a3634' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#1f2b29' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#3a4846' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#2f3c3a' }] },
  { featureType: 'transit', elementType: 'labels.icon', stylers: [{ saturation: -100 }, { lightness: -30 }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#24302e' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#10262d' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#5f7d88' }] },
];

const NO_LABELS: google.maps.MapTypeStyle = { elementType: 'labels', stylers: [{ visibility: 'off' }] };

/** Basemap style for the theme; before an address is mapped, labels are hidden as a quiet backdrop. */
export function mapStyleFor(theme: 'light' | 'dark', mapped: boolean): google.maps.MapTypeStyle[] {
  const base = theme === 'dark' ? MAP_STYLE_DARK : MAP_STYLE;
  return mapped ? base : [...base, NO_LABELS];
}

// Walkable neighborhoods to open on, one picked per page load. Only the starting
// view changes; a map load is billed the same at any zoom.
const START_VIEWS: google.maps.LatLngLiteral[] = [
  { lat: 40.7265, lng: -73.9815 }, // New York, East Village
  { lat: 41.9214, lng: -87.6513 }, // Chicago, Lincoln Park
  { lat: 37.7599, lng: -122.4148 }, // San Francisco, Mission
  { lat: 42.3505, lng: -71.0763 }, // Boston, Back Bay
  { lat: 39.9496, lng: -75.1703 }, // Philadelphia, Rittenhouse
  { lat: 47.6145, lng: -122.3205 }, // Seattle, Capitol Hill
  { lat: 45.5231, lng: -122.6765 }, // Portland, Pearl District
  { lat: 38.9097, lng: -77.0425 }, // Washington, Dupont Circle
  { lat: 45.5235, lng: -73.5810 }, // Montreal, Plateau
  { lat: 43.6545, lng: -79.4003 }, // Toronto, Kensington Market
  { lat: 49.2827, lng: -123.1207 }, // Vancouver, Downtown
  { lat: 19.4136, lng: -99.1717 }, // Mexico City, Roma Norte
  { lat: 29.9584, lng: -90.0644 }, // New Orleans, French Quarter
  { lat: 44.9778, lng: -93.2650 }, // Minneapolis, Downtown
  { lat: 39.7392, lng: -104.9903 }, // Denver, Downtown
  { lat: 30.2672, lng: -97.7431 }, // Austin, Downtown
  { lat: 40.4406, lng: -79.9959 }, // Pittsburgh, Downtown
  { lat: 34.0870, lng: -118.2700 }, // Los Angeles, Silver Lake
];
export const START_ZOOM = 15;

export function randomStartView(): google.maps.LatLngLiteral {
  return START_VIEWS[Math.floor(Math.random() * START_VIEWS.length)]!;
}
