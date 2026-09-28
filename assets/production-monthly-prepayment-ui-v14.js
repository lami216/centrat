(()=>{
'use strict';
if(window.EFC_MONTHLY_PREPAYMENT_UI_V14?.ready)return;
const D=window.EFC_DOMAIN_V13;
if(!D?.ready||!D.monthlyPrepayment||!window.EFC_STUDENT_UI_V13?.ready||!window.EFC_REGISTRATION_SCHEDULE_V13?.ready||!window.EFC_FINANCE_UI_V13?.ready||typeof window.EFC_RENDER_LEDGER_BASE_V13!=='function')throw new Error('Monthly prepayment UI v14 loaded before required v13 modules.');

const {esc,today,nowTime,cash,courseTypeOf,isDynamicMonthly,isInactive,paymentTotal,reconcileStudent,installmentPlan,targetRemaining,appendPayment,allocationSummary,paymentAllocations}=D;
const DAYS=['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
const baseOpenPayment=window.openPayment;
const baseOpenStudent=window.openStudent;
const baseBadge=window.badge;

window.badge=function(text){
  if(text==='دفع جزئي مقدمًا')return'<span class="badge warn">دفع جزئي مقدمًا</span>';
  if(text==='مدفوع مقدمًا')return'<span class="badge good">مدفوع مقدمًا</span>';
  return baseBadge(text);
};
function canEditStudents(){return window.EFC_AUTH_V13?.canEdit?.('students')??true;}
function modalShell(title,subtitle,body){const modal=document.createElement('div');modal.className='modal';modal.innerHTML=`<div class="modal-card narrow"><div class="modal-head"><div><p>${esc(subtitle||'')}</p><h2>${esc(title)}</h2></div><button class="x" type="button">×</button></div>${body}</div>`;document.body.appendChild(modal);modal.querySelector('.x').onclick=()=>modal.remove();window.EFC_AUTOCOMPLETE_OFF_V13?.(modal);return modal;}
function methodsOptions(){return methods.map(value=>`<option>${esc(value)}</option>`).join('');}
function coverageText(amount,fee,startMonth=1){
  const value=Math.max(0,Number(amount||0)),unit=Math.max(0,Number(fee||0));if(!value||!unit)return'لا توجد دفعة';
  const full=Math.floor(value/unit),partial=value-full*unit,parts=[];
  for(let i=0;i<full;i+=1)parts.push(`الشهر ${startMonth+i} كامل`);
  if(partial>0)parts.push(`جزء من الشهر ${startMonth+full} (${cash(partial)} من ${cash(unit)})`);
  return parts.join(' + ');
}
function readSchedule(root,item){
  const specialtyId=String(item?.id||'');
  const days=DAYS.map(key=>{
    const matrixCheck=root.querySelector(`[data-matrix-day="${key}"]`);
    const legacyCheck=root.querySelector(`[data-day-check="${key}"]`);
    const matrixTime=root.querySelector(`[data-schedule-day-time="${key}"]`);
    const legacyTime=root.querySelector(`[data-day-time="${key}"]`);
    const check=matrixCheck||legacyCheck;
    const time=matrixTime||legacyTime;
    return{key,selected:Boolean(check?.checked),time:String(time?.value||'')};
  });
  return{version:2,specialtyId,specialtyName:String(item?.name||''),days};
}

function enhanceRegistrationV14(){
  const form=document.getElementById('regFormV13'),scheduleRoot=document.querySelector('.registration-schedule-card-v13');if(!form||!scheduleRoot)return;
  const spEl=form.elements.specialty,priceEl=form.elements.price,paidEl=form.elements.paid,summary=document.getElementById('regSummaryV13');
  const refreshSummary=()=>{const item=spec(spEl.value),type=courseTypeOf(item||{}),fee=Math.max(0,Number(priceEl.value||0)),paid=Math.max(0,Number(paidEl.value||0));if(!summary||!item||fee<=0)return;summary.hidden=false;summary.innerHTML=`<div><span>نوع الدورة</span><b>${type==='normal'?'عادية شهرية':'سريعة'}</b></div><div><span>${type==='normal'?'سعر الشهر':'سعر الدورة'}</span><b>${cash(fee)}</b></div><div><span>المدفوع الآن</span><b>${cash(type==='normal'?paid:Math.min(paid,fee))}</b></div><div><span>${type==='normal'?'تغطية الدفعة':'المتبقي'}</span><b>${type==='normal'?esc(coverageText(paid,fee)):cash(Math.max(0,fee-paid))}</b></div>`;};
  [spEl,priceEl,paidEl].forEach(element=>{element?.addEventListener(element===spEl?'change':'input',()=>setTimeout(refreshSummary,0));});refreshSummary();
  form.onsubmit=event=>{
    event.preventDefault();const data=new FormData(form),item=spec(data.get('specialty'));if(!item)return;
    const type=courseTypeOf(item),monthly=type==='normal',fee=Math.max(1,Number(data.get('price')||0)),rawPaid=Math.max(0,Number(data.get('paid')||0)),paidNow=monthly?rawPaid:Math.min(fee,rawPaid),debtDate=String(data.get('debtDate')||'');
    if(paidNow>0&&paidNow<fee&&!debtDate)return alert('حدد موعد سداد المتبقي.');
    const branch=String(data.get('branch')),related=students.filter(student=>student.branch===branch&&student.specialty===item.id),reg=Math.max(0,...related.map(student=>Number(student.reg||0)))+1,start=String(data.get('start')),days=Math.max(1,Number(item.quickDays||item.durationValue||1)),schedule=readSchedule(scheduleRoot,item);
    const student={id:D.uid('student'),name:String(data.get('name')||'').trim(),phone:String(data.get('phone')||''),branch,specialty:item.id,reg,start,end:monthly?'':addDuration(start,days,'day'),required:fee,paid:0,active:true,status:'active',debtDueDates:{},schedule,snapshot:{centerOpsV13:true,centerOpsMonthlyV13:monthly,dynamicMonthly:monthly,courseType:type,billing:monthly?'monthly':'one_time',fee,durationValue:monthly?1:days,durationUnit:monthly?'month':'day'},payments:[]};
    students.unshift(student);window.EFC_CODES?.ensureStudentRecord?.(student);let paymentIndex=null;
    try{if(paidNow>0)paymentIndex=appendPayment(student,{amount:paidNow,method:String(data.get('method')||''),date:start,time:nowTime(),description:monthly?'دفعة تسجيل شهرية':'دفعة تسجيل',targetMonth:monthly?1:null,debtDueDate:paidNow<fee?debtDate:null,persist:false});D.saveStudents();}
    catch(error){students=students.filter(value=>value!==student);return alert(String(error?.message||error));}
    form.reset();form.elements.start.value=today();form.elements.paid.value=0;scheduleRoot.querySelectorAll('[data-day-check]').forEach(input=>input.checked=false);scheduleRoot.querySelectorAll('[data-day-time]').forEach(input=>input.value='');if(summary){summary.hidden=true;summary.innerHTML='';}setTimeout(()=>window.EFC_SHOW_RECEIPT_V13?.(student,paymentIndex,'reg'),30);
  };
}

window.openPayment=function(id,targetMonth=null){
  const student=students.find(value=>String(value.id)===String(id));if(!student)return;
  if(!isDynamicMonthly(student))return baseOpenPayment(id,targetMonth);
  reconcileStudent(student);const fee=Math.max(1,Number(student.snapshot?.fee||0)),plan=installmentPlan(student),monthNumber=Math.max(1,Number(targetMonth)||plan.find(month=>month.remaining>0)?.number||((plan.at(-1)?.number||0)+1)),currentRemaining=targetRemaining(student,monthNumber),suggested=currentRemaining>0?currentRemaining:fee;
  const modal=modalShell(student.name,`تسجيل دفعة بدءًا من الشهر ${monthNumber}`,`<div class="payment-balance"><div><small>المتبقي في الشهر ${monthNumber}</small><b>${cash(currentRemaining||fee)}</b></div><div><small>إجمالي المدفوع</small><b>${cash(paymentTotal(student))}</b></div></div><div class="prepay-note-v14">يمكن إدخال قيمة أكبر من قيمة الشهر، وسيتم توزيع الزيادة تلقائيًا على الأشهر التالية.</div><form id="paymentFormPrepayV14" class="grid two" autocomplete="off"><label>المبلغ<input class="input" name="amount" type="number" min="1" value="${suggested}" autocomplete="off" required></label><label>وسيلة الدفع<select name="method">${methodsOptions()}</select></label><label>التاريخ<input class="input" name="date" type="date" value="${today()}" required></label><label>البيان<input class="input" name="description" placeholder="اختياري — سيضاف توزيع الأشهر تلقائيًا" autocomplete="off"></label><label class="wide debt-date-v13 debt-slot-v13 debt-slot-hidden" id="payDebtPrepayV14">موعد سداد المتبقي<input class="input" name="debtDate" type="date" autocomplete="off"></label><div class="wide prepay-preview-v14" id="prepayPreviewV14"></div><div class="wide modal-actions"><button type="button" class="button secondary cancel">إلغاء</button><button class="button" type="submit">حفظ الدفعة</button></div></form>`);
  const form=modal.querySelector('form'),amountEl=form.elements.amount,debtWrap=modal.querySelector('#payDebtPrepayV14'),preview=modal.querySelector('#prepayPreviewV14');
  const sync=()=>{const amount=Math.max(0,Number(amountEl.value||0)),partial=currentRemaining>0&&amount>0&&amount<currentRemaining;debtWrap.classList.toggle('debt-slot-hidden',!partial);form.elements.debtDate.required=partial;preview.textContent=amount?`التوزيع المتوقع: ${coverageText(amount,fee,monthNumber)}`:'';};
  amountEl.oninput=sync;amountEl.onblur=sync;sync();modal.querySelector('.cancel').onclick=()=>modal.remove();
  form.onsubmit=event=>{event.preventDefault();sync();const data=new FormData(form),amount=Number(data.get('amount')),debtDate=String(data.get('debtDate')||'');if(amount<=0)return alert('المبلغ غير صالح.');if(currentRemaining>0&&amount<currentRemaining&&!debtDate)return alert('حدد موعد سداد المتبقي.');try{const index=appendPayment(student,{amount,method:String(data.get('method')||''),date:String(data.get('date')),time:nowTime(),description:String(data.get('description')||''),targetMonth:monthNumber,debtDueDate:currentRemaining>0&&amount<currentRemaining?debtDate:null,persist:true});modal.remove();window.renderCurrentV13?.();setTimeout(()=>window.EFC_SHOW_RECEIPT_V13?.(student,index,'pay'),30);}catch(error){alert(String(error?.message||error));}};
};

function monthReceiptModel(student,monthNumber){
  const month=installmentPlan(student).find(item=>Number(item.number)===Number(monthNumber));if(!month||Number(month.paid||0)<=0)return null;
  const related=(student.payments||[]).map((payment,index)=>({payment,index,allocations:paymentAllocations(student,index)})).filter(item=>item.allocations.some(allocation=>Number(allocation.monthNumber)===Number(monthNumber)));
  const latest=related.slice().sort((a,b)=>String(b.payment?.[0]||'').localeCompare(String(a.payment?.[0]||''))||Number(b.payment?.[4]||0)-Number(a.payment?.[4]||0))[0],methodsUsed=[...new Set(related.map(item=>String(item.payment?.[2]||'')).filter(Boolean))];
  const base=latest?receiptModelV4(student,latest.index,false):receiptModelV4(student,0,false);if(!base)return null;
  return{...base,date:String(latest?.payment?.[0]||month.dueDate||student.start),amount:Number(month.paid||0),remaining:Number(month.remaining||0),method:methodsUsed.length?methodsUsed.join(' + '):String(latest?.payment?.[2]||'—'),month:String(monthNumber),desc:`إجمالي مدفوع الشهر ${monthNumber}: ${cash(month.paid)} · المتبقي من الشهر: ${cash(month.remaining)}`};
}
window.openStudent=function(id,mode='finance'){
  baseOpenStudent(id,mode);const student=students.find(value=>String(value.id)===String(id));if(!student||mode==='profile'||!isDynamicMonthly(student))return;
  const modal=[...document.querySelectorAll('.modal')].at(-1);if(!modal)return;const plan=installmentPlan(student),rows=[...modal.querySelectorAll('.monthly-table-mm tbody tr')];
  rows.forEach((row,index)=>{const month=plan[index];if(!month)return;const status=row.children?.[5];if(status&&month.prepaid)status.innerHTML=month.remaining>0?'<span class="badge warn">دفع جزئي مقدمًا</span>':'<span class="badge good">مدفوع مقدمًا</span>';});
  modal.querySelectorAll('.payment-receipt-v13').forEach(button=>{const index=Number(button.dataset.index),row=button.closest('tr'),statement=row?.children?.[3];if(statement)statement.textContent=allocationSummary(student,index);});
  modal.querySelectorAll('.month-receipt-v13').forEach(button=>{const clone=button.cloneNode(true);button.replaceWith(clone);clone.onclick=()=>{const model=monthReceiptModel(student,Number(clone.dataset.month));if(model)receiptWindowV4(model);};});
  const actions=modal.querySelector('.student-actions-v13');if(actions&&!isInactive(student)&&canEditStudents()&&!actions.querySelector('.prepay-next-v14')){const button=document.createElement('button');button.className='button prepay-next-v14';button.type='button';button.textContent='تسجيل دفعة جديدة';button.onclick=()=>{modal.remove();window.openPayment(id);};actions.appendChild(button);}
};

function enhanceLedger(){
  const body=document.getElementById('ledgerBodyV13');if(!body)return;
  const date=document.getElementById('ledgerDateV13')?.value||'',branch=document.getElementById('ledgerBranchV13')?.value||'',specialty=document.getElementById('ledgerSpecV13')?.value||'',method=document.getElementById('ledgerMethodV13')?.value||'',expenses=D.getExpenses();
  const income=allPayments().filter(row=>row.date===date&&(!branch||row.student.branch===branch)&&(!specialty||(specialty!==D.GENERAL_EXPENSE&&row.student.specialty===specialty))&&(!method||row.method===method)),costs=expenses.filter(row=>D.expenseMatches(row,{from:date,to:date,branch,specialty,method})),items=[...income.map(row=>({kind:'income',time:row.time||'00:00',order:Number(row.order||row.student?.payments?.[row.paymentIndex]?.[4]||0),row})),...costs.map(row=>({kind:'expense',time:row.time||'00:00',order:Number(row.createdAt||0),row}))].sort((a,b)=>String(b.time).localeCompare(String(a.time))||b.order-a.order),tableRows=[...body.querySelectorAll('tbody tr')];
  items.forEach((item,index)=>{if(item.kind!=='income'||item.row?.sourceType==='certificate'||!isDynamicMonthly(item.row.student))return;const tr=tableRows[index],cell=tr?.children?.[3];if(cell)cell.textContent=allocationSummary(item.row.student,item.row.paymentIndex);});
}
window.renderLedger=function(){const result=window.EFC_RENDER_LEDGER_BASE_V13();enhanceLedger();['ledgerDateV13','ledgerBranchV13','ledgerSpecV13','ledgerMethodV13'].forEach(id=>document.getElementById(id)?.addEventListener('change',enhanceLedger));return result;};

const style=document.createElement('style');style.textContent=`.prepay-note-v14{margin:-4px 0 12px;padding:9px 11px;border:1px solid #cfe0d9;border-radius:9px;background:#f4faf7;color:var(--muted);font-size:9px;line-height:1.7}.prepay-preview-v14{min-height:38px;padding:9px 11px;border:1px dashed var(--border);border-radius:8px;background:var(--surface2);font-size:9px;line-height:1.7;color:var(--primary);font-weight:700}`;document.head.appendChild(style);
window.EFC_MONTHLY_PREPAYMENT_UI_V14=Object.freeze({ready:true,enhanceRegistration:enhanceRegistrationV14,canonicalRegistrationEnhancer:true,registrationOverpayment:true,paymentOverMonthValue:true,studentPrepaidMonthBadges:true,monthReceiptUsesAllocations:true,ledgerUsesAllocationSummary:true,canonicalLedgerRenderer:true,singleLedgerRenderOwner:true,noLedgerWrapperChain:true,synchronousLedgerEnhancement:true,nextMonthPrepaymentButton:true,newPaymentButtonLabel:true,scheduleDirectFromMatrix:true});
})();
