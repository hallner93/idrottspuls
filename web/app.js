Warning: truncated output (original token count: 18927)
Total output lines: 375

import { SCHEMA, GRADES, ASSESSMENTS, DAYS, uid, clone, dateKey, parseDate, addDays, emptyData, studentName, searchClasses, unfinishedSessions, parseStudentList, validateStudentList, roster, sessionStudents, lessonsForDate, scheduleBreakForDate, materialize, blankAttendance, followup, flaggedStudents, filteredSessions, studentFinalAssessments, studentStats, reportedLessons, observationAssessments, observationGrades, observationLabel, gradeLabel, hasObservation, toggleObservationChoice, EXPORT_FIELDS, exportRows, exportRowsByStudent, parseBackup } from './model.js';
import { loadWorkspace, persist, storageType, requestPersistence, downloadFile } from './storage.js';
import { createXlsx } from './xlsx.js';
import { THEMES, normalizeTheme, refreshOverviewDate, navigateToDate, returnToToday } from './preferences.js';

const root = document.querySelector('#app'), modal = document.querySelector('#modal');
const esc = value => String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
const icons = {
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18m-13 4h2m4 0h2m-8 3h2"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-3.87M15 3.13a4 4 0 0 1 0 7.75"/><circle cx="9" cy="7" r="4"/>',
  chart: '<path d="M3 3v18h18M7 16v-4m5 4V7m5 9v-6"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
  settings: '<path d="m9 3-.5 3-2 1.2-2.9-1L2 10l2.4 2v2l-2 2 2 3.5 3-1 2 1 .6 3h4l.6-3 2-1 3 1 2-3.5-2-2v-2l2-2-2-3.5-3 1-2-1-.6-3z"/><circle cx="12" cy="12" r="3"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
  left: '<path d="m14 6-6 6 6 6"/>', right: '<path d="m10 6 6 6-6 6"/>',
  check: '<path d="m5 12 4 4L19 6"/>', checkcircle:'<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  pin: '<path d="M20 10c0 6-8 11-8 11S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
  flag: '<path d="M5 21V3m0 1c5-4 9 4 14 0v10c-5 4-9-4-14 0"/>',
  shield: '<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6z"/><path d="m8 12 3 3 5-6"/>',
  leaf: '<path d="M20 4C9 2 2 8 5 15c3 7 16 4 15-11ZM4 21 15 10"/>',
  sparkles: '<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z"/>',
  thumb: '<path d="M7 10v11H3V10Zm0 10h10a2 2 0 0 0 2-1.6l2-8A2 2 0 0 0 19 8h-5l1-4c0-2-3-2-3-1L7 10"/>',
  trend: '<path d="m3 6 6 6 4-4 8 10m-7 0h7v-7"/>',
  circle: '<circle cx="12" cy="12" r="9"/><path d="m8 8 8 8m0-8-8 8"/>',
  pause: '<circle cx="12" cy="12" r="9"/><path d="M9 8v8m6-8v8"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  edit: '<path d="m15 5 4 4M4 20l5-1L21 7a2.8 2.8 0 0 0-4-4L5 15z"/>',
  trash: '<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/>',
  restore: '<path d="M3 11a9 9 0 1 1 3 8M3 4v7h7m2-4v6l4 2"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 8l5-5 5 5M12 3v12"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v.1"/>',
  book: '<path d="M12 5c-4-3-8-2-10-1v16c3-1 7-2 10 1 3-3 7-2 10-1V4c-2-1-6-2-10 1Zm0 0v16"/>',
};
const icon = (name, size = 19) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.circle}</svg>`;
const initials = s => `${s.first?.[0] || ''}${s.last?.[0] || ''}`;
const btn = (label, action, cls = '', extra = '') => `<button type="button" class="btn ${cls}" data-action="${action}" ${extra}>${label}</button>`;
const badge = (label, tone = '') => `<span class="badge ${tone}">${label}</span>`;
const info = (text, tone = '') => `<div class="info-box ${tone}">${icon('info',17)}<span>${text}</span></div>`;
const empty = (title, text, action = '') => `<div class="empty"><div class="empty-icon">${icon('book',28)}</div><h2>${title}</h2><p>${text}</p>${action}</div>`;
const formatDate = value => parseDate(value).toLocaleDateString('sv-SE',{day:'numeric',month:'long'});
const formatFullDate = value => parseDate(value).toLocaleDateString('sv-SE',{weekday:'long',day:'numeric',month:'long'});
const timeLabel = value => value ? new Date(value).toLocaleString('sv-SE',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}) : 'Inte skapad ännu';
let workspace, saveTimer, saveError = '', saving = false, toastTimer, installPrompt, dateChangeTimer;
const ui = { page: 'overview', date: dateKey(), followsToday: true, sessionId: null, step: 'attendance', summaryTab: 'attendance', filters: { classId:'', from:'', to:dateKey() }, exportFilters:{ classId:'', from:'', to:dateKey() }, exportMode:'student', fields:EXPORT_FIELDS.map(f => f[0]), studentQuery:'', classQuery:'', showArchived:false };
const data = () => workspace[workspace.active];
function refreshDisplayedDate() { if (refreshOverviewDate(ui,dateKey())) render(); }
function scheduleMidnightRefresh() {
  clearTimeout(dateChangeTimer);
  const now = new Date(), nextMidnight = new Date(now.getFullYear(),now.getMonth(),now.getDate()+1,0,0,1);
  dateChangeTimer = setTimeout(() => { refreshDisplayedDate(); scheduleMidnightRefresh(); }, Math.max(1000,nextMidnight-now));
}
const getClass = id => data().classes.find(c => c.id === id);
const getSession = () => data().sessions.find(s => s.id === ui.sessionId);
const currentStudents = () => data().classes.reduce((n,c) => n + c.students.filter(s => !s.archived).length,0);
function toast(message, error = false) { const t = document.querySelector('#toast'); t.textContent = message; t.className = `show${error ? ' error' : ''}`; clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.className = ''; },4500); }
function updateSaveIndicator() { const el = document.querySelector('#save-status'); if (el) { el.className = `status${saveError ? ' error' : ''}`; el.innerHTML = `${icon(saveError ? 'info' : 'shield',14)}${saveError ? 'Kunde inte spara' : saving ? 'Sparar på enheten…' : 'Sparat på enheten'}`; } }
async function save() {
  clearTimeout(saveTimer); saveTimer = null; saving = true; updateSaveIndicator();
  try { await persist(workspace); saveError = ''; }
  catch (e) { saveError = e.message || 'Lagringen fungerar inte.'; toast('Kunde inte spara. Behåll appen öppen och skapa en säkerhetskopia.',true); throw e; }
  finally { saving = false; updateSaveIndicator(); const alert = document.querySelector('#storage-alert'); if (alert) { alert.hidden = !saveError; alert.textContent = saveError ? `Sparningen misslyckades: ${saveError}. Behåll appen öppen. Exportera en säkerhetskopia eller frigör lagringsutrymme och försök spara igen.` : ''; } }
}
function queueSave() { saving = true; updateSaveIndicator(); clearTimeout(saveTimer); saveTimer = setTimeout(() => save().catch(() => {}), 250); }
const navItems = [['overview','grid','Översikt'],['schedule','calendar','Veckoschema'],['classes','users','Klasser & elever'],['summary','chart','Sammanställning'],['export','download','Export & backup']];
const pageTitles = {overview:'Översikt',schedule:'Veckoschema',classes:'Klasser & elever',summary:'Sammanställning',export:'Export & backup',settings:'Inställningar',lesson:'Pågående lektion'};
function render() {
  if (!workspace) return;
  document.documentElement.dataset.theme = normalizeTheme(data().settings.theme);
  const settings = data().settings;
  root.innerHTML = `<div class="app-shell"><aside class="sidebar"><a class="brand" href="#/overview"><img src="icon.svg" alt=""><span>idrottspuls<span class="text-green">.</span></span></a><div class="brand-note">Din undervisning, samlad.</div><div class="nav-caption">DIN LEKTIONSBOK</div><nav class="nav" aria-label="Huvudmeny">${navItems.map(([id,i,label]) => `<a href="#/${id}" class="nav-link ${ui.page === id ? 'active' : ''}" ${ui.page === id ? 'aria-current="page"' : ''} title="${label}">${icon(i)}<span>${label}</span></a>`).join('')}</nav><div class="sidebar-bottom"><a class="nav-link ${ui.page === 'settings' ? 'active' : ''}" href="#/settings">${icon('settings')}<span>Inställningar</span></a><div class="local-card"><div class="flex">${icon('shield',16)}<strong>Allt stannar hos dig</strong></div><p>Dina klasser och observationer sparas på den här enheten.</p></div><div class="profile flex"><div class="avatar">${settings.teacher ? esc(settings.teacher.split(' ').map(p => p[0]).slice(0,2).join('')) : 'IL'}</div><div><strong>${esc(settings.teacher || 'Min lektionsbok')}</strong><small>${esc(settings.school || 'Idrott & hälsa')}</small></div></div></div></aside><div class="main-area"><header class="topbar"><div class="topbar-title">Din lektionsbok <span class="muted">/</span> <strong>${pageTitles[ui.page]}</strong></div><a class="mobile-brand" href="#/overview"><img src="icon.svg" alt="">idrottspuls.</a><div class="topbar-actions"><div id="save-status" class="status"></div>${installPrompt ? btn(`${icon('download',14)} Installera`,'install','small') : ''}<a class="icon-btn" href="#/settings" aria-label="Inställningar">${icon('settings',18)}</a></div></header><div id="storage-alert" class="storage-alert" ${!saveError ? 'hidden' : ''}>${esc(saveError)}</div><main class="content" id="main-content">${workspace.active === 'demo' ? `<div class="demo-banner"><span>${icon('sparkles',14)} <strong>Du provar Idrottspuls.</strong> Alla elever och uppgifter här är fiktiva.</span><button data-action="real-mode">Börja med egna klasser ${icon('arrow',13)}</button></div>` : ''}${renderPage()}<div class="bottom-note">${icon('leaf',12)} Lite mindre administration. Lite mer rörelse.</div></main></div></div>`;
  updateSaveIndicator(); applyProgress();
}
function applyProgress() { document.querySelectorAll('[data-progress]').forEach(el => el.style.setProperty('--progress', `${Math.max(0,Math.min(100,Number(el.dataset.progress)||0))}%`)); }
function heading(title, subtitle, actions = '') { return `<div class="page-heading"><div><h1>${title}</h1><p>${subtitle}</p></div>${actions ? `<div class="heading-actions">${actions}</div>` : ''}</div>`; }
function renderPage() { switch(ui.page) { case 'schedule':return renderSchedule();case 'classes':return renderClasses();case 'summary':return renderSummary();case 'export':return renderExport();case 'settings':return renderSettings();case 'lesson':return renderLesson();default:return renderOverview(); } }
function weekNumber(value) { const d = parseDate(value); d.setDate(d.getDate()+4-(d.getDay()||7)); const first = new Date(d.getFullYear(),0,1); return Math.ceil((((d-first)/86400000)+1)/7); }
function renderOverview() {
  const d = data(), lessons = lessonsForDate(d,ui.date), flags = flaggedStudents(d), paused = scheduleBreakForDate(d,ui.date);
  const students = lessons.reduce((n,l) => n + (l.studentIds?.length ?? roster(d,l.classId).length),0), saved = lessons.filter(l => l.attendanceSavedAt).length;
  const monday = addDays(ui.date,1-(parseDate(ui.date).getDay()||7));
  return `${heading('Dagens lektioner',`${esc(formatFullDate(ui.date))} <span class="muted">&nbsp;·&nbsp; Vecka ${weekNumber(ui.date)}</span>`,btn(`${icon('plus',17)} Lägg till lektion`,'add-lesson'))}<div class="stats"><div class="stat"><div class="stat-icon">${icon('calendar',23)}</div><div><div class="stat-label">Lektioner idag</div><div class="stat-value">${lessons.length} <small>lektioner</small></div></div></div><div class="stat"><div class="stat-icon">${icon('users',23)}</div><div><div class="stat-label">Elevtillfällen idag</div><div class="stat-value">${students} <small>elevtillfällen</small></div></div></div><div class="stat"><div class="stat-icon">${icon('checkcircle',23)}</div><div><div class="stat-label">Närvaro registrerad</div><div class="stat-value">${saved}<small> / ${lessons.length} lektioner</small></div></div></div></div><div class="dashboard-grid"><section><div class="section-title"><h2>Ditt schema</h2><div class="date-nav"><button class="icon-btn" data-action="date-shift" data-days="-7" aria-label="Föregående vecka">${icon('left',14)}</button><button class="btn ${ui.followsToday?'ghost':'primary'}" data-action="today" aria-label="${ui.followsToday?'Visa dagens datum':'Återgå till dagens datum'}">${ui.followsToday?'Idag':'Till idag'}</button><button class="icon-btn" data-action="date-shift" data-days="7" aria-label="Nästa vecka">${icon('right',14)}</button></div></div><div class="week-strip" aria-label="Välj dag">${Array.from({length:7},(_,i) => { const day = addDays(monday,i); return `<button class="day-button ${day===ui.date?'selected':''} ${day===dateKey()?'today':''}" data-action="select-date" data-date="${day}" aria-pressed="${day===ui.date}" aria-label="${esc(formatFullDate(day))}"><small>${DAYS[parseDate(day).getDay()].slice(0,3)}</small><strong>${parseDate(day).getDate()}</strong></button>`; }).join('')}</div>${paused ? `${info(`Schemapaus: ${esc(paused.label)}. Återkommande lektioner visas inte denna dag. Sparade och extra lektioner finns kvar.`, 'amber')}<div class="section-space"></div>` : ''}${lessons.length ? lessons.map(renderLessonCard).join('') : `<div class="card">${empty('Plats för rörelse','Inga lektioner är planerade den här dagen. Lägg till en lektion eller fyll i ditt veckoschema.',btn('Lägg till lektion','add-lesson','primary'))}</div>`}</section><aside class="dashboard-aside"><div class="card followup-card"><div class="followup-title">${icon('flag',17)}<strong>Att följa upp</strong><span class="count-badge">${flags.length}</span></div><p class="followup-intro">Fånga upp behov och ge varje elev rätt stöd.</p>${flags.length ? flags.slice(0,4).map(s => `<button class="followup-person" data-action="student-history" data-id="${esc(s.id)}"><div class="avatar">${esc(initials(s))}</div><div><strong>${esc(studentName(s))}</strong><small>${esc(s.className)} · ${s.manual?'Manuellt markerad':`${s.count} tillfällen`}</small></div>${icon('right',13)}</button>`).join('') : `<p class="inline-note">${icon('checkcircle',15)} Inga aktiva uppföljningar.</p>`}<div class="card-foot">Automatisk markering efter ${d.settings.threshold} tillfällen. Gäller från ${formatDate(d.settings.termStart)}.</div><a class="link-button space-top" href="#/summary">Visa sammanställning ${icon('arrow',13)}</a></div><section class="card unfinished-card">${renderUnfinishedLessons()}</section></aside></div>`;
}
function renderUnfinishedLessons() {
  const pending=unfinishedSessions(data());
  return `<div class="unfinished-heading">${icon('checkcircle',17)}<h3>Oavslutade lektioner</h3>${badge(String(pending.length),'green')}</div><p class="helper">Fortsätt där du slutade eller slutför ett påbörjat pass.</p>${pending.length?`<div class="unfinished-list">${pending.map(s=>{const className=s.className||getClass(s.classId)?.name||'Klass',students=sessionStudents(data(),s).filter(st=>!s.attendance[st.id]?.absent),missing=students.filter(st=>!hasObservation(s.observations[st.id])).length,status=s.attendanceDraft?'Närvaro behöver sparas':!s.attendanceSavedAt?'Närvaro behöver bekräftas':s.skipObservation?'Redo att avsluta':missing?`${missing} observationer kvar`:'Redo att avsluta';return `<button type="button" class="unfinished-lesson" data-action="resume-unfinished" data-id="${esc(s.id)}" aria-label="Fortsätt ${esc(className)}, ${esc(formatFullDate(s.date))}"><span class="unfinished-date">${esc(formatDate(s.date))}<small>${esc(s.start)}–${esc(s.end)}</small></span><span class="unfinished-detail"><strong>${esc(className)} · ${esc(s.topic||'Idrott & hälsa')}</strong><small>${esc(status)}</small></span>${icon('right',14)}</button>`;}).join('')}</div>`:`<p class="inline-note unfinished-empty">Inga oavslutade lektioner just nu. Påbörjade pass visas här tills de är avslutade.</p>`}`;
}
function renderLessonCard(l) {
  const c = getClass(l.classId), flags = (l.studentIds || roster(data(),l.classId).map(s => s.id)).filter(id => followup(data(),id).flagged).length;
  const status = l.complete ? badge(`${icon('check',11)} Avslutad`,'green') : l.attendanceSavedAt ? badge('Påbörjad','coral') : badge('Planerad');
  return `<article class="lesson-card"><div class="time-column">${esc(l.start)}<small>${esc(l.end)}</small></div><div class="lesson-body ${c?.color==='coral'?'coral':c?.color==='blue'?'blue':''}"><div class="lesson-card-top"><span class="class-label">${esc(l.className || c?.name || 'Klass')}</span>${status}</div><div class="lesson-topic">${esc(l.topic || 'Idrott & hälsa')}</div><div class="lesson-meta"><span>${icon('users',13)}${l.studentIds?.length ?? roster(data(),l.classId).length} elever</span><span>${icon('pin',13)}${esc(l.location || 'Ingen plats angiven')}</span><span>${icon('clock',13)}${Math.round((parseDateTime(l.end)-parseDateTime(l.start))/60000)} min</span></div><div class="lesson-card-bottom"><span class="muted">${flags ? badge(`${icon('flag',11)} ${flags} att följa upp`,'amber') : 'Redo när du är'}</span>${btn(`${l.complete?'Öppna lektion':l.attendanceSavedAt?'Fortsätt lektion':'Starta lektion'} ${icon('arrow',14)}`,'open-lesson',l.complete?'small':'primary small',`data-id="${esc(l.id)}"`)}</div></div></article>`;
}
const parseDateTime = time => new Date(`2000-01-01T${time}:00`);
function renderSchedule() {
  const breaks = [...(data().breaks || [])].sort((a,b) => a.start.localeCompare(b.start));
  return `${heading('Veckoschema','Lägg in återkommande lektioner och koppla dem till dina klasser.',btn(`${icon('plus',17)} Ny schemalektion`,'add-schedule','primary'))}${info('Veckoschemat upprepas varje vecka. Sparade lektioner behåller sin historik när du ändrar schemat.')}
