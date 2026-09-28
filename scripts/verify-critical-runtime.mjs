import {readFileSync} from 'node:fs';
import {webcrypto} from 'node:crypto';
import vm from 'node:vm';

const read=path=>readFileSync(path,'utf8');
const requireText=(text,needle,label=needle)=>{if(!text.includes(needle))throw new Error(`Critical runtime missing: ${label}`);};
const forbidText=(text,needle,label=needle)=>{if(text.includes(needle))throw new Error(`Critical runtime forbidden: ${label}`);};

async function verifyPersistenceCompletes(){
  const values=new Map();
  const saves=[];
  const window={
    __TAURI__:{core:{invoke:async(command,payload)=>{
      if(command==='load_app_state')return null;
      if(command==='save_app_state'){saves.push(JSON.parse(payload.state));return null;}
      throw new Error(`Unexpected native command: ${command}`);
    }}}
  };
  const context={
    window,
    localStorage:{getItem:key=>values.has(key)?values.get(key):null,setItem:(key,value)=>values.set(key,String(value)),removeItem:key=>values.delete(key)},
    crypto:webcrypto,
    console,
    setTimeout,
    clearTimeout,
    Promise,
    JSON,
    Date,
    Math,
    Object,
    Array,
    String,
    Number,
    Set,
    Map
  };
  context.globalThis=context;
  vm.runInNewContext(read('production-loader.js'),context,{filename:'production-loader.js'});
  await window.EFC_CORE_STORAGE_READY;
  window.EFC_REGISTER_STATE_CONTRIBUTOR('test-extended-state',snapshot=>Object.assign(snapshot,{
    expenses:[{id:'expense-1',amount:250}],
    branches:[{id:'branch-1',name:'Test Center'}],
    security:{users:[{id:'user-1',username:'Admin'}]},
    centerOpsMeta:{updatedAt:123456789,version:13}
  }));
  values.set('efc-students-v1',JSON.stringify([{id:'student-1',name:'Test',payments:[]} ]));
  window.EFC_CORE_CHANGED();
  await new Promise(resolve=>setTimeout(resolve,180));
  await Promise.race([
    window.EFC_FORCE_PERSIST(),
    new Promise((_,reject)=>setTimeout(()=>reject(new Error('Native persistence remained pending (possible write-chain self dependency).')),750))
  ]);
  if(!saves.length)throw new Error('Native persistence did not write a snapshot.');
  const persisted=saves.at(-1);
  if(!Array.isArray(persisted.expenses)||persisted.expenses[0]?.id!=='expense-1')throw new Error('State contributor expenses were dropped before native persistence.');
  if(!Array.isArray(persisted.branches)||persisted.branches[0]?.id!=='branch-1')throw new Error('State contributor branches were dropped before native persistence.');
  if(persisted.security?.users?.[0]?.id!=='user-1')throw new Error('State contributor security data was dropped before native persistence.');
  if(persisted.centerOpsMeta?.updatedAt!==123456789)throw new Error('State contributor metadata was dropped before native persistence.');
}

const registration=read('assets/production-registration-schedule-matrix-v17.js');
forbidText(registration,'select.onchange=','registration placeholder replacing the base onchange handler');
requireText(registration,"select.addEventListener('change',sync)",'registration placeholder preserves the base onchange handler');

const registrationReceipt=read('assets/production-registration-schedule-matrix-v17.js');
forbidText(registrationReceipt,'pendingSchedule','registration receipt global state leaking between registrations');
requireText(registrationReceipt,'noCrossRegistrationPendingState:true','registration receipts use the saved student schedule without cross-operation pending state');

const certificates=read('assets/production-certificates-v13.js');
requireText(certificates,'certificateReceiptPaidAmountLabel:true','certificate receipt labels the paid amount explicitly');
requireText(certificates,"half('Montant',cash(receipt.amount),'المبلغ المدفوع')",'certificate receipt paid amount wording');
for(const token of ['selectStudent(id)','clearStudentSelection()','renderStudentPicker()','renderHistoryRows(receipts=state.certificateReceipts)','drawCertificateHistory()','resetTransientIssueState()','issueInFlight','addBranchOption(branch)'])requireText(certificates,token,`certificate controller ${token}`);
requireText(certificates,'state.certificateReceipts=state.certificateReceipts.filter','certificate issue rollback after persistence failure');
requireText(certificates,"'\"':'&quot;'",'certificate HTML quote escaping');
forbidText(certificates,'persist().then(renderCertificates)','certificate branch add rerendering and discarding the external form draft');
forbidText(certificates,'new MutationObserver(','certificate renderer observer');
forbidText(certificates,'activeStudentId','duplicate certificate student state');
forbidText(certificates,'.click();','visible certificate control forwarding to a hidden control');

