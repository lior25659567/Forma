// Bundles the production build into one self-contained HTML page (for sharing as a single file).
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const dist = 'dist/assets';
const files = readdirSync(dist);
const css = files.filter((f) => f.endsWith('.css')).map((f) => readFileSync(join(dist, f), 'utf8')).join('\n');
const js = files.filter((f) => f.endsWith('.js')).map((f) => readFileSync(join(dist, f), 'utf8')).join('\n');

const page = `<title>Forma</title>
<meta name="theme-color" content="#f2f0ec">
<style>
${css}
</style>
<div id="root"></div>
<script type="module">
${js.replace(/<\/script/gi, '<\\/script')}
</script>
`;
mkdirSync('artifact', { recursive: true });
writeFileSync('artifact/forma.html', page);
console.log(`artifact/forma.html ${(page.length / 1024).toFixed(0)} KB`);
