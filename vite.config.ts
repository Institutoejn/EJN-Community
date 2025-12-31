
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', '@supabase/supabase-js'],
          icons: ['lucide-react'] // Se estiver usando lucide, separa
        }
      }
    }
  },
});
