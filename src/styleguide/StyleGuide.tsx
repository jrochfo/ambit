import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { SpotPin, type PinPick } from '../components/CategoryPin';
import { Icon, ICON_NAMES } from '../components/Icon';
import { Logomark } from '../components/Logomark';
import { OriginMarker, RingLabel } from '../components/MapParts';
import { CATEGORIES, categoryTint } from '../lib/categories';
import { pickEmoji } from '../lib/emoji';
import { MAP_STYLE, MAP_STYLE_DARK } from '../lib/mapStyle';
import type { NearbyPlace } from '../lib/nearby';
import { annulusPath, pillColors, ringStyle } from '../lib/rings';
import { ringBand } from '../lib/ringBands';
import { BUTTON_TEXTURES, PAGE_TEXTURES, applyTexturePreview, readTexturePreview, writeTexturePreview, type TexturePreview } from '../lib/texturePreview';
import { RingTag } from '../components/RingTag';
import { DAILY_LIMIT_MESSAGE } from '../../shared/limits';
import { toPolygonPaths } from '../lib/geojson';
import { DEFAULT_RING_SHAPE, RING_SHAPES, readRingShape, shapePolygons, writeRingShape, type RingShape } from '../lib/ringShape';

// A real isochrone response, kept locally (gitignored) so the ring shape lab needs no API calls.
const ISO_SAMPLE = Object.values(import.meta.glob<{ rings: { minutes: number; geoJson: unknown }[] }>('./fixtures/iso-sample.json', { eager: true, import: 'default' }))[0];

/**
 * Ambit's brand stylesheet: every token and component style, read live from src/styles.css
 * (and the few values that live in code), shown in light and dark side by side. Dev only.
 * Edit styles.css and this page and the sandbox update together.
 */

const TOKEN_GROUPS: { title: string; note?: string; tokens: { name: string; use: string }[] }[] = [
  {
    title: 'Surfaces',
    tokens: [
      { name: '--page', use: 'Page background' },
      { name: '--card', use: 'Cards, inputs on cards, pins' },
      { name: '--highlight', use: 'Selected address column' },
      { name: '--row-hover', use: 'Hovered grid row' },
      { name: '--row-hover-current', use: 'Hovered row × selected column' },
    ],
  },
  {
    title: 'Text',
    note: 'Contrast is measured against --card; text needs 4.5:1 (WCAG AA).',
    tokens: [
      { name: '--ink', use: 'Headings, primary text' },
      { name: '--ink-2', use: 'Body, labels' },
      { name: '--ink-3', use: 'Hints, secondary text' },
      { name: '--danger', use: 'Errors' },
    ],
  },
  {
    title: 'Accent',
    note: '--accent is a fill (--on-accent text on it); --accent-text is the accent as text, links and outlines.',
    tokens: [
      { name: '--accent', use: 'Buttons, swatches, switch on' },
      { name: '--accent-text', use: 'Links, focus outlines, accents' },
      { name: '--accent-pale', use: 'Hover halos' },
      { name: '--on-accent', use: 'Text on teal' },
    ],
  },
  {
    title: 'Data',
    note: 'The walk itself: map rings, legend and ring labels (tags use the ring ramp below). Can differ in hue from the action accent.',
    tokens: [
      { name: '--data', use: 'Map rings, legend swatches' },
      { name: '--data-ink', use: 'Ring labels on the map' },
    ],
  },
  {
    title: 'Lines',
    note: 'Only control outlines (--line-control) need 3:1 against --card; dividers are decorative.',
    tokens: [
      { name: '--line', use: 'Cards, dividers' },
      { name: '--line-subtle', use: 'Rows, grid lines, legend' },
      { name: '--line-control', use: 'Inputs, pills, switch' },
      { name: '--line-muted', use: 'Outlined tags, disabled' },
      { name: '--scroll-thumb', use: 'Scrollbars' },
    ],
  },
  {
    title: 'Map (sandbox + overlays)',
    note: 'The real basemap is styled separately in src/lib/mapStyle.ts (shown below).',
    tokens: [
      { name: '--map-land', use: 'Land, label halos' },
      { name: '--map-road', use: 'Streets' },
      { name: '--map-highway', use: 'Highways' },
      { name: '--map-water', use: 'Water' },
      { name: '--map-park', use: 'Parks' },
      { name: '--map-wash', use: 'Wash behind the intro card' },
    ],
  },
];

const TYPE_SCALE: { sample: string; className: string; spec: string }[] = [
  { sample: 'Ambit', className: 'map-intro-name', spec: 'Young Serif 24 · intro card name' },
  { sample: 'Ambit', className: 'brand-name', spec: 'Young Serif 18 · nav' },
  { sample: '2000 Mission St', className: 'address-street', spec: '18 / 700 · mapped address' },
  { sample: 'Compare addresses', className: 'compare-title', spec: '18 / 700 · section title' },
  { sample: 'What’s within a walk of here?', className: 'map-intro-tagline', spec: '17 / 600 · tagline' },
  { sample: 'Coffee shop', className: 'nearby-label', spec: '16 / 500 · category rows' },
  { sample: 'See how far you can walk from any address…', className: 'map-intro-text', spec: '15 / 400 · body' },
  { sample: 'San Francisco, CA 94110', className: 'address-locality', spec: '14 / 600 · locality' },
  { sample: 'Walking times', className: 'field-label', spec: '14 / 600 · section labels' },
  { sample: 'Tap a category to see every spot', className: 'field-hint', spec: '13 / 400 · hints' },
  { sample: 'Walking from', className: 'eyebrow', spec: '13 / 400 · eyebrow' },
  { sample: 'Shotwell Coffee', className: 'nearby-place', spec: '13 / 400 · spot names' },
];

