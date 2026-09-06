import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  server: {
    port: 3000,
    open: true
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'terser',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        employeeLogin: resolve(__dirname, 'src/pages/employee-login.html'),
        hrLogin: resolve(__dirname, 'src/pages/hr-login.html'),
      },
    },
  },
});