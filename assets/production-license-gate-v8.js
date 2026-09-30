(()=>{
'use strict';
if(window.__EFC_LICENSE_GATE_V13__)return;
window.__EFC_LICENSE_GATE_V13__=true;

const RUNTIME=[
  './production-loader.js',
  './assets/production-auth-bootstrap-v13.js',
  './assets/production-foundation-v13.js',
  './assets/production-identity-v1.js',
  './assets/production-receipts-v13.js',
  './assets/production-certificates-v13.js',
  './assets/production-domain-v13.js',
  './assets/production-monthly-prepayment-domain-v14.js',
  './assets/production-receipt-sequences-v10.js',
  './assets/production-student-lifecycle-domain-v20.js',
  './assets/production-student-ui-v13.js',
  './assets/production-registration-schedule-v13.js',
  './assets/production-finance-ui-v13.js',
  './assets/production-bank-v22.js',
  './assets/production-monthly-prepayment-ui-v14.js',
  './assets/production-registration-redesign-v15.js',
  './assets/production-registration-schedule-matrix-v17.js',
  './assets/production-courses-centers-redesign-v23.js',
  './assets/production-period-search-redesign-v28.js',
  './assets/production-sidebar-lock-v30.js',
  './assets/production-student-search-redesign-v31.js',
  './assets/production-student-lifecycle-ui-v20.js',
  './assets/production-fiscal-year-v14.js',
  './assets/production-security-ui-v13.js'
];
const BOOTSTRAP_RUNTIME=RUNTIME.slice(0,2);
const APP_RUNTIME=RUNTIME.slice(2);
const RUNTIME_VERSION='20260930-certificate-history-search-1';
const invoke=window.__TAURI__?.core?.invoke;
const app=document.getElementById('app');
let startPromise=null,started=false,watchTimer=null,overlay=null,busy=false,deviceId='';

function runtimeUrl(src){return `${src}${src.includes('?')?'&':'?'}v=${RUNTIME_VERSION}`;}
function preloadRuntime(sources,key){const marker=`${RUNTIME_VERSION}:${key}`;if(document.documentElement.dataset[key]===marker)return;document.documentElement.dataset[key]=marker;sources.forEach(src=>{const link=document.createElement('link');link.rel='preload';link.as='script';link.href=runtimeUrl(src);document.head.appendChild(link);});}
function loadScript(src){return new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=runtimeUrl(src);script.async=false;script.onload=resolve;script.onerror=()=>reject(new Error(`تعذر تحميل ${src}`));document.head.appendChild(script);});}
function waitUntil(check,label,timeout=15000){const startedAt=Date.now();return new Promise((resolve,reject)=>{const poll=()=>{try{if(check()){resolve();return;}}catch{}if(Date.now()-startedAt>=timeout){reject(new Error(`تعذر اكتمال تشغيل ${label}.`));return;}setTimeout(poll,20);};poll();});}
function reveal(){document.documentElement.classList.remove('efc-booting');}

