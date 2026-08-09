import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

import ErrorBoundary from './components/ErrorBoundary';
import RegisterSW from './components/RegisterSW.jsx';
import { installNativeRemoteAssets, prefetchNativeEssentials } from './utils/nativeRemoteAssets';
import { initNativeAndroidUx } from './utils/nativeAndroidUx';
import { Capacitor } from '@capacitor/core';

// Capacitor APK: rewrite heavy media to the live site before any UI mounts.
installNativeRemoteAssets();
prefetchNativeEssentials();

// Keep system status bar from covering app chrome (all screens, not only landing).
if (typeof window !== 'undefined' && Capacitor?.isNativePlatform?.()) {
  initNativeAndroidUx();
  import('@capacitor/status-bar')
    .then(({ StatusBar, Style }) =>
      StatusBar.setOverlaysWebView({ overlay: false })
        .then(() => StatusBar.setStyle({ style: Style.Light }))
        .catch(() => {})
    )
    .catch(() => {});
}

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
    // Native: keep the cream static hold until AppBootSplash takes over.
    if (Capacitor?.isNativePlatform?.()) return
    if (typeof window.__hideStaticShell === 'function') {
      window.__hideStaticShell()
    }
  })
})

