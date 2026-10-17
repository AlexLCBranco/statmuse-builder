import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// One config for both Vite (dev/build) and Vitest (unit tests).
export default defineConfig({
  plugins: [react()],
  server: { port: 5190, strictPort: true },
  preview: { port: 5191, strictPort: true },
  test: {
    // Unit tests cover only pure logic, so no browser environment is needed.
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
})
