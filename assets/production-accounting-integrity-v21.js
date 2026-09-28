(()=>{
'use strict';
if(window.EFC_ACCOUNTING_INTEGRITY_V21?.ready)return;

const VERSION=21;
const STORAGE_KEY='efc-accounting-integrity-v21';
const SNAPSHOT_INDEX=12;
const MAX_AUDIT=600;
const invoke=window.__TAURI__?.core?.invoke;
let state={version:VERSION,studentTombstones:[],expenseTombstones:[],certificateTombstones:[],audit:[],updatedAt:0};
let installed=false,persistTimer=null,guardFrame=0,pendingCertificateEdit=null;

const clone=value=>{try{return structuredClone(value);}catch{return JSON.parse(JSON.stringify(value??null));}};
const text=value=>String(value??'').trim();
const norm=value=>text(value).toLowerCase().replace(/\s+/g,' ').replace(/[ًٌٍَُِّْـ]/g,'');
const now=()=>Date.now();
const currentUser=()=>window.EFC_AUTH_V13?.currentUser?.()?.username||'Admin';
const D=()=>window.EFC_DOMAIN_V13;
const fiscal=()=>window.EFC_FISCAL_V14;
const sequence=()=>window.EFC_RECEIPT_SEQUENCES_V10;
const safeRead=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key)||'null')??fallback;}catch{return fallback;}};
const pad2=value=>String(value).padStart(2,'0');
function addIsoDays(value,days=1){const match=/^(\d{4})-(\d{2})-(\d{2})$/.exec(text(value));if(!match)return'';const date=new Date(Number(match[1]),Number(match[2])-1,Number(match[3]),12,0,0);date.setDate(date.getDate()+Number(days||0));return`${date.getFullYear()}-${pad2(date.getMonth()+1)}-${pad2(date.getDate())}`;}

function studentTombstone(value){
  if(!value||typeof value!=='object')return null;
  const id=text(value.id),recordCode=text(value.recordCode);if(!id&&!recordCode)return null;
  return{id,recordCode,branch:text(value.branch),specialty:text(value.specialty),reg:Number(value.reg)||null,deletedAt:Math.max(0,Number(value.deletedAt||0))};
}
function expenseFingerprint(value){
  if(!value||typeof value!=='object')return'';
  return JSON.stringify([norm(value.name),Number(value.amount||0),norm(value.method),text(value.branch),text(value.specialty),text(value.date),text(value.time)]);
}
function expenseTombstone(value){
  if(!value||typeof value!=='object')return null;
  const id=text(value.id),fingerprint=id?'':text(value.fingerprint||expenseFingerprint(value));if(!id&&!fingerprint)return null;
  return{id,fingerprint,deletedAt:Math.max(0,Number(value.deletedAt||0))};
}
function certificateTombstone(value){
  if(!value||typeof value!=='object')return null;
  const id=text(value.id),recordCode=text(value.recordCode),transactionCode=text(value.transactionCode);if(!id&&!recordCode&&!transactionCode)return null;
  return{id,recordCode,transactionCode,receiptNo:Number(value.receiptNo)||null,deletedAt:Math.max(0,Number(value.deletedAt||0))};
}
function mergeLatest(items,normalize,keyFn){
  const map=new Map();
  (Array.isArray(items)?items:[]).map(normalize).filter(Boolean).forEach(item=>{const key=keyFn(item),old=map.get(key);if(!old||Number(item.deletedAt||0)>=Number(old.deletedAt||0))map.set(key,item);});
  return[...map.values()];
}
function normalizeState(raw){
  const source=raw&&typeof raw==='object'?raw:{};
  const audit=(Array.isArray(source.audit)?source.audit:[]).filter(item=>item&&typeof item==='object').map(item=>({...item,at:Math.max(0,Number(item.at||0))})).sort((a,b)=>a.at-b.at).slice(-MAX_AUDIT);
  return{
    version:VERSION,
    studentTombstones:mergeLatest(source.studentTombstones,studentTombstone,item=>item.recordCode?`r:${item.recordCode}`:`i:${item.id}`),
    expenseTombstones:mergeLatest(source.expenseTombstones,expenseTombstone,item=>item.id?`i:${item.id}`:`f:${item.fingerprint}`),
    certificateTombstones:mergeLatest(source.certificateTombstones,certificateTombstone,item=>item.recordCode?`r:${item.recordCode}`:item.transactionCode?`t:${item.transactionCode}`:`i:${item.id}`),
    audit,
    updatedAt:Math.max(0,Number(source.updatedAt||0))
  };
}
function mergeState(aRaw,bRaw){
  const a=normalizeState(aRaw),b=normalizeState(bRaw),auditMap=new Map();
  [...a.audit,...b.audit].forEach(item=>{const key=`${item.at}|${item.type||''}|${item.id||item.recordCode||item.expenseId||item.certificateId||''}`;auditMap.set(key,item);});
  return normalizeState({
    studentTombstones:[...a.studentTombstones,...b.studentTombstones],
    expenseTombstones:[...a.expenseTombstones,...b.expenseTombstones],
    certificateTombstones:[...a.certificateTombstones,...b.certificateTombstones],
    audit:[...auditMap.values()],
    updatedAt:Math.max(a.updatedAt,b.updatedAt)
  });
}
function writeLocal(touch=true){if(touch)state.updatedAt=now();localStorage.setItem(STORAGE_KEY,JSON.stringify(state));}
function addAudit(type,details={}){
  state.audit.push({type:String(type||'event'),at:now(),by:currentUser(),...clone(details)});state.audit=state.audit.slice(-MAX_AUDIT);writeLocal(true);schedulePersist();
}
function schedulePersist(){clearTimeout(persistTimer);persistTimer=setTimeout(()=>{persistTimer=null;Promise.resolve(window.EFC_FORCE_PERSIST?.()).catch(error=>console.error('EFC accounting integrity persist failed.',error));},120);}

