(()=>{
'use strict';
if(window.EFC_FISCAL_V14?.ready)return;
const D=window.EFC_DOMAIN_V13;
if(!D?.ready||!window.EFC_CERTIFICATES_V13?.ready)throw new Error('Fiscal v14 loaded before the current EFC domain/certificate runtime.');

const invoke=window.__TAURI__?.core?.invoke;
const STORAGE_KEY='efc-fiscal-state-v14';
const VERSION=14;
const {esc,today,cash,showDate,remainingAmount,expenseSpecialtyName}=D;
let state={version:VERSION,config:null,archives:[],pendingClose:null,updatedAt:0};
let closeBusy=false;

const pad2=value=>String(value).padStart(2,'0');
const clone=value=>{try{return structuredClone(value);}catch{return JSON.parse(JSON.stringify(value));}};
const readJson=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key)||'null')??fallback;}catch{return fallback;}};
const safeDate=value=>/^\d{4}-\d{2}-\d{2}$/.test(String(value||''))?String(value):'';
const dateOnly=value=>new Date(`${value}T12:00:00`);
const iso=date=>`${date.getFullYear()}-${pad2(date.getMonth()+1)}-${pad2(date.getDate())}`;
const money=value=>Math.max(0,Number(value||0));
function addDays(value,days){const date=dateOnly(value);date.setDate(date.getDate()+Number(days||0));return iso(date);}
function addYearsClamped(value,years){const source=dateOnly(value),month=source.getMonth(),day=source.getDate(),targetYear=source.getFullYear()+Number(years||0),last=new Date(targetYear,month+1,0).getDate();return `${targetYear}-${pad2(month+1)}-${pad2(Math.min(day,last))}`;}
function inPeriod(value,start,end){const date=safeDate(value);return Boolean(date&&(!start||date>=start)&&date<=end);}
function currentAdmin(){const user=window.EFC_AUTH_V13?.currentUser?.();return user?.role==='admin'?user:null;}
function certificateApi(){return window.EFC_CERTIFICATE_STATE_V14||null;}

function normalizeCleanup(value){
  const source=value&&typeof value==='object'?value:{};
  return{
    studentsDeleted:Math.max(0,Number(source.studentsDeleted||0)),
    expensesDeleted:Math.max(0,Number(source.expensesDeleted||0)),
    certificatesDeleted:Math.max(0,Number(source.certificatesDeleted||0)),
    studentIds:Array.isArray(source.studentIds)?source.studentIds.map(String).filter(Boolean):[],
    studentRecordCodes:Array.isArray(source.studentRecordCodes)?source.studentRecordCodes.map(String).filter(Boolean):[],
    expenseIds:Array.isArray(source.expenseIds)?source.expenseIds.map(String).filter(Boolean):[],
    certificateIds:Array.isArray(source.certificateIds)?source.certificateIds.map(String).filter(Boolean):[],
    certificateRecordCodes:Array.isArray(source.certificateRecordCodes)?source.certificateRecordCodes.map(String).filter(Boolean):[],
    certificateTransactionCodes:Array.isArray(source.certificateTransactionCodes)?source.certificateTransactionCodes.map(String).filter(Boolean):[]
  };
}
function normalizeArchive(item,index){
  if(!item||typeof item!=='object')return null;
  const boundary=safeDate(item.boundary),periodEnd=safeDate(item.periodEnd),declaredStart=safeDate(item.declaredStart||item.periodStart||'');
  if(!boundary||!periodEnd)return null;
  return{
    ...item,
    id:String(item.id||`fiscal-${boundary}`),
    number:Math.max(1,Number(item.number||index+1)),
    first:Boolean(item.first),
    periodStart:item.periodStart?safeDate(item.periodStart):null,
    declaredStart:declaredStart||null,
    periodEnd,boundary,
    closedAt:Number(item.closedAt||0),
    closedBy:String(item.closedBy||''),
    totals:item.totals&&typeof item.totals==='object'?item.totals:{},
    byMonth:Array.isArray(item.byMonth)?item.byMonth:[],
    byBranch:Array.isArray(item.byBranch)?item.byBranch:[],
    byCourse:Array.isArray(item.byCourse)?item.byCourse:[],
    byMethod:Array.isArray(item.byMethod)?item.byMethod:[],
    expenseBreakdown:Array.isArray(item.expenseBreakdown)?item.expenseBreakdown:[],
    cleanup:normalizeCleanup(item.cleanup)
  };
}
function normalizeState(raw){
  const source=raw&&typeof raw==='object'?raw:{};
  const config=source.config&&safeDate(source.config.anchorDate)?{
    anchorDate:safeDate(source.config.anchorDate),
    firstEndDate:safeDate(source.config.firstEndDate)||addDays(addYearsClamped(source.config.anchorDate,1),-1),
    configuredAt:safeDate(source.config.configuredAt)||today(),
    configuredBy:String(source.config.configuredBy||''),
    createdAt:Number(source.config.createdAt||0)
  }:null;
  const archives=(Array.isArray(source.archives)?source.archives:[]).map(normalizeArchive).filter(Boolean).sort((a,b)=>a.number-b.number);
  const pending=source.pendingClose&&typeof source.pendingClose==='object'&&source.pendingClose.archive?{
    archive:normalizeArchive(source.pendingClose.archive,archives.length),
    cleanupPlan:normalizeCleanup(source.pendingClose.cleanupPlan),
    startedAt:Number(source.pendingClose.startedAt||Date.now()),
    backupPath:String(source.pendingClose.backupPath||'')
  }:null;
  return{version:VERSION,config,archives,pendingClose:pending?.archive?pending:null,updatedAt:Math.max(0,Number(source.updatedAt||0))};
}
function writeLocal(touch=true){if(touch)state.updatedAt=Date.now();localStorage.setItem(STORAGE_KEY,JSON.stringify(state));}
async function hydrate(){
  const local=normalizeState(readJson(STORAGE_KEY,{}));
  if(!invoke){state=local;writeLocal(false);return;}
  try{
    const raw=await invoke('load_app_state'),native=raw?normalizeState(JSON.parse(raw)?.fiscalState||{}):normalizeState({});
    state=native.updatedAt>local.updatedAt?native:local;
  }catch(error){console.error('EFC fiscal v14 state load failed; local fiscal state kept.',error);state=local;}
  writeLocal(false);
}
async function persistFiscal(){writeLocal();await window.EFC_FORCE_PERSIST?.();return clone(state);}

