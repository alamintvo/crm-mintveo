const fs = require('fs');
const data = JSON.parse(fs.readFileSync('.open-next/server-functions/default/handler.mjs.meta.json'));
const inputs = Object.entries(data.inputs)
  .map(([path, info]) => ({path, bytes: info.bytes}))
  .sort((a,b) => b.bytes - a.bytes)
  .slice(0, 30);

console.log('Top 30 largest inputs:\n');
inputs.forEach((i, idx) => {
  const kb = (i.bytes/1024).toFixed(1);
  const filename = i.path.split(/[/\\]/).pop() || i.path;
  console.log(`${idx+1}. ${kb.padStart(8)} KB - ${filename}`);
});

console.log('\n\nSearching for @vercel/og...\n');
const vercelOg = Object.entries(data.inputs)
  .filter(([path]) => path.includes('@vercel/og'))
  .map(([path, info]) => ({path, bytes: info.bytes}));

if (vercelOg.length > 0) {
  console.log('Found @vercel/og files:');
  vercelOg.forEach(i => console.log(`  ${(i.bytes/1024).toFixed(1)} KB - ${i.path}`));
} else {
  console.log('No @vercel/og files found in bundle');
}
