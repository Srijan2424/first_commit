import { DoctorDocumentPage, DoctorVerificationPage } from "./pages/product/DoctorVerificationPage";
import { lazy, Suspense, useEffect } from "react";
import { Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { WelcomePage } from "./pages/WelcomePage";
const AuthPage = lazy(() =>
  import("./pages/AuthPage").then((m) => ({ default: m.AuthPage })),
);
const PatientOnboardingPage = lazy(() =>
  import("./pages/PatientOnboardingPage").then((m) => ({
    default: m.PatientOnboardingPage,
  })),
);
const DoctorCredentialPage = lazy(() =>
  import("./pages/DoctorCredentialPage").then((m) => ({
    default: m.DoctorCredentialPage,
  })),
);
const HomePage = lazy(() =>
  import("./pages/product/HomePage").then((m) => ({ default: m.HomePage })),
);
const AuthorizationPage = lazy(() =>
  import("./pages/product/AuthorizationPage").then((m) => ({
    default: m.AuthorizationPage,
  })),
);
const ConsultationPage = lazy(() =>
  import("./pages/product/ConsultationPage").then((m) => ({
    default: m.ConsultationPage,
  })),
);
const PrescriptionPage = lazy(() =>
  import("./pages/product/PrescriptionPage").then((m) => ({
    default: m.PrescriptionPage,
  })),
);
import { useAppState } from "./state/useAppState";
import { scrollToTop } from "./lib/scrollToTop";
function AccountGuard({
  role,
  profileRequired = false,
}: {
  role: "doctor" | "patient";
  profileRequired?: boolean;
}) {
  const { loading, signedIn, home, error, refresh } = useAppState();
  if (loading)
    return <main className="product-content">Loading your account…</main>;
  if (!signedIn) return <Navigate to={`/sign-in?role=${role}`} replace />;
  if (error)
    return (
      <main className="product-content">
        <p role="alert" className="error-message">
          {error}
        </p>
        <button
          className="button primary"
          onClick={() => void refresh().catch(() => {})}
        >
          Retry
        </button>
      </main>
    );
  if (home.profile && home.profile.role !== role)
    return <Navigate to={`/${home.profile.role}/home`} replace />;
  if (profileRequired && !home.profile)
    return (
      <Navigate
        to={`/${role}/${role === "doctor" ? "credentials" : "onboarding"}`}
        replace
      />
    );
  return <Outlet />;
}
export default function App() {
  const { pathname } = useLocation();
  useEffect(() => {
    scrollToTop();
  }, [pathname]);
  return (
    <Suspense fallback={<main className="product-content">Loading…</main>}>
      <Routes>
        <Route path="/" element={<WelcomePage />} />
        <Route path="/sign-in" element={<AuthPage />} />
        <Route element={<AccountGuard role="patient" />}>
          <Route
            path="/patient/onboarding"
            element={<PatientOnboardingPage />}
          />
          <Route path="/patient/details" element={<PatientOnboardingPage />} />
        </Route>
        <Route element={<AccountGuard role="doctor" />}>
          <Route
            path="/doctor/credentials"
            element={<DoctorCredentialPage />}
          />
          <Route path="/doctor/profile" element={<DoctorCredentialPage />} />
          <Route path="/doctor/documents" element={<DoctorDocumentPage />} />
          <Route
            path="/doctor/verify"
            element={<DoctorVerificationPage />}
          />
        </Route>
        <Route element={<AccountGuard role="doctor" profileRequired />}>
          <Route path="/doctor/home" element={<HomePage />} />
          <Route path="/doctor/patients" element={<HomePage />} />
          <Route path="/doctor/prescriptions" element={<HomePage />} />
          <Route
            path="/doctor/consultations/:id/authorize"
            element={<AuthorizationPage />}
          />
          <Route
            path="/doctor/consultations/:id"
            element={<ConsultationPage />}
          />
          <Route
            path="/doctor/prescriptions/:id"
            element={<PrescriptionPage />}
          />
        </Route>
        <Route element={<AccountGuard role="patient" profileRequired />}>
          <Route path="/patient/home" element={<HomePage />} />
          <Route path="/patient/medicines" element={<HomePage />} />
          <Route path="/patient/prescriptions" element={<HomePage />} />
          <Route
            path="/patient/prescriptions/:id"
            element={<PrescriptionPage />}
          />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
