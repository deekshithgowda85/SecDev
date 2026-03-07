const fs = require('fs');
const pages = [
  ['deployments', 'Deployments', 'Deployment history and live status will appear here once connected to a real CI/CD backend.', 'Connect a Repository', '/console/github'],
  ['env', 'Environment Variables', 'Manage per-project secrets and env vars once backend storage is integrated.', 'View Repositories', '/console/github'],
  ['logs', 'Logs', 'Build and runtime logs will stream here once deployments are connected to a real backend.', 'View Repositories', '/console/github'],
  ['testing', 'Test Suite', 'Automated test results and coverage reports will appear here after CI integration.', 'Go to Dashboard', '/console/dashboard'],
  ['security', 'Security Scans', 'Vulnerability scan results and SAST reports will be shown here after integration.', 'Go to Dashboard', '/console/dashboard'],
  ['api-testing', 'API Testing', 'API endpoint tests and response monitoring will be available after integration.', 'Go to Dashboard', '/console/dashboard'],
  ['performance', 'Performance', 'Performance metrics, load tests, and benchmarks will appear here after integration.', 'Go to Dashboard', '/console/dashboard'],
  ['sandboxes', 'Sandboxes', 'Isolated preview environments and sandbox deployments will appear here after integration.', 'Go to Dashboard', '/console/dashboard'],
];

pages.forEach(([path, title, desc, ctaLabel, ctaHref]) => {
  const lines = [
    `import { NotImplemented } from "@/components/console/not-implemented";`,
    ``,
    `export default function Page() {`,
    `  return (`,
    `    <div className="max-w-4xl mx-auto">`,
    `      <div className="mb-8">`,
    `        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">${title}</h1>`,
    `      </div>`,
    `      <NotImplemented`,
    `        title="${title}"`,
    `        description="${desc}"`,
    `        cta={{ label: "${ctaLabel}", href: "${ctaHref}" }}`,
    `      />`,
    `    </div>`,
    `  );`,
    `}`,
    ``,
  ];
  const content = lines.join('\n');
  fs.writeFileSync(`d:/Projects/secdev/app/console/${path}/page.tsx`, content, 'utf8');
  console.log('wrote', path);
});