function studentIsDead(student,fromState=state){
  const id=text(student?.id),recordCode=text(student?.recordCode);return fromState.studentTombstones.some(item=>(item.id&&item.id===id)||(item.recordCode&&item.recordCode===recordCode));
}
function expenseIsDead(row,fromState=state){
  const id=text(row?.id);if(id)return fromState.expenseTombstones.some(item=>Boolean(item.id)&&item.id===id);
  const fingerprint=expenseFingerprint(row);return Boolean(fingerprint)&&fromState.expenseTombstones.some(item=>!item.id&&item.fingerprint&&item.fingerprint===fingerprint);
}
function certificateIsDead(row,fromState=state){
  const id=text(row?.id),recordCode=text(row?.recordCode),transactionCode=text(row?.transactionCode);return fromState.certificateTombstones.some(item=>(item.id&&item.id===id)||(item.recordCode&&item.recordCode===recordCode)||(item.transactionCode&&item.transactionCode===transactionCode));
}

function paymentFingerprint(payment){
  return JSON.stringify([text(payment?.[0]),Number(payment?.[1]||0),norm(payment?.[2]),text(payment?.[3]),text(payment?.[5]),text(payment?.[8])]);
}
function dedupeLegacyIncomingPayments(current,incoming){
  const currentList=Array.isArray(current)?current:[],incomingList=Array.isArray(incoming)?incoming:[],counts=new Map();
  currentList.forEach(payment=>{const key=paymentFingerprint(payment);counts.set(key,(counts.get(key)||0)+1);});
  return incomingList.filter(payment=>{
    if(text(payment?.[6]))return true;
    const key=paymentFingerprint(payment),left=Number(counts.get(key)||0);if(left<=0)return true;counts.set(key,left-1);return false;
  });
}
function mergeBranches(incoming){
  const current=Array.isArray(window.branches)?window.branches:[],result=current.map(clone),byId=new Map(),byName=new Map(),remap=new Map();
  result.forEach(item=>{const id=text(item?.id),name=norm(item?.name);if(id)byId.set(id,item);if(name&&!byName.has(name))byName.set(name,item);});
  (Array.isArray(incoming)?incoming:[]).forEach(item=>{
    const id=text(item?.id),name=norm(item?.name),sameId=id?byId.get(id):null,sameName=name?byName.get(name):null,existing=sameId||sameName;
    if(existing){if(id&&text(existing.id)&&id!==text(existing.id))remap.set(id,text(existing.id));return;}
    const copy=clone(item);result.push(copy);if(id)byId.set(id,copy);if(name)byName.set(name,copy);
  });
  return{branches:result,remap};
}
function remapBranchValue(value,remap){const key=text(value);return key&&remap?.has(key)?remap.get(key):value;}
function mergeMethodRecords(incoming){
  const current=D()?.getMethodRecords?.()||[],result=current.map(clone),seen=new Set(result.map(item=>norm(item?.name)).filter(Boolean));
  (Array.isArray(incoming)?incoming:[]).forEach(item=>{const key=norm(item?.name);if(!key||seen.has(key))return;result.push(clone(item));seen.add(key);});
  return result;
}
function mergeExpenses(incoming,fromState=state){
  const current=D()?.getExpenses?.()||[],result=current.filter(row=>!expenseIsDead(row,fromState)).map(clone),ids=new Set(result.map(row=>text(row?.id)).filter(Boolean)),legacyCounts=new Map();
  result.forEach(row=>{const fp=expenseFingerprint(row);if(fp)legacyCounts.set(fp,(legacyCounts.get(fp)||0)+1);});
  (Array.isArray(incoming)?incoming:[]).forEach(row=>{
    if(expenseIsDead(row,fromState))return;
    const id=text(row?.id),fp=expenseFingerprint(row);
    if(id){if(ids.has(id))return;const copy=clone(row);result.push(copy);ids.add(id);return;}
    const left=Number(legacyCounts.get(fp)||0);if(left>0){legacyCounts.set(fp,left-1);return;}
    result.push(clone(row));
  });
  return result;
}
function prepareStudents(incoming,fromState=state,branchRemap=null){
  const current=Array.isArray(window.students)?window.students:[],byId=new Map(current.map(item=>[text(item?.id),item]).filter(([id])=>id)),byCode=new Map(current.map(item=>[text(item?.recordCode),item]).filter(([code])=>code));
  return (Array.isArray(incoming)?incoming:[]).filter(student=>!studentIsDead(student,fromState)).map(raw=>{
    const item=clone(raw);item.branch=remapBranchValue(item.branch,branchRemap);const same=byId.get(text(item.id))||byCode.get(text(item.recordCode));
    if(same&&text(item.id)===text(same.id)&&text(same.recordCode))item.recordCode=text(same.recordCode);
    if(same)item.payments=dedupeLegacyIncomingPayments(same.payments,item.payments);
    return item;
  });
}
function prepareIncoming(incoming,fromState=state){
  const copy=clone(incoming&&typeof incoming==='object'?incoming:{}),branchMerge=Array.isArray(copy.branches)?mergeBranches(copy.branches):{branches:null,remap:new Map()};
  if(Array.isArray(copy.branches))copy.branches=branchMerge.branches;
  if(Array.isArray(copy.students))copy.students=prepareStudents(copy.students,fromState,branchMerge.remap);
  if(Array.isArray(copy.expenses)){copy.expenses=copy.expenses.map(row=>({...row,branch:remapBranchValue(row?.branch,branchMerge.remap)}));copy.expenses=mergeExpenses(copy.expenses,fromState);}
  if(Array.isArray(copy.paymentMethodRecords))copy.paymentMethodRecords=mergeMethodRecords(copy.paymentMethodRecords);
  if(Array.isArray(copy.certificateReceipts))copy.certificateReceipts=copy.certificateReceipts.map(row=>row?.branchType==='internal'?{...row,branchId:remapBranchValue(row.branchId,branchMerge.remap)}:row).filter(row=>!certificateIsDead(row,fromState));
  copy.accountingIntegrityV21=clone(fromState);
  return copy;
}

