// Run after exporting web to .expo-export-check/pet-qr. Uses synthetic API data.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright-core');
const { PNG } = require('pngjs');
const jsQR = require('jsqr');

const exportDir = path.resolve('.expo-export-check/pet-qr');
const outputDir = path.resolve('.visual-check/pet-qr');
const user = { id: 9001, name: 'QR Test Owner', email: 'qr-test@example.test' };
const pet = { id: 1, name: 'Rolo', species: 'Dog', breed: 'Mixed', status: 'Approved', weight: '8 kg' };
const fixture = {
  profile: user,
  pets: [pet, { ...pet, id: 2, name: 'Mochi' }, { ...pet, id: 3, name: 'Luna', status: 'Pending' }, { ...pet, id: 4, name: 'Milo' }],
  qr_tokens: [{ pet_id: 1, token: 'ROLO-QR-TEST' }, { pet_id: 2, token: 'MOCHI+A & /?=' }],
  appointments: [], medicalRecords: [], vaccinationRecords: [], notifications: [], products: [],
};

async function main() {
  await fs.mkdir(outputDir, { recursive: true });
  const server = http.createServer(async (request, response) => {
    const file = path.resolve(exportDir, '.' + new URL(request.url, 'http://localhost').pathname);
    if (file !== exportDir && !file.startsWith(exportDir + path.sep)) { response.writeHead(403).end(); return; }
    const target = file === exportDir ? path.join(exportDir, 'index.html') : file;
    const types = { '.html': 'text/html', '.js': 'text/javascript', '.ttf': 'font/ttf', '.png': 'image/png', '.jpg': 'image/jpeg' };
    try { response.setHeader('Content-Type', types[path.extname(target)] || 'application/octet-stream'); response.end(await fs.readFile(target)); }
    catch { response.writeHead(404).end(); }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({ executablePath: process.env.VETRIX_BROWSER_PATH || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', headless: true });
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    const errors = [];
    let apiBase;
    page.on('pageerror', (error) => errors.push(error.message));
    await context.route('**/api/mobile/v1/**', async (route) => {
      const url = new URL(route.request().url());
      apiBase = url.origin + url.pathname.slice(0, url.pathname.lastIndexOf('/'));
      const endpoint = url.pathname.split('/').pop();
      const headers = { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS', 'access-control-allow-headers': 'authorization,content-type' };
      if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
      const data = endpoint === 'login.php' ? { user, access_token: 'qr-ui-test-only' } : endpoint === 'bootstrap.php' ? fixture : { user };
      return route.fulfill({ headers, contentType: 'application/json', body: JSON.stringify({ success: true, data }) });
    });
    await page.goto(`http://127.0.0.1:${server.address().port}`, { waitUntil: 'networkidle' });
    await page.getByLabel('Email', { exact: true }).fill(user.email);
    await page.getByLabel('Password', { exact: true }).fill('qr-ui-test-password');
    await page.getByRole('button', { name: 'Login', exact: true }).click();
    await page.getByRole('tab', { name: 'More', exact: true }).click();
    await page.getByRole('button', { name: /QR Pet Retrieval/ }).click();

    async function decode(name, token) {
      const qr = page.getByTestId('pet-retrieval-qr');
      await qr.waitFor({ state: 'visible' });
      const png = PNG.sync.read(await qr.screenshot({ path: path.join(outputDir, name + '-code.png') }));
      const decoded = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
      assert.ok(decoded, name + ': QR must decode from the rendered screen');
      const url = new URL(decoded.data);
      assert.match(url.protocol, /^https?:$/);
      assert.ok(url.pathname.endsWith('/qr.php'));
      assert.equal(url.searchParams.get('token'), token, name + ': selected pet token');
      const expectedBase = (process.env.EXPO_PUBLIC_VETRIX_WEBSITE_URL || apiBase.replace(/\/api\/mobile\/v1$/, '')).replace(/\/+$/, '');
      assert.equal(decoded.data, expectedBase + '/qr.php?token=' + encodeURIComponent(token));
      return decoded.data;
    }

    await decode('rolo-phone', 'ROLO-QR-TEST');
    await page.screenshot({ path: path.join(outputDir, 'retrieval-phone.png'), fullPage: true });
    await page.getByText('Mochi', { exact: true }).first().click();
    await decode('mochi-phone', 'MOCHI+A & /?=');
    await page.getByText('Luna', { exact: true }).first().click();
    await page.getByText('QR unavailable', { exact: true }).waitFor();
    assert.equal(await page.getByTestId('pet-retrieval-qr').count(), 0, 'pending pet has no QR');
    assert.equal(await page.getByRole('button', { name: 'Open web record', exact: true }).count(), 0);
    await page.getByText('Milo', { exact: true }).first().click();
    await page.getByText('This pet has no active QR code. Contact the clinic to activate one.', { exact: true }).waitFor();
    assert.equal(await page.getByTestId('pet-retrieval-qr').count(), 0, 'missing token has no QR');
    await page.getByText('Rolo', { exact: true }).first().click();
    await page.setViewportSize({ width: 320, height: 740 });
    await decode('rolo-narrow', 'ROLO-QR-TEST');
    const dimensions = await page.evaluate(() => ({ width: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
    assert.ok(dimensions.scroll <= dimensions.width + 1, 'QR screen does not overflow narrow phone');
    await page.getByLabel('Go back', { exact: true }).click();
    await page.getByRole('tab', { name: 'Pets', exact: true }).click();
    await page.getByRole('button', { name: 'View Profile', exact: true }).first().click();
    await decode('pet-details-narrow', 'ROLO-QR-TEST');
    await page.screenshot({ path: path.join(outputDir, 'pet-details-phone.png'), fullPage: true });
    assert.deepEqual(errors, [], 'no browser runtime errors');
    console.log('Passed: camera-decodable QRs on both screens, pet switching, encoded web addresses, pending/no-token states, and narrow phone layout.');
  } finally {
    if (browser) await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
