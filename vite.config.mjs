import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    headers: {
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data:; connect-src 'self' ws://localhost:5173 ws://localhost:8000 ws://127.0.0.1:8000 http://localhost:8000; frame-ancestors 'none'; object-src 'none'; base-uri 'self';",
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin'
    },
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      },
      '/ws': {
        target: 'ws://localhost:8000',
        ws: true
      }
    }
  },
  build: {
    sourcemap: false, // Desativa sourcemaps para dificultar engenharia reversa no cliente
    minify: 'terser', // Utiliza Terser para otimização e ofuscação de nível de produção
    terserOptions: {
      compress: {
        drop_console: true, // Remove chamadas console.log em produção
        drop_debugger: true, // Remove debuggers do fluxo
      },
      format: {
        comments: false, // Remove comentários do código minificado
      }
    }
  }
});