function accountingSnapshot(student){
  return{v:1,branch:text(student?.branch),specialty:text(student?.specialty),reg:Number(student?.reg)||null,capturedAt:now()};
}
function validSnapshot(value){return Boolean(value&&typeof value==='object'&&Number(value.v||0)>=1&&text(value.branch)&&text(value.specialty));}
function stampStudentPayments(student){
  if(!student||!Array.isArray(student.payments))return false;let changed=false;
  student.payments.forEach(payment=>{if(!Array.isArray(payment)||validSnapshot(payment[SNAPSHOT_INDEX]))return;payment[SNAPSHOT_INDEX]=accountingSnapshot(student);changed=true;});return changed;
}
function stampAllPayments({persist=true}={}){
  let changed=false;(Array.isArray(window.students)?window.students:[]).forEach(student=>{if(stampStudentPayments(student))changed=true;});
  if(changed&&persist){try{window.saveStudents?.();}catch(error){console.error('EFC accounting snapshot save failed.',error);}schedulePersist();}
  return changed;
}
function installAllPaymentsSnapshot(){
  if(window.__EFC_ACCOUNTING_ALLPAYMENTS_V21__)return;const base=window.allPayments;if(typeof base!=='function')return;
  window.allPayments=function(){
    stampAllPayments({persist:true});
    return base().map(row=>{
      if(row?.sourceType==='certificate'||!row?.student)return row;
      const payment=row.student?.payments?.[Number(row.paymentIndex)],snap=payment?.[SNAPSHOT_INDEX];if(!validSnapshot(snap))return row;
      return{...row,student:{...row.student,branch:snap.branch,specialty:snap.specialty,reg:snap.reg??row.student.reg}};
    });
  };
  window.__EFC_ACCOUNTING_ALLPAYMENTS_V21__=true;
}

