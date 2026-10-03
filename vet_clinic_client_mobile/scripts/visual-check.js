const fs = require('fs/promises');
const path = require('path');
const { chromium } = require('playwright-core');

const baseUrl = process.env.VETRIX_URL || 'http://127.0.0.1:8080';
const outputDir = path.join(process.cwd(), '.visual-check');
const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

async function waitForArtwork(page) {
  await page.waitForFunction(() =>
    Array.from(document.images).every((image) => image.complete && image.naturalWidth > 0),
  );
  await page.waitForTimeout(450);
}

async function settle(page) {
  await waitForArtwork(page);
  await page.waitForTimeout(350);
}

async function assertNoHorizontalOverflow(page, label) {
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));

  if (dimensions.scrollWidth > dimensions.clientWidth + 1) {
    throw new Error(`${label} has horizontal overflow: ${dimensions.scrollWidth}px > ${dimensions.clientWidth}px`);
  }
}

async function signIn(page) {
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.getByText('Welcome back!', { exact: true }).waitFor();
  await settle(page);
  await page.getByRole('button', { name: 'Login', exact: true }).click();
  await page.getByText('Needs Action', { exact: true }).waitFor();
  await settle(page);
}

async function capturePhone(browser, runtimeErrors) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  page.on('console', (message) => {
    if (message.type() === 'error') runtimeErrors.push(`console: ${message.text()}`);
  });
  page.on('pageerror', (error) => runtimeErrors.push(`page: ${error.message}`));

  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.getByText('Welcome back!', { exact: true }).waitFor();
  await settle(page);
  await assertNoHorizontalOverflow(page, 'Login');
  await page.screenshot({ path: path.join(outputDir, 'login-phone.png'), fullPage: true });

  await page.getByRole('button', { name: 'Login', exact: true }).click();
  await page.getByText('Needs Action', { exact: true }).waitFor();
  await settle(page);
  await assertNoHorizontalOverflow(page, 'Home');
  await page.screenshot({ path: path.join(outputDir, 'home-phone.png'), fullPage: true });

  await page.getByText('Clinic Directions', { exact: true }).click();
  await page.getByText('Find the best road to the clinic', { exact: true }).waitFor();
  const startingAddress = page.getByLabel('Starting address', { exact: true });
  if (await startingAddress.inputValue() !== 'Barangay San Isidro, Quezon City') {
    throw new Error('Expected the saved profile address to prefill clinic directions.');
  }
  await startingAddress.fill('');
  await page.getByRole('button', { name: 'Open suggested route', exact: true }).click();
  await page.getByText('Enter a complete starting address.', { exact: true }).waitFor();
  await page.getByRole('checkbox').click();
  if (await startingAddress.isEditable()) throw new Error('Starting address should be disabled when current location is selected.');
  await page.getByRole('radio', { name: 'Walking', exact: true }).click();
  await settle(page);
  await assertNoHorizontalOverflow(page, 'Clinic directions');
  await page.screenshot({ path: path.join(outputDir, 'clinic-directions-phone.png'), fullPage: true });
  await page.getByLabel('Go back').click();
  await page.getByText('Needs Action', { exact: true }).waitFor();

  await page.getByRole('button', { name: 'Open Clinic Products', exact: true }).click();
  await page.getByText('Products for your pet', { exact: true }).waitFor();
  await page.getByText('₱350.00', { exact: true }).waitFor();
  await page.getByText('Limited stock', { exact: true }).waitFor();
  const productSearch = page.getByLabel('Search products', { exact: true });
  await productSearch.fill('shampoo');
  await page.getByText('Pet Shampoo', { exact: true }).waitFor();
  if (await page.getByText('Rabies Vaccine', { exact: true }).count() !== 0) throw new Error('Product search did not filter the catalog.');
  await productSearch.fill('not a product');
  await page.getByText('No products found', { exact: true }).waitFor();
  await productSearch.fill('');
  await page.getByRole('button', { name: 'Vaccines', exact: true }).click();
  if (await page.getByText('Pet Shampoo', { exact: true }).count() !== 0) throw new Error('Product category filter did not hide grooming products.');
  await page.getByRole('button', { name: 'All', exact: true }).click();
  await page.getByText('Pet Shampoo', { exact: true }).waitFor();
  await settle(page);
  await assertNoHorizontalOverflow(page, 'Product catalog');
  await page.screenshot({ path: path.join(outputDir, 'product-catalog-phone.png'), fullPage: true });
  await page.getByLabel('Go back').click();
  await page.getByText('Needs Action', { exact: true }).waitFor();

  await page.getByRole('tab', { name: 'Pets', exact: true }).click();
  await page.getByText('Manage pet profiles and care details.', { exact: true }).waitFor();
  await page.getByText('Add Pet', { exact: true }).click();
  await page.getByText('Pet basics', { exact: true }).waitFor();
  await settle(page);
  await assertNoHorizontalOverflow(page, 'Pet form');
  await page.screenshot({ path: path.join(outputDir, 'pet-form-phone.png'), fullPage: true });

  await page.getByText('Close', { exact: true }).click();
  const requestChangeButtons = page.getByRole('button', { name: 'Request Changes', exact: true });
  if (await requestChangeButtons.count() !== 3) throw new Error('Expected three pet change request buttons.');
  await requestChangeButtons.nth(0).click();
  await page.getByText('Request Changes: Buddy', { exact: true }).waitFor();
  await page.getByLabel('Color / markings', { exact: true }).fill('Golden coat with white chest');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByText('Health and care', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByText('Photo and review', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Request changes', exact: true }).click();
  await page.getByText('Pending Pet Edit Requests', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'View pending changes for Buddy', exact: true }).click();
  await page.getByText('Request Details', { exact: true }).waitFor();
  await page.getByText('Close', { exact: true }).click();
  await page.getByText('Current approved', { exact: true }).locator('..').getByText('Golden coat', { exact: true }).waitFor();
  await page.getByText('Requested', { exact: true }).locator('..').getByText('Golden coat with white chest', { exact: true }).waitFor();
  await settle(page);
  await assertNoHorizontalOverflow(page, 'Pet edit request details');
  await page.screenshot({ path: path.join(outputDir, 'pet-edit-request-details-phone.png'), fullPage: true });
  await page.getByLabel('Go back').click();
  await page.getByText('Pending Pet Edit Requests', { exact: true }).waitFor();

  await page.getByRole('tab', { name: 'Book', exact: true }).click();
  await page.getByText('Request Now', { exact: true }).click();
  await page.getByText('Pet and service', { exact: true }).waitFor();
  await settle(page);
  await assertNoHorizontalOverflow(page, 'Appointment form');
  await page.screenshot({ path: path.join(outputDir, 'booking-phone.png'), fullPage: true });

  await page.getByRole('tab', { name: 'Records', exact: true }).click();
  await page.getByText('View your pet\'s medical and vaccination history.', { exact: true }).waitFor();
  await settle(page);
  await assertNoHorizontalOverflow(page, 'Records');
  await page.screenshot({ path: path.join(outputDir, 'records-phone.png'), fullPage: true });

  await page.getByRole('tab', { name: 'More', exact: true }).click();
  await page.getByRole('button', { name: 'Clinic Products. Shop products for clinic pickup', exact: true }).click();
  await page.getByText('Products for your pet', { exact: true }).waitFor();
  await page.getByLabel('Go back').click();
  await page.getByText('Account tools and helpful shortcuts.', { exact: true }).waitFor();
  await page.getByText('Settings', { exact: true }).click();
  await page.getByText('Preferences', { exact: true }).waitFor();
  const switches = page.getByRole('switch');
  if (await switches.count() !== 3) throw new Error('Expected three settings switches.');
  await switches.nth(0).click();
  await settle(page);
  await assertNoHorizontalOverflow(page, 'Dark settings');
  await page.screenshot({ path: path.join(outputDir, 'settings-dark-phone.png'), fullPage: true });

  await page.getByLabel('Go back').click();
  await page.getByRole('tab', { name: 'Home', exact: true }).click();
  await page.getByText('Needs Action', { exact: true }).waitFor();
  await settle(page);
  await page.screenshot({ path: path.join(outputDir, 'home-dark-phone.png'), fullPage: true });

  await page.getByRole('button', { name: 'Open Clinic Products', exact: true }).click();
  await page.getByText('Products for your pet', { exact: true }).waitFor();
  await settle(page);
  await assertNoHorizontalOverflow(page, 'Dark product catalog');
  await page.screenshot({ path: path.join(outputDir, 'product-catalog-dark-phone.png'), fullPage: true });

  await context.close();
}

