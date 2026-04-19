const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.on('console', msg => console.log('CONSOLE', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('PAGEERROR', err.stack || err.message));
  page.on('requestfailed', req => console.log('REQUESTFAILED', req.url(), req.failure()?.errorText || ''));
  await page.goto('http://localhost:3001/contato/', { waitUntil: 'networkidle', timeout: 30000 }).catch(err => console.log('GOTOERR', err.message));
  console.log('TITLE', await page.title().catch(() => ''));
  console.log('BODY', await page.locator('body').innerText().catch(() => ''));
  await browser.close();
})();
