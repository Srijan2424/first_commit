import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AppShell, PortalHeader } from "../../components/AppShell";
import { OtpInput } from "../../components/OtpInput";
import { api, errorMessage } from "../../services/api";
export function AuthorizationPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function verify() {
    setBusy(true);
    setError("");
    try {
      await api.verify(id!, code);
      navigate(`/doctor/consultations/${id}`);
    } catch (e) {
      setError(errorMessage(e));
      setCode("");
    } finally {
      setBusy(false);
    }
  }
  return (
    <AppShell role="doctor">
      <PortalHeader title="Patient authorization" />
      <main className="product-content">
        <section className="product-card">
          <h2>Enter the patient’s consultation code</h2>
          <p>
            Ask the patient to open their MedPal home, approve this request and
            show you the six-digit code. This is separate from their login code.
          </p>
          <OtpInput value={code} onChange={setCode} disabled={busy} />
          {error && (
            <p className="error-message" role="alert">
              {error}
            </p>
          )}
          <button
            className="button primary"
            disabled={busy || !/^\d{6}$/.test(code)}
            onClick={() => void verify()}
          >
            {busy ? "Checking…" : "Verify and open consultation"}
          </button>
        </section>
      </main>
    </AppShell>
  );
}
