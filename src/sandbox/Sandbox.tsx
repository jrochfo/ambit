import { applyColorPreview, readColorPreview, writeColorPreview } from '../lib/palette';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Icon } from '../components/Icon';
import { loadPref, savePref } from '../lib/storage';
import { useTheme } from '../lib/theme';
import { DEFAULT_RINGS, MAX_RINGS } from '../../shared/isochrones';
import { AddressSearch } from '../components/AddressSearch';
import type { AddOption } from '../components/AddCategory';
import { CompareGrid } from '../components/CompareGrid';
import { Header } from '../components/Header';
import { NearbyList } from '../components/NearbyList';
import { RingPicker } from '../components/RingPicker';
import { SaveControl } from '../components/SaveControl';
import { StatusLine, type Status } from '../components/StatusLine';
import { CATEGORIES, DEFAULT_CATEGORY_IDS, makeCustomCategory, type Category } from '../lib/categories';
import { strongEmojiMatch } from '../lib/emojiTags';
import { MAX_SAVED, type SavedAddress } from '../lib/saved';
import type { Cell } from '../lib/useComparison';
import type { CategoryResult } from '../lib/useAnalysis';
import { FAKE_ADDRESSES, fakeResult, fakeSpots, type FakeAddress, type FakeSpot } from './fakeData';
import type { PinPick } from '../components/CategoryPin';
import { FakeMap } from './FakeMap';

type Results = 'loaded' | 'loading' | 'limit';

const START_CUSTOMS: Category[] = [
  { id: 'custom-climb', label: 'Climbing gym', emoji: ['🧗'], color: '#0E7C74', types: [], query: 'climbing gym', custom: true },
  { id: 'custom-icecream', label: 'Ice cream shop', emoji: ['🍦'], color: '#C0562E', types: ['ice_cream_shop'], custom: true },
];

const toSaved = (a: FakeAddress): SavedAddress => ({ id: a.id, label: a.label, address: a.address, position: { lat: 0, lng: 0 }, positionAt: 0 });

/**
 * Design sandbox: the real sidebar, grid and pin components with deterministic fake data and a
 * drawn map. Makes no Google calls (no API key, no map load), so styles can be edited freely.
 * Layout mirrors App.tsx; keep the two in step when the page structure changes.
 */
