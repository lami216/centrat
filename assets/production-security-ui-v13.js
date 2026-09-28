(()=>{
'use strict';
if(window.EFC_SECURITY_UI_V13?.ready)return;
const D=window.EFC_DOMAIN_V13,Auth=window.EFC_AUTH_BOOTSTRAP_V13;if(!D?.ready||!window.EFC_STUDENT_UI_V13?.ready||!window.EFC_FINANCE_UI_V13?.ready||!window.EFC_BANK_V22?.ready||!Auth?.ready)throw new Error('Security UI v13 loaded before v13 domain/UI/auth layers.');
const {OFFICIAL_NAME,STORAGE,esc,normalize,uid,currentNotifications,today,cash,showDate}=D;
const invoke=window.__TAURI__?.core?.invoke;
const SECTIONS=[['register','تسجيل الطلاب'],['specialties','الدورات'],['period','آلية البحث'],['students','ملفات الطلاب'],['certificates','الشهادات'],['finance','المالية والمصاريف'],['ledger','اليومية'],['bank','البنك'],['settings','الإعدادات']];
const HOME_ID='home';
const HOME_ICON='<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m3 11 9-7 9 7"/><path d="M5.5 9.5V20h13V9.5M9.5 20v-6h5v6"/></g></svg>';
if(Array.isArray(window.navItems)&&!window.navItems.some(item=>item?.[0]===HOME_ID))window.navItems.unshift([HOME_ID,HOME_ICON,'الصفحة الرئيسية']);
let securityState=D.getSecurity();Auth.replaceSecurityState(securityState);
function currentUser(){return Auth.currentUser();}
function canView(section){return Auth.canView(section);}
function canEdit(section){return Auth.canEdit(section);}

async function upsertUser(existing,data){securityState=D.getSecurity();const username=String(data.username||'').trim(),pin=String(data.pin||''),role=data.role==='admin'?'admin':'user';if(!username)throw new Error('اسم المستخدم مطلوب.');if(securityState.users.some(user=>user.id!==existing?.id&&normalize(user.username)===normalize(username)))throw new Error('اسم المستخدم موجود.');if(!existing&&!/^\d{4}$/.test(pin))throw new Error('PIN يجب أن يكون 4 أرقام.');if(existing?.role==='admin'&&role!=='admin'&&securityState.users.filter(user=>user.role==='admin').length<=1)throw new Error('يجب أن يبقى Admin واحد على الأقل.');const user=existing||{id:uid('user'),createdAt:Date.now()};user.username=username;user.role=role;user.permissions=role==='admin'?Auth.defaultPerms():data.permissions;if(pin){if(!/^\d{4}$/.test(pin))throw new Error('PIN يجب أن يكون 4 أرقام.');user.pin=await Auth.hashPin(pin);}if(!existing)securityState.users.push(user);D.saveSecurity(securityState);Auth.replaceSecurityState(securityState);return user;}

function userEditor(id=null){securityState=D.getSecurity();const existing=id?securityState.users.find(user=>user.id===id):null,first=!securityState.users.length,modal=document.createElement('div');modal.className='modal';modal.innerHTML=`<div class="modal-card wide-modal"><div class="modal-head"><div><p>إدارة المستخدمين</p><h2>${existing?'تعديل المستخدم':first?'إنشاء Admin الأول':'إضافة مستخدم'}</h2></div><button class="x" type="button">×</button></div><form class="grid two" autocomplete="off"><label>اسم المستخدم<input class="input" name="username" value="${esc(existing?.username||'')}" autocomplete="off" required></label><label>نوع الحساب<select name="role" ${first?'disabled':''}><option value="admin" ${first||existing?.role==='admin'?'selected':''}>Admin</option><option value="user" ${existing?.role==='user'?'selected':''}>مستخدم</option></select></label><label class="wide">${existing?'PIN جديد (اختياري)':'PIN من 4 أرقام'}<input class="input" type="password" name="pin" maxlength="4" inputmode="numeric" autocomplete="off" ${existing?'':'required'}></label><div class="wide permissions-grid-v13">${SECTIONS.map(([section,label])=>`<div><b>${label}</b><label><input type="checkbox" data-view="${section}" ${existing?.permissions?.[section]?.view===false?'':'checked'}> عرض</label><label><input type="checkbox" data-edit="${section}" ${existing?.permissions?.[section]?.edit===false?'':'checked'}> تعديل</label></div>`).join('')}</div><div class="wide modal-actions"><button type="button" class="button secondary cancel">إلغاء</button><button class="button">حفظ</button></div></form></div>`;document.body.appendChild(modal);window.EFC_AUTOCOMPLETE_OFF_V13?.(modal);const close=()=>modal.remove();modal.querySelector('.x').onclick=close;modal.querySelector('.cancel').onclick=close;modal.querySelector('form').onsubmit=async event=>{event.preventDefault();const data=new FormData(event.target),permissions={};SECTIONS.forEach(([section])=>{const view=modal.querySelector(`[data-view="${section}"]`).checked,edit=modal.querySelector(`[data-edit="${section}"]`).checked;permissions[section]={view:view||edit,edit};});try{const user=await upsertUser(existing,{username:data.get('username'),pin:data.get('pin'),role:first?'admin':data.get('role'),permissions});if(first)Auth.setSessionUser(user.username);close();enhanceSecuritySettings(true);afterRenderV13();}catch(error){alert(String(error?.message||error));}};}
function securityHtml(){securityState=D.getSecurity();const admin=!securityState.users.length||currentUser()?.role==='admin';return`<div class="card settings-card-prod security-settings-v13"><h2>الأمان والمستخدمون</h2><p>${securityState.users.length?'كل تشغيل جديد يتطلب اسم المستخدم وPIN.':'لا توجد حسابات؛ التطبيق يفتح بدون تسجيل دخول. أول حساب يجب أن يكون Admin.'}</p>${admin?`<div class="users-list-v13">${securityState.users.length?securityState.users.map(user=>`<div class="user-row-v13"><div><b>${esc(user.username)}</b><small>${user.role==='admin'?'Admin':'مستخدم'}</small></div><button class="mini edit-user-v13" data-id="${esc(user.id)}">تعديل / PIN</button></div>`).join(''):'<div class="settings-empty-row-v13">لا يوجد مستخدمون مسجلون</div>'}</div><button class="button" id="addUserV13">${securityState.users.length?'＋ إضافة مستخدم':'إنشاء Admin الأول'}</button>`:'<div class="info-box">الإدارة متاحة للـ Admin فقط.</div>'}</div>`;}
function enhanceSecuritySettings(force=false){if(location.hash!=='#settings')return;const grid=document.querySelector('.settings-grid-prod');if(!grid)return;if(force)grid.querySelector('.security-settings-v13')?.remove();if(!grid.querySelector('.security-settings-v13'))grid.insertAdjacentHTML('beforeend',securityHtml());const addUser=document.getElementById('addUserV13');if(addUser)addUser.onclick=()=>userEditor();document.querySelectorAll('.edit-user-v13').forEach(button=>button.onclick=()=>userEditor(button.dataset.id));window.EFC_AUTOCOMPLETE_OFF_V13?.(grid);}

let lastReconcileRevision='',notificationCacheKey='',notificationCache=[];
function runtimeStateRevision(){return today()+'|'+(localStorage.getItem('efc-state-meta-v1')||'')+'|'+String(currentUser()?.username||'');}
function reconcileStudentsIfNeeded(){
  const before=runtimeStateRevision();
  if(before===lastReconcileRevision)return false;
  D.reconcileAllStudents();
  lastReconcileRevision=runtimeStateRevision();
  notificationCacheKey='';
  return true;
}
function visibleNotifications({fresh=false}={}){
  if(D.getSecurity().users.length&&!canView('students'))return[];
  const key=runtimeStateRevision();
  if(!fresh&&notificationCacheKey===key)return notificationCache;
  notificationCache=currentNotifications();
  notificationCacheKey=key;
  return notificationCache;
}
function mountBell(){let bell=document.querySelector('.efc-bell-v13');if(!bell){bell=document.createElement('button');bell.type='button';bell.className='efc-bell-v13';bell.innerHTML='<span>🔔</span><b>0</b>';bell.title='الإشعارات';bell.onclick=toggleNotifications;document.body.appendChild(bell);}refreshBell();}
function refreshBell({fresh=false}={}){const bell=document.querySelector('.efc-bell-v13');if(!bell)return;const list=visibleNotifications({fresh});bell.querySelector('b').textContent=String(list.length);bell.classList.toggle('has-items',list.length>0);const panel=document.querySelector('.efc-notification-panel-v13');if(panel&&!panel.hidden)renderNotificationPanel(panel,list);if(list.length&&!sessionStorage.getItem('efc-reminder-toast-v13')){sessionStorage.setItem('efc-reminder-toast-v13','1');const toast=document.createElement('div');toast.className='efc-reminder-toast-v13';toast.textContent=`لديك ${list.length} تذكير مستحقات`;document.body.appendChild(toast);setTimeout(()=>toast.remove(),3500);}}
function toggleNotifications(){let panel=document.querySelector('.efc-notification-panel-v13');if(!panel){panel=document.createElement('aside');panel.className='efc-notification-panel-v13';document.body.appendChild(panel);}panel.hidden=!panel.hidden;if(!panel.hidden)renderNotificationPanel(panel,visibleNotifications());}
function renderNotificationPanel(panel,list){panel.innerHTML=`<div class="notification-head-v13"><b>الإشعارات</b><button class="x" type="button">×</button></div>${list.length?list.map(note=>`<button class="notification-item-v13" data-id="${esc(note.studentId)}" type="button"><b>${esc(note.title||'تذكير مستحقات')}</b><small>${esc(note.studentName)}</small><span>${esc(note.message)}</span></button>`).join(''):'<div class="empty small">لا توجد تذكيرات حاليًا.</div>'}`;panel.querySelector('.x').onclick=()=>panel.hidden=true;panel.querySelectorAll('[data-id]').forEach(button=>button.onclick=()=>{panel.hidden=true;openStudent(button.dataset.id,'profile');});}
setInterval(()=>refreshBell(),60000);window.addEventListener('focus',()=>{reconcileStudentsIfNeeded();refreshBell();});

const reminderLogo=()=>window.EFC_RECEIPT_LOGO_DATA_URI||new URL('./efc-logo.svg',location.href).href;
const reminderWhatsappIcon=()=>`<span class="socialIcon12" aria-hidden="true"><svg viewBox="0 0 32 32"><path d="M16.05 3.2A12.65 12.65 0 0 0 5.2 22.34L3.5 28.5l6.3-1.65a12.63 12.63 0 1 0 6.25-23.65Zm0 22.98a10.4 10.4 0 0 1-5.3-1.45l-.38-.23-3.74.98 1-3.64-.25-.38a10.42 10.42 0 1 1 8.67 4.72Zm5.72-7.8c-.31-.16-1.85-.91-2.14-1.02-.28-.1-.49-.16-.7.16-.2.31-.8 1.02-.98 1.23-.18.2-.36.23-.67.08-.31-.16-1.31-.48-2.5-1.54-.92-.82-1.55-1.84-1.73-2.15-.18-.31-.02-.48.14-.64.14-.14.31-.36.47-.55.16-.18.2-.31.31-.52.1-.2.05-.39-.03-.55-.08-.16-.7-1.68-.96-2.3-.25-.6-.51-.52-.7-.53h-.6c-.2 0-.54.08-.83.39-.28.31-1.08 1.05-1.08 2.57 0 1.51 1.1 2.98 1.26 3.18.16.2 2.17 3.31 5.25 4.64.73.32 1.3.5 1.75.64.74.23 1.4.2 1.93.12.59-.09 1.85-.76 2.11-1.49.26-.73.26-1.36.18-1.49-.08-.13-.29-.2-.6-.36Z"/></svg></span>`;
const reminderFacebookIcon=()=>`<span class="socialIcon12" aria-hidden="true"><svg viewBox="0 0 32 32"><path d="M18.3 29V17.1h4l.6-4.7h-4.6v-3c0-1.35.37-2.28 2.32-2.28H23V2.94c-.41-.06-1.82-.18-3.47-.18-3.44 0-5.8 2.1-5.8 5.96v3.68H9.84v4.7h3.89V29h4.57Z"/></svg></span>`;
function reminderModel(note){
  const student=students.find(value=>String(value.id)===String(note?.studentId));
  let monthNumber=note?.monthNumber===null||note?.monthNumber===undefined?null:Number(note.monthNumber),amount=Math.max(0,Number(note?.amount||0)),fee=Math.max(0,Number(note?.fee||0)),dueDate=String(note?.dueDate||'');
  const specialtyName=String(note?.specialtyName||(student?(spec(student.specialty)?.name||student.specialty):'')||'—');
  if(student&&D.isDynamicMonthly?.(student)){
    const plan=D.installmentPlan?.(student)||[];
    let month=monthNumber?plan.find(item=>Number(item.number)===Number(monthNumber)):null;
    if(!month)month=plan.find(item=>Number(item.remaining||0)>0&&item.state!=='upcoming')||plan.find(item=>Number(item.remaining||0)>0)||null;
    if(month){
      monthNumber=monthNumber||Number(month.number);
      const custom=student.debtDueDates?.[String(month.number)];
      dueDate=dueDate||String(custom||month.dueDate||'');
      fee=fee||Math.max(0,Number(month.fee||0));
      if(!amount)amount=String(note?.kind||'')==='monthly-upcoming'?fee:Math.max(0,Number(month.remaining||0))||fee;
    }
  }else if(student){
    amount=amount||Math.max(0,Number(D.remainingAmount?.(student)||0));
    dueDate=dueDate||String(student.debtDueDates?.course||'');
  }
  const contextType=String(note?.contextType||(monthNumber?'month':'course'));
  const contextLabel=String(note?.contextLabel||(contextType==='month'?'الشهر':'الدورة'));
  const contextValue=String(note?.contextValue||(contextType==='month'&&monthNumber?`الشهر ${monthNumber}`:specialtyName)||'—');
  return{
    ...note,
    studentId:String(note?.studentId||student?.id||''),studentName:String(note?.studentName||student?.name||''),phone:String(note?.phone||student?.phone||''),
    reg:String(note?.reg??student?.reg??''),branchName:String(note?.branchName||(student?branchName(student.branch):'')||'—'),specialtyName,
    title:String(note?.title||'تذكير مستحقات'),message:String(note?.message||''),amount,fee,dueDate,monthNumber,date:String(note?.date||today()),
    contextType,contextLabel,contextValue
  };
}
function reminderCss(){return`
*{box-sizing:border-box}body{font-family:Tahoma,Arial,sans-serif;margin:0;background:#eef1f0;color:#111715}.reminder-paper-v13{width:1040px;max-width:96vw;min-height:430px;margin:18px auto;background:#fff;border:2px solid #293631;padding:12px 18px 16px;direction:ltr}
.head12{display:grid;grid-template-columns:240px 1fr 150px;gap:14px;align-items:center;border-bottom:1px solid #b2b8b5;padding-bottom:6px}.contact12{display:grid;grid-template-columns:92px 1fr;gap:8px;align-items:center;direction:ltr;text-align:left}.contact12 img,.logoOnly12 img{width:82px;height:62px;object-fit:contain;object-position:center;display:block}.contactText12{display:grid;gap:1px;align-content:center}.contactText12>b{display:block;font-size:13px;line-height:1.35;white-space:nowrap;direction:ltr;text-align:left}.socialLine12{display:flex;align-items:center;gap:5px;font-size:13px;line-height:1.35;white-space:nowrap;direction:ltr;text-align:left;font-weight:700;justify-content:flex-start}.socialLine12.teacher12{font-size:10px;font-weight:700;margin-top:2px;direction:ltr;justify-content:flex-start}.socialLine12.teacher12 span:last-child{font-weight:700;direction:rtl;unicode-bidi:isolate}.socialIcon12{width:14px;height:14px;display:inline-block;flex:0 0 14px;color:#111715}.socialIcon12 svg{width:100%;height:100%;display:block;fill:currentColor}.center12{text-align:center;direction:rtl}.center12 h1{margin:0;font-size:27px;line-height:1}.title12{display:flex;direction:ltr;justify-content:center;align-items:baseline;gap:12px;white-space:nowrap}.title12 .enTitle12{direction:ltr}.title12 .arTitle12{direction:rtl}.center12 .official12{font-size:11px;font-weight:900;margin-top:3px}.center12 .tag12{font-size:11px;font-weight:700;margin-top:3px}.logoOnly12{height:66px;display:grid;place-items:center}
.reminder-meta12{display:flex;justify-content:space-between;align-items:center;gap:24px;direction:ltr;padding:7px 0 4px;font-size:10px;border-bottom:1px solid #e2e5e4}.reminder-meta12>span{direction:rtl}.reminder-title12{text-align:center;direction:rtl;margin:9px 0 8px}.reminder-title12 h2{margin:0;font-size:20px}.reminder-title12 p{margin:3px 0 0;color:#65736e;font-size:9px}.reminder-facts12{display:grid;grid-template-columns:repeat(8,minmax(0,1fr));gap:6px;direction:rtl;margin-bottom:9px}.reminder-facts12>div{border:1px solid #d6dcda;border-radius:7px;padding:6px 7px;min-height:40px;overflow:hidden}.reminder-facts12>div.identity{background:#eef5ff;border-color:#cfdef1}.reminder-facts12>div.academic{background:#eef8f4;border-color:#cfe4da}.reminder-facts12>div.finance{background:#fff7e8;border-color:#ead7ae}.reminder-facts12 small{display:block;color:#6f7b77;font-size:7px;margin-bottom:3px;white-space:nowrap}.reminder-facts12 b{display:block;font-size:9.5px;line-height:1.35;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.reminder-message12{direction:rtl;text-align:right;border:1px solid #d5dfdb;background:#f6faf8;border-radius:8px;padding:11px 15px;font-size:13px;line-height:1.9;font-weight:700;min-height:82px;display:flex;align-items:center}.reminder-note12{direction:rtl;text-align:center;color:#61716b;font-size:8px;margin:8px 0 0}.reminder-actions12{width:1040px;max-width:96vw;margin:0 auto 18px;display:flex;direction:rtl;gap:8px}.reminder-actions12 button{border:0;border-radius:7px;padding:10px 17px;font:700 13px Tahoma;cursor:pointer}.reminder-print12{background:#155ea8;color:#fff}.reminder-save12{background:#159a55;color:#fff}@media(max-width:900px){.reminder-facts12{grid-template-columns:repeat(4,minmax(0,1fr))}}@media(max-width:620px){.reminder-facts12{grid-template-columns:repeat(2,minmax(0,1fr))}}@media print{body{background:#fff}.reminder-paper-v13{width:100%;max-width:none;margin:0;border:1px solid #222}.reminder-actions12{display:none}@page{size:landscape;margin:8mm}}
`;}
function reminderHeader(model){const img=`<img src="${reminderLogo()}" alt="EFC">`;return`<div class="head12"><div class="contact12">${img}<div class="contactText12"><b>Tél: 48 02 84 84</b><div class="socialLine12">${reminderWhatsappIcon()}<span>32 09 86 89</span></div><div class="socialLine12 teacher12">${reminderFacebookIcon()}<span>الأستاذ محمد ديدي</span></div></div></div><div class="center12"><h1 class="title12"><span class="enTitle12">Centre EFC</span><span class="arTitle12">مركز</span></h1><div class="official12">للغات والمعلوماتية</div><div class="tag12">جميع الشهادات معترف بها من طرف الدولة</div></div><div class="logoOnly12">${img}</div></div>`;}
function reminderBody(note){
  const model=reminderModel(note),facts=[
    {label:'اسم الطالب',value:model.studentName,group:'identity'},
    {label:'رقم الهاتف',value:model.phone||'—',group:'identity'},
    {label:'رقم السجل',value:model.reg?String(model.reg).padStart(4,'0'):'—',group:'academic'},
    {label:'الفرع',value:model.branchName,group:'academic'},
    {label:'الدورة',value:model.specialtyName,group:'academic'},
    {label:model.contextLabel||'الشهر',value:model.contextValue||'—',group:'academic'},
    {label:'المبلغ المطلوب',value:model.amount?cash(model.amount):'—',group:'finance'},
    {label:'موعد الاستحقاق',value:model.dueDate?showDate(model.dueDate):'—',group:'finance'}
  ];
  return`${reminderHeader(model)}<div class="reminder-meta12"><span>تاريخ التذكير: <b>${showDate(model.date)}</b></span><span>الفرع: <b>${esc(model.branchName)}</b></span></div><div class="reminder-title12"><h2>${esc(model.title)}</h2><p>إشعار مالي صادر من مركز EFC للغات والمعلوماتية</p></div><div class="reminder-facts12">${facts.map(item=>`<div class="${item.group}"><small>${esc(item.label)}</small><b>${esc(item.value)}</b></div>`).join('')}</div><div class="reminder-message12">${esc(model.message)}</div><p class="reminder-note12">يرجى التواصل مع إدارة المركز عند الحاجة إلى مراجعة تفاصيل الرصيد أو تأكيد عملية السداد.</p>`;
}
function reminderDocument(note,actions=true,autoPrint=false){const model=reminderModel(note),data=JSON.stringify(model).replace(/</g,'\\u003c');return`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>${esc(model.title)} - ${esc(model.studentName)}</title><style>${reminderCss()}</style></head><body><div class="reminder-paper-v13">${reminderBody(model)}</div>${actions?`<div class="reminder-actions12"><button class="reminder-print12" onclick="print()">طباعة</button><button class="reminder-save12" onclick="parent.EFC_SAVE_REMINDER_PDF_V13(REMINDER)">حفظ PDF</button></div>`:''}<script>const REMINDER=${data};${autoPrint?'setTimeout(()=>print(),250);':''}<\/script></body></html>`;}
function openReminder(note,autoPrint=false){
  if(!note)return null;
  const modal=document.createElement('div');modal.className='modal reminder-viewer-v13';modal.innerHTML=`<div class="reminder-viewer-card-v13"><div class="reminder-viewer-head-v13"><b>عرض التذكير</b><button class="reminder-viewer-close-v13" type="button" title="إغلاق">×</button></div><iframe class="reminder-viewer-frame-v13" title="عرض التذكير"></iframe></div>`;document.body.appendChild(modal);
  const frame=modal.querySelector('iframe'),close=()=>modal.remove();modal.querySelector('.reminder-viewer-close-v13').onclick=close;frame.srcdoc=reminderDocument(note,true,autoPrint);return{closed:false,close,focus:()=>frame.focus(),frame};
}
async function ensurePdf(){const load=(src,key)=>new Promise((resolve,reject)=>{if(window[key])return resolve();const script=document.createElement('script');script.src=src;script.onload=resolve;script.onerror=()=>reject(new Error(`تعذر تحميل ${src}`));document.head.appendChild(script);});await Promise.all([load('./vendor/html2canvas.min.js','html2canvas'),load('./vendor/jspdf.umd.min.js','jspdf')]);}
function waitFrame(frame){return new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('تأخر تجهيز التذكير.')),4000);frame.onload=()=>{clearTimeout(timer);resolve();};});}
async function waitReminderImages(root){await Promise.all([...root.querySelectorAll('img')].map(image=>image.complete?Promise.resolve():new Promise(resolve=>{image.onload=resolve;image.onerror=resolve;setTimeout(resolve,1200);})));try{await root.ownerDocument.fonts?.ready;}catch{}}
function reminderBufferToBase64(buffer){const bytes=new Uint8Array(buffer);let binary='';for(let i=0;i<bytes.length;i+=0x8000)binary+=String.fromCharCode(...bytes.subarray(i,Math.min(i+0x8000,bytes.length)));return btoa(binary);}
async function saveReminderPdf(note){let frame;try{await ensurePdf();const model=reminderModel(note);frame=document.createElement('iframe');frame.setAttribute('aria-hidden','true');frame.style.cssText='position:fixed;left:-16000px;top:0;width:1120px;height:760px;border:0;opacity:0;pointer-events:none';document.body.appendChild(frame);const loaded=waitFrame(frame);frame.srcdoc=reminderDocument(model,false,false);await loaded;const paper=frame.contentDocument?.querySelector('.reminder-paper-v13');if(!paper)throw new Error('تعذر تجهيز التذكير.');await waitReminderImages(paper);const canvas=await html2canvas(paper,{scale:2,backgroundColor:'#fff',useCORS:false,allowTaint:false,logging:false}),{jsPDF}=jspdf,pdf=new jsPDF({orientation:'landscape',unit:'mm',format:'a4'}),pageWidth=pdf.internal.pageSize.getWidth(),pageHeight=pdf.internal.pageSize.getHeight(),ratio=Math.min(pageWidth/canvas.width,pageHeight/canvas.height),width=canvas.width*ratio,height=canvas.height*ratio;pdf.addImage(canvas.toDataURL('image/jpeg',.96),'JPEG',(pageWidth-width)/2,(pageHeight-height)/2,width,height);const fileName=`تذكير-${String(model.reg||Date.now())}.pdf`,buffer=pdf.output('arraybuffer');if(!invoke){pdf.save(fileName);return fileName;}return await invoke('save_receipt_pdf',{fileName,dataBase64:reminderBufferToBase64(buffer)});}catch(error){console.error('EFC reminder PDF save failed.',error);alert(String(error?.message||error));return null;}finally{frame?.remove();}}
window.EFC_OPEN_REMINDER_V13=openReminder;
window.EFC_SAVE_REMINDER_PDF_V13=saveReminderPdf;