function nextPlan(fromState=state){
  if(!fromState.config)return null;
  const number=fromState.archives.length+1,anchor=fromState.config.anchorDate,declaredStart=addYearsClamped(anchor,number-1),boundary=addYearsClamped(anchor,number),periodEnd=addDays(boundary,-1),first=number===1;
  return{number,boundary,declaredStart,periodStart:first?null:declaredStart,periodEnd,first,due:today()>=boundary};
}
function periodLabel(plan){return plan.first?`${showDate(plan.declaredStart)} — ${showDate(plan.periodEnd)} (ويشمل أي سجلات أقدم موجودة قبل البداية)`:`${showDate(plan.periodStart)} — ${showDate(plan.periodEnd)}`;}
function monthKey(date){return String(date||'').slice(0,7);}
function branchLabelFromStudent(student){return typeof branchName==='function'?branchName(student?.branch):String(student?.branch||'—');}
function courseLabelFromStudent(student){return typeof spec==='function'?(spec(student?.specialty)?.name||student?.snapshot?.specialtyName||student?.specialty||'—'):String(student?.specialty||'—');}
function expenseBranchLabel(row){return typeof branchName==='function'?branchName(row?.branch):String(row?.branch||'—');}

function newMetric(key,label){return{key:String(key||'—'),label:String(label||key||'—'),courseIncome:0,certificateIncome:0,totalIncome:0,expenses:0,net:0,coursePayments:0,certificates:0,expenseCount:0};}
function metric(map,key,label){const id=String(key||'—');if(!map.has(id))map.set(id,newMetric(id,label));return map.get(id);}
function finishMetrics(map){return[...map.values()].map(item=>({...item,totalIncome:item.courseIncome+item.certificateIncome,net:item.courseIncome+item.certificateIncome-item.expenses})).sort((a,b)=>b.totalIncome-a.totalIncome||b.expenses-a.expenses||a.label.localeCompare(b.label,'ar'));}
function aggregateSnapshot(plan){
  const coursePayments=allPayments().filter(row=>row?.sourceType!=='certificate'&&inPeriod(row?.date,plan.periodStart,plan.periodEnd));
  const certificateState=certificateApi()?.snapshot?.()||{certificateReceipts:[]};
  const certificates=(certificateState.certificateReceipts||[]).filter(row=>inPeriod(row?.date,plan.periodStart,plan.periodEnd));
  const expenses=D.getExpenses().filter(row=>inPeriod(row?.date,plan.periodStart,plan.periodEnd));
  const months=new Map(),branchesMap=new Map(),coursesMap=new Map(),methodsMap=new Map(),expenseMap=new Map();
  const addIncome=(row,kind,branch,course)=>{
    const amount=money(row.amount),method=String(row.method||'—'),month=monthKey(row.date);
    for(const [map,key,label] of [[months,month,month],[branchesMap,branch,branch],[coursesMap,course,course],[methodsMap,method,method]]){
      const item=metric(map,key,label);if(kind==='certificate'){item.certificateIncome+=amount;item.certificates+=1;}else{item.courseIncome+=amount;item.coursePayments+=1;}
    }
  };
  coursePayments.forEach(row=>addIncome(row,'course',branchLabelFromStudent(row.student),courseLabelFromStudent(row.student)));
  certificates.forEach(row=>addIncome(row,'certificate',String(row.branchName||'—'),String(row.specialtyName||'—')));
  expenses.forEach(row=>{
    const amount=money(row.amount),branch=expenseBranchLabel(row),course=expenseSpecialtyName(row.specialty),method=String(row.method||'—'),month=monthKey(row.date);
    for(const [map,key,label] of [[months,month,month],[branchesMap,branch,branch],[coursesMap,course,course],[methodsMap,method,method]]){const item=metric(map,key,label);item.expenses+=amount;item.expenseCount+=1;}
    const key=[String(row.name||'مصروف'),branch,course,method,month].join('|'),entry=metric(expenseMap,key,String(row.name||'مصروف'));entry.expenses+=amount;entry.expenseCount+=1;entry.name=String(row.name||'مصروف');entry.branch=branch;entry.course=course;entry.method=method;entry.month=month;
  });
  const courseIncome=coursePayments.reduce((sum,row)=>sum+money(row.amount),0),certificateIncome=certificates.reduce((sum,row)=>sum+money(row.amount),0),expenseTotal=expenses.reduce((sum,row)=>sum+money(row.amount),0),totalIncome=courseIncome+certificateIncome;
  return{
    id:`fiscal-${plan.boundary}`,number:plan.number,first:plan.first,periodStart:plan.periodStart,declaredStart:plan.declaredStart,periodEnd:plan.periodEnd,boundary:plan.boundary,closedAt:0,closedBy:'',
    totals:{courseIncome,certificateIncome,totalIncome,expenses:expenseTotal,net:totalIncome-expenseTotal,coursePaymentCount:coursePayments.length,certificateCount:certificates.length,expenseCount:expenses.length},
    byMonth:finishMetrics(months),byBranch:finishMetrics(branchesMap),byCourse:finishMetrics(coursesMap),byMethod:finishMetrics(methodsMap),
    expenseBreakdown:finishMetrics(expenseMap).map(item=>({name:item.name,branch:item.branch,course:item.course,method:item.method,month:item.month,amount:item.expenses,count:item.expenseCount})),cleanup:normalizeCleanup({})
  };
}

