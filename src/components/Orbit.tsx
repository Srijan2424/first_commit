import { Pill, Plus, Sparkles } from "lucide-react";

const medicines = [
  { label: "Metformin", detail: "500 mg", className: "blue", pos: "one" },
  { label: "Amlodipine", detail: "5 mg", className: "coral", pos: "two" },
  { label: "Vitamin D3", detail: "1000 IU", className: "mint", pos: "three" },
];

export function Orbit({ small = false }: { small?: boolean }) {
  return (
    <div
      className={small ? "orbit orbit-small" : "orbit"}
      aria-label="Treatment constellation illustration"
    >
      <div className="orbit-ring ring-one" />
      <div className="orbit-ring ring-two" />
      <div className="orbit-ring ring-three" />
      <div className="orbit-core">
        <Sparkles size={22} />
        <span>
          Care in
          <br />
          context
        </span>
      </div>
      {medicines.map((medicine) => (
        <div
          className={`medicine-orb ${medicine.className} ${medicine.pos}`}
          key={medicine.label}
        >
          <Pill size={16} />
          <strong>{medicine.label}</strong>
          <small>{medicine.detail}</small>
        </div>
      ))}
      <div className="orbit-dot dot-a" />
      <div className="orbit-dot dot-b" />
      <div className="orbit-dot dot-c">
        <Plus size={12} />
      </div>
    </div>
  );
}
