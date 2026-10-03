// Run after exporting web to .expo-export-check/visit-ratings. API responses are fixtures.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright-core');
const root = path.resolve('.expo-export-check/visit-ratings');
const output = path.resolve('.visual-check/visit-ratings');
const user = { id: 9001, name: 'Rating Test', email: 'rating@example.test' };
const visit = { id: 71, petId: 1, petName: 'Rolo', status: 'Completed', serviceType: 'Wellness Checkup', requestedDateTime: '2026-09-01T09:30:00' };
const fixture = { profile: user, pets: [{ id: 1, name: 'Rolo', species: 'Dog', status: 'Approved' }], appointments: [visit, { ...visit, id: 72, status: 'Pending' }, { ...visit, id: 73, status: 'Approved' }, { ...visit, id: 74, status: 'Cancelled' }], notifications: [], medicalRecords: [], vaccinationRecords: [], editRequests: [], products: [] };
async function main() {
  await fs.mkdir(output, { recursive: true });
  const server = http.createServer(async (req, res) => {
    const file = path.resolve(root, '.' + new URL(req.url, 'http://localhost').pathname);
    if (file !== root && !file.startsWith(root + path.sep)) return res.writeHead(403).end();
    const target = file === root ? path.join(root, 'index.html') : file;
    try {
      res.setHeader('Content-Type', ({ '.html': 'text/html', '.js': 'text/javascript', '.ttf': 'font/ttf', '.png': 'image/png' })[path.extname(target)] || 'application/octet-stream');
      res.end(await fs.readFile(target));
    } catch { res.writeHead(404).end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({ executablePath: process.env.VETRIX_BROWSER_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const errors = [];
    const submissions = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.route('**/api/mobile/v1/**', async route => {
      const endpoint = new URL(route.request().url()).pathname.split('/').pop();
      const reply = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(body) });
      if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET,POST,PATCH,OPTIONS', 'access-control-allow-headers': 'authorization,content-type' } });
      if (endpoint === 'login.php') return reply({ success: true, data: { user, access_token: 'rating-fixture-token' } });
      if (endpoint === 'me.php') return reply({ success: true, data: { user } });
      if (endpoint === 'bootstrap.php') return reply({ success: true, data: fixture });
      if (endpoint === 'feedback.php') {
        const body = route.request().postDataJSON();
        submissions.push(body);
        if (submissions.length === 1) return reply({ success: false, message: 'Please try again. Your connection was interrupted.' }, 503);
        visit.feedback = { id: 501, ...body, created_at: '2026-09-14 12:00:00' };
        return reply({ success: true, data: { feedback: visit.feedback } });
      }
      return reply({ success: true, data: {} });
    });
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.getByLabel('Email', { exact: true }).fill(user.email);
    await page.getByLabel('Password', { exact: true }).fill('fixture-only');
    await page.getByRole('button', { name: 'Login', exact: true }).click();
    await page.getByRole('tab', { name: /Book/ }).click();
    const rate = page.getByRole('button', { name: 'Rate your visit', exact: true });
    await rate.waitFor();
    assert.equal(await rate.count(), 1, 'only completed unrated visits offer rating');
    await rate.click();
    const submit = page.getByRole('button', { name: 'Submit rating', exact: true });
    assert.equal(await submit.isEnabled(), false, 'must select stars');
    await page.getByRole('radio', { name: '5 stars, Excellent', exact: true }).click();
    assert.equal(await submit.isEnabled(), true, 'comment is optional');
    const comment = page.getByLabel('Comment (optional)', { exact: true });
    await comment.fill('Kind and helpful staff.');
    await page.waitForTimeout(350);
    await page.screenshot({ path: path.join(output, 'rating-phone.png') });
    await submit.click();
    await page.getByRole('alert').filter({ hasText: 'Please try again.' }).waitFor();
    assert.equal(await comment.inputValue(), 'Kind and helpful staff.', 'failed submission retains comment');
    assert.equal(await page.getByRole('radio', { name: '5 stars, Excellent', exact: true }).getAttribute('aria-checked'), 'true');
    await submit.click();
    await page.getByLabel('Your rating: 5 out of 5 stars', { exact: true }).waitFor();
    assert.equal(await rate.count(), 0, 'rating replaces button');
    assert.deepEqual(submissions[0], submissions[1], 'retry preserves payload');
    assert.deepEqual(submissions[1], { appointment_id: 71, rating: 5, comment: 'Kind and helpful staff.' });
    await page.reload();
    await page.getByRole('tab', { name: /Book/ }).click();
    await page.getByLabel('Your rating: 5 out of 5 stars', { exact: true }).waitFor();
    assert.equal(await rate.count(), 0, 'saved rating persists after reload');
    await page.getByLabel('Your rating: 5 out of 5 stars', { exact: true }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(output, 'saved-rating-phone.png') });
    // Reopen an unrated visit in dark mode and at a smaller phone width.
    delete visit.feedback;
    await page.reload();
    await page.getByRole('tab', { name: 'More', exact: true }).click();
    await page.getByText('Settings', { exact: true }).click();
    await page.getByRole('switch').first().check();
    await page.getByLabel('Go back', { exact: true }).click();
    await page.getByRole('tab', { name: /Book/ }).click();
    await rate.click();
    await page.setViewportSize({ width: 320, height: 640 });
    await page.getByRole('radio', { name: '1 star, Poor', exact: true }).click();
    await page.waitForTimeout(350);
    await page.screenshot({ path: path.join(output, 'rating-dark-small-phone.png') });
    const box = await submit.boundingBox();
    assert.ok(box.x >= 0 && box.x + box.width <= 320 && box.y + box.height <= 640, 'submit stays visible on small phone');
    await page.getByRole('button', { name: 'Not now', exact: true }).click();
    assert.equal(submissions.length, 2, 'dismiss does not submit');
    assert.deepEqual(errors, [], 'no browser runtime errors');
    console.log('PASS: completed-only rating, required stars, optional comment, failure recovery, saved state, reload, no runtime errors');
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
}
main().catch(e => { console.error(e); process.exitCode = 1; });
