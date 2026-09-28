import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const cert=readFileSync('assets/production-certificates-v13.js','utf8');
const domain=readFileSync('assets/production-monthly-prepayment-domain-v14.js','utf8');
execFileSync(process.execPath,['--check','assets/production-certificates-v13.js'],{stdio:'inherit'});
execFileSync(process.execPath,['--check','assets/production-monthly-prepayment-domain-v14.js'],{stdio:'inherit'});
const need=(text,token,label)=>{if(!text.includes(token))throw new Error(`Missing ${label}: ${token}`);};
for(const [token,label] of [['stoppedStudentHasEndDate:true','stop end marker'],['stoppedMonthlyPaidThroughProtected:true','paid-through marker'],['function stoppedStudentEndDate','stop end calculator'],["student.end=stoppedStudentEndDate(student,stopped)",'stored stopped end']])need(domain,token,label);
for(const [token,label] of [['certificateFinanceCurrentGeneralVisuals:true','current finance visual marker'],['certificateFinanceCustomWeekRange:true','custom period exposed as week mode'],['certificateHistoryUsesFinanceFilters:true','certificate history reuses finance filter model'],['certificateHistoryCustomWeekRange:true','certificate history custom date range'],['certificateHistoryFilterByPeriod:true','certificate history period filter'],['certificateHistoryFilterByBranch:true','certificate history branch filter'],['certificateHistoryFilterBySpecialty:true','certificate history specialty filter'],['certificateHistoryFilterByPaymentMethod:true','certificate history payment-method filter'],['certificateHistoryFilterSummaryText:true','certificate history summary describes active filters'],['certificateHistorySummaryMatchesFinance:true','certificate history summary mirrors finance hierarchy'],['certificateTerminologyUsesCertificateOnly:true','certificate module uses certificate-only terminology'],['certificateFinanceSummaryAboveFilters:true','summary-above-filters marker'],['certificateFinanceSummaryFilterClearance:true','certificate finance summary stays visually clear of filters'],['certificateFinanceSummaryDedicatedRow:true','certificate finance summary has a dedicated row separate from filters'],['certificateFinanceCompactFilterGeometry:true','certificate finance removes wasted filter width'],['certificatePeriodSwitchConstrainedToGrid:true','certificate period switch cannot overflow into date/year filters'],['#certFinanceModeV13{width:100%!important;max-width:100%!important;min-width:0!important','certificate finance period switch is constrained to its grid track'],['grid-template-columns:repeat(4,minmax(0,1fr))!important','certificate period buttons shrink inside the available track'],['certificateFinanceResponsiveRulesConsolidated:true','certificate finance responsive rules are consolidated'],['certificateFinancePositiveSummary:true','positive green certificate income summary'],['certificateFinanceFixedSpecialtyFilterWidth:true','fixed certificate specialty filter width'],['certificateFinanceTopbarAligned:true','aligned topbar marker'],['certificateFinanceResponsive:true','responsive finance marker'],['certificateFinanceCompactSingleRowFilters:true','compact filter marker'],['certificateFinanceResponsiveBreakdowns:true','responsive breakdown marker'],['certificateHistorySeparatePage:true','certificate history has its own page'],['certificateHistoryCount:true','certificate history shows count'],['certificateHistoryCountCenteredBelowTitle:true','certificate history count summary is centered below the page title'],['certificateToolbarStyledActions:true','certificate page has finance/history actions'],['certificateFinanceNoHistoryTable:true','certificate finance no longer owns receipt history table'],['certificatePdfLogoCaptureFixed:true','certificate PDF capture keeps the center logo'],['certificateUsesSharedEmbeddedLogo:true','certificate receipt uses the shared embedded logo'],['certificateHistorySpreadsheetTable:true','certificate history uses spreadsheet table styling'],['cert-records-hero-v47','certificate records page hero'],['efc-cert-records-toggle-v47','certificate records toolbar action'],['certificateReceiptEditDelete:true','certificate receipt mutation marker'],
['certificateDeliveryTracking:true','certificate delivery tracking marker'],
['certificateDeliveryStudentOrAgent:true','student/agent recipient choices'],
['certificateDeliveryNoDefaultRecipient:true','recipient selector starts with no choice'],
['certificateDeliveryExclusiveRecipientFields:true','only the selected recipient details are shown'],
['certificateDeliveryClearStudentHeader:true','delivery information highlights the student name'],
['<option value="" selected>اختر المستلم</option>','recipient selector default is empty'],
['cert-delivery-student" hidden','student details start hidden'],
['.cert-delivery-student[hidden],.cert-delivery-agent[hidden]{display:none!important}','hidden recipient sections cannot be forced visible by grid css'],
["saveButton.disabled=!student&&!agent",'save is disabled until a recipient is selected'],
["if(!['student','agent'].includes(type.value))return alert('اختر المستلم.')",'delivery save rejects an empty recipient'],
['cert-delivery-subject','delivery information student-name emphasis'],
['certificateDeliveryHistoryDate:true','delivery date appears in certificate history'],
['certificateDeliveryReadonlyAfterSave:true','saved delivery opens as information'],
['certificateDeliveryReceipt:true','certificate delivery receipt marker'],
['certificateDeliveryReceiptCongrats:true','delivery receipt congratulation marker'],
['function certificateDeliveryReceiptBody','delivery receipt renderer'],
['وصل استلام الشهادة','delivery receipt title'],
['ألف ألف مبروك على التخرج','decorated graduation congratulation'],
['EFC_OPEN_CERTIFICATE_DELIVERY_RECEIPT_V13','delivery receipt viewer api'],
['EFC_SAVE_CERTIFICATE_DELIVERY_PDF_V13','delivery receipt PDF api'],
['cert-delivery-congrats-v13','decorated congratulation block'],
['letter-spacing:normal;word-spacing:normal;unicode-bidi:isolate','Arabic congratulation stays joined in html2canvas PDF rendering'],

['روسي الاستلام','delivery information opens the delivery receipt'],

['function normalizeCertificateDelivery','certificate delivery data is normalized with receipt state'],
['EFC_OPEN_CERTIFICATE_DELIVERY_V13','certificate delivery action api'],
["delivered?'معلومات الاستلام':'تسجيل الاستلام'",'receipt action changes after delivery'],
['name="receiverType"','recipient type selector'],
['value="student">الطالب','student recipient option'],
['value="agent">وكيل الطالب','agent recipient option'],
['name="agentName"','agent name input'],
['name="agentPhone"','agent phone input'],
["delivery:normalizeCertificateDelivery(item.delivery)",'delivery persists inside certificate receipt state'],
["receipt.delivery?showDate(receipt.delivery.date)",'history renders delivery date'],
["'تاريخ الاستلام'","certificate history delivery-date column"],
['colspan="9"','certificate history empty row matches new column count'],
['min-width:900px!important','certificate history allows room for delivery date'],
['cert-delivery-missing','undelivered certificate uses a clear dash'],
['certificateExternalReceiptFullEdit:true','external certificate receipts allow full data editing'],['certificateInternalReceiptIdentityLocked:true','internal certificate receipt identity remains locked'],['certificateReceiptFiscalLockAware:true','fiscal-lock mutation marker'],['cert-finance-primary-summary-v45','primary period summary'],['cert-finance-specialty-v46','fixed certificate specialty filter class'],['certFinanceBackV13','finance back action'],['EFC_EDIT_CERTIFICATE_RECEIPT_V13','receipt edit api'],['EFC_DELETE_CERTIFICATE_RECEIPT_V13','receipt delete api'],['EFC_CERTIFICATE_EDIT_V44','edit session api'],['cert-finance-controls-v13[data-mode=\"daily\"]','daily mode compact filter grid'],['#certFinanceBodyV13>.breakdowns{grid-template-columns:1fr','small-screen breakdown stack'],['data-mode="weekly">أسبوع</button>','visible week/custom-period finance mode'],['certFinanceFromV48','certificate finance range-from input'],['certFinanceToV48','certificate finance range-to input'],['certRecordsModeV48','certificate records period selector'],['certRecordsFromV48','certificate records range-from input'],['certRecordsToV48','certificate records range-to input'],['certRecordsBranchV48','certificate records branch filter'],['certRecordsSpecialtyV48','certificate records specialty filter'],['certRecordsMethodV48','certificate records payment-method filter'],['cert-finance-summary-row-v49','certificate finance summary uses a structural row'],['margin:0 0 16px!important','certificate finance summary row keeps explicit separation from filters'],['grid-template-columns:148px 88px 68px 102px 140px 116px!important','monthly certificate filters use compact geometry'],['grid-template-columns:148px 124px 124px 102px 140px 116px!important','custom-period certificate filters use compact date widths'],['cert-records-summary-row-v49','certificate records summary has its own centered structural row'],['cert-records-count-line-v48','certificate records count/value share the first summary line'],['summaryText=`الشهادات ${periodDescriptor}','certificate records context is placed below the count'],['<h3>حسب تخصص الشهادة</h3>','certificate finance breakdown uses certificate specialty terminology'],['<label class="cert-finance-specialty-v46">تخصص الشهادة','certificate finance filter uses certificate specialty terminology'],['<label class="cert-records-specialty-v48">الشهادة','certificate records filter uses certificate terminology'],['function certificateFilterMatches','shared certificate filter predicate'],["['daily','weekly','monthly','yearly'].includes(modeValue)",'finance range accepts custom week mode'],['assertDateOpen','fiscal closed-period guard']])need(cert,token,label);
if(cert.includes('#certFinanceBodyV13>.kpis'))throw new Error('Old certificate KPI block styling is still present.');
if(cert.includes('cert-finance-secondary-row-v43'))throw new Error('Old split method/summary finance row is still present.');
if(cert.includes('id=\"certFinanceOverallTotalV13\"'))throw new Error('Certificate finance must not render a lifetime total card.');
if(cert.includes('root.innerHTML=`<div class=\"card chart-card\">'))throw new Error('Certificate finance chart returned.');
const financeStart=cert.indexOf('function drawCertificateFinance(){'),financeEnd=cert.indexOf('function setHistoryMode',financeStart);if(financeStart<0||financeEnd<0)throw new Error('Certificate finance renderer not found.');if(cert.slice(financeStart,financeEnd).includes('table(['))throw new Error('Certificate finance must not embed the certificate history table.');
need(cert,'certificateFinanceDailyDateOnly:true','daily date-only marker');
need(cert,'certificateFinanceFilterSummaryText:true','filtered summary sentence marker');
if(cert.includes('name.readOnly=true')||cert.includes('specialty.disabled=true')||cert.includes('branch.disabled=true'))throw new Error('External certificate receipt fields must not be locked during edit.');
need(cert,"if(receipt.studentType==='external'){",'external receipt full-edit branch');
need(cert,"externalData={studentName:name,phone,reg,specialtyId,specialtyName:specialty.name,branchType:'certificate'","external receipt full data collection");
need(cert,"Object.assign(receipt,externalData||{}, {amount,method})",'external receipt full data save');
need(cert,"if(receipt.studentType!=='external')return false",'internal receipt dirty-check identity remains locked');
if(cert.includes('الشهادة / الدورة'))throw new Error('Certificate module must use الشهادة without the mixed الشهادة / الدورة label.');
if(cert.includes('<small>الدورة</small>'))throw new Error('Certificate module detail labels must use الشهادة instead of الدورة.');
if(cert.includes('<label>الدورة<select id="certInternalSpecV13"')||cert.includes('<label>الدورة<select id="certExternalSpecV13"'))throw new Error('Certificate issue filters must use الشهادة terminology.');
if(cert.includes('cert-delivery-congrats-v13{')&&cert.includes('letter-spacing:.2px'))throw new Error('Arabic delivery congratulation must not use non-zero letter spacing because html2canvas breaks joining.');
console.log('Stopped-student dates, certificate delivery receipts, full external edits, pickup tracking, and responsive certificate finance verified.');
