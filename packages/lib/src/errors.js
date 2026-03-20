export class AuthScenarioError extends Error {
  constructor(message) {
    super(message)
    this.name = 'AuthScenarioError'
  }
}

export class FileNotFoundError extends AuthScenarioError {
  constructor(path) {
    super(`File not found: ${path}`)
    this.name = 'FileNotFoundError'
  }
}

export class ParseError extends AuthScenarioError {
  constructor(message) {
    super(`Parse error: ${message}`)
    this.name = 'ParseError'
  }
}

export class ValidationError extends AuthScenarioError {
  constructor(errors) {
    super(`Validation failed: ${errors.map(e => e.message).join(', ')}`)
    this.name = 'ValidationError'
    this.errors = errors
  }
}

export class InterpreterError extends AuthScenarioError {
  constructor(message, stepIndex) {
    super(message)
    this.name = 'InterpreterError'
    this.stepIndex = stepIndex
  }
}

export class VerificationError extends AuthScenarioError {
  constructor(message) {
    super(message)
    this.name = 'VerificationError'
  }
}
