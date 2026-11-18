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

test('Video library is local, session-linked, deletable and exported separately', async () => {
  const [app, storage, html, activity, manifest, css, cache] = await Promise.all([
    readFile(new URL('../web/app.js', import.meta.url), 'utf8'),
    readFile(new URL('../web/storage.js', import.meta.url), 'utf8'),
    readFile(new URL('../web/index.html', import.meta.url), 'utf8'),
    readFile(new URL('../android/app/src/main/java/se/idrottspuls/app/MainActivity.java', import.meta.url), 'utf8'),
    readFile(new URL('../android/app/src/main/AndroidManifest.xml', import.meta.url), 'utf8'),
    readFile(new URL('../web/styles.css', import.meta.url), 'utf8'),
    readFile(new URL('../web/sw.js', import.meta.url), 'utf8'),
  ]);
  assert.match(app, /function renderVideoLibrary\(\)/);
  assert.match(app, /lesson-videos/);
  assert.match(app, /delete-all-videos/);
  assert.match(storage, /createObjectStore\('videos'/);
  assert.match(storage, /exportVideoCopy/);
  assert.match(html, /media-src 'self' blob:/);
  assert.match(manifest, /android\.permission\.CAMERA/);
  assert.match(activity, /RESOURCE_VIDEO_CAPTURE/);
  assert.match(activity, /writeVideoChunk/);
  assert.match(css, /\.video-library-controls/);
  assert.match(cache, /idrottspuls-v1\.7\.0/);
  assert.doesNotMatch(manifest, /android\.permission\.INTERNET|WRITE_EXTERNAL_STORAGE/);
});

test('Summary navigation combines absence, observations, and final assessments', async () => {
  const source = await readFile(new URL('../web/app.js', import.meta.url), 'utf8');
  assert.match(source, /\['videos','video','Videobibliotek'\]/);
  assert.match(source, /function renderUnifiedSummary\(\)/);
  assert.match(source, /\['finals','Slutbedömningar'\]/);
  assert.match(source, /data-home-stat=/);
  assert.match(source, /data-home-stat-card/);
});