export function Sandbox() {
  const [theme, setTheme] = useTheme();
  const [mapped, setMapped] = useState<FakeAddress | null>(FAKE_ADDRESSES[0]!);
  const [resultsState, setResultsState] = useState<Results>('loaded');
  const [ringMinutes, setRingMinutes] = useState<number[]>(DEFAULT_RINGS);
  const [hidden, setHidden] = useState<ReadonlySet<number>>(new Set());
  const [customs, setCustoms] = useState<Category[]>(START_CUSTOMS);
  const [categoryIds, setCategoryIds] = useState<ReadonlySet<string>>(new Set([...DEFAULT_CATEGORY_IDS, 'custom-climb']));
  const [saved, setSaved] = useState<SavedAddress[]>(FAKE_ADDRESSES.map(toSaved));
  const [focused, setFocused] = useState<string | null>(null);
  const [spotlight, setSpotlight] = useState<string | null>(null);
  const [hiddenSpotIds, setHiddenSpots] = useState<ReadonlySet<string>>(new Set());
  // Picked spot per address and category (by fake spot ID).
  const [picks, setPicks] = useState<Record<string, Record<string, string>>>({});
  const setPick = (categoryId: string, spotId: string | null) => {
    if (!mapped) return;
    setPicks((prev) => {
      const next = { ...(prev[mapped.id] ?? {}) };
      if (spotId) next[categoryId] = spotId;
      else delete next[categoryId];
      return { ...prev, [mapped.id]: next };
    });
  };

  const categories = useMemo(() => [...CATEGORIES, ...customs].filter((c) => categoryIds.has(c.id)), [categoryIds, customs]);
  const visibleSpots = useCallback(
    (addressId: string, c: Category) => fakeSpots(addressId, c, ringMinutes).filter((s) => !hiddenSpotIds.has(s.id)),
    [ringMinutes, hiddenSpotIds],
  );
  const spotsFor = useCallback((addressId: string) => Object.fromEntries(categories.map((c) => [c.id, visibleSpots(addressId, c)])), [categories, visibleSpots]);
  const spots = useMemo(() => (mapped ? spotsFor(mapped.id) : {}), [mapped, spotsFor]);

  const results = useMemo(() => {
    const out: Record<string, CategoryResult> = {};
    if (!mapped) return out;
    categories.forEach((c, i) => {
      if (resultsState === 'loading') out[c.id] = { status: 'loading' };
      else if (resultsState === 'limit' && i % 2 === 1) out[c.id] = { status: 'error', message: 'Daily search limit reached. It resets at midnight Pacific time.' };
      else out[c.id] = fakeResult(spots[c.id] ?? [], picks[mapped.id]?.[c.id]);
    });
    return out;
  }, [mapped, categories, resultsState, spots, picks]);

  const cells = useMemo(() => {
    const out: Record<string, Record<string, Cell>> = {};
    for (const a of saved) {
      out[a.id] = Object.fromEntries(
        categories.map((c) => {
          if (resultsState === 'loading') return [c.id, { status: 'loading' } as Cell];
          const r = fakeResult(visibleSpots(a.id, c), picks[a.id]?.[c.id]);
          const nearest = r.status === 'done' ? r.nearest : null;
          const picked = r.status === 'done' && !!r.picked;
          return [c.id, { status: 'done', ring: nearest?.ring ?? null, spotId: nearest?.ring ? nearest.id : null, spotName: nearest?.ring ? nearest.name : undefined, picked } as Cell];
        }),
      );
    }
    return out;
  }, [saved, categories, resultsState, picks, visibleSpots]);

  // Same pin logic as App.tsx: the spot that counts per category, or a focused category's spots,
  // plus faint pins for hidden spots.
  const pins = categories.flatMap((category) => {
    const list = spots[category.id] ?? [];
    const hiddenList = mapped ? fakeSpots(mapped.id, category, ringMinutes).filter((s) => hiddenSpotIds.has(s.id)) : [];
    const r = results[category.id];
    if (resultsState === 'loading' || r?.status !== 'done' || (list.length === 0 && hiddenList.length === 0)) return [];
    const current = r.nearest;
    const pin = (spot: FakeSpot, hidden = false) => ({
      category,
      spot,
      pick: {
        role: hidden ? 'hidden' : spot.id === current?.id ? (r.picked ? 'chosen' : 'nearest') : 'other',
        others: r.within.filter((p) => p.id !== current?.id).length,
        emphasize: focused === category.id && spot.id === current?.id,
        onChoose: () => setPick(category.id, spot.id),
        onUseNearest: () => setPick(category.id, null),
        onHide: () => setHiddenSpots((prev) => new Set([...prev, spot.id])),
        onUnhide: () =>
          setHiddenSpots((prev) => {
            const next = new Set(prev);
            next.delete(spot.id);
            return next;
          }),
      } satisfies PinPick,
    });
    const hiddenPins = hiddenList.map((s) => pin(s, true));
    const currentSpot = current ? list.find((s) => s.id === current.id) : undefined;
    if (focused === null) return [...(currentSpot ? [pin(currentSpot)] : []), ...hiddenPins];
    if (focused !== category.id) return [];
    const within = list.filter((s) => s.ring !== null);
    const shown = !currentSpot || within.some((s) => s.id === currentSpot.id) ? within : [currentSpot, ...within];
    return [...shown.map((s) => pin(s)), ...hiddenPins];
  });

  const status: Status = mapped ? { kind: 'done', address: mapped.address } : { kind: 'idle' };
  const currentSaved = mapped ? saved.find((a) => a.id === mapped.id) : undefined;
  const spotlightNearest = spotlight ? spots[spotlight]?.[0] : undefined;

  const toggle = <T,>(set: ReadonlySet<T>, item: T) => {
    const next = new Set(set);
    if (next.has(item)) next.delete(item);
    else next.add(item);
    return next;
  };

  const addCategory = (option: AddOption) => {
    if (option.kind === 'existing') return setCategoryIds((prev) => new Set([...prev, option.category.id]));
    const label = option.kind === 'type' ? option.label : option.text.charAt(0).toUpperCase() + option.text.slice(1);
    const emoji = strongEmojiMatch(label, option.kind === 'type' ? option.type : undefined) ?? undefined;
    const created = makeCustomCategory(option.kind === 'type' ? { label, type: option.type, emoji } : { label, query: option.text, emoji }, customs);
    setCustoms((prev) => [...prev, created]);
    setCategoryIds((prev) => new Set([...prev, created.id]));
  };

  const showAddress = (a: FakeAddress | SavedAddress) => {
    setMapped({ id: a.id, label: a.label, address: a.address });
    setFocused(null);
    setSpotlight(null);
  };

  return (
    <div className="app">
      <SandboxBar
        mapped={mapped !== null}
        onMapped={(on) => (on ? showAddress(FAKE_ADDRESSES[0]!) : setMapped(null))}
        results={resultsState}
        onResults={setResultsState}
        savedCount={saved.length}
        onSaved={(on) => setSaved(on ? FAKE_ADDRESSES.map(toSaved) : [])}
      />
      <Header theme={theme} onTheme={setTheme} />
      <main className="main">
        <aside className="card sidebar">
          <div className="sidebar-head">
            {/* Real component; with no Google API loaded it simply shows no suggestions. */}
            <AddressSearch
              busy={false}
              onSearch={(t) => {
                const text = t.kind === 'text' ? t.text : t.prediction.text.text;
                showAddress({ id: `typed-${text}`, label: text.split(',')[0]!, address: text });
              }}
            />
            <StatusLine status={status} />
            {mapped && (
              <SaveControl
                key={mapped.id}
                defaultLabel={mapped.label}
                saved={currentSaved}
                full={saved.length >= MAX_SAVED}
                onSave={(label) => setSaved((prev) => [...prev, { ...toSaved(mapped), label }])}
                onRemove={(id) => setSaved((prev) => prev.filter((a) => a.id !== id))}
                onRename={(id, label) => setSaved((prev) => prev.map((a) => (a.id === id ? { ...a, label } : a)))}
              />
            )}
          </div>
          <div className="sidebar-scroll">
            <RingPicker
              rings={ringMinutes}
              hidden={hidden}
              onToggle={(m) => setHidden((prev) => toggle(prev, m))}
              onAdd={(m) => setRingMinutes((prev) => [...new Set([...prev, m])].sort((a, b) => a - b).slice(0, MAX_RINGS))}
              onRemove={(m) => setRingMinutes((prev) => (prev.length > 1 ? prev.filter((x) => x !== m) : prev))}
            />
            <NearbyList
              catalog={CATEGORIES}
              customs={customs}
              categories={categories}
              results={results}
              rings={ringMinutes}
              focused={focused}
              onFocus={(id) => {
                setFocused(id);
                setSpotlight(null);
              }}
              onToggleCategory={(id) => setCategoryIds((prev) => toggle(prev, id))}
              onClearCategories={() => setCategoryIds(new Set())}
              onResetCategories={() => setCategoryIds(new Set(DEFAULT_CATEGORY_IDS))}
              onAddCategory={addCategory}
              onRemoveCustom={(id) => {
                setCustoms((prev) => prev.filter((c) => c.id !== id));
                setCategoryIds((prev) => toggle(prev, id));
              }}
              onSetEmoji={(id, emoji) => setCustoms((prev) => prev.map((c) => (c.id === id ? { ...c, emoji: [emoji] } : c)))}
              hiddenCount={hiddenSpotIds.size}
              onUnhideAll={() => setHiddenSpots(new Set())}
            />
          </div>
        </aside>
        <FakeMap
          originLabel={mapped?.label ?? null}
          rings={ringMinutes}
          hidden={hidden}
          pins={pins}
          spotlight={spotlight && spotlightNearest ? `${spotlight}:${spotlightNearest.id}` : null}
          onMapClick={() => setSpotlight(null)}
        />
        <CompareGrid
          saved={saved}
          categories={categories}
          rings={ringMinutes}
          cells={cells}
          currentId={currentSaved?.id}
          onSelect={showAddress}
          onSelectCell={(a, categoryId) => {
            showAddress(a);
            setFocused(categoryId);
            setSpotlight(categoryId);
          }}
          onRemove={(id) => setSaved((prev) => prev.filter((a) => a.id !== id))}
          onRename={(id, label) => setSaved((prev) => prev.map((a) => (a.id === id ? { ...a, label } : a)))}
        />
      </main>
    </div>
  );
}

