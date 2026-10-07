export interface Category {
  id: string;
  label: string;
  /** Letter shown in the row avatar and on the map pin. */
  letter: string;
  color: string;
  /** Google place types (Places API (New), Table A), matched against each place's primary type. */
  types: string[];
}

// Each category costs one Nearby Search per mapped address, so keep this list deliberate.
export const PRESET_CATEGORIES: Category[] = [
  { id: 'coffee', label: 'Coffee shop', letter: 'C', color: '#8A5A2B', types: ['coffee_shop', 'cafe', 'coffee_roastery'] },
  { id: 'grocery', label: 'Grocery store', letter: 'G', color: '#2F7D32', types: ['grocery_store', 'supermarket'] },
  { id: 'drugstore', label: 'Drugstore', letter: 'P', color: '#B53A2D', types: ['pharmacy', 'drugstore'] },
  { id: 'salon', label: 'Salon', letter: 'S', color: '#7B3FA0', types: ['hair_salon', 'beauty_salon', 'barber_shop', 'hair_care'] },
  { id: 'nightclub', label: 'Nightclub', letter: 'N', color: '#1F3A93', types: ['night_club'] },
  { id: 'gym', label: 'Gym', letter: 'Y', color: '#A86300', types: ['gym', 'fitness_center'] },
];
