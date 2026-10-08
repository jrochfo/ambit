import { useEffect, useRef, useState, type ReactNode } from 'react';
import { SpotPin, type PinPick } from '../components/CategoryPin';
import { Icon, ICON_NAMES } from '../components/Icon';
import { Logomark } from '../components/Logomark';
import { OriginMarker, RingLabel } from '../components/MapParts';
import { CATEGORIES, categoryTint } from '../lib/categories';
import { pickEmoji } from '../lib/emoji';
import { MAP_STYLE, MAP_STYLE_DARK } from '../lib/mapStyle';
import type { NearbyPlace } from '../lib/nearby';
import { pillColors, ringStyle } from '../lib/rings';
import { RingTag } from '../components/RingTag';

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
        <RingTag value={{ kind: 'error', label: 'Limit', message: 'Daily search limit reached.' }} rings={minutes} />
      </div>
      <div className="sg-rings-demo">
        <svg viewBox="0 0 220 140" aria-hidden="true">
          <rect width="220" height="140" style={{ fill: 'var(--map-land)' }} />
          {[2, 1, 0].map((rank) => {
            const st = ringStyle(rank, 3);
            return <circle key={rank} cx="110" cy="70" r={28 + rank * 22} style={{ fill: 'var(--data)', stroke: 'var(--data)' }} fillOpacity={st.fill} strokeOpacity={st.stroke} strokeWidth="2" />;
          })}
        </svg>
        <div className="sg-note">
          {[0, 1, 2].map((rank) => {
            const st = ringStyle(rank, 3);
            return (
              <div key={rank}>
                Ring {rank + 1}: fill {st.fill.toFixed(2)}, stroke {st.stroke.toFixed(2)}
              </div>
            );
          })}
          <div>Polygons use --data.</div>
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