async function loadStage(src,label,check){
  await loadScript(src);
  if(check)await waitUntil(check,label);
}
async function startApplication(){
  if(started)return;
  if(startPromise)return startPromise;
  startPromise=(async()=>{
    preloadRuntime(BOOTSTRAP_RUNTIME,'efcBootstrapPreloaded');
    await loadScript('./production-loader.js');
    if(window.EFC_CORE_STORAGE_READY)await window.EFC_CORE_STORAGE_READY;
    await waitUntil(()=>window.EFC_CORE_STORAGE_V13?.ready,'تخزين البيانات');

    await loadScript('./assets/production-auth-bootstrap-v13.js');
    if(window.EFC_AUTH_BOOTSTRAP_READY)await window.EFC_AUTH_BOOTSTRAP_READY;
    await waitUntil(()=>window.EFC_AUTH_BOOTSTRAP_V13?.ready,'الدخول والأمان');
    await window.EFC_AUTH_BOOTSTRAP_V13.requireLogin();
    preloadRuntime(APP_RUNTIME,'efcAppPreloaded');

    await loadStage('./assets/production-foundation-v13.js','الواجهة الأساسية',()=>window.EFC_FOUNDATION_V13?.ready&&typeof shell==='function');
    await loadStage('./assets/production-identity-v1.js','الهوية',()=>window.EFC_IDENTITY_V1?.ready);
    await loadStage('./assets/production-receipts-v13.js','خدمة الإيصالات',()=>window.EFC_RECEIPTS_V13?.ready&&typeof receiptModelV4==='function');
    await loadStage('./assets/production-certificates-v13.js','الشهادات',()=>window.EFC_CERTIFICATES_V13?.ready);
    await loadScript('./assets/production-domain-v13.js');
    if(window.EFC_DOMAIN_V13_READY)await window.EFC_DOMAIN_V13_READY;
    await waitUntil(()=>window.EFC_DOMAIN_V13?.ready,'نواة الحسابات');
    await loadStage('./assets/production-monthly-prepayment-domain-v14.js','توزيع الدفعات الشهرية',()=>window.EFC_MONTHLY_PREPAYMENT_DOMAIN_V14?.ready&&window.EFC_DOMAIN_V13?.monthlyPrepayment);
    await loadStage('./assets/production-receipt-sequences-v10.js','ترقيم الإيصالات',()=>window.EFC_RECEIPT_SEQUENCES_V10);
    await loadStage('./assets/production-student-lifecycle-domain-v20.js','سياسة أرقام وحذف الطلاب',()=>window.EFC_STUDENT_LIFECYCLE_DOMAIN_V20?.ready&&window.EFC_DOMAIN_V13?.studentLifecycleV20);
    await loadStage('./assets/production-student-ui-v13.js','واجهة الطلاب',()=>window.EFC_STUDENT_UI_V13?.ready);
    await loadStage('./assets/production-registration-schedule-v13.js','جدول تسجيل الطالب',()=>window.EFC_REGISTRATION_SCHEDULE_V13?.ready);
    await loadStage('./assets/production-finance-ui-v13.js','المالية',()=>window.EFC_FINANCE_UI_V13?.ready);
    await loadStage('./assets/production-bank-v22.js','البنك',()=>window.EFC_BANK_V22?.ready);
    await loadStage('./assets/production-monthly-prepayment-ui-v14.js','واجهة الدفعات الشهرية',()=>window.EFC_MONTHLY_PREPAYMENT_UI_V14?.ready);
    await loadStage('./assets/production-registration-redesign-v15.js','التصميم النهائي لتسجيل الطالب',()=>window.EFC_REGISTRATION_REDESIGN_V15?.ready);
    await loadStage('./assets/production-registration-schedule-matrix-v17.js','جدول الدورات في تسجيل الطالب',()=>window.EFC_REGISTRATION_SCHEDULE_MATRIX_V17?.ready);
    await loadStage('./assets/production-courses-centers-redesign-v23.js','تصميم الدورات والمراكز',()=>window.EFC_COURSES_CENTERS_REDESIGN_V23?.ready);
    await loadStage('./assets/production-period-search-redesign-v28.js','تصميم آلية البحث',()=>window.EFC_PERIOD_SEARCH_REDESIGN_V28?.ready);
    await loadStage('./assets/production-sidebar-lock-v30.js','توحيد الشريط الجانبي',()=>window.EFC_SIDEBAR_LOCK_V30?.ready);
    await loadStage('./assets/production-student-search-redesign-v31.js','تصميم البحث عن طالب',()=>window.EFC_STUDENT_SEARCH_REDESIGN_V31?.ready);
    await loadStage('./assets/production-student-lifecycle-ui-v20.js','واجهة دورة حياة الطالب',()=>window.EFC_STUDENT_LIFECYCLE_UI_V20?.ready);
    await loadStage('./assets/production-fiscal-year-v14.js','السنة المالية',()=>window.EFC_FISCAL_V14?.ready);
    await loadStage('./assets/production-security-ui-v13.js','النظام النهائي',()=>window.EFC_CENTER_OPS_V13?.ready&&window.EFC_SECURITY_UI_V13?.ready);

    await new Promise(resolve=>requestAnimationFrame(()=>resolve()));
    if(!document.querySelector('.shell'))throw new Error('لم تجهز واجهة النظام النهائية.');
    started=true;reveal();window.EFC_AUTH_BOOTSTRAP_V13?.finishStartup();
  })();
  try{return await startPromise;}catch(error){startPromise=null;reveal();throw error;}
}

