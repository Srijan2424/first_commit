import { FileText, Home, LogOut, Pill, Stethoscope, UserRound, UsersRound } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { Brand } from './Brand'

const doctorLinks = [
  ['/doctor/home', 'Home', Home], ['/doctor/patients', 'Patients', UsersRound], ['/doctor/consultations/priya', 'Consultations', Stethoscope], ['/doctor/prescriptions', 'Prescriptions', FileText], ['/doctor/profile', 'Profile', UserRound],
] as const
const patientLinks = [['/patient/home','Home',Home],['/patient/medicines','My medicines',Pill],['/patient/prescriptions','Prescriptions',FileText],['/patient/details','Personal details',UserRound]] as const

export function AppShell({ role, children }: { role: 'doctor' | 'patient'; children: React.ReactNode }) {
  const links = role === 'doctor' ? doctorLinks : patientLinks
  return <div className="portal"><aside className="sidebar"><Brand compact /><div className="sidebar-profile"><div className="initial-badge">{role === 'doctor' ? 'AM' : 'PD'}</div><span><strong>{role === 'doctor' ? 'Dr. Arjun Mehta' : 'Priya Desai'}</strong><small>{role === 'doctor' ? 'Mehta Family Clinic' : 'MP-240918-1032'}</small></span></div><nav>{links.map(([to,label,Icon]) => <NavLink key={to} to={to} className={({isActive}) => isActive ? 'active' : ''}><Icon />{label}</NavLink>)}</nav><div className="sidebar-foot"><p>Good medicine<br />thrives together.</p><NavLink to="/"><LogOut />Exit demo</NavLink></div></aside><div className="portal-main">{children}</div></div>
}

export function PortalHeader({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: React.ReactNode }) {
  return <header className="portal-header"><div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h1>{title}</h1></div>{children}</header>
}
