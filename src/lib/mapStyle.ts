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
