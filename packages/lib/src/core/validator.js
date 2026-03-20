const VALID_ACTIONS = ['fill', 'click', 'waitForSelector', 'waitForNavigation', 'assertNotPresent', 'wait']

const STEP_REQUIRED_FIELDS = {
  fill: ['selector', 'valueEnv'],
  click: ['selector'],
  waitForSelector: ['selector'],
  waitForNavigation: [],
  assertNotPresent: ['selector'],
  wait: ['duration'],
}

const VERIFICATION_REQUIRED_FIELDS = {
  cookie: ['name'],
  localStorage: ['key'],
  selector: ['selector'],
  url: ['contains'],
  title: ['contains'],
}

export class Validator {
  static validate(config) {
    const errors = []

    if (!config.name) errors.push({ path: 'name', message: 'Required field missing' })

    if (!config.authentication?.url) {
      errors.push({ path: 'authentication.url', message: 'Required field missing' })
    }

    const steps = config.authentication?.steps
    if (!steps || steps.length === 0) {
      errors.push({ path: 'authentication.steps', message: 'Must have at least one step' })
    } else {
      steps.forEach((step, i) => {
        if (!VALID_ACTIONS.includes(step.action)) {
          errors.push({ path: `authentication.steps[${i}].action`, message: `Unknown action: ${step.action}` })
          return
        }
        const required = STEP_REQUIRED_FIELDS[step.action] ?? []
        for (const field of required) {
          if (step[field] === undefined || step[field] === null || step[field] === '') {
            errors.push({ path: `authentication.steps[${i}].${field}`, message: 'Required field missing' })
          }
        }
      })
    }

    const verifications = config.verification ?? []
    verifications.forEach((v, i) => {
      const required = VERIFICATION_REQUIRED_FIELDS[v.type] ?? []
      for (const field of required) {
        if (!v[field]) {
          errors.push({ path: `verification[${i}].${field}`, message: 'Required field missing' })
        }
      }
    })

    return { valid: errors.length === 0, errors }
  }
}
