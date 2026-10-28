Warning: truncated output (original token count: 24779)
Total output lines: 479

import { SCHEMA, GRADES, ASSESSMENTS, DAYS, uid, clone, dateKey, parseDate, addDays, emptyData, studentName, searchClasses, unfinishedSessions, followupSummaries, parseStudentList, validateStudentList, roster, sessionStudents, lessonsForDate, scheduleBreakForDate, materialize, blankAttendance, followup, flaggedStudents, filteredSessions, studentFinalAssessments, studentStats, reportedLessons, observationAssessments, observationGrades, observationLabel, gradeLabel, hasObservation, toggleObservationChoice, EXPORT_FIELDS, exportRows, exportRowsByStudent, exportTermPlanRows, parseBackup, weekStartDate, schedulePlanSlot, lessonPlan, setLessonPlan, copyLessonPlanWeek, planWeekStatus, termPlanWeeks, termInfo, nextTermStart, transitionTerm } from './model.js';
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
const ui = { page: 'overview', date: dateKey(), followsToday: true, planWeek: dateKey(), planYearGroup: 7, sessionId: null, step: 'attendance', summaryTab: 'attendance', filters: { classId:'', from:'', to:dateKey() }, exportFilters:{ classId:'', from:'', to:dateKey() }, exportMode:'student', fields:EXPORT_FIELDS.map(f => f[0]), studentQuery:'', classQuery:'', archiveQuery:'', showArchived:false };
const LESSON_TEMPLATES = [
  ['volleyboll','Volleyboll','Serv, fingerslag och mottagning'],['handboll','Handboll','Passningar, skott och spelbarhet'],['basket','Basket','Bollkontroll, passningar och avslut'],['fotboll','Fotboll','Driva, passa och ta emot boll'],['innebandy','Innebandy','Klubba, bollkontroll och samspel'],['gymnastik','Gymnastik','Balans, kroppskontroll och säkerhet'],['dans','Dans','Rytm, rörelse och samarbete'],['friidrott','Friidrott','Teknik, rytm och individuell utveckling'],['styrka','Styrka och hälsa','Rörelsekvalitet, styrka och säkerhet'],['eget','Eget område','']
].map(([id,topic,focus])=>({id,topic,focus}));
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
const navItems = [['overview','grid','Översikt'],['schedule','calendar','Veckoschema'],['plan','book','Terminsplanering'],['classes','users','Klasser & elever'],['summary','chart','Sammanställning'],['export','download','Export & backup']];
const pageTitles = {overview:'Översikt',schedule:'Veckoschema',plan:'Terminsplanering',classes:'Klasser & elever',summary:'Sammanställning',export:'Export & backup',settings:'Inställningar',lesson:'Pågående lektion'};
function render() {
  if (!workspace) return;
  document.documentElement.dataset.theme = normalizeTheme(data().settings.theme);
  const settings = data().settings;
  root.innerHTML = `<div class="app-shell"><aside class="sidebar"><a class="brand" href="#/overview"><img src="icon.svg" alt=""><span>idrottspuls<span class="text-green">.</span></span></a><div class="brand-note">Din undervisning, samlad.</div><div class="nav-caption">DIN LEKTIONSBOK</div><nav class="nav" aria-label="Huvudmeny">${navItems.map(([id,i,label]) => `<a href="#/${id}" class="nav-link ${ui.page === id ? 'active' : ''}" ${ui.page === id ? 'aria-current="page"' : ''} title="${label}">${icon(i)}<span>${label}</span></a>`).join('')}</nav><div class="sidebar-bottom"><a class="nav-link ${ui.page === 'settings' ? 'active' : ''}" href="#/settings">${icon('settings')}<span>Inställningar</span></a><div class="local-card"><div class="flex">${icon('shield',16)}<strong>Allt stannar hos dig</strong></div><p>Dina klasser och observationer sparas på den här enheten.</p></div><div class="profile flex"><div class="avatar">${settings.teacher ? esc(settings.teacher.split(' ').map(p => p[0]).slice(0,2).join('')) : 'IL'}</div><div><strong>${esc(settings.teacher || 'Min lektionsbok')}</strong><small>${esc(settings.school || 'Idrott & hälsa')}</small></div></div></div></aside><div class="main-area"><header class="topbar"><div class="topbar-title">Din lektionsbok <span class="muted">/</span> <strong>${pageTitles[ui.page]}</strong></div><a class="mobile-brand" href="#/overview"><img src="icon.svg" alt="">idrottspuls.</a><div class="topbar-actions"><div id="save-status" class="status"></div>${installPrompt ? btn(`${icon('download',14)} Installera`,'install','small') : ''}<a class="icon-btn" href="#/settings" aria-label="Inställningar">${icon('settings',18)}</a></div></header><div id="storage-alert" class="storage-alert" ${!saveError ? 'hidden' : ''}>${esc(saveError)}</div><main class="content" id="main-content">${workspace.active === 'demo' ? `<div class="demo-banner"><span>${icon('sparkles',14)} <strong>Du provar Idrottspuls.</strong> Alla elever och uppgifter här är fiktiva.</span><button data-action="real-mode">Börja med egna klasser ${icon('arrow',13)}</button></div>` : ''}${renderPage()}<div class="bottom-note">${icon('leaf',12)} Lite mindre administration. Lite mer rörelse.</div></main></div></div>`;
  updateSaveIndicator(); applyProgress();
}
function applyProgress() { document.querySelectorAll('[data-progress]').forEach(el => el.style.setProperty('--progress', `${Math.max(0,Math.min(100,Number(el.dataset.progress)||0))}%`)); }
function heading(title, subtitle, actions = '') { return `<div class="page-heading"><div><h1>${title}</h1><p>${subtitle}</p></div>${actions ? `<div class="heading-actions">${actions}</div>` : ''}</div>`; }
function renderPage() { switch(ui.page) { case 'schedule':return renderSchedule();case 'plan':return renderPlanning();case 'classes':return renderClasses();case 'summary':return renderSummary();case 'export':return renderExport();case 'settings':return renderSettings();case 'lesson':return renderLesson();default:return renderOverview(); } }
function weekNumber(value) { const d = parseDate(value); d.setDate(d.getDate()+4-(d.getDay()||7)); const first = new Date(d.getFullYear(),0,1); return Math.ceil((((d-first)/86400000)+1)/7); }
function renderOverview() {
  const d = data(), lessons = lessonsForDate(d,ui.date), followups = followupSummaries(d), flags = flaggedStudents(d,followups), paused = scheduleBreakForDate(d,ui.date);
  const students = lessons.reduce((n,l) => n + (l.studentIds?.length ?? roster(d,l.classId).length),0), saved = lessons.filter(l => l.attendanceSavedAt).length;
  const monday = addDays(ui.date,1-(parseDate(ui.date).getDay()||7));
  return `${heading('Dagens lektioner',`${esc(formatFullDate(ui.date))} <span class="muted">&nbsp;·&nbsp; Vecka ${weekNumber(ui.date)}</span>`,btn(`${icon('plus',17)} Lägg till lektion`,'add-lesson'))}<div class="stats"><div class="stat"><div class="stat-icon">${icon('calendar',23)}</div><div><div class="stat-label">Lektioner idag</div><div class="stat-value">${lessons.length} <small>lektioner</small></div></div></div><div class="stat"><div class="stat-icon">${icon('users',23)}</div><div><div class="stat-label">Elevtillfällen idag</div><div class="stat-value">${students} <small>elevtillfällen</small></div></div></div><div class="stat"><div class="stat-icon">${icon('checkcircle',23)}</div><div><div class="stat-label">Närvaro registrerad</div><div class="stat-value">${saved}<small> / ${lessons.length} lektioner</small></div></div></div></div><div class="dashboard-grid"><section><div class="section-title"><h2>Ditt schema</h2><div class="date-nav"><button class="icon-btn" data-action="date-shift" data-days="-7" aria-label="Föregående vecka">${icon('left',14)}</button><button class="btn ${ui.followsToday?'ghost':'primary'}" data-action="today" aria-label="${ui.followsToday?'Visa dagens datum':'Återgå till dagens datum'}">${ui.followsToday?'Idag':'Till idag'}</button><button class="icon-btn" data-action="date-shift" data-days="7" aria-label="Nästa vecka">${icon('right',14)}</button></div></div><div class="week-strip" aria-label="Välj dag">${Array.from({length:5},(_,i) => { const day = addDays(monday,i); return `<button class="day-button ${day===ui.date?'selected':''} ${day===dateKey()?'today':''}" data-action="select-date" data-date="${day}" aria-pressed="${day===ui.date}" aria-label="${esc(formatFullDate(day))}"><small>${DAYS[parseDate(day).getDay()].slice(0,3)}</small><strong>${parseDate(day).getDate()}</strong></button>`; }).join('')}</div>${paused ? `${info(`Schemapaus: ${esc(paused.label)}. Återkommande lektioner visas inte denna dag. Sparade och extra lektioner finns kvar.`, 'amber')}<div class="section-space"></div>` : ''}${lessons.length ? lessons.map(l=>renderLessonCard(l,followups)).join('') : `<div class="card">${empty('Plats för rörelse','Inga lektioner är planerade den här dagen. Lägg till en lektion eller fyll i ditt veckoschema.',btn('Lägg till lektion','add-lesson','primary'))}</div>`}</section><aside class="dashboard-aside"><div class="card followup-card"><div class="followup-title">${icon('flag',17)}<strong>Att följa upp</strong><span class="count-badge">${flags.length}</span></div><p class="followup-intro">Fånga upp behov och ge varje elev rätt stöd.</p>${flags.length ? flags.slice(0,4).map(s => `<button class="followup-person" data-action="student-history" data-id="${esc(s.id)}"><div class="avatar">${esc(initials(s))}</div><div><strong>${esc(studentName(s))}</strong><small>${esc(s.className)} · ${s.manual?'Manuellt markerad':`${s.count} tillfällen`}</small></div>${icon('right',13)}</button>`).join('') : `<p class="inline-note">${icon('checkcircle',15)} Inga aktiva uppföljningar.</p>`}<div class="card-foot">Automatisk markering efter ${d.settings.threshold} tillfällen. Gäller från ${formatDate(d.settings.termStart)}.</div><a class="link-button space-top" href="#/summary">Visa sammanställning ${icon('arrow',13)}</a></div><section class="card unfinished-card">${renderUnfinishedLessons()}</section>${renderDocumentationReminders()}${renderCancelledLessons()}</aside></div>`;
}
function renderUnfinishedLessons() {
  const pending=unfinishedSessions(data());
  return `<div class="unfinished-heading">${icon('checkcircle',17)}<h3>Oavslutade lektioner</h3>${badge(String(pending.length),'green')}</div><p class="helper">Fortsätt där du slutade eller slutför ett påbörjat pass.</p>${pending.length?`<div class="unfinished-list">${pending.map(s=>{const className=s.className||getClass(s.classId)?.name||'Klass',students=sessionStudents(data(),s).filter(st=>!s.attendance[st.id]?.absent),missing=students.filter(st=>!hasObservation(s.observations[st.id])).length,status=s.attendanceDraft?'Närvaro behöver sparas':!s.attendanceSavedAt?'Närvaro behöver bekräftas':s.skipObservation?'Redo att avsluta':missing?`${missing} observationer kvar`:'Redo att avsluta';return `<button type="button" class="unfinished-lesson" data-action="resume-unfinished" data-id="${esc(s.id)}" aria-label="Fortsätt ${esc(className)}, ${esc(formatFullDate(s.date))}"><span class="unfinished-date">${esc(formatDate(s.date))}<small>${esc(s.start)}–${esc(s.end)}</small></span><span class="unfinished-detail"><strong>${esc(className)} · ${esc(s.topic||'Idrott & hälsa')}</strong><small>${esc(status)}</small></span>${icon('right',14)}</button>`;}).join('')}</div>`:`<p class="inline-note unfinished-empty">Inga oavslutade lektioner just nu. Påbörjade pass visas här tills de är avslutade.</p>`}`;
}
function renderDocumentationReminders() {
  const pending=unfinishedSessions(data(),500).map(s=>{const present=sessionStudents(data(),s).filter(st=>!s.attendance[st.id]?.absent);return {s,missing:present.filter(st=>!hasObservation(s.observations[st.id])).length};}).filter(item=>item.s.attendanceSavedAt&&!item.s.attendanceDraft&&!item.s.skipObservation&&item.missing>0);
  if(!pending.length)return '';
  return `<section class="card documentation-reminders"><div class="unfinished-heading">${icon('info',17)}<h3>Dokumentation att komplettera</h3>${badge(String(pending.length),'amber')}</div><p class="helper">Sparad närvaro där en eller flera närvarande elever saknar observation.</p><div class="unfinished-list">${pending.slice(0,5).map(({s,missing})=>`<button type="button" class="unfinished-lesson" data-action="resume-unfinished" data-id="${esc(s.id)}"><span class="unfinished-date">${esc(formatDate(s.date))}<small>${esc(s.start)}–${esc(s.end)}</small></span><span class="unfinished-detail"><strong>${esc(s.className||getClass(s.classId)?.name||'Klass')} · ${esc(s.topic||'Idrott & hälsa')}</strong><small>${missing} ${missing===1?'elev saknar':'elever saknar'} observation</small></span>${icon('right',14)}</button>`).join('')}</div></section>`;
}
function renderCancelledLessons() {
  const cancelled=data().sessions.filter(s=>s.cancelledAt).sort((a,b)=>b.cancelledAt.localeCompare(a.cancelledAt));
  if(!cancelled.length)return '';
  return `<details class="card cancelled-lessons"><summary>Avbrutna lektioner · ${cancelled.length}</summary><p class="helper">De räknas inte i statistik eller Excel. Sparade uppgifter finns kvar och lektionen kan återställas.</p><div class="cancelled-list">${cancelled.map(s=>`<div class="cancelled-row"><span><strong>${esc(s.className||getClass(s.classId)?.name||'Klass')} · ${esc(s.topic||'Idrott & hälsa')}</strong><small>${esc(formatFullDate(s.date))} · ${esc(s.start)}–${esc(s.end)}</small></span>${btn('Återställ','restore-cancelled','small',`data-id="${esc(s.id)}"`)}</div>`).join('')}</div></details>`;
}
function renderLessonCard(l, followups) {
  const c = getClass(l.classId), flags = (l.studentIds || roster(data(),l.classId).map(s => s.id)).filter(id => followups.get(id)?.flagged).length;
  const status = l.complete ? badge(`${icon('check',11)} Avslutad`,'green') : l.attendanceSavedAt ? badge('Påbörjad','coral') : badge('Planerad');
  return `<article class="lesson-card"><div class="time-column">${esc(l.start)}<small>${esc(l.end)}</small></div><div class="lesson-body ${c?.color==='coral'?'coral':c?.color==='blue'?'blue':''}"><div class="lesson-card-top"><span class="class-label">${esc(l.className || c?.name || 'Klass')}</span>${status}</div><div class="lesson-…14779 tokens truncated…leven är aktiv igen.');break;}
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
    case 'cancel-lesson': {const session=getSession();if(!session||session.complete||session.cancelledAt)throw new Error('Lektionen kan inte avbrytas.');confirmDialog('Avbryt lektionen?',`<strong>${esc(session.className||getClass(session.classId)?.name||'Klass')} · ${esc(session.topic||'Idrott & hälsa')}</strong><br>${esc(formatFullDate(session.date))}. Lektionen tas bort från oavslutade och från statistik/Excel. Sparad närvaro och observationer behålls och kan återställas från översikten.`,'Avbryt lektion',async()=>{session.cancelledAt=new Date().toISOString();await save();modal.close();await navigate('overview');toast('Lektionen är avbruten. Sparade uppgifter finns kvar under Avbrutna lektioner.');});break;}
    case 'restore-cancelled': {const session=data().sessions.find(s=>s.id===id&&s.cancelledAt);if(!session)throw new Error('Den avbrutna lektionen hittades inte.');session.cancelledAt=null;await save();render();toast('Lektionen är återställd.');break;}
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
  if(el.dataset.planSlot){setLessonPlan(data(),ui.planYearGroup,weekStartDate(ui.planWeek),Number(el.dataset.planSlot),el.value);queueSave();const counter=el.parentElement.querySelector('.helper');if(counter)counter.textContent=`${el.value.length}/200 tecken`;}
  if(el.id==='student-names')updateNamePreview(el.value);
  if(el.dataset.namePart&&classImportDraft[Number(el.dataset.nameRow)])classImportDraft[Number(el.dataset.nameRow)][el.dataset.namePart]=el.value;
  if(el.id==='student-search'){ui.studentQuery=el.value;document.querySelector('#student-grid').innerHTML=renderStudentTiles(getSession(),sessionStudents(data(),getSession()));}
  if(el.id==='class-search'){ui.classQuery=el.value;const query=el.value.trim().toLocaleLowerCase('sv');let count=0;document.querySelectorAll('[data-class-search]').forEach(card=>{const match=card.dataset.classSearch.includes(query);card.hidden=!match;if(match)count++;});document.querySelector('#class-search-count').textContent=`Visar ${count} av ${data().classes.length} klasser`;document.querySelector('#class-search-empty').hidden=count>0;}
  if(el.id==='archive-search'){ui.archiveQuery=el.value;const query=el.value.trim().toLocaleLowerCase('sv');let count=0;document.querySelectorAll('[data-archive-search]').forEach(row=>{const match=row.dataset.archiveSearch.includes(query);row.hidden=!match;if(match)count++;});const counter=document.querySelector('#archive-search-count');if(counter)counter.textContent=`Visar ${count} av ${document.querySelectorAll('[data-archive-search]').length} terminer`;}
});
document.addEventListener('change',async event=>{
  const el=event.target;
  try {
    if(el.id==='plan-year-group'){ui.planYearGroup=Number(el.value);render();}
    if(el.id==='schedule-template'){const template=LESSON_TEMPLATES.find(t=>t.id===el.value);if(template){const topic=modal.querySelector('#schedule-topic'),focus=modal.querySelector('#schedule-focus');if(topic)topic.value=template.topic;if(focus)focus.value=template.focus;}}
    if(el.id==='plan-week'&&el.value){ui.planWeek=weekStartDate(el.value);render();}
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
  const form=event.target;if(!['class-form','student-form','schedule-form','settings-form','break-form','plan-copy-form','term-break-form'].includes(form.id))return;event.preventDefault();
  if(form.dataset.busy)return;form.dataset.busy='true';
  try {
    const values=Object.fromEntries(new FormData(form));
    if(form.id==='term-break-form'){
      const validDate=value=>/^\d{4}-\d{2}-\d{2}$/.test(value)&&dateKey(parseDate(value))===value;
      if(!validDate(values.nextTermStart))throw new Error('Välj ett giltigt startdatum för nästa termin.');
      transitionTerm(clone(data()),values.nextTermStart,workspace.active);
      const current=termInfo(data().settings.termStart),next=termInfo(values.nextTermStart);modal.close();
      confirmDialog(`Säkerhetskopiera ${current.label}?`,`Innan bytet kan du ladda ner en separat säkerhetskopia. Därefter sparas hela ${current.label} även i appens terminsarkiv och ${next.label} startar med tom närvaro, utrustning och observationer.`,'Skapa säkerhetskopia och byt',async()=>requestTermBreak(values.nextTermStart));
    }
    if(form.id==='class-form'){
      const name=values.name.trim(),yearGroup=Number(values.yearGroup);if(!name)throw new Error('Skriv ett klassnamn.');if(![7,8,9].includes(yearGroup))throw new Error('Välj årskurs 7, 8 eller 9.');if(data().classes.some(c=>c.id!==values.classId&&c.name.toLocaleLowerCase('sv')===name.toLocaleLowerCase('sv')))throw new Error('Det finns redan en klass med det namnet.');
      if(classImportError)throw new Error(classImportError);
      const newStudents=validateStudentList(classImportDraft).map(names=>({id:uid(),...names,archived:false}));
      const c=getClass(values.classId);if(c){if(c.students.length+newStudents.length>500)throw new Error('Max 500 elever per klass.');c.name=name;c.yearGroup=yearGroup;c.students.push(...newStudents);}else{if(newStudents.length>500||data().classes.length>=200)throw new Error('För många klasser eller elever.');data().classes.push({id:uid(),name,yearGroup,color:'sage',students:newStudents});}await save();modal.close();render();toast('Klassen är sparad.');
    }
    if(form.id==='plan-copy-form'){const targets=new FormData(form).getAll('targetYearGroups');copyLessonPlanWeek(data(),ui.planYearGroup,targets,weekStartDate(ui.planWeek));await save();modal.close();render();toast('Veckans planering är kopierad.');}
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
      if(values.oneOff==='yes'&&[0,6].includes(parseDate(values.date).getDay()))throw new Error('Lektioner kan bara läggas in måndag till fredag.');if(values.oneOff!=='yes'&&![1,2,3,4,5].includes(Number(values.day)))throw new Error('Välj en vardag måndag till fredag.');if(values.end<=values.start)throw new Error('Sluttiden måste vara efter starttiden.');if(!getClass(values.classId))throw new Error('Välj en klass.');
       const fields={classId:values.classId,start:values.start,end:values.end,topic:values.topic.trim(),focus:(values.focus||'').trim(),location:values.location.trim()};
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
  // Render first. Rewriting the entire native workspace on every launch can
  // block the Android WebView for a long time, especially after a full term.
  // Existing data is still migrated in memory and will be persisted on the
  // next user change; opening the app never rewrites or clears student data.
  readRoute();scheduleMidnightRefresh();
  if('serviceWorker'in navigator&&!window.IdrottspulsNative)navigator.serviceWorker.register('./sw.js').catch(()=>toast('Offlinefilerna kunde inte installeras. Håll servern igång tills det är löst.',true));
}catch(e){workspace=null;root.innerHTML=`<div class="loading"><img src="icon.svg" width="64" height="64" alt=""><h1>Kunde inte öppna lektionsboken</h1><p class="center">${esc(e.message)}</p><p>Ingen befintlig data har skrivits över.</p><button class="btn primary" id="retry-load">Försök igen</button></div>`;document.querySelector('#retry-load').addEventListener('click',()=>location.reload());}

