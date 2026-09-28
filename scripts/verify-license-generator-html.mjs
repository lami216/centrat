import fs from 'node:fs';

const file='tools/license-generator/efc-license-generator.html';
if(!fs.existsSync(file)) throw new Error('Missing HTML license generator.');
const html=fs.readFileSync(file,'utf8');
const rustVerifier=fs.readFileSync('src-tauri/src/license.rs','utf8');
const rustGenerator=fs.readFileSync('tools/license-generator/src/main.rs','utf8');

const KEY_ID='efc-license-v3';
const PUBLIC_KEY='BDDLo6mYqhmQbaUyS_xmMkebb3Nz28ZmWU3bF6alhqeXt7mxLrk_pxDc4vaz9RXV5mICatMtADIQvkF4EdLM8LY';
const PRIVATE_FILE='EFC-license-master-private-v3.pem';

const required=[
  'efc-license',
  KEY_ID,
  'ECDSA_P256_SHA256',
  'ECDSA',
  'P-256',
  'SHA-256',
  'crypto.subtle.importKey',
  'crypto.subtle.sign',
  PUBLIC_KEY,
  PRIVATE_FILE,
  'durationSeconds',
  'single-install'
];
for(const token of required){if(!html.includes(token))throw new Error(`HTML license generator missing: ${token}`);}
if(/-----BEGIN PRIVATE KEY-----[A-Za-z0-9+/=\s]+-----END PRIVATE KEY-----/.test(html))throw new Error('Private signing key must never be embedded in the public GitHub HTML template.');
if(/<script\s+[^>]*src=/i.test(html))throw new Error('HTML generator must not load external scripts.');
if(/https?:\/\//i.test(html))throw new Error('HTML generator must be fully offline.');

for(const [name,text] of [['Windows verifier',rustVerifier],['Rust generator',rustGenerator]]){
  if(!text.includes(KEY_ID))throw new Error(`${name} missing current key id ${KEY_ID}.`);
  if(!text.includes(PUBLIC_KEY))throw new Error(`${name} missing current activation public key.`);
  if(text.includes('efc-license-v2'))throw new Error(`${name} still contains the old activation key id.`);
}
if(!rustGenerator.includes(PRIVATE_FILE))throw new Error('Rust generator does not reference the current private-key filename.');

const matches=[...html.matchAll(/<script>([\s\S]*?)<\/script>/gi)];
if(matches.length!==1)throw new Error('Expected one inline generator script.');
new Function(matches[0][1]);

const order=['licenseId','customerName','centerName','deviceId','edition','type','durationSeconds','activationMode','notes'];
let last=-1;
for(const field of order){
  const index=html.indexOf(`${field}:`,last+1);
  if(index<0)throw new Error(`Canonical payload field missing: ${field}`);
  if(index<last)throw new Error('Canonical payload field order changed.');
  last=index;
}

console.log('HTML activation generator verified: offline public template, no embedded private key, activation signing key v3 matches Windows and Rust generators.');
