import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';

const lifecycle=readFileSync('assets/production-student-lifecycle-domain-v20.js','utf8');
const ui=readFileSync('assets/production-student-lifecycle-ui-v20.js','utf8');
const gate=readFileSync('assets/production-license-gate-v8.js','utf8');
const build=readFileSync('scripts/build-production.mjs','utf8');

new Function(lifecycle);
new Function(ui);
const need=(text,token,label=token)=>{if(!text.includes(token))throw new Error(`Student lifecycle v20 missing: ${label}`);};
for(const [token,label] of [
  ["registrationNumberPolicy:'successor-sealed-latest-reusable'",'successor-sealed registration policy'],
  ['latestRegistrationNumberReusableUntilSuccessor:true','latest registration remains reusable'],
  ['olderRegistrationNumbersStayReserved:true','older registration numbers stay reserved'],
  ['function previewRegistrationNumber(branch,specialty)','target-scope number preview'],
  ['function markRegistrationReleased(branch,specialty,number)','explicit latest-number release'],
  ['function sealRegistrationNumber(branch,specialty,number)','explicit permanent sealing'],
  ['function updateStudentRegistration(student,changes={})','automatic scope-change edit wrapper'],
  ['commitRegistrationNumber(targetBranch,targetSpecialty,candidate)','scope change commits automatic target number'],
  ['markRegistrationReleased(old.branch,old.specialty,old.reg)','old scope releases only its provisional latest number'],
  ['closedFiscalFinancialIdentityEditBlocked:true','closed fiscal history cannot be reclassified'],
  ['function deleteStudentPermanently(student)','permanent student delete path'],
  ['studentLifecycleV20:clone(state)','backup contributor contains lifecycle state'],
  ['filterDeletedStudents(incoming)','deleted students are filtered from restores'],
  ['function monthlyCoverageEnd(student)','monthly coverage end calculator']
])need(lifecycle,token,label);
for(const [token,label] of [
  ["label.textContent='نهاية الشهر'",'student file monthly end label'],
  ['student-edit-info-v20','student edit action'],
  ['student-delete-v20','student delete action'],
  ['previewRegistrationNumber?.(branch,specialty)','automatic register preview on course/branch change'],
  ['registrationNumberHintRemoved:true','redundant register-number hint removed from edit form'],
  ['تغيير المركز أو الدورة هنا يُعامل كتصحيح لنفس ملف الطالب','scope-change correction warning'],
  ['studentActionButtonsColored:true','student file actions use distinct colors'],
  ['studentActionButtonsDarkBorder:true','student file actions have dark borders'],
  ['.student-actions-v13 .prepay-next-v14{background:#0b705a!important','new monthly payment action is visibly green']
])need(ui,token,label);
need(gate,"'./assets/production-student-lifecycle-domain-v20.js'",'domain runtime in gate');
need(gate,"'./assets/production-student-lifecycle-ui-v20.js'",'UI runtime in gate');
need(build,"'assets/production-student-lifecycle-domain-v20.js'",'domain runtime packaged');
need(build,"'assets/production-student-lifecycle-ui-v20.js'",'UI runtime packaged');

