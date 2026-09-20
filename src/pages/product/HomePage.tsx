import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAppState } from "../../state/useAppState";
import { api, errorMessage } from "../../services/api";
import { AppShell, PortalHeader } from "../../components/AppShell";
import type { Access } from "../../../shared/domain";
export function RequestCard({
  request,
  onUpdate,
}: {
  request: Access;
  onUpdate: () => Promise<unknown>;
}) {
  const storageKey = `medpal.consultation-code.${request.id}`;
  const cached = (() => {
    try {
      const value = JSON.parse(sessionStorage.getItem(storageKey) ?? "null");
      return value?.code && value?.expires ? value : null;
    } catch {
      return null;
    }
  })();
  const [code, setCode] = useState<string>(cached?.code ?? "");
  const [expires, setExpires] = useState<number>(cached?.expires ?? 0);
  const [copied, setCopied] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  async function respond(approve: boolean) {
    setBusy(true);
    setError("");
    try {
      if (approve) {
        const result = await api.approve(request.id);
        setCode(result.code);
        setExpires(result.expiresAt);
        setMinimized(false);
        sessionStorage.setItem(
          storageKey,
          JSON.stringify({ code: result.code, expires: result.expiresAt }),
        );
      } else {
        sessionStorage.removeItem(storageKey);
        await api.decline(request.id);
        await onUpdate();
      }
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <article
      className={`product-card ${request.status === "REQUESTED" && !code ? "request-modal" : ""}`}
      role={request.status === "REQUESTED" && !code ? "dialog" : undefined}
      aria-label="New consultation request"
    >
      <h2>Consultation request</h2>
      <p>
        {request.doctorName} requests access to your medical history for this
        consultation.
      </p>
      {code && expires > now ? (
        <div
          className={`authorization-code ${minimized ? "" : "authorization-code-modal"}`}
          role="status"
          aria-live="assertive"
        >
          <span>Consultation authorization code</span>
          <strong aria-label={`Consultation authorization code: ${code}`}>
            {code}
          </strong>
          <small>
            Show this single-use code to {request.doctorName}. Expires in{" "}
            {Math.max(0, Math.ceil((expires - now) / 1000))} seconds.
          </small>
          <button
            type="button"
            className="button dark"
            onClick={() => {
              void navigator.clipboard.writeText(code);
              setCopied(true);
            }}
          >
            {copied ? "Code copied" : "Copy code"}
          </button>
          {!minimized && (
            <button
              type="button"
              className="button secondary"
              onClick={() => setMinimized(true)}
            >
              Minimize code
            </button>
          )}
        </div>
      ) : (
        <div className="action-row">
          <button
            className="button primary"
            disabled={busy || request.expiresAt < now}
            onClick={() => void respond(true)}
          >
            Approve and generate code
          </button>
          <button
            className="button ghost"
            disabled={busy}
            onClick={() => void respond(false)}
          >
            Decline
          </button>
        </div>
      )}
      {error && (
        <p role="alert" className="error-message">
          {error}
        </p>
      )}
    </article>
  );
}
export function HomePage() {
  const { home, refresh, error: loadError } = useAppState();
  const p = home.profile!;
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [match, setMatch] = useState<{ id: string; fullName: string } | null>(
    null,
  );
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const update = () => {
      if (document.visibilityState === "visible")
        void refresh().catch(() => {});
    };
    const timer = setInterval(update, p.role === "patient" ? 2000 : 10000);
    window.addEventListener("focus", update);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", update);
    };
  }, [p.role, refresh]);
  async function search() {
    setBusy(true);
    setError("");
    setMatch(null);
    try {
      const normalized = phone.replace(/\D/g, "");
      if (!/^\d{10}$/.test(normalized))
        throw new Error("Enter a 10-digit mobile number");
      setMatch(await api.findPatient(`+91${normalized}`));
      setSearched(true);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function request() {
    if (!match) return;
    setBusy(true);
    try {
      const access = await api.request(match.id);
      navigate(`/doctor/consultations/${access.id}/authorize`);
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  }
  return (
    <AppShell role={p.role}>
      <PortalHeader
        eyebrow={p.role === "doctor" ? p.clinicName : "Your care"}
        title={`Hello, ${p.fullName}`}
      />
      <main className="product-content">
        {loadError && (
          <p role="alert" className="error-message">
            Updates could not be loaded: {loadError}
          </p>
        )}
        {p.role === "doctor" ? (
          <>
            <section className="paper product-card">
              <h2>Start a consultation</h2>
              {p.verificationStatus !== "VERIFIED" ? (
                <p>
                  Your credentials are {p.verificationStatus.toLowerCase()}.{" "}
                  <Link to="/doctor/profile">
                    Review your profile and document
                  </Link>
                  . Prescribing is unavailable until verification is complete.
                </p>
              ) : (
                <>
                  <form
                    className="search-row"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void search();
                    }}
                  >
                    <span>+91</span>
                    <input
                      aria-label="Patient mobile number"
                      inputMode="tel"
                      value={phone}
                      onChange={(e) => {
                        setPhone(e.target.value);
                        setSearched(false);
                        setMatch(null);
                      }}
                    />
                    <button className="button dark" disabled={busy}>
                      Find patient
                    </button>
                  </form>
                  {match ? (
                    <div>
                      <h3>{match.fullName}</h3>
                      <p>
                        Medical history remains private until this patient
                        authorizes access.
                      </p>
                      <button
                        className="button dark"
                        disabled={busy}
                        onClick={() => void request()}
                      >
                        Request access
                      </button>
                    </div>
                  ) : (
                    searched && (
                      <p>No registered patient was found for this number.</p>
                    )
                  )}
                </>
              )}
              {error && (
                <p role="alert" className="error-message">
                  {error}
                </p>
              )}
            </section>
            <section className="product-card">
              <h2>Consultations</h2>
              {home.requests.length ? (
                home.requests.map((r) => (
                  <p key={r.id}>
                    <Link
                      to={`/doctor/consultations/${r.id}${r.status === "AUTHORIZED" ? "" : "/authorize"}`}
                    >
                      {r.patientName} · {r.status.toLowerCase()}
                    </Link>
                  </p>
                ))
              ) : (
                <p>
                  No consultations yet. Your authorized consultations will
                  appear here.
                </p>
              )}
            </section>
          </>
        ) : (
          <>
            {!home.requests.some((r) =>
              ["REQUESTED", "APPROVED"].includes(r.status),
            ) && (
              <section className="product-card waiting-request">
                <h2>Waiting for a consultation request</h2>
                <p>
                  When your doctor requests access, an approval popup will
                  appear here automatically.
                </p>
                <button
                  className="button primary"
                  onClick={() => void refresh().catch(() => {})}
                >
                  Check for requests now
                </button>
              </section>
            )}
            {home.requests
              .filter((r) => ["REQUESTED", "APPROVED"].includes(r.status))
              .map((r) => (
                <RequestCard key={r.id} request={r} onUpdate={refresh} />
              ))}
            <section className="product-card">
              <h2>Your medicines</h2>
              {home.medicines.length ? (
                <div className="medicine-grid">
                  {home.medicines.map((m) => (
                    <article className="paper product-card" key={m.id}>
                      <h3>{m.name}</h3>
                      <p>
                        {m.strength} · {m.dose}
                      </p>
                      <p>
                        {m.frequency} · {m.timing}
                      </p>
                      <p>{m.instructions}</p>
                    </article>
                  ))}
                </div>
              ) : (
                <p>
                  No prescribed medicines yet. Your medicines will appear after
                  a doctor issues your first prescription.
                </p>
              )}
            </section>
          </>
        )}
        <section className="product-card">
          <h2>
            {p.role === "patient"
              ? "Your prescriptions"
              : "Issued prescriptions"}
          </h2>
          {home.prescriptions.length ? (
            home.prescriptions.map((rx) => (
              <article className="history-item" key={rx.id}>
                <Link to={`/${p.role}/prescriptions/${rx.id}`}>
                  {new Date(rx.issuedAt).toLocaleDateString()} ·{" "}
                  {p.role === "patient"
                    ? rx.doctor.fullName
                    : rx.patient.fullName}
                </Link>
                <p>
                  {rx.draft.items
                    .map(
                      (m) =>
                        `${m.name}: ${m.decision.toLowerCase().replace("_", " ")}`,
                    )
                    .join(" · ")}
                </p>
              </article>
            ))
          ) : (
            <p>No prescriptions yet.</p>
          )}
        </section>
      </main>
    </AppShell>
  );
}
