import fs from 'fs';

const index = JSON.parse(fs.readFileSync('public/content/ai-signals/index.json', 'utf8'));
const published = index.items.filter(entry => entry.status === 'published');

const signals = [];
for (const entry of published) {
  try {
    const content = JSON.parse(fs.readFileSync(`public/content/ai-signals/${entry.file}`, 'utf8'));
    signals.push(content);
  } catch (e) {
    console.error(`Error reading ${entry.file}`);
  }
}

const count = signals.filter(s => s.title && s.title.includes('METR')).length;
console.log('Total METR signals:', count);
console.log('Files with METR:', signals.filter(s => s.title && s.title.includes('METR')).map(s => s.id));
