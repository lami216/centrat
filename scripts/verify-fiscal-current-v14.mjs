import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const source=readFileSync('assets/production-fiscal-year-v14.js','utf8');
const monthlySource=readFileSync('assets/production-monthly-prepayment-domain-v14.js','utf8');
const financeSource=readFileSync('assets/production-finance-ui-v13.js','utf8');
const securitySource=readFileSync('assets/production-security-ui-v13.js','utf8');
const certificateSource=readFileSync('assets/production-certificates-v13.js','utf8');
for(const [text,token] of [[monthlySource,"EFC_FISCAL_V14?.assertDateOpen?.(String(date||today()),'تاريخ الدفعة'"],[monthlySource,"EFC_FISCAL_V14?.assertDateOpen?.(candidatePaymentDate,'تاريخ الدفعة'"],[financeSource,"EFC_FISCAL_V14?.assertDateOpen?.(record.date,'تاريخ المصروف'"],[securitySource,'EFC_ENHANCE_FISCAL_SETTINGS_V14'],[certificateSource,'EFC_CERTIFICATE_STATE_V14']])assert.equal(text.includes(token),true,`missing fiscal integration: ${token}`);
for(const forbidden of ["addEventListener('hashchange'",'new MutationObserver(','window.open='])assert.equal(source.includes(forbidden),false,`forbidden fiscal runtime pattern: ${forbidden}`);
for(const required of ['currentLevelImplementation:true','ownerChoosesStartDate:true','automaticEndDate:true','annualSameAnchor:true','continuingStudentsRetained:true','debtorsRetained:true','separateCourseAndCertificateIncome:true','tombstoneRestoreProtection:true','pendingCloseJournal:true','closedPeriodsImmutable:true','noRouterHook:true'])assert.equal(source.includes(required),true,`missing fiscal contract: ${required}`);

