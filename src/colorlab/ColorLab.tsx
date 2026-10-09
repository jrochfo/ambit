import { useMemo, useState, type CSSProperties } from 'react';
import { Icon } from '../components/Icon';
import { Logomark } from '../components/Logomark';
import { RingTag } from '../components/RingTag';
import { CATEGORIES, categoryTint } from '../lib/categories';
import { pickEmoji } from '../lib/emoji';
import { PALETTES, checks, generate, readColorPreview, writeColorPreview, type PaletteSpec, type Tokens } from '../lib/palette';
import { annulusPath, ringStyle } from '../lib/rings';
import { useTheme } from '../lib/theme';

/**
 * Color lab (dev only): generated palettes, each previewed in light and dark with real
 * components and checked for WCAG contrast. "Preview in sandbox" recolors an open sandbox tab live.
 */
export function ColorLab() {
  const [theme, setTheme] = useTheme();
  const [preview, setPreview] = useState<string | null>(readColorPreview);
  const choose = (id: string | null) => {
    setPreview(id);
    writeColorPreview(id);
  };
  const current = PALETTES.find((p) => p.id === preview);

  return (
    <div className="cl">
      <header className="cl-head">
        <div>
          <h1>Ambit color lab</h1>
          <p className="cl-lede">
            Every palette is generated from a few choices (accent hue, neutral tint, ring hues), with each text and outline color tuned until it
            meets WCAG contrast. Open the <a href="/sandbox.html" target="_blank" rel="noreferrer">sandbox</a> beside this page; “Preview in
            sandbox” recolors it live. The real app uses Iris & ink (in styles.css).
          </p>
        </div>
        <div className="cl-head-actions">
          <span className="cl-current">
            Sandbox: <strong>{current ? current.name : 'Iris & ink (current, from styles.css)'}</strong>
          </span>
          <button type="button" className="link-btn" onClick={() => choose(null)} disabled={!preview}>
            Reset
          </button>
          <button
            type="button"
            role="switch"
            aria-checked={theme === 'dark'}
            aria-label="Dark mode"
            className="theme-switch"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            <span className="theme-switch-knob">
              <Icon name={theme === 'dark' ? 'darkMode' : 'lightMode'} size={16} />
            </span>
          </button>
        </div>
      </header>

      <Group
        title="Citrus variations"
        note="Citrus & ink beside versions that each change one thing about the lime: hue, saturation or lightness. Ink and surfaces are identical."
        palettes={[PALETTES.find((p) => p.id === 'citrus-ink')!, ...PALETTES.filter((p) => p.kind === 'citrus')]}
        preview={preview}
        choose={choose}
      />
      <Group
        title="Round 3"
        note="Two-tone with the energetic colors on the walk (rings, walking-time tags, map) and deep teal or ink for actions. Pills avoid muddy mid-tones and use a deep shade of their own hue for text."
        palettes={PALETTES.filter((p) => p.kind === 'round3')}
        preview={preview}
        choose={choose}
      />
      <Group title="Round 2 favorites" note="As they were, for comparison (with the new pill text)." palettes={PALETTES.filter((p) => p.kind === 'favorite')} preview={preview} choose={choose} />
      <details className="cl-earlier">
        <summary>Earlier rounds ({PALETTES.filter((p) => p.kind === 'earlier').length})</summary>
        <Group title="Earlier" note="Rounds one and two, for reference." palettes={PALETTES.filter((p) => p.kind === 'earlier')} preview={preview} choose={choose} />
      </details>
    </div>
  );
}

function Group({ title, note, palettes, preview, choose }: { title: string; note: string; palettes: PaletteSpec[]; preview: string | null; choose: (id: string | null) => void }) {
  return (
    <section className="cl-section">
      <h2>{title}</h2>
      <p className="cl-note">{note}</p>
      <div className="cl-grid">
        {palettes.map((p) => (
          <PaletteCard key={p.id} spec={p} active={preview === p.id} onPreview={() => choose(preview === p.id ? null : p.id)} />
        ))}
      </div>
    </section>
  );
}