const domain=read('assets/production-domain-v13.js');
for(const token of ['function reminderNote(','kind:\'monthly-upcoming\'','kind:overdue?\'debt-overdue\':\'debt-due\'','contextLabel','contextValue','هذا تذكير بتجديد الشهر القادم','موعد الاستحقاق','تحديث ملفكم المالي'])requireText(domain,token,`structured reminder domain ${token}`);

const studentUi=read('assets/production-student-ui-v13.js');
for(const [token,label] of [
  ['endingFutureRangeFilter:true','ending tab exposes a future-capable date range'],
  ['endingRangeIndependentFromOtherTabs:true','ending date range is independent from the other period tabs'],
  ['periodEndingFromV13','ending range start control'],
  ['periodEndingToV13','ending range end control'],
  ['unifiedStudentIdentitySearch:true','student search keeps one identity field'],
  ['unifiedPeriodIdentitySearch:true','period search keeps one identity field'],
  ['displayedRegisterDigitsSearch:true','identity search checks the displayed register digits'],
  ['function studentIdentitySearchMatchesV13(student,query)','shared name/phone/register search matcher'],
  ["searchDigitsV13(student?.phone).includes(digits)||displayRecordV13(student?.reg).includes(digits)",'numeric search matches either phone digits or the displayed register number'],
  ['placeholder="ابحث بالاسم أو الهاتف أو رقم السجل"','unified identity search wording']
])requireText(studentUi,token,label);
for(const token of ['reminder-view-v13','EFC_OPEN_REMINDER_V13','student-reminder-actions-v13','حفظ PDF'])requireText(studentUi,token,`student reminder action ${token}`);

