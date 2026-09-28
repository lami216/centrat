(()=>{
'use strict';
if(window.EFC_AUTH_BOOTSTRAP_V13?.ready)return;

const PIN_SELECTOR='.login-overlay-v13 input[name="pin"]';
const APP_VERSION='1.1.0';
const LOGIN_FONT='Segoe UI Variable';
const icon=(body,viewBox='0 0 24 24')=>`<svg viewBox="${viewBox}" aria-hidden="true" focusable="false"><g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${body}</g></svg>`;
const ICONS={
  user:icon('<circle cx="12" cy="8" r="3.5"/><path d="M5 20c.8-4.1 3.1-6.2 7-6.2s6.2 2.1 7 6.2"/>'),
  lock:icon('<rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8.5 10V7.5a3.5 3.5 0 0 1 7 0V10M12 14v2"/>'),
  eye:icon('<path d="M2.8 12s3.4-5.2 9.2-5.2S21.2 12 21.2 12 17.8 17.2 12 17.2 2.8 12 2.8 12Z"/><circle cx="12" cy="12" r="2.2"/>'),
  eyeOff:icon('<path d="m4 4 16 16M9.9 7a9 9 0 0 1 2.1-.2c5.8 0 9.2 5.2 9.2 5.2a15.7 15.7 0 0 1-3 3.5M14.1 17a9 9 0 0 1-2.1.2C6.2 17.2 2.8 12 2.8 12a15.5 15.5 0 0 1 3-3.5M10.4 10.4a2.2 2.2 0 0 0 3.2 3.2"/>'),
  enter:icon('<path d="M10 7 5 12l5 5M5 12h12M15 5h3a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-3"/>'),
  recovery:icon('<path d="M20 6v5h-5M19 11a7 7 0 1 0 1 4"/>'),
  key:icon('<rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8.5 10V7.5a3.5 3.5 0 0 1 7 0V10M12 14v2"/>'),
  info:icon('<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>')
};

function isRevealed(input){return input?.dataset.revealPinV15==='1';}
function renderPin(input){
  const value=String(input.dataset.realPin||'').slice(0,4);
  input.dataset.realPin=value;
  input.value=isRevealed(input)?value:'*'.repeat(value.length);
  try{input.setSelectionRange(input.value.length,input.value.length);}catch{}
}
function prepare(input){
  if(!(input instanceof HTMLInputElement)||!input.matches(PIN_SELECTOR)||input.dataset.starMaskV13==='1')return;
  const initial=String(input.value||'').replace(/\D/g,'').slice(0,4);
  input.dataset.starMaskV13='1';input.dataset.realPin=initial;input.type='text';input.inputMode='numeric';input.autocomplete='off';renderPin(input);
  const form=input.form;if(form&&form.dataset.starPinFormV13!=='1'){form.dataset.starPinFormV13='1';form.addEventListener('formdata',event=>{const pin=form.querySelector(PIN_SELECTOR);if(pin?.dataset.starMaskV13==='1')event.formData.set('pin',String(pin.dataset.realPin||''));});}
}
function targetInput(event){const input=event.target instanceof HTMLInputElement?event.target:null;if(input?.matches(PIN_SELECTOR)){prepare(input);return input;}return null;}

document.addEventListener('focusin',event=>{targetInput(event);},true);
document.addEventListener('keydown',event=>{
  const input=targetInput(event);if(!input)return;
  const current=String(input.dataset.realPin||'');
  if(/^\d$/.test(event.key)){event.preventDefault();if(current.length<4){input.dataset.realPin=current+event.key;renderPin(input);}return;}
  if(event.key==='Backspace'||event.key==='Delete'){event.preventDefault();input.dataset.realPin=current.slice(0,-1);renderPin(input);return;}
  if(['Tab','Shift','Control','Alt','Meta','ArrowLeft','ArrowRight','Home','End','Enter'].includes(event.key))return;
  event.preventDefault();
},true);
document.addEventListener('paste',event=>{const input=targetInput(event);if(!input)return;event.preventDefault();const digits=String(event.clipboardData?.getData('text')||'').replace(/\D/g,'').slice(0,4);input.dataset.realPin=digits;renderPin(input);},true);
document.addEventListener('drop',event=>{if(targetInput(event))event.preventDefault();},true);

function ensureOverlayShell(overlay){
  if(overlay.dataset.efcRedesignShellV15==='1')return;
  overlay.dataset.efcRedesignShellV15='1';
  overlay.classList.add('efc-login-redesign-v15');
  const geometry=document.createElement('div');geometry.className='efc-login-geometry-v15';geometry.setAttribute('aria-hidden','true');geometry.innerHTML='<i></i><i></i><i></i><i></i>';overlay.prepend(geometry);
  const brand=document.createElement('div');brand.className='efc-login-top-brand-v15';brand.innerHTML='<span>مركز EFC للغات والمعلوماتية</span><img src="./efc-logo.svg" alt="">';overlay.appendChild(brand);
  const slogan=document.createElement('aside');slogan.className='efc-login-slogan-v15';slogan.innerHTML='<strong>معرفة<br>تبني<br>المستقبل</strong><span></span>';overlay.appendChild(slogan);
  const copyright=document.createElement('div');copyright.className='efc-login-copyright-v15';copyright.textContent=`جميع الحقوق محفوظة © ${new Date().getFullYear()} EFC`;overlay.appendChild(copyright);
  const version=document.createElement('div');version.className='efc-login-version-v15';version.innerHTML=`${ICONS.info}<span>إصدار النظام ${APP_VERSION}</span>`;overlay.appendChild(version);
}

function labelField(label,input,type){
  if(label.dataset.efcLoginFieldV15==='1')return;
  label.dataset.efcLoginFieldV15='1';label.classList.add('efc-login-field-v15');label.dataset.fieldLabel=type==='username'?'اسم المستخدم *':'PIN *';
  input.placeholder=type==='username'?'اسم المستخدم':'••••';
  const fieldIcon=document.createElement('span');fieldIcon.className='efc-login-field-icon-v15';fieldIcon.innerHTML=type==='username'?ICONS.user:ICONS.lock;label.appendChild(fieldIcon);
  if(type==='pin'){
    const toggle=document.createElement('button');toggle.type='button';toggle.className='efc-login-pin-toggle-v15';toggle.setAttribute('aria-label','إظهار أو إخفاء رمز PIN');toggle.setAttribute('aria-pressed','false');toggle.innerHTML=ICONS.eyeOff;
    toggle.onclick=()=>{const next=!isRevealed(input);input.dataset.revealPinV15=next?'1':'0';toggle.setAttribute('aria-pressed',next?'true':'false');toggle.innerHTML=next?ICONS.eye:ICONS.eyeOff;renderPin(input);input.focus();};
    label.appendChild(toggle);
  }
}

function enhanceMainLogin(card){
  const form=card.querySelector('form'),username=form?.querySelector('input[name="username"]'),pin=form?.querySelector('input[name="pin"]'),links=card.querySelector('.login-links-v13');
  if(!form||!username||!pin||!links)return false;
  card.classList.add('efc-login-main-v15');
  const logo=card.querySelector(':scope>img');if(logo)logo.classList.add('efc-login-logo-v15');
  const h1=card.querySelector(':scope>h1');if(h1){h1.classList.add('efc-login-title-v15');h1.textContent='مركز EFC للغات والمعلوماتية';}
  const intro=card.querySelector(':scope>p');if(intro)intro.remove();
  if(form.dataset.efcLoginFormV15!=='1'){
    form.dataset.efcLoginFormV15='1';form.classList.add('efc-login-form-v15');
    const labels=[...form.querySelectorAll(':scope>label')];labels.forEach(label=>{const input=label.querySelector('input');if(input===username)labelField(label,input,'username');else if(input===pin)labelField(label,input,'pin');});
    prepare(pin);
    const submit=form.querySelector('button[type="submit"],button:not([type])');if(submit){submit.classList.add('efc-login-submit-v15');submit.innerHTML=`<span>دخول</span>${ICONS.enter}`;}
  }
  if(!card.querySelector('.efc-login-divider-v15')){const divider=document.createElement('div');divider.className='efc-login-divider-v15';divider.innerHTML='<span></span><b>أو</b><span></span>';links.before(divider);}
  links.classList.add('efc-login-links-redesign-v15');
  const forgot=links.querySelector('#forgotV13'),reset=links.querySelector('#resetV13');
  if(forgot&&forgot.dataset.efcLoginLinkV15!=='1'){forgot.dataset.efcLoginLinkV15='1';forgot.innerHTML=`${ICONS.key}<span>نسيت رمز Admin ؟</span>`;}
  if(reset&&reset.dataset.efcLoginLinkV15!=='1'){reset.dataset.efcLoginLinkV15='1';reset.innerHTML=`${ICONS.recovery}<span>لدي كود إعادة التعيين</span>`;}
  return true;
}

function enhanceRecoveryCard(card){
  card.classList.add('efc-login-recovery-v15');
  const logo=card.querySelector(':scope>img');if(logo)logo.classList.add('efc-login-logo-v15');
  card.querySelectorAll('.button').forEach(button=>button.classList.add('efc-login-recovery-button-v15'));
}
function enhanceOverlay(overlay){
  if(!(overlay instanceof HTMLElement))return;
  ensureOverlayShell(overlay);
  const card=overlay.querySelector('.login-card-v13');if(!card)return;
  card.classList.add('efc-login-card-redesign-v15');
  if(!enhanceMainLogin(card))enhanceRecoveryCard(card);
}
// Canonical login renderer: no observer and no post-render upgrade layer.
const style=document.createElement('style');style.id='efc-login-redesign-style-v15';style.textContent=`
.login-overlay-v13.efc-login-redesign-v15{position:fixed;inset:0;z-index:2147483600;display:grid!important;grid-template-columns:minmax(120px,1fr) minmax(520px,640px) minmax(210px,1fr);align-items:center;justify-items:center;padding:76px 34px 68px!important;direction:rtl;font-family:"Segoe UI Variable","Segoe UI",Tahoma,Arial,sans-serif;overflow:hidden!important;background:radial-gradient(circle at 52% 36%,#effaf6 0,#f7fbf9 35%,#edf7f3 70%,#f7faf9 100%)!important;color:#0b4f3c}.efc-login-redesign-v15::before{content:"";position:absolute;inset:0;background:linear-gradient(130deg,transparent 0 12%,rgba(116,198,170,.08) 12% 26%,transparent 26% 60%,rgba(111,195,166,.07) 60% 76%,transparent 76%);pointer-events:none}.efc-login-redesign-v15::after{content:"";position:absolute;top:-110px;right:72px;width:360px;height:420px;border-radius:0 0 68px 68px;background:linear-gradient(160deg,rgba(157,222,200,.35),rgba(98,181,151,.18));transform:skewX(-20deg);pointer-events:none}.efc-login-geometry-v15{position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:0}.efc-login-geometry-v15 i{position:absolute;display:block;border-radius:42px;transform:rotate(35deg)}.efc-login-geometry-v15 i:nth-child(1){width:340px;height:540px;left:-176px;bottom:-86px;background:linear-gradient(180deg,rgba(28,143,107,.70),rgba(93,190,157,.33))}.efc-login-geometry-v15 i:nth-child(2){width:210px;height:420px;left:42px;bottom:-188px;background:rgba(87,178,147,.26)}.efc-login-geometry-v15 i:nth-child(3){width:160px;height:290px;right:315px;bottom:-132px;background:rgba(90,184,151,.20)}.efc-login-geometry-v15 i:nth-child(4){width:230px;height:390px;right:-126px;bottom:-140px;border:1.5px solid #e7b60d;background:rgba(255,255,255,.46)}.efc-login-top-brand-v15{position:absolute;top:16px;right:26px;z-index:2;display:flex;align-items:center;gap:9px;font-size:12px;font-weight:700;color:#173c31}.efc-login-top-brand-v15 img{width:26px;height:26px;object-fit:contain}.login-card-v13.efc-login-card-redesign-v15{grid-column:2;position:relative;z-index:3;width:min(632px,100%)!important;max-height:calc(100vh - 138px);overflow:auto;background:rgba(255,255,255,.92)!important;border:1px solid rgba(255,255,255,.88)!important;border-radius:24px!important;padding:24px 44px 30px!important;text-align:center!important;transform:none!important;box-shadow:0 24px 72px rgba(18,91,68,.11)!important;backdrop-filter:blur(12px);scrollbar-width:thin}.login-card-v13.efc-login-card-redesign-v15::-webkit-scrollbar{width:6px}.login-card-v13.efc-login-card-redesign-v15::-webkit-scrollbar-thumb{background:#c7ded5;border-radius:10px}.efc-login-logo-v15{display:block!important;width:136px!important;height:112px!important;object-fit:contain!important;margin:0 auto 18px!important}.login-card-v13 .efc-login-title-v15{position:relative;margin:4px 0 26px!important;padding:13px 20px 17px!important;border:2px solid #13634d;border-radius:13px;background:linear-gradient(180deg,#f5fff9,#e7f8ee);box-shadow:0 7px 16px rgba(14,84,62,.14);font-size:29px!important;line-height:1.35!important;font-weight:750;color:#0a503c}.login-card-v13 .efc-login-title-v15::after{content:"";position:absolute;left:32%;right:32%;bottom:-3px;height:8px;border-radius:9px;background:#efc313;box-shadow:0 2px 8px rgba(215,169,0,.25)}.login-card-v13 .efc-login-form-v15{display:grid!important;gap:13px!important;text-align:right!important}.efc-login-field-v15{position:relative;display:block!important;height:66px;gap:0!important;font-size:0!important}.efc-login-field-v15::before{content:attr(data-field-label);position:absolute;z-index:2;top:8px;right:58px;font-size:12px;line-height:1;color:#536b64;font-weight:700;pointer-events:none}.efc-login-field-v15 .input{height:66px!important;min-height:66px!important;border:1.5px solid #ccd9d4!important;border-radius:11px!important;background:rgba(255,255,255,.84)!important;padding:27px 58px 9px 52px!important;font-size:17px!important;font-weight:700!important;color:#0c4939!important;text-align:right;outline:none!important;box-shadow:inset 0 0 0 1px rgba(255,255,255,.6)}.efc-login-field-v15 .input:focus{border-color:#16745a!important;box-shadow:0 0 0 3px rgba(22,116,90,.10)!important}.efc-login-field-v15 .input::placeholder{color:#8a9994;font-size:14px;font-weight:500;opacity:.72}.efc-login-field-icon-v15{position:absolute;z-index:3;right:17px;top:50%;transform:translateY(-50%);width:25px;height:25px;color:#0c6049;pointer-events:none}.efc-login-field-icon-v15 svg,.efc-login-pin-toggle-v15 svg,.efc-login-submit-v15 svg,.efc-login-links-redesign-v15 svg,.efc-login-version-v15 svg{width:100%;height:100%;display:block}.login-card-v13 .pin-v13{font-size:25px!important;letter-spacing:7px!important;text-align:right!important;direction:ltr!important;font-family:"Segoe UI Variable","Segoe UI",Tahoma,Arial,sans-serif!important}.efc-login-pin-toggle-v15{position:absolute;z-index:4;left:14px;top:50%;transform:translateY(-50%);width:32px;height:32px;border:0;background:transparent;color:#60756f;cursor:pointer;padding:4px;border-radius:8px}.efc-login-pin-toggle-v15:hover{background:#ecf6f2;color:#0a5e47}.login-card-v13 .efc-login-submit-v15{min-height:62px!important;margin-top:2px!important;border:1px solid #e5b600!important;border-radius:11px!important;background:linear-gradient(180deg,#087357,#04523f)!important;color:#fff!important;font-size:22px!important;font-weight:750!important;box-shadow:0 8px 18px rgba(5,82,63,.14);display:flex!important;align-items:center;justify-content:center;gap:14px;cursor:pointer}.login-card-v13 .efc-login-submit-v15:hover{background:linear-gradient(180deg,#0a7e60,#065945)!important}.efc-login-submit-v15 svg{width:28px;height:28px}.efc-login-divider-v15{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:16px;margin:18px 0 12px;color:#71837d}.efc-login-divider-v15 span{height:1px;background:#d4ddda}.efc-login-divider-v15 b{font-size:15px;font-weight:600}.login-links-v13.efc-login-links-redesign-v15{display:flex!important;align-items:center;justify-content:space-between!important;gap:18px!important;margin-top:0!important}.efc-login-links-redesign-v15 button{display:inline-flex!important;align-items:center;gap:7px;border:0!important;background:transparent!important;color:#0b5a45!important;font-size:12px!important;font-weight:700!important;padding:7px 2px!important;cursor:pointer}.efc-login-links-redesign-v15 button:hover{color:#d39e00!important}.efc-login-links-redesign-v15 svg{width:24px;height:24px}.login-card-v13 #loginMsgV13,.login-card-v13 #resetMsgV13{min-height:18px;margin-top:8px;color:#a23434;font-size:11px;font-weight:700}.efc-login-slogan-v15{grid-column:3;position:relative;z-index:2;justify-self:center;align-self:center;text-align:center;color:#0e674e;line-height:1.45}.efc-login-slogan-v15 strong{display:block;font-size:clamp(30px,2.4vw,45px);font-weight:450}.efc-login-slogan-v15 span{display:block;width:64px;height:5px;border-radius:6px;background:#198f6a;margin:28px auto 0;box-shadow:0 4px 12px rgba(25,143,106,.22)}.efc-login-copyright-v15,.efc-login-version-v15{position:absolute;bottom:22px;z-index:2;font-size:12px;color:#526963;font-weight:600}.efc-login-copyright-v15{left:32px}.efc-login-version-v15{right:32px;display:flex;align-items:center;gap:8px}.efc-login-version-v15 svg{width:20px;height:20px}.efc-login-recovery-v15{width:min(660px,92vw)!important}.efc-login-recovery-v15 h1{color:#0b553f}.efc-login-recovery-v15 .input{border-color:#c9d8d2!important}.efc-login-recovery-v15 .efc-login-recovery-button-v15{min-height:45px!important;font-size:12px!important}.recovery-code-v13{min-height:130px!important}.login-card-v13 img{object-fit:contain}.login-card-v13 form label{font-size:12px}.login-card-v13 form>.button{min-height:46px}.login-links-v13 button{font-family:inherit}
@media(max-width:1240px){.login-overlay-v13.efc-login-redesign-v15{grid-template-columns:minmax(40px,1fr) minmax(500px,620px) minmax(150px,220px);padding-left:22px;padding-right:22px}.efc-login-slogan-v15 strong{font-size:30px}.efc-login-slogan-v15 span{width:52px}.login-card-v13.efc-login-card-redesign-v15{padding-left:34px!important;padding-right:34px!important}}
@media(max-width:1040px){.login-overlay-v13.efc-login-redesign-v15{grid-template-columns:1fr;place-items:center;padding:70px 22px 66px!important}.login-card-v13.efc-login-card-redesign-v15{grid-column:1;width:min(610px,94vw)!important}.efc-login-slogan-v15{display:none}.efc-login-redesign-v15::after{right:-30px}.efc-login-geometry-v15 i:nth-child(3){display:none}}
@media(max-height:760px){.login-overlay-v13.efc-login-redesign-v15{padding-top:54px!important;padding-bottom:52px!important}.login-card-v13.efc-login-card-redesign-v15{max-height:calc(100vh - 104px);padding-top:16px!important;padding-bottom:18px!important}.efc-login-logo-v15{width:104px!important;height:84px!important;margin-bottom:10px!important}.login-card-v13 .efc-login-title-v15{font-size:23px!important;margin:2px 0 17px!important;padding:10px 16px 13px!important}.efc-login-field-v15,.efc-login-field-v15 .input{height:56px!important;min-height:56px!important}.efc-login-field-v15 .input{padding-top:23px!important}.login-card-v13 .efc-login-submit-v15{min-height:52px!important;font-size:18px!important}.efc-login-divider-v15{margin:12px 0 8px}}
`;document.head.appendChild(style);


const OFFICIAL_NAME='مركز EFC للغات والمعلوماتية';
const SECURITY_KEY='efc-security-v11';
const CENTER_META_KEY='efc-center-ops-meta-v13';
const RECOVERY_KEY='efc-admin-recovery-pending-v11';
const RECOVERY_PREFIX='EFC-ADMIN-RECOVERY-2.';
const RESET_PREFIX='EFC-ADMIN-RESET-2.';
const RECOVERY_PUBLIC_SPKI_B64='MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA2197SbaF4DP+rcw1WnBSN0zug5WtExTC1QsE3ciHSK7KkQ0RRpu4xxpeP7rBB2qU+dxWJ9LHXPvPyEZxknVdzH3Ctw3/Ya0UYCMuZo96z4OcIuFS6OwUC8erivt3eZ2eupUtmic3hpUoMbphIlA/xshs4alpuISGMZ/owrI8Bc3nKe1DGt1QgArlTpL7J8DhPrr92EgZLQkdERZ7Fga2x8/2LtgjBOJMem5sRWnKCZ8GK23G2s2AB414yXKD1W3NEw2S4AQfMNA9QDxjPN81QEhZPykcMaWar701Q3egnncyRkjHqVTJJ7Lj6fNZt6tCUiNsSld/VK/0iNevzj9IFwIDAQAB';
const SESSION_KEY='efc-current-user-v13';
const AUTH_SECTIONS=['register','specialties','period','students','certificates','finance','ledger','bank','settings'];
const invoke=window.__TAURI__?.core?.invoke;
let securityState={users:[]},activeOverlay=null,loginPromise=null,resolveLogin=null;
const loginFailures={count:0,blockedUntil:0};
const normalizeUser=value=>String(value??'').trim().toLowerCase().replace(/\s+/g,' ').replace(/[ًٌٍَُِّْـ]/g,'');
const safeJson=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key)||'null')??fallback;}catch{return fallback;}};
function cleanSecurity(value){const next=value&&typeof value==='object'?value:{users:[]};if(!Array.isArray(next.users))next.users=[];return next;}
function localMetaUpdatedAt(){return Math.max(0,Number(safeJson(CENTER_META_KEY,{updatedAt:0})?.updatedAt||0));}
async function loadSecurityState(){
  const local=cleanSecurity(safeJson(SECURITY_KEY,{users:[]}));let chosen=local,nativeUpdated=0;
  if(invoke)try{
    const raw=await invoke('load_app_state'),state=raw?JSON.parse(raw):null;
    if(state&&typeof state==='object'){
      nativeUpdated=Math.max(0,Number(state.centerOpsMeta?.updatedAt||0));
      const native=cleanSecurity(state.security);
      if(nativeUpdated>localMetaUpdatedAt())chosen=native;
      else if(!local.users.length&&native.users.length)chosen=native;
    }
  }catch(error){console.error('EFC early auth state load failed; local security state kept.',error);}
  securityState=cleanSecurity(chosen);localStorage.setItem(SECURITY_KEY,JSON.stringify(securityState));
  if(nativeUpdated>localMetaUpdatedAt())localStorage.setItem(CENTER_META_KEY,JSON.stringify({updatedAt:nativeUpdated}));
  return securityState;
}
function saveSecurityLocal(next){
  securityState=cleanSecurity(next);localStorage.setItem(SECURITY_KEY,JSON.stringify(securityState));
  localStorage.setItem(CENTER_META_KEY,JSON.stringify({updatedAt:Date.now()}));return securityState;
}
function replaceSecurityState(next,{markChanged=false}={}){
  securityState=cleanSecurity(next);localStorage.setItem(SECURITY_KEY,JSON.stringify(securityState));
  if(markChanged)localStorage.setItem(CENTER_META_KEY,JSON.stringify({updatedAt:Date.now()}));return securityState;
}
function defaultPerms(){return Object.fromEntries(AUTH_SECTIONS.map(id=>[id,{view:true,edit:true}]));}
function currentUser(){
  if(!securityState.users.length)return{username:'بدون حساب',role:'admin',permissions:defaultPerms()};
  const username=sessionStorage.getItem(SESSION_KEY);
  return securityState.users.find(user=>user.username===username)||null;
}
function canView(section){
  if(section==='home')return true;const user=currentUser();if(!user)return false;if(user.role==='admin')return true;
  if(section==='ledger')return user.permissions?.ledger?.view===true||user.permissions?.register?.view===true||user.permissions?.register?.edit===true;
  return user.permissions?.[section]?.view===true;
}
function canEdit(section){
  if(section==='home')return false;const user=currentUser();if(!user)return false;if(user.role==='admin')return true;
  if(section==='ledger')return user.permissions?.ledger?.edit===true||user.permissions?.register?.edit===true;
  return user.permissions?.[section]?.edit===true;
}
const bytesToB64Url=bytes=>{let binary='';for(let i=0;i<bytes.length;i+=0x8000)binary+=String.fromCharCode(...bytes.subarray(i,Math.min(i+0x8000,bytes.length)));return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');};
const b64UrlToBytes=value=>{const text=String(value||'').replace(/-/g,'+').replace(/_/g,'/'),padded=text+'='.repeat((4-text.length%4)%4),binary=atob(padded);return Uint8Array.from(binary,ch=>ch.charCodeAt(0));};
const b64ToBytes=value=>Uint8Array.from(atob(value),ch=>ch.charCodeAt(0));
function randomBytes(size){const bytes=new Uint8Array(size);crypto.getRandomValues(bytes);return bytes;}
async function hashPin(pin,saltBytes=null){const salt=saltBytes||randomBytes(16),key=await crypto.subtle.importKey('raw',new TextEncoder().encode(String(pin)),{name:'PBKDF2'},false,['deriveBits']),bits=await crypto.subtle.deriveBits({name:'PBKDF2',salt,iterations:160000,hash:'SHA-256'},key,256);return{salt:bytesToB64Url(salt),hash:bytesToB64Url(new Uint8Array(bits))};}
async function verifyPin(user,pin){if(!user?.pin?.salt||!user?.pin?.hash)return false;return(await hashPin(pin,b64UrlToBytes(user.pin.salt))).hash===user.pin.hash;}
function baseLoginMarkup(){
  return '<section class="login-card-v13"><img src="./efc-logo.svg" alt="EFC"><h1>'+OFFICIAL_NAME+'</h1><p>أدخل اسم المستخدم ورمز PIN.</p><form autocomplete="off"><label>اسم المستخدم<input class="input" name="username" autocomplete="off" required></label><label>PIN<input class="input pin-v13" name="pin" type="password" maxlength="4" inputmode="numeric" autocomplete="off" required></label><button class="button">دخول</button></form><div class="login-links-v13"><button type="button" id="forgotV13">نسيت رمز Admin</button><button type="button" id="resetV13">لدي كود إعادة التعيين</button></div><div id="loginMsgV13"></div></section>';
}
function renderMainLogin(overlay){
  overlay.innerHTML=baseLoginMarkup();delete overlay.dataset.efcRedesignShellV15;overlay.className='login-overlay-v13';enhanceOverlay(overlay);
  const form=overlay.querySelector('form');
  form.onsubmit=async event=>{
    event.preventDefault();const msg=overlay.querySelector('#loginMsgV13'),now=Date.now();
    if(now<loginFailures.blockedUntil){msg.textContent='حاول مجددًا بعد '+Math.ceil((loginFailures.blockedUntil-now)/1000)+' ثانية.';return;}
    const data=new FormData(form),user=securityState.users.find(value=>normalizeUser(value.username)===normalizeUser(data.get('username'))),valid=user&&await verifyPin(user,String(data.get('pin')||''));
    if(!valid){loginFailures.count+=1;if(loginFailures.count>=5){loginFailures.count=0;loginFailures.blockedUntil=Date.now()+30000;msg.textContent='محاولات كثيرة. تم إيقاف تسجيل الدخول 30 ثانية.';}else msg.textContent='اسم المستخدم أو PIN غير صحيح.';return;}
    loginFailures.count=0;loginFailures.blockedUntil=0;sessionStorage.setItem(SESSION_KEY,user.username);
    const submit=form.querySelector('button[type="submit"],button:not([type])');if(submit){submit.disabled=true;submit.textContent='جاري فتح النظام…';}
    resolveLogin?.(true);resolveLogin=null;
  };
  overlay.querySelector('#forgotV13').onclick=()=>showRecoveryRequest(overlay);
  overlay.querySelector('#resetV13').onclick=()=>showResetEntry(overlay);
}
async function showRecoveryRequest(overlay){
  const card=overlay.querySelector('.login-card-v13'),admins=securityState.users.filter(user=>user.role==='admin');
  card.innerHTML='<img src="./efc-logo.svg" alt="EFC"><h1>استرداد Admin</h1><textarea class="input recovery-code-v13" readonly>جاري إنشاء الطلب…</textarea><button class="button" id="copyV13">نسخ الطلب</button><button class="button secondary" id="backV13">رجوع</button>';enhanceOverlay(overlay);
  try{
    const issuedAt=Date.now(),expiresAt=issuedAt+86400000,device=invoke?await invoke('get_license_device_id'):'EFC-BROWSER-RECOVERY',nonce=bytesToB64Url(randomBytes(20)),payload={v:2,d:device,n:nonce,a:admins.map(user=>user.username),iat:issuedAt,exp:expiresAt},keyRaw=randomBytes(32),iv=randomBytes(12),aes=await crypto.subtle.importKey('raw',keyRaw,{name:'AES-GCM'},false,['encrypt']),cipher=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv},aes,new TextEncoder().encode(JSON.stringify(payload)))),pub=await crypto.subtle.importKey('spki',b64ToBytes(RECOVERY_PUBLIC_SPKI_B64),{name:'RSA-OAEP',hash:'SHA-256'},false,['encrypt']),encryptedKey=new Uint8Array(await crypto.subtle.encrypt({name:'RSA-OAEP'},pub,keyRaw)),code=RECOVERY_PREFIX+[bytesToB64Url(encryptedKey),bytesToB64Url(iv),bytesToB64Url(cipher)].join('.');
    card.querySelector('textarea').value=code;localStorage.setItem(RECOVERY_KEY,JSON.stringify({v:2,n:nonce,d:device,expiresAt}));card.querySelector('#copyV13').onclick=()=>navigator.clipboard?.writeText(code);
  }catch(error){card.querySelector('textarea').value=String(error?.message||error);}
  card.querySelector('#backV13').onclick=()=>renderMainLogin(overlay);
}
async function verifyRecoveryResetCode(code){
  if(!code.startsWith(RESET_PREFIX))throw new Error('كود غير صالح.');const parts=code.slice(RESET_PREFIX.length).split('.');if(parts.length!==2)throw new Error('صيغة كود الاسترداد غير صالحة.');
  const [payloadB64,signatureB64]=parts,payloadBytes=b64UrlToBytes(payloadB64),value=JSON.parse(new TextDecoder().decode(payloadBytes)),pending=safeJson(RECOVERY_KEY,null),now=Date.now();
  if(!pending||pending.v!==2||now>Number(pending.expiresAt||0))throw new Error('طلب الاسترداد منتهي أو غير موجود.');
  if(value?.v!==2||value.n!==pending.n||value.d!==pending.d||Number(value.exp||0)<=now||Number(value.exp||0)>Number(pending.expiresAt||0))throw new Error('الكود منتهي أو لا يخص الطلب الحالي.');
  const currentDevice=invoke?await invoke('get_license_device_id'):'EFC-BROWSER-RECOVERY';if(value.d!==currentDevice)throw new Error('الكود لا يخص هذا الجهاز.');
  const pub=await crypto.subtle.importKey('spki',b64ToBytes(RECOVERY_PUBLIC_SPKI_B64),{name:'RSA-PSS',hash:'SHA-256'},false,['verify']),valid=await crypto.subtle.verify({name:'RSA-PSS',saltLength:32},pub,b64UrlToBytes(signatureB64),new TextEncoder().encode(payloadB64));if(!valid)throw new Error('توقيع كود الاسترداد غير صالح.');
  const user=securityState.users.find(item=>item.role==='admin'&&item.username===value.u);if(!user)throw new Error('Admin غير موجود.');return user;
}
function showResetEntry(overlay){
  const card=overlay.querySelector('.login-card-v13');card.innerHTML='<img src="./efc-logo.svg" alt="EFC"><h1>كود إعادة التعيين</h1><textarea class="input recovery-code-v13" autocomplete="off"></textarea><button class="button" id="verifyV13">متابعة</button><button class="button secondary" id="backV13">رجوع</button><div id="resetMsgV13"></div>';enhanceOverlay(overlay);
  card.querySelector('#verifyV13').onclick=async()=>{try{
    const user=await verifyRecoveryResetCode(card.querySelector('textarea').value.trim());
    card.innerHTML='<h1>تعيين PIN جديد</h1><form autocomplete="off"><input class="input" type="password" name="pin" maxlength="4" inputmode="numeric" autocomplete="off" required><input class="input" type="password" name="confirm" maxlength="4" inputmode="numeric" autocomplete="off" required><button class="button">حفظ</button></form>';enhanceOverlay(overlay);
    card.querySelector('form').onsubmit=async event=>{event.preventDefault();const data=new FormData(event.target),pin=String(data.get('pin')||'');if(!/^\d{4}$/.test(pin)||pin!==String(data.get('confirm')||'')){alert('أدخل PIN من 4 أرقام متطابق.');return;}user.pin=await hashPin(pin);saveSecurityLocal(securityState);localStorage.removeItem(RECOVERY_KEY);sessionStorage.setItem(SESSION_KEY,user.username);renderMainLogin(overlay);const submit=overlay.querySelector('form button');if(submit){submit.disabled=true;submit.textContent='جاري فتح النظام…';}resolveLogin?.(true);resolveLogin=null;};
  }catch(error){card.querySelector('#resetMsgV13').textContent=String(error?.message||error);}};
  card.querySelector('#backV13').onclick=()=>renderMainLogin(overlay);
}
function mountLogin(){if(activeOverlay?.isConnected)return activeOverlay;const overlay=document.createElement('div');overlay.className='login-overlay-v13';renderMainLogin(overlay);document.body.appendChild(overlay);activeOverlay=overlay;return overlay;}
async function requireLogin(){if(!securityState.users.length||currentUser())return true;if(loginPromise)return loginPromise;mountLogin();loginPromise=new Promise(resolve=>{resolveLogin=resolve;});return loginPromise;}
function finishStartup(){if(activeOverlay){activeOverlay.remove();activeOverlay=null;}loginPromise=null;resolveLogin=null;}
function logout(reload=false){sessionStorage.removeItem(SESSION_KEY);if(reload)location.reload();}
function setSessionUser(username){sessionStorage.setItem(SESSION_KEY,String(username||''));}
const authReady=(async()=>{
  await loadSecurityState();
  const publicAuth=Object.freeze({currentUser,canView,canEdit});
  const api=Object.freeze({ready:true,currentUser,canView,canEdit,defaultPerms,hashPin,verifyPin,replaceSecurityState,saveSecurityLocal,requireLogin,finishStartup,logout,setSessionUser,sessionKey:SESSION_KEY,canonicalLoginRenderer:true,loginBeforeAppRuntime:true,noLegacyLoginRenderer:true,noLoginMutationObserver:true,arabicFont:LOGIN_FONT,introRemoved:true,largerLogo:true,adminRecoverySigned:true,recoveryDeviceBound:true,recoveryOneTime:true});
  window.EFC_AUTH_V13=publicAuth;window.EFC_AUTH_BOOTSTRAP_V13=api;return api;
})();
window.EFC_AUTH_BOOTSTRAP_READY=authReady;

})();
