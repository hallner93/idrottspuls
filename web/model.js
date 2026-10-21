export const SCHEMA = 1;
export const GRADES = ['F', 'E', 'D', 'C', 'B', 'A'];
export const ASSESSMENTS = [
  { id: 'followup', label: 'Behov av uppföljning', tone: 'amber', icon: 'flag' },
  { id: 'excellent', label: 'Mycket bra', tone: 'green', icon: 'sparkles' },
  { id: 'good', label: 'Bra', tone: 'green', icon: 'thumb' },
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
  return { classes: [], schedules: [], sessions: [], settings: { school: '', teacher: '', termStart: termStart(), threshold: 3, lastBackup: null } };
}
export const studentName = s => `${s.first} ${s.last}`.trim();
const collator = new Intl.Collator('sv', { sensitivity: 'base', numeric: true });
export const sortedStudents = list => [...list].sort((a, b) => collator.compare(a.last, b.last) || collator.compare(a.first, b.first));
export const assessmentLabel = id => ASSESSMENTS.find(a => a.id === id)?.label || 'Ingen observationsmarkering';
export function roster(data, classId, includeArchived = false) {
  return sortedStudents((data.classes.find(c => c.id === classId)?.students || []).filter(s => includeArchived || !s.archived));
}
export function sessionStudents(data, session) {
  const current = data.classes.find(c => c.id === session.classId)?.students || [];
  return sortedStudents(session.studentIds.map(id => current.find(s => s.id === id) || { id, ...session.studentNames[id], archived: true }));
}
export function lessonsForDate(data, date) {
  const day = parseDate(date).getDay();
  const list = data.schedules.filter(s => s.day === day).map(s => {
    const saved = data.sessions.find(l => l.date === date && l.scheduleId === s.id);
    return saved || { ...s, id: `planned:${s.id}`, scheduleId: s.id, date, planned: true };
  });
  for (const s of data.sessions.filter(s => s.date === date)) if (!list.some(l => l.id === s.id)) list.push(s);
  return list.sort((a, b) => a.start.localeCompare(b.start));
}
export function materialize(data, lesson) {
  if (!lesson.planned) return lesson;
  const students = roster(data, lesson.classId);
  const session = { id: uid(), classId: lesson.classId, className: data.classes.find(c => c.id === lesson.classId)?.name || '', scheduleId: lesson.scheduleId, date: lesson.date, start: lesson.start, end: lesson.end, location: lesson.location, topic: lesson.topic || '', studentIds: students.map(s => s.id), studentNames: Object.fromEntries(students.map(s => [s.id, { first: s.first, last: s.last }])), attendance: {}, attendanceDraft: null, attendanceSavedAt: null, observations: {}, skipObservation: false, complete: false };
  data.sessions.push(session);
  return session;
}
export const blankAttendance = () => ({ absent: false, clothes: false, shoes: false, lateMinutes: 0 });
export function negative(o) { return !!o && (o.grade === 'F' || ['below', 'failed', 'notparticipating'].includes(o.assessment)); }
export function followup(data, studentId) {
  const student = data.classes.flatMap(c => c.students).find(s => s.id === studentId);
  const cutoff = [data.settings.termStart, student?.followupResetDate || '0000-00-00'];
  const entries = data.sessions.filter(s => !s.skipObservation && s.attendanceSavedAt && s.date >= cutoff[0] && s.date > cutoff[1] && !s.attendance[studentId]?.absent && s.observations[studentId]);
  const count = entries.filter(s => negative(s.observations[studentId])).length;
  const manual = entries.some(s => s.observations[studentId]?.assessment === 'followup');
  return { count, manual, flagged: manual || count >= data.settings.threshold };
}
export function flaggedStudents(data) {
  return data.classes.flatMap(c => roster(data, c.id).map(s => ({ ...s, classId: c.id, className: c.name, ...followup(data, s.id) }))).filter(s => s.flagged);
}
export function filteredSessions(data, filters = {}) {
  return data.sessions.filter(s => s.attendanceSavedAt && (!filters.classId || s.classId === filters.classId) && (!filters.from || s.date >= filters.from) && (!filters.to || s.date <= filters.to)).sort((a, b) => b.date.localeCompare(a.date) || b.start.localeCompare(a.start));
}
export function studentStats(data, student, sessions) {
  const relevant = sessions.filter(s => s.studentIds.includes(student.id));
  const attended = relevant.filter(s => !s.attendance[student.id]?.absent);
  const observed = attended.filter(s => !s.skipObservation && s.observations[student.id]);
  const a = relevant.map(s => s.attendance[student.id] || blankAttendance());
  return { total: relevant.length, present: attended.length, absent: a.filter(a => a.absent).length, clothes: a.filter(a => a.clothes).length, shoes: a.filter(a => a.shoes).length, late: a.filter(a => a.lateMinutes > 0).length, minutes: a.reduce((n, a) => n + (a.lateMinutes || 0), 0), rate: relevant.length ? Math.round(attended.length / relevant.length * 100) : null, observed: observed.length, latest: observed[0]?.observations[student.id] || null, negative: observed.filter(s => negative(s.observations[student.id])).length, ...followup(data, student.id) };
}
export const EXPORT_FIELDS = [
  ['first', 'Förnamn'], ['last', 'Efternamn'], ['class', 'Klass'], ['date', 'Datum'], ['time', 'Tid'], ['topic', 'Arbetsområde'], ['attendance', 'Närvaro'], ['clothes', 'Glömt kläder'], ['shoes', 'Glömt skor'], ['late', 'Sen ankomst (min)'], ['assessment', 'Observation'], ['grade', 'Lektionsbedömning'], ['note', 'Anteckning'], ['followup', 'Behov av uppföljning'],
];
export function exportRows(data, filters, selected) {
  const rows = [selected.map(key => EXPORT_FIELDS.find(f => f[0] === key)[1])];
  for (const session of filteredSessions(data, filters).reverse()) for (const student of sessionStudents(data, session)) {
    const a = session.attendance[student.id] || blankAttendance();
    const o = session.skipObservation || a.absent ? {} : session.observations[student.id] || {};
    const values = { first: student.first, last: student.last, class: session.className || data.classes.find(c => c.id === session.classId)?.name || '', date: session.date, time: `${session.start}–${session.end}`, topic: session.topic || '', attendance: a.absent ? 'Frånvarande' : 'Närvarande', clothes: a.clothes ? 'Ja' : 'Nej', shoes: a.shoes ? 'Ja' : 'Nej', late: a.lateMinutes || 0, assessment: session.skipObservation ? 'Observation avstådd' : a.absent ? 'Frånvarande' : !o.assessment && !o.grade && !o.note ? 'Ej observerad' : assessmentLabel(o.assessment), grade: o.grade || '', note: o.note || '', followup: followup(data, student.id).flagged ? 'Ja' : 'Nej' };
    rows.push(selected.map(key => values[key]));
  }
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
  const classIds = new Set(), studentIds = new Set(), sessionIds = new Set(), scheduleIds = new Set();
  for (const c of data.classes) {
    assert(isText(c.id, 100) && !classIds.has(c.id) && isText(c.name, 80) && c.name.trim() && Array.isArray(c.students) && c.students.length <= 500, 'fel i en klass.'); classIds.add(c.id);
    for (const s of c.students) {
      assert(isText(s.id, 100) && !studentIds.has(s.id) && isText(s.first, 100) && s.first.trim() && isText(s.last, 100) && s.last.trim() && typeof s.archived === 'boolean', 'fel i en elev.');
      assert(!s.followupResetDate || isDate(s.followupResetDate), 'ogiltigt uppföljningsdatum.'); studentIds.add(s.id);
    }
  }
  for (const s of data.schedules) { assert(isText(s.id, 100) && !scheduleIds.has(s.id) && classIds.has(s.classId) && Number.isInteger(s.day) && s.day >= 0 && s.day <= 6 && isTime(s.start) && isTime(s.end) && s.end > s.start && isText(s.location, 200) && isText(s.topic, 200), 'fel i veckoschemat.'); scheduleIds.add(s.id); }
  const lessonKeys = new Set();
  for (const s of data.sessions) {
    assert(isText(s.id, 100) && !sessionIds.has(s.id) && classIds.has(s.classId) && isDate(s.date) && isTime(s.start) && isTime(s.end) && s.end > s.start && isText(s.topic, 200) && isText(s.location, 200) && typeof s.skipObservation === 'boolean' && typeof s.complete === 'boolean', 'fel i en lektion.'); sessionIds.add(s.id);
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
    for (const [id, o] of Object.entries(s.observations)) assert(s.studentIds.includes(id) && isObj(o) && (!o.grade || GRADES.includes(o.grade)) && (!o.assessment || ASSESSMENTS.some(a => a.id === o.assessment)) && isText(o.note, 2000), 'felaktig observation.');
  }
  assert(isObj(data.settings) && isText(data.settings.teacher, 100) && isText(data.settings.school, 120) && isDate(data.settings.termStart) && Number.isInteger(data.settings.threshold) && data.settings.threshold >= 1 && data.settings.threshold <= 10, 'fel i inställningarna.');
  return data;
}
export function parseBackup(text) {
  assert(typeof text === 'string' && text.length <= 20000000, 'filen är för stor.');
  const backup = JSON.parse(text);
  assert(backup.app === 'Idrottspuls' && backup.schemaVersion === SCHEMA && ['real', 'demo'].includes(backup.mode), 'fel app eller version.');
  return { ...backup, data: validateData(backup.data) };
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
      if (!session.attendance[student.id].absent) session.observations[student.id] = { assessment: [2,14].includes(i) ? 'below' : i % 3 ? 'good' : 'excellent', grade: i === 14 ? 'F' : ['B','C','D'][i % 3], note: i === 2 ? 'Behöver stöd i samspel och placering.' : '' };
    }
  }
  data.settings.school = 'Min idrottssal';
  return data;
}
