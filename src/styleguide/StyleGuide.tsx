import { useEffect, useRef, useState, type ReactNode } from 'react';
import { SpotPin, type PinPick } from '../components/CategoryPin';
import { Icon, ICON_NAMES } from '../components/Icon';
import { Logomark } from '../components/Logomark';
import { OriginMarker, RingLabel } from '../components/MapParts';
import { CATEGORIES } from '../lib/categories';
import { pickEmoji } from '../lib/emoji';
import { MAP_STYLE, MAP_STYLE_DARK } from '../lib/mapStyle';
import type { NearbyPlace } from '../lib/nearby';
import { pillColors, ringStyle } from '../lib/rings';

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
    title: 'Brand teal',
    note: '--teal is a fill (white text on it); --teal-text is teal used as text, links and outlines.',
    tokens: [
      { name: '--teal', use: 'Buttons, swatches, switch on' },
      { name: '--teal-text', use: 'Links, focus outlines, accents' },
      { name: '--teal-ink', use: 'Ring labels on the map' },
      { name: '--teal-mid', use: 'Mid teal' },
      { name: '--teal-pale', use: 'Hover halos' },
      { name: '--on-teal', use: 'Text on teal' },
      { name: '--on-teal-light', use: 'Text on light teal pills' },
    ],
  },
  {
    title: 'Lines',
    note: 'Only control outlines (--field-border) need 3:1 against --card; dividers are decorative.',
    tokens: [
      { name: '--border', use: 'Card and divider strokes' },
      { name: '--border-soft', use: 'Row strokes, legend divider' },
      { name: '--border-faint', use: 'Grid row lines' },
      { name: '--field-border', use: 'Inputs, pills, switch' },
      { name: '--muted-border', use: '"None" pill outline, disabled' },
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
  { sample: 'Ambit', className: 'map-intro-name', spec: '24 / 700 · intro card name' },
  { sample: 'Ambit', className: 'brand-name', spec: '20 / 700 · nav' },
  { sample: '2000 Mission St', className: 'address-street', spec: '18 / 700 · mapped address' },
  { sample: 'Compare addresses', className: 'compare-title', spec: '18 / 700 · section title' },
  { sample: 'What’s within a walk of here?', className: 'map-intro-tagline', spec: '17 / 600 · tagline' },
  { sample: 'Coffee shop', className: 'nearby-label', spec: '16 / 500 · category rows' },
  { sample: 'See how far you can walk from any address…', className: 'map-intro-text', spec: '15 / 400 · body' },
  { sample: 'San Francisco, CA 94110', className: 'address-locality', spec: '14 / 600 · locality' },
  { sample: 'Walking time', className: 'field-label', spec: '14 / 600 · section labels' },
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

      <Section title="Walking rings" file="src/lib/rings.ts (pillColors, ringStyle)">
        <Themed>{() => <Rings />}</Themed>
      </Section>

      <Section title="Category colors" file="src/lib/categories.ts">
        <Themed>{() => <Categories />}</Themed>
      </Section>

      <Section title="Type" file="src/styles.css (--font, --mono; sizes per class)">
        <Themed>{() => <Type />}</Themed>
      </Section>

      <Section title="Shape, depth and opacity" file="src/styles.css">
        <Themed>{() => <Shape />}</Themed>
      </Section>

      <Section title="Controls" file="src/styles.css">
        <Themed>{() => <Controls />}</Themed>
      </Section>

      <Section title="Map overlays" file="src/styles.css (.pin, .spot-card, .origin, .map-label)">
        <Themed>{() => <MapOverlays />}</Themed>
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
  '--teal-text': 4.5,
  '--teal-ink': 4.5,
  '--field-border': 3,
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
      <p className="sg-note">Pill colors by ring rank (smallest ring first), and the map fill/stroke opacity for 3 rings.</p>
      <div className="sg-row">
        {minutes.map((m, rank) => {
          const { bg, fg } = pillColors(rank);
          return (
            <span key={m} className="ring-pill" style={{ background: bg, color: fg }} title={`${bg} on ${fg} · ${contrast(bg, fg).toFixed(1)}:1`}>
              {m} min
            </span>
          );
        })}
      </div>
      <div className="sg-row">
        {minutes.map((m, rank) => {
          const { bg, fg } = pillColors(rank);
          return (
            <span key={m} className="grid-pill" style={{ background: bg, color: fg, borderColor: bg }}>
              {m}
            </span>
          );
        })}
        <span className="grid-pill grid-pill-none">—</span>
        <span className="ring-pill ring-none">Beyond 15 min</span>
        <span className="ring-pill ring-none">…</span>
      </div>
      <div className="sg-rings-demo">
        <svg viewBox="0 0 220 140" aria-hidden="true">
          <rect width="220" height="140" style={{ fill: 'var(--map-land)' }} />
          {[2, 1, 0].map((rank) => {
            const s = ringStyle(rank, 3);
            return <circle key={rank} cx="110" cy="70" r={28 + rank * 22} fill="#0E7C74" fillOpacity={s.fill} stroke="#0E7C74" strokeOpacity={s.stroke} strokeWidth="2" />;
          })}
        </svg>
        <div className="sg-note">
          {[0, 1, 2].map((rank) => {
            const s = ringStyle(rank, 3);
            return (
              <div key={rank}>
                Ring {rank + 1}: fill {s.fill.toFixed(2)}, stroke {s.stroke.toFixed(2)}
              </div>
            );
          })}
          <div>Polygon color: #0E7C74 (RingLayer.tsx)</div>
        </div>
      </div>
    </div>
  );
}

