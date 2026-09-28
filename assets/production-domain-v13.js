(()=>{
'use strict';
if(window.EFC_DOMAIN_V13?.ready)return;
if(!window.EFC_RECEIPTS_V13?.ready)throw new Error('EFC domain v13 loaded before clean receipt runtime was ready.');

const OFFICIAL_NAME='مركز EFC للغات والمعلوماتية';
const GENERAL_EXPENSE='__expense_general__';
const STORAGE={
  expenses:'efc-expenses-v11',
  methods:'efc-payment-method-records-v11',
  security:'efc-security-v11',
  recovery:'efc-admin-recovery-pending-v11',
  meta:'efc-center-ops-meta-v13',
  expenseSequence:'efc-expense-receipt-sequence-v28'
};
const invoke=window.__TAURI__?.core?.invoke;
const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const today=()=>typeof deviceTodayV3==='function'?deviceTodayV3():DEMO_TODAY;
const nowTime=()=>typeof deviceTimeV3==='function'?deviceTimeV3():(()=>{const d=new Date();return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;})();
const cash=value=>typeof moneyV3==='function'?moneyV3(value):money(value);
const showDate=value=>value?(typeof fmtDateV3==='function'?fmtDateV3(value):fmtDate(value)):'—';
const normalize=value=>String(value??'').trim().toLowerCase().replace(/\s+/g,' ').replace(/[ًٌٍَُِّْـ]/g,'');
const readJson=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key)||'null')??fallback;}catch{return fallback;}};
const writeJson=(key,value)=>localStorage.setItem(key,JSON.stringify(value));
const uid=prefix=>`${prefix}-${Date.now().toString(36)}-${globalThis.crypto?.randomUUID?.().replaceAll('-','').slice(0,12)||Math.random().toString(36).slice(2,14)}`;
function addDays(value,days){const d=dateOnly(value);d.setDate(d.getDate()+Number(days||0));return iso(d);}
function courseTypeOf(item){if(item?.courseType==='normal'||item?.courseType==='quick')return item.courseType;return item?.billing==='monthly'?'normal':'quick';}
function isDynamicMonthly(student){return Boolean(student?.snapshot?.dynamicMonthly||student?.snapshot?.centerOpsMonthlyV11||student?.snapshot?.centerOpsMonthlyV13);}
function isNewModel(student){return Boolean(student?.snapshot?.centerOpsV11||student?.snapshot?.centerOpsV13||isDynamicMonthly(student));}
function isInactive(student){return student?.active===false||student?.status==='inactive';}
function paymentTotal(student){return (student?.payments||[]).reduce((sum,payment)=>sum+Math.max(0,Number(payment?.[1]||0)),0);}

let expenses=Array.isArray(readJson(STORAGE.expenses,[]))?readJson(STORAGE.expenses,[]):[];
let expenseReceiptNext=Math.max(1,Number(readJson(STORAGE.expenseSequence,{next:1})?.next||1));
let methodRecords=Array.isArray(readJson(STORAGE.methods,[]))?readJson(STORAGE.methods,[]):[];
let securityState=readJson(STORAGE.security,{users:[]});
if(!securityState||typeof securityState!=='object')securityState={users:[]};
if(!Array.isArray(securityState.users))securityState.users=[];