function mountUser(){const foot=document.querySelector('.side-foot');if(!foot||!D.getSecurity().users.length||foot.querySelector('.user-controls-v13'))return;const user=currentUser();if(!user)return;const box=document.createElement('div');box.className='user-controls-v13';box.innerHTML=`<small>${esc(user.username)} · ${user.role==='admin'?'Admin':'مستخدم'}</small><button type="button">تسجيل الخروج</button>`;box.querySelector('button').onclick=()=>{Auth.logout(true);};foot.prepend(box);}
const baseOpenStudentV13=openStudent;
openStudent=function(id,mode='finance'){if(D.getSecurity().users.length&&!canView('students')){alert('لا تملك صلاحية عرض ملفات الطلاب.');return;}const result=baseOpenStudentV13(id,mode);setTimeout(applyPermissions,0);return result;};
const baseOpenPaymentV13=openPayment;
openPayment=function(...args){if(D.getSecurity().users.length&&!canEdit('students')){alert('لا تملك صلاحية تعديل مدفوعات الطلاب.');return;}return baseOpenPaymentV13(...args);};
function currentSection(){return location.hash.replace('#','')||HOME_ID;}
function renderHome(){currentPage=HOME_ID;shell(`<section class="efc-home-v35"><img src="./efc-logo.svg" alt="EFC"><h1>${OFFICIAL_NAME}</h1></section>`);}
window.renderHomeV35=renderHome;
function applyPermissions(){if(!D.getSecurity().users.length)return;const page=currentSection();document.querySelectorAll('.shell nav a').forEach(link=>{const section=link.getAttribute('href')?.slice(1);if(section&&!canView(section)){link.classList.add('locked-nav-v13');link.title='هذا القسم مقفل';link.onclick=event=>{event.preventDefault();event.stopPropagation();};}});if(!canView(page)){const content=document.querySelector('.content');if(content)content.innerHTML='<div class="card locked-page-v13"><h2>🔒 هذا القسم مقفل</h2><p>الحساب الحالي لا يملك صلاحية العرض.</p></div>';return;}if(!canEdit(page)){const selectors={register:'#regFormV13 input,#regFormV13 select,#regFormV13 button',specialties:'#addSpecV13,.edit-spec-v13,#addCenterV13,.edit-center-v13',finance:'.edit-expense-v13',ledger:'#addLedgerExpenseV13',certificates:'#certIssueV13,#certAddBranchV13,#certAmountV13,#certMethodV13,#certExternalNameV13,#certExternalPhoneV13,#certExternalRegV13,#certExternalSpecV13,#certExternalBranchV13',bank:'#bankSaveV22,.bank-edit-v22,.bank-delete-v22',settings:'#createBackupProd,#restoreBackupProd,.methods-settings-v13 button'};document.querySelectorAll(selectors[page]||'x-no-match').forEach(element=>element.disabled=true);}if(!canEdit('students'))document.querySelectorAll('.pay-now,.month-pay-mm,.pay-from-detail,.one-time-pay-mm,.pay-student-v13,.pay-month-v13,.stop-student-v13').forEach(element=>element.disabled=true);if(currentUser()?.role!=='admin'&&page==='settings')document.querySelectorAll('#createBackupProd,#restoreBackupProd,.security-settings-v13 button').forEach(element=>element.disabled=true);}
const mutationClicks={specialties:'#addSpecV13,.edit-spec-v13,#addCenterV13,.edit-center-v13',finance:'.edit-expense-v13',ledger:'#addLedgerExpenseV13',certificates:'#certIssueV13,#certAddBranchV13',bank:'#bankSaveV22,.bank-edit-v22,.bank-delete-v22',settings:'#createBackupProd,#restoreBackupProd,.methods-settings-v13 button',students:'.pay-now,.month-pay-mm,.pay-from-detail,.one-time-pay-mm,.pay-student-v13,.pay-month-v13,.stop-student-v13'};
function activeSubviewOpen(){return Boolean(document.querySelector('.expense-history-v13,.profitability-details-v13,[data-efc-history-open-v36="1"]'));}
document.addEventListener('click',event=>{
  const target=event.target instanceof Element?event.target:null;if(!target)return;
  const activeNav=target.closest('.shell nav a.active');
  if(activeNav&&activeNav.getAttribute('href')===location.hash&&activeSubviewOpen()){
    event.preventDefault();event.stopPropagation();window.renderCurrentV13?.();return;
  }
  if(!D.getSecurity().users.length)return;
  if(target.closest('#addUserV13,.edit-user-v13')&&currentUser()?.role!=='admin'){event.preventDefault();event.stopImmediatePropagation();return;}
  const page=currentSection(),selector=mutationClicks[page];
  if(selector&&!canEdit(page)&&target.closest(selector)){event.preventDefault();event.stopImmediatePropagation();alert('الحساب الحالي لا يملك صلاحية التعديل.');return;}
  setTimeout(applyPermissions,0);
},true);
document.addEventListener('submit',event=>{if(!D.getSecurity().users.length||event.target.closest('.login-overlay-v13'))return;const page=currentSection();if(!canEdit(page)){event.preventDefault();event.stopImmediatePropagation();alert('الحساب الحالي لا يملك صلاحية التعديل.');}},true);
window.renderSettings=function(){
  const result=window.EFC_RENDER_SETTINGS_BASE_V13?.();
  window.EFC_ENHANCE_FINANCE_SETTINGS_V13?.();
  window.EFC_ENHANCE_FISCAL_SETTINGS_V14?.();
  enhanceSecuritySettings();
  return result;
};
window.renderSettingsProd=window.renderSettings;

