// Uses only the disposable database created by product_orders_test.php --keep.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const http = require('node:http');
const { spawn } = require('node:child_process');
const { chromium, request } = require('playwright-core');
const database = process.env.VETRIX_ORDER_TEST_DB;
if (!/^vetrix_orders_test_[a-f0-9]{10}$/.test(database || '')) throw new Error('Set VETRIX_ORDER_TEST_DB to the isolated integration-test database.');
const root = path.resolve(__dirname, '..');
const backend = process.env.VETRIX_TEST_BACKEND || path.resolve(root, '../vet_clinic');
const modern = process.env.VETRIX_TEST_MODERN === '1';
const bundle = path.resolve(root, '.expo-export-check/product-orders');
const output = path.resolve(root, '.visual-check/product-orders');
const apiBase = 'http://127.0.0.1:8091';
const appBase = 'http://127.0.0.1:8089';
require('node:fs').mkdirSync(path.join(root,'.tmp'), {recursive:true});
const php = spawn(process.env.VETRIX_PHP || 'C:/xampp/php/php.exe', ['-d',`upload_tmp_dir="${path.join(root,'.tmp').replaceAll('\\','/')}"`,'-d','session.save_path=' + path.join(root,'.tmp').replaceAll(String.fromCharCode(92),'/'),'-d','upload_max_filesize=6M','-d','post_max_size=8M','-S','127.0.0.1:8091','-t',backend], { windowsHide: true, env: { ...process.env, VETRIX_DB_NAME: database }, stdio: ['ignore','pipe','pipe'] });
let serverErrors = '';
php.stderr.on('data', chunk => { serverErrors += chunk.toString(); });
const staticServer = http.createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, appBase).pathname);
    const target = path.resolve(bundle, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!target.startsWith(bundle + path.sep)) { res.writeHead(403).end(); return; }
    const data = await fs.readFile(target);
    const ext = path.extname(target);
    res.setHeader('Content-Type', ({ '.html':'text/html', '.js':'application/javascript', '.css':'text/css', '.png':'image/png', '.ttf':'font/ttf' })[ext] || 'application/octet-stream');
    res.end(data);
  } catch { res.writeHead(404).end(); }
});
let browser; let api; let staff;
async function main() {
  await fs.mkdir(output, { recursive: true });
  await new Promise(resolve => staticServer.listen(8089, '127.0.0.1', resolve));
  api = await request.newContext({ baseURL: apiBase });
  for (let attempt=0; attempt<20; attempt++) {
    try { await api.get('/api/mobile/v1/orders.php'); break; }
    catch { await new Promise(resolve => setTimeout(resolve, 100)); }
  }
  assert.equal((await api.get('/api/mobile/v1/orders.php')).status(), 401);
  const login = await api.post('/api/mobile/v1/login.php', { data: { email:'client@vetclinic.test', password:'OrderTest123!' } });
  assert.equal(login.status(),200,await login.text());
  const auth = (await login.json()).data;
  const token = auth.token || auth.access_token;
  assert.ok(token, 'Login returns token');
  const headers = { Authorization: `Bearer ${token}` };
  const boot = await api.get('/api/mobile/v1/bootstrap.php', { headers });
  assert.equal(boot.status(),200,await boot.text());
  const bootstrap = (await boot.json()).data;
  const input = { payment_method:'clinic', request_key:'http_test_' + Date.now(), items:[{product_id:1,quantity:1,unit_price_centavos:12550}] };
  const created = await api.post('/api/mobile/v1/orders.php',{headers,data:input});
  assert.equal(created.status(),201,await created.text());
  const order = (await created.json()).data.order;
  const retry = await api.post('/api/mobile/v1/orders.php',{headers,data:input});
  assert.equal((await retry.json()).data.order.id,order.id,'HTTP retry is idempotent');
  const otherLogin = await api.post('/api/mobile/v1/login.php',{data:{email:'juan@vetclinic.test',password:'OrderTest123!'}});
  const otherAuth = (await otherLogin.json()).data;
  const otherHeaders = {Authorization:`Bearer ${otherAuth.token || otherAuth.access_token}`};
  assert.equal((await api.get('/api/mobile/v1/orders.php?id='+order.id,{headers:otherHeaders})).status(),404);
  const gcashInput = {...input, payment_method:'gcash', request_key:'http_gcash_'+Date.now()};
  const gcashRes = await api.post('/api/mobile/v1/orders.php',{headers,data:gcashInput});
  assert.equal(gcashRes.status(),201,await gcashRes.text());
  const gcashOrder = (await gcashRes.json()).data.order;
  const badProof = await api.post('/api/mobile/v1/orders.php',{headers,multipart:{action:'proof',id:String(gcashOrder.id),reference:'8888888888888',proof:{name:'fake.php.png',mimeType:'image/png',buffer:Buffer.from('<?php echo 1; ?>')}}});
  assert.equal(badProof.status(),422,'non-image rejected');
  const image = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6B9kAAAAASUVORK5CYII=','base64');
  const multipart={action:'proof',id:String(gcashOrder.id),reference:'8888888888888',proof:{name:'test-proof.png',mimeType:'image/png',buffer:image}};
  const proofRes=await api.post('/api/mobile/v1/orders.php',{headers,multipart});
  assert.equal(proofRes.status(),200,await proofRes.text());
  const reviewed=(await proofRes.json()).data.order;
  assert.equal(reviewed.payment_status,'under_review');
  const proofRetry=await api.post('/api/mobile/v1/orders.php',{headers,multipart});
  assert.equal((await proofRetry.json()).data.order.proof.id,reviewed.proof.id);
  const privateProof=await api.get('/staff/order_proof.php?id='+reviewed.proof.id,{maxRedirects:0});
  assert.equal(privateProof.status(),302,'unauthenticated proof access redirects');
  staff=await request.newContext({baseURL:apiBase});
  const loginHtml=await (await staff.get('/login.php')).text();
  const csrf=loginHtml.match(/name="csrf_token" value="([^"]+)"/)?.[1] || '';
  await staff.post('/login.php',{form:{email:'staff@vetclinic.test',password:'OrderTest123!',csrf_token:csrf}});
  assert.equal((await staff.get('/staff/order_proof.php?id='+reviewed.proof.id)).headers()['content-type'],'image/png');
  assert.equal((await staff.post('/staff/product_orders.php',{form:{id:order.id,action:'ready'}})).status(),419,'CSRF protected');
  const updates=await staff.get('/staff/order_updates.php');
  assert.ok((await updates.json()).latest_order_notification>0,'staff polling includes order notices');
  browser=await chromium.launch({executablePath:process.env.VETRIX_BROWSER || 'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
  const context=await browser.newContext({viewport:{width:390,height:844}});
  const page=await context.newPage();
  const runtimeErrors=[]; page.on('pageerror',e=>runtimeErrors.push(e.message));
  await page.goto(appBase);
  await page.getByPlaceholder('client@vetclinic.test',{exact:true}).fill('client@vetclinic.test');
  await page.getByPlaceholder('Password',{exact:true}).fill('OrderTest123!');
  await page.getByRole('button',{name:'Login',exact:true}).click();
  await page.getByRole('tab',{name:'More',exact:true}).click();
  await page.getByRole('button',{name:'Clinic Products. Shop products for clinic pickup',exact:true}).click();
  await page.getByRole('textbox',{name:'Search products'}).fill(bootstrap.products.find(p=>p.id===1).item_name);
  await page.getByRole('button',{name:'Add to cart',exact:true}).click();
  await page.getByRole('button',{name:'Review cart · 1 item',exact:true}).click();
  await page.getByText('Review your order',{exact:true}).waitFor();
  await page.screenshot({path:path.join(output,'mobile-checkout.png'),fullPage:true});
  await page.getByRole('button',{name:'Place order · ₱125.50',exact:true}).click();
  await page.getByText('Order placed',{exact:true}).waitFor();
  await page.getByText('Pay on pickup',{exact:true}).waitFor();
  await page.screenshot({path:path.join(output,'mobile-order-placed.png'),fullPage:true});
  const staffContext=await browser.newContext({viewport:{width:1440,height:1000}});
  const staffPage=await staffContext.newPage();
  await staffPage.goto(apiBase+'/login.php');
  await staffPage.locator('input[name=email]').fill('staff@vetclinic.test');
  await staffPage.locator('input[name=password]').fill('OrderTest123!');
  await staffPage.locator('button[type=submit]').click();
  if (modern) {
    await staffPage.goto(apiBase+'/staff/product_orders.php');
    await staffPage.locator('#notificationButton').click();
    const notice=staffPage.locator(`[data-action-url="staff/product_orders.php?order_id=${gcashOrder.id}"]`).first();
    await notice.click();
    await staffPage.waitForURL('**/product_orders.php?order_id='+gcashOrder.id);
    await staffPage.locator('#order-detail').waitFor();
  } else {
    await staffPage.goto(apiBase+'/staff/notifications.php');
    await staffPage.getByRole('heading',{name:'Notifications',exact:true}).waitFor();
  }
  await staffPage.screenshot({path:path.join(output,'staff-notifications.png'),fullPage:true});
  await staffPage.goto(apiBase+'/staff/product_orders.php?id='+gcashOrder.id);
  await staffPage.getByRole('checkbox',{name:'I checked the reference, recipient, and exact amount received in the clinic GCash account.',exact:true}).check();
  await staffPage.getByRole('button',{name:'Verify GCash payment',exact:true}).click();
  await staffPage.getByText('Order updated. The client has been notified.',{exact:true}).waitFor();
  await staffPage.getByRole('button',{name:'Mark ready for pickup',exact:true}).click();
  await staffPage.getByRole('button',{name:'Complete pickup',exact:true}).click();
  await staffPage.locator('#order-detail').getByText('Completed',{exact:true}).waitFor();
  const contrast=await staffPage.getByRole('alert').evaluate(el=>{
    const style=getComputedStyle(el);
    const luminance=value=>value.match(/[\d.]+/g).slice(0,3).map(Number).map(v=>{v/=255;return v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4;}).reduce((sum,v,i)=>sum+v*[0.2126,0.7152,0.0722][i],0);
    const a=luminance(style.color),b=luminance(style.backgroundColor);
    return (Math.max(a,b)+0.05)/(Math.min(a,b)+0.05);
  });
  assert.ok(contrast>=4.5,'order feedback text meets readable contrast under the staff theme');
  await staffPage.screenshot({path:path.join(output,'staff-order-completed.png'),fullPage:true});
  const final=await api.get('/api/mobile/v1/orders.php?id='+gcashOrder.id,{headers});
  assert.equal((await final.json()).data.order.status,'completed','staff pickup reaches mobile API');
  if (modern) {
    await staffPage.getByRole('link',{name:'View receipt',exact:true}).click();
    await staffPage.getByText('GCash (verified by staff)',{exact:false}).waitFor();
    assert.equal((await staffPage.request.get(apiBase+'/staff/receipts.php')).status(),200);
  }
  // Sample settings are exercised by the PHP test; check the editable staff screen.
  await staffPage.goto(apiBase+'/staff/payment_settings.php');
  await staffPage.getByLabel('GCash account name',{exact:true}).fill('TEST ONLY - staff edit');
  await staffPage.getByRole('checkbox').check();
  await staffPage.getByRole('button',{name:'Save GCash details',exact:true}).click();
  await staffPage.getByText('GCash details saved.',{exact:false}).waitFor();
  const lastLink=modern ? staffPage.getByRole('navigation',{name:'Clinic staff navigation'}).getByRole('link',{name:'Frequently Asked Questions',exact:true}) : staffPage.getByRole('navigation',{name:'Staff navigation'}).getByRole('link',{name:'10 QR Scan Access',exact:true});
  await lastLink.scrollIntoViewIfNeeded();
  assert.ok(await lastLink.isVisible(), 'expanded staff navigation remains scrollable');
  // Exercise the app's actual multipart upload, not just the HTTP endpoint.
  await page.getByRole('button',{name:'All my orders',exact:true}).click();
  await page.getByRole('button',{name:`View order #${gcashOrder.id}`,exact:true}).click();
  await page.getByText('Collected',{exact:true}).waitFor();
  const pendingInput = {...input, payment_method:'gcash', request_key:'mobile_upload_'+Date.now()};
  const pendingRes = await api.post('/api/mobile/v1/orders.php',{headers,data:pendingInput});
  assert.equal(pendingRes.status(),201,await pendingRes.text());
  const pendingOrder=(await pendingRes.json()).data.order;
  await page.getByRole('button',{name:'All my orders',exact:true}).click();
  await page.getByRole('button',{name:`View order #${pendingOrder.id}`,exact:true}).click();
  await page.getByLabel('GCash reference number',{exact:true}).fill('7777777777777');
  const fileChooser = page.waitForEvent('filechooser');
  await page.getByRole('button',{name:'Choose payment screenshot',exact:true}).click();
  await (await fileChooser).setFiles({name:'payment-test.png',mimeType:'image/png',buffer:image});
  await page.getByRole('button',{name:'Submit payment proof',exact:true}).click();
  await page.getByText('Awaiting verification',{exact:true}).waitFor();
  await page.screenshot({path:path.join(output,'mobile-gcash-proof.png'),fullPage:true});
  if (modern) {
    await staffPage.locator('#notificationBadge').waitFor({timeout:20000});
    await staffPage.locator('#notificationButton').click();
    await staffPage.locator(`[data-action-url="staff/product_orders.php?order_id=${pendingOrder.id}"]`).first().waitFor();
    await staffPage.screenshot({path:path.join(output,'xampp-staff-bell.png'),fullPage:true});
  }
  assert.deepEqual(runtimeErrors,[]);
  await api.post('/api/mobile/v1/logout.php',{headers,data:{}});
  await api.post('/api/mobile/v1/logout.php',{headers:otherHeaders,data:{}});
  console.log('PASS: HTTP auth, checkout retries, ownership, multipart proof validation, private proof access, CSRF, staff polling, mobile checkout, staff verification and pickup, editable GCash settings.');
  console.log('Screenshots: '+output);
}
main().catch(error=>{console.error(error); console.error(serverErrors.slice(-5000)); process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();if(api)await api.dispose();if(staff)await staff.dispose();staticServer.close();php.kill();});
