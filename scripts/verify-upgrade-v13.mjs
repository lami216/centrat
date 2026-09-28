import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';

const read=path=>readFileSync(path,'utf8');
const domain=read('assets/production-domain-v13.js');
const auth=read('assets/production-auth-bootstrap-v13.js');
const security=read('assets/production-security-ui-v13.js');
const certificate=read('assets/production-certificates-v13.js');
const receipt=read('assets/production-receipts-v13.js');
const gate=read('assets/production-license-gate-v8.js');
const loader=read('production-loader.js');
const finance=read('assets/production-finance-ui-v13.js');
const studentUi=read('assets/production-student-ui-v13.js');

const requireText=(text,needle,label=needle)=>{if(!text.includes(needle))throw new Error(`Upgrade audit missing: ${label}`);};
const forbidText=(text,needle,label=needle)=>{if(text.includes(needle))throw new Error(`Upgrade audit forbidden: ${label}`);};

for(const token of [
  "RECOVERY_PREFIX='EFC-ADMIN-RECOVERY-2.'",
  "RESET_PREFIX='EFC-ADMIN-RESET-2.'",
  "{name:'RSA-PSS',hash:'SHA-256'}",
  "crypto.subtle.verify({name:'RSA-PSS',saltLength:32}",
  "value.n!==pending.n",
  "value.d!==pending.d",
  "localStorage.removeItem(RECOVERY_KEY)",
  'adminRecoverySigned:true',
  'recoveryDeviceBound:true',
  'recoveryOneTime:true'
])requireText(auth,token,`recovery ${token}`);
forbidText(auth,'s:secret','raw recovery secret persisted');
forbidText(auth,'value.s!==pending.s','unsigned secret-only reset');
forbidText(security,"RECOVERY_PREFIX='EFC-ADMIN-RECOVERY-2.'",'recovery implementation must not be duplicated in late security UI');

for(const token of [
  "canView('students')",
  "canEdit('students')",
  "certificates:'#certIssueV13,#certAddBranchV13",
  'permissionMutationGuards:true'
])requireText(security,token,`permission guard ${token}`);
for(const token of [
  "canEditCertificates=()=>window.EFC_AUTH_V13?.canEdit?.('certificates')??true",
  "if(!canEditCertificates())return alert",
  'permissionsEnforced:true'
])requireText(certificate,token,`certificate permission ${token}`);

requireText(security,"else if(page==='settings')renderSettings()",'settings owned by final router');
requireText(security,"else if(page==='certificates')window.EFC_RENDER_CERTIFICATES_V13?.()",'certificates owned by final router');
requireText(security,"window.addEventListener('hashchange',()=>window.renderCurrentV13?.())",'final v13 hash router');
forbidText(security,"window.addEventListener('hashchange',()=>setTimeout(()=>window.renderCurrentV13?.(),0))",'delayed duplicate route scheduling');
forbidText(security,"else if(typeof renderCurrent==='function')renderCurrent()",'legacy router fallback');
forbidText(certificate,"addEventListener('hashchange'",'certificate-specific router hook');

requireText(receipt,'مركز EFC للغات والمعلوماتية','official center name on course receipt');
requireText(certificate,'للغات والمعلوماتية','certificate receipt subtitle');
requireText(certificate,'paymentMethodsFromSettings:true','certificate receipt methods follow settings');
requireText(certificate,'externalReceiptIssueEnabled:true','external certificate issuing enabled');
forbidText(certificate,'مركز EFC للغات والمعلوماتية','duplicate center name in certificate receipt header');
forbidText(certificate,'هذا الوصل خاص برسوم الشهادة ولا يغيّر رصيد الدورة الدراسية للطالب.','obsolete certificate fee note');
forbidText(receipt,'https://cdn.jsdelivr.net','receipt CDN dependency');
requireText(receipt,"./vendor/html2canvas.min.js",'local html2canvas');
requireText(receipt,"./vendor/jspdf.umd.min.js",'local jspdf');
requireText(receipt,'noLegacyReceiptChain:true','standalone receipt service');
requireText(receipt,'noWindowOpenPatch:true','receipt window.open is not intercepted');

for(const obsolete of ['demo-app.js','demo-period-merge.js','demo-monthly-finance-v3.js','production-runtime.js','production-monthly-merge-v2.js','production-student-profile-v3.js','production-registration-receipt-v4.js','production-ledger-finance-ui-v5.js','production-ledger-pdf-v6.js','production-center-ops-v11.js','production-center-ops-v11-fix1.js','production-center-ops-v12.js','production-certificates-v7.js','production-certificate-filters-v8.js'])forbidText(gate,obsolete,`obsolete runtime ${obsolete}`);
requireText(loader,'efc-demo-v8-payment-methods','legacy payment-method key cleanup');
requireText(loader,'noRuntimeScriptChain:true','legacy script chain removed');
requireText(loader,'noStoragePrototypePatch:true','global storage prototype patch removed');
requireText(finance,'paymentMethodsNoDelete:true','payment methods are stop/reactivate only');
requireText(studentUi,'dynamicDuesNative:true','v13 dynamic dues UI');

