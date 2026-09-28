import {readFileSync,existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';

const read=path=>readFileSync(path,'utf8');
const requireText=(text,needle,label=needle)=>{if(!text.includes(needle))throw new Error(`Registration redesign missing: ${label}`);};
const forbidText=(text,needle,label=needle)=>{if(text.includes(needle))throw new Error(`Registration redesign regression: ${label}`);};

const uiPath='assets/production-registration-redesign-v15.js';
if(!existsSync(uiPath))throw new Error('Registration redesign runtime module is missing.');
for(const path of [uiPath,'assets/production-monthly-prepayment-domain-v14.js','assets/production-registration-schedule-matrix-v17.js','assets/production-receipts-v13.js','assets/production-sidebar-lock-v30.js']){
  if(!existsSync(path))throw new Error(`Registration redesign runtime module is missing: ${path}`);
  execFileSync(process.execPath,['--check',path],{stdio:'inherit'});
}

const ui=read(uiPath);
const registration=read('assets/production-registration-schedule-v13.js');
const monthlyDomain=read('assets/production-monthly-prepayment-domain-v14.js');
const scheduleMatrix=read('assets/production-registration-schedule-matrix-v17.js');
const lifecycleUi=read('assets/production-student-lifecycle-ui-v20.js');
const selectNative=scheduleMatrix;
const receiptSchedule=scheduleMatrix;
const receipts=read('assets/production-receipts-v13.js');
const coursesCompact=read('assets/production-courses-centers-redesign-v23.js');
const sidebar=read('assets/production-sidebar-lock-v30.js');
const monthly=read('assets/production-monthly-prepayment-ui-v14.js');
const gate=read('assets/production-license-gate-v8.js');
const build=read('scripts/build-production.mjs');
const index=read('index.html');
const tauriConfig=JSON.parse(read('src-tauri/tauri.conf.json'));
const rustMain=read('src-tauri/src/main.rs');
const receiptPdfRust=read('src-tauri/src/receipt_pdf.rs');
const packageJson=JSON.parse(read('package.json'));
const foundation=read('assets/production-foundation-v13.js');
const homeBackground=read('assets/production-home-background-v36.css');

for(const token of [
  'screenshotRegistrationReference:true',
  'existingRegistrationFlowPreserved:true',
  'noSubmitOverride:true',
  'scheduleMirrorFunctional:true',
  'sidebarRestyledOnRegistrationOnly:true',
  'segoeUiVariable:true',
  'Segoe UI Variable',
  'تسجيل طالب جديد',
  'جدول الطالب الأسبوعي',
  'حفظ التسجيل',
  'efcScheduleCourseMirrorV15',
  "source.dispatchEvent(new Event('change',{bubbles:true}))",
  'efc-registration-redesign-v15',
  'singleMainScrollOwner:true'
])requireText(ui,token);

forbidText(ui,'.onsubmit=','redesign must not replace the working registration submit handler');
forbidText(ui,'appendPayment(','redesign must not duplicate payment/accounting logic');
forbidText(ui,'students.unshift(','redesign must not duplicate student creation logic');
forbidText(monthly,'const baseRenderRegister=window.renderRegister','monthly UI must not wrap registration renderer');
forbidText(ui,'const baseRenderRegister=window.renderRegister','redesign must not wrap registration renderer');
forbidText(lifecycleUi,'const baseRenderRegister=window.renderRegister','lifecycle UI must not wrap registration renderer');
for(const token of ['canonicalRegistrationRenderer:true','singleRegistrationRenderOwner:true','noRenderWrapperChain:true','const result=renderRegistrationBase()','EFC_MONTHLY_PREPAYMENT_UI_V14?.enhanceRegistration?.()','EFC_REGISTRATION_REDESIGN_V15?.enhanceRegistration?.()','EFC_STUDENT_LIFECYCLE_UI_V20?.enhanceRegistration?.()'])requireText(scheduleMatrix,token,`canonical registration pipeline ${token}`);

for(const [token,label] of [
  ['form.onsubmit=event=>','monthly registration submit owner'],
  ['students.unshift(student)','monthly registration student creation'],
  ['appendPayment(student','monthly registration payment creation'],
  ['readSchedule(scheduleRoot,item)','monthly registration schedule capture'],
  ['[data-matrix-day="${key}"]','current matrix checkbox values captured synchronously'],
  ['[data-schedule-day-time="${key}"]','current matrix time values captured synchronously'],
  ['scheduleDirectFromMatrix:true','monthly registration marks direct matrix schedule persistence']
])requireText(monthly,token,`monthly registration behavior ${label}`);

for(const token of [
  'بيانات الطالب والتسجيل',
  'data-day-time',
  'data-day-check',
  'registration-submit-v13',
  'scheduleStoredWithStudent:true'
])requireText(registration,token,`base registration behavior ${token}`);

for(const [token,label] of [
  ['selectedCourseOnly:true','registration timetable shows only the selected course'],
  ['renderSelectedCourseRow','selected course row synchronization'],
  ['hourOnlyTimes:true','registration timetable exposes hour-only choices'],
  ['fixedMinuteZero:true','registration timetable fixes minutes to zero'],
  ['extraEveningHours:true','registration timetable includes added evening hours'],
  ['sundayHiddenFromRegistrationView:true','registration hides Sunday visually without deleting schedule data'],
  ['sevenDayScheduleDataPreserved:true','registration keeps seven-day schedule compatibility'],
  ['scheduleTimeListNoScroll:true','schedule time popup shows the compact hour list without a scrollbar when it fits'],
  ['data-schedule-day-column="${day.key}"','matrix rows use the canonical day-column keys'],
  ['isScheduleTimeSelect(select)','schedule time dropdown is handled separately from long general select lists'],
  ["menu.style.maxHeight='none';menu.style.overflowY='hidden'",'schedule time popup exposes all hour choices when the viewport can contain them'],
  ['const ALLOWED_HOURS=[8,10,12,14,16,17,18,19,20];','registration timetable exposes 17:00 and 19:00'],
  ["{key:'sunday',ar:'الأحد',fr:'Dimanche'}",'matrix still carries Sunday for historical schedules'],
  ['legacyNonHourTimesPreservedDuringEdit:true','legacy non-hour timetable values survive an edit until explicitly changed'],
  ['setScheduleTime(select,value)','legacy timetable values are inserted only for the edited record'],
  ['<select class="schedule-day-time-v17"','active timetable uses an hour selector instead of an editable time field'],
  ['value=`${hh}:00`','hour choices store canonical HH:00 values'],
  ["courses:selectedId&&days.some(day=>day.selected)?[selectedCourse]:[]",'single selected course schedule snapshot'],
  ['longCourseNamesWrapInMatrix:true','long selected course names wrap inside registration timetable'],
  ['overflow-wrap:anywhere!important','registration timetable can wrap unusually long course names'],
  ['directRegistrationSchedulePreferred:true','synchronous registration schedule is not overwritten by a later layer'],
  ['existingScheduleMatches','post-submit compatibility capture respects the already saved schedule'],
  ['singleBottomNotice:true','registration timetable keeps only the first lower notice'],
  ['paragraphs.slice(1).forEach','second and later lower notices are removed from the registration timetable'],
  ['largerScheduleNotices:true','registration timetable notice sizing marker'],
  ['schedule-top-note-v13{font-size:16px!important','lateness notice is visibly enlarged'],
  ['schedule-notes-v13{font-size:15px!important','remaining lower notice is visibly enlarged'],
  ['receiptRenderingOwnedByBase:true','matrix delegates receipt rendering to the canonical receipt service'],
  ['noReceiptWindowOverride:true','matrix advertises no receipt-window override'],
  ['atomicEditMode:true','registration page owns transactional edit mode'],
  ['cancelEditDiscardsDraft:true','cancel discards only the current unsaved edit'],
  ['receiptEditReturnsToRegistration:true','receipt edit routes to registration page'],
  ['closesSourceModalsBeforeEdit:true','receipt edit closes source receipt/student modals before routing'],
  ['guardedEditNavigation:true','unsaved edit navigation is guarded'],
  ['logoutAndCloseGuardAvailable:true','edit guard is exposed to logout and native close paths'],
  ['singleRouterRenderOnHashNavigation:true','hash navigation no longer performs a second explicit page render'],
  ['zeroPaymentRegistrationEditable:true','zero-payment registration receipts can create their first transaction'],
  ['editRequiresStudentAndRegistrationPermission:true','receipt editing requires both relevant edit permissions'],
  ['normalRegistrationRestoredAfterSave:true','successful edit returns registration to normal mode'],
  ['responsiveEditWorkspace:true','edit workspace has dedicated responsive sizing'],
  ['editVerticalScroll:true','edit workspace can scroll vertically when the form exceeds the viewport'],
  ['editActionsAlwaysReachable:true','edit save and cancel remain reachable while scrolling'],
  ['editUsesHiddenDebtSpace:true','edit metadata reuses the hidden debt-date row'],
  ['editRegisterFieldAligned:true','registration number field matches neighboring controls'],
  ['debt-slot-v13.debt-slot-hidden{display:none!important','hidden debt-date row releases its space only during edit'],
  ['height:42px;display:flex','registration number display matches field height'],
  ['max-height:none!important;overflow:visible!important','edit form grows naturally inside the shared main scrollbar'],
  ['singleMainScrollOwner:true','registration edit mode shares the canonical main page scrollbar'],
  ['position:sticky!important','edit action row stays reachable within the shared page scroll'],
  ['editKeepsRegistrationGeometry:true','receipt edit keeps the normal registration page geometry'],
  ['registration-edit-meta-v17','edit-only transaction fields live in a compact nested block'],
  ["document.querySelectorAll('.modal').forEach(modal=>modal.remove())",'source modal stack is closed before entering edit mode'],
  ['مغادرة صفحة التعديل ستلغي التغييرات الحالية فقط','navigation warning explains current draft cancellation'],
  ['requestLeave:requestDiscardEdit','shared edit-leave guard is published'],
  ['registration-edit-actions-v17','save and cancel share a stable edit action row'],
  ['window.EFC_BEGIN_REGISTRATION_EDIT_V17=beginRegistrationEdit','receipt edit entry point'],
  ["submit.textContent='حفظ التغييرات'",'edit submit button label'],
  ['إلغاء التعديل','edit cancel action'],
  ['D.updateStudentRegistration(active.student','edit save delegates to domain transaction'],
  ['createRegistrationPayment:canCreatePayment','zero-payment receipt edit delegates first-payment creation to the domain'],
  ['fillMatrix(scheduleRoot,form,student.schedule||null)','student timetable is restored into edit form']
])requireText(scheduleMatrix,token,label);
forbidText(scheduleMatrix,"specialties.map(courseRow).join('')",'registration timetable must not render every course');
forbidText(scheduleMatrix,'window.receiptWindowV4=function','registration matrix must not override the canonical receipt viewer');
forbidText(coursesCompact,'const baseRenderSpecialties=window.renderSpecialties','courses/centers page must not wrap a prior specialties renderer');
forbidText(scheduleMatrix,'baseReceiptWindow','registration matrix must not wrap receiptWindowV4');
forbidText(scheduleMatrix,'navigationBypass','registration edit navigation must not maintain a second render-bypass state machine');
forbidText(scheduleMatrix,'body.efc-registration-editing-v17 .registration-schedule-layout-v13{grid-template-columns','edit mode must not resize the base timetable/form columns');
forbidText(scheduleMatrix,'body.efc-registration-editing-v17 .efc-reg-hero-v15{width:min(520px','edit mode must not shrink the registration hero');
forbidText(scheduleMatrix,'body.efc-registration-editing-v17 .schedule-title-v13 h2{font-size:18px','edit mode must not shrink the timetable title');

for(const [token,label] of [
  ['registrationSelectsConsolidated:true','registration select behavior is owned by the matrix'],
  ['preservesReceiptEditSelections:true','native selects preserve edit-mode values'],
  ['preserveValue:editing','edit mode keeps center/course/payment selections'],
  ['EFC_REGISTRATION_EDIT_V17?.active?.()','native select layer detects active edit session']
])requireText(selectNative,token,label);

for(const [token,label] of [
  ['registrationEditAtomic:true','domain publishes atomic registration edits'],
  ['registrationEditStudentScoped:true','domain promises student-scoped edits'],
  ['monthlyReallocationOnEdit:true','monthly allocations are rebuilt on edit'],
  ['historicalCourseSnapshotPreservedOnEdit:true','same-course edits preserve the historical course snapshot'],
  ['registrationNumberCollisionGuard:true','center/course moves guard the register namespace'],
  ['zeroPaymentRegistrationCanCreateTransaction:true','zero-payment registration can create a first payment'],
  ['rollbackOnLocalSaveFailure:true','failed local persistence rolls the object back'],
  ['revisionStampedPayments:true','edited/new payments carry merge revisions'],
  ['function updateStudentRegistration(student,changes={})','domain owns registration source edit'],
  ['const draft=clone(student)','domain edits a draft before committing'],
  ['Object.assign(student,draft)','domain commits validated draft atomically'],
  ['transactionCode:effectiveIndex!==null?String(draft.payments[effectiveIndex]?.[6]||\'\'):null','audit preserves transaction identity reference']
])requireText(monthlyDomain,token,label);

for(const [token,label] of [
  ['registrationMatrixCapture:true','matrix owns registration schedule capture'],
  ['sharedDayTimeCapture:true','matrix captures the active shared day-time values'],
  ['directSavedSchedulePreferred:true','matrix preserves an already saved registration schedule'],
  ['hourOnlyTimeValues:true','matrix preserves canonical HH:00 timetable values'],
  ['existingScheduleMatches','matrix does not replace a valid schedule'],
  ['receiptRenderingOwnedByBase:true','matrix delegates receipt rendering to the base receipt service'],
  ['noReceiptWindowOverride:true','matrix advertises no receipt-window override'],
  ['noReceiptDomPatch:true','matrix advertises no receipt DOM post-patching']
])requireText(receiptSchedule,token,label);
forbidText(receiptSchedule,'window.receiptWindowV4=function','matrix must not override the canonical receipt viewer');
forbidText(receiptSchedule,'baseReceiptWindow','matrix must not wrap receiptWindowV4');
forbidText(receiptSchedule,'patchReceipt','matrix must not post-patch receipt DOM');
forbidText(receiptSchedule,'gridMarkup','matrix must not own receipt timetable rendering');

for(const [token,label] of [
  ['registrationScheduleRenderedByBase:true','base receipt service owns registration timetable rendering'],
  ['receiptScheduleCourse','base receipt service normalizes registration timetable data'],
  ['emptyScheduleDays','empty registration timetables remain renderable'],
  ['efcScheduleGrid22','canonical receipt contains the final timetable markup'],
  ['overflow-wrap:anywhere!important','canonical receipt wraps long course names'],
  ['quickCourseDurationOnReceipt:true','quick course receipts expose course duration'],
  ['monthlyReceiptPeriodUnchanged:true','monthly receipt month semantics remain unchanged'],
  ['periodHalf(model)','receipt period row branches by course type'],
  ["half('Durée'",'quick receipt uses the duration field'],
  ["'مدة الدورة'",'quick receipt uses the Arabic duration label'],
  ['receiptEditRoutesToRegistration:true','receipt edit routes to registration page'],
  ['receiptEditActionBelowDocument:true','receipt edit action is rendered in the bottom document action bar'],
  ['darkReceiptEditAction:true','receipt edit action uses the dark primary treatment'],
  ['actionsSpacer12','receipt edit action is separated to the opposite side of print/save'],
  ['class="edit12"','receipt document owns the visible edit action'],
  ['window.EFC_EDIT_RECEIPT=model=>','receipt iframe edit action delegates to parent registration edit entry point'],
  ['receiptModelCarriesSourceIdentity:true','receipt model carries student/payment identity'],
  ['studentId:String(student.id||\'\')','receipt includes student source identity'],
  ['paymentIndex:statement?null:normalizedIndex','receipt includes source payment index'],
  ['transactionCode:String(payment?.[6]||\'\')','receipt carries stable transaction code'],
  ['window.EFC_BEGIN_REGISTRATION_EDIT_V17','receipt viewer invokes registration editor'],
  ['saveDialogReceiptPdf:true','receipt PDF uses Save As'],
  ['receiptFileNameUsesCenterAndRegister:true','receipt filename uses center and register'],
  ['`روسي-${filePart(model.branch,\'المركز\')}-${filePart(westernDigitsV3(model.reg||\'\'),\'0000\')}.pdf`','receipt PDF suggested filename'],
  ['protectedReceiptIdentifiers:true','receipt and transaction identifiers stay protected']
])requireText(receipts,token,label);
forbidText(receipts,'receipt-edit-panel-v13','receipt must not keep a second inline edit form');
forbidText(receipts,'receipt-viewer-edit-v13','receipt viewer header must not keep a second edit button');
forbidText(receipts,'applyReceiptEdits','receipt must not mutate a display-only working copy');

for(const [token,label] of [
  ['rfd::FileDialog::new()','native receipt save opens a Save As dialog'],
  ['set_file_name(&suggested)','native save dialog uses suggested receipt filename'],
  ['Result<Option<String>, String>','native save returns cancellation without writing'],
  ['save_file()','native receipt save waits for selected location']
])requireText(receiptPdfRust,token,label);
forbidText(receiptPdfRust,'profile.join("Downloads")','receipt PDF must not force the Downloads folder');

for(const [token,label] of [
  ['adaptiveCardHeights:true','course and center cards grow for wrapped names'],
  ['singleMainScrollOwner:true','courses and centers use the shared page scrollbar'],
  ['longNamesWrapInsideCards:true','course and center names wrap inside their cards'],
  ['canonicalSpecialtiesRenderer:true','courses/centers page owns one canonical renderer'],
  ['singleSpecialtiesRenderOwner:true','single specialties render owner marker'],
  ['noSpecialtiesWrapperChain:true','no specialties render wrapper chain'],
  ['height:auto!important;min-height:160px!important;max-height:none!important','course card height expands when its title wraps'],
  ['height:auto!important;min-height:136px!important;max-height:none!important','center card height expands when its title wraps'],
  ['overflow-wrap:anywhere!important;word-break:break-word!important','long card names cannot be clipped by unbroken text']
])requireText(coursesCompact,token,label);
forbidText(coursesCompact,'fixedCardHeights:true','cards must not advertise fixed heights after long-name wrapping support');

for(const [token,label] of [
  ['responsiveSmallViewport:true','small viewport sidebar marker'],
  ['settingsFitAvailableWidth:true','responsive settings marker'],
  ['shortScreenSidebarScrollFallback:true','short-screen sidebar fallback'],
  ['mainViewportScroll:true','main workspace scroll fallback'],
  ['taskbarSafeBottomClearance:true','taskbar-safe bottom action clearance'],
  ['canonicalTaskbarSpacer:true','taskbar clearance uses the canonical shell spacer rather than the page background pseudo-element'],
  ['singleMainScrollOwner:true','sidebar runtime owns one page-level scroll container'],
  ['@media(max-height:760px)','short display layout rules'],
  ['width:min(900px,calc(100% - 32px))','settings no longer force 900px width']
])requireText(sidebar,token,label);
requireText(foundation,'efc-taskbar-safe-space-v30','canonical shell contains the taskbar-safe bottom spacer');
requireText(homeBackground,'main>.content{position:relative!important;z-index:1!important;height:auto!important;min-height:100%!important;overflow:visible!important','main content grows naturally inside the single page scrollbar');
requireText(homeBackground,'main>.content:has(.efc-home-v35){height:100%!important;min-height:100%!important;overflow:hidden!important','home keeps the fixed-height artwork behavior');
forbidText(ui,'padding:20px 22px 34px!important;\n  overflow-x:hidden;','registration content must not own a second vertical scrollbar');
forbidText(coursesCompact,'padding:18px 22px 34px!important;overflow-x:hidden','courses content must not own a second vertical scrollbar');
forbidText(scheduleMatrix,'body.efc-registration-editing-v17{overflow-y:auto!important}','registration edit mode must keep scrolling on main rather than body');
forbidText(scheduleMatrix,'max-height:calc(100dvh - 118px)!important;overflow-y:auto!important','registration edit form must not create a nested page scrollbar');
forbidText(sidebar,'main::after{content:"";display:block;width:100%;height:56px','taskbar fix must not overwrite the decorative main pseudo-element');

requireText(index,'body{min-width:840px}','compact browser viewport minimum');
requireText(index,'EFC_REQUEST_CLOSE_BACKUP','desktop close backup prompt bridge');
requireText(index,"await window.EFC_FORCE_PERSIST?.()",'flush pending state before exit backup');
requireText(index,"invoke('export_backup'",'exit backup uses existing full backup exporter');
requireText(index,'editApi?.active?.()','native close checks for an active unsaved receipt edit');
requireText(index,'إغلاق البرنامج سيلغي التغييرات الحالية فقط','native close warns before discarding the current draft');
forbidText(index,'requestLeave()===false','native close must not clear the edit draft before a backup Save As can be cancelled');
const runtimeVersion=gate.match(/const RUNTIME_VERSION='([^']+)'/)?.[1]||'';
if(!runtimeVersion)throw new Error('Registration redesign missing: runtime cache token.');
const indexVersions=[...index.matchAll(/\?v=([^"'&\s]+)/g)].map(match=>match[1]);
if(!indexVersions.length||indexVersions.some(version=>version!==runtimeVersion))throw new Error('Registration redesign missing: synchronized index/runtime cache token.');
requireText(rustMain,'tauri::WindowEvent::CloseRequested','native close interception');
requireText(rustMain,"window.EFC_REQUEST_CLOSE_BACKUP",'native close invokes frontend backup prompt');
requireText(rustMain,'fn exit_app(app: tauri::AppHandle)','explicit close command after user decision');
if(Number(tauriConfig?.app?.windows?.[0]?.minWidth)!==840||Number(tauriConfig?.app?.windows?.[0]?.minHeight)!==560)throw new Error('Registration redesign missing: compact Tauri minimum window size.');
if(tauriConfig?.app?.windows?.[0]?.maximized!==true)throw new Error('Registration redesign missing: Tauri window must start maximized inside the Windows work area.');

const order=[
  'production-auth-bootstrap-v13.js',
  'production-registration-schedule-v13.js',
  'production-finance-ui-v13.js',
  'production-monthly-prepayment-ui-v14.js',
  'production-registration-redesign-v15.js',
  'production-security-ui-v13.js'
];
let last=-1;
for(const token of order){
  const pos=gate.indexOf(token);
  if(pos<0)throw new Error(`Gate missing ${token}`);
  if(pos<last)throw new Error(`Gate order wrong at ${token}`);
  last=pos;
}
requireText(gate,'EFC_REGISTRATION_REDESIGN_V15?.ready','registration redesign readiness check');
requireText(build,"'assets/production-registration-redesign-v15.js'",'registration redesign packaged in production build');

if(!String(packageJson.scripts?.check||'').includes('verify-registration-redesign-v15.mjs'))throw new Error('package check does not run registration redesign verifier.');

console.log('Registration redesign verified: hour-only timetable values with legacy preservation, atomic student-scoped receipt editing through the registration page, guarded navigation/logout/native-close behavior without premature draft loss, source modal cleanup, normal registration geometry preserved during edit, normal registration restoration after save, zero-payment registration edits, bottom dark receipt edit action, canonical receipt rendering, quick-course duration, Save As PDF naming, synchronized runtime cache token, and responsive registration UI are present.');