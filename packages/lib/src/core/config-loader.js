import fs from 'fs/promises'
import path from 'path'
import yaml from 'js-yaml'
import { FileNotFoundError, ParseError, ValidationError } from '../errors.js'

export class ConfigLoader {
  static async load(filePath) {
    let content
    try {
      content = await fs.readFile(filePath, 'utf8')
    } catch {
      throw new FileNotFoundError(filePath)
    }

    const ext = path.extname(filePath).toLowerCase()
    if (ext === '.json') {
      try {
        return JSON.parse(content)
      } catch (e) {
        throw new ParseError(e.message)
      }
    }

    try {
      return yaml.load(content)
    } catch (e) {
      throw new ParseError(e.message)
    }
  }

  static checkEnvVars(config) {
    const steps = config.authentication?.steps ?? []
    for (const step of steps) {
      if (step.valueEnv && process.env[step.valueEnv] === undefined) {
        throw new ValidationError([{
          path: `authentication.steps[?].valueEnv`,
          message: `Missing environment variable: ${step.valueEnv} (referenced in step action: ${step.action})`
        }])
      }
    }
  }
}
