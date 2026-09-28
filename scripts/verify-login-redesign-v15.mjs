import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const read=path=>readFileSync(path,'utf8');
const requireText=(text,needle,label=needle)=>{if(!text.includes(needle))throw new Error(`Login architecture missing: ${label}`);};
const forbidText=(text,needle,label=needle)=>{if(text.includes(needle))throw new Error(`Login architecture regression: ${label}`);};

const auth=read('assets/production-auth-bootstrap-v13.js');
const security=read('assets/production-security-ui-v13.js');
const gate=read('assets/production-license-gate-v8.js');
const build=read('scripts/build-production.mjs');
const packageJson=JSON.parse(read('package.json'));

execFileSync(process.execPath,['--check','assets/production-auth-bootstrap-v13.js'],{stdio:'inherit'});
execFileSync(process.execPath,['--check','assets/production-security-ui-v13.js'],{stdio:'inherit'});

for(const token of [
  'canonicalLoginRenderer:true','loginBeforeAppRuntime:true','noLegacyLoginRenderer:true','noLoginMutationObserver:true',
  'function renderMainLogin(overlay)','renderMainLogin(overlay);document.body.appendChild(overlay)',
  "event.formData.set('pin'",
  '#forgotV13','#resetV13','./efc-logo.svg','efc-login-redesign-v15','efc-login-slogan-v15','efc-login-version-v15',
  "const LOGIN_FONT='Segoe UI Variable'",'arabicFont:LOGIN_FONT','introRemoved:true','largerLogo:true','width:136px!important','height:112px!important'
])requireText(auth,token);

for(const token of ['canonicalLoginOwnedByAuth:true','noLegacyLoginRenderer:true','earlyAuthBootstrap:true','noLegacyLoginLayer:true'])requireText(security,token);
forbidText(security,'function mountLogin(','legacy security-owned login renderer');
forbidText(security,'window.EFC_ENHANCE_LOGIN_UI_V13','post-render login enhancement');
forbidText(security,'.login-card-v13{width:min(520px','old half-scale login CSS');
forbidText(auth,'new MutationObserver(','login mutation observer');
forbidText(auth,'observer.observe(document.body','wide login observer');
requireText(gate,"'./assets/production-auth-bootstrap-v13.js'",'early auth runtime');
requireText(gate,'await window.EFC_AUTH_BOOTSTRAP_V13.requireLogin()','login completes before heavy app runtime');
forbidText(gate,"'./assets/production-login-ui-v13.js'",'old post-security login runtime');
requireText(build,"'assets/production-auth-bootstrap-v13.js'",'auth bootstrap packaged');
requireText(build,"'assets/production-login-ui-v13.js'",'old login enhancer forbidden from source/dist');
if(!String(packageJson.version||''))throw new Error('Package version is missing.');
requireText(auth,`const APP_VERSION='${packageJson.version}'`,'displayed app version follows package.json');

console.log('Login architecture verification passed: the final login is the only login renderer, loads before heavy app UI, and no observer/legacy login layer remains.');
