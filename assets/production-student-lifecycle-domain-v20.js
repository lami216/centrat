(async()=>{
'use strict';
if(window.EFC_STUDENT_LIFECYCLE_DOMAIN_V20?.ready)return;
const B=window.EFC_DOMAIN_V13,sequenceBase=window.EFC_RECEIPT_SEQUENCES_V10;
if(!B?.ready||!sequenceBase)throw new Error('Student lifecycle v20 loaded before domain/sequence runtime.');

const VERSION=20;
const STORAGE_KEY='efc-student-lifecycle-v20';
const invoke=window.__TAURI__?.core?.invoke;
const clone=value=>{try{return structuredClone(value);}catch{return JSON.parse(JSON.stringify(value));}};
const int=value=>{const number=Number(value);return Number.isInteger(number)&&number>0?number:null;};
const scopeKey=(branch,specialty)=>`${encodeURIComponent(String(branch||''))}|${encodeURIComponent(String(specialty||''))}`;
const now=()=>Date.now();
const isMonthlyStudent=student=>Boolean(B.isDynamicMonthly?.(student)||student?.snapshot?.billing==='monthly');
let state={version:VERSION,scopes:{},tombstones:[],updatedAt:0};

function normalizeScope(value={}){
  const latestIssued=Math.max(0,Number(value.latestIssued||value.latest||0)),sealedThrough=Math.min(Math.max(0,Number(value.sealedThrough||0)),latestIssued||Number(value.sealedThrough||0));
  const releasedLatest=Boolean(value.releasedLatest),latestSeenActive=releasedLatest?false:Boolean(value.latestSeenActive);
  return{latestIssued,sealedThrough,releasedLatest,latestSeenActive,updatedAt:Math.max(0,Number(value.updatedAt||0))};
}
function normalizeTombstone(value){
  if(!value||typeof value!=='object')return null;
  const id=String(value.id||''),recordCode=String(value.recordCode||'');if(!id&&!recordCode)return null;
  return{id,recordCode,branch:String(value.branch||''),specialty:String(value.specialty||''),reg:int(value.reg)||null,deletedAt:Math.max(0,Number(value.deletedAt||0))};
}
function normalizeState(raw){
  const source=raw&&typeof raw==='object'?raw:{},scopes={};
  if(source.scopes&&typeof source.scopes==='object')Object.entries(source.scopes).forEach(([key,value])=>{scopes[String(key)]=normalizeScope(value);});
  const seen=new Map();(Array.isArray(source.tombstones)?source.tombstones:[]).map(normalizeTombstone).filter(Boolean).forEach(item=>{
    const key=item.recordCode?`r:${item.recordCode}`:`i:${item.id}`,existing=seen.get(key);if(!existing||item.deletedAt>=existing.deletedAt)seen.set(key,item);
  });
  return{version:VERSION,scopes,tombstones:[...seen.values()],updatedAt:Math.max(0,Number(source.updatedAt||0))};
}
function mergeStates(aRaw,bRaw){
  const a=normalizeState(aRaw),b=normalizeState(bRaw),scopes={...a.scopes};
  Object.entries(b.scopes).forEach(([key,value])=>{
    const current=scopes[key];
    if(!current||Number(value.updatedAt||0)>Number(current.updatedAt||0)){scopes[key]=value;return;}
    if(Number(value.updatedAt||0)<Number(current.updatedAt||0))return;
    const latest=Math.max(current.latestIssued,value.latestIssued),sealed=Math.max(current.sealedThrough,value.sealedThrough),released=(current.latestIssued===latest&&current.releasedLatest)||(value.latestIssued===latest&&value.releasedLatest);
    scopes[key]={latestIssued:latest,sealedThrough:Math.min(sealed,latest),releasedLatest:released,latestSeenActive:released?false:Boolean(current.latestSeenActive||value.latestSeenActive),updatedAt:current.updatedAt};
  });
  return normalizeState({version:VERSION,scopes,tombstones:[...a.tombstones,...b.tombstones],updatedAt:Math.max(a.updatedAt,b.updatedAt)});
}
function readLocal(){try{return normalizeState(JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}'));}catch{return normalizeState({});}}
function writeLocal(touch=true){if(touch)state.updatedAt=now();localStorage.setItem(STORAGE_KEY,JSON.stringify(state));}
function markChanged(){writeLocal(true);try{window.EFC_CORE_CHANGED?.();}catch{}}
function touchEntry(entry){const stamp=now();entry.updatedAt=stamp;state.updatedAt=stamp;markChanged();}
function activeRegs(branch,specialty,excludeId=''){
  const values=[];(typeof students!=='undefined'?students:[]).forEach(student=>{
    if(excludeId&&String(student?.id||'')===String(excludeId))return;
    if(String(student?.branch||'')!==String(branch||'')||String(student?.specialty||'')!==String(specialty||''))return;
    const reg=int(student?.reg);if(reg)values.push(reg);
  });
  return values;
}
function legacyEntry(branch,specialty){
  const key=scopeKey(branch,specialty),legacy=int(sequenceBase.identitySnapshot?.()?.registrationLastByScope?.[key])||0,regs=activeRegs(branch,specialty),activeMax=regs.length?Math.max(...regs):0,latest=Math.max(legacy,activeMax),seen=latest>0&&regs.includes(latest);
  return{latestIssued:latest,sealedThrough:seen?Math.max(0,latest-1):latest,releasedLatest:false,latestSeenActive:seen,updatedAt:0};
}
function ensureScope(branch,specialty){
  const key=scopeKey(branch,specialty);let entry=state.scopes[key];if(!entry){entry=legacyEntry(branch,specialty);state.scopes[key]=entry;}
  const regs=activeRegs(branch,specialty),activeMax=regs.length?Math.max(...regs):0;
  if(activeMax>entry.latestIssued){entry.sealedThrough=Math.max(entry.sealedThrough,activeMax-1);entry.latestIssued=activeMax;entry.latestSeenActive=true;entry.releasedLatest=false;entry.updatedAt=now();state.updatedAt=entry.updatedAt;writeLocal(false);}
  else if(activeMax===entry.latestIssued&&activeMax>0&&(!entry.latestSeenActive||entry.releasedLatest)){entry.sealedThrough=Math.min(entry.sealedThrough,Math.max(0,activeMax-1));entry.latestSeenActive=true;entry.releasedLatest=false;entry.updatedAt=now();state.updatedAt=entry.updatedAt;writeLocal(false);}
  return entry;
}
function seedFromLegacyAndStudents(){
  const legacy=sequenceBase.identitySnapshot?.()?.registrationLastByScope||{};
  Object.entries(legacy).forEach(([key,value])=>{if(state.scopes[key])return;const latest=int(value)||0;state.scopes[key]={latestIssued:latest,sealedThrough:latest,releasedLatest:false,latestSeenActive:false,updatedAt:0};});
  (typeof students!=='undefined'?students:[]).forEach(student=>{
    const reg=int(student?.reg);if(!reg)return;const key=scopeKey(student.branch,student.specialty),entry=state.scopes[key]||{latestIssued:0,sealedThrough:0,releasedLatest:false,latestSeenActive:false,updatedAt:0};
    if(reg>entry.latestIssued){entry.sealedThrough=Math.max(entry.sealedThrough,reg-1);entry.latestIssued=reg;entry.latestSeenActive=true;entry.releasedLatest=false;entry.updatedAt=Math.max(entry.updatedAt,Number(student.updatedAt||0));state.scopes[key]=entry;}
    else if(reg===entry.latestIssued){entry.sealedThrough=Math.min(entry.sealedThrough,Math.max(0,reg-1));entry.latestSeenActive=true;entry.releasedLatest=false;state.scopes[key]=entry;}
  });
}
function previewRegistrationNumber(branch,specialty){
  const entry=ensureScope(branch,specialty),latest=Math.max(0,Number(entry.latestIssued||0));if(!latest)return 1;
  const occupied=new Set(activeRegs(branch,specialty));if(latest<=Number(entry.sealedThrough||0))return Number(entry.sealedThrough||0)+1;
  if(occupied.has(latest))return latest+1;
  if(entry.releasedLatest||!entry.latestSeenActive)return latest;
  entry.sealedThrough=Math.max(entry.sealedThrough,latest);entry.releasedLatest=false;entry.latestSeenActive=false;touchEntry(entry);return latest+1;
}
function commitRegistrationNumber(branch,specialty,number){
  const value=int(number);if(!value)return null;const entry=ensureScope(branch,specialty);
  if(value>entry.latestIssued){entry.sealedThrough=Math.max(entry.sealedThrough,value-1);entry.latestIssued=value;}
  else if(value<entry.latestIssued&&value>entry.sealedThrough){entry.sealedThrough=value;}
  entry.latestSeenActive=true;entry.releasedLatest=false;touchEntry(entry);return value;
}
function markRegistrationReleased(branch,specialty,number){
  const value=int(number);if(!value)return false;const entry=ensureScope(branch,specialty);if(value!==entry.latestIssued||value<=entry.sealedThrough)return false;
  entry.releasedLatest=true;entry.latestSeenActive=false;touchEntry(entry);return true;
}
function sealRegistrationNumber(branch,specialty,number){
  const value=int(number);if(!value)return false;const entry=ensureScope(branch,specialty);
  if(value>entry.latestIssued)entry.latestIssued=value;entry.sealedThrough=Math.max(entry.sealedThrough,value);entry.releasedLatest=false;entry.latestSeenActive=false;touchEntry(entry);return true;
}
function allocateRegistrationNumber(branch,specialty){return previewRegistrationNumber(branch,specialty);}
function noteRegistrationNumber(branch,specialty,number){
  const value=commitRegistrationNumber(branch,specialty,number);if(!value)return value;
  Promise.resolve().then(()=>{const entry=ensureScope(branch,specialty);if(entry.latestIssued===value&&entry.sealedThrough<value&&!activeRegs(branch,specialty).includes(value))markRegistrationReleased(branch,specialty,value);});
  return value;
}
function registrationNumberWillBeReusable(student){
  if(!student)return false;const reg=int(student.reg);if(!reg)return false;const entry=ensureScope(student.branch,student.specialty);
  if(reg!==Number(entry.latestIssued||0)||reg<=Number(entry.sealedThrough||0))return false;
  return !activeRegs(student.branch,student.specialty,String(student.id||'')).includes(reg);
}
function registrationPolicy(branch,specialty){const entry=ensureScope(branch,specialty);return{...clone(entry),next:previewRegistrationNumber(branch,specialty)};}

function monthlyCoverageMonth(student){
  if(!student||!isMonthlyStudent(student))return null;
  let latest=1;const fee=Math.max(0,Number(student?.snapshot?.fee||0));
  (Array.isArray(student.payments)?student.payments:[]).forEach(payment=>{
    const amount=Math.max(0,Number(payment?.[1]||0));if(amount<=0)return;
    const explicit=Array.isArray(payment?.[10])?payment[10]:[];
    if(explicit.length){explicit.forEach(item=>{const month=int(item?.monthNumber??item?.n);if(month)latest=Math.max(latest,month);});return;}
    const target=int(payment?.[7])||1,span=fee>0?Math.max(1,Math.ceil(amount/fee)):1;latest=Math.max(latest,target+span-1);
  });
  return latest;
}
function monthlyCoverageEnd(student){
  if(!student||!isMonthlyStudent(student)||!student.start)return'';
  if(B.isInactive?.(student)&&student.end)return String(student.end);
  const month=Math.max(1,Number(monthlyCoverageMonth(student)||1));return B.addDays(addDuration(String(student.start),month,'month'),-1);
}

function isTombstoned(student){
  const id=String(student?.id||''),recordCode=String(student?.recordCode||'');return state.tombstones.some(item=>(item.id&&item.id===id)||(item.recordCode&&item.recordCode===recordCode));
}
function mergeIncomingLifecycle(incoming){state=mergeStates(state,incoming?.studentLifecycleV20);seedFromLegacyAndStudents();writeLocal(false);}
function filterDeletedStudents(incoming){
  const copy=clone(incoming&&typeof incoming==='object'?incoming:{});if(Array.isArray(copy.students))copy.students=copy.students.filter(student=>!isTombstoned(student));return copy;
}
function closedStudentDate(student){
  const fiscal=window.EFC_FISCAL_V14;if(!fiscal?.isDateClosed)return'';
  const dates=[String(student?.start||''),...(Array.isArray(student?.payments)?student.payments.map(payment=>String(payment?.[0]||'')):[])].filter(Boolean);
  return dates.find(date=>fiscal.isDateClosed(date))||'';
}
function protectedFinancialTermsChanged(student,changes,scopeChanged){
  const startChanged=changes.start!==undefined&&String(changes.start)!==String(student.start||''),currentFee=Math.max(0,Number(student?.snapshot?.fee||student?.required||0)),feeChanged=changes.fee!==undefined&&Math.max(0,Number(changes.fee||0))!==currentFee;
  return scopeChanged||startChanged||feeChanged;
}
async function deleteStudentPermanently(student){
  if(!student)throw new Error('الطالب غير موجود.');const existing=students.find(item=>String(item?.id||'')===String(student.id||''));if(!existing)throw new Error('ملف الطالب غير موجود.');
  const lockedDate=closedStudentDate(existing);if(lockedDate)throw new Error(`لا يمكن حذف هذا الطالب لأن ملفه يحتوي حركة داخل سنة مالية مقفلة (${B.showDate(lockedDate)}).`);
  window.EFC_CODES?.ensureStudentRecord?.(existing);const reusableRegistration=registrationNumberWillBeReusable(existing),paymentCount=Array.isArray(existing.payments)?existing.payments.length:0,paidAmount=B.paymentTotal?.(existing)||0,stamp=now(),key=scopeKey(existing.branch,existing.specialty),scopeBefore=clone(state.scopes[key]||ensureScope(existing.branch,existing.specialty));
  if(reusableRegistration)markRegistrationReleased(existing.branch,existing.specialty,existing.reg);
  const tombstone=normalizeTombstone({id:existing.id,recordCode:existing.recordCode,branch:existing.branch,specialty:existing.specialty,reg:existing.reg,deletedAt:stamp});if(tombstone)state.tombstones.push(tombstone);
  state=normalizeState({...state,updatedAt:stamp});writeLocal(false);
  const index=students.findIndex(item=>String(item?.id||'')===String(existing.id||''));if(index>=0)students.splice(index,1);
  try{B.saveStudents?.();markChanged();await window.EFC_FORCE_PERSIST?.();}
  catch(error){
    if(index>=0)students.splice(index,0,existing);if(scopeBefore)state.scopes[key]=scopeBefore;state.tombstones=state.tombstones.filter(item=>!(item.id===tombstone?.id&&item.recordCode===tombstone?.recordCode&&item.deletedAt===stamp));writeLocal(true);
    try{B.saveStudents?.();await window.EFC_FORCE_PERSIST?.();}catch(rollbackError){console.error('EFC student delete rollback persistence failed.',rollbackError);}throw error;
  }
  return{deleted:true,reusableRegistration,paymentCount,paidAmount,reg:int(existing.reg)};
}

const baseUpdate=B.updateStudentRegistration;
function updateStudentRegistration(student,changes={}){
  if(!student)throw new Error('الطالب غير موجود.');
  const targetBranch=String(changes.branch??student.branch??''),targetSpecialty=String(changes.specialty??student.specialty??''),scopeChanged=targetBranch!==String(student.branch||'')||targetSpecialty!==String(student.specialty||''),lockedDate=closedStudentDate(student);
  if(lockedDate&&protectedFinancialTermsChanged(student,changes,scopeChanged))throw new Error(`لا يمكن تغيير المركز أو الدورة أو تاريخ البداية أو السعر لأن ملف الطالب يحتوي حركة داخل سنة مالية مقفلة (${B.showDate(lockedDate)}). يمكن تعديل الاسم والهاتف فقط.`);
  if(!scopeChanged)return baseUpdate(student,changes);
  const old={branch:String(student.branch||''),specialty:String(student.specialty||''),reg:int(student.reg)||0},candidate=previewRegistrationNumber(targetBranch,targetSpecialty),oldReg=student.reg;
  student.reg=candidate;
  try{
    const result=baseUpdate(student,changes),stamp=now(),edited=result?.student||student,history=Array.isArray(edited.registrationNumberHistory)?edited.registrationNumberHistory:[];
    history.push({at:stamp,from:{branch:old.branch,specialty:old.specialty,reg:old.reg},to:{branch:targetBranch,specialty:targetSpecialty,reg:candidate},reason:'scope-change-auto-number'});edited.registrationNumberHistory=history.slice(-50);
    commitRegistrationNumber(targetBranch,targetSpecialty,candidate);markRegistrationReleased(old.branch,old.specialty,old.reg);B.saveStudents?.();return result;
  }catch(error){student.reg=oldReg;throw error;}
}

state=readLocal();
if(invoke){
  try{const raw=await invoke('load_app_state'),native=raw?JSON.parse(raw):null;if(native?.studentLifecycleV20)state=mergeStates(state,native.studentLifecycleV20);}catch(error){console.warn('EFC lifecycle v20 native hydration kept local policy.',error);}
}
seedFromLegacyAndStudents();
const kept=students.filter(student=>!isTombstoned(student));if(kept.length!==students.length){students.splice(0,students.length,...kept);B.saveStudents?.();}
writeLocal(false);

window.EFC_REGISTER_STATE_CONTRIBUTOR?.('student-lifecycle-v20',snapshot=>{
  seedFromLegacyAndStudents();writeLocal(false);return Object.assign(snapshot,{studentLifecycleV20:clone(state)});
});
const baseApply=window.EFC_APPLY_RESTORED_STATE;
if(typeof baseApply==='function')window.EFC_APPLY_RESTORED_STATE=async incoming=>{
  mergeIncomingLifecycle(incoming);const result=await baseApply(filterDeletedStudents(incoming));seedFromLegacyAndStudents();writeLocal(true);await window.EFC_FORCE_PERSIST?.();return result;
};

window.EFC_RECEIPT_SEQUENCES_V10=Object.freeze({...sequenceBase,
  registrationNumbersNeverReused:false,
  registrationNumberPolicy:'successor-sealed-latest-reusable',
  latestRegistrationNumberReusableUntilSuccessor:true,
  olderRegistrationNumbersStayReserved:true,
  allocateRegistrationNumber,
  noteRegistrationNumber,
  previewRegistrationNumber,
  commitRegistrationNumber,
  markRegistrationReleased,
  sealRegistrationNumber,
  registrationPolicy
});
const next=Object.freeze({...B,updateStudentRegistration,monthlyCoverageMonth,monthlyCoverageEnd,deleteStudentPermanently,registrationNumberWillBeReusable,studentLifecycleV20:true,automaticRegistrationNumberOnScopeChange:true,manualStudentDeletionTombstones:true,closedFiscalStudentDeletionBlocked:true,closedFiscalFinancialIdentityEditBlocked:true});
window.EFC_DOMAIN_V13=next;
window.EFC_DOMAIN_V13_READY=Promise.resolve(next);
window.EFC_STUDENT_LIFECYCLE_DOMAIN_V20=Object.freeze({ready:true,version:VERSION,storageKey:STORAGE_KEY,registrationNumberPolicy:'successor-sealed-latest-reusable',latestNumberReusableUntilSuccessor:true,olderNumbersStayReserved:true,automaticNumberOnScopeChange:true,monthlyCoverageEnd,previewRegistrationNumber,registrationNumberWillBeReusable,markRegistrationReleased,sealRegistrationNumber,deleteStudentPermanently,snapshot:()=>clone(state)});
})();