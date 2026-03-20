import { VerificationError } from '../errors.js'

async function checkOne(page, v) {
  switch (v.type) {
    case 'cookie': {
      const cookies = await page.cookies()
      const found = cookies.some(c => c.name.startsWith(v.name))
      if (!found) throw new VerificationError(`Cookie "${v.name}" not found`)
      break
    }
    case 'localStorage': {
      const value = await page.evaluate((key) => localStorage.getItem(key), v.key)
      if (!value) throw new VerificationError(`localStorage key "${v.key}" not found or empty`)
      break
    }
    case 'url': {
      const url = page.url()
      if (!url.includes(v.contains)) {
        throw new VerificationError(`URL "${url}" does not contain "${v.contains}"`)
      }
      break
    }
    case 'title': {
      const title = await page.title()
      if (!title.includes(v.contains)) {
        throw new VerificationError(`Title "${title}" does not contain "${v.contains}"`)
      }
      break
    }
    case 'selector': {
      const el = await page.$(v.selector)
      if (!el) throw new VerificationError(`Selector "${v.selector}" not found`)
      break
    }
    default:
      throw new VerificationError(`Unknown verification type: ${v.type}`)
  }
}

export async function runVerifications(page, verifications, options = {}) {
  const mode = options.verificationMode ?? 'all'

  if (mode === 'any') {
    let anyPassed = false
    for (const v of verifications) {
      try { await checkOne(page, v); anyPassed = true; break } catch {}
    }
    if (!anyPassed && verifications.length > 0) {
      throw new VerificationError('No verification passed (verificationMode: any)')
    }
    return
  }

  for (const v of verifications) {
    try {
      await checkOne(page, v)
    } catch (err) {
      if (v.required !== false) throw err
    }
  }
}