function normalizeExpenses(){
  const seen=new Set();
  expenses=(expenses||[]).filter(item=>item&&Number(item.amount)>0&&item.branch&&item.specialty).map(item=>({
    id:String(item.id||uid('expense')),
    name:String(item.name||'مصروف').trim(),
    amount:Math.max(0,Number(item.amount||0)),
    method:String(item.method||'').trim(),
    branch:String(item.branch),
    specialty:String(item.specialty),
    date:String(item.date||today()),
    time:String(item.time||'00:00'),
    createdAt:Number(item.createdAt||Date.now()),
    receiptNo:Number.isInteger(Number(item.receiptNo))&&Number(item.receiptNo)>0?Number(item.receiptNo):null
  })).filter(item=>{if(seen.has(item.id))return false;seen.add(item.id);return true;});
  writeJson(STORAGE.expenses,expenses);
}
function repairExpenseReceiptSequence(){
  const ordered=[...expenses].sort((a,b)=>String(a.date||'').localeCompare(String(b.date||''))||String(a.time||'').localeCompare(String(b.time||''))||Number(a.createdAt||0)-Number(b.createdAt||0)||String(a.id||'').localeCompare(String(b.id||''))),used=new Set(),missing=[];let max=0;
  ordered.forEach(item=>{const number=Number(item.receiptNo);if(Number.isInteger(number)&&number>0){used.add(number);max=Math.max(max,number);}else missing.push(item);});
  let next=Math.max(1,Number(expenseReceiptNext||1),max+1);
  missing.forEach(item=>{while(used.has(next))next+=1;item.receiptNo=next;used.add(next);max=Math.max(max,next);next+=1;});
  expenseReceiptNext=Math.max(Number(expenseReceiptNext||1),max+1,next);
  writeJson(STORAGE.expenses,expenses);writeJson(STORAGE.expenseSequence,{version:28,next:expenseReceiptNext});
}
function normalizeMethodRecords(){
  const activeNames=[...(Array.isArray(methods)?methods:[])].map(String).map(v=>v.trim()).filter(Boolean),seen=new Set();
  methodRecords=(methodRecords||[]).filter(x=>x&&String(x.name||'').trim()).map(x=>({id:String(x.id||uid('method')),name:String(x.name).trim(),active:x.active!==false,createdAt:Number(x.createdAt||Date.now())})).filter(x=>{const key=normalize(x.name);if(seen.has(key))return false;seen.add(key);return true;});
  activeNames.forEach(name=>{if(!methodRecords.some(x=>normalize(x.name)===normalize(name)))methodRecords.push({id:uid('method'),name,active:true,createdAt:Date.now()});});
  if(methodRecords.length&&!methodRecords.some(x=>x.active))methodRecords[0].active=true;
  writeJson(STORAGE.methods,methodRecords);
}
function syncActiveMethods(){
  normalizeMethodRecords();
  const active=methodRecords.filter(x=>x.active).map(x=>x.name);
  methods.splice(0,methods.length,...active);
  localStorage.setItem('efc-payment-methods-v1',JSON.stringify(active));
  writeJson(STORAGE.methods,methodRecords);
}
normalizeExpenses();
repairExpenseReceiptSequence();
syncActiveMethods();

