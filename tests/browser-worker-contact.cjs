/* Synthetic browser QA: no accounts, real phone contacts, or remote writes. */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const jsQR = require(process.env.JSQR_MODULE || 'jsqr');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const base = process.env.QA_BASE_URL || 'http://127.0.0.1:5191';
const out = process.env.QA_OUT || '/tmp/medinoti-worker-contact-qa';
fs.mkdirSync(out, { recursive: true });
const workerId='00000000-0000-4000-8000-000000000002';
const phone='+12025550123'; // Reserved fictional NANP number.
const body='안녕하세요. 메디노티 보고 연락드립니다.';
const mock=`
window.__qa={calls:[],error:null,opened:[]};
export const supabase={rpc:async(name,args)=>{
 window.__qa.calls.push({name,args});
 return window.__qa.error ? {data:null,error:window.__qa.error}:{data:'${phone}',error:null};
}};`;
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 const results=[];
 try {
  for(const device of ['Desktop','iPhone','Android']) {
   const context=await browser.newContext({viewport:device==='Desktop'?{width:1280,height:800}:{width:390,height:844},userAgent:device==='Desktop'?'Mozilla/5.0 Macintosh':device,locale:'ko-KR'});
   const errors=[],blocked=[];
   await context.route('**/*.supabase.co/**',r=>{blocked.push(r.request().url());return r.abort();});
   await context.route('**/src/lib/supabase.ts*',r=>r.fulfill({contentType:'application/javascript',body:mock}));
   // Exercise real resolver. Replace only external app launch to avoid sending/calling.
   await context.route('**/src/lib/workerContact.ts*',async r=>{
    const response=await r.fetch();
    const source=(await response.text()).replace('window.location.assign(href);','window.__qa.opened.push(href);');
    assert(source.includes('window.__qa.opened.push(href);'));
    await r.fulfill({response,body:source});
   });
   await context.route('**/__contact-qa',r=>r.fulfill({contentType:'text/html',body:`<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><script type="module">import RefreshRuntime from '/@react-refresh';RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;</script></head><body><div id="root"></div><script type="module">
import React from '/node_modules/.vite/deps/react.js';
import ReactDOM from '/node_modules/.vite/deps/react-dom_client.js';
import '/src/i18n/index.ts';
import '/src/index.css';
import '/src/pages/Dashboard.css';
import TalentCard from '/src/components/map/TalentCard.tsx';
import WorkerContactConsent from '/src/components/WorkerContactConsent.tsx';
const root=ReactDOM.createRoot(document.getElementById('root'));
document.body.style.fontFamily='Pretendard Variable,system-ui,sans-serif';
window.renderTalent=()=>root.render(React.createElement(TalentCard,{talent:{id:'${workerId}',role:'worker',name:'QA 의료인',license_type:'치과위생사',phone:'010-****-0123',address:'인천 남동구',latitude:37.45,longitude:126.7},hospitalName:'QA 병원'}));
function ConsentDemo(){const [checked,setChecked]=React.useState(false);return React.createElement(WorkerContactConsent,{checked,onChange:setChecked,needsRenewal:true});}
window.renderConsent=()=>root.render(React.createElement(ConsentDemo));
window.renderTalent();
</script></body></html>`}));
   const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')console.error('BROWSER',m.text());});page.on('requestfailed',r=>console.error('REQUEST_FAILED',r.url(),r.failure()));
   await page.addInitScript(()=>localStorage.setItem('mn_lang','ko'));
   await page.goto(base+'/__contact-qa');
   const sms=page.getByRole('button',{name:'문자 보내기',exact:true});
   await sms.waitFor().catch(async e=>{console.error('QA_ERRORS',errors,'BODY',(await page.locator('body').innerText()).slice(0,1200));throw e;});
   assert.equal(await page.evaluate(()=>window.__qa.calls.length),0,'No phone prefetch');
   assert(!(await page.locator('body').innerText()).includes(phone),'No raw phone before contact');
   await sms.click();
   if(device==='Desktop') {
    await page.locator('.map-contact-qr').waitFor();
    for(const platform of ['iPhone','Android']) {
     await page.getByRole('button',{name:platform,exact:true}).click();
     await page.locator('.map-contact-qr').waitFor();
     const pixels=await page.locator('.map-contact-qr').evaluate(async img=>{
      await img.decode();const canvas=document.createElement('canvas');canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;
      const c=canvas.getContext('2d');c.drawImage(img,0,0);return {width:canvas.width,height:canvas.height,data:Array.from(c.getImageData(0,0,canvas.width,canvas.height).data)};
     });
     const decoded=jsQR(new Uint8ClampedArray(pixels.data),pixels.width,pixels.height);
     assert.equal(decoded?.data,`sms:${phone}${platform==='iPhone'?'&':'?'}body=${encodeURIComponent(body)}`);
     results.push({device,qrPlatform:platform,qrDecoded:true,recipientAndGreetingMatch:true});
    }
    await page.screenshot({path:path.join(out,'desktop-authorized-qr.png')});
    await page.getByRole('dialog').getByRole('button',{name:'닫기',exact:true}).click();
   } else {
    await page.getByRole('link',{name:'문자 앱 열기',exact:true}).waitFor();
    const href=await page.getByRole('link',{name:'문자 앱 열기',exact:true}).getAttribute('href');
    assert(href.startsWith(`sms:${phone}${device==='iPhone'?'&':'?'}body=`));
    assert.equal(await page.evaluate(()=>window.__qa.opened[0]),href);
    await page.screenshot({path:path.join(out,`${device}-composer-link.png`)});
    results.push({device,composerHandoffRequested:true,fallbackLink:true,actualPhoneAppTested:false});
   }
   assert.equal(await page.evaluate(()=>window.__qa.calls.length),1);
   assert.deepEqual(await page.evaluate(()=>window.__qa.calls[0]),{name:'resolve_worker_contact',args:{p_worker_id:workerId}});
   await page.evaluate(()=>{window.__qa.error={message:'CONTACT_UNAVAILABLE',code:'P0001'};});
   await sms.click();await page.getByRole('alert').waitFor();
   assert.equal(await page.locator('.map-contact-qr').count(),0);
   assert.equal(await page.getByRole('link',{name:'문자 앱 열기',exact:true}).count(),0,'Revocation clears prior actionable link');
   assert.equal(await page.evaluate(()=>window.__qa.calls.length),2,'Permission rechecked');
   await page.screenshot({path:path.join(out,`${device}-consent-denied.png`)});
   await page.evaluate(()=>window.renderConsent());
   const consent=page.locator('#contact-consent');await consent.waitFor();
   assert.equal(await consent.getByRole('checkbox').isChecked(),false,'No preselected legacy consent');
   assert((await consent.innerText()).includes('문자'),'Disclosure visible');
   await consent.getByRole('checkbox').check();assert(await consent.getByRole('checkbox').isChecked());
   await page.screenshot({path:path.join(out,`${device}-consent-disclosure.png`),fullPage:true});
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No horizontal overflow');
   results.push({device,disclosureVisible:true,defaultUnchecked:true,userChoiceWorks:true});
   assert.deepEqual(errors,[]);assert.deepEqual(blocked,[]);
   results.push({device,revocationDenied:true,rawPhoneCleared:true,runtimeErrors:0,remoteRequests:0});
   fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(results,null,2));
   await context.close();
  }
  console.log(JSON.stringify({passed:true,results},null,2));
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
