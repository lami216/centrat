(()=>{
'use strict';
if(window.EFC_CERTIFICATES_V13?.ready)return;
if(!window.EFC_RECEIPTS_V13?.ready||typeof allPayments!=='function'||typeof shell!=='function')throw new Error('Certificates v13 loaded before clean receipt/foundation runtime.');

const STORAGE_KEY='efc-certificate-state-v1';
const CERTIFICATE_SUBTITLE='للغات والمعلوماتية';
const invoke=window.__TAURI__?.core?.invoke;
const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const pad2=value=>String(value).padStart(2,'0');
const padReceipt=value=>String(Math.max(0,Number(value||0))).padStart(5,'0');
const today=()=>typeof deviceTodayV3==='function'?deviceTodayV3():DEMO_TODAY;
const showDate=value=>typeof fmtDateV3==='function'?fmtDateV3(value):fmtDate(value);
const cash=value=>typeof moneyV3==='function'?moneyV3(value):money(value);
const uid=prefix=>`${prefix}-${Date.now().toString(36)}-${globalThis.crypto?.randomUUID?.().replaceAll('-','').slice(0,14)||Math.random().toString(36).slice(2,16)}`;
const logoUrl=()=>window.EFC_RECEIPT_LOGO_DATA_URI||new URL('./efc-logo.svg',location.href).href;
const canEditCertificates=()=>window.EFC_AUTH_V13?.canEdit?.('certificates')??true;
const icon=body=>`<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><g fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${body}</g></svg>`;
const CERT_ICON=icon('<path d="M6 3h12v18H6z"/><path d="M9 7h6M9 11h6"/><circle cx="12" cy="16" r="2.2"/><path d="m10.6 17.7-.6 2.1 2-1 2 1-.6-2.1"/>');
const FINANCE_ICON=icon('<path d="M4 19V9M10 19V5M16 19v-7M22 19H2M3.5 7.5 9 3l5 5 6-5"/>');
const HISTORY_ICON=icon('<path d="M5 4h14v16H5z"/><path d="M8 8h8M8 12h8M8 16h5"/>');
const BACK_ICON=icon('<path d="m15 6-6 6 6 6"/>');
const X_ICON=icon('<path d="M6 6l12 12M18 6 6 18"/>');
const MONTH_NAMES=['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];

let state={certificateBranches:[],certificateReceipts:[],nextReceiptNo:1};
let mode='internal';
let selectedStudentId=null;
let historyOpen=false;
let issueInFlight=false;
let branchSaveInFlight=false;
let editingReceiptId=null;
let receiptDeleteInFlight=false;
let certificateDeliverySaveInFlight=false;
let saveChain=Promise.resolve();

function normalizeBranch(item){
  const name=String(item?.name||'').trim();
  if(!name)return null;
  return{id:String(item.id||uid('cert-branch')),recordCode:String(item.recordCode||uid('cert-branch-record')),name,createdAt:Number(item.createdAt||Date.now())};
}
function normalizeCertificateDelivery(item){
  if(!item||typeof item!=='object')return null;
  const receiverType=item.receiverType==='agent'?'agent':'student',date=String(item.date||'').trim(),time=String(item.time||'').trim(),receiverName=String(item.receiverName||'').trim(),receiverPhone=String(item.receiverPhone||'').trim();
  if(!date||!time||!receiverName)return null;
  return{receiverType,receiverName,receiverPhone,date,time,recordedAt:Number(item.recordedAt||Date.now())};
}
function normalizeReceipt(item){
  if(!item||typeof item!=='object')return null;
  const amount=Math.max(0,Number(item.amount||0));
  const name=String(item.studentName||item.name||'').trim();
  if(!name||amount<=0)return null;
  return{
    id:String(item.id||uid('certificate')),
    recordCode:String(item.recordCode||uid('certificate-record')),
    transactionCode:String(item.transactionCode||uid('certificate-tx')),
    receiptNo:Math.max(1,Number(item.receiptNo||1)),
    studentType:item.studentType==='external'?'external':'internal',
    studentId:item.studentId?String(item.studentId):null,
    studentName:name,
    phone:String(item.phone||''),
    reg:item.reg===null||item.reg===undefined||item.reg===''?null:String(item.reg),
    specialtyId:String(item.specialtyId||''),
    specialtyName:String(item.specialtyName||''),
    branchType:item.branchType==='certificate'?'certificate':'internal',
    branchId:item.branchId?String(item.branchId):null,
    branchName:String(item.branchName||''),
    amount,
    method:String(item.method||''),
    date:String(item.date||today()),
    time:String(item.time||'00:00'),
    timestamp:Number(item.timestamp||item.createdAt||Date.now()),
    createdAt:Number(item.createdAt||item.timestamp||Date.now()),
    delivery:normalizeCertificateDelivery(item.delivery)
  };
}
function normalizeState(raw){
  const branches=(Array.isArray(raw?.certificateBranches)?raw.certificateBranches:[]).map(normalizeBranch).filter(Boolean);
  const receipts=(Array.isArray(raw?.certificateReceipts)?raw.certificateReceipts:[]).map(normalizeReceipt).filter(Boolean);
  const branchKeys=new Set(),receiptKeys=new Set();
  const uniqueBranches=branches.filter(item=>{const key=item.recordCode||item.name.toLowerCase();if(branchKeys.has(key))return false;branchKeys.add(key);return true;});
  const uniqueReceipts=receipts.filter(item=>{const key=item.recordCode||item.transactionCode;if(receiptKeys.has(key))return false;receiptKeys.add(key);return true;});
  let maxReceipt=0;uniqueReceipts.forEach(item=>{maxReceipt=Math.max(maxReceipt,Number(item.receiptNo||0));});
  const used=new Set(),duplicates=[];uniqueReceipts.forEach(item=>{const number=Number(item.receiptNo||0);if(Number.isInteger(number)&&number>0&&!used.has(number)){used.add(number);return;}duplicates.push(item);});
  let repair=Math.max(1,maxReceipt+1);duplicates.forEach(item=>{while(used.has(repair))repair+=1;item.receiptNo=repair;used.add(repair);maxReceipt=Math.max(maxReceipt,repair);repair+=1;});
  const configured=Math.max(1,Number(raw?.nextReceiptNo||raw?.certificateNextReceiptNo||1));
  return{certificateBranches:uniqueBranches,certificateReceipts:uniqueReceipts,nextReceiptNo:Math.max(configured,maxReceipt+1)};
}
function mergeState(current,incoming){
  const a=normalizeState(current),b=normalizeState(incoming),branches=[...a.certificateBranches],receipts=[...a.certificateReceipts];
  const branchCodes=new Set(branches.flatMap(item=>[item.recordCode,item.name.trim().toLowerCase()]));
  const receiptCodes=new Set(receipts.flatMap(item=>[item.recordCode,item.transactionCode]));
  b.certificateBranches.forEach(item=>{const name=item.name.trim().toLowerCase();if(branchCodes.has(item.recordCode)||branchCodes.has(name))return;branches.push(item);branchCodes.add(item.recordCode);branchCodes.add(name);});
  b.certificateReceipts.forEach(item=>{if(receiptCodes.has(item.recordCode)||receiptCodes.has(item.transactionCode))return;receipts.push(item);receiptCodes.add(item.recordCode);receiptCodes.add(item.transactionCode);});
  const maxReceipt=Math.max(0,...receipts.map(item=>Number(item.receiptNo||0)));
  return{certificateBranches:branches,certificateReceipts:receipts,nextReceiptNo:Math.max(a.nextReceiptNo,b.nextReceiptNo,maxReceipt+1)};
}
function readLocal(){try{return normalizeState(JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}'));}catch{return normalizeState({});}}
function writeLocal(){localStorage.setItem(STORAGE_KEY,JSON.stringify(state));}
async function persist(){
  writeLocal();
  if(!invoke)return;
  const snapshot=JSON.stringify(state);
  saveChain=saveChain.catch(()=>undefined).then(()=>invoke('save_certificate_state',{state:snapshot}));
  await saveChain;
}
async function loadState(){
  const local=readLocal();
  if(!invoke){state=local;return;}
  try{
    const raw=await invoke('load_certificate_state');
    const native=raw?normalizeState(JSON.parse(raw)):normalizeState({});
    state=mergeState(native,local);
    await persist();
  }catch(error){console.error('EFC certificate state load failed; local state kept.',error);state=local;}
}
function nextReceiptNo(){
  const floor=Math.max(1,...state.certificateReceipts.map(item=>Number(item.receiptNo||0)+1)),number=Math.max(floor,Number(state.nextReceiptNo||1));
  state.nextReceiptNo=number+1;writeLocal();return number;
}
function nowTime(){const date=new Date();return`${pad2(date.getHours())}:${pad2(date.getMinutes())}`;}
function certificatePayment(receipt){
  const specialtyValue=spec(receipt.specialtyId)?receipt.specialtyId:(receipt.specialtyName||receipt.specialtyId);
  return{
    student:{id:`certificate:${receipt.id}`,name:receipt.studentName,phone:receipt.phone||'',branch:receipt.branchType==='internal'?receipt.branchId:receipt.branchName,specialty:specialtyValue,reg:receipt.reg||''},
    date:receipt.date,amount:Number(receipt.amount||0),method:receipt.method,time:receipt.time||'00:00',order:Number(receipt.timestamp||0),description:`رسوم شهادة · ${receipt.specialtyName||'دورة'}`,paymentIndex:0,receipt:padReceipt(receipt.receiptNo),sourceType:'certificate',certificateId:receipt.id
  };
}

const whatsappIcon=()=>`<span class="socialIcon12" aria-hidden="true"><svg viewBox="0 0 32 32"><path d="M16.05 3.2A12.65 12.65 0 0 0 5.2 22.34L3.5 28.5l6.3-1.65a12.63 12.63 0 1 0 6.25-23.65Zm0 22.98a10.4 10.4 0 0 1-5.3-1.45l-.38-.23-3.74.98 1-3.64-.25-.38a10.42 10.42 0 1 1 8.67 4.72Zm5.72-7.8c-.31-.16-1.85-.91-2.14-1.02-.28-.1-.49-.16-.7.16-.2.31-.8 1.02-.98 1.23-.18.2-.36.23-.67.08-.31-.16-1.31-.48-2.5-1.54-.92-.82-1.55-1.84-1.73-2.15-.18-.31-.02-.48.14-.64.14-.14.31-.36.47-.55.16-.18.2-.31.31-.52.1-.2.05-.39-.03-.55-.08-.16-.7-1.68-.96-2.3-.25-.6-.51-.52-.7-.53h-.6c-.2 0-.54.08-.83.39-.28.31-1.08 1.05-1.08 2.57 0 1.51 1.1 2.98 1.26 3.18.16.2 2.17 3.31 5.25 4.64.73.32 1.3.5 1.75.64.74.23 1.4.2 1.93.12.59-.09 1.85-.76 2.11-1.49.26-.73.26-1.36.18-1.49-.08-.13-.29-.2-.6-.36Z"/></svg></span>`;
const facebookIcon=()=>`<span class="socialIcon12" aria-hidden="true"><svg viewBox="0 0 32 32"><path d="M18.3 29V17.1h4l.6-4.7h-4.6v-3c0-1.35.37-2.28 2.32-2.28H23V2.94c-.41-.06-1.82-.18-3.47-.18-3.44 0-5.8 2.1-5.8 5.96v3.68H9.84v4.7h3.89V29h4.57Z"/></svg></span>`;
function receiptHeader(receipt){const img=`<img src="${logoUrl()}" alt="EFC">`;return`<div class="head12"><div class="contact12">${img}<div class="contactText12"><b>Tél: 48 02 84 84</b><div class="socialLine12">${whatsappIcon()}<span>32 09 86 89</span></div><div class="socialLine12 teacher12">${facebookIcon()}<span>الأستاذ محمد ديدي</span></div></div></div><div class="center12"><h1 class="title12"><span class="enTitle12">Centre EFC</span><span class="arTitle12">مركز</span></h1><div class="official12">${CERTIFICATE_SUBTITLE}</div><div class="tag12">جميع الشهادات معترف بها من طرف الدولة</div><div class="rn12"><span>Reçu N°</span><b>${padReceipt(receipt.receiptNo)}</b><span>وصل رقم</span></div></div><div class="logoOnly12">${img}</div></div>`;}
function receiptCss(){return`
*{box-sizing:border-box}body{font-family:Tahoma,Arial,sans-serif;margin:0;background:#eef1f0;color:#111715}.cert-paper{width:1040px;max-width:96vw;margin:18px auto;background:#fff;border:2px solid #293631;padding:12px 18px 11px;direction:ltr}
.head12{display:grid;grid-template-columns:240px 1fr 150px;gap:14px;align-items:center;border-bottom:1px solid #b2b8b5;padding-bottom:6px}.contact12{display:grid;grid-template-columns:92px 1fr;gap:8px;align-items:center;direction:ltr;text-align:left}.contact12 img,.logoOnly12 img{width:82px;height:62px;object-fit:contain;object-position:center;display:block}.contactText12{display:grid;gap:1px;align-content:center}.contactText12>b{display:block;font-size:13px;line-height:1.35;white-space:nowrap;direction:ltr;text-align:left}.socialLine12{display:flex;align-items:center;gap:5px;font-size:13px;line-height:1.35;white-space:nowrap;direction:ltr;text-align:left;font-weight:700;justify-content:flex-start}.socialLine12.teacher12{font-size:10px;font-weight:700;margin-top:2px;direction:ltr;justify-content:flex-start}.socialLine12.teacher12 span:last-child{font-weight:700;direction:rtl;unicode-bidi:isolate}.socialIcon12{width:14px;height:14px;display:inline-block;flex:0 0 14px;color:#111715}.socialIcon12 svg{width:100%;height:100%;display:block;fill:currentColor}.center12{text-align:center;direction:rtl}.center12 h1{margin:0;font-size:27px;line-height:1}.title12{display:flex;direction:ltr;justify-content:center;align-items:baseline;gap:12px;white-space:nowrap}.title12 .enTitle12{direction:ltr}.title12 .arTitle12{direction:rtl}.center12 .official12{font-size:11px;font-weight:900;margin-top:3px}.center12 .tag12{font-size:11px;font-weight:700;margin-top:3px}.rn12{display:flex;direction:ltr;justify-content:center;align-items:center;gap:9px;margin-top:4px;font-size:17px}.rn12 b{font-size:21px}.logoOnly12{height:66px;display:grid;place-items:center}
.cert-section-title{text-align:center;direction:rtl;font-size:25px;font-weight:900;line-height:1.15;margin:5px 0 2px}.cert-meta{display:flex;justify-content:space-between;align-items:center;gap:24px;direction:ltr;padding:3px 0 2px;font-size:11px}.cert-meta>span{direction:rtl}.cert-row{display:grid;grid-template-columns:145px minmax(0,1fr) 135px;gap:8px;align-items:center;height:34px;font-size:13px;direction:ltr}.cert-fr{text-align:left;direction:ltr;font-weight:700}.cert-ar{text-align:right;direction:rtl;font-weight:800}.cert-track{position:relative;height:28px;display:flex;align-items:center;justify-content:center;min-width:0}.cert-track:before{content:"";position:absolute;left:0;right:0;top:50%;border-top:2px dotted #7d8581;transform:translateY(-50%)}.cert-track b{position:relative;z-index:1;background:#fff;padding:0 10px;font-size:15px;font-weight:800;direction:rtl;white-space:nowrap;max-width:94%;overflow:hidden;text-overflow:ellipsis}.cert-pair{display:grid;grid-template-columns:1fr 1fr;gap:24px;direction:ltr}.cert-half{display:grid;grid-template-columns:92px minmax(0,1fr) 110px;gap:7px;align-items:center;height:34px;font-size:13px;direction:ltr}.cert-reg b{border:2px solid #555;min-width:120px;text-align:center;padding:3px 20px;background:#fff}
.cert-methods{border-top:1px solid #d7dcda;margin-top:7px;padding-top:8px;display:flex;align-items:center;justify-content:space-between;gap:16px;direction:ltr}.cert-method{min-width:0;flex:1;display:flex;align-items:center;justify-content:center;gap:7px;font-size:10px;font-weight:700;white-space:nowrap}.cert-check{width:44px;height:30px;border:2px solid #555;background:#fff;display:grid;place-items:center;font-size:18px;font-weight:900;flex:0 0 44px}.cert-method.on .cert-check{color:#158b4c;border-color:#158b4c}.cert-method-name{display:flex;align-items:center;gap:3px;line-height:1.1}.cert-actions{width:1040px;max-width:96vw;margin:0 auto 18px;display:flex;align-items:center;direction:rtl;gap:8px}.cert-actions button{border:0;border-radius:7px;padding:10px 17px;font:700 13px Tahoma;cursor:pointer}.cert-actions button:disabled{opacity:.45;cursor:not-allowed}.cert-action-spacer{flex:1 1 auto}.cert-print{background:#155ea8;color:#fff}.cert-save{background:#159a55;color:#fff}.cert-edit{background:#075844;color:#fff}.cert-delete{background:#b43d3d;color:#fff}.cert-delivery{background:#7357a3;color:#fff}.cert-delivery.is-delivered{background:#5d477f;color:#fff}@media(max-width:820px){.cert-methods{gap:6px;flex-wrap:wrap}.cert-method{font-size:8px;min-width:120px}.cert-check{width:34px;flex-basis:34px}.cert-actions{flex-wrap:wrap}.cert-action-spacer{display:none}}@media print{body{background:#fff}.cert-paper{width:100%;max-width:none;margin:0;border:1px solid #222}.cert-actions{display:none}@page{size:landscape;margin:8mm}}
`;}
function normalizeMethod(value){return String(value||'').trim().toLowerCase().replace(/\s+/g,' ').replace(/[ًٌٍَُِّْـ]/g,'');}
function receiptMethods(current){
  const selected=normalizeMethod(current);
  const items=[...new Set((methods||[]).map(value=>String(value||'').trim()).filter(Boolean))];
  return items.map(name=>{const on=normalizeMethod(name)===selected;return`<div class="cert-method ${on?'on':''}"><span class="cert-check">${on?'✓':''}</span><span class="cert-method-name"><b>${esc(name)}</b></span></div>`;}).join('');
}
function receiptBody(receipt){
  const reg=receipt.reg?String(receipt.reg).padStart(4,'0'):'—';
  const row=(fr,value,ar)=>`<div class="cert-row"><span class="cert-fr">${fr}</span><span class="cert-track"><b>${esc(value||'—')}</b></span><span class="cert-ar">${ar}</span></div>`;
  const half=(fr,value,ar,cls='')=>`<div class="cert-half ${cls}"><span class="cert-fr">${fr}</span><span class="cert-track"><b>${esc(value||'—')}</b></span><span class="cert-ar">${ar}</span></div>`;
  return`${receiptHeader(receipt)}<div class="cert-section-title">إدارة الشهادات</div><div class="cert-meta"><span>تم الدفع في تاريخ: <b>${showDate(receipt.date)}</b></span><span>الفرع: <b>${esc(receipt.branchName||'—')}</b></span></div>${row("Nom de l’étudiant",receipt.studentName,'اسم الطالب')}${row('Nature de la Session',receipt.specialtyName,'الشهادة')}${row('Filière',receipt.branchName,'الفرع')}<div class="cert-pair">${half('N° Registre',reg,'رقم السجل','cert-reg')}${half('Montant',cash(receipt.amount),'المبلغ المدفوع')}</div><div class="cert-methods">${receiptMethods(receipt.method)}</div>`;
}
function receiptDocument(receipt,actions=true,autoPrint=false){
  const data=JSON.stringify(receipt).replace(/</g,'\\u003c'),mutationDisabled=canEditCertificates()?'':' disabled';
  const delivered=Boolean(receipt.delivery),deliveryDisabled=!delivered&&!canEditCertificates()?' disabled':'';return`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>روسي شهادة ${padReceipt(receipt.receiptNo)}</title><style>${receiptCss()}</style></head><body><div class="cert-paper">${receiptBody(receipt)}</div>${actions?`<div class="cert-actions"><button class="cert-print" onclick="print()">طباعة</button><button class="cert-save" onclick="parent.EFC_SAVE_CERTIFICATE_PDF_V13(CERT)">حفظ PDF</button><button class="cert-delivery${delivered?' is-delivered':''}" type="button"${deliveryDisabled} onclick="parent.EFC_OPEN_CERTIFICATE_DELIVERY_V13(CERT)">${delivered?'معلومات الاستلام':'تسجيل الاستلام'}</button><span class="cert-action-spacer"></span><button class="cert-edit" type="button"${mutationDisabled} onclick="parent.EFC_EDIT_CERTIFICATE_RECEIPT_V13(CERT)">تعديل الروسي</button><button class="cert-delete" type="button"${mutationDisabled} onclick="parent.EFC_DELETE_CERTIFICATE_RECEIPT_V13(CERT)">حذف الروسي</button></div>`:''}<script>const CERT=${data};${autoPrint?'setTimeout(()=>print(),250);':''}<\/script></body></html>`;
}
function openReceipt(receipt,autoPrint=false){
  if(!receipt)return null;
  const modal=document.createElement('div');modal.className='modal receipt-viewer-v13';
  modal.innerHTML=`<div class="receipt-viewer-card-v13"><div class="receipt-viewer-head-v13"><b>عرض روسي الشهادة</b><button class="receipt-viewer-close-v13" type="button" title="إغلاق">×</button></div><iframe class="receipt-viewer-frame-v13" title="روسي الشهادة"></iframe></div>`;
  document.body.appendChild(modal);const frame=modal.querySelector('iframe'),close=()=>modal.remove();modal.querySelector('.receipt-viewer-close-v13').onclick=close;frame.srcdoc=receiptDocument(receipt,true,autoPrint);return{closed:false,close,focus:()=>frame.focus(),frame};
}
function loadLocalScript(src,key){if(window[key])return Promise.resolve();return new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=src;script.onload=resolve;script.onerror=()=>reject(new Error(`تعذر تحميل ${src} محليًا.`));document.head.appendChild(script);});}
function waitFrame(frame){return new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('تأخر تجهيز روسي الشهادة.')),4000);frame.onload=()=>{clearTimeout(timer);resolve();};});}
async function waitImages(root){await Promise.all([...root.querySelectorAll('img')].map(async image=>{if(!image.complete||!image.naturalWidth)await new Promise(resolve=>{const done=()=>resolve();image.addEventListener('load',done,{once:true});image.addEventListener('error',done,{once:true});setTimeout(done,1600);});try{await image.decode?.();}catch{}}));try{await root.ownerDocument.fonts?.ready;}catch{}}
function arrayBufferToBase64(buffer){const bytes=new Uint8Array(buffer);let binary='';for(let offset=0;offset<bytes.length;offset+=0x8000)binary+=String.fromCharCode(...bytes.subarray(offset,Math.min(offset+0x8000,bytes.length)));return btoa(binary);}
async function savePdf(receipt){
  let stage;
  try{
    await Promise.all([loadLocalScript('./vendor/html2canvas.min.js','html2canvas'),loadLocalScript('./vendor/jspdf.umd.min.js','jspdf')]);
    stage=document.createElement('div');stage.style.cssText='position:fixed;left:-16000px;top:0;width:1120px;background:#fff;z-index:-9999;pointer-events:none';
    stage.innerHTML=`<style>${receiptCss()}</style><div class="cert-paper">${receiptBody(receipt)}</div>`;document.body.appendChild(stage);
    const paper=stage.querySelector('.cert-paper');if(!paper)throw new Error('تعذر العثور على روسي الشهادة.');await waitImages(paper);
    const canvas=await window.html2canvas(paper,{scale:2,backgroundColor:'#fff',useCORS:false,allowTaint:false,logging:false});
    const {jsPDF}=window.jspdf,pdf=new jsPDF({orientation:'landscape',unit:'mm',format:'a4'}),pw=pdf.internal.pageSize.getWidth(),ph=pdf.internal.pageSize.getHeight(),ratio=Math.min(pw/canvas.width,ph/canvas.height),width=canvas.width*ratio,height=canvas.height*ratio;
    pdf.addImage(canvas.toDataURL('image/jpeg',.96),'JPEG',(pw-width)/2,(ph-height)/2,width,height);
    const fileName=`روسي-شهادة-${padReceipt(receipt.receiptNo)}.pdf`,buffer=pdf.output('arraybuffer');
    if(!invoke){pdf.save(fileName);return fileName;}
    return await invoke('save_receipt_pdf',{fileName,dataBase64:arrayBufferToBase64(buffer)});
  }catch(error){console.error('EFC certificate PDF save failed.',error);alert(String(error?.message||error||'تعذر حفظ روسي الشهادة.'));return null;}finally{stage?.remove();}
}

