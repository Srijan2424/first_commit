import { ArrowLeft, ArrowRight, Info } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AbstractAvatar, PortraitAvatar } from '../components/Avatar'
import { Brand } from '../components/Brand'
import { Stepper } from '../components/Stepper'
import { patient } from '../data/demo'

export function PatientOnboardingPage() {
  const navigate = useNavigate(); const [selected, setSelected] = useState('01')
  return <div className="app-page"><header className="app-header"><Brand /><span>Patient setup</span><div className="mini-user"><PortraitAvatar id={selected} size="sm" />Hi Priya</div></header>
    <main className="onboarding-wrap"><div className="paper onboarding-card"><div className="onboarding-top"><strong>Patient setup · Step 2 of 3</strong><Stepper steps={['Account', 'Your details', 'Finish']} current={2} /></div>
      <div className="onboarding-grid"><section><p className="eyebrow ink">Personal details</p><h1>Tell us about you</h1><p className="form-intro">A few details help us personalise your experience.</p>
        <div className="form-grid"><label className="span-two">Full name<input defaultValue={patient.name} /></label><label>Date of birth<input type="date" defaultValue={patient.dob} /></label><label>Sex <small>(optional)</small><select defaultValue=""><option value="">Select</option><option>Female</option><option>Male</option><option>Prefer not to say</option></select></label><label className="span-two">Preferred language<select defaultValue="English"><option>English</option><option>हिन्दी</option><option>मराठी</option></select></label><label>Height <small>(optional)</small><div className="unit-input"><input defaultValue="164" /><span>cm</span></div></label><label>Weight <small>(optional)</small><div className="unit-input"><input defaultValue="62" /><span>kg</span></div></label></div>
        <div className="soft-note"><Info /><span>These details personalise your experience.<small>They are not a medical diagnosis.</small></span></div>
      </section><section className="avatar-section"><p className="eyebrow ink">Make it yours</p><h2>Choose your MedPal avatar</h2><p className="form-intro">A visual preference, never proof of identity.</p><div className="avatar-grid">{Array.from({length: 12},(_, index) => String(index + 1).padStart(2,'0')).map((id) => <button onClick={() => setSelected(id)} key={id}><PortraitAvatar id={id} selected={selected === id} /><small>{id}</small></button>)}<button><AbstractAvatar type="mp" /><small>13</small></button><button><AbstractAvatar type="leaf" /><small>14</small></button><button><AbstractAvatar type="sunrise" /><small>15</small></button><button><AbstractAvatar type="orbit" /><small>16</small></button></div></section></div>
      <footer className="form-actions"><button className="button ghost" onClick={() => navigate('/sign-in?role=patient')}><ArrowLeft />Back</button><button className="button dark" onClick={() => navigate('/patient/home')}>Save and continue<ArrowRight /></button></footer>
    </div></main></div>
}
