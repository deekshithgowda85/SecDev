/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const content = [
  'import { redirect } from "next/navigation";',
  '',
  'export default function SolutionsRedirect() {',
  '  redirect("/docs");',
  '}',
  '',
].join('\n');
fs.writeFileSync('d:/Projects/secdev/app/solutions/page.tsx', content, 'utf8');
console.log('done');