const baseApplyRestored=window.EFC_APPLY_RESTORED_STATE;
let extraSaveTimer=null;
function localExtraUpdatedAt(){return Math.max(0,Number(readJson(STORAGE.meta,{updatedAt:0})?.updatedAt||0));}
function markExtrasChanged(){writeJson(STORAGE.meta,{updatedAt:Date.now()});}
async function persistExtrasNow(){
  if(typeof window.EFC_FORCE_PERSIST!=='function')return null;
  return window.EFC_FORCE_PERSIST();
}
function contributeExtras(state){
  state.expenses=expenses;
  state.expenseReceiptSequenceV28={version:28,next:expenseReceiptNext};
  state.paymentMethodRecords=methodRecords;
  state.security=securityState;
  state.centerOpsMeta={updatedAt:localExtraUpdatedAt()||Date.now(),version:13};
  return state;
}
function persistExtrasSoon(){
  clearTimeout(extraSaveTimer);
  extraSaveTimer=setTimeout(()=>persistExtrasNow().catch(error=>console.error('EFC v13 extra-state save failed.',error)),220);
}
async function hydrateExtrasFromDesktop(){
  if(!invoke)return;
  try{
    const raw=await invoke('load_app_state');
    if(!raw)return;
    const state=JSON.parse(raw);
    if(!state||typeof state!=='object')return;
    const nativeUpdated=Math.max(0,Number(state.centerOpsMeta?.updatedAt||0));
    const localUpdated=localExtraUpdatedAt();
    const shouldUseNative=nativeUpdated>localUpdated;
    if(shouldUseNative&&Array.isArray(state.expenses))expenses=state.expenses;
    else if(!expenses.length&&Array.isArray(state.expenses))expenses=state.expenses;
    expenseReceiptNext=Math.max(expenseReceiptNext,Number(state.expenseReceiptSequenceV28?.next||1));
    if(shouldUseNative&&Array.isArray(state.paymentMethodRecords))methodRecords=state.paymentMethodRecords;
    else if(!methodRecords.length&&Array.isArray(state.paymentMethodRecords))methodRecords=state.paymentMethodRecords;
    if(shouldUseNative&&state.security&&typeof state.security==='object')securityState=state.security;
    else if(!securityState.users.length&&state.security&&typeof state.security==='object')securityState=state.security;
    if(!Array.isArray(securityState.users))securityState.users=[];
    normalizeExpenses();repairExpenseReceiptSequence();syncActiveMethods();writeJson(STORAGE.security,securityState);
    if(nativeUpdated>localUpdated)writeJson(STORAGE.meta,{updatedAt:nativeUpdated});
  }catch(error){console.error('EFC v13 extra-state hydration failed; local state kept.',error);}
}
window.EFC_REGISTER_STATE_CONTRIBUTOR?.('center-operations',contributeExtras);
if(typeof baseApplyRestored==='function')window.EFC_APPLY_RESTORED_STATE=async incoming=>{
  const result=await baseApplyRestored(incoming);
  if(Array.isArray(incoming?.expenses))expenses=incoming.expenses;
  expenseReceiptNext=Math.max(expenseReceiptNext,Number(incoming?.expenseReceiptSequenceV28?.next||1));
  if(Array.isArray(incoming?.paymentMethodRecords))methodRecords=incoming.paymentMethodRecords;
  if(incoming?.security&&typeof incoming.security==='object')securityState=incoming.security;
  if(!Array.isArray(securityState.users))securityState.users=[];
  normalizeExpenses();repairExpenseReceiptSequence();syncActiveMethods();writeJson(STORAGE.security,securityState);markExtrasChanged();persistExtrasSoon();
  return result;
};

const legacyRemainingOf=remainingOf;
const legacyCourseStatus=courseStatus;
const legacyFinancialStatus=financialStatus;
const legacyInstallmentPlan=typeof installmentPlanV3==='function'?installmentPlanV3:null;
const legacyMonthlyFocus=typeof monthlyFocusV3==='function'?monthlyFocusV3:null;
const legacyDueNow=typeof dueNowV3==='function'?dueNowV3:null;
const legacySuggested=typeof suggestedPaymentV3==='function'?suggestedPaymentV3:null;
const legacyAlloc=typeof allocV4==='function'?allocV4:null;