function Categories() {
  return (
    <div className="sg-cats">
      {CATEGORIES.map((c) => (
        <div key={c.id} className="sg-cat">
          <span className="category-avatar" style={{ background: `${c.color}22`, borderColor: c.color }}>
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
  return (
    <div className="sg-stack">
      <div className="sg-fonts">
        <div>
          <span className="sg-font-sample" style={{ fontFamily: 'var(--font)' }}>
            Figtree Aa
          </span>
          <code>--font</code> <span className="sg-use">Everything (400, 500, 600, 700)</span>
        </div>
        <div>
          <span className="sg-font-sample" style={{ fontFamily: 'var(--mono)' }}>
            JetBrains 0123
          </span>
          <code>--mono</code> <span className="sg-use">Grid minutes and totals (600)</span>
        </div>
      </div>
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

function Shape() {
  return (
    <div className="sg-stack">
      <h3>Corner radius</h3>
      <div className="sg-row sg-radii">
        <div style={{ borderRadius: 'var(--radius-card)' }}>
          card<code>--radius-card</code>
        </div>
        <div style={{ borderRadius: 'var(--radius-control)' }}>
          control<code>--radius-control</code>
        </div>
        <div style={{ borderRadius: 8 }}>
          option<code>8px</code>
        </div>
        <div style={{ borderRadius: 999 }}>
          pill<code>999px</code>
        </div>
      </div>
      <h3>Shadows</h3>
      <div className="sg-row sg-shadows">
        {[
          ['0 1px 4px', 0.25, 'pins, origin'],
          ['0 4px 16px', 0.08, 'small floating'],
          ['0 8px 24px', 0.12, 'dropdowns'],
          ['0 8px 24px', 0.16, 'spot cards'],
          ['0 8px 28px', 0.12, 'intro card'],
          ['0 16px 48px', 0.24, 'About dialog'],
        ].map(([offset, alpha, use]) => (
          <div key={`${offset}${alpha}`} style={{ boxShadow: `${offset} rgba(var(--shadow), ${alpha})` }}>
            <span>{use}</span>
            <code>
              {offset} · {alpha}
            </code>
          </div>
        ))}
      </div>
      <h3>Strokes</h3>
      <div className="sg-row sg-strokes">
        <div style={{ border: '1px solid var(--border)' }}>1px · cards, dividers</div>
        <div style={{ border: '1px solid var(--field-border)' }}>1px · controls</div>
        <div style={{ outline: '2px solid var(--teal-text)', outlineOffset: 2 }}>2px · focus outline</div>
        <div style={{ border: '2px solid var(--teal-text)' }}>2px · avatars, rings</div>
        <div style={{ border: '1px dashed var(--teal-text)' }}>1px dashed · (unused)</div>
      </div>
      <h3>Opacity</h3>
      <div className="sg-row sg-opacity">
        {[
          [0.28, 'hidden spot pin'],
          [0.45, 'disabled outline button'],
          [0.55, 'dimmed rows (focus mode)'],
          [0.6, 'busy button'],
          [0.7, 'remove × on pills'],
          [1, 'default'],
        ].map(([o, use]) => (
          <div key={use as string}>
            <span className="sg-opacity-chip" style={{ opacity: o as number }} />
            <span>
              {o} · {use}
            </span>
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
          const pill = rank === null ? null : pillColors(rank);
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
                {pill ? (
                  <span className="ring-pill" style={{ background: pill.bg, color: pill.fg }}>
                    {rank === 0 ? '5 min' : '10 min'}
                  </span>
                ) : (
                  <span className="ring-pill ring-none">Beyond 15 min</span>
                )}
              </button>
              <span className="nearby-avatar" style={{ background: `${c.color}22`, borderColor: c.color }}>
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
