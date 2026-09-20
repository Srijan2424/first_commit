import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
export default defineConfig(async({mode})=>({plugins:[react(),tailwindcss(),...(mode==='demo'?[(await import('./demo/server')).demoServer()]:[])]}))
