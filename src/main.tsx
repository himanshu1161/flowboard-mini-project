import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { makeStore } from './store'
import { loadPersistedState } from './store/persistence'

const store = makeStore({ preloadedState: loadPersistedState(), persist: true })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App store={store} />
  </StrictMode>,
)
