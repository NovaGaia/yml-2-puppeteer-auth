const env = process.env;

const DEBUG = env.DEBUG === 'true';

// https://pptr.dev/guides/configuration
// https://github.com/GoogleChrome/lighthouse-ci/blob/main/docs/configuration.md#puppeteerscript
/**
 * @param {puppeteer.Browser} browser
 * @param {{url: string, options: LHCI.CollectCommand.Options}} context
 */
module.exports = async (props) => {
  const { authenticateWithPage } = await import('yml-2-puppeteer-auth/lighthouse');
  const { registerLogHandlers, startEcoindexPageMesure, endEcoindexPageMesure } = await import('./ecoindex-helper.js');

  const configPath = env.AUTH_CONFIG;
  const authUrl = env.AUTH_URL;

  if (!configPath) throw new Error('Missing AUTH_CONFIG env var — set it to the path of your YAML config file');
  if (!authUrl)    throw new Error('Missing AUTH_URL env var — set it to the login page URL');

  const { page, session, flow, position, urls } = props;

  if (DEBUG) registerLogHandlers(page);

  informationalLog(props);

  if (urls[position] === authUrl) {
    console.info(`Authenticating on ${authUrl}`);
    await authenticateWithPage(page, configPath, { debug: DEBUG });
  } else {
    console.debug(`Already authenticated — starting Ecoindex measure`);
    await startEcoindexPageMesure(page, session);
    await endEcoindexPageMesure(flow);
  }
};

const informationalLog = (props) => {
  const { page, position, urls } = props;
  console.log('##########################################');
  console.info(`AUTH_CONFIG`, env.AUTH_CONFIG);
  console.info(`AUTH_URL`,    env.AUTH_URL);
  console.info(`LOGIN_VALUE`, env.LOGIN_VALUE);
  console.info(`PASS_VALUE`,  '********');
  console.info(`page is undefined`, page === undefined);
  if (position !== undefined && urls?.[position]) {
    console.info(`Navigating to ${urls[position]}`);
  }
  console.log('##########################################');
};
