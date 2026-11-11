import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const output = mkdtempSync(join(tmpdir(), 'mbokdhe-crm-tests-'));
try {
  const compile = spawnSync(process.execPath, ['node_modules/typescript/bin/tsc', 'lib/crm/contracts.ts', 'lib/crm/batch-workflow.ts', 'lib/crm/image.ts', '--outDir', output, '--module', 'commonjs', '--target', 'ES2022', '--esModuleInterop', '--skipLibCheck'], { stdio: 'inherit' });
  if (compile.status) process.exitCode = compile.status;
  else {
    const tests = spawnSync(process.execPath, ['--test', 'tests/workflow.test.mjs'], {
      stdio: 'inherit', env: { ...process.env, CRM_TEST_BUILD_DIR: output, NODE_PATH: join(process.cwd(), 'node_modules') },
    });
    process.exitCode = tests.status ?? 1;
  }
} finally { rmSync(output, { recursive: true, force: true }); }