function afterRenderV13(){document.title=OFFICIAL_NAME;window.EFC_SYNC_BRAND_V13?.();window.EFC_AUTOCOMPLETE_OFF_V13?.(document);mountUser();applyPermissions();window.EFC_SYNC_SELECTS_V19?.(document);mountBell();}
window.afterRenderV13=afterRenderV13;

window.renderCurrentV13=function(){
  reconcileStudentsIfNeeded();
  let page=currentSection();
  document.body.classList.toggle('efc-home-page-v35',page===HOME_ID);
  document.body.classList.toggle('efc-registration-redesign-v15',page==='register');
  document.body.classList.toggle('efc-specialties-redesign-v23',page==='specialties');
  document.body.classList.toggle('efc-period-redesign-v28',page==='period');
  document.body.classList.toggle('efc-student-search-redesign-v31',page==='students');
  document.body.classList.toggle('efc-certificates-redesign-v35',page==='certificates');
  document.body.classList.toggle('efc-certificates-workspace-v36',page==='certificates');
  try{
    if(page==='payments'){history.replaceState(null,'','#period');page='period';}
    if(page===HOME_ID)renderHome();
    else if(page==='register')renderRegister();
    else if(page==='specialties')renderSpecialties();
    else if(page==='period')renderPeriod();
    else if(page==='students')renderStudents();
    else if(page==='finance')renderFinance();
    else if(page==='ledger')renderLedger();
    else if(page==='bank')window.EFC_RENDER_BANK_V22?.();
    else if(page==='settings')renderSettings();
    else if(page==='certificates')window.EFC_RENDER_CERTIFICATES_V13?.();
    else{history.replaceState(null,'','#home');renderHome();}
  }catch(error){console.error('EFC v13 route render failed.',error);}
  finally{afterRenderV13();}
};
window.addEventListener('hashchange',()=>window.renderCurrentV13?.());