function visibleMonthCount(student,asOf=today()){
  if(!isDynamicMonthly(student))return 0;
  if(isInactive(student))return Math.max(0,Number(student.frozenMonths||0));
  if(!student.start)return 0;
  let count=1;
  for(let number=2;number<=240;number+=1){
    const monthStart=addDuration(student.start,number-1,'month');
    if(asOf>=addDays(monthStart,-3))count=number;else break;
  }
  return count;
}
function dynamicAllocation(student,asOf=today(),paidOverride=null){
  const count=visibleMonthCount(student,asOf),fee=Math.max(0,Number(student.snapshot?.fee||0)),monthPaid=Array(count).fill(0),allocations=[];
  const place=(paymentIndex,monthIndex,amount)=>{
    if(monthIndex<0||monthIndex>=count||amount<=0)return 0;
    const room=Math.max(0,fee-monthPaid[monthIndex]),used=Math.min(room,amount);
    if(used>0){monthPaid[monthIndex]+=used;allocations.push({paymentIndex,monthNumber:monthIndex+1,amount:used});}
    return used;
  };
  if(paidOverride!==null&&paidOverride!==undefined){let left=Math.max(0,Number(paidOverride||0));for(let i=0;i<count&&left>0;i+=1)left-=place(-1,i,left);return{monthPaid,allocations};}
  (student.payments||[]).forEach((payment,index)=>{
    if(asOf&&String(payment?.[0]||'')>asOf)return;
    let left=Math.max(0,Number(payment?.[1]||0));
    const target=Number(payment?.[7]||0);
    if(Number.isInteger(target)&&target>=1&&target<=count)left-=place(index,target-1,left);
    for(let i=0;i<count&&left>0;i+=1)left-=place(index,i,left);
  });
  return{monthPaid,allocations};
}
function installmentPlan(student,asOf=today(),paidOverride=null){
  if(!isDynamicMonthly(student))return legacyInstallmentPlan?legacyInstallmentPlan(student,asOf,paidOverride):[];
  const fee=Math.max(0,Number(student.snapshot?.fee||0)),count=visibleMonthCount(student,asOf),{monthPaid}=dynamicAllocation(student,asOf,paidOverride);
  return Array.from({length:count},(_,index)=>{
    const number=index+1,monthStart=addDuration(student.start,index,'month'),paid=Math.min(fee,Number(monthPaid[index]||0)),remaining=Math.max(0,fee-paid);
    let state='upcoming';
    if(!remaining)state='paid';else if(paid>0)state='partial';else if(monthStart<asOf)state='overdue';else if(asOf>=addDays(monthStart,-3))state='due';
    return{number,dueDate:monthStart,monthStart,fee,paid,remaining,state};
  });
}
function requiredAmount(student,asOf=today()){
  if(!isNewModel(student))return Math.max(0,Number(student.required||0));
  if(isDynamicMonthly(student))return installmentPlan(student,asOf).reduce((sum,month)=>sum+Number(month.fee||0),0);
  return Math.max(0,Number(student.snapshot?.fee||student.required||0));
}
function remainingAmount(student,asOf=today()){
  if(!isNewModel(student))return legacyRemainingOf(student);
  if(isDynamicMonthly(student))return installmentPlan(student,asOf).reduce((sum,month)=>sum+Number(month.remaining||0),0);
  return Math.max(0,requiredAmount(student,asOf)-paymentTotal(student));
}
function reconcileStudent(student,asOf=today()){
  if(!student)return student;
  if(isNewModel(student)){
    student.paid=paymentTotal(student);
    student.required=requiredAmount(student,asOf);
  }
  return student;
}
function reconcileAllStudents(){students.forEach(student=>reconcileStudent(student));}
reconcileAllStudents();

