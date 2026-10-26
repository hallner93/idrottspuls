import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { SCHEMA, emptyData, demoData, materialize, blankAttendance, followup, followupSummaries, validateData, parseBackup, exportRows, exportRowsByStudent, roster, lessonsForDate, studentStats, filteredSessions, studentFinalAssessments, reportedLessons, upgradeData, upgradeWorkspace, observationAssessments, observationGrades, observationLabel, gradeLabel, hasObservation, toggleObservationChoice, parseStudentList, validateStudentList, searchClasses, unfinishedSessions, weekStartDate, schedulePlanSlot, lessonPlan, setLessonPlan, copyLessonPlanWeek, planWeekStatus, termPlanWeeks } from '../web/model.js';
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
test('Class search matches class and active student names case-insensitively',()=>{
  const classes=[{name:'7A',students:[{first:'Åsa',last:'Öberg',archived:false},{first:'Nils',last:'Test',archived:true}]},{name:'8B',students:[{first:'Amir',last:'Andersson',archived:false}]}];
  assert.deepEqual(searchClasses(classes,'7a'),[classes[0]]);
  assert.deepEqual(searchClasses(classes,'åsa'),[classes[0]]);
  assert.deepEqual(searchClasses(classes,'Nils'),[]);
  assert.deepEqual(searchClasses(classes,''),classes);
});
test('Unfinished lesson shortcuts include only active sessions, newest first, with a limit',()=>{
  const d=fixture(),older=lesson(d,'2026-10-01'),finished=lesson(d,'2026-10-03'),newer=lesson(d,'2026-10-08');
  finished.complete=true;
  assert.deepEqual(unfinishedSessions(d).map(s=>s.id),[newer.id,older.id]);
  assert.deepEqual(unfinishedSessions(d,1).map(s=>s.id),[newer.id]);
});
test('Weekly lesson plans follow the class year group and the three scheduled lessons in week order',()=>{
  const d=fixture();d.classes[0].yearGroup=7;
  d.schedules=[
    {id:'fri',classId:'c1',day:5,start:'09:00',end:'10:00',location:'Hall',topic:'Ordinarie fredag'},
    {id:'mon',classId:'c1',day:1,start:'08:00',end:'09:00',location:'Hall',topic:'Ordinarie måndag'},
    {id:'wed',classId:'c1',day:3,start:'10:00',end:'11:00',location:'Hall',topic:'Ordinarie onsdag'},
  ];
  assert.equal(weekStartDate('2026-10-28'),'2026-10-26');
  assert.deepEqual(['mon','wed','fri'].map(id=>schedulePlanSlot(d,'c1',id)),[1,2,3]);
  setLessonPlan(d,7,'2026-10-26',1,'Volleyboll: fingerslag');
  setLessonPlan(d,7,'2026-10-26',2,'Styrka: cirkelträning');
  setLessonPlan(d,7,'2026-10-26',3,'Orientering');
  assert.equal(lessonsForDate(d,'2026-10-26')[0].topic,'Volleyboll: fingerslag');
  assert.equal(lessonsForDate(d,'2026-10-28')[0].topic,'Styrka: cirkelträning');
  const friday=materialize(d,lessonsForDate(d,'2026-10-30')[0]);
  assert.equal(friday.topic,'Orientering');
  friday.topic='Orientering utomhus';
  setLessonPlan(d,7,'2026-10-26',3,'Balans');
  assert.equal(lessonsForDate(d,'2026-10-30')[0].topic,'Orientering utomhus','a started lesson keeps its editable topic');
  assert.equal(lessonPlan(d,7,'2026-10-26',3).topic,'Balans','changing a lesson does not edit the shared plan');
});
test('The term week list follows the configured term start and marks full and partial breaks',()=>{
  const d=fixture();d.classes[0].yearGroup=7;
  d.schedules=[{id:'mon',classId:'c1',day:1,start:'08:00',end:'09:00'},{id:'wed',classId:'c1',day:3,start:'08:00',end:'09:00'},{id:'fri',classId:'c1',day:5,start:'08:00',end:'09:00'}];
  d.settings.termStart='2026-10-28';d.breaks=[{id:'study',start:'2026-10-26',end:'2026-10-26',label:'Studiedag'},{id:'holiday',start:'2026-11-02',end:'2026-11-08',label:'Höstlov'}];
  const weeks=termPlanWeeks(d,7,d.settings.termStart,3);
  assert.deepEqual(weeks.map(w=>w.weekStart),['2026-10-26','2026-11-02','2026-11-09']);
  assert.deepEqual(planWeekStatus(d,7,'2026-10-26'),{scheduledCount:3,activeCount:2,affectedCount:1,excluded:false});
  assert.equal(weeks[1].excluded,true);assert.equal(weeks[1].activeCount,0);assert.equal(weeks[2].excluded,false);
});
test('Copying a weekly plan replaces only the selected year groups and keeps plans separate by week',()=>{
  const d=fixture();setLessonPlan(d,7,'2026-10-26',1,'Volleyboll');setLessonPlan(d,7,'2026-10-26',2,'Rörelse');
  setLessonPlan(d,8,'2026-10-26',1,'Gammal plan');setLessonPlan(d,9,'2026-10-26',1,'Behåll år 9');setLessonPlan(d,8,'2026-11-02',1,'Nästa vecka');
  assert.deepEqual(copyLessonPlanWeek(d,7,[8],'2026-10-26'),[8]);
  assert.equal(lessonPlan(d,8,'2026-10-26',1).topic,'Volleyboll');
  assert.equal(lessonPlan(d,8,'2026-10-26',2).topic,'Rörelse');
  assert.equal(lessonPlan(d,9,'2026-10-26',1).topic,'Behåll år 9');
  assert.equal(lessonPlan(d,8,'2026-11-02',1).topic,'Nästa vecka');
  assert.doesNotThrow(()=>validateData(d));
});
test('A student is flagged after three different negative lessons, never after two',()=>{
  const d=fixture();lesson(d,'2026-10-01');lesson(d,'2026-10-02');assert.deepEqual(followup(d,'s1'),{count:2,manual:false,flagged:false});lesson(d,'2026-10-03');assert.equal(followup(d,'s1').flagged,true);
});
test('The overview follow-up index matches per-student results without rescanning sessions for every pupil',()=>{
  const d=fixture();
  lesson(d,'2026-10-01',{assessments:['below'],grades:[],note:''});
  lesson(d,'2026-10-02',{assessments:['followup'],grades:[],note:''});
  const absent=lesson(d,'2026-10-03');absent.attendance.s1.absent=true;
  const unsaved=lesson(d,'2026-10-04');unsaved.attendanceSavedAt=null;
  d.classes[0].students[0].followupResetDate='2026-10-01';
  const indexed=followupSummaries(d);
  for(const student of d.classes[0].students) assert.deepEqual(indexed.get(student.id),followup(d,student.id));
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
  const d=fixture();const first=lesson(d,'2026-10-01');first.attendance.s1={absent:false,clothes:true,shoes:false,lateMinutes:7};const second=lesson(d,'2026-10-02');second.attendance.s1.absent=true;const third=lesson(d,'2026-10-03');third.attendanceSavedAt=null;const stats=studentStats(d,d.classes[0].students[0],filteredSessions(d),new Date(2026,9,22,12));assert.equal(stats.total,2);assert.equal(stats.rate,50);assert.equal(stats.clothes,1);assert.equal(stats.shoes,0);assert.equal(stats.minutes,7);
});
test('Exports respect chosen columns, date and class filters and do not grade absent pupils',()=>{
  const d=fixture(),s=lesson(d,'2026-10-01');s.attendance.s1.absent=true;const rows=exportRows(d,{from:'2026-10-01',to:'2026-10-01',classId:'c1'},['last','first','grade','late']);assert.equal(rows.length,3);assert.deepEqual(rows.find(r=>r[0]==='Öberg'),['Öberg','Åsa','',0]);assert.equal(exportRows(d,{from:'2026-10-02'},['first']).length,1);
});
test('Student overview export includes each pupil once and keeps lesson values aligned',()=>{
  const d=fixture();lesson(d,'2026-10-01',{assessments:['good'],grades:['B'],note:'Bra passning\nLöpning'});lesson(d,'2026-10-08',{assessments:['okay'],grades:['C'],note:'Samarbete'});
  const selected=['first','last','date','assessment','grade','note'],rows=exportRowsByStudent(d,{from:'2026-10-01',to:'2026-10-08'},selected);
  assert.equal(rows.length,3);
  assert.deepEqual(rows[0],['Förnamn','Efternamn','Datum','Observation','Lektionsbedömning','Anteckning']);
  assert.deepEqual(rows.find(row=>row[0]==='Åsa'),['Åsa','Öberg','2026-10-01\n2026-10-08','Bra\nOkej','B\nC','Bra passning ↵ Löpning\nSamarbete']);
  assert.deepEqual(rows.find(row=>row[0]==='Amir'),['Amir','Andersson','2026-10-01\n2026-10-08','Ej observerad\nEj observerad','–\n–','–\n–']);
  assert.equal(exportRows(d,{},['first']).length,5,'lesson detail export remains available');
});
test('Final assessment is stored per lesson, appears in both Excel layouts and each participating pupil summary',()=>{
  const d=fixture(),first=lesson(d,'2026-10-01'),second=lesson(d,'2026-10-08');second.finalAssessment=true;
  assert.equal(first.finalAssessment,false);
  assert.deepEqual(studentFinalAssessments(d,'s1'),[second]);
  assert.deepEqual(studentFinalAssessments(d,'s2'),[second]);
  assert.deepEqual(exportRows(d,{},['first','date','finalAssessment']).filter(row=>row[0]==='Åsa'),[['Åsa','2026-10-01','Nej'],['Åsa','2026-10-08','Ja']]);
  assert.deepEqual(exportRowsByStudent(d,{},['first','date','finalAssessment']).find(row=>row[0]==='Åsa'),['Åsa','2026-10-01\n2026-10-08','Nej\nJa']);
});
test('Older lesson records migrate to an unmarked final-assessment value and invalid values are rejected',()=>{
  const d=fixture(),session=lesson(d,'2026-10-01');delete session.finalAssessment;
  assert.equal(upgradeData(d).sessions[0].finalAssessment,false);
  d.sessions[0].finalAssessment='yes';assert.throws(()=>validateData(d));
});
test('Excel wraps the multiline cells used by the one-row-per-student export',()=>{
  const xml=new TextDecoder().decode(createXlsx([['Elev','Datum','Observation'],['Åsa','2026-10-01\n2026-10-08','Bra\nOkej']]));
  assert.match(xml,/<c r="B2" s="2"/);
  assert.match(xml,/wrapText="1"/);
  assert.match(xml,/<row r="2" ht="35" customHeight="1">/);
  assert.match(xml,/<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"\/>/);
});
test('Excel highlights final assessments and freezes the pupil identity columns',()=>{
  const xml=new TextDecoder().decode(createXlsx([['Förnamn','Efternamn','Klass','Slutbedömning'],['Åsa','Öberg','7A','Ja'],['Amir','Andersson','7A','Nej']]));
  assert.match(xml,/<c r="D2" s="5"/);
  assert.match(xml,/<c r="D3" s="4"/);
  assert.match(xml,/fgColor rgb="FFE7F3EA"/);
  assert.match(xml,/<pane xSplit="3" ySplit="1" topLeftCell="D2" activePane="bottomRight" state="frozen"\/>/);
});
test('Backup round trips preserve local drafts and data',()=>{
  const d=fixture(),s=lesson(d,'2026-10-01');s.attendanceDraft={s1:{...blankAttendance(),lateMinutes:4}};const text=JSON.stringify({app:'Idrottspuls',schemaVersion:1,mode:'real',data:d});assert.deepEqual(parseBackup(text).data,upgradeData(d));assert.doesNotThrow(()=>validateData(demoData('2026-10-20')));
});
test('Invalid imports cannot silently overwrite the lektionsbok',()=>{
  const d=fixture();lesson(d,'2026-10-01');const envelope=()=>JSON.stringify({app:'Idrottspuls',schemaVersion:1,mode:'real',data:d});d.sessions[0].attendance.s1.lateMinutes=-4;assert.throws(()=>parseBackup(envelope()));d.sessions[0].attendance.s1.lateMinutes=0;d.classes[0].students[1].id='s1';assert.throws(()=>parseBackup(envelope()));assert.throws(()=>parseBackup('{"app":"Wrong"}'));assert.throws(()=>parseBackup('not json'));
});
test('A duplicate scheduled lesson or invalid class/student relationship is rejected',()=>{
  const d=fixture();const s=lesson(d,'2026-10-01');s.scheduleId='schedule1';d.sessions.push({...structuredClone(s),id:'other'});assert.throws(()=>validateData(d));d.sessions.pop();s.studentIds.push('missing');assert.throws(()=>validateData(d));
});
test('Generated Excel is an actual OOXML zip, including Unicode and safe literal formulas',async()=>{
  const rows=[['Förnamn','Efternamn','Anteckning','Sen ankomst'],['Åsa','Öberg','=HYPERLINK("https://example.com")',7],['Amir','Andersson','Passning & samspel <bra>',0]];
  const file=createXlsx(rows);assert.deepEqual([...file.slice(0,4)],[80,75,3,4]);const out=new URL('../work/qa/',import.meta.url);await mkdir(out,{recursive:true});await writeFile(new URL('export-test.xlsx',out),file);
});

test('Okej, Bra and manual follow-up can coexist and be deselected independently',()=>{
  const o={assessments:[],grades:[],note:''};
  for(const value of ['good','followup','okay']) o.assessments=toggleObservationChoice(o,'assessments',value);
  assert.deepEqual(observationAssessments(o),['followup','good','okay']);
  assert.equal(observationLabel(o),'Behov av uppföljning · Bra · Okej');
  o.assessments=toggleObservationChoice(o,'assessments','okay');
  assert.deepEqual(o.assessments,['followup','good']);
  const d=fixture();lesson(d,'2026-10-01',o);
  assert.deepEqual(followup(d,'s1'),{count:0,manual:true,flagged:true});
});

test('Two grades persist; a third is rejected without dropping either chosen grade',()=>{
  const o={assessments:['okay'],grades:[],note:''};
  o.grades=toggleObservationChoice(o,'grades','C');o.grades=toggleObservationChoice(o,'grades','E');
  assert.deepEqual(observationGrades(o),['E','C']);assert.equal(gradeLabel(o),'E / C');
  assert.throws(()=>toggleObservationChoice(o,'grades','B'),/högst två/);
  assert.deepEqual(o.grades,['E','C']);
  o.grades=toggleObservationChoice(o,'grades','E');o.grades=toggleObservationChoice(o,'grades','B');
  assert.deepEqual(o.grades,['C','B']);
});

test('Okej is an observation and never automatically flags a student',()=>{
  const d=fixture();for(const date of ['2026-10-01','2026-10-02','2026-10-03']) lesson(d,date,{assessments:['okay'],grades:[],note:''});
  const stats=studentStats(d,d.classes[0].students[0],filteredSessions(d),new Date(2026,9,22,12));
  assert.equal(stats.observed,3);assert.equal(stats.flagged,false);assert.equal(stats.count,0);
  assert.equal(hasObservation({assessments:[],grades:[],note:''}),false);
});

test('Any F or negative choice counts once per lesson among multiple selections',()=>{
  const d=fixture();const o={assessments:['good','okay','below','failed','notparticipating'],grades:['F','C'],note:''};
  const first=lesson(d,'2026-10-01',structuredClone(o));lesson(d,'2026-10-02',structuredClone(o));
  assert.deepEqual(followup(d,'s1'),{count:2,manual:false,flagged:false});
  const third=lesson(d,'2026-10-03',structuredClone(o));assert.equal(followup(d,'s1').count,3);assert.equal(followup(d,'s1').flagged,true);
  third.skipObservation=true;assert.equal(followup(d,'s1').flagged,false);
  first.attendance.s1.absent=true;assert.equal(followup(d,'s1').count,1);
});

test('An F in a two-grade observation counts even with positive assessments',()=>{
  const d=fixture();const s=lesson(d,'2026-10-01',{assessments:['good','okay'],grades:['C','F'],note:''});
  assert.equal(followup(d,'s1').count,1);s.observations.s1.grades=['E','C'];assert.equal(followup(d,'s1').count,0);
});

test('Export and summary retain every selected assessment and both grades',async()=>{
  const d=fixture();lesson(d,'2026-10-01',{assessments:['good','followup','okay'],grades:['B','C'],note:'Passning & samspel'});
  const rows=exportRows(d,{},['first','assessment','grade','followup']);
  assert.deepEqual(rows.find(r=>r[0]==='Åsa'),['Åsa','Behov av uppföljning; Bra; Okej','C / B','Ja']);
  const stats=studentStats(d,d.classes[0].students[0],filteredSessions(d),new Date(2026,9,22,12));
  assert.equal(stats.observed,1);assert.equal(observationLabel(stats.latest),'Behov av uppföljning · Bra · Okej');assert.equal(gradeLabel(stats.latest),'C / B');
  const out=new URL('../work/qa/',import.meta.url);await mkdir(out,{recursive:true});await writeFile(new URL('multi-selection.xlsx',out),createXlsx(rows));
});

test('Old on-device workspaces and backups migrate without losing history or drafts',()=>{
  const d=fixture(),s=lesson(d,'2026-10-01',{assessment:'good',grade:'B',note:'Äldre anteckning'});
  s.attendanceDraft={s1:{...blankAttendance(),lateMinutes:4}};d.classes[0].students[0].followupResetDate='2026-09-30';
  const original=structuredClone(d),workspace={schemaVersion:1,active:'real',real:d,demo:demoData('2026-10-20')};
  const upgraded=upgradeWorkspace(workspace),backup=parseBackup(JSON.stringify({app:'Idrottspuls',schemaVersion:1,mode:'real',data:d}));
  assert.equal(upgraded.schemaVersion,SCHEMA);assert.deepEqual(upgraded.real,backup.data);
  assert.deepEqual(upgraded.real.sessions[0].observations.s1,{assessments:['good'],grades:['B'],note:'Äldre anteckning'});
  assert.deepEqual(upgraded.real.sessions[0].attendanceDraft,s.attendanceDraft);
  assert.equal(upgraded.real.classes[0].students[0].followupResetDate,'2026-09-30');assert.deepEqual(d,original);
  assert.deepEqual(upgradeWorkspace(upgraded),upgraded);
});
test('Older classes gain an unassigned year group and an empty planning calendar',()=>{
  const d=fixture(),original=structuredClone(d),old=structuredClone(d);delete old.classes[0].yearGroup;delete old.lessonPlans;
  const upgraded=upgradeData(old);
  assert.equal(upgraded.classes[0].yearGroup,null);assert.deepEqual(upgraded.lessonPlans,[]);
  assert.deepEqual(d,original,'migration does not mutate the saved source object');
  upgraded.classes[0].yearGroup=10;assert.throws(()=>validateData(upgraded),/årskurs/);
  upgraded.classes[0].yearGroup=7;upgraded.lessonPlans=[{yearGroup:7,weekStart:'2026-10-27',slot:1,topic:'Fel veckodag'}];assert.throws(()=>validateData(upgraded),/planering/);
});

test('New backup round trips keep all selections, and invalid arrays are rejected',()=>{
  const d=fixture();d.classes[0].yearGroup=7;const s=lesson(d,'2026-10-01',{assessments:['followup','good','okay'],grades:['E','C'],note:'Alla val'});
  const backup=()=>JSON.stringify({app:'Idrottspuls',schemaVersion:SCHEMA,mode:'real',data:d});
  assert.deepEqual(parseBackup(backup()).data,d);
  for(const invalid of [ ['A','B','C'], ['C','C'], ['Z'], 'C', null ]) {s.observations.s1.grades=invalid;assert.throws(()=>parseBackup(backup()));}
  s.observations.s1.grades=['E','C'];
  for(const invalid of [ ['okay','okay'], ['unknown'], 'good', null ]) {s.observations.s1.assessments=invalid;assert.throws(()=>parseBackup(backup()));}
  assert.throws(()=>upgradeWorkspace({schemaVersion:999,active:'real',real:d,demo:d}));
});

test('Only past, ended and reported lessons contribute to every percentage',()=>{
  const d=fixture();
  const a=lesson(d,'2026-10-01');a.attendance.s1={absent:true,clothes:false,shoes:false,lateMinutes:0};
  const b=lesson(d,'2026-10-02');b.attendance.s1={absent:false,clothes:true,shoes:true,lateMinutes:0};
  const c=lesson(d,'2026-10-03');c.attendance.s1={absent:false,clothes:true,shoes:false,lateMinutes:0};
  lesson(d,'2026-10-04');
  const unreported=lesson(d,'2026-10-05');unreported.attendanceSavedAt=null;unreported.attendanceDraft={s1:{...blankAttendance(),absent:true}};
  lesson(d,'2026-10-23');const inProgress=lesson(d,'2026-10-22');inProgress.start='12:00';inProgress.end='13:00';
  const anotherClass=lesson(d,'2026-10-06');anotherClass.studentIds=['s2'];
  const now=new Date(2026,9,22,12,30);
  const stats=studentStats(d,d.classes[0].students[0],d.sessions,now);
  assert.equal(stats.total,4);assert.equal(stats.rate,75);assert.equal(stats.absentRate,25);assert.equal(stats.clothesRate,50);assert.equal(stats.shoesRate,25);
  assert.equal(reportedLessons(d.sessions,now).length,5);
  assert.equal(studentStats(d,d.classes[0].students[0],d.sessions,new Date(2026,9,22,13)).total,5);
});

test('Unreported lessons and attendance drafts produce no misleading zero percent',()=>{
  const d=fixture(),s=lesson(d,'2026-10-01');s.attendanceSavedAt=null;
  const stats=studentStats(d,d.classes[0].students[0],d.sessions,new Date(2026,9,22,12));
  assert.equal(stats.total,0);assert.equal(stats.rate,null);assert.equal(stats.absentRate,null);assert.equal(stats.clothesRate,null);assert.equal(stats.shoesRate,null);
});

test('Ongoing saved observations are visible immediately while percentages wait for lesson end',()=>{
  const d=fixture();const past=lesson(d,'2026-10-21');past.attendance.s1.absent=true;
  const current=lesson(d,'2026-10-22',{assessments:['good','okay'],grades:['C','B'],note:'Pågående lektion'});current.start='12:00';current.end='13:00';
  const stats=studentStats(d,d.classes[0].students[0],filteredSessions(d),new Date(2026,9,22,12,30));
  assert.equal(stats.total,1);assert.equal(stats.absentRate,100);
  assert.equal(stats.observed,1);assert.equal(stats.observationEligible,1);assert.equal(stats.latest.note,'Pågående lektion');
});

test('Plain names, line endings and blank lines become reviewable first and last names',()=>{
  assert.deepEqual(parseStudentList(' Anna Andersson \r\n\r\nOmar Berg\nElias Bergström'),[
    {first:'Anna',last:'Andersson',line:1},{first:'Omar',last:'Berg',line:3},{first:'Elias',last:'Bergström',line:4},
  ]);
  assert.deepEqual(parseStudentList('Anna Maria Svensson'),[{first:'Anna Maria',last:'Svensson',line:1}]);
});

test('Two Excel columns, column headings and earlier semicolon lists remain importable',()=>{
  assert.deepEqual(parseStudentList('Förnamn\tEfternamn\nAnna Maria\tSvensson\nOmar\tBerg'),[
    {first:'Anna Maria',last:'Svensson',line:2},{first:'Omar',last:'Berg',line:3},
  ]);
  assert.deepEqual(parseStudentList('Efternamn;Förnamn\nSvensson;Anna Maria'),[{first:'Anna Maria',last:'Svensson',line:2}]);
  assert.deepEqual(parseStudentList('Maja;Dahl\nOmar;Berg'),[{first:'Maja',last:'Dahl',line:1},{first:'Omar',last:'Berg',line:2}]);
  assert.deepEqual(parseStudentList('Svensson, Anna'),[{first:'Anna',last:'Svensson',line:1}]);
});

test('Review edits preserve complex names and reject missing or oversized parts',()=>{
  const rows=parseStudentList('Ali Al Hassan\nNora van der Berg');
  rows[0].first='Ali';rows[0].last='Al Hassan';rows[1].first='Nora';rows[1].last='van der Berg';
  assert.deepEqual(validateStudentList(rows),[{first:'Ali',last:'Al Hassan'},{first:'Nora',last:'van der Berg'}]);
  assert.throws(()=>validateStudentList(parseStudentList('Anna')),/rad 1/);
  assert.throws(()=>validateStudentList([{first:'A'.repeat(101),last:'B',line:8}]),/rad 8/);
  assert.throws(()=>parseStudentList('Anna\tAndersson\t7A'),/Rad 1/);
});
