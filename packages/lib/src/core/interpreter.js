import { authenticator } from 'otplib'
import { InterpreterError } from '../errors.js'
import { runVerifications } from '../helpers/verification.js'

export class Interpreter {
  constructor(config, page, options = {}) {
    this.config = config
    this.page = page
    this.options = { timeout: 30000, ...options }
  }

  async executeStep(step, index) {
    switch (step.action) {
      case 'fill': return this._fill(step, index)
      case 'click': return this._click(step, index)
      case 'wait': return this._wait(step, index)
      case 'waitForSelector': return this._waitForSelector(step, index)
      case 'waitForNavigation': return this._waitForNavigation(step, index)
      case 'assertNotPresent': return this._assertNotPresent(step, index)
      default: throw new InterpreterError(`Unknown action: ${step.action}`, index)
    }
  }

  async authenticate() {
    const steps = this.config.authentication?.steps ?? []
    for (let i = 0; i < steps.length; i++) {
      await this.executeStep(steps[i], i)
    }
  }

  async verify() {
    const verifications = this.config.verification ?? []
    const mode = this.config.options?.verificationMode ?? 'all'
    await runVerifications(this.page, verifications, { verificationMode: mode })
  }

  async _fill(step, index) {
    let value
    if (step.valueType === 'totp') {
      const secret = process.env[step.valueEnv]
      if (!secret) throw new InterpreterError(`Missing env var: ${step.valueEnv}`, index)
      value = authenticator.generate(secret)
    } else {
      value = process.env[step.valueEnv]
      if (value === undefined) {
        throw new InterpreterError(`Missing env var: ${step.valueEnv}`, index)
      }
    }
    try {
      await this.page.type(step.selector, value)
    } catch (e) {
      throw new InterpreterError(`fill failed on "${step.selector}": ${e.message}`, index)
    }
  }

  async _click(step, index) {
    try {
      await this.page.click(step.selector)
    } catch (e) {
      throw new InterpreterError(`click failed on "${step.selector}": ${e.message}`, index)
    }
  }

  async _wait(step) {
    await new Promise(resolve => setTimeout(resolve, step.duration))
  }

  async _waitForSelector(step, index) {
    const timeout = step.timeout ?? this.options.timeout
    try {
      if (step.errorSelector) {
        const main = this.page.waitForSelector(step.selector, { timeout })
        const error = this.page.waitForSelector(step.errorSelector, { timeout }).then(async el => {
          const text = await el.evaluate(e => e.textContent).catch(() => step.errorSelector)
          throw new InterpreterError(
            `errorSelector "${step.errorSelector}" appeared: "${text}"`,
            index
          )
        })
        await Promise.race([main, error])
      } else {
        await this.page.waitForSelector(step.selector, { timeout })
      }
    } catch (e) {
      if (e instanceof InterpreterError) throw e
      throw new InterpreterError(
        `waitForSelector timeout for "${step.selector}" after ${timeout}ms`,
        index
      )
    }
  }

  async _waitForNavigation(step, index) {
    const timeout = step.timeout ?? this.options.timeout
    const waitUntil = step.waitUntil ?? 'load'
    try {
      await this.page.waitForNavigation({ waitUntil, timeout })
    } catch (e) {
      throw new InterpreterError(`waitForNavigation timeout after ${timeout}ms`, index)
    }
  }

  async _assertNotPresent(step, index) {
    const el = await this.page.$(step.selector)
    if (el !== null) {
      throw new InterpreterError(`assertNotPresent: "${step.selector}" is present in the DOM`, index)
    }
  }
}
