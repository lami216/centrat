import { readFileSync } from 'node:fs';

const read=path=>readFileSync(path,'utf8');
const need=(text,token,label)=>{if(!text.includes(token))throw new Error(`Centrat isolation missing: ${label} (${token})`);};
const forbid=(text,token,label)=>{if(text.includes(token))throw new Error(`Centrat isolation leaked old root: ${label} (${token})`);};

const tauri=JSON.parse(read('src-tauri/tauri.conf.json'));
const cargo=read('src-tauri/Cargo.toml');
const pkg=JSON.parse(read('package.json'));
const main=read('src-tauri/src/main.rs');
const bank=read('src-tauri/src/bank_state.rs');
const cert=read('src-tauri/src/certificate_state.rs');
const license=read('src-tauri/src/license.rs');
const hooks=read('src-tauri/windows/hooks.nsh');
const loader=read('production-loader.js');
const foundation=read('assets/production-foundation-v13.js');
const auth=read('assets/production-auth-bootstrap-v13.js');
const domain=read('assets/production-domain-v13.js');
const identity=read('assets/production-identity-v1.js');
const sequences=read('assets/production-receipt-sequences-v10.js');
const fiscal=read('assets/production-fiscal-year-v14.js');
const accounting=read('assets/production-accounting-integrity-v21.js');
const bankUi=read('assets/production-bank-v22.js');
const certUi=read('assets/production-certificates-v13.js');
const workflow=read('.github/workflows/windows-build.yml');

if(tauri.productName!=='Centrat')throw new Error(`Centrat productName must be unique; found ${tauri.productName}`);
if(tauri.identifier!=='mr.centrat.desktop')throw new Error(`Centrat bundle identifier must be unique; found ${tauri.identifier}`);
if(tauri?.app?.windows?.[0]?.title!=='Centrat')throw new Error('Centrat native startup window title must be distinct.');
if(pkg.name!=='centrat-desktop')throw new Error(`Centrat npm package name must be unique; found ${pkg.name}`);
need(cargo,'name = "centrat-desktop"','unique native binary name');
forbid(cargo,'name = "centre-efc"','old EFC native binary name');
forbid(cargo,'tauri-plugin-single-instance','single-instance plugin would prevent independent concurrent runs');

for(const [source,label] of [[main,'main state'],[bank,'bank state'],[cert,'certificate state']]){
  need(source,'centrat-state-v1.sqlite',`${label} database file`);
  forbid(source,'efc-state-v1.sqlite',`${label} old EFC database file`);
  need(source,'app_data_dir()',`${label} resolves through the app-specific data directory`);
}

need(license,'root.join("Centrat").join("Licensing")','separate LocalAppData licensing directory');
need(license,'HKCU\\Software\\Centrat\\Licensing\\v1','separate Windows licensing registry root');
need(license,'mr.centrat.desktop|device-v1|{normalized}','separate device-id namespace');
need(license,'Centrat|licensing-state-v1|{device}','separate license ledger HMAC namespace');
forbid(license,'root.join("Centre-EFC")','old EFC licensing directory');
forbid(license,'HKCU\\Software\\Centre EFC\\Licensing\\v1','old EFC licensing registry root');
forbid(license,'mr.efc.centre|device-v1|{normalized}','old EFC device namespace');
forbid(license,'Centre-EFC|licensing-state-v1|{device}','old EFC license ledger namespace');

for(const token of [
  "students:'centrat-students-v1'",
  "specialties:'centrat-specialties-v1'",
  "methods:'centrat-payment-methods-v1'",
  "identity:'centrat-identity-v1'",
  "const META_KEY='centrat-state-meta-v1'",
  'centratStorageNamespace:true',
  'noEfcStorageMigration:true'
])need(loader,token,'Centrat core browser storage namespace');
need(loader,'const LEGACY_KEYS=[];','no implicit EFC browser-storage import/delete');
for(const oldKey of ['efc-students-v1','efc-specialties-v1','efc-payment-methods-v1','efc-state-meta-v1'])forbid(loader,oldKey,'old EFC core storage key');

need(foundation,"LS_STUDENTS='centrat-students-v1'",'foundation student storage');
need(foundation,"LS_SPECS='centrat-specialties-v1'",'foundation specialty storage');
need(foundation,"LS_METHODS='centrat-payment-methods-v1'",'foundation method storage');
need(identity,"const KEY='centrat-identity-v1'",'identity storage');
need(auth,"const SECURITY_KEY='centrat-security-v11'",'security storage');
need(auth,"const CENTER_META_KEY='centrat-center-ops-meta-v13'",'security metadata storage');
need(auth,"const RECOVERY_KEY='centrat-admin-recovery-pending-v11'",'admin recovery storage');
need(auth,"const SESSION_KEY='centrat-current-user-v13'",'session storage');
need(domain,"expenses:'centrat-expenses-v11'",'expense storage');
need(domain,"methods:'centrat-payment-method-records-v11'",'payment-method records');
need(domain,"security:'centrat-security-v11'",'domain security storage');
need(domain,"localStorage.setItem('centrat-payment-methods-v1'",'active payment methods storage');
need(sequences,"const IDENTITY_KEY='centrat-identity-sequences-v11'",'receipt sequence storage');
need(fiscal,"const STORAGE_KEY='centrat-fiscal-state-v14'",'fiscal storage');
need(accounting,"const STORAGE_KEY='centrat-accounting-integrity-v21'",'accounting integrity storage');
need(bankUi,"const STORAGE_KEY='centrat-bank-state-v22'",'bank browser cache');
need(certUi,"const STORAGE_KEY='centrat-certificate-state-v1'",'certificate browser cache');

need(hooks,'CENTRAT_HOOK_DIR','Centrat installer hook namespace');
need(hooks,'centrat-icon-${VERSION}.ico','Centrat installed shortcut icon filename');
forbid(hooks,'efc-logo-${VERSION}.ico','old EFC installed icon filename');
need(workflow,'name: Build Centrat Windows Setup','distinct Windows build workflow');
need(workflow,'name: Centrat-Windows-Setup','distinct Windows installer artifact');

console.log('Centrat isolation verified: distinct bundle/binary/install identity, app-data database, browser storage, licensing directory/registry/device namespace, and installer artifacts.');
