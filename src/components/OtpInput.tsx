import { useRef } from "react";
export function OtpInput({
  value,
  onChange,
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  function enter(index: number, text: string) {
    const digits = text.replace(/\D/g, "").slice(0, 6 - index);
    if (!digits) {
      const next = value.padEnd(6, " ").split("");
      next[index] = " ";
      onChange(next.join("").trimEnd());
      return;
    }
    const next = value.padEnd(6, " ").split("");
    digits.split("").forEach((d, i) => (next[index + i] = d));
    onChange(next.join("").trimEnd());
    refs.current[Math.min(index + digits.length, 5)]?.focus();
  }
  return (
    <div
      className="otp-row"
      role="group"
      aria-label="Six-digit verification code"
    >
      {Array.from({ length: 6 }, (_, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          aria-label={`Digit ${i + 1}`}
          value={value[i]?.trim() ?? ""}
          disabled={disabled}
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          onFocus={(e) => e.currentTarget.select()}
          onChange={(e) => enter(i, e.target.value)}
          onPaste={(e) => {
            e.preventDefault();
            enter(i, e.clipboardData.getData("text"));
          }}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && !value[i]?.trim() && i > 0) {
              e.preventDefault();
              enter(i - 1, "");
              refs.current[i - 1]?.focus();
            }
            if (e.key === "ArrowLeft")
              refs.current[Math.max(0, i - 1)]?.focus();
            if (e.key === "ArrowRight")
              refs.current[Math.min(5, i + 1)]?.focus();
          }}
        />
      ))}
    </div>
  );
}
