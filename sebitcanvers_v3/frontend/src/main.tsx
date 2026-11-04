import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { Entry } from './Entry'
import { startStorageSession } from './create/storageSession'

void startStorageSession(() => createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Entry />
  </StrictMode>,
))
