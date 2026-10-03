// Run after exporting web to .expo-export-check/ui-refresh. All API traffic is mocked.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright-core');

const exportDir = path.resolve('.expo-export-check/ui-refresh');
const outputDir = path.resolve('.visual-check/ui-refresh');
const browserPath = process.env.VETRIX_BROWSER_PATH || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const user = { id: 9001, name: 'Demo Client', email: 'ui-test@example.test', phone: '09123456789' };
function dateAfter(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
const pet = { id: 1, name: 'Rolo', species: 'Dog', breed: 'Mixed breed', gender: 'Male', status: 'Approved', birthDate: '2022-01-01', weight: '8 kg', color: 'Brown', allergies: 'None', criticalNotes: 'None', notes: 'Gentle and friendly', registeredDate: '2025-01-01' };
const fixture = {
  profile: user,
  pets: [pet, { ...pet, id: 2, name: 'Luna', species: 'Cat', breed: 'Domestic shorthair', status: 'Pending' }],
  appointments: [{ id: 7, petId: 1, petName: 'Rolo', requestedDateTime: `${dateAfter(2)}T09:30:00`, status: 'Approved', serviceType: 'Wellness Checkup' }],
  vaccinationRecords: [{ id: 8, petId: 1, petName: 'Rolo', vaccineName: 'Rabies', nextDueDate: dateAfter(-1), dateGiven: '2025-01-01' }],
  editRequests: [{ id: 9, petId: 1, petName: 'Rolo', status: 'Pending', changes: [{ label: 'Weight', field: 'weight', currentDisplayValue: '8 kg', requestedDisplayValue: '9 kg' }] }],
  medicalRecords: [], notifications: [], products: [],
};

async function main() {
  await fs.mkdir(outputDir, { recursive: true });
  const statusSource = await fs.readFile('src/utils/careStatus.js', 'utf8');
  const { getVaccineStatus, getPetStatusLabel } = await import(`data:text/javascript;base64,${Buffer.from(statusSource).toString('base64')}`);
  const today = new Date(2026, 8, 6, 18);
  assert.equal(getVaccineStatus('2026-09-05', today), 'Overdue');
  assert.equal(getVaccineStatus('2026-09-06', today), 'Due soon');
  assert.equal(getVaccineStatus('2026-10-06', today), 'Due soon');
  assert.equal(getVaccineStatus('2026-10-07', today), 'Upcoming');
  assert.equal(getVaccineStatus('', today), 'No due date');
  assert.equal(getVaccineStatus('invalid', today), 'No due date');
  assert.equal(getPetStatusLabel('Pending'), 'Waiting for clinic');
  assert.equal(getPetStatusLabel('Rejected'), 'Rejected');

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
    browser = await chromium.launch({ executablePath: browserPath, headless: true });
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    const runtimeErrors = [];
    const appointmentBodies = [];
    const editBodies = [];
    let loginAttempts = 0;
    let bootstrapAttempts = 0;
    page.on('pageerror', (error) => runtimeErrors.push(error.message));
    await page.route('**/api/mobile/v1/**', async (route) => {
      const endpoint = new URL(route.request().url()).pathname.split('/').pop();
      const reply = (data, status = 200) => route.fulfill({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(data) });
      if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET,POST,PATCH,OPTIONS', 'access-control-allow-headers': 'authorization,content-type' } });
      if (endpoint === 'login.php') {
        loginAttempts++;
        if (loginAttempts === 1) return route.abort('failed');
        return reply({ success: true, data: { user, access_token: 'ui-test-only-token' } });
      }
      if (endpoint === 'me.php') return reply({ success: true, data: { user } });
      if (endpoint === 'bootstrap.php') {
        bootstrapAttempts++;
        if (bootstrapAttempts === 1) return reply({ message: 'Clinic data is temporarily unavailable.' }, 503);
        return reply({ success: true, data: fixture });
      }
      if (endpoint === 'appointments.php') {
        appointmentBodies.push(route.request().postDataJSON());
        if (appointmentBodies.length === 1) return route.abort('failed');
        return reply({ success: true, data: { appointment: { ...fixture.appointments[0], id: 10, status: 'Pending' } } });
      }
      if (endpoint === 'pet_edit_requests.php') {
        editBodies.push(route.request().postDataJSON());
        if (editBodies.length === 1) return route.abort('failed');
        return reply({ success: true, data: { edit_requests: fixture.editRequests } });
      }
      return reply({ success: true, data: {} });
    });
    const screenshot = async (name) => {
      await page.evaluate(() => document.fonts.ready);
      // Allow the 240 ms reveal and tab transition to finish before capturing.
      await page.waitForTimeout(350);
      await page.screenshot({ path: path.join(outputDir, name + '.png'), fullPage: true });
      const dimensions = await page.evaluate(() => ({ width: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
      assert.ok(dimensions.scroll <= dimensions.width + 1, name + ' overflows horizontally');
    };
    await page.goto(`http://127.0.0.1:${server.address().port}`, { waitUntil: 'networkidle' });
    await page.getByLabel('Email', { exact: true }).fill(user.email);
    await page.getByLabel('Password', { exact: true }).fill('ui-test-password');
    await page.getByRole('button', { name: 'Login', exact: true }).click();
    await page.getByRole('button', { name: 'Try Again', exact: true }).waitFor();
    assert.equal(await page.getByLabel('Email', { exact: true }).inputValue(), user.email);
    assert.equal(await page.getByLabel('Password', { exact: true }).inputValue(), 'ui-test-password');
    await screenshot('login-retry');
    await page.getByRole('button', { name: 'Try Again', exact: true }).click();
    await page.getByText('Clinic data is temporarily unavailable.', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Try Again', exact: true }).click();
    await page.getByText('Next Appointment', { exact: true }).waitFor();
    const bookButton = page.getByRole('button', { name: 'Book a Visit', exact: true });
    const bookBox = await bookButton.boundingBox();
    assert.ok(bookBox.y + bookBox.height < 500, 'Booking should be visible near the top of Home');
    await screenshot('home-phone');

    await page.getByRole('tab', { name: 'Pets', exact: true }).click();
    assert.equal(await page.getByRole('button', { name: 'Pet Edit Requests', exact: true }).getAttribute('aria-expanded'), 'false');
    assert.equal(await page.getByText('Allergies', { exact: true }).count(), 0);
    assert.equal(await page.getByRole('button', { name: 'View Profile', exact: true }).count(), 2);
    await page.getByText('Waiting for clinic', { exact: true }).first().waitFor();
    await screenshot('pets-phone');
    await page.getByRole('button', { name: 'View Profile', exact: true }).first().click();
    await page.getByText('Allergies', { exact: true }).waitFor();
    await page.getByText('Gentle and friendly', { exact: true }).waitFor();
    await page.getByLabel('Go back', { exact: true }).click();
    await page.getByRole('button', { name: 'Pet Edit Requests', exact: true }).click();
    await page.getByRole('button', { name: 'View pending changes for Rolo', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Pet Edit Requests', exact: true }).click();

    await page.getByRole('tab', { name: 'Home', exact: true }).click();
    await bookButton.click();
    await page.getByText('Pet and service', { exact: true }).waitFor();
    assert.equal(await page.getByText('Completed visits', { exact: true }).count(), 0);
    await screenshot('booking-phone');
    const continueBox = await page.getByRole('button', { name: 'Continue', exact: true }).boundingBox();
    const tabsBox = await page.getByRole('tab', { name: 'Home', exact: true }).boundingBox();
    assert.ok(continueBox.y + continueBox.height <= tabsBox.y, 'Continue overlaps navigation');
    assert.ok(continueBox.y > 500, 'Continue should stay near the bottom');
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    const preferredDate = await page.getByLabel('Date', { exact: true }).inputValue();
    await page.getByRole('button', { name: 'Review Request', exact: true }).click();
    await page.getByLabel('Reason for visit', { exact: true }).fill('Annual wellness visit');
    await page.getByRole('button', { name: 'Send Request', exact: true }).click();
    await page.getByRole('button', { name: 'Try Again', exact: true }).waitFor();
    assert.equal(await page.getByLabel('Reason for visit', { exact: true }).inputValue(), 'Annual wellness visit');
    await screenshot('booking-retry');
    await page.getByRole('button', { name: 'Try Again', exact: true }).click();
    await page.getByText('My Appointment Timeline', { exact: true }).waitFor();
    assert.equal(appointmentBodies.length, 2);
    assert.deepEqual(appointmentBodies[0], appointmentBodies[1]);
    assert.ok(JSON.stringify(appointmentBodies[1]).includes(preferredDate));

    await page.getByRole('tab', { name: 'Pets', exact: true }).click();
    await page.getByRole('button', { name: 'Request Changes', exact: true }).click();
    await page.getByLabel('Color / markings', { exact: true }).fill('Brown with white markings');
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await page.getByRole('button', { name: 'Request changes', exact: true }).click();
    await page.getByRole('button', { name: 'Try Again', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Try Again', exact: true }).click();
    await page.getByRole('button', { name: 'Request Changes', exact: true }).waitFor();
    assert.equal(editBodies.length, 2);
    assert.deepEqual(editBodies[0], editBodies[1]);

    await page.setViewportSize({ width: 320, height: 740 });
    await screenshot('pets-small');
    await page.getByRole('tab', { name: 'Home', exact: true }).click();
    await screenshot('home-small');
    await page.getByRole('tab', { name: 'More', exact: true }).click();
    await page.getByRole('button', { name: 'Settings. Appearance and reminders', exact: true }).click();
    const switches = page.getByRole('switch');
    assert.equal(await switches.count(), 3);
    await switches.nth(0).click();
    await page.getByLabel('Go back', { exact: true }).click();
    await page.getByRole('tab', { name: 'Home', exact: true }).click();
    await screenshot('home-dark-small');
    assert.deepEqual(runtimeErrors, []);
    console.log('UI checks passed: status dates, login/data retries, compact pets, booking controls, preserved booking/edit payloads, small screens, dark mode.');
    await context.close();
  } finally {
    if (browser) await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