let currentDate='2026-09-15';
const store=new Map();
const students=[
  {id:'active-cross',recordCode:'reg-active',name:'طالب مستمر',active:true,status:'active',branch:'main',specialty:'sp1',start:'2025-10-01',end:'2027-01-01',required:1200,paid:600,payments:[['2025-10-01',300,'نقداً'],['2026-09-15',300,'Bankily']]},
  {id:'ended-settled',recordCode:'reg-ended',name:'منتهي مسدد',active:true,status:'active',branch:'main',specialty:'sp1',start:'2025-01-01',end:'2026-06-01',required:500,paid:500,payments:[['2025-02-01',500,'نقداً']]},
  {id:'inactive-debt',recordCode:'reg-debt',name:'منتهي عليه دين',active:false,status:'inactive',branch:'main',specialty:'sp1',start:'2025-02-01',stoppedAt:'2026-05-02',required:500,paid:200,payments:[['2025-03-01',200,'نقداً']]},
  {id:'future',recordCode:'reg-future',name:'طالب جديد',active:true,status:'active',branch:'main',specialty:'sp1',start:'2026-10-01',end:'2027-11-01',required:700,paid:0,payments:[]}
];
let expenses=[
  {id:'e-old',name:'إيجار',amount:100,method:'نقداً',branch:'main',specialty:'__expense_general__',date:'2026-01-01',time:'09:00'},
  {id:'e-new',name:'كهرباء',amount:50,method:'Bankily',branch:'main',specialty:'__expense_general__',date:'2026-10-02',time:'09:00'}
];
let certificateState={certificateBranches:[{id:'c1',name:'مركز شهادات أ'}],certificateReceipts:[
  {id:'cert-old',recordCode:'cr-old',transactionCode:'ctx-old',receiptNo:1,studentName:'قديم',branchName:'مركز شهادات أ',specialtyName:'فرنسية',amount:300,method:'نقداً',date:'2026-02-01',time:'10:00'},
  {id:'cert-new',recordCode:'cr-new',transactionCode:'ctx-new',receiptNo:2,studentName:'جديد',branchName:'مركز شهادات أ',specialtyName:'فرنسية',amount:400,method:'Bankily',date:'2026-10-01',time:'10:00'}
]};
const paymentRows=()=>students.flatMap(student=>(student.payments||[]).map((payment,index)=>({student,date:payment[0],amount:Number(payment[1]),method:payment[2],paymentIndex:index,sourceType:'student'})));
const localStorage={getItem:key=>store.has(key)?store.get(key):null,setItem:(key,value)=>store.set(key,String(value)),removeItem:key=>store.delete(key)};
const document={head:{appendChild(){}},createElement(){return{style:{},appendChild(){},remove(){},addEventListener(){},prepend(){}};},querySelector(){return null;},getElementById(){return null;}};
const contributors=new Map();
let appliedIncoming=null;
const context={console,structuredClone,JSON,Date,Math,Intl,Promise,setTimeout,clearTimeout,localStorage,document,location:{hash:'#register',href:'http://localhost/'},confirm:()=>true,alert(){},students,specialties:[{id:'sp1',name:'فرنسية'}],methods:['نقداً','Bankily'],branchName:id=>id==='main'?'الفرع الرئيسي':String(id),spec:id=>id==='sp1'?{name:'فرنسية'}:null,allPayments:paymentRows};
context.window=context;
context.window.EFC_CERTIFICATES_V13={ready:true};
context.window.EFC_CERTIFICATE_STATE_V14={snapshot:()=>structuredClone(certificateState),purgeReceiptsByIdentity:async({ids=[],recordCodes=[],transactionCodes=[]}={})=>{const idSet=new Set(ids.map(String)),records=new Set(recordCodes.map(String)),transactions=new Set(transactionCodes.map(String)),before=certificateState.certificateReceipts.length;certificateState={...certificateState,certificateReceipts:certificateState.certificateReceipts.filter(row=>!idSet.has(String(row.id||''))&&!records.has(String(row.recordCode||''))&&!transactions.has(String(row.transactionCode||'')))};return{deleted:before-certificateState.certificateReceipts.length};}};
context.window.EFC_AUTH_V13={currentUser:()=>({username:'Admin',role:'admin'})};
context.window.EFC_REGISTER_STATE_CONTRIBUTOR=(name,fn)=>contributors.set(name,fn);
context.window.EFC_FORCE_PERSIST=async()=>{let snapshot={students:structuredClone(students),specialties:[],paymentMethods:['نقداً','Bankily']};for(const fn of contributors.values())snapshot=await fn(snapshot)||snapshot;return snapshot;};
context.window.EFC_APPLY_RESTORED_STATE=async incoming=>{appliedIncoming=structuredClone(incoming);return incoming;};
context.window.EFC_DOMAIN_V13={ready:true,esc:value=>String(value??''),today:()=>currentDate,cash:value=>`${Number(value||0)}`,showDate:value=>String(value||''),remainingAmount:s=>Math.max(0,Number(s.required||0)-(s.payments||[]).reduce((sum,p)=>sum+Number(p?.[1]||0),0)),expenseSpecialtyName:v=>v==='__expense_general__'?'مصروف عام':String(v||'—'),getExpenses:()=>expenses,saveExpenses:next=>{expenses=next;},saveStudents:()=>{}};
vm.createContext(context);
vm.runInContext(source,context,{filename:'production-fiscal-year-v14.js'});
await new Promise(resolve=>setTimeout(resolve,0));
const F=context.window.EFC_FISCAL_V14;
assert.equal(F?.ready,true);
assert.equal(F.addYearsClamped('2024-02-29',1),'2025-02-28');
assert.equal(F.addYearsClamped('2024-02-29',4),'2028-02-29');