installmentPlanV3=installmentPlan;
remainingOf=remainingAmount;
monthlyFocusV3=function(student,asOf=today(),paidOverride=null){
  if(!isDynamicMonthly(student))return legacyMonthlyFocus?legacyMonthlyFocus(student,asOf,paidOverride):null;
  const plan=installmentPlan(student,asOf,paidOverride),first=plan.find(month=>month.remaining>0);
  if(!plan.length)return null;
  if(!first){const last=plan.at(-1);return{state:'complete',number:last.number,label:`الشهر ${last.number} مدفوع كامل`,dueAmount:0,dueDate:last.dueDate,plan};}
  const labels={partial:'دفع جزئي',overdue:'دين',due:'مستحق',upcoming:'لم يحن'};
  return{state:first.state,number:first.number,label:`الشهر ${first.number} ${labels[first.state]||'مستحق'}`,dueAmount:['partial','overdue','due'].includes(first.state)?first.remaining:0,dueDate:first.dueDate,plan};
};
financialStatus=function(student){
  if(!isNewModel(student))return legacyFinancialStatus(student);
  if(isDynamicMonthly(student)){
    const focus=monthlyFocusV3(student);
    if(!focus)return remainingAmount(student)>0?'لم يدفع':'مدفوع كامل';
    if(focus.state==='complete')return'مدفوع كامل';
    if(focus.state==='partial')return'دفع جزئي';
    if(focus.state==='overdue')return'دين';
    if(focus.state==='due')return'مستحق';
    return paymentTotal(student)>0?'مدفوع كامل':'لم يدفع';
  }
  const remaining=remainingAmount(student);
  if(remaining===0)return'مدفوع كامل';
  if(student.end&&student.end<today())return'دين';
  if(paymentTotal(student)===0)return'لم يدفع';
  return'دفع جزئي';
};
courseStatus=function(student){if(isInactive(student))return'موقوف';if(isDynamicMonthly(student))return'نشطة';return legacyCourseStatus(student);};
monthBadgeV3=function(student,asOf=today(),paidOverride=null){const focus=monthlyFocusV3(student,asOf,paidOverride);if(!focus)return'';const cls=focus.state==='complete'?'good':focus.state==='overdue'?'bad':focus.state==='upcoming'?'neutral':'warn';return`<span class="badge ${cls}">${esc(focus.label)}</span>`;};
dueNowV3=function(student){if(!isDynamicMonthly(student))return legacyDueNow?legacyDueNow(student):remainingAmount(student);const focus=monthlyFocusV3(student);return['partial','due','overdue'].includes(focus?.state)?Number(focus.dueAmount||0):0;};
suggestedPaymentV3=function(student){if(!isDynamicMonthly(student))return legacySuggested?legacySuggested(student):remainingAmount(student);return Number(installmentPlan(student).find(month=>month.remaining>0)?.remaining||0);};
allocV4=function(student,paymentIndex){
  if(!isDynamicMonthly(student))return legacyAlloc?legacyAlloc(student,paymentIndex):{desc:'',before:0,after:0,months:[]};
  const payment=student.payments?.[paymentIndex];if(!payment)return{desc:'',before:0,after:0,months:[]};
  let before=0;for(let i=0;i<paymentIndex;i+=1)before+=Number(student.payments?.[i]?.[1]||0);
  const amount=Number(payment[1]||0),alloc=dynamicAllocation(student),months=alloc.allocations.filter(item=>item.paymentIndex===paymentIndex).map(item=>({n:item.monthNumber,amount:item.amount})),numbers=[...new Set(months.map(item=>item.n))],name=spec(student.specialty)?.name||'الدورة';
  return{desc:numbers.length?`دفعة للشهر ${numbers.join('، ')} لدورة ${name}`:`دفعة لدورة ${name}`,before,after:before+amount,months};
};

