/* Browser QA uses synthetic profiles and intercepted Supabase module: never real users or writes.
   Run against npm run dev -- --host 127.0.0.1 --port 5178.
   PLAYWRIGHT_MODULE=/path/to/playwright node tests/browser-map-ui.cjs */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const fs = require("node:fs");
const assert = require("node:assert/strict");
const path = require("node:path");
const out =
  process.env.QA_OUT || "/Users/sangsuan/.hermes/outputs/medinoti-map-ui";
fs.mkdirSync(out, { recursive: true });
const mock = `
let own={id:'fixture-owner',role:'hospital',name:'테스트 원장',hospital_name:'미리보기 병원',address:'인천 남동구 구월동',latitude:37.450,longitude:126.705,seeking_positions:['치과위생사','간호조무사'],is_exposed:true};
const workers=[{id:'fixture-a',role:'worker',name:'김○○',license_type:'치과위생사',address:'인천 남동구',latitude:37.455,longitude:126.701,phone:'010-****-1234',work_radius:3,work_pattern:['regular'],available_days:['mon','wed'],available_times:['morning'],experience:'2022~현재 예시 치과',desired_hourly_rate:18000}, {id:'fixture-b',role:'worker',name:'이○○',license_type:'간호조무사',address:'인천 남동구',latitude:37.445,longitude:126.711,phone:'010-****-5678',work_radius:0.2,work_pattern:['fulltime'],available_days:['mon','tue','wed','thu','fri'],available_times:['afternoon']}, {id:'fixture-c',role:'worker',name:'박○○',license_type:'간호사',address:'인천 남동구',latitude:37.451,longitude:126.705,phone:'010-****-1111'}];
const hospital={...own,id:'fixture-hospital',phone:'032-****-2222',mobile_phone:'010-****-8358',hospital_type:'dental'};
let jobs=[{id:'j1',hospital_id:'fixture-owner',title:'저년차 치과위생사 모집',description:'함께 근무하실 치과위생사 선생님을 찾습니다. 근무 요일과 시간은 협의할 수 있어요.',job_category:'치과위생사',status:'active',schedule_type:'always',work_end_date:null,wage_negotiable:true,created_at:'2026-09-16T10:00:00Z'}, {id:'j2',hospital_id:'fixture-owner',title:'오후 간호조무사 모집',description:'오후 근무 가능하신 선생님을 찾습니다.',job_category:'간호조무사',status:'active',schedule_type:'always',work_end_date:null,hourly_rate:18000,created_at:'2026-09-15T10:00:00Z'}, {id:'j3',hospital_id:'fixture-owner',title:'비공개 공고',job_category:'치과위생사',status:'paused',schedule_type:'always',created_at:'2026-09-01T10:00:00Z'}];
const originalJobs=jobs.map(j=>({...j}));
window.__fixture={setContact:()=>{jobs=jobs.map(j=>j.id==='j1'?{...j,contact_phone:'+12025550123'}:j)},setStatus:s=>{jobs=s==='NONE'?[]:originalJobs.map(j=>({...j,status:s==='OFF'?'paused':j.status}));},setRole:r=>{own={...own,role:r,license_type:'치과위생사'};jobs=originalJobs.map(j=>({...j,hospital_id:'fixture-hospital'}));}};
export const supabase={auth:{getUser:async()=>({data:{user:{id:own.id}},error:null}),signOut:async()=>({error:null})},from(table){let patch;let filters=[];const q={select:()=>q,eq:(k,v)=>{filters.push([k,v]);return q},in:()=>q,or:()=>q,order:()=>q,update:p=>{patch=p;return q},single:async()=>{if(patch)own={...own,...patch};return{data:own,error:null}},then(resolve){if(patch){if(table==='profiles')own={...own,...patch};else jobs=jobs.map(j=>filters.every(([k,v])=>j[k]===v)?{...j,...patch}:j);}const data=table==='profiles'?[own]:table==='public_profiles'?(own.role==='hospital'?workers:[hospital]):jobs.filter(j=>filters.every(([k,v])=>j[k]===v));resolve({data,error:null});}};return q;}};
`;
(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    locale: "ko-KR",
  });
  await context.route("**/src/lib/supabase.ts*", (r) =>
    r.fulfill({ contentType: "application/javascript", body: mock }),
  );
  // Any accidental backend access is a test failure, not a live request.
  const blocked = [];
  await context.route("**/*.supabase.co/**", (r) => {
    blocked.push(r.request().url());
    return r.abort();
  });
  const page = await context.newPage();
  const errors = [];
  const consoleErrors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (msg) => {
    if (msg.type() === "error")
      consoleErrors.push(msg.text().replace(/key=[^&\s]+/g, "key=[redacted]"));
  });
  if (process.env.MAP_FIXTURE !== "0")
    await context.route("**/@react-google-maps_api.js*", (r) =>
      r.fulfill({
        contentType: "application/javascript",
        body: fs.readFileSync(
          path.join(__dirname, "browser-maps-fixture.js"),
          "utf8",
        ),
      }),
    );
  await page.addInitScript(() => localStorage.setItem("mn_lang", "ko"));
  await page.goto("http://127.0.0.1:5178/dashboard");
  await page.waitForSelector(".mn-dashboard").catch((e) => {
    console.error("LOAD ERRORS", errors, consoleErrors);
    throw e;
  });
  await page.waitForTimeout(1200);
  await page.screenshot({
    path: path.join(
      out,
      process.env.MAP_FIXTURE === "0" ? "real-sdk-check.png" : "mobile-on.png",
    ),
  });
  console.log("BODY", (await page.locator("body").innerText()).slice(0, 1600));
  console.log(
    "ERRORS",
    errors,
    "CONSOLE",
    consoleErrors,
    "BLOCKED_BACKEND",
    blocked.length,
  );
  fs.writeFileSync(
    path.join(out, "initial.json"),
    JSON.stringify(
      { errors, consoleErrors, blockedBackend: blocked.length },
      null,
      2,
    ),
  );
  if (process.env.MAP_FIXTURE !== "0") {
    const sizes = [];
    for (const [width, height] of [
      [390, 844],
      [320, 568],
      [1280, 800],
    ]) {
      await page.setViewportSize({ width, height });
      await page.waitForTimeout(150);
      const initial = await page.locator(".mn-map-stage").boundingBox();
      sizes.push({ width, height, initial });
      await page.screenshot({ path: path.join(out, `${width}-on.png`) });
      await page.locator(".mn-posting-status__toggle").click();
      await page.waitForTimeout(250);
      const expandedBox = await page.locator('.mn-map-stage').boundingBox();
      if(width>=768)assert.equal(expandedBox.height,initial.height,'PC expanded panel must not move map');
      if(width>=768)assert(await page.locator('.mn-posting-status__panel').evaluate(el=>{const r=el.getBoundingClientRect();return el.contains(document.elementFromPoint(r.x+40,r.y+24));}),'PC panel must paint above role filter');
      await page.screenshot({ path: path.join(out, `${width}-expanded.png`) });
      await page.keyboard.press("Escape");
      await page.locator(".mn-map-pin").first().click();
      await page.waitForTimeout(250);
      const card = await page.locator('.mn-map-callout').boundingBox();
      const stage = await page.locator('.mn-map-stage').boundingBox();
      assert(card && card.x>=stage.x && card.x+card.width<=stage.x+stage.width+1,'callout horizontal containment');
      assert(card.y>=stage.y && card.y+card.height<=stage.y+stage.height+1,'callout vertical containment');
      const primaryAction = await page.locator('.mn-map-callout .map-contact-actions button').first().boundingBox();
      assert(primaryAction.y>=card.y && primaryAction.y+primaryAction.height<=card.y+card.height+1,'primary contact action visible without scrolling');
      await page.screenshot({ path: path.join(out, `${width}-talent.png`) });
      await page.locator('.mn-map-callout .map-contact-actions button').first().scrollIntoViewIfNeeded();
      assert(await page.locator('.mn-map-callout .map-contact-actions button').first().isDisabled(),'masked phone must be disabled');
      await page.screenshot({path:path.join(out,`${width}-talent-actions.png`)});
      await page.keyboard.press("Escape");
      await page.locator(".mn-role-filter__add").click();
      await page.waitForTimeout(180);
      await page.screenshot({ path: path.join(out, `${width}-roles.png`) });
      await page.keyboard.press("Escape");
      for(const status of ['OFF','NONE','ON']){
        await page.evaluate(status=>{window.__fixture.setStatus(status);window.dispatchEvent(new Event('focus'));},status);
        await page.waitForFunction(s=>document.querySelector('.mn-posting-status').innerText.includes(s==='ON'?'공고 ON':s==='OFF'?'공고가 꺼져':'아직 올린'),status);
        const box=await page.locator('.mn-map-stage').boundingBox();
        assert.equal(box.height,initial.height,`${width} ${status} status must not move map`);
        sizes.push({width,height,status,mapHeight:box.height,delta:box.height-initial.height});
        if(status!=='ON')await page.screenshot({path:path.join(out,`${width}-${status.toLowerCase()}.png`)});
      }
    }
    for(const [width,height] of [[390,844],[320,568],[1280,800]]){
      await page.setViewportSize({width,height});
      await page.evaluate(()=>{window.__fixture.setRole('worker');window.dispatchEvent(new Event('focus'));});
      await page.waitForSelector('.mn-worker-account');
      await page.locator('.mn-map-pin').first().click();
      await page.waitForTimeout(250);
      assert.equal(await page.locator('.map-posting-card').count(),2);
      await page.screenshot({path:path.join(out,`${width}-hospital-sheet.png`)});
      await page.locator('.map-posting-dots button').nth(1).click();
      await page.waitForFunction(()=>document.querySelectorAll('.map-posting-dots button')[1].getAttribute('aria-current')==='true');
      await page.screenshot({path:path.join(out,`${width}-hospital-second.png`)});
      await page.keyboard.press('Escape');
    }
    await page.evaluate(()=>{window.__fixture.setContact();window.dispatchEvent(new Event('focus'));});
    await page.locator('.mn-map-pin').first().click();
    await page.locator('.map-posting-card').first().getByRole('button',{name:'문자 보내기 · 이 공고',exact:true}).click();
    await page.waitForSelector('.map-contact-qr');
    assert((await page.locator('.map-contact-qr').getAttribute('src')).startsWith('data:image/png;base64,'),'QR generated locally');
    await page.screenshot({path:path.join(out,'1280-sms-qr.png')});
    const image=await page.locator('.map-contact-qr').getAttribute('src');
    fs.writeFileSync(path.join(out,'sms-qr.png'),Buffer.from(image.split(',')[1],'base64'));
    await page.keyboard.press('Escape');
    assert.deepEqual(errors,[],'No runtime exceptions');assert.deepEqual(consoleErrors,[],'No browser console errors');assert.equal(blocked.length,0,'No actual backend attempts');
    fs.writeFileSync(
      path.join(out, "geometry.json"),
      JSON.stringify(sizes, null, 2),
    );
  }
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
