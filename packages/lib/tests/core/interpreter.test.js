import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Interpreter } from '../../src/core/interpreter.js'
import { InterpreterError } from '../../src/errors.js'

const makePage = (overrides = {}) => ({
  goto: vi.fn().mockResolvedValue(undefined),
  type: vi.fn().mockResolvedValue(undefined),
  click: vi.fn().mockResolvedValue(undefined),
  waitForSelector: vi.fn().mockResolvedValue({ evaluate: async () => '' }),
  waitForNavigation: vi.fn().mockResolvedValue(undefined),
  $: vi.fn().mockResolvedValue(null),
  evaluate: vi.fn().mockResolvedValue({}),
  cookies: vi.fn().mockResolvedValue([{ name: 'session_abc' }]),
  url: vi.fn().mockReturnValue('https://example.com/dashboard'),
  title: vi.fn().mockResolvedValue('Dashboard'),
  screenshot: vi.fn().mockResolvedValue(Buffer.from('')),
  ...overrides,
})

describe('Interpreter — fill', () => {
  it('types the env var value', async () => {
    process.env.LOGIN_VALUE = 'user@example.com'
    const page = makePage()
    const interpreter = new Interpreter({ authentication: { steps: [] } }, page)
    await interpreter.executeStep({ action: 'fill', selector: 'input', valueEnv: 'LOGIN_VALUE' }, 0)
    expect(page.type).toHaveBeenCalledWith('input', 'user@example.com')
    delete process.env.LOGIN_VALUE
  })

  it('generates a TOTP code when valueType is totp', async () => {
    // TOTP_SECRET is a valid base32 secret
    process.env.TOTP_SECRET = 'JBSWY3DPEHPK3PXP'
    const page = makePage()
    const interpreter = new Interpreter({ authentication: { steps: [] } }, page)
    await interpreter.executeStep(
      { action: 'fill', selector: 'input[name="otp"]', valueEnv: 'TOTP_SECRET', valueType: 'totp' },
      0
    )
    // TOTP code is a 6-digit string
    const calledWith = page.type.mock.calls[0][1]
    expect(calledWith).toMatch(/^\d{6}$/)
    delete process.env.TOTP_SECRET
  })

  it('throws InterpreterError when env var is missing', async () => {
    const page = makePage()
    const interpreter = new Interpreter({ authentication: { steps: [] } }, page)
    await expect(
      interpreter.executeStep({ action: 'fill', selector: 'input', valueEnv: 'NONEXISTENT_XYZ' }, 0)
    ).rejects.toThrow(InterpreterError)
  })
})

describe('Interpreter — click', () => {
  it('calls page.click with the selector', async () => {
    const page = makePage()
    const interpreter = new Interpreter({ authentication: { steps: [] } }, page)
    await interpreter.executeStep({ action: 'click', selector: 'button' }, 0)
    expect(page.click).toHaveBeenCalledWith('button')
  })
})

describe('Interpreter — wait', () => {
  it('sleeps for the specified duration', async () => {
    vi.useFakeTimers()
    const page = makePage()
    const interpreter = new Interpreter({ authentication: { steps: [] } }, page)
    const promise = interpreter.executeStep({ action: 'wait', duration: 1000 }, 0)
    vi.advanceTimersByTime(1000)
    await promise
    vi.useRealTimers()
  })
})

describe('Interpreter — waitForSelector', () => {
  it('calls page.waitForSelector with timeout', async () => {
    const page = makePage()
    const interpreter = new Interpreter({ authentication: { steps: [] } }, page)
    await interpreter.executeStep({ action: 'waitForSelector', selector: 'input', timeout: 5000 }, 0)
    expect(page.waitForSelector).toHaveBeenCalledWith('input', { timeout: 5000 })
  })

  it('throws InterpreterError on timeout', async () => {
    const page = makePage({ waitForSelector: vi.fn().mockRejectedValue(new Error('Timeout')) })
    const interpreter = new Interpreter({ authentication: { steps: [] } }, page)
    await expect(
      interpreter.executeStep({ action: 'waitForSelector', selector: 'input' }, 0)
    ).rejects.toThrow(InterpreterError)
  })

  it('throws InterpreterError when errorSelector wins the Promise.race', async () => {
    const page = makePage({
      waitForSelector: vi.fn().mockImplementation(selector => {
        if (selector === '.error') {
          return Promise.resolve({ evaluate: async () => 'Bad credentials' })
        }
        return new Promise(() => {}) // main selector never resolves
      }),
    })
    const interpreter = new Interpreter({ authentication: { steps: [] } }, page)
    await expect(
      interpreter.executeStep(
        { action: 'waitForSelector', selector: 'input', errorSelector: '.error' },
        0
      )
    ).rejects.toThrow(InterpreterError)
  })
})

