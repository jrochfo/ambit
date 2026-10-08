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
  note: string;
}

export interface SansFont {
  name: string;
  family: string;
  query: string;
  note: string;
}

export const DISPLAY_FONTS: DisplayFont[] = [
  { name: 'Figtree (current)', family: 'Figtree', query: 'Figtree:wght@700', weight: 700, note: 'Same as the interface. Quiet and consistent.' },
  {
    name: 'Fraunces, soft italic',
    family: 'Fraunces',
    query: 'Fraunces:ital,opsz,wght,SOFT,WONK@0,9..144,100..900,0..100,0..1;1,9..144,100..900,0..100,0..1',
    weight: 600,
    style: 'italic',
    variation: "'SOFT' 100, 'WONK' 1, 'opsz' 72",
    scale: 1.08,
    note: 'Variable “wonky” serif with soft, rounded terminals. Bouncy and warm in italic; can dial back to a calmer serif.',
  },
  { name: 'Caprasimo', family: 'Caprasimo', query: 'Caprasimo', weight: 400, scale: 1.02, note: 'Chunky 1970s-flavored serif. Friendly and confident; reads well small.' },
  { name: 'Young Serif', family: 'Young Serif', query: 'Young+Serif', weight: 400, scale: 1.04, note: 'Warm, slightly odd old-style serif. Playful without shouting.' },
  { name: 'Gloock', family: 'Gloock', query: 'Gloock', weight: 400, scale: 1.08, note: 'High-contrast serif with quirky curves. More editorial, a bit of drama.' },
  { name: 'Borel', family: 'Borel', query: 'Borel', weight: 400, scale: 0.78, note: 'Rounded, modern cursive (2023). Bubbly and very current. Tall line height.' },
  { name: 'Yellowtail', family: 'Yellowtail', query: 'Yellowtail', weight: 400, scale: 1.25, note: 'Retro brush script, like a diner sign. Lots of personality.' },
  { name: 'Grand Hotel', family: 'Grand Hotel', query: 'Grand+Hotel', weight: 400, scale: 1.25, note: 'Vintage connected script. Travel-poster nostalgia.' },
  { name: 'Shrikhand', family: 'Shrikhand', query: 'Shrikhand', weight: 400, scale: 0.98, note: 'Heavy, curvy italic display. Loud and joyful.' },
  {
    name: 'Bricolage Grotesque',
    family: 'Bricolage Grotesque',
    query: 'Bricolage+Grotesque:opsz,wght@12..96,400..800',
    weight: 800,
    variation: "'opsz' 96",
    scale: 1.04,
    note: 'Expressive sans with ink traps. Playful but not a script; pairs naturally with a sans UI.',
  },
];

export const SANS_FONTS: SansFont[] = [
  { name: 'Figtree (current)', family: 'Figtree', query: 'Figtree:wght@400;600;700', note: 'Geometric and friendly, open shapes, clean numbers. A solid fit already.' },
  { name: 'Inter', family: 'Inter', query: 'Inter:wght@400;600;700', note: 'The web’s default UI face. Superbly legible, but generic: it reads as “any app.”' },
  { name: 'DM Sans', family: 'DM Sans', query: 'DM+Sans:wght@400;600;700', note: 'Close cousin to Figtree: geometric, low contrast, a touch more rounded and compact.' },
  { name: 'Plus Jakarta Sans', family: 'Plus Jakarta Sans', query: 'Plus+Jakarta+Sans:wght@400;600;700', note: 'Modern with a little flair (sharp terminals, distinctive g). Slightly premium.' },
  { name: 'Onest', family: 'Onest', query: 'Onest:wght@400;600;700', note: 'Calm, warm grotesk. Very even texture in dense lists.' },
  { name: 'Hanken Grotesk', family: 'Hanken Grotesk', query: 'Hanken+Grotesk:wght@400;600;700', note: 'Crisp, slightly narrow grotesk. Fits more on a line; a bit more serious.' },
  { name: 'Schibsted Grotesk', family: 'Schibsted Grotesk', query: 'Schibsted+Grotesk:wght@400;600;700', note: 'Editorial grotesk with quirky details. More character, less neutral.' },
  { name: 'Rethink Sans', family: 'Rethink Sans', query: 'Rethink+Sans:wght@400;600;700', note: 'Friendly, contemporary, slightly rounded. Similar mood to Figtree, softer.' },
  {
    name: 'Atkinson Hyperlegible Next',
    family: 'Atkinson Hyperlegible Next',
    query: 'Atkinson+Hyperlegible+Next:wght@400;600;700',
    note: 'Designed for low-vision readers: unmistakable letters and numbers. Distinctive and on-mission for accessibility.',
  },
];

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
