import { Link } from "react-router-dom";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link className="brand" to="/" aria-label="MedPal home">
      <span className={compact ? "brand-name compact" : "brand-name"}>
        MedPal
      </span>
      {!compact && <span className="brand-tagline">Care, in context.</span>}
    </Link>
  );
}

export function Topline() {
  return (
    <header className="topline">
      <Brand />
      <div className="topline-poem">
        People.
        <br />
        Medicines.
        <br />
        Brighter tomorrows.
      </div>
      <svg className="signature-line" viewBox="0 0 190 60" aria-hidden="true">
        <path d="M4 48C34 18 55 8 62 17c10 13-6 30 7 30 16 0 30-42 51-36 17 5 7 28 23 27 11 0 21-19 43-16" />
      </svg>
      <div className="topline-note">
        A more human practice,
        <br />
        powered by better tools.
      </div>
    </header>
  );
}
