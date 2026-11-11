/* AbandonedWell Energy AI – project file sync (File System Access API)
 * A project can be linked to a .awproj.json file, e.g. inside a OneDrive/Google Drive/Dropbox folder.
 * The app then writes every change to that file and, when opened or focused, loads the file if it is newer.
 * The cloud client (OneDrive…) carries the file to the user's other computers, so every browser that links
 * the same file sees the same project. Data never goes to the web server.
 * Supported in Chrome and Edge on desktop; elsewhere the app falls back to manual Save/Open project file.
 */
(function (global) {
  'use strict';
  const DB = 'abandonedwell-sync', ST = 'handles';
  let db = null;
  const supported = () => typeof global.showSaveFilePicker === 'function' && typeof global.showOpenFilePicker === 'function';
  function open() {
    if (db) return Promise.resolve(db);
    return new Promise((res) => {
      try {
        const rq = indexedDB.open(DB, 1);
        rq.onupgradeneeded = () => rq.result.createObjectStore(ST);
        rq.onsuccess = () => { db = rq.result; res(db); };
        rq.onerror = rq.onblocked = () => res(null);
      } catch (e) { res(null); }
    });
  }
  async function tx(mode, fn) {
    const d = await open(); if (!d) return null;
    return new Promise((res) => { const r = fn(d.transaction(ST, mode).objectStore(ST)); r.onsuccess = () => res(r.result); r.onerror = () => res(null); });
  }
  const getHandle = (id) => tx('readonly', (s) => s.get(id));
  const setHandle = (id, h) => tx('readwrite', (s) => s.put(h, id));
  const unlink = (id) => tx('readwrite', (s) => s.delete(id));
  const TYPES = [{ description: 'AbandonedWell project', accept: { 'application/json': ['.json'] } }];
  async function pickNew(suggested) { return global.showSaveFilePicker({ suggestedName: suggested, types: TYPES }); }
  async function pickExisting() { const [h] = await global.showOpenFilePicker({ types: TYPES, multiple: false }); return h; }
  /** 'granted' | 'prompt' | 'denied'; request=true must run inside a user gesture. */
  async function permission(h, request) {
    if (!h || !h.queryPermission) return 'denied';
    let p = await h.queryPermission({ mode: 'readwrite' });
    if (p !== 'granted' && request) p = await h.requestPermission({ mode: 'readwrite' });
    return p;
  }
  async function read(h) { const f = await h.getFile(); return { text: await f.text(), lastModified: f.lastModified, name: f.name }; }
  async function write(h, text) { const w = await h.createWritable(); await w.write(text); await w.close(); }
  global.AWSync = { supported, getHandle, setHandle, unlink, pickNew, pickExisting, permission, read, write };
})(window);