function rangeState(from,to){
  const start=text(from),end=text(to||from),limit=text(fiscal()?.lockedThrough?.());
  if(!start||!end||!limit||start>limit)return{status:'open',from:start,to:end,lockedThrough:limit,openFrom:start};
  if(end<=limit)return{status:'closed',from:start,to:end,lockedThrough:limit,openFrom:''};
  return{status:'mixed',from:start,to:end,lockedThrough:limit,openFrom:addIsoDays(limit,1)};
}
function archiveNotice(label='هذه الفترة',info=rangeState('','')){
  if(info.status==='mixed')return`<div class="card efc-archive-only-v21 efc-mixed-period-v21"><h2>الفترة تجمع جزءًا مقفلًا وجزءًا مفتوحًا</h2><p>${label} تبدأ داخل تاريخ مالي مقفل حتى ${D()?.showDate?.(info.lockedThrough)||info.lockedThrough}. لن يعرض النظام مجموعًا ناقصًا أو مختلطًا. راجع الجزء المقفل في الأرشيف، ثم اعرض الجزء المفتوح ابتداءً من ${D()?.showDate?.(info.openFrom)||info.openFrom}.</p><div class="modal-actions"><button type="button" class="button secondary efc-open-fiscal-archive-v21">فتح الأرشيف المالي</button><button type="button" class="button efc-open-live-ledger-v21" data-open-from="${info.openFrom}">ابدأ من أول يوم مفتوح</button></div></div>`;
  return`<div class="card efc-archive-only-v21"><h2>الفترة محفوظة في الأرشيف المالي</h2><p>${label} تقع بالكامل داخل سنة مالية مقفلة. لمنع عرض أرقام ناقصة بعد تنظيف التفاصيل، لا يعاد حساب هذه الفترة من البيانات الحية.</p><button type="button" class="button efc-open-fiscal-archive-v21">فتح الأرشيف المالي</button></div>`;
}
function financeRange(){
  const mode=text(document.querySelector('#financeModeV13 [data-mode].active')?.dataset.mode||'daily'),day=text(document.getElementById('dayV13')?.value),year=Number(document.getElementById('yearV13')?.value||0),month=Math.max(1,Math.min(12,Number(document.getElementById('monthV13')?.value||1)));
  if(mode==='daily'&&day)return{from:day,to:day,label:'اليوم المختار'};if(!year)return null;
  if(mode==='monthly'){const last=new Date(year,month,0).getDate();return{from:`${year}-${String(month).padStart(2,'0')}-01`,to:`${year}-${String(month).padStart(2,'0')}-${String(last).padStart(2,'0')}`,label:'الشهر المختار'};}
  return{from:`${year}-01-01`,to:`${year}-12-31`,label:`سنة ${year}`};
}
function certificateFinanceRange(){
  const mode=text(document.querySelector('#certFinanceModeV13 [data-mode].active')?.dataset.mode||'daily'),year=Number(document.getElementById('certFinanceYearV13')?.value||0),month=Math.max(1,Math.min(12,Number(document.getElementById('certFinanceMonthV13')?.value||1))),day=text(document.getElementById('certFinanceDayV13')?.value);if(mode==='daily'&&day)return{from:day,to:day,label:'اليوم المختار'};if(!year)return null;
  if(mode==='monthly'){const last=new Date(year,month,0).getDate();return{from:`${year}-${String(month).padStart(2,'0')}-01`,to:`${year}-${String(month).padStart(2,'0')}-${String(last).padStart(2,'0')}`,label:'الشهر المختار'};}
  return{from:`${year}-01-01`,to:`${year}-12-31`,label:`سنة ${year}`};
}
function guardBody(body,range){
  if(!body||!range)return;const info=rangeState(range.from,range.to);if(info.status==='open'){delete body.dataset.efcArchiveOnlyV21;delete body.dataset.efcArchiveStateV21;return;}
  const key=`${info.status}|${info.from}|${info.to}|${info.lockedThrough}`;if(body.dataset.efcArchiveStateV21===key)return;body.dataset.efcArchiveOnlyV21='1';body.dataset.efcArchiveStateV21=key;body.innerHTML=archiveNotice(range.label,info);
}
function periodPaymentRange(){
  const result=document.getElementById('periodResultV13'),active=document.querySelector('.period-tabs-prod button.active');if(!result||active?.dataset.tab!=='payments')return null;
  const fromInput=document.getElementById('periodFromV13'),toInput=document.getElementById('periodToV13'),to=text(toInput?.value||D()?.today?.()),from=text(fromInput?.value)||'0001-01-01';if(!to)return null;return{body:result,fromInput,range:{from,to,label:'فترة الدفعات'}};
}
function guardPeriodPayments(){
  const context=periodPaymentRange();if(!context)return;const info=rangeState(context.range.from,context.range.to);if(info.status==='open'){delete context.body.dataset.efcArchiveOnlyV21;delete context.body.dataset.efcArchiveStateV21;return;}
  if(info.status==='mixed'){
    const key=`period|${info.status}|${info.from}|${info.to}|${info.lockedThrough}`;if(context.body.dataset.efcArchiveStateV21===key)return;context.body.dataset.efcArchiveOnlyV21='1';context.body.dataset.efcArchiveStateV21=key;context.body.innerHTML=`<div class="card efc-archive-only-v21 efc-mixed-period-v21"><h2>فترة الدفعات تشمل أرشيفًا وبيانات حية</h2><p>الجزء حتى ${D()?.showDate?.(info.lockedThrough)||info.lockedThrough} موجود في الأرشيف المالي. لتجنب قائمة ناقصة، اختر أحد الجزأين بدل دمجهما بصمت.</p><div class="modal-actions"><button type="button" class="button secondary efc-open-fiscal-archive-v21">فتح الأرشيف المالي</button><button type="button" class="button efc-show-open-period-v21" data-open-from="${info.openFrom}">عرض الدفعات المفتوحة من ${D()?.showDate?.(info.openFrom)||info.openFrom}</button></div></div>`;return;
  }
  guardBody(context.body,context.range);
}
function syncCertificateFinanceSummaryGuard(range){
  const info=range?rangeState(range.from,range.to):null,periodValue=document.getElementById('certFinancePeriodTotalV13'),periodRange=document.getElementById('certFinancePeriodRangeV13');
  if(info&&info.status!=='open'){if(periodValue)periodValue.textContent='—';if(periodRange)periodRange.textContent=info.status==='closed'?'راجع الأرشيف المالي':`حتى ${D()?.showDate?.(info.lockedThrough)||info.lockedThrough} أرشيف · من ${D()?.showDate?.(info.openFrom)||info.openFrom} بيانات مفتوحة`;}
}
function guardFinanceViews(){
  guardBody(document.getElementById('financeBodyV13'),financeRange());
  const certRange=certificateFinanceRange();guardBody(document.getElementById('certFinanceBodyV13'),certRange);syncCertificateFinanceSummaryGuard(certRange);
  const ledger=document.getElementById('ledgerBodyV13'),date=text(document.getElementById('ledgerDateV13')?.value);if(ledger&&date){if(fiscal()?.isDateClosed?.(date)){const info=rangeState(date,date);if(ledger.dataset.efcArchiveStateV21!==`closed|${date}`){ledger.dataset.efcArchiveOnlyV21='1';ledger.dataset.efcArchiveStateV21=`closed|${date}`;ledger.innerHTML=archiveNotice('اليوم المختار',info);}}else{delete ledger.dataset.efcArchiveOnlyV21;delete ledger.dataset.efcArchiveStateV21;}}
  guardPeriodPayments();
}
function scheduleGuards(){if(guardFrame)return;guardFrame=requestAnimationFrame(()=>{guardFrame=0;guardFinanceViews();tagStudentModal();});}
function wrapRender(name){const base=window[name];if(typeof base!=='function'||base.__efcAccountingV21)return;const wrapped=function(...args){const result=base.apply(this,args);setTimeout(scheduleGuards,0);return result;};wrapped.__efcAccountingV21=true;window[name]=wrapped;}
function installRenderGuards(){for(const name of ['renderFinance','renderLedger','renderPeriod','renderCurrentV13','EFC_RENDER_CERTIFICATES_V13'])wrapRender(name);}
function openFiscalArchive(){
  if(location.hash!=='#settings')location.hash='#settings';else window.renderCurrentV13?.();
  setTimeout(()=>{const node=document.querySelector('.fiscal-settings-v14');node?.scrollIntoView?.({block:'start',behavior:'smooth'});node?.querySelector('details')?.setAttribute?.('open','');},120);
}
function openLedgerFrom(date){
  location.hash='#ledger';setTimeout(()=>{const input=document.getElementById('ledgerDateV13');if(input){input.value=text(date)||D()?.today?.()||'';input.dispatchEvent(new Event('change',{bubbles:true}));}},120);
}
function showOpenPeriod(date){
  const input=document.getElementById('periodFromV13');if(!input)return;input.value=text(date);input.dispatchEvent(new Event('change',{bubbles:true}));
}

