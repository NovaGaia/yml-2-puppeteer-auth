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
