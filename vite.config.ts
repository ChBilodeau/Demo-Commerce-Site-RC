import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { setupBridge } from './vite-setup-bridge';

// https://vite.dev/config/
export default defineConfig({
  // setupBridge adds dev-only /__setup/* endpoints so the browser setup wizard
  // can read/write demo.config.json and exchange messages with the Kiro skill.
  plugins: [react(), setupBridge()],
  server: {
    port: 5174,
  },
});
