(()=>{
'use strict';
if(window.EFC_STUDENT_UI_V13?.ready)return;
const D=window.EFC_DOMAIN_V13;
if(!D?.ready)throw new Error('Student UI v13 loaded before domain v13 was ready.');

const {OFFICIAL_NAME,esc,today,nowTime,cash,showDate,courseTypeOf,isDynamicMonthly,isNewModel,isInactive,paymentTotal,requiredAmount,remainingAmount,reconcileStudent,installmentPlan,targetRemaining,appendPayment,stopStudent,notificationsForStudent}=D;
function studentEndForSearch(student){if((window.EFC_DOMAIN_V13?.isDynamicMonthly?.(student)??isDynamicMonthly(student))===true)return String(window.EFC_DOMAIN_V13?.monthlyCoverageEnd?.(student)||'');return String(student?.end||'');}
function debtDateForSearch(student,asOf=today()){
  const focus=window.EFC_DOMAIN_V13?.monthlyFocus?.(student,asOf);
  const activeMonth=focus?.plan?.find?.(month=>Number(month?.number)===Number(focus?.number));
  const candidate=String((focus?.state==='due'?(activeMonth?.dueFrom||activeMonth?.openDate):'')||focus?.renewalDate||focus?.dueDate||studentEndForSearch(student)||student?.start||'');
  return candidate&&candidate>String(asOf||'')?String(asOf||''):candidate;
}
// Kept as a compatibility constant for existing verification; debt fields now update immediately.
const DEBT_IDLE_MS=450;
const legacyOpenPayment=openPayment;

function autocompleteOff(root=document){
  root.querySelectorAll?.('form').forEach(form=>form.setAttribute('autocomplete','off'));
  root.querySelectorAll?.('input').forEach(input=>{
    if(input.type==='hidden'||input.type==='checkbox'||input.type==='radio')return;
    input.setAttribute('autocomplete','off');
    input.setAttribute('autocorrect','off');
    input.setAttribute('spellcheck','false');
  });
}
function canEdit(section){return window.EFC_AUTH_V13?.canEdit?.(section)??true;}
function canView(section){return window.EFC_AUTH_V13?.canView?.(section)??true;}
function paymentMethodOptions(selected=''){return methods.map(value=>`<option ${String(value)===String(selected)?'selected':''}>${esc(value)}</option>`).join('');}
function closeModal(modal){modal?.remove();}
function modalShell(title,subtitle,body,wide=false){
  const modal=document.createElement('div');modal.className='modal';
  modal.innerHTML=`<div class="modal-card ${wide?'wide-modal':'narrow'}"><div class="modal-head"><div><p>${esc(subtitle||'')}</p><h2>${esc(title)}</h2></div><button class="x" type="button">×</button></div>${body}</div>`;
  document.body.appendChild(modal);modal.querySelector('.x').onclick=()=>closeModal(modal);autocompleteOff(modal);return modal;
}
function showReceiptConfirmation(student,paymentIndex,kind='pay'){
  try{
    reconcileStudent(student);
    const receipt=receiptModelV4(student,paymentIndex,false);
    if(!receipt)return;
    const modal=document.createElement('div');modal.className='modal';
    modal.innerHTML=`<div class="modal-card narrow"><div class="modal-head"><div><p>${kind==='reg'?'تم تسجيل الطالب':'تم تسجيل الدفعة'}</p><h2>${esc(student.name)}</h2><span>${esc(receipt.desc||'')}</span></div><button class="x" type="button">×</button></div><div class="receipt-mini-v4"><span>رقم الوصل <b>${esc(receipt.receipt)}</b></span><span>المبلغ <b>${cash(receipt.amount)}</b></span><span>المتبقي <b>${cash(receipt.remaining)}</b></span></div><div class="modal-actions"><button class="button secondary close" type="button">إغلاق</button>${typeof receiptActionsV4==='function'?receiptActionsV4(receipt):''}</div></div>`;
    document.body.appendChild(modal);const close=()=>modal.remove();modal.querySelector('.x').onclick=close;modal.querySelector('.close').onclick=close;
    if(typeof convertDigitsInNodeV3==='function')convertDigitsInNodeV3(modal);
  }catch(error){console.error('EFC v13 receipt confirmation failed.',error);alert('تم حفظ العملية، لكن تعذر تجهيز معاينة الوصل.');}
}

function renderSpecialtiesBaseV13(){
  currentPage='specialties';
  shell(`${pageTitle('الإعداد التشغيلي','الدورات','أنشئ دورة عادية شهرية أو دورة سريعة بعدد أيام. السعر يحدد لكل طالب وقت التسجيل.',`<button class="button" id="addSpecV13">＋ إضافة دورة</button>`)}<div class="spec-grid">${specialties.map(item=>{const type=courseTypeOf(item),enrolled=students.filter(student=>student.specialty===item.id);return`<div class="card spec-card"><div class="spec-top"><div><h3>${esc(item.name)}</h3><span>${type==='normal'?'عادية · شهرية':'سريعة'}</span></div><button class="mini edit-spec-v13" data-id="${esc(item.id)}" type="button">تعديل</button></div><div class="spec-facts"><div><small>نوع الدورة</small><b>${type==='normal'?'عادية شهرية':'سريعة'}</b></div><div><small>${type==='normal'?'النظام':'المدة'}</small><b>${type==='normal'?'شهر يتجدد حسب استمرار الطالب':`${Number(item.quickDays||item.durationValue||1)} يوم`}</b></div><div><small>التسعير</small><b>عند تسجيل الطالب</b></div><div><small>عدد الطلاب</small><b>${enrolled.length}</b></div></div></div>`;}).join('')}</div>`);
  document.getElementById('addSpecV13')?.addEventListener('click',()=>openCourseEditor());
  document.querySelectorAll('.edit-spec-v13').forEach(button=>button.onclick=()=>openCourseEditor(button.dataset.id));
}
function openCourseEditor(id=null){
  const existing=id?spec(id):null,type=existing?courseTypeOf(existing):'normal',modal=modalShell(existing?.name||'دورة جديدة',existing?'تعديل دورة':'إضافة دورة',`<form id="courseFormV13" class="grid two" autocomplete="off"><label class="wide">اسم الدورة<input class="input" name="name" value="${esc(existing?.name||'')}" autocomplete="off" required></label><label>نوع الدورة<select name="type" id="courseTypeV13"><option value="normal" ${type==='normal'?'selected':''}>عادية — شهرية</option><option value="quick" ${type==='quick'?'selected':''}>سريعة</option></select></label><label class="quick-days-v13" id="quickDaysV13">عدد الأيام<input class="input" name="days" type="number" min="1" value="${Math.max(1,Number(existing?.quickDays||existing?.durationValue||35))}" autocomplete="off"></label><div class="wide course-note-v13">السعر لا يحفظ في الدورة؛ يحدد لكل طالب عند التسجيل.</div><div class="wide modal-actions"><button type="button" class="button secondary cancel">إلغاء</button><button class="button">حفظ</button></div></form>`);
  const form=modal.querySelector('form'),typeEl=form.elements.type,daysWrap=modal.querySelector('#quickDaysV13');
  const updateType=()=>{const quick=typeEl.value==='quick';daysWrap.hidden=!quick;form.elements.days.required=quick;};
  updateType();typeEl.onchange=updateType;modal.querySelector('.cancel').onclick=()=>modal.remove();
  form.onsubmit=event=>{
    event.preventDefault();const data=new FormData(form),courseType=String(data.get('type')),count=Math.max(1,Number(data.get('days')||1)),name=String(data.get('name')||'').trim();if(!name)return;
    const item={...(existing||{}),id:existing?.id||D.uid('sp'),name,courseType,billing:courseType==='normal'?'monthly':'one_time',durationUnit:courseType==='normal'?'month':'day',durationValue:courseType==='normal'?1:count,quickDays:courseType==='quick'?count:null};delete item.fee;
    if(existing)specialties=specialties.map(value=>value.id===id?item:value);else specialties.push(item);
    D.saveSpecs();modal.remove();renderSpecialties();
  };
}

// Registration rendering is owned exclusively by production-registration-schedule-v13 + matrix-v17.
openPayment=function(id,targetMonth=null){
  const student=students.find(value=>value.id===id);if(!student)return;if(!isNewModel(student)){legacyOpenPayment(id,targetMonth);return;}
  reconcileStudent(student);const monthly=isDynamicMonthly(student),plan=monthly?installmentPlan(student):[],monthNumber=monthly?(Number(targetMonth)||plan.find(month=>month.remaining>0)?.number):null,max=monthly?targetRemaining(student,monthNumber):remainingAmount(student);if(max<=0)return;
  const modal=modalShell(student.name,monthly?`تسجيل دفعة للشهر ${monthNumber}`:'تسجيل دفعة',`<div class="payment-balance"><div><small>المتبقي</small><b>${cash(max)}</b></div><div><small>إجمالي المدفوع</small><b>${cash(paymentTotal(student))}</b></div></div><form id="paymentFormV13" class="grid two" autocomplete="off"><label>المبلغ<input class="input" name="amount" type="number" min="1" max="${max}" value="${max}" autocomplete="off" required></label><label>وسيلة الدفع<select name="method">${paymentMethodOptions()}</select></label><label>التاريخ<input class="input" name="date" type="date" value="${today()}" required></label><label>البيان<input class="input" name="description" value="${esc(monthly?`دفعة الشهر ${monthNumber}`:'دفعة مستحقات')}" autocomplete="off"></label><label class="wide debt-date-v13 debt-slot-v13 debt-slot-hidden" id="payDebtWrapV13">موعد سداد المتبقي<input class="input" name="debtDate" type="date" autocomplete="off"></label><div class="wide modal-actions"><button type="button" class="button secondary cancel">إلغاء</button><button class="button">حفظ الدفعة</button></div></form>`);
  const form=modal.querySelector('form'),amountEl=form.elements.amount,debtWrap=modal.querySelector('#payDebtWrapV13');
  function debtVisibility(){const amount=Number(amountEl.value||0),partial=amount>0&&amount<max;debtWrap.classList.toggle('debt-slot-hidden',!partial);form.elements.debtDate.required=partial;}
  amountEl.oninput=debtVisibility;amountEl.onblur=debtVisibility;debtVisibility();modal.querySelector('.cancel').onclick=()=>modal.remove();
  form.onsubmit=event=>{
    event.preventDefault();debtVisibility();const data=new FormData(form),amount=Number(data.get('amount')),debtDate=String(data.get('debtDate')||'');if(amount<=0||amount>max)return alert('المبلغ غير صالح.');if(amount<max&&!debtDate)return alert('حدد موعد سداد المتبقي.');
    try{const index=appendPayment(student,{amount,method:String(data.get('method')||''),date:String(data.get('date')),time:nowTime(),description:String(data.get('description')||''),targetMonth:monthly?monthNumber:null,debtDueDate:amount<max?debtDate:null,persist:true});modal.remove();renderCurrentV13();setTimeout(()=>showReceiptConfirmation(student,index,'pay'),30);}
    catch(error){alert(String(error?.message||error));}
  };
};

function monthStateBadgeV13(month){
  return month.state==='paid'?badge('مدفوع كامل'):month.state==='partial'?badge('دفع جزئي'):month.state==='overdue'?badge('دين'):month.state==='due'?badge('مستحق'):badge('لم يحن');
}
function monthReceiptSourceV15(student,monthNumber){
  const number=Number(monthNumber);
  const contributions=(student.payments||[]).map((payment,index)=>{
    const allocations=typeof D.paymentAllocations==='function'?D.paymentAllocations(student,index):(Array.isArray(payment?.[10])?payment[10]:[]);
    const amount=allocations.filter(item=>Number(item?.monthNumber??item?.n)===number).reduce((sum,item)=>sum+Number(item?.amount||0),0);
    return amount>0?{payment,index,amount,allocations}:null;
  }).filter(Boolean);
  const single=contributions.length===1?contributions[0]:null;
  const sourceMonths=single?[...new Set((single.allocations||[]).map(item=>Number(item?.monthNumber??item?.n)).filter(value=>Number.isInteger(value)&&value>0))]:[];
  const sourceEquivalent=Boolean(single&&sourceMonths.length===1&&sourceMonths[0]===number&&Math.round(Number(single.amount||0)*100)===Math.round(Number(single.payment?.[1]||0)*100));
  return{contributions,single,sourceEquivalent};
}
function monthReceiptModelV13(student,monthNumber){
  const number=Number(monthNumber),month=installmentPlan(student).find(item=>Number(item.number)===number);
  if(!month||Number(month.paid||0)<=0)return null;
  const source=monthReceiptSourceV15(student,number);
  if(source.sourceEquivalent&&source.single){
    const model=receiptModelV4(student,source.single.index,false);
    if(model)return{...model,derivedReceipt:true,sourceEquivalent:true,editableReceipt:true,receiptSource:'payment-clone'};
  }
  const latest=source.contributions.slice().sort((a,b)=>String(b.payment?.[0]||'').localeCompare(String(a.payment?.[0]||''))||Number(b.payment?.[4]||0)-Number(a.payment?.[4]||0))[0];
  const methodsUsed=[...new Set(source.contributions.map(({payment})=>String(payment?.[2]||'')).filter(Boolean))];
  return{statement:false,registrationReceipt:false,derivedReceipt:true,sourceEquivalent:false,editableReceipt:false,receiptSource:'derived-month',studentId:String(student.id||''),paymentIndex:null,transactionCode:'',student:student.name,phone:student.phone||'',branch:branchName(student.branch),specialty:spec(student.specialty)?.name||student.specialty,reg:String(student.reg??'').padStart(4,'0'),date:String(latest?.payment?.[0]||month.dueDate||student.start),receipt:String(latest?.payment?.[8]||`M-${String(student.reg??'').padStart(4,'0')}-${number}`),amount:Number(month.paid||0),remaining:Number(month.remaining||0),method:methodsUsed.length?methodsUsed.join(' + '):String(latest?.payment?.[2]||'—'),month:`الشهر ${number}`,desc:`إجمالي مدفوع الشهر ${number}: ${cash(month.paid)} · المتبقي من الشهر: ${cash(month.remaining)}`};
}

openStudent=function(id,mode='finance'){
  const student=students.find(value=>value.id===id);if(!student)return;
  reconcileStudent(student);
  const snapshot=student.snapshot||{},monthly=isDynamicMonthly(student)||snapshot.billing==='monthly',plan=monthly?installmentPlan(student):[],profile=mode==='profile',rem=remainingAmount(student),canModify=canEdit('students'),reminders=notificationsForStudent(student)||[],duration=monthly?'شهرية مستمرة':snapshot.durationValue?`${Number(snapshot.durationValue)} ${typeof unitLabel==='function'?unitLabel(snapshot.durationUnit):snapshot.durationUnit||''}`:(student.start&&student.end?`${Math.max(1,daysBetween(student.start,student.end))} يوم`:'—'),record=String(student.reg??'').padStart(4,'0'),specialtyName=spec(student.specialty)?.name||student.specialty||'—',phone=String(student.phone||'').trim()||'غير مسجل';
  const tabs=`<div class="student-file-tabs-v3" role="tablist" aria-label="ملف الطالب"><button type="button" data-tab="profile" class="${profile?'active':''}">بيانات الطالب</button><button type="button" data-tab="finance" class="${!profile?'active':''}">الدورة والدفع</button></div>`;
  const stoppedState=isInactive(student)?`<div class="student-state-v13 off"><b>الطالب موقوف</b><span>موقوف منذ ${showDate(student.stoppedAt)} · المتبقي القديم ${cash(rem)}</span></div>`:'';
  const reminderHtml=reminders.length?`<section class="student-reminders-v13"><div class="section-head"><h3>تذكيرات الطالب</h3><span>${reminders.length} تذكير جاهز</span></div>${reminders.map((note,index)=>`<div class="student-reminder-card-v13"><div class="student-reminder-copy-v13"><b>${esc(note.title||'تذكير بالدين')}</b><p>${esc(note.message)}</p></div><div class="student-reminder-actions-v13"><button class="mini reminder-view-v13" data-index="${index}" type="button">عرض</button><button class="mini reminder-pdf-v13" data-index="${index}" type="button">حفظ PDF</button></div></div>`).join('')}</section>`:'';
  let body='';
  if(profile){
    body=`${tabs}${stoppedState}<div class="student-profile-v3"><section class="student-profile-section-v3"><h3>المعلومات الأساسية</h3><div class="student-profile-grid-v3"><div class="student-profile-field-v3"><small>اسم الطالب</small><b>${esc(student.name)}</b></div><div class="student-profile-field-v3"><small>رقم الهاتف</small><b dir="ltr">${esc(phone)}</b></div><div class="student-profile-field-v3"><small>رقم السجل</small><b>${record}</b></div><div class="student-profile-field-v3"><small>الفرع</small><b>${esc(branchName(student.branch))}</b></div><div class="student-profile-field-v3"><small>الدورة</small><b>${esc(specialtyName)}</b></div><div class="student-profile-field-v3"><small>مدة الدورة</small><b>${esc(duration)}</b></div><div class="student-profile-field-v3"><small>بداية الدورة</small><b>${showDate(student.start)}</b></div><div class="student-profile-field-v3"><small>نهاية الدورة</small><b>${showDate(student.end)}</b></div></div></section><section class="student-profile-section-v3"><h3>حالة التسجيل</h3><div class="student-profile-grid-v3"><div class="student-profile-field-v3"><small>حالة الدورة</small>${badge(courseStatus(student))}</div><div class="student-profile-field-v3"><small>نوع التسجيل</small><b>${monthly?'دورة بدفع شهري':'دورة سريعة بدفعة واحدة'}</b></div><div class="student-profile-field-v3"><small>تاريخ البداية المعتمد</small><b>${showDate(student.start)}</b></div><div class="student-profile-field-v3"><small>تاريخ النهاية المعتمد</small><b>${showDate(student.end)}</b></div></div></section></div>${reminderHtml}<div class="student-profile-actions-v3"><button class="button secondary close" type="button">إغلاق</button>${!isInactive(student)&&canModify?'<button class="button secondary stop-student-v13" type="button">إيقاف الطالب</button>':''}<button class="button open-finance-v13" type="button">الدورة والدفع</button></div>`;
  }else{
    const monthRows=monthly?plan.map(month=>{const receipt=Number(month.paid||0)>0?`<button class="month-action-mm month-receipt-v13" data-month="${month.number}" type="button">فتح الروسي</button>`:'<span class="month-placeholder-mm">—</span>',pay=month.remaining>0&&canModify?`<button class="month-action-mm month-pay-mm pay-month-v13" data-month="${month.number}" type="button">تسجيل الدفع</button>`:'';return`<tr><td>الشهر ${month.number}</td><td>${showDate(month.dueDate)}</td><td>${cash(month.fee)}</td><td>${cash(month.paid)}</td><td>${cash(month.remaining)}</td><td>${monthStateBadgeV13(month)}</td><td><div class="month-actions-mm">${receipt}${pay}</div></td></tr>`;}).join(''):'';
    const paymentRows=[...(student.payments||[])].map((payment,index)=>({payment,index})).reverse().map(({payment,index})=>`<tr><td>${showDate(payment[0])}</td><td>${esc(payment[2]||'—')}</td><td>${cash(payment[1])}</td><td>${esc(payment[5]||'')}</td><td><button class="mini payment-receipt-v13" data-index="${index}" type="button">فتح الروسي</button></td></tr>`).join('');
    const registrationReceipt=(student.payments||[]).length?'<button class="mini registration-receipt-v13" type="button">روسي التسجيل</button>':'';
    const allMonths=monthly&&plan.some(month=>Number(month.paid||0)>0)?'<button class="mini all-months-receipt-v13" type="button">روسي شامل للأشهر</button>':'';
    body=`${tabs}${stoppedState}<div class="student-kpis"><div><small>البداية</small><b>${showDate(student.start)}</b></div><div><small>النهاية</small><b>${showDate(student.end)}</b></div><div><small>حالة الدورة</small>${badge(courseStatus(student))}</div><div><small>${monthly?'وضع الشهر':'الوضع المالي'}</small>${badge(financialStatus(student))}</div><div><small>المدفوع</small><b>${cash(paymentTotal(student))}</b></div><div><small>${isInactive(student)?'المتبقي القديم':'المتبقي من الدورة'}</small><b>${cash(rem)}</b></div></div>${monthly?`<div class="sub-title-row-v4"><h3>أشهر الدورة</h3>${allMonths}</div><div class="monthly-table-mm">${table(['الشهر','موعده','المبلغ','المدفوع','المتبقي','الحالة','الخيارات'],monthRows)}</div>`:''}<div class="sub-title-row-v4"><h3>سجل الدفعات</h3>${registrationReceipt}</div>${table(['التاريخ','الوسيلة','المبلغ','البيان',''],paymentRows)}${reminderHtml}<div class="modal-actions student-actions-v13"><button class="button secondary close" type="button">إغلاق</button>${!monthly&&rem>0&&canModify?'<button class="button pay-student-v13" type="button">تسجيل دفعة جديدة</button>':''}${!isInactive(student)&&canModify?'<button class="button secondary stop-student-v13" type="button">إيقاف الطالب</button>':''}</div>`;
  }
  const modal=modalShell(student.name,'ملف الطالب',body,true);modal.querySelector('.close').onclick=()=>modal.remove();modal.querySelectorAll('[data-tab]').forEach(button=>button.onclick=()=>{modal.remove();openStudent(id,button.dataset.tab);});
  modal.querySelector('.open-finance-v13')?.addEventListener('click',()=>{modal.remove();openStudent(id,'finance');});
  modal.querySelector('.pay-student-v13')?.addEventListener('click',()=>{modal.remove();openPayment(id);});
  modal.querySelectorAll('.pay-month-v13').forEach(button=>button.onclick=()=>{modal.remove();openPayment(id,Number(button.dataset.month));});
  modal.querySelector('.registration-receipt-v13')?.addEventListener('click',()=>{const model=receiptModelV4(student,0,false);if(model)receiptWindowV4(model);});
  modal.querySelector('.all-months-receipt-v13')?.addEventListener('click',()=>{const model=receiptModelV4(student,null,true);if(model)receiptWindowV4(model);});
  modal.querySelectorAll('.payment-receipt-v13').forEach(button=>button.onclick=()=>{const model=receiptModelV4(student,Number(button.dataset.index),false);if(model)receiptWindowV4(model);});
  modal.querySelectorAll('.month-receipt-v13').forEach(button=>button.onclick=()=>{const model=monthReceiptModelV13(student,Number(button.dataset.month));if(model)receiptWindowV4(model);});
  modal.querySelector('.stop-student-v13')?.addEventListener('click',()=>{if(!confirm(`إيقاف ${student.name}؟`))return;const reason=prompt('سبب الإيقاف (اختياري):','')||'';stopStudent(student,reason);modal.remove();openStudent(id,mode);});
  modal.querySelectorAll('.reminder-view-v13').forEach(button=>button.onclick=()=>window.EFC_OPEN_REMINDER_V13?.(reminders[Number(button.dataset.index)]));
  modal.querySelectorAll('.reminder-pdf-v13').forEach(button=>button.onclick=()=>window.EFC_SAVE_REMINDER_PDF_V13?.(reminders[Number(button.dataset.index)]));
  autocompleteOff(modal);
};

function studentSearchRow(student){
  reconcileStudent(student);const end=studentEndForSearch(student);
  return`<tr class="student-row student-info-row-v3" data-id="${esc(student.id)}"><td>${String(student.reg??'').padStart(4,'0')}</td><td><span class="student-name-v3">${esc(student.name)}</span></td><td class="student-phone-v3">${esc(String(student.phone||'').trim()||'—')}</td><td>${esc(branchName(student.branch))}</td><td>${esc(spec(student.specialty)?.name||student.specialty||'—')}</td><td>${showDate(student.start)}</td><td>${showDate(end)}</td><td>${badge(courseStatus(student))}</td></tr>`;
}
function searchDigitsV13(value){return westernDigitsV3(String(value??'')).replace(/\D/g,'');}
function displayRecordV13(value){const digits=searchDigitsV13(value);return digits.padStart(4,'0');}
function studentIdentitySearchMatchesV13(student,query){
  const raw=String(query??'').trim().toLowerCase();if(!raw)return true;
  if(String(student?.name||'').toLowerCase().includes(raw))return true;
  const digits=searchDigitsV13(raw);if(!digits)return false;
  return searchDigitsV13(student?.phone).includes(digits)||displayRecordV13(student?.reg).includes(digits);
}
function renderStudentsBaseV13(){
  currentPage='students';
  if(!canView('students')){shell(`${pageTitle('الملفات','البحث عن طالب','لا تملك صلاحية عرض ملفات الطلاب.')}<div class="card production-empty-config"><h2>غير مسموح</h2></div>`);return;}
  shell(`${pageTitle('الملفات','البحث عن طالب','ابحث عن الطالب واعرض معلوماته الأساسية والدورة دون إقحام التفاصيل المالية في قائمة البحث.')}<div class="card filters student-search-filters-v13"><input class="input" id="studentSearchV13" placeholder="ابحث بالاسم أو الهاتف أو رقم السجل" autocomplete="off"><select id="studentBranchV13">${opts(branches,x=>x.id,x=>x.name,'كل الفروع')}</select><select id="studentSpecV13">${opts(specialties,x=>x.id,x=>x.name,'كل الدورات')}</select></div><div id="studentsTableV13"></div>`);
  const draw=()=>{const query=document.getElementById('studentSearchV13').value,branch=document.getElementById('studentBranchV13').value,specialty=document.getElementById('studentSpecV13').value,list=students.filter(student=>studentIdentitySearchMatchesV13(student,query)&&(!branch||student.branch===branch)&&(!specialty||student.specialty===specialty));document.getElementById('studentsTableV13').innerHTML=table(['السجل','الطالب','الهاتف','الفرع','الدورة','البداية','النهاية','حالة الدورة'],list.map(studentSearchRow).join(''));document.querySelectorAll('#studentsTableV13 tr[data-id]').forEach(row=>row.onclick=()=>openStudent(row.dataset.id,'profile'));};
  document.getElementById('studentSearchV13').addEventListener('input',draw);['studentBranchV13','studentSpecV13'].forEach(id=>document.getElementById(id).addEventListener('change',draw));draw();autocompleteOff(document.getElementById('studentSearchV13')?.closest('.card'));
}

function periodTable(columns,records,sortState,onSort){
  const sorted=[...records];if(sortState.key){const col=columns.find(value=>value.key===sortState.key);if(col)sorted.sort((a,b)=>{const av=a.sort[col.key],bv=b.sort[col.key];let result=col.type==='number'?Number(av||0)-Number(bv||0):String(av||'').localeCompare(String(bv||''),'ar',{numeric:true});return sortState.direction==='desc'?-result:result;});}
  const head=columns.map(col=>`<th class="sortable-head-prod" data-sort="${col.key}">${esc(col.label)}${sortState.key===col.key?` <span class="sort-arrow-prod">${sortState.direction==='desc'?'↑':'↓'}</span>`:''}</th>`).join('');
  const body=sorted.length?sorted.map(record=>`<tr class="student-row" data-id="${esc(record.studentId||'')}">${record.cells.join('')}</tr>`).join(''):`<tr><td colspan="${columns.length}"><div class="empty">لا توجد نتائج</div></td></tr>`;
  const wrap=document.createElement('div');wrap.innerHTML=`<div class="table-wrap"><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;wrap.querySelectorAll('[data-sort]').forEach(cell=>cell.onclick=()=>onSort(cell.dataset.sort));return wrap.firstElementChild;
}
function renderPeriodBaseV13(){
  currentPage='period';const current=today();
  shell(`${pageTitle('بحث موحد','آلية البحث','ابحث بالطالب والفترة والفرع والدورة والوضعية، ثم تنقّل بين المسجلين والدفعات والديون ونهايات الدورات والأشهر.')}<div class="card period-search-card-prod"><input class="input" id="periodSearchV13" placeholder="ابحث بالاسم أو الهاتف أو رقم السجل" autocomplete="off"><select id="periodBranchV13">${opts(branches,x=>x.id,x=>x.name,'كل الفروع')}</select><select id="periodSpecV13">${opts(specialties,x=>x.id,x=>x.name,'كل الدورات')}</select><select id="periodStateV13"><option value="">كل الحالات المالية</option><option>دين</option><option>مستحق</option><option>دفع جزئي</option><option>لم يدفع</option><option>مدفوع كامل</option></select><div class="period-toolbar-prod"><div class="period-tabs-prod"><button class="active" data-tab="registrations">المسجلون</button><button data-tab="payments">الدفعات</button><button data-tab="debts">الديون</button><button data-tab="ending">نهايات الدورات / الأشهر</button></div><div class="period-dates-prod"><label>من (الأقدم إذا ترك فارغًا)<input class="input" id="periodFromV13" type="date" value=""></label><label>إلى<input class="input" id="periodToV13" type="date" value="${current}"></label></div><div class="period-ending-dates-prod" hidden><label>نهاية من<input class="input" id="periodEndingFromV13" type="date" value="${current}"></label><label>نهاية إلى<input class="input" id="periodEndingToV13" type="date" value="${current}"></label></div></div></div><div class="period-help-prod"><span><b>الفترة:</b> ترك «من» فارغًا يعني البحث من أقدم بيانات موجودة.</span><span>اضغط عنوان أي عمود لترتيب النتائج.</span></div><div id="periodResultV13"></div>`);
  let tab='registrations',sortState={key:null,direction:'desc'};const result=document.getElementById('periodResultV13');
  const identity=(student,query)=>studentIdentitySearchMatchesV13(student,query);const inRange=(date,from,to)=>(!from||date>=from)&&(!to||date<=to);
  function syncPeriodDateControls(){const ending=tab==='ending',regular=document.querySelector('.period-dates-prod'),endingDates=document.querySelector('.period-ending-dates-prod');if(regular)regular.hidden=ending;if(endingDates)endingDates.hidden=!ending;}
  function draw(){syncPeriodDateControls();const query=document.getElementById('periodSearchV13').value,from=document.getElementById('periodFromV13').value,to=document.getElementById('periodToV13').value||current,endingFrom=document.getElementById('periodEndingFromV13').value||current,endingTo=document.getElementById('periodEndingToV13').value||endingFrom,activeFrom=tab==='ending'?(endingFrom<=endingTo?endingFrom:endingTo):from,activeTo=tab==='ending'?(endingFrom<=endingTo?endingTo:endingFrom):to,branch=document.getElementById('periodBranchV13').value,specialty=document.getElementById('periodSpecV13').value,state=document.getElementById('periodStateV13').value,base=student=>identity(student,query)&&(!branch||student.branch===branch)&&(!specialty||student.specialty===specialty)&&(!state||financialStatus(student)===state);let columns=[],records=[];
    if(tab==='payments'){columns=[['التاريخ','date'],['الطالب','student'],['الفرع','branch'],['الدورة','specialty'],['الوسيلة','method'],['المبلغ','amount','number']].map(([label,key,type='text'])=>({label,key,type}));records=allPayments().filter(row=>base(row.student)&&inRange(row.date,activeFrom,activeTo)).map(row=>({studentId:row.student.id,sort:{date:row.date,student:row.student.name,branch:branchName(row.student.branch),specialty:spec(row.student.specialty)?.name||row.student.specialty,method:row.method,amount:row.amount},cells:[`<td>${showDate(row.date)}</td>`,`<td><b>${esc(row.student.name)}</b></td>`,`<td>${esc(branchName(row.student.branch))}</td>`,`<td>${esc(spec(row.student.specialty)?.name||row.student.specialty)}</td>`,`<td>${esc(row.method)}</td>`,`<td>${cash(row.amount)}</td>`]}));}
    else{const ending=tab==='ending',debts=tab==='debts';columns=(ending?[['السجل','reg','number'],['الطالب','student'],['الفرع','branch'],['الدورة','specialty'],['النهاية','end'],['الحالة','status'],['المتبقي','remaining','number']]:[['السجل','reg','number'],['الطالب','student'],['الفرع','branch'],['الدورة','specialty'],['البداية','start'],['النهاية','end'],['الإجمالي','required','number'],['المدفوع','paid','number'],['المتبقي','remaining','number'],['الوضعية','status']]).map(([label,key,type='text'])=>({label,key,type}));records=students.filter(student=>{reconcileStudent(student);if(!base(student))return false;if(debts){const debtDate=debtDateForSearch(student,current);return!isInactive(student)&&financialStatus(student)!=='مدفوع كامل'&&inRange(debtDate,activeFrom,activeTo);}if(ending){const end=studentEndForSearch(student);return Boolean(end)&&inRange(end,activeFrom,activeTo);}return inRange(student.start,activeFrom,activeTo);}).map(student=>{const end=studentEndForSearch(student),common={reg:student.reg,student:student.name,branch:branchName(student.branch),specialty:spec(student.specialty)?.name||student.specialty,start:student.start,end,required:requiredAmount(student),paid:paymentTotal(student),remaining:remainingAmount(student),status:ending?courseStatus(student):financialStatus(student)};return{studentId:student.id,sort:common,cells:ending?[`<td>${String(student.reg).padStart(4,'0')}</td>`,`<td><b>${esc(student.name)}</b></td>`,`<td>${esc(common.branch)}</td>`,`<td>${esc(common.specialty)}</td>`,`<td>${showDate(end)}</td>`,`<td>${badge(common.status)}</td>`,`<td>${cash(common.remaining)}</td>`]:[`<td>${String(student.reg).padStart(4,'0')}</td>`,`<td><b>${esc(student.name)}</b></td>`,`<td>${esc(common.branch)}</td>`,`<td>${esc(common.specialty)}</td>`,`<td>${showDate(student.start)}</td>`,`<td>${showDate(end)}</td>`,`<td>${cash(common.required)}</td>`,`<td>${cash(common.paid)}</td>`,`<td>${cash(common.remaining)}</td>`,`<td>${badge(common.status)}</td>`]};});}
    result.innerHTML=`<div class="period-result-head-prod"><b>${records.length} نتيجة</b><span>${activeFrom?`${showDate(activeFrom)} — ${showDate(activeTo)}`:`حتى ${showDate(activeTo)}`}</span></div>`;const node=periodTable(columns,records,sortState,key=>{sortState=sortState.key===key?{key,direction:sortState.direction==='desc'?'asc':'desc'}:{key,direction:'desc'};draw();});result.appendChild(node);node.querySelectorAll('tr[data-id]').forEach(row=>row.onclick=()=>openStudent(row.dataset.id,'finance'));autocompleteOff(result);
  }
  document.querySelectorAll('.period-tabs-prod button').forEach(button=>button.onclick=()=>{tab=button.dataset.tab;sortState={key:null,direction:'desc'};document.querySelectorAll('.period-tabs-prod button').forEach(value=>value.classList.toggle('active',value===button));syncPeriodDateControls();draw();});document.getElementById('periodSearchV13').addEventListener('input',draw);['periodFromV13','periodToV13','periodEndingFromV13','periodEndingToV13','periodBranchV13','periodSpecV13','periodStateV13'].forEach(id=>document.getElementById(id).addEventListener('change',draw));syncPeriodDateControls();draw();
}

const style=document.createElement('style');style.textContent=`
.quick-days-v13[hidden]{display:none!important}.debt-slot-v13{min-height:67px;transition:opacity .08s ease}.debt-slot-v13.debt-slot-hidden{visibility:hidden;pointer-events:none}.course-note-v13{padding:10px 12px;border:1px solid var(--border);border-radius:9px;background:var(--surface2);color:var(--muted);font-size:9px}
.student-file-tabs-v3{display:flex;align-items:center;gap:7px;margin:0 0 18px;padding-bottom:14px;border-bottom:1px solid var(--border)}.student-file-tabs-v3 button{border:1px solid var(--border);background:#fff;color:var(--muted);border-radius:8px;padding:8px 14px;font:inherit;font-size:9px;cursor:pointer}.student-file-tabs-v3 button.active{background:var(--primary);border-color:var(--primary);color:#fff;font-weight:800}.student-file-tabs-v3 button:hover:not(.active){background:var(--soft);color:var(--primary)}
.student-profile-v3{display:grid;gap:22px}.student-profile-section-v3{border:1px solid var(--border);border-radius:12px;background:#fff;padding:17px}.student-profile-section-v3 h3{margin:0 0 14px;font-size:13px}.student-profile-grid-v3{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.student-profile-field-v3{background:var(--surface2);border:1px solid var(--border);border-radius:9px;padding:12px;min-height:62px}.student-profile-field-v3 small{display:block;color:var(--muted);font-size:8px;margin-bottom:6px}.student-profile-field-v3 b{font-size:11px;line-height:1.6;white-space:normal;word-break:break-word}.student-profile-actions-v3{display:flex;justify-content:flex-end;gap:8px;margin-top:18px}.student-info-row-v3 td{vertical-align:middle}.student-info-row-v3 .student-name-v3{font-weight:800}.student-info-row-v3 .student-phone-v3{direction:ltr;text-align:right}
.student-state-v13{margin:0 0 14px;padding:10px 12px;border-radius:9px;display:flex;justify-content:space-between;gap:15px}.student-state-v13.off{background:#f2f3f2}.student-reminders-v13{margin:14px 0;border:1px solid #ead7a8;border-radius:10px;background:#fffaf0;padding:12px}.student-reminder-card-v13{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;padding:11px 0;border-top:1px solid #eee1bf}.student-reminder-copy-v13{min-width:0;flex:1}.student-reminder-copy-v13>b{display:block;font-size:10px;color:#75551d;margin-bottom:4px}.student-reminder-card-v13 p{margin:0;font-size:10px;line-height:1.85}.student-reminder-actions-v13{display:flex;align-items:center;gap:6px;flex:0 0 auto}.student-reminder-actions-v13 .mini{min-width:72px}.student-actions-v13{gap:8px;flex-wrap:wrap}
.month-actions-mm{display:flex;align-items:center;justify-content:flex-start;gap:6px;min-width:168px}.month-actions-mm .month-action-mm,.month-actions-mm .month-placeholder-mm{width:81px;min-width:81px;height:30px;box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;border-radius:7px;font-size:9px;white-space:nowrap}.month-actions-mm .month-action-mm{border:1px solid var(--border);background:#fff;color:var(--primary);cursor:pointer;font-family:inherit}.month-actions-mm .month-pay-mm{background:var(--primary);border-color:var(--primary);color:#fff;font-weight:800}.month-actions-mm .month-placeholder-mm{color:#9aa7a3}.monthly-table-mm td:last-child,.monthly-table-mm th:last-child{min-width:184px;width:184px}.sub-title-row-v4{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:17px 0 10px}.sub-title-row-v4 h3{font-size:12px;margin:0}
.student-search-filters-v13{margin-bottom:14px}.period-search-card-prod{display:grid;grid-template-columns:minmax(260px,2fr) repeat(3,minmax(135px,1fr));gap:10px;margin-bottom:14px}.period-toolbar-prod{grid-column:1/-1;display:flex;align-items:flex-end;justify-content:space-between;gap:16px;padding-top:2px;direction:rtl}.period-tabs-prod{display:flex;align-items:center;gap:6px;flex-wrap:wrap}.period-tabs-prod button{border:1px solid var(--border);background:#fff;color:var(--muted);border-radius:8px;padding:9px 13px;font:inherit;font-size:9px;cursor:pointer}.period-tabs-prod button.active{background:var(--primary);border-color:var(--primary);color:#fff;font-weight:800}.period-dates-prod{display:flex;align-items:flex-end;gap:8px;direction:rtl;margin-inline-start:auto}.period-dates-prod label{margin:0;min-width:142px;font-size:8px;color:var(--muted)}.period-dates-prod .input{min-width:142px}.period-help-prod{display:flex;align-items:center;justify-content:space-between;gap:12px;color:var(--muted);font-size:9px;margin:-2px 0 12px}.period-help-prod b{color:var(--primary)}.period-result-head-prod{display:flex;align-items:center;justify-content:space-between;margin:0 0 10px;font-size:9px;color:var(--muted)}.period-result-head-prod b{font-size:11px;color:var(--text)}.sortable-head-prod{cursor:pointer;user-select:none;white-space:nowrap;transition:background .15s ease}.sortable-head-prod:hover{background:var(--surface2)}.sort-arrow-prod{display:inline-block;margin-inline-start:5px;color:var(--primary);font-size:11px;font-weight:900}
@media(max-width:1250px){.student-profile-grid-v3{grid-template-columns:repeat(2,minmax(0,1fr))}.period-search-card-prod{grid-template-columns:repeat(2,minmax(0,1fr))}.period-toolbar-prod{align-items:stretch;flex-direction:column}.period-dates-prod{margin-inline-start:0;align-self:flex-start}}@media(max-width:900px){.period-dates-prod{width:100%}.period-dates-prod label{flex:1}.period-dates-prod .input{width:100%;min-width:0}.student-reminder-card-v13{display:grid}.student-reminder-actions-v13{justify-content:flex-start}}
`;document.head.appendChild(style);
window.EFC_RENDER_SPECIALTIES_BASE_V13=renderSpecialtiesBaseV13;
window.EFC_RENDER_STUDENTS_BASE_V13=renderStudentsBaseV13;
window.EFC_RENDER_PERIOD_BASE_V13=renderPeriodBaseV13;
window.EFC_AUTOCOMPLETE_OFF_V13=autocompleteOff;
window.EFC_SHOW_RECEIPT_V13=showReceiptConfirmation;
window.EFC_MONTH_RECEIPT_SOURCE_V15=monthReceiptSourceV15;
window.EFC_MONTH_RECEIPT_MODEL_V15=monthReceiptModelV13;
window.EFC_DEBT_DATE_FOR_SEARCH_V30=debtDateForSearch;
window.EFC_STUDENT_UI_V13=Object.freeze({ready:true,autocompleteRemoved:true,quickDaysOnlyForQuickCourse:true,debtDateAfterInputIdle:true,debtDateStableSlot:true,registrationRendererOwnedExternally:true,profilePaymentRecordedAsTransaction:true,dynamicDuesNative:true,studentSearchPageRestored:true,periodSearchHeaderRestored:true,specialtiesBaseRendererExported:true,studentSearchBaseRendererExported:true,periodBaseRendererExported:true,monthlyCourseDefault:true,originalStudentFileLayoutRestored:true,monthlyReceiptActionsRestored:true,monthReceiptSourceAware:true,derivedMonthReceiptGuard:true,sourceEquivalentMonthEditable:true,profileFirstFromStudentSearch:true,legacyRecordsUseRestoredStudentFile:true,reminderPreviewAction:true,reminderPdfAction:true,searchUsesUnifiedEndLabel:true,periodRegistrationsShowEndDate:true,endingFutureRangeFilter:true,endingRangeIndependentFromOtherTabs:true,unifiedStudentIdentitySearch:true,unifiedPeriodIdentitySearch:true,displayedRegisterDigitsSearch:true,debtTabShowsAllIncomplete:true,debtDateClampedToVisibleState:true});
})();
