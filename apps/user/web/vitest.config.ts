/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
  },
  resolve: {
    alias: {
      '@repo/ui': path.resolve(__dirname, '../ui/src'),
      '@repo/api-client': path.resolve(__dirname, '../api-client/src'),
      '@repo/features': path.resolve(__dirname, '../features/src'),
      '@repo/types': path.resolve(__dirname, '../types/src'),
    },
  },
});