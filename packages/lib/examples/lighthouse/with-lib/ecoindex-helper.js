// ecoindex-helper.js
// Ecoindex-specific helpers: viewport setup, scroll gesture, timing.
// Authentication and verification are handled by yml-2-puppeteer-auth (YAML config).

const sleep = async (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Registers page event handlers for debug logging.
 * @param {import('puppeteer').Page} page
 */
const registerLogHandlers = (page) =>
  page
    .on('console', (message) =>
      console.log('Console', `${message.type().substr(0, 3).toUpperCase()} ${message.text()}`)
    )
    .on('pageerror', ({ message }) => console.error('Page error', message))
    .on('response', (response) => {
      const request = response.request();
      if (
        (request.resourceType() === 'xhr' || request.resourceType() === 'document') &&
        !request.url().includes('google-analytics')
      ) {
        console.log('Response', request.resourceType(), response.status(), response.url());
      }
    })
    .on('requestfailed', (request) =>
      console.error('Request failed', `${request.failure().errorText} ${request.url()}`)
    );

/**
 * Standard Ecoindex page measure start:
 * sets viewport to 1920×1080, waits 3s, then scrolls the full page height.
 * @param {import('puppeteer').Page} page
 * @param {import('puppeteer').CDPSession} session
 */
async function startEcoindexPageMesure(page, session) {
  page.setViewport({ width: 1920, height: 1080 });
  await sleep(3 * 1000);

  const dimensions = await page.evaluate(() => {
    const body = document.body;
    const html = document.documentElement;
    const height = Math.max(
      body.scrollHeight, body.offsetHeight,
      html.clientHeight, html.scrollHeight, html.offsetHeight
    );
    return {
      width: document.documentElement.clientWidth,
      height,
      deviceScaleFactor: window.devicePixelRatio,
    };
  });

  await session.send('Input.synthesizeScrollGesture', {
    x: 100,
    y: 600,
    yDistance: -dimensions.height,
    speed: 1000,
  });
}

/**
 * Standard Ecoindex page measure end: waits 3s, then optionally takes a snapshot.
 * @param {object} flow
 * @param {boolean} [snapshotEnabled]
 */
async function endEcoindexPageMesure(flow, snapshotEnabled = false) {
  await sleep(3 * 1000);
  if (snapshotEnabled) await flow.snapshot();
}

export { registerLogHandlers, startEcoindexPageMesure, endEcoindexPageMesure };
