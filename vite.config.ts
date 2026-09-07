import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

 
export default defineConfig({
  plugins: [react()],
  base: './', 
  resolve: {
    alias: {
      '@': __dirname,  
    },
  },
  server: {
    port: 3000,
    host: '127.0.0.1',
  },
});