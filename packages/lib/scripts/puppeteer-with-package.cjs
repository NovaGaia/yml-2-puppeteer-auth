// scripts/puppeteer-with-package.cjs
// Lighthouse --puppeteer-script using the installed npm package.
// Copy this file into your project and set AUTH_CONFIG.
//
// Usage:
//   export AUTH_CONFIG="./auth.yml"
//   export LOGIN_VALUE="user@example.com"
//   export PASS_VALUE="secret"
//   lighthouse https://example.com --puppeteer-script=./puppeteer-with-package.cjs
'use strict'

module.exports = async (props) => {
  const { authenticateWithPage } = await import('yml-2-puppeteer-auth/lighthouse')

  const configPath = process.env.AUTH_CONFIG
  if (!configPath) {
    throw new Error(
      'Missing AUTH_CONFIG environment variable — set it to the path of your YAML config file'
    )
  }

  await authenticateWithPage(props.page, configPath, {
    timeout: process.env.TIMEOUT ? parseInt(process.env.TIMEOUT) : undefined,
    debug: process.env.DEBUG === 'true',
  })
}
