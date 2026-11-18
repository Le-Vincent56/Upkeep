import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 5173,
    // Tauri's devUrl points at this exact port, so never fall back to another one.
    strictPort: true,
    watch: { ignored: ['**/src-tauri/**'] },
  },
});
