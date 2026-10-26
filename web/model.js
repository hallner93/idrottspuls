export const SCHEMA = 2;
export const GRADES = ['F', 'E', 'D', 'C', 'B', 'A'];
export const ASSESSMENTS = [
  { id: 'followup', label: 'Behov av uppföljning', tone: 'amber', icon: 'flag' },
  { id: 'excellent', label: 'Mycket bra', tone: 'green', icon: 'sparkles' },
  { id: 'good', label: 'Bra', tone: 'green', icon: 'thumb' },
  { id: 'okay', label: 'Okej', tone: 'green', icon: 'checkcircle' },
  { id: 'below', label: 'Sämre än förväntat', tone: 'amber', icon: 'trend' },
  { id: 'failed', label: 'Ej godkänt genomförande', tone: 'red', icon: 'circle' },
  { id: 'notparticipating', label: 'Ej deltagande', tone: 'gray', icon: 'pause' },
];
export const DAYS = ['Söndag', 'Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag'];
export const uid = () => globalThis.crypto?.randomUUID?.() || `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
export const clone = value => JSON.parse(JSON.stringify(value));
export function dateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export const parseDate = value => new Date(`${value}T12:00:00`);
export function addDays(value, count) { const d = parseDate(value); d.setDate(d.getDate() + count); return dateKey(d); }
export function termStart(today = dateKey()) { return `${today.slice(0, 4)}-${today.slice(5, 7) >= '08' ? '08' : '01'}-01`; }
export function emptyData() {
  return { classes: [], schedules: [], sessions: [], breaks: [], lessonPlans: [], settings: { school: '', teacher: '', termStart: termStart(), threshold: 3, lastBackup: null, theme: 'green' } };
}
export const studentName = s => `${s.first} ${s.last}`.trim();
export function searchClasses(classes, query = '') {
  const term = String(query).trim().toLocaleLowerCase('sv');
  return classes.filter(c => `${c.name} ${c.students.filter(s => !s.archived).map(studentName).join(' ')}`.toLocaleLowerCase('sv').includes(term));
}
export function parseStudentList(text) {
  if (typeof text !== 'string' || text.length > 200000) throw new Error('Elevlistan är för stor. Klistra in högst 500 namn åt gången.');
  const rows = [], clean = value => value.trim().replace(/\s+/gu, ' ');
  let headerAllowed = true, reversedColumns = false;
  for (const [index, raw] of text.split(/\r\n|\n|\r/u).entries()) {
    if (!raw.trim()) continue;
    const line = index + 1, delimiter = raw.includes('\t') ? '\t' : raw.includes(';') ? ';' : raw.includes(',') ? ',' : null;
    let first, last;
    if (delimiter) {
      const columns = raw.split(delimiter).map(clean);
      if (columns.length !== 2) throw new Error(`Rad ${line} har fler än två kolumner. Klistra in bara förnamn och efternamn, eller ett helt namn per rad.`);
      const headings = columns.map(c => c.toLocaleLowerCase('sv'));
      if (headerAllowed && ((headings[0] === 'förnamn' && headings[1] === 'efternamn') || (headings[0] === 'efternamn' && headings[1] === 'förnamn'))) {
        reversedColumns = headings[0] === 'efternamn'; headerAllowed = false; continue;
      }
      [first, last] = delimiter === ',' || reversedColumns ? [columns[1], columns[0]] : columns;
    } else {
      const full = clean(raw);
      if (headerAllowed && ['namn','elevnamn'].includes(full.toLocaleLowerCase('sv'))) { headerAllowed = false; continue; }
      const parts = full.split(' ');
      last = parts.length > 1 ? parts.pop() : '';
      first = parts.join(' ');
    }
    headerAllowed = false;
    rows.push({ first, last, line });
    if (rows.length > 500) throw new Error('Klistra in högst 500 namn åt gången.');
  }
  return rows;
}
export function validateStudentList(rows) {
  if (!Array.isArray(rows) || rows.length > 500) throw new Error('Klistra in högst 500 namn åt gången.');
  return rows.map((row, index) => {
    const first = typeof row.first === 'string' ? row.first.trim() : '', last = typeof row.last === 'string' ? row.last.trim() : '';
    if (!first || !last || first.length > 100 || last.length > 100) throw new Error(`Kontrollera namnet på rad ${row.line || index + 1}. Fyll i både förnamn och efternamn (högst 100 tecken vardera).`);
    return { first, last };
  });
}
const collator = new Intl.Collator('sv', { sensitivity: 'base', numeric: true });
export const sortedStudents = list => [...list].sort((a, b) => collator.compare(a.last, b.last) || collator.compare(a.first, b.first));
export const assessmentLabel = id => ASSESSMENTS.find(a => a.id === id)?.label || 'Ingen observationsmarkering';
// Read older single selections as well as the current multi-selection format.
export function observationAssessments(o) {
  const selected = Array.isArray(o?.assessments) ? o.assessments : o?.assessment ? [o.assessment] : [];
  return ASSESSMENTS.map(a => a.id).filter(id => selected.includes(id));
}
export function observationGrades(o) {
  const selected = Array.isArray(o?.grades) ? o.grades : o?.grade ? [o.grade] : [];
  return GRADES.filter(grade => selected.includes(grade));
}
export const observationLabel = (o, separator = ' · ') => observationAssessments(o).map(assessmentLabel).join(separator);
export const gradeLabel = o => observationGrades(o).join(' / ');
export const hasObservation = o => !!(observationAssessments(o).length || observationGrades(o).length || o?.note);
export function toggleObservationChoice(o, kind, value) {
  const selected = kind === 'grades' ? observationGrades(o) : observationAssessments(o);
  const allowed = kind === 'grades' ? GRADES : kind === 'assessments' ? ASSESSMENTS.map(a => a.id) : [];
  if (!allowed.includes(value)) throw new Error('Ogiltigt observationsval.');
  if (selected.includes(value)) return selected.filter(item => item !== value);
  if (kind === 'grades' && selected.length >= 2) throw new Error('Du kan välja högst två betyg. Avmarkera ett för att byta.');
  return allowed.filter(item => selected.includes(item) || item === value);
}
export function roster(data, classId, includeArchived = false) {
  return sortedStudents((data.classes.find(c => c.id === classId)?.students || []).filter(s => includeArchived || !s.archived));
}
export function sessionStudents(data, session) {
  const current = data.classes.find(c => c.id === session.classId)?.students || [];
  return sortedStudents(session.studentIds.map(id => current.find(s => s.id === id) || { id, ...session.studentNames[id], archived: true }));
}
export function scheduleBreakForDate(data, date) {
  return (data.breaks || []).find(b => b.start <= date && date <= b.end) || null;
}
export function weekStartDate(date) {
  const day = parseDate(date).getDay();
  return addDays(date, 1 - (day || 7));
}
export function schedulePlanSlot(data, classId, scheduleId) {
  const ordered = data.schedules.filter(s => s.classId === classId).sort((a, b) => ((a.day + 6) % 7) - ((b.day + 6) % 7) || a.start.localeCompare(b.start) || a.id.localeCompare(b.id));
  const index = ordered.findIndex(s => s.id === scheduleId);
  return index >= 0 && index < 3 ? index + 1 : null;
}
export function lessonPlan(data, yearGroup, weekStart, slot) {
  return (data.lessonPlans || []).find(p => p.yearGroup === Number(yearGroup) && p.weekStart === weekStart && p.slot === Number(slot)) || null;
}
export function setLessonPlan(data, yearGroup, weekStart, slot, topic) {
  const grade = Number(yearGroup), lesson = Number(slot), value = String(topic ?? '').trim();
  if (![7, 8, 9].includes(grade) || !isValidWeekStart(weekStart) || !Number.isInteger(lesson) || lesson < 1 || lesson > 3 || value.length > 200) throw new Error('Kontrollera årskurs, vecka och lektionsplanering.');
  data.lessonPlans ??= [];
  data.lessonPlans = data.lessonPlans.filter(p => !(p.yearGroup === grade && p.weekStart === weekStart && p.slot === lesson));
  if (value) data.lessonPlans.push({ yearGroup: grade, weekStart, slot: lesson, topic: value });
}
export function copyLessonPlanWeek(data, sourceYearGroup, targetYearGroups, weekStart) {
  const source = Number(sourceYearGroup), targets = [...new Set(targetYearGroups.map(Number))].filter(grade => [7, 8, 9].includes(grade) && grade !== source);
  if (![7, 8, 9].includes(source) || !isValidWeekStart(weekStart) || !targets.length) throw new Error('Välj minst en annan årskurs att kopiera till.');
  data.lessonPlans ??= [];
  for (const target of targets) {
    data.lessonPlans = data.lessonPlans.filter(p => !(p.yearGroup === target && p.weekStart === weekStart));
    for (const plan of data.lessonPlans.filter(p => p.yearGroup === source && p.weekStart === weekStart)) data.lessonPlans.push({ ...plan, yearGroup: target });
  }
  return targets;
}
function isValidWeekStart(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && dateKey(parseDate(value)) === value && parseDate(value).getDay() === 1;
}
export function lessonsForDate(data, date) {
  const day = parseDate(date).getDay();
  // Only suppress unsaved recurring lessons; existing and one-off lessons remain available.
  const recurring = scheduleBreakForDate(data, date) ? [] : data.schedules.filter(s => s.day === day);
  const list = recurring.map(s => {
    const saved = data.sessions.find(l => l.date === date && l.scheduleId === s.id);
    if (saved) return saved;
    const group = data.classes.find(c => c.id === s.classId)?.yearGroup;
    const slot = group ? schedulePlanSlot(data, s.classId, s.id) : null;
    const plannedTopic = slot ? lessonPlan(data, group, weekStartDate(date), slot)?.topic : '';
    return { ...s, id: `planned:${s.id}`, scheduleId: s.id, date, planned: true, planSlot: slot, topic: plannedTopic || s.topic };
  });
  for (const s of data.sessions.filter(s => s.date === date)) if (!list.some(l => l.id === s.id)) list.push(s);
  return list.sort((a, b) => a.start.localeCompare(b.start));
}
export function materialize(data, lesson) {
  if (!lesson.planned) return lesson;
  const students = roster(data, lesson.classId);
  const session = { id: uid(), classId: lesson.classId, className: data.classes.find(c => c.id === lesson.classId)?.name || '', scheduleId: lesson.scheduleId, date: lesson.date, start: lesson.start, end: lesson.end, location: lesson.location, topic: lesson.topic || '', studentIds: students.map(s => s.id), studentNames: Object.fromEntries(students.map(s => [s.id, { first: s.first, last: s.last }])), attendance: {}, attendanceDraft: null, attendanceSavedAt: null, observations: {}, skipObservation: false, finalAssessment: false, complete: false };
  data.sessions.push(session);
  return session;
}
export const blankAttendance = () => ({ absent: false, clothes: false, shoes: false, lateMinutes: 0 });
export function negative(o) { return observationGrades(o).includes('F') || observationAssessments(o).some(id => ['below', 'failed', 'notparticipating'].includes(id)); }
export function followup(data, studentId) {
  const student = data.classes.flatMap(c => c.students).find(s => s.id === studentId);
  const cutoff = [data.settings.termStart, student?.followupResetDate || '0000-00-00'];
  const entries = data.sessions.filter(s => !s.skipObservation && s.attendanceSavedAt && s.date >= cutoff[0] && s.date > cutoff[1] && !s.attendance[studentId]?.absent && s.observations[studentId]);
  const count = entries.filter(s => negative(s.observations[studentId])).length;
  const manual = entries.some(s => observationAssessments(s.observations[studentId]).includes('followup'));
  return { count, manual, flagged: manual || count >= data.settings.threshold };
}
export function followupSummaries(data) {
  const summaries = new Map();
  for (const c of data.classes) for (const student of c.students) summaries.set(student.id, { count: 0, manual: false, flagged: false, resetDate: student.followupResetDate || '0000-00-00' });
  for (const session of data.sessions) {
    if (session.skipObservation || !session.attendanceSavedAt || session.date < data.settings.termStart) continue;
    for (const studentId of session.studentIds) {
      const summary = summaries.get(studentId);
      if (!summary || session.date <= summary.resetDate || session.attendance[studentId]?.absent) continue;
      const observation = session.observations[studentId];
      if (!observation) continue;
      if (negative(observation)) summary.count++;
      if (observationAssessments(observation).includes('followup')) summary.manual = true;
    }
  }
  for (const summary of summaries.values()) {
    summary.flagged = summary.manual || summary.count >= data.settings.threshold;
    delete summary.resetDate;
  }
  return summaries;
}
export function flaggedStudents(data, summaries = followupSummaries(data)) {
  return data.classes.flatMap(c => roster(data, c.id).map(s => ({ ...s, classId: c.id, className: c.name, ...summaries.get(s.id) }))).filter(s => s.flagged);
}
export function filteredSessions(data, filters = {}) {
  return data.sessions.filter(s => s.attendanceSavedAt && (!filters.classId || s.classId === filters.classId) && (!filters.from || s.date >= filters.from) && (!filters.to || s.date <= filters.to)).sort((a, b) => b.date.localeCompare(a.date) || b.start.localeCompare(a.start));
}
export function unfinishedSessions(data, limit = 4) {
  const count = Math.max(0, Math.trunc(limit) || 0), newestFirst = (a, b) => b.date.localeCompare(a.date) || b.start.localeCompare(a.start), result = [];
  if (!count) return result;
  for (const session of data.sessions) {
    if (session.complete) continue;
    const index = result.findIndex(current => newestFirst(session, current) < 0);
    if (index < 0) { if (result.length < count) result.push(session); }
    else { result.splice(index, 0, session); if (result.length > count) result.pop(); }
  }
  return result;
}
export function studentFinalAssessments(data, studentId, sessions = filteredSessions(data, {})) {
  return sessions.filter(session => session.finalAssessment && session.studentIds.includes(studentId));
}
export function reportedLessons(sessions, now = new Date()) {
  const today = dateKey(now), time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  return sessions.filter(s => s.attendanceSavedAt && (s.date < today || (s.date === today && s.end <= time)));
}
export function studentStats(data, student, sessions, now = new Date()) {
  const recorded = sessions.filter(s => s.attendanceSavedAt && s.studentIds.includes(student.id));
  const relevant = reportedLessons(recorded, now);
  const attended = relevant.filter(s => !s.attendance[student.id]?.absent);
  const observationEligible = recorded.filter(s => !s.attendance[student.id]?.absent);
  const observed = observationEligible.filter(s => !s.skipObservation && hasObservation(s.observations[student.id]));
  const a = relevant.map(s => s.attendance[student.id] || blankAttendance());
  const absent = a.filter(a => a.absent).length, clothes = a.filter(a => a.clothes).length, shoes = a.filter(a => a.shoes).length;
  const percent = count => relevant.length ? Math.round(count / relevant.length * 100) : null;
  return { total: relevant.length, present: attended.length, absent, clothes, shoes, absentRate: percent(absent), clothesRate: percent(clothes), shoesRate: percent(shoes), late: a.filter(a => a.lateMinutes > 0).length, minutes: a.reduce((n, a) => n + (a.lateMinutes || 0), 0), rate: percent(attended.length), observationEligible: observationEligible.length, observed: observed.length, latest: observed[0]?.observations[student.id] || null, negative: observed.filter(s => negative(s.observations[student.id])).length, ...followup(data, student.id) };
}
export const EXPORT_FIELDS = [
  ['first', 'Förnamn'], ['last', 'Efternamn'], ['class', 'Klass'], ['date', 'Datum'], ['time', 'Tid'], ['topic', 'Arbetsområde'], ['finalAssessment', 'Slutbedömning'], ['attendance', 'Närvaro'], ['clothes', 'Glömt kläder'], ['shoes', 'Glömt skor'], ['late', 'Sen ankomst (min)'], ['assessment', 'Observation'], ['grade', 'Lektionsbedömning'], ['note', 'Anteckning'], ['followup', 'Behov av uppföljning'],
];
function exportValues(data, session, student) {
  const a = session.attendance[student.id] || blankAttendance();
  const o = session.skipObservation || a.absent ? {} : session.observations[student.id] || {};
  return { first: student.first, last: student.last, class: session.className || data.classes.find(c => c.id === session.classId)?.name || '', date: session.date, time: `${session.start}–${session.end}`, topic: session.topic || '', finalAssessment: session.finalAssessment ? 'Ja' : 'Nej', attendance: a.absent ? 'Frånvarande' : 'Närvarande', clothes: a.clothes ? 'Ja' : 'Nej', shoes: a.shoes ? 'Ja' : 'Nej', late: a.lateMinutes || 0, assessment: session.skipObservation ? 'Observation avstådd' : a.absent ? 'Frånvarande' : !hasObservation(o) ? 'Ej observerad' : observationLabel(o, '; ') || 'Ingen observationsmarkering', grade: gradeLabel(o), note: o.note || '', followup: followup(data, student.id).flagged ? 'Ja' : 'Nej' };
}
export function exportRows(data, filters, selected) {
  const rows = [selected.map(key => EXPORT_FIELDS.find(f => f[0] === key)[1])];
  for (const session of filteredSessions(data, filters).reverse()) for (const student of sessionStudents(data, session)) {
    const values = exportValues(data, session, student);
    rows.push(selected.map(key => values[key]));
  }
  return rows;
}
export function exportRowsByStudent(data, filters, selected) {
  const rows = [selected.map(key => EXPORT_FIELDS.find(f => f[0] === key)[1])], students = new Map();
  for (const session of filteredSessions(data, filters).reverse()) for (const student of sessionStudents(data, session)) {
    const values = exportValues(data, session, student);
    let record = students.get(student.id);
    if (!record) { record = { values, events: [] }; students.set(student.id, record); }
    record.events.push(values);
  }
  const records = [...students.values()].sort((a, b) => a.values.class.localeCompare(b.values.class, 'sv') || a.values.last.localeCompare(b.values.last, 'sv') || a.values.first.localeCompare(b.values.first, 'sv'));
  for (const record of records) rows.push(selected.map(key => ['first','last','class','followup'].includes(key) ? record.values[key] : record.events.map(event => String(event[key] ?? '').replace(/\r\n?|\n/g, ' ↵ ') || '–').join('\n')));
  return rows;
}
function assert(condition, message) { if (!condition) throw new Error(`Säkerhetskopian är ogiltig: ${message}`); }
const isText = (v, max = 2000) => typeof v === 'string' && v.length <= max;
const isDate = v => isText(v, 10) && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(parseDate(v).getTime()) && dateKey(parseDate(v)) === v;
const isTime = v => typeof v === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
const isObj = v => v && typeof v === 'object' && !Array.isArray(v);
export function validateData(data) {
  assert(isObj(data), 'data saknas.');
  for (const k of ['classes', 'schedules', 'sessions']) assert(Array.isArray(data[k]), `${k} saknas.`);
  assert(data.classes.length <= 200 && data.schedules.length <= 2000 && data.sessions.length <= 30000, 'filen innehåller för många poster.');
  if (data.breaks !== undefined) {
    assert(Array.isArray(data.breaks) && data.breaks.length <= 500, 'fel i lov och studiedagar.');
    const breakIds = new Set();
    for (const b of data.breaks) {
      assert(isObj(b) && isText(b.id, 100) && b.id && !breakIds.has(b.id) && isDate(b.start) && isDate(b.end) && b.start <= b.end && b.end <= addDays(b.start, 366) && isText(b.label, 100) && b.label.trim(), 'ogiltigt schemauppehåll.');
      breakIds.add(b.id);
    }
  }
  const classIds = new Set(), studentIds = new Set(), sessionIds = new Set(), scheduleIds = new Set();
  for (const c of data.classes) {
    assert(isText(c.id, 100) && !classIds.has(c.id) && isText(c.name, 80) && c.name.trim() && Array.isArray(c.students) && c.students.length <= 500, 'fel i en klass.'); classIds.add(c.id);
    assert(c.yearGroup === undefined || c.yearGroup === null || [7, 8, 9].includes(c.yearGroup), 'ogiltig årskurs för en klass.');
    for (const s of c.students) {
      assert(isText(s.id, 100) && !studentIds.has(s.id) && isText(s.first, 100) && s.first.trim() && isText(s.last, 100) && s.last.trim() && typeof s.archived === 'boolean', 'fel i en elev.');
      assert(!s.followupResetDate || isDate(s.followupResetDate), 'ogiltigt uppföljningsdatum.'); studentIds.add(s.id);
    }
  }
  if (data.lessonPlans !== undefined) {
    assert(Array.isArray(data.lessonPlans) && data.lessonPlans.length <= 5000, 'fel i grovplaneringen.');
    const plans = new Set();
    for (const plan of data.lessonPlans) {
      const key = `${plan?.yearGroup}:${plan?.weekStart}:${plan?.slot}`;
      assert(isObj(plan) && [7, 8, 9].includes(plan.yearGroup) && isValidWeekStart(plan.weekStart) && Number.isInteger(plan.slot) && plan.slot >= 1 && plan.slot <= 3 && isText(plan.topic, 200) && plan.topic.trim() && !plans.has(key), 'ogiltig eller dubblerad lektionsplanering.');
      plans.add(key);
    }
  }
  for (const s of data.schedules) { assert(isText(s.id, 100) && !scheduleIds.has(s.id) && classIds.has(s.classId) && Number.isInteger(s.day) && s.day >= 0 && s.day <= 6 && isTime(s.start) && isTime(s.end) && s.end > s.start && isText(s.location, 200) && isText(s.topic, 200), 'fel i veckoschemat.'); scheduleIds.add(s.id); }
  const lessonKeys = new Set();
  for (const s of data.sessions) {
    assert(isText(s.id, 100) && !sessionIds.has(s.id) && classIds.has(s.classId) && isDate(s.date) && isTime(s.start) && isTime(s.end) && s.end > s.start && isText(s.topic, 200) && isText(s.location, 200) && typeof s.skipObservation === 'boolean' && typeof s.complete === 'boolean' && (s.finalAssessment === undefined || typeof s.finalAssessment === 'boolean'), 'fel i en lektion.'); sessionIds.add(s.id);
    assert(Array.isArray(s.studentIds) && s.studentIds.length <= 500 && new Set(s.studentIds).size === s.studentIds.length && isObj(s.studentNames) && isObj(s.attendance) && isObj(s.observations), 'fel i lektionslistan.');
    const members = data.classes.find(c => c.id === s.classId).students;
    assert(s.studentIds.every(id => members.some(m => m.id === id) && isObj(s.studentNames[id]) && isText(s.studentNames[id].first, 100) && isText(s.studentNames[id].last, 100)), 'felaktig koppling mellan elev och klass.');
    if (s.scheduleId) { assert(isText(s.scheduleId, 100) && !lessonKeys.has(`${s.date}:${s.scheduleId}`), 'dubblerad schemalektion.'); lessonKeys.add(`${s.date}:${s.scheduleId}`); }
    assert(s.attendanceSavedAt === null || (isText(s.attendanceSavedAt, 40) && !Number.isNaN(Date.parse(s.attendanceSavedAt))), 'fel i närvarons sparning.');
    for (const record of [s.attendance, s.attendanceDraft || {}]) {
      assert(isObj(record), 'fel i närvaroutkast.');
      for (const [id, a] of Object.entries(record)) assert(s.studentIds.includes(id) && isObj(a) && ['absent','clothes','shoes'].every(k => typeof a[k] === 'boolean') && Number.isInteger(a.lateMinutes) && a.lateMinutes >= 0 && a.lateMinutes <= 600, 'felaktig närvaro.');
    }
    if (s.attendanceSavedAt) assert(s.studentIds.every(id => s.attendance[id]), 'bekräftad närvaro saknar elever.');
    for (const [id, o] of Object.entries(s.observations)) {
      assert(s.studentIds.includes(id) && isObj(o) && (!o.grade || GRADES.includes(o.grade)) && (!o.assessment || ASSESSMENTS.some(a => a.id === o.assessment)) && isText(o.note, 2000), 'felaktig observation.');
      if (o.assessments !== undefined) assert(Array.isArray(o.assessments) && o.assessments.length <= ASSESSMENTS.length && new Set(o.assessments).size === o.assessments.length && o.assessments.every(id => ASSESSMENTS.some(a => a.id === id)), 'felaktiga observationsmarkeringar.');
      if (o.grades !== undefined) assert(Array.isArray(o.grades) && o.grades.length <= 2 && new Set(o.grades).size === o.grades.length && o.grades.every(g => GRADES.includes(g)), 'välj högst två giltiga betyg per observation.');
    }
  }
  assert(isObj(data.settings) && isText(data.settings.teacher, 100) && isText(data.settings.school, 120) && isDate(data.settings.termStart) && Number.isInteger(data.settings.threshold) && data.settings.threshold >= 1 && data.settings.threshold <= 10, 'fel i inställningarna.');
  return data;
}
export function upgradeData(data) {
  validateData(data);
  const upgraded = clone(data);
  upgraded.breaks ??= [];
  upgraded.lessonPlans ??= [];
  for (const c of upgraded.classes) c.yearGroup ??= null;
  upgraded.settings.theme ??= 'green';
  for (const session of upgraded.sessions) session.finalAssessment ??= false;
  for (const session of upgraded.sessions) for (const [id, o] of Object.entries(session.observations)) {
    const { assessment, grade, ...rest } = o;
    session.observations[id] = { ...rest, assessments: observationAssessments(o), grades: observationGrades(o) };
  }
  return upgraded;
}
export function upgradeWorkspace(envelope) {
  if (!isObj(envelope) || ![1, SCHEMA].includes(envelope.schemaVersion) || !['real','demo'].includes(envelope.active)) throw new Error('Dataversionen kan inte öppnas. Uppgifterna har inte skrivits över.');
  return { ...envelope, schemaVersion: SCHEMA, demo: upgradeData(envelope.demo), real: upgradeData(envelope.real) };
}
export function parseBackup(text) {
  assert(typeof text === 'string' && text.length <= 20000000, 'filen är för stor.');
  const backup = JSON.parse(text);
  assert(backup.app === 'Idrottspuls' && [1, SCHEMA].includes(backup.schemaVersion) && ['real', 'demo'].includes(backup.mode), 'fel app eller version.');
  return { ...backup, schemaVersion: SCHEMA, data: upgradeData(backup.data) };
}
export function demoData(today = dateKey()) {
  const data = emptyData();
  const names = [['Alva','Andersson'],['Omar','Berg'],['Elias','Bergström'],['Maja','Dahl'],['Noah','Ek'],['Ella','Engström'],['Liam','Eriksson'],['Amina','Farah'],['Hugo','Gustafsson'],['Lea','Holm'],['Isak','Johansson'],['Sara','Karlsson'],['William','Lind'],['Nora','Lindberg'],['Adam','Nilsson'],['Olivia','Persson'],['Lucas','Sjöberg'],['Freja','Öberg']];
  for (let i = 0; i < 3; i++) data.classes.push({ id: `class-${i}`, name: ['7A', '8B', '9A'][i], color: ['sage', 'coral', 'blue'][i], students: names.slice(0, 18 - i * 2).map(([first, last], j) => ({ id: `student-${i}-${j}`, first: i ? ['Vera','Alex','Ines','Malte','Selma','Samir','Lilly','Aron','Signe','Vincent','Dina','Joel','Mira','Sixten','Juni','Elton'][j] || first : first, last, archived: false })) });
  for (const day of [1,2,3,4,5]) for (let i = 0; i < (day === 3 ? 2 : 3); i++) data.schedules.push({ id: `schedule-${day}-${i}`, classId: `class-${i}`, day, start: ['08:30','10:15','13:00'][i], end: ['09:30','11:15','14:00'][i], location: i === 2 ? 'Lilla hallen' : 'Stora hallen', topic: ['Volleyboll','Rörelse & rytm','Styrka & hälsa'][i] });
  for (let week = 1; week <= 3; week++) {
    let date = addDays(today, -7 * week);
    if ([0,6].includes(parseDate(date).getDay())) date = addDays(date, -2);
    const schedule = data.schedules.find(s => s.day === parseDate(date).getDay() && s.classId === 'class-0');
    if (!schedule) continue;
    const session = materialize(data, { ...schedule, date, planned: true, scheduleId: schedule.id });
    session.attendanceSavedAt = `${date}T10:00:00.000Z`; session.complete = true;
    for (const student of roster(data, session.classId)) {
      const i = Number(student.id.split('-').at(-1));
      session.attendance[student.id] = { absent: i === 9 && week === 2, clothes: i === 6, shoes: i === 9, lateMinutes: i === 12 ? 5 : 0 };
      if (!session.attendance[student.id].absent) session.observations[student.id] = { assessments: [[2,14].includes(i) ? 'below' : i % 3 ? 'good' : 'excellent'], grades: [i === 14 ? 'F' : ['B','C','D'][i % 3]], note: i === 2 ? 'Behöver stöd i samspel och placering.' : '' };
    }
  }
  data.settings.school = 'Min idrottssal';
  return data;
}