/**
 * Sandbox-only controls for jumping between states: a panel floating at the bottom of the
 * window (out of the page's layout), collapsible to a small pill. Remembers which per browser.
 */
/** Walk colors to A/B (all with ink actions); iris is the stylesheet's own. */
const PALETTE_CHOICES: Record<string, string | null> = { iris: null, gold: 'gold-ink', lime: 'citrus-ink', terracotta: 'coral-ink-2', 'sea glass': 'sea-ink' };

function SandboxBar(props: {
  mapped: boolean;
  onMapped: (on: boolean) => void;
  results: Results;
  onResults: (r: Results) => void;
  savedCount: number;
  onSaved: (on: boolean) => void;
}) {
  const [open, setOpen] = useState(() => loadPref('sandboxBarOpen', true, (v): v is boolean => typeof v === 'boolean'));
  useEffect(() => savePref('sandboxBarOpen', open), [open]);
  // Quick A/B between the shipped palette and Gold & ink (the color lab can preview any other).
  const [palette, setPalette] = useState(() => Object.entries(PALETTE_CHOICES).find(([, id]) => id === readColorPreview())?.[0] ?? 'iris');
  const choosePalette = (v: string) => {
    setPalette(v);
    writeColorPreview(PALETTE_CHOICES[v] ?? null);
    applyColorPreview();
  };

  if (!open)
    return (
      <button type="button" className="sandbox-pill" aria-expanded={false} aria-controls="sandbox-bar" onClick={() => setOpen(true)}>
        <Icon name="tune" size={20} />
        Sandbox
      </button>
    );

  return (
    <div className="sandbox-bar" id="sandbox-bar" role="region" aria-label="Design sandbox controls">
      <strong>Design sandbox</strong>
      <span className="sandbox-note">Fake data, no Google calls</span>
      <Choice label="Map" value={props.mapped ? 'mapped' : 'empty'} options={['mapped', 'empty']} onChange={(v) => props.onMapped(v === 'mapped')} />
      <Choice label="Results" value={props.results} options={['loaded', 'loading', 'limit']} onChange={(v) => props.onResults(v as Results)} />
      <Choice label="Saved" value={props.savedCount > 0 ? 'some' : 'none'} options={['some', 'none']} onChange={(v) => props.onSaved(v === 'some')} />
      <Choice label="Palette" value={palette} options={Object.keys(PALETTE_CHOICES)} onChange={choosePalette} />
      <button type="button" className="sandbox-hide" aria-label="Hide sandbox controls" aria-expanded={true} onClick={() => setOpen(false)}>
        <Icon name="keyboardArrowDown" size={20} />
      </button>
    </div>
  );
}

function Choice({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <span className="sandbox-choice" role="group" aria-label={label}>
      {label}:
      {options.map((o) => (
        <button key={o} type="button" aria-pressed={o === value} onClick={() => onChange(o)}>
          {o}
        </button>
      ))}
    </span>
  );
}
