import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
// import { ViteImageOptimizer } from 'vite-plugin-image-optimizer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SHARE_IMAGE_DIR = path.resolve(__dirname, 'public/assets/share_linked_image');
const SHARE_IMAGE_MANIFEST = path.resolve(__dirname, 'src/data/shareInviteImages.json');
const SHARE_IMAGE_RE = /\.(webp|jpe?g|png|gif)$/i;

/** Keeps src/data/shareInviteImages.json in sync with public/assets/share_linked_image. */
function shareInviteImagesPlugin() {
  const sync = () => {
    fs.mkdirSync(SHARE_IMAGE_DIR, { recursive: true });
    const files = fs.existsSync(SHARE_IMAGE_DIR)
      ? fs.readdirSync(SHARE_IMAGE_DIR).filter((name) => SHARE_IMAGE_RE.test(name)).sort()
      : [];
    const payload = `${JSON.stringify(
      {
        images: files.map((name) => `/assets/share_linked_image/${name}`),
      },
      null,
      2
    )}\n`;
    fs.mkdirSync(path.dirname(SHARE_IMAGE_MANIFEST), { recursive: true });
    if (!fs.existsSync(SHARE_IMAGE_MANIFEST) || fs.readFileSync(SHARE_IMAGE_MANIFEST, 'utf8') !== payload) {
      fs.writeFileSync(SHARE_IMAGE_MANIFEST, payload);
    }
  };

  return {
    name: 'share-invite-images',
    buildStart() {
      sync();
    },
    configureServer(server) {
      sync();
      server.watcher.add(SHARE_IMAGE_DIR);
      const onChange = (filePath) => {
        if (String(filePath).includes(`${path.sep}share_linked_image${path.sep}`) || String(filePath).endsWith('share_linked_image')) {
          sync();
        }
      };
      server.watcher.on('add', onChange);
      server.watcher.on('unlink', onChange);
      server.watcher.on('change', onChange);
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: '/',
  plugins: [
    react(),
    shareInviteImagesPlugin(),
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
    host: true,
    port: 5173,
    strictPort: true,
  }
}))
