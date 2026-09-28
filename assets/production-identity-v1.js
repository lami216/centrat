(()=>{
'use strict';
if(window.EFC_IDENTITY_V1?.ready)return;
if(!window.EFC_FOUNDATION_V13?.ready)throw new Error('Identity v1 loaded before foundation.');

const KEY='efc-identity-v1';
const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const clone=value=>{try{return structuredClone(value);}catch{return JSON.parse(JSON.stringify(value));}};
const defaults=()=>({
  version:1,
  brand:{
    appName:'مركز EFC للغات والمعلوماتية',
    line1:'مركز EFC',
    line2:'للغات و المعلوماتية',
    sidebarSubtitle:'نظام إدارة الطلاب والمالية',
    receiptCenterAr:'مركز',
    receiptCenterEn:'Centre EFC',
    receiptOfficial:'للغات والمعلوماتية',
    receiptTag:'جميع الشهادات معترف بها من طرف الدولة',
    phone:'48 02 84 84',
    whatsapp:'32 09 86 89',
    teacher:'الأستاذ محمد ديدي'
  },
  theme:{
    primary:'#08634f',
    primaryDark:'#005849',
    accent:'#20c9a3',
    page:'#eef7f3',
    card:'#ffffff',
    text:'#123b31',
    muted:'#65766f',
    success:'#159a55',
    danger:'#b43d3d',
    warning:'#d6a62e'
  },
  images:{logo:'',home:'',appIcon:''},
  receipts:{}
});
function merge(base,input){
  const out=clone(base),src=input&&typeof input==='object'?input:{};
  for(const key of Object.keys(out)){
    if(out[key]&&typeof out[key]==='object'&&!Array.isArray(out[key]))out[key]={...out[key],...(src[key]&&typeof src[key]==='object'?src[key]:{})};
    else if(src[key]!==undefined)out[key]=src[key];
  }
  return out;
}
function load(){try{return merge(defaults(),JSON.parse(localStorage.getItem(KEY)||'{}'));}catch{return defaults();}}
let state=load();
function persist(){
  localStorage.setItem(KEY,JSON.stringify(state));
  window.EFC_CORE_CHANGED?.();
  applyIdentity();
}
window.EFC_REGISTER_STATE_CONTRIBUTOR?.('identity-v1',snapshot=>Object.assign(snapshot,{identity:clone(state)}));
window.EFC_REGISTER_RESTORE_CONTRIBUTOR?.('identity-v1',async incoming=>{
  if(incoming?.identity&&typeof incoming.identity==='object'){state=merge(defaults(),incoming.identity);localStorage.setItem(KEY,JSON.stringify(state));applyIdentity();}
});

const receiptRegistry=new Map();
function registerReceiptType(id,label,provider){
  if(!id||typeof provider!=='function')return;
  receiptRegistry.set(String(id),{id:String(id),label:String(label||id),provider});
}
window.EFC_REGISTER_RECEIPT_TEMPLATE_V1=registerReceiptType;

function dataUrl(file){
  return new Promise((resolve,reject)=>{
    if(!file)return resolve('');
    if(file.size>5*1024*1024)return reject(new Error('حجم الصورة يجب ألا يتجاوز 5MB.'));
    const reader=new FileReader();reader.onload=()=>resolve(String(reader.result||''));reader.onerror=()=>reject(new Error('تعذر قراءة الصورة.'));reader.readAsDataURL(file);
  });
}
function getByPath(root,path){
  if(!root||path===null||path===undefined||path==='')return root;
  let node=root;for(const raw of String(path).split('.')){const index=Number(raw);if(!Number.isInteger(index)||index<0||!node?.children?.[index])return null;node=node.children[index];}
  return node;
}
function pathOf(root,node){
  if(!root||!node)return'';if(root===node)return'';
  const parts=[];let current=node;
  while(current&&current!==root){const parent=current.parentElement;if(!parent)return null;parts.unshift([...parent.children].indexOf(current));current=parent;}
  return current===root?parts.join('.'):null;
}
function receiptDesign(type,source=state){return source.receipts?.[type]&&typeof source.receipts[type]==='object'?source.receipts[type]:{elements:{},extras:[]};}
function applyReceiptBrand(root,source=state){
  const b=source.brand||{},logo=source.images?.logo||window.EFC_RECEIPT_LOGO_DATA_URI||'./efc-logo.svg';
  root.querySelectorAll('.head12 img,.logoOnly12 img').forEach(img=>img.setAttribute('src',logo));
  const contact=root.querySelector('.contactText12>b');if(contact)contact.textContent='Tél: '+String(b.phone||'');
  const social=[...root.querySelectorAll('.socialLine12:not(.teacher12) span:last-child')];social.forEach(node=>node.textContent=String(b.whatsapp||''));
  root.querySelectorAll('.socialLine12.teacher12 span:last-child').forEach(node=>node.textContent=String(b.teacher||''));
  root.querySelectorAll('.title12').forEach(title=>{
    const spans=title.querySelectorAll(':scope > span');if(spans[0])spans[0].textContent=String(b.receiptCenterEn||'');if(spans[1])spans[1].textContent=String(b.receiptCenterAr||'');
  });
  root.querySelectorAll('.official12').forEach(node=>node.textContent=String(b.receiptOfficial||''));
  root.querySelectorAll('.tag12').forEach(node=>{if(!node.dataset.efcKeepTag)node.textContent=String(b.receiptTag||'');});
}
function decorateReceipt(type,html,source=state){
  const template=document.createElement('template');template.innerHTML=String(html||'').trim();
  const root=template.content.firstElementChild||template.content;
  if(!root)return String(html||'');
  applyReceiptBrand(root,source);
  const design=receiptDesign(type,source),elements=design.elements||{};
  for(const [path,spec] of Object.entries(elements)){
    const node=getByPath(root,path);if(!node)continue;
    if(spec?.html!==undefined)node.innerHTML=String(spec.html);
    if(spec?.style&&typeof spec.style==='object')Object.assign(node.style,spec.style);
  }
  if(Array.isArray(design.extras)&&design.extras.length){
    if(root instanceof HTMLElement&&getComputedStyle(root).position==='static')root.style.position='relative';
    for(const item of design.extras){
      if(!item)continue;
      let node;
      if(item.kind==='image'){node=document.createElement('img');node.src=String(item.src||'');node.alt='';}
      else{node=document.createElement('div');node.innerHTML=String(item.html||'نص جديد');}
      node.dataset.efcIdentityExtra=String(item.id||'');
      Object.assign(node.style,{position:'absolute',left:(Number(item.x)||20)+'px',top:(Number(item.y)||20)+'px',zIndex:'20',maxWidth:'70%',...item.style});
      root.appendChild(node);
    }
  }
  return template.innerHTML;
}
window.EFC_IDENTITY_APPLY_RECEIPT_V1=(type,html)=>decorateReceipt(String(type||'default'),html,state);
window.EFC_IDENTITY_LOGO_V1=()=>state.images.logo||window.EFC_RECEIPT_LOGO_DATA_URI||'./efc-logo.svg';
window.EFC_IDENTITY_BRAND_V1=()=>clone(state.brand);

function identityCss(){
  const t=state.theme;
  return `
:root{--efc-id-primary:${t.primary};--efc-id-primary-dark:${t.primaryDark};--efc-id-accent:${t.accent};--efc-id-page:${t.page};--efc-id-card:${t.card};--efc-id-text:${t.text};--efc-id-muted:${t.muted};--efc-id-success:${t.success};--efc-id-danger:${t.danger};--efc-id-warning:${t.warning}}
.shell-v13 aside{background:linear-gradient(180deg,var(--efc-id-primary-dark),var(--efc-id-primary))!important}
.shell-v13 nav a.active{background:color-mix(in srgb,var(--efc-id-accent) 24%,transparent)!important;border-color:var(--efc-id-accent)!important}
.button:not(.secondary),button.button:not(.secondary){background:var(--efc-id-primary)!important;border-color:var(--efc-id-primary)!important}
.page-title h1,.settings-hero-v13 h1,.finance-hero-v13 h1,.bank-hero-v22 h1{color:var(--efc-id-text)!important}
.shell-v13 main{background-color:var(--efc-id-page)!important}
.card{border-color:color-mix(in srgb,var(--efc-id-primary) 22%,#d7e4df)!important}
.badge.good{color:var(--efc-id-success)!important}.badge.bad{color:var(--efc-id-danger)!important}
`;
}
function ensureThemeStyle(){
  let style=document.getElementById('efc-identity-theme-v1');if(!style){style=document.createElement('style');style.id='efc-identity-theme-v1';document.head.appendChild(style);}style.textContent=identityCss();
}
function ensureFavicon(){
  const href=state.images.appIcon||state.images.logo||'./efc-logo.svg';
  let link=document.querySelector('link[rel~="icon"]');if(!link){link=document.createElement('link');link.rel='icon';document.head.appendChild(link);}link.href=href;
}
function applyIdentity(){
  ensureThemeStyle();ensureFavicon();
  const b=state.brand,logo=state.images.logo||state.images.appIcon||'./efc-logo.svg',home=state.images.home||state.images.logo||'./efc-logo.svg';
  document.title=b.appName||'';
  document.querySelectorAll('.shell-v13 .brand .logo img').forEach(img=>img.src=logo);
  document.querySelectorAll('.shell-v13 .brand b').forEach(node=>node.innerHTML=`<span>${esc(b.line1)}</span><span>${esc(b.line2)}</span>`);
  document.querySelectorAll('.shell-v13 .brand small').forEach(node=>node.textContent=b.sidebarSubtitle||'');
  document.querySelectorAll('.efc-home-v35 img').forEach(img=>img.src=home);
  document.querySelectorAll('.efc-home-v35 h1').forEach(node=>node.textContent=b.appName||'');
  try{const win=window.__TAURI__?.window?.getCurrentWindow?.();if(win?.setTitle)Promise.resolve(win.setTitle(b.appName||'')).catch(()=>{});if(state.images.appIcon&&win?.setIcon)Promise.resolve(win.setIcon(state.images.appIcon)).catch(()=>{});}catch{}
}
window.EFC_APPLY_IDENTITY_V1=applyIdentity;

const identityIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16v16H4z"/><circle cx="9" cy="9" r="2"/><path d="m5 18 5-5 3 3 2-2 4 4M16 6h2M16 9h2"/></g></svg>';
if(Array.isArray(window.navItems)&&!window.navItems.some(item=>item?.[0]==='identity')){
  const settingsIndex=window.navItems.findIndex(item=>item?.[0]==='settings');
  window.navItems.splice(settingsIndex>=0?settingsIndex:window.navItems.length,0,['identity',identityIcon,'الهوية']);
}

const pageStyle=document.createElement('style');pageStyle.textContent=`
.identity-page-v1{width:min(1040px,calc(100vw - 290px));margin:0 auto 50px;direction:rtl}.identity-hero-v1{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-bottom:14px}.identity-hero-v1 h1{margin:0;font-size:30px;color:#0a493b}.identity-tabs-v1{display:flex;gap:7px}.identity-tabs-v1 button{border:1px solid #c9ddd6;background:#fff;color:#365d52;border-radius:9px;padding:9px 15px;font:800 11px Tahoma;cursor:pointer}.identity-tabs-v1 button.active{background:var(--efc-id-primary);color:#fff;border-color:var(--efc-id-primary)}.identity-panel-v1{display:none}.identity-panel-v1.active{display:block}.identity-grid-v1{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.identity-card-v1{background:#fff;border:1px solid #cfe0da;border-radius:13px;padding:15px;box-shadow:0 8px 24px rgba(22,70,57,.05)}.identity-card-v1 h2{margin:0 0 10px;font-size:16px;color:#0b4d3f}.identity-card-v1 .fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.identity-card-v1 label{display:grid;gap:5px;color:#48655c;font-size:9px;font-weight:800}.identity-card-v1 input[type="text"],.identity-card-v1 input[type="tel"]{height:38px;border:1px solid #cfddd8;border-radius:8px;padding:7px 9px;font-family:inherit}.identity-color-grid-v1{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.identity-color-grid-v1 input{width:100%;height:38px;border:1px solid #cfddd8;border-radius:8px;padding:3px;background:#fff}.identity-image-row-v1{display:grid;grid-template-columns:82px 1fr auto;gap:9px;align-items:center;margin-top:8px}.identity-image-row-v1 img{width:82px;height:58px;object-fit:contain;border:1px solid #d7e3df;border-radius:8px;background:#fafcfa}.identity-actions-v1{display:flex;gap:8px;justify-content:flex-start;margin-top:13px}.identity-receipts-v1{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.identity-receipt-card-v1{display:grid;gap:8px;min-height:120px;padding:13px;border:1px solid #cfe0da;border-radius:11px;background:#fff}.identity-receipt-card-v1 b{font-size:13px}.identity-receipt-card-v1 small{font-size:9px;color:#6d7c77}.identity-receipt-card-v1 button{align-self:end}.identity-editor-v1{position:fixed;inset:0;z-index:120;background:#0007;display:grid;place-items:center;padding:18px}.identity-editor-card-v1{width:min(1260px,98vw);height:min(900px,96vh);background:#eef3f1;border-radius:16px;display:grid;grid-template-rows:54px 64px minmax(0,1fr);overflow:hidden;box-shadow:0 30px 90px #0007}.identity-editor-head-v1{display:flex;align-items:center;justify-content:space-between;padding:0 15px;background:#fff;border-bottom:1px solid #d5e1dd}.identity-editor-head-v1 button{width:34px;height:34px;border:1px solid #d6e1dd;border-radius:8px;background:#fff;font-size:20px}.identity-editor-tools-v1{display:flex;align-items:center;gap:7px;flex-wrap:wrap;padding:8px 12px;background:#f9fbfa;border-bottom:1px solid #d6e1dd}.identity-editor-tools-v1 input[type="text"]{width:210px;height:36px;border:1px solid #cfdcd7;border-radius:7px;padding:6px}.identity-editor-tools-v1 input[type="number"]{width:72px;height:36px}.identity-editor-tools-v1 input[type="color"]{width:42px;height:36px}.identity-editor-tools-v1 button{height:36px;border:1px solid #cfdcd7;border-radius:7px;background:#fff;padding:0 10px;font-family:inherit;font-weight:800;font-size:10px}.identity-editor-tools-v1 button.primary{background:var(--efc-id-primary);color:#fff}.identity-editor-body-v1{min-height:0;padding:10px}.identity-editor-body-v1 iframe{width:100%;height:100%;border:0;background:#dfe7e4;border-radius:10px}.efc-identity-selected{outline:3px solid #2e75d4!important;outline-offset:2px!important}.identity-help-v1{grid-column:1/-1;color:#687973;font-size:9px;line-height:1.7;background:#f6faf8;border:1px dashed #cadbd5;padding:9px;border-radius:9px}@media(max-width:900px){.identity-page-v1{width:calc(100vw - 36px)}.identity-grid-v1,.identity-receipts-v1{grid-template-columns:1fr}.identity-card-v1 .fields{grid-template-columns:1fr}.identity-color-grid-v1{grid-template-columns:repeat(2,1fr)}}
`;document.head.appendChild(pageStyle);

function imageRow(key,label,fallback){
  const src=state.images[key]||fallback||'./efc-logo.svg';
  return `<div class="identity-image-row-v1" data-image-key="${key}"><img src="${esc(src)}" alt=""><div><b>${esc(label)}</b><small style="display:block;color:#71817b;margin-top:4px">PNG / JPG / WEBP / SVG حتى 5MB</small></div><div><label class="button secondary" style="display:inline-flex;align-items:center;cursor:pointer">اختيار<input type="file" accept="image/*" hidden></label><button type="button" class="button secondary clear-image-v1">إزالة</button></div></div>`;
}
function globalPanel(){
  const b=state.brand,t=state.theme;
  const field=(key,label)=>`<label>${label}<input type="text" name="${key}" value="${esc(b[key]||'')}"></label>`;
  const color=(key,label)=>`<label>${label}<input type="color" name="${key}" value="${esc(t[key]||'#000000')}"></label>`;
  return `<div class="identity-grid-v1"><section class="identity-card-v1"><h2>اسم وهوية التطبيق</h2><div class="fields">${field('appName','اسم التطبيق')}${field('line1','السطر الأول في أعلى القائمة')}${field('line2','السطر الثاني في أعلى القائمة')}${field('sidebarSubtitle','الوصف تحت الاسم')}${field('receiptCenterEn','اسم المركز بالفرنسية في الروسي')}${field('receiptCenterAr','اسم المركز بالعربية في الروسي')}${field('receiptOfficial','الوصف الرسمي في الروسي')}${field('receiptTag','السطر التعريفي في الروسي')}${field('phone','الهاتف')}${field('whatsapp','واتساب')}${field('teacher','اسم المسؤول / فيسبوك')}</div></section><section class="identity-card-v1"><h2>الألوان</h2><div class="identity-color-grid-v1">${color('primary','اللون الرئيسي')}${color('primaryDark','لون القائمة')}${color('accent','لون التحديد')}${color('page','خلفية الصفحات')}${color('card','البطاقات')}${color('text','النص الرئيسي')}${color('muted','النص الثانوي')}${color('success','النجاح')}${color('danger','التنبيه')}${color('warning','التحذير')}</div></section><section class="identity-card-v1" style="grid-column:1/-1"><h2>الصور والأيقونات</h2>${imageRow('logo','شعار المركز','./efc-logo.svg')}${imageRow('home','صورة الصفحة الرئيسية',state.images.logo||'./efc-logo.svg')}${imageRow('appIcon','أيقونة التطبيق',state.images.logo||'./efc-logo.svg')}<div class="identity-help-v1">أيقونة التطبيق تُطبّق داخل الواجهة والنافذة عندما يسمح نظام التشغيل بذلك. أيقونة ملف التثبيت نفسه تبقى مرتبطة بعملية البناء، لذلك تُستخدم الصورة المحفوظة كأساس للهوية داخل التطبيق.</div><div class="identity-actions-v1"><button class="button" id="identitySaveV1">حفظ الهوية</button><button class="button secondary" id="identityResetV1">استعادة القيم الأصلية</button></div></section></div>`;
}
function receiptsPanel(){
  const items=[...receiptRegistry.values()];
  return `<div class="identity-receipts-v1">${items.length?items.map(item=>`<section class="identity-receipt-card-v1"><b>${esc(item.label)}</b><small>افتح نسخة مصغرة من الروسي وعدّل النصوص والألوان والحجم والمحاذاة ومكان العناصر.</small><button class="button edit-receipt-template-v1" data-type="${esc(item.id)}">تعديل الروسي</button></section>`).join(''):'<div class="identity-help-v1">لم تكتمل تهيئة أنواع الروسيات بعد. أعد فتح صفحة الهوية بعد اكتمال تحميل التطبيق.</div>'}</div>`;
}
function bindGlobal(){
  const page=document.querySelector('.identity-page-v1');if(!page)return;
  page.querySelectorAll('[data-image-key]').forEach(row=>{
    const key=row.dataset.imageKey,file=row.querySelector('input[type="file"]'),img=row.querySelector('img');
    file.onchange=async()=>{try{const value=await dataUrl(file.files?.[0]);state.images[key]=value;img.src=value||'./efc-logo.svg';}catch(error){alert(error.message);}};
    row.querySelector('.clear-image-v1').onclick=()=>{state.images[key]='';img.src=key==='home'?(state.images.logo||'./efc-logo.svg'):'./efc-logo.svg';};
  });
  page.querySelector('#identitySaveV1').onclick=()=>{
    page.querySelectorAll('input[name]').forEach(input=>{if(input.type==='color')state.theme[input.name]=input.value;else state.brand[input.name]=input.value.trim();});
    persist();alert('تم حفظ الهوية.');
  };
  page.querySelector('#identityResetV1').onclick=()=>{if(!confirm('استعادة الهوية والألوان والصور الأصلية؟ تصميمات الروسيات ستبقى كما هي.'))return;const fresh=defaults();state.brand=fresh.brand;state.theme=fresh.theme;state.images=fresh.images;persist();renderIdentity();};
}
function updateElementSpec(draft,path,node){
  if(path===null||path===undefined)return;
  draft.elements=draft.elements||{};const spec=draft.elements[path]||{};
  spec.html=node.innerHTML;
  spec.style={
    color:node.style.color||'',
    backgroundColor:node.style.backgroundColor||'',
    fontSize:node.style.fontSize||'',
    fontWeight:node.style.fontWeight||'',
    textAlign:node.style.textAlign||'',
    transform:node.style.transform||''
  };
  draft.elements[path]=spec;
}
function openReceiptEditor(type){
  const item=receiptRegistry.get(type);if(!item)return;
  let sample;try{sample=item.provider();}catch(error){console.error(error);alert('تعذر تجهيز نموذج الروسي.');return;}
  if(!sample?.html)return alert('هذا الروسي لا يملك نموذج معاينة.');
  const original=receiptDesign(type,state),draft=clone(original),modal=document.createElement('div');modal.className='identity-editor-v1';
  modal.innerHTML=`<div class="identity-editor-card-v1"><div class="identity-editor-head-v1"><div><b>محرر الروسي — ${esc(item.label)}</b><small style="display:block;color:#6b7b75;margin-top:3px">انقر على أي عنصر ثم عدّله. التعديلات تطبق على نفس نوع الروسي فقط.</small></div><button type="button" class="close">×</button></div><div class="identity-editor-tools-v1"><input type="text" class="edit-text" placeholder="نص العنصر المحدد"><input type="number" class="font-size" min="6" max="72" placeholder="الحجم"><input type="color" class="text-color" value="#111111" title="لون النص"><input type="color" class="bg-color" value="#ffffff" title="الخلفية"><button type="button" class="bold">عريض</button><button type="button" data-align="right">يمين</button><button type="button" data-align="center">وسط</button><button type="button" data-align="left">يسار</button><button type="button" data-move="up">↑</button><button type="button" data-move="down">↓</button><button type="button" data-move="right">→</button><button type="button" data-move="left">←</button><button type="button" class="add-text">＋ نص</button><label style="height:36px;display:inline-flex;align-items:center;border:1px solid #cfdcd7;border-radius:7px;padding:0 10px;background:#fff;font:800 10px Tahoma;cursor:pointer">＋ صورة<input type="file" class="add-image" accept="image/*" hidden></label><button type="button" class="reset">إعادة النموذج</button><button type="button" class="primary save">حفظ</button></div><div class="identity-editor-body-v1"><iframe></iframe></div></div>`;
  document.body.appendChild(modal);const frame=modal.querySelector('iframe'),close=()=>modal.remove();modal.querySelector('.close').onclick=close;
  let selected=null,selectedPath=null,moveX=0,moveY=0;
  const render=()=>{
    const source=clone(state);source.receipts={...source.receipts,[type]:draft};
    const decorated=decorateReceipt(type,sample.html,source);
    frame.srcdoc=`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><style>${sample.css||''}body{padding:10px!important}.identity-editor-paper{position:relative!important}</style></head><body><div class="identity-editor-paper">${decorated}</div></body></html>`;
  };
  frame.addEventListener('load',()=>{
    const doc=frame.contentDocument,paper=doc?.querySelector('.identity-editor-paper')?.firstElementChild||doc?.querySelector('.identity-editor-paper');if(!paper)return;
    paper.addEventListener('click',event=>{
      event.preventDefault();event.stopPropagation();selected?.classList.remove('efc-identity-selected');selected=event.target instanceof frame.contentWindow.Element?event.target:null;if(!selected||selected===paper)return;selected.classList.add('efc-identity-selected');selectedPath=pathOf(paper,selected);selected.contentEditable='true';modal.querySelector('.edit-text').value=selected.innerText||'';const cs=frame.contentWindow.getComputedStyle(selected);modal.querySelector('.font-size').value=parseFloat(cs.fontSize)||'';modal.querySelector('.text-color').value=rgbToHex(cs.color)||'#111111';moveX=0;moveY=0;
    },true);
    paper.addEventListener('input',()=>{if(selected&&selectedPath!==null)updateElementSpec(draft,selectedPath,selected);},true);
  });
  const rgbToHex=value=>{const m=String(value||'').match(/\d+/g);if(!m||m.length<3)return'#111111';return'#'+m.slice(0,3).map(n=>Number(n).toString(16).padStart(2,'0')).join('');};
  const changeSelected=fn=>{if(!selected||selectedPath===null)return alert('اختر عنصرًا من الروسي أولًا.');fn(selected);updateElementSpec(draft,selectedPath,selected);};
  modal.querySelector('.edit-text').oninput=event=>changeSelected(node=>node.innerText=event.target.value);
  modal.querySelector('.font-size').oninput=event=>changeSelected(node=>node.style.fontSize=(Number(event.target.value)||12)+'px');
  modal.querySelector('.text-color').oninput=event=>changeSelected(node=>node.style.color=event.target.value);
  modal.querySelector('.bg-color').oninput=event=>changeSelected(node=>node.style.backgroundColor=event.target.value);
  modal.querySelector('.bold').onclick=()=>changeSelected(node=>node.style.fontWeight=String(node.style.fontWeight)==='900'?'400':'900');
  modal.querySelectorAll('[data-align]').forEach(button=>button.onclick=()=>changeSelected(node=>node.style.textAlign=button.dataset.align));
  modal.querySelectorAll('[data-move]').forEach(button=>button.onclick=()=>changeSelected(node=>{if(button.dataset.move==='up')moveY-=4;if(button.dataset.move==='down')moveY+=4;if(button.dataset.move==='right')moveX+=4;if(button.dataset.move==='left')moveX-=4;node.style.transform=`translate(${moveX}px,${moveY}px)`;}));
  modal.querySelector('.add-text').onclick=()=>{draft.extras=draft.extras||[];draft.extras.push({id:'text-'+Date.now(),kind:'text',html:'نص جديد',x:40,y:40,style:{fontSize:'18px',fontWeight:'700',color:'#111111'}});render();};
  modal.querySelector('.add-image').onchange=async event=>{try{const src=await dataUrl(event.target.files?.[0]);if(!src)return;draft.extras=draft.extras||[];draft.extras.push({id:'image-'+Date.now(),kind:'image',src,x:40,y:40,style:{width:'100px',height:'auto',objectFit:'contain'}});render();}catch(error){alert(error.message);}};
  modal.querySelector('.reset').onclick=()=>{if(!confirm('إرجاع هذا الروسي إلى تصميمه الأصلي؟'))return;draft.elements={};draft.extras=[];render();};
  modal.querySelector('.save').onclick=()=>{state.receipts[type]=clone(draft);persist();close();alert('تم حفظ تصميم الروسي.');};
  render();
}
function renderIdentity(){
  window.currentPage='identity';
  window.shell(`<div class="identity-page-v1"><section class="identity-hero-v1"><div><small style="color:#08745b;font-weight:800">إعدادات النظام</small><h1>الهوية</h1></div><div class="identity-tabs-v1"><button class="active" data-tab="global">هوية التطبيق</button><button data-tab="receipts">تصميم الروسيات</button></div></section><div class="identity-panel-v1 active" data-panel="global">${globalPanel()}</div><div class="identity-panel-v1" data-panel="receipts">${receiptsPanel()}</div></div>`);
  const root=document.querySelector('.identity-page-v1');root.querySelectorAll('.identity-tabs-v1 button').forEach(button=>button.onclick=()=>{root.querySelectorAll('.identity-tabs-v1 button').forEach(x=>x.classList.toggle('active',x===button));root.querySelectorAll('.identity-panel-v1').forEach(panel=>panel.classList.toggle('active',panel.dataset.panel===button.dataset.tab));});
  root.querySelectorAll('.edit-receipt-template-v1').forEach(button=>button.onclick=()=>openReceiptEditor(button.dataset.type));
  bindGlobal();applyIdentity();
}
window.EFC_RENDER_IDENTITY_V1=renderIdentity;

applyIdentity();
window.EFC_IDENTITY_V1=Object.freeze({ready:true,persistentIdentity:true,globalBrandEditor:true,themeEditor:true,imageEditor:true,receiptDesigner:true,perReceiptType:true,backupIntegrated:true,noRenderWrapper:true});
})();