// Muted basemap in the palette's warm-gray map colors (--map-* in styles.css), so the gold
// rings carry the color. Only applies to maps without a mapId.
export const MAP_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#f3eee6' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#6c675e' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#f3eee6' }] },
  { featureType: 'poi', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi', elementType: 'labels.text', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#d7ebd7' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#fffdfb' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#e2ddd5' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#cfcac2' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#fbf8f2' }] },
  { featureType: 'transit', elementType: 'labels.icon', stylers: [{ saturation: -100 }, { lightness: 20 }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#cbe2ee' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#6c675e' }] },
];

// Dark counterpart, from the dark theme's --map-* tokens.
export const MAP_STYLE_DARK: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#221f19' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#9c9890' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#221f19' }] },
  { featureType: 'poi', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi', elementType: 'labels.text', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#192919' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#312d27' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#1b1812' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#403d36' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#2a2620' }] },
  { featureType: 'transit', elementType: 'labels.icon', stylers: [{ saturation: -100 }, { lightness: -30 }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0a1d26' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#9c9890' }] },
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
