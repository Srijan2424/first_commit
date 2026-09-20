import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, errorMessage } from "../../services/api";
import { AppShell, PortalHeader } from "../../components/AppShell";
import { MedicationEditor } from "../../components/MedicationEditor";
import {
  draftInput,
  validateDecisions,
  type Access,
  type Draft,
  type Medication,
  type Profile,
} from "../../../shared/domain";
export function ConsultationPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [access, setAccess] = useState<Access | null>(null);
  const [patient, setPatient] = useState<Profile | null>(null);
  const [existing, setExisting] = useState<Medication[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [editor, setEditor] = useState<Medication | null | undefined>(
    undefined,
  );
  const [review, setReview] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [expired, setExpired] = useState(false);
  useEffect(() => {
    let active = true;
    void api
      .consultation(id!)
      .then((r) => {
        if (active) {
          setAccess(r.access);
          setPatient(r.patient);
          setExisting(r.medicines);
          setDraft(r.access.draft);
        }
      })
      .catch((e) => {
        if (active) setError(errorMessage(e));
      });
    return () => {
      active = false;
    };
  }, [id]);
  useEffect(() => {
    if (!access) return;
    const timer = setInterval(() => {
      if (Date.now() >= access.expiresAt) {
        setExpired(true);
        setDraft(null);
        setPatient(null);
        setExisting([]);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [access]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  function edit(item: Medication) {
    const saved = draft?.items.find((m) => m.sourceId === item.id);
    setEditor(
      saved ?? {
        ...item,
        id: crypto.randomUUID(),
        sourceId: item.id,
        decision: "NOT_REVIEWED",
        reason: "",
      },
    );
  }
  function saveItem(item: Medication) {
    if (!draft) return;
    setDraft({
      ...draft,
      items: [...draft.items.filter((m) => m.id !== item.id), item],
    });
    setDirty(true);
    setEditor(undefined);
  }
  async function save(openReview = false) {
    if (!draft || !access) return;
    setBusy(true);
    setError("");
    try {
      const checked = draftInput.parse(draft);
      validateDecisions(existing, checked.items);
      const saved = await api.saveDraft(id!, access.revision, checked);
      setAccess(saved);
      setDraft(saved.draft);
      setDirty(false);
      setReview(openReview);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function issue() {
    if (!access) return;
    setBusy(true);
    setError("");
    try {
      const result = await api.issue(id!, access.revision);
      setDirty(false);
      navigate(`/doctor/prescriptions/${result.id}`);
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  }
  async function close() {
    if (
      !window.confirm(
        "Close this consultation and end medical history access? Unsaved changes will be discarded.",
      )
    )
      return;
    setBusy(true);
    try {
      await api.close(id!);
      setDirty(false);
      navigate("/doctor/home");
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  }
  return (
    <AppShell role="doctor">
      <PortalHeader
        title={review ? "Review before issuing" : "Consultation workspace"}
        eyebrow={patient?.fullName}
      />
      <main className="product-content">
        {error && (
          <p role="alert" className="error-message">
            {error}
          </p>
        )}
        {expired ? (
          <p role="alert">
            Access has expired. Request a new authorization before continuing.
          </p>
        ) : !draft ? (
          <p>
            {error
              ? "This consultation could not be opened."
              : "Loading authorized consultation…"}
          </p>
        ) : (
          <>
            <div className="action-row">
              <span>
                {patient?.fullName} · {patient?.dateOfBirth}
              </span>
              <button
                className="button ghost"
                disabled={busy}
                onClick={() => void close()}
              >
                Close consultation
              </button>
            </div>
            {editor !== undefined ? (
              <MedicationEditor
                key={editor?.id ?? "new"}
                item={editor ?? undefined}
                onSave={saveItem}
                onCancel={() => setEditor(undefined)}
              />
            ) : review ? (
              <>
                <section className="product-card">
                  <h2>Changes in this prescription</h2>
                  {draft.items.length ? (
                    draft.items.map((m) => (
                      <article key={m.id} className="change-row">
                        <span>
                          <small>{m.decision.replace("_", " ")}</small>
                          <strong>{m.name}</strong>
                        </span>
                        <span>
                          {m.strength} · {m.dose} · {m.frequency}
                          <small>{m.reason}</small>
                        </span>
                        <button
                          onClick={() => {
                            setReview(false);
                            setEditor(m);
                          }}
                        >
                          Edit
                        </button>
                      </article>
                    ))
                  ) : (
                    <p>No medicine decisions added.</p>
                  )}
                  <p>Diagnosis: {draft.diagnosis || "Not entered"}</p>
                  <p>Advice: {draft.advice || "None"}</p>
                  <div className="soft-note">
                    Issued prescriptions cannot be overwritten. A correction
                    creates a linked new record.
                  </div>
                  <div className="action-row">
                    <button
                      className="button ghost"
                      onClick={() => setReview(false)}
                    >
                      ← Back to consultation
                    </button>
                    <button
                      className="button primary"
                      disabled={busy || dirty || !draft.items.length}
                      onClick={() => void issue()}
                    >
                      {busy ? "Issuing…" : "Issue prescription"}
                    </button>
                  </div>
                </section>
              </>
            ) : (
              <>
                <section className="product-card">
                  <h2>Existing medicines</h2>
                  {existing.length ? (
                    <div className="medicine-grid">
                      {existing.map((m) => (
                        <button
                          className="paper product-card medicine-card"
                          key={m.id}
                          onClick={() => edit(m)}
                        >
                          <strong>{m.name}</strong>
                          <span>
                            {m.strength} · {m.frequency}
                          </span>
                          <small>Review medicine →</small>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p>No active medicines are recorded for this patient.</p>
                  )}
                </section>
                <section className="paper product-card">
                  <h2>Consultation notes</h2>
                  <div className="form-grid">
                    {(
                      [
                        "complaint",
                        "observations",
                        "diagnosis",
                        "advice",
                        "followUp",
                      ] as const
                    ).map((key) => (
                      <label key={key}>
                        {key === "followUp" ? "Follow-up" : key}
                        <textarea
                          value={draft[key]}
                          onChange={(e) => {
                            setDraft({ ...draft, [key]: e.target.value });
                            setDirty(true);
                          }}
                        />
                      </label>
                    ))}
                  </div>
                </section>
                <section className="product-card">
                  <h2>Prescription draft</h2>
                  {draft.items.map((m) => (
                    <article className="draft-item" key={m.id}>
                      <div>
                        <strong>
                          {m.name} · {m.strength}
                        </strong>
                        <p>
                          {m.decision.toLowerCase().replace("_", " ")} ·{" "}
                          {m.dose} · {m.frequency}
                        </p>
                      </div>
                      <button
                        className="button ghost"
                        onClick={() => setEditor(m)}
                      >
                        Edit
                      </button>
                      <button
                        className="button ghost"
                        onClick={() => {
                          setDraft({
                            ...draft,
                            items: draft.items.filter((i) => i.id !== m.id),
                          });
                          setDirty(true);
                        }}
                      >
                        Remove decision
                      </button>
                    </article>
                  ))}
                  <button
                    className="button primary"
                    onClick={() => setEditor(null)}
                  >
                    + Add medicine
                  </button>
                </section>
                <div className="action-row">
                  <button
                    className="button ghost"
                    disabled={busy}
                    onClick={() => void save()}
                  >
                    {busy ? "Saving…" : "Save draft"}
                  </button>
                  <button
                    className="button primary"
                    disabled={busy}
                    onClick={() => void save(true)}
                  >
                    Save and review →
                  </button>
                  <span role="status">
                    {dirty ? "Unsaved changes" : "Draft up to date"}
                  </span>
                </div>
              </>
            )}
          </>
        )}
        <Link to="/doctor/home">Return home</Link>
      </main>
    </AppShell>
  );
}
