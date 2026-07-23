import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

import ErrorBoundary from './components/ErrorBoundary';
import RegisterSW from './components/RegisterSW.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
      <RegisterSW />
    </ErrorBoundary>
  </React.StrictMode>,
)

requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    if (typeof window.__hideStaticShell === 'function') {
      window.__hideStaticShell()
    }
  })
})