const values=new Map(),contributors=new Map();
const addDuration=(value,count,unit)=>{
  const d=new Date(`${value}T12:00:00`);if(unit==='month'){const day=d.getDate();d.setDate(1);d.setMonth(d.getMonth()+Number(count));const last=new Date(d.getFullYear(),d.getMonth()+1,0).getDate();d.setDate(Math.min(day,last));}
  const pad=n=>String(n).padStart(2,'0');return`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
};
const addDays=(value,count)=>{const d=new Date(`${value}T12:00:00`);d.setDate(d.getDate()+Number(count));const pad=n=>String(n).padStart(2,'0');return`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;};
const scopeKey=(branch,specialty)=>`${encodeURIComponent(branch)}|${encodeURIComponent(specialty)}`;
const students=[{id:'s5',recordCode:'r5',branch:'A',specialty:'F',reg:5,start:'2026-09-16',snapshot:{dynamicMonthly:true,billing:'monthly',fee:1000},payments:[],updatedAt:10}];
let restored=null;
const sequenceBase={identitySnapshot:()=>({registrationLastByScope:{[scopeKey('A','F')]:5}}),registrationNumbersNeverReused:true};
const baseDomain={
  ready:true,monthlyPrepayment:true,
  isDynamicMonthly:s=>Boolean(s?.snapshot?.dynamicMonthly),
  isInactive:s=>s?.active===false||s?.status==='inactive',
  addDays,paymentTotal:s=>(s?.payments||[]).reduce((sum,p)=>sum+Number(p?.[1]||0),0),
  showDate:v=>v||'—',cash:v=>String(v),
  saveStudents:()=>{},
  updateStudentRegistration:(student,changes)=>{student.branch=String(changes.branch??student.branch);student.specialty=String(changes.specialty??student.specialty);if(changes.start!==undefined)student.start=String(changes.start);if(changes.fee!==undefined)student.snapshot={...(student.snapshot||{}),fee:Number(changes.fee)};student.updatedAt=Date.now();return{student,paymentIndex:null};}
};
const window={
  EFC_DOMAIN_V13:baseDomain,EFC_RECEIPT_SEQUENCES_V10:sequenceBase,
  EFC_REGISTER_STATE_CONTRIBUTOR:(name,fn)=>contributors.set(name,fn),
  EFC_APPLY_RESTORED_STATE:async incoming=>{restored=incoming;return incoming;},
  EFC_CORE_CHANGED:()=>{},EFC_FORCE_PERSIST:async()=>{},EFC_CODES:{ensureStudentRecord:s=>s.recordCode||'generated'}
};
const context={window,students,localStorage:{getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,String(v))},structuredClone,crypto:webcrypto,console,Date,Math,Number,String,Object,Array,Set,Map,JSON,Promise,encodeURIComponent,addDuration,setTimeout,clearTimeout};
context.globalThis=context;
vm.runInNewContext(lifecycle,context,{filename:'production-student-lifecycle-domain-v20.js'});
await Promise.resolve();
const seq=window.EFC_RECEIPT_SEQUENCES_V10,D=window.EFC_DOMAIN_V13;
if(seq.previewRegistrationNumber('A','F')!==6)throw new Error('Active latest #5 must make the next number #6.');
await D.deleteStudentPermanently(students[0]);
if(seq.previewRegistrationNumber('A','F')!==5)throw new Error('Deleted latest #5 must be reusable before #6 is issued.');
const five={id:'s5b',recordCode:'r5b',branch:'A',specialty:'F',reg:5,start:'2026-09-16',snapshot:{dynamicMonthly:true,billing:'monthly',fee:1000},payments:[]};students.push(five);seq.noteRegistrationNumber('A','F',5);
if(seq.previewRegistrationNumber('A','F')!==6)throw new Error('Reissued #5 must advance the preview to #6 while #5 exists.');
const six={id:'s6',recordCode:'r6',branch:'A',specialty:'F',reg:6,start:'2026-09-16',snapshot:{dynamicMonthly:true,billing:'monthly',fee:1000},payments:[]};students.push(six);seq.noteRegistrationNumber('A','F',6);
await D.deleteStudentPermanently(five);
if(seq.previewRegistrationNumber('A','F')!==7)throw new Error('Deleting sealed #5 must not change active #6 or make #5 reusable.');
await D.deleteStudentPermanently(six);
if(seq.previewRegistrationNumber('A','F')!==6)throw new Error('Deleted latest #6 must be reusable, while sealed #5 remains reserved.');