function latestStudentActivity(student){const values=[student?.start,student?.end,student?.stoppedAt,...(student?.payments||[]).map(payment=>payment?.[0])];return values.map(safeDate).filter(Boolean).sort().at(-1)||'';}
function studentContinuesAfter(student,periodEnd){if(student?.active===false||student?.status==='inactive')return false;const end=safeDate(student?.end);if(!end)return true;return end>periodEnd;}
function eligibleStudent(student,plan){if(!student||studentContinuesAfter(student,plan.periodEnd))return false;if(remainingAmount(student)>0)return false;const last=latestStudentActivity(student);return Boolean(last&&last<=plan.periodEnd);}
function cleanupPlan(plan){
  const studentRows=students.filter(student=>eligibleStudent(student,plan)),expenses=D.getExpenses().filter(row=>inPeriod(row?.date,plan.periodStart,plan.periodEnd)),certificateState=certificateApi()?.snapshot?.()||{certificateReceipts:[]},certificates=(certificateState.certificateReceipts||[]).filter(row=>inPeriod(row?.date,plan.periodStart,plan.periodEnd));
  return normalizeCleanup({studentIds:studentRows.map(student=>String(student.id||'')).filter(Boolean),studentRecordCodes:studentRows.map(student=>String(student.recordCode||'')).filter(Boolean),expenseIds:expenses.map(row=>String(row.id)).filter(Boolean),certificateIds:certificates.map(row=>String(row.id||'')).filter(Boolean),certificateRecordCodes:certificates.map(row=>String(row.recordCode||'')).filter(Boolean),certificateTransactionCodes:certificates.map(row=>String(row.transactionCode||'')).filter(Boolean)});
}
function tombstones(fromState=state){
  const studentIds=new Set(),studentRecordCodes=new Set(),expenseIds=new Set(),certificateIds=new Set(),certificateRecordCodes=new Set(),certificateTransactionCodes=new Set();
  const add=cleanup=>{const value=normalizeCleanup(cleanup);value.studentIds.forEach(x=>studentIds.add(x));value.studentRecordCodes.forEach(x=>studentRecordCodes.add(x));value.expenseIds.forEach(x=>expenseIds.add(x));value.certificateIds.forEach(x=>certificateIds.add(x));value.certificateRecordCodes.forEach(x=>certificateRecordCodes.add(x));value.certificateTransactionCodes.forEach(x=>certificateTransactionCodes.add(x));};
  fromState.archives.forEach(item=>add(item.cleanup));if(fromState.pendingClose)add(fromState.pendingClose.cleanupPlan);
  return{studentIds,studentRecordCodes,expenseIds,certificateIds,certificateRecordCodes,certificateTransactionCodes};
}
function lockedThrough(fromState=state){const ends=[...fromState.archives.map(item=>item.periodEnd),fromState.pendingClose?.archive?.periodEnd].filter(Boolean).sort();return ends.at(-1)||'';}
function isDateClosed(value){const date=safeDate(value),limit=lockedThrough();return Boolean(date&&limit&&date<=limit);}
function assertDateOpen(value,label='التاريخ'){if(isDateClosed(value))throw new Error(`${label} يقع داخل سنة مالية مقفلة حتى ${showDate(lockedThrough())}. لا يمكن تعديل السجلات المالية المقفلة.`);return true;}