function tagStudentModal(){
  const openId=text(window.__EFC_LAST_STUDENT_MODAL_ID_V21__);if(!openId)return;
  const modal=[...document.querySelectorAll('.modal')].reverse().find(item=>item.querySelector('.student-delete-v20'));if(modal&&!modal.dataset.efcStudentIdV21)modal.dataset.efcStudentIdV21=openId;
}
function installStudentModalTagging(){
  if(window.__EFC_OPEN_STUDENT_V21__)return;const base=window.openStudent;if(typeof base!=='function')return;
  window.openStudent=function(id,...args){window.__EFC_LAST_STUDENT_MODAL_ID_V21__=String(id||'');const result=base.call(this,id,...args);tagStudentModal();return result;};window.__EFC_OPEN_STUDENT_V21__=true;
}
async function deleteStudentWithFinance(student,modal){
  const domain=D();if(!student||!domain)return false;if(!(window.EFC_AUTH_V13?.canEdit?.('students')??true))return alert('الحساب الحالي لا يملك صلاحية حذف الطلاب.'),false;
  const payments=Array.isArray(student.payments)?student.payments:[],paymentCount=payments.length,paidAmount=domain.paymentTotal?.(student)||payments.reduce((sum,p)=>sum+Number(p?.[1]||0),0),closedCount=payments.filter(payment=>fiscal()?.isDateClosed?.(text(payment?.[0]))).length,reg=String(student.reg??'').padStart(4,'0'),reusable=domain.registrationNumberWillBeReusable?.(student)===true;
  const numberMessage=reusable?`رقم السجل ${reg} هو آخر رقم ويمكن أن يأخذه التسجيل القادم ما دام لم يصدر رقم بعده.`:`رقم السجل ${reg} سيبقى محجوزًا ولن تتأثر الأرقام التي صدرت بعده.`;
  const archiveMessage=closedCount?`\nللطالب ${closedCount} حركة داخل سنة مالية مقفلة؛ أرقام تلك السنة لن تتغير لأنها محفوظة في الأرشيف المالي فقط.`:'';
  const ok=window.confirm(`حذف هذا الطالب حذف نهائي يدوي.\nسيُحذف ملف الطالب وجميع دفعاته من المالية الحالية.\nعدد الدفعات: ${paymentCount} · إجمالي المدفوع: ${domain.cash?.(paidAmount)||paidAmount}\n${numberMessage}${archiveMessage}\n\nهل تريد المتابعة؟`);if(!ok)return false;
  window.EFC_CODES?.ensureStudentRecord?.(student);const index=students.findIndex(item=>String(item?.id||'')===String(student.id||''));if(index<0)return false;
  const tomb=studentTombstone({...student,deletedAt:now()}),beforeState=clone(state),beforeStudent=student,seq=sequence();
  state.studentTombstones.push(tomb);state=normalizeState({...state,updatedAt:now()});writeLocal(false);students.splice(index,1);
  try{
    if(reusable)seq?.markRegistrationReleased?.(student.branch,student.specialty,student.reg);else seq?.sealRegistrationNumber?.(student.branch,student.specialty,student.reg);
    domain.saveStudents?.();addAudit('student-delete-with-finance',{id:text(student.id),recordCode:text(student.recordCode),reg:Number(student.reg)||null,branch:text(student.branch),specialty:text(student.specialty),paymentCount,paidAmount,closedPaymentCount:closedCount});await window.EFC_FORCE_PERSIST?.();
  }catch(error){students.splice(index,0,beforeStudent);state=beforeState;writeLocal(true);try{seq?.commitRegistrationNumber?.(student.branch,student.specialty,student.reg);domain.saveStudents?.();await window.EFC_FORCE_PERSIST?.();}catch(rollbackError){console.error('EFC student delete rollback failed.',rollbackError);}throw error;}
  modal?.remove();window.renderCurrentV13?.();return true;
}