function certificateDeliveryReceiptCss(){return receiptCss()+`
.cert-delivery-receipt-title-v13{text-align:center;direction:rtl;margin:7px 0 2px;font-size:24px;font-weight:950;color:#075844}.cert-delivery-receipt-subtitle-v13{text-align:center;direction:rtl;margin:0 0 10px;font-size:16px;font-weight:900;color:#5d477f}.cert-delivery-receipt-grid-v13{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px 14px;direction:rtl;margin:8px 0}.cert-delivery-receipt-field-v13{display:grid;grid-template-columns:120px minmax(0,1fr);gap:8px;align-items:center;min-height:40px;padding:7px 10px;border:1px solid #d4e1dc;border-radius:9px;background:#fbfdfc}.cert-delivery-receipt-field-v13 small{font-size:10px;font-weight:800;color:#65766f}.cert-delivery-receipt-field-v13 b{font-size:13px;font-weight:900;overflow-wrap:anywhere}.cert-delivery-congrats-v13{position:relative;direction:rtl;text-align:center;margin:14px auto 2px;padding:13px 64px;width:min(720px,96%);border:1.5px solid #d8be71;border-radius:14px;background:linear-gradient(135deg,#fff8df,#f3fbf6 52%,#fff5d2);font-size:22px;font-weight:950;color:#73551a;letter-spacing:normal;word-spacing:normal;unicode-bidi:isolate;box-shadow:inset 0 0 0 3px rgba(255,255,255,.72)}.cert-delivery-congrats-v13:before,.cert-delivery-congrats-v13:after{content:"✦  ❖  ✦";position:absolute;top:50%;transform:translateY(-50%);font-size:13px;color:#b78b2d;white-space:nowrap}.cert-delivery-congrats-v13:before{right:16px}.cert-delivery-congrats-v13:after{left:16px}.cert-delivery-receipt-actions-v13{width:1040px;max-width:96vw;margin:0 auto 18px;display:flex;direction:rtl;gap:8px}.cert-delivery-receipt-actions-v13 button{border:0;border-radius:7px;padding:10px 17px;font:700 13px Tahoma;cursor:pointer}.cert-delivery-receipt-print-v13{background:#155ea8;color:#fff}.cert-delivery-receipt-save-v13{background:#159a55;color:#fff}@media(max-width:760px){.cert-delivery-receipt-grid-v13{grid-template-columns:1fr}.cert-delivery-congrats-v13{padding-left:44px;padding-right:44px;font-size:18px}}@media print{.cert-delivery-receipt-actions-v13{display:none}}
`;}
function certificateDeliveryReceiptBody(receipt){
  const delivery=receipt?.delivery;if(!delivery)return'';
  const receiverType=delivery.receiverType==='agent'?'وكيل الطالب':'الطالب';
  const field=(label,value)=>`<div class="cert-delivery-receipt-field-v13"><small>${label}</small><b>${esc(value||'—')}</b></div>`;
  return`${receiptHeader(receipt)}<div class="cert-delivery-receipt-title-v13">إدارة الشهادات</div><div class="cert-delivery-receipt-subtitle-v13">وصل استلام الشهادة</div><div class="cert-delivery-receipt-grid-v13">${field('اسم الطالب',receipt.studentName)}${field('الشهادة',receipt.specialtyName)}${field('الفرع',receipt.branchName)}${field('المستلم',receiverType)}${field('اسم المستلم',delivery.receiverName)}${field('رقم الهاتف',delivery.receiverPhone||'—')}${field('تاريخ الاستلام',showDate(delivery.date))}${field('وقت الاستلام',delivery.time)}</div><div class="cert-delivery-congrats-v13">ألف ألف مبروك على التخرج</div>`;
}
function certificateDeliveryReceiptDocument(receipt,actions=true,autoPrint=false){
  const data=JSON.stringify(receipt).replace(/</g,'\\u003c');
  return`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>وصل استلام الشهادة ${padReceipt(receipt.receiptNo)}</title><style>${certificateDeliveryReceiptCss()}</style></head><body><div class="cert-paper">${certificateDeliveryReceiptBody(receipt)}</div>${actions?`<div class="cert-delivery-receipt-actions-v13"><button class="cert-delivery-receipt-print-v13" onclick="print()">طباعة</button><button class="cert-delivery-receipt-save-v13" onclick="parent.EFC_SAVE_CERTIFICATE_DELIVERY_PDF_V13(CERT)">حفظ PDF</button></div>`:''}<script>const CERT=${data};${autoPrint?'setTimeout(()=>print(),250);':''}<\/script></body></html>`;
}
function openCertificateDeliveryReceipt(reference,autoPrint=false){
  const receipt=resolveCertificateReceipt(reference);if(!receipt?.delivery)return alert('لا توجد معلومات استلام مسجلة لهذه الشهادة.'),null;
  const modal=document.createElement('div');modal.className='modal receipt-viewer-v13';modal.innerHTML='<div class="receipt-viewer-card-v13"><div class="receipt-viewer-head-v13"><b>وصل استلام الشهادة</b><button class="receipt-viewer-close-v13" type="button" title="إغلاق">×</button></div><iframe class="receipt-viewer-frame-v13" title="وصل استلام الشهادة"></iframe></div>';document.body.appendChild(modal);const frame=modal.querySelector('iframe'),close=()=>modal.remove();modal.querySelector('.receipt-viewer-close-v13').onclick=close;frame.srcdoc=certificateDeliveryReceiptDocument(receipt,true,autoPrint);return{close,frame};
}
async function saveCertificateDeliveryPdf(reference){
  const receipt=resolveCertificateReceipt(reference);if(!receipt?.delivery)return alert('لا توجد معلومات استلام مسجلة لهذه الشهادة.'),null;
  let stage;
  try{
    await Promise.all([loadLocalScript('./vendor/html2canvas.min.js','html2canvas'),loadLocalScript('./vendor/jspdf.umd.min.js','jspdf')]);
    stage=document.createElement('div');stage.style.cssText='position:fixed;left:-16000px;top:0;width:1120px;background:#fff;z-index:-9999;pointer-events:none';stage.innerHTML=`<style>${certificateDeliveryReceiptCss()}</style><div class="cert-paper">${certificateDeliveryReceiptBody(receipt)}</div>`;document.body.appendChild(stage);
    const paper=stage.querySelector('.cert-paper');if(!paper)throw new Error('تعذر العثور على وصل استلام الشهادة.');await waitImages(paper);const canvas=await window.html2canvas(paper,{scale:2,backgroundColor:'#fff',useCORS:false,allowTaint:false,logging:false}),{jsPDF}=window.jspdf,pdf=new jsPDF({orientation:'landscape',unit:'mm',format:'a4'}),pw=pdf.internal.pageSize.getWidth(),ph=pdf.internal.pageSize.getHeight(),ratio=Math.min(pw/canvas.width,ph/canvas.height),width=canvas.width*ratio,height=canvas.height*ratio;pdf.addImage(canvas.toDataURL('image/jpeg',.96),'JPEG',(pw-width)/2,(ph-height)/2,width,height);
    const fileName=`وصل-استلام-الشهادة-${padReceipt(receipt.receiptNo)}.pdf`,buffer=pdf.output('arraybuffer');if(!invoke){pdf.save(fileName);return fileName;}return await invoke('save_receipt_pdf',{fileName,dataBase64:arrayBufferToBase64(buffer)});
  }catch(error){console.error('EFC certificate delivery PDF failed.',error);alert(String(error?.message||error||'تعذر حفظ وصل استلام الشهادة.'));return null;}finally{stage?.remove();}
}

