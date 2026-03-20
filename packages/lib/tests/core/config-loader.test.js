import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { ConfigLoader } from '../../src/core/config-loader.js'
import { FileNotFoundError, ParseError } from '../../src/errors.js'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const fixturesDir = path.join(__dirname, '../fixtures')

describe('ConfigLoader.load', () => {
  it('loads a valid YAML file', async () => {
    const config = await ConfigLoader.load(path.join(fixturesDir, 'login-simple.yml'))
    expect(config.name).toBe('Login simple')
    expect(config.authentication.url).toBe('https://example.com/login')
    expect(config.authentication.steps).toHaveLength(2)
  })

  it('throws FileNotFoundError for missing file', async () => {
    await expect(ConfigLoader.load('/nonexistent/path/auth.yml')).rejects.toThrow(FileNotFoundError)
  })

  it('throws ParseError for malformed YAML', async () => {
    await expect(
      ConfigLoader.load(path.join(fixturesDir, 'login-broken.yml'))
    ).rejects.toThrow(ParseError)
  })
})

describe('ConfigLoader.checkEnvVars', () => {
  it('does not throw when all env vars are defined', () => {
    process.env.TEST_LOGIN = 'user@example.com'
    const config = {
      authentication: {
        steps: [{ action: 'fill', selector: 'input', valueEnv: 'TEST_LOGIN' }]
      }
    }
    expect(() => ConfigLoader.checkEnvVars(config)).not.toThrow()
    delete process.env.TEST_LOGIN
  })

  it('throws when a referenced env var is missing', () => {
    const config = {
      authentication: {
        steps: [{ action: 'fill', selector: 'input', valueEnv: 'NONEXISTENT_VAR_XYZ_123' }]
      }
    }
    expect(() => ConfigLoader.checkEnvVars(config)).toThrow(/Missing environment variable/)
  })
})
