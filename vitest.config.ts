import { existsSync } from 'node:fs'
import { defineVitestConfig } from '@nuxt/test-utils/config'

// Vitest loads nuxt.config.ts without going through the Nuxt CLI, which is the one that reads
// the .env: without this the guard of the config trips on a perfectly configured repo. When
// there is no .env the guard fires as it should, naming what is missing.
if (existsSync('.env')) {
  process.loadEnvFile()
}

export default defineVitestConfig({
  test: {
    environment: 'nuxt',
    setupFiles: ['test/setup.ts']
  }
})
