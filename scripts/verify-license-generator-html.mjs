import fs from 'node:fs';

const verifier=fs.readFileSync('src-tauri/src/license.rs','utf8');
const readme=fs.readFileSync('tools/license-generator/README.md','utf8');

const KEY_ID='centrat-license-v1';
const SCHEMA='centrat-license';
const PUBLIC_KEY='BCFnHWzxVE0i_JkbGZcHUMv8HzdYrcLMjeqYtB9TgR4f5l2lPDpLYXsouALXRSZhwF4WPW94n3JIsev3_IvXC6c';
const FINGERPRINT='8B2E433B60CEAD0111EECC2E98B890EC15FBEEE9B05281D1485B0523EC2C081D';

for(const token of [SCHEMA,KEY_ID,'ECDSA_P256_SHA256',PUBLIC_KEY,'license.centrat-license','CTR-']){
  if(!verifier.includes(token))throw new Error(`Centrat license verifier missing: ${token}`);
}
for(const token of [SCHEMA,KEY_ID,'.centrat-license',FINGERPRINT,'self-contained signing generator','not stored in this public repository']){
  if(!readme.includes(token))throw new Error(`Private-generator contract documentation missing: ${token}`);
}
for(const forbidden of ['-----BEGIN PRIVATE KEY-----','"d":','PRIVATE_JWK','CENTRAT_PRIVATE_KEY']){
  if(verifier.includes(forbidden)||readme.includes(forbidden))throw new Error(`Private signing material leaked into the public repository: ${forbidden}`);
}
if(fs.existsSync('tools/license-generator/efc-license-generator.html'))throw new Error('Obsolete public EFC HTML generator must not remain in Centrat.');
if(fs.existsSync('tools/license-generator/src/main.rs')||fs.existsSync('tools/license-generator/Cargo.toml'))throw new Error('Obsolete public signing generator source must not remain in Centrat.');

console.log('Centrat license contract verified: public repo contains verify-only material, the private self-contained generator stays outside public source, and no PEM sidecar is required by the owner tool.');
