import { readFile } from 'node:fs/promises';

const sequence=await readFile('assets/production-receipt-sequences-v10.js','utf8');
const lifecycle=await readFile('assets/production-student-lifecycle-domain-v20.js','utf8');
const certificates=await readFile('assets/production-certificates-v13.js','utf8');
const registration=await readFile('assets/production-registration-schedule-v13.js','utf8');
const certificateState=await readFile('src-tauri/src/certificate_state.rs','utf8');
const gate=await readFile('assets/production-license-gate-v8.js','utf8');
const license=await readFile('src-tauri/src/license.rs','utf8');
const generator=await readFile('tools/license-generator/efc-license-generator.html','utf8');
const generatorRust=await readFile('tools/license-generator/src/main.rs','utf8');

new Function(sequence);
new Function(lifecycle);
new Function(certificates);
new Function(registration);

const need=(source,token,label=token)=>{if(!source.includes(token))throw new Error(`V10 safety feature missing: ${label}`);};
const forbid=(source,token,label=token)=>{if(source.includes(token))throw new Error(`V10 safety regression: ${label}`);};

for(const token of [
  'registrationReceiptNo',
  'payment[8]=number',
  'model.receipt=String',
  'generalReceiptsNumericOnly:true',
  'generalReceiptsStartAtOne:true',
  'certificateReceiptsStartAtOne:true',
  'externalCertificateRegistrationNative:true',
  'noCertificateDomObserver:true',
  'noCertificateReloadPatch:true',
  'legacyReceiptPrefixesRemoved:true',
  "const IDENTITY_KEY='centrat-identity-sequences-v11'",
  'generalReceiptNext:1',
  'registrationLastByScope:{}',
  'function allocateRegistrationNumber(branch,specialty)',
  'receiptNumbersNeverReused:true',
  'persistedHighWaterMarks:true',
  'historicalReceiptNumbersPreserved:true',
  'scopeMutationsCapturedOnPersist:true',
  'seedIdentityFromCurrent();writeIdentityLocal(false);',
  "EFC_REGISTER_STATE_CONTRIBUTOR?.('identity-sequences-v11'"
])need(sequence,token,`receipt/base sequence ${token}`);

for(const token of [
  "registrationNumberPolicy:'successor-sealed-latest-reusable'",
  'registrationNumbersNeverReused:false',
  'latestRegistrationNumberReusableUntilSuccessor:true',
  'olderRegistrationNumbersStayReserved:true',
  'function markRegistrationReleased(branch,specialty,number)',
  'function sealRegistrationNumber(branch,specialty,number)'
])need(lifecycle,token,`effective student registration policy ${token}`);

for(const token of [
  'certExternalRegV13',
  'أدخل رقم تسجيل الطالب',
  'reg,',
  'externalRegistrationNative:true',
  'receiptHeaderUnified:true',
  'certificateReceiptTitleLarge:true',
  'noObserverPatch:true',
  'nextReceiptNo:1',
  'certificateNextReceiptNo:state.nextReceiptNo',
  'certificateReceiptNumbersNeverReused:true',
  'certificateReceiptHighWaterPersisted:true',
  'certificateInternalEditStudentSelectionLocked:true',
  'certificateExternalReceiptFullEdit:true',
  'if(editingReceipt())return;',
  "search?.classList.add('efc-cert-edit-hidden-v44')",
  "state.nextReceiptNo=Math.max(Number(state.nextReceiptNo||1),Number(receipt.receiptNo||0)+1)"
])need(certificates,token,`certificate safety ${token}`);

need(registration,'allocateRegistrationNumber?.(branch,item.id)','registration uses the effective scope allocator');
need(registration,'registrationSequenceHighWaterMark:true','registration allocator integration marker');
forbid(registration,'reg=Math.max(0,...related.map(student=>Number(student.reg||0)))+1','registration must not depend solely on currently visible students');

for(const token of [
  'certificate_next_receipt_no',
  '"certificateNextReceiptNo".to_string()',
  '"nextReceiptNo"',
  'عداد روسيات غير صالح'
])need(certificateState,token,`certificate backup sequence ${token}`);

forbid(certificates,'function nextReceiptNo(){return Math.max(0,...state.certificateReceipts','certificate number must not be max-current-data only');
if(sequence.includes('MutationObserver')||sequence.includes('window.open=')||sequence.includes('location.reload()'))throw new Error('Receipt sequencing must not patch certificate DOM/window/reload behavior.');
if(certificates.includes('new MutationObserver('))throw new Error('Certificates v13 must not use DOM observers.');
if(!gate.includes("'./assets/production-certificates-v13.js'"))throw new Error('Certificates v13 are not loaded by the license gate.');
if(!gate.includes("'./assets/production-receipt-sequences-v10.js'"))throw new Error('Receipt sequencing is not loaded by the license gate.');
if(!gate.includes("'./assets/production-student-lifecycle-domain-v20.js'"))throw new Error('Student lifecycle numbering policy is not loaded by the license gate.');
if(gate.indexOf('production-receipt-sequences-v10.js')<gate.indexOf('production-certificates-v13.js'))throw new Error('Receipt sequencing must load after native certificates v13.');
if(gate.indexOf('production-student-lifecycle-domain-v20.js')<gate.indexOf('production-receipt-sequences-v10.js'))throw new Error('Student lifecycle policy must supersede the base sequence only after it is ready.');

const publicKey='BDDLo6mYqhmQbaUyS_xmMkebb3Nz28ZmWU3bF6alhqeXt7mxLrk_pxDc4vaz9RXV5mICatMtADIQvkF4EdLM8LY';
for(const [name,source] of [['license.rs',license],['HTML generator template',generator],['legacy generator',generatorRust]]){
  if(!source.includes('efc-license-v3'))throw new Error(`${name} is not on key id v3.`);
  if(!source.includes(publicKey))throw new Error(`${name} does not use the v3 public key.`);
}
if(license.includes('BK_2ws4TMDStsDqV7HokicMC814XtpAu00YZtUZ8KYBZfnzVXY0GB0ufHBUp9--5Ixb8DbgNUyoenXAQ3To6shI'))throw new Error('Old v1 public key still present in native verifier.');
if(license.includes('BAbRmaYeE4aeAI09ADkpDXreSynMo3LY9GTgQti1ava5MPqzOld4EKamVj2pnzAR5h1ypeOVjOQ9fcIEzCzzgr0'))throw new Error('Old v2 public key still present in native verifier.');
const preparedLicense=license.indexOf('fs::rename(&prepared, &path)');
const committedLicenseLedger=license.indexOf('persist_ledger(&ledger)',preparedLicense);
if(preparedLicense<0||committedLicenseLedger<preparedLicense)throw new Error('A license must be installed before its id is committed as consumed, so a file-install failure remains retryable.');
if(/R-\$\{|S-\$\{/.test(sequence))throw new Error('Receipt v10 must not generate letter-prefixed receipt numbers.');

console.log('V10 checks passed: financial receipts keep permanent high-water identities, student registration numbers use successor-sealed latest-number reuse, certificate edit identity stays locked, backups preserve counters, and license key v3 is consistent.');
