// Per-browser preferences (active rings, chosen categories). Storage can be missing or
// blocked (private windows), so every access is guarded and falls back to defaults.

export function loadPref<T>(key: string, fallback: T, valid: (v: unknown) => v is T): T {
  try {
    const raw = localStorage.getItem(`ambit.${key}`);
    if (raw === null) return fallback;
    const parsed: unknown = JSON.parse(raw);
    return valid(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

export function savePref(key: string, value: unknown): void {
  try {
    localStorage.setItem(`ambit.${key}`, JSON.stringify(value));
  } catch {
    // Not saved; the app still works for this visit.
  }
}
