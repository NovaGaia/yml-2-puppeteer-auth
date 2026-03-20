#!/usr/bin/env node
// packages/lib/src/cli/cli.js
import { program } from 'commander'
import path from 'path'
import { AuthScenario } from '../index.js'
import { ConfigLoader } from '../core/config-loader.js'
import { Validator } from '../core/validator.js'

program
  .name('auth-scenario')
  .description('Runtime YAML interpreter for Puppeteer authentication flows')
  .version('0.1.0')

program
  .command('validate <config>')
  .description('Validate YAML config structure and check env vars — no browser launched')
  .action(async (configArg) => {
    const configPath = path.resolve(configArg)
    try {
      const raw = await ConfigLoader.load(configPath)
      const result = Validator.validate(raw)

      if (!result.valid) {
        console.error('✗ YAML invalid:')
        result.errors.forEach(e => console.error(`  ${e.path}: ${e.message}`))
        process.exit(1)
      }

      console.log('✓ YAML valid')

      const steps = raw.authentication?.steps ?? []
      const envRefs = steps.filter(s => s.valueEnv).map(s => s.valueEnv)

      try {
        ConfigLoader.checkEnvVars(raw)
        if (envRefs.length > 0) {
          console.log(`✓ Environment variables present (${envRefs.join(', ')})`)
        }
      } catch (e) {
        console.error(`✗ ${e.message}`)
        process.exit(1)
      }

      console.log(`\nSteps: ${steps.length}`)
      steps.forEach((s, i) => {
        const detail = s.valueEnv ? ` ← ${s.valueEnv}` : ''
        const selector = s.selector ? ` "${s.selector}"` : ''
        console.log(`  [${i}] ${s.action}${selector}${detail}`)
      })
    } catch (e) {
      console.error(`✗ Error: ${e.message}`)
      process.exit(1)
    }
  })

program
  .command('test <config>')
  .description('Run authentication flow with Puppeteer')
  .option('--headed', 'Open a visible browser window')
  .option('--debug', 'Verbose logs and screenshot at each step')
  .option('--screenshots <dir>', 'Directory to save screenshots')
  .option('--timeout <ms>', 'Override global timeout (ms)', parseInt)
  .action(async (configArg, options) => {
    const configPath = path.resolve(configArg)
    const scenario = new AuthScenario(configPath, { timeout: options.timeout })

    try {
      const result = await scenario.test({
        headed: options.headed ?? false,
        debug: options.debug ?? false,
        screenshotsDir: options.screenshots ?? null,
      })

      if (result.success) {
        console.log(`✓ Authentication successful (${result.duration}ms)`)
        result.steps.forEach(s => console.log(`  ✓ [${s.index}] ${s.action} (${s.duration}ms)`))
      } else {
        console.error(`✗ Failed at step ${result.failedStep}: ${result.error}`)
        if (result.screenshots.length > 0) console.error(`  Screenshot: ${result.screenshots[0]}`)
        process.exit(1)
      }
    } catch (e) {
      console.error(`✗ ${e.message}`)
      process.exit(1)
    }
  })

program.parse()
