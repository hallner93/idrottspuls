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

test('The Android design preview is isolated and its stylesheet is available offline', async () => {
  const [html, cache, gradle, activity, styles] = await Promise.all([
    readFile(new URL('../web/index.html', import.meta.url), 'utf8'),
    readFile(new URL('../web/sw.js', import.meta.url), 'utf8'),
    readFile(new URL('../android/app/build.gradle', import.meta.url), 'utf8'),
    readFile(new URL('../android/app/src/main/java/se/idrottspuls/app/MainActivity.java', import.meta.url), 'utf8'),
    readFile(new URL('../web/styles-preview.css', import.meta.url), 'utf8'),
  ]);
  assert.match(html, /styles-preview\.css/);
  assert.match(cache, /styles-preview\.css/);
  assert.match(gradle, /applicationIdSuffix '\.preview'/);
  assert.match(gradle, /Idrottspuls Förhandsvisning/);
  assert.match(activity, /BUILD_TYPE/);
  assert.match(styles, /html\.preview-ui/);
});