function setDebtDate(student,key,value){
  student.debtDueDates=student.debtDueDates&&typeof student.debtDueDates==='object'?student.debtDueDates:{};
  if(value)student.debtDueDates[String(key)]=String(value);else delete student.debtDueDates[String(key)];
}
function saveStudentsClean(){reconcileAllStudents();saveStudents();persistExtrasSoon();}
function saveSpecsClean(){saveSpecs();persistExtrasSoon();}
function targetRemaining(student,targetMonth=null){
  if(isDynamicMonthly(student)){
    const month=installmentPlan(student).find(item=>item.number===Number(targetMonth||0));
    return Number(month?.remaining||0);
  }
  return remainingAmount(student);
}
function appendPayment(student,{amount,method,date=today(),time=nowTime(),description='',targetMonth=null,debtDueDate=null,persist=true}={}){
  if(!student)throw new Error('الطالب غير موجود.');
  reconcileStudent(student);
  const value=Math.max(0,Number(amount||0)),available=targetRemaining(student,targetMonth);
  if(value<=0||value>available)throw new Error('المبلغ غير صالح.');
  const selected=String(method||'').trim();
  if(!selected)throw new Error('اختر وسيلة الدفع.');
  const index=student.payments.length;
  const transactionCode=window.EFC_CODES?.newTransactionCode?.(student)||uid('tx');
  student.payments.push([String(date),value,selected,String(time||nowTime()),Date.now(),String(description||'').trim(),transactionCode,isDynamicMonthly(student)?Number(targetMonth):null,null,debtDueDate?String(debtDueDate):null]);
  reconcileStudent(student);
  const key=isDynamicMonthly(student)?String(targetMonth):'course';
  const remaining=targetRemaining(student,targetMonth);
  setDebtDate(student,key,remaining>0&&debtDueDate?debtDueDate:null);
  if(persist)saveStudentsClean();
  return index;
}
function stopStudent(student,reason=''){
  if(!student)return;
  if(isDynamicMonthly(student)){
    const plan=installmentPlan(student,today());
    student.frozenMonths=plan.filter(month=>month.dueDate<=today()||month.paid>0).length;
  }
  student.active=false;student.status='inactive';student.stoppedAt=today();student.stopReason=String(reason||'').trim();
  reconcileStudent(student);saveStudentsClean();
}
function reminderNote(student,{kind,title,message,amount=0,dueDate='',monthNumber=null,fee=0,state='',contextType='',contextLabel='',contextValue=''}={}){
  const specialtyName=String(spec(student.specialty)?.name||student.specialty||'الدورة');
  const resolvedContextType=contextType||(monthNumber?'month':'course');
  const resolvedContextLabel=contextLabel||(resolvedContextType==='month'?'الشهر':'الدورة');
  const resolvedContextValue=contextValue||(resolvedContextType==='month'&&monthNumber?`الشهر ${monthNumber}`:specialtyName);
  return{
    studentId:String(student.id),studentName:String(student.name||''),phone:String(student.phone||''),reg:String(student.reg??''),
    branchName:String(typeof branchName==='function'?branchName(student.branch):student.branch||''),specialtyName,
    kind:String(kind||'reminder'),title:String(title||'تذكير بالدين'),message:String(message||''),
    amount:Math.max(0,Number(amount||0)),fee:Math.max(0,Number(fee||0)),dueDate:String(dueDate||''),
    monthNumber:monthNumber===null||monthNumber===undefined?null:Number(monthNumber),state:String(state||''),date:today(),
    contextType:resolvedContextType,contextLabel:resolvedContextLabel,contextValue:String(resolvedContextValue||'')
  };
}
function debtMessage(student,amount,due,overdue=false,{monthNumber=null,fee=0}={}){
  const course=spec(student.specialty)?.name||'الدورة';
  const scope=monthNumber?`الشهر ${monthNumber} من دورة ${course}`:`دورة ${course}`;
  const total=fee>0&&Number(fee)!==Number(amount)?` من أصل ${cash(fee)}`:'';
  const timing=overdue?`وقد تجاوز موعد الاستحقاق المحدد بتاريخ ${showDate(due)}`:`وموعد الاستحقاق هو ${due===addDays(today(),1)?'غدًا، الموافق ':''}${showDate(due)}`;
  return `عزيزي الطالب/ة ${student.name}، نحيطكم علمًا بأن المبلغ المتبقي على ${scope} هو ${cash(amount)}${total}، ${timing}. نرجو تسوية المبلغ في الموعد المحدد لتحديث ملفكم المالي والمحافظة على انتظامه. إذا سبق لكم السداد، يرجى التواصل مع إدارة المركز لتسوية الحساب وتحديث الحالة المالية.`;
}
function notificationsForStudent(student){
  if(!student||isInactive(student))return[];
  const out=[],asOf=today();
  if(isDynamicMonthly(student)){
    installmentPlan(student,asOf).forEach(month=>{
      if(month.remaining<=0)return;
      const custom=student.debtDueDates?.[String(month.number)],course=spec(student.specialty)?.name||'الدورة';
      if(custom&&asOf>=addDays(custom,-1)){
        const overdue=asOf>custom,message=debtMessage(student,month.remaining,custom,overdue,{monthNumber:month.number,fee:month.fee});
        out.push(reminderNote(student,{kind:overdue?'debt-overdue':'debt-due',title:overdue?`دين قائم — الشهر ${month.number}`:`موعد سداد المتبقي — الشهر ${month.number}`,message,amount:month.remaining,dueDate:custom,monthNumber:month.number,fee:month.fee,state:overdue?'overdue':'due',contextType:'month'}));
        return;
      }
      const opens=addDays(month.dueDate,-3);
      if(month.number>1&&asOf>=opens&&asOf<month.dueDate){
        const message=`عزيزي الطالب/ة ${student.name}، هذا تذكير بتجديد الشهر القادم: الشهر ${month.number} من دورة ${course}. قيمة الرسوم ${cash(month.fee)}، وموعد الاستحقاق ${showDate(month.dueDate)}. يمكنكم السداد من الآن، ونرجو إتمامه في الموعد المحدد حتى يبقى ملفكم المالي منتظمًا دون ديون قائمة. إذا سبق السداد، يرجى التواصل مع إدارة المركز لتسوية الحساب وتحديث الحالة المالية.`;
        out.push(reminderNote(student,{kind:'monthly-upcoming',title:`تذكير بتجديد الشهر ${month.number}`,message,amount:month.fee,dueDate:month.dueDate,monthNumber:month.number,fee:month.fee,state:'upcoming',contextType:'month'}));
      }else if(asOf>=month.dueDate){
        const partial=month.remaining<month.fee,overdue=asOf>month.dueDate;
        let message='';
        if(partial)message=`عزيزي الطالب/ة ${student.name}، تم تسجيل دفعة جزئية للشهر ${month.number} من دورة ${course}، وما زال المبلغ المطلوب ${cash(month.remaining)} من أصل ${cash(month.fee)}. موعد الاستحقاق ${showDate(month.dueDate)}. نرجو استكمال المتبقي في أقرب وقت حتى يصبح الشهر مسددًا بالكامل. إذا سبق لكم استكمال السداد، يرجى التواصل مع إدارة المركز لتحديث الملف.`;
        else if(overdue)message=`عزيزي الطالب/ة ${student.name}، نذكركم بأن رسوم الشهر ${month.number} من دورة ${course} ما زالت مستحقة بقيمة ${cash(month.remaining)}، وقد تجاوز موعد الاستحقاق بتاريخ ${showDate(month.dueDate)}. نرجو تسوية المبلغ في أقرب فرصة لتفادي تراكم الديون والمحافظة على انتظام الملف المالي. إذا سبق السداد، يرجى التواصل مع إدارة المركز لتسوية الحساب وتحديث الحالة المالية.`;
        else message=`عزيزي الطالب/ة ${student.name}، أصبحت رسوم الشهر ${month.number} من دورة ${course} مستحقة اليوم بقيمة ${cash(month.remaining)}. موعد الاستحقاق ${showDate(month.dueDate)}. نرجو إتمام السداد في الموعد المحدد لتحديث ملفكم المالي والمحافظة على انتظامه. إذا سبق السداد، يرجى التواصل مع إدارة المركز لتسوية الحساب وتحديث الحالة المالية.`;
        out.push(reminderNote(student,{kind:partial?'monthly-partial':overdue?'monthly-overdue':'monthly-due',title:partial?`متبقي الشهر ${month.number}`:overdue?`دين قائم — الشهر ${month.number}`:`استحقاق الشهر ${month.number}`,message,amount:month.remaining,dueDate:month.dueDate,monthNumber:month.number,fee:month.fee,state:partial?'partial':overdue?'overdue':'due',contextType:'month'}));
      }
    });
  }else if(isNewModel(student)&&remainingAmount(student)>0){
    const due=student.debtDueDates?.course;
    if(due&&asOf>=addDays(due,-1)){
      const amount=remainingAmount(student),overdue=asOf>due,message=debtMessage(student,amount,due,overdue);
      out.push(reminderNote(student,{kind:overdue?'debt-overdue':'debt-due',title:overdue?'تذكير بدين قائم':'تذكير بموعد سداد المتبقي',message,amount,dueDate:due,state:overdue?'overdue':'due',contextType:'course',contextLabel:'الدورة',contextValue:spec(student.specialty)?.name||student.specialty||'الدورة'}));
    }
  }
  return out;
}
function currentNotifications(){return students.flatMap(notificationsForStudent);}

