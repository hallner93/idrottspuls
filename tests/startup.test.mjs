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

test('The revised design is active in production and available offline', async () => {
  const [html, cache, app, styles, appStyles] = await Promise.all([
    readFile(new URL('../web/index.html', import.meta.url), 'utf8'),
    readFile(new URL('../web/sw.js', import.meta.url), 'utf8'),
    readFile(new URL('../web/app.js', import.meta.url), 'utf8'),
    readFile(new URL('../web/styles-design.css', import.meta.url), 'utf8'),
    readFile(new URL('../web/styles.css', import.meta.url), 'utf8'),
  ]);
  assert.match(html, /styles-design\.css/);
  assert.match(cache, /styles-design\.css/);
  assert.match(app, /classList\.add\('design-ui'\)/);
  assert.match(styles, /html\.design-ui/);
  assert.match(styles, /html\.design-ui \.brand img\{filter:none;opacity:1\}/);
  assert.match(styles, /orientation:landscape\).*\.profile\{display:block\}/);
  assert.match(styles, /\.sidebar\{background:var\(--green-dark\)/);
  assert.match(styles, /\.btn\.primary\{background:var\(--green\)/);
  assert.match(styles, /\.day-button\.selected\{background:var\(--green\)/);
  assert.match(appStyles, /:root\[data-theme="blue"\]\{--green:#365b7c;--green-dark:#20384f;--sage:#e8f0f7\}/);
});

test('Final-assessment area comes from the lesson topic and is explained in the lesson view', async () => {
  const [app, model] = await Promise.all([
    readFile(new URL('../web/app.js', import.meta.url), 'utf8'),
    readFile(new URL('../web/model.js', import.meta.url), 'utf8'),
  ]);
  assert.match(app, /Området hämtas från fältet Vad arbetar ni med\?/);
  assert.match(app, /Detta namn blir områdesrubrik i Excel om Slutbedömning är markerad\./);
  assert.match(model, /finalArea: session\.finalAssessment \? session\.topic \|\| 'Ej angivet'/);
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
  assert.match(app, /function switchVideoCamera\(deviceId\)/);
  assert.match(app, /id="video-camera-select"/);
  assert.match(app, /rangeControl\('zoom'/);
  assert.match(app, /data-action="toggle-video-torch"/);
  assert.match(app, /video-exposureCompensation/);
  assert.match(app, /lesson-videos/);
  assert.match(app, /delete-all-videos/);
  assert.match(storage, /createObjectStore\('videos'/);
  assert.match(storage, /exportVideoCopy/);
  assert.match(html, /media-src 'self' blob:/);
  assert.match(activity, /MediaStore\.ACTION_VIDEO_CAPTURE/);
  assert.match(activity, /isCaptureEnabled\(\)/);
  assert.match(app, /setAttribute\('capture','environment'\)/);
  assert.match(activity, /writeVideoChunk/);
  assert.match(css, /\.video-library-controls/);
  assert.match(css, /\.next-step-card\{[^}]*border:2px solid var\(--green\)/);
  assert.match(cache, /idrottspuls-v1\.7\.8/);
  assert.doesNotMatch(manifest, /android\.permission\.CAMERA|android\.permission\.INTERNET|WRITE_EXTERNAL_STORAGE/);
  assert.match(app, /case 'capture-photo'/);
  assert.match(app, /id="final-student-search"/);
  assert.match(app, /renderFinalAssessmentCards/);
  assert.match(storage, /createObjectStore\('photos'/);
  assert.match(storage, /export async function deleteAllPhotos/);
  assert.match(activity, /MediaStore\.ACTION_IMAGE_CAPTURE/);
  assert.match(activity, /androidx\.core\.content\.FileProvider/);
  assert.match(manifest, /androidx\.core\.content\.FileProvider/);
});

test('Summary navigation combines absence, observations, and final assessments', async () => {
  const source = await readFile(new URL('../web/app.js', import.meta.url), 'utf8');
  assert.match(source, /\['videos','video','Video & bilder'\]/);
  assert.match(source, /function renderUnifiedSummary\(\)/);
  assert.match(source, /\['finals','Slutbedömningar'\]/);
  assert.match(source, /data-summary-sort/);
  assert.match(source, /sortFinalAssessmentRows\(/);
  assert.match(source, /data-home-stat=/);
  assert.match(source, /data-home-stat-card/);
  assert.match(source, /Lektioner för den valda dagen/);
  assert.match(source, /Sparade elevobservationer den valda dagen/);
  assert.match(source, /id="final-student-search"/);
  assert.match(source, /filterFinalAssessmentRows\(ui\.finalRows/);
  assert.match(source, /student:\{\.\.\.student,className:session\.className\|\|d\.classes\.find\(c=>c\.id===session\.classId\)\?\.name/);
});

test('Attendance roster shows a live present/total counter above and below the students', async () => {
  const source = await readFile(new URL('../web/app.js', import.meta.url), 'utf8');
  const styles = await readFile(new URL('../web/styles.css', import.meta.url), 'utf8');
  assert.match(source, /data-attendance-count data-total="\$\{students\.length\}" aria-live="polite">\$\{presentCount\}\/\$\{students\.length\} närvarande/g);
  assert.equal((source.match(/class="badge green attendance-count" data-attendance-count/g) || []).length, 2);
  assert.match(source, /if\(el\.dataset\.attendance==='absent'\)\{const present=s\.studentIds\.filter\(id=>!s\.attendanceDraft\[id\]\?\.absent\)\.length/);
  assert.match(styles, /\.attendance-count-bottom\{display:flex;justify-content:flex-end/);
});

