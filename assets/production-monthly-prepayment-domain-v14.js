(()=>{
'use strict';
if(window.EFC_MONTHLY_PREPAYMENT_DOMAIN_V14?.ready)return;
const B=window.EFC_DOMAIN_V13;
if(!B?.ready)throw new Error('Monthly prepayment v14 loaded before domain v13.');

const MAX_MONTHS=240;
const OPEN_LEAD_DAYS=3;
const RENEWAL_WARNING_DAYS=3;
const {today,nowTime,cash,showDate,addDays,isDynamicMonthly,isNewModel,isInactive,paymentTotal,uid}=B;
const baseMonthlyFocus=typeof monthlyFocusV3==='function'?monthlyFocusV3:null;
const baseDueNow=typeof dueNowV3==='function'?dueNowV3:null;
const baseSuggested=typeof suggestedPaymentV3==='function'?suggestedPaymentV3:null;
const baseAlloc=typeof allocV4==='function'?allocV4:null;
const baseFinancialStatus=typeof financialStatus==='function'?financialStatus:null;

const feeOf=student=>Math.max(0,Number(student?.snapshot?.fee||0));
const paymentDate=(payment,student)=>String(payment?.[0]||student?.start||'');
const targetOf=payment=>{const value=Number(payment?.[7]||0);return Number.isInteger(value)&&value>0?value:1;};
const clampMonth=value=>Math.max(1,Math.min(MAX_MONTHS,Number(value||1)));
const explicitOf=payment=>Array.isArray(payment?.[10])?payment[10].map(item=>({monthNumber:clampMonth(item?.monthNumber??item?.n),amount:Math.max(0,Number(item?.amount||0))})).filter(item=>item.amount>0):[];
const clone=value=>{try{return structuredClone(value);}catch{return JSON.parse(JSON.stringify(value));}};

function visibleMonthCount(student,asOf=today()){
  if(!isDynamicMonthly(student))return 0;
  if(isInactive(student))return Math.max(0,Number(student.frozenMonths||0));
  if(!student.start)return 0;
  let count=1;
  for(let number=2;number<=MAX_MONTHS;number+=1){
    const monthStart=addDuration(student.start,number-1,'month');
    if(asOf>=addDays(monthStart,-OPEN_LEAD_DAYS))count=number;else break;
  }
  return count;
}
function allocationMonthCount(student,asOf=today(),paidOverride=null,minCount=0){
  const fee=feeOf(student);if(!fee)return Math.max(visibleMonthCount(student,asOf),Number(minCount||0));
  let count=Math.max(1,visibleMonthCount(student,asOf),Number(minCount||0));
  if(paidOverride!==null&&paidOverride!==undefined)return Math.min(MAX_MONTHS,Math.max(count,Math.ceil(Math.max(0,Number(paidOverride||0))/fee)));
  (student.payments||[]).forEach(payment=>{
    if(asOf&&paymentDate(payment,student)>asOf)return;
    const explicit=explicitOf(payment);
    if(explicit.length){count=Math.max(count,...explicit.map(item=>item.monthNumber));return;}
    const amount=Math.max(0,Number(payment?.[1]||0)),target=targetOf(payment),span=Math.max(1,Math.ceil(amount/fee));
    count=Math.max(count,target+span-1);
  });
  return Math.min(MAX_MONTHS,count);
}
function dynamicAllocation(student,asOf=today(),paidOverride=null,minCount=0){
  const fee=feeOf(student),count=allocationMonthCount(student,asOf,paidOverride,minCount),monthPaid=Array(count).fill(0),allocations=[];
  const place=(paymentIndex,monthIndex,amount)=>{
    if(monthIndex<0||monthIndex>=count||amount<=0||fee<=0)return 0;
    const before=Math.max(0,Number(monthPaid[monthIndex]||0)),room=Math.max(0,fee-before),used=Math.min(room,amount);
    if(used>0){const after=before+used;monthPaid[monthIndex]=after;allocations.push({paymentIndex,monthNumber:monthIndex+1,amount:used,before,after,fee});}
    return used;
  };
  if(paidOverride!==null&&paidOverride!==undefined){let left=Math.max(0,Number(paidOverride||0));for(let i=0;i<count&&left>0;i+=1)left-=place(-1,i,left);return{monthPaid,allocations,count};}
  (student.payments||[]).forEach((payment,index)=>{
    if(asOf&&paymentDate(payment,student)>asOf)return;
    let left=Math.max(0,Number(payment?.[1]||0));if(left<=0)return;
    const explicit=explicitOf(payment);
    if(explicit.length){
      for(const item of explicit){if(left<=0)break;left-=place(index,item.monthNumber-1,Math.min(left,item.amount));}
      if(left>0){const start=Math.max(0,(explicit.at(-1)?.monthNumber||targetOf(payment))-1);for(let i=start;i<count&&left>0;i+=1)left-=place(index,i,left);}
      return;
    }
    const start=Math.max(0,targetOf(payment)-1);
    for(let i=start;i<count&&left>0;i+=1)left-=place(index,i,left);
  });
  return{monthPaid,allocations,count};
}
function installmentPlan(student,asOf=today(),paidOverride=null,minCount=0){
  if(!isDynamicMonthly(student))return B.installmentPlan(student,asOf,paidOverride);
  const fee=feeOf(student),count=allocationMonthCount(student,asOf,paidOverride,minCount),{monthPaid}=dynamicAllocation(student,asOf,paidOverride,count);
  return Array.from({length:count},(_,index)=>{
    const number=index+1,monthStart=addDuration(student.start,index,'month'),openDate=number===1?monthStart:addDays(monthStart,-OPEN_LEAD_DAYS),renewalDate=number===1?addDuration(monthStart,1,'month'):monthStart,dueFrom=addDays(renewalDate,-RENEWAL_WARNING_DAYS),overdueFrom=renewalDate,paid=Math.min(fee,Number(monthPaid[index]||0)),remaining=Math.max(0,fee-paid),prepaid=paid>0&&asOf<monthStart;
    let state='upcoming';
    if(!remaining)state='paid';
    else if(asOf>=overdueFrom)state='overdue';
    else if(asOf>=dueFrom)state='due';
    else if(paid>0)state='partial';
    return{number,dueDate:monthStart,monthStart,openDate,renewalDate,dueFrom,overdueFrom,fee,paid,remaining,state,prepaid,partialPrepaid:prepaid&&remaining>0};
  });
}
function requiredAmount(student,asOf=today()){
  if(!isNewModel(student))return B.requiredAmount(student,asOf);
  if(isDynamicMonthly(student))return installmentPlan(student,asOf).reduce((sum,month)=>sum+Number(month.fee||0),0);
  return Math.max(0,Number(student.snapshot?.fee||student.required||0));
}
function remainingAmount(student,asOf=today()){
  if(!isNewModel(student))return B.remainingAmount(student,asOf);
  if(isDynamicMonthly(student))return installmentPlan(student,asOf).reduce((sum,month)=>sum+Number(month.remaining||0),0);
  return Math.max(0,requiredAmount(student,asOf)-paymentTotal(student));
}
function reconcileStudent(student,asOf=today()){
  if(!student)return student;
  if(isNewModel(student)){student.paid=paymentTotal(student);student.required=requiredAmount(student,asOf);}
  return student;
}
function reconcileAllStudents(asOf=today()){students.forEach(student=>reconcileStudent(student,asOf));}
function saveStudentsClean(){reconcileAllStudents();saveStudents();B.persistExtrasSoon?.();}
function targetRemaining(student,targetMonth=null,asOf=today()){
  if(!isDynamicMonthly(student))return remainingAmount(student,asOf);
  const monthNumber=clampMonth(targetMonth||1),fee=feeOf(student),{monthPaid}=dynamicAllocation(student,asOf,null,monthNumber);
  return Math.max(0,fee-Number(monthPaid[monthNumber-1]||0));
}
function paymentAllocations(student,paymentIndex,asOf=today()){
  if(!isDynamicMonthly(student))return[];
  const index=Number(paymentIndex);if(!Number.isInteger(index)||index<0)return[];
  const payment=student.payments?.[index];if(!payment)return[];
  const explicit=explicitOf(payment),minCount=Math.max(targetOf(payment),...explicit.map(item=>item.monthNumber),1);
  return dynamicAllocation(student,asOf,null,minCount).allocations.filter(item=>item.paymentIndex===index);
}
function allocationSummary(student,paymentIndex,asOf=today()){
  const parts=paymentAllocations(student,paymentIndex,asOf).map(item=>{
    if(item.after>=item.fee){if(item.before>0)return`إكمال الشهر ${item.monthNumber} (${cash(item.amount)})`;return`الشهر ${item.monthNumber} كامل`;}
    return`جزء من الشهر ${item.monthNumber} (${cash(item.after)} من ${cash(item.fee)})`;
  });
  return parts.join(' + ')||'دفعة شهرية';
}
function allocationMonthLabel(student,paymentIndex,asOf=today()){
  const numbers=[...new Set(paymentAllocations(student,paymentIndex,asOf).map(item=>item.monthNumber))];
  return numbers.join('، ')||String(targetOf(student.payments?.[paymentIndex]));
}
function defaultDescription(value){const text=String(value||'').trim();return !text||/^دفعة(?:\s+الشهر|\s+تسجيل|\s+مستحقات)/.test(text);}
function appendPayment(student,{amount,method,date=today(),time=nowTime(),description='',targetMonth=null,debtDueDate=null,persist=true}={}){
  if(!student)throw new Error('الطالب غير موجود.');
  window.EFC_FISCAL_V14?.assertDateOpen?.(String(date||today()),'تاريخ الدفعة');
  if(!isDynamicMonthly(student)){
    const index=B.appendPayment(student,{amount,method,date,time,description,targetMonth,debtDueDate,persist:false}),stamp=Date.now();
    if(student.payments?.[index])student.payments[index][11]=stamp;
    student.updatedAt=stamp;
    if(persist)saveStudentsClean();
    return index;
  }
  reconcileStudent(student);
  const value=Math.max(0,Number(amount||0)),fee=feeOf(student);if(value<=0||fee<=0)throw new Error('المبلغ غير صالح.');
  const selected=String(method||'').trim();if(!selected)throw new Error('اختر وسيلة الدفع.');
  const plan=installmentPlan(student,String(date||today())),firstOpen=plan.find(month=>month.remaining>0),fallback=(plan.at(-1)?.number||0)+1,monthNumber=clampMonth(Number(targetMonth)||firstOpen?.number||fallback||1),span=Math.max(1,Math.ceil(value/fee));
  if(monthNumber+span-1>MAX_MONTHS)throw new Error('قيمة الدفعة تتجاوز الحد المدعوم للأشهر المقدمة.');
  const index=student.payments.length,transactionCode=window.EFC_CODES?.newTransactionCode?.(student)||uid('tx'),stamp=Date.now();
  student.payments.push([String(date),value,selected,String(time||nowTime()),stamp,String(description||'').trim(),transactionCode,monthNumber,null,debtDueDate?String(debtDueDate):null,null,stamp]);
  const allocations=paymentAllocations(student,index,String(date||today()));
  if(!allocations.length||Math.round(allocations.reduce((sum,item)=>sum+item.amount,0)*100)!==Math.round(value*100)){student.payments.pop();throw new Error('تعذر توزيع الدفعة على الأشهر.');}
  student.payments[index][10]=allocations.map(item=>({monthNumber:item.monthNumber,amount:item.amount}));
  const summary=allocationSummary(student,index,String(date||today())),original=String(description||'').trim();
  student.payments[index][5]=defaultDescription(original)?summary:`${summary} — ${original}`;
  student.updatedAt=stamp;
  reconcileStudent(student,String(date||today()));
  const remaining=targetRemaining(student,monthNumber,String(date||today()));
  B.setDebtDate(student,String(monthNumber),remaining>0&&debtDueDate?debtDueDate:null);
  if(persist)saveStudentsClean();
  return index;
}

function customDescription(value){
  const text=String(value||'').trim();if(!text)return'';
  const marker=' — ';if(text.includes(marker))return text.split(marker).slice(1).join(marker).trim();
  if(/^(?:الشهر\s+\d|جزء من الشهر|إكمال الشهر|دفعة شهرية|دفعة تسجيل|دفعة مستحقات|دفعة طالب)/.test(text))return'';
  return text;
}
function historicalCourseShape(student,item,specialtyChanged){
  const snapshot=student?.snapshot||{};
  if(specialtyChanged){const type=B.courseTypeOf(item),monthly=type==='normal',durationValue=monthly?1:Math.max(1,Number(item.quickDays||item.durationValue||1));return{type,monthly,durationValue,durationUnit:monthly?'month':String(item.durationUnit||'day')};}
  let type=String(snapshot.courseType||'');
  if(type!=='normal'&&type!=='quick')type=snapshot.billing==='monthly'?'normal':snapshot.billing==='one_time'?'quick':B.courseTypeOf(item);
  const monthly=type==='normal',durationValue=monthly?1:Math.max(1,Number(snapshot.durationValue||item.quickDays||item.durationValue||1)),durationUnit=monthly?'month':String(snapshot.durationUnit||item.durationUnit||'day');
  return{type,monthly,durationValue,durationUnit};
}
function updateStudentRegistration(student,changes={}){
  if(!student)throw new Error('الطالب غير موجود.');
  if(changes.reg!==undefined&&Number(changes.reg)!==Number(student.reg))throw new Error('رقم السجل ثابت ولا يمكن تغييره بعد إنشاء ملف الطالب.');
  const requestedSpecialty=String(changes.specialty??student.specialty),item=typeof spec==='function'?spec(requestedSpecialty):null;if(!item)throw new Error('الدورة المحددة غير موجودة.');
  const draft=clone(student),wasMonthly=isDynamicMonthly(student),specialtyChanged=String(item.id)!==String(student.specialty),shape=historicalCourseShape(student,item,specialtyChanged),type=shape.type,monthly=shape.monthly;
  const name=String(changes.name??draft.name??'').trim();if(!name)throw new Error('اسم الطالب مطلوب.');
  const branch=String(changes.branch??draft.branch??'').trim();if(!branch)throw new Error('المركز مطلوب.');
  const start=String(changes.start??draft.start??'').trim();if(!start)throw new Error('تاريخ البداية مطلوب.');
  const fee=Math.max(0,Number(changes.fee??draft.snapshot?.fee??draft.required??0));if(fee<=0)throw new Error('سعر الدورة غير صالح.');
  const scopeChanged=String(branch)!==String(student.branch||'')||String(item.id)!==String(student.specialty||'');
  if(scopeChanged){const duplicate=students.find(other=>other!==student&&(!student.id||!other?.id||String(other.id)!==String(student.id))&&String(other?.branch||'')===branch&&String(other?.specialty||'')===String(item.id)&&Number(other?.reg)===Number(draft.reg));if(duplicate)throw new Error(`رقم السجل ${String(draft.reg??'').padStart(4,'0')} مستخدم مسبقًا لطالب آخر في المركز والدورة المحددين.`);}
  draft.name=name;draft.phone=String(changes.phone??draft.phone??'').trim();draft.branch=branch;draft.specialty=String(item.id);draft.start=start;draft.end=monthly?'':addDuration(start,shape.durationValue,shape.durationUnit);
  draft.snapshot={...(draft.snapshot||{}),centerOpsV13:true,centerOpsMonthlyV13:monthly,dynamicMonthly:monthly,courseType:type,billing:monthly?'monthly':'one_time',fee,durationValue:shape.durationValue,durationUnit:shape.durationUnit};
  if(changes.schedule){draft.schedule=clone(changes.schedule);draft.schedule.specialtyId=String(item.id);draft.schedule.specialtyName=String(item.name||'');}
  draft.payments=Array.isArray(draft.payments)?draft.payments.map(payment=>Array.isArray(payment)?[...payment]:[]):[];
  const rawIndex=changes.paymentIndex,index=rawIndex===null||rawIndex===undefined||rawIndex===''?null:Number(rawIndex);
  if(index!==null&&(!Number.isInteger(index)||index<0||!draft.payments[index]))throw new Error('الدفعة المرتبطة بالروسي غير موجودة.');
  const notes=draft.payments.map(payment=>customDescription(payment?.[5]));
  let effectiveIndex=index;
  if(effectiveIndex===null&&changes.createRegistrationPayment===true&&Math.max(0,Number(changes.paymentAmount||0))>0){
    const amount=Math.max(0,Number(changes.paymentAmount||0)),method=String(changes.paymentMethod||'').trim();if(!method)throw new Error('اختر وسيلة الدفع.');
    const stamp=Date.now(),transactionCode=window.EFC_CODES?.newTransactionCode?.(draft)||uid('tx'),description=String(changes.paymentDescription||'').trim(),receipt=String(changes.registrationReceiptNo??draft.registrationReceiptNo??'').trim();
    draft.payments.push([String(changes.paymentDate||start),amount,method,String(changes.paymentTime||nowTime()),stamp,description,transactionCode,monthly?1:null,receipt||null,changes.debtDueDate?String(changes.debtDueDate):null,null,stamp]);
    effectiveIndex=draft.payments.length-1;notes.push(description);
  }
  const editStamp=Date.now();
  if(effectiveIndex!==null){
    const existingPayment=draft.payments[effectiveIndex],candidatePaymentDate=String(changes.paymentDate??existingPayment?.[0]??start);window.EFC_FISCAL_V14?.assertDateOpen?.(candidatePaymentDate,'تاريخ الدفعة');
    const payment=draft.payments[effectiveIndex],amount=Math.max(0,Number(changes.paymentAmount??payment[1]??0));if(amount<=0)throw new Error('مبلغ الدفعة يجب أن يكون أكبر من صفر.');
    const method=String(changes.paymentMethod??payment[2]??'').trim();if(!method)throw new Error('اختر وسيلة الدفع.');
    payment[0]=String(changes.paymentDate??payment[0]??start);payment[1]=amount;payment[2]=method;
    if(changes.paymentTime!==undefined)payment[3]=String(changes.paymentTime||payment[3]||nowTime());
    if(changes.paymentDescription!==undefined)notes[effectiveIndex]=String(changes.paymentDescription||'').trim();
    payment[9]=changes.debtDueDate?String(changes.debtDueDate):null;payment[11]=editStamp;
  }
  if(monthly){
    draft.debtDueDates={};
    draft.payments.forEach(payment=>{if(!wasMonthly||!Number.isInteger(Number(payment?.[7]))||Number(payment?.[7])<1)payment[7]=1;payment[10]=null;});
    const farFuture='9999-12-31',allocation=dynamicAllocation(draft,farFuture,null,MAX_MONTHS);
    draft.payments.forEach((payment,paymentIndex)=>{
      const value=Math.max(0,Number(payment?.[1]||0));if(!value)return;
      const parts=allocation.allocations.filter(entry=>entry.paymentIndex===paymentIndex),allocated=parts.reduce((sum,entry)=>sum+Number(entry.amount||0),0);
      if(Math.round(allocated*100)!==Math.round(value*100))throw new Error('تعذر توزيع الدفعات بعد التعديل ضمن الحد المدعوم للأشهر.');
      payment[10]=parts.map(entry=>({monthNumber:entry.monthNumber,amount:entry.amount}));
      payment[7]=parts[0]?.monthNumber||clampMonth(payment[7]||1);
    });
    draft.payments.forEach((payment,paymentIndex)=>{if(Number(payment?.[1]||0)<=0)return;const summary=allocationSummary(draft,paymentIndex,farFuture),note=notes[paymentIndex];payment[5]=note?`${summary} — ${note}`:summary;});
    draft.payments.forEach(payment=>{
      if(!payment?.[9])return;
      const month=clampMonth(payment[7]||1),remaining=targetRemaining(draft,month,farFuture);
      if(remaining>0)draft.debtDueDates[String(month)]=String(payment[9]);else payment[9]=null;
    });
  }else{
    const total=paymentTotal(draft);if(total>fee)throw new Error(`إجمالي دفعات هذا الطالب (${cash(total)}) أكبر من سعر الدورة الجديد (${cash(fee)}). خفّض الدفعة أو ارفع سعر الدورة قبل الحفظ.`);
    draft.payments.forEach((payment,paymentIndex)=>{payment[7]=null;payment[10]=null;if(notes[paymentIndex])payment[5]=notes[paymentIndex];else if(!String(payment[5]||'').trim()||wasMonthly)payment[5]=paymentIndex===0?'دفعة تسجيل':'دفعة مستحقات';});
    const remaining=Math.max(0,fee-total),due=[...draft.payments].reverse().find(payment=>String(payment?.[9]||'').trim())?.[9]||String(changes.debtDueDate||'');
    draft.debtDueDates=remaining>0&&due?{course:String(due)}:{};
    if(!remaining)draft.payments.forEach(payment=>{payment[9]=null;});
  }
  reconcileStudent(draft);draft.updatedAt=editStamp;
  const history=Array.isArray(draft.registrationEditHistory)?draft.registrationEditHistory:[];
  history.push({at:editStamp,paymentIndex:effectiveIndex,transactionCode:effectiveIndex!==null?String(draft.payments[effectiveIndex]?.[6]||''):null,receipt:effectiveIndex!==null?String(draft.payments[effectiveIndex]?.[8]||draft.registrationReceiptNo||''):String(draft.registrationReceiptNo||'')});
  draft.registrationEditHistory=history.slice(-50);
  const before=clone(student);Object.assign(student,draft);reconcileStudent(student);
  try{saveStudentsClean();}catch(error){Object.keys(student).forEach(key=>delete student[key]);Object.assign(student,before);reconcileStudent(student);throw error;}
  return{student,paymentIndex:effectiveIndex};
}

function monthlyCoverageEnd(student,asOf=today()){
  if(!isDynamicMonthly(student))return String(student?.end||'');
  if(isInactive(student))return String(student?.end||'');
  if(!student?.start)return'';
  const plan=installmentPlan(student,asOf);
  if(!plan.length)return addDuration(student.start,1,'month');
  const firstOutstanding=plan.find(month=>Number(month?.remaining||0)>0);
  if(firstOutstanding)return String(firstOutstanding.renewalDate||firstOutstanding.dueDate||addDuration(student.start,Number(firstOutstanding.number||1),'month'));
  const last=plan.at(-1);
  return addDuration(student.start,Math.max(1,Number(last?.number||1)),'month');
}

function monthlyFocus(student,asOf=today(),paidOverride=null){
  if(!isDynamicMonthly(student))return baseMonthlyFocus?baseMonthlyFocus(student,asOf,paidOverride):null;
  const plan=installmentPlan(student,asOf,paidOverride),first=plan.find(month=>month.remaining>0);if(!plan.length)return null;
  if(!first){const last=plan.at(-1);return{state:'complete',number:last.number,label:`الشهر ${last.number} مدفوع كامل`,dueAmount:0,dueDate:last.renewalDate||last.dueDate,renewalDate:last.renewalDate||last.dueDate,plan,prepaid:Boolean(last.prepaid)};}
  const labels={partial:'دفع جزئي',overdue:'دين',due:'مستحق',upcoming:'لم يحن'};
  return{state:first.state,number:first.number,label:`الشهر ${first.number} ${labels[first.state]||'مستحق'}`,dueAmount:['partial','overdue','due'].includes(first.state)?first.remaining:0,dueDate:first.renewalDate||first.dueDate,renewalDate:first.renewalDate||first.dueDate,plan,prepaid:Boolean(first.prepaid)};
}
function financialStatusV14(student){
  if(!isDynamicMonthly(student))return baseFinancialStatus?baseFinancialStatus(student):B.remainingAmount(student)===0?'مدفوع كامل':paymentTotal(student)===0?'لم يدفع':'دفع جزئي';
  const focus=monthlyFocus(student);if(!focus)return remainingAmount(student)>0?'لم يدفع':'مدفوع كامل';
  if(focus.state==='complete')return'مدفوع كامل';if(focus.state==='partial')return'دفع جزئي';if(focus.state==='overdue')return'دين';if(focus.state==='due')return'مستحق';return paymentTotal(student)>0?'مدفوع كامل':'لم يدفع';
}
function stoppedStudentEndDate(student,stopDate=today()){
  const stopped=String(stopDate||today()),previous=String(student?.end||'').trim();
  if(!isDynamicMonthly(student))return previous&&previous<stopped?previous:stopped;
  const paidPlan=installmentPlan(student,stopped),lastFullyPaid=[...paidPlan].reverse().find(month=>Number(month?.fee||0)>0&&Number(month?.paid||0)>=Number(month?.fee||0));
  if(!lastFullyPaid)return stopped;
  const paidThrough=addDays(addDuration(student.start,Number(lastFullyPaid.number||1),'month'),-1);
  return paidThrough>stopped?paidThrough:stopped;
}
function stopStudent(student,reason=''){
  if(!student)return;
  const stopped=today(),previousEnd=String(student.end||'').trim();
  if(previousEnd&&!student.scheduledEndBeforeStop)student.scheduledEndBeforeStop=previousEnd;
  if(isDynamicMonthly(student)){const plan=installmentPlan(student,stopped);student.frozenMonths=plan.filter(month=>month.dueDate<=stopped||month.paid>0).length;}
  student.end=stoppedStudentEndDate(student,stopped);student.stopEndBasis=student.end>stopped?'paid-through':'stopped-at';
  student.active=false;student.status='inactive';student.stoppedAt=stopped;student.stopReason=String(reason||'').trim();student.updatedAt=Date.now();reconcileStudent(student,stopped);saveStudentsClean();
}
function daysUntil(from,to){const a=new Date(`${String(from)}T12:00:00`),b=new Date(`${String(to)}T12:00:00`);return Math.max(0,Math.round((b-a)/86400000));}
function notificationsForStudent(student){
  if(!student||isInactive(student))return[];
  const asOf=today();
  if(!isDynamicMonthly(student))return B.notificationsForStudent(student);
  const focus=monthlyFocus(student,asOf);if(!focus||focus.state==='complete'||focus.state==='upcoming'||focus.state==='partial')return[];
  const course=typeof spec==='function'?(spec(student.specialty)?.name||student.specialty||'الدورة'):(student.specialty||'الدورة'),renewalDate=String(focus.renewalDate||focus.dueDate||''),amount=Math.max(0,Number(focus.dueAmount||0));
  if(focus.state==='due'){
    const days=Math.max(1,daysUntil(asOf,renewalDate)),dayText=days===1?'يوم واحد':days===2?'يومان':`${days} أيام`;
    return[{studentId:student.id,studentName:student.name,kind:'monthly-renewal-warning',title:`تنبيه التجديد — متبقي ${dayText}`,message:`عزيزي الطالب/ة ${student.name}، متبقي ${dayText} على موعد التجديد بتاريخ ${showDate(renewalDate)} لدورة ${course}. المبلغ المطلوب ${cash(amount)}. يمكنك تسويته قبل الموعد حتى يبقى الحساب منتظمًا ولا يتحول الرصيد إلى دين.`,amount,dueDate:renewalDate,monthNumber:focus.number,fee:Number(focus.plan?.find(month=>month.number===focus.number)?.fee||0),state:'due',contextType:'month'}];
  }
  return[{studentId:student.id,studentName:student.name,kind:'monthly-debt',title:`دين قائم — الشهر ${focus.number}`,message:`عزيزي الطالب/ة ${student.name}، بدأ موعد التجديد بتاريخ ${showDate(renewalDate)} وما زال على الحساب دين بقيمة ${cash(amount)} لدورة ${course}. يرجى تسوية الدين لتحديث الحالة المالية.`,amount,dueDate:renewalDate,monthNumber:focus.number,fee:Number(focus.plan?.find(month=>month.number===focus.number)?.fee||0),state:'overdue',contextType:'month'}];
}
function currentNotifications(){return students.flatMap(notificationsForStudent);}

const baseReceiptModel=receiptModelV4;
receiptModelV4=function(student,paymentIndex=null,statement=false){
  reconcileStudent(student);
  const model=baseReceiptModel(student,paymentIndex,statement);if(!model||!isDynamicMonthly(student))return model;
  if(statement){model.paid=paymentTotal(student);model.remaining=remainingAmount(student);model.plan=installmentPlan(student);return model;}
  const index=paymentIndex===null||paymentIndex===undefined?0:Number(paymentIndex);
  const allocations=paymentAllocations(student,index);if(allocations.length){model.month=allocationMonthLabel(student,index);model.desc=allocationSummary(student,index);model.remaining=remainingAmount(student);model.monthAllocations=allocations.map(item=>({monthNumber:item.monthNumber,amount:item.amount,fee:item.fee,before:item.before,after:item.after}));}
  return model;
};

remainingOf=remainingAmount;
installmentPlanV3=installmentPlan;
monthlyFocusV3=monthlyFocus;
dueNowV3=student=>{if(!isDynamicMonthly(student))return baseDueNow?baseDueNow(student):B.remainingAmount(student);const focus=monthlyFocus(student);return Number(focus?.dueAmount||0);};
suggestedPaymentV3=student=>{if(!isDynamicMonthly(student))return baseSuggested?baseSuggested(student):remainingAmount(student);const plan=installmentPlan(student),first=plan.find(month=>month.remaining>0);return Number(first?.remaining||feeOf(student));};
allocV4=function(student,paymentIndex){
  if(!isDynamicMonthly(student))return baseAlloc?baseAlloc(student,paymentIndex):{desc:'',before:0,after:0,months:[]};
  const payment=student.payments?.[paymentIndex];if(!payment)return{desc:'',before:0,after:0,months:[]};
  let before=0;for(let i=0;i<paymentIndex;i+=1)before+=Number(student.payments?.[i]?.[1]||0);const amount=Number(payment[1]||0),months=paymentAllocations(student,paymentIndex).map(item=>({n:item.monthNumber,amount:item.amount,before:item.before,after:item.after,fee:item.fee}));
  return{desc:allocationSummary(student,paymentIndex),monthLabel:allocationMonthLabel(student,paymentIndex),before,after:before+amount,months};
};
financialStatus=financialStatusV14;
monthBadgeV3=function(student,asOf=today(),paidOverride=null){const focus=monthlyFocus(student,asOf,paidOverride);if(!focus)return'';const cls=focus.state==='complete'?'good':focus.state==='overdue'?'bad':focus.state==='upcoming'?'neutral':'warn';return`<span class="badge ${cls}">${B.esc(focus.label)}</span>`;};

const next=Object.freeze({...B,requiredAmount,remainingAmount,reconcileStudent,reconcileAllStudents,installmentPlan,dynamicAllocation,targetRemaining,appendPayment,updateStudentRegistration,stopStudent,notificationsForStudent,currentNotifications,saveStudents:saveStudentsClean,paymentAllocations,allocationSummary,allocationMonthLabel,visibleMonthCount,monthlyFocus,monthlyCoverageEnd,monthlyPrepayment:true,monthlyCoverageEndForSearch:true,registrationEditAtomic:true,registrationEditStudentScoped:true,monthlyReallocationOnEdit:true,historicalCourseSnapshotPreservedOnEdit:true,registrationNumberCollisionGuard:true,registrationNumberImmutable:true,registrationCollisionOnlyOnScopeChange:true,zeroPaymentRegistrationCanCreateTransaction:true,rollbackOnLocalSaveFailure:true,revisionStampedPayments:true,stoppedStudentHasEndDate:true,stoppedMonthlyPaidThroughProtected:true,monthlyOpenLeadDays:OPEN_LEAD_DAYS,monthlyRenewalWarningDays:RENEWAL_WARNING_DAYS});
window.EFC_DOMAIN_V13=next;
window.EFC_DOMAIN_V13_READY=Promise.resolve(next);
reconcileAllStudents();
window.EFC_MONTHLY_PREPAYMENT_DOMAIN_V14=Object.freeze({ready:true,maxMonths:MAX_MONTHS,prepayAcrossMonths:true,allocationPersisted:true,nextMonthVisibleBeforeRenewal:true,renewalReminderBeforeStart:true,renewalWarningBeforeMonth:true,renewalWarningDays:RENEWAL_WARNING_DAYS,debtStartsWithUnpaidRenewal:true,inclusiveReminderSalutation:true,atomicRegistrationEdit:true,studentScopedEdits:true,historicalCourseSnapshotPreserved:true,registrationCollisionGuard:true,zeroPaymentRegistrationEdit:true,revisionAwareEdits:true});
})();