function ensureCertificateDeliveryStyles(){
  if(document.getElementById('efc-certificate-delivery-style'))return;
  const style=document.createElement('style');style.id='efc-certificate-delivery-style';style.textContent=`
.cert-delivery-card{width:min(560px,calc(100vw - 28px))!important}.cert-delivery-card .modal-head{margin-bottom:14px}.cert-delivery-card .cert-delivery-timing{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px}.cert-delivery-card .cert-delivery-timing label,.cert-delivery-card .cert-delivery-form label{display:grid;gap:5px;font-size:10px;font-weight:800;color:#38574e}.cert-delivery-card input,.cert-delivery-card select{width:100%;height:40px;border:1px solid #cfddd8;border-radius:8px;background:#fff;font-family:inherit;padding:7px 10px;box-sizing:border-box}.cert-delivery-card input[readonly]{background:#f6faf8;color:#40544e}.cert-delivery-subject{display:flex!important;align-items:baseline!important;gap:6px!important;margin-top:4px!important}.cert-delivery-subject small{font-size:9px!important;color:#6d7d77!important;font-weight:700!important}.cert-delivery-subject b{font-size:13px!important;color:#183c33!important;font-weight:850!important}.cert-delivery-student{display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:12px;border:1px solid #cfe4dc;border-radius:10px;background:#f1faf6;margin-top:10px}.cert-delivery-student span{display:grid;gap:4px}.cert-delivery-student small{font-size:9px;color:#64756f}.cert-delivery-student b{font-size:12px}.cert-delivery-agent{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px}.cert-delivery-student[hidden],.cert-delivery-agent[hidden]{display:none!important}.cert-delivery-info{display:grid;gap:9px}.cert-delivery-info-row{display:grid;grid-template-columns:130px minmax(0,1fr);gap:10px;padding:9px 11px;border:1px solid #d5e2dd;border-radius:9px;background:#f9fbfa}.cert-delivery-info-row small{color:#687872;font-size:9px}.cert-delivery-info-row b{font-size:12px;word-break:break-word}.cert-delivery-actions{display:flex;gap:8px;justify-content:flex-start;margin-top:14px}.cert-delivery-actions .button{min-width:110px}@media(max-width:620px){.cert-delivery-card .cert-delivery-timing,.cert-delivery-agent,.cert-delivery-student{grid-template-columns:1fr}}
`;document.head.appendChild(style);
}
function certificateDeliveryInfoMarkup(receipt){
  const delivery=receipt?.delivery;if(!delivery)return'';
  return`<div class="cert-delivery-info"><div class="cert-delivery-info-row"><small>تاريخ الاستلام</small><b>${showDate(delivery.date)}</b></div><div class="cert-delivery-info-row"><small>وقت الاستلام</small><b>${esc(delivery.time)}</b></div><div class="cert-delivery-info-row"><small>المستلم</small><b>${delivery.receiverType==='agent'?'وكيل الطالب':'الطالب'}</b></div><div class="cert-delivery-info-row"><small>اسم المستلم</small><b>${esc(delivery.receiverName)}</b></div><div class="cert-delivery-info-row"><small>رقم الهاتف</small><b>${esc(delivery.receiverPhone||'—')}</b></div></div>`;
}
function openCertificateDelivery(reference){
  const receipt=resolveCertificateReceipt(reference);if(!receipt)return alert('تعذر العثور على روسي الشهادة الأصلي.'),false;
  ensureCertificateDeliveryStyles();
  const modal=document.createElement('div');modal.className='modal';const close=()=>modal.remove();
  if(receipt.delivery){
    modal.innerHTML=`<div class="modal-card narrow cert-delivery-card"><div class="modal-head"><div><p>سجل الشهادات</p><h2>معلومات الاستلام</h2><span class="cert-delivery-subject"><small>الطالب</small><b>${esc(receipt.studentName)}</b></span></div><button class="x" type="button">×</button></div>${certificateDeliveryInfoMarkup(receipt)}<div class="cert-delivery-actions"><button type="button" class="button secondary cert-delivery-close">إغلاق</button><button type="button" class="button cert-delivery-receipt-open">روسي الاستلام</button></div></div>`;
    document.body.appendChild(modal);modal.querySelector('.x').onclick=close;modal.querySelector('.cert-delivery-close').onclick=close;modal.querySelector('.cert-delivery-receipt-open').onclick=()=>{close();openCertificateDeliveryReceipt(receipt);};return true;
  }
  if(!canEditCertificates())return alert('الحساب الحالي لا يملك صلاحية تسجيل استلام الشهادات.'),false;
  const deliveryDate=today(),deliveryTime=nowTime();
  modal.innerHTML=`<div class="modal-card narrow cert-delivery-card"><div class="modal-head"><div><p>سجل الشهادات</p><h2>تسجيل استلام الشهادة</h2><span>سجّل الشخص الذي استلم الشهادة فعليًا.</span></div><button class="x" type="button">×</button></div><form class="cert-delivery-form" autocomplete="off"><div class="cert-delivery-timing"><label>التاريخ<input name="date" value="${esc(showDate(deliveryDate))}" readonly></label><label>الوقت<input name="time" value="${esc(deliveryTime)}" readonly></label></div><label>المستلم<select name="receiverType"><option value="" selected>اختر المستلم</option><option value="student">الطالب</option><option value="agent">وكيل الطالب</option></select></label><div class="cert-delivery-student" hidden><span><small>اسم الطالب</small><b>${esc(receipt.studentName||'—')}</b></span><span><small>رقم الهاتف</small><b>${esc(receipt.phone||'—')}</b></span></div><div class="cert-delivery-agent" hidden><label>اسم الوكيل<input name="agentName" maxlength="120" placeholder="اسم الوكيل"></label><label>رقم الوكيل<input name="agentPhone" maxlength="40" inputmode="tel" placeholder="رقم الهاتف"></label></div><div class="cert-delivery-actions"><button type="button" class="button secondary cert-delivery-cancel">إلغاء</button><button class="button cert-delivery-save">حفظ الاستلام</button></div></form></div>`;
  document.body.appendChild(modal);
  const form=modal.querySelector('form'),type=form.elements.receiverType,studentBox=modal.querySelector('.cert-delivery-student'),agentBox=modal.querySelector('.cert-delivery-agent'),saveButton=modal.querySelector('.cert-delivery-save');
  const sync=()=>{const student=type.value==='student',agent=type.value==='agent';studentBox.hidden=!student;agentBox.hidden=!agent;saveButton.disabled=!student&&!agent;};type.addEventListener('change',sync);sync();
  modal.querySelector('.x').onclick=close;modal.querySelector('.cert-delivery-cancel').onclick=close;
  form.onsubmit=async event=>{event.preventDefault();if(certificateDeliverySaveInFlight)return;if(!['student','agent'].includes(type.value))return alert('اختر المستلم.');const agent=type.value==='agent',receiverName=agent?String(form.elements.agentName.value||'').trim():String(receipt.studentName||'').trim(),receiverPhone=agent?String(form.elements.agentPhone.value||'').trim():String(receipt.phone||'').trim();if(!receiverName)return alert(agent?'أدخل اسم الوكيل.':'اسم الطالب غير موجود.');if(agent&&!receiverPhone)return alert('أدخل رقم الوكيل.');const previous=receipt.delivery,delivery={receiverType:agent?'agent':'student',receiverName,receiverPhone,date:deliveryDate,time:deliveryTime,recordedAt:Date.now()};certificateDeliverySaveInFlight=true;saveButton.disabled=true;receipt.delivery=delivery;try{await persist();close();closeCertificateReceiptViewers();if(document.getElementById('certRecordsModeV48'))drawCertificateHistory();openCertificateDeliveryReceipt(receipt);}catch(error){receipt.delivery=previous;writeLocal();console.error('EFC certificate delivery save failed.',error);alert('تعذر حفظ معلومات الاستلام. لم يتم تغيير السجل.');}finally{certificateDeliverySaveInFlight=false;if(saveButton.isConnected)saveButton.disabled=false;}};
  return true;
}

function resolveCertificateReceipt(reference){
  if(!reference)return null;
  const id=String(reference.id||''),recordCode=String(reference.recordCode||''),transactionCode=String(reference.transactionCode||'');
  return state.certificateReceipts.find(item=>(id&&String(item.id)===id)||(recordCode&&String(item.recordCode)===recordCode)||(transactionCode&&String(item.transactionCode)===transactionCode))||null;
}
function editingReceipt(){
  if(!editingReceiptId)return null;
  const receipt=state.certificateReceipts.find(item=>String(item.id)===String(editingReceiptId))||null;
  if(!receipt)editingReceiptId=null;
  return receipt;
}
function assertCertificateReceiptMutable(receipt){
  if(!receipt)return false;
  if(!canEditCertificates()){alert('الحساب الحالي لا يملك صلاحية تعديل الشهادات.');return false;}
  try{window.EFC_FISCAL_V14?.assertDateOpen?.(receipt.date,'تاريخ روسي الشهادة');}
  catch(error){alert(String(error?.message||error||'لا يمكن تعديل هذا الروسي.'));return false;}
  return true;
}
function closeCertificateReceiptViewers(){document.querySelectorAll('.receipt-viewer-v13').forEach(modal=>modal.remove());}
function certificateEditDirty(){
  const receipt=editingReceipt();if(!receipt)return false;
  const amountInput=document.getElementById('certAmountV13'),methodInput=document.getElementById('certMethodV13');if(!amountInput||!methodInput)return false;
  if(Number(amountInput.value||0)!==Number(receipt.amount||0)||String(methodInput.value||'')!==String(receipt.method||''))return true;
  if(receipt.studentType!=='external')return false;
  return String(document.getElementById('certExternalNameV13')?.value||'').trim()!==String(receipt.studentName||'')||String(document.getElementById('certExternalPhoneV13')?.value||'').trim()!==String(receipt.phone||'')||String(document.getElementById('certExternalRegV13')?.value||'').trim()!==String(receipt.reg??'')||String(document.getElementById('certExternalSpecV13')?.value||'')!==String(receipt.specialtyId||'')||String(document.getElementById('certExternalBranchV13')?.value||'')!==String(receipt.branchId||'');
}
function clearCertificateEdit(){editingReceiptId=null;document.body.classList.remove('efc-certificate-editing-v44');}
function cancelCertificateReceiptEdit(){
  if(!editingReceipt())return false;
  if(certificateEditDirty()&&!window.confirm('لديك تعديلات غير محفوظة على روسي الشهادة. هل تريد إلغاءها؟'))return false;
  clearCertificateEdit();renderCertificates();return true;
}
function beginCertificateReceiptEdit(reference){
  const receipt=resolveCertificateReceipt(reference);if(!receipt)return alert('تعذر العثور على روسي الشهادة الأصلي.'),false;
  if(!assertCertificateReceiptMutable(receipt))return false;
  editingReceiptId=receipt.id;mode=receipt.studentType==='external'?'external':'internal';historyOpen=false;closeCertificateReceiptViewers();renderCertificates();return true;
}
async function deleteCertificateReceipt(reference){
  if(receiptDeleteInFlight)return false;
  const receipt=resolveCertificateReceipt(reference);if(!receipt)return alert('تعذر العثور على روسي الشهادة الأصلي.'),false;
  if(!assertCertificateReceiptMutable(receipt))return false;
  const message=`هل تريد حذف روسي الشهادة رقم ${padReceipt(receipt.receiptNo)} للطالب ${receipt.studentName}؟\
سيُحذف المبلغ من مالية الشهادات، ولن يُعاد استخدام رقم الروسي المحذوف.`;
  if(!window.confirm(message))return false;
  const reopenFinance=historyOpen,index=state.certificateReceipts.indexOf(receipt);if(index<0)return false;
  state.nextReceiptNo=Math.max(Number(state.nextReceiptNo||1),Number(receipt.receiptNo||0)+1);
  receiptDeleteInFlight=true;state.certificateReceipts.splice(index,1);writeLocal();
  try{await persist();}
  catch(error){state.certificateReceipts.splice(index,0,receipt);writeLocal();console.error('EFC certificate receipt delete failed.',error);alert('تعذر حذف روسي الشهادة. لم يتم تغيير البيانات.');receiptDeleteInFlight=false;return false;}
  receiptDeleteInFlight=false;if(String(editingReceiptId||'')===String(receipt.id))clearCertificateEdit();closeCertificateReceiptViewers();
  if(typeof currentPage==='undefined'||currentPage==='certificates'){renderCertificates();if(reopenFinance)setHistoryMode(true);}
  return true;
}
function receiptEditStudentMarkup(receipt){
  const reg=receipt.reg===null||receipt.reg===undefined||receipt.reg===''?'—':String(receipt.reg).padStart(4,'0');
  return`<div class="efc-cert-selected-main-v38"><span class="efc-cert-selected-kicker-v38">الطالب المرتبط بالروسي</span><strong>${esc(receipt.studentName||'—')}</strong><div class="efc-cert-selected-facts-v38"><span><small>الهاتف</small><b>${esc(receipt.phone||'—')}</b></span><span><small>رقم السجل</small><b>${esc(reg)}</b></span><span><small>الفرع</small><b>${esc(receipt.branchName||'—')}</b></span><span><small>الشهادة</small><b>${esc(receipt.specialtyName||'—')}</b></span></div></div>`;
}
function ensureCertificateSelectValue(select,value,label=value){
  if(!select)return;const normalized=String(value??'');if(!normalized)return;
  if(![...select.options].some(option=>String(option.value)===normalized))select.add(new Option(String(label||normalized),normalized));
  select.value=normalized;
}
function applyCertificateEditState(receipt){
  if(!receipt)return;
  document.body.classList.add('efc-certificate-editing-v44');
  document.querySelectorAll('.cert-mode-v13 button').forEach(button=>{button.disabled=true;button.classList.toggle('active',button.dataset.mode===mode);});
  if(receipt.studentType==='internal'){
    const pane=document.getElementById('certInternalPaneV13'),search=document.querySelector('.efc-cert-student-search-v38'),filters=document.querySelector('.efc-cert-student-filters-v38'),results=document.getElementById('certStudentResultsV13'),host=document.querySelector('.efc-cert-selected-host-v40');
    pane?.classList.add('efc-cert-edit-pane-v44');search?.classList.add('efc-cert-edit-hidden-v44');filters?.classList.add('efc-cert-edit-hidden-v44');results?.classList.add('efc-cert-edit-hidden-v44');
    if(host){host.hidden=false;host.innerHTML=receiptEditStudentMarkup(receipt);}
  }else{
    const pane=document.getElementById('certExternalPaneV13'),name=document.getElementById('certExternalNameV13'),phone=document.getElementById('certExternalPhoneV13'),reg=document.getElementById('certExternalRegV13'),specialty=document.getElementById('certExternalSpecV13'),branch=document.getElementById('certExternalBranchV13'),addBranch=document.getElementById('certAddBranchV13');
    pane?.classList.add('efc-cert-edit-pane-v44');if(name)name.value=receipt.studentName||'';if(phone)phone.value=receipt.phone||'';if(reg)reg.value=receipt.reg??'';
    ensureCertificateSelectValue(specialty,receipt.specialtyId,receipt.specialtyName);ensureCertificateSelectValue(branch,receipt.branchId,receipt.branchName);if(addBranch)addBranch.hidden=false;syncBranchButtonBusy();
  }
  const amount=document.getElementById('certAmountV13'),method=document.getElementById('certMethodV13'),issue=document.getElementById('certIssueV13');
  if(amount)amount.value=String(receipt.amount||'');ensureCertificateSelectValue(method,receipt.method,`${receipt.method} · محفوظ سابقًا`);if(method)method.value=String(receipt.method||'');if(issue)issue.textContent='حفظ تعديل الروسي';syncIssueButton();
}
function activeCertificateFinanceMode(){return String(document.querySelector('#certFinanceModeV13 [data-mode].active')?.dataset.mode||'daily');}
function syncCertificateFinanceContextFromDay(){
  const day=document.getElementById('certFinanceDayV13'),month=document.getElementById('certFinanceMonthV13'),year=document.getElementById('certFinanceYearV13'),match=String(day?.value||'').match(/^(\d{4})-(\d{2})-(\d{2})$/);if(!match)return;
  ensureCertificateSelectValue(year,match[1],match[1]);if(year)year.value=match[1];if(month)month.value=String(Number(match[2]));
}
function syncCertificateFinanceDayFromContext(){
  const day=document.getElementById('certFinanceDayV13'),month=document.getElementById('certFinanceMonthV13'),year=document.getElementById('certFinanceYearV13');if(!day||!month||!year)return;
  const y=Math.max(1,Number(year.value||today().slice(0,4))),m=Math.max(1,Math.min(12,Number(month.value||today().slice(5,7)))),current=String(day.value||today()),wanted=Math.max(1,Number(current.slice(8,10)||1)),last=new Date(y,m,0).getDate();day.value=`${y}-${pad2(m)}-${pad2(Math.min(wanted,last))}`;
}