function styleActivation(){if(document.getElementById('efc-license-style-v13'))return;const style=document.createElement('style');style.id='efc-license-style-v13';style.textContent=`.efc-license-lock{position:fixed;inset:0;z-index:2147483647;background:#eef3f1;display:grid;place-items:center;padding:22px;direction:rtl;font-family:Tahoma,Arial;color:#17332b}.efc-license-card{width:min(650px,96vw);background:#fff;border:1px solid #d7e1dd;border-radius:18px;box-shadow:0 18px 50px #143b2b1a;padding:26px}.efc-license-head{display:flex;align-items:center;gap:15px;border-bottom:1px solid #e4ebe8;padding-bottom:16px;margin-bottom:16px}.efc-license-head img{width:76px;height:62px;object-fit:contain}.efc-license-head h1{margin:0 0 4px;font-size:23px}.efc-license-head p,.efc-license-note{margin:0;color:#70827b;font-size:11px;line-height:1.8}.efc-license-body{display:grid;gap:13px}.efc-license-error{background:#fff5f3;border:1px solid #f1d5cf;color:#8f3527;border-radius:10px;padding:10px 12px;font-size:11px}.efc-license-device{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px}.efc-license-device input{height:42px;border:1px solid #ccd9d4;border-radius:9px;padding:0 11px;font:700 13px Consolas;direction:ltr}.efc-license-actions{display:flex;gap:8px;flex-wrap:wrap}.efc-license-actions button{border:0;border-radius:9px;padding:11px 16px;font:700 12px Tahoma;cursor:pointer}.efc-license-primary{background:#1469ad;color:#fff}.efc-license-soft{background:#edf2f0;color:#23443a}.efc-license-actions button:disabled{opacity:.55}.efc-license-ok{background:#ecf8f1;border:1px solid #c8e8d5;color:#17643b;border-radius:10px;padding:10px 12px;font-size:11px;font-weight:700}@media(max-width:620px){.efc-license-card{padding:18px}.efc-license-device{grid-template-columns:1fr}.efc-license-actions button{flex:1}}`;document.head.appendChild(style);}
function ensureActivationUi(reasonText='يجب تفعيل هذا الجهاز قبل استخدام النظام.'){
  if(overlay){overlay.querySelector('#efcLicenseReason').textContent=reasonText;return overlay;}
  styleActivation();overlay=document.createElement('div');overlay.className='efc-license-lock';overlay.innerHTML=`<section class="efc-license-card"><div class="efc-license-head"><img src="./efc-logo.svg" alt="Centrat"><div><h1>تفعيل نظام Centrat</h1><p>هذا الجهاز يحتاج ملف تفعيل صالح قبل فتح بيانات المركز.</p></div></div><div class="efc-license-body"><div class="efc-license-error" id="efcLicenseReason">${String(reasonText)}</div><label>رقم هذا الجهاز<div class="efc-license-device"><input id="efcLicenseDevice" readonly autocomplete="off" value="جاري الاستخراج…"><button class="efc-license-soft" id="efcLicenseCopy" type="button">نسخ</button></div></label><div class="efc-license-actions"><button class="efc-license-primary" id="efcLicenseInstall" type="button">اختيار ملف التفعيل</button><button class="efc-license-soft" id="efcLicenseRefresh" type="button">إعادة التحقق</button></div><p class="efc-license-note">أرسل رقم الجهاز إلى مسؤول التفعيل ثم اختر ملف .centrat-license الخاص بهذا الجهاز.</p><div id="efcLicenseMessage"></div></div></section>`;document.body.appendChild(overlay);if(app)app.inert=true;
  const install=overlay.querySelector('#efcLicenseInstall'),refresh=overlay.querySelector('#efcLicenseRefresh'),copy=overlay.querySelector('#efcLicenseCopy'),device=overlay.querySelector('#efcLicenseDevice'),message=overlay.querySelector('#efcLicenseMessage');
  const setBusy=value=>{busy=value;install.disabled=value;refresh.disabled=value;copy.disabled=value||!deviceId;};
  const setMessage=(text,ok=false)=>{message.className=text?(ok?'efc-license-ok':'efc-license-error'):'';message.textContent=text||'';};
  async function loadDevice(){try{if(!deviceId)deviceId=await invoke('get_license_device_id');device.value=deviceId;copy.disabled=busy||!deviceId;}catch(error){device.value='تعذر استخراج رقم الجهاز';setMessage(String(error));}}
  copy.onclick=async()=>{if(!deviceId)return;try{await navigator.clipboard.writeText(deviceId);}catch{device.select();document.execCommand('copy');}setMessage('تم نسخ رقم الجهاز.',true);};
  refresh.onclick=async()=>{if(busy)return;setBusy(true);try{const status=await invoke('get_license_status');if(status?.valid){await unlock(status);return;}overlay.querySelector('#efcLicenseReason').textContent=status?.reason||'ملف التفعيل غير صالح.';await loadDevice();}catch(error){setMessage(String(error));}finally{setBusy(false);}};
  install.onclick=async()=>{if(busy)return;setBusy(true);setMessage('');try{const installed=await invoke('install_license_file');if(!installed)return;const status=await invoke('get_license_status');if(!status?.valid)throw new Error(status?.reason||'تعذر اعتماد ملف التفعيل.');setMessage('تم التفعيل بنجاح.',true);await unlock(status);}catch(error){setMessage(String(error?.message||error));}finally{setBusy(false);}};
  loadDevice();setBusy(false);return overlay;
}

