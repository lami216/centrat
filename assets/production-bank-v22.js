(function bankModule(){
'use strict';
if(window.EFC_BANK_V22?.ready)return;
if(!window.EFC_RECEIPTS_V13?.ready||typeof shell!=='function')throw new Error('Bank v22 loaded before receipt/foundation runtime.');

const STORAGE_KEY='efc-bank-state-v22';
const invoke=window.__TAURI__?.core?.invoke;
const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const pad2=value=>String(value).padStart(2,'0');
const today=()=>typeof deviceTodayV3==='function'?deviceTodayV3():(()=>{const d=new Date();return`${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;})();
const showDate=value=>typeof fmtDateV3==='function'?fmtDateV3(value):String(value||'—');
const cash=value=>typeof moneyV3==='function'?moneyV3(value):`${Number(value||0)} أوقية`;
const uid=prefix=>`${prefix}-${Date.now().toString(36)}-${globalThis.crypto?.randomUUID?.().replaceAll('-','').slice(0,12)||Math.random().toString(36).slice(2,14)}`;
const canEditBank=()=>window.EFC_AUTH_BOOTSTRAP_V13?.canEdit?.('bank')??true;
const receiptLogo=()=>window.EFC_RECEIPT_LOGO_DATA_URI||new URL('./efc-logo.svg',location.href).href;
const MONTH_NAMES=['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
let state={entries:[],nextReceiptNo:1,tombstones:[]},editingId=null,saveChain=Promise.resolve();
let filterState={mode:'daily',day:today(),from:today(),to:today(),month:Number(today().slice(5,7)),year:Number(today().slice(0,4))};

function normalizeEntry(item){
  if(!item||typeof item!=='object')return null;
  const amount=Math.max(0,Number(item.amount||0)),statement=String(item.statement||item.note||'').trim();
  if(amount<=0||!statement)return null;
  return{
    id:String(item.id||uid('bank')),
    recordCode:String(item.recordCode||uid('bank-record')),
    receiptNo:Math.max(1,Number(item.receiptNo||1)),
    type:item.type==='out'?'out':'in',
    amount,
    statement,
    date:String(item.date||today()),
    time:String(item.time||'00:00'),
    createdAt:Math.max(0,Number(item.createdAt||Date.now())),
    updatedAt:Math.max(0,Number(item.updatedAt||item.createdAt||Date.now()))
  };
}
function normalizeTombstone(item){
  if(!item||typeof item!=='object')return null;
  const recordCode=String(item.recordCode||'').trim(),id=String(item.id||'').trim();
  if(!recordCode&&!id)return null;
  return{recordCode,id,deletedAt:Math.max(0,Number(item.deletedAt||Date.now()))};
}
function normalizeState(raw){
  const source=raw&&typeof raw==='object'?raw:{},tombstoneMap=new Map();
  (Array.isArray(source.tombstones)?source.tombstones:Array.isArray(source.bankTombstones)?source.bankTombstones:[]).map(normalizeTombstone).filter(Boolean).forEach(item=>{
    const key=item.recordCode?`r:${item.recordCode}`:`i:${item.id}`,old=tombstoneMap.get(key);if(!old||item.deletedAt>=old.deletedAt)tombstoneMap.set(key,item);
  });
  const tombstones=[...tombstoneMap.values()],deadRecord=new Set(tombstones.map(item=>item.recordCode).filter(Boolean)),deadId=new Set(tombstones.map(item=>item.id).filter(Boolean)),entryMap=new Map();
  (Array.isArray(source.entries)?source.entries:Array.isArray(source.bankEntries)?source.bankEntries:[]).map(normalizeEntry).filter(Boolean).forEach(item=>{
    if(deadRecord.has(item.recordCode)||deadId.has(item.id))return;
    const key=item.recordCode?`r:${item.recordCode}`:`i:${item.id}`,old=entryMap.get(key);if(!old||item.updatedAt>=old.updatedAt)entryMap.set(key,item);
  });
  const entries=[...entryMap.values()],maxReceipt=Math.max(0,...entries.map(item=>Number(item.receiptNo||0))),configured=Math.max(1,Number(source.nextReceiptNo||source.bankNextReceiptNo||1));
  return{entries,nextReceiptNo:Math.max(configured,maxReceipt+1),tombstones};
}
function mergeState(aRaw,bRaw){
  const a=normalizeState(aRaw),b=normalizeState(bRaw);
  return normalizeState({entries:[...a.entries,...b.entries],tombstones:[...a.tombstones,...b.tombstones],nextReceiptNo:Math.max(a.nextReceiptNo,b.nextReceiptNo)});
}
function readLocal(){try{return normalizeState(JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}'));}catch{return normalizeState({});}}
function writeLocal(){localStorage.setItem(STORAGE_KEY,JSON.stringify(state));}
async function persist(){
  writeLocal();
  if(!invoke){window.EFC_CORE_CHANGED?.();return;}
  const snapshot=JSON.stringify(state);
  saveChain=saveChain.catch(()=>undefined).then(()=>invoke('save_bank_state',{state:snapshot}));
  await saveChain;
  window.EFC_CORE_CHANGED?.();
}
async function loadState(){
  const local=readLocal();
  if(!invoke){state=local;return;}
  try{
    const raw=await invoke('load_bank_state'),native=raw?normalizeState(JSON.parse(raw)):normalizeState({});
    state=mergeState(native,local);await persist();
  }catch(error){console.error('EFC bank state load failed; local state kept.',error);state=local;}
}
function nextReceiptNo(){const floor=Math.max(1,...state.entries.map(item=>Number(item.receiptNo||0)+1)),number=Math.max(floor,Number(state.nextReceiptNo||1));state.nextReceiptNo=number+1;writeLocal();return number;}
function nowTime(){const d=new Date();return`${pad2(d.getHours())}:${pad2(d.getMinutes())}`;}
function receiptCode(entry){return String(Math.max(1,Number(entry?.receiptNo||1))).padStart(5,'0');}
const whatsappIcon=()=>`<span class="socialIcon12" aria-hidden="true"><svg viewBox="0 0 32 32"><path d="M16.05 3.2A12.65 12.65 0 0 0 5.2 22.34L3.5 28.5l6.3-1.65a12.63 12.63 0 1 0 6.25-23.65Zm0 22.98a10.4 10.4 0 0 1-5.3-1.45l-.38-.23-3.74.98 1-3.64-.25-.38a10.42 10.42 0 1 1 8.67 4.72Zm5.72-7.8c-.31-.16-1.85-.91-2.14-1.02-.28-.1-.49-.16-.7.16-.2.31-.8 1.02-.98 1.23-.18.2-.36.23-.67.08-.31-.16-1.31-.48-2.5-1.54-.92-.82-1.55-1.84-1.73-2.15-.18-.31-.02-.48.14-.64.14-.14.31-.36.47-.55.16-.18.2-.31.31-.52.1-.2.05-.39-.03-.55-.08-.16-.7-1.68-.96-2.3-.25-.6-.51-.52-.7-.53h-.6c-.2 0-.54.08-.83.39-.28.31-1.08 1.05-1.08 2.57 0 1.51 1.1 2.98 1.26 3.18.16.2 2.17 3.31 5.25 4.64.73.32 1.3.5 1.75.64.74.23 1.4.2 1.93.12.59-.09 1.85-.76 2.11-1.49.26-.73.26-1.36.18-1.49-.08-.13-.29-.2-.6-.36Z"/></svg></span>`;
const facebookIcon=()=>`<span class="socialIcon12" aria-hidden="true"><svg viewBox="0 0 32 32"><path d="M18.3 29V17.1h4l.6-4.7h-4.6v-3c0-1.35.37-2.28 2.32-2.28H23V2.94c-.41-.06-1.82-.18-3.47-.18-3.44 0-5.8 2.1-5.8 5.96v3.68H9.84v4.7h3.89V29h4.57Z"/></svg></span>`;
function receiptCss(){return`
*{box-sizing:border-box}body{font-family:Tahoma,Arial,sans-serif;margin:0;background:#eef1f0;color:#111715}.bank-paper-v22{width:1040px;max-width:96vw;margin:18px auto;background:#fff;border:2px solid #293631;padding:12px 18px 18px;direction:ltr}.head12{display:grid;grid-template-columns:240px 1fr 150px;gap:14px;align-items:center;border-bottom:1px solid #b2b8b5;padding-bottom:6px}.contact12{display:grid;grid-template-columns:92px 1fr;gap:8px;align-items:center;direction:ltr;text-align:left}.contact12 img,.logoOnly12 img{width:82px;height:62px;object-fit:contain;display:block}.contactText12{display:grid;gap:1px}.contactText12>b{font-size:13px;white-space:nowrap}.socialLine12{display:flex;align-items:center;gap:5px;font-size:13px;font-weight:700;white-space:nowrap}.socialLine12.teacher12{font-size:10px;margin-top:2px}.socialLine12.teacher12 span:last-child{direction:rtl}.socialIcon12{width:14px;height:14px;display:inline-block;flex:0 0 14px}.socialIcon12 svg{width:100%;height:100%;fill:currentColor}.center12{text-align:center;direction:rtl}.title12{display:flex;direction:ltr;justify-content:center;align-items:baseline;gap:12px;white-space:nowrap;margin:0;font-size:27px}.official12{font-size:11px;font-weight:900;margin-top:3px}.rn12{display:flex;direction:ltr;justify-content:center;gap:9px;margin-top:4px;font-size:17px}.rn12 b{font-size:21px}.logoOnly12{height:66px;display:grid;place-items:center}.bank-kind-v22{text-align:center;direction:rtl;margin:12px 0 10px;font-size:30px;font-weight:950}.bank-kind-v22.in{color:#08745b}.bank-kind-v22.out{color:#a33b32}.bank-meta-v22{display:flex;justify-content:space-between;gap:20px;direction:ltr;border-bottom:1px solid #d9dedc;padding:6px 0}.bank-meta-v22 span{direction:rtl}.bank-row-v22{display:grid;grid-template-columns:160px minmax(0,1fr) 140px;gap:10px;align-items:center;min-height:52px;font-size:14px;direction:ltr}.bank-row-v22>span:first-child{text-align:left;font-weight:700}.bank-row-v22>span:last-child{text-align:right;direction:rtl;font-weight:800}.bank-track-v22{position:relative;min-height:36px;display:flex;align-items:center;justify-content:center}.bank-track-v22:before{content:"";position:absolute;left:0;right:0;top:50%;border-top:2px dotted #7d8581}.bank-track-v22 b{position:relative;background:#fff;padding:0 12px;direction:rtl;font-size:17px;max-width:100%;white-space:normal;overflow-wrap:anywhere;word-break:break-word;text-align:center}.bank-amount-v22 b{font-size:24px;color:#7d2e2e}.bank-actions-v22{width:1040px;max-width:96vw;margin:0 auto 18px;display:flex;direction:rtl;gap:8px}.bank-actions-v22 button{border:0;border-radius:7px;padding:10px 17px;font:700 13px Tahoma;cursor:pointer}.bank-print-v22{background:#155ea8;color:#fff}.bank-save-v22{background:#159a55;color:#fff}@media print{body{background:#fff}.bank-paper-v22{width:100%;max-width:none;margin:0;border:1px solid #222}.bank-actions-v22{display:none}@page{size:landscape;margin:8mm}}
`;}
function receiptHeader(entry){
  const img=`<img src="${receiptLogo()}" alt="EFC">`;
  return`<div class="head12"><div class="contact12">${img}<div class="contactText12"><b>Tél: 48 02 84 84</b><div class="socialLine12">${whatsappIcon()}<span>32 09 86 89</span></div><div class="socialLine12 teacher12">${facebookIcon()}<span>الأستاذ محمد ديدي</span></div></div></div><div class="center12"><h1 class="title12"><span>Centre EFC</span><span>مركز</span></h1><div class="official12">للغات والمعلوماتية</div><div class="rn12"><span>Pièce N°</span><b>${receiptCode(entry)}</b><span>سند رقم</span></div></div><div class="logoOnly12">${img}</div></div>`;
}
function receiptBody(entry){
  const kind=entry.type==='out'?'صرف':'دخل';
  return`${receiptHeader(entry)}<div class="bank-kind-v22 ${entry.type}">${kind}</div><div class="bank-meta-v22"><span>التاريخ: <b>${showDate(entry.date)}</b></span><span>الوقت: <b>${esc(entry.time||'—')}</b></span></div><div class="bank-row-v22 bank-amount-v22"><span>Montant</span><span class="bank-track-v22"><b>${cash(entry.amount)}</b></span><span>المبلغ</span></div><div class="bank-row-v22"><span>Libellé</span><span class="bank-track-v22"><b>${esc(entry.statement)}</b></span><span>البيان</span></div>`;
}
function receiptDocument(entry,actions=true,autoPrint=false){
  const data=JSON.stringify(entry).replace(/</g,'\\u003c');
  return`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>روسي البنك ${receiptCode(entry)}</title><style>${receiptCss()}</style></head><body><div class="bank-paper-v22">${receiptBody(entry)}</div>${actions?`<div class="bank-actions-v22"><button class="bank-print-v22" onclick="print()">طباعة</button><button class="bank-save-v22" onclick="parent.EFC_SAVE_BANK_RECEIPT_PDF_V22(BANK_ENTRY)">حفظ PDF</button></div>`:''}<script>const BANK_ENTRY=${data};${autoPrint?'setTimeout(()=>print(),250);':''}<\/script></body></html>`;
}
function openReceipt(entry,autoPrint=false){
  if(!entry)return null;
  const modal=document.createElement('div');modal.className='modal receipt-viewer-v13';modal.innerHTML='<div class="receipt-viewer-card-v13"><div class="receipt-viewer-head-v13"><b>عرض روسي البنك</b><button class="receipt-viewer-close-v13" type="button">×</button></div><iframe class="receipt-viewer-frame-v13" title="روسي البنك"></iframe></div>';
  document.body.appendChild(modal);const frame=modal.querySelector('iframe'),close=()=>modal.remove();modal.querySelector('.receipt-viewer-close-v13').onclick=close;frame.srcdoc=receiptDocument(entry,true,autoPrint);return{close,frame};
}
function loadLocal(src,key){if(window[key])return Promise.resolve();return new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=src;script.onload=resolve;script.onerror=()=>reject(new Error(`تعذر تحميل ${src} محليًا.`));document.head.appendChild(script);});}
async function waitImages(root){await Promise.all([...root.querySelectorAll('img')].map(async image=>{if(!image.complete||!image.naturalWidth)await new Promise(resolve=>{const done=()=>resolve();image.addEventListener('load',done,{once:true});image.addEventListener('error',done,{once:true});setTimeout(done,1600);});try{await image.decode?.();}catch{}}));try{await root.ownerDocument.fonts?.ready;}catch{}}
function bufferToBase64(buffer){const bytes=new Uint8Array(buffer);let binary='';for(let i=0;i<bytes.length;i+=0x8000)binary+=String.fromCharCode(...bytes.subarray(i,Math.min(i+0x8000,bytes.length)));return btoa(binary);}
async function saveReceiptPdf(entry){
  let stage;
  try{
    await Promise.all([loadLocal('./vendor/html2canvas.min.js','html2canvas'),loadLocal('./vendor/jspdf.umd.min.js','jspdf')]);
    stage=document.createElement('div');stage.style.cssText='position:fixed;left:-16000px;top:0;width:1040px;background:#fff;z-index:-9999';stage.innerHTML=`<style>${receiptCss()}</style><div class="bank-paper-v22">${receiptBody(entry)}</div>`;document.body.appendChild(stage);
    const paper=stage.querySelector('.bank-paper-v22');await waitImages(paper);const canvas=await window.html2canvas(paper,{scale:2,backgroundColor:'#fff',useCORS:false,allowTaint:false,logging:false}),{jsPDF}=window.jspdf,pdf=new jsPDF({orientation:'landscape',unit:'mm',format:'a4'}),pw=pdf.internal.pageSize.getWidth(),ph=pdf.internal.pageSize.getHeight(),ratio=Math.min(pw/canvas.width,ph/canvas.height),w=canvas.width*ratio,h=canvas.height*ratio;pdf.addImage(canvas.toDataURL('image/jpeg',.96),'JPEG',(pw-w)/2,(ph-h)/2,w,h);
    const fileName=`روسي-البنك-${receiptCode(entry)}.pdf`;if(!invoke){pdf.save(fileName);return fileName;}const saved=await invoke('save_receipt_pdf',{fileName,dataBase64:bufferToBase64(pdf.output('arraybuffer'))});if(saved)alert(`تم حفظ روسي البنك:\n${saved}`);return saved;
  }catch(error){if(error?.name==='AbortError')return null;console.error('EFC bank receipt PDF failed.',error);alert(String(error?.message||error||'تعذر حفظ روسي البنك.'));return null;}finally{stage?.remove();}
}
function totals(rows=state.entries){return rows.reduce((acc,item)=>{if(item.type==='out')acc.out+=Number(item.amount||0);else acc.in+=Number(item.amount||0);return acc;},{in:0,out:0});}
function sortedEntries(rows=state.entries){return [...rows].sort((a,b)=>String(b.date).localeCompare(String(a.date))||String(b.time).localeCompare(String(a.time))||Number(b.createdAt)-Number(a.createdAt));}
function bankFilterYears(){
  const current=Number(today().slice(0,4)),years=new Set([current]);
  state.entries.forEach(item=>{const year=Number(String(item.date||'').slice(0,4));if(Number.isInteger(year)&&year>=2000&&year<=current+1)years.add(year);});
  for(let year=Math.max(2025,current-9);year<=current;year++)years.add(year);
  return[...years].sort((a,b)=>b-a);
}
function bankFilterRange(){
  const mode=['daily','weekly','monthly','yearly'].includes(filterState.mode)?filterState.mode:'daily',year=Number(filterState.year||today().slice(0,4)),month=Math.max(1,Math.min(12,Number(filterState.month||today().slice(5,7))));
  if(mode==='daily'){const day=String(filterState.day||today());return{mode,from:day,to:day,label:`يوم ${showDate(day)}`};}
  if(mode==='weekly'){const first=String(filterState.from||today()),last=String(filterState.to||first),from=first<=last?first:last,to=first<=last?last:first;return{mode,from,to,label:`من ${showDate(from)} إلى ${showDate(to)}`};}
  if(mode==='monthly'){const last=new Date(year,month,0).getDate(),from=`${year}-${pad2(month)}-01`,to=`${year}-${pad2(month)}-${pad2(last)}`;return{mode,from,to,label:`شهر ${MONTH_NAMES[month-1]} ${year}`};}
  return{mode,from:`${year}-01-01`,to:`${year}-12-31`,label:`سنة ${year}`};
}
function bankPeriodRows(range=bankFilterRange()){return sortedEntries(state.entries.filter(item=>String(item.date||'')>=range.from&&String(item.date||'')<=range.to));}
function bankPeriodReportModel(){
  const range=bankFilterRange(),rows=bankPeriodRows(range),{in:income,out:expense}=totals(rows),incomeCount=rows.filter(item=>item.type!=='out').length,expenseCount=rows.filter(item=>item.type==='out').length;
  return{from:range.from,to:range.to,label:range.label,mode:range.mode,count:rows.length,incomeCount,expenseCount,income,expense,balance:income-expense,createdDate:today(),createdTime:nowTime()};
}
function bankPeriodReportCss(){return`
*{box-sizing:border-box}body{font-family:Tahoma,Arial,sans-serif;margin:0;background:#eef1f0;color:#111715}.bank-report-paper-v22{width:1040px;max-width:96vw;margin:18px auto;background:#fff;border:2px solid #293631;padding:12px 18px 22px;direction:ltr}.head12{display:grid;grid-template-columns:240px 1fr 150px;gap:14px;align-items:center;border-bottom:1px solid #b2b8b5;padding-bottom:6px}.contact12{display:grid;grid-template-columns:92px 1fr;gap:8px;align-items:center;direction:ltr;text-align:left}.contact12 img,.logoOnly12 img{width:82px;height:62px;object-fit:contain;display:block}.contactText12{display:grid;gap:1px}.contactText12>b{font-size:13px;white-space:nowrap}.socialLine12{display:flex;align-items:center;gap:5px;font-size:13px;font-weight:700;white-space:nowrap}.socialLine12.teacher12{font-size:10px;margin-top:2px}.socialLine12.teacher12 span:last-child{direction:rtl}.socialIcon12{width:14px;height:14px;display:inline-block;flex:0 0 14px}.socialIcon12 svg{width:100%;height:100%;fill:currentColor}.center12{text-align:center;direction:rtl}.title12{display:flex;direction:ltr;justify-content:center;align-items:baseline;gap:12px;white-space:nowrap;margin:0;font-size:27px}.official12{font-size:11px;font-weight:900;margin-top:3px}.tag12{font-size:11px;font-weight:800;margin-top:3px}.logoOnly12{height:66px;display:grid;place-items:center}.bank-report-title-v22{text-align:center;direction:rtl;font-size:28px;font-weight:950;color:#073f35;margin:14px 0 8px}.bank-report-meta-v22{display:flex;justify-content:center;gap:35px;direction:rtl;border-bottom:1px solid #d9dedc;padding:8px 0 12px;font-size:12px}.bank-report-period-v22{text-align:center;direction:rtl;margin:16px auto 14px;border:1px solid #d7dfdc;background:#fafcfb;border-radius:10px;padding:11px 18px;width:min(640px,100%)}.bank-report-period-v22 small{display:block;color:#65736e;font-size:10px;margin-bottom:5px}.bank-report-period-v22 b{font-size:18px}.bank-report-kpis-v22{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:15px;direction:rtl;margin:18px 0}.bank-report-kpi-v22{border-radius:13px;padding:18px;text-align:center;border:1px solid transparent}.bank-report-kpi-v22 small{display:block;font-size:11px;margin-bottom:8px;color:#32453e}.bank-report-kpi-v22 b{font-size:26px}.bank-report-kpi-v22 em{display:block;margin-top:7px;font-style:normal;font-size:10px;font-weight:800;color:#52635d}.bank-report-kpi-v22.income{background:#ddf6e7;border-color:#9bd6af}.bank-report-kpi-v22.expense{background:#fde5e3;border-color:#efb5af}.bank-report-kpi-v22.balance{background:#fff3c7;border-color:#e7cf72}.bank-report-count-v22{text-align:center;direction:rtl;color:#5f7069;font-size:11px;margin-top:8px}.bank-report-actions-v22{width:1040px;max-width:96vw;margin:0 auto 18px;display:flex;direction:rtl;gap:8px}.bank-report-actions-v22 button{border:0;border-radius:7px;padding:10px 17px;font:700 13px Tahoma;cursor:pointer}.bank-report-print-v22{background:#155ea8;color:#fff}.bank-report-save-v22{background:#159a55;color:#fff}@media(max-width:760px){.bank-report-kpis-v22{grid-template-columns:1fr}.bank-report-meta-v22{flex-direction:column;gap:6px}}@media print{body{background:#fff}.bank-report-paper-v22{width:100%;max-width:none;margin:0;border:1px solid #222}.bank-report-actions-v22{display:none}@page{size:landscape;margin:8mm}}
`;}
function bankPeriodReportHeader(){
  const img=`<img src="${receiptLogo()}" alt="EFC">`;
  return`<div class="head12"><div class="contact12">${img}<div class="contactText12"><b>Tél: 48 02 84 84</b><div class="socialLine12">${whatsappIcon()}<span>32 09 86 89</span></div><div class="socialLine12 teacher12">${facebookIcon()}<span>الأستاذ محمد ديدي</span></div></div></div><div class="center12"><h1 class="title12"><span>Centre EFC</span><span>مركز</span></h1><div class="official12">للغات والمعلوماتية</div><div class="tag12">إدارة البنك</div></div><div class="logoOnly12">${img}</div></div>`;
}
function bankPeriodReportBody(model){
  return`${bankPeriodReportHeader()}<div class="bank-report-title-v22">تقرير البنك</div><div class="bank-report-meta-v22"><span>تاريخ الإصدار: <b>${showDate(model.createdDate)}</b></span><span>حركات الدخل: <b>${model.incomeCount}</b></span><span>حركات الصرف: <b>${model.expenseCount}</b></span></div><div class="bank-report-period-v22"><small>الفترة</small><b>${esc(model.label)}</b></div><div class="bank-report-kpis-v22"><div class="bank-report-kpi-v22 income"><small>إجمالي الدخل</small><b>${cash(model.income)}</b><em>${model.incomeCount} حركة دخل</em></div><div class="bank-report-kpi-v22 expense"><small>إجمالي الصرف</small><b>${cash(model.expense)}</b><em>${model.expenseCount} حركة صرف</em></div><div class="bank-report-kpi-v22 balance"><small>المتبقي</small><b>${cash(model.balance)}</b><em>الدخل ناقص الصرف</em></div></div><div class="bank-report-count-v22">هذا التقرير يعرض حركات البنك المسجلة داخل الفترة المحددة فقط.</div>`;
}
function bankPeriodReportDocument(model,actions=true,autoPrint=false){
  const data=JSON.stringify(model).replace(/</g,'\\u003c');
  return`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>تقرير البنك</title><style>${bankPeriodReportCss()}</style></head><body><div class="bank-report-paper-v22">${bankPeriodReportBody(model)}</div>${actions?`<div class="bank-report-actions-v22"><button class="bank-report-print-v22" onclick="print()">طباعة</button><button class="bank-report-save-v22" onclick="parent.EFC_SAVE_BANK_PERIOD_REPORT_PDF_V22(BANK_REPORT)">حفظ PDF</button></div>`:''}<script>const BANK_REPORT=${data};${autoPrint?'setTimeout(()=>print(),250);':''}<\/script></body></html>`;
}
function openBankPeriodReport(model=bankPeriodReportModel(),autoPrint=false){
  const modal=document.createElement('div');modal.className='modal receipt-viewer-v13';modal.innerHTML='<div class="receipt-viewer-card-v13"><div class="receipt-viewer-head-v13"><b>تقرير البنك</b><button class="receipt-viewer-close-v13" type="button">×</button></div><iframe class="receipt-viewer-frame-v13" title="تقرير البنك"></iframe></div>';document.body.appendChild(modal);const frame=modal.querySelector('iframe'),close=()=>modal.remove();modal.querySelector('.receipt-viewer-close-v13').onclick=close;frame.srcdoc=bankPeriodReportDocument(model,true,autoPrint);return{close,frame};
}
async function saveBankPeriodReportPdf(model){
  let stage;
  try{
    await Promise.all([loadLocal('./vendor/html2canvas.min.js','html2canvas'),loadLocal('./vendor/jspdf.umd.min.js','jspdf')]);
    stage=document.createElement('div');stage.style.cssText='position:fixed;left:-16000px;top:0;width:1040px;background:#fff;z-index:-9999';stage.innerHTML=`<style>${bankPeriodReportCss()}</style><div class="bank-report-paper-v22">${bankPeriodReportBody(model)}</div>`;document.body.appendChild(stage);
    const paper=stage.querySelector('.bank-report-paper-v22');await waitImages(paper);const canvas=await window.html2canvas(paper,{scale:2,backgroundColor:'#fff',useCORS:false,allowTaint:false,logging:false}),{jsPDF}=window.jspdf,pdf=new jsPDF({orientation:'landscape',unit:'mm',format:'a4'}),pw=pdf.internal.pageSize.getWidth(),ph=pdf.internal.pageSize.getHeight(),ratio=Math.min(pw/canvas.width,ph/canvas.height),w=canvas.width*ratio,h=canvas.height*ratio;pdf.addImage(canvas.toDataURL('image/jpeg',.96),'JPEG',(pw-w)/2,(ph-h)/2,w,h);
    const fileName=`تقرير-البنك-${model.from}-${model.to}.pdf`;if(!invoke){pdf.save(fileName);return fileName;}const saved=await invoke('save_receipt_pdf',{fileName,dataBase64:bufferToBase64(pdf.output('arraybuffer'))});if(saved)alert(`تم حفظ تقرير البنك:\n${saved}`);return saved;
  }catch(error){if(error?.name==='AbortError')return null;console.error('EFC bank period report PDF failed.',error);alert(String(error?.message||error||'تعذر حفظ تقرير البنك.'));return null;}finally{stage?.remove();}
}
function bankRowsHtml(rows,editable){
  return rows.length?`<div class="table-wrap"><table><thead><tr><th>رقم الروسي</th><th>النوع</th><th>المبلغ</th><th>البيان</th><th>التاريخ</th><th>الوقت</th><th>إجراء</th></tr></thead><tbody>${rows.map(entry=>`<tr data-bank-id="${esc(entry.id)}"><td>${receiptCode(entry)}</td><td class="${entry.type==='out'?'bank-type-out':'bank-type-in'}">${entry.type==='out'?'صرف':'دخل'}</td><td>${cash(entry.amount)}</td><td class="bank-statement-cell-v22" title="${esc(entry.statement)}">${esc(entry.statement)}</td><td>${showDate(entry.date)}</td><td>${esc(entry.time)}</td><td><div class="bank-actions-cell-v22"><button class="mini bank-receipt-v22" type="button">روسي</button><button class="mini bank-edit-v22" type="button" ${editable?'':'disabled'}>تعديل</button><button class="mini bank-delete-v22" type="button" ${editable?'':'disabled'}>حذف</button></div></td></tr>`).join('')}</tbody></table></div>`:'<div class="bank-empty-v22">لا توجد حركات بنك في الفترة المحددة.</div>';
}
function bindBankRows(){
  document.querySelectorAll('[data-bank-id]').forEach(row=>{const id=row.dataset.bankId,entry=state.entries.find(item=>item.id===id);row.querySelector('.bank-receipt-v22')?.addEventListener('click',()=>openReceipt(entry));row.querySelector('.bank-edit-v22')?.addEventListener('click',()=>beginEdit(id));row.querySelector('.bank-delete-v22')?.addEventListener('click',()=>deleteEntry(id));});
}
function syncBankFilterVisibility(){
  const mode=filterState.mode;
  document.querySelectorAll('[data-bank-period-field]').forEach(element=>{element.hidden=element.dataset.bankPeriodField!==mode&&!(mode==='monthly'&&element.dataset.bankPeriodField==='monthYear')&&!(mode==='yearly'&&element.dataset.bankPeriodField==='yearOnly');});
  document.querySelectorAll('#bankPeriodModeV22 [data-mode]').forEach(button=>button.classList.toggle('active',button.dataset.mode===mode));
}
function drawBankPeriod(){
  const range=bankFilterRange(),rows=bankPeriodRows(range),{in:income,out:expense}=totals(rows),balance=income-expense,incomeCount=rows.filter(item=>item.type!=='out').length,expenseCount=rows.filter(item=>item.type==='out').length,editable=canEditBank();
  const incomeEl=document.getElementById('bankIncomeTotalV22'),expenseEl=document.getElementById('bankExpenseTotalV22'),balanceEl=document.getElementById('bankBalanceTotalV22'),incomeCountEl=document.getElementById('bankIncomeCountV22'),expenseCountEl=document.getElementById('bankExpenseCountV22'),summary=document.getElementById('bankPeriodSummaryV22'),table=document.getElementById('bankRowsV22');
  if(incomeEl)incomeEl.textContent=cash(income);if(expenseEl)expenseEl.textContent=cash(expense);if(balanceEl)balanceEl.textContent=cash(balance);if(incomeCountEl)incomeCountEl.textContent=`${incomeCount} حركة دخل`;if(expenseCountEl)expenseCountEl.textContent=`${expenseCount} حركة صرف`;if(summary)summary.textContent=`عرض ${range.label} · ${incomeCount} حركة دخل · ${expenseCount} حركة صرف`;if(table){table.innerHTML=bankRowsHtml(rows,editable);bindBankRows();}
  syncBankFilterVisibility();
}
function ensureStyle(){
  if(document.getElementById('efc-bank-style-v22'))return;
  const style=document.createElement('style');style.id='efc-bank-style-v22';style.textContent=`
.bank-hero-v22{width:min(470px,100%);height:76px;margin:0 auto 14px;border-radius:15px;background:linear-gradient(110deg,#dcf6ee,#e8faf5 68%,#e4f7f2);display:flex;align-items:center;justify-content:center;gap:18px;color:#073f35;position:relative}.bank-hero-v22:after{content:"";position:absolute;bottom:10px;left:50%;width:48px;height:3px;border-radius:99px;background:#0b7b62;transform:translateX(-50%)}.bank-hero-v22 svg{width:38px;height:38px}.bank-hero-v22 h1{margin:0;font-size:31px}.bank-form-v22{display:grid;grid-template-columns:130px 150px 150px minmax(240px,1fr) auto;gap:10px;align-items:end;margin-bottom:12px}.bank-form-v22 label{display:grid;gap:5px;font-size:10px;font-weight:750}.bank-form-v22 input,.bank-form-v22 select,.bank-form-v22 textarea{width:100%;min-width:0;border:1px solid #ccd9d4;border-radius:8px;background:#fff;font-family:inherit;font-size:11px;padding:8px}.bank-form-v22 textarea{height:40px;min-height:40px;max-height:40px;resize:none;overflow:auto}.bank-form-v22 .button{height:40px}.bank-edit-note-v22{grid-column:1/-1;color:#795b24;font-size:9px}.bank-period-filter-v22{display:grid;grid-template-columns:220px repeat(3,minmax(120px,1fr)) auto;gap:9px;align-items:end;margin-bottom:12px;padding:10px 12px}.bank-period-filter-v22 label{display:grid;gap:4px;font-size:9px;font-weight:760;color:#294d43}.bank-period-filter-v22 label[hidden]{display:none!important}.bank-period-filter-v22 input,.bank-period-filter-v22 select{height:38px;border:1px solid #cfddd8;border-radius:8px;background:#fff;font-family:inherit;padding:7px 8px}.bank-period-mode-v22{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:3px;padding:3px;border:1px solid #c9ddd6;border-radius:11px;background:#e9f4f0;height:38px}.bank-period-mode-v22 button{border:1px solid transparent;border-radius:8px;background:transparent;color:#58746b;font-family:inherit;font-size:10px;font-weight:800;cursor:pointer}.bank-period-mode-v22 button.active{background:linear-gradient(180deg,#0b7b62,#08624f);border-color:#08624f;color:#fff;box-shadow:0 4px 10px rgba(8,98,79,.15)}.bank-period-report-v22{height:38px;white-space:nowrap;background:#2e5d87!important}.bank-period-summary-v22{grid-column:1/-1;text-align:center;color:#62736d;font-size:9px;padding-top:1px}.bank-kpis-v22{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-bottom:12px}.bank-kpis-v22 .card{min-height:82px;display:flex;flex-direction:column;justify-content:center;gap:5px;border-width:1px}.bank-kpis-v22 small{color:#394943;font-size:9px;font-weight:800}.bank-kpis-v22 b{font-size:19px}.bank-kpis-v22>div>span{font-size:9px;font-weight:800;color:#52635d}.bank-kpis-v22 .income{background:#ddf6e7;border-color:#9bd6af}.bank-kpis-v22 .expense{background:#fde5e3;border-color:#efb5af}.bank-kpis-v22 .balance{background:#fff3c7;border-color:#e7cf72}.bank-kpis-v22 .balance b{color:#55450e}.bank-table-v22{padding:10px!important}.bank-table-v22 .table-wrap{width:100%;overflow:auto;border:1px solid rgba(0,0,0,.78);border-radius:10px;background:#fff}.bank-table-v22 table{width:100%;min-width:760px;border-collapse:collapse;table-layout:auto;background:#fff;font-size:10px}.bank-table-v22 th{height:42px;padding:8px 9px;background:linear-gradient(180deg,#0a715b,#075846);color:#fff;border:1px solid rgba(0,0,0,.80);font-size:10.5px;font-weight:850;text-align:center;vertical-align:middle}.bank-table-v22 td{height:39px;padding:8px 9px;border:1px solid rgba(0,0,0,.58);text-align:center;vertical-align:middle;background:#fff;font-size:10px}.bank-table-v22 th:nth-child(4),.bank-table-v22 td:nth-child(4){width:46%}.bank-table-v22 .bank-statement-cell-v22{white-space:normal!important;overflow-wrap:anywhere!important;word-break:break-word!important;line-height:1.55!important;direction:rtl!important;text-align:right!important}.bank-table-v22 tbody tr:nth-child(even) td{background:#fbfdfc}.bank-table-v22 tbody tr:hover td{background:#d7ebe4}.bank-table-v22 .bank-type-in{color:#08745b;font-weight:850}.bank-table-v22 .bank-type-out{color:#a33b32;font-weight:850}.bank-actions-cell-v22{display:flex;gap:5px;flex-wrap:wrap}.bank-actions-cell-v22 .mini{height:29px}.bank-actions-cell-v22 .bank-delete-v22{color:#9c332c;border-color:#e5bdb8}.bank-empty-v22{text-align:center;padding:28px;color:#73817c}@media(max-width:1100px){.bank-period-filter-v22{grid-template-columns:repeat(2,minmax(0,1fr))}.bank-period-mode-v22,.bank-period-summary-v22{grid-column:1/-1}.bank-period-report-v22{width:100%}.bank-form-v22{grid-template-columns:repeat(2,minmax(0,1fr))}.bank-form-v22 label:nth-child(4){grid-column:1/-1}.bank-form-v22 .button{width:100%}}@media(max-width:760px){.bank-period-filter-v22{grid-template-columns:1fr}.bank-period-mode-v22,.bank-period-summary-v22{grid-column:auto}.bank-kpis-v22{grid-template-columns:1fr}.bank-form-v22{grid-template-columns:1fr}.bank-form-v22 label:nth-child(4){grid-column:auto}}
`;document.head.appendChild(style);
}
async function saveEntry(){
  if(!canEditBank())return alert('الحساب الحالي لا يملك صلاحية تعديل البنك.');
  const type=document.getElementById('bankTypeV22')?.value==='out'?'out':'in',amount=Math.max(0,Number(document.getElementById('bankAmountV22')?.value||0)),statement=String(document.getElementById('bankStatementV22')?.value||'').trim(),date=String(document.getElementById('bankDateV22')?.value||today());
  if(amount<=0)return alert('أدخل مبلغًا صحيحًا.');if(!statement)return alert('أدخل البيان أو الملاحظة.');
  const current=editingId?state.entries.find(item=>item.id===editingId):null,entry=normalizeEntry(current?{...current,type,amount,statement,date,updatedAt:Date.now()}:{id:uid('bank'),recordCode:uid('bank-record'),receiptNo:nextReceiptNo(),type,amount,statement,date,time:nowTime(),createdAt:Date.now(),updatedAt:Date.now()});
  if(!entry)return alert('تعذر تجهيز حركة البنك.');
  if(current)state.entries=state.entries.map(item=>item.id===current.id?entry:item);else state.entries.push(entry);
  try{await persist();editingId=null;renderBank();if(!current)openReceipt(entry);}catch(error){console.error('EFC bank save failed.',error);alert('تعذر حفظ حركة البنك.');}
}
function beginEdit(id){const entry=state.entries.find(item=>item.id===id);if(!entry||!canEditBank())return;editingId=id;renderBank();requestAnimationFrame(()=>document.getElementById('bankStatementV22')?.focus());}
async function deleteEntry(id){
  if(!canEditBank())return alert('الحساب الحالي لا يملك صلاحية تعديل البنك.');
  const entry=state.entries.find(item=>item.id===id);if(!entry)return;
  if(!confirm(`هل تريد حذف حركة البنك رقم ${receiptCode(entry)}؟`))return;
  state.tombstones.push({recordCode:entry.recordCode,id:entry.id,deletedAt:Date.now()});state.entries=state.entries.filter(item=>item.id!==entry.id);if(editingId===id)editingId=null;
  try{await persist();renderBank();}catch(error){console.error('EFC bank delete failed.',error);alert('تعذر حذف حركة البنك.');}
}
function renderBank(){
  ensureStyle();currentPage='bank';const editable=canEditBank(),editing=editingId?state.entries.find(item=>item.id===editingId):null,years=bankFilterYears();
  const icon='<svg viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="18" height="14" rx="2"/><path d="M5 6l7-3 7 3M7 11h10M8 15h2m4 0h2"/></g></svg>';
  shell(`<section class="bank-hero-v22">${icon}<h1>البنك</h1></section><div class="card bank-form-v22"><label>نوع الحركة<select id="bankTypeV22" ${editable?'':'disabled'}><option value="in" ${editing?.type!=='out'?'selected':''}>دخل</option><option value="out" ${editing?.type==='out'?'selected':''}>صرف</option></select></label><label>المبلغ<input class="input" id="bankAmountV22" type="number" min="1" value="${editing?Number(editing.amount||0):''}" ${editable?'':'disabled'}></label><label>التاريخ<input class="input" id="bankDateV22" type="date" value="${esc(editing?.date||today())}" ${editable?'':'disabled'}></label><label>البيان / الملاحظة<textarea id="bankStatementV22" maxlength="180" ${editable?'':'disabled'} placeholder="اكتب سبب الحركة أو ملاحظتها">${esc(editing?.statement||'')}</textarea></label><button class="button" id="bankSaveV22" type="button" ${editable?'':'disabled'}>${editing?'حفظ التعديل':'تسجيل الحركة'}</button>${editing?'<div class="bank-edit-note-v22">أنت تعدل حركة موجودة. رقم الروسي سيبقى كما هو.</div>':''}</div><div class="card bank-period-filter-v22"><div class="bank-period-mode-v22" id="bankPeriodModeV22"><button type="button" data-mode="daily">يومي</button><button type="button" data-mode="weekly">أسبوع</button><button type="button" data-mode="monthly">شهري</button><button type="button" data-mode="yearly">سنوي</button></div><label data-bank-period-field="daily">اليوم<input id="bankFilterDayV22" type="date" value="${esc(filterState.day)}"></label><label data-bank-period-field="weekly">من<input id="bankFilterFromV22" type="date" value="${esc(filterState.from)}"></label><label data-bank-period-field="weekly">إلى<input id="bankFilterToV22" type="date" value="${esc(filterState.to)}"></label><label data-bank-period-field="monthYear">الشهر<select id="bankFilterMonthV22">${MONTH_NAMES.map((name,index)=>`<option value="${index+1}" ${Number(filterState.month)===index+1?'selected':''}>${name}</option>`).join('')}</select></label><label data-bank-period-field="monthYear">السنة<select id="bankFilterMonthYearV22">${years.map(year=>`<option value="${year}" ${Number(filterState.year)===year?'selected':''}>${year}</option>`).join('')}</select></label><label data-bank-period-field="yearOnly">السنة<select id="bankFilterYearV22">${years.map(year=>`<option value="${year}" ${Number(filterState.year)===year?'selected':''}>${year}</option>`).join('')}</select></label><button class="button bank-period-report-v22" id="bankPeriodReportV22" type="button">روسي الفترة</button><div class="bank-period-summary-v22" id="bankPeriodSummaryV22"></div></div><div class="bank-kpis-v22"><div class="card income"><small>إجمالي الدخل</small><b id="bankIncomeTotalV22">${cash(0)}</b><span id="bankIncomeCountV22">0 حركة دخل</span></div><div class="card expense"><small>إجمالي الصرف</small><b id="bankExpenseTotalV22">${cash(0)}</b><span id="bankExpenseCountV22">0 حركة صرف</span></div><div class="card balance"><small>المتبقي</small><b id="bankBalanceTotalV22">${cash(0)}</b><span>الدخل ناقص الصرف</span></div></div><div class="card bank-table-v22" id="bankRowsV22"></div>`);
  document.getElementById('bankSaveV22')?.addEventListener('click',saveEntry);
  document.querySelectorAll('#bankPeriodModeV22 [data-mode]').forEach(button=>button.addEventListener('click',()=>{filterState.mode=button.dataset.mode;drawBankPeriod();}));
  document.getElementById('bankFilterDayV22')?.addEventListener('change',event=>{filterState.day=event.target.value||today();drawBankPeriod();});
  document.getElementById('bankFilterFromV22')?.addEventListener('change',event=>{filterState.from=event.target.value||today();drawBankPeriod();});
  document.getElementById('bankFilterToV22')?.addEventListener('change',event=>{filterState.to=event.target.value||filterState.from||today();drawBankPeriod();});
  document.getElementById('bankFilterMonthV22')?.addEventListener('change',event=>{filterState.month=Number(event.target.value||1);drawBankPeriod();});
  document.getElementById('bankFilterMonthYearV22')?.addEventListener('change',event=>{filterState.year=Number(event.target.value||today().slice(0,4));const yearOnly=document.getElementById('bankFilterYearV22');if(yearOnly)yearOnly.value=String(filterState.year);drawBankPeriod();});
  document.getElementById('bankFilterYearV22')?.addEventListener('change',event=>{filterState.year=Number(event.target.value||today().slice(0,4));const monthYear=document.getElementById('bankFilterMonthYearV22');if(monthYear)monthYear.value=String(filterState.year);drawBankPeriod();});
  document.getElementById('bankPeriodReportV22')?.addEventListener('click',()=>openBankPeriodReport(bankPeriodReportModel()));
  drawBankPeriod();
}
async function boot(){
  await loadState();
  window.EFC_REGISTER_STATE_CONTRIBUTOR?.('bank-v22',snapshot=>Object.assign(snapshot,{bankEntries:state.entries,bankTombstones:state.tombstones,bankNextReceiptNo:state.nextReceiptNo}));
  window.EFC_REGISTER_RESTORE_CONTRIBUTOR?.('bank-v22',async incoming=>{if(Array.isArray(incoming?.bankEntries)||Array.isArray(incoming?.bankTombstones)||incoming?.bankNextReceiptNo){state=mergeState(state,{bankEntries:incoming.bankEntries||[],bankTombstones:incoming.bankTombstones||[],bankNextReceiptNo:incoming.bankNextReceiptNo});await persist();}});
  window.EFC_RENDER_BANK_V22=renderBank;
  window.EFC_OPEN_BANK_RECEIPT_V22=openReceipt;
  window.EFC_SAVE_BANK_RECEIPT_PDF_V22=saveReceiptPdf;
  window.EFC_OPEN_BANK_PERIOD_REPORT_V22=openBankPeriodReport;
  window.EFC_SAVE_BANK_PERIOD_REPORT_PDF_V22=saveBankPeriodReportPdf;
  window.EFC_BANK_STATE_V22=Object.freeze({snapshot:()=>JSON.parse(JSON.stringify(state))});
  window.EFC_BANK_V22=Object.freeze({ready:true,bankIndependentFromFinance:true,bankEntriesEditableAndDeletable:true,bankStatementFixedHeight:true,bankStatementLengthBounded:true,bankStatementWrapsSafely:true,bankUsesIncomeAndExpenseLabels:true,bankPeriodFiltersDailyWeeklyMonthlyYearly:true,bankPeriodReport:true,bankPeriodSummaryColors:true,bankIncomeExpenseCounts:true,bankLedgerStudentSearchTableStyle:true,bankReceiptSharedEmbeddedLogo:true,bankBackupRestore:true,bankOwnReceiptSequence:true,noFinanceStreamIntegration:true});
}
boot().catch(error=>{console.error('EFC bank v22 failed to initialize.',error);throw error;});
})();