async function ensureSafetyBackup(plan){
  if(!invoke)return'BROWSER-PREVIEW';
  await window.EFC_FORCE_PERSIST?.();
  const path=await invoke('export_backup',{suggestedName:`EFC-Before-Fiscal-Close-${plan.boundary}.json`});
  if(!path)throw new Error('تم إلغاء نسخة الأمان، لذلك لم يتم إقفال السنة المالية.');
  return String(path);
}
async function applyCleanup(pending){
  const cleanup=normalizeCleanup(pending.cleanupPlan),periodEnd=pending.archive.periodEnd,studentIds=new Set(cleanup.studentIds),studentCodes=new Set(cleanup.studentRecordCodes);
  let deletedStudents=0;
  const keptStudents=students.filter(student=>{
    const id=String(student.id||''),code=String(student.recordCode||'');if(!studentIds.has(id)&&!studentCodes.has(code))return true;
    if(!eligibleStudent(student,{periodEnd,periodStart:pending.archive.periodStart}))return true;
    deletedStudents+=1;return false;
  });
  if(keptStudents.length!==students.length){students.splice(0,students.length,...keptStudents);D.saveStudents();}
  const expenseIds=new Set(cleanup.expenseIds),currentExpenses=D.getExpenses(),keptExpenses=currentExpenses.filter(row=>!expenseIds.has(String(row.id))),expensesDeleted=currentExpenses.length-keptExpenses.length;if(expensesDeleted)D.saveExpenses(keptExpenses);
  const certResult=await certificateApi()?.purgeReceiptsByIdentity?.({ids:cleanup.certificateIds,recordCodes:cleanup.certificateRecordCodes,transactionCodes:cleanup.certificateTransactionCodes}),certificatesDeleted=Math.max(0,Number(certResult?.deleted||0));
  return{deletedStudents,expensesDeleted,certificatesDeleted};
}
async function finalizePending(){
  if(!state.pendingClose||closeBusy)return null;
  closeBusy=true;
  try{
    const pending=state.pendingClose,result=await applyCleanup(pending),baseCleanup=normalizeCleanup(pending.cleanupPlan),archive={...pending.archive,closedAt:Date.now(),closedBy:String(currentAdmin()?.username||pending.archive.closedBy||'Admin'),cleanup:{...baseCleanup,studentsDeleted:result.deletedStudents,expensesDeleted:result.expensesDeleted,certificatesDeleted:result.certificatesDeleted}};
    if(!state.archives.some(item=>item.boundary===archive.boundary))state.archives.push(archive);
    state.archives.sort((a,b)=>a.number-b.number);state.pendingClose=null;await persistFiscal();return archive;
  }finally{closeBusy=false;}
}
async function closeCurrentYear(){
  if(!currentAdmin())throw new Error('إقفال السنة المالية متاح للـ Admin فقط.');
  if(state.pendingClose)return await finalizePending();
  const plan=nextPlan();if(!plan)throw new Error('حدد بداية السنة المالية أولًا.');if(!plan.due)throw new Error(`موعد الإقفال القادم هو ${showDate(plan.boundary)}.`);
  const archive=aggregateSnapshot(plan),planned=cleanupPlan(plan),ok=confirm(`سيتم إقفال السنة المالية ${plan.number}.\n${periodLabel(plan)}\n\nدخل الدورات: ${cash(archive.totals.courseIncome)}\nدخل الشهادات: ${cash(archive.totals.certificateIncome)}\nالمصاريف: ${cash(archive.totals.expenses)}\nالصافي: ${cash(archive.totals.net)}\n\nسيتم حذف ${planned.studentRecordCodes.length} ملف طالب منتهٍ ومسدّد بالكامل، و${planned.expenseIds.length} سجل مصروف تفصيلي، و${planned.certificateRecordCodes.length} روسي شهادة تفصيلي.\nالطالب المستمر للسنة التالية وأي طالب عليه متبقي لن يُحذف.\n\nسيتم إنشاء نسخة أمان قبل أي حذف. متابعة؟`);
  if(!ok)return null;
  const backupPath=await ensureSafetyBackup(plan);state.pendingClose={archive,cleanupPlan:planned,startedAt:Date.now(),backupPath};await persistFiscal();return await finalizePending();
}
async function configure(anchorDate){
  if(!currentAdmin())throw new Error('إعداد السنة المالية متاح للـ Admin فقط.');
  if(state.config)throw new Error('تم تحديد بداية السنة المالية مسبقًا.');
  const anchor=safeDate(anchorDate);if(!anchor)throw new Error('اختر تاريخ بداية صالحًا.');
  state.config={anchorDate:anchor,firstEndDate:addDays(addYearsClamped(anchor,1),-1),configuredAt:today(),configuredBy:String(currentAdmin()?.username||'Admin'),createdAt:Date.now()};await persistFiscal();return clone(state.config);
}