async function unlock(status){window.EFC_LICENSE_STATUS=status;await startApplication();if(app)app.inert=false;if(overlay){overlay.remove();overlay=null;}if(watchTimer)clearInterval(watchTimer);watchTimer=setInterval(async()=>{try{const next=await invoke('get_license_status');window.EFC_LICENSE_STATUS=next;if(!next?.valid){clearInterval(watchTimer);location.reload();}}catch{location.reload();}},30000);}
async function silentStartup(){try{const status=await invoke('get_license_status');window.EFC_LICENSE_STATUS=status;if(status?.valid){await unlock(status);return;}ensureActivationUi(status?.reason||'يجب تفعيل هذا الجهاز قبل استخدام النظام.');}catch(error){ensureActivationUi(String(error?.message||error||'تعذر التحقق من التفعيل.'));}}

if(!invoke){startApplication().catch(error=>{console.error('Centrat browser bootstrap failed.',error);reveal();if(app)app.innerHTML=`<div style="max-width:720px;margin:90px auto;text-align:center;color:#8f3527"><b>تعذر تشغيل نظام Centrat.</b><br><small>${String(error?.message||error)}</small></div>`;});}
else silentStartup();

window.EFC_LICENSE_GATE_V8=Object.freeze({offline:true,deviceBound:true,signedFiles:true,temporaryWatch:true,runtimeBlockedUntilValid:true,silentValidStartup:true,activationUiOnlyWhenInvalid:true,noReloadAfterInstall:true,noStartupSplash:true,deterministicRuntimeOrder:true,foundationV13:true,standaloneReceiptsV13:true,registrationScheduleV13:true,monthlyPrepaymentV14:true,registrationRedesignV15:true,registrationResponsiveConsolidated:true,registrationScheduleMatrixV17:true,studentLifecycleV20:true,bankV22:true,centratLicenseContract:true,earlyCanonicalLogin:true,loginBeforeAppRuntime:true,noPostSecurityLoginLayer:true,noLegacyDemoRuntime:true,domainBeforeReceiptSequence:true,singleStartupRender:true,parallelRuntimePreload:true,loginFirstPreload:true,heavyPreloadAfterLogin:true,gateOwnsBootReveal:true,finalUiBeforeReveal:true,centerOpsV13:true});
})();