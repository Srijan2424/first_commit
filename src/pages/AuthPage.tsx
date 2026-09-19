import { ArrowLeft, ArrowRight, Check, LockKeyhole, ShieldCheck } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Topline } from '../components/Brand'

export function AuthPage() {
  const [params] = useSearchParams(); const navigate = useNavigate()
  const initialRole = params.get('role') === 'patient' ? 'patient' : 'doctor'
  const [role, setRole] = useState<'doctor' | 'patient'>(initialRole)
  const [stage, setStage] = useState<'phone' | 'otp'>('phone')
  const [phone, setPhone] = useState('98765 43210')
  const [code, setCode] = useState(['4', '8', '2', '1', '6', '9'])
  const masked = useMemo(() => `+91 ••••• ${phone.slice(-5)}`, [phone])
  function submit(event: FormEvent) { event.preventDefault(); if (stage === 'phone') setStage('otp'); else navigate(role === 'patient' ? '/patient/onboarding' : '/doctor/credentials') }
  return <div className="auth-page"><Topline /><main className="auth-shell">
    <section className="auth-aside"><Link className="back-link" to="/"><ArrowLeft />Back to MedPal</Link><div><p className="eyebrow">Account sign-in</p><h1>Your care starts with a secure hello.</h1><p>One number connects you to the right experience while keeping the clinical record protected.</p></div><div className="trust-row"><ShieldCheck /><span>Private by default<br /><small>Access follows your role.</small></span></div></section>
    <form className="paper auth-form" onSubmit={submit}>
      <div className="stage-label">Account sign-in <span>Step {stage === 'phone' ? '1' : '2'} of 2</span></div>
      {stage === 'phone' ? <>
        <h2>Sign in with your phone</h2><p className="form-intro">Choose your role and enter your mobile number.</p>
        <div className="segmented"><button type="button" className={role === 'patient' ? 'active' : ''} onClick={() => setRole('patient')}>Patient</button><button type="button" className={role === 'doctor' ? 'active' : ''} onClick={() => setRole('doctor')}>Doctor</button></div>
        <label>Mobile number<div className="phone-field"><span>🇮🇳 &nbsp;+91</span><input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" /></div></label>
        <label className="check-row"><input type="checkbox" defaultChecked /><span><Check />I agree to MedPal’s Terms of Use and Privacy Policy.</span></label>
        <button className="button dark wide" type="submit">Send account code<ArrowRight /></button>
      </> : <>
        <h2>Verify your phone</h2><p className="form-intro centered">Account code sent to<br /><strong>{masked}</strong></p>
        <div className="otp-row">{code.map((digit, index) => <input key={index} aria-label={`Digit ${index + 1}`} value={digit} maxLength={1} onChange={(event) => { const next = [...code]; next[index] = event.target.value; setCode(next) }} />)}</div>
        <p className="resend">Didn’t receive the code? <button type="button">Resend in 00:24</button></p>
        <button className="text-button" type="button" onClick={() => setStage('phone')}>Change number</button>
        <button className="button dark wide" type="submit">Verify and continue<ArrowRight /></button>
      </>}
      <div className="privacy-note"><LockKeyhole /><span><strong>Your information is private.</strong><small>We only use your number to create and protect your account.</small></span></div>
    </form>
  </main></div>
}
