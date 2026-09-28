(async()=>{
'use strict';
if(window.EFC_PERIOD_SEARCH_REDESIGN_V28?.ready)return;
const waitUntil=async(check,timeout=15000)=>{const start=Date.now();while(!check()){if(Date.now()-start>timeout)throw new Error('Period search redesign v28 timed out.');await new Promise(resolve=>setTimeout(resolve,20));}};
await waitUntil(()=>window.EFC_STUDENT_UI_V13?.ready&&typeof window.EFC_RENDER_PERIOD_BASE_V13==='function');

const icon=body=>`<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><g fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${body}</g></svg>`;
const ICONS={
  search:icon('<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>'),
  filter:icon('<path d="M4 5h16l-6.2 7.1V19l-3.6-1.9v-5Z"/>'),
  center:icon('<path d="M6 20V8h12v12M9 8V5h6v3M4 20h16M9 12h2M13 12h2M9 16h2M13 16h2"/>'),
  course:icon('<rect x="5" y="4" width="14" height="16" rx="2"/><path d="M9 8h6M9 12h6M9 16h4"/>'),
  money:icon('<ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v5c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 11v5c0 1.7 3.1 3 7 3s7-1.3 7-3v-5"/>'),
  users:icon('<circle cx="9" cy="9" r="3"/><circle cx="16" cy="10" r="2.5"/><path d="M3.5 20c.7-4 2.7-6 5.5-6s4.8 2 5.5 6M14.5 15c2.8 0 4.7 1.7 5.3 5"/>'),
  clock:icon('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
  calendar:icon('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 9h18"/>'),
  list:icon('<path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"/>')
};

function syncPageClass(){
  const page=location.hash.replace('#','')||window.currentPage||'';
  document.body.classList.toggle('efc-period-redesign-v28',page==='period');
}
function wrapControl(control,kind){
  if(!control||control.parentElement?.classList.contains('efc-period-control-v28'))return;
  const wrap=document.createElement('div');wrap.className=`efc-period-control-v28 ${kind||''}`;
  const marker=document.createElement('span');marker.className='efc-period-control-icon-v28';
  marker.innerHTML=kind==='branch'?ICONS.center:kind==='course'?ICONS.course:kind==='state'?ICONS.money:ICONS.search;
  control.parentNode.insertBefore(wrap,control);wrap.appendChild(control);wrap.appendChild(marker);
}
function enhancePeriod(){
  syncPageClass();
  if(!document.body.classList.contains('efc-period-redesign-v28'))return;
  const content=document.querySelector('.content');
  const card=document.querySelector('.period-search-card-prod');
  const result=document.getElementById('periodResultV13');
  if(!content||!card||!result)return;

  content.querySelector('.page-title')?.remove();
  if(!content.querySelector('.efc-period-hero-v28')){
    const hero=document.createElement('section');hero.className='efc-period-hero-v28';
    hero.innerHTML=`${ICONS.search}<h1>آلية البحث</h1>`;
    content.prepend(hero);
  }
  if(!card.querySelector('.efc-period-card-title-v28')){
    const head=document.createElement('div');head.className='efc-period-card-title-v28';
    head.innerHTML=`${ICONS.filter}<span>خيارات البحث</span>`;
    card.prepend(head);
  }

  const search=document.getElementById('periodSearchV13');
  const branch=document.getElementById('periodBranchV13');
  const course=document.getElementById('periodSpecV13');
  const state=document.getElementById('periodStateV13');
  const toolbar=card.querySelector('.period-toolbar-prod');
  if(course?.options?.length&&course.options[0].value==='')course.options[0].textContent='كل الدورات';

  if(!card.querySelector('.efc-period-filter-row-v28')){
    const row=document.createElement('div');row.className='efc-period-filter-row-v28';
    card.querySelector('.efc-period-card-title-v28')?.after(row);
    [search,branch,course,state].forEach(node=>node&&row.appendChild(node));
    wrapControl(search,'search');wrapControl(branch,'branch');wrapControl(course,'course');wrapControl(state,'state');
  }
  if(toolbar)toolbar.classList.add('efc-period-toolbar-v28');
  card.classList.add('efc-period-card-v28');
  document.querySelector('.period-help-prod')?.classList.add('efc-period-help-hidden-v28');
  result.classList.add('efc-period-result-v28');
}

// Consolidated result-count behavior formerly loaded as v33.
const PERIOD_INPUT_IDS=new Set(['periodSearchV13','periodFromV13','periodToV13','periodEndingFromV13','periodEndingToV13','periodBranchV13','periodSpecV13','periodStateV13']);
const tabUnit={registrations:'طلاب',payments:'عمليات',debts:'طلاب',ending:'دورات'};
let syncTimer=0;

function currentPage(){return location.hash.replace('#','')||window.currentPage||'';}
function scheduleSync(){clearTimeout(syncTimer);syncTimer=setTimeout(syncPeriodCount,0);}
function syncPeriodCount(){
  if(currentPage()!=='period')return;
  const toolbar=document.querySelector('.period-toolbar-prod');
  const tabs=toolbar?.querySelector('.period-tabs-prod');
  const result=document.getElementById('periodResultV13');
  if(!toolbar||!tabs||!result)return;

  let badge=toolbar.querySelector('.efc-period-count-v33');
  const freshHead=result.querySelector('.period-result-head-prod');
  const sourceText=freshHead?.querySelector('b')?.textContent||badge?.dataset.count||'0';
  const match=String(sourceText).match(/\d+/);
  const count=match?Number(match[0]):0;
  freshHead?.remove();

  if(!badge){
    badge=document.createElement('div');
    badge.className='efc-period-count-v33';
    badge.setAttribute('aria-live','polite');
    tabs.insertAdjacentElement('afterend',badge);
  }
  const tab=tabs.querySelector('button.active')?.dataset.tab||'registrations';
  const unit=tabUnit[tab]||'نتائج';
  badge.dataset.count=String(count);
  badge.dataset.tab=tab;
  badge.innerHTML=`<b>${count}</b><span>${unit}</span>`;
}


document.addEventListener('input',event=>{if(currentPage()==='period'&&PERIOD_INPUT_IDS.has(event.target?.id))scheduleSync();});
document.addEventListener('change',event=>{if(currentPage()==='period'&&PERIOD_INPUT_IDS.has(event.target?.id))scheduleSync();});
document.addEventListener('click',event=>{
  if(currentPage()!=='period')return;
  if(event.target?.closest?.('.period-tabs-prod button,.sortable-head-prod'))scheduleSync();
});


window.renderPeriod=function(){
  const result=window.EFC_RENDER_PERIOD_BASE_V13();
  enhancePeriod();
  syncPeriodCount();
  return result;
};

const style=document.createElement('style');style.id='efc-period-search-redesign-style-v28';style.textContent=`
body.efc-period-redesign-v28{font-family:"Segoe UI Variable","Segoe UI",Tahoma,Arial,sans-serif!important;background:#f5fbf9!important;overflow:hidden!important}
body.efc-period-redesign-v28 .shell{min-width:0!important;background:radial-gradient(circle at 43% 24%,#fbfffe 0,#f4faf7 54%,#edf6f2 100%)!important;overflow-x:hidden!important}
body.efc-period-redesign-v28 .shell aside{width:clamp(230px,18vw,268px)!important;padding:22px 16px 18px!important;background:linear-gradient(180deg,#075445 0%,#05473d 48%,#033d35 100%)!important;box-shadow:-10px 0 35px rgba(5,55,47,.08)!important}
body.efc-period-redesign-v28 .shell main{margin-right:clamp(230px,18vw,268px)!important;width:calc(100% - clamp(230px,18vw,268px))!important;min-width:0!important;height:100vh!important;overflow:hidden!important}
body.efc-period-redesign-v28 .content{width:900px!important;max-width:900px!important;min-width:900px!important;margin:0 0 0 auto!important;padding:18px 0 12px!important;box-sizing:border-box!important;height:100vh!important;overflow:hidden!important}
body.efc-period-redesign-v28 .production-side-note{display:none!important}

.efc-period-hero-v28{width:325px;height:68px;margin:0 0 16px auto;border:1.4px solid #16816b;border-radius:14px;background:linear-gradient(110deg,#dff7ef 0%,#e9fbf6 68%,#e5f8ff 100%);display:flex;align-items:center;justify-content:center;gap:22px;color:#073f35;box-shadow:0 9px 24px rgba(17,89,70,.05)}
.efc-period-hero-v28 svg{width:40px;height:40px;flex:0 0 40px}.efc-period-hero-v28 h1{margin:0;font-size:30px;line-height:1;font-weight:850;white-space:nowrap}

body.efc-period-redesign-v28 .period-search-card-prod.efc-period-card-v28{display:block!important;width:900px!important;max-width:900px!important;min-width:900px!important;margin:0 0 14px!important;padding:12px 13px 14px!important;border:1.4px solid #4aa68c!important;border-radius:13px!important;background:linear-gradient(135deg,rgba(239,251,247,.96),rgba(251,255,253,.99))!important;box-shadow:0 10px 28px rgba(22,83,64,.045)!important}
.efc-period-card-title-v28{width:180px;height:42px;margin:0 0 10px auto;border:1px solid #62ad99;border-radius:10px;background:linear-gradient(135deg,#e8f9f3,#dff4ed);display:flex;align-items:center;justify-content:center;gap:10px;color:#124b40;font-size:16px;font-weight:800}
.efc-period-card-title-v28 svg{width:23px;height:23px}
.efc-period-filter-row-v28{display:grid;grid-template-columns:minmax(280px,1.65fr) repeat(3,minmax(150px,1fr));gap:9px;direction:rtl;align-items:center}
.efc-period-control-v28{position:relative;min-width:0}.efc-period-control-v28>input,.efc-period-control-v28>select{width:100%!important;height:43px!important;min-width:0!important;border:1px solid #d2ded9!important;border-radius:8px!important;background:#fff!important;color:#172622!important;font-size:11.5px!important;box-shadow:none!important;outline:none!important}
.efc-period-control-v28>input{padding:8px 13px 8px 38px!important}.efc-period-control-v28>select{padding:8px 38px 8px 12px!important;appearance:auto!important}
.efc-period-control-v28>input:focus,.efc-period-control-v28>select:focus{border-color:#1b8c70!important;box-shadow:0 0 0 3px rgba(27,140,112,.10)!important}
.efc-period-control-icon-v28{position:absolute;top:50%;transform:translateY(-50%);width:20px;height:20px;color:#0b5f4c;display:grid;place-items:center;pointer-events:none}
.efc-period-control-v28.search .efc-period-control-icon-v28{left:11px}.efc-period-control-v28.branch .efc-period-control-icon-v28,.efc-period-control-v28.course .efc-period-control-icon-v28,.efc-period-control-v28.state .efc-period-control-icon-v28{right:11px}.efc-period-control-icon-v28 svg{width:19px;height:19px}

body.efc-period-redesign-v28 .period-toolbar-prod.efc-period-toolbar-v28{margin-top:10px!important;padding-top:0!important;display:flex!important;align-items:flex-end!important;justify-content:space-between!important;gap:14px!important;direction:rtl!important}
body.efc-period-redesign-v28 .period-tabs-prod{display:flex!important;align-items:center!important;gap:6px!important;flex-wrap:nowrap!important}
body.efc-period-redesign-v28 .period-tabs-prod button{height:42px!important;padding:0 14px!important;border:1px solid #a8c8be!important;border-radius:8px!important;background:#fff!important;color:#1d4037!important;font-size:11px!important;font-weight:750!important;white-space:nowrap!important;cursor:pointer!important}
body.efc-period-redesign-v28 .period-tabs-prod button.active{background:linear-gradient(180deg,#0b755d,#08624f)!important;border-color:#08624f!important;color:#fff!important;box-shadow:0 5px 12px rgba(8,98,79,.14)!important}
body.efc-period-redesign-v28 .period-tabs-prod button[data-tab="payments"]{background:#fff4dc!important;border-color:#e8c672!important}
body.efc-period-redesign-v28 .period-tabs-prod button[data-tab="dues"],body.efc-period-redesign-v28 .period-tabs-prod button[data-tab="ending"]{background:#eaf5ff!important;border-color:#bcd6ec!important}
body.efc-period-redesign-v28 .period-tabs-prod button.active[data-tab="payments"],body.efc-period-redesign-v28 .period-tabs-prod button.active[data-tab="dues"],body.efc-period-redesign-v28 .period-tabs-prod button.active[data-tab="ending"]{background:linear-gradient(180deg,#0b755d,#08624f)!important;border-color:#08624f!important;color:#fff!important}
body.efc-period-redesign-v28 .period-dates-prod,body.efc-period-redesign-v28 .period-ending-dates-prod{display:flex!important;align-items:flex-end!important;gap:8px!important;margin-inline-start:auto!important;direction:rtl!important}body.efc-period-redesign-v28 .period-dates-prod[hidden],body.efc-period-redesign-v28 .period-ending-dates-prod[hidden]{display:none!important}
body.efc-period-redesign-v28 .period-dates-prod label,body.efc-period-redesign-v28 .period-ending-dates-prod label{min-width:150px!important;margin:0!important;gap:5px!important;font-size:9px!important;color:#5c6f68!important;font-weight:650!important}
body.efc-period-redesign-v28 .period-dates-prod .input,body.efc-period-redesign-v28 .period-ending-dates-prod .input{width:150px!important;min-width:150px!important;height:42px!important;border:1px solid #d2ded9!important;border-radius:8px!important;background:#fff!important;font-size:11px!important;padding:7px 10px!important}
.efc-period-help-hidden-v28{display:none!important}

body.efc-period-redesign-v28 .efc-period-result-v28{width:900px!important;max-width:900px!important;min-width:900px!important}
body.efc-period-redesign-v28 .period-result-head-prod{height:36px!important;margin:0 0 8px!important;display:flex!important;align-items:center!important;justify-content:flex-start!important;direction:ltr!important;color:#45665c!important}
body.efc-period-redesign-v28 .period-result-head-prod>b{direction:rtl!important;display:inline-flex!important;align-items:center!important;gap:7px!important;height:34px!important;padding:0 13px!important;border:1px solid #75a9d6!important;border-radius:10px!important;background:#e6f2ff!important;color:#174a71!important;font-size:12px!important;font-weight:800!important}
body.efc-period-redesign-v28 .period-result-head-prod>b::before{content:'☷';font-size:18px;line-height:1}.period-result-head-prod>span{display:none!important}
body.efc-period-redesign-v28 .efc-period-result-v28 .table-wrap{width:900px!important;max-width:900px!important;min-width:900px!important;height:calc(100vh - 392px)!important;max-height:calc(100vh - 392px)!important;min-height:160px!important;overflow:auto!important;overscroll-behavior:contain!important;scrollbar-gutter:auto!important;border:1px solid rgba(0,0,0,.62)!important;border-radius:10px!important;background:#fff!important;box-shadow:none!important}
body.efc-period-redesign-v28 .efc-period-result-v28 table{width:100%!important;min-width:100%!important;border-collapse:collapse!important;table-layout:auto!important;font-size:10px!important;color:#111!important;background:#fff!important}
body.efc-period-redesign-v28 .efc-period-result-v28 th{position:sticky!important;top:0!important;z-index:3!important;height:43px!important;padding:8px 9px!important;background:linear-gradient(180deg,#0a715b,#075846)!important;color:#fff!important;border:1px solid rgba(0,0,0,.65)!important;font-size:10.5px!important;font-weight:800!important;text-align:center!important;vertical-align:middle!important}
body.efc-period-redesign-v28 .efc-period-result-v28 td{height:39px!important;padding:8px 9px!important;border:1px solid rgba(0,0,0,.36)!important;text-align:center!important;vertical-align:middle!important;background:#fff!important;font-size:10px!important}
body.efc-period-redesign-v28 .efc-period-result-v28 tbody tr:nth-child(even) td{background:#fbfdfc!important}
body.efc-period-redesign-v28 .efc-period-result-v28 tbody tr:hover td{background:#f0f8f5!important}
body.efc-period-redesign-v28 .efc-period-result-v28 .badge{font-size:9px!important;padding:5px 10px!important;border-radius:14px!important;font-weight:800!important}
body.efc-period-redesign-v28 .sortable-head-prod:hover{background:#075846!important}.sort-arrow-prod{color:#d6fff2!important}

@media(max-width:1180px){
 body.efc-period-redesign-v28 .content{transform:scale(.92)!important;transform-origin:top right!important}
}
@media(max-width:1040px){
 body.efc-period-redesign-v28 .content{transform:scale(.82)!important;transform-origin:top right!important}
}

/* Consolidated period count/grid polish v33. */

/* Move the existing result count into the period toolbar, with a tab-aware unit. */
html body.efc-period-redesign-v28 .period-toolbar-prod.efc-period-toolbar-v28{
  justify-content:flex-start!important;
}
html body.efc-period-redesign-v28 .efc-period-count-v33{
  direction:rtl!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;
  gap:5px!important;height:34px!important;min-width:92px!important;padding:0 12px!important;
  margin-inline-start:16px!important;margin-inline-end:2px!important;
  border:1.2px solid #75a9d6!important;border-radius:10px!important;
  background:#e6f2ff!important;color:#174a71!important;box-sizing:border-box!important;
  font-size:11px!important;font-weight:750!important;white-space:nowrap!important;
}
html body.efc-period-redesign-v28 .efc-period-count-v33::before{
  content:'☷'!important;font-size:17px!important;line-height:1!important;font-weight:800!important;
}
html body.efc-period-redesign-v28 .efc-period-count-v33 b{font-size:12px!important;font-weight:900!important;line-height:1!important}
html body.efc-period-redesign-v28 .efc-period-count-v33 span{font-size:11px!important;font-weight:800!important;line-height:1!important}
html body.efc-period-redesign-v28 .period-dates-prod,html body.efc-period-redesign-v28 .period-ending-dates-prod{margin-inline-start:auto!important}
html body.efc-period-redesign-v28 .period-result-head-prod{display:none!important}

/* Slightly thicker, darker grid lines on both search tables. */
html body.efc-period-redesign-v28 .efc-period-result-v28 .table-wrap,
html body.efc-student-search-redesign-v31 #studentsTableV13 .table-wrap{
  border:1.35px solid rgba(0,0,0,.86)!important;
}
html body.efc-period-redesign-v28 .efc-period-result-v28 th,
html body.efc-student-search-redesign-v31 #studentsTableV13 th{
  border:1.25px solid rgba(0,0,0,.90)!important;
}
html body.efc-period-redesign-v28 .efc-period-result-v28 td,
html body.efc-student-search-redesign-v31 #studentsTableV13 td{
  border:1.2px solid rgba(0,0,0,.72)!important;
}

@media(max-width:1250px){
  html body.efc-period-redesign-v28 .efc-period-count-v33{margin-inline-start:10px!important}
}

/* Consolidated final search title/grid rules v34. */

/* Make the outer table border exactly the same visual weight as the inner grid on both search pages. */
html body.efc-period-redesign-v28 .efc-period-result-v28 .table-wrap,
html body.efc-student-search-redesign-v31 #studentsTableV13 .table-wrap{
  border:1.2px solid rgba(0,0,0,.78)!important;
}
html body.efc-period-redesign-v28 .efc-period-result-v28 th,
html body.efc-period-redesign-v28 .efc-period-result-v28 td,
html body.efc-student-search-redesign-v31 #studentsTableV13 th,
html body.efc-student-search-redesign-v31 #studentsTableV13 td{
  border-width:1.2px!important;
  border-style:solid!important;
}
html body.efc-period-redesign-v28 .efc-period-result-v28 th,
html body.efc-student-search-redesign-v31 #studentsTableV13 th{border-color:rgba(0,0,0,.82)!important}
html body.efc-period-redesign-v28 .efc-period-result-v28 td,
html body.efc-student-search-redesign-v31 #studentsTableV13 td{border-color:rgba(0,0,0,.78)!important}

/* Student Search title: only the page name plus the same short underline used by the redesigned pages. */
html body.efc-student-search-redesign-v31 .page-title{
  position:relative!important;
  height:76px!important;min-height:76px!important;max-height:76px!important;
  padding:0 22px!important;
}
html body.efc-student-search-redesign-v31 .page-title>div{
  height:100%!important;display:flex!important;align-items:center!important;justify-content:center!important;
}
html body.efc-student-search-redesign-v31 .page-title p,
html body.efc-student-search-redesign-v31 .page-title span{display:none!important}
html body.efc-student-search-redesign-v31 .page-title h1{
  margin:0!important;font-size:31px!important;line-height:1!important;font-weight:850!important;color:#073f35!important;
}
html body.efc-student-search-redesign-v31 .page-title::after{
  content:''!important;position:absolute!important;bottom:9px!important;left:50%!important;
  transform:translateX(-50%)!important;width:48px!important;height:3px!important;
  border-radius:6px!important;background:#0a7f62!important;
}

`;
document.head.appendChild(style);
window.EFC_PERIOD_SEARCH_REDESIGN_V28=Object.freeze({ready:true,preservesSearchLogic:true,preservesSortAndRowActions:true,fixedCanvas:true,sidebarAligned:true,referenceStyledNotReferenceSized:true,routerOwnsPageClass:true,countGridConsolidated:true,titleGridUnifyConsolidated:true,movedPeriodCountIntoToolbar:true,dynamicCountUnit:true,endingFutureRangeVisuals:true,endingFutureRangeCountSync:true,unifiedIdentitySearchControl:true,darkerThickerSearchGridLines:true,equalOuterInnerGridWeight:true,studentTitleOnly:true,studentTitleUnderline:true,synchronousPostRenderCount:true,noHashEnhancer:true,canonicalPeriodRenderer:true,singlePeriodRenderOwner:true,noPeriodWrapperChain:true,mainUntouched:true});
})();
