import { SCHEMA, emptyData, demoData, upgradeWorkspace } from './model.js';
const native = typeof window !== 'undefined' && window.IdrottspulsNative;
let db;
let saveQueue = Promise.resolve();
export const storageType = native ? 'Appens interna lagring' : 'Lokal databas i den här webbläsaren';
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('idrottspuls', 3);
    request.onupgradeneeded = () => {
      const stores = request.result.objectStoreNames;
      if (!stores.contains('workspace')) request.result.createObjectStore('workspace');
      if (!stores.contains('videos')) request.result.createObjectStore('videos', { keyPath: 'id' });
      if (!stores.contains('photos')) request.result.createObjectStore('photos', { keyPath: 'id' });
    };
    request.onsuccess = () => { db = request.result; db.onversionchange = () => db.close(); resolve(db); };
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('Stäng andra Idrottspuls-fönster och försök igen.'));
  });
}
export async function listVideos() {
  if (!db) await openDB();
  return new Promise((resolve, reject) => {
    const request = db.transaction('videos').objectStore('videos').getAll();
    request.onsuccess = () => resolve(request.result.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    request.onerror = () => reject(request.error);
  });
}
export async function getVideo(id) {
  if (!db) await openDB();
  return new Promise((resolve, reject) => {
    const request = db.transaction('videos').objectStore('videos').get(id);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}
export async function saveVideo(video) {
  if (!db) await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('videos', 'readwrite');
    tx.objectStore('videos').put(video);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('Videon kunde inte sparas på enheten. Kontrollera ledigt lagringsutrymme.'));
  });
}
export async function deleteVideo(id) {
  if (!db) await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('videos', 'readwrite');
    tx.objectStore('videos').delete(id);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('Videon kunde inte tas bort.'));
  });
}
export async function deleteAllVideos() {
  if (!db) await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('videos', 'readwrite');
    tx.objectStore('videos').clear();
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('Videomaterialet kunde inte tas bort.'));
  });
}
export async function listPhotos() {
  if (!db) await openDB();
  return new Promise((resolve, reject) => {
    const request = db.transaction('photos').objectStore('photos').getAll();
    request.onsuccess = () => resolve(request.result.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    request.onerror = () => reject(request.error);
  });
}
export async function getPhoto(id) {
  if (!db) await openDB();
  return new Promise((resolve, reject) => {
    const request = db.transaction('photos').objectStore('photos').get(id);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}
export async function savePhoto(photo) {
  if (!db) await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('photos', 'readwrite');
    tx.objectStore('photos').put(photo);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('Bilden kunde inte sparas på enheten. Kontrollera ledigt lagringsutrymme.'));
  });
}
export async function deletePhoto(id) {
  if (!db) await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('photos', 'readwrite');
    tx.objectStore('photos').delete(id);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('Bilden kunde inte tas bort.'));
  });
}
export async function deleteAllPhotos() {
  if (!db) await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('photos', 'readwrite');
    tx.objectStore('photos').clear();
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('Bilderna kunde inte tas bort.'));
  });
}
let pendingVideoExport;
if (native) window.idrottspulsVideoExportReady = async (ok, message) => {
  const pending = pendingVideoExport;
  if (!pending) return;
  if (!ok) { pending.resolve({ saved: false, message }); pendingVideoExport = null; return; }
  try {
    for (let offset = 0; offset < pending.blob.size; offset += 192 * 1024) {
      const bytes = new Uint8Array(await pending.blob.slice(offset, offset + 192 * 1024).arrayBuffer());
      const result = native.writeVideoChunk(base64(bytes));
      if (result !== 'OK') throw new Error(result || 'Videon kunde inte kopieras.');
    }
    const result = native.finishVideoExport();
    if (result !== 'OK') throw new Error(result || 'Kopieringen misslyckades.');
    pending.resolve({ saved: true, message: 'Videon är sparad på vald plats.' });
  } catch (error) {
    native.cancelVideoExport();
    pending.resolve({ saved: false, message: error.message || 'Videon kunde inte kopieras.' });
  } finally { pendingVideoExport = null; }
};
export async function exportVideoCopy(name, blob) {
  if (!native) {
    const url = URL.createObjectURL(blob), link = document.createElement('a');
    link.href = url; link.download = name; document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    return { saved: true, message: 'Kopian har laddats ned. Välj en plats på enheten.' };
  }
  if (pendingVideoExport) throw new Error('Slutför den pågående videoexporten först.');
  return new Promise((resolve, reject) => {
    pendingVideoExport = { resolve, blob };
    try { native.beginVideoExport(name, blob.type || 'video/mp4'); }
    catch (error) { pendingVideoExport = null; reject(error); }
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