const style=document.createElement('style');style.textContent=`
.shell-v13 main{position:relative;isolation:isolate;background:radial-gradient(circle at 52% 36%,#effaf6 0,#f7fbf9 35%,#edf7f3 70%,#f7faf9 100%)!important}.shell-v13 main::before{content:"";position:absolute;inset:0;z-index:0;pointer-events:none;background:linear-gradient(130deg,transparent 0 12%,rgba(116,198,170,.08) 12% 26%,transparent 26% 60%,rgba(111,195,166,.07) 60% 76%,transparent 76%),radial-gradient(ellipse at 0 100%,rgba(28,143,107,.16) 0 14%,rgba(93,190,157,.08) 14.5% 24%,transparent 24.5%),radial-gradient(ellipse at 100% 100%,rgba(90,184,151,.10) 0 15%,transparent 15.5%)}.shell-v13 main::after{content:"";position:absolute;top:-110px;right:72px;z-index:0;width:360px;height:420px;border-radius:0 0 68px 68px;background:linear-gradient(160deg,rgba(157,222,200,.35),rgba(98,181,151,.18));transform:skewX(-20deg);pointer-events:none}.shell-v13 main>.content{position:relative;z-index:1;min-height:100vh}.efc-home-v35{min-height:calc(100vh - 78px);display:grid;place-content:center;justify-items:center;text-align:center;padding:48px 32px}.efc-home-v35 img{display:block;width:clamp(180px,17vw,260px);height:auto;max-height:220px;object-fit:contain;filter:drop-shadow(0 18px 28px rgba(18,91,68,.12))}.efc-home-v35 h1{margin:18px 0 0;color:#0b4f3c;font-family:"Segoe UI Variable","Segoe UI",Tahoma,Arial,sans-serif;font-size:clamp(24px,2.45vw,38px);line-height:1.45;font-weight:800;text-shadow:0 1px 0 #fff;letter-spacing:.1px}
.efc-bell-v13{position:fixed;top:18px;left:22px;z-index:35;width:43px;height:43px;border:1px solid var(--border);border-radius:12px;background:#fff;cursor:pointer}.efc-bell-v13>b{position:absolute;top:-6px;right:-6px;min-width:20px;height:20px;border-radius:10px;background:#777;color:#fff;font-size:9px}.efc-bell-v13.has-items>b{background:#b43d3d}.efc-notification-panel-v13{position:fixed;top:69px;left:22px;z-index:40;width:min(430px,92vw);max-height:75vh;overflow:auto;background:#fff;border:1px solid var(--border);border-radius:14px;box-shadow:0 20px 60px #0003;padding:12px;direction:rtl}.notification-head-v13{display:flex;justify-content:space-between}.notification-item-v13{display:block;width:100%;border:1px solid var(--border);background:#fff;border-radius:9px;padding:10px;text-align:right;margin-top:7px}.notification-item-v13 small{display:block;color:var(--muted);font-size:8px;margin-top:2px}.notification-item-v13 span{display:block;font-size:9px;line-height:1.8;margin-top:5px}.efc-reminder-toast-v13{position:fixed;top:74px;left:22px;z-index:45;background:#17332b;color:#fff;border-radius:10px;padding:10px 14px;font-size:10px;box-shadow:0 10px 30px #0003}.reminder-viewer-v13{padding:18px}.reminder-viewer-card-v13{width:min(1160px,96vw);height:min(820px,94vh);background:#eef1f0;border-radius:15px;box-shadow:0 24px 70px #0005;overflow:hidden;display:grid;grid-template-rows:48px minmax(0,1fr)}.reminder-viewer-head-v13{display:flex;align-items:center;justify-content:space-between;padding:0 15px;background:#fff;border-bottom:1px solid #d7dfdc}.reminder-viewer-head-v13 b{font-size:12px}.reminder-viewer-close-v13{width:32px;height:32px;border:0;border-radius:8px;background:#edf2f0;color:#23443a;font-size:20px;cursor:pointer}.reminder-viewer-frame-v13{width:100%;height:100%;border:0;background:#eef1f0}.permissions-grid-v13{display:grid;grid-template-columns:repeat(2,1fr);gap:7px}.permissions-grid-v13>div{display:grid;grid-template-columns:1fr auto auto;gap:8px;padding:8px;border:1px solid var(--border);border-radius:8px}.users-list-v13{display:grid;gap:7px}.user-row-v13{display:flex;justify-content:space-between;align-items:center;padding:9px;border:1px solid var(--border);border-radius:8px}.settings-empty-row-v13{min-height:34px;display:flex;align-items:center;justify-content:center;border:1px dashed var(--border);border-radius:8px;color:var(--muted);font-size:9px;background:#ffffff90}.user-controls-v13{display:grid;gap:6px;border-bottom:1px solid #ffffff20;padding-bottom:9px}.user-controls-v13 button{border:1px solid #ffffff2b;background:#ffffff0c;color:#fff;border-radius:8px;padding:7px}.locked-nav-v13{opacity:.48}.locked-page-v13{max-width:650px;margin:80px auto;text-align:center;padding:35px}@media(max-width:1250px){.permissions-grid-v13{grid-template-columns:1fr}}
`;document.head.appendChild(style);

