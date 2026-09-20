import { Check } from "lucide-react";

export function Stepper({
  steps,
  current,
}: {
  steps: string[];
  current: number;
}) {
  return (
    <ol className="stepper">
      {steps.map((step, index) => {
        const position = index + 1;
        return (
          <li
            className={
              position < current ? "done" : position === current ? "active" : ""
            }
            key={step}
          >
            <span>{position < current ? <Check size={15} /> : position}</span>
            <small>{step}</small>
          </li>
        );
      })}
    </ol>
  );
}
