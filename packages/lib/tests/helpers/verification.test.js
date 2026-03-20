import { describe, it, expect, vi } from 'vitest'
import { runVerifications } from '../../src/helpers/verification.js'
import { VerificationError } from '../../src/errors.js'

const makePage = (overrides = {}) => ({
  cookies: vi.fn().mockResolvedValue([]),
  evaluate: vi.fn().mockResolvedValue({}),
  url: vi.fn().mockReturnValue('https://example.com/dashboard'),
  title: vi.fn().mockResolvedValue('Dashboard'),
  $: vi.fn().mockResolvedValue(null),
  ...overrides,
})

describe('runVerifications — cookie', () => {
  it('passes when cookie name starts with expected prefix', async () => {
    const page = makePage({ cookies: vi.fn().mockResolvedValue([{ name: 'wordpress_logged_in_abc' }]) })
    await expect(
      runVerifications(page, [{ type: 'cookie', name: 'wordpress_logged_in_', required: true }])
    ).resolves.not.toThrow()
  })

  it('throws VerificationError when cookie is absent', async () => {
    const page = makePage({ cookies: vi.fn().mockResolvedValue([]) })
    await expect(
      runVerifications(page, [{ type: 'cookie', name: 'session', required: true }])
    ).rejects.toThrow(VerificationError)
  })
})

describe('runVerifications — url', () => {
  it('passes when url contains expected string', async () => {
    const page = makePage()
    await expect(
      runVerifications(page, [{ type: 'url', contains: '/dashboard', required: true }])
    ).resolves.not.toThrow()
  })

  it('throws when url does not match', async () => {
    const page = makePage({ url: vi.fn().mockReturnValue('https://example.com/login') })
    await expect(
      runVerifications(page, [{ type: 'url', contains: '/dashboard', required: true }])
    ).rejects.toThrow(VerificationError)
  })
})

describe('runVerifications — title', () => {
  it('passes when title contains expected string', async () => {
    const page = makePage()
    await expect(
      runVerifications(page, [{ type: 'title', contains: 'Dashboard', required: true }])
    ).resolves.not.toThrow()
  })
})

describe('runVerifications — localStorage', () => {
  it('passes when key exists with a value', async () => {
    const page = makePage({ evaluate: vi.fn().mockResolvedValue({ 'auth-token': 'abc123' }) })
    await expect(
      runVerifications(page, [{ type: 'localStorage', key: 'auth-token', required: true }])
    ).resolves.not.toThrow()
  })
})

describe('runVerifications — required:false', () => {
  it('does not throw on failure when required is false', async () => {
    const page = makePage({ url: vi.fn().mockReturnValue('https://example.com/login') })
    await expect(
      runVerifications(page, [{ type: 'url', contains: '/dashboard', required: false }])
    ).resolves.not.toThrow()
  })
})

describe('runVerifications — verificationMode: any', () => {
  it('passes when at least one check succeeds (url passes, cookie fails)', async () => {
    const page = makePage()
    await expect(
      runVerifications(
        page,
        [{ type: 'url', contains: '/dashboard' }, { type: 'cookie', name: 'missing' }],
        { verificationMode: 'any' }
      )
    ).resolves.not.toThrow()
  })

  it('throws when all checks fail under mode:any', async () => {
    const page = makePage({ url: vi.fn().mockReturnValue('https://example.com/login') })
    await expect(
      runVerifications(
        page,
        [{ type: 'url', contains: '/dashboard' }, { type: 'cookie', name: 'missing' }],
        { verificationMode: 'any' }
      )
    ).rejects.toThrow(VerificationError)
  })
})