students.push({id:'target3',recordCode:'target3',branch:'B',specialty:'FR',reg:3,start:'2026-09-16',snapshot:{dynamicMonthly:true,billing:'monthly',fee:1000},payments:[]});seq.noteRegistrationNumber('B','FR',3);
const moving={id:'moving',recordCode:'moving',branch:'A',specialty:'F',reg:6,start:'2026-09-16',snapshot:{dynamicMonthly:true,billing:'monthly',fee:1000},payments:[]};students.push(moving);seq.noteRegistrationNumber('A','F',6);
D.updateStudentRegistration(moving,{branch:'B',specialty:'FR'});
if(moving.reg!==4)throw new Error(`Scope change must assign target branch/course number #4 automatically, received #${moving.reg}.`);
if(seq.previewRegistrationNumber('A','F')!==6)throw new Error('Moving the provisional latest student must release that old-scope number for reuse.');

const archived={id:'archive2',recordCode:'archive2',branch:'C',specialty:'EN',reg:2,start:'2026-01-01',snapshot:{dynamicMonthly:true,billing:'monthly',fee:1000},payments:[]};students.push(archived);seq.noteRegistrationNumber('C','EN',2);await Promise.resolve();students.splice(students.indexOf(archived),1);
if(seq.previewRegistrationNumber('C','EN')!==3)throw new Error('A latest number that disappears without an explicit delete/move release must be sealed, as with fiscal archival cleanup.');

const monthly={id:'month',recordCode:'month',branch:'B',specialty:'FR',reg:5,start:'2026-09-16',snapshot:{dynamicMonthly:true,billing:'monthly',fee:1000},payments:[["2026-09-16",1000,'cash','08:00',1,'','tx1',1,null,null,[{monthNumber:1,amount:1000}]]]};
if(D.monthlyCoverageEnd(monthly)!=='2026-10-15')throw new Error(`Month 1 end must be 2026-10-15, got ${D.monthlyCoverageEnd(monthly)}.`);
monthly.payments.push(["2026-10-16",1000,'cash','08:00',2,'','tx2',2,null,null,[{monthNumber:2,amount:1000}]]);
if(D.monthlyCoverageEnd(monthly)!=='2026-11-15')throw new Error(`Latest paid month end must advance to 2026-11-15, got ${D.monthlyCoverageEnd(monthly)}.`);
const monthlyPartial={id:'month-partial',recordCode:'month-partial',branch:'B',specialty:'FR',reg:6,start:'2026-09-16',snapshot:{dynamicMonthly:true,billing:'monthly',fee:1000},payments:[["2026-09-16",1000,'cash','08:00',1,'','txp1',1,null,null,[{monthNumber:1,amount:1000}]],["2026-10-14",250,'cash','08:00',2,'','txp2',2,null,null,[{monthNumber:2,amount:250}]]]};
if(D.monthlyCoverageEnd(monthlyPartial)!=='2026-11-15')throw new Error(`A partial payment that starts month 2 must still show that month end, got ${D.monthlyCoverageEnd(monthlyPartial)}.`);

window.EFC_FISCAL_V14={isDateClosed:date=>String(date)<='2025-12-31'};
const closed={id:'closed',recordCode:'closed',branch:'D',specialty:'AR',reg:1,start:'2025-12-01',snapshot:{dynamicMonthly:true,billing:'monthly',fee:1000},payments:[["2025-12-01",1000,'cash']]};students.push(closed);seq.noteRegistrationNumber('D','AR',1);let blocked=false;
try{D.updateStudentRegistration(closed,{branch:'B',specialty:'FR'});}catch{blocked=true;}
if(!blocked)throw new Error('A student with closed-year financial history must not be reclassified to another branch/course.');

await window.EFC_APPLY_RESTORED_STATE({students:[{id:'s5',recordCode:'r5',branch:'A',specialty:'F',reg:5}]});
if(restored.students.length!==0)throw new Error('A permanently deleted student must not be resurrected by an older backup.');

console.log('Student lifecycle v20 verified: latest registration reuse until successor, sealed older/archive numbers, automatic target-scope numbering, closed-period reclassification protection, monthly paid-through end date, and deletion tombstones.');
