import { useEffect, useState } from "react";
import { medicationInput, type Medication } from "../../shared/domain";
import {
  searchMedicines,
  type MedicineSuggestion,
} from "../services/medicines";
import { errorMessage } from "../services/api";
export function MedicationEditor({
  item,
  onSave,
  onCancel,
}: {
  item?: Medication;
  onSave: (item: Medication) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<Medication>(
    () =>
      item ?? {
        id: crypto.randomUUID(),
        name: "",
        strength: "",
        formulation: "Tablet",
        dose: "",
        route: "Oral",
        frequency: "",
        timing: "",
        duration: "",
        instructions: "",
        reason: "",
        decision: "ADD",
      },
  );
  const [matches, setMatches] = useState<MedicineSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  useEffect(() => {
    if (query.trim().length < 3) {
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setSearching(true);
      void searchMedicines(query, controller.signal)
        .then((result) => {
          if (!controller.signal.aborted) setMatches(result);
        })
        .catch((e) => {
          if (!controller.signal.aborted) setError(errorMessage(e));
        })
        .finally(() => {
          if (!controller.signal.aborted) setSearching(false);
        });
    }, 350);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);
  const locked = !!form.sourceId && form.decision !== "CHANGE";
  function field(label: string, key: keyof Medication, options?: string[]) {
    return (
      <label>
        {label}
        <input
          disabled={locked}
          list={options ? `options-${key}` : undefined}
          value={String(form[key] ?? "")}
          onChange={(e) =>
            setForm((f) => ({
              ...f,
              [key]:
                key === "quantity"
                  ? e.target.value
                    ? Number(e.target.value)
                    : undefined
                  : e.target.value,
            }))
          }
        />
        {options && (
          <datalist id={`options-${key}`}>
            {options.map((o) => (
              <option key={o} value={o} />
            ))}
          </datalist>
        )}
      </label>
    );
  }
  function submit() {
    try {
      const value = medicationInput.parse(form);
      if (["CHANGE", "STOP"].includes(value.decision) && !value.reason.trim())
        throw new Error("Add a reason for this decision");
      onSave(value);
    } catch (e) {
      setError(errorMessage(e));
    }
  }
  return (
    <section className="paper product-card medication-editor">
      <h2>{item ? "Review medicine" : "Add medicine"}</h2>
      <p>
        Choose a catalogue result or enter the name and instructions yourself.
      </p>
      <div className="form-grid">
        <label>
          Medicine name
          <input
            disabled={locked}
            value={form.name}
            onChange={(e) => {
              setForm((f) => ({
                ...f,
                name: e.target.value,
                catalogueId: undefined,
              }));
              setMatches([]);
              setSearching(false);
              setQuery(e.target.value);
              setError("");
            }}
          />
        </label>
        {searching && <p role="status">Searching medicine names…</p>}
        {matches.length > 0 && (
          <ul className="medicine-results">
            {matches.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => {
                    setForm((f) => ({ ...f, name: m.name, catalogueId: m.id }));
                    setMatches([]);
                    setQuery("");
                  }}
                >
                  {m.name}
                </button>
              </li>
            ))}
          </ul>
        )}
        {field("Strength", "strength")}
        {field("Formulation", "formulation", [
          "Tablet",
          "Capsule",
          "Liquid",
          "Injection",
          "Cream",
          "Drops",
          "Inhaler",
        ])}
        {field("Dose per administration", "dose")}
        {field("Route", "route", [
          "Oral",
          "Topical",
          "Inhalation",
          "Subcutaneous",
          "Intramuscular",
          "Intravenous",
        ])}
        {field("Frequency", "frequency", [
          "Once daily",
          "Twice daily",
          "Three times daily",
          "Once weekly",
          "As needed",
        ])}
        {field("Timing / meals", "timing", [
          "Morning",
          "Evening",
          "Before meals",
          "With meals",
          "After meals",
          "At bedtime",
        ])}
        {field("Duration", "duration")}
        {field("Quantity (optional)", "quantity")}
        <label>
          Instructions
          <textarea
            disabled={locked}
            value={form.instructions}
            onChange={(e) =>
              setForm((f) => ({ ...f, instructions: e.target.value }))
            }
          />
        </label>
      </div>
      {form.sourceId && (
        <fieldset className="decision-options">
          <legend>Decision</legend>
          {(["CONTINUE", "CHANGE", "STOP", "NOT_REVIEWED"] as const).map(
            (decision) => (
              <label key={decision}>
                <input
                  type="radio"
                  name="decision"
                  checked={form.decision === decision}
                  onChange={() =>
                    setForm((f) => ({ ...item!, decision, reason: f.reason }))
                  }
                />
                {decision.replace("_", " ").toLowerCase()}
              </label>
            ),
          )}
        </fieldset>
      )}
      <label className="block-label">
        Reason / clinical note
        <textarea
          value={form.reason}
          onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
        />
      </label>
      <p className="microcopy">
        {form.catalogueId ? "Catalogue name selected" : "Manual medicine entry"}
        . RxNorm is US-focused and is not a complete Indian brand catalogue.
        Confirm the exact medicine, strength and instructions.
      </p>
      <p className="microcopy">
        Medicine names use public RxNorm data from the US National Library of
        Medicine (NIH/HHS). NLM does not endorse MedPal.{" "}
        <a
          href="https://www.nlm.nih.gov/research/umls/rxnorm/"
          target="_blank"
          rel="noreferrer"
        >
          About the source
        </a>
      </p>
      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}
      <div className="action-row">
        <button className="button dark" type="button" onClick={submit}>
          Save to draft
        </button>
        <button className="button secondary" type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </section>
  );
}
