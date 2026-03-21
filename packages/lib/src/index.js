// packages/lib/src/index.js
import puppeteer from 'puppeteer-core'
import { existsSync } from 'fs'

function findChrome() {
  const candidates = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
    '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
  ]
  for (const p of candidates) {
    if (existsSync(p)) return p
  }
  throw new Error('Chrome introuvable. Installez Google Chrome depuis https://www.google.com/chrome')
}
import { ConfigLoader } from './core/config-loader.js'
import { Validator } from './core/validator.js'
import { Interpreter } from './core/interpreter.js'
import { ValidationError } from './errors.js'
import { DEFAULT_TIMEOUT } from './helpers/wait-utils.js'

const ISO_REPLACE = /[:.]/g

export class AuthScenario {
  constructor(configPath, options = {}) {
    this.configPath = configPath
    this.options = { timeout: options.timeout ?? DEFAULT_TIMEOUT, debug: options.debug ?? false }
  }

  async validate() {
    const raw = await ConfigLoader.load(this.configPath)
    const result = Validator.validate(raw)
    if (result.valid) {
      ConfigLoader.checkEnvVars(raw)  // throws if env var is missing
    }
    return result  // always { valid, errors }
  }

  async test(options = {}) {
    const { headed = false, debug = false, screenshotsDir = null } = options
    const raw = await ConfigLoader.load(this.configPath)
    const validationResult = Validator.validate(raw)
    if (!validationResult.valid) throw new ValidationError(validationResult.errors)
    ConfigLoader.checkEnvVars(raw)

    const browser = await puppeteer.launch({ headless: !headed, executablePath: findChrome() })
    const page = await browser.newPage()
    if (debug) page.on('console', msg => console.log('[browser]', msg.text()))

    const interpreter = new Interpreter(raw, page, { timeout: this.options.timeout })
    const startTime = Date.now()
    const stepResults = []

    try {
      await page.goto(raw.authentication.url, { waitUntil: 'load', timeout: this.options.timeout })
      const steps = raw.authentication?.steps ?? []
      for (let i = 0; i < steps.length; i++) {
        const t0 = Date.now()
        try {
          await interpreter.executeStep(steps[i], i)
          stepResults.push({ index: i, action: steps[i].action, duration: Date.now() - t0, status: 'success', error: null })
          if (debug && screenshotsDir) {
            await page.screenshot({ path: `${screenshotsDir}/step-${i}-${steps[i].action}.png` })
          }
        } catch (err) {
          const screenshotPath = await this._saveFailureScreenshot(page, screenshotsDir, i)
          stepResults.push({ index: i, action: steps[i].action, duration: Date.now() - t0, status: 'failed', error: err.message })
          return {
            success: false, duration: Date.now() - startTime,
            error: err.message, failedStep: i,
            screenshots: screenshotPath ? [screenshotPath] : [],
            steps: stepResults,
          }
        }
      }
      await interpreter.verify()
      return { success: true, duration: Date.now() - startTime, error: null, failedStep: null, screenshots: [], steps: stepResults }
    } finally {
      await browser.close()
    }
  }

  async _saveFailureScreenshot(page, screenshotsDir, stepIndex) {
    if (!screenshotsDir) return null
    try {
      const ts = new Date().toISOString().replace(ISO_REPLACE, '-')
      const filePath = `${screenshotsDir}/auth-failure-step${stepIndex}-${ts}.png`
      await page.screenshot({ path: filePath })
      return filePath
    } catch {
      return null
    }
  }
}

export * from './errors.js'