async function deleteExpense(row,button){
  const domain=D();if(!row||!domain)return false;if(!(window.EFC_AUTH_V13?.canEdit?.('finance')??true))return false;if(fiscal()?.isDateClosed?.(row.date))return alert('هذا المصروف داخل سنة مالية مقفلة ولا يمكن حذفه. راجع الأرشيف المالي.'),false;
  if(!window.confirm(`حذف المصروف «${row.name}» بقيمة ${domain.cash?.(row.amount)||row.amount}؟`))return false;
  const before=domain.getExpenses?.()||[],tomb=expenseTombstone({...row,deletedAt:now()}),beforeState=clone(state);state.expenseTombstones.push(tomb);state=normalizeState({...state,updatedAt:now()});writeLocal(false);
  try{domain.saveExpenses?.(before.filter(item=>String(item.id)!==String(row.id)));addAudit('expense-delete',{expenseId:text(row.id),amount:Number(row.amount||0),date:text(row.date),branch:text(row.branch),specialty:text(row.specialty)});await window.EFC_FORCE_PERSIST?.();}
  catch(error){state=beforeState;writeLocal(true);domain.saveExpenses?.(before);throw error;}
  button?.closest('tr')?.remove();const counter=document.querySelector('.expense-history-toolbar-v13>span');if(counter)counter.textContent=`${domain.getExpenses?.().length||0} عملية`;return true;
}
function attachExpenseEditAudit(id){
  queueMicrotask(()=>{const modal=[...document.querySelectorAll('.modal')].at(-1),form=modal?.querySelector('form');if(!form||form.dataset.efcExpenseAuditV21==='1')return;form.dataset.efcExpenseAuditV21='1';const before=clone((D()?.getExpenses?.()||[]).find(row=>String(row.id)===String(id)));form.addEventListener('submit',()=>setTimeout(()=>{const after=clone((D()?.getExpenses?.()||[]).find(row=>String(row.id)===String(id)));if(before&&after&&JSON.stringify(before)!==JSON.stringify(after))addAudit('expense-edit',{expenseId:text(id),before,after});},80),true);});
}

