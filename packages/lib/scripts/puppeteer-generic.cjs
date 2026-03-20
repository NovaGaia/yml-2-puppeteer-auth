// packages/lib/scripts/puppeteer-generic.cjs
// CommonJS entry point for Lighthouse --puppeteer-script
'use strict'

module.exports = async (props) => {
  const { ConfigLoader } = await import('../src/core/config-loader.js')
  const { Validator } = await import('../src/core/validator.js')
  const { Interpreter } = await import('../src/core/interpreter.js')
  const { ValidationError } = await import('../src/errors.js')

  const configPath = process.env.AUTH_CONFIG
  if (!configPath) {
    throw new Error(
      'Missing AUTH_CONFIG environment variable — set it to the path of your YAML config file'
    )
  }

  const { page } = props
  const raw = await ConfigLoader.load(configPath)
  const validationResult = Validator.validate(raw)
  if (!validationResult.valid) throw new ValidationError(validationResult.errors)
  ConfigLoader.checkEnvVars(raw)

  const timeout = process.env.TIMEOUT ? parseInt(process.env.TIMEOUT) : 30000
  const debug = process.env.DEBUG === 'true'

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
