import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    // Pas de globals: true — les imports explicites sont préférés pour la clarté
  },
})
