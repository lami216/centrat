(async()=>{
'use strict';
if(window.EFC_COURSES_CENTERS_REDESIGN_V23?.ready)return;
const waitUntil=async(check,timeout=15000)=>{const start=Date.now();while(!check()){if(Date.now()-start>timeout)throw new Error('Courses/centers redesign v23 timed out.');await new Promise(resolve=>setTimeout(resolve,20));}};
await waitUntil(()=>window.EFC_REGISTRATION_SCHEDULE_MATRIX_V17?.ready&&window.EFC_REGISTRATION_SCHEDULE_MATRIX_V17?.registrationReceiptCaptureConsolidated&&typeof window.shell==='function'&&typeof window.EFC_RENDER_SPECIALTIES_BASE_V13==='function'&&typeof window.EFC_REGISTRATION_SCHEDULE_V13?.enhanceSpecialties==='function');

const icon=body=>`<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><g fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${body}</g></svg>`;
const ICONS={
  grid:icon('<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/>'),
  center:icon('<path d="M5 20V7h14v13M8 7V4h8v3M3 20h18M9 11h2M13 11h2M9 15h2M13 15h2"/>'),
  course:icon('<rect x="5" y="4" width="14" height="16" rx="2"/><path d="M9 8h6M9 12h6M9 16h4"/>'),
  users:icon('<circle cx="9" cy="9" r="3"/><circle cx="16" cy="10" r="2.5"/><path d="M3.5 20c.7-4 2.7-6 5.5-6s4.8 2 5.5 6M14.5 15c2.8 0 4.7 1.7 5.3 5"/>'),
  clock:icon('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
  eye:icon('<path d="M2.5 12s3.2-5 9.5-5 9.5 5 9.5 5-3.2 5-9.5 5S2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="2.5"/>')
};
function makeViewAllButton(id){
  const button=document.createElement('button');
  button.type='button';button.id=id;button.className='efc-view-all-v23';
  button.innerHTML=`${ICONS.eye}<span>عرض الكل</span>`;
  return button;
}
function bindViewAll(button,grid){
  if(!button||!grid)return;
  grid.classList.add('efc-limit-three-v23');
  button.onclick=()=>{
    const expanded=grid.classList.toggle('is-expanded-v23');
    button.querySelector('span').textContent=expanded?'عرض أقل':'عرض الكل';
  };
}

function decorateCenterCards(section){
  section.querySelectorAll('.center-card-v13').forEach(card=>{
    const body=card.querySelector(':scope>div');
    const title=body?.querySelector('h3');
    const count=body?.querySelector('span');
    body?.querySelector('small')?.remove();
    if(title&&!title.querySelector('.efc-card-title-icon-v23'))title.insertAdjacentHTML('afterbegin',`<span class="efc-card-title-icon-v23">${ICONS.center}</span>`);
    if(count&&!count.querySelector('.efc-card-count-label-v23'))count.insertAdjacentHTML('afterbegin',`<small class="efc-card-count-label-v23">عدد الطلاب</small><span class="efc-card-count-icon-v23">${ICONS.users}</span>`);
    const edit=card.querySelector('.edit-center-v13');if(edit)edit.textContent='تعديل ✎';
  });
}

function decorateCourseCards(grid){
  grid.querySelectorAll('.spec-card').forEach(card=>{
    const title=card.querySelector('.spec-top h3');
    if(title&&!title.querySelector('.efc-card-title-icon-v23'))title.insertAdjacentHTML('afterbegin',`<span class="efc-card-title-icon-v23">${ICONS.course}</span>`);
    const type=card.querySelector('.spec-top span');if(type)type.hidden=true;
    const edit=card.querySelector('.edit-spec-v13');if(edit)edit.textContent='تعديل ✎';
    const facts=[...card.querySelectorAll('.spec-facts>div')];
    facts.forEach((fact,index)=>fact.classList.toggle('efc-hidden-fact-v23',index===0||index===2));
    if(facts[1]){
      const label=facts[1].querySelector('small'),value=facts[1].querySelector('b');
      if(label)label.textContent='المدة';
      if(value&&/شهر/.test(value.textContent||''))value.textContent='شهرية';
      if(!facts[1].querySelector('.efc-fact-icon-v23'))facts[1].insertAdjacentHTML('afterbegin',`<span class="efc-fact-icon-v23">${ICONS.clock}</span>`);
    }
    if(facts[3]){
      const label=facts[3].querySelector('small'),value=facts[3].querySelector('b');
      if(label)label.textContent='عدد الطلاب';
      if(value&&!/طالب/.test(value.textContent||''))value.textContent=`${String(value.textContent||'0').trim()} طالب`;
      if(!facts[3].querySelector('.efc-fact-icon-v23'))facts[3].insertAdjacentHTML('afterbegin',`<span class="efc-fact-icon-v23">${ICONS.users}</span>`);
    }
  });
}

function enhanceSpecialtiesPage(){
  document.body.classList.add('efc-specialties-redesign-v23');
  const content=document.querySelector('.content');if(!content)return;
  const pageTitle=content.querySelector('.page-title');
  const addCourse=content.querySelector('#addSpecV13');
  if(pageTitle){
    const info=pageTitle.querySelector(':scope>div');
    info?.querySelector('p')?.remove();info?.querySelector('span')?.remove();
    const h1=info?.querySelector('h1');if(h1){h1.textContent='الدورات و المراكز';if(!info.querySelector('.efc-page-icon-v23'))info.insertAdjacentHTML('afterbegin',`<span class="efc-page-icon-v23">${ICONS.grid}</span>`);}
  }

  const centers=content.querySelector('.centers-section-v13');
  const centerGrid=centers?.querySelector('.centers-grid-v13');
  const centerHead=centers?.querySelector('.centers-head-v13');
  if(centers&&centerHead){
    centers.classList.add('efc-centers-panel-v23');
    const titleBox=centerHead.querySelector(':scope>div');
    titleBox?.querySelector('p')?.remove();
    const h2=titleBox?.querySelector('h2');if(h2){h2.textContent='المراكز';if(!h2.querySelector('.efc-section-icon-v23'))h2.insertAdjacentHTML('afterbegin',`<span class="efc-section-icon-v23">${ICONS.center}</span>`);}
    const addCenter=centerHead.querySelector('#addCenterV13');if(addCenter){addCenter.textContent='＋ إضافة مركز';addCenter.classList.remove('secondary');addCenter.classList.add('efc-add-v23');}
    if(!centerHead.querySelector('#viewAllCentersV23')){
      const controls=document.createElement('div');controls.className='efc-section-controls-v23';
      if(addCenter)controls.appendChild(addCenter);
      const view=makeViewAllButton('viewAllCentersV23');controls.appendChild(view);centerHead.appendChild(controls);bindViewAll(view,centerGrid);
    }
    decorateCenterCards(centers);
  }

  const grid=content.querySelector('.spec-grid');
  if(grid&&!grid.closest('.efc-courses-panel-v23')){
    const panel=document.createElement('section');panel.className='efc-courses-panel-v23';
    const head=document.createElement('div');head.className='efc-courses-head-v23';
    head.innerHTML=`<div><h2><span class="efc-section-icon-v23">${ICONS.course}</span>الدورات</h2></div><div class="efc-section-controls-v23"></div>`;
    grid.parentNode.insertBefore(panel,grid);panel.appendChild(head);panel.appendChild(grid);
    const controls=head.querySelector('.efc-section-controls-v23');
    if(addCourse){addCourse.textContent='＋ إضافة دورة';addCourse.classList.add('efc-add-v23');controls.appendChild(addCourse);}
    const view=makeViewAllButton('viewAllCoursesV23');controls.appendChild(view);bindViewAll(view,grid);
  }
  decorateCourseCards(grid||content.querySelector('.spec-grid'));
}

window.renderSpecialties=function(){
  const result=window.EFC_RENDER_SPECIALTIES_BASE_V13();
  window.EFC_REGISTRATION_SCHEDULE_V13.enhanceSpecialties();
  enhanceSpecialtiesPage();
  return result;
};


const style=document.createElement('style');style.id='efc-courses-centers-redesign-style-v23';style.textContent=`
.shell-v13 .brand .logo{display:grid!important;place-items:center!important;overflow:hidden!important}
.shell-v13 .brand .logo img{padding:0!important;width:46px!important;height:46px!important;object-fit:contain!important;transform:none!important}
.shell-v13 .brand b{display:grid!important;gap:1px!important;line-height:1.2!important}
.shell-v13 .brand b span:first-child{font-size:15px!important;font-weight:850!important}
.shell-v13 .brand b span:last-child{font-size:13px!important;font-weight:800!important}

body.efc-specialties-redesign-v23{font-family:"Segoe UI Variable","Segoe UI",Tahoma,Arial,sans-serif!important;background:#f5fbf9!important;overflow-x:hidden}
body.efc-specialties-redesign-v23 .shell{min-width:0!important;background:radial-gradient(circle at 42% 28%,#fbfffe 0,#f4faf7 54%,#edf6f2 100%)!important}
body.efc-specialties-redesign-v23 .shell aside{width:clamp(230px,18vw,268px)!important;padding:22px 16px 18px!important;background:linear-gradient(180deg,#075445 0%,#05473d 48%,#033d35 100%)!important;box-shadow:-10px 0 35px rgba(5,55,47,.08)!important}
body.efc-specialties-redesign-v23 .shell main{margin-right:clamp(230px,18vw,268px)!important;width:calc(100% - clamp(230px,18vw,268px))!important;min-width:0!important;overflow-x:hidden}
body.efc-specialties-redesign-v23 .content{width:100%!important;max-width:none!important;min-width:0!important;padding:18px 22px 34px!important}
body.efc-specialties-redesign-v23 .brand{gap:11px!important;padding:0 3px 18px!important}
body.efc-specialties-redesign-v23 .brand .logo{width:52px!important;height:52px!important;padding:3px!important;border-radius:12px!important;background:#fff!important}
body.efc-specialties-redesign-v23 .shell nav{gap:5px!important;padding-top:18px!important}
body.efc-specialties-redesign-v23 .shell nav a{min-height:48px!important;padding:8px 13px!important;border-radius:11px!important;font-size:13.5px!important;gap:11px!important;color:#e2f0eb!important;border:1px solid transparent!important}
body.efc-specialties-redesign-v23 .shell nav a i{width:24px!important;height:24px!important;display:grid!important;place-items:center!important}
body.efc-specialties-redesign-v23 .shell nav a i svg{width:23px!important;height:23px!important}
body.efc-specialties-redesign-v23 .shell nav a.active{background:linear-gradient(90deg,rgba(38,181,139,.26),rgba(255,255,255,.06))!important;color:#fff!important;border-color:rgba(93,216,179,.44)!important;box-shadow:inset 6px 0 #35c99a,0 8px 20px rgba(0,0,0,.08)!important}
body.efc-specialties-redesign-v23 .production-side-note{display:none!important}

body.efc-specialties-redesign-v23 .page-title{width:min(520px,48vw)!important;min-height:76px!important;margin:0 auto 18px!important;align-items:center!important;justify-content:center!important;border:1.4px solid #2b9978!important;border-radius:17px!important;background:linear-gradient(110deg,#dff7ef 0%,#effaf6 60%,#fff0c8 100%)!important;box-shadow:0 10px 28px rgba(20,102,76,.05)!important;padding:0 24px!important}
body.efc-specialties-redesign-v23 .page-title>div{display:flex!important;align-items:center!important;justify-content:center!important;gap:24px!important;width:100%!important}
body.efc-specialties-redesign-v23 .page-title h1{margin:0!important;font-size:clamp(27px,2.6vw,38px)!important;line-height:1!important;color:#093f35!important;font-weight:850!important;white-space:nowrap!important}
body.efc-specialties-redesign-v23 .page-title>.button{display:none!important}
.efc-page-icon-v23{display:grid;place-items:center;color:#073f35}.efc-page-icon-v23 svg{width:45px;height:45px}

body.efc-specialties-redesign-v23 .efc-centers-panel-v23,body.efc-specialties-redesign-v23 .efc-courses-panel-v23{border-radius:15px!important;padding:16px 18px 18px!important;margin:0 0 20px!important;min-width:0!important;box-shadow:0 10px 28px rgba(25,78,61,.05)!important}
body.efc-specialties-redesign-v23 .efc-centers-panel-v23{border:1.5px solid #269677!important;background:linear-gradient(135deg,rgba(231,249,243,.94),rgba(247,253,251,.98))!important}
body.efc-specialties-redesign-v23 .efc-courses-panel-v23{border:1.5px solid #e2af43!important;background:linear-gradient(135deg,rgba(255,246,214,.94),rgba(255,252,239,.98))!important}
body.efc-specialties-redesign-v23 .centers-head-v13,body.efc-specialties-redesign-v23 .efc-courses-head-v23{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:14px!important;margin:0 0 14px!important}
body.efc-specialties-redesign-v23 .centers-head-v13>div:first-child,body.efc-specialties-redesign-v23 .efc-courses-head-v23>div:first-child{order:1}
body.efc-specialties-redesign-v23 .efc-section-controls-v23{order:2;display:flex;align-items:center;gap:10px;flex-wrap:wrap}
body.efc-specialties-redesign-v23 .centers-head-v13 h2,body.efc-specialties-redesign-v23 .efc-courses-head-v23 h2{min-width:240px;min-height:56px;margin:0!important;padding:0 22px!important;border:1.3px solid #2c8d74!important;border-radius:15px!important;display:flex!important;align-items:center!important;justify-content:center!important;gap:18px!important;font-size:27px!important;font-weight:850!important;color:#0a4b3d!important;background:rgba(255,255,255,.32)!important}
body.efc-specialties-redesign-v23 .efc-courses-head-v23 h2{border-color:#c99f42!important;background:rgba(255,245,204,.52)!important}
.efc-section-icon-v23{display:grid;place-items:center}.efc-section-icon-v23 svg{width:34px;height:34px}
body.efc-specialties-redesign-v23 .efc-add-v23{min-height:52px!important;border-radius:12px!important;padding:0 24px!important;background:linear-gradient(180deg,#08664f,#075442)!important;color:#fff!important;border:0!important;font-size:15px!important;font-weight:800!important;box-shadow:0 8px 20px rgba(6,82,63,.12)!important}
.efc-view-all-v23{min-height:52px;border:1px solid #a6d7ca;border-radius:12px;background:#f9fffd;color:#153f35;padding:0 20px;font:750 14px "Segoe UI Variable","Segoe UI",Tahoma,sans-serif;display:flex;align-items:center;gap:9px;cursor:pointer}.efc-view-all-v23 svg{width:24px;height:24px}.efc-view-all-v23:hover{background:#eef9f5}

body.efc-specialties-redesign-v23 .centers-grid-v13,body.efc-specialties-redesign-v23 .spec-grid{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:14px!important;min-width:0!important}
.efc-limit-three-v23:not(.is-expanded-v23)>:nth-child(n+4){display:none!important}
body.efc-specialties-redesign-v23 .center-card-v13,body.efc-specialties-redesign-v23 .spec-card{min-width:0!important;min-height:176px!important;padding:15px 16px!important;border-radius:13px!important;background:rgba(255,255,255,.92)!important;box-shadow:none!important;position:relative!important;overflow:hidden!important}
body.efc-specialties-redesign-v23 .center-card-v13{border:1.3px solid #72bca8!important}
body.efc-specialties-redesign-v23 .spec-card{border:1.3px solid #e2b253!important}
body.efc-specialties-redesign-v23 .center-card-v13{display:grid!important;grid-template-columns:1fr auto!important;grid-template-rows:auto 1fr!important;gap:12px!important;align-items:start!important}
body.efc-specialties-redesign-v23 .center-card-v13>div{display:contents!important}
body.efc-specialties-redesign-v23 .center-card-v13 h3{grid-column:1/-1!important;min-height:54px!important;margin:0!important;border-radius:10px!important;background:linear-gradient(135deg,#e9faf4,#d9f1e7)!important;padding:0 16px!important;display:flex!important;align-items:center!important;justify-content:space-between!important;gap:12px!important;font-size:19px!important;color:#111!important;font-weight:850!important}
body.efc-specialties-redesign-v23 .center-card-v13>div>span{grid-column:1/-1!important;min-height:72px!important;border-radius:10px!important;background:#eaf8f3!important;padding:12px 16px!important;display:grid!important;grid-template-columns:1fr auto!important;grid-template-rows:auto auto!important;align-items:center!important;color:#111!important;font-size:20px!important;font-weight:850!important}
.efc-card-count-label-v23{grid-column:1!important;font-size:12px!important;color:#23483f!important;font-weight:650!important}.efc-card-count-icon-v23{grid-column:2!important;grid-row:1/3!important;color:#0aa36f!important;display:grid!important;place-items:center!important}.efc-card-count-icon-v23 svg{width:37px;height:37px}.efc-card-title-icon-v23{color:#0b5f4c;display:grid;place-items:center}.efc-card-title-icon-v23 svg{width:31px;height:31px}
body.efc-specialties-redesign-v23 .center-card-v13 .edit-center-v13,body.efc-specialties-redesign-v23 .spec-card .edit-spec-v13{position:absolute!important;top:15px!important;left:15px!important;min-height:43px!important;padding:0 14px!important;border:1px solid #c9ded8!important;border-radius:10px!important;background:#fff!important;color:#24483f!important;font-size:13px!important;font-weight:700!important;z-index:2!important}
body.efc-specialties-redesign-v23 .center-card-v13 h3{padding-left:112px!important}

body.efc-specialties-redesign-v23 .spec-top{min-height:56px!important;align-items:center!important;padding-left:105px!important}
body.efc-specialties-redesign-v23 .spec-top>div{width:100%!important}
body.efc-specialties-redesign-v23 .spec-top h3{min-height:54px!important;margin:0!important;padding:0 14px!important;border-radius:10px!important;background:linear-gradient(135deg,#fff2c8,#ffefb1)!important;display:flex!important;align-items:center!important;justify-content:space-between!important;gap:12px!important;font-size:19px!important;color:#111!important;font-weight:850!important}
body.efc-specialties-redesign-v23 .spec-facts{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:12px!important;margin-top:14px!important}
body.efc-specialties-redesign-v23 .spec-facts .efc-hidden-fact-v23{display:none!important}
body.efc-specialties-redesign-v23 .spec-facts>div:not(.efc-hidden-fact-v23){min-height:76px!important;border-radius:10px!important;background:#fff4cd!important;padding:11px 13px!important;display:grid!important;grid-template-columns:1fr auto!important;grid-template-rows:auto auto!important;align-items:center!important;position:relative!important}
body.efc-specialties-redesign-v23 .spec-facts small{font-size:11.5px!important;color:#394f47!important;font-weight:650!important}.spec-facts b{font-size:18px!important;color:#111!important;font-weight:850!important;margin-top:3px!important}.efc-fact-icon-v23{grid-column:2!important;grid-row:1/3!important;display:grid!important;place-items:center!important;color:#0a8e66!important}.efc-fact-icon-v23 svg{width:31px;height:31px}

body.efc-specialties-redesign-v23 .centers-empty-v13{grid-column:1/-1!important;border:1px dashed #92c8b9!important;background:#fafffd!important;color:#55766d!important}
@media(max-width:1240px){body.efc-specialties-redesign-v23 .centers-grid-v13,body.efc-specialties-redesign-v23 .spec-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}.efc-limit-three-v23:not(.is-expanded-v23)>:nth-child(n+4){display:block!important}.efc-limit-three-v23:not(.is-expanded-v23)>:nth-child(n+5){display:none!important}body.efc-specialties-redesign-v23 .centers-head-v13 h2,body.efc-specialties-redesign-v23 .efc-courses-head-v23 h2{min-width:210px;font-size:24px!important}}
@media(max-width:1080px){body.efc-specialties-redesign-v23 .shell aside{width:210px!important}body.efc-specialties-redesign-v23 .shell main{margin-right:210px!important;width:calc(100% - 210px)!important}body.efc-specialties-redesign-v23 .content{padding:14px!important}body.efc-specialties-redesign-v23 .page-title{width:min(470px,65vw)!important;min-height:68px!important}body.efc-specialties-redesign-v23 .page-title h1{font-size:27px!important}.efc-page-icon-v23 svg{width:38px;height:38px}body.efc-specialties-redesign-v23 .centers-head-v13,body.efc-specialties-redesign-v23 .efc-courses-head-v23{align-items:stretch!important}body.efc-specialties-redesign-v23 .efc-section-controls-v23{gap:7px}.efc-view-all-v23,body.efc-specialties-redesign-v23 .efc-add-v23{min-height:46px!important;padding:0 14px!important;font-size:12.5px!important}}
@media(max-height:760px){body.efc-specialties-redesign-v23 .shell aside{padding-top:14px!important;padding-bottom:12px!important}body.efc-specialties-redesign-v23 .brand{padding-bottom:12px!important}body.efc-specialties-redesign-v23 .shell nav{padding-top:12px!important;gap:3px!important}body.efc-specialties-redesign-v23 .shell nav a{min-height:43px!important;padding-top:6px!important;padding-bottom:6px!important}body.efc-specialties-redesign-v23 .page-title{min-height:62px!important;margin-bottom:12px!important}body.efc-specialties-redesign-v23 .efc-centers-panel-v23,body.efc-specialties-redesign-v23 .efc-courses-panel-v23{padding-top:12px!important;padding-bottom:12px!important;margin-bottom:14px!important}body.efc-specialties-redesign-v23 .center-card-v13,body.efc-specialties-redesign-v23 .spec-card{min-height:150px!important}}

/* Consolidated compact v25 rules. */

/* Fixed desktop canvas: slightly larger, anchored to the sidebar edge, never stretched. */
body.efc-specialties-redesign-v23 .content{
  width:900px!important;max-width:900px!important;min-width:900px!important;
  margin:0 0 0 auto!important;padding:10px 0 22px!important;box-sizing:border-box!important;overflow:visible!important;
}
body.efc-specialties-redesign-v23 .page-title{
  width:365px!important;max-width:365px!important;min-width:365px!important;
  height:54px!important;min-height:54px!important;max-height:54px!important;
  margin:0 0 12px auto!important;padding:0 16px!important;border-radius:13px!important;box-sizing:border-box!important;flex:0 0 auto!important;
}
body.efc-specialties-redesign-v23 .page-title>div{gap:13px!important;flex:0 0 auto!important}
body.efc-specialties-redesign-v23 .page-title h1{font-size:25px!important;line-height:1!important;white-space:nowrap!important}
body.efc-specialties-redesign-v23 .efc-page-icon-v23 svg{width:30px!important;height:30px!important}

body.efc-specialties-redesign-v23 .efc-centers-panel-v23,
body.efc-specialties-redesign-v23 .efc-courses-panel-v23{
  width:900px!important;max-width:900px!important;min-width:900px!important;
  padding:10px 11px 18px!important;margin:0 0 12px!important;border-radius:13px!important;
  box-sizing:border-box!important;align-self:auto!important;flex:0 0 auto!important;
}
body.efc-specialties-redesign-v23 .centers-head-v13,
body.efc-specialties-redesign-v23 .efc-courses-head-v23{
  width:100%!important;min-height:47px!important;max-height:47px!important;gap:10px!important;margin:0 0 11px!important;
  flex:0 0 auto!important;align-items:center!important;
}
body.efc-specialties-redesign-v23 .efc-section-controls-v23{gap:8px!important;flex:0 0 auto!important;flex-wrap:nowrap!important}
body.efc-specialties-redesign-v23 .centers-head-v13 h2,
body.efc-specialties-redesign-v23 .efc-courses-head-v23 h2{
  width:178px!important;min-width:178px!important;max-width:178px!important;
  height:45px!important;min-height:45px!important;max-height:45px!important;
  padding:0 13px!important;border-radius:11px!important;gap:9px!important;font-size:20px!important;
  box-sizing:border-box!important;flex:0 0 178px!important;
}
body.efc-specialties-redesign-v23 .efc-section-icon-v23 svg{width:25px!important;height:25px!important}
body.efc-specialties-redesign-v23 .efc-add-v23,
body.efc-specialties-redesign-v23 .efc-view-all-v23{
  height:42px!important;min-height:42px!important;max-height:42px!important;
  width:auto!important;min-width:0!important;max-width:none!important;padding:0 15px!important;border-radius:10px!important;
  font-size:13.5px!important;gap:7px!important;flex:0 0 auto!important;white-space:nowrap!important;
}
body.efc-specialties-redesign-v23 .efc-view-all-v23 svg{width:18px!important;height:18px!important}

body.efc-specialties-redesign-v23 .centers-grid-v13,
body.efc-specialties-redesign-v23 .spec-grid{
  width:878px!important;max-width:878px!important;min-width:878px!important;
  grid-template-columns:repeat(3,286px)!important;grid-auto-columns:286px!important;gap:10px!important;
  justify-content:start!important;align-items:start!important;box-sizing:border-box!important;
}
.efc-limit-three-v23:not(.is-expanded-v23)>:nth-child(n+4){display:none!important}
body.efc-specialties-redesign-v23 .center-card-v13,
body.efc-specialties-redesign-v23 .spec-card{
  width:286px!important;max-width:286px!important;min-width:286px!important;
  padding:10px 11px!important;border-radius:11px!important;box-sizing:border-box!important;
  justify-self:start!important;align-self:start!important;flex:0 0 286px!important;overflow:hidden!important;
}
body.efc-specialties-redesign-v23 .center-card-v13{height:auto!important;min-height:136px!important;max-height:none!important;gap:7px!important}
body.efc-specialties-redesign-v23 .center-card-v13 h3{
  height:auto!important;min-height:40px!important;max-height:none!important;
  margin:0 84px 0 0!important;padding:6px 11px!important;border-radius:8px!important;gap:7px!important;
  font-size:16px!important;line-height:1.25!important;overflow:visible!important;white-space:normal!important;
  overflow-wrap:anywhere!important;word-break:break-word!important;min-width:0!important;
  direction:rtl!important;text-align:right!important;justify-content:flex-start!important;box-sizing:border-box!important;
  border:1px solid rgba(20,31,27,.28)!important;
}
body.efc-specialties-redesign-v23 .center-card-v13 h3 .efc-card-title-icon-v23{flex:0 0 auto!important;align-self:center!important}
body.efc-specialties-redesign-v23 .center-card-v13>div>span{
  height:70px!important;min-height:70px!important;max-height:70px!important;
  padding:7px 11px!important;border-radius:8px!important;font-size:16px!important;overflow:hidden!important;
  border:1px solid rgba(20,31,27,.22)!important;box-sizing:border-box!important;
}
body.efc-specialties-redesign-v23 .efc-card-count-label-v23{font-size:10px!important}
body.efc-specialties-redesign-v23 .efc-card-count-icon-v23 svg{width:27px!important;height:27px!important}
body.efc-specialties-redesign-v23 .efc-card-title-icon-v23 svg{width:23px!important;height:23px!important}
body.efc-specialties-redesign-v23 .center-card-v13 .edit-center-v13,
body.efc-specialties-redesign-v23 .spec-card .edit-spec-v13{
  top:10px!important;left:10px!important;height:34px!important;min-height:34px!important;max-height:34px!important;
  padding:0 10px!important;border-radius:8px!important;font-size:11px!important;line-height:1!important;white-space:nowrap!important;
}

body.efc-specialties-redesign-v23 .spec-card{height:auto!important;min-height:160px!important;max-height:none!important}
body.efc-specialties-redesign-v23 .spec-top{
  height:auto!important;min-height:45px!important;max-height:none!important;
  padding-left:84px!important;overflow:visible!important;align-items:flex-start!important;box-sizing:border-box!important;
}
body.efc-specialties-redesign-v23 .spec-top>div{height:auto!important;min-height:45px!important;overflow:visible!important;box-sizing:border-box!important}
body.efc-specialties-redesign-v23 .spec-top h3{
  width:100%!important;height:auto!important;min-height:41px!important;max-height:none!important;
  margin:0!important;padding:6px 11px!important;border-radius:8px!important;gap:7px!important;font-size:16px!important;line-height:1.25!important;
  overflow:visible!important;white-space:normal!important;overflow-wrap:anywhere!important;word-break:break-word!important;min-width:0!important;
  direction:rtl!important;text-align:right!important;justify-content:flex-start!important;
  box-sizing:border-box!important;border:1px solid rgba(20,31,27,.28)!important;
}
body.efc-specialties-redesign-v23 .spec-top h3 .efc-card-title-icon-v23{flex:0 0 auto!important;align-self:center!important}
body.efc-specialties-redesign-v23 .spec-top>div>span{font-size:8.5px!important;margin-top:1px!important;line-height:1!important}
body.efc-specialties-redesign-v23 .spec-facts{
  width:100%!important;grid-template-columns:repeat(2,128px)!important;gap:8px!important;margin-top:8px!important;justify-content:start!important;
}
body.efc-specialties-redesign-v23 .spec-facts>div:not(.efc-hidden-fact-v23){
  width:128px!important;max-width:128px!important;min-width:128px!important;
  height:73px!important;min-height:73px!important;max-height:73px!important;
  padding:8px 8px!important;border-radius:8px!important;box-sizing:border-box!important;overflow:hidden!important;
  border:1px solid rgba(20,31,27,.22)!important;
}
body.efc-specialties-redesign-v23 .spec-facts small{font-size:9px!important;line-height:1!important}
body.efc-specialties-redesign-v23 .spec-facts b{font-size:13px!important;margin-top:1px!important;line-height:1!important}
body.efc-specialties-redesign-v23 .efc-fact-icon-v23 svg{width:20px!important;height:20px!important}

/* Keep the right edge attached to the sidebar. Only shrink the whole fixed canvas on narrower windows. */
@media(max-width:1180px){body.efc-specialties-redesign-v23 .content{transform:scale(.92)!important;transform-origin:top right!important}}
@media(max-width:1040px){body.efc-specialties-redesign-v23 .content{transform:scale(.82)!important;transform-origin:top right!important}}

/* Consolidated final detail v27 rules. */

/* Keep center title block on the opposite side of the edit button (right side in RTL). */
body.efc-specialties-redesign-v23 .center-card-v13 h3{
  margin:0 0 0 84px!important;
  padding:0 11px!important;
  direction:rtl!important;
  text-align:right!important;
  justify-content:flex-start!important;
  border:1px solid rgba(0,0,0,.48)!important;
}
/* Make the inner borders clearly visible without touching the large outer card/panel borders. */
body.efc-specialties-redesign-v23 .center-card-v13>div>span{
  border:1px solid rgba(0,0,0,.38)!important;
}
body.efc-specialties-redesign-v23 .spec-top h3{
  border:1px solid rgba(0,0,0,.48)!important;
}
body.efc-specialties-redesign-v23 .spec-facts>div:not(.efc-hidden-fact-v23){
  border:1px solid rgba(0,0,0,.38)!important;
}

`;
document.head.appendChild(style);

window.EFC_COURSES_CENTERS_REDESIGN_V23=Object.freeze({ready:true,brandLogoEnlarged:true,brandNameSplit:true,coursesCentersPage:true,existingAddEditActionsPreserved:true,viewAllWorks:true,responsiveForDesktopViewport:true,compactConsolidated:true,detailFixConsolidated:true,singleMainScrollOwner:true,fixedCanvas:true,slightlyLarger:true,anchoredToSidebar:true,rightAlignedTitle:true,tallerPanels:true,rightAlignedCardTitles:true,centerTitleStopsBeforeEdit:true,naturalCourseTitleTop:true,subtleInternalBorders:true,noStretch:true,fixedCardWidths:true,adaptiveCardHeights:true,longNamesWrapInsideCards:true,centerTitleOnRight:true,visibleInnerBorders:true,outerBordersUntouched:true,routerOwnsPageClass:true,canonicalSpecialtiesRenderer:true,singleSpecialtiesRenderOwner:true,noSpecialtiesWrapperChain:true,mainUntouched:true});
})();
