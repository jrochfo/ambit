import { isSupported } from './emoji';

// Emoji with keywords for suggesting a custom category's icon. Tags are lowercase words or
// phrases; matching is local (no API calls), so only listed words are recognized.
const EMOJI_TAGS: readonly (readonly [string, string])[] = [
  // Food and drink
  ['☕', 'coffee cafe espresso latte roaster roastery'],
  ['🍵', 'tea matcha tea house teahouse'],
  ['🧋', 'boba bubble tea milk tea'],
  ['🧃', 'juice juice bar smoothie'],
  ['🍺', 'beer brewery brewpub pub taproom tap room beer garden'],
  ['🍷', 'wine winery wine bar vineyard liquor'],
  ['🍸', 'cocktail cocktails bar lounge speakeasy'],
  ['🥃', 'whiskey whisky bourbon distillery'],
  ['🍕', 'pizza pizzeria slice'],
  ['🍔', 'burger burgers hamburger fast food'],
  ['🌭', 'hot dog hotdog'],
  ['🌮', 'taco tacos taqueria mexican tex mex'],
  ['🌯', 'burrito burritos'],
  ['🍣', 'sushi japanese omakase'],
  ['🍜', 'ramen noodle noodles pho soup vietnamese thai'],
  ['🥟', 'dumpling dumplings dim sum'],
  ['🍛', 'curry indian thai nepali'],
  ['🍖', 'bbq barbecue korean barbecue smokehouse'],
  ['🥡', 'chinese takeout takeaway'],
  ['🍝', 'pasta italian'],
  ['🥗', 'salad healthy vegan vegetarian'],
  ['🥪', 'sandwich sandwiches deli sub'],
  ['🥯', 'bagel bagels'],
  ['🥐', 'bakery croissant pastry patisserie'],
  ['🍞', 'bread bakery'],
  ['🍩', 'donut donuts doughnut'],
  ['🧁', 'cupcake cake cakes cake shop'],
  ['🍰', 'dessert desserts cake'],
  ['🍦', 'ice cream gelato frozen yogurt froyo soft serve'],
  ['🍫', 'chocolate'],
  ['🍬', 'candy sweets confectionery'],
  ['🥩', 'steak steakhouse butcher meat'],
  ['🍗', 'chicken wings fried chicken'],
  ['🦪', 'oyster oysters seafood raw bar'],
  ['🐟', 'fish fishmonger seafood'],
  ['🥙', 'falafel gyro shawarma kebab mediterranean middle eastern greek turkish lebanese'],
  ['🍳', 'breakfast brunch diner'],
  ['🥞', 'pancakes waffles'],
  ['🍽️', 'restaurant dining dinner food'],
  ['🥬', 'grocery groceries produce market supermarket'],
  ['🛒', 'grocery supermarket trader joes trader joe whole foods safeway costco target'],
  ['🥕', 'farmers market vegetables produce organic'],
  ['🍎', 'fruit health food'],
  ['🧀', 'cheese cheesemonger'],
  // Shopping
  ['🛍️', 'shopping shop store boutique mall'],
  ['👗', 'clothing clothes dress fashion boutique'],
  ['👟', 'shoe shoes sneaker sneakers'],
  ['💍', 'jewelry jewellery jeweler'],
  ['📚', 'books bookstore bookshop library'],
  ['📖', 'books bookstore reading'],
  ['🎁', 'gift gifts gift shop'],
  ['🧸', 'toy toys toy store'],
  ['💐', 'flowers florist flower'],
  ['🪴', 'plants plant nursery garden center'],
  ['🔨', 'hardware tools home improvement'],
  ['🛋️', 'furniture home goods'],
  ['📱', 'phone cell phone electronics'],
  ['💻', 'computer electronics tech coworking cowork'],
  ['📦', 'shipping packages mail ups fedex'],
  ['📮', 'post office mail postal'],
  ['🏪', 'convenience bodega corner store deli'],
  ['💊', 'pharmacy drugstore cvs walgreens'],
  ['🚬', 'smoke shop tobacco vape'],
  ['♻️', 'recycling thrift secondhand consignment'],
  ['🧶', 'yarn knitting craft crafts'],
  ['🎨', 'art gallery museum studio painting pottery ceramics craft'],
  ['🖼️', 'gallery framing art'],
  ['📷', 'camera photo photography'],
  ['🎵', 'music record store records vinyl'],
  ['🎸', 'guitar music lessons instrument'],
  ['🎹', 'piano'],
  // Fitness and sport
  ['🧗', 'climbing climb bouldering boulder rock climbing'],
  ['🏋️', 'gym fitness weights weightlifting crossfit'],
  ['💪', 'gym fitness training'],
  ['🧘', 'yoga meditation pilates'],
  ['🤸', 'gymnastics pilates barre'],
  ['🏃', 'running run track'],
  ['🚴', 'cycling spin bike'],
  ['🚲', 'bike bicycle bike shop citibike bike share'],
  ['🛹', 'skate skatepark skateboard'],
  ['⛸️', 'ice skating rink'],
  ['🏊', 'swimming pool swim aquatic'],
  ['🎾', 'tennis'],
  ['🏓', 'ping pong table tennis pickleball paddle'],
  ['🏸', 'badminton'],
  ['🏀', 'basketball court'],
  ['⚽', 'soccer football field'],
  ['🏈', 'american football'],
  ['⚾', 'baseball softball'],
  ['⛳', 'golf'],
  ['🎳', 'bowling'],
  ['🥊', 'boxing kickboxing martial arts'],
  ['🥋', 'martial arts karate judo jiu jitsu taekwondo'],
  ['💃', 'dance dancing salsa'],
  ['🎯', 'darts'],
  // Entertainment and culture
  ['🎬', 'movie movies cinema theater film'],
  ['🎭', 'theatre theater performing arts playhouse comedy'],
  ['🎤', 'karaoke comedy open mic'],
  ['🎶', 'live music concert venue jazz'],
  ['🎮', 'arcade video games gaming'],
  ['🎲', 'board games game'],
  ['🏛️', 'museum history landmark'],
  ['🦁', 'zoo animals'],
  ['🐠', 'aquarium'],
  ['🎡', 'amusement park fair'],
  // Outdoors
  ['🌳', 'park parks green space'],
  ['🌲', 'forest woods trail'],
  ['🥾', 'hiking hike trail trails'],
  ['🌸', 'garden botanical flowers'],
  ['🏖️', 'beach'],
  ['🌊', 'waterfront ocean river lake'],
  ['🛝', 'playground slide'],
  ['🐕', 'dog dog park dogs'],
  // Services and health
  ['🐾', 'vet veterinarian pet pets animal hospital'],
  ['🐶', 'dog grooming dog walker doggy daycare'],
  ['🐱', 'cat cats cat cafe'],
  ['💇', 'hair salon haircut hairdresser'],
  ['💈', 'barber barbershop'],
  ['💅', 'nail nails manicure nail salon'],
  ['💆', 'massage spa'],
  ['🧖', 'sauna steam spa bathhouse'],
  ['🦷', 'dentist dental orthodontist'],
  ['🩺', 'doctor clinic medical urgent care'],
  ['🏥', 'hospital emergency medical'],
  ['👓', 'optometrist eye glasses optician'],
  ['🧠', 'therapy therapist psychologist'],
  ['🧺', 'laundry laundromat'],
  ['👔', 'dry cleaner dry cleaning tailor alterations'],
  ['🔑', 'locksmith keys'],
  ['🏦', 'bank atm credit union'],
  ['💵', 'cash atm money'],
  ['🏧', 'atm'],
  ['⛽', 'gas station fuel'],
  ['🔌', 'ev charging electric vehicle charger'],
  ['🅿️', 'parking garage parking lot'],
  ['🚗', 'car rental car wash auto'],
  ['🔧', 'repair mechanic auto repair'],
  // Transit and civic
  ['🚇', 'subway metro transit station'],
  ['🚉', 'train station rail'],
  ['🚏', 'bus stop'],
  ['🚌', 'bus'],
  ['🚊', 'tram streetcar light rail'],
  ['⛴️', 'ferry'],
  ['✈️', 'airport'],
  ['🏫', 'school elementary high school'],
  ['🎓', 'university college campus'],
  ['🧒', 'daycare child care preschool kids'],
  ['⛪', 'church chapel'],
  ['🕌', 'mosque'],
  ['🕍', 'synagogue temple'],
  ['🛕', 'hindu temple temple'],
  ['🚓', 'police'],
  ['🚒', 'fire station'],
  ['🗳️', 'polling place voting city hall'],
  ['🧑‍💻', 'coworking cowork office'],
  ['🏨', 'hotel inn lodging'],
  ['🛏️', 'hostel bed and breakfast'],
  ['🚻', 'restroom bathroom public bathroom'],
  // Generic fallbacks for the "More" list
  ['📍', 'pin place'],
  ['⭐', 'favorite star'],
  ['❤️', 'love heart favorite'],
  ['🏠', 'home house'],
];

