import { cp, mkdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname } from 'node:path';

const runtimeFiles = [
  'index.html',
  'assets/production-ui-v13.css',
  'assets/production-certificates-ui-v13.css',
  'assets/production-home-background-v36.css',
  'assets/efc-login-geometry-v15.svg',
  'assets/efc-home-brand.webp',
  'production-loader.js',
  'assets/production-auth-bootstrap-v13.js',
  'efc-logo.svg',
  'assets/production-license-gate-v8.js',
  'assets/production-foundation-v13.js',
  'assets/production-receipts-v13.js',
  'assets/production-certificates-v13.js',
  'assets/production-domain-v13.js',
  'assets/production-monthly-prepayment-domain-v14.js',
  'assets/production-receipt-sequences-v10.js',
  'assets/production-student-lifecycle-domain-v20.js',
  'assets/production-student-ui-v13.js',
  'assets/production-registration-schedule-v13.js',
  'assets/production-finance-ui-v13.js',
  'assets/production-bank-v22.js',
  'assets/production-monthly-prepayment-ui-v14.js',
  'assets/production-registration-redesign-v15.js',
  'assets/production-registration-schedule-matrix-v17.js',
  'assets/production-courses-centers-redesign-v23.js',
  'assets/production-period-search-redesign-v28.js',
  'assets/production-sidebar-lock-v30.js',
  'assets/production-student-search-redesign-v31.js',
  'assets/production-student-lifecycle-ui-v20.js',
  'assets/production-fiscal-year-v14.js',
  'assets/production-security-ui-v13.js',
  'assets/production-accounting-integrity-v21.js'
];

const forbiddenProductionFiles = [
  '.demo-imported',
  'demo.css',
  'demo-app.js',
  'demo-period-merge.js',
  'demo-monthly-finance-v3.js',
  'demo-receipts-v4.js',
  'demo-v5-runtime-guard.js',
  'demo-brand-receipt-v5.js',
  'demo-repair-v6.js',
  'demo-receipt-layout-v7.js',
  'demo-fix-v8.js',
  'demo-receipt-logo-v9.js',
  'demo-receipt-compact-v10.js',
  'demo-receipt-paper-v11.js',
  'demo-receipt-clean-v12.js',
  'production-runtime.js',
  'production-monthly-merge-v2.js',
  'assets/production-student-profile-v3.js',
  'assets/production-registration-receipt-v4.js',
  'assets/production-ledger-finance-ui-v5.js',
  'assets/production-ledger-pdf-v6.js',
  'scripts/build-demo.mjs',
  'scripts/harden-production.mjs',
  'scripts/verify-center-ops-v11.mjs',
  'scripts/verify-production.mjs',
  'scripts/apply-reminder-document-polish.mjs',
  '.github/workflows/reminder-document-polish.yml',
  'assets/production-login-ui-v13.js',
  'assets/production-registration-responsive-v16.js',
  'assets/production-registration-select-native-v19.js',
  'assets/production-registration-receipt-schedule-v22.js',
  'assets/production-courses-centers-compact-v25.js',
  'assets/production-courses-centers-detail-fix-v27.js',
  'assets/production-search-detail-polish-v32.js',
  'assets/production-period-count-and-grid-polish-v33.js',
  'assets/production-search-title-grid-unify-v34.js',
  'assets/production-registration-select-overlay-v18.js',
  'assets/production-brand-polish-v24.js',
  'assets/production-courses-centers-order-fix-v26.js',
  'assets/production-unified-layout-v29.js',
  'assets/production-certificates-redesign-v35.js',
  'assets/production-certificates-workspace-v36.js',
  'assets/production-certificates-date-control-fix-v37.js',
  'assets/production-certificates-student-picker-v38.js',
  'assets/production-certificates-student-results-panel-v39.js',
  'assets/production-certificates-student-layout-v40.js',
  'assets/efc-logo-inline.txt',
  'assets/production-registration-schedule-compat-v20.js',
  'assets/production-registration-schedule-polish-v21.js'
];

for (const file of forbiddenProductionFiles) {
  if (existsSync(file)) throw new Error(`Obsolete EFC source still present in clean v13: ${file}`);
}

await rm('dist', { recursive: true, force: true });
await mkdir('dist', { recursive: true });

for (const file of runtimeFiles) {
  if (!existsSync(file)) throw new Error(`Missing EFC production runtime file: ${file}`);
  const target = `dist/${file}`;
  await mkdir(dirname(target), { recursive: true });
  await cp(file, target);
}

const vendorFiles = [
  ['node_modules/html2canvas/dist/html2canvas.min.js', 'dist/vendor/html2canvas.min.js'],
  ['node_modules/jspdf/dist/jspdf.umd.min.js', 'dist/vendor/jspdf.umd.min.js']
];
await mkdir('dist/vendor', { recursive: true });
for (const [source, target] of vendorFiles) {
  if (!existsSync(source)) throw new Error(`Missing offline PDF dependency: ${source}`);
  await cp(source, target);
}

for (const file of forbiddenProductionFiles) {
  if (existsSync(`dist/${file}`)) throw new Error(`Obsolete runtime leaked into production dist: ${file}`);
}

console.log('EFC production runtime copied to dist with monthly prepayment v14, student lifecycle v20, accounting integrity v21, registration schedule and receipt support, courses/centers/search refinements, one sidebar design source, one consolidated certificate renderer and stylesheet, canonical early login, and offline PDF libraries; obsolete runtime sources are absent.');
