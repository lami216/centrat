import {readFileSync,existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';

const files={
  gate:'assets/production-license-gate-v8.js',
  loader:'production-loader.js',
  auth:'assets/production-auth-bootstrap-v13.js',
  foundation:'assets/production-foundation-v13.js',
  receipts:'assets/production-receipts-v13.js',
  certificate:'assets/production-certificates-v13.js',
  sequence:'assets/production-receipt-sequences-v10.js',
  domain:'assets/production-domain-v13.js',
  student:'assets/production-student-ui-v13.js',
  registration:'assets/production-registration-schedule-v13.js',
  finance:'assets/production-finance-ui-v13.js',
  security:'assets/production-security-ui-v13.js',
  index:'index.html',
  build:'scripts/build-production.mjs'
};
const source=Object.fromEntries(Object.entries(files).map(([key,path])=>[key,readFileSync(path,'utf8')]));
const requireText=(text,needle,label=needle)=>{if(!text.includes(needle))throw new Error(`Missing v13 invariant: ${label}`);};
const forbidText=(text,needle,label=needle)=>{if(text.includes(needle))throw new Error(`Forbidden v13 pattern: ${label}`);};

const activeKeys=['gate','loader','auth','foundation','receipts','certificate','domain','sequence','student','registration','finance','security'];
for(const key of activeKeys)execFileSync(process.execPath,['--check',files[key]],{stdio:'inherit'});

for(const marker of [
  "'./production-loader.js'",
  "'./assets/production-auth-bootstrap-v13.js'",
  "'./assets/production-foundation-v13.js'",
  "'./assets/production-receipts-v13.js'",
  "'./assets/production-certificates-v13.js'",
  "'./assets/production-domain-v13.js'",
  "'./assets/production-receipt-sequences-v10.js'",
  "'./assets/production-student-ui-v13.js'",
  "'./assets/production-finance-ui-v13.js'",
  "'./assets/production-security-ui-v13.js'",
  'window.EFC_CORE_STORAGE_READY',
  'window.EFC_DOMAIN_V13_READY',
  'window.EFC_CENTER_OPS_V13?.ready',
  'noStartupSplash:true',
  'noLegacyDemoRuntime:true',
  'domainBeforeReceiptSequence:true',
  'singleStartupRender:true',
  'parallelRuntimePreload:true',
  'gateOwnsBootReveal:true',
  'finalUiBeforeReveal:true'
])requireText(source.gate,marker);
for(const obsolete of ['demo-app.js','demo-monthly-finance-v3.js','production-runtime.js','production-monthly-merge-v2.js','production-center-ops-v11.js','production-center-ops-v12.js','production-ledger-pdf-v6.js'])forbidText(source.gate,obsolete,`obsolete runtime ${obsolete}`);
forbidText(source.gate,'mountStartupShield','visible startup shield');
forbidText(source.gate,'جاري تجهيز النظام','startup progress page');
requireText(source.index,'<div id="app"></div>','empty startup root');
requireText(source.index,'class="efc-booting"','boot visibility guard');
requireText(source.index,'./assets/production-ui-v13.css','production stylesheet');
forbidText(source.index,'demo.css','demo stylesheet');
forbidText(source.index,'جاري تشغيل مركز EFC','old visible startup text');

const activeCombined=activeKeys.filter(key=>key!=='gate').map(key=>source[key]).join('\n');
for(const forbidden of ['new MutationObserver(','window.MutationObserver =','window.MutationObserver=','window.open=function','Storage.prototype.setItem =','Storage.prototype.setItem=','Storage.prototype.removeItem =','Storage.prototype.removeItem='])forbidText(activeCombined,forbidden,`active runtime side effect ${forbidden}`);
forbidText(source.loader,'SCRIPT_ORDER','legacy script loading chain');
requireText(source.loader,'noStoragePrototypePatch:true','storage prototype is not patched');
requireText(source.loader,'explicitPersistence:true','explicit persistence');
requireText(source.loader,'revisionAwareStudentMerge:true','backup merge understands student revisions');
requireText(source.loader,'revisionAwarePaymentMerge:true','backup merge understands payment revisions');
requireText(source.loader,'function paymentRevision(payment)','payment merge revision source');
requireText(source.loader,'paymentRevision(normalized)>paymentRevision(merged[position])','newer copy of the same transaction wins during merge');
requireText(source.foundation,'noRouter:true','foundation has no router');
requireText(source.foundation,'noMutationObserver:true','foundation has no observer');
requireText(source.receipts,'noWindowOpenPatch:true','receipt service does not intercept window.open');
requireText(source.certificate,'noRouterHook:true','certificates do not own routing');
requireText(source.auth,'canonicalLoginRenderer:true','auth bootstrap owns one canonical login renderer');
requireText(source.auth,'loginBeforeAppRuntime:true','login is completed before heavy app runtime');
forbidText(source.auth,'new MutationObserver(','auth/login observer');
requireText(source.security,'settingsOwnedByFinalRouter:true','settings routed by v13 router');
for(const token of ['canonicalSettingsRenderer:true','singleSettingsRenderOwner:true','noSettingsPostRenderEnhancement:true'])requireText(source.security,token,`canonical settings ${token}`);
requireText(source.security,'certificatesOwnedByFinalRouter:true','certificates routed by v13 router');
requireText(source.security,'bootRevealDeferredToGate:true','security does not reveal before canonical login/app readiness');
forbidText(source.security,"classList.remove('efc-booting')",'intermediate security UI reveal');
requireText(source.gate,"link.rel='preload'",'runtime scripts are prefetched in parallel');
requireText(source.gate,'await new Promise(resolve=>requestAnimationFrame(()=>resolve()))','final UI settles before reveal');

const hashOwners=['auth','foundation','receipts','certificate','sequence','domain','student','finance','security'].filter(key=>source[key].includes("addEventListener('hashchange'")||source[key].includes('addEventListener("hashchange"'));
if(hashOwners.length!==1||hashOwners[0]!=='security')throw new Error(`Expected one v13 hashchange owner (security), found: ${hashOwners.join(', ')||'none'}.`);

requireText(source.domain,'EFC_RECEIPTS_V13?.ready','domain waits for clean receipt service');
requireText(source.domain,'function paymentTotal(student)','canonical payment sum');
requireText(source.domain,'function appendPayment(student','single transaction writer');
requireText(source.domain,'student.paid=paymentTotal(student)','paid amount reconciled from transactions');
requireText(source.registration,'appendPayment(student,{amount:paidNow','registration uses transaction writer');
forbidText(source.student,'renderRegister=function(){','student UI no longer owns a legacy registration renderer');
requireText(source.student,'appendPayment(student,{amount,method:','profile/payment modal uses transaction writer');
forbidText(source.student,'student.paid=Number(student.paid||0)+','manual paid accumulator');
requireText(source.student,'DEBT_IDLE_MS=450','debt-date typing debounce');
requireText(source.registration,'paidTouched&&paid>0&&price>0&&paid<price','registration debt date only for real partial payment');
requireText(source.student,'.quick-days-v13[hidden]','quick duration hidden rule');
requireText(source.student,"typeEl.value==='quick'",'quick duration conditional');
requireText(source.student,"form.setAttribute('autocomplete','off')",'global form autocomplete disable');
requireText(source.finance,'financePrimaryActionV13','expense primary action slot');
requireText(source.finance,"if(section==='expenses')action.innerHTML=",'expense actions only render on the expense page');
requireText(source.finance,'historicalExpenseMethodPreserved:true','historical expense method preservation');
requireText(source.finance,'certificateLedgerReceiptNavigation:true','certificate ledger receipt navigation');

// Backup merge regression: corrections to an existing transaction/student must win only when their revision is newer.
const mergeStore=new Map();
const mergeLocalStorage={getItem:key=>mergeStore.has(key)?mergeStore.get(key):null,setItem:(key,value)=>mergeStore.set(key,String(value)),removeItem:key=>mergeStore.delete(key)};
mergeLocalStorage.setItem('efc-state-meta-v1',JSON.stringify({version:3,updatedAt:200,installationId:'center-local',sourceCenters:['center-local']}));
mergeLocalStorage.setItem('efc-specialties-v1',JSON.stringify([{id:'quick',recordCode:'spec-quick',sourceCenterId:'center-local',name:'سريعة',courseType:'quick',billing:'one_time',durationUnit:'day',durationValue:30}]));
mergeLocalStorage.setItem('efc-payment-methods-v1',JSON.stringify(['نقداً','Bankily']));
mergeLocalStorage.setItem('efc-students-v1',JSON.stringify([{id:'s1',recordCode:'reg-1',sourceCenterId:'center-local',name:'local-old',branch:'main',specialty:'quick',reg:1,start:'2026-09-09',required:1000,paid:1000,updatedAt:200,payments:[['2026-09-09',1000,'نقداً','10:00',100,'old','tx-1',null,7,null,null,200]]}]));
const mergeContext={console,Date,setTimeout,clearTimeout,structuredClone,crypto:webcrypto,localStorage:mergeLocalStorage,window:{}};mergeContext.window.window=mergeContext.window;vm.createContext(mergeContext);vm.runInContext(source.loader,mergeContext,{filename:files.loader});await mergeContext.window.EFC_CORE_STORAGE_READY;
const incomingBase={version:3,updatedAt:300,installationId:'center-import',sourceCenters:['center-import'],specialties:[{id:'quick',recordCode:'spec-quick',sourceCenterId:'center-local',name:'سريعة',courseType:'quick',billing:'one_time',durationUnit:'day',durationValue:30}],paymentMethods:['نقداً','Bankily']};
await mergeContext.window.EFC_MERGE_IMPORTED_STATE({...incomingBase,students:[{id:'s1-copy',recordCode:'reg-1',sourceCenterId:'center-local',name:'incoming-newer',branch:'center-b',specialty:'quick',reg:1,start:'2026-09-08',required:1300,paid:1200,updatedAt:300,payments:[['2026-09-11',1200,'Bankily','11:00',100,'corrected','tx-1',null,7,null,null,300]]}]});
let merged=JSON.parse(mergeLocalStorage.getItem('efc-students-v1'))[0];
if(merged.name!=='incoming-newer'||merged.branch!=='center-b'||Number(merged.payments[0][1])!==1200||merged.payments[0][2]!=='Bankily')throw new Error('Revision-aware backup merge did not apply the newer corrected student/payment.');
await mergeContext.window.EFC_MERGE_IMPORTED_STATE({...incomingBase,updatedAt:400,students:[{id:'s1-copy',recordCode:'reg-1',sourceCenterId:'center-local',name:'incoming-older-metadata',branch:'should-not-win',specialty:'quick',reg:1,start:'2026-09-01',required:9999,paid:1300,updatedAt:250,payments:[['2026-09-12',1300,'نقداً','12:00',100,'newer-payment-only','tx-1',null,7,null,null,400]]}]});
merged=JSON.parse(mergeLocalStorage.getItem('efc-students-v1'))[0];
if(merged.name!=='incoming-newer'||merged.branch!=='center-b')throw new Error('Older imported student metadata overwrote newer local metadata.');
if(Number(merged.payments[0][1])!==1300||merged.payments[0][5]!=='newer-payment-only')throw new Error('A newer transaction revision was ignored because the surrounding student metadata was older.');

const store=new Map();
const localStorage={getItem:key=>store.has(key)?store.get(key):null,setItem:(key,value)=>store.set(key,String(value)),removeItem:key=>store.delete(key)};
const students=[];
const specialties=[{id:'quick',name:'سريعة',courseType:'quick',billing:'one_time',durationUnit:'day',durationValue:35,quickDays:35},{id:'normal',name:'عادية',courseType:'normal',billing:'monthly',durationUnit:'month',durationValue:1}];
const methods=['نقداً','Bankily','Masrvi','السداد'];
const dateOnly=value=>new Date(`${value}T12:00:00`);
const pad=value=>String(value).padStart(2,'0');
const iso=date=>`${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}`;
const addDuration=(start,value,unit)=>{const date=dateOnly(start);if(unit==='day')date.setDate(date.getDate()+Number(value));if(unit==='month'){const day=date.getDate();date.setDate(1);date.setMonth(date.getMonth()+Number(value));const last=new Date(date.getFullYear(),date.getMonth()+1,0).getDate();date.setDate(Math.min(day,last));}return iso(date);};
const context={
  console,Date,setTimeout,clearTimeout,structuredClone,crypto:webcrypto,TextEncoder,TextDecoder,Uint8Array,atob:globalThis.atob,btoa:globalThis.btoa,
  localStorage,students,specialties,methods,DEMO_TODAY:'2026-09-09',dateOnly,iso,addDuration,
  spec:id=>specialties.find(item=>item.id===id),branchName:id=>id,
  saveStudents:()=>localStorage.setItem('efc-students-v1',JSON.stringify(students)),saveSpecs:()=>localStorage.setItem('efc-specialties-v1',JSON.stringify(specialties)),
  remainingOf:student=>Math.max(0,Number(student.required||0)-Number(student.paid||0)),courseStatus:()=> 'نشطة',financialStatus:()=> 'لم يدفع',
  installmentPlanV3:()=>[],monthlyFocusV3:()=>null,dueNowV3:student=>Math.max(0,Number(student.required||0)-Number(student.paid||0)),suggestedPaymentV3:student=>Math.max(0,Number(student.required||0)-Number(student.paid||0)),allocV4:()=>({desc:'',before:0,after:0,months:[]}),
  receiptModelV4:(student,index)=>index===null?{amount:0,remaining:student.required}:{amount:Number(student.payments[index][1]),remaining:Math.max(0,student.required-Number(student.payments[index][1]))},
  window:{EFC_RECEIPTS_V13:{ready:true},EFC_RECEIPT_SEQUENCES_V10:true,EFC_FORCE_PERSIST:async()=>({students,specialties,paymentMethods:methods}),EFC_APPLY_RESTORED_STATE:async()=>({}),EFC_CODES:{newTransactionCode:()=>`tx-${Date.now()}`,ensureStudentRecord:()=> 'record'}}
};
context.window.window=context.window;
vm.createContext(context);
vm.runInContext(source.domain,context,{filename:files.domain});
await context.window.EFC_DOMAIN_V13_READY;
const D=context.window.EFC_DOMAIN_V13;
if(!D?.ready)throw new Error('Domain v13 did not publish readiness.');

const quick={id:'q1',name:'Quick',branch:'main',specialty:'quick',reg:1,start:'2026-09-09',end:'2026-10-14',required:10000,paid:0,active:true,status:'active',debtDueDates:{},snapshot:{centerOpsV13:true,courseType:'quick',billing:'one_time',fee:10000,durationValue:35,durationUnit:'day'},payments:[]};
students.push(quick);
const qIndex=D.appendPayment(quick,{amount:10000,method:'Bankily',date:'2026-09-09',description:'دفعة تسجيل',persist:false});
if(qIndex!==0||quick.payments.length!==1)throw new Error('Quick registration payment was not stored as one transaction.');
if(quick.payments[0][2]!=='Bankily')throw new Error('Payment method was not stored on the transaction.');
if(D.paymentTotal(quick)!==10000||quick.paid!==10000||D.remainingAmount(quick)!==0)throw new Error('Quick full payment did not close the balance.');

const monthly={id:'m1',name:'Monthly',branch:'main',specialty:'normal',reg:2,start:'2026-09-09',end:'',required:600,paid:0,active:true,status:'active',debtDueDates:{},snapshot:{centerOpsV13:true,centerOpsMonthlyV13:true,dynamicMonthly:true,courseType:'normal',billing:'monthly',fee:600,durationValue:1,durationUnit:'month'},payments:[]};
students.push(monthly);
D.appendPayment(monthly,{amount:400,method:'نقداً',date:'2026-09-09',description:'جزئي',targetMonth:1,debtDueDate:'2026-09-15',persist:false});
if(D.remainingAmount(monthly)!==200||monthly.debtDueDates['1']!=='2026-09-15')throw new Error('Monthly partial payment/debt date is inconsistent.');
D.appendPayment(monthly,{amount:200,method:'Masrvi',date:'2026-09-09',description:'إكمال',targetMonth:1,persist:false});
if(D.paymentTotal(monthly)!==600||monthly.paid!==600||D.remainingAmount(monthly)!==0||monthly.debtDueDates['1'])throw new Error('Monthly balance did not close after the final current-date payment.');
const earlyPlan=D.installmentPlan(monthly,'2026-10-06');
if(earlyPlan.length!==2)throw new Error('Next monthly period was not opened three days before renewal.');

execFileSync(process.execPath,['scripts/build-production.mjs'],{stdio:'inherit'});
if(!existsSync('dist/assets/production-ui-v13.css'))throw new Error('Packaged production stylesheet is missing.');
for(const key of activeKeys){const dist=`dist/${files[key]}`;if(!existsSync(dist))throw new Error(`Packaged runtime missing: ${dist}`);execFileSync(process.execPath,['--check',dist],{stdio:'inherit'});}
for(const legacy of ['.demo-imported','demo.css','demo-app.js','demo-period-merge.js','demo-monthly-finance-v3.js','demo-receipts-v4.js','demo-v5-runtime-guard.js','demo-brand-receipt-v5.js','demo-repair-v6.js','demo-receipt-layout-v7.js','demo-fix-v8.js','demo-receipt-logo-v9.js','demo-receipt-compact-v10.js','demo-receipt-paper-v11.js','demo-receipt-clean-v12.js','production-runtime.js','production-monthly-merge-v2.js','assets/production-student-profile-v3.js','assets/production-registration-receipt-v4.js','assets/production-ledger-finance-ui-v5.js','assets/production-ledger-pdf-v6.js'])if(existsSync(`dist/${legacy}`))throw new Error(`Obsolete runtime leaked into dist: ${legacy}`);

console.log('Runtime architecture and accounting v13 verification passed: clean packaged runtime/source names, safe persistence order, single final router, canonical payments, revision-aware backup merges and no demo side effects.');