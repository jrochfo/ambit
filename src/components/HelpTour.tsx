import { useCallback, useEffect, useLayoutEffect, useRef, useState, type Ref } from 'react';
import { Icon } from './Icon';

interface Step {
  /** `data-tour` value of the element to highlight. */
  target: string;
  /** Used when the target isn't on the page (no address mapped yet). */
  fallback?: { target: string; text: string };
  title: string;
  text: string;
}

const STEPS: Step[] = [
  {
    target: 'address',
    title: 'Start with an address',
    text: 'Type any address and pick a suggestion, or press Map it. Ambit draws how far you can walk from there.',
  },
  {
    target: 'times',
    title: 'Walking times',
    text: 'Each time is a ring on the map. Tap a time to show or hide its ring, × to remove it, or Add time for another.',
  },
  {
    target: 'categories',
    title: 'What’s nearby',
    text: 'The nearest spot in each category, and which ring it’s in. Tap a category to see all its spots on the map. Choose adds or removes categories.',
  },
  {
    target: 'save',
    fallback: { target: 'address', text: 'Once you’ve mapped an address, Save to compare appears just below it. You can keep up to three.' },
    title: 'Save to compare',
    text: 'Save an address to compare it with others. You can keep up to three, and rename them any time.',
  },
  {
    target: 'compare',
    title: 'Compare addresses',
    text: 'Your saved addresses side by side: the walk to the spot that counts in each category. Click any cell to see that spot on the map.',
  },
];

const GAP = 16;
const narrow = () => document.documentElement.clientWidth < 600;
const PAD = 8;

/**
 * Help: a short walkthrough. Each step dims the page except one part of it and explains that
 * part in a small card. A modal dialog, so focus stays in the card; Escape, the close button and
 * Skip tour all end it at any step.
 */
