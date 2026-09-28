import {readFileSync,existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';

const files={domain:'assets/production-domain-v13.js',patch:'assets/production-monthly-prepayment-domain-v14.js',ui:'assets/production-monthly-prepayment-ui-v14.js',gate:'assets/production-license-gate-v8.js',build:'scripts/build-production.mjs'};
for(const path of Object.values(files))if(!existsSync(path))throw new Error(`Missing monthly prepayment file: ${path}`);
execFileSync(process.execPath,['--check',files.patch],{stdio:'inherit'});
execFileSync(process.execPath,['--check',files.ui],{stdio:'inherit'});
const source=Object.fromEntries(Object.entries(files).map(([key,path])=>[key,readFileSync(path,'utf8')]));
const requireText=(text,needle,label=needle)=>{if(!text.includes(needle))throw new Error(`Monthly prepayment v14 missing: ${label}`);};
for(const [token,label] of [
  ['prepayAcrossMonths:true','domain prepayment marker'],['allocationPersisted:true','persisted allocation marker'],['nextMonthVisibleBeforeRenewal:true','early next-month visibility'],['renewalWarningBeforeMonth:true','renewal warning timing marker'],['monthlyRenewalWarningDays:RENEWAL_WARNING_DAYS','three-day renewal warning export'],['debtStartsWithUnpaidRenewal:true','debt begins when unpaid renewal starts'],['inclusiveReminderSalutation:true','inclusive student reminder salutation'],['payment[10]','payment allocation metadata'],['allocationSummary','shared allocation statement'],['renewalDate=number===1?addDuration(monthStart,1,\'month\'):monthStart','renewal boundary calculation'],['dueFrom=addDays(renewalDate,-RENEWAL_WARNING_DAYS)','three-day renewal warning threshold'],
  ['registrationEditAtomic:true','atomic registration edit marker'],['registrationEditStudentScoped:true','student-scoped registration edit marker'],['monthlyReallocationOnEdit:true','monthly reallocation edit marker'],['historicalCourseSnapshotPreservedOnEdit:true','historical course snapshot protection'],['registrationNumberCollisionGuard:true','registration number collision guard'],['zeroPaymentRegistrationCanCreateTransaction:true','zero-payment registration edit support'],['rollbackOnLocalSaveFailure:true','rollback on local persistence failure'],['revisionStampedPayments:true','payment revision stamping'],['stoppedStudentHasEndDate:true','stopped student end-date marker'],['stoppedMonthlyPaidThroughProtected:true','paid-through stop protection marker'],['monthlyCoverageEndForSearch:true','monthly ending-search coverage marker'],['function monthlyCoverageEnd(student,asOf=today())','monthly coverage end resolver'],['function updateStudentRegistration(student,changes={})','source registration update function'],['const draft=clone(student)','edit validation happens on a draft'],['Object.assign(student,draft)','validated edit commits atomically']
])requireText(source.patch,token,label);
for(const [token,label] of [
  ["const DAYS=['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];",'monthly registration still reads the full seven-day schedule schema'],
  ['registrationOverpayment:true','registration overpayment UI'],['paymentOverMonthValue:true','payment larger than month UI'],['studentPrepaidMonthBadges:true','prepaid month badge UI'],['monthReceiptUsesAllocations:true','month receipt allocation UI'],['ledgerUsesAllocationSummary:true','ledger allocation statement UI'],['canonicalLedgerRenderer:true','canonical ledger renderer'],['singleLedgerRenderOwner:true','single ledger render owner'],['noLedgerWrapperChain:true','no ledger wrapper chain'],['synchronousLedgerEnhancement:true','synchronous ledger allocation enhancement'],['newPaymentButtonLabel:true','shared new-payment action label'],["button.textContent='تسجيل دفعة جديدة'",'monthly student action wording'],['يمكن إدخال قيمة أكبر من قيمة الشهر','overpayment explanation']
])requireText(source.ui,token,label);
if(source.ui.includes("button.textContent='تسجيل دفعة شهرية'"))throw new Error('Obsolete monthly-only payment action label returned.');
if(source.ui.includes('const baseRenderLedger=window.renderLedger'))throw new Error('Monthly UI must not wrap the ledger renderer.');
if(source.ui.includes('setTimeout(enhanceLedger,0)'))throw new Error('Monthly ledger enhancement must be synchronous.');
if(source.patch.includes('عزيزي الطالب '))throw new Error('Monthly reminders still use the male-only salutation.');
if(source.patch.includes('تجاهل'))throw new Error('Monthly reminders must require account reconciliation instead of ignoring a reminder.');
const order=['production-domain-v13.js','production-monthly-prepayment-domain-v14.js','production-receipt-sequences-v10.js','production-student-ui-v13.js','production-registration-schedule-v13.js','production-finance-ui-v13.js','production-monthly-prepayment-ui-v14.js','production-security-ui-v13.js'];
let last=-1;for(const token of order){const pos=source.gate.indexOf(token);if(pos<0)throw new Error(`License gate missing ${token}`);if(pos<last)throw new Error(`Monthly prepayment runtime order is wrong at ${token}`);last=pos;}
for(const token of ['assets/production-monthly-prepayment-domain-v14.js','assets/production-monthly-prepayment-ui-v14.js'])requireText(source.build,token,`production build includes ${token}`);

const store=new Map();
const localStorage={getItem:key=>store.has(key)?store.get(key):null,setItem:(key,value)=>store.set(key,String(value)),removeItem:key=>store.delete(key)};
const students=[];
const specialties=[
  {id:'normal',name:'عادية',courseType:'normal',billing:'monthly',durationUnit:'month',durationValue:1},
  {id:'quick',name:'سريعة',courseType:'quick',billing:'one_time',durationUnit:'day',durationValue:30,quickDays:30}
];
const methods=['نقداً','Bankily'];
const dateOnly=value=>new Date(`${value}T12:00:00`),pad=value=>String(value).padStart(2,'0'),iso=date=>`${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}`;
const addDuration=(start,value,unit)=>{const date=dateOnly(start);if(unit==='day')date.setDate(date.getDate()+Number(value));if(unit==='month'){const day=date.getDate();date.setDate(1);date.setMonth(date.getMonth()+Number(value));const lastDay=new Date(date.getFullYear(),date.getMonth()+1,0).getDate();date.setDate(Math.min(day,lastDay));}return iso(date);};
const money=value=>`${Number(value||0)} أوقية`,fmtDate=value=>String(value||'');
const context={console,Date,setTimeout,clearTimeout,structuredClone,crypto:webcrypto,TextEncoder,TextDecoder,Uint8Array,atob:globalThis.atob,btoa:globalThis.btoa,localStorage,students,specialties,methods,DEMO_TODAY:'2026-09-09',dateOnly,iso,addDuration,money,moneyV3:money,fmtDate,fmtDateV3:fmtDate,spec:id=>specialties.find(item=>item.id===id),branchName:id=>id,saveStudents:()=>localStorage.setItem('efc-students-v1',JSON.stringify(students)),saveSpecs:()=>{},remainingOf:student=>Math.max(0,Number(student.required||0)-Number(student.paid||0)),courseStatus:()=> 'نشطة',financialStatus:()=> 'لم يدفع',installmentPlanV3:()=>[],monthlyFocusV3:()=>null,dueNowV3:student=>Math.max(0,Number(student.required||0)-Number(student.paid||0)),suggestedPaymentV3:student=>Math.max(0,Number(student.required||0)-Number(student.paid||0)),allocV4:()=>({desc:'',before:0,after:0,months:[]}),receiptModelV4:(student,index,statement=false)=>({statement,student:student.name,amount:index===null?0:Number(student.payments?.[Number(index)]?.[1]||0),remaining:Number(student.required||0),month:'—',desc:''}),window:{EFC_RECEIPTS_V13:{ready:true},EFC_FORCE_PERSIST:async()=>({students,specialties,paymentMethods:methods}),EFC_APPLY_RESTORED_STATE:async()=>({}),EFC_CODES:{newTransactionCode:student=>`tx-${student.id}-${student.payments.length+1}`,ensureStudentRecord:()=> 'record'}}};
context.window.window=context.window;vm.createContext(context);vm.runInContext(source.domain,context,{filename:files.domain});await context.window.EFC_DOMAIN_V13_READY;vm.runInContext(source.patch,context,{filename:files.patch});const D=context.window.EFC_DOMAIN_V13;if(!D?.monthlyPrepayment)throw new Error('Patched domain was not published.');

const makeStudent=(id='m1',specialty='normal',fee=600)=>({id,name:id,phone:'',branch:'main',specialty,reg:1,start:'2026-09-09',end:specialty==='quick'?'2026-10-09':'',required:fee,paid:0,active:true,status:'active',debtDueDates:{},schedule:null,snapshot:{centerOpsV13:true,centerOpsMonthlyV13:specialty==='normal',dynamicMonthly:specialty==='normal',courseType:specialty==='normal'?'normal':'quick',billing:specialty==='normal'?'monthly':'one_time',fee,durationValue:specialty==='normal'?1:30,durationUnit:specialty==='normal'?'month':'day'},payments:[]});
const snapshot=value=>JSON.stringify(value);
const allocationTotal=payment=>(Array.isArray(payment?.[10])?payment[10]:[]).reduce((sum,item)=>sum+Number(item?.amount||0),0);

const twoMonths=makeStudent('two');students.push(twoMonths);const twoIndex=D.appendPayment(twoMonths,{amount:1200,method:'نقداً',date:'2026-09-09',targetMonth:1,persist:false});if(twoIndex!==0||twoMonths.payments.length!==1)throw new Error('Two-month prepayment must remain one financial transaction.');
if(!Array.isArray(twoMonths.payments[0][10])||twoMonths.payments[0][10].length!==2)throw new Error('Two-month allocation was not persisted on the payment.');
if(!Number(twoMonths.payments[0][11])||!Number(twoMonths.updatedAt))throw new Error('New monthly payment did not receive merge revision metadata.');
let plan=D.installmentPlan(twoMonths,'2026-09-09');if(plan.length!==2||plan[0].paid!==600||plan[1].paid!==600||!plan[1].prepaid||D.remainingAmount(twoMonths,'2026-09-09')!==0)throw new Error('Full two-month prepayment allocation is incorrect.');
if(!D.allocationSummary(twoMonths,0,'2026-09-09').includes('الشهر 1 كامل')||!D.allocationSummary(twoMonths,0,'2026-09-09').includes('الشهر 2 كامل'))throw new Error('Two-month receipt statement is unclear.');

const partNext=makeStudent('partial-next');students.push(partNext);D.appendPayment(partNext,{amount:900,method:'Bankily',date:'2026-09-09',targetMonth:1,persist:false});plan=D.installmentPlan(partNext,'2026-09-09');if(plan.length!==2||plan[0].paid!==600||plan[1].paid!==300||!plan[1].partialPrepaid||D.remainingAmount(partNext,'2026-09-09')!==300)throw new Error('Partial next-month prepayment allocation is incorrect.');
if(!D.allocationSummary(partNext,0,'2026-09-09').includes('جزء من الشهر 2'))throw new Error('Partial next-month statement is missing.');

const carry=makeStudent('carry');students.push(carry);D.appendPayment(carry,{amount:400,method:'نقداً',date:'2026-09-09',targetMonth:1,persist:false});const carryIndex=D.appendPayment(carry,{amount:800,method:'نقداً',date:'2026-09-10',targetMonth:1,persist:false});const carrySummary=D.allocationSummary(carry,carryIndex,'2026-09-10');if(!carrySummary.includes('إكمال الشهر 1')||!carrySummary.includes('الشهر 2 كامل'))throw new Error('Carry-forward payment did not finish the current month before the next one.');

const timing=makeStudent('timing');students.push(timing);D.appendPayment(timing,{amount:600,method:'نقداً',date:'2026-09-09',targetMonth:1,persist:false});
context.DEMO_TODAY='2026-10-06';plan=D.installmentPlan(timing);if(plan.length!==2||plan[1].state!=='due')throw new Error('Month 2 must become due exactly three days before renewal.');let renewalNotes=D.notificationsForStudent(timing);if(!renewalNotes.some(note=>note.title.includes('3 أيام')))throw new Error('Three-day renewal warning is missing.');
context.DEMO_TODAY='2026-10-07';renewalNotes=D.notificationsForStudent(timing);if(!renewalNotes.some(note=>note.title.includes('يومان')))throw new Error('Two-day renewal countdown is missing.');
context.DEMO_TODAY='2026-10-08';renewalNotes=D.notificationsForStudent(timing);if(!renewalNotes.some(note=>note.title.includes('يوم واحد')))throw new Error('One-day renewal countdown is missing.');
if(D.monthlyCoverageEnd(timing,'2026-09-25')!=='2026-10-09')throw new Error('Monthly ending search must expose the upcoming renewal boundary before it arrives.');
if(D.monthlyCoverageEnd(twoMonths,'2026-09-09')!=='2026-11-09')throw new Error('Prepaid monthly ending search must expose the end of fully paid coverage.');
context.DEMO_TODAY='2026-10-09';plan=D.installmentPlan(timing);if(plan[1].state!=='overdue')throw new Error('Unpaid renewal must become debt when the new month starts.');if(context.financialStatus(timing)!=='دين')throw new Error('Unpaid renewal must expose the financial status دين.');if(!D.notificationsForStudent(timing).some(note=>note.title.includes('دين قائم')))throw new Error('Debt notification is missing after the renewal boundary.');


// Student-scoped transactional edit: another student in the same course must be untouched.
context.DEMO_TODAY='2026-09-09';
const editA=makeStudent('edit-a','normal',600),editB=makeStudent('edit-b','normal',600);editA.reg=10;editB.reg=11;students.push(editA,editB);
const aIndex=D.appendPayment(editA,{amount:900,method:'نقداً',date:'2026-09-09',targetMonth:1,debtDueDate:'2026-09-20',persist:false});
D.appendPayment(editA,{amount:300,method:'Bankily',date:'2026-09-10',targetMonth:2,persist:false});
D.appendPayment(editB,{amount:600,method:'نقداً',date:'2026-09-09',targetMonth:1,persist:false});
editA.payments[aIndex][8]=77;const transactionBefore=editA.payments[aIndex][6],receiptBefore=editA.payments[aIndex][8],otherBefore=snapshot(editB),revisionBefore=Number(editA.payments[aIndex][11]||0);
D.updateStudentRegistration(editA,{name:'طالب معدل',phone:'2222',branch:'center-b',specialty:'normal',start:'2026-09-08',fee:700,paymentIndex:aIndex,paymentAmount:1000,paymentMethod:'Bankily',paymentDate:'2026-09-11',paymentDescription:'تصحيح إداري',debtDueDate:'2026-09-25',schedule:{version:3,specialtyId:'normal',specialtyName:'عادية',days:[]}});
if(snapshot(editB)!==otherBefore)throw new Error('Editing one receipt/student changed another student in the same course.');
if(editA.name!=='طالب معدل'||editA.phone!=='2222'||editA.branch!=='center-b'||editA.start!=='2026-09-08'||Number(editA.snapshot.fee)!==700)throw new Error('Edited student registration fields were not committed.');
if(editA.payments[aIndex][6]!==transactionBefore||editA.payments[aIndex][8]!==receiptBefore)throw new Error('Receipt edit changed protected transaction/receipt identifiers.');
if(editA.payments[aIndex][1]!==1000||editA.payments[aIndex][2]!=='Bankily'||editA.payments[aIndex][0]!=='2026-09-11')throw new Error('Receipt financial edit did not update the source transaction.');
if(Number(editA.payments[aIndex][11]||0)<revisionBefore||!Number(editA.updatedAt))throw new Error('Receipt edit revision metadata was not advanced.');
for(const payment of editA.payments){if(Math.round(allocationTotal(payment)*100)!==Math.round(Number(payment[1]||0)*100))throw new Error('Edited monthly payment allocation no longer equals its transaction amount.');}
if(!editA.payments[aIndex][5].includes('تصحيح إداري'))throw new Error('Custom edited payment description was not preserved with allocation summary.');
if(!Array.isArray(editA.registrationEditHistory)||!editA.registrationEditHistory.length)throw new Error('Receipt edit audit metadata was not recorded.');


// Stopping a student records a stable end date. Monthly students keep fully-paid entitlement, while partial/unpaid time does not extend the end.
context.DEMO_TODAY='2026-09-16';
const stoppedPaid=makeStudent('stopped-paid','normal',600);stoppedPaid.reg=30;students.push(stoppedPaid);D.appendPayment(stoppedPaid,{amount:1200,method:'نقداً',date:'2026-09-09',targetMonth:1,persist:false});D.stopStudent(stoppedPaid,'توقف');
if(stoppedPaid.active!==false||stoppedPaid.status!=='inactive'||stoppedPaid.stoppedAt!=='2026-09-16')throw new Error('Stopped monthly student status was not persisted.');
if(stoppedPaid.end!=='2026-11-08'||stoppedPaid.stopEndBasis!=='paid-through')throw new Error(`Stopped prepaid monthly student must end after the last fully paid month, got ${stoppedPaid.end}.`);
const stoppedPartial=makeStudent('stopped-partial','normal',600);stoppedPartial.reg=31;students.push(stoppedPartial);D.appendPayment(stoppedPartial,{amount:300,method:'Bankily',date:'2026-09-09',targetMonth:1,persist:false});D.stopStudent(stoppedPartial,'توقف');
if(stoppedPartial.end!=='2026-09-16'||stoppedPartial.stopEndBasis!=='stopped-at')throw new Error('Partial monthly payment must not extend a stopped student beyond the stop date.');
const stoppedQuick=makeStudent('stopped-quick','quick',1000);stoppedQuick.reg=32;students.push(stoppedQuick);D.stopStudent(stoppedQuick,'توقف');
if(stoppedQuick.end!=='2026-09-16'||stoppedQuick.scheduledEndBeforeStop!=='2026-10-09')throw new Error('Quick-course stop must record the actual stop date while preserving the previous planned end.');
context.DEMO_TODAY='2026-09-09';

// Quick course fee/payment editing must remain isolated and reject contradictory totals atomically.
const quickA=makeStudent('quick-a','quick',1000),quickB=makeStudent('quick-b','quick',1000);quickA.reg=20;quickB.reg=21;students.push(quickA,quickB);
D.appendPayment(quickA,{amount:700,method:'نقداً',date:'2026-09-09',persist:false});D.appendPayment(quickA,{amount:200,method:'Bankily',date:'2026-09-10',persist:false});D.appendPayment(quickB,{amount:1000,method:'نقداً',date:'2026-09-09',persist:false});
quickA.payments[0][8]=88;const quickTransaction=quickA.payments[0][6],quickReceipt=quickA.payments[0][8],quickOtherBefore=snapshot(quickB),quickBeforeRejected=snapshot(quickA);
let rejected=false;try{D.updateStudentRegistration(quickA,{fee:800,specialty:'quick',paymentIndex:0,paymentAmount:700,paymentMethod:'نقداً',paymentDate:'2026-09-09'});}catch{rejected=true;}
if(!rejected)throw new Error('Quick edit accepted a course fee lower than this student total payments.');
if(snapshot(quickA)!==quickBeforeRejected)throw new Error('Rejected edit mutated the student before validation completed.');
if(snapshot(quickB)!==quickOtherBefore)throw new Error('Rejected edit mutated another student.');
D.updateStudentRegistration(quickA,{fee:850,specialty:'quick',paymentIndex:0,paymentAmount:600,paymentMethod:'Bankily',paymentDate:'2026-09-12',paymentDescription:'تصحيح دفعة'});
if(Number(quickA.snapshot.fee)!==850||D.paymentTotal(quickA)!==800||D.remainingAmount(quickA)!==50)throw new Error('Quick student fee/payment edit did not reconcile balances.');
if(quickA.payments[0][6]!==quickTransaction||quickA.payments[0][8]!==quickReceipt)throw new Error('Quick edit changed protected payment identifiers.');
if(snapshot(quickB)!==quickOtherBefore)throw new Error('Successful quick edit changed another student in the same course.');

// A later change to the course definition must not silently rewrite an existing student's historical duration/type.
const historical=makeStudent('historical','quick',1000);historical.reg=30;historical.snapshot.durationValue=30;historical.snapshot.durationUnit='day';historical.end='2026-10-09';students.push(historical);
const quickSpec=specialties.find(item=>item.id==='quick');quickSpec.quickDays=45;quickSpec.durationValue=45;
D.updateStudentRegistration(historical,{name:'historical edited',specialty:'quick',fee:1000,start:'2026-09-09'});
if(historical.snapshot.durationValue!==30||historical.snapshot.courseType!=='quick'||historical.end!=='2026-10-09')throw new Error('Editing unrelated student data adopted the course definition changed after registration.');
quickSpec.quickDays=30;quickSpec.durationValue=30;

// Moving a student into a center/course namespace that already has the same register number must be rejected atomically.
const collisionA=makeStudent('collision-a','quick',500),collisionB=makeStudent('collision-b','quick',500);collisionA.branch='center-a';collisionB.branch='center-b';collisionA.reg=50;collisionB.reg=50;students.push(collisionA,collisionB);const collisionBefore=snapshot(collisionA);
let collisionRejected=false;try{D.updateStudentRegistration(collisionA,{branch:'center-b',specialty:'quick',fee:500});}catch{collisionRejected=true;}
if(!collisionRejected)throw new Error('Student move accepted a duplicate register number in the target center/course namespace.');
if(snapshot(collisionA)!==collisionBefore)throw new Error('Rejected register-number collision mutated the student.');

// A registration receipt created with zero payment must be able to create its first transaction later without changing the receipt identity.
const zeroPay=makeStudent('zero-pay','quick',1000);zeroPay.reg=60;zeroPay.registrationReceiptNo=91;students.push(zeroPay);
const zeroResult=D.updateStudentRegistration(zeroPay,{specialty:'quick',fee:1000,paymentIndex:null,createRegistrationPayment:true,registrationReceiptNo:'91',paymentAmount:300,paymentMethod:'Bankily',paymentDate:'2026-09-09',paymentDescription:'دفعة تسجيل لاحقة',debtDueDate:'2026-09-25'});
if(zeroResult.paymentIndex!==0||zeroPay.payments.length!==1||Number(zeroPay.payments[0][1])!==300||String(zeroPay.payments[0][8])!=='91')throw new Error('Zero-payment registration edit did not create the first transaction with the original receipt number.');
if(!String(zeroPay.payments[0][6]||'').startsWith('tx-')||!Number(zeroPay.payments[0][11])||D.remainingAmount(zeroPay)!==700)throw new Error('First transaction created from zero-payment registration is missing identity/revision/balance data.');

// A synchronous local save failure must roll the in-memory object back to the exact pre-edit state.
const rollbackStudent=makeStudent('rollback','quick',900);rollbackStudent.reg=70;students.push(rollbackStudent);const rollbackBefore=snapshot(rollbackStudent),saveStudentsOk=context.saveStudents;context.saveStudents=()=>{throw new Error('forced save failure');};
let saveRejected=false;try{D.updateStudentRegistration(rollbackStudent,{name:'should not stick',specialty:'quick',fee:900});}catch{saveRejected=true;}finally{context.saveStudents=saveStudentsOk;}
if(!saveRejected)throw new Error('Forced persistence failure did not reject the edit.');
if(snapshot(rollbackStudent)!==rollbackBefore)throw new Error('Persistence failure left an in-memory partial edit behind.');

console.log('Monthly prepayment v14 verified: prepayment allocation, timing, student-scoped receipt edits, historical course snapshots, register collision protection, zero-payment receipt upgrades, revision metadata, rollback safety, protected identifiers, monthly reallocation, and quick-course balance validation are consistent.');