function installCertificateGuards(){
  if(window.__EFC_CERTIFICATE_GUARDS_V21__)return;
  const baseDelete=window.EFC_DELETE_CERTIFICATE_RECEIPT_V13;if(typeof baseDelete==='function')window.EFC_DELETE_CERTIFICATE_RECEIPT_V13=async reference=>{const before=clone(reference),result=await baseDelete(reference);if(result){const tomb=certificateTombstone({...before,deletedAt:now()});if(tomb){state.certificateTombstones.push(tomb);state=normalizeState({...state,updatedAt:now()});writeLocal(false);addAudit('certificate-delete',{certificateId:tomb.id,recordCode:tomb.recordCode,transactionCode:tomb.transactionCode,receiptNo:tomb.receiptNo,amount:Number(before?.amount||0)});await window.EFC_FORCE_PERSIST?.();}}return result;};
  const baseEdit=window.EFC_EDIT_CERTIFICATE_RECEIPT_V13;if(typeof baseEdit==='function')window.EFC_EDIT_CERTIFICATE_RECEIPT_V13=reference=>{const result=baseEdit(reference);if(result)pendingCertificateEdit=clone(reference);return result;};
  window.__EFC_CERTIFICATE_GUARDS_V21__=true;
}
function captureCertificateEditSave(target){
  if(!pendingCertificateEdit||!target?.closest?.('#certIssueV13'))return;const before=clone(pendingCertificateEdit),amount=Number(document.getElementById('certAmountV13')?.value||0),method=text(document.getElementById('certMethodV13')?.value);setTimeout(()=>{const receipts=window.EFC_CERTIFICATE_STATE_V14?.snapshot?.()?.certificateReceipts||[],after=receipts.find(row=>(before.id&&String(row.id)===String(before.id))||(before.recordCode&&String(row.recordCode)===String(before.recordCode)));if(after&&(Number(before.amount||0)!==Number(after.amount||0)||text(before.method)!==text(after.method)))addAudit('certificate-edit',{certificateId:text(after.id),receiptNo:Number(after.receiptNo)||null,before:{amount:Number(before.amount||0),method:text(before.method)},after:{amount:Number(after.amount||amount),method:text(after.method||method)}});pendingCertificateEdit=null;},120);
}

function installClosedPaymentGuard(){
  document.addEventListener('submit',event=>{
    const form=event.target instanceof HTMLFormElement?event.target:null;if(!form||form.id!=='regFormV13')return;const session=window.EFC_REGISTRATION_EDIT_V17?.current?.();
    if(session?.student){stampStudentPayments(session.student);if(session.paymentIndex!==null&&session.paymentIndex!==undefined){const payment=session.student.payments?.[Number(session.paymentIndex)],originalDate=text(payment?.[0]);if(originalDate&&fiscal()?.isDateClosed?.(originalDate)){event.preventDefault();event.stopImmediatePropagation();alert('هذه الدفعة أصلها داخل سنة مالية مقفلة، لذلك لا يمكن نقلها أو تعديل مبلغها أو وسيلتها. عدّل بيانات الطالب غير المالية من ملف الطالب فقط.');return;}}}
    queueMicrotask(()=>stampAllPayments({persist:true}));
  },true);
}

function installGlobalCapture(){
  document.addEventListener('click',event=>{
    const target=event.target instanceof Element?event.target:null;if(!target)return;
    if(target.closest('.efc-open-fiscal-archive-v21')){event.preventDefault();event.stopImmediatePropagation();openFiscalArchive();return;}
    const openLive=target.closest('.efc-open-live-ledger-v21');if(openLive){event.preventDefault();event.stopImmediatePropagation();openLedgerFrom(openLive.dataset.openFrom);return;}
    const openPeriod=target.closest('.efc-show-open-period-v21');if(openPeriod){event.preventDefault();event.stopImmediatePropagation();showOpenPeriod(openPeriod.dataset.openFrom);return;}
    const studentDelete=target.closest('.student-delete-v20');if(studentDelete){event.preventDefault();event.stopImmediatePropagation();const modal=studentDelete.closest('.modal'),id=text(modal?.dataset.efcStudentIdV21||window.__EFC_LAST_STUDENT_MODAL_ID_V21__),student=(students||[]).find(item=>String(item.id)===id);deleteStudentWithFinance(student,modal).catch(error=>alert(String(error?.message||error)));return;}
    const expenseDelete=target.closest('.delete-expense-v13');if(expenseDelete){event.preventDefault();event.stopImmediatePropagation();const id=text(expenseDelete.dataset.id),row=(D()?.getExpenses?.()||[]).find(item=>String(item.id)===id);deleteExpense(row,expenseDelete).catch(error=>alert(String(error?.message||error)));return;}
    const expenseEdit=target.closest('.edit-expense-history-v13,.edit-expense-v13');if(expenseEdit){const id=text(expenseEdit.dataset.id),row=(D()?.getExpenses?.()||[]).find(item=>String(item.id)===id);if(row&&fiscal()?.isDateClosed?.(row.date)){event.preventDefault();event.stopImmediatePropagation();alert('هذا المصروف داخل سنة مالية مقفلة ولا يمكن تعديله. راجع الأرشيف المالي.');return;}if(id)attachExpenseEditAudit(id);}
    captureCertificateEditSave(target);setTimeout(scheduleGuards,0);
  },true);
  document.addEventListener('change',()=>setTimeout(scheduleGuards,0),false);
}

