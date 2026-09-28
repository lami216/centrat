(async()=>{
'use strict';
if(window.EFC_STUDENT_SEARCH_REDESIGN_V31?.ready)return;
const waitUntil=async(check,timeout=15000)=>{const start=Date.now();while(!check()){if(Date.now()-start>timeout)throw new Error('Student search redesign v31 timed out.');await new Promise(resolve=>setTimeout(resolve,20));}};
await waitUntil(()=>window.EFC_SIDEBAR_LOCK_V30?.ready&&typeof window.EFC_RENDER_STUDENTS_BASE_V13==='function');

function syncPageClass(){
  const page=location.hash.replace('#','')||window.currentPage||'';
  document.body.classList.toggle('efc-student-search-redesign-v31',page==='students');
}
function enhanceStudentSearch(){
  syncPageClass();
  if(!document.body.classList.contains('efc-student-search-redesign-v31'))return;
  document.querySelector('.student-search-filters-v13')?.classList.add('efc-student-search-filters-v31');
  document.getElementById('studentsTableV13')?.classList.add('efc-student-search-results-v31');
}

// Consolidated student filter polish formerly loaded as v32.
const detailIcon=body=>`<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><g fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${body}</g></svg>`;
const ICONS={
  branch:detailIcon('<path d="M6 20V8h12v12M9 8V5h6v3M4 20h16M9 12h2M13 12h2M9 16h2M13 16h2"/>'),
  course:detailIcon('<rect x="5" y="4" width="14" height="16" rx="2"/><path d="M9 8h6M9 12h6M9 16h4"/>')
};

function wrapStudentSelect(control,kind){
  if(!control||control.parentElement?.classList.contains('efc-student-control-v32'))return;
  const wrap=document.createElement('div');
  wrap.className=`efc-student-control-v32 ${kind}`;
  const marker=document.createElement('span');
  marker.className='efc-student-control-icon-v32';
  marker.innerHTML=kind==='branch'?ICONS.branch:ICONS.course;
  control.parentNode.insertBefore(wrap,control);
  wrap.appendChild(control);
  wrap.appendChild(marker);
}
function enhanceStudentFilters(){
  if((location.hash.replace('#','')||window.currentPage)!=='students')return;
  wrapStudentSelect(document.getElementById('studentBranchV13'),'branch');
  wrapStudentSelect(document.getElementById('studentSpecV13'),'course');
}


window.renderStudents=function(){
  const result=window.EFC_RENDER_STUDENTS_BASE_V13();
  enhanceStudentSearch();
  enhanceStudentFilters();
  return result;
};

const style=document.createElement('style');
style.id='efc-student-search-redesign-style-v31';
style.textContent=`
/* Student search uses only visual rules shared with Period Search. No content, controls or behavior are added/removed. */
html body.efc-student-search-redesign-v31{font-family:"Segoe UI Variable","Segoe UI",Tahoma,Arial,sans-serif!important;background:#f5fbf9!important;overflow:hidden!important}
html body.efc-student-search-redesign-v31 .shell.shell-v13{background:radial-gradient(circle at 43% 24%,#fbfffe 0,#f4faf7 54%,#edf6f2 100%)!important}
html body.efc-student-search-redesign-v31 .shell.shell-v13 main>.content{
  width:900px!important;max-width:900px!important;min-width:900px!important;
  margin:0 0 0 auto!important;margin-right:22px!important;
  padding:18px 0 12px!important;box-sizing:border-box!important;height:100vh!important;overflow:hidden!important;
}

/* Same green hero/card language as Period Search, while retaining every original title line. */
html body.efc-student-search-redesign-v31 .page-title{
  width:470px!important;min-width:470px!important;max-width:470px!important;
  min-height:76px!important;margin:0 auto 18px!important;padding:10px 22px!important;
  border:0!important;border-radius:17px!important;
  background:linear-gradient(135deg,#e4f8f0,#d4efe5)!important;
  box-shadow:0 10px 30px rgba(20,102,76,.05)!important;color:#073f35!important;
  box-sizing:border-box!important;display:flex!important;align-items:center!important;justify-content:center!important;
}
html body.efc-student-search-redesign-v31 .page-title>div{width:100%!important;text-align:center!important;display:grid!important;gap:3px!important;justify-items:center!important}
html body.efc-student-search-redesign-v31 .page-title p{margin:0!important;font-size:9px!important;line-height:1.1!important;color:#4d7469!important;font-weight:750!important}
html body.efc-student-search-redesign-v31 .page-title h1{margin:0!important;font-size:29px!important;line-height:1!important;font-weight:850!important;color:#073f35!important;white-space:nowrap!important}
html body.efc-student-search-redesign-v31 .page-title span{margin:0!important;max-width:410px!important;font-size:9px!important;line-height:1.25!important;color:#607b73!important;text-align:center!important}
html body.efc-student-search-redesign-v31 .page-title>.button{display:none!important}

/* Existing search controls only: same field/card treatment as Period Search. */
html body.efc-student-search-redesign-v31 .student-search-filters-v13.efc-student-search-filters-v31{
  width:900px!important;max-width:900px!important;min-width:900px!important;
  margin:0 0 14px!important;padding:12px 13px 14px!important;
  display:grid!important;grid-template-columns:minmax(280px,1.65fr) repeat(2,minmax(180px,1fr))!important;
  gap:9px!important;align-items:center!important;direction:rtl!important;
  border:1.4px solid #4aa68c!important;border-radius:13px!important;
  background:linear-gradient(135deg,rgba(239,251,247,.96),rgba(251,255,253,.99))!important;
  box-shadow:0 10px 28px rgba(22,83,64,.045)!important;box-sizing:border-box!important;
}
html body.efc-student-search-redesign-v31 .student-search-filters-v13 input,
html body.efc-student-search-redesign-v31 .student-search-filters-v13 select{
  width:100%!important;height:43px!important;min-width:0!important;margin:0!important;
  border:1px solid #d2ded9!important;border-radius:8px!important;background:#fff!important;
  color:#172622!important;font-size:11.5px!important;box-shadow:none!important;outline:none!important;box-sizing:border-box!important;
}
html body.efc-student-search-redesign-v31 .student-search-filters-v13 input{padding:8px 13px!important}
html body.efc-student-search-redesign-v31 .student-search-filters-v13 select{padding:8px 12px!important}
html body.efc-student-search-redesign-v31 .student-search-filters-v13 input:focus,
html body.efc-student-search-redesign-v31 .student-search-filters-v13 select:focus{border-color:#1b8c70!important;box-shadow:0 0 0 3px rgba(27,140,112,.10)!important}

/* Existing results table only: same table treatment as Period Search. */
html body.efc-student-search-redesign-v31 #studentsTableV13.efc-student-search-results-v31{
  width:900px!important;max-width:900px!important;min-width:900px!important;
}
html body.efc-student-search-redesign-v31 #studentsTableV13 .table-wrap{
  width:900px!important;max-width:900px!important;min-width:900px!important;
  height:calc(100vh - 205px)!important;max-height:calc(100vh - 205px)!important;min-height:180px!important;overflow:auto!important;overscroll-behavior:contain!important;scrollbar-gutter:auto!important;border:1px solid rgba(0,0,0,.62)!important;border-radius:10px!important;
  background:#fff!important;box-shadow:none!important;
}
html body.efc-student-search-redesign-v31 #studentsTableV13 table{
  width:100%!important;min-width:100%!important;border-collapse:collapse!important;table-layout:auto!important;
  font-size:10px!important;color:#111!important;background:#fff!important;
}
html body.efc-student-search-redesign-v31 #studentsTableV13 th{
  position:sticky!important;top:0!important;z-index:3!important;
  height:43px!important;padding:8px 9px!important;background:linear-gradient(180deg,#0a715b,#075846)!important;
  color:#fff!important;border:1px solid rgba(0,0,0,.65)!important;font-size:10.5px!important;font-weight:800!important;
  text-align:center!important;vertical-align:middle!important;
}
html body.efc-student-search-redesign-v31 #studentsTableV13 td{
  height:39px!important;padding:8px 9px!important;border:1px solid rgba(0,0,0,.36)!important;
  text-align:center!important;vertical-align:middle!important;background:#fff!important;font-size:10px!important;
}
html body.efc-student-search-redesign-v31 #studentsTableV13 tbody tr:nth-child(even) td{background:#fbfdfc!important}
html body.efc-student-search-redesign-v31 #studentsTableV13 tbody tr:hover td{background:#f0f8f5!important}
html body.efc-student-search-redesign-v31 #studentsTableV13 .badge{font-size:9px!important;padding:5px 10px!important;border-radius:14px!important;font-weight:800!important}

@media(max-width:1180px){html body.efc-student-search-redesign-v31 .shell.shell-v13 main>.content{transform:scale(.92)!important;transform-origin:top right!important}}
@media(max-width:1040px){html body.efc-student-search-redesign-v31 .shell.shell-v13 main>.content{transform:scale(.82)!important;transform-origin:top right!important}}

/* Consolidated search detail polish v32. */

/* Decorative branch/course icons in Student Search, matching Period Search without changing controls. */
html body.efc-student-search-redesign-v31 .efc-student-control-v32{position:relative!important;min-width:0!important;width:100%!important}
html body.efc-student-search-redesign-v31 .efc-student-control-v32>select{width:100%!important;padding:8px 38px 8px 12px!important}
html body.efc-student-search-redesign-v31 .efc-student-control-icon-v32{
  position:absolute!important;right:11px!important;top:50%!important;transform:translateY(-50%)!important;
  width:20px!important;height:20px!important;display:grid!important;place-items:center!important;
  color:#0b5f4c!important;pointer-events:none!important;z-index:1!important;
}
html body.efc-student-search-redesign-v31 .efc-student-control-icon-v32 svg{width:19px!important;height:19px!important}

/* Stronger inner list/table lines on both search pages. */
html body.efc-period-redesign-v28 .efc-period-result-v28 .table-wrap,
html body.efc-student-search-redesign-v31 #studentsTableV13 .table-wrap{
  border-color:rgba(0,0,0,.78)!important;
}
html body.efc-period-redesign-v28 .efc-period-result-v28 th,
html body.efc-student-search-redesign-v31 #studentsTableV13 th{
  border-color:rgba(0,0,0,.80)!important;
}
html body.efc-period-redesign-v28 .efc-period-result-v28 td,
html body.efc-student-search-redesign-v31 #studentsTableV13 td{
  border-color:rgba(0,0,0,.58)!important;
  transition:background-color .12s ease!important;
}

/* Clearer row hover on both search pages. */
html body.efc-period-redesign-v28 .efc-period-result-v28 tbody tr:hover td,
html body.efc-student-search-redesign-v31 #studentsTableV13 tbody tr:hover td{
  background:#d7ebe4!important;
}

`;
document.head.appendChild(style);

window.EFC_STUDENT_SEARCH_REDESIGN_V31=Object.freeze({
  ready:true,periodVisualLanguage:true,preservedStudentSearchContent:true,preservedStudentSearchBehavior:true,
  noNewControls:true,noRemovedControls:true,routerOwnsPageClass:true,canonicalStudentSearchRenderer:true,singleStudentSearchRenderOwner:true,noStudentSearchWrapperChain:true,detailPolishConsolidated:true,studentBranchCourseIcons:true,unifiedIdentitySearchControl:true,darkerTableLines:true,strongerRowHover:true,noHashEnhancer:true,mainUntouched:true
});
})();
