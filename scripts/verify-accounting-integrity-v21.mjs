import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const read=path=>readFileSync(path,'utf8');
const requireText=(text,needle,label=needle)=>{if(!text.includes(needle))throw new Error(`Accounting integrity v21 missing: ${label}`);};
const assert=(condition,message)=>{if(!condition)throw new Error(`Accounting integrity v21 behavior failed: ${message}`);};

const runtime=read('assets/production-accounting-integrity-v21.js');
const index=read('index.html');
const build=read('scripts/build-production.mjs');
const gate=read('assets/production-license-gate-v8.js');
const pkg=read('package.json');

for(const [token,label] of [
  ["const SNAPSHOT_INDEX=12",'immutable accounting scope snapshot slot'],
  ['student-delete-with-finance','manual student deletion records finance removal'],
  ['سيُحذف ملف الطالب وجميع دفعاته من المالية الحالية','manual student deletion warns that finance is removed'],
  ['الفترة محفوظة في الأرشيف المالي','closed periods are archive-only in live finance views'],
  ['الفترة تجمع جزءًا مقفلًا وجزءًا مفتوحًا','mixed periods are not presented as fully archived'],
  ['فترة الدفعات تشمل أرشيفًا وبيانات حية','period payment search guards mixed fiscal ranges'],
  ['syncCertificateFinanceSummaryGuard','certificate finance summary is neutralized for archived/mixed ranges'],
  ["document.getElementById('dayV13')",'main finance guard follows the selected daily date'],
  ['هذه الدفعة أصلها داخل سنة مالية مقفلة','original closed payment cannot be moved into an open year'],
  ['expenseIdentityFirstRestore:true','expense restore uses identity-first matching'],
  ['branchIdentityRemapOnRestore:true','branch restore remaps imported references'],
  ['dedupeLegacyIncomingPayments','legacy backup payment deduplication'],
  ['expenseTombstones','deleted expense restore protection'],
  ['certificateTombstones','deleted certificate restore protection'],
  ['studentTombstones','manual deleted student restore protection'],
  ['historicalPaymentScopeSnapshots:true','payments retain historical branch/course classification'],
  ['window.allPayments=function()','finance and fiscal readers receive historical payment scope'],
  ["wrapRender(name)",'render guards are integrated at render boundaries'],
  ["'renderPeriod'",'unified search is guarded for archived payment periods'],
  ['EFC_DELETE_CERTIFICATE_RECEIPT_V13=async','certificate deletion receives tombstone protection'],
  ['window.EFC_APPLY_RESTORED_STATE=async','restore is preprocessed before existing merge chain']
])requireText(runtime,token,label);

function makeContext({expenses=[],branches=[],integrityState={}}={}){
  const storage=new Map([['efc-accounting-integrity-v21',JSON.stringify(integrityState)]]),savedExpenses=expenses.map(value=>({...value}));
  const document={addEventListener(){},querySelector(){return null;},querySelectorAll(){return[];},getElementById(){return null;}};
  const window={
    EFC_FISCAL_V14:{ready:true,lockedThrough:()=> '2026-09-15',isDateClosed:value=>String(value||'')<='2026-09-15'},
    EFC_STUDENT_LIFECYCLE_UI_V20:{ready:true},EFC_CENTER_OPS_V13:{ready:true},EFC_FINANCE_UI_V13:{ready:true},EFC_CERTIFICATES_V13:{ready:true},EFC_REGISTRATION_SCHEDULE_MATRIX_V17:{ready:true},
    EFC_DOMAIN_V13:{ready:true,getExpenses:()=>savedExpenses,getMethodRecords:()=>[],showDate:value=>String(value||''),today:()=> '2026-09-16',paymentTotal:student=>(student?.payments||[]).reduce((sum,p)=>sum+Number(p?.[1]||0),0),saveStudents(){},saveExpenses(next){savedExpenses.splice(0,savedExpenses.length,...next.map(value=>({...value})));}},
    EFC_RECEIPT_SEQUENCES_V10:{},EFC_REGISTER_STATE_CONTRIBUTOR(){},EFC_FORCE_PERSIST:async()=>{},EFC_APPLY_RESTORED_STATE:async incoming=>incoming,
    allPayments:()=>[],openStudent(){},renderFinance(){},renderLedger(){},renderPeriod(){},renderCurrentV13(){},EFC_RENDER_CERTIFICATES_V13(){},branches
  };
  const context={window,document,localStorage:{getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,String(value))},students:[],branches,allPayments:window.allPayments,openStudent:window.openStudent,renderFinance:window.renderFinance,renderLedger:window.renderLedger,renderPeriod:window.renderPeriod,renderCurrentV13:window.renderCurrentV13,EFC_RENDER_CERTIFICATES_V13:window.EFC_RENDER_CERTIFICATES_V13,location:{hash:''},Element:class{},HTMLFormElement:class{},Event:class{constructor(type,init={}){this.type=type;this.bubbles=init.bubbles;}},requestAnimationFrame:callback=>setTimeout(callback,0),setTimeout,clearTimeout,queueMicrotask,structuredClone,console,alert(){},confirm(){return false;}};
  window.window=window;Object.assign(window,{document:context.document,localStorage:context.localStorage,students:context.students,branches:context.branches,allPayments:context.allPayments,openStudent:context.openStudent,renderFinance:context.renderFinance,renderLedger:context.renderLedger,renderPeriod:context.renderPeriod,renderCurrentV13:context.renderCurrentV13,EFC_RENDER_CERTIFICATES_V13:context.EFC_RENDER_CERTIFICATES_V13,location:context.location,Element:context.Element,HTMLFormElement:context.HTMLFormElement,Event:context.Event,requestAnimationFrame:context.requestAnimationFrame,setTimeout,clearTimeout,queueMicrotask,structuredClone,console,alert:context.alert,confirm:context.confirm});
  vm.createContext(context);vm.runInContext(runtime,context,{filename:'production-accounting-integrity-v21.js'});return new Promise(resolve=>setTimeout(()=>resolve({context,window,savedExpenses}),80));
}

