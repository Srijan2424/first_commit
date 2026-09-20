import {randomUUID} from 'node:crypto';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const base=process.argv[2] || 'http://127.0.0.1:4180/api/demo';
const workspace=randomUUID();
if(base.startsWith('https:')){
 const preflight=await fetch(`${base}/auth/start`,{method:'OPTIONS',headers:{Origin:'https://main.d2qbejd82l2jqx.amplifyapp.com','Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'authorization,content-type'}});
 assert(preflight.ok,`Browser preflight failed: ${preflight.status}`);
 assert(preflight.headers.get('access-control-allow-origin'),'Missing browser CORS permission');
 console.log('PASS: browser login preflight');
}

async function call(op,input={},token='',fail=false){const r=await fetch(`${base}/${op}`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify(input)});const b=await r.json();if(fail){assert(!r.ok||b.error,`${op} should reject`);return;}if(!r.ok||b.error)throw new Error(`${op}: ${JSON.stringify(b)}`);return b;}
async function login(phone){const c=await call('auth/start',{phone,workspace});return (await call('auth/verify',c)).token;}
const n=String(Date.now()).slice(-8),dp=`+9191${n}`,pp=`+9192${n}`;
const doctor=await login(dp),patient=await login(pp);
await call('saveProfile',{role:'doctor',fullName:'Demo Doctor',avatarId:'01',qualifications:'Synthetic qualification',medicalCouncil:'Demo council',registrationNumber:'DEMO-ONLY',clinicName:'MedPal Demo Clinic',clinicAddress:'Fictional address'},doctor);
await call('saveProfile',{role:'patient',fullName:'Demo Patient',avatarId:'02',dateOfBirth:'2000-01-01'},patient);
let home=await call('getHome',{},patient);assert.equal(home.medicines.length,0);assert.equal(home.prescriptions.length,0);console.log('PASS: new patient starts empty');
const bytes=readFileSync(new URL('../public/demo-certificate.pdf',import.meta.url));
const up=await call('prepareCertificate',{type:'application/pdf',size:bytes.length},doctor);
const uploaded=await fetch(new URL(up.url,base),{method:'PUT',headers:{'Content-Type':'application/pdf'},body:bytes});assert(uploaded.ok,`upload ${uploaded.status}`);
await call('submitCertificate',{key:up.key},doctor);
assert.equal((await call('getHome',{},doctor)).profile.verificationStatus,'VERIFIED');console.log('PASS: upload and simulated verification');
let found;for(let i=0;i<6;i++){found=await call('findPatient',{phone:pp},doctor);if(found.patient)break;await new Promise(r=>setTimeout(r,1000));}assert(found.patient);
const a=await call('requestConsultation',{patientId:found.patient.id},doctor);
await call('getConsultation',{id:a.id},doctor,true);
const grant=await call('approveConsultation',{id:a.id},patient);
await call('verifyConsultation',{id:a.id,code:grant.code},doctor);
await call('verifyConsultation',{id:a.id,code:grant.code},doctor,true);console.log('PASS: authorization required, code single use');
const c=await call('getConsultation',{id:a.id},doctor);
const med={id:randomUUID(),name:'Synthetic demo medicine',strength:'1 mg',formulation:'Tablet',dose:'One tablet',route:'Oral',frequency:'Once daily',timing:'Morning',duration:'7 days',instructions:'Synthetic test only',reason:'',decision:'ADD'};
const saved=await call('saveDraft',{id:a.id,revision:c.access.revision,draft:{...c.access.draft,items:[med]}},doctor);
assert.equal((await call('getConsultation',{id:a.id},doctor)).access.draft.items[0].name,med.name);
await call('issuePrescription',{id:a.id,revision:saved.revision},doctor);
await call('saveDraft',{id:a.id,revision:saved.revision,draft:saved.draft},doctor,true);
for(let i=0;i<6;i++){home=await call('getHome',{},patient);if(home.prescriptions.length)break;await new Promise(r=>setTimeout(r,1000));}assert.equal(home.prescriptions.length,1);assert.equal(home.medicines.length,1);console.log('PASS: draft persists, issued prescription immutable, patient updated');
const doc=await call('getPrescription',{id:home.prescriptions[0].id},patient);assert(doc.url,doc.documentError);
const pdf=await fetch(new URL(doc.url,base),{headers:doc.url.startsWith('/')?{Authorization:`Bearer ${patient}`}:{}});assert(pdf.ok);assert((await pdf.text()).startsWith('%PDF'));console.log('PASS: private PDF download');
await call('closeConsultation',{id:a.id},doctor);await call('getConsultation',{id:a.id},doctor,true);console.log('PASS: closing revokes access');
console.log('Demo journey passed:',base);
