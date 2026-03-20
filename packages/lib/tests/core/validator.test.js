import { describe, it, expect } from 'vitest'
import { Validator } from '../../src/core/validator.js'

const validConfig = {
  name: 'Test',
  authentication: {
    url: 'https://example.com/login',
    steps: [
      { action: 'fill', selector: 'input', valueEnv: 'LOGIN_VALUE' },
      { action: 'click', selector: 'button' },
    ],
  },
}

describe('Validator', () => {
  it('validates a correct config', () => {
    const { valid, errors } = Validator.validate(validConfig)
    expect(valid).toBe(true)
    expect(errors).toHaveLength(0)
  })

  it('fails when name is missing', () => {
    const { name, ...config } = validConfig
    const { valid, errors } = Validator.validate(config)
    expect(valid).toBe(false)
    expect(errors[0].path).toBe('name')
  })

  it('fails when authentication.url is missing', () => {
    const config = { ...validConfig, authentication: { steps: validConfig.authentication.steps } }
    const { valid, errors } = Validator.validate(config)
    expect(valid).toBe(false)
    expect(errors.some(e => e.path === 'authentication.url')).toBe(true)
  })

  it('fails when steps is empty', () => {
    const config = { ...validConfig, authentication: { ...validConfig.authentication, steps: [] } }
    const { valid, errors } = Validator.validate(config)
    expect(valid).toBe(false)
    expect(errors.some(e => e.path === 'authentication.steps')).toBe(true)
  })

  it('fails when fill step is missing selector', () => {
    const config = {
      ...validConfig,
      authentication: { ...validConfig.authentication, steps: [{ action: 'fill', valueEnv: 'X' }] },
    }
    const { valid, errors } = Validator.validate(config)
    expect(valid).toBe(false)
    expect(errors[0].path).toMatch(/steps\[0\]\.selector/)
  })

  it('fails when fill step is missing valueEnv', () => {
    const config = {
      ...validConfig,
      authentication: { ...validConfig.authentication, steps: [{ action: 'fill', selector: 'input' }] },
    }
    const { valid, errors } = Validator.validate(config)
    expect(valid).toBe(false)
    expect(errors[0].path).toMatch(/steps\[0\]\.valueEnv/)
  })

  it('fails when wait step is missing duration', () => {
    const config = {
      ...validConfig,
      authentication: { ...validConfig.authentication, steps: [{ action: 'wait' }] },
    }
    const { valid, errors } = Validator.validate(config)
    expect(valid).toBe(false)
    expect(errors[0].path).toMatch(/steps\[0\]\.duration/)
  })

  it('fails on unknown action', () => {
    const config = {
      ...validConfig,
      authentication: {
        ...validConfig.authentication,
        steps: [{ action: 'unknownAction', selector: 'x' }],
      },
    }
    const { valid } = Validator.validate(config)
    expect(valid).toBe(false)
  })

  it('validates verification block when present', () => {
    const config = { ...validConfig, verification: [{ type: 'cookie', name: 'session' }] }
    const { valid } = Validator.validate(config)
    expect(valid).toBe(true)
  })

  it('fails on verification missing required field', () => {
    const config = { ...validConfig, verification: [{ type: 'url' }] }
    const { valid, errors } = Validator.validate(config)
    expect(valid).toBe(false)
    expect(errors[0].path).toMatch(/verification\[0\]\.contains/)
  })
})
