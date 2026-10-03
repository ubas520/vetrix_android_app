const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../src/api/apiClient.js'), 'utf8')
  .replace(/^import .*;\r?\n/gm, '')
  .replace(/^export /gm, '');
let response;
const sandbox = { buildApiUrl: (url) => url, clearStoredToken: async () => {}, fetch: async () => response, AbortController, setTimeout, clearTimeout };
vm.createContext(sandbox);
vm.runInContext(source + '\nthis.request = apiRequest;', sandbox);

(async () => {
  response = new Response('<!DOCTYPE HTML><h1>404 Not Found</h1>', { status: 404 });
  await assert.rejects(sandbox.request('missing.php', { auth: false }), (error) => error.status === 404 && error.message.includes('unavailable') && !error.message.includes('<'));
  response = new Response('<html>Sign in again</html>', { status: 200 });
  await assert.rejects(sandbox.request('redirect.php', { auth: false }), (error) => error.code === 'INVALID_RESPONSE' && !error.message.includes('<'));
  response = new Response(JSON.stringify({ success: false, message: 'Enter a valid email.', errors: { email: 'Invalid email' } }), { status: 422 });
  await assert.rejects(sandbox.request('password_reset.php', { auth: false }), (error) => error.message === 'Enter a valid email.' && error.fieldErrors.email === 'Invalid email');
  response = new Response(JSON.stringify({ success: true, data: { status: 'pending' } }), { status: 200 });
  assert.equal((await sandbox.request('password_reset.php', { auth: false })).data.status, 'pending');
  console.log('PASS: HTML 404, HTML 200, JSON validation errors, pending approval response');
})().catch((error) => { console.error(error); process.exitCode = 1; });
