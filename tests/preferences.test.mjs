import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dateKey, emptyData, upgradeData } from '../web/model.js';
import { THEMES, normalizeTheme, navigateToDate, refreshOverviewDate, returnToToday } from '../web/preferences.js';

test('overview follows the device local date while today mode is active', () => {
  const state = { page: 'overview', date: '2026-10-25', followsToday: true };
  assert.equal(refreshOverviewDate(state, '2026-10-26'), true);
  assert.equal(state.date, '2026-10-26');
  assert.equal(refreshOverviewDate(state, '2026-10-26'), false);
});

test('manual day and week browsing stays selected across date refreshes', () => {
  const state = { page: 'overview', date: '2026-10-26', followsToday: true };
  navigateToDate(state, '2026-10-19');
  assert.equal(refreshOverviewDate(state, '2026-10-27'), false);
  assert.equal(state.date, '2026-10-19');
});

test('returning to today resumes automatic date changes', () => {
  const state = { page: 'overview', date: '2026-10-19', followsToday: false };
  returnToToday(state, '2026-10-26');
  assert.equal(state.date, '2026-10-26');
  assert.equal(state.followsToday, true);
  assert.equal(refreshOverviewDate(state, '2026-10-27'), true);
  assert.equal(state.date, '2026-10-27');
});

test('date refresh waits until the overview is active, then uses the current date', () => {
  const state = { page: 'settings', date: '2026-10-25', followsToday: true };
  assert.equal(refreshOverviewDate(state, '2026-10-26'), false);
  assert.equal(state.date, '2026-10-25');
  state.page = 'overview';
  assert.equal(refreshOverviewDate(state, '2026-10-26'), true);
  assert.equal(state.date, '2026-10-26');
});

test('date keys use the device local calendar fields', () => {
  const localDate = new Date(2026, 9, 26, 23, 59);
  assert.equal(dateKey(localDate), '2026-10-26');
});

test('ten color themes include the original green and reject unknown values safely', () => {
  assert.equal(THEMES.length, 10);
  assert.equal(THEMES[0].id, 'green');
  assert.equal(THEMES[0].color, '#36594b');
  assert.equal(normalizeTheme('violet'), 'violet');
  assert.equal(normalizeTheme('unknown'), 'green');
});

test('the new preference module is included in the offline app cache', async () => {
  const serviceWorker = await readFile(new URL('../web/sw.js', import.meta.url), 'utf8');
  assert.match(serviceWorker, /['"]\.\/preferences\.js['"]/);
});

test('older local workspaces gain the default theme without changing lessons or students', () => {
  const original = emptyData();
  original.classes.push({ id: 'c1', name: 'Klass 1', color: 'green', students: [{ id: 's1', first: 'Test', last: 'Elev', archived: false }] });
  delete original.settings.theme;
  const upgraded = upgradeData(original);
  assert.equal(upgraded.settings.theme, 'green');
  assert.deepEqual(upgraded.classes, original.classes.map(c => ({ ...c, yearGroup: null })));
  assert.deepEqual(upgraded.sessions, original.sessions);
  assert.equal(original.settings.theme, undefined);
});