function expenseSpecialtyName(value){return value===GENERAL_EXPENSE?'مصروف عام':spec(value)?.name||value||'—';}
function expenseMatches(item,{from,to,branch,specialty,method}={}){return(!from||item.date>=from)&&(!to||item.date<=to)&&(!branch||item.branch===branch)&&(!specialty||item.specialty===specialty)&&(!method||item.method===method);}
function allocateExpenseReceiptNumber(){repairExpenseReceiptSequence();const number=Math.max(1,Number(expenseReceiptNext||1));expenseReceiptNext=number+1;writeJson(STORAGE.expenseSequence,{version:28,next:expenseReceiptNext});markExtrasChanged();persistExtrasSoon();return number;}
function expenseReceiptNumberOf(item){const value=Number(item?.receiptNo);return Number.isInteger(value)&&value>0?value:null;}
function saveExpenses(next){expenses=Array.isArray(next)?next:expenses;normalizeExpenses();repairExpenseReceiptSequence();markExtrasChanged();persistExtrasSoon();}
function saveMethodRecords(next){methodRecords=Array.isArray(next)?next:methodRecords;syncActiveMethods();markExtrasChanged();persistExtrasSoon();}
function saveSecurity(next){securityState=next&&typeof next==='object'?next:securityState;if(!Array.isArray(securityState.users))securityState.users=[];writeJson(STORAGE.security,securityState);markExtrasChanged();persistExtrasSoon();}