const FAKE_PLACE: NearbyPlace = {
  id: 'styleguide-spot',
  name: 'Valencia Park',
  position: { lat: 0, lng: 0 },
  ring: 10,
  typeLabel: 'Park',
  address: '3250 Valencia St',
  accessible: { entrance: true },
};
const noop = () => {};
const pickOf = (role: PinPick['role']): PinPick => ({ role, others: 3, emphasize: role === 'chosen', onChoose: noop, onUseNearest: noop, onHide: noop, onUnhide: noop });

export function StyleGuide() {
  return (
    <div className="sg">
      <header className="sg-head">
        <div className="brand">
          <Logomark size={30} />
          <h1 className="brand-name">Ambit styles</h1>
        </div>
        <p className="sg-lede">
          Live from <code>src/styles.css</code>: edit a token there and this page and the sandbox update together. Values in code are
          labeled with their file. Light and dark are shown side by side.
        </p>
      </header>

      <Section title="Color tokens" file="src/styles.css (:root, and [data-theme='dark'])">
        <Themed>{() => <TokenGroups />}</Themed>
      </Section>

      <Section title="Walking rings" file="src/styles.css (--ring-1 … --ring-6); map opacity in src/lib/rings.ts">
        <Themed>{() => <Rings />}</Themed>
      </Section>

      <Section title="Category colors" file="src/lib/categories.ts">
        <Themed>{() => <Categories />}</Themed>
      </Section>

      <Section title="Type" file="src/styles.css (--font, --text-*)">
        <Themed>{() => <Type />}</Themed>
      </Section>

      <Section title="Scales" file="src/styles.css (--space-*, --control-*, --radius-*, --elevation-*)">
        <Themed>{() => <Scales />}</Themed>
      </Section>

      <Section title="Strokes and opacity" file="src/styles.css">
        <Themed>{() => <Shape />}</Themed>
      </Section>

      <Section title="Controls" file="src/styles.css">
        <Themed>{() => <Controls />}</Themed>
      </Section>

      <Section title="Map overlays" file="src/styles.css (.pin, .spot-card, .origin, .map-label)">
        <Themed>{() => <MapOverlays />}</Themed>
      </Section>

      <Section title="Ring shape" file="src/lib/ringShape.ts (display only; spots are sorted by the precise shape)">
        <RingShapeLab />
      </Section>

      <Section title="Texture" file="src/styles.css (Texture); previews live in an open sandbox tab">
        <TextureLab />
      </Section>

      <Section title="Logo color" file="src/components/Logomark.tsx (--mark-ring, --mark-dot in src/styles.css)">
        <LogoColor />
      </Section>

      <Section title="Logo motion" file="src/styleguide/styleguide.css (variants); the app's current motion is in src/styles.css">
        <LogoMotion />
      </Section>

      <Section title="Icons" file="src/components/Icon.tsx (Material Symbols, Rounded 400)">
        <Themed>{() => <Icons />}</Themed>
      </Section>

      <Section title="Basemap (Google)" file="src/lib/mapStyle.ts (MAP_STYLE, MAP_STYLE_DARK)">
        <Basemap />
      </Section>
    </div>
  );
}

function Section({ title, file, children }: { title: string; file: string; children: ReactNode }) {
  return (
    <section className="sg-section">
      <div className="sg-section-head">
        <h2>{title}</h2>
        <code>{file}</code>
      </div>
      {children}
    </section>
  );
}

/** Renders the same content in a light panel and a dark panel. */
function Themed({ children }: { children: () => ReactNode }) {
  return (
    <div className="sg-themes">
      {(['light', 'dark'] as const).map((theme) => (
        <div key={theme} className="sg-panel" data-theme={theme}>
          <div className="sg-panel-label">{theme}</div>
          {children()}
        </div>
      ))}
    </div>
  );
}

/** A CSS custom property's value in this element's theme, re-read so edits to styles.css show up. */
function useToken(name: string): [React.RefObject<HTMLDivElement | null>, string] {
  const ref = useRef<HTMLDivElement>(null);
  const [value, setValue] = useState('');
  useEffect(() => {
    const read = () => ref.current && setValue(getComputedStyle(ref.current).getPropertyValue(name).trim());
    read();
    const timer = setInterval(read, 600);
    return () => clearInterval(timer);
  }, [name]);
  return [ref, value];
}