describe('Interpreter — assertNotPresent', () => {
  it('passes when element is absent ($ returns null)', async () => {
    const page = makePage({ $: vi.fn().mockResolvedValue(null) })
    const interpreter = new Interpreter({ authentication: { steps: [] } }, page)
    await expect(
      interpreter.executeStep({ action: 'assertNotPresent', selector: '.error' }, 0)
    ).resolves.not.toThrow()
  })

  it('throws InterpreterError when element is present', async () => {
    const page = makePage({ $: vi.fn().mockResolvedValue({}) })
    const interpreter = new Interpreter({ authentication: { steps: [] } }, page)
    await expect(
      interpreter.executeStep({ action: 'assertNotPresent', selector: '.error' }, 0)
    ).rejects.toThrow(InterpreterError)
  })
})

describe('Interpreter — waitForNavigation', () => {
  it('uses default waitUntil: load when not specified', async () => {
    const page = makePage()
    const interpreter = new Interpreter({ authentication: { steps: [] } }, page)
    await interpreter.executeStep({ action: 'waitForNavigation' }, 0)
    expect(page.waitForNavigation).toHaveBeenCalledWith(
      expect.objectContaining({ waitUntil: 'load' })
    )
  })

  it('uses specified waitUntil option', async () => {
    const page = makePage()
    const interpreter = new Interpreter({ authentication: { steps: [] } }, page)
    await interpreter.executeStep({ action: 'waitForNavigation', waitUntil: 'networkidle0' }, 0)
    expect(page.waitForNavigation).toHaveBeenCalledWith(
      expect.objectContaining({ waitUntil: 'networkidle0' })
    )
  })
})

describe('Interpreter — authenticate() and verify()', () => {
  it('executes all steps in order', async () => {
    process.env.LOGIN_VALUE = 'user@test.com'
    const page = makePage()
    const config = {
      authentication: {
        url: 'https://example.com/login',
        steps: [
          { action: 'fill', selector: 'input', valueEnv: 'LOGIN_VALUE' },
          { action: 'click', selector: 'button' },
        ],
      },
    }
    const interpreter = new Interpreter(config, page)
    await interpreter.authenticate()
    expect(page.goto).toHaveBeenCalledWith('https://example.com/login', expect.objectContaining({ waitUntil: 'load' }))
    expect(page.type).toHaveBeenCalledTimes(1)
    expect(page.click).toHaveBeenCalledTimes(1)
    delete process.env.LOGIN_VALUE
  })

  it('verify() calls runVerifications with config verifications', async () => {
    const page = makePage()
    const config = {
      authentication: { steps: [] },
      verification: [{ type: 'url', contains: '/dashboard', required: true }],
    }
    const interpreter = new Interpreter(config, page)
    await expect(interpreter.verify()).resolves.not.toThrow()
  })

  it('verify() reads verificationMode from config.options', async () => {
    // url fails (login page), cookie also fails — but mode:any means at least one must pass
    // We set url to dashboard so it passes — proving mode is forwarded
    const page = makePage()  // url returns /dashboard by default
    const config = {
      authentication: { steps: [] },
      verification: [
        { type: 'url', contains: '/dashboard' },
        { type: 'cookie', name: 'missing_cookie' },
      ],
      options: { verificationMode: 'any' },
    }
    const interpreter = new Interpreter(config, page)
    await expect(interpreter.verify()).resolves.not.toThrow()
  })
})