function isOperationalStudent(student){return Boolean(student&&student.active!==false&&student.status!=='inactive');}
function syncBranchButtonBusy(){const button=document.getElementById('certAddBranchV13');if(button)button.disabled=branchSaveInFlight||!canEditCertificates();}
function addBranchOption(branch){
  const select=document.getElementById('certExternalBranchV13');if(!select)return;
  let option=[...select.options].find(item=>item.value===branch.id);
  if(!option){option=document.createElement('option');option.value=branch.id;option.textContent=branch.name;select.appendChild(option);}
  select.value=branch.id;
}
async function addBranch(){
  if(branchSaveInFlight)return;
  if(!canEditCertificates())return alert('الحساب الحالي لا يملك صلاحية تعديل الشهادات.');
  const name=String(prompt('اسم فرع الشهادة الجديد:')||'').trim();if(!name)return;
  if(state.certificateBranches.some(item=>item.name.trim().toLowerCase()===name.toLowerCase()))return alert('هذا الفرع موجود مسبقًا.');
  const branch={id:uid('cert-branch'),recordCode:uid('cert-branch-record'),name,createdAt:Date.now()};
  state.certificateBranches.push(branch);branchSaveInFlight=true;syncBranchButtonBusy();
  try{await persist();addBranchOption(branch);}
  catch(error){state.certificateBranches=state.certificateBranches.filter(item=>item.id!==branch.id);writeLocal();console.error('EFC certificate branch save failed.',error);alert('تعذر حفظ فرع الشهادة. لم يتم تغيير البيانات المدخلة.');}
  finally{branchSaveInFlight=false;syncBranchButtonBusy();}
}
function historyRows(receipts=state.certificateReceipts){return[...receipts].sort((a,b)=>b.date.localeCompare(a.date)||Number(b.timestamp)-Number(a.timestamp)).map(receipt=>`<tr class="cert-history-row-v13" data-certificate="${esc(receipt.id)}" data-date="${esc(receipt.date)}"><td>${padReceipt(receipt.receiptNo)}</td><td><b>${esc(receipt.studentName)}</b><small>${esc(receipt.phone||'')}</small></td><td>${receipt.studentType==='internal'?'مسجل':'خارجي'}</td><td>${esc(receipt.branchName)}</td><td>${esc(receipt.specialtyName)}</td><td>${cash(receipt.amount)}</td><td>${esc(receipt.method)}</td><td>${showDate(receipt.date)}</td><td>${receipt.delivery?showDate(receipt.delivery.date):'<span class="cert-delivery-missing">—</span>'}</td></tr>`).join('');}
function renderHistoryRows(receipts=state.certificateReceipts){return historyRows(receipts);}
function bindCertificateHistoryRows(){document.querySelectorAll('.cert-records-card-v47 .cert-history-row-v13').forEach(row=>row.addEventListener('click',()=>{const receipt=state.certificateReceipts.find(item=>item.id===row.dataset.certificate);if(receipt)openReceipt(receipt);}));}
function activeCertificateRecordsMode(){return String(document.querySelector('#certRecordsModeV48 [data-mode].active')?.dataset.mode||'weekly');}
function drawCertificateHistory(){
  const tableBody=document.querySelector('.cert-records-card-v47 tbody');if(!tableBody)return;
  const modeValue=activeCertificateRecordsMode(),day=document.getElementById('certRecordsDayV48')?.value||today(),year=document.getElementById('certRecordsYearV48')?.value||today().slice(0,4),month=document.getElementById('certRecordsMonthV48')?.value||today().slice(5,7),from=document.getElementById('certRecordsFromV48')?.value||today(),to=document.getElementById('certRecordsToV48')?.value||today(),branch=document.getElementById('certRecordsBranchV48')?.value||'',specialty=document.getElementById('certRecordsSpecialtyV48')?.value||'',method=document.getElementById('certRecordsMethodV48')?.value||'',range=certificateFinanceRange(modeValue,year,month,day,from,to);
  const controls=document.querySelector('.cert-records-filters-v48'),dayWrap=document.getElementById('certRecordsDayWrapV48'),fromWrap=document.getElementById('certRecordsFromWrapV48'),toWrap=document.getElementById('certRecordsToWrapV48'),monthWrap=document.getElementById('certRecordsMonthWrapV48'),yearWrap=document.getElementById('certRecordsYearWrapV48');
  if(controls)controls.dataset.mode=modeValue;if(dayWrap)dayWrap.hidden=modeValue!=='daily';if(fromWrap)fromWrap.hidden=modeValue!=='weekly';if(toWrap)toWrap.hidden=modeValue!=='weekly';if(monthWrap)monthWrap.hidden=modeValue!=='monthly';if(yearWrap)yearWrap.hidden=!['monthly','yearly'].includes(modeValue);
  const rows=state.certificateReceipts.filter(receipt=>certificateFilterMatches(receipt,{branch,specialty,method})&&receipt.date>=range.from&&receipt.date<=range.to).sort((a,b)=>b.date.localeCompare(a.date)||String(b.time||'').localeCompare(String(a.time||''))||Number(b.timestamp||0)-Number(a.timestamp||0));
  tableBody.innerHTML=rows.length?renderHistoryRows(rows):'<tr><td colspan="9"><div class="empty">لا توجد نتائج</div></td></tr>';
  const count=document.getElementById('certRecordsCountV48');if(count)count.textContent=String(rows.length);
  const periodDescriptor=modeValue==='weekly'?`في الفترة ${range.label}`:modeValue==='daily'?`يوم ${range.label}`:modeValue==='monthly'?`في شهر ${range.label}`:`في ${range.label}`,branchLabel=branch?String(document.getElementById('certRecordsBranchV48')?.selectedOptions?.[0]?.textContent||'').trim():'',specialtyLabel=specialty?String(document.getElementById('certRecordsSpecialtyV48')?.selectedOptions?.[0]?.textContent||'').trim():'',methodLabel=method?String(document.getElementById('certRecordsMethodV48')?.selectedOptions?.[0]?.textContent||'').trim():'',detailParts=[branchLabel?`من ${branchLabel}`:'',specialtyLabel?`في ${specialtyLabel}`:'',methodLabel?`عبر ${methodLabel}`:''].filter(Boolean),summaryText=`الشهادات ${periodDescriptor}${detailParts.length?` ${detailParts.join(' ')}`:''}`;
  const caption=document.getElementById('certRecordsRangeV48');if(caption)caption.textContent=summaryText;
  bindCertificateHistoryRows();
}
function renderCertificateHistoryPage(){
  resetTransientIssueState();ensureCertificateFinanceStyles();currentPage='certificates';
  document.body.classList.remove('efc-certificate-finance-open-v43','efc-certificate-editing-v44');document.body.classList.add('efc-certificates-redesign-v35','efc-certificates-workspace-v36');
  const date=today(),currentYear=Number(date.slice(0,4)),currentMonth=Number(date.slice(5,7)),financeYears=certificateFinanceYears(),financeBranches=certificateFinanceBranches(),financeSpecialties=certificateFinanceSpecialties(),financeMethods=[...new Set(state.certificateReceipts.map(item=>String(item.method||'').trim()).filter(Boolean))],historyDates=state.certificateReceipts.map(item=>String(item.date||'')).filter(Boolean).sort(),initialFrom=historyDates[0]||date;
  shell(`<section class="cert-records-hero-v47">${HISTORY_ICON}<h1>سجل الشهادات</h1></section><div class="cert-records-summary-row-v49"><div class="cert-records-count-v47"><div class="cert-records-count-line-v48"><small>عدد الشهادات</small><b id="certRecordsCountV48">0</b></div><span id="certRecordsRangeV48">الشهادات في الفترة من ${showDate(initialFrom)} إلى ${showDate(date)}</span></div></div><div class="cert-records-topbar-v47"><button class="button secondary cert-records-back-v47" id="certRecordsBackV47" type="button">${BACK_ICON}<span>العودة للشهادات</span></button></div><div class="card finance-controls cert-records-filters-v48" data-mode="weekly"><div class="segmented cert-records-mode-v48" id="certRecordsModeV48"><button type="button" data-mode="daily">يومي</button><button class="active" type="button" data-mode="weekly">أسبوع</button><button type="button" data-mode="monthly">شهري</button><button type="button" data-mode="yearly">سنوي</button></div><label id="certRecordsDayWrapV48" hidden>اليوم<input class="input" id="certRecordsDayV48" type="date" value="${date}"></label><label id="certRecordsFromWrapV48">من<input class="input" id="certRecordsFromV48" type="date" value="${initialFrom}"></label><label id="certRecordsToWrapV48">إلى<input class="input" id="certRecordsToV48" type="date" value="${date}"></label><label id="certRecordsMonthWrapV48" hidden>الشهر<select id="certRecordsMonthV48">${MONTH_NAMES.map((name,index)=>`<option value="${index+1}" ${index+1===currentMonth?'selected':''}>${name}</option>`).join('')}</select></label><label id="certRecordsYearWrapV48" hidden>السنة<select id="certRecordsYearV48">${financeYears.map(year=>`<option value="${year}" ${year===currentYear?'selected':''}>${year}</option>`).join('')}</select></label><label>الفرع<select id="certRecordsBranchV48"><option value="">كل الفروع</option>${financeBranches.map(([key,label])=>`<option value="${esc(key)}">${esc(label)}</option>`).join('')}</select></label><label class="cert-records-specialty-v48">الشهادة<select id="certRecordsSpecialtyV48"><option value="">كل الشهادات</option>${financeSpecialties.map(([key,label])=>`<option value="${esc(key)}">${esc(label)}</option>`).join('')}</select></label><label>وسيلة الدفع<select id="certRecordsMethodV48"><option value="">كل وسائل الدفع</option>${financeMethods.map(value=>`<option>${esc(value)}</option>`).join('')}</select></label></div><div class="card cert-records-card-v47">${table(['رقم الروسي','الطالب','النوع','الفرع','الشهادة','المبلغ','الوسيلة','التاريخ','تاريخ الاستلام'],'')}</div>`);
  document.getElementById('certRecordsBackV47')?.addEventListener('click',renderCertificates);
  document.querySelectorAll('#certRecordsModeV48 [data-mode]').forEach(button=>button.addEventListener('click',()=>{document.querySelectorAll('#certRecordsModeV48 [data-mode]').forEach(item=>item.classList.toggle('active',item===button));drawCertificateHistory();}));
  ['certRecordsDayV48','certRecordsFromV48','certRecordsToV48','certRecordsMonthV48','certRecordsYearV48','certRecordsBranchV48','certRecordsSpecialtyV48','certRecordsMethodV48'].forEach(id=>document.getElementById(id)?.addEventListener('change',drawCertificateHistory));
  drawCertificateHistory();
}
function syncIssueButton(){const issue=document.getElementById('certIssueV13'),editing=Boolean(editingReceipt());if(issue)issue.disabled=issueInFlight||!canEditCertificates()||(!editing&&mode==='internal'&&!selectedStudentId);}
function selectedStudent(){const student=students.find(item=>String(item.id)===String(selectedStudentId));if(!isOperationalStudent(student))selectedStudentId=null;return isOperationalStudent(student)?student:null;}
function selectedStudentMarkup(student){const reg=String(student.reg??'').padStart(4,'0');return`<div class="efc-cert-selected-main-v38"><span class="efc-cert-selected-kicker-v38">الطالب المختار</span><strong>${esc(student.name||'—')}</strong><div class="efc-cert-selected-facts-v38"><span><small>الهاتف</small><b>${esc(student.phone||'—')}</b></span><span><small>رقم السجل</small><b>${esc(reg)}</b></span><span><small>الفرع</small><b>${esc(branchName(student.branch))}</b></span><span><small>الشهادة</small><b>${esc(spec(student.specialty)?.name||student.specialty||'—')}</b></span></div></div><button type="button" class="efc-cert-cancel-student-v38" aria-label="إلغاء اختيار الطالب">${X_ICON}<span>إلغاء الاختيار</span></button>`;}
function selectStudent(id){const student=students.find(item=>String(item.id)===String(id));selectedStudentId=isOperationalStudent(student)?String(student.id):null;renderStudentPicker();}
function clearStudentSelection(){selectedStudentId=null;renderStudentPicker();}
function resetTransientIssueState(){selectedStudentId=null;historyOpen=false;}
function renderStudentPicker(){
  if(editingReceipt())return;
  const root=document.getElementById('certStudentResultsV13'),host=document.querySelector('.efc-cert-selected-host-v40'),filters=document.querySelector('.efc-cert-student-filters-v38');
  if(!root||!host||!filters)return;
  const branch=document.getElementById('certInternalBranchV13')?.value||'',specialty=document.getElementById('certInternalSpecV13')?.value||'',query=String(document.getElementById('certStudentSearchV13')?.value||'').trim().toLowerCase();
  const student=selectedStudent(),matches=query?students.filter(item=>isOperationalStudent(item)&&(!branch||item.branch===branch)&&(!specialty||item.specialty===specialty)&&(String(item.name||'').toLowerCase().includes(query)||String(item.phone||'').includes(query)||String(item.reg||'').includes(query))).slice(0,30):[];
  root.innerHTML=!query?'<div class="cert-empty-v13">اكتب الاسم أو الهاتف أو رقم السجل، ويمكنك استخدام الفرع والشهادة فقط لتضييق النتائج.</div>':matches.length?matches.map(item=>`<button class="cert-student-option-v13${String(student?.id)===String(item.id)?' is-selected':''}" data-student="${esc(item.id)}" type="button" aria-pressed="${String(student?.id)===String(item.id)?'true':'false'}"><b>${esc(item.name)}</b><span>${esc(item.phone||'—')} · سجل ${String(item.reg??'').padStart(4,'0')} · ${esc(branchName(item.branch))} · ${esc(spec(item.specialty)?.name||item.specialty||'—')}</span></button>`).join(''):'<div class="cert-empty-v13">لا يوجد طالب مطابق.</div>';
  root.querySelectorAll('[data-student]').forEach(button=>button.addEventListener('click',()=>selectStudent(button.dataset.student)));
  const pane=document.getElementById('certInternalPaneV13');pane?.classList.toggle('efc-cert-has-selected-v38',Boolean(student));
  filters.hidden=Boolean(student);
  host.hidden=!student;
  host.innerHTML=student?selectedStudentMarkup(student):'';
  host.querySelector('.efc-cert-cancel-student-v38')?.addEventListener('click',clearStudentSelection);
  syncIssueButton();
}
function placePaymentControls(){
  const form=document.querySelector('.cert-form-v13'),pane=document.getElementById('certInternalPaneV13'),anchor=document.querySelector('.efc-cert-payment-anchor-v40'),payment=document.querySelector('.cert-payment-v13'),issue=document.getElementById('certIssueV13');
  if(!form||!pane||!anchor||!payment||!issue)return;
  if(mode==='internal'){payment.classList.add('efc-cert-internal-payment-v40');issue.classList.add('efc-cert-internal-issue-v40');pane.append(payment,issue);}
  else{payment.classList.remove('efc-cert-internal-payment-v40');issue.classList.remove('efc-cert-internal-issue-v40');anchor.after(payment);payment.after(issue);}
}
function switchMode(next){
  mode=next==='external'?'external':'internal';
  document.querySelectorAll('.cert-mode-v13 button').forEach(button=>button.classList.toggle('active',button.dataset.mode===mode));
  const internal=document.getElementById('certInternalPaneV13'),external=document.getElementById('certExternalPaneV13');
  if(internal)internal.hidden=historyOpen||mode!=='internal';if(external)external.hidden=historyOpen||mode==='internal';
  placePaymentControls();
  const payment=document.querySelector('.cert-payment-v13'),issue=document.getElementById('certIssueV13');if(payment)payment.hidden=historyOpen;if(issue)issue.hidden=historyOpen;
  syncIssueButton();syncBranchButtonBusy();
}

