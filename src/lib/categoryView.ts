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

/**
 * Scrolls a sidebar section back to its top when it's scrolled past (its title is pinned). Only
 * the sidebar's own scroll area moves; on phones, where the page scrolls instead, the page moves
 * only when the title is pinned to the top of the window.
 */
export function scrollSectionToTop(el: Element | null): void {
  const section = el?.closest('.field');
  const scroller = section?.closest('.sidebar-scroll');
  if (!section || !scroller) return;
  const behavior = matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
  const margin = parseFloat(getComputedStyle(section).scrollMarginTop) || 0;
  const top = section.getBoundingClientRect().top;
  if (scroller.scrollHeight > scroller.clientHeight && getComputedStyle(scroller).overflowY !== 'visible') {
    const offset = top - scroller.getBoundingClientRect().top - margin;
    if (offset < 0) scroller.scrollBy({ top: offset, behavior });
  } else if (top < 0) {
    scrollBy({ top: top - margin, behavior });
  }
}
