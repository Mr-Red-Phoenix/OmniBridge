import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  
  return {
    plugins: [
      react(),
    ],
    define: {
      global: 'window',
    },
    server: {
      port: 3000,
      strictPort: true,
      proxy: {
        '/api': {
          target: env.VITE_API_BASE_URL || 'http://localhost:8081',
          changeOrigin: true,
          secure: false,
        },
        '/ws': {
          target: env.VITE_API_BASE_URL || 'http://localhost:8081',
          ws: true,
          changeOrigin: true,
        }
      }
    },
    build: {
      outDir: 'dist',
      sourcemap: mode !== 'production',
      minify: true,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              return 'vendor';
            }
          }
        }
      }
    }
  }
})
