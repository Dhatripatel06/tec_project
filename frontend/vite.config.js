import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  // The Next.js API lives in ../backend and runs on its own port. Proxying it
  // under /api makes it same-origin for the browser, which keeps the app free
  // of CORS configuration and lets a deployment put both behind one domain.
  const apiTarget = env.VITE_API_PROXY_TARGET || 'http://localhost:3001';

  return {
    server: {
      port: 3000,
      open: true,
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
        },
      },
    },
    preview: {
      port: 3000,
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
        },
      },
    },
  };
});
