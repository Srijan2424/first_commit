import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { profileInput, type ProfileInput } from "../../../shared/domain";
import { useAppState } from "../../state/useAppState";
import { api, errorMessage } from "../../services/api";
import { Brand } from "../../components/Brand";
import { PortraitAvatar, AbstractAvatar } from "../../components/Avatar";
import { Stepper } from "../../components/Stepper";
export function ProfilePage({ role }: { role: "doctor" | "patient" }) {
  const { home, refresh } = useAppState();
  const navigate = useNavigate();
  const onboarding = ["/doctor/credentials", "/patient/onboarding"].includes(useLocation().pathname);
  const [form, setForm] = useState<ProfileInput>(() => {
    const p = home.profile;
    return p
      ? profileInput.parse(
          Object.fromEntries(
            Object.entries(p).filter(
              ([k]) =>
                ![
                  "id",
                  "phone",
                  "verificationStatus",
                  "certificateKey",
                  "revision",
                ].includes(k),
            ),
          ),
        )
      : { role, fullName: "", avatarId: "01" };
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  function update(key: keyof ProfileInput, value: string | number | undefined) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }
  async function save() {
    setBusy(true);
    setError("");
    try {
      await api.saveProfile(profileInput.parse(form));
      await refresh();
      setSaved(true);
      if (onboarding) navigate(role === "doctor" ? "/doctor/documents" : "/patient/home");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  function field(
    label: string,
    key: keyof ProfileInput,
    type = "text",
    required = false,
  ) {
    return (
      <label>
        {label}
        <input
          type={type}
          required={required}
          value={form[key] ?? ""}
          onChange={(e) =>
            update(
              key,
              type === "number"
                ? e.target.value
                  ? Number(e.target.value)
                  : undefined
                : e.target.value || undefined,
            )
          }
        />
      </label>
    );
  }
  return (
    <div className="app-page">
      <header className="app-header">
        <Brand />
        <span>
          {role === "doctor" ? "Professional profile" : "Personal details"}
        </span>
      </header>
      <main className="product-content">
        {role === "doctor" && onboarding && <Stepper steps={["Profile & practice", "Document", "Verification", "Complete"]} current={1} />}
        <form
          className="paper product-card"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <h1>{home.profile ? "Your profile" : "Let’s get to know you"}</h1>
          <div className="form-grid">
            {field("Full name", "fullName", "text", true)}
            {role === "patient" ? (
              <>
                {field("Date of birth", "dateOfBirth", "date", true)}
                <label>
                  Sex
                  <select
                    value={form.sex ?? ""}
                    onChange={(e) => update("sex", e.target.value)}
                  >
                    <option value="">Select</option>
                    {["Female", "Male", "Intersex", "Prefer not to say"].map(
                      (v) => (
                        <option key={v}>{v}</option>
                      ),
                    )}
                  </select>
                </label>
                {field("Height (cm)", "heightCm", "number")}
                {field("Weight (kg)", "weightKg", "number")}
                <label>
                  Preferred language
                  <select
                    value={form.preferredLanguage ?? "English"}
                    onChange={(e) =>
                      update("preferredLanguage", e.target.value)
                    }
                  >
                    {[
                      "English",
                      "हिन्दी",
                      "मराठी",
                      "தமிழ்",
                      "తెలుగు",
                      "বাংলা",
                      "ગુજરાતી",
                      "ಕನ್ನಡ",
                      "മലയാളം",
                      "ਪੰਜਾਬੀ",
                    ].map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </select>
                </label>
              </>
            ) : (
              <>
                {field("Qualifications", "qualifications", "text", true)}
                {field("Specialty", "specialty", "text", true)}
                {field("Medical council", "medicalCouncil", "text", true)}
                {field(
                  "Registration number",
                  "registrationNumber",
                  "text",
                  true,
                )}
                {field("Clinic name", "clinicName", "text", true)}
                {field("Clinic address", "clinicAddress", "text", true)}
              </>
            )}
          </div>
          <h2>Choose your avatar</h2>
          <div className="avatar-grid">
            {[
              "01",
              "02",
              "03",
              "04",
              "05",
              "06",
              "07",
              "08",
              "09",
              "10",
              "11",
              "12",
              "mp",
              "leaf",
              "sunrise",
              "orbit",
            ].map((id) => (
              <button
                type="button"
                key={id}
                aria-label={`Avatar ${id}`}
                aria-pressed={form.avatarId === id}
                className={form.avatarId === id ? "chosen-avatar" : ""}
                onClick={() => update("avatarId", id)}
              >
                {/^\d/.test(id) ? (
                  <PortraitAvatar id={id} />
                ) : (
                  <AbstractAvatar
                    type={id as "mp" | "leaf" | "sunrise" | "orbit"}
                  />
                )}
              </button>
            ))}
          </div>
          {error && (
            <p role="alert" className="error-message">
              {error}
            </p>
          )}
          {saved && <p role="status">Your profile is saved.</p>}
          <div className="action-row">
            <button className="button dark" disabled={busy}>
              {busy ? "Saving…" : onboarding ? "Save and continue" : "Save details"}
            </button>
            {home.profile && (
              <button
                type="button"
                className="button secondary"
                onClick={() => navigate(`/${role}/home`)}
              >
                Go to home
              </button>
            )}
          </div>
        </form>
        {role === "doctor" && !onboarding && (
          <button className="button primary" onClick={() => navigate("/doctor/documents")}>Review verification documents →</button>
        )}
      </main>
    </div>
  );
}
