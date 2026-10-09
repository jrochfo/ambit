import { useEffect } from 'react';

// Category view: one category's spots on the map (App and the sandbox share these helpers).

/** The spot whose card is shown open: a category's spot, or its nearest when `place` is absent. */
export interface Spotlight {
  category: string;
  place?: string;
}

/**
 * Leaves category view on Escape or on any click outside the map. Controls that choose a
 * category themselves (sidebar rows, comparison cells) are marked `data-category-control`.
 */
export function useExitCategoryView(active: boolean, exit: () => void): void {
  useEffect(() => {
    if (!active) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Element | null;
      if (target?.closest('.map-panel, [data-category-control], .sandbox-bar, .sandbox-pill')) return;
      exit();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      const target = e.target as Element | null;
      // Escape belongs to fields, menus and dialogs first.
      if (target?.closest('input, textarea, [role="listbox"], dialog')) return;
      exit();
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [active, exit]);
}

/** Brings the map into view (after choosing something from the comparison grid). */
export function scrollToMap(): void {
  const smooth = !matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.querySelector('.map-panel')?.scrollIntoView({ block: 'start', behavior: smooth ? 'smooth' : 'auto' });
}
