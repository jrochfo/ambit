// Font candidates for the type lab, and a dev-only preview: the lab saves a choice to
// localStorage and the sandbox (in another tab) applies it live by overriding the font tokens.
// Nothing here affects the deployed app.

export interface DisplayFont {
  name: string;
  family: string;
  /** Google Fonts css2 `family=` value. */
  query: string;
  weight: number;
  style?: 'italic';
  variation?: string;
  /** Size multiplier so faces that read small (scripts) sit at a similar visual size. */
  scale?: number;
  /** Shown in its own lab section. */
  group?: 'slab';
  note: string;
}

export interface SansFont {
  name: string;
  family: string;
  query: string;
  note: string;
}

export const DISPLAY_FONTS: DisplayFont[] = [
  { name: 'Young Serif (current)', family: 'Young Serif', query: 'Young+Serif', weight: 400, scale: 1.04, note: 'Warm, slightly odd old-style serif. Playful without shouting.' },
  { name: 'Figtree', family: 'Figtree', query: 'Figtree:wght@700', weight: 700, note: 'The previous UI font, bold. Quiet and consistent.' },
  { name: 'Oleo Script', family: 'Oleo Script', query: 'Oleo+Script:wght@400;700', weight: 700, scale: 1.08, note: 'Bold, rounded, upright-ish script. Friendly and very legible small.' },
  { name: 'Lily Script One', family: 'Lily Script One', query: 'Lily+Script+One', weight: 400, scale: 1.04, note: 'Chunky retro script with a lot of bounce. Mid-century packaging.' },
  { name: 'Leckerli One', family: 'Leckerli One', query: 'Leckerli+One', weight: 400, scale: 1.02, note: 'Heavy, marker-made script. Casual and cheerful, the most “hand” of the set.' },
  { name: 'Damion', family: 'Damion', query: 'Damion', weight: 400, scale: 1.22, note: 'Fast, slanted brush script. 1950s sign-painter energy, lighter weight.' },
  { name: 'Cookie', family: 'Cookie', query: 'Cookie', weight: 400, scale: 1.4, note: 'Soft, rounded retro script. Sweet and nostalgic; needs size to read.' },
  { name: 'Sacramento', family: 'Sacramento', query: 'Sacramento', weight: 400, scale: 1.45, note: 'Thin monoline script, like a neon sign. Elegant, but delicate small.' },
  // Bookish, humanist slab serifs in the direction of Archer (which isn't on Google Fonts).
  { name: 'Josefin Slab', family: 'Josefin Slab', query: 'Josefin+Slab:wght@500;600;700', weight: 600, scale: 1.12, group: 'slab', note: 'Geometric, light-boned, 1920s–30s flavor. Closest to Archer’s delicate, domestic charm.' },
  { name: 'Zilla Slab', family: 'Zilla Slab', query: 'Zilla+Slab:wght@500;600;700', weight: 600, scale: 1.04, group: 'slab', note: 'Humanist slab with a bookish, slightly quirky voice. Warm and literate.' },
  { name: 'Aleo', family: 'Aleo', query: 'Aleo:wght@500;600;700', weight: 600, scale: 1.0, group: 'slab', note: 'Soft, semi-rounded slab. Gentle and friendly; the most “kitchen table.”' },
  { name: 'Bitter', family: 'Bitter', query: 'Bitter:wght@500;600;700', weight: 600, scale: 1.0, group: 'slab', note: 'Sturdy humanist slab made for reading on screens. Calm, dependable.' },
  { name: 'Rokkitt', family: 'Rokkitt', query: 'Rokkitt:wght@500;600;700', weight: 600, scale: 1.18, group: 'slab', note: 'Narrow geometric slab with a vintage, typewriter-poster feel.' },
  { name: 'Sanchez', family: 'Sanchez', query: 'Sanchez', weight: 400, scale: 1.04, group: 'slab', note: 'Slab with gently curved serifs and some character. Modern-classic.' },
  { name: 'Crete Round', family: 'Crete Round', query: 'Crete+Round', weight: 400, scale: 1.04, group: 'slab', note: 'Rounded, slightly calligraphic slab. Cozy and approachable.' },
  { name: 'Arvo', family: 'Arvo', query: 'Arvo:wght@400;700', weight: 400, scale: 1.0, group: 'slab', note: 'Clean geometric slab. More neutral; a dependable baseline for comparison.' },
];

export const SANS_FONTS: SansFont[] = [
  { name: 'Hanken Grotesk (current)', family: 'Hanken Grotesk', query: 'Hanken+Grotesk:wght@400;600;700', note: 'Crisp, slightly narrow grotesk. Fits more on a line; a bit more serious.' },
  { name: 'Figtree', family: 'Figtree', query: 'Figtree:wght@400;600;700', note: 'The previous UI font: geometric and friendly, open shapes.' },
  { name: 'Rethink Sans', family: 'Rethink Sans', query: 'Rethink+Sans:wght@400;600;700', note: 'Friendly, contemporary, slightly rounded. Similar mood to Figtree, softer.' },
  {
    name: 'Atkinson Hyperlegible Next',
    family: 'Atkinson Hyperlegible Next',
    query: 'Atkinson+Hyperlegible+Next:wght@400;600;700',
    note: 'Designed for low-vision readers: unmistakable letters and numbers. Distinctive and on-mission for accessibility.',
  },
];

export const CURRENT_DISPLAY = 'Young Serif (current)';
export const CURRENT_SANS = 'Hanken Grotesk (current)';

export interface TypePreview {
  display?: string;
  sans?: string;
}

const KEY = 'ambit.typePreview';

export function readTypePreview(): TypePreview {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}') as TypePreview;
  } catch {
    return {};
  }
}

export function writeTypePreview(preview: TypePreview): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(preview));
  } catch {
    // Preview just won't carry over.
  }
}

/** Loads Google Fonts families by their css2 `family=` values (once each). */
export function loadFonts(queries: string[], id = 'type-preview-fonts'): void {
  const href = `https://fonts.googleapis.com/css2?${queries.map((q) => `family=${q}`).join('&')}&display=swap`;
  let link = document.getElementById(id) as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    document.head.append(link);
  }
  if (link.href !== href) link.href = href;
}

/** Applies a saved preview by overriding the font tokens on <html> (sandbox only). */
export function applyTypePreview(preview: TypePreview = readTypePreview()): void {
  const root = document.documentElement.style;
  const display = DISPLAY_FONTS.find((f) => f.name === preview.display);
  const sans = SANS_FONTS.find((f) => f.name === preview.sans);
  loadFonts([display?.query, sans?.query].filter((q): q is string => !!q));
  if (sans) root.setProperty('--font', `'${sans.family}', system-ui, sans-serif`);
  else root.removeProperty('--font');
  if (display) {
    root.setProperty('--font-display', `'${display.family}', var(--font)`);
    root.setProperty('--display-weight', String(display.weight));
    root.setProperty('--display-style', display.style ?? 'normal');
    root.setProperty('--display-variation', display.variation ?? 'normal');
    root.setProperty('--display-scale', String(display.scale ?? 1));
  } else {
    for (const p of ['--font-display', '--display-weight', '--display-style', '--display-variation', '--display-scale']) root.removeProperty(p);
  }
}
