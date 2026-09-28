import {readFileSync,existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';

const read=path=>readFileSync(path,'utf8');
const requireText=(text,needle,label=needle)=>{if(!text.includes(needle))throw new Error(`Production v13 missing: ${label}`);};
const forbidText=(text,needle,label=needle)=>{if(text.includes(needle))throw new Error(`Production v13 forbidden: ${label}`);};
const requireMatch=(text,pattern,label)=>{if(!pattern.test(text))throw new Error(`Production v13 missing: ${label}`);};

const packageJson=JSON.parse(read('package.json'));
const index=read('index.html');
const gate=read('assets/production-license-gate-v8.js');
const loader=read('production-loader.js');
const foundation=read('assets/production-foundation-v13.js');
const receipts=read('assets/production-receipts-v13.js');
const certificate=read('assets/production-certificates-v13.js');
const sequence=read('assets/production-receipt-sequences-v10.js');
const domain=read('assets/production-domain-v13.js');
const monthlyDomain=read('assets/production-monthly-prepayment-domain-v14.js');
const studentUi=read('assets/production-student-ui-v13.js');
const financeUi=read('assets/production-finance-ui-v13.js');
const fiscal=read('assets/production-fiscal-year-v14.js');
const securityUi=read('assets/production-security-ui-v13.js');
const registrationSelect=read('assets/production-registration-schedule-matrix-v17.js');
const registrationSchedule=read('assets/production-registration-schedule-v13.js');
const monthlyUi=read('assets/production-monthly-prepayment-ui-v14.js');
const registrationRedesign=read('assets/production-registration-redesign-v15.js');
const periodSearch=read('assets/production-period-search-redesign-v28.js');
const studentSearch=read('assets/production-student-search-redesign-v31.js');
const lifecycleUi=read('assets/production-student-lifecycle-ui-v20.js');
const build=read('scripts/build-production.mjs');
const tauri=read('src-tauri/tauri.conf.json');
const rust=read('src-tauri/src/main.rs');

const runtimeManifestMatch=gate.match(/const RUNTIME=\[([\s\S]*?)\];/);
if(!runtimeManifestMatch)throw new Error('Production v13 missing: runtime manifest');
const runtimeManifestFiles=[...runtimeManifestMatch[1].matchAll(/'\.\/(.*?)'/g)].map(match=>match[1]);
const activeRuntimeFiles=['assets/production-license-gate-v8.js',...runtimeManifestFiles];
for(const path of activeRuntimeFiles){
  if(!existsSync(path))throw new Error(`Production runtime file is missing: ${path}`);
  execFileSync(process.execPath,['--check',path],{stdio:'inherit'});
}
const runtimeArchitectureSource=runtimeManifestFiles.map(path=>read(path)).join('\n');
forbidText(runtimeArchitectureSource,'const baseRender','runtime renderer-wrapper chain');
forbidText(runtimeArchitectureSource,'new MutationObserver(','runtime DOM patch observer');
forbidText(runtimeArchitectureSource,'setTimeout(()=>window.renderCurrentV13','deferred route renderer');


const obsoleteSourceFiles=[
  '.demo-imported','demo.css','demo-app.js','demo-period-merge.js','demo-monthly-finance-v3.js','demo-receipts-v4.js','demo-v5-runtime-guard.js','demo-brand-receipt-v5.js','demo-repair-v6.js','demo-receipt-layout-v7.js','demo-fix-v8.js','demo-receipt-logo-v9.js','demo-receipt-compact-v10.js','demo-receipt-paper-v11.js','demo-receipt-clean-v12.js','production-runtime.js','production-monthly-merge-v2.js',
  'assets/production-student-profile-v3.js','assets/production-registration-receipt-v4.js','assets/production-ledger-finance-ui-v5.js','assets/production-ledger-pdf-v6.js',
  'scripts/build-demo.mjs','scripts/harden-production.mjs','scripts/verify-center-ops-v11.mjs','scripts/verify-production.mjs'
];
for(const path of obsoleteSourceFiles)if(existsSync(path))throw new Error(`Obsolete source must be removed from clean v13: ${path}`);
if(!existsSync('assets/production-ui-v13.css'))throw new Error('Production v13 stylesheet is missing.');

requireText(index,'<div id="app"></div>','empty startup root');
requireMatch(index,/<script src="\.\/assets\/production-license-gate-v8\.js(?:\?[^"']*)?" defer><\/script>/,'single direct production bootstrap');
requireMatch(index,/<link rel="stylesheet" href="\.\/assets\/production-ui-v13\.css(?:\?[^"']*)?"\s*\/>/,'production stylesheet');
requireMatch(index,/<link rel="stylesheet" href="\.\/assets\/production-certificates-ui-v13\.css(?:\?[^"']*)?"\s*\/>/,'consolidated certificate stylesheet');
requireText(index,'html.efc-booting #app{visibility:hidden}','silent boot guard');
requireText(receipts,'pdfWaitsForHeaderLogo:true','student receipt PDF waits for header logo');
requireText(receipts,'sharedReceiptLogoDataUri:true','receipt service owns one embedded logo source');
requireText(receipts,"data:image/jpeg;base64,",'receipt logo is an embedded JPEG data URI');
requireText(certificate,'certificatePdfLogoCaptureFixed:true','certificate PDF logo capture marker');
requireText(certificate,'certificateUsesSharedEmbeddedLogo:true','certificate uses shared embedded receipt logo');
requireText(certificate,'certificateHistorySpreadsheetTable:true','certificate history spreadsheet grid');
requireText(certificate,'certificateHistoryStandardGreenHeader:true','certificate history standard green table header');
requireText(certificate,'certificateHistorySeparatePage:true','separate certificate history page marker');
requireText(financeUi,'expenseReceiptMatchesStudentHeader:true','expense receipt natural header parity');
requireText(financeUi,'expenseReceiptPdfWaitsForLogo:true','expense receipt PDF waits for logo');
requireText(financeUi,'expenseReceiptUsesSharedEmbeddedLogo:true','expense receipt uses shared embedded receipt logo');
requireText(financeUi,'profitabilitySpreadsheetTable:true','profitability details spreadsheet grid');
requireText(financeUi,'expenseReceiptsNumericSequence:true','expense receipts numeric sequence UI');
requireText(financeUi,'ledgerResponsiveLikeFinance:true','ledger responsive layout marker');
requireText(financeUi,'ledgerSummaryMoneyOnly:true','ledger revenue and expense cards show money only');
requireText(financeUi,'ledgerDailyProfit:true','ledger shows daily profitability');
requireText(financeUi,'<small>ربحية اليومية</small>','daily profitability label');
forbidText(financeUi,'return`EXP-','opaque expense receipt code');
forbidText(index,'جاري تشغيل مركز EFC','visible startup splash');
forbidText(index,'demo.css','demo stylesheet reference');
forbidText(index,'./demo-app.js','demo runtime documentation');

const gateOrder=['production-loader.js','production-foundation-v13.js','production-receipts-v13.js','production-certificates-v13.js','production-domain-v13.js','production-receipt-sequences-v10.js','production-student-ui-v13.js','production-finance-ui-v13.js','production-fiscal-year-v14.js','production-security-ui-v13.js'];
let last=-1;for(const token of gateOrder){const position=gate.indexOf(token);if(position<0)throw new Error(`Gate does not contain ${token}`);if(position<last)throw new Error(`Gate runtime order is wrong at ${token}`);last=position;}
for(const obsolete of ['demo-app.js','demo-period-merge.js','demo-monthly-finance-v3.js','production-runtime.js','production-monthly-merge-v2.js','production-student-profile-v3.js','production-registration-receipt-v4.js','production-ledger-finance-ui-v5.js','production-ledger-pdf-v6.js','production-center-ops-v11.js','production-center-ops-v12.js'])forbidText(gate,obsolete,`legacy gate layer ${obsolete}`);
for(const token of ['silentValidStartup:true','activationUiOnlyWhenInvalid:true','noStartupSplash:true','noLegacyDemoRuntime:true','foundationV13:true','standaloneReceiptsV13:true','domainBeforeReceiptSequence:true','singleStartupRender:true','parallelRuntimePreload:true','loginFirstPreload:true','heavyPreloadAfterLogin:true','gateOwnsBootReveal:true','finalUiBeforeReveal:true'])requireText(gate,token,`gate ${token}`);
requireText(securityUi,'bootRevealDeferredToGate:true','security defers boot reveal to gate');
forbidText(securityUi,"classList.remove('efc-booting')",'security must not reveal an intermediate UI');

for(const token of ['chooseNewestState','EFC_FORCE_PERSIST','EFC_APPLY_RESTORED_STATE','EFC_CORE_CHANGED','explicitPersistence:true','noStoragePrototypePatch:true','noRuntimeScriptChain:true'])requireText(loader,token,`loader ${token}`);
forbidText(loader,'SCRIPT_ORDER','legacy loader script chain');
forbidText(loader,'Storage.prototype.setItem','global storage setItem patch');
forbidText(loader,'Storage.prototype.removeItem','global storage removeItem patch');
forbidText(loader,'loadScript(','runtime script loader');

for(const token of ['noRouter:true','noMutationObserver:true','noStartupRender:true','legacyDataAdapter:true','renderSettingsBaseV13','EFC_RENDER_SETTINGS_BASE_V13','settingsBaseRendererExported:true','EFC_CORE_CHANGED'])requireText(foundation,token,`foundation ${token}`);
forbidText(foundation,"addEventListener('hashchange'",'foundation router');
forbidText(foundation,'new MutationObserver(','foundation observer');

for(const token of ['window.receiptModelV4','window.receiptWindowV4','window.EFC_SAVE_RECEIPT_PDF','noLegacyReceiptChain:true','noWindowOpenPatch:true','offlinePdfLibraries:true','inAppReceiptViewer:true','restoredLegacyReceiptDesign:true','receipt-viewer-frame-v13','socialLine12'])requireText(receipts,token,`receipts ${token}`);
forbidText(receipts,'window.open=function','receipt global window.open patch');
forbidText(receipts,'window.open(','external receipt window');
forbidText(receipts,'new MutationObserver(','receipt observer');

for(const token of ['externalRegistrationNative:true','internalBranchAndSpecialtyFilter:true','internalSearchWithoutRequiredFilters:true','certificateStudentResultsClickable:true','certificateReceiptInAppViewer:true','كل الفروع','كل الشهادات','receipt-viewer-frame-v13','receiptHeaderUnified:true','separateCertificateFinance:true','certificateFinanceDailyMonthlyYearly:true','certificateFinanceByBranch:true','certificateFinanceByPaymentMethod:true','certificateFinancePeriodSummary:true','certificateFinanceSimplifiedUi:true','certificateFinanceMatchesGeneralLayout:true','certificateFinanceNoChart:true','rollingFinancialYearsFrom2025:true','certificateIncomeExcludedFromMainFinance:true','certificateIncomeExcludedFromLedger:true','certificateIncomeInLedgerAndFinance:false','window.EFC_CERTIFICATE_PAYMENTS_V13','window.EFC_CERTIFICATE_STATE_V14','purgeReceiptsByIdentity','certificateManagementTitleBelowHeader:true','paymentMethodsFromSettings:true','externalReceiptIssueEnabled:true','certificateReceiptHeaderSimplified:true','certificateFeeNoteRemoved:true','cert-section-title','للغات والمعلوماتية','window.EFC_RENDER_CERTIFICATES_V13','noRouterHook:true','cleanReceiptDependency:true','EFC_RECEIPTS_V13?.ready'])requireText(certificate,token,`certificate ${token}`);
forbidText(certificate,'const baseAllPayments=allPayments','certificate income must not wrap the canonical student payment stream');
forbidText(certificate,'allPayments=function(){const combined','certificate income must not enter main finance or daily ledger');
forbidText(certificate,'اختر الفرع والدورة أولًا','certificate search must not require branch/specialty');
forbidText(certificate,'اختر الفرع والدورة أولاً','certificate search must not require branch/specialty');
forbidText(certificate,'كل الدورات','certificate UI must use certificate-only terminology');
forbidText(certificate,'هذا الوصل خاص برسوم الشهادة ولا يغيّر رصيد الدورة الدراسية للطالب.','obsolete certificate fee note');
forbidText(certificate,"{key:'bankily'",'hard-coded certificate payment methods');
forbidText(certificate,'SEDAD BANK','hard-coded certificate payment method label');
forbidText(certificate,'bimbank','hard-coded certificate payment method label');
forbidText(certificate,'متوسط العملية','certificate finance must not restore average-operation KPI');
forbidText(certificate,'أكبر عملية','certificate finance must not restore largest-operation KPI');
forbidText(certificate,"addEventListener('hashchange'",'certificate router hook');
forbidText(certificate,'window.open=','certificate window.open override');
forbidText(certificate,'new MutationObserver(','certificate observer');

for(const token of ['EFC_RECEIPTS_V13?.ready','function appendPayment(student','student.paid=paymentTotal(student)','function remainingAmount(student','hydrateExtrasFromDesktop','window.EFC_DOMAIN_V13_READY','expenseReceiptsNumericOnly:true','expenseReceiptsStartAtOne:true','expenseReceiptNumbersNeverReused:true','expenseReceiptSequencePersisted:true','expenseReceiptSequenceV28','reminderInclusiveSalutation:true','reminderRequiresAdminReconciliation:true'])requireText(domain,token,`domain ${token}`);
for(const token of ["EFC_FISCAL_V14?.assertDateOpen?.(String(date||today()),'تاريخ الدفعة'","EFC_FISCAL_V14?.assertDateOpen?.(candidatePaymentDate,'تاريخ الدفعة'",'historicalCourseSnapshotPreservedOnEdit:true','renewalWarningBeforeMonth:true','debtStartsWithUnpaidRenewal:true','monthlyRenewalWarningDays:RENEWAL_WARNING_DAYS','inclusiveReminderSalutation:true'])requireText(monthlyDomain,token,`monthly domain integration ${token}`);
forbidText(domain,'عزيزي الطالب ','old male-only reminder salutation');
forbidText(monthlyDomain,'عزيزي الطالب ','old male-only monthly reminder salutation');
forbidText(domain,'تجاهل','reminders must never tell a student to ignore a payment mismatch');
forbidText(monthlyDomain,'تجاهل','monthly reminders must never tell a student to ignore a payment mismatch');
for(const token of ['currentLevelImplementation:true','ownerChoosesStartDate:true','automaticEndDate:true','annualSameAnchor:true','continuingStudentsRetained:true','debtorsRetained:true','separateCourseAndCertificateIncome:true','tombstoneRestoreProtection:true','pendingCloseJournal:true','closedPeriodsImmutable:true','noRouterHook:true'])requireText(fiscal,token,`fiscal ${token}`);
for(const token of ['quickDaysV13','DEBT_IDLE_MS=450','appendPayment(student,{amount,method:','autocompleteOff','function renderPeriodBaseV13','function renderStudentsBaseV13','EFC_RENDER_PERIOD_BASE_V13','EFC_RENDER_STUDENTS_BASE_V13','studentEndForSearch','data-tab="debts"','searchUsesUnifiedEndLabel:true','periodRegistrationsShowEndDate:true','debtTabShowsAllIncomplete:true','.quick-days-v13[hidden]','debtDateStableSlot:true','studentSearchPageRestored:true','periodSearchHeaderRestored:true','monthlyCourseDefault:true','debt-slot-hidden','originalStudentFileLayoutRestored:true','monthlyReceiptActionsRestored:true','profileFirstFromStudentSearch:true','legacyRecordsUseRestoredStudentFile:true','snapshot.billing===\'monthly\'','حالة التسجيل','روسي شامل للأشهر','روسي التسجيل','فتح الروسي','student-profile-section-v3','month-actions-mm'])requireText(studentUi,token,`student UI ${token}`);
forbidText(studentUi,'legacyOpenStudent(id,mode)','legacy records must use the restored student-file UI');
forbidText(studentUi,'كل المستحقات','obsolete all-dues filter');
forbidText(studentUi,'مستحق الآن','obsolete due-now label');
forbidText(studentUi,'متأخر','obsolete late financial label');
forbidText(studentUi,'نهاية الدورة / الشهر','obsolete long end-date label');
requireText(studentUi,"financialStatus(student)!=='مدفوع كامل'",'debt tab includes every active non-fully-paid student');
for(const token of ['function debtDateForSearch','activeMonth?.dueFrom','debtDateForSearch(student,current)','debtDateClampedToVisibleState:true'])requireText(studentUi,token,`debt visibility ${token}`);
requireText(studentUi,"['البداية','start'],['النهاية','end']",'period registration results show end date beside start');
for(const [source,label] of [[foundation,'foundation'],[domain,'domain'],[monthlyDomain,'monthly domain']])forbidText(source,'متأخر',`${label} obsolete late label`);
for(const token of ['financePrimaryActionV13','renderFinance=function','function renderLedgerBaseV13','EFC_RENDER_LEDGER_BASE_V13','ledgerBaseRendererExported:true','مصروف عام','paymentMethodsNoDelete:true','FINANCE_FIRST_YEAR=2025','rollingFinancialYearsFrom2025:true','financialYearWindowMaxTen:true','expenseReceipts:true','expenseReceiptUsesNaturalHeader:true','expenseReceiptPdfSaveAs:true','window.EFC_OPEN_EXPENSE_RECEIPT_V13','window.EFC_FINANCE_PRESENTATION_V13','سند مصروف',"EFC_FISCAL_V14?.assertDateOpen?.(record.date,'تاريخ المصروف'"])requireText(financeUi,token,`finance UI ${token}`);
for(const token of ['renderCurrentV13',"else if(page==='settings')renderSettings()","else if(page==='certificates')window.EFC_RENDER_CERTIFICATES_V13?.()",'canonicalSettingsRenderer:true','singleSettingsRenderOwner:true','noSettingsPostRenderEnhancement:true','settingsOwnedByFinalRouter:true','certificatesOwnedByFinalRouter:true','EFC_ENHANCE_FISCAL_SETTINGS_V14','loginAttemptThrottle:true','notificationBell:true','allPagesFinalRenderBeforeReveal:true','directCanonicalRouteRender:true','noRouteConcealment:true','noShellRenderWrapper:true','directCanonicalRoutes:true','noRouteRenderStaging:true','memoizedRouteReconcile:true','memoizedNotifications:true','singleAfterRenderPerRoute:true'])requireText(securityUi,token,`security UI ${token}`);
forbidText(securityUi,'setTimeout(afterRenderV13,0)','route shell must not schedule duplicate finalization');
forbidText(securityUi,'efc-route-rendering','canonical routes must not be concealed while post-render patches run');
forbidText(securityUi,'const baseShell=shell','security must not wrap the global shell');
forbidText(securityUi,"function afterRenderV13(){document.title=OFFICIAL_NAME;window.EFC_SYNC_BRAND_V13?.();window.EFC_AUTOCOMPLETE_OFF_V13?.(document);window.EFC_ENHANCE_FINANCE_SETTINGS_V13",'settings must be fully assembled by their canonical renderer before afterRender');
for(const token of ['consistentBlueOptionHover:true','nativePopupAvoidedForRegistrationLists:true','nativeClosedSelectAppearancePreserved:true','onlyDropdownHoverColorCustomized:true','allNativeSelectsUseBlueHover:true','closedSelectDomUntouched:true','dynamicSelectsCoveredByDelegation:true','window.EFC_SYNC_SELECTS_V19=syncAllBlueLists','efc-blue-select-option-v19:hover','background:#1469ad!important'])requireText(registrationSelect,token,`global select hover ${token}`);
forbidText(registrationSelect,"host.className='efc-blue-select-v19'",'closed selects must not be reparented into custom hosts');
forbidText(registrationSelect,'opacity:0!important;pointer-events:none!important','native selects must not be visually replaced');
requireText(securityUi,'window.EFC_SYNC_SELECTS_V19?.(document)','all routed pages sync select hover behavior');
for(const token of ['baseRegistrationRenderer:true','finalRegistrationRendererOwnedByMatrix:true','registrationPaymentRecordedAsTransaction:true','noLegacyStudentRegistrationRenderer:true','appendPayment(student,{amount:paidNow','EFC_REGISTRATION_BASE_V13'])requireText(registrationSchedule,token,`registration base ${token}`);
forbidText(studentUi,'renderRegister=function(){','student UI must not keep an obsolete registration renderer');
forbidText(monthlyUi,'const baseRenderRegister=window.renderRegister','monthly registration wrapper chain');
forbidText(registrationRedesign,'const baseRenderRegister=window.renderRegister','redesign registration wrapper chain');
forbidText(registrationSchedule,'const baseShell=window.shell','registration terminology must not wrap the global shell');
forbidText(registrationSchedule,'function courseTerms(value)','runtime course terminology translator must be absent');
forbidText(lifecycleUi,'const baseRenderRegister=window.renderRegister','lifecycle registration wrapper chain');
for(const token of ['canonicalLedgerRenderer:true','singleLedgerRenderOwner:true','noLedgerWrapperChain:true','synchronousLedgerEnhancement:true'])requireText(monthlyUi,token,`ledger canonical owner ${token}`);
forbidText(monthlyUi,'const baseRenderLedger=window.renderLedger','monthly ledger must not wrap a prior renderer');
forbidText(monthlyUi,'setTimeout(enhanceLedger,0)','ledger allocation enhancement must be synchronous');
for(const token of ['canonicalPeriodRenderer:true','singlePeriodRenderOwner:true','noPeriodWrapperChain:true'])requireText(periodSearch,token,`period canonical owner ${token}`);
forbidText(periodSearch,'const baseRenderPeriod=window.renderPeriod','period search must not wrap a prior renderer');
for(const token of ['canonicalStudentSearchRenderer:true','singleStudentSearchRenderOwner:true','noStudentSearchWrapperChain:true'])requireText(studentSearch,token,`student search canonical owner ${token}`);
forbidText(studentSearch,'const baseRenderStudents=window.renderStudents','student search must not wrap a prior renderer');
for(const token of ['canonicalRegistrationRenderer:true','singleRegistrationRenderOwner:true','noRenderWrapperChain:true'])requireText(registrationSelect,token,`registration canonical owner ${token}`);

const activeCombined=[loader,foundation,receipts,certificate,sequence,domain,monthlyDomain,studentUi,financeUi,fiscal,securityUi].join('\n');
for(const forbidden of ['new MutationObserver(','window.MutationObserver =','window.MutationObserver=','window.open=function','Storage.prototype.setItem =','Storage.prototype.setItem=','Storage.prototype.removeItem =','Storage.prototype.removeItem='])forbidText(activeCombined,forbidden,`active runtime global side effect ${forbidden}`);
const hashOwners=[foundation,receipts,certificate,sequence,domain,monthlyDomain,studentUi,financeUi,fiscal,securityUi].filter(source=>source.includes("addEventListener('hashchange'")||source.includes('addEventListener("hashchange"'));
if(hashOwners.length!==1||hashOwners[0]!==securityUi)throw new Error(`Expected exactly one hashchange router owner; found ${hashOwners.length}.`);

const runtimeBlock=build.match(/const runtimeFiles\s*=\s*\[([\s\S]*?)\];/)?.[1]||'';
if(!runtimeBlock)throw new Error('Could not inspect production runtime file list.');
const packagedRuntime=[...runtimeBlock.matchAll(/'([^']+)'/g)].map(match=>match[1]);
for(const path of packagedRuntime.filter(path=>path.endsWith('.js')))execFileSync(process.execPath,['--check',path],{stdio:'inherit'});
for(const ref of [...index.matchAll(/(?:src|href)="\.\/([^?"']+)/g)].map(match=>match[1]).filter(path=>path!=='efc-logo.svg'))if(!packagedRuntime.includes(ref))throw new Error(`Index runtime is not packaged: ${ref}`);
for(const legacy of obsoleteSourceFiles)forbidText(runtimeBlock,`'${legacy}'`,`obsolete packaged runtime ${legacy}`);
for(const required of ['assets/production-ui-v13.css','assets/production-certificates-ui-v13.css','assets/production-foundation-v13.js','assets/production-receipts-v13.js','assets/production-fiscal-year-v14.js','assets/production-security-ui-v13.js'])requireText(runtimeBlock,required,`clean packaged runtime ${required}`);
requireText(build,'forbiddenProductionFiles','obsolete source/dist guard');
forbidText(build,"await cp('assets', 'dist/assets', { recursive: true });",'recursive assets copy');
requireText(tauri,'"frontendDist": "../dist"','Tauri packaged frontend');
for(const command of ['save_app_state','load_app_state','save_receipt_pdf','save_certificate_state','load_certificate_state','get_license_status'])requireText(rust,command,`native command ${command}`);

if(String(packageJson.scripts?.build||'')!=='node scripts/build-production.mjs')throw new Error('package build must use the clean production builder.');
if('harden' in (packageJson.scripts||{}))throw new Error('Obsolete harden script must not remain in package scripts.');
if(!String(packageJson.scripts?.check||'').includes('verify-runtime-core-v13.mjs'))throw new Error('package check does not run runtime v13 verifier.');
if(!String(packageJson.scripts?.check||'').includes('verify-production-v13.mjs'))throw new Error('package check does not run production v13 verifier.');
if(!String(packageJson.scripts?.check||'').includes('verify-fiscal-current-v14.mjs'))throw new Error('package check does not run fiscal v14 verifier.');

console.log('Production v13 verification passed: clean runtime with student finance and certificate finance kept as separate accounting streams, optional certificate filters, settings-driven certificate receipts, external certificate issuing, safe persistence, single router and canonical payments.');
