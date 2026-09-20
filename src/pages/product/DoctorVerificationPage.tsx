import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Check, FileCheck2, LoaderCircle, ShieldCheck } from "lucide-react";
import { AppShell, PortalHeader } from "../../components/AppShell";
import { Stepper } from "../../components/Stepper";
import { CameraUpload } from "../../components/CameraUpload";
import { useAppState } from "../../state/useAppState";
import { demoMode } from "../../services/demo";
const steps = ["Profile & practice", "Document", "Verification", "Complete"];
function Details() {
  const { home } = useAppState();
  const p = home.profile!;
  return <section className="paper verification-details"><FileCheck2 size={36}/><h2>Your professional details</h2><p>Details supplied in your profile</p><dl>{[["Name",p.fullName],["Qualifications",p.qualifications],["Medical council",p.medicalCouncil],["Registration number",p.registrationNumber],["Practice",p.clinicName],["Address",p.clinicAddress]].map(([k,v])=><div key={k}><dt>{k}</dt><dd>{v || "—"}</dd></div>)}</dl></section>;
}
export function DoctorDocumentPage() {
  const { home, refresh } = useAppState();
  const navigate = useNavigate();
  if (!home.profile) return <Navigate to="/doctor/credentials" replace/>;
  return <AppShell role="doctor"><main className="product-content"><Stepper steps={steps} current={2}/><PortalHeader eyebrow="Doctor onboarding" title="Verify your professional details"/><p>Upload your registration document, then follow the verification journey.</p><div className="verification-grid"><Details/><div><CameraUpload onSaved={async()=>{await refresh();navigate("/doctor/verify");}}/><p className="verification-disclosure">{demoMode ? "Demo simulation. No government registry is contacted and no qualification is authenticated. Use the sample document." : "Your document will be reviewed before prescribing is enabled."}</p></div></div><Link to="/doctor/credentials">← Edit profile & practice</Link></main></AppShell>;
}
const checks = [
  ["Document received", "Your upload was saved privately and its file format checked."],
  ["Demo registry matching", "Simulating a registration lookup. No government registry is contacted."],
  ["Profile comparison", "Showing your supplied profile details in the simulated review; no OCR or authenticity check is performed."],
  ["Demo access approved", "Your account is enabled for fictional demo consultations only."],
];
export function DoctorVerificationPage() {
  const { home } = useAppState();
  const [stage,setStage] = useState(0);
  useEffect(()=>{if(!demoMode)return;const timer=setInterval(()=>setStage(s=>Math.min(s+1,4)),2000);return()=>clearInterval(timer)},[]);
  const p = home.profile;
  if (!p) return <Navigate to="/doctor/credentials" replace/>;
  if (!p.certificateKey) return <Navigate to="/doctor/documents" replace/>;
  const complete = demoMode && stage===4 && p.verificationStatus==="VERIFIED";
  return <AppShell role="doctor"><main className="product-content"><Stepper steps={steps} current={complete?4:3}/><PortalHeader eyebrow="Profile / Verification" title={complete?"You’re ready to begin.":demoMode?"Checking your credentials":"Document submitted for review"}/><p>{demoMode?"Follow the simulated document and registration checks below.":"Your credentials remain pending until an authorized reviewer approves them."}</p><div className="verification-grid"><Details/><section className="verification-checks" aria-live="polite">{(demoMode?checks:checks.slice(0,1)).map(([title,description],i)=><div className={`verification-check ${stage>i?"complete":stage===i?"current":""}`} key={title}><span className="verification-symbol">{stage>i || !demoMode?<Check/>:stage===i?<LoaderCircle className="verification-spinner"/>:i+1}</span><div><h3>{title}</h3><p>{description}</p><small>{!demoMode || stage>i?"Complete":stage===i?"In progress":"Upcoming"}</small></div></div>)}{complete&&<div className="verification-success"><ShieldCheck/><span><strong>Verification complete · demo mode</strong><br/>Welcome to MedPal, {p.fullName}.</span></div>}</section></div><footer className="verification-footer"><p className="verification-disclosure">{demoMode?"Demonstration only. These animated checks do not validate a medical qualification.":"You can return later to check your review status."}</p>{complete?<Link className="button primary" to="/doctor/home">Go to doctor home →</Link>:demoMode?<span role="status">Checking · {Math.min(stage*2,8)}s</span>:<Link className="button primary" to="/doctor/profile">Back to profile</Link>}</footer></main></AppShell>;
}
