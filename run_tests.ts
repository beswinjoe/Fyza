import { spawnSync } from 'child_process';

const suites = [
  { name: 'Financial Engine & Invariants', file: 'test_finance.ts' },
  { name: 'Persistence, Hydration & Backups', file: 'test_persistence.ts' },
  { name: 'Capabilities & Profiles', file: 'test_capabilities.ts' },
  { name: 'Trips & Budgets', file: 'test_trips.ts' },
  { name: 'Trip Regressions', file: 'test_regression_trips.ts' },
  { name: 'AI Action & Tool Safety', file: 'test_ai.ts' },
  { name: 'Atmosphere & Themes', file: 'test_atmosphere.ts' },
  { name: 'End-to-End Integration', file: 'test_integration.ts' },
  { name: 'Audit Hardening & Ledger', file: 'test_audit_hardening.ts' },
  { name: 'General Regressions', file: 'test_regression.ts' },
];

console.log('====================================================');
console.log('   Fyza Master Test Suite Runner');
console.log('====================================================\n');

let allPassed = true;
const results: Array<{ name: string; file: string; passed: boolean; durationMs: number }> = [];

for (const suite of suites) {
  process.stdout.write(`▶ Running ${suite.name} (${suite.file})... `);
  const start = Date.now();
  const res = spawnSync('npx', ['--yes', 'tsx', suite.file], {
    stdio: 'pipe',
    encoding: 'utf-8',
    env: { ...process.env },
  });
  const durationMs = Date.now() - start;

  if (res.status === 0) {
    console.log(`✓ PASS (${durationMs}ms)`);
    results.push({ ...suite, passed: true, durationMs });
  } else {
    console.log(`✗ FAIL (${durationMs}ms)`);
    if (res.stderr) console.error(res.stderr);
    if (res.stdout) console.log(res.stdout);
    results.push({ ...suite, passed: false, durationMs });
    allPassed = false;
  }
}

console.log('\n====================================================');
console.log('   Test Execution Summary');
console.log('====================================================');
for (const r of results) {
  console.log(` ${r.passed ? '✓ PASS' : '✗ FAIL'} [${r.durationMs}ms] ${r.name}`);
}
console.log('====================================================');

if (allPassed) {
  console.log('🎉 All test suites passed successfully!\n');
  process.exit(0);
} else {
  console.error('❌ One or more test suites failed.\n');
  process.exit(1);
}