<section class="card section-space break-section">
  <div class="flex between wrap">
    <div><h2>Lov och studiedagar</h2><p class="inline-note">Välj dagar eller veckor då ordinarie lektioner inte ska visas. Veckoschemat påverkas inte.</p></div>
    ${btn(`${icon('plus',15)} Lägg till uppehåll`,'add-break','primary small')}
  </div>
  ${breaks.length ? `<div class="break-list">${breaks.map(b => `<div class="break-row"><div><strong>${esc(b.label)}</strong><small>${esc(formatFullDate(b.start))}${b.end===b.start?'':` – ${esc(formatFullDate(b.end))}`}</small></div>${btn(`${icon('trash',14)} Ta bort`,'delete-break','small danger',`data-id="${esc(b.id)}"`)}</div>`).join('')}</div>` : `<p class="inline-note space-top">Inga uppehåll tillagda ännu.</p>`}
</section><div class="schedule-grid section-space">${[1,2,3,4,5,6,0].map(day => { const list = data().schedules.filter(s => s.day===day).sort((a,b)=>a.start.localeCompare(b.start)); return `<section class="schedule-day"><div class="schedule-day-heading">${DAYS[day]}<span class="muted">${list.length}</span></div>${list.map(s => `<article class="schedule-item"><div class="time">${esc(s.start)} – ${esc(s.end)}</div><div class="class-label space-top">${esc(getClass(s.classId)?.name)}</div><p>${esc(s.topic || 'Idrott & hälsa')}<br>${esc(s.location || 'Ingen plats')}</p>${btn(`${icon('edit',12)} Ändra`,'edit-schedule','small',`data-id="${esc(s.id)}"`)}</article>`).join('')}${btn(`${icon('plus',13)} Lägg till`,'add-schedule','small ghost',`data-day="${day}"`)}</section>`; }).join('')}</div>${!data().classes.length ? `<div class="card section-space">${empty('Börja med en klass','Skapa klasser och lägg till elever innan du planerar lektioner.',btn('Skapa första klassen','add-class','primary'))}</div>` : ''}`;
}
function renderClasses() {
  const classes=data().classes;
  const searchable=c=>`${c.name} ${c.students.filter(s=>!s.archived).map(studentName).join(' ')}`.toLocaleLowerCase('sv');
  const visible=searchClasses(classes,ui.classQuery);
  return `${heading('Klasser & elever',`${classes.length} klasser · ${currentStudents()} aktiva elever`,btn(`${icon('plus',17)} Ny klass`,'add-class','primary'))}${classes.length ? `<div class="toolbar class-search-toolbar"><div class="grow"><strong>Sök bland klasser</strong><span class="helper" id="class-search-count">Visar ${visible.length} av ${classes.length} klasser</span></div><div class="search-wrap">${icon('search',16)}<input class="search" id="class-search" value="${esc(ui.classQuery)}" placeholder="Sök klass eller elev…" aria-label="Sök klass eller elev"></div></div><div class="class-grid">${classes.map(c => `<article class="card class-card" data-class-search="${esc(searchable(c))}" ${visible.includes(c)?'':'hidden'}><div class="flex between"><div class="class-icon">${esc(c.name)}</div>${badge(`${c.students.filter(s=>!s.archived).length} elever`,'green')}</div><h2>Klass ${esc(c.name)}</h2><p>${data().schedules.filter(s=>s.classId===c.id).length} lektioner i veckoschemat</p><p>${roster(data(),c.id).filter(s=>followup(data(),s.id).flagged).length} elever att följa upp</p>${btn(`Hantera klass ${icon('arrow',14)}`,'manage-class','',`data-id="${esc(c.id)}"`)}</article>`).join('')}</div><div id="class-search-empty" class="card section-space" ${visible.length?'hidden':''}>${empty('Inga träffar','Prova ett annat klass- eller elevnamn.')}</div>` : `<div class="card">${empty('Din första klass börjar här','Lägg till ett klassnamn och klistra in din elevlista. Du kan lägga till och ändra elever senare.',btn(`${icon('plus',17)} Skapa klass`,'add-class','primary'))}</div>`}`;
}
function renderLesson() {
  const s = getSession(); if (!s) return empty('Lektionen hittades inte','Öppna lektionen från översikten.','<a class="btn primary" href="#/overview">Till översikt</a>');
  const students = sessionStudents(data(),s), isAttendance = ui.step==='attendance';
  const att = s.attendanceDraft || s.attendance, eligible = students.filter(st=>!s.attendance[st.id]?.absent), observed = eligible.filter(st => {const o=s.observations[st.id];return hasObservation(o);}).length;
  return `${heading(`Klass ${esc(s.className || getClass(s.classId)?.name)}`,`${esc(formatFullDate(s.date))} · ${esc(s.start)}–${esc(s.end)} · ${esc(s.location || 'Ingen plats angiven')}`,`<a class="btn" href="#/overview">${icon('left',15)} Översikt</a>`)}<div class="steps"><span class="step ${isAttendance?'active':''}"><b>${s.attendanceSavedAt?'✓':'1'}</b> Närvaro</span><span class="line"></span><span class="step ${!isAttendance?'active':''}"><b>2</b> Observation</span><span class="line"></span><span class="step"><b>${s.complete?'✓':'3'}</b> Avsluta</span></div><label class="switch-box lesson-final-assessment"><input type="checkbox" data-session-field="finalAssessment" ${s.finalAssessment?'checked':''}><span><strong>Slutbedömning</strong><small>Markera när området avslutas. Visas för eleven i sammanställningen och i Excel.</small></span></label>${isAttendance ? `<div class="card"><div class="panel-header"><div><h2>Vilka är med idag?</h2><p class="inline-note">Alla räknas som närvarande när du sparar. Markera avvikelser.</p></div><span class="badge green">${students.length} elever</span></div>${students.length ? `<div class="table-wrap"><table class="data-table attendance-table"><thead><tr><th class="name-cell">Elev · efternamnsordning</th><th class="center">Frånvaro</th><th class="center">Glömt kläder</th><th class="center">Glömt skor</th><th class="center">Sen ankomst<br>(minuter)</th></tr></thead><tbody>${students.map(st=>{ const a=att[st.id]||blankAttendance(), f=followup(data(),st.id);return `<tr class="${a.absent?'absent':''}" data-student-row="${esc(st.id)}"><td class="name-cell"><div class="student-name">${esc(studentName(st))}${f.flagged?`<small>${badge(`${icon('flag',10)} Uppföljning · ${f.manual?'manuell':f.count+' tillfällen'}`,'amber')}</small>`:''}</div></td>${['absent','clothes','shoes'].map((key…6927 tokens truncated…nLabel(s.observations[studentId])||'Ingen observationsmarkering')}</p></div>`).join('')}</div>`:''}`,`${btn('Rensa val','clear-observation','ghost push-left')}${btn('Spara','save-observation')}${btn(`Spara & nästa ${icon('arrow',14)}`,'save-next','primary')}`);
}
function refreshObservationChoices(message = '') {
  modal.querySelectorAll('[data-action="assessment"], [data-action="grade"]').forEach(button => {
    const selected = button.dataset.action === 'grade' ? observationDraft.grades.includes(button.dataset.grade) : observationDraft.assessments.includes(button.dataset.value);
    button.classList.toggle('selected', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
  const status = modal.querySelector('#grade-selection-status');
  status.textContent = message || `${observationDraft.grades.length} av 2 betyg valda. Tryck igen för att avmarkera.`;
  status.classList.toggle('choice-warning', !!message);
}
function showHistory(studentId) {
  const c=data().classes.find(c=>c.students.some(s=>s.id===studentId)), student=c?.students.find(s=>s.id===studentId); if (!student) return;
  const entries=filteredSessions(data(),{}).filter(s=>s.studentIds.includes(studentId)), finalAssessments=studentFinalAssessments(data(),studentId,entries), f=followup(data(),studentId), stats=studentStats(data(),student,entries);
  showDialog(esc(studentName(student)),`Klass ${esc(c.name)} · ${entries.length} sparade lektioner`,`${f.flagged?info(`${f.manual?'Manuellt markerad för uppföljning.':f.count+' negativa tillfällen sedan terminens start eller senaste genomförda uppföljning.'}`,'amber'):info(`Ingen aktiv uppföljning. ${f.count} av ${data().settings.threshold} negativa tillfällen.`)}<div class="flex wrap section-space">${badge(`${stats.present}/${stats.total} närvarande`,'green')}${badge(`${stats.clothes} glömda kläder`)}${badge(`${stats.shoes} glömda skor`)}${badge(`${stats.late} sena ankomster`)}</div>${student.followupResetDate?`<p class="helper space-top">Senaste uppföljning genomförd ${esc(student.followupResetDate)}.</p>`:''}<div class="section-space final-assessments"><h3>Slutbedömningar</h3>${finalAssessments.length?`<ul>${finalAssessments.map(s=>`<li><strong>${formatDate(s.date)} · ${esc(s.topic||'Idrott & hälsa')}</strong><span>${esc(s.start)}–${esc(s.end)}</span></li>`).join('')}</ul>`:'<p class="inline-note">Inga slutbedömningar markerade ännu.</p>'}</div><div class="section-space"><h3>Lektionshistorik</h3>${entries.map(s=>{const a=s.attendance[studentId]||{},o=s.observations[studentId];return `<article class="history-item"><div class="history-title"><span>${formatDate(s.date)} · ${esc(s.topic||'Idrott & hälsa')}</span>${btn(icon('edit',13),'edit-history-lesson','small ghost',`data-id="${esc(s.id)}" aria-label="Öppna lektionen ${s.date}"`)}</div><div class="flex wrap">${badge(a.absent?'Frånvarande':'Närvarande',a.absent?'red':'green')}${s.finalAssessment?badge('Slutbedömning','green'):''}${a.clothes?badge('Glömt kläder','amber'):''}${a.shoes?badge('Glömt skor','amber'):''}${a.lateMinutes?badge(`${a.lateMinutes} min sen`,'amber'):''}${s.skipObservation?badge('Observation avstådd'):!a.absent&&observationGrades(o).length?badge(esc(gradeLabel(o)),observationGrades(o).includes('F')?'red':'green'):''}</div>${!s.skipObservation&&!a.absent&&o?`<p>${esc(observationLabel(o)||'Ingen observationsmarkering')}${o.note?`<br>${esc(o.note)}`:''}</p>`:''}</article>`;}).join('')||'<p class="inline-note space-top">Ingen sparad lektionshistorik ännu.</p>'}</div>`,`${btn('Stäng','close-modal')}${f.flagged?btn(`${icon('check',14)} Uppföljning genomförd`,'resolve-followup','primary',`data-id="${esc(studentId)}"`):''}`);
}
async function navigate(page,sessionId,step='attendance') {
  if (saveTimer) await save();
  modal.close(); ui.studentQuery='';
  const hash=page==='lesson'?`#/lesson/${encodeURIComponent(sessionId)}/${step}`:`#/${page}`;
  if (location.hash===hash) { ui.page=page;ui.sessionId=sessionId;ui.step=step;render(); } else location.hash=hash;
}
function readRoute() {
  const parts=location.hash.replace(/^#\//,'').split('/');
  ui.page=[...navItems.map(i=>i[0]),'settings','lesson'].includes(parts[0])?parts[0]:'overview';
  if (ui.page==='lesson') {
    try { ui.sessionId=decodeURIComponent(parts[1]||''); } catch { ui.sessionId=''; }
    const session=getSession(); ui.step=parts[2]==='observation'&&session?.attendanceSavedAt&&!session?.attendanceDraft?'observation':'attendance'; if(session)ui.date=session.date;
  }
  if (ui.page==='overview') refreshOverviewDate(ui,dateKey());
  render(); window.scrollTo({top:0});
}
async function confirmAttendance() {
  const inputs=[...document.querySelectorAll('[data-attendance="lateMinutes"]')];
  if (inputs.some(el=>!el.reportValidity())) return;
  const s=getSession(), draft=s.attendanceDraft||s.attendance;
  s.attendance=Object.fromEntries(s.studentIds.map(id=>[id,clone(draft[id]||blankAttendance())]));
  s.attendanceDraft=null; s.attendanceSavedAt=new Date().toISOString(); await save(); render();toast('Närvaron är sparad på enheten.');
}
async function saveObservation(next) {
  const s=getSession(), id=observationDraft.studentId;
  observationDraft.note=modal.querySelector('#observation-note').value.trim();
  const observation={assessments:observationAssessments(observationDraft),grades:observationGrades(observationDraft),note:observationDraft.note};
  if (hasObservation(observation)) s.observations[id]=observation; else delete s.observations[id];
  await save();modal.close();render();toast(hasObservation(observation)?'Observation sparad.':'Observationen är rensad.');
  if(next) {const eligible=sessionStudents(data(),s).filter(st=>!s.attendance[st.id]?.absent),index=eligible.findIndex(st=>st.id===id);if(index<eligible.length-1)showObservation(eligible[index+1].id);}
}
async function backup() {
  try { await save(); } catch { /* A backup must remain possible when local storage is full. */ }
  const previous=data().settings.lastBackup,createdAt=new Date().toISOString();
  const body={app:'Idrottspuls',schemaVersion:SCHEMA,createdAt,mode:workspace.active,data:clone(data())};body.data.settings.lastBackup=createdAt;
  const result=await downloadFile(`Idrottspuls-${workspace.active==='demo'?'DEMO-':''}backup-${dateKey()}-${Date.now()}.json`,JSON.stringify(body,null,2),'application/json');
  if(result.saved){data().settings.lastBackup=createdAt;await save();if(ui.page==='export')render();toast(result.message);}else{data().settings.lastBackup=previous;toast(result.message||'Exporten avbröts.');}
}
async function performAction(action,el) {
  const id=el.dataset.id;
  switch(action) {
    case 'close-modal':modal.close();break;
    case 'confirm-action': {const cb=confirmCallback;confirmCallback=null;if(cb)await cb();break;}
    case 'select-date':navigateToDate(ui,el.dataset.date);render();break;
    case 'date-shift':navigateToDate(ui,addDays(ui.date,Number(el.dataset.days)));render();break;
    case 'today':returnToToday(ui,dateKey());render();break;
    case 'theme-select': {const theme=normalizeTheme(el.dataset.theme);data().settings.theme=theme;await save();render();toast('Färgtemat är sparat på enheten.');break;}
    case 'open-lesson': {const lesson=lessonsForDate(data(),ui.date).find(l=>l.id===id);if(!lesson)throw new Error('Lektionen hittades inte.');const session=materialize(data(),lesson);await save();await navigate('lesson',session.id,session.attendanceSavedAt&&!session.attendanceDraft?'observation':'attendance');break;}
    case 'add-class':showClassForm();break;
    case 'manage-class':showClassForm(getClass(id));break;
    case 'edit-student':showStudentForm(id);break;
    case 'archive-student': {const c=data().classes.find(c=>c.students.some(s=>s.id===id)),s=c.students.find(s=>s.id===id);s.archived=!s.archived;await save();render();showClassForm(c);toast(s.archived?'Eleven är arkiverad. Historiken finns kvar.':'Eleven är aktiv igen.');break;}
    case 'add-break':showBreakForm();break;
    case 'delete-break':confirmDialog('Ta bort uppehållet?','Ordinarie schemalektioner visas då igen under perioden. Sparade lektioner påverkas inte.','Ta bort',async()=>{data().breaks=data().breaks.filter(b=>b.id!==id);await save();modal.close();render();toast('Uppehållet är borttaget.');});break;
    case 'add-schedule':showScheduleForm(null,el.dataset.day===undefined?null:Number(el.dataset.day));break;
    case 'edit-schedule':showScheduleForm(id);break;
    case 'add-lesson':showScheduleForm(null,null,true);break;
    case 'delete-schedule':confirmDialog('Ta bort från veckoschemat?','Framtida schematillfällen tas bort. Alla redan påbörjade och sparade lektioner finns kvar.','Ta bort',async()=>{data().schedules=data().schedules.filter(s=>s.id!==id);await save();modal.close();render();toast('Veckoschemat är uppdaterat.');});break;
    case 'save-attendance':await confirmAttendance();break;
    case 'go-observation':if(getSession()?.attendanceSavedAt&&!getSession().attendanceDraft)await navigate('lesson',ui.sessionId,'observation');break;
    case 'go-attendance':await navigate('lesson',ui.sessionId,'attendance');break;
    case 'sync-roster': {const s=getSession(),newStudents=roster(data(),s.classId).filter(st=>!s.studentIds.includes(st.id));if(!newStudents.length){toast('Elevlistan är redan aktuell.');break;}if(!s.attendanceDraft)s.attendanceDraft=clone(s.attendance);for(const st of newStudents){s.studentIds.push(st.id);s.studentNames[st.id]={first:st.first,last:st.last};s.attendanceDraft[st.id]=blankAttendance();}await save();render();toast(`${newStudents.length} nya elever hämtade. Bekräfta närvaron på nytt.`);break;}
    case 'observe-student':showObservation(id);break;
    case 'assessment':observationDraft.assessments=toggleObservationChoice(observationDraft,'assessments',el.dataset.value);refreshObservationChoices();break;
    case 'grade':try{observationDraft.grades=toggleObservationChoice(observationDraft,'grades',el.dataset.grade);refreshObservationChoices();}catch(e){refreshObservationChoices(e.message);}break;
    case 'clear-observation':observationDraft.grades=[];observationDraft.assessments=[];observationDraft.note='';modal.querySelector('#observation-note').value='';refreshObservationChoices();break;
    case 'save-observation':await saveObservation(false);break;
    case 'save-next':await saveObservation(true);break;
    case 'complete-lesson': {const s=getSession(),students=sessionStudents(data(),s).filter(st=>!s.attendance[st.id]?.absent),missing=students.filter(st=>{const o=s.observations[st.id];return !hasObservation(o);}).length;const complete=async()=>{s.complete=true;await save();await navigate('overview');toast('Lektionen är avslutad och sparad.');};if(missing&&!s.skipObservation&&!s.complete)confirmDialog('Avsluta lektionen?',`${missing} närvarande elever saknar observation. De räknas inte som negativa tillfällen. Du kan komplettera lektionen senare.`,'Avsluta lektion',complete);else await complete();break;}
    case 'summary-tab':ui.summaryTab=el.dataset.tab;render();break;
    case 'student-history':showHistory(id);break;
    case 'resume-unfinished': {const session=data().sessions.find(s=>s.id===id);if(!session||session.complete)throw new Error('Den oavslutade lektionen hittades inte.');await navigate('lesson',session.id,session.attendanceSavedAt&&!session.attendanceDraft?'observation':'attendance');break;}
    case 'edit-history-lesson':await navigate('lesson',id,'attendance');break;
    case 'resolve-followup':confirmDialog('Markera uppföljningen som genomförd?',`Historiken finns kvar. Nya markeringar räknas från lektioner efter ${dateKey()}.`,'Markera genomförd',async()=>{const student=data().classes.flatMap(c=>c.students).find(s=>s.id===id);student.followupResetDate=dateKey();await save();render();showHistory(id);toast('Uppföljningen är markerad som genomförd.');});break;
    case 'toggle-columns':ui.fields=ui.fields.length===EXPORT_FIELDS.length?[]:EXPORT_FIELDS.map(f=>f[0]);render();break;
    case 'export-xlsx': {if(ui.exportFilters.from&&ui.exportFilters.to&&ui.exportFilters.from>ui.exportFilters.to)throw new Error('Startdatum måste ligga före slutdatum.');const makeRows=ui.exportMode==='student'?exportRowsByStudent:exportRows,rows=makeRows(data(),ui.exportFilters,ui.fields);if(rows.length<2)throw new Error('Inga sparade lektioner i perioden.');const format=ui.exportMode==='student'?'per-elev':'per-lektion';const result=await downloadFile(`Idrottspuls-${workspace.active==='demo'?'DEMO-':''}${dateKey()}-${format}.xlsx`,createXlsx(rows,workspace.active==='demo'?'Demodata':'Idrottspuls'),'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');toast(result.message);break;}
    case 'backup':await backup();break;
    case 'choose-restore':document.querySelector('#restore-file').click();break;
    case 'real-mode':confirmDialog('Börja med din egen lektionsbok',workspace.real.classes.length?'Din egen sparade lektionsbok öppnas. Demodata ligger kvar separat.':'Du börjar med en tom lektionsbok. Demodata ligger kvar separat så att du kan prova igen.','Öppna egen lektionsbok',async()=>{workspace.active='real';ui.filters.from=data().settings.termStart;ui.exportFilters.from=data().settings.termStart;await save();await navigate(data().classes.length?'overview':'classes');toast('Din egen lektionsbok är öppen.');});break;
    case 'switch-mode':if(workspace.active==='demo')await performAction('real-mode',el);else{workspace.active='demo';ui.filters={classId:'',from:data().settings.termStart,to:dateKey()};ui.exportFilters={...ui.filters};await save();await navigate('overview');toast('Du visar nu separat demodata.');}break;
    case 'persist-storage': {const ok=await requestPersistence();toast(ok?'Enheten har godkänt beständig lokal lagring.':'Webbläsaren garanterar inte beständig lagring. Säkerhetskopiera regelbundet.',!ok);break;}
    case 'install':if(installPrompt){await installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;render();}break;
  }
}
document.addEventListener('click',async event=>{
  const el=event.target.closest('[data-action]');if(!el||el.disabled)return;
  event.preventDefault();if(el.dataset.busy)return;el.dataset.busy='true';
  try{await performAction(el.dataset.action,el);}catch(e){if(modal.open)modalError(e.message);else toast(e.message,true);}finally{delete el.dataset.busy;}
});
document.addEventListener('input',event=>{
  const el=event.target;
  if(el.dataset.attendance){const s=getSession();if(!s)return;if(el.dataset.attendance==='lateMinutes'&&!el.checkValidity())return;if(!s.attendanceDraft)s.attendanceDraft=Object.fromEntries(s.studentIds.map(id=>[id,clone(s.attendance[id]||blankAttendance())]));s.attendanceDraft[el.dataset.id][el.dataset.attendance]=el.type==='checkbox'?el.checked:Number(el.value)||0;queueSave();document.querySelector('[data-action="go-observation"]')?.setAttribute('disabled','');el.closest('tr')?.classList.toggle('absent',s.attendanceDraft[el.dataset.id].absent);}
  if(el.dataset.sessionField==='topic'){getSession().topic=el.value;queueSave();}
  if(el.id==='student-names')updateNamePreview(el.value);
  if(el.dataset.namePart&&classImportDraft[Number(el.dataset.nameRow)])classImportDraft[Number(el.dataset.nameRow)][el.dataset.namePart]=el.value;
  if(el.id==='student-search'){ui.studentQuery=el.value;document.querySelector('#student-grid').innerHTML=renderStudentTiles(getSession(),sessionStudents(data(),getSession()));}
  if(el.id==='class-search'){ui.classQuery=el.value;const query=el.value.trim().toLocaleLowerCase('sv');let count=0;document.querySelectorAll('[data-class-search]').forEach(card=>{const match=card.dataset.classSearch.includes(query);card.hidden=!match;if(match)count++;});document.querySelector('#class-search-count').textContent=`Visar ${count} av ${data().classes.length} klasser`;document.querySelector('#class-search-empty').hidden=count>0;}
});
document.addEventListener('change',async event=>{
  const el=event.target;
  try {
    if(el.dataset.sessionField==='skipObservation'){getSession().skipObservation=el.checked;await save();render();}
    if(el.dataset.sessionField==='finalAssessment'){getSession().finalAssessment=el.checked;await save();}
    if(el.dataset.filter){const filters=el.dataset.scope==='export'?ui.exportFilters:ui.filters;filters[el.dataset.filter]=el.value;if(filters.from&&filters.to&&filters.from>filters.to)toast('Startdatum ligger efter slutdatum. Ändra perioden.',true);render();}
    if(el.dataset.exportMode){ui.exportMode=el.value==='lesson'?'lesson':'student';render();}
    if(el.dataset.exportField){if(el.checked)ui.fields=EXPORT_FIELDS.map(f=>f[0]).filter(k=>ui.fields.includes(k)||k===el.dataset.exportField);else ui.fields=ui.fields.filter(k=>k!==el.dataset.exportField);render();}
    if(el.id==='break-kind'){
       const end=modal.querySelector('#break-end-field'),input=modal.querySelector('#break-end');
       if(end && input){end.style.display=el.value==='range'?'grid':'none';input.required=el.value==='range';}
     }
     if(el.dataset.settingUi==='showArchived'){ui.showArchived=el.checked;render();}
    if(el.id==='restore-file'&&el.files[0]){const file=el.files[0];if(file.size>20000000)throw new Error('Säkerhetskopian är för stor (max 20 MB).');const backup=parseBackup(await file.text());confirmDialog('Återställ lektionsboken?',`Filen innehåller <strong>${backup.data.classes.length} klasser och ${backup.data.sessions.length} lektioner</strong>${backup.mode==='demo'?' med demodata':''}. Den ersätter din nuvarande ${backup.mode==='demo'?'demodata':'egna lektionsbok'}. Skapa en säkerhetskopia av nuvarande uppgifter först om du vill behålla dem.`,'Återställ kopian',async()=>{workspace[backup.mode]=backup.data;workspace.active=backup.mode;ui.filters={classId:'',from:data().settings.termStart,to:dateKey()};ui.exportFilters={...ui.filters};await save();await navigate('overview');toast('Säkerhetskopian är återställd.');});el.value='';}
  }catch(e){toast(e.message,true);}
});
document.addEventListener('submit',async event=>{
  const form=event.target;if(!['class-form','student-form','schedule-form','settings-form','break-form'].includes(form.id))return;event.preventDefault();
  if(form.dataset.busy)return;form.dataset.busy='true';
  try {
    const values=Object.fromEntries(new FormData(form));
    if(form.id==='class-form'){
      const name=values.name.trim();if(!name)throw new Error('Skriv ett klassnamn.');if(data().classes.some(c=>c.id!==values.classId&&c.name.toLocaleLowerCase('sv')===name.toLocaleLowerCase('sv')))throw new Error('Det finns redan en klass med det namnet.');
      if(classImportError)throw new Error(classImportError);
      const newStudents=validateStudentList(classImportDraft).map(names=>({id:uid(),...names,archived:false}));
      const c=getClass(values.classId);if(c){if(c.students.length+newStudents.length>500)throw new Error('Max 500 elever per klass.');c.name=name;c.students.push(...newStudents);}else{if(newStudents.length>500||data().classes.length>=200)throw new Error('För många klasser eller elever.');data().classes.push({id:uid(),name,color:'sage',students:newStudents});}await save();modal.close();render();toast('Klassen är sparad.');
    }
    if(form.id==='student-form'){const first=values.first.trim(),last=values.last.trim();if(!first||!last)throw new Error('Skriv både förnamn och efternamn.');const c=data().classes.find(c=>c.students.some(s=>s.id===values.studentId)),student=c.students.find(s=>s.id===values.studentId);student.first=first;student.last=last;await save();render();showClassForm(c);toast('Eleven är uppdaterad.');}
    if(form.id==='break-form'){
       const validDate=value=>/^\d{4}-\d{2}-\d{2}$/.test(value) && dateKey(parseDate(value))===value;
       if(!validDate(values.date))throw new Error('Välj ett giltigt datum.');
       const kind=values.kind, weekday=parseDate(values.date).getDay();
       const start=kind==='week'?addDays(values.date,1-(weekday||7)):values.date;
       const end=kind==='week'?addDays(start,6):kind==='day'?start:values.end;
       const label=values.label.trim();
       if(!['day','week','range'].includes(kind)||!validDate(end)||end<start||end>addDays(start,366))throw new Error('Kontrollera datumintervallet (max ett år).');
       if(!label||label.length>100)throw new Error('Ange en anledning till uppehållet.');
       if(data().breaks.length>=500)throw new Error('Du har lagt in för många uppehåll.');
       data().breaks.push({id:uid(),start,end,label});await save();modal.close();render();toast('Uppehållet har sparats. Veckoschemat är oförändrat.');
     }
     if(form.id==='schedule-form'){
      if(values.end<=values.start)throw new Error('Sluttiden måste vara efter starttiden.');if(!getClass(values.classId))throw new Error('Välj en klass.');
      const fields={classId:values.classId,start:values.start,end:values.end,topic:values.topic.trim(),location:values.location.trim()};
      if(values.oneOff==='yes'){const session=materialize(data(),{...fields,date:values.date,scheduleId:null,planned:true});await save();ui.date=values.date;await navigate('lesson',session.id);}
      else{const existing=data().schedules.find(s=>s.id===values.scheduleId),entry={...fields,day:Number(values.day)};if(existing)Object.assign(existing,entry);else data().schedules.push({...entry,id:uid()});await save();modal.close();render();toast('Veckoschemat är sparat.');}
    }
    if(form.id==='settings-form'){Object.assign(data().settings,{teacher:values.teacher.trim(),school:values.school.trim(),termStart:values.termStart,threshold:Number(values.threshold)});await save();render();toast('Inställningarna är sparade.');}
  }catch(e){if(modal.open)modalError(e.message);else toast(e.message,true);}finally{delete form.dataset.busy;}
});
window.addEventListener('hashchange',()=>{if(saveTimer)save().catch(()=>{});readRoute();});
window.addEventListener('beforeunload',event=>{if(saving||saveError){event.preventDefault();event.returnValue='';}});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'){if(saveTimer)save().catch(()=>{});}else{refreshDisplayedDate();scheduleMidnightRefresh();}});
window.addEventListener('focus',refreshDisplayedDate);
window.addEventListener('pageshow',refreshDisplayedDate);
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();installPrompt=event;render();});
window.addEventListener('error',event=>{if(workspace)toast('Något gick fel. Dina redan sparade uppgifter finns kvar. Öppna översikten och försök igen.',true);});
try {
  workspace=await loadWorkspace();ui.filters.from=data().settings.termStart;ui.exportFilters.from=data().settings.termStart;
  // A browser tab holds the write lock for its lifetime. A second tab stays read-only.
  if(navigator.locks&&!window.IdrottspulsNative){
    let decide;const ready=new Promise(resolve=>decide=resolve);
    navigator.locks.request('idrottspuls-single-writer',{ifAvailable:true},async lock=>{decide(!!lock);if(lock)await new Promise(()=>{});});
    if(!await ready)throw new Error('Idrottspuls är redan öppen i ett annat fönster. Stäng det fönstret och ladda om här för att undvika motstridiga sparningar.');
  }
  await save();readRoute();scheduleMidnightRefresh();
  if('serviceWorker'in navigator&&!window.IdrottspulsNative)navigator.serviceWorker.register('./sw.js').catch(()=>toast('Offlinefilerna kunde inte installeras. Håll servern igång tills det är löst.',true));
}catch(e){workspace=null;root.innerHTML=`<div class="loading"><img src="icon.svg" width="64" height="64" alt=""><h1>Kunde inte öppna lektionsboken</h1><p class="center">${esc(e.message)}</p><p>Ingen befintlig data har skrivits över.</p><button class="btn primary" id="retry-load">Försök igen</button></div>`;document.querySelector('#retry-load').addEventListener('click',()=>location.reload());}
