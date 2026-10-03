// Read-only deployment checks. A CLI-created temporary staff session is cleaned up afterwards.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {chromium,request}=require('playwright-core');
const stage=path.resolve(__dirname,'../../.tmp/xampp-purchase-deploy');
let browser;
(async()=>{
  const api=await request.newContext();
  for (const host of ['http://localhost/vetrix','http://192.168.1.12/vetrix']) {
    const response=await api.get(host+'/api/mobile/v1/orders.php');
    assert.equal(response.status(),401, 'Live order endpoint requires authentication: '+host);
    assert.equal((await response.json()).success,false);
  }
  await api.dispose();
  browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
  const context=await browser.newContext({viewport:{width:1440,height:1000}});
  const cookie=JSON.parse(fs.readFileSync(path.join(stage,'live-session.json'),'utf8'));
  await context.addCookies([{...cookie,domain:'localhost',path:'/',httpOnly:true,sameSite:'Lax'}]);
  const page=await context.newPage();
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  const base='http://localhost/vetrix';
  await page.goto(base+'/staff/product_orders.php');
  await page.getByRole('heading',{name:'Product Orders',exact:true}).waitFor();
  await page.getByRole('navigation',{name:'Clinic staff navigation'}).getByRole('link',{name:'GCash Settings',exact:true}).waitFor();
  assert.equal((await page.request.get(base+'/staff/order_updates.php')).status(),200);
  await page.screenshot({path:path.join(stage,'live-product-orders.png'),fullPage:true});
  await page.getByRole('navigation',{name:'Clinic staff navigation'}).getByRole('link',{name:'GCash Settings',exact:true}).click();
  await page.getByRole('heading',{name:'GCash Settings',exact:true}).waitFor();
  await page.getByText('Sample account only',{exact:true}).waitFor();
  await page.screenshot({path:path.join(stage,'live-gcash-settings.png'),fullPage:true});
  for (const url of ['/staff/pos.php','/staff/receipts.php','/staff/dashboard.php']) {
    const response=await page.request.get(base+url);
    assert.equal(response.status(),200,url);
    const html=await response.text();
    assert.ok(!/Fatal error|Parse error|Warning:/.test(html),'Existing page renders cleanly: '+url);
  }
  assert.deepEqual(errors,[]);
  console.log('PASS: deployed localhost and LAN API authentication, staff order page, editable sample GCash settings, notification polling, and existing POS, receipts, and dashboard.');
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();});