const oldMonthly={
  id:'old-monthly',name:'طالب قديم شهري',phone:'22000001',branch:'main',specialty:'normal',reg:17,
  start:'2026-08-12',end:'',required:600,paid:400,active:true,status:'active',
  debtDueDates:{'1':'2026-09-10'},
  snapshot:{centerOpsV11:true,centerOpsMonthlyV11:true,dynamicMonthly:true,courseType:'normal',billing:'monthly',fee:600,durationValue:1,durationUnit:'month'},
  payments:[['2026-08-12',400,'نقداً','10:00',1786528800000,'دفعة الشهر 1','old-tx-1',1,41,'2026-09-10']]
};
const oldStopped={
  id:'old-stopped',name:'طالب موقوف قديم',phone:'22000002',branch:'main',specialty:'normal',reg:18,
  start:'2026-08-12',end:'',required:600,paid:100,active:false,status:'inactive',stoppedAt:'2026-08-20',stopReason:'سفر',frozenMonths:1,
  debtDueDates:{'1':'2026-08-25'},
  snapshot:{centerOpsV11:true,centerOpsMonthlyV11:true,dynamicMonthly:true,courseType:'normal',billing:'monthly',fee:600,durationValue:1,durationUnit:'month'},
  payments:[['2026-08-12',100,'Bankily','11:00',1786532400000,'دفعة جزئية','old-tx-2',1,42,'2026-08-25']]
};
const legacyStudent={
  id:'legacy',name:'طالب ما قبل Center Ops',phone:'22000003',branch:'main',specialty:'legacy',reg:19,
  start:'2026-08-01',end:'2026-09-01',required:1000,paid:300,active:true,
  snapshot:{billing:'one_time',fee:1000,durationValue:1,durationUnit:'month'},
  payments:[['2026-08-01',300,'نقداً','09:00']]
};
const students=[oldMonthly,oldStopped,legacyStudent];
const specialties=[
  {id:'normal',name:'المعلوماتية',courseType:'normal',billing:'monthly',durationValue:1,durationUnit:'month'},
  {id:'legacy',name:'قديم',billing:'one_time',fee:1000,durationValue:1,durationUnit:'month'}
];
const methods=['نقداً'];
const store=new Map([
  ['efc-expenses-v11',JSON.stringify([{id:'exp-old',name:'طابعة',amount:250,method:'نقداً',branch:'main',specialty:'__expense_general__',date:'2026-09-09',time:'08:30',createdAt:1788942600000}])],
  ['efc-payment-method-records-v11',JSON.stringify([{id:'cash',name:'نقداً',active:true,createdAt:1},{id:'bankily',name:'Bankily',active:false,createdAt:2}])],
  ['efc-security-v11',JSON.stringify({users:[{id:'admin-old',username:'admin',role:'admin',permissions:{},pin:{salt:'old',hash:'old'}}]})]
]);
const localStorage={getItem:key=>store.has(key)?store.get(key):null,setItem:(key,value)=>store.set(key,String(value)),removeItem:key=>store.delete(key)};
const dateOnly=value=>new Date(`${value}T12:00:00`);
const pad=value=>String(value).padStart(2,'0');
const iso=date=>`${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}`;
const addDuration=(start,value,unit)=>{const date=dateOnly(start);if(unit==='day')date.setDate(date.getDate()+Number(value));if(unit==='month'){const day=date.getDate();date.setDate(1);date.setMonth(date.getMonth()+Number(value));const last=new Date(date.getFullYear(),date.getMonth()+1,0).getDate();date.setDate(Math.min(day,last));}return iso(date);};
const money=value=>`${Number(value||0)} أوقية`;
const fmtDate=value=>String(value||'');
const contributors=new Map();
const context={
  console,Date,setTimeout,clearTimeout,structuredClone,crypto:webcrypto,TextEncoder,TextDecoder,Uint8Array,atob:globalThis.atob,btoa:globalThis.btoa,
  localStorage,students,specialties,methods,DEMO_TODAY:'2026-09-09',dateOnly,iso,addDuration,money,fmtDate,
  spec:id=>specialties.find(item=>item.id===id),branchName:id=>id,
  saveStudents:()=>localStorage.setItem('efc-students-v1',JSON.stringify(students)),saveSpecs:()=>localStorage.setItem('efc-specialties-v1',JSON.stringify(specialties)),
  remainingOf:student=>Math.max(0,Number(student.required||0)-Number(student.paid||0)),courseStatus:student=>student.active===false?'موقوف':'نشطة',financialStatus:student=>Math.max(0,Number(student.required||0)-Number(student.paid||0))?'دفع جزئي':'مدفوع كامل',
  installmentPlanV3:()=>[],monthlyFocusV3:()=>null,dueNowV3:student=>Math.max(0,Number(student.required||0)-Number(student.paid||0)),suggestedPaymentV3:student=>Math.max(0,Number(student.required||0)-Number(student.paid||0)),allocV4:()=>({desc:'',before:0,after:0,months:[]}),
  receiptModelV4:(student,index)=>index===null?{amount:0,remaining:student.required}:{amount:Number(student.payments[index][1]),remaining:Math.max(0,student.required-Number(student.payments[index][1]))},
  window:{EFC_RECEIPTS_V13:{ready:true},EFC_RECEIPT_SEQUENCES_V10:true,EFC_REGISTER_STATE_CONTRIBUTOR:(name,contribute)=>contributors.set(name,contribute),EFC_FORCE_PERSIST:async()=>{let state={students,specialties,paymentMethods:methods};for(const contribute of contributors.values())state=await contribute(state)||state;return state;},EFC_APPLY_RESTORED_STATE:async()=>({}),EFC_CODES:{newTransactionCode:()=>`tx-${Date.now()}`,ensureStudentRecord:()=> 'record'}}
};
context.window.window=context.window;
vm.createContext(context);
vm.runInContext(domain,context,{filename:'assets/production-domain-v13.js'});
await context.window.EFC_DOMAIN_V13_READY;
const D=context.window.EFC_DOMAIN_V13;
if(!D?.ready)throw new Error('v13 domain did not become ready on legacy state.');