async function sanitizeLiveState(){
  const domain=D();let changed=false;
  if(Array.isArray(window.students)){const kept=students.filter(student=>!studentIsDead(student));if(kept.length!==students.length){students.splice(0,students.length,...kept);domain?.saveStudents?.();changed=true;}}
  const expenses=domain?.getExpenses?.()||[],keptExpenses=expenses.filter(row=>!expenseIsDead(row));if(keptExpenses.length!==expenses.length){domain?.saveExpenses?.(keptExpenses);changed=true;}
  const certs=state.certificateTombstones;if(certs.length){const result=await window.EFC_CERTIFICATE_STATE_V14?.purgeReceiptsByIdentity?.({ids:certs.map(x=>x.id).filter(Boolean),recordCodes:certs.map(x=>x.recordCode).filter(Boolean),transactionCodes:certs.map(x=>x.transactionCode).filter(Boolean)});if(Number(result?.deleted||0)>0)changed=true;}
  if(changed)await window.EFC_FORCE_PERSIST?.();
}

async function hydrateIntegrity(){
  state=normalizeState(safeRead(STORAGE_KEY,{}));
  if(invoke){try{const raw=await invoke('load_app_state'),native=raw?JSON.parse(raw)?.accountingIntegrityV21:null;if(native)state=mergeState(state,native);}catch(error){console.warn('EFC accounting integrity native hydration kept local state.',error);}}
  writeLocal(false);
}
function installRestoreGuard(){
  const base=window.EFC_APPLY_RESTORED_STATE;if(typeof base!=='function'||window.__EFC_RESTORE_GUARD_V21__)return;
  window.EFC_APPLY_RESTORED_STATE=async incoming=>{const prospective=mergeState(state,incoming?.accountingIntegrityV21),prepared=prepareIncoming(incoming,prospective),result=await base(prepared);state=prospective;writeLocal(true);stampAllPayments({persist:true});await sanitizeLiveState();await window.EFC_FORCE_PERSIST?.();return result;};window.__EFC_RESTORE_GUARD_V21__=true;
}
function installStateContributor(){window.EFC_REGISTER_STATE_CONTRIBUTOR?.('accounting-integrity-v21',snapshot=>Object.assign(snapshot,{accountingIntegrityV21:clone(state)}));}

async function install(){
  if(installed)return;installed=true;await hydrateIntegrity();installStateContributor();installRestoreGuard();installAllPaymentsSnapshot();stampAllPayments({persist:true});installStudentModalTagging();installCertificateGuards();installClosedPaymentGuard();installGlobalCapture();installRenderGuards();await sanitizeLiveState();scheduleGuards();
  window.EFC_ACCOUNTING_INTEGRITY_V21=Object.freeze({
    ready:true,version:VERSION,storageKey:STORAGE_KEY,paymentAccountingSnapshotIndex:SNAPSHOT_INDEX,
    manualStudentDeletionRemovesFinance:true,manualStudentDeletionWarnsBeforeRemoval:true,fiscalCleanupKeepsArchiveAsHistoricalSource:true,
    closedFinanceViewsUseArchiveOnly:true,mixedFinanceViewsAreSplitExplicitly:true,periodPaymentArchiveGuard:true,closedPaymentSourceEditBlocked:true,closedExpenseMutationBlocked:true,
    restoreMergesExpenses:true,restoreMergesBranches:true,branchIdentityRemapOnRestore:true,expenseIdentityFirstRestore:true,legacyPaymentRestoreDeduplication:true,studentIdentityRestoreAlignment:true,
    expenseRestoreTombstones:true,certificateRestoreTombstones:true,manualStudentRestoreTombstones:true,historicalPaymentScopeSnapshots:true,auditTrail:true,
    snapshot:()=>clone(state),prepareIncoming:incoming=>prepareIncoming(incoming,state),stampAllPayments:()=>stampAllPayments({persist:true}),guardFinanceViews,rangeState
  });
}
function ready(){return Boolean(window.EFC_FISCAL_V14?.ready&&window.EFC_STUDENT_LIFECYCLE_UI_V20?.ready&&window.EFC_CENTER_OPS_V13?.ready&&window.EFC_FINANCE_UI_V13?.ready&&window.EFC_CERTIFICATES_V13?.ready&&window.EFC_REGISTRATION_SCHEDULE_MATRIX_V17?.ready&&window.EFC_DOMAIN_V13?.ready&&window.EFC_RECEIPT_SEQUENCES_V10);}
function boot(){if(installed)return;if(!ready()){setTimeout(boot,30);return;}install().catch(error=>{installed=false;console.error('EFC accounting integrity v21 failed.',error);setTimeout(boot,350);});}
boot();
})();