function certificateBranchKey(receipt){return`${receipt?.branchType==='certificate'?'certificate':'internal'}:${String(receipt?.branchId||receipt?.branchName||'')}`;}
function certificateSpecialtyKey(receipt){return String(receipt?.specialtyId||receipt?.specialtyName||'').trim();}
function certificateFinanceYears(){const shared=window.EFC_FINANCE_PRESENTATION_V13?.financialYears?.();if(Array.isArray(shared)&&shared.length)return shared;const current=Math.max(2025,Number(today().slice(0,4))),start=current-2025+1<=10?2025:current-9;return Array.from({length:current-start+1},(_,index)=>current-index);}
function certificateFinanceBranches(){const map=new Map();state.certificateReceipts.forEach(receipt=>{const key=certificateBranchKey(receipt),label=String(receipt.branchName||'—');if(key&&!map.has(key))map.set(key,label);});return[...map.entries()].sort((a,b)=>a[1].localeCompare(b[1],'ar'));}
function certificateFinanceSpecialties(){const map=new Map();state.certificateReceipts.forEach(receipt=>{const key=certificateSpecialtyKey(receipt),label=String(receipt.specialtyName||spec(receipt.specialtyId)?.name||receipt.specialtyId||'—');if(key&&!map.has(key))map.set(key,label);});return[...map.entries()].sort((a,b)=>a[1].localeCompare(b[1],'ar'));}
function certificateFilterMatches(receipt,{branch='',specialty='',method=''}={}){return(!branch||certificateBranchKey(receipt)===branch)&&(!specialty||certificateSpecialtyKey(receipt)===specialty)&&(!method||String(receipt.method||'')===method);}
function certificateFinanceRange(modeValue,yearValue,monthValue,dayValue,fromValue='',toValue=''){
  const financeMode=['daily','weekly','monthly','yearly'].includes(modeValue)?modeValue:'daily',year=Number(yearValue||today().slice(0,4)),month=Math.max(1,Math.min(12,Number(monthValue||today().slice(5,7))));
  if(financeMode==='daily'){const day=String(dayValue||today());return{from:day,to:day,label:showDate(day)};}
  if(financeMode==='weekly'){const first=String(fromValue||dayValue||today()),last=String(toValue||fromValue||dayValue||today()),from=first<=last?first:last,to=first<=last?last:first;return{from,to,label:`من ${showDate(from)} إلى ${showDate(to)}`};}
  if(financeMode==='monthly'){const last=new Date(year,month,0).getDate();return{from:`${year}-${pad2(month)}-01`,to:`${year}-${pad2(month)}-${pad2(last)}`,label:`${MONTH_NAMES[month-1]} ${year}`};}
  return{from:`${year}-01-01`,to:`${year}-12-31`,label:`سنة ${year}`};
}
function certificateFinanceSeries(rows,modeValue,yearValue,monthValue,dayValue){
  const now=today(),currentYear=Number(now.slice(0,4)),currentMonth=Number(now.slice(5,7)),currentDay=Number(now.slice(8,10)),year=Number(yearValue||currentYear),month=Number(monthValue||currentMonth),day=String(dayValue||now);
  if(modeValue==='daily'){
    const selectedToday=day===now,limit=selectedToday?new Date().getHours():23;
    return Array.from({length:limit+1},(_,hour)=>{const hh=pad2(hour);return{label:`${hh}:00`,value:rows.filter(row=>String(row.time||'').startsWith(`${hh}:`)).reduce((sum,row)=>sum+Number(row.amount||0),0)};});
  }
  if(modeValue==='monthly'){
    const last=new Date(year,month,0).getDate(),limit=year===currentYear&&month===currentMonth?Math.min(last,currentDay):last;
    return Array.from({length:Math.max(0,limit)},(_,index)=>{const d=index+1,date=`${year}-${pad2(month)}-${pad2(d)}`;return{label:String(d),value:rows.filter(row=>row.date===date).reduce((sum,row)=>sum+Number(row.amount||0),0)};});
  }
  const limit=year===currentYear?currentMonth:12;
  return Array.from({length:Math.max(0,limit)},(_,index)=>{const m=index+1,prefix=`${year}-${pad2(m)}`;return{label:MONTH_NAMES[index],value:rows.filter(row=>String(row.date||'').startsWith(prefix)).reduce((sum,row)=>sum+Number(row.amount||0),0)};});
}
function certificateFinanceBreakdown(rows,keyFn,total){const map=new Map();rows.forEach(row=>{const key=String(keyFn(row)||'—');map.set(key,(map.get(key)||0)+Number(row.amount||0));});const items=[...map.entries()].sort((a,b)=>b[1]-a[1]);if(!items.length)return'<div class="empty small">لا توجد بيانات</div>';return items.map(([name,value])=>{const pct=total?value/total*100:0;return`<div class="break-row"><span><b class="pct-v13">${pct>=10?pct.toFixed(0):pct.toFixed(1)}%</b> ${esc(name)}</span><b>${cash(value)}</b><div><i style="width:${Math.max(0,Math.min(100,pct))}%"></i></div></div>`;}).join('');}
function ensureCertificateFinanceStyles(){
  if(document.getElementById('efc-certificate-finance-style-v44'))return;
  const style=document.createElement('style');style.id='efc-certificate-finance-style-v44';style.textContent=`
html body.efc-certificate-finance-open-v43 .content:has(.cert-form-v13[data-efc-history-open-v36="1"]){width:min(900px,calc(100% - 24px))!important;max-width:900px!important;min-width:0!important;margin:0 12px 0 auto!important;padding:12px 0 20px!important;box-sizing:border-box!important;overflow:visible!important;transform:none!important}
html body.efc-certificate-finance-open-v43 .content:has(.cert-form-v13[data-efc-history-open-v36="1"])>.page-title{display:none!important}
html body.efc-certificate-finance-open-v43 .cert-form-v13[data-efc-history-open-v36="1"],html body.efc-certificate-finance-open-v43 .cert-form-v13>.cert-finance-v13{width:100%!important;max-width:100%!important;min-width:0!important;margin:0!important;padding:0!important;border:0!important;background:transparent!important;box-shadow:none!important}
html body.efc-certificate-finance-open-v43 .cert-form-v13[data-efc-history-open-v36="1"]>.efc-cert-workspace-toolbar-v36{display:none!important}
html body.efc-certificate-finance-open-v43 .cert-finance-v13 .finance-hero-v13{width:min(470px,100%)!important;max-width:470px!important;min-width:0!important;height:76px!important;margin:0 auto 12px!important}
html body.efc-certificate-finance-open-v43 .cert-finance-topbar-v43{width:100%!important;display:flex!important;align-items:center!important;justify-content:space-between!important;gap:12px!important;margin:0 0 10px!important;direction:ltr!important}
html body.efc-certificate-finance-open-v43 .cert-finance-back-v43{height:36px!important;padding:0 14px!important;border-radius:9px!important;box-shadow:0 6px 14px rgba(8,99,79,.07)!important;display:inline-flex!important;align-items:center!important;gap:7px!important;direction:rtl!important}.cert-finance-back-v43 svg{width:16px;height:16px}
html body.efc-certificate-finance-open-v43 .cert-finance-switch-v43{display:flex!important;justify-content:flex-start!important;direction:rtl!important;gap:7px!important;width:max-content!important;margin:0!important;padding:0!important}
html body.efc-certificate-finance-open-v43 .cert-finance-summary-row-v49{width:100%!important;display:flex!important;align-items:center!important;justify-content:center!important;margin:0 0 16px!important;direction:rtl!important}
html body.efc-certificate-finance-open-v43 .cert-finance-summary-row-v49>.cert-finance-primary-summary-v45{width:min(330px,100%)!important;min-width:0!important;max-width:330px!important;margin:0!important;direction:rtl!important}
html body.efc-certificate-finance-open-v43 .cert-finance-switch-v43 button{height:36px!important;min-width:112px!important;padding:0 18px!important;border:1px solid #08634f!important;border-radius:9px!important;background:linear-gradient(180deg,#0b775f,#08634f)!important;color:#fff!important;font-family:inherit!important;font-size:12px!important;font-weight:760!important;box-shadow:0 7px 16px rgba(8,99,79,.15)!important}html body.efc-certificate-finance-open-v43 #certManagerReceiptV22{border-color:#234f7b!important;background:linear-gradient(180deg,#376f9f,#28567f)!important;box-shadow:0 7px 16px rgba(35,79,123,.18)!important}
html body.efc-certificate-finance-open-v43 .cert-finance-controls-v13{width:100%!important;max-width:100%!important;min-width:0!important;margin:0 0 8px!important;padding:9px 12px 10px!important;column-gap:8px!important;row-gap:8px!important;align-items:end!important;border:1.4px solid #4aa68c!important;border-radius:13px!important;background:linear-gradient(135deg,rgba(239,251,247,.98),rgba(252,255,254,.99))!important;box-shadow:0 9px 25px rgba(22,83,64,.04)!important;display:grid!important;box-sizing:border-box!important}
html body.efc-certificate-finance-open-v43 .cert-finance-controls-v13[data-mode="daily"]{grid-template-columns:148px 124px 102px 140px 116px!important;justify-content:start!important}
html body.efc-certificate-finance-open-v43 .cert-finance-controls-v13[data-mode="weekly"]{grid-template-columns:148px 124px 124px 102px 140px 116px!important;justify-content:start!important}
html body.efc-certificate-finance-open-v43 .cert-finance-controls-v13[data-mode="monthly"]{grid-template-columns:148px 88px 68px 102px 140px 116px!important;justify-content:start!important}
html body.efc-certificate-finance-open-v43 .cert-finance-controls-v13[data-mode="yearly"]{grid-template-columns:148px 68px 102px 140px 116px!important;justify-content:start!important}
html body.efc-certificate-finance-open-v43 .cert-finance-specialty-v46{width:140px!important;max-width:140px!important}
html body.efc-certificate-finance-open-v43 .cert-finance-controls-v13 label{margin:0!important;gap:4px!important;min-width:0!important;color:#294d43!important;font-size:9px!important;font-weight:760!important}
html body.efc-certificate-finance-open-v43 .cert-finance-controls-v13 label[hidden]{display:none!important}
html body.efc-certificate-finance-open-v43 .cert-finance-controls-v13 input,html body.efc-certificate-finance-open-v43 .cert-finance-controls-v13 select{width:100%!important;min-width:0!important;height:38px!important;min-height:38px!important;border:1px solid #cfddd8!important;border-radius:8px!important;background:#fff!important;color:#162721!important;font-family:inherit!important;font-size:11.5px!important;padding:7px 8px!important;box-shadow:none!important}
html body.efc-certificate-finance-open-v43 .cert-finance-controls-v13 input:focus,html body.efc-certificate-finance-open-v43 .cert-finance-controls-v13 select:focus{border-color:#1b8c70!important;box-shadow:0 0 0 3px rgba(27,140,112,.09)!important;outline:none!important}
html body.efc-certificate-finance-open-v43 #certFinanceModeV13{width:100%!important;max-width:100%!important;min-width:0!important;height:34px!important;display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:3px!important;padding:3px!important;margin:0!important;border:1px solid #c9ddd6!important;border-radius:11px!important;background:#e9f4f0!important;box-shadow:inset 0 1px 0 #ffffffb8!important;box-sizing:border-box!important;justify-self:stretch!important;align-self:end!important}
html body.efc-certificate-finance-open-v43 #certFinanceModeV13 button{width:100%!important;height:26px!important;min-width:0!important;max-width:100%!important;border:1px solid transparent!important;border-radius:8px!important;background:transparent!important;color:#58746b!important;font-family:inherit!important;font-size:9.5px!important;font-weight:780!important;cursor:pointer!important;transition:all .14s ease!important;padding:0 4px!important;overflow:hidden!important;white-space:nowrap!important}
html body.efc-certificate-finance-open-v43 #certFinanceModeV13 button[data-mode="daily"]{background:linear-gradient(180deg,#f6fbff,#eef8fb)!important}html body.efc-certificate-finance-open-v43 #certFinanceModeV13 button[data-mode="weekly"]{background:linear-gradient(180deg,#f7f4ff,#f0ecfb)!important}html body.efc-certificate-finance-open-v43 #certFinanceModeV13 button[data-mode="monthly"]{background:linear-gradient(180deg,#f1fbf7,#e7f6ef)!important}html body.efc-certificate-finance-open-v43 #certFinanceModeV13 button[data-mode="yearly"]{background:linear-gradient(180deg,#fffaf0,#fbf3e5)!important}
html body.efc-certificate-finance-open-v43 #certFinanceModeV13 button.active{background:linear-gradient(180deg,#0b7b62,#08624f)!important;border-color:#08624f!important;color:#fff!important;box-shadow:0 5px 12px rgba(8,98,79,.16)!important}
html body.efc-certificate-finance-open-v43 .cert-finance-summary-card-v43{min-height:46px!important;padding:5px 10px!important;border:1px solid #9bd7bd!important;border-radius:10px!important;background:linear-gradient(135deg,#dff7e8 0%,#c9efda 100%)!important;box-shadow:0 6px 15px rgba(16,112,77,.08)!important;display:flex!important;flex-direction:column!important;justify-content:center!important;gap:1px!important}
html body.efc-certificate-finance-open-v43 .cert-finance-summary-card-v43 .finance-kpi-line-v13{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:8px!important}.cert-finance-summary-card-v43 small{font-size:10px!important;color:#2f4c43!important;font-weight:800!important}.cert-finance-summary-card-v43 b{font-size:15px!important;line-height:1.1!important;color:#111d19!important;white-space:nowrap!important}.cert-finance-summary-card-v43>span{display:block!important;margin-top:2px!important;font-size:8.5px!important;line-height:1.35!important;color:#657a73!important;white-space:normal!important}
html body.efc-certificate-finance-open-v43 #certFinanceBodyV13>.chart-card{width:100%!important;margin:0 0 8px!important;padding:5px 10px 3px!important;border:1px solid #d8e5e0!important;border-radius:13px!important;background:#fff!important;box-shadow:0 8px 20px rgba(22,75,61,.035)!important;box-sizing:border-box!important}.cert-finance-v13 .finance-chart-wrap-v13{width:100%!important;overflow:hidden!important}.cert-finance-v13 .finance-chart-wrap-v13 svg{display:block!important;width:100%!important;height:auto!important;max-height:205px!important}.cert-finance-v13 .finance-gridline-v13{stroke:#dbe6e2!important}.cert-finance-v13 .finance-line-v13{stroke:#08745b!important;stroke-width:3!important}.cert-finance-v13 .finance-dot-v13{stroke:#08745b!important;fill:#fff!important}
html body.efc-certificate-finance-open-v43 #certFinanceBodyV13>.breakdowns{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:10px!important;margin:0 0 8px!important}html body.efc-certificate-finance-open-v43 #certFinanceBodyV13>.breakdowns>.card{min-width:0!important;min-height:96px!important;margin:0!important;padding:9px 13px!important;border-radius:12px!important;box-shadow:0 7px 18px rgba(22,75,61,.035)!important}.cert-finance-v13 #certFinanceBodyV13>.breakdowns>.card:nth-child(1){background:linear-gradient(135deg,#eef9fb,#e8f5f2)!important;border:1px solid #b9ddd5!important}.cert-finance-v13 #certFinanceBodyV13>.breakdowns>.card:nth-child(2){background:linear-gradient(135deg,#fff9ed,#fff3df)!important;border:1px solid #ecdcb7!important}.cert-finance-v13 #certFinanceBodyV13>.breakdowns>.card:nth-child(3){background:linear-gradient(135deg,#eef5ff,#e8f1fb)!important;border:1px solid #cadced!important}.cert-finance-v13 #certFinanceBodyV13>.breakdowns h3{margin:0 0 8px!important;font-size:11.5px!important;color:#173d34!important}.cert-finance-v13 .break-row{grid-template-columns:minmax(0,1fr) auto!important;gap:3px 9px!important;margin:0 0 6px!important;font-size:9.5px!important}.cert-finance-v13 .break-row>span{min-width:0!important;overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important}.cert-finance-v13 .break-row>div{grid-column:1/-1!important;height:4px!important;border-radius:99px!important;background:#dfe8e4!important;overflow:hidden!important}.cert-finance-v13 .break-row>div>i{height:100%!important;border-radius:99px!important;background:#159577!important}
html body.efc-certificate-finance-open-v43 #certFinanceBodyV13>.table-wrap{width:100%!important;max-width:100%!important;min-width:0!important;max-height:min(430px,calc(100dvh - 310px))!important;overflow:auto!important;border:1.2px solid #aaccc1!important;border-radius:10px!important;background:#fff!important}html body.efc-certificate-finance-open-v43 #certFinanceBodyV13>.table-wrap th{position:sticky!important;top:0!important;z-index:2!important;height:38px!important;background:linear-gradient(180deg,#0a715b,#075846)!important;color:#fff!important;font-size:10px!important}html body.efc-certificate-finance-open-v43 #certFinanceBodyV13>.table-wrap td{height:35px!important;padding:6px 9px!important;font-size:10px!important}
html body.efc-certificate-editing-v44 .efc-cert-edit-hidden-v44{display:none!important}
html body.efc-certificate-editing-v44 .cert-mode-v13 button:disabled{opacity:.68!important;cursor:default!important}
html body.efc-certificate-editing-v44 .efc-cert-cancel-edit-v44{height:40px!important;min-width:142px!important;padding:0 14px!important;border:1px solid #9c7777!important;border-radius:8px!important;background:#fff!important;color:#8b3030!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;gap:8px!important;font-family:inherit!important;font-size:12px!important;font-weight:850!important;cursor:pointer!important}
html body.efc-certificate-editing-v44 .efc-cert-cancel-edit-v44:hover{background:#fff1f1!important;border-color:#8c3a3a!important}html body.efc-certificate-editing-v44 .efc-cert-cancel-edit-v44 svg{width:20px!important;height:20px!important}
html body.efc-certificate-editing-v44 #certInternalPaneV13.efc-cert-edit-pane-v44{display:grid!important;grid-template-columns:1fr!important;grid-template-rows:auto auto auto!important;min-height:0!important;gap:11px!important;direction:rtl!important}
html body.efc-certificate-editing-v44 #certInternalPaneV13 .efc-cert-selected-host-v40{grid-column:1!important;grid-row:1!important;min-height:0!important}
html body.efc-certificate-editing-v44 #certInternalPaneV13>.cert-payment-v13.efc-cert-internal-payment-v40{grid-column:1!important;grid-row:2!important;width:100%!important}
html body.efc-certificate-editing-v44 #certInternalPaneV13>#certIssueV13.efc-cert-internal-issue-v40{grid-column:1!important;grid-row:3!important;width:100%!important}
html body.efc-certificate-editing-v44 #certExternalPaneV13 input[readonly],html body.efc-certificate-editing-v44 #certExternalPaneV13 select:disabled{background:#f5faf8!important;color:#465f57!important;opacity:1!important;cursor:default!important}
html body .content:has(.cert-records-card-v47){width:min(900px,calc(100% - 24px))!important;max-width:900px!important;min-width:0!important;margin:0 12px 0 auto!important;padding:12px 0 20px!important;box-sizing:border-box!important;overflow:visible!important}
html body .content:has(.cert-records-card-v47) .cert-records-hero-v47{width:min(470px,100%)!important;height:76px!important;margin:0 auto 12px!important;border-radius:15px!important;background:linear-gradient(110deg,#dcf6ee 0%,#e8faf5 68%,#e4f7f2 100%)!important;display:flex!important;align-items:center!important;justify-content:center!important;gap:20px!important;color:#073f35!important;box-shadow:0 9px 24px rgba(17,89,70,.045)!important;position:relative!important}
html body .content:has(.cert-records-card-v47) .cert-records-hero-v47::after{content:""!important;position:absolute!important;bottom:10px!important;left:50%!important;width:48px!important;height:3px!important;border-radius:99px!important;background:#0b7b62!important;transform:translateX(-50%)!important}
html body .content:has(.cert-records-card-v47) .cert-records-hero-v47 svg{width:39px!important;height:39px!important;flex:0 0 39px!important}html body .content:has(.cert-records-card-v47) .cert-records-hero-v47 h1{margin:0!important;font-size:31px!important;font-weight:850!important}
html body .content:has(.cert-records-card-v47) .cert-records-summary-row-v49{width:100%!important;display:flex!important;align-items:center!important;justify-content:center!important;margin:0 0 8px!important;direction:rtl!important}
html body .content:has(.cert-records-card-v47) .cert-records-topbar-v47{display:flex!important;align-items:center!important;justify-content:flex-start!important;gap:12px!important;margin:0 0 8px!important;direction:rtl!important}
html body .content:has(.cert-records-card-v47) .cert-records-back-v47{height:36px!important;padding:0 14px!important;border-radius:9px!important;display:inline-flex!important;align-items:center!important;gap:7px!important}html body .content:has(.cert-records-card-v47) .cert-records-back-v47 svg{width:16px!important;height:16px!important}
html body .content:has(.cert-records-card-v47) .cert-records-count-v47{width:min(380px,100%)!important;min-width:0!important;max-width:380px!important;min-height:52px!important;height:auto!important;padding:7px 12px!important;border:1px solid #b9ddd5!important;border-radius:10px!important;background:linear-gradient(135deg,#eef9fb,#e8f5f2)!important;box-shadow:0 6px 15px rgba(16,112,77,.06)!important;display:flex!important;flex-direction:column!important;justify-content:center!important;align-items:stretch!important;gap:2px!important;direction:rtl!important}
html body .content:has(.cert-records-card-v47) .cert-records-count-line-v48{width:100%!important;display:flex!important;align-items:center!important;justify-content:space-between!important;gap:8px!important}html body .content:has(.cert-records-card-v47) .cert-records-count-v47 small{font-size:10px!important;font-weight:800!important;color:#35564d!important}html body .content:has(.cert-records-card-v47) .cert-records-count-v47 b{font-size:17px!important;line-height:1.1!important;color:#0a5f4d!important;white-space:nowrap!important}html body .content:has(.cert-records-card-v47) .cert-records-count-v47>span{font-size:8.5px!important;font-weight:700!important;line-height:1.35!important;color:#5f766e!important;white-space:normal!important;overflow-wrap:anywhere!important}
html body .content:has(.cert-records-card-v47) .cert-records-filters-v48{width:100%!important;max-width:100%!important;min-width:0!important;margin:0 0 8px!important;padding:8px 12px!important;gap:8px!important;align-items:end!important;border:1.4px solid #4aa68c!important;border-radius:13px!important;background:linear-gradient(135deg,rgba(239,251,247,.98),rgba(252,255,254,.99))!important;box-shadow:0 9px 25px rgba(22,83,64,.04)!important}
html body .content:has(.cert-records-card-v47) .cert-records-filters-v48[data-mode="daily"]{grid-template-columns:154px 154px 110px 158px 120px!important;justify-content:start!important}
html body .content:has(.cert-records-card-v47) .cert-records-filters-v48[data-mode="weekly"]{grid-template-columns:154px 145px 145px 110px 158px 120px!important;justify-content:start!important}
html body .content:has(.cert-records-card-v47) .cert-records-filters-v48[data-mode="monthly"]{grid-template-columns:154px 96px 78px 110px 158px 120px!important;justify-content:start!important}
html body .content:has(.cert-records-card-v47) .cert-records-filters-v48[data-mode="yearly"]{grid-template-columns:154px 84px 110px 158px 120px!important;justify-content:start!important}
html body .content:has(.cert-records-card-v47) .cert-records-filters-v48 label{margin:0!important;gap:5px!important;min-width:0!important;color:#294d43!important;font-size:9px!important;font-weight:760!important}html body .content:has(.cert-records-card-v47) .cert-records-filters-v48 label[hidden]{display:none!important}
html body .content:has(.cert-records-card-v47) .cert-records-filters-v48 input,html body .content:has(.cert-records-card-v47) .cert-records-filters-v48 select{width:100%!important;min-width:0!important;height:38px!important;border:1px solid #cfddd8!important;border-radius:8px!important;background:#fff!important;color:#162721!important;font-family:inherit!important;font-size:11.5px!important;padding:7px 8px!important;box-shadow:none!important}
html body .content:has(.cert-records-card-v47) #certRecordsModeV48{width:100%!important;max-width:100%!important;min-width:0!important;height:34px!important;display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:3px!important;padding:3px!important;margin:0!important;border:1px solid #c9ddd6!important;border-radius:11px!important;background:#e9f4f0!important;box-sizing:border-box!important;justify-self:stretch!important;align-self:end!important}
html body .content:has(.cert-records-card-v47) #certRecordsModeV48 button{height:26px!important;min-width:0!important;padding:0 6px!important;border:1px solid transparent!important;border-radius:8px!important;background:transparent!important;color:#58746b!important;font-family:inherit!important;font-size:9.5px!important;font-weight:780!important;cursor:pointer!important}html body .content:has(.cert-records-card-v47) #certRecordsModeV48 button.active{background:linear-gradient(180deg,#0b7b62,#08624f)!important;border-color:#08624f!important;color:#fff!important;box-shadow:0 5px 12px rgba(8,98,79,.16)!important}
html body .content:has(.cert-records-card-v47) .cert-records-specialty-v48{width:158px!important;max-width:158px!important}
html body .content:has(.cert-records-card-v47) .cert-records-card-v47{padding:0!important;border:1.35px solid #1d2824!important;border-radius:9px!important;overflow:hidden!important;background:#fff!important}
html body .content:has(.cert-records-card-v47) .cert-records-card-v47 .table-wrap{max-height:min(520px,calc(100dvh - 300px))!important;overflow:auto!important;border:0!important;border-radius:0!important}
html body .content:has(.cert-records-card-v47) .cert-records-card-v47 table{min-width:900px!important;width:100%!important;border-collapse:collapse!important;background:#fff!important}
html body .content:has(.cert-records-card-v47) .cert-records-card-v47 th,html body .content:has(.cert-records-card-v47) .cert-records-card-v47 td{border:1px solid #202825!important;text-align:center!important}
html body .content:has(.cert-records-card-v47) .cert-records-card-v47 th{position:sticky!important;top:0!important;z-index:2!important;height:39px!important;padding:7px 9px!important;background:linear-gradient(180deg,#0a715b,#075846)!important;color:#fff!important;font-size:10px!important;font-weight:850!important}
html body .content:has(.cert-records-card-v47) .cert-records-card-v47 td{height:37px!important;padding:6px 9px!important;background:#fff!important;color:#16211d!important;font-size:10px!important}
html body .content:has(.cert-records-card-v47) .cert-records-card-v47 tbody tr{cursor:pointer!important}html body .content:has(.cert-records-card-v47) .cert-records-card-v47 tbody tr:hover td{background:#eef8f4!important}html body .content:has(.cert-records-card-v47) .cert-delivery-missing{display:inline-block!important;font-size:18px!important;font-weight:900!important;line-height:1!important;color:#8a9692!important}
@media(max-width:1180px){
  html body.efc-certificates-workspace-v36 .shell.shell-v13 main>.content{width:min(900px,calc(100% - 24px))!important;max-width:900px!important;min-width:0!important;margin:0 12px 0 auto!important;transform:none!important;transform-origin:top right!important}
  html body.efc-certificates-workspace-v36 .cert-layout-v13,html body.efc-certificates-workspace-v36 .cert-form-v13,html body.efc-certificates-workspace-v36 .cert-history-v13{width:100%!important;max-width:100%!important;min-width:0!important}
  html body.efc-certificates-workspace-v36 .page-title,html body.efc-certificates-workspace-v36 .page-title.efc-cert-hero-v35{width:min(470px,100%)!important;max-width:470px!important;min-width:0!important}
}
@media(max-width:1100px){
  html body .content:has(.cert-records-card-v47) .cert-records-filters-v48[data-mode]{grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:8px!important}
  html body .content:has(.cert-records-card-v47) .cert-records-specialty-v48{width:100%!important;max-width:none!important}
  html body.efc-certificate-finance-open-v43 .cert-finance-controls-v13[data-mode]{grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:8px!important}
  html body.efc-certificate-finance-open-v43 #certFinanceBodyV13>.breakdowns{grid-template-columns:repeat(2,minmax(0,1fr))!important}
  html body.efc-certificate-finance-open-v43 #certFinanceBodyV13>.breakdowns>.card:last-child{grid-column:1/-1!important}
}
@media(max-width:940px){
  html body .content:has(.cert-records-card-v47) .cert-records-filters-v48[data-mode]{grid-template-columns:repeat(2,minmax(0,1fr))!important}
  html body .content:has(.cert-records-card-v47) #certRecordsModeV48{grid-column:1/-1!important;width:100%!important}
  html body .content:has(.cert-records-card-v47) .cert-records-summary-row-v49{margin-bottom:7px!important}
  html body .content:has(.cert-records-card-v47) .cert-records-count-v47{width:min(380px,100%)!important;max-width:100%!important}
  html body.efc-certificate-finance-open-v43 .cert-finance-hero-v13,
  html body.efc-certificate-finance-open-v43 .cert-finance-v13 .finance-hero-v13{width:min(470px,100%)!important;max-width:470px!important;min-width:0!important}
  html body.efc-certificate-finance-open-v43 .cert-finance-topbar-v43{gap:8px!important}
  html body.efc-certificate-finance-open-v43 .cert-finance-back-v43{max-width:48%!important}
  html body.efc-certificate-finance-open-v43 .cert-finance-switch-v43{width:min(48%,220px)!important}
  html body.efc-certificate-finance-open-v43 .cert-finance-switch-v43 button{width:100%!important;min-width:0!important}
  html body.efc-certificate-finance-open-v43 .cert-finance-summary-row-v49{margin-bottom:12px!important}
  html body.efc-certificate-finance-open-v43 .cert-finance-summary-row-v49>.cert-finance-primary-summary-v45{width:100%!important;max-width:none!important}
  html body.efc-certificate-finance-open-v43 .cert-finance-controls-v13[data-mode]{grid-template-columns:repeat(2,minmax(0,1fr))!important}
  html body.efc-certificate-finance-open-v43 .cert-finance-controls-v13 label,
  html body.efc-certificate-finance-open-v43 .cert-finance-specialty-v46{width:100%!important;max-width:none!important;min-width:0!important}
  html body.efc-certificate-finance-open-v43 #certFinanceModeV13{grid-column:1/-1!important;width:100%!important}
  html body.efc-certificate-finance-open-v43 .cert-finance-summary-v44{width:100%!important}
  html body.efc-certificate-finance-open-v43 #certFinanceBodyV13>.breakdowns{grid-template-columns:1fr!important}
  html body.efc-certificate-finance-open-v43 #certFinanceBodyV13>.breakdowns>.card:last-child{grid-column:auto!important}
  html body.efc-certificate-finance-open-v43 #certFinanceBodyV13>.breakdowns>.card{min-height:0!important}
}
@media(max-height:650px) and (max-width:1100px){
  html body.efc-certificate-finance-open-v43 .cert-finance-v13 .finance-hero-v13{height:68px!important;margin-bottom:8px!important}
  html body.efc-certificate-finance-open-v43 .cert-finance-topbar-v43{margin-bottom:8px!important}
  html body.efc-certificate-finance-open-v43 .cert-finance-summary-row-v49{margin-bottom:10px!important}
  html body.efc-certificate-finance-open-v43 .cert-finance-controls-v13{padding-top:7px!important;padding-bottom:7px!important;margin-bottom:6px!important}
  html body.efc-certificate-finance-open-v43 #certFinanceBodyV13>.breakdowns>.card{padding-top:7px!important;padding-bottom:7px!important}
}
`;
  document.head.appendChild(style);
}
function certificateManagerCurrentRange(){
  const activeMode=document.querySelector('#certFinanceModeV13 [data-mode].active'),modeValue=String(activeMode?.dataset.mode||'daily'),day=document.getElementById('certFinanceDayV13')?.value||today(),year=document.getElementById('certFinanceYearV13')?.value||today().slice(0,4),month=document.getElementById('certFinanceMonthV13')?.value||today().slice(5,7),from=document.getElementById('certFinanceFromV48')?.value||day,to=document.getElementById('certFinanceToV48')?.value||from;
  return certificateFinanceRange(modeValue,year,month,day,from,to);
}
function certificateManagerRows(from,to,{branch='',specialty=''}={}){
  const start=String(from||today()),end=String(to||start),min=start<=end?start:end,max=start<=end?end:start;
  return state.certificateReceipts.filter(receipt=>String(receipt.date||'')>=min&&String(receipt.date||'')<=max&&certificateFilterMatches(receipt,{branch,specialty}));
}
function certificateManagerReceiptModel(from,to,fundsLocation,{branch='',specialty='',branchLabel='كل المراكز',specialtyLabel='كل الشهادات'}={}){
  const start=String(from||today()),end=String(to||start),min=start<=end?start:end,max=start<=end?end:start,rows=certificateManagerRows(min,max,{branch,specialty});
  return{from:min,to:max,count:rows.length,total:rows.reduce((sum,row)=>sum+Number(row.amount||0),0),branchLabel:branch?String(branchLabel||'كل المراكز'):'كل المراكز',specialtyLabel:specialty?String(specialtyLabel||'كل الشهادات'):'كل الشهادات',fundsLocation:fundsLocation==='bank'?'البنك':'وسائل الدفع الإلكترونية',createdDate:today(),createdTime:nowTime()};
}
function certificateManagerReceiptCss(){return`
*{box-sizing:border-box}body{font-family:Tahoma,Arial,sans-serif;margin:0;background:#eef1f0;color:#111715}.cert-manager-paper-v22{width:1040px;max-width:96vw;margin:18px auto;background:#fff;border:2px solid #293631;padding:12px 18px 20px;direction:ltr}.head12{display:grid;grid-template-columns:240px 1fr 150px;gap:14px;align-items:center;border-bottom:1px solid #b2b8b5;padding-bottom:6px}.contact12{display:grid;grid-template-columns:92px 1fr;gap:8px;align-items:center;direction:ltr;text-align:left}.contact12 img,.logoOnly12 img{width:82px;height:62px;object-fit:contain;display:block}.contactText12{display:grid;gap:1px}.contactText12>b{font-size:13px;white-space:nowrap}.socialLine12{display:flex;align-items:center;gap:5px;font-size:13px;font-weight:700;white-space:nowrap}.socialLine12.teacher12{font-size:10px;margin-top:2px}.socialLine12.teacher12 span:last-child{direction:rtl}.socialIcon12{width:14px;height:14px;display:inline-block;flex:0 0 14px}.socialIcon12 svg{width:100%;height:100%;fill:currentColor}.center12{text-align:center;direction:rtl}.title12{display:flex;direction:ltr;justify-content:center;align-items:baseline;gap:12px;white-space:nowrap;margin:0;font-size:27px}.official12{font-size:11px;font-weight:900;margin-top:3px}.tag12{font-size:11px;font-weight:800;margin-top:3px}.logoOnly12{height:66px;display:grid;place-items:center}.cert-manager-title-v22{text-align:center;direction:rtl;font-size:26px;font-weight:950;margin:12px 0 10px;color:#075844}.cert-manager-meta-v22{display:flex;justify-content:center;direction:rtl;padding:7px 0;border-bottom:1px solid #d9dedc}.cert-manager-meta-v22 span{direction:rtl}.cert-manager-period-v22{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:38px;direction:rtl;margin:16px 36px 18px}.cert-manager-period-v22 span{display:grid;gap:6px;text-align:center;border:1px solid #d7dfdc;border-radius:10px;padding:11px 16px;background:#fbfdfc}.cert-manager-period-v22 small{color:#64736e;font-size:10px}.cert-manager-period-v22 b{font-size:18px}.cert-manager-grid-v22{display:grid;grid-template-columns:1.35fr repeat(3,minmax(0,1fr));gap:14px;direction:rtl;margin:18px 0}.cert-manager-box-v22{border:1px solid #ccd9d4;border-radius:10px;padding:15px;text-align:center;background:#fbfdfc}.cert-manager-box-v22 small{display:block;color:#50645d;font-size:10px;margin-bottom:7px;font-weight:800}.cert-manager-box-v22 b{font-size:20px}.cert-manager-box-v22.amount{background:linear-gradient(135deg,#d9f5e5,#c8efda);border-color:#83cca3;box-shadow:0 7px 18px rgba(17,113,77,.09)}.cert-manager-box-v22.amount b{color:#064f3e;font-size:27px}.cert-manager-box-v22.count{background:#eaf3ff;border-color:#bdd3ef}.cert-manager-box-v22.center{background:#e7f7f2;border-color:#b8ddd1}.cert-manager-box-v22.certificate{background:#fff4d9;border-color:#ead49b}.cert-manager-location-v22{direction:rtl;text-align:center;border:1px solid #d7dfdc;border-radius:10px;padding:13px;font-size:14px;background:#f6f2ff;border-color:#d4c5ef}.cert-manager-location-v22 b{font-size:18px;color:#60428c}.cert-manager-actions-v22{width:1040px;max-width:96vw;margin:0 auto 18px;display:flex;direction:rtl;gap:8px}.cert-manager-actions-v22 button{border:0;border-radius:7px;padding:10px 17px;font:700 13px Tahoma;cursor:pointer}.cert-manager-print-v22{background:#155ea8;color:#fff}.cert-manager-save-v22{background:#159a55;color:#fff}@media(max-width:760px){.cert-manager-period-v22{grid-template-columns:1fr;gap:10px;margin-left:0;margin-right:0}.cert-manager-grid-v22{grid-template-columns:1fr}}@media print{body{background:#fff}.cert-manager-paper-v22{width:100%;max-width:none;margin:0;border:1px solid #222}.cert-manager-actions-v22{display:none}@page{size:landscape;margin:8mm}}
`;}
function certificateManagerReceiptHeader(){
  const img=`<img src="${logoUrl()}" alt="EFC">`;
  return`<div class="head12"><div class="contact12">${img}<div class="contactText12"><b>Tél: 48 02 84 84</b><div class="socialLine12">${whatsappIcon()}<span>32 09 86 89</span></div><div class="socialLine12 teacher12">${facebookIcon()}<span>الأستاذ محمد ديدي</span></div></div></div><div class="center12"><h1 class="title12"><span>Centre EFC</span><span>مركز</span></h1><div class="official12">للغات والمعلوماتية</div><div class="tag12">إدارة الشهادات</div></div><div class="logoOnly12">${img}</div></div>`;
}
function certificateManagerReceiptBody(model){
  return`${certificateManagerReceiptHeader()}<div class="cert-manager-title-v22">إدارة الشهادات</div><div class="cert-manager-meta-v22"><span>تاريخ الإصدار: <b>${showDate(model.createdDate)}</b></span></div><div class="cert-manager-period-v22"><span><small>من تاريخ</small><b>${showDate(model.from)}</b></span><span><small>إلى تاريخ</small><b>${showDate(model.to)}</b></span></div><div class="cert-manager-grid-v22"><div class="cert-manager-box-v22 amount"><small>إجمالي مبلغ الشهادات</small><b>${cash(model.total)}</b></div><div class="cert-manager-box-v22 count"><small>عدد الشهادات</small><b>${model.count}</b></div><div class="cert-manager-box-v22 center"><small>المركز</small><b>${esc(model.branchLabel)}</b></div><div class="cert-manager-box-v22 certificate"><small>الشهادة</small><b>${esc(model.specialtyLabel)}</b></div></div><div class="cert-manager-location-v22">مكان المبلغ: <b>${esc(model.fundsLocation)}</b></div>`;
}
function certificateManagerReceiptDocument(model,actions=true,autoPrint=false){
  const data=JSON.stringify(model).replace(/</g,'\\u003c');
  return`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>روسي الشهادات</title><style>${certificateManagerReceiptCss()}</style></head><body><div class="cert-manager-paper-v22">${certificateManagerReceiptBody(model)}</div>${actions?`<div class="cert-manager-actions-v22"><button class="cert-manager-print-v22" onclick="print()">طباعة</button><button class="cert-manager-save-v22" onclick="parent.EFC_SAVE_CERT_MANAGER_RECEIPT_PDF_V22(MANAGER_RECEIPT)">حفظ PDF</button></div>`:''}<script>const MANAGER_RECEIPT=${data};${autoPrint?'setTimeout(()=>print(),250);':''}<\/script></body></html>`;
}
function openCertificateManagerReceipt(model,autoPrint=false){
  const modal=document.createElement('div');modal.className='modal receipt-viewer-v13';modal.innerHTML='<div class="receipt-viewer-card-v13"><div class="receipt-viewer-head-v13"><b>روسي الشهادات</b><button class="receipt-viewer-close-v13" type="button">×</button></div><iframe class="receipt-viewer-frame-v13" title="روسي الشهادات"></iframe></div>';document.body.appendChild(modal);const frame=modal.querySelector('iframe'),close=()=>modal.remove();modal.querySelector('.receipt-viewer-close-v13').onclick=close;frame.srcdoc=certificateManagerReceiptDocument(model,true,autoPrint);return{close,frame};
}
async function saveCertificateManagerReceiptPdf(model){
  let stage;
  try{
    await Promise.all([loadLocalScript('./vendor/html2canvas.min.js','html2canvas'),loadLocalScript('./vendor/jspdf.umd.min.js','jspdf')]);
    stage=document.createElement('div');stage.style.cssText='position:fixed;left:-16000px;top:0;width:1040px;background:#fff;z-index:-9999';stage.innerHTML=`<style>${certificateManagerReceiptCss()}</style><div class="cert-manager-paper-v22">${certificateManagerReceiptBody(model)}</div>`;document.body.appendChild(stage);
    const paper=stage.querySelector('.cert-manager-paper-v22');await waitImages(paper);const canvas=await window.html2canvas(paper,{scale:2,backgroundColor:'#fff',useCORS:false,allowTaint:false,logging:false}),{jsPDF}=window.jspdf,pdf=new jsPDF({orientation:'landscape',unit:'mm',format:'a4'}),pw=pdf.internal.pageSize.getWidth(),ph=pdf.internal.pageSize.getHeight(),ratio=Math.min(pw/canvas.width,ph/canvas.height),width=canvas.width*ratio,height=canvas.height*ratio;pdf.addImage(canvas.toDataURL('image/jpeg',.96),'JPEG',(pw-width)/2,(ph-height)/2,width,height);
    const fileName=`روسي-الشهادات-${model.from}-${model.to}.pdf`,buffer=pdf.output('arraybuffer');if(!invoke){pdf.save(fileName);return fileName;}const saved=await invoke('save_receipt_pdf',{fileName,dataBase64:arrayBufferToBase64(buffer)});if(saved)alert(`تم حفظ روسي الشهادات:\n${saved}`);return saved;
  }catch(error){if(error?.name==='AbortError')return null;console.error('EFC certificate manager receipt PDF failed.',error);alert(String(error?.message||error||'تعذر حفظ روسي الشهادات.'));return null;}finally{stage?.remove();}
}
function openCertificateManagerReceiptDialog(){
  const range=certificateManagerCurrentRange(),branchOptions=certificateFinanceBranches(),specialtyOptions=certificateFinanceSpecialties(),modal=document.createElement('div');modal.className='modal';modal.innerHTML=`<div class="modal-card narrow"><div class="modal-head"><div><p>إدارة الشهادات</p><h2>إنشاء روسي الشهادات</h2><span>حدد الفترة والمركز والشهادة ثم اختر أين يوجد المبلغ.</span></div><button class="x" type="button">×</button></div><form class="grid two" autocomplete="off"><label>من تاريخ<input class="input" name="from" type="date" value="${esc(range.from)}" required></label><label>إلى تاريخ<input class="input" name="to" type="date" value="${esc(range.to)}" required></label><label>المركز<select name="branch"><option value="">كل المراكز</option>${branchOptions.map(([key,label])=>`<option value="${esc(key)}">${esc(label)}</option>`).join('')}</select></label><label>الشهادة<select name="specialty"><option value="">كل الشهادات</option>${specialtyOptions.map(([key,label])=>`<option value="${esc(key)}">${esc(label)}</option>`).join('')}</select></label><label class="wide">أين يوجد المبلغ؟<select name="fundsLocation" required><option value="">اختر</option><option value="electronic">وسائل الدفع الإلكترونية</option><option value="bank">البنك</option></select></label><div class="wide modal-actions"><button type="button" class="button secondary cancel">إلغاء</button><button class="button">إنشاء الروسي</button></div></form></div>`;document.body.appendChild(modal);const close=()=>modal.remove();modal.querySelector('.x').onclick=close;modal.querySelector('.cancel').onclick=close;modal.querySelector('form').onsubmit=event=>{event.preventDefault();const data=new FormData(event.currentTarget),from=String(data.get('from')||''),to=String(data.get('to')||''),branch=String(data.get('branch')||''),specialty=String(data.get('specialty')||''),fundsLocation=String(data.get('fundsLocation')||''),branchSelect=event.currentTarget.elements.branch,specialtySelect=event.currentTarget.elements.specialty,branchLabel=String(branchSelect?.selectedOptions?.[0]?.textContent||'كل المراكز').trim(),specialtyLabel=String(specialtySelect?.selectedOptions?.[0]?.textContent||'كل الشهادات').trim();if(!from||!to)return alert('حدد الفترة.');if(!fundsLocation)return alert('اختر أين يوجد المبلغ.');const model=certificateManagerReceiptModel(from,to,fundsLocation,{branch,specialty,branchLabel,specialtyLabel});if(!model.count)return alert('لا توجد شهادات مطابقة للفترة والاختيارات المحددة.');close();openCertificateManagerReceipt(model);};
}
function drawCertificateFinance(){
  const root=document.getElementById('certFinanceBodyV13');if(!root)return;
  const activeMode=document.querySelector('#certFinanceModeV13 [data-mode].active'),modeValue=String(activeMode?.dataset.mode||'daily'),day=document.getElementById('certFinanceDayV13')?.value||today(),year=document.getElementById('certFinanceYearV13')?.value||today().slice(0,4),month=document.getElementById('certFinanceMonthV13')?.value||today().slice(5,7),from=document.getElementById('certFinanceFromV48')?.value||today(),to=document.getElementById('certFinanceToV48')?.value||today(),branch=document.getElementById('certFinanceBranchV13')?.value||'',specialty=document.getElementById('certFinanceSpecialtyV13')?.value||'',method=document.getElementById('certFinanceMethodV13')?.value||'',range=certificateFinanceRange(modeValue,year,month,day,from,to);
  const controls=document.querySelector('.cert-finance-controls-v13'),dayWrap=document.getElementById('certFinanceDayWrapV13'),fromWrap=document.getElementById('certFinanceFromWrapV48'),toWrap=document.getElementById('certFinanceToWrapV48'),monthWrap=document.getElementById('certFinanceMonthWrapV13'),yearWrap=document.getElementById('certFinanceYearWrapV13');if(controls)controls.dataset.mode=modeValue;if(dayWrap)dayWrap.hidden=modeValue!=='daily';if(fromWrap)fromWrap.hidden=modeValue!=='weekly';if(toWrap)toWrap.hidden=modeValue!=='weekly';if(monthWrap)monthWrap.hidden=modeValue!=='monthly';if(yearWrap)yearWrap.hidden=!['monthly','yearly'].includes(modeValue);
  const allRows=[...state.certificateReceipts].filter(receipt=>certificateFilterMatches(receipt,{branch,specialty,method})),rows=allRows.filter(receipt=>receipt.date>=range.from&&receipt.date<=range.to).sort((a,b)=>b.date.localeCompare(a.date)||String(b.time||'').localeCompare(String(a.time||''))||Number(b.timestamp||0)-Number(a.timestamp||0));
  const periodTotal=rows.reduce((sum,row)=>sum+Number(row.amount||0),0),periodTitle=modeValue==='daily'?'دخل اليوم':modeValue==='weekly'?'دخل الفترة':modeValue==='monthly'?'دخل شهري':'دخل سنوي',presentation=window.EFC_FINANCE_PRESENTATION_V13,periodDescriptor=modeValue==='daily'?`يوم ${showDate(day)}`:modeValue==='weekly'?range.label:modeValue==='monthly'?`شهر ${MONTH_NAMES[Math.max(0,Number(month)-1)]} ${year}`:`سنة ${year}`,branchLabel=branch?String(document.getElementById('certFinanceBranchV13')?.selectedOptions?.[0]?.textContent||'').trim():'',specialtyLabel=specialty?String(document.getElementById('certFinanceSpecialtyV13')?.selectedOptions?.[0]?.textContent||'').trim():'',methodLabel=method?String(document.getElementById('certFinanceMethodV13')?.selectedOptions?.[0]?.textContent||'').trim():'',detailParts=[branchLabel?`من ${branchLabel}`:'',specialtyLabel?`في ${specialtyLabel}`:'',methodLabel?`عبر ${methodLabel}`:''].filter(Boolean),summaryText=`هذا دخل ${periodDescriptor}${detailParts.length?` ${detailParts.join(' ')}`:''}`,breakdownHtml=(keyFn)=>presentation?.breakdown&&presentation?.groupRows?presentation.breakdown(presentation.groupRows(rows,keyFn),periodTotal):certificateFinanceBreakdown(rows,keyFn,periodTotal);
  const titleEl=document.getElementById('certFinancePeriodTitleV13'),periodValue=document.getElementById('certFinancePeriodTotalV13'),periodRange=document.getElementById('certFinancePeriodRangeV13');if(titleEl)titleEl.textContent=periodTitle;if(periodValue)periodValue.textContent=cash(periodTotal);if(periodRange)periodRange.textContent=summaryText;
  root.innerHTML=`<div class="grid three breakdowns"><div class="card"><h3>حسب الفرع</h3>${breakdownHtml(row=>row.branchName||'—')}</div><div class="card"><h3>حسب تخصص الشهادة</h3>${breakdownHtml(row=>row.specialtyName||'—')}</div><div class="card"><h3>حسب وسيلة الدفع</h3>${breakdownHtml(row=>row.method||'—')}</div></div>`;
}
function setHistoryMode(show){
  historyOpen=Boolean(show);document.body.classList.toggle('efc-certificate-finance-open-v43',historyOpen);const form=document.querySelector('.cert-form-v13'),finance=document.querySelector('.cert-finance-v13'),toggle=document.querySelector('.efc-cert-history-toggle-v36');
  if(form)form.dataset.efcHistoryOpenV36=historyOpen?'1':'0';if(finance)finance.hidden=!historyOpen;
  if(toggle){toggle.classList.toggle('active',historyOpen);toggle.innerHTML=historyOpen?`${BACK_ICON}<span>العودة للإصدار</span>`:`${FINANCE_ICON}<span>مالية الشهادات</span>`;toggle.setAttribute('aria-pressed',historyOpen?'true':'false');}
  switchMode(mode);if(historyOpen)drawCertificateFinance();
}
async function saveEditedReceipt(receipt){
  if(issueInFlight)return;
  if(!receipt||!assertCertificateReceiptMutable(receipt))return;
  const amount=Math.max(0,Number(document.getElementById('certAmountV13')?.value||0)),method=String(document.getElementById('certMethodV13')?.value||'').trim();
  if(amount<=0)return alert('أدخل مبلغًا صحيحًا.');if(!method)return alert('اختر وسيلة الدفع.');
  let externalData=null;
  if(receipt.studentType==='external'){
    const name=String(document.getElementById('certExternalNameV13')?.value||'').trim(),phone=String(document.getElementById('certExternalPhoneV13')?.value||'').trim(),reg=String(document.getElementById('certExternalRegV13')?.value||'').trim(),specialtyId=String(document.getElementById('certExternalSpecV13')?.value||''),branchId=String(document.getElementById('certExternalBranchV13')?.value||''),specialty=spec(specialtyId)||(specialtyId===String(receipt.specialtyId||'')?{name:receipt.specialtyName}:null),branch=state.certificateBranches.find(item=>String(item.id)===branchId)||(branchId===String(receipt.branchId||'')?{id:receipt.branchId,name:receipt.branchName}:null);
    if(!name)return alert('أدخل اسم الطالب.');if(!reg)return alert('أدخل رقم تسجيل الطالب.');if(!specialty)return alert('اختر الشهادة.');if(!branch)return alert('اختر فرع الشهادة أو أضف فرعًا جديدًا.');
    externalData={studentName:name,phone,reg,specialtyId,specialtyName:specialty.name,branchType:'certificate',branchId:String(branch.id||branchId),branchName:branch.name};
  }
  const previous={studentName:receipt.studentName,phone:receipt.phone,reg:receipt.reg,specialtyId:receipt.specialtyId,specialtyName:receipt.specialtyName,branchType:receipt.branchType,branchId:receipt.branchId,branchName:receipt.branchName,amount:receipt.amount,method:receipt.method};
  issueInFlight=true;Object.assign(receipt,externalData||{}, {amount,method});syncIssueButton();
  try{await persist();}
  catch(error){Object.assign(receipt,previous);writeLocal();issueInFlight=false;syncIssueButton();console.error('EFC certificate receipt edit failed.',error);alert('تعذر حفظ تعديل الروسي. لم يتم تغيير البيانات.');return;}
  issueInFlight=false;clearCertificateEdit();renderCertificates();openReceipt(receipt);
}