if(!D.isNewModel(oldMonthly)||!D.isDynamicMonthly(oldMonthly))throw new Error('v11 dynamic monthly student was not recognized by v13.');
if(D.isNewModel(legacyStudent))throw new Error('pre-Center-Ops legacy student was silently migrated instead of preserving legacy calculation.');
if(D.remainingAmount(legacyStudent)!==700)throw new Error('legacy student balance changed during v13 startup.');

const plan=D.installmentPlan(oldMonthly,'2026-09-09');
if(plan.length!==2)throw new Error('v11 monthly student did not open the next month three days early.');
if(plan[0].remaining!==200||plan[1].remaining!==600)throw new Error('v11 monthly allocations changed during v13 upgrade.');
const notes=D.notificationsForStudent(oldMonthly);
if(!notes.some(note=>note.message.includes('200'))||!notes.some(note=>note.message.includes('تجديد الشهر القادم')))throw new Error('v11 debt/renewal reminders were not preserved by v13.');
if(D.notificationsForStudent(oldStopped).length!==0)throw new Error('stopped legacy student produced operational reminders.');
if(D.remainingAmount(oldStopped)!==500)throw new Error('stopped legacy debt was lost.');

const records=D.getMethodRecords();
if(records.find(item=>item.id==='bankily')?.active!==false)throw new Error('inactive v11 payment method was reactivated.');
if(methods.includes('Bankily'))throw new Error('inactive v11 payment method leaked into new collection methods.');
if(D.getExpenses().length!==1||D.getExpenses()[0].name!=='طابعة')throw new Error('v11 expenses were not preserved.');
if(D.getSecurity().users[0]?.username!=='admin')throw new Error('v11 security users were not preserved.');

D.stopStudent(oldMonthly,'توقف مؤقت');
if(oldMonthly.active!==false||oldMonthly.frozenMonths!==1)throw new Error('stopping a monthly student did not discard the untouched pre-opened month.');
if(D.remainingAmount(oldMonthly)!==200)throw new Error('stopping changed the debt of the studied month.');
if(D.notificationsForStudent(oldMonthly).length!==0)throw new Error('stopped student still produced reminders.');
D.appendPayment(oldMonthly,{amount:200,method:'نقداً',date:'2026-09-09',targetMonth:1,persist:false});
if(oldMonthly.active!==false||D.remainingAmount(oldMonthly)!==0)throw new Error('paying old debt after stop reactivated the student or failed to close debt.');

const persisted=await D.persistExtrasNow();
if(!Array.isArray(persisted?.expenses)||!Array.isArray(persisted?.paymentMethodRecords)||!persisted?.security?.users)throw new Error('v13 backup persistence omitted Center Ops extra state.');

console.log('Upgrade/audit v13 verification passed: v11 data preserved, clean runtime enforced, stopped-month rules preserved, recovery signed, permissions guarded, receipts branded/offline.');
