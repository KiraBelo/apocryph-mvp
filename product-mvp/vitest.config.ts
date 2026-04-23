import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'server',
          environment: 'node',
          setupFiles: ['./src/test/setup.ts'],
          include: [
            'src/**/__tests__/**/*.test.ts',
            'src/**/*.server.test.ts',
            '.conventions/**/*.test.ts',
          ],
          exclude: ['node_modules', '.next', 'e2e'],
        },
      },
      {
        extends: true,
        test: {
          name: 'client',
          environment: 'jsdom',
          setupFiles: ['./src/test/setup-client.ts'],
          include: [
            'src/**/*.test.tsx',
            'src/**/__tests_client__/**/*.test.ts',
            '.conventions/**/*.test.tsx',
          ],
          exclude: ['node_modules', '.next', 'e2e'],
        },
      },
    ],
    coverage: {
      provider: 'v8',
      exclude: ['node_modules', '.next', 'e2e', '**/*.config.*', 'src/test/**'],
    },
  },
})