async function captureDesktop(browser, runtimeErrors) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  page.on('console', (message) => {
    if (message.type() === 'error') runtimeErrors.push(`desktop console: ${message.text()}`);
  });
  page.on('pageerror', (error) => runtimeErrors.push(`desktop page: ${error.message}`));

  await signIn(page);
  await assertNoHorizontalOverflow(page, 'Desktop Home');
  const shellWidth = await page.locator('#root > div > div > div').evaluate((element) => element.getBoundingClientRect().width);
  if (shellWidth > 481) throw new Error(`Desktop app shell is ${shellWidth}px wide; expected at most 480px`);
  await page.screenshot({ path: path.join(outputDir, 'home-desktop.png'), fullPage: true });
  await context.close();
}

async function main() {
  await fs.rm(outputDir, { recursive: true, force: true });
  await fs.mkdir(outputDir, { recursive: true });
  const runtimeErrors = [];
  const browser = await chromium.launch({ executablePath: edgePath, headless: true });

  try {
    await capturePhone(browser, runtimeErrors);
    await captureDesktop(browser, runtimeErrors);
  } finally {
    await browser.close();
  }

  if (runtimeErrors.length) throw new Error(runtimeErrors.join('\n'));
  console.log(`Visual checks passed. Screenshots: ${outputDir}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