{
  const {window}=await makeContext();const api=window.EFC_ACCOUNTING_INTEGRITY_V21;assert(api?.ready,'runtime did not initialize in the behavior harness');
  assert(api.rangeState('2026-08-01','2026-09-15').status==='closed','fully closed range must be classified closed');
  const mixed=api.rangeState('2026-09-01','2026-09-30');assert(mixed.status==='mixed'&&mixed.openFrom==='2026-09-16','mixed range must expose first open day');
  assert(api.rangeState('2026-09-16','2026-09-30').status==='open','range after lock must remain open');
}

{
  const same={name:'Rent',amount:1000,method:'cash',branch:'A',specialty:'S',date:'2026-09-16',time:'10:00'};
  const {window}=await makeContext({expenses:[{id:'e1',...same},{id:'e2',...same}],branches:[{id:'A',name:'Nouadhibou'}]});
  const prepared=window.EFC_ACCOUNTING_INTEGRITY_V21.prepareIncoming({expenses:[{id:'e3',...same}]});
  assert(prepared.expenses.length===3,'two legitimate identical expenses and a third distinct id must all survive restore');
  assert(new Set(prepared.expenses.map(row=>row.id)).size===3,'expense identity must be based on id when ids exist');
}

{
  const same={name:'Rent',amount:1000,method:'cash',branch:'A',specialty:'S',date:'2026-09-16',time:'10:00'};
  const {window}=await makeContext({expenses:[{id:'e1',...same},{id:'e2',...same}],branches:[{id:'A',name:'Nouadhibou'}],integrityState:{expenseTombstones:[{id:'e1',deletedAt:1}]}});
  const prepared=window.EFC_ACCOUNTING_INTEGRITY_V21.prepareIncoming({expenses:[{id:'e2',...same},{id:'e3',...same}]});
  assert(!prepared.expenses.some(row=>row.id==='e1'),'deleted expense id must stay deleted');
  assert(prepared.expenses.some(row=>row.id==='e2')&&prepared.expenses.some(row=>row.id==='e3'),'id tombstone must not kill later expenses with identical details');
}

{
  const {window}=await makeContext({branches:[{id:'A',name:'Nouadhibou'}]});
  const prepared=window.EFC_ACCOUNTING_INTEGRITY_V21.prepareIncoming({branches:[{id:'B',name:'  Nouadhibou  '}],students:[{id:'s1',recordCode:'r1',branch:'B',specialty:'S',payments:[]}],expenses:[{id:'e1',name:'x',amount:1,method:'cash',branch:'B',specialty:'S',date:'2026-09-16',time:'10:00'}],certificateReceipts:[{id:'c1',recordCode:'cr1',transactionCode:'ct1',branchType:'internal',branchId:'B'}]});
  assert(prepared.branches.length===1&&prepared.branches[0].id==='A','same named branch must reuse canonical current id');
  assert(prepared.students[0].branch==='A','student branch reference must remap to canonical id');
  assert(prepared.expenses.some(row=>row.id==='e1'&&row.branch==='A'),'expense branch reference must remap to canonical id');
  assert(prepared.certificateReceipts[0].branchId==='A','internal certificate branch reference must remap to canonical id');
}

{
  const same={name:'Legacy rent',amount:700,method:'cash',branch:'A',specialty:'S',date:'2026-09-16',time:'11:00'};
  const {window}=await makeContext({expenses:[{id:'e1',...same},{id:'e2',...same}],branches:[{id:'A',name:'Nouadhibou'}]});
  const one=window.EFC_ACCOUNTING_INTEGRITY_V21.prepareIncoming({expenses:[{...same}]});
  assert(one.expenses.length===2,'one legacy no-id expense must dedupe against one existing identical occurrence');
  const three=window.EFC_ACCOUNTING_INTEGRITY_V21.prepareIncoming({expenses:[{...same},{...same},{...same}]});
  assert(three.expenses.length===3,'legacy expense dedupe must preserve multiplicity instead of collapsing identical real rows');
}

const runtimeVersion=gate.match(/const RUNTIME_VERSION='([^']+)'/)?.[1]||'';
assert(Boolean(runtimeVersion),'runtime cache version must exist');
requireText(index,`./assets/production-accounting-integrity-v21.js?v=${runtimeVersion}`,'index loads accounting integrity with synchronized cache version');
const gateScript=index.indexOf(`./assets/production-license-gate-v8.js?v=${runtimeVersion}`),integrityScript=index.indexOf(`./assets/production-accounting-integrity-v21.js?v=${runtimeVersion}`);
assert(gateScript>=0&&integrityScript>gateScript,'accounting integrity must load after the runtime gate script');
assert(!gate.includes("'./assets/production-accounting-integrity-v21.js'"),'accounting integrity must not be duplicated inside the dynamically loaded RUNTIME list');
requireText(build,"'assets/production-accounting-integrity-v21.js'",'production build copies accounting integrity runtime');
requireText(pkg,'node scripts/verify-accounting-integrity-v21.mjs','npm check runs accounting integrity verification');

console.log('Accounting integrity v21 source and behavioral invariants verified.');
