// playwright.config.ts
import { defineConfig } from '@playwright/test'
import dotenv from 'dotenv'
import { existsSync } from 'fs'

const ENV_PATH = 'e2e/.env.e2e'
if (existsSync(ENV_PATH)) {
  dotenv.config({ path: ENV_PATH })
} else {
  dotenv.config() // fallback para .env na raiz, se existir
}

export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  reporter: [['list'], ['html', { open: 'never' }]],
  workers: 1,
})
