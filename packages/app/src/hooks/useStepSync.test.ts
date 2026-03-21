import { describe, it, expect } from 'vitest'
import { yamlToSteps, patchYamlSteps, yamlToUrl, patchYamlUrl } from './useStepSync'

// ─── yamlToSteps ──────────────────────────────────────────────────────────────

describe('yamlToSteps', () => {
  it('retourne null si le YAML est syntaxiquement invalide', () => {
    expect(yamlToSteps(':: invalid ::')).toBeNull()
  })

  it('retourne un tableau vide si authentication.steps est absent', () => {
    const yaml = `name: "test"\nauthentication:\n  url: "https://example.com"\n`
    expect(yamlToSteps(yaml)).toEqual([])
  })

  it('parse un step fill correctement', () => {
    const yaml = `
authentication:
  steps:
    - action: fill
      selector: "input[type='email']"
      valueEnv: "LOGIN_VALUE"
`
    expect(yamlToSteps(yaml)).toEqual([
      { action: 'fill', selector: "input[type='email']", valueEnv: 'LOGIN_VALUE' },
    ])
  })

  it('parse un step fill avec valueType totp', () => {
    const yaml = `
authentication:
  steps:
    - action: fill
      selector: "input[name='otp']"
      valueEnv: "TOTP_SECRET"
      valueType: totp
`
    expect(yamlToSteps(yaml)).toEqual([
      { action: 'fill', selector: "input[name='otp']", valueEnv: 'TOTP_SECRET', valueType: 'totp' },
    ])
  })

  it('parse un step waitForSelector avec options optionnelles', () => {
    const yaml = `
authentication:
  steps:
    - action: waitForSelector
      selector: "input[type='email']"
      timeout: 10000
      errorSelector: ".error-banner"
`
    expect(yamlToSteps(yaml)).toEqual([
      { action: 'waitForSelector', selector: "input[type='email']", timeout: 10000, errorSelector: '.error-banner' },
    ])
  })

  it('parse un step click', () => {
    const yaml = `
authentication:
  steps:
    - action: click
      selector: "button[type='submit']"
`
    expect(yamlToSteps(yaml)).toEqual([
      { action: 'click', selector: "button[type='submit']" },
    ])
  })

  it('parse un step waitForNavigation avec champs optionnels', () => {
    const yaml = `
authentication:
  steps:
    - action: waitForNavigation
      timeout: 15000
      waitUntil: networkidle0
`
    expect(yamlToSteps(yaml)).toEqual([
      { action: 'waitForNavigation', timeout: 15000, waitUntil: 'networkidle0' },
    ])
  })

  it('parse un step assertNotPresent', () => {
    const yaml = `
authentication:
  steps:
    - action: assertNotPresent
      selector: ".error-message"
`
    expect(yamlToSteps(yaml)).toEqual([
      { action: 'assertNotPresent', selector: '.error-message' },
    ])
  })

  it('parse un step wait', () => {
    const yaml = `
authentication:
  steps:
    - action: wait
      duration: 3000
`
    expect(yamlToSteps(yaml)).toEqual([
      { action: 'wait', duration: 3000 },
    ])
  })

  it('retourne null si le YAML est une chaîne vide', () => {
    expect(yamlToSteps('')).toBeNull()
  })
})

// ─── patchYamlSteps ───────────────────────────────────────────────────────────

describe('patchYamlSteps', () => {
  it('remplace les steps existants et préserve le reste du YAML', () => {
    const original = `name: "Mon scénario"
authentication:
  url: "https://example.com/login"
  steps:
    - action: click
      selector: "button"
verification:
  - type: url
    contains: "/dashboard"
    required: true
`
    const newSteps = [{ action: 'click' as const, selector: 'button.new' }]
    const result = patchYamlSteps(original, newSteps)
    expect(yamlToSteps(result)).toEqual(newSteps)
    expect(result).toContain('verification:')
    expect(result).toContain('/dashboard')
  })

  it('fonctionne si authentication.steps était absent', () => {
    const original = `name: "test"\nauthentication:\n  url: "https://example.com"\n`
    const newSteps = [{ action: 'wait' as const, duration: 1000 }]
    const result = patchYamlSteps(original, newSteps)
    expect(yamlToSteps(result)).toEqual(newSteps)
  })

  it('produit un YAML valide avec plusieurs steps', () => {
    const original = `name: "test"\nauthentication:\n  url: "https://x.com"\n  steps: []\n`
    const newSteps = [
      { action: 'fill' as const, selector: 'input', valueEnv: 'LOGIN_VALUE' },
      { action: 'click' as const, selector: 'button' },
    ]
    const result = patchYamlSteps(original, newSteps)
    expect(yamlToSteps(result)).toEqual(newSteps)
  })

  it('préserve le nom du scénario intouché', () => {
    const original = `name: "Preserved Name"\nauthentication:\n  url: "https://x.com"\n  steps: []\n`
    const result = patchYamlSteps(original, [])
    expect(result).toContain('Preserved Name')
  })
})

// ─── yamlToUrl ────────────────────────────────────────────────────────────────

describe('yamlToUrl', () => {
  it('extrait l\'url d\'authentification', () => {
    const yaml = `authentication:\n  url: "https://example.com/login"\n  steps: []\n`
    expect(yamlToUrl(yaml)).toBe('https://example.com/login')
  })

  it('retourne une chaîne vide si url est absent', () => {
    const yaml = `authentication:\n  steps: []\n`
    expect(yamlToUrl(yaml)).toBe('')
  })

  it('retourne une chaîne vide si le YAML est vide', () => {
    expect(yamlToUrl('')).toBe('')
  })

  it('retourne une chaîne vide si authentication est absent', () => {
    expect(yamlToUrl(`name: "test"\n`)).toBe('')
  })
})

// ─── patchYamlUrl ─────────────────────────────────────────────────────────────

describe('patchYamlUrl', () => {
  it('remplace l\'url et préserve le reste', () => {
    const original = `name: "test"\nauthentication:\n  url: "https://old.com"\n  steps: []\n`
    const result = patchYamlUrl(original, 'https://new.com/login')
    expect(yamlToUrl(result)).toBe('https://new.com/login')
    expect(result).toContain('test')
  })

  it('crée authentication.url si absent', () => {
    const original = `name: "test"\n`
    const result = patchYamlUrl(original, 'https://example.com')
    expect(yamlToUrl(result)).toBe('https://example.com')
  })
})