async function issueReceipt(){
  const edited=editingReceipt();if(edited)return saveEditedReceipt(edited);
  if(issueInFlight)return;
  if(!canEditCertificates())return alert('الحساب الحالي لا يملك صلاحية تعديل الشهادات.');
  const amount=Math.max(0,Number(document.getElementById('certAmountV13')?.value||0)),method=String(document.getElementById('certMethodV13')?.value||'').trim();
  if(amount<=0)return alert('أدخل مبلغًا صحيحًا.');if(!method)return alert('اختر وسيلة الدفع.');
  let data;
  if(mode==='internal'){
    const student=students.find(item=>String(item.id)===String(selectedStudentId));if(!student||!isOperationalStudent(student))return alert('اختر الطالب المسجل أولًا.');const specialty=spec(student.specialty);
    data={studentType:'internal',studentId:student.id,studentName:student.name,phone:student.phone||'',reg:student.reg,specialtyId:student.specialty,specialtyName:specialty?.name||student.specialty,branchType:'internal',branchId:student.branch,branchName:branchName(student.branch)};
  }else{
    const name=String(document.getElementById('certExternalNameV13')?.value||'').trim(),phone=String(document.getElementById('certExternalPhoneV13')?.value||'').trim(),reg=String(document.getElementById('certExternalRegV13')?.value||'').trim(),specialtyId=String(document.getElementById('certExternalSpecV13')?.value||''),branchId=String(document.getElementById('certExternalBranchV13')?.value||''),specialty=spec(specialtyId),branch=state.certificateBranches.find(item=>item.id===branchId);
    if(!name)return alert('أدخل اسم الطالب.');if(!reg)return alert('أدخل رقم تسجيل الطالب.');if(!specialty)return alert('اختر الشهادة.');if(!branch)return alert('اختر فرع الشهادة أو أضف فرعًا جديدًا.');
    data={studentType:'external',studentId:null,studentName:name,phone,reg,specialtyId,specialtyName:specialty.name,branchType:'certificate',branchId:branch.id,branchName:branch.name};
  }
  const receipt=normalizeReceipt({...data,id:uid('certificate'),recordCode:uid('certificate-record'),transactionCode:uid('certificate-tx'),receiptNo:nextReceiptNo(),amount,method,date:today(),time:nowTime(),timestamp:Date.now(),createdAt:Date.now()});
  issueInFlight=true;syncIssueButton();state.certificateReceipts.unshift(receipt);
  try{await persist();}
  catch(error){state.certificateReceipts=state.certificateReceipts.filter(item=>item.id!==receipt.id);writeLocal();issueInFlight=false;syncIssueButton();console.error('EFC certificate issue failed.',error);alert('تعذر حفظ الشهادة. لم يتم اعتماد العملية، ويمكنك المحاولة مجددًا.');return;}
  issueInFlight=false;renderCertificates();openReceipt(receipt);
}

