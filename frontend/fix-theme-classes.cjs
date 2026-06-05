const fs = require('fs');

const fixClasses = (filePath) => {
  let content = fs.readFileSync(filePath, 'utf8');

  // Text Colors
  content = content.replace(/(?<!:)\btext-white\b/g, 'text-slate-900 dark:text-white');
  content = content.replace(/(?<!:)\btext-slate-200\b/g, 'text-slate-800 dark:text-slate-200');
  content = content.replace(/(?<!:)\btext-slate-300\b/g, 'text-slate-700 dark:text-slate-300');
  content = content.replace(/(?<!:)\btext-slate-400\b/g, 'text-slate-600 dark:text-slate-400');
  content = content.replace(/(?<!:)\btext-slate-500\b/g, 'text-slate-500 dark:text-slate-400');

  // Background Colors
  content = content.replace(/(?<!:)\bbg-slate-900\b/g, 'bg-white dark:bg-slate-900');
  content = content.replace(/(?<!:)\bbg-slate-900\/50\b/g, 'bg-slate-100 dark:bg-slate-900/50');
  
  // Border Colors
  content = content.replace(/(?<!:)\bborder-white\/5\b/g, 'border-slate-200 dark:border-white/5');
  content = content.replace(/(?<!:)\bborder-white\/10\b/g, 'border-slate-300 dark:border-white/10');

  // Fix hover variants just in case
  content = content.replace(/\bhover:text-white\b/g, 'hover:text-slate-900 dark:hover:text-white');
  
  fs.writeFileSync(filePath, content);
};

['src/pages/AdminDashboard.tsx'].forEach(fixClasses);

console.log('Fixed classes in AdminDashboard.tsx');
