import { readFileSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const read=path=>readFileSync(path,'utf8');
const need=(text,token,label)=>{if(!text.includes(token))throw new Error(`Missing ${label}: ${token}`);};
const forbid=(text,token,label)=>{if(text.includes(token))throw new Error(`Forbidden ${label}: ${token}`);};

const identity=read('assets/production-identity-v1.js');
execFileSync(process.execPath,['--check','assets/production-identity-v1.js'],{stdio:'inherit'});
const gate=read('assets/production-license-gate-v8.js');
const build=read('scripts/build-production.mjs');
const auth=read('assets/production-auth-bootstrap-v13.js');
const security=read('assets/production-security-ui-v13.js');
const loader=read('production-loader.js');
const receipts=read('assets/production-receipts-v13.js');
const certificates=read('assets/production-certificates-v13.js');
const finance=read('assets/production-finance-ui-v13.js');
const bank=read('assets/production-bank-v22.js');
const capabilities=read('src-tauri/capabilities/default.json');
const cargo=read('src-tauri/Cargo.toml');

for(const [token,label] of [
  ['EFC_IDENTITY_V1','identity runtime marker'],
  ["const KEY='efc-identity-v1'","single identity storage key"],
  ["EFC_REGISTER_STATE_CONTRIBUTOR?.('identity-v1'","identity backup contributor"],
  ["EFC_REGISTER_RESTORE_CONTRIBUTOR?.('identity-v1'","identity restore contributor"],
  ['EFC_REGISTER_RECEIPT_TEMPLATE_V1','receipt template registry'],
  ['EFC_IDENTITY_APPLY_RECEIPT_V1','receipt template decorator'],
  ['EFC_RENDER_IDENTITY_V1','identity route renderer'],
  ['persistentIdentity:true','persistent identity marker'],
  ['globalBrandEditor:true','brand editor marker'],
  ['themeEditor:true','theme editor marker'],
  ['imageEditor:true','image editor marker'],
  ['runtimeWindowIdentity:true','native window identity marker'],
  ['receiptDesigner:true','receipt designer marker'],
  ['perReceiptType:true','per receipt-type marker'],
  ['noRenderWrapper:true','identity avoids renderer wrapping'],
  ["['identity',identityIcon,'الهوية']",'identity navigation item'],
  ['اسم التطبيق','application-name control'],
  ['اللون الرئيسي','primary color control'],
  ['أيقونة التطبيق','application icon control'],
  ['تصميم الروسيات','receipt designer tab'],
  ['＋ نص','receipt add-text control'],
  ['＋ صورة','receipt add-image control'],
  ['إخفاء / حذف','receipt element remove control'],
  ['element-width','receipt element width control']
])need(identity,token,label);

forbid(identity,'MutationObserver','identity must not use MutationObserver');
forbid(identity,'setInterval(','identity must not poll or layer runtime changes');
forbid(identity,'baseRender','identity must not wrap page renderers');

need(gate,"'./assets/production-identity-v1.js'",'identity runtime in license gate');
need(gate,"loadStage('./assets/production-identity-v1.js','الهوية'",'identity runtime load stage');
need(build,"'assets/production-identity-v1.js'",'identity runtime packaged into dist');
need(auth,"'identity'","identity permission section");
need(security,"['identity','الهوية']",'identity security section');
need(security,"else if(page==='identity')window.EFC_RENDER_IDENTITY_V1?.()",'identity route');
need(security,'window.EFC_APPLY_IDENTITY_V1?.()','identity reapplied after canonical render');
need(loader,"identity:'efc-identity-v1'",'identity core state key');
need(loader,'identityStatePreserved:true','identity native startup preservation marker');
need(capabilities,'core:window:allow-set-title','runtime window title permission');
need(capabilities,'core:window:allow-set-icon','runtime window icon permission');
need(cargo,'image-png','PNG window icon support');
need(cargo,'image-ico','ICO window icon support');
need(identity,'dataUrlBytes','window icon byte conversion');


const registrations=[
  [receipts,"'registration-receipt','روسي التسجيل'",'registration receipt'],
  [receipts,"'payment-receipt','روسي دفعة الطالب'",'payment receipt'],
  [receipts,"'student-statement','روسي كشف الطالب'",'student statement'],
  [certificates,"'certificate-receipt','روسي الشهادة'",'certificate receipt'],
  [certificates,"'certificate-delivery','روسي استلام الشهادة'",'certificate delivery receipt'],
  [certificates,"'certificate-manager','روسي فترة الشهادات'",'certificate manager receipt'],
  [finance,"'expense-receipt','روسي المصروف'",'expense receipt'],
  [bank,"'bank-receipt','روسي حركة البنك'",'bank movement receipt'],
  [bank,"'bank-report','روسي تقرير البنك'",'bank report'],
  [security,"'reminder-receipt','روسي التذكير'",'reminder receipt']
];
for(const [source,token,label] of registrations)need(source,token,`${label} template registration`);

for(const [source,token,label] of [
  [receipts,"apply(receiptTemplateType(model),html)",'student receipt runtime decoration'],
  [certificates,"apply('certificate-receipt',html)",'certificate receipt runtime decoration'],
  [certificates,"apply('certificate-delivery',html)",'certificate delivery runtime decoration'],
  [certificates,"apply('certificate-manager',html)",'certificate manager runtime decoration'],
  [finance,"apply('expense-receipt',html)",'expense receipt runtime decoration'],
  [bank,"apply('bank-receipt',html)",'bank receipt runtime decoration'],
  [bank,"apply('bank-report',html)",'bank report runtime decoration'],
  [security,"apply('reminder-receipt',html)",'reminder runtime decoration']
])need(source,token,label);

const identityRuntimeFiles=readdirSync('assets').filter(name=>/^production-identity-v\d+\.js$/.test(name));
if(identityRuntimeFiles.length!==1||identityRuntimeFiles[0]!=='production-identity-v1.js')throw new Error(`Identity must remain one runtime module; found: ${identityRuntimeFiles.join(', ')}`);

console.log('Identity v1 verified: one integrated identity runtime, persistent branding/theme/images, and ten independently editable receipt templates.');
