import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    // 'dist' is both the Vite default and what the stack 'webapp' wrapper
    // looks for when it packages the built app.
    outDir: 'dist',
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
  },
});