renderCurrentV13();
window.EFC_SECURITY_UI_V13=Object.freeze({ready:true,usersAndPermissions:true,adminRecoveryEncrypted:true,adminRecoverySigned:true,recoveryDeviceBound:true,recoveryOneTime:true,loginAttemptThrottle:true,notificationBell:true,reminderPdf:true,reminderPreview:true,reminderUsesSharedEmbeddedLogo:true,receiptStyleReminderHeader:true,structuredReminderDocument:true,pinMasked:true,homePage:true,officialName:OFFICIAL_NAME,allPagesFinalRenderBeforeReveal:true,canonicalLoginOwnedByAuth:true,noLegacyLoginRenderer:true,canonicalSettingsRenderer:true,singleSettingsRenderOwner:true,noSettingsPostRenderEnhancement:true,directCanonicalRouteRender:true,noRouteConcealment:true,noShellRenderWrapper:true});
window.EFC_CENTER_OPS_V13=Object.freeze({ready:true,cleanDomain:true,cleanStudentUi:true,cleanFinanceUi:true,cleanSecurityUi:true,noMutationObserver:true,noWindowOpenPatch:true,autocompleteRemoved:true,quickDaysConditional:true,debtDateDebounced:true,paymentsCanonical:true,expenseActionInHeader:true,finalRouterOwnsV13Pages:true,settingsOwnedByFinalRouter:true,certificatesOwnedByFinalRouter:true,bankOwnedByFinalRouter:true,legacyPaymentsRedirect:true,permissionMutationGuards:true,activeSubviewNavigationReset:true,homePageV35:true,bootRevealDeferredToGate:true,directCanonicalRoutes:true,noDeferredRouteRender:true,globalSelectHoverSync:true,noRouteRenderStaging:true,memoizedRouteReconcile:true,memoizedNotifications:true,singleAfterRenderPerRoute:true,earlyAuthBootstrap:true,noLegacyLoginLayer:true,routerOwnsVisualPageClasses:true});
})();
