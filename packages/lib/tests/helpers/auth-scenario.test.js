import { describe, it, expect, vi, beforeEach } from 'vitest'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const fixturesDir = path.join(__dirname, '../fixtures')

// Mock puppeteer avant d'importer AuthScenario
vi.mock('puppeteer', () => ({
  default: {
    launch: vi.fn().mockResolvedValue({
      newPage: vi.fn().mockResolvedValue({
        on: vi.fn(),
        type: vi.fn().mockResolvedValue(undefined),
        click: vi.fn().mockResolvedValue(undefined),
        waitForSelector: vi.fn().mockResolvedValue({ evaluate: async () => '' }),
        waitForNavigation: vi.fn().mockResolvedValue(undefined),
        $: vi.fn().mockResolvedValue(null),
        evaluate: vi.fn().mockResolvedValue({}),
        cookies: vi.fn().mockResolvedValue([]),
        url: vi.fn().mockReturnValue('https://example.com/dashboard'),
        title: vi.fn().mockResolvedValue('Dashboard'),
        screenshot: vi.fn().mockResolvedValue(Buffer.from('')),
      }),
      close: vi.fn().mockResolvedValue(undefined),
    }),
  },
}))

describe('AuthScenario', () => {
  let AuthScenario

  beforeEach(async () => {
    const mod = await import('../../src/index.js')
    AuthScenario = mod.AuthScenario
  })

  describe('validate()', () => {
    it('returns { valid: true, errors: [] } for a valid config', async () => {
      process.env.LOGIN_VALUE = 'user@example.com'
      const scenario = new AuthScenario(path.join(fixturesDir, 'login-simple.yml'))
      const result = await scenario.validate()
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
      delete process.env.LOGIN_VALUE
    })

    it('returns { valid: false, errors } for an invalid config', async () => {
      const scenario = new AuthScenario(path.join(fixturesDir, 'login-invalid.yml'))
      const result = await scenario.validate()
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('throws when env var is missing', async () => {
      delete process.env.LOGIN_VALUE
      const scenario = new AuthScenario(path.join(fixturesDir, 'login-simple.yml'))
      await expect(scenario.validate()).rejects.toThrow(/Missing environment variable/)
    })
  })

  describe('test()', () => {
    it('returns { success: true } when auth flow completes', async () => {
      process.env.LOGIN_VALUE = 'user@example.com'
      const scenario = new AuthScenario(path.join(fixturesDir, 'login-simple.yml'))
      const result = await scenario.test({ headed: false })
      expect(result.success).toBe(true)
      expect(result.error).toBeNull()
      delete process.env.LOGIN_VALUE
    })

    it('returns { success: false } when a step fails', async () => {
      process.env.LOGIN_VALUE = 'user@example.com'
      const puppeteer = await import('puppeteer')
      puppeteer.default.launch.mockResolvedValueOnce({
        newPage: vi.fn().mockResolvedValue({
          on: vi.fn(),
          type: vi.fn().mockRejectedValue(new Error('Element not found')),
          click: vi.fn(),
          $: vi.fn().mockResolvedValue(null),
          screenshot: vi.fn().mockResolvedValue(Buffer.from('')),
          url: vi.fn().mockReturnValue(''),
          title: vi.fn().mockResolvedValue(''),
        }),
        close: vi.fn().mockResolvedValue(undefined),
      })
      const scenario = new AuthScenario(path.join(fixturesDir, 'login-simple.yml'))
      const result = await scenario.test()
      expect(result.success).toBe(false)
      expect(result.failedStep).toBe(0)
      expect(Array.isArray(result.screenshots)).toBe(true)
      delete process.env.LOGIN_VALUE
    })
  })
})