const financeUi=read('assets/production-finance-ui-v13.js');
requireText(financeUi,'finance-hero-v13','finance page uses the shared mint hero language');
requireText(financeUi,'height=235','finance chart keeps a larger readable workspace');
requireText(financeUi,'#financeModeV13 button.active','finance period buttons have an explicit active visual state');
requireText(financeUi,'viewExpenseHistoryV13','finance expenses expose a dedicated history action');
requireText(financeUi,'delete-expense-v13','expense history supports deleting an expense');
requireText(financeUi,'height:min(520px,calc(100dvh - 205px))!important','expense history keeps a fixed full-height list frame');
requireText(financeUi,'scrollbar-gutter:auto!important','expense history only gives space to a scrollbar when it exists');
requireText(financeUi,'ledger-hero-v13','daily ledger uses the shared mint hero language');
requireText(financeUi,'height:min(390px,calc(100dvh - 315px))!important','daily ledger keeps a bounded internal-scroll transaction list');
requireText(financeUi,'efc-ledger-redesign-v13','daily ledger styling is consolidated in the finance source');
requireText(financeUi,'.ledger-summary-v13 small{font-size:10.5px!important','daily ledger KPI labels remain readable');
requireText(financeUi,'.ledger-scroll-v13 table{width:100%!important;border-collapse:collapse!important;table-layout:fixed!important;font-size:10px!important','daily ledger records use the established table text size');
requireText(financeUi,'.expense-history-v13 table{width:100%!important;border-collapse:collapse!important;font-size:10px!important','expense history records match the established table text size');
requireText(financeUi,'.finance-kpi-line-v13 small{margin:0!important;font-size:10.5px!important','finance KPI labels remain readable');
requireText(financeUi,'addLedgerExpenseV13','daily ledger owns new expense registration');
requireText(financeUi,'expenseLedgerStatement','daily ledger separates expense name from its statement');
requireText(financeUi,"<td>${esc(item.row.name||'—')}</td><td>${esc(expenseLedgerStatement(item.row))}</td>",'expense name appears in the daily name column');
requireText(financeUi,'finance-topbar-v13','finance section actions share the tab row');
forbidText(financeUi,'addExpenseV13','new expense registration no longer lives in finance');
forbidText(financeUi,"pageTitle('الحركة اليومية','اليومية','اليوم المحدد فقط، وأحدث عملية في الأعلى.')",'legacy daily ledger title notes');
requireText(financeUi,'finance-kpi-line-v13','finance KPI labels and values share one compact row');
requireText(financeUi,'finance-kpi-align-v13','finance KPI rows stay top-aligned even when one card has a period subtitle');
requireText(financeUi,'justify-content:flex-start!important','finance KPI cards align their primary rows consistently at the top');
const periodUi=read('assets/production-period-search-redesign-v28.js');
const studentSearchUi=read('assets/production-student-search-redesign-v31.js');
const sidebarUi=read('assets/production-sidebar-lock-v30.js');
const baseUi=read('assets/production-ui-v13.css');
const homeBackground=read('assets/production-home-background-v36.css');
const registrationRedesign=read('assets/production-registration-redesign-v15.js');
const coursesRedesign=read('assets/production-courses-centers-redesign-v23.js');
const tauriConfig=JSON.parse(read('src-tauri/tauri.conf.json'));
const mainWindow=tauriConfig?.app?.windows?.[0]||{};
if(Number(mainWindow.minWidth||0)!==840)throw new Error('Critical runtime missing: responsive desktop minimum width must remain 840px.');
if(Number(mainWindow.minHeight||0)!==560)throw new Error('Critical runtime missing: responsive desktop minimum height must remain 560px.');
if(mainWindow.maximized!==true)throw new Error('Critical runtime missing: desktop window must start maximized inside the Windows work area.');
requireText(read('index.html'),'body{min-width:840px}','browser preview minimum width matches the responsive desktop workspace');
for(const [token,label] of [
  ['@media(max-width:1080px)','sidebar compacts for narrower Windows displays'],
  ['@media(max-width:900px)','sidebar has an extra compact-width breakpoint'],
  ['@media(max-height:760px)','sidebar compacts vertically on short Windows displays'],
  ['@media(max-height:640px)','sidebar has an extra short-height breakpoint'],
  ['overflow-y:auto!important','short sidebar can scroll instead of hiding controls below the taskbar'],
  ['width:min(900px,calc(100% - 32px))!important','settings workspace shrinks with available width'],
  ['responsiveSmallViewport:true','responsive sidebar runtime advertises its compact-screen safeguard'],
  ['settingsFitAvailableWidth:true','settings runtime advertises width-safe layout'],
  ['shortScreenSidebarScrollFallback:true','short-screen sidebar exposes a scroll fallback'],
  ['height:100dvh!important;max-height:100dvh!important','main workspace is constrained to the visible app viewport'],
  ['overflow-x:hidden!important;overflow-y:auto!important','main workspace scrolls vertically instead of losing bottom actions'],
  ['main>.efc-taskbar-safe-space-v30{display:block!important;width:100%!important;height:56px!important;min-height:56px!important','short screens keep a taskbar-safe bottom clearance without reusing the decorative main pseudo-element'],
  ['canonicalTaskbarSpacer:true','sidebar runtime advertises the canonical bottom spacer'],
  ['mainViewportScroll:true','sidebar runtime advertises the main viewport scroll safeguard'],
  ['taskbarSafeBottomClearance:true','sidebar runtime advertises the taskbar bottom clearance'],
  ['singleMainScrollOwner:true','main is the canonical page-level scroll owner']
])requireText(sidebarUi,token,label);
requireText(homeBackground,'main>.content{position:relative!important;z-index:1!important;height:auto!important;min-height:100%!important;overflow:visible!important','page content grows inside the single main scrollbar');
requireText(homeBackground,'main>.content:has(.efc-home-v35){height:100%!important;min-height:100%!important;overflow:hidden!important','home page keeps its full-height artwork exception');
requireText(registrationRedesign,'singleMainScrollOwner:true','registration redesign uses the canonical main scrollbar');
requireText(coursesRedesign,'singleMainScrollOwner:true','courses/centers redesign uses the canonical main scrollbar');
forbidText(registrationRedesign,'padding:20px 22px 34px!important;\n  overflow-x:hidden;','registration content must not become a nested vertical scroll container through overflow-x');
forbidText(coursesRedesign,'padding:18px 22px 34px!important;overflow-x:hidden','courses content must not become a nested vertical scroll container through overflow-x');
forbidText(registration,'body.efc-registration-editing-v17{overflow-y:auto!important}','registration edit mode must not move page scrolling back to body');
forbidText(registration,'max-height:calc(100dvh - 118px)!important;overflow-y:auto!important','registration edit form must not create a second page-height scrollbar');
requireText(periodUi,'height:calc(100vh - 392px)!important','period search results scroll internally');
requireText(periodUi,'endingFutureRangeVisuals:true','period redesign styles the dedicated ending range');
requireText(periodUi,'unifiedIdentitySearchControl:true','period search redesign keeps one identity control');
forbidText(periodUi,'periodPhoneV13','period search must not reintroduce a separate phone field');
forbidText(periodUi,'periodRegV13','period search must not reintroduce a separate register field');
requireText(periodUi,"'periodEndingFromV13','periodEndingToV13'",'period result count tracks ending-range changes');
requireText(periodUi,'position:sticky!important;top:0!important;z-index:3!important','period search keeps its table header visible');
requireText(studentSearchUi,'height:calc(100vh - 205px)!important','student search results scroll internally');
requireText(studentSearchUi,'unifiedIdentitySearchControl:true','student search redesign keeps one identity control');
forbidText(studentSearchUi,'studentPhoneV13','student search must not reintroduce a separate phone field');
forbidText(studentSearchUi,'studentRegV13','student search must not reintroduce a separate register field');
requireText(baseUi,'.content .table-wrap{max-height:min(520px,calc(100dvh - 250px))','long app tables have a global internal-scroll safety cap');
requireText(baseUi,'scrollbar-gutter:auto','table lists do not reserve an empty scrollbar gutter');
requireText(financeUi,'function axisStep','finance charts use stable human-friendly Y-axis steps');
requireText(financeUi,'viewProfitabilityDetailsV13','profitability dashboard exposes a dedicated details action');
requireText(financeUi,'profitabilityDetailsTotalProfit:true','profitability details show total profit');
requireText(financeUi,'financeResponsiveAt900LikeLedger:true','finance compact layout matches ledger behavior');
requireText(financeUi,'function renderProfitabilityDetails','profitability detail table lives on its own page');
requireText(financeUi,'compactFinanceKpis:true','finance KPI titles stay compact');
forbidText(financeUi,'expense-list-v13','expense history is no longer embedded under the expense dashboard');
requireText(financeUi,'margin-right:22px!important','finance workspace keeps certificate-page sidebar spacing');
forbidText(financeUi,'zoom:.92','finance page should not shrink the entire workspace on short screens');
forbidText(financeUi,'zoom:.86','finance page should not shrink the entire workspace on short screens');
forbidText(financeUi,"pageTitle('الإدارة المالية','المالية','المداخيل والمصاريف والربحية حسب الفترة والفلاتر.')",'legacy finance title notes');

