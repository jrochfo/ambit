import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';

export type SearchTarget = { kind: 'prediction'; prediction: google.maps.places.PlacePrediction } | { kind: 'text'; text: string };

// Cost guardrails: each fetch is a billed Autocomplete request (until the session
// ends in a pick), so wait for a pause in typing and a few characters first.
const MIN_CHARS = 3;
const DEBOUNCE_MS = 250;

/**
 * Address field with Google Places suggestions in our own dropdown (ARIA combobox).
 * One session token spans a typing session and is retired once a suggestion is picked,
 * so Google bills the session, not each keystroke.
 */
export function AddressSearch({ busy, onSearch }: { busy: boolean; onSearch: (target: SearchTarget) => void }) {
  const places = useMapsLibrary('places');
  const listId = useId();
  const [value, setValue] = useState('');
  const [suggestions, setSuggestions] = useState<google.maps.places.PlacePrediction[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const session = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const latestRequest = useRef(0);
  // Typing sets this; choosing a suggestion fills the field without refetching.
  const shouldFetch = useRef(false);

  useEffect(() => {
    if (!places || !shouldFetch.current) return;
    const input = value.trim();
    if (input.length < MIN_CHARS) {
      setSuggestions([]);
      return;
    }
    const requestId = ++latestRequest.current;
    const timer = setTimeout(async () => {
      session.current ??= new places.AutocompleteSessionToken();
      try {
        const { suggestions } = await places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input,
          sessionToken: session.current,
        });
        if (requestId !== latestRequest.current) return;
        setSuggestions(suggestions.flatMap((s) => (s.placePrediction ? [s.placePrediction] : [])));
        setActive(-1);
      } catch (err) {
        console.error('Address suggestions failed', err);
        if (requestId === latestRequest.current) setSuggestions([]);
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [places, value]);

  function choose(prediction: google.maps.places.PlacePrediction) {
    shouldFetch.current = false;
    latestRequest.current++;
    setValue(prediction.text.text);
    setSuggestions([]);
    setOpen(false);
    // The Place lookup that follows closes this session; the next keystroke starts a new one.
    session.current = null;
    onSearch({ kind: 'prediction', prediction });
  }

  function submit() {
    const pick = suggestions[active] ?? suggestions[0];
    if (pick) return choose(pick);
    const text = value.trim();
    if (text) {
      setOpen(false);
      onSearch({ kind: 'text', text });
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    const showing = open && suggestions.length > 0;
    if (e.key === 'ArrowDown' && suggestions.length > 0) {
      e.preventDefault();
      setOpen(true);
      setActive((i) => (showing ? (i + 1) % suggestions.length : 0));
    } else if (e.key === 'ArrowUp' && showing) {
      e.preventDefault();
      setActive((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === 'Escape' && showing) {
      e.preventDefault();
      setOpen(false);
      setActive(-1);
    }
  }

  const expanded = open && suggestions.length > 0;
  const optionId = (i: number) => `${listId}-opt-${i}`;

  return (
    <form
      className="field"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <label className="field-label" htmlFor="addr">
        Address
      </label>
      <div className="field-row">
        <div className="combo">
          <input
            id="addr"
            className="input"
            type="text"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={expanded}
            aria-controls={listId}
            aria-activedescendant={expanded && active >= 0 ? optionId(active) : undefined}
            autoComplete="off"
            spellCheck={false}
            placeholder="123 Sample St, Anytown"
            value={value}
            onChange={(e) => {
              shouldFetch.current = true;
              setValue(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setOpen(false)}
            onKeyDown={handleKeyDown}
          />
          {expanded && (
            <div className="combo-popup">
              <ul className="combo-list" id={listId} role="listbox" aria-label="Address suggestions">
                {suggestions.map((p, i) => (
                  <li
                    key={p.placeId}
                    id={optionId(i)}
                    role="option"
                    aria-selected={i === active}
                    className="combo-option"
                    // Keep focus in the input so blur doesn't close the list before the click lands.
                    onMouseDown={(e) => e.preventDefault()}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => choose(p)}
                  >
                    <span className="combo-main">{p.mainText?.text ?? p.text.text}</span>
                    {p.secondaryText && <span className="combo-secondary">{p.secondaryText.text}</span>}
                  </li>
                ))}
              </ul>
              <div className="combo-attribution">Suggestions from Google Maps</div>
            </div>
          )}
        </div>
        <button className="btn" type="submit" disabled={busy}>
          {busy ? 'Mapping…' : 'Map it'}
        </button>
      </div>
    </form>
  );
}
