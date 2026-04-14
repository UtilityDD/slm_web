import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// import { ViteImageOptimizer } from 'vite-plugin-image-optimizer';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: mode === 'production' ? './' : '/',
  plugins: [
    react(),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom'],
          'supabase': ['@supabase/supabase-js'],
          'lottie': ['@dotlottie/react-player', 'lottie-react'],
          'pdf-utils': ['jspdf', 'html2canvas', 'html2pdf.js'],
          'crypto': ['crypto-js']
        }
      }
    },
    chunkSizeWarningLimit: 1000 // Increasing limit as we have heavy assets
  },
  assetsInclude: ['**/*.lottie'],
  esbuild: {
    drop: ['console', 'debugger'],
  },
  server: {
    port: 5173,
    host: true
  }
}))