function TokenGroups() {
  return (
    <div className="sg-groups">
      {TOKEN_GROUPS.map((g) => (
        <div key={g.title} className="sg-group">
          <h3>{g.title}</h3>
          {g.note && <p className="sg-note">{g.note}</p>}
          <div className="sg-swatches">
            {g.tokens.map((t) => (
              <Swatch key={t.name} name={t.name} use={t.use} minContrast={MIN_CONTRAST[t.name]} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Tokens with a WCAG contrast requirement against --card: text 4.5:1, control outlines 3:1. Decorative lines have none. */
const MIN_CONTRAST: Record<string, number> = {
  '--ink': 4.5,
  '--ink-2': 4.5,
  '--ink-3': 4.5,
  '--danger': 4.5,
  '--accent-text': 4.5,
  '--data-ink': 4.5,
  '--line-control': 3,
};

function Swatch({ name, use, minContrast }: { name: string; use: string; minContrast?: number }) {
  const [ref, value] = useToken(name);
  const [, card] = useTokenFrom(ref, '--card');
  const ratio = minContrast && value && card ? contrast(value, card) : null;
  return (
    <div className="sg-swatch" ref={ref}>
      <span className="sg-chip" style={{ background: `var(${name})` }} />
      <span className="sg-swatch-text">
        <code>{name}</code>
        <span className="sg-value">
          {value}
          {ratio !== null && (
            <span className={ratio >= minContrast! ? 'sg-pass' : 'sg-fail'}>
              {' '}
              · {ratio.toFixed(2)}:1 (needs {minContrast}:1)
            </span>
          )}
        </span>
        <span className="sg-use">{use}</span>
      </span>
    </div>
  );
}

/** Reads another token from the same element as `ref`. */
function useTokenFrom(ref: React.RefObject<HTMLElement | null>, name: string): [null, string] {
  const [value, setValue] = useState('');
  useEffect(() => {
    const read = () => ref.current && setValue(getComputedStyle(ref.current).getPropertyValue(name).trim());
    read();
    const timer = setInterval(read, 600);
    return () => clearInterval(timer);
  }, [ref, name]);
  return [null, value];
}

function Rings() {
  const minutes = [5, 10, 15, 20, 30, 60];
  return (
    <div className="sg-stack">
      <p className="sg-note">Tag colors by ring rank (smallest ring first), with text contrast; each theme has its own ramp.</p>
      <div className="sg-row">
        {minutes.map((m) => (
          <TagWithContrast key={m} minutes={m} rings={minutes} />
        ))}
      </div>
      <div className="sg-row">
        <RingTag value={{ kind: 'none', label: '—' }} rings={minutes} />
        <RingTag value={{ kind: 'none', label: 'Beyond 15 min' }} rings={minutes} />
        <RingTag value={{ kind: 'loading' }} rings={minutes} />
        <RingTag value={{ kind: 'error', label: 'Paused', message: DAILY_LIMIT_MESSAGE }} rings={minutes} />
      </div>
      <div className="sg-rings-demo">
        <svg viewBox="0 0 220 140" aria-hidden="true">
          <rect width="220" height="140" style={{ fill: 'var(--map-land)' }} />
          {[2, 1, 0].map((rank) => {
            const st = ringStyle(rank, 3);
            const r = 28 + rank * 22;
            return (
              <path
                key={rank}
                d={annulusPath(110, 70, r, rank ? r - 22 : 0)}
                fillRule="evenodd"
                style={{ fill: `var(${st.fillVar})`, fillOpacity: 'var(--map-ring-fill)', stroke: 'var(--data)' }}
                strokeOpacity={st.stroke}
                strokeWidth="2"
              />
            );
          })}
        </svg>
        <div className="sg-note">
          {[0, 1, 2].map((rank) => {
            const st = ringStyle(rank, 3);
            return (
              <div key={rank}>
                Ring {rank + 1}: band {st.fillVar}, outline {st.stroke.toFixed(2)}
              </div>
            );
          })}
          <div>Bands don’t overlap; each is its pill color at --map-ring-fill. Outlines use --data.</div>
        </div>
      </div>
    </div>
  );
}

function TagWithContrast({ minutes, rings }: { minutes: number; rings: number[] }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [ratio, setRatio] = useState<number | null>(null);
  useEffect(() => {
    const read = () => {
      const tag = ref.current?.querySelector('.tag');
      if (!tag) return;
      const cs = getComputedStyle(tag);
      setRatio(contrast(cs.backgroundColor, cs.color));
    };
    read();
    const timer = setInterval(read, 600);
    return () => clearInterval(timer);
  }, []);
  return (
    <span ref={ref} className="sg-tag-cell">
      <RingTag value={{ kind: 'ring', minutes }} rings={rings} />
      {ratio !== null && <span className={ratio >= 4.5 ? 'sg-pass sg-value' : 'sg-fail sg-value'}>{ratio.toFixed(1)}:1</span>}
    </span>
  );
}

function Categories() {
  return (
    <div className="sg-cats">
      {CATEGORIES.map((c) => (
        <div key={c.id} className="sg-cat">
          <span className="category-avatar" style={{ background: categoryTint(c.color), borderColor: c.color }}>
            {pickEmoji(c.emoji)}
          </span>
          <span>
            {c.label}
            <code className="sg-value"> {c.color}</code>
          </span>
        </div>
      ))}
    </div>
  );
}

function Type() {
  const sizes: [string, string][] = [
    ['--text-xl', '24'],
    ['--text-lg', '18'],
    ['--text-base', '16'],
    ['--text-md', '14'],
    ['--text-sm', '13'],
    ['--text-xs', '12'],
  ];
  return (
    <div className="sg-stack">
      <div className="sg-fonts">
        <div>
          <span className="sg-font-sample" style={{ fontFamily: 'var(--font)' }}>
            Hanken Grotesk Aa 0123
          </span>
          <code>--font</code> <span className="sg-use">Everything. Weights 400, 600, 700; digits are equal width, so numbers line up.</span>
        </div>
        <div>
          <span
            className="sg-font-sample"
            style={{ fontFamily: 'var(--font-display)', fontWeight: 'var(--display-weight)' as unknown as number, fontSize: 'calc(26px * var(--display-scale))' }}
          >
            Young Serif Ambit
          </span>
          <code>--font-display</code> <span className="sg-use">The wordmark only: “Ambit” in the nav and the intro card.</span>
        </div>
      </div>
      <h3>Scale</h3>
      {sizes.map(([token, px]) => (
        <div key={token} className="sg-type-row">
          <span style={{ fontSize: `var(${token})`, fontWeight: 600 }}>Walk to coffee in 5 min</span>
          <span className="sg-use">
            <code>{token}</code> · {px}px
          </span>
        </div>
      ))}
      <h3>In use</h3>
      {TYPE_SCALE.map((t) => (
        <div key={t.className + t.sample} className="sg-type-row">
          <span className={t.className} style={{ display: 'block' }}>
            {t.sample}
          </span>
          <span className="sg-use">
            {t.spec} · <code>.{t.className}</code>
          </span>
        </div>
      ))}
    </div>
  );
}

function Scales() {
  return (
    <div className="sg-stack">
      <h3>Space</h3>
      <div className="sg-row sg-space">
        {[1, 2, 3, 4, 5, 6].map((n) => (
          <div key={n}>
            <span className="sg-space-bar" style={{ width: `var(--space-${n})` }} />
            <code>--space-{n}</code>
          </div>
        ))}
      </div>
      <h3>Control heights</h3>
      <div className="sg-row sg-heights">
        {[
          ['lg', 'address field, Map it, time pills'],
          ['sm', 'small buttons and inputs, About'],
          ['xs', 'tags, chips, icon buttons'],
        ].map(([size, use]) => (
          <div key={size} style={{ height: `var(--control-${size})` }}>
            <code>--control-{size}</code>
            <span className="sg-use">{use}</span>
          </div>
        ))}
      </div>
      <h3>Radius</h3>
      <div className="sg-row sg-radii">
        {[
          ['card', 'cards, dialog'],
          ['control', 'inputs, buttons, rows'],
          ['sm', 'menu options'],
          ['xs', 'small focus outlines'],
          ['pill', 'tags, chips, pins'],
        ].map(([r, use]) => (
          <div key={r} style={{ borderRadius: `var(--radius-${r})` }}>
            <code>--radius-{r}</code>
            <span className="sg-use">{use}</span>
          </div>
        ))}
      </div>
      <h3>Elevation</h3>
      <div className="sg-row sg-shadows">
        {[
          ['1', 'pins, address dot'],
          ['2', 'dropdowns, spot cards, intro card'],
          ['3', 'About dialog'],
        ].map(([n, use]) => (
          <div key={n} style={{ boxShadow: `var(--elevation-${n})` }}>
            <code>--elevation-{n}</code>
            <span className="sg-use">{use}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Shape() {
  return (
    <div className="sg-stack">
      <h3>Strokes</h3>
      <div className="sg-row sg-strokes">
        <div style={{ border: '1px solid var(--line)' }}>1px · cards, dividers</div>
        <div style={{ border: '1px solid var(--line-control)' }}>1px · controls</div>
        <div style={{ outline: 'var(--focus)', outlineOffset: 2 }}>2px · focus ring (--focus)</div>
        <div style={{ border: '2px solid var(--accent-text)' }}>2px · emoji circles, pins, map rings</div>
      </div>
      <h3>Opacity</h3>
      <div className="sg-row sg-opacity">
        {(
          [
            ['0.28', 'hidden spot pin'],
            ['var(--disabled)', 'disabled controls (0.45)'],
            ['0.55', 'dimmed rows (focus mode)'],
            ['0.7', 'remove × on pills'],
            ['1', 'default'],
          ] as const
        ).map(([o, use]) => (
          <div key={use}>
            <span className="sg-opacity-chip" style={{ opacity: o }} />
            <span>{use}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Controls() {
  return (
    <div className="sg-stack">
      <h3>Buttons</h3>
      <div className="sg-row">
        <button className="btn" type="button">
          Map it
        </button>
        <button className="btn" type="button" disabled>
          Mapping…
        </button>
        <button className="btn btn-outline" type="button">
          Add
        </button>
        <button className="btn btn-sm btn-outline btn-icon" type="button">
          <Icon name="bookmarkAdd" size={18} />
          Save to compare
        </button>
        <button className="btn btn-sm" type="button">
          Save
        </button>
      </div>
      <div className="sg-row">
        <button className="link-btn" type="button">
          <Icon name="add" size={18} />
          Add time
        </button>
        <button className="link-btn" type="button">
          Choose (5)
        </button>
        <button className="link-btn" type="button" disabled>
          Clear all
        </button>
        <button className="chip" type="button">
          30 min
        </button>
        <button className="header-btn" type="button">
          <Icon name="info" size={18} />
          About
        </button>
        <ThemeSwitchDemo />
        <button className="icon-btn" type="button" aria-label="Close">
          <Icon name="close" size={16} />
        </button>
      </div>
      <h3>Inputs</h3>
      <div className="sg-row">
        <input className="input" placeholder="123 Sample St, Anytown" style={{ width: 260 }} />
        <input className="input input-sm" placeholder="Minutes (1–120)" style={{ width: 180 }} />
        <label className="category-option">
          <input type="checkbox" defaultChecked />
          <span className="emoji">☕</span>
          <span className="category-option-label">Coffee shop</span>
        </label>
      </div>
      <h3>Walking time pills</h3>
      <div className="pills" style={{ maxWidth: 360 }}>
        {[5, 10, 15].map((m, rank) => {
          const { bg, fg } = pillColors(rank);
          const shown = m !== 15;
          return (
            <span key={m} className="pill-chip" style={shown ? { background: bg, color: fg, borderColor: bg } : undefined}>
              <button type="button" className="pill-toggle" aria-pressed={shown}>
                {m} min
              </button>
              <button type="button" className="pill-remove" aria-label="Remove">
                <Icon name="close" size={16} />
              </button>
            </span>
          );
        })}
      </div>
      <p className="sg-note">15 min shown in its hidden (toggled off) state.</p>
      <h3>Category rows</h3>
      <div className="nearby-list" style={{ maxWidth: 360 }}>
        {(
          [
            ['coffee', 'Shotwell Coffee', 0, false],
            ['park', 'Valencia Park', 1, true],
            ['grocery', 'Florida Market', null, false],
          ] as const
        ).map(([id, spot, rank, picked]) => {
          const c = CATEGORIES.find((x) => x.id === id)!;
          return (
            <div key={id} className="nearby-item">
              <button type="button" className="nearby-row" aria-pressed={id === 'park'}>
                <span className="nearby-text">
                  <span className="nearby-label">{c.label}</span>
                  <span className="nearby-place">
                    {spot}
                    {picked && <span className="pick-note"> · your pick</span>}
                  </span>
                </span>
                {rank !== null ? (
                  <RingTag value={{ kind: 'ring', minutes: rank === 0 ? 5 : 10 }} rings={[5, 10, 15]} />
                ) : (
                  <RingTag value={{ kind: 'none', label: 'Beyond 15 min' }} rings={[5, 10, 15]} />
                )}
              </button>
              <span className="nearby-avatar" style={{ background: categoryTint(c.color), borderColor: c.color }}>
                {pickEmoji(c.emoji)}
              </span>
            </div>
          );
        })}
      </div>
      <p className="sg-note">Park shown focused (selected) with a user pick.</p>
    </div>
  );
}

function ThemeSwitchDemo() {
  const [on, setOn] = useState(false);
  return (
    <button type="button" role="switch" aria-checked={on} aria-label="Dark mode" className="theme-switch" onClick={() => setOn(!on)}>
      <span className="theme-switch-knob">
        <Icon name={on ? 'darkMode' : 'lightMode'} size={14} />
      </span>
    </button>
  );
}

function MapOverlays() {
  const park = CATEGORIES.find((c) => c.id === 'park')!;
  const roles: PinPick['role'][] = ['nearest', 'chosen', 'other', 'hidden'];
  return (
    <div className="sg-stack">
      <div className="sg-map-strip">
        <div className="sg-at" style={{ left: 40, top: 40 }}>
          <RingLabel minutes={10} />
        </div>
        <div className="sg-at" style={{ left: 130, top: 34 }}>
          <OriginMarker label="Mission" />
        </div>
        {roles.map((role, i) => (
          <div key={role} className="sg-at" style={{ left: 230 + i * 60, top: 34 }}>
            <a className={role === 'hidden' ? 'pin pin-hidden' : role === 'chosen' ? 'pin pin-pick' : 'pin'} style={{ borderColor: park.color }}>
              <span>{pickEmoji(park.emoji)}</span>
            </a>
            <span className="sg-pin-label">{role}</span>
          </div>
        ))}
      </div>
      <p className="sg-note">Spot cards, as they open over a pin (always open here):</p>
      <div className="sg-cards">
        {(['nearest', 'other', 'chosen'] as const).map((role) => (
          <div key={role} className="sg-card-slot" data-edge-top="false" data-edge-left="false" data-edge-right="false">
            <SpotPin category={park} place={FAKE_PLACE} outerRing={15} spotlight pick={pickOf(role)} />
          </div>
        ))}
      </div>
      <p className="sg-note">Map labels sit on --map-land halos; the intro card and wash appear before an address is mapped.</p>
    </div>
  );
}

function RingShapeLab() {
  const [shape, setShape] = useState<RingShape>(() => (import.meta.env.DEV ? readRingShape() : DEFAULT_RING_SHAPE));
  useEffect(() => writeRingShape(shape), [shape]);
  if (!ISO_SAMPLE) return <p className="sg-note">Missing src/styleguide/fixtures/iso-sample.json (a saved isochrone response).</p>;
  const raw = ISO_SAMPLE.rings.map((r) => toPolygonPaths(r.geoJson));
  // Fit the largest ring into the tile.
  const pts = raw.flat(3);
  const minLat = Math.min(...pts.map((p) => p.lat)), maxLat = Math.max(...pts.map((p) => p.lat));
  const minLng = Math.min(...pts.map((p) => p.lng)), maxLng = Math.max(...pts.map((p) => p.lng));
  const kx = Math.cos((((minLat + maxLat) / 2) * Math.PI) / 180);
  const W = 300, H = 300, pad = 14;
  const scale = Math.min((W - 2 * pad) / ((maxLng - minLng) * kx), (H - 2 * pad) / (maxLat - minLat));
  const ox = (W - (maxLng - minLng) * kx * scale) / 2, oy = (H - (maxLat - minLat) * scale) / 2;
  const toD = (polys: google.maps.LatLngLiteral[][][]) =>
    polys.map((rings) => rings.map((ring) => `M${ring.map((p) => `${(ox + (p.lng - minLng) * kx * scale).toFixed(1)} ${(oy + (maxLat - p.lat) * scale).toFixed(1)}`).join(' L')}Z`).join(' ')).join(' ');
  const count = raw.length;
  return (
    <div className="sg-stack">
      <p className="sg-note">
        A real 5/10/15 min response (near the Embarcadero, SF). Display only: spots are still sorted into rings by the precise shape. Picking one
        also redraws the real map in an open localhost tab.
      </p>
      <div className="sg-row">
        <span className="sg-use">App draws</span>
        {RING_SHAPES.map(([id, label]) => (
          <button key={id} type="button" className={shape === id ? 'chip sg-chip-on' : 'chip'} aria-pressed={shape === id} onClick={() => setShape(id)}>
            {label}
          </button>
        ))}
      </div>
      {(['light', 'dark'] as const).map((theme) => (
        <div key={theme} className="sg-panel sg-ring-shapes" data-theme={theme}>
          <div className="sg-panel-label">{theme}</div>
          <div className="sg-ring-grid">
            {RING_SHAPES.map(([id, label, note]) => (
              <figure key={id} className={shape === id ? 'sg-ring-fig sg-ring-on' : 'sg-ring-fig'}>
                <svg viewBox={`0 0 ${W} ${H}`} className="sg-ring-svg" role="img" aria-label={`${label} ring shape`}>
                  <rect width={W} height={H} fill="var(--map-land)" />
                  {Array.from({ length: 12 }, (_, i) => (
                    <g key={i} stroke="var(--map-road)" strokeWidth={3}>
                      <line x1={0} y1={i * 26 + 8} x2={W} y2={i * 26 + 2} />
                      <line x1={i * 26 + 6} y1={0} x2={i * 26 + 12} y2={H} />
                    </g>
                  ))}
                  {(() => {
                    const shaped = raw.map((polys) => shapePolygons(polys, id));
                    return shaped.map((polys, rank) => {
                      const st = ringStyle(rank, count);
                      return (
                        <g key={rank}>
                          <path d={toD(ringBand(polys, shaped[rank - 1] ?? null))} style={{ fill: `var(${st.fillVar})`, fillOpacity: 'var(--map-ring-fill)' }} fillRule="evenodd" />
                          <path d={toD(polys)} fill="none" stroke="var(--data)" strokeOpacity={st.stroke} strokeWidth={2} strokeLinejoin="round" />
                        </g>
                      );
                    });
                  })()}
                </svg>
                <figcaption>
                  <strong>{label}</strong> {note}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function TextureLab() {
  const [t, setT] = useState<TexturePreview>(readTexturePreview);
  useEffect(() => {
    applyTexturePreview(t);
    writeTexturePreview(t);
  }, [t]);
  const rings = [5, 10, 15];
  return (
    <div className="sg-stack">
      <p className="sg-note">
        Applies to this page and to an open <a href="/sandbox" target="_blank" rel="noreferrer">sandbox</a> tab. Page texture shows on the
        page background (cards stay smooth); button texture shows on filled controls.
      </p>
      <div className="sg-row">
        <span className="sg-use">Page</span>
        {PAGE_TEXTURES.map(([id, label]) => (
          <button key={id} type="button" className={t.page === id ? 'chip sg-chip-on' : 'chip'} aria-pressed={t.page === id} onClick={() => setT({ ...t, page: id })}>
            {label}
          </button>
        ))}
      </div>
      <div className="sg-row">
        <span className="sg-use">Buttons</span>
        {BUTTON_TEXTURES.map(([id, label]) => (
          <button key={id} type="button" className={t.buttons === id ? 'chip sg-chip-on' : 'chip'} aria-pressed={t.buttons === id} onClick={() => setT({ ...t, buttons: id })}>
            {label}
          </button>
        ))}
      </div>
      <label className="sg-use">
        Grain strength {t.strength.toFixed(2)}×{' '}
        <input type="range" min={0} max={2} step={0.05} value={t.strength} onChange={(e) => setT({ ...t, strength: Number(e.target.value) })} />
      </label>
      <label className="sg-use">
        Glow {t.glow > 0 ? `${t.glow.toFixed(2)}×` : 'off'}{' '}
        <input type="range" min={0} max={2} step={0.05} value={t.glow} onChange={(e) => setT({ ...t, glow: Number(e.target.value) })} />
      </label>
      <div className="sg-themes">
        {(['light', 'dark'] as const).map((theme) => (
          <div key={theme} className="sg-panel page-texture sg-texture-panel" data-theme={theme}>
            <div className="sg-panel-label">{theme}</div>
            <div className="sg-row">
              <button className="btn" type="button">
                Map it
              </button>
              <button className="btn btn-sm btn-icon" type="button">
                <Icon name="bookmarkAdd" size={20} />
                Save
              </button>
              <ThemeSwitchDemo />
            </div>
            <div className="pills" style={{ maxWidth: 360 }}>
              {rings.map((m, rank) => {
                const { bg, fg } = pillColors(rank);
                return (
                  <span key={m} className="pill-chip" style={{ background: bg, color: fg, borderColor: bg }}>
                    <button type="button" className="pill-toggle" aria-pressed>
                      {m} min
                    </button>
                    <button type="button" className="pill-remove" aria-label="Remove">
                      <Icon name="close" size={16} />
                    </button>
                  </span>
                );
              })}
            </div>
            <div className="card sg-texture-card">A card stays smooth: text always sits on a clean surface.</div>
          </div>
        ))}
      </div>
    </div>
  );
}

const MOTIONS: { id: string; name: string; note: string }[] = [
  { id: 'a', name: 'A. Unison breathing', note: 'Dot and rings swell and settle together, slow and even. Calm, like a breath.' },
  { id: 'b', name: 'B. Three-step wave', note: 'Dot, inner ring, outer ring, a third of a cycle apart and overlapping: brightness keeps moving outward with no start or end.' },
  { id: 'c', name: 'C. Glow, then long fade', note: 'Each wave rises quickly and fades slowly, leaving the dot and passing outward. Feels emitted, like a signal.' },
  { id: 'c2', name: 'C2. C, softer rings', note: 'C’s pattern with lower ring peaks (inner 0.80, outer 0.48), lower floors (0.30, 0.08) so each cycle starts clearly from the dot, and a gentler swell.' },
  { id: 'd', name: 'D. Two-ring phasing, slower', note: 'The current motion at a slower pace and a little stronger. Rings trade brightness back and forth.' },
  { id: 'e', name: 'E. Uneven shimmer', note: 'Each part on its own slow cycle (3.7s, 5.3s, 7.1s), so the pattern never quite repeats. Alive, ambient, directionless.' },
  { id: 'f', name: 'F. Traveling wave, slow fade', note: 'Like C but slower and wider: a long, soft pulse that drifts out from the dot.' },
  {
    id: 'g',
    name: 'G. B with a soft tail',
    note: 'B’s overlapping three-step wave (no start or end) on a 5s cycle, with each part rising a little faster than it fades (set by Rise).',
  },
];

/** G's keyframes: rise to the peak over `rise` of the cycle, fade over the rest. */
function softTailKeyframes(rise: number): string {
  const r = Math.round(rise * 100);
  const frames = (prop: string) => `0% { ${prop}: var(--lo); animation-timing-function: ease-in-out; }
  ${r}% { ${prop}: var(--hi); animation-timing-function: ease-in-out; }
  100% { ${prop}: var(--lo); }`;
  return `@keyframes sg-g-ring {\n  ${frames('stroke-opacity')}\n}\n@keyframes sg-g-dot {\n  ${frames('fill-opacity')}\n}`;
}

const LOGO_COLORS: { name: string; note: string; vars: Record<string, string> }[] = [
  { name: 'Warm gray (before)', note: 'The ink action color lightened to sit near the dot.', vars: { '--mark-ring': '#818178' } },
  { name: 'Olive', note: 'Rings in --data, the map outline color. One family with the dot, deeper.', vars: { '--mark-ring': 'var(--data)' } },
  { name: 'Lime (current)', note: 'Rings in the dot’s own color (--ring-1). All one hue, softest.', vars: {} },
  { name: 'Lime ramp', note: 'Inner ring --ring-2, outer --ring-3: the 10 and 15 min band colors, like the map legend.', vars: { '--mark-ring-inner': 'var(--ring-2)', '--mark-ring-outer': 'var(--ring-3)' } },
  { name: 'Ink', note: 'Rings in --accent, the near-black action color, unlightened.', vars: { '--mark-ring': 'var(--accent)' } },
];

function LogoColor() {
  const [glow, setGlow] = useState(true);
  return (
    <div className="sg-stack">
      <div className="sg-row">
        <button type="button" className="chip" onClick={() => setGlow((g) => !g)}>
          {glow ? 'Show at rest' : 'Show the glow'}
        </button>
        <span className="sg-note">The glow is how it appears in the intro card and About; the nav shows it at rest (glows on hover).</span>
      </div>
      <Themed>
        {() => (
          <div className={glow ? 'sg-logo-colors sg-logo-glow' : 'sg-logo-colors'}>
            {LOGO_COLORS.map((c) => (
              <figure key={c.name} className="sg-logo-color" style={c.vars as CSSProperties}>
                <div className="sg-logo-big">
                  <Logomark size={72} />
                </div>
                <div className="brand">
                  <Logomark size={26} />
                  <span className="brand-name">Ambit</span>
                </div>
                <figcaption>
                  <strong>{c.name}</strong> {c.note}
                </figcaption>
              </figure>
            ))}
          </div>
        )}
      </Themed>
    </div>
  );
}

function LogoMotion() {
  const [speed, setSpeed] = useState(1);
  const [paused, setPaused] = useState(false);
  const [rise, setRise] = useState(0.4);
  return (
    <div className="sg-stack">
      <div className="sg-row sg-motion-controls">
        <label className="sg-use">
          Speed {speed.toFixed(2)}×{' '}
          <input type="range" min={0.5} max={2} step={0.05} value={speed} onChange={(e) => setSpeed(Number(e.target.value))} />
        </label>
        <button type="button" className="chip" onClick={() => setPaused((p) => !p)}>
          {paused ? 'Play' : 'Pause'}
        </button>
        <label className="sg-use">
          G rise {Math.round(rise * 100)}%{' '}
          <input type="range" min={0.2} max={0.5} step={0.01} value={rise} onChange={(e) => setRise(Number(e.target.value))} />
        </label>
        <span className="sg-note">Opacity only. Speed multiplies every duration (higher = slower). G rise 50% = B’s even wave.</span>
      </div>
      <style>{softTailKeyframes(rise)}</style>
      <div
        className="sg-themes"
        style={{ '--sg-speed': speed, '--sg-play': paused ? 'paused' : 'running' } as CSSProperties}
      >
        {(['light', 'dark'] as const).map((theme) => (
          <div key={theme} className="sg-panel" data-theme={theme}>
            <div className="sg-panel-label">{theme}</div>
            <div className="sg-motions">
              {MOTIONS.map((m) => (
                <div key={m.id} className={`sg-motion m-${m.id}`}>
                  <div className="sg-motion-big">
                    <Logomark size={88} />
                  </div>
                  <div className="brand sg-motion-nav">
                    <Logomark size={26} />
                    <span className="brand-name">Ambit</span>
                  </div>
                  <strong>{m.name}</strong>
                  <span className="sg-note">{m.note}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Icons() {
  return (
    <div className="sg-icons">
      {ICON_NAMES.map((name) => (
        <div key={name} className="sg-icon">
          <Icon name={name} size={24} />
          <code>{name}</code>
        </div>
      ))}
    </div>
  );
}

function Basemap() {
  const pick = (style: google.maps.MapTypeStyle[], feature: string | undefined, element: string) =>
    (style.find((s) => s.featureType === feature && s.elementType === element)?.stylers?.[0] as { color?: string } | undefined)?.color;
  const rows: [string, string | undefined, string][] = [
    ['Land', undefined, 'geometry'],
    ['Labels', undefined, 'labels.text.fill'],
    ['Streets', 'road', 'geometry'],
    ['Arterials', 'road.arterial', 'geometry'],
    ['Highways', 'road.highway', 'geometry'],
    ['Parks', 'poi.park', 'geometry'],
    ['Water', 'water', 'geometry'],
  ];
  return (
    <div className="sg-basemap">
      {rows.map(([label, feature, element]) => (
        <div key={label} className="sg-basemap-row">
          <span className="sg-use">{label}</span>
          {[MAP_STYLE, MAP_STYLE_DARK].map((style, i) => {
            const color = pick(style, feature, element);
            return (
              <span key={i} className="sg-basemap-cell">
                <span className="sg-chip" style={{ background: color }} />
                <code>{color}</code>
              </span>
            );
          })}
        </div>
      ))}
      <p className="sg-note">Columns: light, dark. These are Google map style rules, not CSS, so they don’t follow the tokens automatically.</p>
    </div>
  );
}

/** WCAG contrast ratio between two CSS colors (hex or rgb/rgba). */
function contrast(a: string, b: string): number {
  const l = (c: string) => {
    const rgb = parse(c);
    const [r, g, bl] = rgb.map((v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r! + 0.7152 * g! + 0.0722 * bl!;
  };
  const [hi, lo] = [l(a), l(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

function parse(c: string): number[] {
  if (c.startsWith('#')) {
    const h = c.length === 4 ? [...c.slice(1)].map((x) => x + x).join('') : c.slice(1, 7);
    return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  }
  return (c.match(/[\d.]+/g) ?? ['0', '0', '0']).slice(0, 3).map(Number);
}
