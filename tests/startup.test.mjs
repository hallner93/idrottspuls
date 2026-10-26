import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

test('Startup renders the workspace without a full storage rewrite', async () => {
  const source = await readFile(new URL('../web/app.js', import.meta.url), 'utf8');
  const startup = source.slice(source.lastIndexOf('\ntry {'));

  assert.match(startup, /workspace=await loadWorkspace\(\)/);
  assert.match(startup, /readRoute\(\);scheduleMidnightRefresh\(\)/);
  assert.doesNotMatch(startup, /await save\(\)/);
});


test('App entry module parses before the loading screen can initialize', () => {
  execFileSync(process.execPath, ['--check', fileURLToPath(new URL('../web/app.js', import.meta.url))]);
});