function mergeFiscalStates(currentRaw,incomingRaw){
  const current=normalizeState(currentRaw),incoming=normalizeState(incomingRaw);if(!incoming.config)return current;if(!current.config)return incoming;if(incoming.config.anchorDate!==current.config.anchorDate)throw new Error('النسخة الاحتياطية تستخدم بداية سنة مالية مختلفة عن النظام الحالي. لا يمكن دمج أرشيفين ماليين بحدود مختلفة.');
  const byBoundary=new Map(current.archives.map(item=>[item.boundary,item]));incoming.archives.forEach(item=>{const existing=byBoundary.get(item.boundary);if(!existing||Number(item.closedAt||0)>Number(existing.closedAt||0))byBoundary.set(item.boundary,item);});
  return normalizeState({...current,archives:[...byBoundary.values()].sort((a,b)=>a.number-b.number),pendingClose:current.pendingClose||incoming.pendingClose,updatedAt:Math.max(current.updatedAt,incoming.updatedAt)});
}
function filterImportedState(incoming,prospectiveState=state){
  const source=clone(incoming&&typeof incoming==='object'?incoming:{}),dead=tombstones(prospectiveState);
  if(Array.isArray(source.students))source.students=source.students.filter(student=>!dead.studentIds.has(String(student?.id||''))&&!dead.studentRecordCodes.has(String(student?.recordCode||'')));
  if(Array.isArray(source.expenses))source.expenses=source.expenses.filter(row=>!dead.expenseIds.has(String(row?.id||'')));
  if(Array.isArray(source.certificateReceipts))source.certificateReceipts=source.certificateReceipts.filter(row=>!dead.certificateIds.has(String(row?.id||''))&&!dead.certificateRecordCodes.has(String(row?.recordCode||''))&&!dead.certificateTransactionCodes.has(String(row?.transactionCode||'')));
  return source;
}
async function sanitizeClosedDetails(){
  const dead=tombstones();let changed=false;
  const keptStudents=students.filter(student=>!dead.studentIds.has(String(student?.id||''))&&!dead.studentRecordCodes.has(String(student?.recordCode||'')));if(keptStudents.length!==students.length){students.splice(0,students.length,...keptStudents);D.saveStudents();changed=true;}
  const expenses=D.getExpenses(),keptExpenses=expenses.filter(row=>!dead.expenseIds.has(String(row?.id||'')));if(keptExpenses.length!==expenses.length){D.saveExpenses(keptExpenses);changed=true;}
  const certResult=await certificateApi()?.purgeReceiptsByIdentity?.({ids:[...dead.certificateIds],recordCodes:[...dead.certificateRecordCodes],transactionCodes:[...dead.certificateTransactionCodes]});if(Number(certResult?.deleted||0)>0)changed=true;
  return changed;
}

