import {readFileSync,existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';

const read=path=>readFileSync(path,'utf8');
const requireText=(text,needle,label=needle)=>{if(!text.includes(needle))throw new Error(`Registration/login v13 missing: ${label}`);};
const forbidText=(text,needle,label=needle)=>{if(text.includes(needle))throw new Error(`Registration/login v13 regression: ${label}`);};

for(const path of ['assets/production-registration-schedule-v13.js','assets/production-auth-bootstrap-v13.js']){
  if(!existsSync(path))throw new Error(`Missing runtime module: ${path}`);
  execFileSync(process.execPath,['--check',path],{stdio:'inherit'});
}
const registration=read('assets/production-registration-schedule-v13.js');
const login=read('assets/production-auth-bootstrap-v13.js');
const receipts=read('assets/production-receipts-v13.js');
const gate=read('assets/production-license-gate-v8.js');
const build=read('scripts/build-production.mjs');

for(const [token,label] of [
  ['baseRegistrationRenderer:true','explicit registration base renderer'],
  ['finalRegistrationRendererOwnedByMatrix:true','final registration ownership delegated to matrix'],
  ['registration-schedule-layout-v13','side-by-side registration and schedule layout'],
  ['schedule-table-v13','weekly schedule table'],
  ['schedule-hour-select-v13','hour-only schedule selector'],
  ['hourOnlyScheduleTime:true','hour-only timetable marker'],
  ['fixedMinuteZero:true','fixed 00-minute timetable marker'],
  ['extraEveningHours:true','additional evening timetable marker'],
  ['sundayHiddenFromRegistrationView:true','Sunday is hidden from the registration timetable view'],
  ['sevenDayScheduleDataPreserved:true','seven-day schedule data remains preserved for compatibility'],
  ['data-schedule-day-column="${day.key}"','day columns carry stable data keys'],
  ['[data-schedule-day-column="sunday"]{display:none!important}','Sunday column is removed from layout without deleting its controls'],
  ['const ALLOWED_HOURS=[8,10,12,14,16,17,18,19,20];','17:00 and 19:00 timetable choices'],
  ["{key:'sunday',ar:'الأحد',fr:'Dimanche'}",'Sunday remains in the stored schedule schema'],
  ['singleScheduleBottomNote:true','single lower timetable note marker'],
  ['value=`${hh}:00`','hour choices stored as HH:00'],
  ['data-day-check','day selection boxes'],
  ['scheduleStoredWithStudent:true','schedule persisted with student'],
  ['schedule=readSchedule(scheduleRoot,item)','schedule captured from registration table'],
  ['debtDueDates:{},schedule,snapshot:{','student schedule stored on new student'],
  ['compactTimetable:true','compact timetable visual marker'],
  ['noHorizontalTimetableOverflow:true','timetable must fit without forced horizontal width'],
  ['twoColumnRegistration:true','two-column compact registration form'],
  ['grid-template-columns:repeat(2,minmax(0,1fr))','paired registration fields'],
  ['wholeInputDateTimePicker:true','whole-field native date/time compatibility marker'],
  ['input.showPicker?.()','native date/time picker support remains available'],
  ['::-webkit-calendar-picker-indicator','native picker icon compatibility styles remain available'],
  ['courseTerminology:true','course terminology marker'],
  ['nativeCourseTerminology:true','course terminology lives in canonical source strings'],
  ['noCourseTermShellWrapper:true','course terminology does not wrap the global shell'],
  ['noDelayedModalTerminologyPatch:true','modals do not get terminology patched after display'],
  ['<th class="schedule-course-head-v13">الدورة</th>','schedule course header'],
  ['expandedTimetable:true','expanded timetable marker'],
  ['grid-template-columns:minmax(0,470px) minmax(0,1fr)','timetable consumes remaining page width'],
  ['max-width:none;width:100%','schedule card is not artificially capped'],
  ['financialSummaryOnly:true','financial summary visibility marker'],
  ['summary.hidden=!visible','financial summary hidden before pricing'],
  ['id="regSummaryV13" hidden','financial summary starts hidden'],
  ['centersManagedInUi:true','center management UI marker'],
  ['enhanceSpecialties:enhanceSpecialtiesWithCenters','center controls exposed as a page enhancer'],
  ['noSpecialtiesWrapper:true','registration schedule does not wrap the specialties renderer'],
  ['centersPersisted:true','center persistence marker'],
  ['coursesAndCenters:true','courses and centers page marker'],
  ["const CENTER_KEY='efc-branches-v13'",'persistent center storage key'],
  ['إضافة مركز','add center action'],
  ['الدورات و المراكز','courses and centers page name'],
  ['state.branches=branches.map','centers included in persisted app state'],
  ['if(Array.isArray(incoming?.branches))applyCenters(incoming.branches)','centers restored from backups'],
  ['noSideSummary:true','redundant side summary removed'],
  ['ملاحظة: لا يسمح تأخر طالب عن 20 دقيقة.','20 minute lateness note'],
  ['ملاحظة 1: لا يمكن استرجاع المبلغ المدفوع للمركز في أي حال من الأحوال.','refund note']
])requireText(registration,token,label);
forbidText(registration,'side-summary','old side summary card');
forbidText(registration,'const baseShell=window.shell','registration must not wrap shell for terminology translation');
forbidText(registration,'function courseTerms(value)','runtime terminology translator must be removed');
forbidText(registration,"document.addEventListener('click',()=>setTimeout(()=>document.querySelectorAll('.modal')",'modal terminology must not be patched after it is visible');
forbidText(registration,'const baseRenderSpecialties=window.renderSpecialties','registration schedule must not wrap specialties renderer');
forbidText(registration,'min-width:720px','oversized forced timetable width');
forbidText(registration,'schedule-course-head-v13">التخصص / الدورة','mixed specialty/course schedule heading');
forbidText(registration,'width:102px;min-width:102px','oversized schedule course column');
forbidText(registration,'grid-template-columns:1fr;gap:8px','single-column registration fields');
forbidText(registration,'ملاحظة 2: لا يمكن تسليم بطاقة تعريف الأصلية حتى تسديد المبلغ كلياً.','removed second registration timetable notice');

for(const [token,label] of [
  ["'*'.repeat",'visible PIN star mask'],
  ['canonicalLoginRenderer:true','canonical login renderer marker'],
  ['loginBeforeAppRuntime:true','login runs before heavy application runtime'],
  ['noLegacyLoginRenderer:true','legacy login renderer removed'],
  ['noLoginMutationObserver:true','login does not rely on a post-render observer'],
  ['efc-login-card-redesign-v15','final login card marker'],
  ['width:min(632px,100%)','final login card width'],
  ['function renderMainLogin(overlay)','final login is rendered directly']
])requireText(login,token,label);
forbidText(login,'transform:scale(.5)','half-size legacy login scaling');
forbidText(login,'new MutationObserver(','login post-render observer');
forbidText(login,'background-image','login photo background');

for(const [token,label] of [
  ['studentSchedule12','schedule printed on registration receipt'],
  ['studentScheduleOnRegistrationReceipt:true','receipt schedule marker'],
  ['debtDueDateOnReceipt:true','debt due date receipt marker'],
  ['موعد سداد المبلغ المتبقي','debt due date note'],
  ['schedule:student.schedule||null','receipt model schedule data'],
  ['debtDueDate','receipt model debt date']
])requireText(receipts,token,label);

const order=['production-auth-bootstrap-v13.js','production-student-ui-v13.js','production-registration-schedule-v13.js','production-finance-ui-v13.js','production-security-ui-v13.js'];
let last=-1;for(const token of order){const pos=gate.indexOf(token);if(pos<0)throw new Error(`Gate missing ${token}`);if(pos<last)throw new Error(`Gate order wrong at ${token}`);last=pos;}
for(const token of ['assets/production-registration-schedule-v13.js','assets/production-auth-bootstrap-v13.js'])requireText(build,token,`production build includes ${token}`);

console.log('Registration schedule and canonical login verified: paired registration fields, hour-only HH:00 timetable, course terminology, managed centers, finance-only summary, native date/time compatibility, receipt schedule/debt note, redesigned login card and star-masked PIN.');