// Words that appear in many names; they count, but never decide the match on their own.
const GENERIC = new Set(['store', 'shop', 'bar', 'center', 'station', 'studio', 'place', 'house', 'club', 'market', 'service', 'restaurant', 'food']);

const ENTRIES = EMOJI_TAGS.map(([emoji, tags]) => ({ emoji, tags: tags.split(' ') }));

function words(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[’']/g, '')
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

export interface EmojiSuggestion {
  emoji: string;
  /** 2+ means a whole-word match. */
  score: number;
}

/**
 * Emoji for a category name (and its Google type, if any), best first. A whole-word match
 * scores 2 (1 for generic words like "store"), a shared stem (climbing ~ climb, bagels ~ bagel)
 * scores 1. Unsupported emoji are skipped.
 */
export function suggestEmoji(label: string, type?: string): EmojiSuggestion[] {
  const text = new Set([...words(label), ...(type ? type.split('_') : [])]);
  const scored = ENTRIES.flatMap(({ emoji, tags }) => {
    let score = 0;
    for (const tag of new Set(tags)) {
      if (text.has(tag)) score += GENERIC.has(tag) ? 1 : 2;
      else if (!GENERIC.has(tag) && tag.length >= 4 && [...text].some((w) => w.length >= 4 && (w.startsWith(tag) || tag.startsWith(w)))) score += 1;
    }
    return score > 0 && isSupported(emoji) ? [{ emoji, score }] : [];
  });
  return scored.sort((a, b) => b.score - a.score);
}

/** Top suggestion when it's a whole-word match, else null (callers fall back to 📍). */
export function strongEmojiMatch(label: string, type?: string): string | null {
  const top = suggestEmoji(label, type)[0];
  return top && top.score >= 2 ? top.emoji : null;
}

/** Every tagged emoji the device can draw, for the "More" section. */
export function allEmoji(): string[] {
  return [...new Set(ENTRIES.map((e) => e.emoji))].filter(isSupported);
}
