import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import ComplexExplorer from '../complex-explorer.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <div style={{ padding: '24px', minHeight: '100vh', background: 'var(--color-background-primary)' }}>
      <ComplexExplorer />
    </div>
  </StrictMode>
)
