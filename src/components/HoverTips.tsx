import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const DELAY_MS = 900;
const GAP = 8;

/**
 * Small hover tooltips for any element with `data-tip`, shown after a short delay (mouse only).
 * Visual only: the elements carry the same words as their accessible names.
 */
export function HoverTips() {
  const [tip, setTip] = useState<{ text: string; anchor: DOMRect } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const bubble = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let current: Element | null = null;
    const hide = () => {
      clearTimeout(timer.current);
      current = null;
      setTip(null);
    };
    const over = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      const el = (e.target as Element | null)?.closest('[data-tip]') ?? null;
      if (el === current) return;
      hide();
      if (!el) return;
      current = el;
      timer.current = setTimeout(() => {
        const text = el.getAttribute('data-tip');
        if (text && el.isConnected) setTip({ text, anchor: el.getBoundingClientRect() });
      }, DELAY_MS);
    };
    document.addEventListener('pointerover', over);
    document.addEventListener('pointerdown', hide);
    document.addEventListener('keydown', hide);
    addEventListener('scroll', hide, true);
    return () => {
      clearTimeout(timer.current);
      document.removeEventListener('pointerover', over);
      document.removeEventListener('pointerdown', hide);
      document.removeEventListener('keydown', hide);
      removeEventListener('scroll', hide, true);
    };
  }, []);

  // Above the element, or below when there's no room; kept inside the window.
  useLayoutEffect(() => {
    const el = bubble.current;
    if (!el || !tip) return;
    const { width, height } = el.getBoundingClientRect();
    const a = tip.anchor;
    const above = a.top - height - GAP >= 8;
    const left = Math.min(Math.max(8, a.left + a.width / 2 - width / 2), innerWidth - width - 8);
    el.style.left = `${left}px`;
    el.style.top = `${above ? a.top - height - GAP : a.bottom + GAP}px`;
    el.style.visibility = 'visible';
  }, [tip]);

  if (!tip) return null;
  return createPortal(
    <div ref={bubble} className="hover-tip" aria-hidden="true" style={{ visibility: 'hidden' }}>
      {tip.text}
    </div>,
    document.body,
  );
}