function metricTable(items,label='البند'){
  return `<div class="fiscal-table-wrap-v14"><table><thead><tr><th>${esc(label)}</th><th>دخل الدورات</th><th>دخل الشهادات</th><th>المصاريف</th><th>الصافي</th></tr></thead><tbody>${items.length?items.map(item=>`<tr><td>${esc(item.label)}</td><td>${cash(item.courseIncome)}</td><td>${cash(item.certificateIncome)}</td><td>${cash(item.expenses)}</td><td><b>${cash(item.net)}</b></td></tr>`).join(''):'<tr><td colspan="5">لا توجد بيانات</td></tr>'}</tbody></table></div>`;
}
function archiveHtml(archive){
  const period=archive.first?`${showDate(archive.declaredStart)} — ${showDate(archive.periodEnd)} · يشمل أي سجلات أقدم قبل البداية`:`${showDate(archive.periodStart)} — ${showDate(archive.periodEnd)}`;
  return `<details class="fiscal-archive-v14"><summary><span><b>السنة المالية ${archive.number}</b><small>${period}</small></span><strong>${cash(archive.totals?.net||0)}</strong></summary><div class="fiscal-archive-body-v14"><div class="kpis"><div class="card"><small>دخل الدورات</small><b>${cash(archive.totals?.courseIncome||0)}</b></div><div class="card"><small>دخل الشهادات</small><b>${cash(archive.totals?.certificateIncome||0)}</b></div><div class="card"><small>المصاريف</small><b>${cash(archive.totals?.expenses||0)}</b></div><div class="card"><small>الصافي</small><b>${cash(archive.totals?.net||0)}</b></div></div><h4>حسب الشهر</h4>${metricTable(archive.byMonth||[],'الشهر')}<h4>حسب الفرع / المركز</h4>${metricTable(archive.byBranch||[],'الفرع')}<h4>حسب الدورة / الدورة</h4>${metricTable(archive.byCourse||[],'الدورة')}<h4>حسب وسيلة الدفع</h4>${metricTable(archive.byMethod||[],'الوسيلة')}<h4>المصاريف المجمعة</h4><div class="fiscal-table-wrap-v14"><table><thead><tr><th>البيان</th><th>الفرع</th><th>الدورة</th><th>الوسيلة</th><th>الشهر</th><th>المبلغ</th></tr></thead><tbody>${(archive.expenseBreakdown||[]).length?archive.expenseBreakdown.map(item=>`<tr><td>${esc(item.name)}</td><td>${esc(item.branch)}</td><td>${esc(item.course)}</td><td>${esc(item.method)}</td><td>${esc(item.month)}</td><td>${cash(item.amount)}</td></tr>`).join(''):'<tr><td colspan="6">لا توجد مصاريف</td></tr>'}</tbody></table></div><p class="fiscal-cleanup-v14">تم تنظيف ${Number(archive.cleanup?.studentsDeleted||0)} ملف طالب منتهٍ، و${Number(archive.cleanup?.expensesDeleted||0)} سجل مصروف تفصيلي، و${Number(archive.cleanup?.certificatesDeleted||0)} روسي شهادة تفصيلي. الطلاب المستمرون وأصحاب الديون يبقون في النظام. هذا الأرشيف للقراءة فقط.</p></div></details>`;
}
function settingsCardHtml(){
  if(!currentAdmin())return'';
  if(!state.config){const anchor=today(),end=addDays(addYearsClamped(anchor,1),-1);return `<div class="card settings-card-prod fiscal-settings-v14"><h2>السنة المالية</h2><p>حدد تاريخ البداية مرة واحدة، وسيحسب النظام النهاية تلقائيًا ويكرر نفس البداية كل سنة. عند الإقفال يحتفظ بالأرقام المجمعة ويحذف التفاصيل المؤهلة فقط بعد إنشاء نسخة أمان.</p><div class="fiscal-config-grid-v14"><label>بداية السنة المالية<input class="input" id="fiscalAnchorV14" type="date" value="${anchor}"></label><label>نهاية السنة الأولى<input class="input" id="fiscalEndV14" type="date" value="${end}" readonly></label></div><p class="fiscal-hint-v14">إذا كانت هناك سجلات أقدم من تاريخ البداية عند أول إقفال، ستدخل في الأرشيف الأول حتى لا يبقى تاريخ مالي خارج الأرشيف.</p><button class="button" id="configureFiscalV14">اعتماد السنة المالية</button></div>`;}
  const plan=nextPlan(),pending=state.pendingClose,due=Boolean(plan?.due),archives=state.archives.map(archiveHtml).join('');
  return `<div class="card settings-card-prod fiscal-settings-v14"><h2>السنة المالية</h2><p>بداية الدورة السنوية: <b>${showDate(state.config.anchorDate)}</b> · نهاية السنة الأولى: <b>${showDate(state.config.firstEndDate)}</b>. يتكرر نفس الموعد تلقائيًا كل سنة.</p><div class="fiscal-next-v14"><small>${pending?'يوجد إقفال غير مكتمل':due?'السنة جاهزة للإقفال':'موعد الإقفال القادم'}</small><b>${showDate(pending?.archive?.boundary||plan?.boundary)}</b><span>${pending?'لقطة الأرقام محفوظة ويمكن استكمال الإقفال بأمان.':periodLabel(plan)}</span></div>${pending?'<button class="button" id="resumeFiscalV14">استكمال الإقفال</button>':due?'<button class="button" id="closeFiscalV14">إقفال السنة المالية</button>':''}</div>${state.archives.length?`<div class="fiscal-archives-v14"><h3>السنوات المالية المقفلة</h3>${archives}</div>`:''}`;
}
function refreshSettings(){document.querySelector('.fiscal-settings-v14')?.remove();document.querySelector('.fiscal-archives-v14')?.remove();enhanceSettings();}
function enhanceSettings(){
  if(location.hash!=='#settings')return;const grid=document.querySelector('.settings-grid-prod');if(!grid||grid.querySelector('.fiscal-settings-v14'))return;const html=settingsCardHtml();if(!html)return;grid.insertAdjacentHTML('beforeend',html);
  const anchor=document.getElementById('fiscalAnchorV14'),end=document.getElementById('fiscalEndV14');if(anchor&&end)anchor.addEventListener('input',()=>{end.value=safeDate(anchor.value)?addDays(addYearsClamped(anchor.value,1),-1):'';});
  document.getElementById('configureFiscalV14')?.addEventListener('click',async event=>{const button=event.currentTarget;button.disabled=true;try{await configure(anchor?.value);refreshSettings();}catch(error){alert(String(error?.message||error));button.disabled=false;}});
  document.getElementById('closeFiscalV14')?.addEventListener('click',async event=>{const button=event.currentTarget;button.disabled=true;try{const archive=await closeCurrentYear();if(archive){alert('تم إقفال السنة المالية وحفظ أرشيفها المالي.');location.reload();}else button.disabled=false;}catch(error){alert(String(error?.message||error));button.disabled=false;}});
  document.getElementById('resumeFiscalV14')?.addEventListener('click',async event=>{const button=event.currentTarget;button.disabled=true;try{await finalizePending();alert('تم استكمال إقفال السنة المالية.');location.reload();}catch(error){alert(String(error?.message||error));button.disabled=false;}});
}
function dueBanner(){
  document.querySelector('.fiscal-due-v14')?.remove();if(!currentAdmin()||!state.config)return;const plan=nextPlan();if(!state.pendingClose&&!plan?.due)return;const content=document.querySelector('.content');if(!content||location.hash==='#settings')return;const banner=document.createElement('button');banner.type='button';banner.className='fiscal-due-v14';banner.textContent=state.pendingClose?'السنة المالية: يوجد إقفال غير مكتمل':'السنة المالية جاهزة للإقفال';banner.onclick=()=>{location.hash='#settings';};content.prepend(banner);
}
function enhance(){enhanceSettings();dueBanner();}

