import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  base: '/Zerox-Esports/',
  plugins: [
    react({
      // Show full TypeScript/JSX errors in browser overlay instead of
      // the misleading "Failed to fetch dynamically imported module" error
      babel: {
        parserOpts: {
          strictMode: false,
        },
      },
    }),
  ],
  server: {
    // Ensure HMR errors show exact file location in the browser
    hmr: {
      overlay: true,
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage'],
          'vendor-ui': ['lucide-react', 'framer-motion', 'recharts'],
          'vendor-utils': ['date-fns', 'uuid'],
        },
      },
    },
    chunkSizeWarningLimit: 1600,
  },
});

// triggered restart

// triggered restart 2

// triggered restart 3

// triggered restart 4

// triggered restart 5

// triggered restart 6

// triggered restart 7

// triggered restart 8

// triggered restart 9

// triggered restart 10

// triggered restart 11

// triggered restart 02/22/2026 16:14:04

// triggered restart 02/22/2026 17:03:28

// triggered restart 02/22/2026 17:05:23

// triggered restart 02/22/2026 17:28:09

// triggered restart 02/22/2026 17:44:49
