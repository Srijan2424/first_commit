import { demoMode, demoWorkspace } from "../services/demo";
import {
  FileText,
  Home,
  LogOut,
  Pill,
  UserRound,
  UsersRound,
} from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { Brand } from "./Brand";
import { PortraitAvatar, AbstractAvatar } from "./Avatar";
import { useAppState } from "../state/useAppState";
import { useState } from "react";
import { errorMessage } from "../services/api";
const doctorLinks = [
  ["/doctor/home", "Home", Home],
  ["/doctor/patients", "Patients", UsersRound],
  ["/doctor/prescriptions", "Prescriptions", FileText],
  ["/doctor/profile", "Profile", UserRound],
] as const;
const patientLinks = [
  ["/patient/home", "Home", Home],
  ["/patient/medicines", "My medicines", Pill],
  ["/patient/prescriptions", "Prescriptions", FileText],
  ["/patient/details", "Personal details", UserRound],
] as const;
export function AppShell({
  role,
  children,
}: {
  role: "doctor" | "patient";
  children: React.ReactNode;
}) {
  const { home, logout } = useAppState();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const profile = home.profile;
  const avatar = profile?.avatarId ?? "01";
  return (
    <div className="portal">
      <aside className="sidebar">
        <Brand compact />
        <div className="sidebar-profile">
          {/^\d/.test(avatar) ? (
            <PortraitAvatar id={avatar} size="sm" />
          ) : (
            <AbstractAvatar
              type={avatar as "mp" | "leaf" | "sunrise" | "orbit"}
            />
          )}
          <span>
            <strong>{profile?.fullName}</strong>
            <small>
              {role === "doctor" ? profile?.clinicName : "Your MedPal account"}
            </small>
          </span>
        </div>
        <nav>
          {(role === "doctor" ? doctorLinks : patientLinks).map(
            ([to, label, Icon]) => (
              <NavLink key={to} to={to}>
                <Icon />
                {label}
              </NavLink>
            ),
          )}
        </nav>
        <div className="sidebar-foot">
          <p>
            Good medicine
            <br />
            thrives together.
          </p>
          <button
            className="button ghost"
            onClick={() =>
              void logout()
                .then(() => navigate("/"))
                .catch((e) => setError(errorMessage(e)))
            }
          >
            <LogOut />
            Sign out
          </button>
          {error && <p role="alert">{error}</p>}
        </div>
      </aside>
      <div className="portal-main">
        {demoMode && (
          <div className="demo-banner">
            Demo workspace · login and credential verification are simulated ·
            use fictional details · {" "}
            <a href={`/sign-in?role=${role === "doctor" ? "patient" : "doctor"}&workspace=${demoWorkspace()}`} target="_blank" rel="noopener noreferrer">Open {role === "doctor" ? "patient" : "doctor"} window</a>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
export function PortalHeader({
  eyebrow,
  title,
  children,
}: {
  eyebrow?: string;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="portal-header">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
      </div>
      {children}
    </header>
  );
}