const style=document.createElement('style');style.textContent=`
.fiscal-settings-v14{grid-column:1/-1;min-height:auto!important}.fiscal-settings-v14 label{display:grid;gap:6px;font-size:10px}.fiscal-config-grid-v14{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.fiscal-hint-v14{font-size:9px;line-height:1.8;color:var(--muted)}.fiscal-next-v14{display:grid;gap:4px;padding:12px;border:1px solid var(--border);border-radius:9px;background:var(--surface-2)}.fiscal-next-v14 small,.fiscal-next-v14 span{color:var(--muted);font-size:9px}.fiscal-next-v14 b{font-size:14px}.fiscal-archives-v14{grid-column:1/-1;display:grid;gap:9px}.fiscal-archives-v14>h3{margin:8px 0 2px}.fiscal-archive-v14{border:1px solid var(--border);border-radius:10px;background:#fff;overflow:hidden}.fiscal-archive-v14>summary{display:flex;justify-content:space-between;align-items:center;padding:13px 15px;cursor:pointer}.fiscal-archive-v14>summary span{display:grid;gap:3px}.fiscal-archive-v14>summary small{color:var(--muted);font-size:8px}.fiscal-archive-v14>summary strong{font-size:12px}.fiscal-archive-body-v14{padding:0 15px 15px}.fiscal-archive-body-v14 h4{margin:16px 0 7px}.fiscal-table-wrap-v14{overflow:auto;max-height:360px;border:1px solid var(--border);border-radius:8px}.fiscal-table-wrap-v14 table{width:100%;border-collapse:collapse}.fiscal-table-wrap-v14 th,.fiscal-table-wrap-v14 td{padding:8px;border-bottom:1px solid var(--border);font-size:8px;text-align:right;white-space:nowrap}.fiscal-table-wrap-v14 th{position:sticky;top:0;background:#f6f8f7}.fiscal-cleanup-v14{font-size:8px;color:var(--muted);line-height:1.8}.fiscal-due-v14{width:100%;border:1px solid #dfc980;background:#fff8dc;color:#6d5310;border-radius:9px;padding:9px 12px;margin-bottom:12px;text-align:right;font:700 9px Tahoma;cursor:pointer}@media(max-width:980px){.fiscal-config-grid-v14{grid-template-columns:1fr}}
`;document.head.appendChild(style);

