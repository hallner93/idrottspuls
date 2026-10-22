import { SCHEMA, emptyData, demoData, upgradeWorkspace } from './model.js';
const native = typeof window !== 'undefined' && window.IdrottspulsNative;
let db;
let saveQueue = Promise.resolve();
export const storageType = native ? 'Appens interna lagring' : 'Lokal databas i den här webbläsaren';
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('idrottspuls', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('workspace');
    request.onsuccess = () => { db = request.result; db.onversionchange = () => db.close(); resolve(db); };
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('Stäng andra Idrottspuls-fönster och försök igen.'));
  });
}
export async function loadWorkspace() {
  let envelope;
  if (native) { const raw = native.readState(); if (raw.startsWith('ERROR:')) throw new Error(raw.slice(6)); if (raw) envelope = JSON.parse(raw); }
  else {
    await openDB();
    envelope = await new Promise((resolve, reject) => { const r = db.transaction('workspace').objectStore('workspace').get('current'); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
  }
  if (!envelope) envelope = { schemaVersion: SCHEMA, active: 'demo', demo: demoData(), real: emptyData() };
  return upgradeWorkspace(envelope);
}
export function persist(envelope) {
  // Capture at request time. Serialize writes so an older state never wins.
  const snapshot = JSON.parse(JSON.stringify(envelope));
  const operation = saveQueue.catch(() => {}).then(async () => {
    if (native) { const result = native.writeState(JSON.stringify(snapshot)); if (result !== 'OK') throw new Error(result || 'Kunde inte spara till enheten.'); return; }
    if (!db) await openDB();
    await new Promise((resolve, reject) => { const tx = db.transaction('workspace', 'readwrite'); tx.objectStore('workspace').put(snapshot, 'current'); tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error || new Error('Sparningen avbröts.')); });
  });
  saveQueue = operation;
  return operation;
}
export async function requestPersistence() { return native ? true : navigator.storage?.persist ? navigator.storage.persist() : false; }
function base64(bytes) { let s = ''; for (let i = 0; i < bytes.length; i += 8192) s += String.fromCharCode(...bytes.subarray(i, i + 8192)); return btoa(s); }
let pendingExport;
if (native) window.idrottspulsExportResult = (ok, message) => { if (pendingExport) { pendingExport.resolve({ saved: ok, message }); pendingExport = null; } };
export async function downloadFile(name, contents, mime) {
  const bytes = contents instanceof Uint8Array ? contents : new TextEncoder().encode(contents);
  if (native) {
    if (pendingExport) throw new Error('Slutför den pågående exporten först.');
    return new Promise((resolve, reject) => { pendingExport = { resolve, reject }; try { native.exportFile(name, base64(bytes), mime); } catch (e) { pendingExport = null; reject(e); } });
  }
  const url = URL.createObjectURL(new Blob([bytes], { type: mime }));
  const a = document.createElement('a'); a.href = url; a.download = name; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 30000);
  return { saved: true, message: 'Filen är skapad. Spara den på en trygg plats.' };
}
