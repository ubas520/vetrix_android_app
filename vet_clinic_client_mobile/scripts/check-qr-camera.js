// Exercises the real camera/decoder pipeline with Chromium's synthetic video source.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const http = require('node:http');
const { execFileSync } = require('node:child_process');
const { chromium } = require('playwright-core');
const QRCode = require('qrcode');

async function writeVideo(file, value) {
  const width = 640, height = 480;
  const y = Buffer.alloc(width * height, 235);
  if (value) {
    const qr = QRCode.create(value, { errorCorrectionLevel: 'M' }).modules;
    const cell = Math.floor(320 / (qr.size + 8));
    const left = Math.floor((width - qr.size * cell) / 2);
    const top = Math.floor((height - qr.size * cell) / 2);
    for (let row = 0; row < qr.size; row++) for (let col = 0; col < qr.size; col++) {
      if (qr.get(row, col)) for (let dy = 0; dy < cell; dy++) y.fill(16, (top + row * cell + dy) * width + left + col * cell, (top + row * cell + dy) * width + left + (col + 1) * cell);
    }
  }
  await fs.writeFile(file, Buffer.concat([Buffer.from(`YUV4MPEG2 W${width} H${height} F30:1 Ip A1:1 C420jpeg\nFRAME\n`), y, Buffer.alloc(width * height / 2, 128)]));
}

