import { useEffect, useState } from 'react'
import { AppStateContext, decisions } from './appStateContext'

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [verified, setVerified] = useState(() => localStorage.getItem('medpal.verified') === 'true')
  const [authorized, setAuthorized] = useState(() => localStorage.getItem('medpal.authorized') === 'true')
  const [issued, setIssued] = useState(() => localStorage.getItem('medpal.issued') === 'true')
  useEffect(() => localStorage.setItem('medpal.verified', String(verified)), [verified])
  useEffect(() => localStorage.setItem('medpal.authorized', String(authorized)), [authorized])
  useEffect(() => localStorage.setItem('medpal.issued', String(issued)), [issued])
  const value = { verified, setVerified, authorized, setAuthorized, issued, setIssued, decisions }
  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>
}
