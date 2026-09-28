(()=>{
'use strict';
if(window.EFC_REGISTRATION_REDESIGN_V15?.ready)return;
if(!window.EFC_REGISTRATION_SCHEDULE_V13?.ready||!window.EFC_MONTHLY_PREPAYMENT_UI_V14?.ready)throw new Error('Registration redesign v15 loaded before registration/monthly UI.');

const icon=body=>`<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${body}</g></svg>`;
const ICONS={
  student:icon('<circle cx="9" cy="8" r="3"/><path d="M3.5 19c.7-3.6 2.6-5.5 5.5-5.5 1.7 0 3.1.6 4.1 1.8M18 8v7M14.5 11.5h7"/>'),
  form:icon('<path d="M6 3h9l3 3v15H6z"/><path d="M15 3v4h4M9 11h6M9 15h6"/>'),
  calendar:icon('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 9h18"/>'),
  phone:icon('<path d="M7.2 3.8 4.7 6.1c-.7.7-.6 2 .1 3.5 1.7 3.8 5.8 7.9 9.6 9.6 1.5.7 2.8.8 3.5.1l2.3-2.5-4-3-2 2c-2.2-1-5-3.8-6-6l2-2-3-4Z"/>'),
  money:icon('<rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 9h.01M18 15h.01"/>'),
  info:icon('<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>'),
  save:icon('<path d="M5 4h11l3 3v13H5z"/><path d="M8 4v6h8V4M8 20v-6h8v6"/>')
};

function syncPageClass(){
  const page=location.hash.replace('#','')||window.currentPage||'register';
  document.body.classList.toggle('efc-registration-redesign-v15',page==='register');
}

function addFieldDecorations(form){
  const icons={phone:ICONS.phone,start:ICONS.calendar,debtDate:ICONS.calendar,paid:ICONS.money};
  form.querySelectorAll('.registration-fields-v13 label').forEach(label=>{
    if(label.dataset.efcRegFieldV15==='1')return;
    label.dataset.efcRegFieldV15='1';
    const control=label.querySelector('input,select');
    if(!control)return;
    if(control.required)label.dataset.required='1';
    const iconHtml=icons[control.name];
    if(iconHtml){
      label.classList.add('efc-reg-has-icon-v15');
      const marker=document.createElement('span');
      marker.className='efc-reg-field-icon-v15';
      marker.innerHTML=iconHtml;
      label.appendChild(marker);
    }
  });
  const placeholders={name:'أدخل اسم الطالب',phone:'أدخل رقم الهاتف',price:'أدخل سعر الدورة'};
  Object.entries(placeholders).forEach(([name,value])=>{if(form.elements[name])form.elements[name].placeholder=value;});
}

function addScheduleCourseMirror(form,schedule){
  if(schedule.querySelector('#efcScheduleCourseMirrorV15'))return;
  const source=form.elements.specialty;
  if(!source)return;
  const title=schedule.querySelector('.schedule-title-v13');
  if(!title)return;
  const oldHint=title.querySelector(':scope>span');
  oldHint?.remove();
  const wrap=document.createElement('label');
  wrap.className='efc-schedule-course-mirror-v15';
  wrap.innerHTML='<span>الدورة</span><select id="efcScheduleCourseMirrorV15" aria-label="الدورة في جدول الطالب"></select>';
  const mirror=wrap.querySelector('select');
  mirror.innerHTML=[...source.options].map(option=>`<option value="${String(option.value).replace(/&/g,'&amp;').replace(/"/g,'&quot;')}"${option.selected?' selected':''}>${String(option.textContent||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</option>`).join('');
  mirror.value=source.value;
  mirror.onchange=()=>{
    source.value=mirror.value;
    source.dispatchEvent(new Event('change',{bubbles:true}));
  };
  source.addEventListener('change',()=>{mirror.value=source.value;});
  form.addEventListener('reset',()=>setTimeout(()=>{mirror.value=source.value;},0));
  title.appendChild(wrap);
}

function addRegistrationChrome(form,schedule){
  const content=document.querySelector('.content');
  if(!content)return;
  content.querySelector('.page-title')?.remove();
  if(!content.querySelector('.efc-reg-page-head-v15')){
    const user=window.EFC_AUTH_V13?.currentUser?.();
    const welcome=document.createElement('section');
    welcome.className='efc-reg-page-head-v15';
    welcome.innerHTML=`<div class="efc-reg-welcome-v15"><b>مرحباً بك</b><span>في نظام إدارة الطلاب والمالية</span></div><div class="efc-reg-hero-v15">${ICONS.student}<h1>تسجيل طالب جديد</h1><i></i></div><div aria-hidden="true"></div>`;
    content.prepend(welcome);
    if(user?.username&&user.username!=='بدون حساب')welcome.querySelector('.efc-reg-welcome-v15 b').textContent=`مرحباً ${user.username}`;
  }

  form.classList.add('efc-reg-form-redesign-v15');
  const sectionHead=form.querySelector('.section-head');
  if(sectionHead&&!sectionHead.querySelector('.efc-reg-form-icon-v15')){
    sectionHead.querySelector(':scope>span')?.remove();
    const iconBox=document.createElement('span');
    iconBox.className='efc-reg-form-icon-v15';
    iconBox.innerHTML=ICONS.form;
    sectionHead.prepend(iconBox);
  }
  const submit=form.querySelector('.registration-submit-v13');
  if(submit&&!submit.dataset.efcRegSubmitV15){
    submit.dataset.efcRegSubmitV15='1';
    submit.innerHTML=`${ICONS.save}<span>حفظ التسجيل</span>`;
  }

  schedule.classList.add('efc-reg-schedule-redesign-v15');
  const title=schedule.querySelector('.schedule-title-v13 h2');
  if(title&&!title.dataset.efcRegScheduleTitleV15){
    title.dataset.efcRegScheduleTitleV15='1';
    title.innerHTML=`${ICONS.calendar}<span>جدول الطالب الأسبوعي</span>`;
  }
  const note=schedule.querySelector('.schedule-top-note-v13');
  if(note&&!note.dataset.efcRegNoteV15){
    note.dataset.efcRegNoteV15='1';
    note.innerHTML=`${ICONS.info}<span>ملاحظة: لا يمكن تسجيل أكثر من حصة واحدة في نفس اليوم. مدة الحصة 20 دقيقة.</span>`;
  }
  const notes=schedule.querySelector('.schedule-notes-v13');
  if(notes&&!notes.querySelector('.efc-reg-bottom-info-v15')){
    const info=document.createElement('span');
    info.className='efc-reg-bottom-info-v15';
    info.innerHTML=ICONS.info;
    notes.prepend(info);
  }
}

function enhanceRegister(){
  syncPageClass();
  const form=document.getElementById('regFormV13');
  const schedule=document.querySelector('.registration-schedule-card-v13');
  if(!form||!schedule)return;
  addRegistrationChrome(form,schedule);
  addFieldDecorations(form);
  addScheduleCourseMirror(form,schedule);
}

function enhanceRegistrationRedesignV15(){enhanceRegister();}

const style=document.createElement('style');
style.id='efc-registration-redesign-style-v15';
style.textContent=`
body.efc-registration-redesign-v15{font-family:"Segoe UI Variable","Segoe UI",Tahoma,Arial,sans-serif;background:#f5fbf9}
body.efc-registration-redesign-v15 .shell{min-height:100vh;background:radial-gradient(circle at 45% 28%,#f8fffd 0,#f3faf7 52%,#edf6f2 100%)}
body.efc-registration-redesign-v15 .shell aside{top:0;width:304px;padding:28px 20px 22px;background:linear-gradient(180deg,#075445 0%,#05473d 48%,#033d35 100%);box-shadow:-10px 0 35px rgba(5,55,47,.08);font-family:inherit}
body.efc-registration-redesign-v15 .shell main{margin-right:304px;width:calc(100% - 304px)}
body.efc-registration-redesign-v15 .content{max-width:none;padding:30px 30px 48px}
body.efc-registration-redesign-v15 .brand{gap:14px;padding:0 5px 24px;border-bottom:1px solid rgba(255,255,255,.18);align-items:center}
body.efc-registration-redesign-v15 .brand .logo{width:58px;height:58px;border-radius:14px;background:#fff;padding:8px;box-shadow:0 8px 24px rgba(0,0,0,.12)}
body.efc-registration-redesign-v15 .brand .logo img{width:100%;height:100%;object-fit:contain}
body.efc-registration-redesign-v15 .brand b{font-size:18px;line-height:1.35;color:#fff;font-weight:800}
body.efc-registration-redesign-v15 .brand small{font-size:10px;color:#b9d9cf;margin-top:5px}
body.efc-registration-redesign-v15 .shell nav{gap:7px;padding-top:25px}
body.efc-registration-redesign-v15 .shell nav a{min-height:57px;padding:11px 18px;border-radius:13px;color:#e2f0eb;font-size:15px;font-weight:650;gap:14px;border:1px solid transparent}
body.efc-registration-redesign-v15 .shell nav a i{width:28px;height:28px;display:grid;place-items:center}
body.efc-registration-redesign-v15 .shell nav a i svg{width:26px;height:26px}
body.efc-registration-redesign-v15 .shell nav a:hover{background:rgba(255,255,255,.08);color:#fff}
body.efc-registration-redesign-v15 .shell nav a.active{background:linear-gradient(90deg,rgba(38,181,139,.26),rgba(255,255,255,.06));color:#fff;border-color:rgba(93,216,179,.44);box-shadow:inset 6px 0 #35c99a,0 8px 20px rgba(0,0,0,.08)}
body.efc-registration-redesign-v15 .side-foot{border-top:1px solid rgba(255,255,255,.18);padding-top:16px}
body.efc-registration-redesign-v15 .production-side-note{display:none}
body.efc-registration-redesign-v15 .user-controls-v13{gap:10px;border:0;padding:0}
body.efc-registration-redesign-v15 .user-controls-v13 small{font-size:11px;color:#d6eae3;text-align:center}
body.efc-registration-redesign-v15 .user-controls-v13 button{min-height:48px;border:1px solid rgba(255,255,255,.24);border-radius:11px;background:rgba(255,255,255,.04);font-family:inherit;font-size:14px;font-weight:650;color:#fff;cursor:pointer}
body.efc-registration-redesign-v15 .user-controls-v13 button:hover{background:rgba(255,255,255,.10)}
body.efc-registration-redesign-v15 .efc-bell-v13{top:52px;left:30px;width:56px;height:56px;border:1px solid #dbe8e3;border-radius:15px;background:#fff;box-shadow:0 8px 22px rgba(21,77,60,.10);font-size:21px}
body.efc-registration-redesign-v15 .efc-bell-v13>b{top:-7px;right:-7px;min-width:24px;height:24px;line-height:24px;border-radius:13px;font-size:11px;background:#c61a1a}
.efc-reg-page-head-v15{direction:ltr;display:grid;grid-template-columns:minmax(260px,1fr) minmax(460px,560px) minmax(80px,1fr);align-items:center;gap:18px;margin:4px 0 28px;min-height:104px}
.efc-reg-welcome-v15{grid-column:1;direction:rtl;justify-self:start;padding-left:92px;display:grid;gap:6px;color:#172e28}
.efc-reg-welcome-v15 b{font-size:15px;font-weight:800}
.efc-reg-welcome-v15 span{font-size:12px;color:#6c7d77}
.efc-reg-hero-v15{grid-column:2;direction:rtl;height:96px;border-radius:20px;background:linear-gradient(135deg,#e4f8f0,#d4efe5);display:flex;align-items:center;justify-content:center;gap:24px;position:relative;box-shadow:0 10px 30px rgba(20,102,76,.05);color:#073f35}
.efc-reg-hero-v15 svg{width:54px;height:54px}
.efc-reg-hero-v15 h1{margin:0;font-size:38px;line-height:1;font-weight:800;letter-spacing:-.5px}
.efc-reg-hero-v15 i{position:absolute;bottom:12px;width:58px;height:4px;border-radius:6px;background:#0a7f62}
body.efc-registration-redesign-v15 .registration-schedule-layout-v13{display:grid;grid-template-columns:minmax(500px,540px) minmax(600px,1fr);gap:20px;align-items:start;direction:rtl;width:100%}
body.efc-registration-redesign-v15 .registration-form-compact-v13{max-width:none;width:100%;padding:17px 18px 18px;border:1.5px solid #2a9878;border-radius:14px;background:rgba(255,255,255,.94);box-shadow:0 12px 28px rgba(12,76,58,.08)}
body.efc-registration-redesign-v15 .registration-form-compact-v13 .section-head{height:64px;margin:-3px 0 16px;padding:0 22px;border-radius:13px;background:linear-gradient(135deg,#e9f9f3,#d7f1e7);display:flex;align-items:center;justify-content:center;gap:16px;color:#0a4e3d}
body.efc-registration-redesign-v15 .registration-form-compact-v13 .section-head h2{font-size:24px;font-weight:800;margin:0}
.efc-reg-form-icon-v15{width:35px;height:35px;color:#0c765b;display:grid;place-items:center}
.efc-reg-form-icon-v15 svg{width:31px;height:31px}
body.efc-registration-redesign-v15 .registration-fields-v13{grid-template-columns:repeat(2,minmax(0,1fr));gap:14px 20px}
body.efc-registration-redesign-v15 .registration-fields-v13 label{position:relative;display:flex;gap:8px;font-size:14px;font-weight:750;color:#182f29;min-width:0}
body.efc-registration-redesign-v15 .registration-fields-v13 label[data-required="1"]::before{content:"*";position:absolute;top:-1px;right:-10px;color:#e51e1e;font-size:15px;font-weight:900}
body.efc-registration-redesign-v15 .registration-fields-v13 .input,
body.efc-registration-redesign-v15 .registration-fields-v13 select{height:48px;border:1px solid #cbd9d4;border-radius:10px;background:#fff;padding:8px 13px;font-size:14px;color:#1a302a;box-shadow:0 2px 8px rgba(11,71,54,.03)}
body.efc-registration-redesign-v15 .registration-fields-v13 .input:focus,
body.efc-registration-redesign-v15 .registration-fields-v13 select:focus{border-color:#128264;box-shadow:0 0 0 3px rgba(18,130,100,.10)}
body.efc-registration-redesign-v15 .registration-fields-v13 input::placeholder{color:#9aa8a3}
body.efc-registration-redesign-v15 .registration-fields-v13 label.efc-reg-has-icon-v15 .input{padding-left:42px}
.efc-reg-field-icon-v15{position:absolute;left:13px;bottom:12px;width:21px;height:21px;color:#3d5f55;pointer-events:none}
.efc-reg-field-icon-v15 svg{width:100%;height:100%}
body.efc-registration-redesign-v15 .debt-slot-v13{min-height:70px}
body.efc-registration-redesign-v15 .registration-inline-summary-v13{display:none!important}
body.efc-registration-redesign-v15 .registration-submit-v13{width:100%;min-height:58px;margin-top:14px;border:0;border-radius:10px;background:linear-gradient(180deg,#08785d,#056149);font-size:18px;font-weight:800;gap:12px;box-shadow:0 8px 18px rgba(7,103,78,.14)}
body.efc-registration-redesign-v15 .registration-submit-v13:hover{background:linear-gradient(180deg,#0a8668,#066a51)}
body.efc-registration-redesign-v15 .registration-submit-v13 svg{width:24px;height:24px}
body.efc-registration-redesign-v15 .registration-schedule-card-v13{max-width:none;width:100%;padding:20px 16px 18px;border:1.5px solid #25332e;border-radius:16px;background:linear-gradient(180deg,#fff4aa,#fff0a0);box-shadow:0 12px 28px rgba(87,75,11,.10)}
body.efc-registration-redesign-v15 .schedule-title-v13{display:flex;align-items:center;justify-content:space-between;gap:18px;margin:0 8px 14px}
body.efc-registration-redesign-v15 .schedule-title-v13>div>small{display:none}
body.efc-registration-redesign-v15 .schedule-title-v13 h2{margin:0;display:flex;align-items:center;gap:12px;font-size:26px;font-weight:800;color:#101d19}
body.efc-registration-redesign-v15 .schedule-title-v13 h2:before{display:none}
body.efc-registration-redesign-v15 .schedule-title-v13 h2 svg{width:36px;height:36px;color:#0a6250}
.efc-schedule-course-mirror-v15{min-width:170px;display:flex!important;flex-direction:row!important;align-items:center;gap:12px;font-size:14px!important;font-weight:800!important;color:#2c332f}
.efc-schedule-course-mirror-v15 select{width:145px;height:48px;border:1px solid #d0d8d5;border-radius:10px;background:#fff;padding:8px 12px;font-size:13px}
body.efc-registration-redesign-v15 .schedule-top-note-v13{margin:0 10px 15px;min-height:49px;padding:11px 16px;border:1px solid #e2bd33;border-radius:10px;background:rgba(255,233,130,.48);display:flex;align-items:center;justify-content:center;gap:10px;font-size:13px;line-height:1.5;color:#2f332f}
body.efc-registration-redesign-v15 .schedule-top-note-v13 svg{width:21px;height:21px;color:#7a6617;flex:0 0 auto}
body.efc-registration-redesign-v15 .schedule-table-wrap-v13{overflow:hidden;border:1.5px solid #23312c;border-radius:12px;background:#fff}
body.efc-registration-redesign-v15 .schedule-table-v13{table-layout:fixed}
body.efc-registration-redesign-v15 .schedule-table-v13 th,
body.efc-registration-redesign-v15 .schedule-table-v13 td{height:70px;padding:8px 6px;border-color:#21312c}
body.efc-registration-redesign-v15 .schedule-table-v13 thead th{background:linear-gradient(180deg,#08614e,#054d40);color:#fff}
body.efc-registration-redesign-v15 .schedule-table-v13 thead th b{font-size:13px}
body.efc-registration-redesign-v15 .schedule-table-v13 thead th small{font-size:10px;color:#f3fffb;margin-top:4px}
body.efc-registration-redesign-v15 .schedule-course-head-v13,
body.efc-registration-redesign-v15 .schedule-table-v13 tbody th{width:84px;min-width:84px}
body.efc-registration-redesign-v15 .schedule-time-row-v13 th,
body.efc-registration-redesign-v15 .schedule-course-row-v13 th{background:#e8eee9;font-size:12px}
body.efc-registration-redesign-v15 .schedule-time-row-v13 input[type=time]{width:100%;height:46px;border:1px solid #c4d0cc;border-radius:8px;background:#fff;padding:4px;font:650 12px "Segoe UI Variable","Segoe UI",Tahoma,sans-serif}
body.efc-registration-redesign-v15 .schedule-check-v13 span{width:25px;height:25px;border:2px solid #365049;border-radius:5px;background:#fff}
body.efc-registration-redesign-v15 .schedule-check-v13 input:checked+span{background:#08745a;box-shadow:inset 0 0 0 4px #fff}
body.efc-registration-redesign-v15 .schedule-notes-v13{position:relative;margin:16px 0 0;padding:12px 18px 12px 50px;border:1px solid #e1bd3c;border-radius:10px;background:rgba(255,239,164,.56);font-size:12px;line-height:1.8;color:#252c29}
body.efc-registration-redesign-v15 .schedule-notes-v13 p{margin:2px 0}
.efc-reg-bottom-info-v15{position:absolute;left:15px;top:50%;transform:translateY(-50%);width:28px;height:28px;color:#09624e}
.efc-reg-bottom-info-v15 svg{width:100%;height:100%}
body.efc-registration-redesign-v15 input[type=date]::-webkit-calendar-picker-indicator,
body.efc-registration-redesign-v15 input[type=time]::-webkit-calendar-picker-indicator{opacity:0}
@media(max-width:1400px){
  .efc-reg-page-head-v15{grid-template-columns:minmax(220px,1fr) minmax(420px,520px) minmax(30px,.5fr)}
  .efc-reg-hero-v15 h1{font-size:32px}
  body.efc-registration-redesign-v15 .registration-schedule-layout-v13{grid-template-columns:minmax(470px,510px) minmax(520px,1fr)}
  body.efc-registration-redesign-v15 .schedule-table-v13 th,body.efc-registration-redesign-v15 .schedule-table-v13 td{height:62px;padding:6px 4px}
}
@media(max-width:1180px){
  body.efc-registration-redesign-v15 .shell aside{width:270px}
  body.efc-registration-redesign-v15 .shell main{margin-right:270px;width:calc(100% - 270px)}
  .efc-reg-page-head-v15{grid-template-columns:1fr minmax(390px,500px)}
  .efc-reg-page-head-v15>div[aria-hidden]{display:none}
  .efc-reg-hero-v15{grid-column:2}
  .efc-reg-welcome-v15{grid-column:1;padding-left:76px}
  body.efc-registration-redesign-v15 .registration-schedule-layout-v13{grid-template-columns:1fr}
  body.efc-registration-redesign-v15 .registration-form-compact-v13{max-width:720px;justify-self:center}
  body.efc-registration-redesign-v15 .registration-schedule-card-v13{order:2}
}

/* Consolidated responsive rules formerly loaded as a second registration layer. */

body.efc-registration-redesign-v15{
  --efc-redesign-sidebar:clamp(230px,18vw,268px);
  overflow-x:hidden;
}
body.efc-registration-redesign-v15 .shell{min-width:0;overflow-x:hidden}
body.efc-registration-redesign-v15 .shell aside{
  width:var(--efc-redesign-sidebar)!important;
  padding:22px 16px 18px!important;
  box-sizing:border-box;
}
body.efc-registration-redesign-v15 .shell main{
  margin-right:var(--efc-redesign-sidebar)!important;
  width:calc(100% - var(--efc-redesign-sidebar))!important;
  min-width:0!important;
  overflow-x:hidden;
}
body.efc-registration-redesign-v15 .content{
  width:100%;
  min-width:0;
  max-width:none;
  box-sizing:border-box;
  padding:20px 22px 34px!important;
}
body.efc-registration-redesign-v15 .brand{gap:11px;padding:0 3px 18px!important}
body.efc-registration-redesign-v15 .brand .logo{width:50px!important;height:50px!important;padding:7px!important;border-radius:12px!important}
body.efc-registration-redesign-v15 .brand b{font-size:15.5px!important;line-height:1.3!important}
body.efc-registration-redesign-v15 .brand small{font-size:9px!important;margin-top:3px!important}
body.efc-registration-redesign-v15 .shell nav{gap:5px!important;padding-top:18px!important}
body.efc-registration-redesign-v15 .shell nav a{min-height:48px!important;padding:8px 13px!important;border-radius:11px!important;font-size:13.5px!important;gap:11px!important}
body.efc-registration-redesign-v15 .shell nav a i{width:24px!important;height:24px!important}
body.efc-registration-redesign-v15 .shell nav a i svg{width:23px!important;height:23px!important}
body.efc-registration-redesign-v15 .side-foot{padding-top:12px!important}
body.efc-registration-redesign-v15 .user-controls-v13{gap:7px!important}
body.efc-registration-redesign-v15 .user-controls-v13 small{font-size:10px!important}
body.efc-registration-redesign-v15 .user-controls-v13 button{min-height:42px!important;font-size:12.5px!important}
body.efc-registration-redesign-v15 .efc-bell-v13{top:34px!important;left:22px!important;width:48px!important;height:48px!important;border-radius:13px!important;font-size:18px!important}
body.efc-registration-redesign-v15 .efc-bell-v13>b{min-width:21px!important;height:21px!important;line-height:21px!important;font-size:10px!important}

body.efc-registration-redesign-v15 .efc-reg-page-head-v15{
  grid-template-columns:minmax(170px,.8fr) minmax(330px,470px) minmax(20px,.38fr)!important;
  min-width:0;
  min-height:78px!important;
  gap:14px!important;
  margin:0 0 18px!important;
}
body.efc-registration-redesign-v15 .efc-reg-welcome-v15{min-width:0;padding-left:58px!important;gap:3px!important}
body.efc-registration-redesign-v15 .efc-reg-welcome-v15 b{font-size:13px!important}
body.efc-registration-redesign-v15 .efc-reg-welcome-v15 span{font-size:10px!important}
body.efc-registration-redesign-v15 .efc-reg-hero-v15{height:76px!important;border-radius:17px!important;gap:18px!important;min-width:0}
body.efc-registration-redesign-v15 .efc-reg-hero-v15 svg{width:42px!important;height:42px!important}
body.efc-registration-redesign-v15 .efc-reg-hero-v15 h1{font-size:clamp(25px,2.2vw,31px)!important;white-space:nowrap}
body.efc-registration-redesign-v15 .efc-reg-hero-v15 i{bottom:9px!important;width:48px!important;height:3px!important}

body.efc-registration-redesign-v15 .registration-schedule-layout-v13{
  width:100%!important;
  min-width:0!important;
  max-width:100%!important;
  grid-template-columns:minmax(0,.86fr) minmax(0,1.14fr)!important;
  gap:14px!important;
  align-items:start!important;
  box-sizing:border-box;
}
body.efc-registration-redesign-v15 .registration-schedule-layout-v13>*{min-width:0!important;max-width:100%!important;box-sizing:border-box}
body.efc-registration-redesign-v15 .registration-form-compact-v13{
  width:100%!important;
  max-width:none!important;
  min-width:0!important;
  padding:13px 14px 14px!important;
  border-radius:13px!important;
  box-sizing:border-box;
}
body.efc-registration-redesign-v15 .registration-form-compact-v13 .section-head{
  height:54px!important;
  margin:-1px 0 12px!important;
  padding:0 16px!important;
  border-radius:11px!important;
  gap:12px!important;
}
body.efc-registration-redesign-v15 .registration-form-compact-v13 .section-head h2{font-size:20px!important}
body.efc-registration-redesign-v15 .efc-reg-form-icon-v15{width:29px!important;height:29px!important}
body.efc-registration-redesign-v15 .efc-reg-form-icon-v15 svg{width:27px!important;height:27px!important}
body.efc-registration-redesign-v15 .registration-fields-v13{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:10px 14px!important;min-width:0}
body.efc-registration-redesign-v15 .registration-fields-v13 label{font-size:12.5px!important;gap:6px!important;min-width:0!important}
body.efc-registration-redesign-v15 .registration-fields-v13 .input,
body.efc-registration-redesign-v15 .registration-fields-v13 select{
  width:100%!important;
  min-width:0!important;
  height:42px!important;
  padding:7px 10px!important;
  border-radius:9px!important;
  font-size:12.5px!important;
  box-sizing:border-box;
}
body.efc-registration-redesign-v15 .registration-fields-v13 label.efc-reg-has-icon-v15 .input{padding-left:36px!important}
body.efc-registration-redesign-v15 .efc-reg-field-icon-v15{left:10px!important;bottom:10px!important;width:19px!important;height:19px!important}
body.efc-registration-redesign-v15 .debt-slot-v13{min-height:60px!important}
body.efc-registration-redesign-v15 .registration-submit-v13{min-height:50px!important;margin-top:10px!important;border-radius:9px!important;font-size:16px!important;gap:9px!important}
body.efc-registration-redesign-v15 .registration-submit-v13 svg{width:21px!important;height:21px!important}

body.efc-registration-redesign-v15 .registration-schedule-card-v13{
  width:100%!important;
  max-width:none!important;
  min-width:0!important;
  padding:14px 12px 13px!important;
  border-radius:14px!important;
  box-sizing:border-box;
}
body.efc-registration-redesign-v15 .schedule-title-v13{gap:12px!important;margin:0 5px 10px!important;min-width:0}
body.efc-registration-redesign-v15 .schedule-title-v13 h2{font-size:21px!important;gap:9px!important;min-width:0}
body.efc-registration-redesign-v15 .schedule-title-v13 h2 svg{width:29px!important;height:29px!important}
body.efc-registration-redesign-v15 .efc-schedule-course-mirror-v15{min-width:138px!important;gap:8px!important;font-size:12px!important}
body.efc-registration-redesign-v15 .efc-schedule-course-mirror-v15 select{width:122px!important;max-width:122px!important;height:42px!important;padding:6px 9px!important;font-size:11.5px!important;border-radius:9px!important}
body.efc-registration-redesign-v15 .schedule-top-note-v13{margin:0 5px 10px!important;min-height:42px!important;padding:8px 11px!important;border-radius:9px!important;gap:8px!important;font-size:11px!important;line-height:1.45!important}
body.efc-registration-redesign-v15 .schedule-top-note-v13 svg{width:18px!important;height:18px!important}
body.efc-registration-redesign-v15 .schedule-table-wrap-v13{width:100%;min-width:0;max-width:100%;overflow:hidden!important;border-radius:10px!important}
body.efc-registration-redesign-v15 .schedule-table-v13{width:100%!important;min-width:0!important;max-width:100%!important;table-layout:fixed!important}
body.efc-registration-redesign-v15 .schedule-table-v13 th,
body.efc-registration-redesign-v15 .schedule-table-v13 td{height:56px!important;padding:5px 3px!important;min-width:0!important}
body.efc-registration-redesign-v15 .schedule-table-v13 thead th b{font-size:11.5px!important}
body.efc-registration-redesign-v15 .schedule-table-v13 thead th small{font-size:8.5px!important;margin-top:2px!important}
body.efc-registration-redesign-v15 .schedule-course-head-v13,
body.efc-registration-redesign-v15 .schedule-table-v13 tbody th{width:68px!important;min-width:68px!important}
body.efc-registration-redesign-v15 .schedule-time-row-v13 th,
body.efc-registration-redesign-v15 .schedule-course-row-v13 th{font-size:10.5px!important}
body.efc-registration-redesign-v15 .schedule-time-row-v13 input[type=time]{height:38px!important;padding:2px!important;font-size:10.5px!important;min-width:0!important}
body.efc-registration-redesign-v15 .schedule-check-v13 span{width:22px!important;height:22px!important}
body.efc-registration-redesign-v15 .schedule-notes-v13{margin:10px 0 0!important;padding:9px 14px 9px 42px!important;border-radius:9px!important;font-size:10px!important;line-height:1.65!important}
body.efc-registration-redesign-v15 .efc-reg-bottom-info-v15{left:12px!important;width:24px!important;height:24px!important}

@media(max-width:1260px){
  body.efc-registration-redesign-v15{--efc-redesign-sidebar:230px}
  body.efc-registration-redesign-v15 .content{padding-left:18px!important;padding-right:18px!important}
  body.efc-registration-redesign-v15 .efc-reg-page-head-v15{grid-template-columns:minmax(150px,.7fr) minmax(320px,430px) minmax(0,.25fr)!important}
  body.efc-registration-redesign-v15 .efc-reg-welcome-v15{padding-left:50px!important}
  body.efc-registration-redesign-v15 .registration-schedule-layout-v13{grid-template-columns:minmax(0,.9fr) minmax(0,1.1fr)!important;gap:12px!important}
  body.efc-registration-redesign-v15 .registration-fields-v13{gap:9px 11px!important}
  body.efc-registration-redesign-v15 .schedule-title-v13 h2{font-size:19px!important}
  body.efc-registration-redesign-v15 .efc-schedule-course-mirror-v15{min-width:126px!important}
  body.efc-registration-redesign-v15 .efc-schedule-course-mirror-v15 select{width:108px!important;max-width:108px!important}
}

@media(max-width:1080px){
  body.efc-registration-redesign-v15{--efc-redesign-sidebar:218px}
  body.efc-registration-redesign-v15 .content{padding:16px 14px 28px!important}
  body.efc-registration-redesign-v15 .efc-reg-page-head-v15{grid-template-columns:1fr minmax(300px,390px)!important;min-height:70px!important;margin-bottom:14px!important}
  body.efc-registration-redesign-v15 .efc-reg-page-head-v15>div[aria-hidden]{display:none!important}
  body.efc-registration-redesign-v15 .efc-reg-welcome-v15{grid-column:1!important;padding-left:46px!important}
  body.efc-registration-redesign-v15 .efc-reg-hero-v15{grid-column:2!important;height:68px!important}
  body.efc-registration-redesign-v15 .efc-reg-hero-v15 h1{font-size:24px!important}
  body.efc-registration-redesign-v15 .registration-schedule-layout-v13{grid-template-columns:minmax(0,.94fr) minmax(0,1.06fr)!important;gap:10px!important}
  body.efc-registration-redesign-v15 .registration-fields-v13 label{font-size:11.5px!important}
  body.efc-registration-redesign-v15 .registration-fields-v13 .input,
  body.efc-registration-redesign-v15 .registration-fields-v13 select{font-size:11.5px!important}
}

@media(max-width:980px){
  body.efc-registration-redesign-v15{--efc-redesign-sidebar:210px}
  body.efc-registration-redesign-v15 .registration-schedule-layout-v13{grid-template-columns:1fr!important}
  body.efc-registration-redesign-v15 .registration-form-compact-v13{max-width:680px!important;justify-self:center}
  body.efc-registration-redesign-v15 .registration-schedule-card-v13{order:2}
}

@media(max-height:760px){
  body.efc-registration-redesign-v15 .shell aside{padding-top:14px!important;padding-bottom:12px!important}
  body.efc-registration-redesign-v15 .brand{padding-bottom:12px!important}
  body.efc-registration-redesign-v15 .shell nav{padding-top:12px!important;gap:3px!important}
  body.efc-registration-redesign-v15 .shell nav a{min-height:43px!important;padding-top:6px!important;padding-bottom:6px!important}
  body.efc-registration-redesign-v15 .content{padding-top:12px!important}
  body.efc-registration-redesign-v15 .efc-reg-page-head-v15{min-height:62px!important;margin-bottom:12px!important}
  body.efc-registration-redesign-v15 .efc-reg-hero-v15{height:62px!important}
  body.efc-registration-redesign-v15 .efc-reg-hero-v15 h1{font-size:24px!important}
  body.efc-registration-redesign-v15 .efc-reg-hero-v15 svg{width:34px!important;height:34px!important}
  body.efc-registration-redesign-v15 .registration-form-compact-v13{padding-top:10px!important}
  body.efc-registration-redesign-v15 .registration-form-compact-v13 .section-head{height:47px!important;margin-bottom:8px!important}
  body.efc-registration-redesign-v15 .registration-fields-v13{gap-top:7px!important;gap-bottom:7px!important;row-gap:7px!important}
  body.efc-registration-redesign-v15 .registration-fields-v13 .input,
  body.efc-registration-redesign-v15 .registration-fields-v13 select{height:38px!important}
  body.efc-registration-redesign-v15 .debt-slot-v13{min-height:55px!important}
  body.efc-registration-redesign-v15 .registration-submit-v13{min-height:44px!important;margin-top:7px!important}
  body.efc-registration-redesign-v15 .registration-schedule-card-v13{padding-top:10px!important}
  body.efc-registration-redesign-v15 .schedule-title-v13{margin-bottom:7px!important}
  body.efc-registration-redesign-v15 .schedule-top-note-v13{min-height:36px!important;margin-bottom:7px!important;padding-top:6px!important;padding-bottom:6px!important}
  body.efc-registration-redesign-v15 .schedule-table-v13 th,
  body.efc-registration-redesign-v15 .schedule-table-v13 td{height:49px!important}
  body.efc-registration-redesign-v15 .schedule-notes-v13{margin-top:7px!important;padding-top:6px!important;padding-bottom:6px!important}
}

`;
document.head.appendChild(style);

syncPageClass();
window.EFC_REGISTRATION_REDESIGN_V15=Object.freeze({
  ready:true,
  enhanceRegistration:enhanceRegistrationRedesignV15,
  canonicalRegistrationEnhancer:true,
  screenshotRegistrationReference:true,
  existingRegistrationFlowPreserved:true,
  noSubmitOverride:true,
  scheduleMirrorFunctional:true,
  sidebarRestyledOnRegistrationOnly:true,
  segoeUiVariable:true,
  routerOwnsPageClass:true,
  responsiveConsolidated:true,singleMainScrollOwner:true,
  realViewportSizing:true,
  tauriDefault1440x900:true,
  tauriMinimum1100x700:true,
  noHorizontalRegistrationOverflow:true,
  responsiveSidebar:true,
  compactRegistrationScale:true,
  mainUntouched:true
});
})();