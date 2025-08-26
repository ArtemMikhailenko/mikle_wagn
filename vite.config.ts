import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/monday': {
        target: 'https://api.monday.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/monday/, '/v2'),
        timeout: 30000,
        proxyTimeout: 30000,
        secure: true,
        headers: {
          'Origin': 'https://api.monday.com',
          'Referer': 'https://api.monday.com'
        },
        configure: (proxy, options) => {
          proxy.on('error', (err, req, res) => {
            console.error('❌ Proxy Error:', err);
          });
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log('📤 Proxy Request:', req.method, req.url);
            // Add required headers for Monday.com API
            proxyReq.setHeader('User-Agent', 'Neon-Konfigurator/1.0');
            proxyReq.setHeader('Accept', 'application/json');
          });
          proxy.on('proxyRes', (proxyRes, req, res) => {
            console.log('📥 Proxy Response:', proxyRes.statusCode);
            // Add CORS headers
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, API-Version');
          });
        }
      }
    }
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
