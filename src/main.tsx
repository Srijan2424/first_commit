import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App'
import { AppStateProvider } from './state/AppState'
import { Amplify } from 'aws-amplify'
import outputs from '../amplify_outputs.json'

Amplify.configure(outputs)

createRoot(document.getElementById('root')!).render(<StrictMode><BrowserRouter><AppStateProvider><App /></AppStateProvider></BrowserRouter></StrictMode>)
