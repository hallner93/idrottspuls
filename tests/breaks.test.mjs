import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyData, lessonsForDate, materialize, scheduleBreakForDate, validateData, upgradeData, parseBackup, SCHEMA } from '../web/model.js';

function fixture() {
  const d=emptyData();
  d.classes=[{id:'c',name:'7A',students:[]}];
  d.schedules=[{id:'sch',classId:'c',day:1,start:'08:00',end:'09:00',topic:'Idrott',location:'Hall'}];
  return d;
}
test('Studiedag hides recurring lesson but does not change weekly schedule',()=>{
  const d=fixture();
  assert.equal(lessonsForDate(d,'2026-11-02').length,1);
  d.breaks.push({id:'b1',label:'Studiedag',start:'2026-11-02',end:'2026-11-02'});
  assert.equal(lessonsForDate(d,'2026-11-02').length,0);
  assert.equal(scheduleBreakForDate(d,'2026-11-02').label,'Studiedag');
  assert.equal(lessonsForDate(d,'2026-11-09').length,1);
  assert.equal(d.schedules.length,1);
  d.breaks=[];assert.equal(lessonsForDate(d,'2026-11-02').length,1);
});
test('Break preserves saved lesson and manual extra lessons',()=>{
  const d=fixture();
  const recorded=materialize(d,lessonsForDate(d,'2026-10-26'));
  const extra=materialize(d,{classId:'c',date:'2026-11-02',start:'10:00',end:'11:00',location:'Hall',topic:'Extra',scheduleId:null,planned:true});
  d.breaks.push({id:'b1',label:'Lov',start:'2026-10-26',end:'2026-11-05'});
  assert.deepEqual(lessonsForDate(d,'2026-10-26').map(s=>s.id),[recorded.id]);
  assert.deepEqual(lessonsForDate(d,'2026-11-02').map(s=>s.id),[extra.id]);
});
test('Old backups upgrade and new backups keep schedule breaks',()=>{
  const d=fixture();
  const old=structuredClone(d);delete old.breaks;
  assert.deepEqual(upgradeData(old).breaks,[]);
  d.breaks.push({id:'b1',label:'Jullov',start:'2026-12-21',end:'2027-01-08'});
  const restored=parseBackup(JSON.stringify({app:'Idrottspuls',schemaVersion:SCHEMA,mode:'real',data:d}));
  assert.deepEqual(restored.data.breaks,d.breaks);
  const imported=parseBackup(JSON.stringify({app:'Idrottspuls',schemaVersion:1,mode:'real',data:old}));
  assert.deepEqual(imported.data.breaks,[]);
});
test('Invalid breaks do not validate',()=>{
  const d=fixture();
  d.breaks=[{id:'x',label:'Studiedag',start:'2026-11-05',end:'2026-11-04'}];
  assert.throws(()=>validateData(d),/schemauppehåll/);
});
