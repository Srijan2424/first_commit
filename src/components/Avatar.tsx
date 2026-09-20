import { Check, Leaf, Orbit as OrbitIcon, Sunrise } from "lucide-react";
import { avatarOptions } from "../data/demo";

export function PortraitAvatar({
  id,
  selected = false,
  size = "md",
}: {
  id: string;
  selected?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const option =
    avatarOptions.find((item) => item.id === id) ?? avatarOptions[0];
  return (
    <div
      className={`portrait-avatar ${size} ${selected ? "selected" : ""}`}
      style={
        {
          "--skin": option.skin,
          "--hair": option.hair,
          "--shirt": option.shirt,
        } as React.CSSProperties
      }
    >
      <span className="avatar-hair" />
      <span className="avatar-face" />
      <span className="avatar-neck" />
      <span className="avatar-shirt" />
      {selected && (
        <span className="avatar-check">
          <Check size={12} strokeWidth={3} />
        </span>
      )}
    </div>
  );
}

export function AbstractAvatar({
  type,
}: {
  type: "mp" | "leaf" | "sunrise" | "orbit";
}) {
  return (
    <div className="portrait-avatar md abstract">
      {type === "mp" ? (
        <strong>MP</strong>
      ) : type === "leaf" ? (
        <Leaf />
      ) : type === "sunrise" ? (
        <Sunrise />
      ) : (
        <OrbitIcon />
      )}
    </div>
  );
}
