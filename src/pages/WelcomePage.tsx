import { ArrowRight, FileText, Stethoscope, UserRound } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Orbit } from '../components/Orbit'
import { Topline } from '../components/Brand'

export function WelcomePage() {
  const navigate = useNavigate()
  const [role, setRole] = useState<'doctor' | 'patient'>('doctor')
  return <div className="public-page">
    <Topline />
    <main className="welcome-grid">
      <section className="welcome-copy">
        <p className="eyebrow">Digital prescribing for independent clinics</p>
        <h1>Care, in context.</h1>
        <p className="display-subtitle">Prescriptions that keep their history.</p>
        <Orbit />
      </section>
      <section className="role-column" aria-label="Choose your role">
        <button className={`role-card ${role === 'doctor' ? 'selected' : ''}`} onClick={() => setRole('doctor')}>
          <span className="role-icon mint"><Stethoscope /></span>
          <span><strong>I’m a doctor</strong><small>Create and issue clear digital prescriptions.</small></span>
          <span className="role-check">{role === 'doctor' ? 'Selected' : 'Choose'}</span>
        </button>
        <button className={`role-card ${role === 'patient' ? 'selected' : ''}`} onClick={() => setRole('patient')}>
          <span className="role-icon bone"><UserRound /></span>
          <span><strong>I’m a patient</strong><small>Understand your medicines and what changed.</small></span>
          <span className="role-check">{role === 'patient' ? 'Selected' : 'Choose'}</span>
        </button>
        <div className="role-benefit"><FileText size={20} /><span><strong>One record, clearer decisions.</strong><small>Your history stays connected across consultations.</small></span></div>
        <button className="button primary wide" onClick={() => navigate(`/sign-in?role=${role}`)}>Continue as {role}<ArrowRight /></button>
        <p className="microcopy">Built for independent clinics in India.</p>
      </section>
    </main>
  </div>
}
