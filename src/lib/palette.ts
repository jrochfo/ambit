// Palette generator for the color lab (dev only). A palette is a few choices (accent hue and
// strength, neutral tint, ring hues); every color token is derived from them in OKLCH, a
// perceptual color space, and each text/outline color's lightness is solved until it meets its
// WCAG contrast minimum against every background it sits on. The current palette (teal) lives in
// src/styles.css; generated palettes override it only in the sandbox until one is chosen.

export interface PaletteSpec {
  id: string;
  name: string;
  note: string;
  kind: 'hue' | 'bold';
  /** Accent hue (OKLCH degrees, 0–360) and chroma (0 gray … ~0.2 vivid). */
  accentHue: number;
  accentChroma: number;
  /** Lightness of the accent as a fill in light mode (buttons, smallest ring). */
  accentFillL?: number;
  /** Tint of the grays (page, cards, lines, text). */
  neutralHue: number;
  neutralChroma: number;
  /** Ring ramp hue: from the smallest ring to the largest (defaults to the accent). */
  ringHue?: number;
  ringHueEnd?: number;
  ringChroma?: number;
  /** Page lightness in light mode (lower = more paper-like). */
  pageL?: number;
}

export type Tokens = Record<string, string>;

// ── Color math ───────────────────────────────────────────────────────────────

type RGB = [number, number, number];

