// Stub — utilisé par l'app Tauri (Plan 2) pour valider les sélecteurs dans l'UI
export function isValidSelector(selector) {
  if (!selector || typeof selector !== 'string') return false
  try {
    document.createDocumentFragment().querySelector(selector)
    return true
  } catch {
    return false
  }
}
