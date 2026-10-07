export interface Category {
  id: string;
  label: string;
  /** Preferred emoji first, older fallbacks after; see pickEmoji. */
  emoji: readonly string[];
  /** Pin border and row tint. */
  color: string;
  /** Google place types (Places API (New), Table A), matched against each place's primary type. */
  types: string[];
  /**
   * How far outside a ring edge (meters) a place still counts as inside it. Google gives one
   * point per place; for parks and campuses that's the middle, while you walk to the edge.
   */
  edgeTolerance?: number;
}

/** Slack for ordinary places: absorbs small gaps between the Isochrones API and Maps directions. */
export const DEFAULT_EDGE_TOLERANCE = 40;
const AREA_TOLERANCE = 120;

// Each enabled category costs one Nearby Search per mapped address.
export const CATEGORIES: Category[] = [
  { id: 'grocery', label: 'Grocery store', emoji: ['🥬', '🛒', '🍎'], color: '#2F7D32', types: ['grocery_store', 'supermarket'] },
  { id: 'coffee', label: 'Coffee shop', emoji: ['☕'], color: '#8A5A2B', types: ['coffee_shop', 'cafe', 'coffee_roastery'] },
  { id: 'drugstore', label: 'Drugstore', emoji: ['💊'], color: '#B53A2D', types: ['pharmacy', 'drugstore'] },
  { id: 'gym', label: 'Gym', emoji: ['🏋️', '💪'], color: '#A86300', types: ['gym', 'fitness_center'] },
  { id: 'yoga', label: 'Yoga studio', emoji: ['🧘', '🙏'], color: '#8A6BA8', types: ['yoga_studio'] },
  { id: 'park', label: 'Park', emoji: ['🌳'], color: '#3F7F3A', types: ['park'], edgeTolerance: AREA_TOLERANCE },
  { id: 'playground', label: 'Playground', emoji: ['🛝', '🎠'], color: '#C7782A', types: ['playground'] },
  { id: 'transit', label: 'Transit stop', emoji: ['🚇', '🚉'], color: '#1F5FA8', types: ['subway_station', 'train_station', 'light_rail_station'] },
  { id: 'bus', label: 'Bus stop', emoji: ['🚏'], color: '#3B6E9E', types: ['bus_stop'] },
  { id: 'restaurant', label: 'Restaurant', emoji: ['🍽️', '🍴'], color: '#C0562E', types: ['restaurant'] },
  { id: 'bar', label: 'Bar', emoji: ['🍸'], color: '#8E3B6B', types: ['bar', 'pub', 'wine_bar'] },
  { id: 'nightclub', label: 'Nightclub', emoji: ['🪩', '🕺', '💃'], color: '#1F3A93', types: ['night_club'] },
  { id: 'movies', label: 'Movie theater', emoji: ['🎬'], color: '#3A3A5A', types: ['movie_theater'] },
  { id: 'bakery', label: 'Bakery', emoji: ['🥐', '🍞'], color: '#B07A2A', types: ['bakery'] },
  { id: 'farmers', label: 'Farmers market', emoji: ['🥕', '🍅'], color: '#C25E1F', types: ['farmers_market'] },
  { id: 'salon', label: 'Salon', emoji: ['💇'], color: '#7B3FA0', types: ['hair_salon', 'beauty_salon', 'barber_shop', 'hair_care'] },
  { id: 'laundry', label: 'Laundromat', emoji: ['🧺', '👕'], color: '#4A7A8C', types: ['laundry'] },
  { id: 'convenience', label: 'Corner store', emoji: ['🏪'], color: '#5E6B2E', types: ['convenience_store'] },
  { id: 'liquor', label: 'Liquor store', emoji: ['🍷'], color: '#7A2E3B', types: ['liquor_store'] },
  { id: 'hardware', label: 'Hardware store', emoji: ['🔨'], color: '#6B5B4B', types: ['hardware_store', 'home_improvement_store'] },
  { id: 'library', label: 'Library', emoji: ['📚'], color: '#4B5A8C', types: ['library'] },
  { id: 'books', label: 'Bookstore', emoji: ['📖', '📚'], color: '#5A4B8C', types: ['book_store'] },
  { id: 'school', label: 'School', emoji: ['🏫'], color: '#8C6B1F', types: ['school', 'primary_school'], edgeTolerance: AREA_TOLERANCE },
  { id: 'dogpark', label: 'Dog park', emoji: ['🐕'], color: '#7A5A3A', types: ['dog_park'], edgeTolerance: AREA_TOLERANCE },
  { id: 'vet', label: 'Vet', emoji: ['🐾'], color: '#5A7A5A', types: ['veterinary_care'] },
  { id: 'pets', label: 'Pet store', emoji: ['🦴', '🐈'], color: '#8C6A4A', types: ['pet_store'] },
  { id: 'doctor', label: 'Doctor', emoji: ['🩺', '🏥'], color: '#B53A5A', types: ['doctor'] },
  { id: 'dentist', label: 'Dentist', emoji: ['🦷', '😁'], color: '#4A8CA0', types: ['dentist'] },
  { id: 'post', label: 'Post office', emoji: ['📮'], color: '#B04A2A', types: ['post_office'] },
  { id: 'bank', label: 'Bank or ATM', emoji: ['🏦'], color: '#3A5A7A', types: ['bank', 'atm'] },
];

export const DEFAULT_CATEGORY_IDS = ['grocery', 'transit', 'drugstore', 'park', 'coffee'];