function PaletteCard({ spec, active, onPreview }: { spec: PaletteSpec; active: boolean; onPreview: () => void }) {
  const light = useMemo(() => generate(spec, 'light'), [spec]);
  const dark = useMemo(() => generate(spec, 'dark'), [spec]);
  const results = useMemo(() => [...checks(light).map((c) => ['light', ...c] as const), ...checks(dark).map((c) => ['dark', ...c] as const)], [light, dark]);
  const fails = results.filter(([, , fg, bg, min]) => contrastOf(fg, bg) < min);

  return (
    <article className="cl-card" aria-current={active ? 'true' : undefined}>
      <div className="cl-card-head">
        <h3>{spec.name}</h3>
        <button type="button" className={active ? 'chip cl-chip-active' : 'chip'} aria-pressed={active} onClick={onPreview}>
          {active ? 'In sandbox' : 'Preview in sandbox'}
        </button>
      </div>
      <p className="cl-note">{spec.note}</p>
      <div className="cl-swatches" aria-hidden="true">
        {['--page', '--card', '--ink', '--ink-3', '--accent', '--accent-text', '--data', '--ring-1', '--ring-2', '--ring-3', '--ring-4', '--ring-5', '--ring-6'].map((k) => (
          <span key={k} title={`${k} ${light[k]}`} style={{ background: light[k] }} />
        ))}
      </div>
      <div className="cl-previews">
        <Mini theme="light" tokens={light} />
        <Mini theme="dark" tokens={dark} />
      </div>
      <p className={fails.length ? 'cl-check cl-check-fail' : 'cl-check'}>
        {fails.length
          ? `${fails.length} of ${results.length} contrast checks fail: ${fails.map(([t, label]) => `${label} (${t})`).join(', ')}`
          : `All ${results.length} contrast checks pass (text 4.5:1, outlines 3:1, light and dark)`}
      </p>
    </article>
  );
}

/** A small slice of the interface in one theme, colored by the palette's tokens. */
function Mini({ theme, tokens }: { theme: 'light' | 'dark'; tokens: Tokens }) {
  const park = CATEGORIES.find((c) => c.id === 'park')!;
  const rings = [5, 10, 15, 30];
  return (
    <div className="cl-mini" data-theme={theme} style={tokens as CSSProperties}>
      <div className="cl-mini-nav">
        <span className="cl-mark">
          <Logomark size={20} />
        </span>
        <span className="brand-name" style={{ fontSize: 16 }}>
          Ambit
        </span>
        <span className="cl-mini-theme">{theme}</span>
      </div>
      <div className="cl-mini-body">
        <div className="cl-mini-row">
          <button type="button" className="btn btn-sm" tabIndex={-1}>
            Map it
          </button>
          <button type="button" className="chip" tabIndex={-1}>
            30 min
          </button>
          <button type="button" className="link-btn" tabIndex={-1}>
            Choose (5)
          </button>
        </div>
        <div className="current-address">
          <span className="eyebrow">Walking from</span>
          <span className="address-street" style={{ fontSize: 16 }}>
            2000 Mission St
          </span>
          <span className="address-locality">San Francisco, CA 94110</span>
        </div>
        <div className="nearby-item">
          <button type="button" className="nearby-row" aria-pressed="true" tabIndex={-1}>
            <span className="nearby-text">
              <span className="nearby-label">{park.label}</span>
              <span className="nearby-place">
                Dolores Park <span className="pick-note">· your pick</span>
              </span>
            </span>
            <RingTag value={{ kind: 'ring', minutes: 10 }} rings={rings} />
          </button>
          <span className="nearby-avatar" style={{ background: categoryTint(park.color), borderColor: park.color }}>
            {pickEmoji(park.emoji)}
          </span>
        </div>
        <div className="cl-mini-row">
          {rings.map((m) => (
            <RingTag key={m} value={{ kind: 'ring', minutes: m }} rings={rings} />
          ))}
          <RingTag value={{ kind: 'none', label: '—' }} rings={rings} />
        </div>
        <div className="cl-mini-map">
          <svg viewBox="0 0 240 90" aria-hidden="true">
            <rect width="240" height="90" style={{ fill: 'var(--map-land)' }} />
            <path d="M0 62 L240 30" style={{ stroke: 'var(--map-highway)' }} strokeWidth="4" />
            <path d="M0 20 L240 80" style={{ stroke: 'var(--map-road)' }} strokeWidth="3" />
            <rect x="170" y="8" width="44" height="26" rx="5" style={{ fill: 'var(--map-park)' }} />
            {[2, 1, 0].map((rank) => {
              const s = ringStyle(rank, 3);
              const r = 14 + rank * 13;
              return (
                <path
                  key={rank}
                  d={annulusPath(90, 46, r, rank ? r - 13 : 0)}
                  fillRule="evenodd"
                  style={{ fill: `var(${s.fillVar})`, fillOpacity: 'var(--map-ring-fill)', stroke: 'var(--data)' }}
                  strokeOpacity={s.stroke}
                  strokeWidth="1.5"
                />
              );
            })}
            <text x="90" y="9" textAnchor="middle" fontSize="9" fontWeight="700" style={{ fill: 'var(--data-ink)' }}>
              15 min
            </text>
          </svg>
        </div>
        <p className="cl-mini-text">
          <span style={{ color: 'var(--ink-2)' }}>Body text in ink-2.</span> <span style={{ color: 'var(--ink-3)' }}>Hints in ink-3.</span>{' '}
          <span style={{ color: 'var(--danger)' }}>Errors.</span>
        </p>
      </div>
    </div>
  );
}

function contrastOf(a: string, b: string): number {
  const lum = (hex: string) => {
    const v = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
    const [r, g, bl] = v.map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r! + 0.7152 * g! + 0.0722 * bl!;
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}
