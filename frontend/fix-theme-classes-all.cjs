const fs = require('fs');
const path = require('path');

const walkSync = (dir, filelist = []) => {
  fs.readdirSync(dir).forEach(file => {
    const dirFile = path.join(dir, file);
    try {
      filelist = walkSync(dirFile, filelist);
    } catch (err) {
      if (err.code === 'ENOTDIR' || err.code === 'EBADF') filelist.push(dirFile);
    }
  });
  return filelist;
};

const fixClasses = (filePath) => {
  if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts')) return;
  
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // We want to avoid replacing already fixed strings like "dark:text-white" or "dark:text-slate-400"
  // So we use negative lookahead and lookbehind, or just a simple regex to replace standalone text-white
  // But since we already ran it on AdminDashboard, it might run again and break things if we aren't careful.
  // Actually, the regex `(?<!:)\btext-white\b` naturally avoids `dark:text-white` because of the colon.
  // BUT what if it's already `text-slate-900 dark:text-white`? It will match `text-white` inside `dark:text-white`?
  // NO, because `(?<!:)` means "not preceded by a colon". So `dark:text-white` won't be matched!
  // BUT wait, what about `text-white` in `text-slate-900 dark:text-white`? Is there another `text-white`? No, it's `dark:text-white`.
  // Wait, if a file has `text-white` alone, it becomes `text-slate-900 dark:text-white`.
  
  // Text Colors
  content = content.replace(/(?<!:|\w-)\btext-white\b/g, 'text-slate-900 dark:text-white');
  content = content.replace(/(?<!:|\w-)\btext-slate-200\b/g, 'text-slate-800 dark:text-slate-200');
  content = content.replace(/(?<!:|\w-)\btext-slate-300\b/g, 'text-slate-700 dark:text-slate-300');
  content = content.replace(/(?<!:|\w-)\btext-slate-400\b/g, 'text-slate-600 dark:text-slate-400');
  content = content.replace(/(?<!:|\w-)\btext-slate-500\b/g, 'text-slate-500 dark:text-slate-400');

  // Background Colors
  content = content.replace(/(?<!:|\w-)\bbg-slate-900\b/g, 'bg-white dark:bg-slate-900');
  content = content.replace(/(?<!:|\w-)\bbg-slate-800\b/g, 'bg-slate-50 dark:bg-slate-800');
  content = content.replace(/(?<!:|\w-)\bbg-slate-900\/50\b/g, 'bg-slate-100 dark:bg-slate-900/50');
  
  // Border Colors
  content = content.replace(/(?<!:|\w-)\bborder-white\/5\b/g, 'border-slate-200 dark:border-white/5');
  content = content.replace(/(?<!:|\w-)\bborder-white\/10\b/g, 'border-slate-300 dark:border-white/10');
  content = content.replace(/(?<!:|\w-)\bborder-white\/20\b/g, 'border-slate-300 dark:border-white/20');

  // Fix hover variants just in case
  content = content.replace(/\bhover:text-white\b/g, 'hover:text-slate-900 dark:hover:text-white');
  
  if (content !== original) {
    fs.writeFileSync(filePath, content);
    console.log('Fixed', filePath);
  }
};

const pages = walkSync('src/pages');
const components = walkSync('src/components');

[...pages, ...components].forEach(fixClasses);

console.log('Done fixing all classes.');