(async()=>{
  await hydrate();
  window.EFC_REGISTER_STATE_CONTRIBUTOR?.('fiscal-year-v14',snapshot=>Object.assign(snapshot,{fiscalState:clone(state)}));
  const baseApply=window.EFC_APPLY_RESTORED_STATE;
  if(typeof baseApply==='function')window.EFC_APPLY_RESTORED_STATE=async incoming=>{
    const prospective=mergeFiscalStates(state,incoming?.fiscalState),filtered=filterImportedState(incoming,prospective),result=await baseApply(filtered);state=prospective;await sanitizeClosedDetails();await persistFiscal();return result;
  };
  window.EFC_ENHANCE_FISCAL_SETTINGS_V14=enhance;
  window.EFC_FISCAL_V14=Object.freeze({
    ready:true,version:VERSION,storageKey:STORAGE_KEY,currentLevelImplementation:true,ownerChoosesStartDate:true,automaticEndDate:true,annualSameAnchor:true,firstArchiveIncludesOlderHistory:true,continuingStudentsRetained:true,debtorsRetained:true,closedArchiveReadOnly:true,separateCourseAndCertificateIncome:true,expenseDetailsCompacted:true,certificatePiiCompacted:true,tombstoneRestoreProtection:true,pendingCloseJournal:true,closedPeriodsImmutable:true,noRouterHook:true,
    getState:()=>clone(state),nextPlan,addYearsClamped,inPeriod,latestStudentActivity,studentContinuesAfter,eligibleStudent:(student,plan=nextPlan())=>Boolean(plan&&eligibleStudent(student,plan)),previewArchive:()=>{const plan=nextPlan();return plan?aggregateSnapshot(plan):null;},configure,closeCurrentYear,finalizePending,lockedThrough,isDateClosed,assertDateOpen,filterImportedState
  });
  enhance();
})().catch(error=>{console.error('EFC fiscal v14 failed to initialize.',error);throw error;});
})();
