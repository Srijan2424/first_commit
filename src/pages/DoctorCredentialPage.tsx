import { ArrowRight, Camera, FileUp, Info, LockKeyhole } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Brand } from '../components/Brand'
import { Stepper } from '../components/Stepper'
import { doctor } from '../data/demo'

export function DoctorCredentialPage() {
  const navigate = useNavigate()
  return <div className="app-page"><header className="app-header"><Brand /><span>Doctor onboarding</span><div className="initial-badge">AM</div></header>
    <main className="credential-wrap"><div className="credential-heading"><div><p className="eyebrow">Doctor onboarding</p><h1>Verify your professional details</h1><p>Help us confirm your credentials before you begin prescribing.</p></div><Stepper steps={['Profile', 'Practice', 'Verify credentials', 'Complete']} current={3} /></div>
      <div className="credential-grid"><section className="paper details-card"><p className="eyebrow ink">Your professional details</p><h2>Check your information</h2><div className="form-grid single"><label>Full name<input defaultValue={doctor.name} /></label><label>Qualifications<input defaultValue={doctor.qualification} /></label><label>Medical council<select defaultValue={doctor.council}><option>{doctor.council}</option></select></label><label>Registration number<input className="mono" defaultValue={doctor.registration} /></label><label>Practice name<input defaultValue={doctor.clinic} /></label><label>Practice address<textarea defaultValue={doctor.address} /></label></div><div className="soft-note"><Info /><span>Keep these details accurate.<small>They appear on every issued prescription.</small></span></div></section>
        <section className="upload-panel"><p className="eyebrow">Credential document</p><h2>Upload your medical registration certificate</h2><p>Upload a clear image or PDF for this demonstration.</p><label className="drop-zone"><FileUp size={38} /><strong>Drag and drop your file here</strong><span>or choose an option below</span><div><button type="button"><Camera />Take a photo</button><button type="button" className="paper-button"><FileUp />Choose file</button></div><small>JPG, PNG or PDF · Maximum 10 MB</small><em><LockKeyhole />Private and secure</em><input type="file" accept="image/png,image/jpeg,application/pdf" /></label>
        <div className="extract-preview"><strong>Extracted details</strong><span>Ready after upload</span><dl><div><dt>Name</dt><dd>—</dd></div><div><dt>Medical council</dt><dd>—</dd></div><div><dt>Registration number</dt><dd>—</dd></div></dl></div>
        <div className="demo-disclosure"><Info /><span><strong>Hackathon demonstration using synthetic registry data.</strong><small>No government registry will be contacted.</small></span></div>
        <button className="button primary wide" onClick={() => navigate('/doctor/verify')}>Start demo verification<ArrowRight /></button></section>
      </div>
    </main></div>
}