async function main() {
  const output = path.resolve('.visual-check/qr-camera');
  const webRoot = path.resolve('../vet_clinic');
  await fs.mkdir(output, { recursive: true });
  const fixture = execFileSync(process.env.VETRIX_PHP_PATH || 'C:/xampp/php/php.exe', ['-d', 'session.save_path=' + output, path.join(webRoot, 'tests/qr_camera_fixture.php')], { encoding: 'utf8' });
  const token = 'CAMERA+A & /?=';
  const qrVideo = path.join(output, 'qr.y4m');
  const blankVideo = path.join(output, 'blank.y4m');
  await writeVideo(qrVideo, 'https://clinic.example/vetrix/qr.php?token=' + encodeURIComponent(token));
  await writeVideo(blankVideo, '');
  const posts = [];
  const server = http.createServer(async (req, res) => {
    if (req.method === 'POST') {
      let body = '';
      for await (const chunk of req) body += chunk;
      posts.push(new URLSearchParams(body));
      res.setHeader('Content-Type', 'text/html');
      return res.end('<h1>Retrieved fixture</h1>');
    }
    const pathname = new URL(req.url, 'http://localhost').pathname;
    if (pathname === '/vetrix/staff/qr.php') { res.setHeader('Content-Type', 'text/html'); return res.end(fixture); }
    if (!pathname.startsWith('/vetrix/assets/')) { res.writeHead(404).end(); return; }
    const file = path.resolve(webRoot, pathname.slice('/vetrix/'.length));
    if (!file.startsWith(webRoot + path.sep)) { res.writeHead(403).end(); return; }
    try {
      res.setHeader('Content-Type', path.extname(file) === '.css' ? 'text/css' : 'text/javascript');
      res.end(await fs.readFile(file));
    } catch { res.writeHead(404).end(); }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${server.address().port}/vetrix/staff/qr.php`;
  const executablePath = process.env.VETRIX_BROWSER_PATH || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  let browser;
  async function launch(video) {
    return chromium.launch({ executablePath, headless: true, args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--use-file-for-fake-video-capture=' + video] });
  }
  try {
    browser = await launch(qrVideo);
    let page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const runtimeErrors = [];
    page.on('pageerror', (error) => runtimeErrors.push(error.message));
    await page.goto(url);
    await page.getByRole('button', { name: 'Scan with camera', exact: true }).click();
    await page.getByRole('heading', { name: 'Retrieved fixture' }).waitFor();
    assert.equal(posts.length, 1, 'repeated video frames submit once');
    assert.equal(posts[0].get('token'), token, 'real camera frame decodes and extracts the pet token');
    assert.ok(posts[0].get('csrf_token'), 'existing CSRF token is submitted');
    assert.equal(page.url(), url, 'scanned external URL never navigated');
    await browser.close();

    browser = await launch(blankVideo);
    page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    page.on('pageerror', (error) => runtimeErrors.push(error.message));
    await page.addInitScript(() => {
      const original = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
      navigator.mediaDevices.getUserMedia = async (...args) => {
        const stream = await original(...args);
        window.cameraTestTracks = stream.getTracks();
        return stream;
      };
    });
    await page.goto(url);
    await page.getByRole('button', { name: 'Scan with camera', exact: true }).click();
    await page.getByText('Camera ready. Hold the QR steady and keep the entire code visible.', { exact: true }).waitFor();
    await page.screenshot({ path: path.join(output, 'camera-preview.png'), fullPage: true });
    await page.getByRole('button', { name: 'Stop camera', exact: true }).click();
    assert.ok(await page.evaluate(() => window.cameraTestTracks.every((track) => track.readyState === 'ended')), 'stop releases camera hardware');
    assert.equal(await page.locator('[data-camera-preview]').isVisible(), false);
    assert.equal(await page.getByRole('button', { name: 'Scan with camera', exact: true }).isEnabled(), true);
    assert.equal(posts.length, 1, 'blank camera never submits');

    for (const [name, expected] of [
      ['NotAllowedError', 'Camera access was blocked.'],
      ['NotFoundError', 'No camera was found.'],
      ['NotReadableError', 'The camera is busy or unavailable.'],
    ]) {
      await page.evaluate((errorName) => { navigator.mediaDevices.getUserMedia = async () => { throw new DOMException('Test camera failure', errorName); }; }, name);
      await page.getByRole('button', { name: 'Scan with camera', exact: true }).click();
      await page.getByRole('status').filter({ hasText: expected }).waitFor();
      assert.equal(await page.getByRole('button', { name: 'Scan with camera', exact: true }).isEnabled(), true);
      assert.equal(await page.getByRole('button', { name: 'Retrieve record', exact: true }).isEnabled(), true);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: path.join(output, 'camera-unavailable-phone.png'), fullPage: true });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'phone layout fits');

    // Cancelling a permission prompt must release a stream that resolves later.
    await page.evaluate(() => {
      navigator.mediaDevices.getUserMedia = () => new Promise((resolve) => { window.resolveTestCamera = resolve; });
    });
    await page.getByRole('button', { name: 'Scan with camera', exact: true }).click();
    await page.getByRole('button', { name: 'Stop camera', exact: true }).click();
    await page.evaluate(() => {
      const canvas = document.createElement('canvas');
      const late = canvas.captureStream();
      window.cameraTestTracks = late.getTracks();
      window.resolveTestCamera(late);
    });
    assert.ok(await page.evaluate(() => window.cameraTestTracks.every((track) => track.readyState === 'ended')), 'cancelled permission request releases late stream');

    const insecure = await browser.newPage();
    await insecure.route('http://camera.test/**', async (route) => {
      const resource = new URL(route.request().url());
      const local = new URL(url);
      resource.host = local.host;
      await route.fulfill({ response: await route.fetch({ url: resource.href }) });
    });
    await insecure.goto('http://camera.test/vetrix/staff/qr.php');
    assert.equal(await insecure.evaluate(() => window.isSecureContext), false);
    await insecure.getByRole('button', { name: 'Scan with camera', exact: true }).click();
    await insecure.getByRole('status').filter({ hasText: 'Camera access needs HTTPS or localhost.' }).waitFor();
    assert.equal(await insecure.getByRole('link', { name: 'open Vetrix on localhost' }).getAttribute('href'), 'http://localhost/vetrix/staff/qr.php');
    assert.deepEqual(runtimeErrors, []);
    console.log('Passed camera checks: real video QR decoding, automatic protected form submission, stop/release, permission denied, missing/busy camera, late permission cancellation, insecure HTTP guidance, and phone layout.');
  } finally {
    if (browser) await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
}
module.exports = { writeVideo };
if (require.main === module) main().catch((error) => { console.error(error); process.exitCode = 1; });
