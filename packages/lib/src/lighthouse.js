// packages/lib/src/lighthouse.js
// Public API for Lighthouse --puppeteer-script integrations.
// Use this when Lighthouse provides the page object (no browser launch needed).
import { ConfigLoader } from './core/config-loader.js'
import { Validator } from './core/validator.js'
import { Interpreter } from './core/interpreter.js'
import { ValidationError } from './errors.js'
import { DEFAULT_TIMEOUT } from './helpers/wait-utils.js'

/**
 * Authenticate using an existing Puppeteer page provided by Lighthouse.
 *
 * @param {import('puppeteer-core').Page} page - Page object from Lighthouse props
 * @param {string} configPath - Path to the YAML config file
 * @param {object} [options]
 * @param {number} [options.timeout] - Override global timeout (ms)
 * @param {boolean} [options.debug] - Enable verbose logging
 */
export async function authenticateWithPage(page, configPath, options = {}) {
  const { timeout = DEFAULT_TIMEOUT, debug = false } = options

  const raw = await ConfigLoader.load(configPath)
  const validationResult = Validator.validate(raw)
  if (!validationResult.valid) throw new ValidationError(validationResult.errors)
  ConfigLoader.checkEnvVars(raw)

  if (debug) {
    page.on('console', msg => console.log('[auth-scenario]', msg.text()))
    console.log(`[auth-scenario] config: ${configPath}`)
    console.log(`[auth-scenario] steps: ${raw.authentication.steps.length}`)
  }

  const interpreter = new Interpreter(raw, page, { timeout })
  await interpreter.authenticate()
  await interpreter.verify()

  if (debug) console.log('[auth-scenario] Authentication successful')
}
