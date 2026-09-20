import { demoMode, downloadDemoPdf } from "../../services/demo";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AppShell, PortalHeader } from "../../components/AppShell";
import { api, errorMessage } from "../../services/api";
import { useAppState } from "../../state/useAppState";
import type { Prescription } from "../../../shared/domain";
export function PrescriptionPage() {
  const { id } = useParams();
  const { home } = useAppState();
  const [rx, setRx] = useState<Prescription | null>(null);
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    void api
      .prescription(id!)
      .then((r) => {
        if (active) {
          setRx(r.prescription);
          setUrl(r.url);
          if (r.documentError) setError(r.documentError);
        }
      })
      .catch((e) => {
        if (active) setError(errorMessage(e));
      });
    return () => {
      active = false;
    };
  }, [id]);
  async function download() {
    try {
      const result = await api.prescription(id!);
      setUrl(result.url);
      if(demoMode){await downloadDemoPdf(result.url);return}
      const anchor = document.createElement("a");
      anchor.href = result.url;
      anchor.target = "_blank";
      anchor.rel = "noopener";
      anchor.click();
    } catch (e) {
      setError(errorMessage(e));
    }
  }
  return (
    <AppShell role={home.profile!.role}>
      <PortalHeader title="Prescription" />
      <main className="product-content">
        {error && (
          <p role="alert" className="error-message">
            {error}
          </p>
        )}
        {rx ? (
          <>
            <div className="action-row no-print">
              <button
                className="button primary"
                disabled={!url}
                onClick={() => void download()}
              >
                Download PDF
              </button>
              <button className="button ghost" onClick={() => window.print()}>
                Print
              </button>
              <Link to={`/${home.profile!.role}/home`}>Back to home</Link>
            </div>
            <section className="product-card no-print">
              <h2>What changed</h2>
              {rx.draft.items.map((item) => {
                const before = rx.before.find((m) => m.id === item.sourceId);
                return (
                  <article key={item.id} className="history-item">
                    <strong>
                      {item.name} ·{" "}
                      {item.decision.toLowerCase().replace("_", " ")}
                    </strong>
                    {before && (
                      <p>
                        Before: {before.strength} · {before.dose} ·{" "}
                        {before.frequency}
                      </p>
                    )}
                    <p>
                      {item.decision === "STOP"
                        ? "Stopped"
                        : item.decision === "NOT_REVIEWED"
                          ? "Not reviewed during this consultation"
                          : `${item.strength} · ${item.dose} · ${item.frequency}`}
                    </p>
                    {item.reason && <p>Reason: {item.reason}</p>}
                  </article>
                );
              })}
            </section>
            <article className="prescription-sheet">
              <header>
                <div>
                  <strong>MedPal</strong>
                  <small>Care, in context.</small>
                </div>
                <div>
                  <b>{rx.doctor.clinicName}</b>
                  <small>{rx.doctor.clinicAddress}</small>
                </div>
              </header>
              <div className="rx-meta">
                <div>
                  <strong>{rx.doctor.fullName}</strong>
                  <small>
                    {rx.doctor.qualifications}
                    <br />
                    {rx.doctor.medicalCouncil}
                    <br />
                    {rx.doctor.registrationNumber}
                  </small>
                </div>
                <div>
                  <strong>{rx.patient.fullName}</strong>
                  <small>
                    DOB: {rx.patient.dateOfBirth}
                    <br />
                    {new Date(rx.issuedAt).toLocaleString()}
                  </small>
                </div>
              </div>
              <p>Concern: {rx.draft.complaint}</p>
              <p>Observations: {rx.draft.observations}</p>
              <p>Diagnosis: {rx.draft.diagnosis}</p>
              <h3>Rx</h3>
              <table>
                <thead>
                  <tr>
                    <th>Medicine</th>
                    <th>Dose / route</th>
                    <th>When</th>
                    <th>Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {rx.draft.items
                    .filter(
                      (m) => !["STOP", "NOT_REVIEWED"].includes(m.decision),
                    )
                    .map((m) => (
                      <tr key={m.id}>
                        <td>
                          {m.name}
                          <br />
                          {m.strength} · {m.formulation}
                        </td>
                        <td>
                          {m.dose} · {m.route}
                        </td>
                        <td>
                          {m.frequency}
                          <br />
                          {m.timing}
                          <br />
                          {m.instructions}
                        </td>
                        <td>
                          {m.duration}
                          {m.quantity && (
                            <>
                              <br />
                              Quantity: {m.quantity}
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
              <p>Advice: {rx.draft.advice}</p>
              <p>Follow-up: {rx.draft.followUp}</p>
              <footer>
                <div>
                  <b>Electronically issued by {rx.doctor.fullName}</b>
                  <small>Record {rx.id}</small>
                  <small>Integrity reference: {rx.digest.slice(0, 16)}</small>
                </div>
              </footer>
              <p className="microcopy">
                This is an electronic issuance record. No certificate-based
                digital signature is claimed.
              </p>
            </article>
          </>
        ) : (
          !error && <p>Loading prescription…</p>
        )}
      </main>
    </AppShell>
  );
}