export function HelpTour({ ref }: { ref: Ref<HTMLDialogElement> }) {
  const dialog = useRef<HTMLDialogElement | null>(null);
  const card = useRef<HTMLDivElement>(null);
  const next = useRef<HTMLButtonElement>(null);
  const [step, setStep] = useState(0);
  // Bumped on each open, so the first step is measured even when `step` is already 0.
  const [run, setRun] = useState(0);
  const [hole, setHole] = useState<{ top: number; left: number; width: number; height: number } | null>(null);

  const setRefs = useCallback(
    (el: HTMLDialogElement | null) => {
      dialog.current = el;
      if (typeof ref === 'function') ref(el);
      else if (ref) ref.current = el;
    },
    [ref],
  );

  const current = STEPS[step]!;
  const target = (): { el: Element | null; text: string } => {
    const el = document.querySelector(`[data-tour="${current.target}"]`);
    if (el || !current.fallback) return { el, text: current.text };
    return { el: document.querySelector(`[data-tour="${current.fallback.target}"]`), text: current.fallback.text };
  };
  const { text } = target();

  // Measure the highlighted element (after scrolling it into view), and again on scroll or resize.
  const measure = useCallback(() => {
    const { el } = target();
    if (!el) return setHole(null);
    const r = visibleRect(el);
    const vh = innerHeight;
    const top = Math.max(PAD, r.top - PAD);
    const bottom = Math.min(vh - PAD, r.bottom + PAD);
    setHole({ top, left: r.left - PAD, width: r.right - r.left + 2 * PAD, height: Math.max(0, bottom - top) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    const onOpen = () => {
      setStep(0);
      setRun((r) => r + 1);
    };
    d.addEventListener('tour-open', onOpen);
    return () => d.removeEventListener('tour-open', onOpen);
  }, []);

  useLayoutEffect(() => {
    if (!dialog.current?.open) return;
    const { el } = target();
    if (el) {
      const r = el.getBoundingClientRect();
      const scroller = scrollingAncestor(el);
      if (scroller) {
        // Inside the sidebar: bring the section to the sidebar's top, then show the sidebar.
        scroller.scrollTop += r.top - scroller.getBoundingClientRect().top;
        const v = visibleRect(el);
        if (v.top < 24 || v.bottom > innerHeight - 24) scrollTo({ top: scrollY + v.top - 24, behavior: 'auto' });
      } else if (narrow()) {
        // Phones: the card sits at the bottom, so bring the part to the top of the screen.
        scrollTo({ top: scrollY + r.top - 24, behavior: 'auto' });
      } else el.scrollIntoView({ block: r.height > innerHeight * 0.7 ? 'start' : 'center', behavior: 'auto' });
    }
    measure();
    next.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, run, measure]);

  useEffect(() => {
    const update = () => measure();
    addEventListener('scroll', update, true);
    addEventListener('resize', update);
    return () => {
      removeEventListener('scroll', update, true);
      removeEventListener('resize', update);
    };
  }, [measure]);

  // Place the card beside the highlight: right, left, below or above, whichever fits.
  useLayoutEffect(() => {
    const c = card.current;
    if (!c) return;
    const vw = document.documentElement.clientWidth;
    const vh = innerHeight;
    const { width, height } = c.getBoundingClientRect();
    let left: number;
    let top: number;
    if (narrow()) {
      left = GAP;
      top = vh - height - GAP;
    } else if (!hole) {
      left = (vw - width) / 2;
      top = (vh - height) / 2;
    } else if (hole.left + hole.width + GAP + width <= vw - GAP) {
      left = hole.left + hole.width + GAP;
      top = hole.top;
    } else if (hole.left - GAP - width >= GAP) {
      left = hole.left - GAP - width;
      top = hole.top;
    } else if (hole.top + hole.height + GAP + height <= vh - GAP) {
      left = hole.left + hole.width / 2 - width / 2;
      top = hole.top + hole.height + GAP;
    } else {
      left = hole.left + hole.width / 2 - width / 2;
      top = Math.max(GAP, hole.top - GAP - height);
    }
    c.style.left = `${Math.min(Math.max(GAP, left), vw - width - GAP)}px`;
    c.style.top = `${Math.min(Math.max(GAP, top), vh - height - GAP)}px`;
  }, [hole, step]);

  const close = () => dialog.current?.close();
  const last = step === STEPS.length - 1;

  return (
    <dialog ref={setRefs} className="tour" aria-labelledby="tour-title" aria-describedby="tour-text" onClose={() => setStep(0)}>
      {/* The page stays visible through the hole; everything else is dimmed. */}
      <div className="tour-hole" style={hole ?? { top: '50%', left: '50%', width: 0, height: 0 }} aria-hidden="true" />
      <div ref={card} className="tour-card">
        <div className="tour-card-head">
          <span className="tour-step">
            Step {step + 1} of {STEPS.length}
          </span>
          <button type="button" className="icon-btn" aria-label="Close the tour" onClick={close}>
            <Icon name="close" size={20} />
          </button>
        </div>
        <h2 id="tour-title">{current.title}</h2>
        <p id="tour-text">{text}</p>
        <div className="tour-dots" aria-hidden="true">
          {STEPS.map((s, i) => (
            <span key={s.target + i} className={i === step ? 'tour-dot tour-dot-on' : 'tour-dot'} />
          ))}
        </div>
        <div className="tour-actions">
          <button type="button" className="link-btn" onClick={close}>
            Skip tour
          </button>
          <span className="tour-nav">
            {step > 0 && (
              <button type="button" className="btn btn-sm btn-outline" onClick={() => setStep((s) => s - 1)}>
                Back
              </button>
            )}
            <button ref={next} type="button" className="btn btn-sm" onClick={() => (last ? close() : setStep((s) => s + 1))}>
              {last ? 'Done' : 'Next'}
            </button>
          </span>
        </div>
      </div>
    </dialog>
  );
}

/**
 * The part of an element that's actually visible: its box clipped by any scrolling ancestor
 * (the sidebar scrolls its sections inside itself).
 */
function visibleRect(el: Element): { top: number; bottom: number; left: number; right: number } {
  const r = el.getBoundingClientRect();
  let { top, bottom, left, right } = r;
  for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
    const style = getComputedStyle(p);
    if (style.overflowY === 'visible' && style.overflowX === 'visible') continue;
    const c = p.getBoundingClientRect();
    top = Math.max(top, c.top);
    bottom = Math.min(bottom, c.bottom);
    left = Math.max(left, c.left);
    right = Math.min(right, c.right);
  }
  return { top, bottom, left, right };
}

/** The nearest ancestor that scrolls its content (the sidebar on wide screens), if any. */
function scrollingAncestor(el: Element): HTMLElement | null {
  for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
    const y = getComputedStyle(p).overflowY;
    if ((y === 'auto' || y === 'scroll') && p.scrollHeight > p.clientHeight) return p;
  }
  return null;
}

/** Opens the tour from its first step. */
export function startTour(d: HTMLDialogElement | null): void {
  if (!d) return;
  d.dispatchEvent(new Event('tour-open'));
  d.showModal();
}
