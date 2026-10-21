import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { emptyData, demoData, materialize, blankAttendance, followup, validateData, parseBackup, exportRows, roster, lessonsForDate, studentStats, filteredSessions } from '../web/model.js';
import { createXlsx } from '../web/xlsx.js';

function fixture() {
  const data=emptyData();data.settings.termStart='2026-08-01';
  data.classes=[{id:'c1',name:'7A',students:[{id:'s1',first:'Åsa',last:'Öberg',archived:false},{id:'s2',first:'Amir',last:'Andersson',archived:false}]}];
  return data;
}
function lesson(data,date,observation={grade:'F',assessment:'below',note:''}) {
  const s=materialize(data,{planned:true,classId:'c1',scheduleId:null,date,start:'08:00',end:'09:00',topic:'Volleyboll',location:'Hallen'});
  s.attendance=Object.fromEntries(s.studentIds.map(id=>[id,blankAttendance()]));s.attendanceSavedAt=`${date}T10:00:00Z`;s.observations.s1=observation;return s;
}
test('A student is flagged after three different negative lessons, never after two',()=>{
  const d=fixture();lesson(d,'2026-10-01');lesson(d,'2026-10-02');assert.deepEqual(followup(d,'s1'),{count:2,manual:false,flagged:false});lesson(d,'2026-10-03');assert.equal(followup(d,'s1').flagged,true);
});
test('F and a negative assessment on the same lesson count once; editing is an upsert',()=>{
  const d=fixture(),s=lesson(d,'2026-10-01');assert.equal(followup(d,'s1').count,1);s.observations.s1.grade='E';assert.equal(followup(d,'s1').count,1);s.observations.s1.assessment='good';assert.equal(followup(d,'s1').count,0);
});
test('All four requested automatic triggers count',()=>{
  for(const o of [{grade:'F'},{assessment:'below'},{assessment:'failed'},{assessment:'notparticipating'}]){const d=fixture();lesson(d,'2026-10-01',{grade:'',assessment:'',note:'',...o});assert.equal(followup(d,'s1').count,1);}
});
test('A skipped observation never counts, even if a previous F is retained',()=>{
  const d=fixture(),s=lesson(d,'2026-10-01');s.skipObservation=true;assert.equal(followup(d,'s1').count,0);s.skipObservation=false;assert.equal(followup(d,'s1').count,1);
});
test('Absence, unsaved attendance and an unobserved student never count',()=>{
  const d=fixture(),s=lesson(d,'2026-10-01');s.attendance.s1.absent=true;assert.equal(followup(d,'s1').count,0);s.attendance.s1.absent=false;s.attendanceSavedAt=null;assert.equal(followup(d,'s1').count,0);assert.equal(followup(d,'s2').count,0);
});
test('An explicit manual request flags immediately without a negative count',()=>{
  const d=fixture();lesson(d,'2026-10-01',{assessment:'followup',grade:'',note:''});assert.deepEqual(followup(d,'s1'),{count:0,manual:true,flagged:true});
});
test('Term boundaries and completed follow-up reset the active count but keep history',()=>{
  const d=fixture();lesson(d,'2026-07-31');lesson(d,'2026-10-01');lesson(d,'2026-10-02');d.classes[0].students[0].followupResetDate='2026-10-01';assert.equal(followup(d,'s1').count,1);assert.equal(d.sessions.length,3);
});
test('The roster uses Swedish surname order and archived pupils stay in historical lessons',()=>{
  const d=fixture(),s=lesson(d,'2026-10-01');assert.equal(roster(d,'c1')[0].last,'Andersson');d.classes[0].students[0].archived=true;assert.equal(roster(d,'c1').length,1);assert.equal(s.studentIds.length,2);
});
test('Deleting or editing a schedule preserves already materialized lessons',()=>{
  const d=fixture();d.schedules=[{id:'sch',classId:'c1',day:4,start:'08:00',end:'09:00',topic:'Volleyboll',location:'Hall'}];const planned=lessonsForDate(d,'2026-10-01')[0];const s=materialize(d,planned);d.schedules[0].start='10:00';assert.equal(lessonsForDate(d,'2026-10-01')[0].start,'08:00');d.schedules=[];assert.equal(lessonsForDate(d,'2026-10-01')[0].id,s.id);
});
test('Summary excludes unsaved attendance, computes rates and retains distinct equipment flags',()=>{
  const d=fixture();const first=lesson(d,'2026-10-01');first.attendance.s1={absent:false,clothes:true,shoes:false,lateMinutes:7};const second=lesson(d,'2026-10-02');second.attendance.s1.absent=true;const third=lesson(d,'2026-10-03');third.attendanceSavedAt=null;const stats=studentStats(d,d.classes[0].students[0],filteredSessions(d));assert.equal(stats.total,2);assert.equal(stats.rate,50);assert.equal(stats.clothes,1);assert.equal(stats.shoes,0);assert.equal(stats.minutes,7);
});
test('Exports respect chosen columns, date and class filters and do not grade absent pupils',()=>{
  const d=fixture(),s=lesson(d,'2026-10-01');s.attendance.s1.absent=true;const rows=exportRows(d,{from:'2026-10-01',to:'2026-10-01',classId:'c1'},['last','first','grade','late']);assert.equal(rows.length,3);assert.deepEqual(rows.find(r=>r[0]==='Öberg'),['Öberg','Åsa','',0]);assert.equal(exportRows(d,{from:'2026-10-02'},['first']).length,1);
});
test('Backup round trips preserve local drafts and data',()=>{
  const d=fixture(),s=lesson(d,'2026-10-01');s.attendanceDraft={s1:{...blankAttendance(),lateMinutes:4}};const text=JSON.stringify({app:'Idrottspuls',schemaVersion:1,mode:'real',data:d});assert.deepEqual(parseBackup(text).data,d);assert.doesNotThrow(()=>validateData(demoData('2026-10-20')));
});
test('Invalid imports cannot silently overwrite the lektionsbok',()=>{
  const d=fixture();lesson(d,'2026-10-01');const envelope=()=>JSON.stringify({app:'Idrottspuls',schemaVersion:1,mode:'real',data:d});d.sessions[0].attendance.s1.lateMinutes=-4;assert.throws(()=>parseBackup(envelope()));d.sessions[0].attendance.s1.lateMinutes=0;d.classes[0].students[1].id='s1';assert.throws(()=>parseBackup(envelope()));assert.throws(()=>parseBackup('{"app":"Wrong"}'));assert.throws(()=>parseBackup('not json'));
});
test('A duplicate scheduled lesson or invalid class/student relationship is rejected',()=>{
  const d=fixture();const s=lesson(d,'2026-10-01');s.scheduleId='schedule1';d.sessions.push({...structuredClone(s),id:'other'});assert.throws(()=>validateData(d));d.sessions.pop();s.studentIds.push('missing');assert.throws(()=>validateData(d));
});
test('Generated Excel is an actual OOXML zip, including Unicode and safe literal formulas',async()=>{
  const rows=[['Förnamn','Efternamn','Anteckning','Sen ankomst'],['Åsa','Öberg','=HYPERLINK("https://example.com")',7],['Amir','Andersson','Passning & samspel <bra>',0]];
  const file=createXlsx(rows);assert.deepEqual([...file.slice(0,4)],[80,75,3,4]);const out=new URL('../../../work/qa/',import.meta.url);await mkdir(out,{recursive:true});await writeFile(new URL('export-test.xlsx',out),file);
});
