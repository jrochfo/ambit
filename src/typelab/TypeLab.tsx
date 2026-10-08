import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Icon } from '../components/Icon';
import { Logomark } from '../components/Logomark';
import { RingTag } from '../components/RingTag';
import { CATEGORIES, categoryTint } from '../lib/categories';
import { pickEmoji } from '../lib/emoji';
import { useTheme } from '../lib/theme';
import { DISPLAY_FONTS, SANS_FONTS, readTypePreview, writeTypePreview, type DisplayFont, type TypePreview } from '../lib/typePreview';

/**
 * Type lab (dev only): wordmark and UI-font candidates side by side. "Preview in sandbox" saves a
 * choice that the sandbox, open in another tab, applies live. Nothing reaches the deployed app.
 */
export function TypeLab() {
  const [theme, setTheme] = useTheme();
  const [preview, setPreview] = useState<TypePreview>(readTypePreview);

  const choose = (next: TypePreview) => {
    setPreview(next);
    writeTypePreview(next);
  };

  return (
    <div className="tl">
      <header className="tl-head">
        <div>
          <h1>Ambit type lab</h1>
          <p className="tl-lede">
            Open the <a href="/sandbox.html" target="_blank" rel="noreferrer">sandbox</a> beside this page: “Preview in sandbox” switches its
            fonts live. Nothing changes in the real app until we pick.
          </p>
        </div>
        <div className="tl-head-actions">
          <span className="tl-current">
            Sandbox: <strong>{preview.display ?? 'Figtree (current)'}</strong> wordmark · <strong>{preview.sans ?? 'Figtree (current)'}</strong> UI
          </span>
          <button type="button" className="link-btn" onClick={() => choose({})} disabled={!preview.display && !preview.sans}>
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

      <section className="tl-section">
        <h2>Wordmark</h2>
        <p className="tl-note">
          A display face only for the name: the nav and the intro card. Script and condensed faces are scaled so they sit at a similar visual
          size.
        </p>
        <div className="tl-grid">
          {DISPLAY_FONTS.map((f) => (
            <article key={f.name} className="tl-card" aria-current={(preview.display ?? 'Figtree (current)') === f.name ? 'true' : undefined}>
              <div className="tl-card-head">
                <h3>{f.name}</h3>
                <PreviewButton active={(preview.display ?? 'Figtree (current)') === f.name} onClick={() => choose({ ...preview, display: f.name === 'Figtree (current)' ? undefined : f.name })} />
              </div>
              <div className="tl-nav">
                <span className="tl-mark">
                  <Logomark size={26} />
                </span>
                <span style={{ ...displayStyle(f), fontSize: 18 * (f.scale ?? 1) }}>Ambit</span>
              </div>
              <div className="tl-intro">
                <span className="tl-mark">
                  <Logomark size={36} />
                </span>
                <span style={{ ...displayStyle(f), fontSize: 40 * (f.scale ?? 1) }}>Ambit</span>
              </div>
              <p className="tl-tagline">What’s within a walk of here?</p>
              <p className="tl-note">{f.note}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="tl-section">
        <h2>Workhorse sans</h2>
        <p className="tl-note">
          The interface font, shown in a real slice of the UI. Numbers line up only if the font has tabular figures, checked below.
        </p>
        <div className="tl-grid tl-grid-sans">
          {SANS_FONTS.map((f) => (
            <article key={f.name} className="tl-card" aria-current={(preview.sans ?? 'Figtree (current)') === f.name ? 'true' : undefined}>
              <div className="tl-card-head">
                <h3 style={{ fontFamily: `'${f.family}'` }}>{f.name}</h3>
                <PreviewButton active={(preview.sans ?? 'Figtree (current)') === f.name} onClick={() => choose({ ...preview, sans: f.name === 'Figtree (current)' ? undefined : f.name })} />
              </div>
              <SansSpecimen family={f.family} />
              <p className="tl-note">{f.note}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function displayStyle(f: DisplayFont): CSSProperties {
  return {
    fontFamily: `'${f.family}', var(--font)`,
    fontWeight: f.weight,
    fontStyle: f.style ?? 'normal',
    fontVariationSettings: f.variation ?? 'normal',
    letterSpacing: '-0.01em',
    lineHeight: 1.2,
    color: 'var(--ink)',
  };
}

function PreviewButton({ active, onClick }: { active: boolean; onClick: () => void }) {
  return (
    <button type="button" className={active ? 'chip tl-chip-active' : 'chip'} aria-pressed={active} onClick={onClick}>
      {active ? 'In sandbox' : 'Preview in sandbox'}
    </button>
  );
}

function SansSpecimen({ family }: { family: string }) {
  const park = CATEGORIES.find((c) => c.id === 'park')!;
  const rings = [5, 10, 15];
  return (
    <div className="tl-specimen" style={{ fontFamily: `'${family}', system-ui, sans-serif` }}>
      <div className="current-address">
        <span className="eyebrow">Walking from</span>
        <span className="address-street">2000 Mission St</span>
        <span className="address-locality">San Francisco, CA 94110</span>
      </div>
      <div className="nearby-item">
        <button type="button" className="nearby-row" tabIndex={-1}>
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
      <p className="map-intro-text" style={{ margin: 0 }}>
        See how far you can walk from any address, and which groceries, coffee shops, transit stops, and other spots fall within 5, 10, or
        15 minutes.
      </p>
      <div className="tl-row">
        <RingTag value={{ kind: 'ring', minutes: 5 }} rings={rings} />
        <RingTag value={{ kind: 'ring', minutes: 10 }} rings={rings} />
        <RingTag value={{ kind: 'ring', minutes: 15 }} rings={rings} />
        <span className="tl-total">4 of 6 · 11 of 18</span>
      </div>
      <div className="tl-glyphs">Aa Gg Rr Qq 1lI 0O 0123456789</div>
      <TabularCheck family={family} />
    </div>
  );
}

/**
 * Whether digits come out equal width with tabular figures on (from a `tnum` feature, or digits
 * that are already equal). Each digit is measured alone: kerning between repeated digits would
 * skew a "111" vs "000" comparison.
 */
function TabularCheck({ family }: { family: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [ok, setOk] = useState<boolean | null>(null);
  useEffect(() => {
    let cancelled = false;
    // Wait until the face itself is loaded; measuring earlier would measure a fallback font.
    const ready = async () => {
      for (let i = 0; i < 40 && !cancelled; i++) {
        await document.fonts.load(`600 40px '${family}'`);
        if (document.fonts.check(`600 40px '${family}'`) && [...document.fonts].some((f) => f.family.replace(/["']/g, '') === family && f.status === 'loaded')) return;
        await new Promise((r) => setTimeout(r, 250));
      }
    };
    ready().then(() => {
      if (cancelled || !ref.current) return;
      const measure = (text: string) => {
        const s = document.createElement('span');
        s.style.cssText = `font: 600 40px '${family}'; font-variant-numeric: tabular-nums; position: absolute; visibility: hidden; white-space: pre`;
        s.textContent = text;
        ref.current!.append(s);
        const w = s.getBoundingClientRect().width;
        s.remove();
        return w;
      };
      const widths = [...'0123456789'].map(measure);
      setOk(Math.max(...widths) - Math.min(...widths) < 0.5);
    });
    return () => {
      cancelled = true;
    };
  }, [family]);
  return (
    <span ref={ref} className={ok === false ? 'tl-check tl-check-fail' : 'tl-check'}>
      {ok === null ? 'Checking numbers…' : ok ? 'Tabular figures ✓ (numbers line up)' : 'No tabular figures (numbers won’t line up)'}
    </span>
  );
}