function renderCertificates(){
  resetTransientIssueState();ensureCertificateFinanceStyles();
  currentPage='certificates';document.body.classList.add('efc-certificates-redesign-v35','efc-certificates-workspace-v36');
  const editing=editingReceipt();document.body.classList.toggle('efc-certificate-editing-v44',Boolean(editing));if(editing)mode=editing.studentType==='external'?'external':'internal';
  const branchOptions=state.certificateBranches.map(item=>`<option value="${esc(item.id)}">${esc(item.name)}</option>`).join(''),editable=canEditCertificates(),date=today(),currentYear=Number(date.slice(0,4)),currentMonth=Number(date.slice(5,7)),financeYears=certificateFinanceYears(),financeBranches=certificateFinanceBranches(),financeSpecialties=certificateFinanceSpecialties(),financeMethods=[...new Set(state.certificateReceipts.map(item=>String(item.method||'').trim()).filter(Boolean))];
  const title=`<div class="page-title efc-cert-hero-v35 efc-cert-hero-v36"><div><span class="efc-cert-title-icon-v36">${CERT_ICON}</span><h1>${editing?'تعديل روسي الشهادة':'روسي الشهادة'}</h1></div></div>`;
  const payment=`<div class="grid two cert-payment-v13"><label>المبلغ<input class="input" id="certAmountV13" type="number" min="1" autocomplete="off" placeholder="المبلغ" required ${editable?'':'disabled'}></label><label>وسيلة الدفع<select id="certMethodV13" ${editable?'':'disabled'}>${methods.map(item=>`<option>${esc(item)}</option>`).join('')}</select></label></div><button class="button" type="button" id="certIssueV13" disabled>${editing?'حفظ تعديل الروسي':'إصدار روسي الشهادة'}</button>`;
  const finance=`<div class="cert-history-v13 cert-finance-v13" hidden><section class="finance-hero-v13"><svg viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19V9M10 19V5M16 19v-7M22 19H2M3.5 7.5 9 3l5 5 6-5"/></g></svg><h1>مالية الشهادات</h1></section><div class="cert-finance-topbar-v43"><button class="button secondary cert-finance-back-v43" id="certFinanceBackV13" type="button">${BACK_ICON}<span>العودة للإصدار</span></button><div class="cert-finance-switch-v43"><button class="active" type="button">دخل الشهادات</button><button id="certManagerReceiptV22" type="button">روسي الشهادات</button></div></div><div class="cert-finance-summary-row-v49"><div class="cert-finance-primary-summary-v45"><div class="cert-finance-summary-card-v43"><div class="finance-kpi-line-v13"><small id="certFinancePeriodTitleV13">دخل اليوم</small><b id="certFinancePeriodTotalV13">${cash(0)}</b></div><span id="certFinancePeriodRangeV13">هذا دخل يوم ${showDate(date)}</span></div></div></div><div class="card finance-controls cert-finance-controls-v13"><div class="segmented" id="certFinanceModeV13"><button class="active" type="button" data-mode="daily">يومي</button><button type="button" data-mode="weekly">أسبوع</button><button type="button" data-mode="monthly">شهري</button><button type="button" data-mode="yearly">سنوي</button></div><label id="certFinanceDayWrapV13">اليوم<input class="input" id="certFinanceDayV13" type="date" value="${date}"></label><label id="certFinanceFromWrapV48" hidden>من<input class="input" id="certFinanceFromV48" type="date" value="${date}"></label><label id="certFinanceToWrapV48" hidden>إلى<input class="input" id="certFinanceToV48" type="date" value="${date}"></label><label id="certFinanceMonthWrapV13">الشهر<select id="certFinanceMonthV13">${MONTH_NAMES.map((name,index)=>`<option value="${index+1}" ${index+1===currentMonth?'selected':''}>${name}</option>`).join('')}</select></label><label id="certFinanceYearWrapV13">السنة<select id="certFinanceYearV13">${financeYears.map(year=>`<option value="${year}" ${year===currentYear?'selected':''}>${year}</option>`).join('')}</select></label><label>الفرع<select id="certFinanceBranchV13"><option value="">كل الفروع</option>${financeBranches.map(([key,label])=>`<option value="${esc(key)}">${esc(label)}</option>`).join('')}</select></label><label class="cert-finance-specialty-v46">تخصص الشهادة<select id="certFinanceSpecialtyV13"><option value="">كل التخصصات</option>${financeSpecialties.map(([key,label])=>`<option value="${esc(key)}">${esc(label)}</option>`).join('')}</select></label><label class="cert-finance-method-v44">وسيلة الدفع<select id="certFinanceMethodV13"><option value="">كل وسائل الدفع</option>${financeMethods.map(value=>`<option>${esc(value)}</option>`).join('')}</select></label></div><div id="certFinanceBodyV13"></div></div>`;
  const toolbarAction=editing?`<button type="button" class="efc-cert-cancel-edit-v44" id="certCancelEditV44">${BACK_ICON}<span>إلغاء التعديل</span></button>`:`<button type="button" class="efc-cert-history-toggle-v36 efc-cert-toolbar-action-v47" aria-pressed="false">${FINANCE_ICON}<span>مالية الشهادات</span></button><button type="button" class="efc-cert-records-toggle-v47 efc-cert-toolbar-action-v47">${HISTORY_ICON}<span>سجل الشهادات</span></button>`;
  shell(`${title}<div class="cert-layout-v13"><div class="card cert-form-v13" data-efc-history-open-v36="0"><div class="efc-cert-workspace-toolbar-v36"><div class="cert-mode-v13"><button type="button" data-mode="internal" ${editing?'disabled':''}>طالب مسجل</button><button type="button" data-mode="external" ${editing?'disabled':''}>طالب خارجي</button></div><div class="efc-cert-history-actions-v36">${toolbarAction}</div></div><div id="certInternalPaneV13"><label class="efc-cert-student-search-v38">ابحث عن الطالب<input class="input" id="certStudentSearchV13" autocomplete="off" placeholder="ابحث عن الطالب"></label><div class="grid two efc-cert-student-filters-v38"><label>الفرع<select id="certInternalBranchV13"><option value="">كل الفروع</option>${branches.map(item=>`<option value="${esc(item.id)}">${esc(item.name)}</option>`).join('')}</select></label><label>الشهادة<select id="certInternalSpecV13"><option value="">كل الشهادات</option>${specialties.map(item=>`<option value="${esc(item.id)}">${esc(item.name)}</option>`).join('')}</select></label></div><div id="certStudentResultsV13" class="cert-results-v13"></div><div class="efc-cert-selected-host-v40" hidden></div>${payment}</div><div id="certExternalPaneV13" hidden><div class="grid two"><label>اسم الطالب<input class="input" id="certExternalNameV13" autocomplete="off" placeholder="اسم الطالب" ${editable?'':'disabled'}></label><label>رقم الهاتف<input class="input" id="certExternalPhoneV13" autocomplete="off" placeholder="رقم الهاتف" ${editable?'':'disabled'}></label><label>رقم التسجيل<input class="input" id="certExternalRegV13" inputmode="numeric" autocomplete="off" placeholder="رقم التسجيل" required ${editable?'':'disabled'}></label><label>الشهادة<select id="certExternalSpecV13" ${editable?'':'disabled'}><option value="">اختر الشهادة</option>${specialties.map(item=>`<option value="${esc(item.id)}">${esc(item.name)}</option>`).join('')}</select></label><label>فرع الشهادة<select id="certExternalBranchV13" ${editable?'':'disabled'}><option value="">اختر فرع الشهادة</option>${branchOptions}</select></label></div><button type="button" class="mini" id="certAddBranchV13" ${editable?'':'disabled'}>＋ إضافة فرع شهادة</button></div><span class="efc-cert-payment-anchor-v40" hidden></span>${finance}</div></div>`);
  document.querySelectorAll('.cert-mode-v13 button').forEach(button=>button.addEventListener('click',()=>{if(editingReceipt())return;setHistoryMode(false);switchMode(button.dataset.mode);}));
  document.getElementById('certInternalBranchV13').addEventListener('change',renderStudentPicker);
  document.getElementById('certInternalSpecV13').addEventListener('change',renderStudentPicker);
  document.getElementById('certStudentSearchV13').addEventListener('input',renderStudentPicker);
  document.getElementById('certAddBranchV13').addEventListener('click',addBranch);
  document.getElementById('certIssueV13').addEventListener('click',issueReceipt);
  document.querySelector('.efc-cert-history-toggle-v36')?.addEventListener('click',()=>setHistoryMode(!historyOpen));
  document.querySelector('.efc-cert-records-toggle-v47')?.addEventListener('click',renderCertificateHistoryPage);
  document.getElementById('certCancelEditV44')?.addEventListener('click',cancelCertificateReceiptEdit);
  document.getElementById('certFinanceBackV13')?.addEventListener('click',()=>setHistoryMode(false));
  document.getElementById('certManagerReceiptV22')?.addEventListener('click',openCertificateManagerReceiptDialog);
  document.querySelectorAll('#certFinanceModeV13 [data-mode]').forEach(button=>button.addEventListener('click',()=>{document.querySelectorAll('#certFinanceModeV13 [data-mode]').forEach(item=>item.classList.toggle('active',item===button));if(button.dataset.mode==='daily')syncCertificateFinanceDayFromContext();drawCertificateFinance();}));
  document.getElementById('certFinanceDayV13')?.addEventListener('change',()=>{syncCertificateFinanceContextFromDay();drawCertificateFinance();});
  ['certFinanceMonthV13','certFinanceYearV13'].forEach(id=>document.getElementById(id)?.addEventListener('change',()=>{if(activeCertificateFinanceMode()==='daily')syncCertificateFinanceDayFromContext();drawCertificateFinance();}));
  ['certFinanceFromV48','certFinanceToV48','certFinanceBranchV13','certFinanceSpecialtyV13','certFinanceMethodV13'].forEach(id=>document.getElementById(id)?.addEventListener('change',drawCertificateFinance));
  syncCertificateFinanceContextFromDay();renderStudentPicker();setHistoryMode(false);switchMode(mode);if(editing)applyCertificateEditState(editing);window.EFC_AUTOCOMPLETE_OFF_V13?.(document.querySelector('.cert-form-v13'));
}
function ensureSidebar(){if(!navItems.some(item=>item[0]==='certificates')){const financeIndex=navItems.findIndex(item=>item[0]==='finance'),icon='<svg viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 3.5h12v11H6z"/><circle cx="12" cy="17" r="3"/></g></svg>';navItems.splice(financeIndex>=0?financeIndex:navItems.length,0,['certificates',icon,'الشهادات']);}}

