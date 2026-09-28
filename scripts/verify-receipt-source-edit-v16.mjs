import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import vm from 'node:vm';

const read=path=>readFileSync(path,'utf8');
const files={base:'assets/production-registration-schedule-v13.js',matrix:'assets/production-registration-schedule-matrix-v17.js',receipts:'assets/production-receipts-v13.js',students:'assets/production-student-ui-v13.js',domain:'assets/production-monthly-prepayment-domain-v14.js'};
for(const path of Object.values(files))execFileSync(process.execPath,['--check',path],{stdio:'inherit'});
const source=Object.fromEntries(Object.entries(files).map(([key,path])=>[key,read(path)]));
const need=(text,token,label=token)=>{if(!text.includes(token))throw new Error(`Receipt/source verifier missing: ${label}`);};
const forbid=(text,token,label=token)=>{if(text.includes(token))throw new Error(`Receipt/source verifier regression: ${label}`);};

for(const text of [source.base,source.matrix]){need(text,'const ALLOWED_HOURS=[8,10,12,14,16,17,18,19,20];','restricted timetable hour list');forbid(text,'Array.from({length:24},(_,hour)=>{','24-hour timetable list');}
for(const token of ['registrationNumberImmutable:true','registrationCollisionOnlyOnScopeChange:true',"changes.reg!==undefined",'const scopeChanged='])need(source.domain,token,`registration guard ${token}`);
for(const token of ['function receiptEditable(model)','model?.editableReceipt!==false','editableReceipt:!statement',"receiptSource:statement?'statement':'payment'",'aggregateReceiptNotEditable:true'])need(source.receipts,token,`receipt edit rule ${token}`);
for(const token of ['function monthReceiptSourceV15','D.paymentAllocations','contributions.length===1','sourceEquivalent:true','editableReceipt:false',"receiptSource:'derived-month'",'EFC_MONTH_RECEIPT_MODEL_V15'])need(source.students,token,`month receipt source rule ${token}`);
for(const token of ["model?.statement||model?.editableReceipt===false",'findIndex(payment=>String(payment?.[6]||\'\')===transactionCode)','transactionCodeEditResolution:true','fixedRegistrationNumberDisplay:true'])need(source.matrix,token,`edit entry safety ${token}`);
forbid(source.matrix,'رقم السجل<input','registration number must not be an editable-looking input');

// Execute the student receipt source classifier against representative payment shapes.
const document={createElement:()=>({textContent:'',style:{}}),head:{appendChild(){}},querySelectorAll:()=>[],getElementById:()=>null};
const makeDomain=()=>({ready:true,OFFICIAL_NAME:'EFC',esc:String,today:()=> '2026-09-16',nowTime:()=> '10:00',cash:value=>String(value),showDate:String,courseTypeOf:()=> 'normal',isDynamicMonthly:()=>true,isNewModel:()=>true,isInactive:()=>false,paymentTotal:s=>(s.payments||[]).reduce((a,p)=>a+Number(p?.[1]||0),0),requiredAmount:()=>1200,remainingAmount:()=>0,reconcileStudent:s=>s,installmentPlan:s=>s.plan||[],targetRemaining:()=>0,appendPayment(){},stopStudent(){},notificationsForStudent:()=>[],paymentAllocations:(student,index)=>student.allocations?.[index]||[]});
const context={console,window:{EFC_DOMAIN_V13:makeDomain()},document,students:[],specialties:[],methods:[],openPayment(){},renderSpecialties(){},renderRegister(){},renderStudents(){},renderPeriod(){},badge:v=>String(v),table:()=>'',branchName:id=>id,spec:()=>({name:'دورة'}),courseStatus:()=>'',financialStatus:()=>'',daysBetween:()=>0,unitLabel:v=>v,opts:()=>'',pageTitle:()=>'',receiptModelV4:(student,index)=>({studentId:student.id,paymentIndex:index,transactionCode:String(student.payments[index]?.[6]||''),editableReceipt:true,receiptSource:'payment',student:student.name,amount:Number(student.payments[index]?.[1]||0)}),receiptWindowV4(){},convertDigitsInNodeV3(){},history:{},location:{},setTimeout,clearTimeout};
context.window.window=context.window;Object.assign(context.window,{EFC_AUTH_V13:{canEdit:()=>true,canView:()=>true}});Object.assign(context,context.window);vm.createContext(context);vm.runInContext(source.students,context,{filename:files.students});
const mk=()=>({id:'s1',name:'طالب',branch:'main',specialty:'sp',reg:1,start:'2026-09-01',payments:[],allocations:{},plan:[]});
let s=mk();s.payments=[[ '2026-09-01',600,'نقداً','10:00',1,'','tx-1',1,10 ]];s.allocations[0]=[{monthNumber:1,amount:600}];s.plan=[{number:1,dueDate:'2026-09-01',paid:600,remaining:0}];let model=context.window.EFC_MONTH_RECEIPT_MODEL_V15(s,1);if(!model?.editableReceipt||!model?.sourceEquivalent||model.paymentIndex!==0||model.transactionCode!=='tx-1')throw new Error('One-payment one-month receipt must edit its source transaction.');
s=mk();s.payments=[[ '2026-09-01',1200,'نقداً','10:00',1,'','tx-2',1,11 ]];s.allocations[0]=[{monthNumber:1,amount:600},{monthNumber:2,amount:600}];s.plan=[{number:1,dueDate:'2026-09-01',paid:600,remaining:0},{number:2,dueDate:'2026-10-01',paid:600,remaining:0}];model=context.window.EFC_MONTH_RECEIPT_MODEL_V15(s,1);if(model?.editableReceipt||model?.sourceEquivalent||model?.paymentIndex!==null)throw new Error('Split prepayment child receipt must stay read-only.');
s=mk();s.payments=[[ '2026-09-01',300,'نقداً','10:00',1,'','tx-a',1,12 ],[ '2026-09-02',300,'Bankily','10:00',2,'','tx-b',1,13 ]];s.allocations[0]=[{monthNumber:1,amount:300}];s.allocations[1]=[{monthNumber:1,amount:300}];s.plan=[{number:1,dueDate:'2026-09-01',paid:600,remaining:0}];model=context.window.EFC_MONTH_RECEIPT_MODEL_V15(s,1);if(model?.editableReceipt||model?.paymentIndex!==null)throw new Error('Aggregate month receipt from multiple source payments must stay read-only.');

console.log('Receipt/source edit v16 verified: restricted hours, immutable registration number, transaction-code source resolution, exact-clone month editing, and derived receipt protection.');
