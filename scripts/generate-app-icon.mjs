import { mkdir, readFile, writeFile } from 'node:fs/promises';

const source = await readFile('efc-logo.svg', 'utf8');
const imageMatch = source.match(/<image\s+href="([^"]+)"/);
if (!imageMatch?.[1]?.startsWith('data:image/')) {
  throw new Error('EFC logo image data was not found in efc-logo.svg.');
}

const square = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="EFC">
  <rect x="24" y="24" width="464" height="464" rx="82" fill="white"/>
  <image href="${imageMatch[1]}" x="36" y="99" width="440" height="270" preserveAspectRatio="xMidYMid meet"/>
</svg>\n`;

await mkdir('src-tauri', { recursive: true });
await writeFile('src-tauri/app-icon.svg', square, 'utf8');
console.log('Generated square EFC app icon source from efc-logo.svg.');
