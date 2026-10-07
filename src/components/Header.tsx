export function Header() {
  return (
    <header className="header">
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true">
        <circle cx="18" cy="18" r="16" stroke="#0E7C74" strokeWidth="2" strokeOpacity="0.35" />
        <circle cx="18" cy="18" r="10.5" stroke="#0E7C74" strokeWidth="2" strokeOpacity="0.65" />
        <circle cx="18" cy="18" r="5" fill="#0E7C74" />
      </svg>
      <div>
        <h1 className="header-title">Ambit</h1>
        <p className="header-tagline">What's within a walk of here?</p>
      </div>
    </header>
  );
}
