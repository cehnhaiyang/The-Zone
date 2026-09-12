
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  root: 'src', // 入口目录
  resolve: {
    alias: [
      { find: '@', replacement: path.resolve(__dirname) }
    ]
  },
  base: './', // 确保在 Electron 环境下资源路径正确
  server: {
    port: 3000,
    strictPort: true, // electron/main.js 固定加载 http://localhost:3000，禁止端口漂移
  },
  build: {
    outDir: '../dist', // 输出到项目根目录下的 dist
    target: 'esnext',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'vendor';
          }
        }
      }
    }
  }
});
