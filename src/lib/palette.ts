// Palette generator for the color lab (dev only). A palette is a few choices (accent hue and
// strength, neutral tint, ring hues); every color token is derived from them in OKLCH, a
// perceptual color space, and each text/outline color's lightness is solved until it meets its
// WCAG contrast minimum against every background it sits on. The current palette (teal) lives in
// src/styles.css; generated palettes override it only in the sandbox until one is chosen.

export interface PaletteSpec {
  id: string;
  name: string;
  note: string;
  /** Lab section: this round, the previous round's favorites, or earlier (collapsed). */
  kind: 'round3' | 'favorite' | 'earlier';
  /** Accent hue (OKLCH degrees, 0–360) and chroma (0 gray … ~0.2 vivid). */
  accentHue: number;
  accentChroma: number;
  /** Lightness of the accent as a fill in light mode (buttons, smallest ring). */
  accentFillL?: number;
  /** Tint of the grays (page, cards, lines, text). */
  neutralHue: number;
  neutralChroma: number;
  /**
   * Data color (map rings, legend, ring tags), when it differs from the action accent. Two-tone
   * palettes use a vivid data color and a deep, legible action color.
   */
  dataHue?: number;
  dataChroma?: number;
  /** Lightness of the data color as a fill in light mode (the smallest ring's tag). */
  dataFillL?: number;
  /** Ring ramp hue override (defaults to the data hue). Rings stay one hue, stepped in lightness. */
  ringHue?: number;
  ringChroma?: number;
  /** Error color hue; moved away from red-orange accents so errors don't read as brand. */
  dangerHue?: number;
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

const rgbOf = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(', ');

// ── Generator ───────────────────────────────────────────────────────────────

const TEXT = 4.6; // a hair above 4.5 to absorb rounding
const OUTLINE = 3.1;

export function generate(spec: PaletteSpec, theme: 'light' | 'dark'): Tokens {
  const { accentHue: ah, accentChroma: ac, neutralHue: nh, neutralChroma: nc } = spec;
  const n = (L: number, cMul = 1) => oklch(L, nc * cMul, nh);
  const dh = spec.dataHue ?? ah;
  const dc = spec.dataChroma ?? ac;
  const dataFillL = spec.dataFillL ?? spec.accentFillL ?? 0.52;
  const rh = spec.ringHue ?? dh;
  const rc = spec.ringChroma ?? dc;
  const danger = spec.dangerHue ?? 27;
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
    t['--danger'] = solve(0.55, 0.17, danger, surfaces, TEXT, -1);
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
    // Map rings and legend: the data color, at least 3:1 against the map (graphics, WCAG 1.4.11).
    t['--data'] = solve(Math.min(dataFillL, 0.6), dc, dh, [t['--map-land']], OUTLINE, -1);
    t['--data-ink'] = solve(0.45, dc, dh, [t['--map-land']], TEXT, -1);
    const ringL = [dataFillL, 0.77, 0.84, 0.9, 0.94, 0.965];
    ringL.forEach((L, i) => {
      const chroma = i === 0 ? rc : rc * (0.75 - i * 0.1);
      const ring = solveFill(L, Math.max(chroma, 0), rh);
      t[`--ring-${i + 1}`] = ring.color;
      t[`--ring-${i + 1}-ink`] = ring.text;
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
    t['--danger'] = solve(0.7, 0.14, danger, surfaces, TEXT, 1);
    t['--line'] = n(0.31);
    t['--line-subtle'] = n(0.27);
    t['--line-control'] = solve(0.5, nc, nh, [t['--card']], OUTLINE, 1);
    t['--line-muted'] = n(0.45);
    t['--scroll-thumb'] = n(0.36);
    // A near-black action color would vanish on dark cards: flip it to a light fill.
    const fillL = (spec.accentFillL ?? 0.52) < 0.4 ? 0.9 : (spec.accentFillL ?? 0.52);
    const fill = solveFill(fillL, ac, ah);
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
    t['--data'] = solve(0.6, dc, dh, [t['--map-land']], OUTLINE, 1);
    t['--data-ink'] = solve(0.72, dc, dh, [t['--map-land']], TEXT, 1);
    const ringL = [0.8, 0.56, 0.5, 0.44, 0.38, 0.33];
    ringL.forEach((L, i) => {
      const chroma = rc * (i === 0 ? 0.9 : 0.75 - i * 0.08);
      const ring = solveFill(L, Math.max(chroma, 0), rh);
      t[`--ring-${i + 1}`] = ring.color;
      t[`--ring-${i + 1}-ink`] = ring.text;
    });
    t['--shadow'] = '0, 0, 0';
    t['--tint'] = '24%';
  }
  return t;
}

/**
 * OKLCH lightness band where text reads poorly either way: white barely fails and dark text
 * passes but looks muddy (mid-tone oranges especially). Fills with text avoid it.
 */
const MUDDY: [number, number] = [0.6, 0.74];

/**
 * A fill near lightness `L` with clean 4.5:1 text: white on darker fills; on lighter fills, a deep
 * shade of the fill's own hue (deep brown on gold, olive on lime) instead of neutral black. Fills
 * in the muddy band move to its nearer edge.
 */
function solveFill(L: number, C: number, H: number): { color: string; text: string } {
  if (L > MUDDY[0] && L < MUDDY[1]) L = L < (MUDDY[0] + MUDDY[1]) / 2 ? MUDDY[0] - 0.02 : MUDDY[1] + 0.02;
  const white = '#ffffff';
  if (L < MUDDY[0]) {
    for (let l = L; l > 0; l -= 0.01) {
      const color = oklch(l, C, H);
      if (contrast(white, color) >= TEXT) return { color, text: white };
    }
  }
  const color = oklch(L, C, H);
  for (const text of [oklch(0.26, Math.min(C * 0.7, 0.07), H), oklch(0.2, Math.min(C * 0.5, 0.05), H), '#111111']) {
    if (contrast(text, color) >= TEXT) return { color, text };
  }
  return { color, text: '#000000' };
}

/** The contrast checks a palette must pass, as [label, foreground, background, minimum]. */
export function checks(t: Tokens): [string, string, string, number][] {
  const out: [string, string, string, number][] = [];
  for (const bg of ['--page', '--card', '--highlight']) {
    for (const fg of ['--ink', '--ink-2', '--ink-3', '--accent-text', '--danger']) out.push([`${fg} on ${bg}`, t[fg]!, t[bg]!, 4.5]);
  }
  out.push(['--on-accent on --accent', t['--on-accent']!, t['--accent']!, 4.5]);
  out.push(['--line-control on --card', t['--line-control']!, t['--card']!, 3]);
  out.push(['--data on --map-land (map rings)', t['--data']!, t['--map-land']!, 3]);
  out.push(['--data-ink on --map-land', t['--data-ink']!, t['--map-land']!, 4.5]);
  for (let i = 1; i <= 6; i++) out.push([`ring ${i} text`, t[`--ring-${i}-ink`]!, t[`--ring-${i}`]!, 4.5]);
  return out;
}

// ── Palettes ────────────────────────────────────────────────────────────────

export const PALETTES: PaletteSpec[] = [
  // Round 3: energetic color on the walk, deep teal or ink for actions.
  {
    id: 'gold-ink',
    name: 'Gold & ink',
    note: 'Kept from round 2: gold for the walk, near-black ink for actions, on cream paper. Vintage printed map.',
    kind: 'round3',
    accentHue: 70,
    accentChroma: 0.012,
    accentFillL: 0.27,
    dataHue: 82,
    dataChroma: 0.12,
    dataFillL: 0.78,
    neutralHue: 80,
    neutralChroma: 0.012,
    pageL: 0.966,
  },
  {
    id: 'coral-teal',
    name: 'Coral & deep teal',
    note: 'Coral for actions (buttons, links, selection), deep teal for the walk (rings, tags, map). Friendly energy with map-like calm.',
    kind: 'round3',
    accentHue: 30,
    accentChroma: 0.13,
    accentFillL: 0.58,
    dataHue: 190,
    dataChroma: 0.08,
    dataFillL: 0.5,
    neutralHue: 70,
    neutralChroma: 0.007,
    dangerHue: 5,
  },
  {
    id: 'teal-coral',
    name: 'Teal & coral',
    note: 'Coral & deep teal, flipped: deep teal for actions, coral only on the walk.',
    kind: 'earlier',
    accentHue: 195,
    accentChroma: 0.09,
    accentFillL: 0.48,
    dataHue: 30,
    dataChroma: 0.13,
    dataFillL: 0.56,
    neutralHue: 70,
    neutralChroma: 0.007,
    dangerHue: 5,
  },
  {
    id: 'citrus-teal',
    name: 'Citrus & teal',
    note: 'Lime for the walk, deep teal for actions. Sporty and fresh; teal keeps controls calm and legible.',
    kind: 'round3',
    accentHue: 195,
    accentChroma: 0.09,
    accentFillL: 0.48,
    dataHue: 122,
    dataChroma: 0.16,
    dataFillL: 0.82,
    neutralHue: 90,
    neutralChroma: 0.006,
  },
  {
    id: 'citrus-ink',
    name: 'Citrus & ink',
    note: 'Lime for the walk, ink for actions. The loudest color confined to the data; everything else editorial.',
    kind: 'round3',
    accentHue: 110,
    accentChroma: 0.012,
    accentFillL: 0.27,
    dataHue: 122,
    dataChroma: 0.16,
    dataFillL: 0.82,
    neutralHue: 90,
    neutralChroma: 0.006,
  },
  {
    id: 'gold-teal',
    name: 'Gold & teal',
    note: 'Gold for the walk, deep teal for actions. The vintage map with a cooler, more energetic counterpoint than ink.',
    kind: 'round3',
    accentHue: 195,
    accentChroma: 0.09,
    accentFillL: 0.48,
    dataHue: 82,
    dataChroma: 0.12,
    dataFillL: 0.78,
    neutralHue: 80,
    neutralChroma: 0.01,
    pageL: 0.968,
  },
  // Round 2 favorites, unchanged.
  { id: 'citrus-soft', name: 'Citrus, softer', note: 'Round 2: single-hue lime on warm gray.', kind: 'favorite', accentHue: 122, accentChroma: 0.15, accentFillL: 0.8, neutralHue: 90, neutralChroma: 0.006 },
  // Earlier rounds, collapsed in the lab.
  { id: 'coral-ink', name: 'Coral & ink', note: 'Coral for the walk, deep ink for actions.', kind: 'earlier', accentHue: 40, accentChroma: 0.014, accentFillL: 0.28, dataHue: 30, dataChroma: 0.13, dataFillL: 0.6, neutralHue: 60, neutralChroma: 0.008, dangerHue: 5 },
  { id: 'terracotta-sage-2', name: 'Terracotta & sage, refined', note: 'Terracotta actions, sage for the walk.', kind: 'earlier', accentHue: 36, accentChroma: 0.13, accentFillL: 0.55, dataHue: 150, dataChroma: 0.07, dataFillL: 0.55, neutralHue: 85, neutralChroma: 0.007, dangerHue: 10 },
  { id: 'coral-soft', name: 'Coral, softer', note: 'Single-hue coral, toned down.', kind: 'earlier', accentHue: 28, accentChroma: 0.12, accentFillL: 0.58, neutralHue: 60, neutralChroma: 0.008, dangerHue: 5 },
  { id: 'persimmon', name: 'Persimmon', note: 'Lively orange between coral and gold (pills now avoid the muddy band).', kind: 'earlier', accentHue: 50, accentChroma: 0.13, accentFillL: 0.62, neutralHue: 65, neutralChroma: 0.008, dangerHue: 10 },
  { id: 'gold-soft', name: 'Gold, softer', note: 'Single-hue gold on cream.', kind: 'earlier', accentHue: 82, accentChroma: 0.115, accentFillL: 0.77, neutralHue: 80, neutralChroma: 0.012, pageL: 0.966 },
  { id: 'teal', name: 'Teal (generated)', note: 'The current direction, rebuilt by the generator.', kind: 'earlier', accentHue: 185, accentChroma: 0.1, neutralHue: 175, neutralChroma: 0.008 },
  { id: 'blue', name: 'Blue', note: 'Calm, civic.', kind: 'earlier', accentHue: 255, accentChroma: 0.15, neutralHue: 250, neutralChroma: 0.01 },
  { id: 'gold', name: 'Gold', note: 'Round-one gold.', kind: 'earlier', accentHue: 85, accentChroma: 0.15, accentFillL: 0.8, neutralHue: 85, neutralChroma: 0.012 },
  { id: 'sand', name: 'Sand', note: 'Beige and taupe.', kind: 'earlier', accentHue: 65, accentChroma: 0.045, accentFillL: 0.48, neutralHue: 75, neutralChroma: 0.014, pageL: 0.965 },
  { id: 'rust', name: 'Rust', note: 'Earthy terracotta.', kind: 'earlier', accentHue: 42, accentChroma: 0.13, neutralHue: 55, neutralChroma: 0.01 },
  { id: 'forest', name: 'Forest', note: 'Deep green.', kind: 'earlier', accentHue: 150, accentChroma: 0.11, neutralHue: 140, neutralChroma: 0.008 },
  { id: 'plum', name: 'Plum', note: 'Muted violet.', kind: 'earlier', accentHue: 320, accentChroma: 0.11, neutralHue: 310, neutralChroma: 0.008 },
  { id: 'coral', name: 'Coral', note: 'Round-one coral.', kind: 'earlier', accentHue: 25, accentChroma: 0.15, neutralHue: 30, neutralChroma: 0.008 },
  { id: 'ink', name: 'Ink & paper', note: 'No color, editorial.', kind: 'earlier', accentHue: 80, accentChroma: 0.0, accentFillL: 0.25, neutralHue: 80, neutralChroma: 0.016, pageL: 0.955 },
  { id: 'blueprint', name: 'Blueprint', note: 'Cobalt on blue-tinted paper.', kind: 'earlier', accentHue: 262, accentChroma: 0.17, neutralHue: 245, neutralChroma: 0.025, pageL: 0.96 },
  { id: 'citrus', name: 'Citrus', note: 'Round-one lime.', kind: 'earlier', accentHue: 125, accentChroma: 0.2, accentFillL: 0.82, neutralHue: 250, neutralChroma: 0.006 },
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