const securityUi=read('assets/production-security-ui-v13.js');
const authUi=read('assets/production-auth-bootstrap-v13.js');
const foundationUi=read('assets/production-foundation-v13.js');
forbidText(securityUi,"document.getElementById('addUserV13')?.addEventListener",'settings user button must not accumulate duplicate click listeners across rerenders');
forbidText(financeUi,"document.getElementById('addMethodV13')?.addEventListener",'payment-method button must not accumulate duplicate click listeners across rerenders');
for(const token of [
  'function activeSubviewOpen()',
  ".expense-history-v13,.profitability-details-v13",
  '[data-efc-history-open-v36="1"]',
  "target.closest('.shell nav a.active')",
  'activeSubviewNavigationReset:true'
])requireText(securityUi,token,`active sidebar navigation resets nested view ${token}`);
if((securityUi.match(/#addCenterV13/g)||[]).length<2||(securityUi.match(/\.edit-center-v13/g)||[]).length<2)throw new Error('Critical runtime missing: center add/edit controls must be covered by both permission disabling and click guards.');
requireText(foundationUi,'efc-taskbar-safe-space-v30','canonical shell includes one real bottom safety spacer for short Windows work areas');
requireText(foundationUi,'grid-template-rows:155px 300px auto auto!important','settings gives more height to payment methods and users than backup cards');
requireText(foundationUi,'max-height:188px!important;overflow:auto!important','settings payment and user lists scroll internally when needed');
requireText(securityUi,'settings-empty-row-v13','settings user list has an explicit empty state and renders account rows when present');
for(const token of ['function reminderHeader(','function reminderDocument(','function openReminder(','window.EFC_OPEN_REMINDER_V13=openReminder','reminder-viewer-v13','Centre EFC','class=\"official12\">للغات والمعلوماتية','grid-template-columns:repeat(8','contextValue'])requireText(securityUi,token,`reminder document ${token}`);
forbidText(securityUi,"stage.innerHTML=`<div class=\"reminder-paper-v13\"",'legacy reminder-only PDF stage without preview document');
forbidText(securityUi,'<span>Rappel</span>','duplicate reminder title in receipt-style header');
requireText(authUi,"if(section==='ledger')return user.permissions?.ledger?.view===true||user.permissions?.register?.view===true||user.permissions?.register?.edit===true",'registration access also exposes the daily ledger');
requireText(authUi,"if(section==='ledger')return user.permissions?.ledger?.edit===true||user.permissions?.register?.edit===true",'registration edit access can record daily expenses');
requireText(securityUi,"finance:'.edit-expense-v13',ledger:'#addLedgerExpenseV13'",'finance view actions stay usable while daily expense creation has its own guard');
const receiptsUi=read('assets/production-receipts-v13.js');
requireText(receiptsUi,'registrationReceiptPaidAmountLabel:true','registration receipt labels the paid amount explicitly');
requireText(receiptsUi,"half('Montant',moneyV3(model.amount),'المبلغ المدفوع')",'registration receipt paid amount wording');
requireText(receiptsUi,'class=\"official12\">للغات والمعلوماتية','receipt header secondary line without duplicated center name');

const indexHtml=read('index.html');
const licenseGate=read('assets/production-license-gate-v8.js');
const runtimeVersion=licenseGate.match(/const RUNTIME_VERSION='([^']+)'/)?.[1]||'';
const indexVersions=[...indexHtml.matchAll(/\?v=([^"'&\s]+)/g)].map(match=>match[1]);
if(!runtimeVersion)throw new Error('Critical runtime missing: license gate cache version.');
if(!indexVersions.length||indexVersions.some(version=>version!==runtimeVersion))throw new Error('Preview cache versions are not synchronized between index.html and the license gate runtime.');

const deterministicPostLicenseRuntime=[
  'production-courses-centers-redesign-v23.js',
  'production-period-search-redesign-v28.js',
  'production-sidebar-lock-v30.js',
  'production-student-search-redesign-v31.js'
];
let lastRuntimeIndex=-1;
for(const file of deterministicPostLicenseRuntime){
  forbidText(indexHtml,file,`index must not race-load post-license runtime: ${file}`);
  requireText(licenseGate,file,`license gate owns post-license runtime: ${file}`);
  const current=licenseGate.indexOf(file);
  if(current<=lastRuntimeIndex)throw new Error(`Post-license runtime order is not deterministic at ${file}.`);
  lastRuntimeIndex=current;
}
requireText(licenseGate,"await window.EFC_AUTH_BOOTSTRAP_V13.requireLogin()",'canonical login completes before heavy app runtime');
requireText(licenseGate,"loadStage('./assets/production-security-ui-v13.js'",'security UI remains the final routed app layer');
forbidText(licenseGate,'production-login-ui-v13.js','obsolete post-security login layer');

const runtimeManifest=read('scripts/build-production.mjs');
const runtimeBlock=runtimeManifest.match(/const runtimeFiles\s*=\s*\[([\s\S]*?)\];/)?.[1]||'';
for(const obsolete of [
  'production-certificates-redesign-v35.js',
  'production-certificates-workspace-v36.js',
  'production-certificates-date-control-fix-v37.js',
  'production-certificates-student-picker-v38.js',
  'production-certificates-student-results-panel-v39.js',
  'production-certificates-student-layout-v40.js'
])forbidText(runtimeBlock,obsolete,`obsolete certificate patch ${obsolete}`);
for(const leftover of ['scripts/apply-reminder-document-polish.mjs','.github/workflows/reminder-document-polish.yml'])requireText(runtimeManifest,leftover,`temporary reminder patch guard ${leftover}`);

await verifyPersistenceCompletes();
console.log('Critical runtime verification passed: full contributed state persists, registration receipt state cannot leak across operations, compact-screen safeguards are enforced, certificates keep direct state ownership, reminder documents stay consolidated, preview cache versions remain synchronized, and browser/Windows use one deterministic post-license redesign runtime.');