const legacyReceiptModel=receiptModelV4;
receiptModelV4=function(student,paymentIndex=null,statement=false){
  reconcileStudent(student);
  const model=legacyReceiptModel(student,paymentIndex,statement);
  if(!model||!isNewModel(student))return model;
  if(statement){model.paid=paymentTotal(student);model.remaining=remainingAmount(student);if(isDynamicMonthly(student))model.plan=installmentPlan(student);return model;}
  if(isDynamicMonthly(student)){
    const monthNumber=paymentIndex!==null&&paymentIndex!==undefined?Number(student.payments?.[paymentIndex]?.[7]||1):1;
    const month=installmentPlan(student).find(item=>item.number===monthNumber);
    if(month){model.remaining=month.remaining;model.month=`الشهر ${monthNumber}`;}
  }else{
    model.remaining=remainingAmount(student);
  }
  return model;
};

const ready=hydrateExtrasFromDesktop().then(()=>{
  reconcileAllStudents();
  window.EFC_DOMAIN_V13=Object.freeze({
    ready:true,OFFICIAL_NAME,GENERAL_EXPENSE,STORAGE,esc,today,nowTime,cash,showDate,normalize,uid,addDays,courseTypeOf,isDynamicMonthly,isNewModel,isInactive,
    paymentTotal,requiredAmount,remainingAmount,reconcileStudent,reconcileAllStudents,installmentPlan,dynamicAllocation,targetRemaining,appendPayment,setDebtDate,stopStudent,
    notificationsForStudent,currentNotifications,expenseSpecialtyName,expenseMatches,
    getExpenses:()=>expenses,getMethodRecords:()=>methodRecords,getSecurity:()=>securityState,
    saveExpenses,allocateExpenseReceiptNumber,expenseReceiptNumberOf,saveMethodRecords,saveSecurity,syncActiveMethods,saveStudents:saveStudentsClean,saveSpecs:saveSpecsClean,persistExtrasNow,persistExtrasSoon,
    expenseReceiptsNumericOnly:true,expenseReceiptsStartAtOne:true,expenseReceiptNumbersNeverReused:true,expenseReceiptSequencePersisted:true,reminderInclusiveSalutation:true,reminderRequiresAdminReconciliation:true
  });
  return window.EFC_DOMAIN_V13;
});
window.EFC_DOMAIN_V13_READY=ready;
})();
