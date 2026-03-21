export interface Scenario {
  id: string
  name: string
  yaml_content: string
  created_at: number
  updated_at: number
}

// ─── Step types ───────────────────────────────────────────────────────────────

export interface FillStep {
  action: 'fill'
  selector: string
  valueEnv: string
  valueType?: 'totp'
}

export interface WaitForSelectorStep {
  action: 'waitForSelector'
  selector: string
  timeout?: number
  errorSelector?: string
}

export interface ClickStep {
  action: 'click'
  selector: string
}

export interface WaitForNavigationStep {
  action: 'waitForNavigation'
  waitUntil?: string
  timeout?: number
}

export interface AssertNotPresentStep {
  action: 'assertNotPresent'
  selector: string
}

export interface WaitStep {
  action: 'wait'
  duration: number
}

export type Step =
  | FillStep
  | WaitForSelectorStep
  | ClickStep
  | WaitForNavigationStep
  | AssertNotPresentStep
  | WaitStep

export type ActionType = Step['action']

export const ACTION_TYPES: ActionType[] = [
  'fill',
  'waitForSelector',
  'click',
  'waitForNavigation',
  'assertNotPresent',
  'wait',
]

// ─── Verification types ────────────────────────────────────────────────────────

export interface CookieVerification {
  type: 'cookie'
  name: string
  required?: boolean
}

export interface LocalStorageVerification {
  type: 'localStorage'
  key: string
  required?: boolean
}

export interface UrlVerification {
  type: 'url'
  contains: string
  required?: boolean
}

export interface SelectorVerification {
  type: 'selector'
  selector: string
  required?: boolean
}

export interface TitleVerification {
  type: 'title'
  contains: string
  required?: boolean
}

export type Verification =
  | CookieVerification
  | LocalStorageVerification
  | UrlVerification
  | SelectorVerification
  | TitleVerification

export type VerificationType = Verification['type']

export const VERIFICATION_TYPES: VerificationType[] = [
  'cookie',
  'localStorage',
  'url',
  'selector',
  'title',
]