document.addEventListener('click',event=>{
  if(!editingReceiptId)return;
  const element=event.target instanceof Element?event.target:null;if(!element)return;
  const logout=element.closest('.user-controls-v13 button'),link=element.closest('a[href^="#"]'),nextHash=String(link?.getAttribute('href')||'');
  if(!logout&&(!link||nextHash==='#certificates'))return;
  if(certificateEditDirty()&&!window.confirm('لديك تعديلات غير محفوظة على روسي الشهادة. مغادرة الصفحة ستلغيها. هل تريد المتابعة؟')){event.preventDefault();event.stopImmediatePropagation();return;}
  clearCertificateEdit();
},true);

async function boot(){
  await loadState();ensureSidebar();
  window.EFC_REGISTER_STATE_CONTRIBUTOR?.('certificates',snapshot=>Object.assign(snapshot,{certificateBranches:state.certificateBranches,certificateReceipts:state.certificateReceipts,certificateNextReceiptNo:state.nextReceiptNo}));
  window.EFC_REGISTER_RESTORE_CONTRIBUTOR?.('certificates',async incoming=>{if(Array.isArray(incoming?.certificateBranches)||Array.isArray(incoming?.certificateReceipts)||incoming?.certificateNextReceiptNo){state=mergeState(state,{certificateBranches:incoming.certificateBranches||[],certificateReceipts:incoming.certificateReceipts||[],certificateNextReceiptNo:incoming.certificateNextReceiptNo});await persist();}});

  window.EFC_OPEN_CERTIFICATE_RECEIPT_V13=openReceipt;
  window.EFC_SAVE_CERTIFICATE_PDF_V13=savePdf;
  window.EFC_OPEN_CERT_MANAGER_RECEIPT_V22=openCertificateManagerReceipt;
  window.EFC_SAVE_CERT_MANAGER_RECEIPT_PDF_V22=saveCertificateManagerReceiptPdf;
  window.EFC_EDIT_CERTIFICATE_RECEIPT_V13=beginCertificateReceiptEdit;
  window.EFC_DELETE_CERTIFICATE_RECEIPT_V13=deleteCertificateReceipt;
  window.EFC_OPEN_CERTIFICATE_DELIVERY_V13=openCertificateDelivery;
  window.EFC_OPEN_CERTIFICATE_DELIVERY_RECEIPT_V13=openCertificateDeliveryReceipt;
  window.EFC_SAVE_CERTIFICATE_DELIVERY_PDF_V13=saveCertificateDeliveryPdf;
  window.EFC_CERTIFICATE_EDIT_V44=Object.freeze({active:()=>Boolean(editingReceipt()),cancel:cancelCertificateReceiptEdit,begin:beginCertificateReceiptEdit});
  window.EFC_FIND_CERTIFICATE_V13=id=>state.certificateReceipts.find(item=>String(item.id)===String(id))||null;
  window.EFC_CERTIFICATE_PAYMENTS_V13=()=>state.certificateReceipts.map(certificatePayment);
  window.EFC_CERTIFICATE_STATE_V14=Object.freeze({snapshot:()=>JSON.parse(JSON.stringify(state)),purgeReceiptsByIdentity:async({ids=[],recordCodes=[],transactionCodes=[]}={})=>{const idSet=new Set((ids||[]).map(String)),records=new Set((recordCodes||[]).map(String)),transactions=new Set((transactionCodes||[]).map(String)),before=state.certificateReceipts.length;state={...state,certificateReceipts:state.certificateReceipts.filter(item=>!idSet.has(String(item.id||''))&&!records.has(String(item.recordCode||''))&&!transactions.has(String(item.transactionCode||'')))};const deleted=before-state.certificateReceipts.length;if(deleted)await persist();return{deleted};}});
  window.EFC_RENDER_CERTIFICATES_V13=renderCertificates;
  window.EFC_CERTIFICATES_V13=Object.freeze({ready:true,consolidatedRenderer:true,singleStudentSelectionState:true,directSelectionControls:true,freshIssueStateAfterRender:true,asyncIssueGuard:true,branchAddPreservesDraft:true,separateCertificateFinance:true,certificateFinanceDailyMonthlyYearly:true,certificateFinanceCustomWeekRange:true,certificateFinanceByBranch:true,certificateFinanceBySpecialty:true,certificateFinanceByPaymentMethod:true,certificateFinancePeriodSummary:true,certificateFinanceSimplifiedUi:true,certificateFinanceMatchesGeneralLayout:true,certificateFinanceCurrentGeneralVisuals:true,certificateFinanceSummaryAboveFilters:true,certificateFinanceSummaryFilterClearance:true,certificateFinanceSummaryDedicatedRow:true,certificateFinanceCompactFilterGeometry:true,certificatePeriodSwitchConstrainedToGrid:true,certificateFinanceResponsiveRulesConsolidated:true,certificateFinancePositiveSummary:true,certificateFinanceFixedSpecialtyFilterWidth:true,certificateFinanceTopbarAligned:true,certificateFinanceNoChart:true,certificateFinanceDailyDateOnly:true,certificateFinanceFilterSummaryText:true,certificateFinanceResponsiveLikeLedger:true,certificateFinanceResponsive:true,certificateFinanceCompactSingleRowFilters:true,certificateFinanceResponsiveBreakdowns:true,certificateHistorySeparatePage:true,certificateHistoryCount:true,certificateHistoryCountCenteredBelowTitle:true,certificateHistoryUsesFinanceFilters:true,certificateHistoryCustomWeekRange:true,certificateHistoryFilterByPeriod:true,certificateHistoryFilterByBranch:true,certificateHistoryFilterBySpecialty:true,certificateHistoryFilterByPaymentMethod:true,certificateHistoryFilterSummaryText:true,certificateHistorySummaryMatchesFinance:true,certificateTerminologyUsesCertificateOnly:true,certificateToolbarStyledActions:true,certificateFinanceNoHistoryTable:true,certificateHistorySpreadsheetTable:true,certificateHistoryStandardGreenHeader:true,certificateManagerReceipt:true,certificateManagerReceiptDoesNotMutateFinance:true,certificateManagerReceiptAsksFundsLocation:true,certificateManagerReceiptFiltersCenterAndCertificate:true,certificateManagerReceiptDefaultsAllCentersAndCertificates:true,certificateManagerReceiptColoredSummary:true,certificateManagerAmountProminentInline:true,certificateFinanceSpecialtyTerminology:true,certificateReceiptPaidAmountLabel:true,certificatePdfLogoCaptureFixed:true,certificateUsesSharedEmbeddedLogo:true,certificateReceiptEditDelete:true,certificateDeliveryTracking:true,certificateDeliveryStudentOrAgent:true,certificateDeliveryNoDefaultRecipient:true,certificateDeliveryExclusiveRecipientFields:true,certificateDeliveryClearStudentHeader:true,certificateDeliveryHistoryDate:true,certificateDeliveryReadonlyAfterSave:true,certificateDeliveryReceipt:true,certificateDeliveryReceiptCongrats:true,certificateExternalReceiptFullEdit:true,certificateInternalReceiptIdentityLocked:true,certificateReceiptFiscalLockAware:true,certificateReceiptNumbersNeverReused:true,certificateReceiptHighWaterPersisted:true,certificateInternalEditStudentSelectionLocked:true,rollingFinancialYearsFrom2025:true,certificateIncomeExcludedFromMainFinance:true,certificateIncomeExcludedFromLedger:true,externalCertificateBranches:true,internalBranchAndSpecialtyFilter:true,internalSearchWithoutRequiredFilters:true,certificateStudentResultsClickable:true,certificateReceiptInAppViewer:true,externalRegistrationNative:true,externalReceiptIssueEnabled:true,certificateIncomeInLedgerAndFinance:false,receiptHeaderUnified:true,certificateReceiptTitleLarge:true,certificateManagementTitleBelowHeader:true,paymentMethodsFromSettings:true,certificateReceiptHeaderSimplified:true,certificateFeeNoteRemoved:true,permissionsEnforced:true,noObserverPatch:true,noRouterHook:true,cleanReceiptDependency:true});
}

boot().catch(error=>{console.error('EFC certificates v13 failed to initialize.',error);throw error;});
})();