function oklchToLinear(L: number, C: number, H: number): RGB {
  const h = (H * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ ** 3;
  const m = m_ ** 3;
  const s = s_ ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

const inGamut = (rgb: RGB) => rgb.every((v) => v >= -0.0001 && v <= 1.0001);
const toSrgb = (v: number) => {
  const c = Math.min(1, Math.max(0, v));
  return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
};

/** OKLCH to linear sRGB, reducing chroma until the color fits in sRGB. */
function oklchLinear(L: number, C: number, H: number): RGB {
  let lo = 0;
  let hi = C;
  if (inGamut(oklchToLinear(L, C, H))) return oklchToLinear(L, C, H);
  for (let i = 0; i < 20; i++) {
    const mid = (lo + hi) / 2;
    if (inGamut(oklchToLinear(L, mid, H))) lo = mid;
    else hi = mid;
  }
  return oklchToLinear(L, lo, H);
}

export function oklch(L: number, C: number, H: number): string {
  const [r, g, b] = oklchLinear(L, C, H).map((v) => Math.round(toSrgb(v) * 255));
  return `#${[r, g, b].map((v) => v!.toString(16).padStart(2, '0')).join('')}`;
}

function luminance(hex: string): number {
  const v = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = v.map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

/**
 * The lightness closest to `startL`, moving in `direction`, at which the color reaches `min`
 * contrast against every background.
 */
function solve(startL: number, C: number, H: number, backgrounds: string[], min: number, direction: 1 | -1): string {
  for (let L = startL; L >= 0 && L <= 1; L += 0.005 * direction) {
    const c = oklch(L, C, H);
    if (backgrounds.every((bg) => contrast(c, bg) >= min)) return c;
  }
  return direction < 0 ? '#000000' : '#ffffff';
}

/** The better of near-white or near-black text on a fill (both checked for 4.5:1). */
function textOn(fill: string, light: string, dark: string): string {
  return contrast(light, fill) >= contrast(dark, fill) ? light : dark;
}

const rgbOf = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(', ');

// ── Generator ───────────────────────────────────────────────────────────────

const TEXT = 4.6; // a hair above 4.5 to absorb rounding
const OUTLINE = 3.1;

export function generate(spec: PaletteSpec, theme: 'light' | 'dark'): Tokens {
  const { accentHue: ah, accentChroma: ac, neutralHue: nh, neutralChroma: nc } = spec;
  const n = (L: number, cMul = 1) => oklch(L, nc * cMul, nh);
  const ringHue = (i: number) => {
    const a = spec.ringHue ?? ah;
    const b = spec.ringHueEnd ?? a;
    return a + ((b - a) * i) / 5;
  };
  const rc = spec.ringChroma ?? ac;
  const t: Tokens = {};

  if (theme === 'light') {
    t['--page'] = n(spec.pageL ?? 0.972);
    t['--card'] = n(0.995, 0.4);
    t['--highlight'] = oklch(0.968, ac * 0.18, ah);
    t['--row-hover'] = n(0.962);
    t['--row-hover-current'] = oklch(0.935, ac * 0.3, ah);
    const surfaces = [t['--page'], t['--card'], t['--highlight'], t['--row-hover-current']];
    t['--ink'] = n(0.22, 1.2);
    t['--ink-2'] = solve(0.4, nc * 1.2, nh, surfaces, 7, -1);
    t['--ink-3'] = solve(0.52, nc * 1.2, nh, surfaces, TEXT, -1);
    t['--danger'] = solve(0.55, 0.17, 27, surfaces, TEXT, -1);
    t['--line'] = n(0.9);
    t['--line-subtle'] = n(0.935);
    t['--line-control'] = solve(0.62, nc, nh, [t['--card']], OUTLINE, -1);
    t['--line-muted'] = n(0.72);
    t['--scroll-thumb'] = n(0.84);
    const fill = solveFill(spec.accentFillL ?? 0.52, ac, ah);
    t['--accent'] = fill.color;
    t['--on-accent'] = fill.text;
    t['--accent-text'] = solve(Math.min(spec.accentFillL ?? 0.52, 0.55), ac, ah, surfaces, TEXT, -1);
    t['--accent-pale'] = oklch(0.92, ac * 0.35, ah);
    t['--map-land'] = n(0.95);
    t['--map-road'] = n(0.995, 0.3);
    t['--map-highway'] = n(0.84);
    t['--map-water'] = oklch(0.9, 0.03, 230);
    t['--map-park'] = oklch(0.92, 0.035, 145);
    t['--map-wash'] = `rgba(${rgbOf(t['--page'])}, 0.55)`;
    t['--accent-ink'] = solve(0.45, ac, ah, [t['--map-land']], TEXT, -1);
    const ringL = [spec.accentFillL ?? 0.52, 0.72, 0.82, 0.89, 0.935, 0.962];
    ringL.forEach((L, i) => {
      const chroma = i === 0 ? rc : rc * (0.75 - i * 0.1);
      const ring = i === 0 && !spec.ringHue ? fill.color : solveFill(L, Math.max(chroma, 0), ringHue(i)).color;
      t[`--ring-${i + 1}`] = ring;
      t[`--ring-${i + 1}-ink`] = textOn(ring, '#ffffff', t['--ink']);
    });
    t['--shadow'] = rgbOf(n(0.2));
    t['--tint'] = '13%';
  } else {
    t['--page'] = n(0.17);
    t['--card'] = n(0.21);
    t['--highlight'] = oklch(0.25, Math.max(ac * 0.18, nc), ah);
    t['--row-hover'] = n(0.235);
    t['--row-hover-current'] = oklch(0.29, Math.max(ac * 0.28, nc), ah);
    const surfaces = [t['--page'], t['--card'], t['--highlight'], t['--row-hover-current']];
    t['--ink'] = n(0.95, 0.6);
    t['--ink-2'] = solve(0.84, nc, nh, surfaces, 7, 1);
    t['--ink-3'] = solve(0.68, nc, nh, surfaces, TEXT, 1);
    t['--danger'] = solve(0.7, 0.14, 27, surfaces, TEXT, 1);
    t['--line'] = n(0.31);
    t['--line-subtle'] = n(0.27);
    t['--line-control'] = solve(0.5, nc, nh, [t['--card']], OUTLINE, 1);
    t['--line-muted'] = n(0.45);
    t['--scroll-thumb'] = n(0.36);
    const fill = solveFill(spec.accentFillL ?? 0.52, ac, ah);
    t['--accent'] = fill.color;
    t['--on-accent'] = fill.text;
    t['--accent-text'] = solve(0.7, ac, ah, surfaces, TEXT, 1);
    t['--accent-pale'] = oklch(0.32, ac * 0.4, ah);
    t['--map-land'] = n(0.24);
    t['--map-road'] = n(0.3);
    t['--map-highway'] = n(0.36);
    t['--map-water'] = oklch(0.22, 0.03, 230);
    t['--map-park'] = oklch(0.26, 0.035, 145);
    t['--map-wash'] = `rgba(${rgbOf(t['--page'])}, 0.6)`;
    t['--accent-ink'] = solve(0.72, ac, ah, [t['--map-land']], TEXT, 1);
    const ringL = [0.78, 0.66, 0.52, 0.45, 0.39, 0.34];
    ringL.forEach((L, i) => {
      const chroma = rc * (i === 0 ? 0.9 : 0.75 - i * 0.08);
      const ring = solveFill(L, Math.max(chroma, 0), ringHue(i)).color;
      t[`--ring-${i + 1}`] = ring;
      t[`--ring-${i + 1}-ink`] = textOn(ring, t['--ink'], oklch(0.2, nc, nh));
    });
    t['--shadow'] = '0, 0, 0';
    t['--tint'] = '24%';
  }
  return t;
}

/**
 * A fill at about `L` that has 4.5:1 text on it: white if it's dark enough, near-black if it's
 * light enough; a mid-tone that suits neither is darkened until white passes.
 */
function solveFill(L: number, C: number, H: number): { color: string; text: string } {
  const white = '#ffffff';
  const black = oklch(0.2, 0.01, H);
  let color = oklch(L, C, H);
  if (contrast(white, color) >= TEXT) return { color, text: white };
  if (contrast(black, color) >= TEXT) return { color, text: black };
  for (let l = L; l > 0; l -= 0.01) {
    color = oklch(l, C, H);
    if (contrast(white, color) >= TEXT) return { color, text: white };
  }
  return { color, text: white };
}

/** The contrast checks a palette must pass, as [label, foreground, background, minimum]. */
export function checks(t: Tokens): [string, string, string, number][] {
  const out: [string, string, string, number][] = [];
  for (const bg of ['--page', '--card', '--highlight']) {
    for (const fg of ['--ink', '--ink-2', '--ink-3', '--accent-text', '--danger']) out.push([`${fg} on ${bg}`, t[fg]!, t[bg]!, 4.5]);
  }
  out.push(['--on-accent on --accent', t['--on-accent']!, t['--accent']!, 4.5]);
  out.push(['--line-control on --card', t['--line-control']!, t['--card']!, 3]);
  out.push(['--accent-ink on --map-land', t['--accent-ink']!, t['--map-land']!, 4.5]);
  for (let i = 1; i <= 6; i++) out.push([`ring ${i} text`, t[`--ring-${i}-ink`]!, t[`--ring-${i}`]!, 4.5]);
  return out;
}

// ── Palettes ────────────────────────────────────────────────────────────────

export const PALETTES: PaletteSpec[] = [
  // Same structure as the current teal, other hues.
  { id: 'teal', name: 'Teal (generated)', note: 'The current direction, rebuilt by the generator, for comparison.', kind: 'hue', accentHue: 185, accentChroma: 0.1, neutralHue: 175, neutralChroma: 0.008 },
  { id: 'blue', name: 'Blue', note: 'Calm, trustworthy, civic. Reads as maps and transit.', kind: 'hue', accentHue: 255, accentChroma: 0.15, neutralHue: 250, neutralChroma: 0.01 },
  { id: 'gold', name: 'Gold', note: 'Warm and sunny. Gold fills take dark text; links deepen to ochre.', kind: 'hue', accentHue: 85, accentChroma: 0.15, accentFillL: 0.8, neutralHue: 85, neutralChroma: 0.012 },
  { id: 'sand', name: 'Sand', note: 'Beige and taupe, low saturation. Quiet, natural, a little luxe.', kind: 'hue', accentHue: 65, accentChroma: 0.045, accentFillL: 0.48, neutralHue: 75, neutralChroma: 0.014, pageL: 0.965 },
  { id: 'rust', name: 'Rust', note: 'Earthy terracotta. Warm and grounded, like brick streets.', kind: 'hue', accentHue: 42, accentChroma: 0.13, neutralHue: 55, neutralChroma: 0.01 },
  { id: 'forest', name: 'Forest', note: 'Deep green. Parks, trees, walking outdoors.', kind: 'hue', accentHue: 150, accentChroma: 0.11, neutralHue: 140, neutralChroma: 0.008 },
  { id: 'plum', name: 'Plum', note: 'Muted violet. Unexpected for a map tool; sophisticated.', kind: 'hue', accentHue: 320, accentChroma: 0.11, neutralHue: 310, neutralChroma: 0.008 },
  { id: 'coral', name: 'Coral', note: 'Pinkish orange. Friendly and energetic.', kind: 'hue', accentHue: 25, accentChroma: 0.15, neutralHue: 30, neutralChroma: 0.008 },
  // Further-out directions.
  { id: 'ink', name: 'Ink & paper', note: 'No color at all: near-black accents on warm cream. Editorial, like a printed city guide.', kind: 'bold', accentHue: 80, accentChroma: 0.0, accentFillL: 0.25, neutralHue: 80, neutralChroma: 0.016, pageL: 0.955 },
  { id: 'terracotta-sage', name: 'Terracotta & sage', note: 'Two hues: terracotta actions over sage-tinted surfaces and sage rings.', kind: 'bold', accentHue: 40, accentChroma: 0.12, neutralHue: 140, neutralChroma: 0.018, ringHue: 145, ringChroma: 0.07 },
  { id: 'blueprint', name: 'Blueprint', note: 'Cool, technical: cobalt on blue-tinted paper. Very “map.”', kind: 'bold', accentHue: 262, accentChroma: 0.17, neutralHue: 245, neutralChroma: 0.025, pageL: 0.96 },
  { id: 'sunset', name: 'Sunset rings', note: 'Rings shift hue from close (warm orange) to far (violet), so distance reads as color.', kind: 'bold', accentHue: 35, accentChroma: 0.15, neutralHue: 40, neutralChroma: 0.008, ringHue: 35, ringHueEnd: 300, ringChroma: 0.14 },
  { id: 'citrus', name: 'Citrus', note: 'Vivid lime on cool gray. Loud, sporty, optimistic.', kind: 'bold', accentHue: 125, accentChroma: 0.2, accentFillL: 0.82, neutralHue: 250, neutralChroma: 0.006 },
  { id: 'night', name: 'Electric', note: 'Saturated magenta accent; deep-navy dark mode. Nightlife energy.', kind: 'bold', accentHue: 350, accentChroma: 0.2, neutralHue: 265, neutralChroma: 0.02 },
];

// ── Sandbox preview ─────────────────────────────────────────────────────────

const KEY = 'ambit.colorPreview';

export function readColorPreview(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function writeColorPreview(id: string | null): void {
  try {
    if (id) localStorage.setItem(KEY, id);
    else localStorage.removeItem(KEY);
  } catch {
    // Preview just won't carry over.
  }
}

const block = (t: Tokens) =>
  Object.entries(t)
    .map(([k, v]) => `  ${k}: ${v};`)
    .join('\n');

/** CSS overriding the color tokens for both themes (later in the page than styles.css, so it wins). */
export function paletteCss(spec: PaletteSpec): string {
  return `:root, [data-theme='light'] {\n${block(generate(spec, 'light'))}\n}\n:root[data-theme='dark'], [data-theme='dark'] {\n${block(generate(spec, 'dark'))}\n}\n`;
}

/** Applies the saved palette to this page (sandbox only); none saved = the stylesheet's own. */
export function applyColorPreview(id = readColorPreview()): void {
  const spec = PALETTES.find((p) => p.id === id);
  let style = document.getElementById('color-preview');
  if (!spec) {
    style?.remove();
    return;
  }
  if (!style) {
    style = document.createElement('style');
    style.id = 'color-preview';
    document.head.append(style);
  }
  style.textContent = paletteCss(spec);
}
