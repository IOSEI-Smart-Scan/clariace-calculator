const fs = require('node:fs');
const path = require('node:path');

const output = path.resolve('site');
const publicFiles = ['index.html', 'app.js', 'style.css'];
const publicAssets = ['assets/clariace-logo.png', 'assets/supabase-client.js'];

fs.mkdirSync(output, { recursive: true });
fs.mkdirSync(path.join(output, 'assets'), { recursive: true });

for (const file of publicFiles) {
  fs.copyFileSync(file, path.join(output, file));
}
for (const file of publicAssets) {
  fs.copyFileSync(file, path.join(output, file));
}
if (fs.existsSync('CNAME')) fs.copyFileSync('CNAME', path.join(output, 'CNAME'));
fs.writeFileSync(path.join(output, '.nojekyll'), '');

console.log('Frontend ClariACE montado em site/ sem planilhas, tabelas de dose ou migrações.');

