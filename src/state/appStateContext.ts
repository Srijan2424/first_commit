import { createContext } from 'react'

export type DecisionState = { amlodipine: 'change'; metformin: 'continue'; vitaminD: 'add'; atorvastatin: 'not-reviewed' }
export type AppStateValue = {
  verified: boolean; setVerified: (value: boolean) => void
  authorized: boolean; setAuthorized: (value: boolean) => void
  issued: boolean; setIssued: (value: boolean) => void
  decisions: DecisionState
}
export const decisions: DecisionState = { amlodipine: 'change', metformin: 'continue', vitaminD: 'add', atorvastatin: 'not-reviewed' }
export const AppStateContext = createContext<AppStateValue | null>(null)
