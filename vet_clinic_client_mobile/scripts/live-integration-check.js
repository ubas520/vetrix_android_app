const fs = require('fs/promises');
const path = require('path');
const { chromium } = require('playwright-core');

const appUrl = process.env.VETRIX_APP_URL || 'http://127.0.0.1:8080';
const apiUrl = process.env.VETRIX_API_URL || 'http://192.168.100.100/vetrix/api/mobile/v1';
const email = process.env.VETRIX_TEST_EMAIL;
const password = process.env.VETRIX_TEST_PASSWORD;
const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const outputDir = path.join(process.cwd(), '.visual-check');

if (!email || !password) {
  console.error('Set VETRIX_TEST_EMAIL and VETRIX_TEST_PASSWORD before running this live check.');
  process.exit(1);
}

async function expectOne(locator, label) {
  const count = await locator.count();
  if (count !== 1) throw new Error(`Expected one ${label}, found ${count}.`);
  return locator;
}

async function revokeToken(token) {
  if (!token) return;
  try {
    await fetch(`${apiUrl}/logout.php`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: '{}',
    });
  } catch {
    // The browser check reports its primary failure; an expired test token is
    // also revoked automatically by the API.
  }
}

async function main() {
  await fs.mkdir(outputDir, { recursive: true });
  const runtimeErrors = [];
  const apiResponses = [];
  const browser = await chromium.launch({ executablePath: edgePath, headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  let token = null;

  page.on('console', (message) => {
    if (message.type() === 'error') runtimeErrors.push(`console: ${message.text()}`);
  });
  page.on('pageerror', (error) => runtimeErrors.push(`page: ${error.message}`));
  page.on('response', (response) => {
    if (response.url().startsWith(apiUrl)) {
      apiResponses.push({ method: response.request().method(), status: response.status(), url: response.url() });
    }
  });

  try {
    await page.goto(appUrl, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.getByText('Welcome back!', { exact: true }).waitFor({ timeout: 90000 });
    await page.screenshot({ path: path.join(outputDir, 'live-login-phone.png'), fullPage: true });

    const emailInput = await expectOne(page.getByPlaceholder('client@vetclinic.test', { exact: true }), 'email input');
    const passwordInput = await expectOne(page.getByPlaceholder('Password', { exact: true }), 'password input');
    const loginButton = await expectOne(page.getByRole('button', { name: 'Login', exact: true }), 'login button');
    await emailInput.fill(email);
    await passwordInput.fill(password);
    const bootstrapResponse = page.waitForResponse(
      (response) => response.url() === `${apiUrl}/bootstrap.php` && response.status() === 200,
      { timeout: 30000 },
    );
    await loginButton.click();

    await bootstrapResponse;
    await page.getByText('Needs Action', { exact: true }).waitFor({ timeout: 30000 });
    await page.getByText('Welcome back', { exact: true }).waitFor();
    const petsMetric = page.getByText('Pets under care', { exact: true }).locator('..');
    await petsMetric.getByText('4', { exact: true }).waitFor();
    token = await page.evaluate(() => sessionStorage.getItem('vetrix.auth.token'));
    if (!token) throw new Error('The authenticated browser session did not persist its token.');
    await page.screenshot({ path: path.join(outputDir, 'live-home-phone.png'), fullPage: true });

    const petsTab = await expectOne(page.getByRole('tab', { name: 'Pets', exact: true }), 'Pets tab');
    await petsTab.click();
    await page.getByText('View clinic pet profiles and care details.', { exact: true }).waitFor();
    await page.waitForTimeout(800);
    for (const petName of ['Buddy', 'Mochi', 'Coco', 'Oreo']) {
      if (await page.getByText(petName, { exact: true }).count() < 1) {
        throw new Error(`Live pet ${petName} was not rendered.`);
      }
    }
    await page.screenshot({ path: path.join(outputDir, 'live-pets-phone.png'), fullPage: true });

    const moreTab = await expectOne(page.getByRole('tab', { name: 'More', exact: true }), 'More tab');
    await moreTab.click();
    const productsButton = await expectOne(
      page.getByRole('button', { name: 'Clinic Products. Shop products for clinic pickup', exact: true }),
      'Clinic Products button',
    );
    await productsButton.click();
    await page.getByText('Products for your pet', { exact: true }).waitFor();
    await page.getByText('58 products', { exact: true }).waitFor();
    await page.getByText('Rozitan Azithromycin Dihydrate Powder for Suspension', { exact: true }).waitFor();
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(outputDir, 'live-products-phone.png'), fullPage: false });

    const successfulApiCalls = apiResponses.filter((entry) => entry.status >= 200 && entry.status < 300);
    if (!successfulApiCalls.some((entry) => entry.url.endsWith('/login.php'))) {
      throw new Error('No successful mobile API login response was observed.');
    }
    if (!successfulApiCalls.some((entry) => entry.url.endsWith('/bootstrap.php'))) {
      throw new Error('No successful mobile API bootstrap response was observed.');
    }

    await revokeToken(token);
    token = null;
    console.log(`Live integration check passed: ${successfulApiCalls.length} successful API responses; 4 pets and 58 products rendered from Vetrix.`);
    console.log(`Screenshots: ${outputDir}`);
  } finally {
    await revokeToken(token);
    await context.close();
    await browser.close();
  }

  if (runtimeErrors.length) throw new Error(runtimeErrors.join('\n'));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
