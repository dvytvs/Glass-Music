import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', 
  resolve: {
    alias: {
      '@': __dirname, // Point @ to the project root since there is no src folder
    },
  },
  server: {
    port: 3000,
  },
});