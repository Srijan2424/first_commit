import { useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AuthPage } from './pages/AuthPage'
import { AuthorizationPage, ConsultationPage, DoctorHomePage, MedicationDecisionPage, PatientHomePage, PrescriptionPage, ReviewIssuePage, VerificationPage } from './pages/ClinicalPages'
import { DoctorCredentialPage } from './pages/DoctorCredentialPage'
import { PatientOnboardingPage } from './pages/PatientOnboardingPage'
import { WelcomePage } from './pages/WelcomePage'

export default function App() {
  const location = useLocation()
  useEffect(() => window.scrollTo({ top: 0, left: 0 }), [location.pathname])
  return <Routes>
    <Route path="/" element={<WelcomePage />} />
    <Route path="/sign-in" element={<AuthPage />} />
    <Route path="/patient/onboarding" element={<PatientOnboardingPage />} />
    <Route path="/doctor/credentials" element={<DoctorCredentialPage />} />
    <Route path="/doctor/verify" element={<VerificationPage />} />
    <Route path="/doctor/home" element={<DoctorHomePage />} />
    <Route path="/doctor/patients" element={<Navigate to="/doctor/home" replace />} />
    <Route path="/doctor/prescriptions" element={<Navigate to="/doctor/consultations/priya/review" replace />} />
    <Route path="/doctor/profile" element={<Navigate to="/doctor/credentials" replace />} />
    <Route path="/doctor/consultations/authorize" element={<AuthorizationPage />} />
    <Route path="/doctor/consultations/priya" element={<ConsultationPage />} />
    <Route path="/doctor/consultations/priya/medication/amlodipine" element={<MedicationDecisionPage />} />
    <Route path="/doctor/consultations/priya/review" element={<ReviewIssuePage />} />
    <Route path="/patient/home" element={<PatientHomePage />} />
    <Route path="/patient/medicines" element={<Navigate to="/patient/home" replace />} />
    <Route path="/patient/prescriptions" element={<Navigate to="/patient/prescriptions/RX-250428-0187" replace />} />
    <Route path="/patient/details" element={<Navigate to="/patient/onboarding" replace />} />
    <Route path="/patient/prescriptions/RX-250428-0187" element={<PrescriptionPage />} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
}