await F.configure('2025-09-15');
let saved=F.getState();
assert.equal(saved.config.anchorDate,'2025-09-15');
assert.equal(saved.config.firstEndDate,'2026-09-14');
let plan=F.nextPlan();
assert.deepEqual(JSON.parse(JSON.stringify(plan)),{number:1,boundary:'2026-09-15',declaredStart:'2025-09-15',periodStart:null,periodEnd:'2026-09-14',first:true,due:true});
let preview=F.previewArchive();
assert.equal(preview.totals.courseIncome,1000,'first archive should include all prior course income through fiscal end');
assert.equal(preview.totals.certificateIncome,300);
assert.equal(preview.totals.expenses,100);
assert.equal(preview.totals.totalIncome,1300);
assert.equal(preview.totals.net,1200);
assert.equal(F.studentContinuesAfter(students[0],plan.periodEnd),true);
assert.equal(F.eligibleStudent(students[1],plan),true,'ended settled student should be eligible even if active flag was never manually stopped');
assert.equal(F.eligibleStudent(students[2],plan),false,'debtor must remain');

const first=await F.closeCurrentYear();
assert.equal(first.number,1);
assert.equal(students.some(s=>s.recordCode==='reg-active'),true,'cross-year student must remain');
assert.equal(students.find(s=>s.recordCode==='reg-active').payments.length,2,'continuing student history remains intact');
assert.equal(students.some(s=>s.recordCode==='reg-ended'),false,'ended settled student should be purged');
assert.equal(students.some(s=>s.recordCode==='reg-debt'),true,'debtor must remain');
assert.deepEqual(expenses.map(x=>x.id),['e-new']);
assert.deepEqual(certificateState.certificateReceipts.map(x=>x.recordCode),['cr-new']);
assert.equal(first.cleanup.studentIds.includes('ended-settled'),true);
assert.equal(first.cleanup.studentRecordCodes.includes('reg-ended'),true);
assert.equal(first.cleanup.expenseIds.includes('e-old'),true);
assert.equal(first.cleanup.certificateIds.includes('cert-old'),true);
assert.equal(first.cleanup.certificateRecordCodes.includes('cr-old'),true);
assert.equal(F.lockedThrough(),'2026-09-14');
assert.equal(F.isDateClosed('2026-09-14'),true);
assert.equal(F.isDateClosed('2026-09-15'),false);
assert.throws(()=>F.assertDateOpen('2026-09-14','تاريخ الدفعة'),/سنة مالية مقفلة/);
assert.doesNotThrow(()=>F.assertDateOpen('2026-09-15','تاريخ الدفعة'));

plan=F.nextPlan();
assert.equal(plan.number,2);
assert.equal(plan.periodStart,'2026-09-15');
assert.equal(plan.periodEnd,'2027-09-14');
preview=F.previewArchive();
assert.equal(preview.totals.courseIncome,300,'next archive must not recount previous-year continuing-student payment');
assert.equal(preview.totals.certificateIncome,400);
assert.equal(preview.totals.expenses,50);

const imported={students:[{id:'ended-settled',payments:[]}],expenses:[{id:'e-old',amount:100}],certificateReceipts:[{id:'cert-old'}],specialties:[],paymentMethods:[],fiscalState:F.getState()};
await context.window.EFC_APPLY_RESTORED_STATE(imported);
assert.equal(appliedIncoming.students.length,0,'closed student tombstone must filter restored backup');
assert.equal(appliedIncoming.expenses.length,0,'closed expense tombstone must filter restored backup');
assert.equal(appliedIncoming.certificateReceipts.length,0,'closed certificate tombstone must filter restored backup');
const mismatch=structuredClone(F.getState());mismatch.config.anchorDate='2025-10-01';mismatch.config.firstEndDate='2026-09-30';
await assert.rejects(context.window.EFC_APPLY_RESTORED_STATE({students:[],specialties:[],paymentMethods:[],fiscalState:mismatch}),/بداية سنة مالية مختلفة/,'different fiscal anchors must never be silently merged');

saved=F.getState();
assert.equal(saved.archives.length,1);
assert.equal(saved.archives[0].totals.courseIncome,1000);
assert.equal(saved.pendingClose,null);
console.log('Fiscal v14 verification passed: owner anchor/end, annual recurrence, aggregate archive, cross-year retention, debtor retention, detail cleanup, tombstone restore protection, closed-period lock.');
