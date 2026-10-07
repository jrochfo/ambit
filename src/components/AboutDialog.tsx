import type { Ref } from 'react';
import { Icon } from './Icon';
import { Logomark } from './Logomark';

/** About Ambit: what it is, how it works, where data comes from, who made it. Native <dialog>. */
export function AboutDialog({ ref }: { ref: Ref<HTMLDialogElement> }) {
  return (
    <dialog
      ref={ref}
      className="about"
      aria-labelledby="about-title"
      // A click on the backdrop lands on the dialog element itself.
      onClick={(e) => {
        if (e.target === e.currentTarget) e.currentTarget.close();
      }}
    >
      <div className="about-body">
        <div className="about-head">
          <Logomark size={32} />
          <h2 id="about-title">About Ambit</h2>
          <form method="dialog">
            <button className="icon-btn" aria-label="Close">
              <Icon name="close" size={20} />
            </button>
          </form>
        </div>

        <p className="about-lede">
          Ambit answers one question: what’s within a walk of here? Enter an address and it draws how far you can walk in 5, 10, or 15
          minutes (or any time you choose), along real streets, then finds the groceries, coffee, transit, and anything else you care about
          inside that reach. Save a few addresses to compare them side by side, whether you’re apartment hunting or just sizing up a
          neighborhood.
        </p>

        <h3>How it works</h3>
        <ul>
          <li>
            <strong>Walking rings</strong> come from Google’s Isochrones API, which follows actual streets and paths instead of drawing a
            circle. The API is a preview, so its results may still change.
          </li>
          <li>
            <strong>Spots</strong> come from Google Places: the nearest matches for each category, sorted into your rings. Times are by ring
            (“within 10 minutes”), not turn-by-turn directions.
          </li>
          <li>
            <strong>Addresses, suggestions, and the map</strong> come from Google Maps.
          </li>
        </ul>

        <h3>Your data</h3>
        <p>
          There are no accounts. Your saved addresses, rings, and categories stay in this browser. Searches go to Google Maps Platform, with
          walking rings passing through Ambit’s small server, which holds the API key.
        </p>

        <p className="about-credit">
          Made by{' '}
          <a href="https://jakerochford.com" target="_blank" rel="noreferrer">
            Jake Rochford
          </a>
          . Map data © Google.
        </p>
      </div>
    </dialog>
  );
}
