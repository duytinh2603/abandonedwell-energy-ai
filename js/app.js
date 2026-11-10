/* AbandonedWell Energy AI – workstation UI */
(function () {
  'use strict';
  const M = window.AWModel, L = window.LAS, Store = window.ProjectStore;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  /* ================= constants ================= */
  const DEFAULTS = {
    m: 5, Tin: 30, years: 10, T0: 27, k: 2.5, Rw: 0.10, upLoss: 10, sigmaG: 0.3,
    purpose: 'hp', heatPrice: 735, capexOn: 6, capexOff: 25, pipe: 1.5, opex: 3, pump: 15, hours: 8000, rate: 10, life: 25,
    w_thermal: 0.5, w_integrity: 0.25, w_distance: 0.15, w_econ: 0.10, threshold: 60,
  };
  const ELEC_PRICE = 2204;
  const PURPOSE_PRICE = { res: 2204, hp: Math.round(2204 / 3) };
  const WELL_COLS = ['id', 'name', 'location', 'depth_m', 'gradient_c100m', 'bht_c', 'bht1_c', 'dt1_h', 'bht2_c', 'dt2_h', 'tc_h', 'integrity', 'distance_km'];

  /* ================= icons ================= */
  const B = '#1976d2', R = '#ef5350', G = '#90a4ae';
  const page = `<path d="M8 4h17l7 7v25H8z" fill="#fff" stroke="${B}" stroke-width="2"/><path d="M8 4h17v7h7" fill="#e3f0fc" stroke="${B}" stroke-width="2"/><path d="M13 17h14M13 22h14M13 27h9" stroke="${B}" stroke-width="2"/>`;
  const badge = (txt, col = B) => `<rect x="4" y="8" width="32" height="18" rx="2" fill="${col}"/><text x="20" y="21.5" fill="#fff" font-size="${txt.length > 3 ? 9 : 11}" font-weight="700" text-anchor="middle" font-family="Arial">${txt}</text><rect x="6" y="26" width="28" height="9" fill="#fff" stroke="${col}" stroke-width="1.5"/>`;
  const svg = (inner, vb = 40) => `<svg viewBox="0 0 ${vb} ${vb}" xmlns="http://www.w3.org/2000/svg" fill="none">${inner}</svg>`;
  const ICON = {
    newProject: svg(page + `<circle cx="30" cy="30" r="8" fill="${R}"/><path d="M30 26v8M26 30h8" stroke="#fff" stroke-width="2.2"/>`),
    openProject: svg(page + `<path d="M22 30h13m-5-5 5 5-5 5" stroke="${R}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`),
    closeProject: svg(page + `<circle cx="30" cy="10" r="7" fill="${R}"/><path d="M27 7l6 6M33 7l-6 6" stroke="#fff" stroke-width="2"/>`),
    saveFile: svg(`<rect x="6" y="6" width="28" height="28" rx="3" fill="#e3f0fc" stroke="${B}" stroke-width="2"/><rect x="12" y="6" width="14" height="10" fill="#fff" stroke="${B}" stroke-width="2"/><rect x="11" y="22" width="18" height="12" fill="#fff" stroke="${B}" stroke-width="2"/><path d="M20 24v7m-3-3 3 3 3-3" stroke="${R}" stroke-width="2"/>`),
    openFile: svg(`<path d="M4 10h12l3 4h17v20H4z" fill="#e3f0fc" stroke="${B}" stroke-width="2"/><path d="M4 18h32" stroke="${B}" stroke-width="2"/><path d="M20 31v-9m-4 4 4-4 4 4" stroke="${R}" stroke-width="2.4" stroke-linecap="round"/>`),
    newWell: svg(`<path d="M14 36 19 6h2l5 30M16 24h8M17 16h6M12 36h16" stroke="${B}" stroke-width="2"/><path d="M8 30h8" stroke="${B}" stroke-width="2"/><circle cx="30" cy="28" r="7" fill="${R}"/><path d="M30 24.5v7M26.5 28h7" stroke="#fff" stroke-width="2"/>`),
    importLas: svg(badge('LAS') + `<path d="M13 31h14m-3-3 3 3-3 3" stroke="${B}" stroke-width="1.6"/>`),
    importCsv: svg(badge('CSV') + `<path d="M13 31h14m-3-3 3 3-3 3" stroke="${B}" stroke-width="1.6"/>`),
    exportLas: svg(badge('LAS', '#00897b') + `<path d="M27 31H13m3-3-3 3 3 3" stroke="#00897b" stroke-width="1.6"/>`),
    exportCsv: svg(badge('CSV', '#00897b') + `<path d="M27 31H13m3-3-3 3 3 3" stroke="#00897b" stroke-width="1.6"/>`),
    nullValue: svg(badge('NULL') + `<path d="M12 31h16m-12-3-4 3 4 3m8-6 4 3-4 3" stroke="${B}" stroke-width="1.5"/>`),
    delete: svg(`<circle cx="20" cy="20" r="14" fill="#fff" stroke="${R}" stroke-width="2.4"/><path d="M14 14l12 12M26 14 14 26" stroke="${R}" stroke-width="2.4"/>`),
    browser: svg(`<rect x="5" y="6" width="30" height="28" rx="2" fill="#fff" stroke="${B}" stroke-width="2"/><path d="M5 12h30M10 18h20M10 23h20M10 28h12" stroke="${B}" stroke-width="2"/>`),
    props: svg(`<rect x="5" y="6" width="30" height="28" rx="2" fill="#fff" stroke="${B}" stroke-width="2"/><path d="M5 12h30" stroke="${B}" stroke-width="2"/><path d="M10 18h3M10 23h3M10 28h3M16 18h14M16 23h14M16 28h14" stroke="${R}" stroke-width="2"/>`),
    output: svg(`<rect x="5" y="6" width="30" height="28" rx="2" fill="#fff" stroke="${B}" stroke-width="2"/><path d="M5 12h30M10 18h4M17 18h4M24 18h6M10 23h4M17 23h4M24 23h6M10 28h4M17 28h4" stroke="${B}" stroke-width="2"/>`),
    params: svg(`<path d="M8 10h24M8 20h24M8 30h24" stroke="${G}" stroke-width="2.4"/><circle cx="14" cy="10" r="4" fill="#fff" stroke="${B}" stroke-width="2.4"/><circle cx="26" cy="20" r="4" fill="#fff" stroke="${R}" stroke-width="2.4"/><circle cx="18" cy="30" r="4" fill="#fff" stroke="${B}" stroke-width="2.4"/>`),
    run: svg(`<circle cx="20" cy="20" r="15" fill="#e8f5e9" stroke="#2e7d32" stroke-width="2.2"/><path d="M16 12v16l12-8z" fill="#2e7d32"/>`),
    report: svg(page.replace(/<path d="M13 17h14M13 22h14M13 27h9"[^>]*>/, '') + `<path d="M13 31V24M18 31V19M23 31v-9M28 31v-5" stroke="${R}" stroke-width="2.6"/>`),
    sens: svg(`<rect x="6" y="6" width="28" height="28" fill="#fff" stroke="${B}" stroke-width="2"/>` + [0, 1, 2].map((i) => [0, 1, 2].map((j) => `<rect x="${8 + j * 8.7}" y="${8 + i * 8.7}" width="7.7" height="7.7" fill="${['#fff3e0', '#ffcc80', '#fb8c00', '#ffcc80', '#fb8c00', '#e53935', '#fb8c00', '#e53935', '#b71c1c'][i * 3 + j]}"/>`).join('')).join('')),
    exportRank: svg(`<rect x="5" y="6" width="26" height="26" fill="#fff" stroke="${B}" stroke-width="2"/><path d="M5 13h26M5 20h26M5 27h26M14 6v26" stroke="${B}" stroke-width="1.6"/><circle cx="31" cy="31" r="7" fill="#00897b"/><path d="M31 27v7m-3-3 3 3 3-3" stroke="#fff" stroke-width="1.8"/>`),
    logPlot: svg(`<rect x="4" y="5" width="32" height="30" fill="#fff" stroke="${B}" stroke-width="2"/><path d="M14 5v30M25 5v30" stroke="${G}" stroke-width="1.2"/><path d="M8 7l3 4-2 4 3 4-3 4 2 4-2 4 2 4" stroke="#2e7d32" stroke-width="1.8"/><path d="M19 7l-2 5 4 4-3 5 3 4-3 4 2 4" stroke="${R}" stroke-width="1.8"/><path d="M29 7l3 6-3 5 4 5-3 4 2 6" stroke="${B}" stroke-width="1.8"/>`),
    about: svg(`<circle cx="20" cy="20" r="15" fill="#e3f0fc" stroke="${B}" stroke-width="2.2"/><path d="M20 18v10" stroke="${B}" stroke-width="3"/><circle cx="20" cy="12.5" r="2" fill="${B}"/>`),
    lasHelp: svg(`<circle cx="20" cy="20" r="15" fill="#fff" stroke="${B}" stroke-width="2.2"/><path d="M15.5 15.5a4.5 4.5 0 1 1 6.3 4.1c-1.2.6-1.8 1.4-1.8 2.7v1.2" stroke="${R}" stroke-width="2.6" stroke-linecap="round"/><circle cx="20" cy="28.5" r="1.8" fill="${R}"/>`),
    sample: svg(badge('LAS', '#7e57c2') + `<path d="M20 27v7m-3-3 3 3 3-3" stroke="#7e57c2" stroke-width="1.6"/>`),
    demo: svg(`<path d="M15 5h10M17 5v10L7 33h26L23 15V5" fill="#e3f0fc" stroke="${B}" stroke-width="2" stroke-linejoin="round"/><path d="M11 26h18" stroke="${R}" stroke-width="2"/><circle cx="17" cy="30" r="1.6" fill="${R}"/><circle cx="23" cy="29" r="1.3" fill="${R}"/>`),
    // small icons
    addSmall: svg(`<circle cx="12" cy="12" r="9" stroke="${B}" stroke-width="1.6"/><path d="M12 8v8M8 12h8" stroke="${B}" stroke-width="1.6"/>`, 24),
    collapse: svg(`<path d="M5 7h14M8 12h11M8 17h11M5 12h.01M5 17h.01" stroke="${B}" stroke-width="1.6"/>`, 24),
    del: svg(`<circle cx="12" cy="12" r="9" stroke="${R}" stroke-width="1.6"/><path d="M8.5 8.5l7 7m0-7-7 7" stroke="${R}" stroke-width="1.6"/>`, 24),
    edit: svg(`<path d="M15 4l5 5L9 20H4v-5z" stroke="${B}" stroke-width="1.6" stroke-linejoin="round"/>`, 24),
    search: svg(`<circle cx="10" cy="10" r="6.5" stroke="${B}" stroke-width="1.8"/><path d="M15 15l5.5 5.5" stroke="${B}" stroke-width="1.8"/>`, 24),
    tProject: svg(`<path d="M2 6h7l2 2h11v12H2z" fill="#ffe082" stroke="#f9a825" stroke-width="1.4"/>`, 24),
    tFolder: svg(`<path d="M2 6h7l2 2h11v12H2z" fill="#bbdefb" stroke="${B}" stroke-width="1.4"/>`, 24),
    tWell: svg(`<path d="M8 22 11 3h2l3 19M9.5 15h5M10.5 9h3M6 22h12" stroke="#5d4037" stroke-width="1.6"/>`, 24),
    tCurve: svg(`<path d="M5 3c4 3-3 6 1 9s-3 6 1 9" stroke="#2e7d32" stroke-width="1.8"/><path d="M14 4h6M14 9h6M14 14h6M14 19h6" stroke="${G}" stroke-width="1.4"/>`, 24),
    tDepth: svg(`<path d="M12 3v18M8 6h4M8 10h4M8 14h4M8 18h4" stroke="${G}" stroke-width="1.6"/><path d="M16 15l-4 6-4-6" stroke="${B}" stroke-width="1.6"/>`, 24),
    docStart: svg(`<path d="M3 11 12 4l9 7v9H3z" stroke="${B}" stroke-width="1.7"/><path d="M10 20v-6h4v6" stroke="${R}" stroke-width="1.7"/>`, 24),
  };
  ICON.docRank = ICON.exportRank; ICON.docSens = ICON.sens; ICON.docLog = ICON.logPlot; ICON.docRep = ICON.report;
  ICON.tempPlot = ICON.report;

  /* ================= state ================= */
  const S = {
    lang: 'vi', project: null, sel: null, collapsed: {}, docs: ['start'], active: 'start', result: null,
    tab: 'home', fam: '', search: '', logs: [], logView: {}, panes: { paneBrowser: true, paneProps: true, paneOutput: true },
  };
  try { S.lang = new URLSearchParams(location.search).get('lang') || localStorage.getItem('aw-lang') || 'vi'; } catch (e) { /* ignore */ }
  if (!['vi', 'en'].includes(S.lang)) S.lang = 'vi';
  const t = (k, vars) => {
    let s = (I18N[S.lang] && I18N[S.lang][k]) || I18N.vi[k] || k;
    if (vars) Object.entries(vars).forEach(([a, b]) => { s = s.split('{' + a + '}').join(b); });
    return s;
  };
  const loc = () => (S.lang === 'vi' ? 'vi-VN' : 'en-US');
  const fmt = (x, d = 0) => (x !== null && x !== undefined && isFinite(x) ? Number(x).toLocaleString(loc(), { minimumFractionDigits: d, maximumFractionDigits: d }) : '–');
  const esc = (s) => String(s === undefined || s === null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const uid = () => Math.random().toString(36).slice(2, 10);
  const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } };
  const lsGet = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const wellBy = (u) => S.project && S.project.wells.find((w) => w.uid === u);
  const wellLabel = (w) => w.name || w.id || '?';
  /** Normalise a well name for matching: drop diacritics, separators and block prefix (e.g. "04-3-AB-1X" ≈ "AB-1X" ≈ "AB1X"). */
  const normWell = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[đĐ]/g, 'D').toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/^(043|04)/, '');
  /** Display source of the gradient, refining the model's generic "given" with what the project knows. */
  function srcOf(w) {
    const well = wellBy(w.uid);
    if (w.gSource === 'given' && well && ['dst', 'field', 'log'].includes(well.gSource)) return well.gSource;
    return w.gSource;
  }

  /* ================= output window ================= */
  function log(msg, level = '') {
    const d = new Date();
    S.logs.push({ time: d.toLocaleTimeString(loc(), { hour12: false }), msg, level });
    if (S.logs.length > 500) S.logs.shift();
    renderOutput();
  }
  function renderOutput() {
    const q = ($('#logSearch').value || '').toLowerCase();
    const el = $('#output');
    el.innerHTML = S.logs.filter((l) => !q || l.msg.toLowerCase().includes(q)).map((l) => `<div class="${l.level}"><span class="t">[${l.time}]</span>${esc(l.msg)}</div>`).join('');
    el.scrollTop = el.scrollHeight;
  }

  /* ================= persistence ================= */
  let saveTimer = null;
  function touch(opts = {}) {
    if (!S.project) return;
    S.project.updated = Date.now();
    if (opts.data !== false) { S.result = null; scheduleDocRefresh(); }
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => Store.put(S.project).catch((e) => log(String(e), 'err')), 400);
  }
  let docTimer = null;
  function scheduleDocRefresh() {
    clearTimeout(docTimer);
    docTimer = setTimeout(() => { const a = S.active; if (a === 'rank' || a === 'sens' || a.startsWith('rep:')) renderDoc(); }, 300);
  }

  /* ================= project ops ================= */
  function makeProject(name) {
    const now = Date.now();
    return { id: 'p' + now.toString(36) + uid().slice(0, 4), name, created: now, updated: now, params: Object.assign({}, DEFAULTS), wells: [] };
  }
  function openProject(p, msgKey = 'msg.opened') {
    S.project = p; S.sel = { t: 'project' }; S.result = null; S.collapsed = {}; S.logView = {};
    p.params = Object.assign({}, DEFAULTS, p.params || {});
    S.docs = p.wells.length ? ['rank'] : ['start'];
    S.active = S.docs[0];
    lsSet('aw-last', p.id);
    log(t(msgKey, { n: p.name, w: p.wells.length }), 'ok');
    if (!p.wells.length) log(t('proj.empty'), 'warn');
    renderAll();
  }
  function closeProject() {
    if (!S.project) return;
    Store.put(S.project);
    S.project = null; S.sel = null; S.result = null; S.docs = ['start']; S.active = 'start';
    lsSet('aw-last', '');
    log(t('msg.closed'));
    renderAll();
  }
  function newWellObj(o) {
    return Object.assign({ uid: uid(), id: '', name: '', field: '', location: 'onshore', integrity: 'fair', distance_km: 5, curves: [] }, o);
  }

  /* ================= LAS import ================= */
  function deriveThermal(w, parsed) {
    const dc = w.curves[0];
    if (dc) {
      const st = L.curveStats(dc.data);
      if (isFinite(st.max)) w.depth_m = Math.round(st.max * 10) / 10;
      const tc = w.curves.find((c) => c.family === 'Temperature');
      if (tc) {
        const g = L.gradientFromLog(dc.data, tc.data, tc.unit);
        if (g && (w.gSource === 'dst' || w.gSource === 'field')) {
          log(t('msg.gLogKeep', { c: tc.mnemonic, g: fmt(g.G, 2) }), 'warn');
        } else if (g) {
          w.gradient_c100m = Math.round(g.G * 1000) / 1000;
          w.gSource = 'log';
          w.gNote = `${tc.mnemonic}: ${fmt(g.n)} pts, ${fmt(g.zmin)}–${fmt(g.zmax)} m`;
          log(t('msg.gLog', { c: tc.mnemonic, g: fmt(g.G, 2), n: fmt(g.n), a: fmt(g.zmin), b: fmt(g.zmax) }), 'ok');
          if (g.G < 2.2) log(t('msg.gLogLow', { c: tc.mnemonic, g: fmt(g.G, 2) }), 'warn');
        }
      }
    }
    if (parsed && parsed.params && w.gSource !== 'dst') {
      const p = parsed.params.BHT || parsed.params.BHTEMP || parsed.params.MBHT || parsed.params.BHT1 || parsed.params.MRT || parsed.params.MAXT;
      if (p && isFinite(parseFloat(p.value))) {
        let v = parseFloat(p.value);
        if (/f/i.test(p.unit) && !/c/i.test(p.unit)) v = (v - 32) / 1.8;
        w.bht_c = Math.round(v * 10) / 10;
        log(t('msg.bhtPar', { v: fmt(w.bht_c, 1) }));
      }
    }
  }
  function addLas(parsed) {
    const P = S.project;
    const name = parsed.wellName.trim();
    const key = normWell(name);
    // a well entered by hand (no curves yet) with the same name gets the LAS curves attached
    const bare = P.wells.find((w) => !w.curves.length && (normWell(w.name) === key || normWell(w.id) === key));
    if (bare) {
      Object.assign(bare, { curves: parsed.curves, nullValue: parsed.nullValue, fileName: parsed.fileName });
      deriveThermal(bare, parsed);
      log(t('msg.lasAttach', { f: parsed.fileName, w: wellLabel(bare) }), 'ok');
      return bare;
    }
    const ex = P.wells.find((w) => normWell(w.name) === key && w.curves.length);
    if (ex && ex.curves[0].data.length === parsed.curves[0].data.length && ex.curves[0].data[0] === parsed.curves[0].data[0]) {
      parsed.curves.slice(1).forEach((c) => {
        let m = c.mnemonic; let k = 1;
        while (ex.curves.some((x) => x.mnemonic === m)) m = c.mnemonic + '_' + (++k);
        ex.curves.push(Object.assign(c, { mnemonic: m }));
      });
      deriveThermal(ex, parsed);
      log(t('msg.lasMerge', { f: parsed.fileName, w: name }), 'ok');
      return ex;
    }
    let nm = name, k = 1;
    while (P.wells.some((w) => (w.name || '').toLowerCase() === nm.toLowerCase())) nm = `${name} (${++k})`;
    const w = newWellObj({
      id: parsed.uwi || nm, name: nm, field: parsed.field, location: /off|ngoài|sea|biển/i.test(parsed.location + ' ' + parsed.field) ? 'offshore' : 'onshore',
      nullValue: parsed.nullValue, fileName: parsed.fileName, curves: parsed.curves,
    });
    deriveThermal(w, parsed);
    P.wells.push(w);
    log(t('msg.lasOk', { f: parsed.fileName, w: nm, c: parsed.curves.length, r: fmt(parsed.rows), x: parsed.depthConverted ? t('msg.lasFt') : '' }), 'ok');
    return w;
  }
  async function importLasFiles(files) {
    let last = null;
    for (const f of files) {
      try {
        const txt = await f.text();
        last = addLas(L.parseLAS(txt, f.name));
      } catch (e) { log(t('msg.lasErr', { f: f.name, e: e.message }), 'err'); }
    }
    if (last) {
      S.sel = { t: 'well', uid: last.uid };
      touch();
      renderTree(); renderProps();
      openDoc('log:' + last.uid);
    }
  }

  /* ================= CSV ================= */
  function parseCSV(text) {
    text = text.replace(/^﻿/, '');
    const first = text.split(/\r?\n/)[0];
    const delim = (first.match(/;/g) || []).length > (first.match(/,/g) || []).length ? ';' : ',';
    const rows = []; let row = [], cell = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; } else if (c === '"') q = true;
      else if (c === delim) { row.push(cell); cell = ''; } else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; } else cell += c;
    }
    if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
    const head = rows.shift().map((h) => h.trim().toLowerCase());
    if (!head.includes('depth_m')) throw new Error('depth_m');
    return rows.filter((r) => r.some((c) => c.trim() !== '')).map((r) => {
      const o = {};
      head.forEach((h, i) => {
        const v = (r[i] || '').trim();
        if (['id', 'name', 'location', 'integrity', 'field'].includes(h)) o[h] = v;
        else if (v !== '') o[h] = parseFloat(v.replace(',', '.'));
      });
      o.location = /off|ngoài/i.test(o.location || '') ? 'offshore' : 'onshore';
      const ig = (o.integrity || 'fair').toLowerCase();
      o.integrity = /good|tốt/.test(ig) ? 'good' : /poor|kém/.test(ig) ? 'poor' : 'fair';
      return o;
    });
  }
  function toCSV(rows, cols) {
    const q = (v) => { const s = v === undefined || v === null || (typeof v === 'number' && !isFinite(v)) ? '' : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    return '﻿' + [cols.join(',')].concat(rows.map((r) => cols.map((c) => q(r[c])).join(','))).join('\n');
  }
  function download(name, text, type = 'text/plain') {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: type + ';charset=utf-8' }));
    a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1500);
    log(t('msg.fileSaved', { f: name }), 'ok');
  }
  const safeName = (s) => String(s || 'export').replace(/[^\w\-.À-ỹ ]+/g, '_').trim().replace(/\s+/g, '_');

  /* ================= demo ================= */
  const DEMO_WELLS = [
    { id: 'A-01', name: 'Giếng A-01', location: 'offshore', depth_m: 4200, gradient_c100m: 3.4, integrity: 'good', distance_km: 0.5, logs: [1000, 4200, 3.4, 11] },
    { id: 'A-07', name: 'Giếng A-07', location: 'offshore', depth_m: 3800, gradient_c100m: 3.6, integrity: 'good', distance_km: 1 },
    { id: 'B-03', name: 'Giếng B-03', location: 'onshore', depth_m: 3500, gradient_c100m: 3.1, integrity: 'fair', distance_km: 3 },
    { id: 'B-11', name: 'Giếng B-11', location: 'onshore', depth_m: 3000, gradient_c100m: 3.3, integrity: 'good', distance_km: 2, logs: [800, 3000, 3.3, 23] },
    { id: 'C-02', name: 'Giếng C-02', location: 'onshore', depth_m: 2600, gradient_c100m: 2.9, integrity: 'poor', distance_km: 6 },
    { id: 'C-05', name: 'Giếng C-05', location: 'onshore', depth_m: 2200, gradient_c100m: 2.7, integrity: 'fair', distance_km: 10 },
    { id: 'D-01', name: 'Giếng D-01', location: 'onshore', depth_m: 3200, bht1_c: 112, dt1_h: 6, bht2_c: 121, dt2_h: 12, tc_h: 4, integrity: 'good', distance_km: 4 },
    { id: 'D-02', name: 'Giếng D-02', location: 'onshore', depth_m: 2800, bht_c: 105, integrity: 'fair', distance_km: 8, logs: [600, 2800, 3.2, 37, true] },
  ];
  function demoProject() {
    const p = makeProject(t('demo.name'));
    DEMO_WELLS.forEach((d) => {
      const o = Object.assign({}, d); delete o.logs;
      const w = newWellObj(o);
      if (d.logs) {
        const [top, bot, g, seed, noTemp] = d.logs;
        w.curves = L.synthLogs(top, bot, 1, g, seed);
        if (noTemp) w.curves = w.curves.filter((c) => c.family !== 'Temperature');
        w.nullValue = -999.25; w.fileName = `${d.id}_synthetic.las`;
        if (d.id === 'A-01') deriveThermal(w, null);
      }
      p.wells.push(w);
    });
    return p;
  }

  /* ================= params ================= */
  function modelParams() {
    const p = Object.assign({}, DEFAULTS, S.project ? S.project.params : {});
    const n = (k) => (isFinite(+p[k]) ? +p[k] : DEFAULTS[k]);
    const k = Math.max(0.3, n('k'));
    return {
      m: Math.max(0.1, n('m')), Tin: n('Tin'), years: Math.max(0.1, n('years')), T0: n('T0'), k, Rw: Math.max(0, n('Rw')),
      upLoss: Math.min(0.9, Math.max(0, n('upLoss') / 100)), sigmaG: Math.max(0, n('sigmaG')), kMin: Math.max(0.5, k - 0.5), kMax: k + 0.5, mcN: 150,
      maxDist: 20, threshold: n('threshold'),
      eco: { heatPrice: n('heatPrice'), capexOn: n('capexOn'), capexOff: n('capexOff'), pipeCost: n('pipe'), opexPct: n('opex'), pumpKW: n('pump'), hours: n('hours'), rate: n('rate'), life: Math.round(Math.min(50, Math.max(1, n('life')))), elecPrice: ELEC_PRICE },
      weights: { thermal: n('w_thermal'), integrity: n('w_integrity'), distance: n('w_distance'), econ: n('w_econ') },
    };
  }
  function screen() {
    if (!S.project) return null;
    if (!S.result) {
      const raw = S.project.wells.map((w) => { const o = {}; ['uid'].concat(WELL_COLS).forEach((k) => { o[k] = w[k]; }); return o; });
      S.result = M.screen(raw, modelParams());
    }
    return S.result;
  }

  /* ================= ribbon ================= */
  const RIBBON = {
    home: [['g.project', ['newProject', 'openProject', 'closeProject', 'saveFile', 'openFile']], ['g.well', ['newWell', 'importLas', 'importCsv']], ['g.view', ['browser', 'props', 'output']]],
    data: [['g.import', ['importLas', 'importCsv']], ['g.export', ['exportLas', 'exportCsv']], ['g.tools', ['nullValue', 'delete']]],
    geo: [['g.eval', ['params', 'run', 'report', 'sens']], ['g.export', ['exportRank']]],
    plot: [['g.plots', ['logPlot', 'report', 'sens']]],
    help: [['g.help', ['about', 'lasHelp', 'sample', 'demo']]],
  };
  const selWell = () => (S.sel && (S.sel.t === 'well' || S.sel.t === 'curve') ? wellBy(S.sel.uid) : null);
  function enabled(a) {
    if (['newProject', 'openProject', 'openFile', 'about', 'lasHelp', 'sample', 'demo', 'browser', 'props', 'output'].includes(a)) return true;
    if (!S.project) return false;
    if (['report', 'exportLas', 'nullValue', 'logPlot'].includes(a)) return !!selWell() && (a === 'report' || selWell().curves.length > 0);
    if (a === 'delete') return !!(S.sel && S.sel.t !== 'project');
    if (['run', 'exportRank', 'exportCsv'].includes(a)) return S.project.wells.length > 0;
    return true;
  }
  function renderRibbon() {
    $('#ribbonTabs').innerHTML = Object.keys(RIBBON).map((k) => `<button data-tab="${k}" class="${S.tab === k ? 'on' : ''}">${t('tab.' + k)}</button>`).join('');
    $('#ribbonBody').innerHTML = RIBBON[S.tab].map(([g, items]) => `<div class="rgroup"><div class="rgroup-items">${items.map((a) => {
      const on = ['browser', 'props', 'output'].includes(a) && S.panes[{ browser: 'paneBrowser', props: 'paneProps', output: 'paneOutput' }[a]];
      return `<button class="rbtn${on ? ' on' : ''}" data-act="${a}" ${enabled(a) ? '' : 'disabled'}>${ICON[a] || ''}<span>${t('b.' + a)}</span></button>`;
    }).join('')}</div><div class="rgroup-label">${t(g)}</div></div>`).join('');
    $('#projName').textContent = S.project ? S.project.name : '';
  }

  /* ================= project browser ================= */
  function renderTree() {
    const el = $('#tree');
    const fams = new Set();
    if (S.project) S.project.wells.forEach((w) => w.curves.forEach((c) => fams.add(c.family)));
    const fsel = $('#famFilter');
    fsel.innerHTML = `<option value="">${t('filter.none')}</option>` + Array.from(fams).sort().map((f) => `<option${f === S.fam ? ' selected' : ''}>${esc(f)}</option>`).join('');
    $('#filterLabel').textContent = (S.fam || t('filter.none')) + (S.search ? ` · “${S.search}”` : '');
    if (!S.project) { el.innerHTML = `<div class="empty-msg">${t('tree.noProject')}</div>`; return; }
    const q = S.search.toLowerCase();
    const P = S.project;
    const isSel = (o) => S.sel && S.sel.t === o.t && S.sel.uid === o.uid && S.sel.ci === o.ci;
    const row = (lvl, o, icon, name, fam, unit, key) => {
      const car = key ? `<span class="car" data-tog="${key}">${S.collapsed[key] ? '▶' : '▼'}</span>` : '<span class="car"></span>';
      return `<div class="trow${isSel(o) ? ' sel' : ''}" data-t="${o.t}" data-uid="${o.uid || ''}" data-ci="${o.ci === undefined ? '' : o.ci}"><span style="padding-left:${6 + lvl * 16}px">${car}${icon}<span>${esc(name)}</span></span><span class="fam">${esc(fam)}</span><span class="unit">${esc(unit)}</span></div>`;
    };
    let h = row(0, { t: 'project' }, ICON.tProject, P.name, t('tree.project'), '', 'P');
    if (!S.collapsed.P) {
      h += row(1, { t: 'folder' }, ICON.tFolder, `${t('tree.wells')} (${P.wells.length})`, '', '', 'W');
      if (!S.collapsed.W) {
        P.wells.forEach((w) => {
          const curves = w.curves.map((c, ci) => ({ c, ci })).filter(({ c }) => (!S.fam || c.family === S.fam) && (!q || c.mnemonic.toLowerCase().includes(q) || wellLabel(w).toLowerCase().includes(q)));
          const wellMatch = !q || wellLabel(w).toLowerCase().includes(q) || (w.id || '').toLowerCase().includes(q);
          if (S.fam && !curves.length) return;
          if (!wellMatch && !curves.length) return;
          const key = 'w' + w.uid;
          h += row(2, { t: 'well', uid: w.uid }, ICON.tWell, wellLabel(w), t('tree.well'), '', w.curves.length ? key : null);
          if (!S.collapsed[key]) curves.forEach(({ c, ci }) => { h += row(3, { t: 'curve', uid: w.uid, ci }, ci === 0 ? ICON.tDepth : ICON.tCurve, c.mnemonic, c.family, c.unit); });
        });
      }
    }
    el.innerHTML = h;
  }
  $('#tree').addEventListener('click', (e) => {
    const tog = e.target.closest('[data-tog]');
    if (tog) { S.collapsed[tog.dataset.tog] = !S.collapsed[tog.dataset.tog]; renderTree(); return; }
    const r = e.target.closest('.trow'); if (!r) return;
    if (r.dataset.t === 'folder') return;
    S.sel = { t: r.dataset.t, uid: r.dataset.uid || undefined, ci: r.dataset.ci === '' ? undefined : +r.dataset.ci };
    $$('#tree .trow').forEach((x) => x.classList.toggle('sel', x === r));
    renderProps(); renderRibbon();
  });
  $('#tree').addEventListener('dblclick', (e) => {
    const r = e.target.closest('.trow'); if (!r || !r.dataset.uid) return;
    const w = wellBy(r.dataset.uid);
    if (r.dataset.t === 'curve' && +r.dataset.ci > 0) {
      const v = logViewOf(w); const m = w.curves[+r.dataset.ci].mnemonic;
      if (!v.curves.includes(m)) v.curves.push(m);
      openDoc('log:' + w.uid);
    } else if (w.curves.length) openDoc('log:' + w.uid); else openDoc('rep:' + w.uid);
  });
  $('#famFilter').addEventListener('change', (e) => { S.fam = e.target.value; renderTree(); });
  $('#treeSearch').addEventListener('input', (e) => { S.search = e.target.value.trim(); renderTree(); });

  /* ================= properties editor ================= */
  const PROJECT_FIELDS = [
    ['pg.tech', [['m', 'p.m', 0.5], ['Tin', 'p.Tin', 1], ['years', 'p.years', 1], ['T0', 'p.T0', 1], ['k', 'p.k', 0.1], ['Rw', 'p.Rw', 0.01], ['upLoss', 'p.upLoss', 1], ['sigmaG', 'p.sigmaG', 0.05]]],
    ['pg.econ', [['purpose', 'p.purpose', 'purpose'], ['heatPrice', 'p.heatPrice', 10], ['capexOn', 'p.capexOn', 0.5], ['capexOff', 'p.capexOff', 0.5], ['pipe', 'p.pipe', 0.1], ['opex', 'p.opex', 0.5], ['pump', 'p.pump', 1], ['hours', 'p.hours', 100], ['rate', 'p.rate', 0.5], ['life', 'p.life', 1]]],
    ['pg.score', [['w_thermal', 'p.wT', 0.05], ['w_integrity', 'p.wI', 0.05], ['w_distance', 'p.wD', 0.05], ['w_econ', 'p.wE', 0.05], ['threshold', 'p.threshold', 5]]],
  ];
  const WELL_FIELDS = [
    ['pg.general', [['id', 'f.id', 'text'], ['name', 'f.name', 'text'], ['field', 'f.field', 'text'], ['location', 'f.location', 'location'], ['depth_m', 'f.depth', 1]]],
    ['pg.thermal', [['gradient_c100m', 'f.g', 0.01], ['bht_c', 'f.bht', 0.1], ['bht1_c', 'f.bht1', 0.1], ['dt1_h', 'f.dt1', 0.5], ['bht2_c', 'f.bht2', 0.1], ['dt2_h', 'f.dt2', 0.5], ['tc_h', 'f.tc', 0.5]]],
    ['pg.status', [['integrity', 'f.integrity', 'integrity'], ['distance_km', 'f.dist', 0.5]]],
  ];
  const roRow = (k, v) => `<tr><td>${t(k)}</td><td><span class="ro" title="${esc(v)}">${esc(v)}</span></td></tr>`;
  const grpRow = (k) => `<tr class="grp"><td colspan="2">${t(k)}</td></tr>`;
  function inputFor(obj, key, kind) {
    const v = obj[key];
    if (kind === 'text') return `<input data-k="${key}" value="${esc(v)}">`;
    if (kind === 'location') return `<select data-k="${key}">${['onshore', 'offshore'].map((o) => `<option value="${o}"${v === o ? ' selected' : ''}>${t('loc.' + o)}</option>`).join('')}</select>`;
    if (kind === 'integrity') return `<select data-k="${key}">${['good', 'fair', 'poor'].map((o) => `<option value="${o}"${v === o ? ' selected' : ''}>${t('int.' + o)}</option>`).join('')}</select>`;
    if (kind === 'purpose') return `<select data-k="${key}">${[['hp', 'p.purpHP'], ['res', 'p.purpRes'], ['custom', 'p.purpCustom']].map(([o, l]) => `<option value="${o}"${v === o ? ' selected' : ''}>${t(l)}</option>`).join('')}</select>`;
    if (kind === 'family') return `<select data-k="${key}">${L.FAMILIES.map((o) => `<option${v === o ? ' selected' : ''}>${o}</option>`).join('')}</select>`;
    return `<input data-k="${key}" type="number" step="${kind}" value="${v === undefined || v === null || Number.isNaN(v) ? '' : v}">`;
  }
  function fieldRows(obj, groups) {
    return groups.map(([g, fields]) => grpRow(g) + fields.map(([k, lab, kind]) => `<tr><td>${t(lab)}</td><td>${inputFor(obj, k, kind)}</td></tr>`).join('')).join('');
  }
  function renderProps() {
    const el = $('#props');
    if (!S.project || !S.sel) { el.innerHTML = `<div class="empty-msg">${t('props.none')}</div>`; return; }
    const P = S.project; let h = '';
    if (S.sel.t === 'project') {
      h = grpRow('pg.general') + `<tr><td>${t('f.projName')}</td><td><input data-k="name" data-o="proj" value="${esc(P.name)}"></td></tr>`
        + roRow('f.created', new Date(P.created).toLocaleString(loc())) + roRow('f.wellCount', P.wells.length) + fieldRows(P.params, PROJECT_FIELDS);
    } else {
      const w = wellBy(S.sel.uid); if (!w) { el.innerHTML = ''; return; }
      if (S.sel.t === 'well') {
        h = fieldRows(w, WELL_FIELDS);
        if (w.gSource) h += roRow('det.gsrc', t('src.' + w.gSource));
        if (w.gNote) h += roRow('f.gNote', w.gNote);
        if (isFinite(w.md_m)) h += roRow('f.md', fmt(w.md_m));
        if (Array.isArray(w.tempPoints) && w.tempPoints.length) {
          h += grpRow('f.tpts') + w.tempPoints.map((p) => `<tr><td title="${esc(p.src)}">${fmt(p.z)} m</td><td><span class="ro" title="${esc(p.src)}">${fmt(p.T, 1)} °C · ${esc(p.src)}</span></td></tr>`).join('');
        }
        if (w.curves.length) {
          const st = L.curveStats(w.curves[0].data);
          h += grpRow('pg.las') + roRow('f.file', w.fileName || '–') + roRow('f.null', w.nullValue) + roRow('f.curves', w.curves.length) + roRow('f.rows', fmt(w.curves[0].data.length)) + roRow('f.range', `${fmt(st.min, 1)} – ${fmt(st.max, 1)}`);
        }
      } else {
        const c = w.curves[S.sel.ci]; if (!c) { el.innerHTML = ''; return; }
        const st = L.curveStats(c.data);
        h = grpRow('pg.general') + `<tr><td>${t('f.mnem')}</td><td>${inputFor(c, 'mnemonic', 'text')}</td></tr><tr><td>${t('f.unit')}</td><td>${inputFor(c, 'unit', 'text')}</td></tr>`
          + `<tr><td>${t('f.family')}</td><td>${inputFor(c, 'family', 'family')}</td></tr><tr><td>${t('f.desc')}</td><td>${inputFor(c, 'desc', 'text')}</td></tr>`
          + grpRow('pg.stats') + roRow('tree.well', wellLabel(w)) + roRow('f.valid', `${fmt(st.valid)} / ${fmt(st.total)}`) + roRow('f.min', fmt(st.min, 3)) + roRow('f.max', fmt(st.max, 3));
      }
    }
    el.innerHTML = `<table class="ptable">${h}</table>`;
  }
  $('#props').addEventListener('change', (e) => {
    const k = e.target.dataset.k; if (!k || !S.project) return;
    const raw = e.target.value;
    let obj, numeric = e.target.type === 'number';
    if (e.target.dataset.o === 'proj') obj = S.project;
    else if (S.sel.t === 'project') obj = S.project.params;
    else if (S.sel.t === 'well') obj = wellBy(S.sel.uid);
    else obj = wellBy(S.sel.uid).curves[S.sel.ci];
    obj[k] = numeric ? (raw === '' ? undefined : parseFloat(raw)) : raw;
    if (S.sel.t === 'project' && k === 'purpose' && raw !== 'custom') { obj.heatPrice = PURPOSE_PRICE[raw]; renderProps(); }
    if (S.sel.t === 'project' && k === 'heatPrice') { obj.purpose = 'custom'; renderProps(); }
    if (S.sel.t === 'well' && (k === 'gradient_c100m')) { obj.gNote = ''; obj.gSource = undefined; renderProps(); }
    touch();
    renderTree(); renderRibbon(); renderDocTabs();
    if (S.active.startsWith('log:')) renderDoc();
  });

  /* ================= workspace docs ================= */
  function docTitle(id) {
    if (id === 'start') return [ICON.docStart, t('doc.start')];
    if (id === 'rank') return [ICON.docRank, t('doc.rank')];
    if (id === 'sens') return [ICON.docSens, t('doc.sens')];
    const [k, u] = id.split(':'); const w = wellBy(u);
    return [k === 'log' ? ICON.docLog : ICON.docRep, `${t(k === 'log' ? 'doc.log' : 'doc.rep')}: ${w ? wellLabel(w) : '?'}`];
  }
  function openDoc(id) {
    if (!S.docs.includes(id)) S.docs.push(id);
    S.active = id;
    renderDocTabs(); renderDoc(); renderRibbon();
  }
  function closeDoc(id) {
    const i = S.docs.indexOf(id); if (i < 0) return;
    S.docs.splice(i, 1);
    if (!S.docs.length) S.docs = ['start'];
    if (S.active === id) S.active = S.docs[Math.max(0, i - 1)] || S.docs[0];
    renderDocTabs(); renderDoc();
  }
  function renderDocTabs() {
    S.docs = S.docs.filter((d) => !d.includes(':') || wellBy(d.split(':')[1]));
    if (!S.docs.length) S.docs = ['start'];
    if (!S.docs.includes(S.active)) S.active = S.docs[0];
    $('#docTabs').innerHTML = S.docs.map((d) => { const [ic, ti] = docTitle(d); return `<div class="doc-tab${d === S.active ? ' on' : ''}" data-doc="${esc(d)}">${ic}<span>${esc(ti)}</span><button class="x" data-cdoc="${esc(d)}">×</button></div>`; }).join('');
  }
  $('#docTabs').addEventListener('click', (e) => {
    const c = e.target.closest('[data-cdoc]'); if (c) { closeDoc(c.dataset.cdoc); return; }
    const d = e.target.closest('[data-doc]'); if (d && d.dataset.doc !== S.active) { S.active = d.dataset.doc; renderDocTabs(); renderDoc(); }
  });

  let charts = {};
  function killCharts() { Object.values(charts).forEach((c) => c.destroy()); charts = {}; }
  function renderDoc() {
    killCharts();
    const a = $('#docArea'); const id = S.active;
    a.scrollTop = 0;
    if (id === 'start') return renderStart(a);
    if (!S.project) { a.innerHTML = ''; return; }
    if (id === 'rank') return renderRank(a);
    if (id === 'sens') return renderSens(a);
    if (id.startsWith('rep:')) return renderReport(a, id.slice(4));
    if (id.startsWith('log:')) return renderLog(a, id.slice(4));
  }

  /* ---------- start page ---------- */
  async function renderStart(a) {
    a.innerHTML = `<div class="start">
      <div class="start-hero">${ICON.newWell}<div><h2>${t('start.title')}</h2><div class="muted">${t('start.sub')}</div></div></div>
      <div class="start-grid">
        <div class="start-actions">
          <button class="big-act" data-act="newProject">${ICON.newProject}${t('start.new')}</button>
          <button class="big-act" data-act="openProject">${ICON.openProject}${t('start.open')}</button>
          <button class="big-act" data-act="importLas" ${S.project ? '' : 'hidden'}>${ICON.importLas}${t('b.importLas')}</button>
          <button class="big-act" data-act="demo">${ICON.demo}${t('start.demo')}</button>
        </div>
        <div class="recent"><h3>${t('start.recent')}</h3><div id="recentList"></div></div>
      </div>
      <ol class="steps"><li>${t('start.s1')}</li><li>${t('start.s2')}</li><li>${t('start.s3')}</li><li>${t('start.s4')}</li></ol>
      <p class="hint" style="margin-top:16px">${t('start.local')}</p></div>`;
    const list = (await Store.all()).sort((x, y) => y.updated - x.updated).slice(0, 8);
    const rl = $('#recentList'); if (!rl) return;
    rl.innerHTML = list.length ? list.map((p) => `<div class="item" data-open="${p.id}"><span>${esc(p.name)}</span><small>${p.wells.length} ${t('dlg.wells')} · ${new Date(p.updated).toLocaleDateString(loc())}</small></div>`).join('') : `<div class="none">${t('start.none')}</div>`;
  }
  $('#docArea').addEventListener('click', async (e) => {
    const o = e.target.closest('[data-open]');
    if (o) { const p = await Store.get(o.dataset.open); if (p) openProject(p); }
  });

  /* ---------- ranking ---------- */
  function renderRank(a) {
    const res = screen(); const P = modelParams();
    if (!res || !S.project.wells.length) { a.innerHTML = `<div class="doc"><h2>${t('doc.rank')}</h2><p class="muted">${t('proj.empty')}</p></div>`; return; }
    const pass = res.ranked.filter((w) => w.score >= P.threshold);
    const qPass = pass.reduce((s, w) => s + w.Q, 0);
    const selU = S.sel && S.sel.uid;
    a.innerHTML = `<div class="doc">
      <h2>${t('doc.rank')}</h2><div class="hint">${t('rank.hint')}</div>
      <div class="kpis">
        <div class="kpi"><span>${t('kpi.n')}</span><b>${fmt(res.ranked.length)}</b></div>
        <div class="kpi"><span>${t('kpi.pass')} ≥ ${fmt(P.threshold)}</span><b>${fmt(pass.length)}</b></div>
        <div class="kpi"><span>${t('kpi.q')}</span><b>${qPass >= 1000 ? fmt(qPass / 1000, 2) + ' MW' : fmt(qPass) + ' kW'}</b></div>
        <div class="kpi"><span>${t('kpi.e')}</span><b>${fmt(qPass * P.eco.hours / 1e6, 1)} GWh</b></div>
      </div>
      ${res.invalid.length ? `<div class="warnbox">${esc(t('rank.invalid', { n: res.invalid.length, list: res.invalid.map((w) => w.name || w.id || '?').join(', ') }))}</div>` : ''}
      <div class="tscroll"><table class="tbl" id="rankTbl"><thead><tr>
        <th>${t('r.rank')}</th><th>${t('r.well')}</th><th class="n">${t('r.depth')}</th><th class="n">${t('r.g')}</th><th>${t('r.src')}</th><th class="n">${t('r.tb')}</th><th class="n">${t('r.tout')}</th><th class="n">${t('r.q')}</th><th class="n">${t('r.p1090')}</th><th>${t('r.integ')}</th><th class="n">${t('r.npv')}</th><th>${t('r.use')}</th><th>${t('r.score')}</th>
      </tr></thead><tbody>${res.ranked.map((w, i) => {
        const ok = w.score >= P.threshold;
        return `<tr class="${ok ? 'pass' : ''}${w.uid === selU ? ' sel' : ''}" data-u="${w.uid}"><td>${i + 1}</td><td><b>${esc(w.name || w.id)}</b> <span class="hint">${t('loc.' + w.location)}</span></td>
          <td class="n">${fmt(w.depth)}</td><td class="n">${fmt(w.G, 2)}</td><td><span class="src ${srcOf(w)}">${t('src.' + srcOf(w))}</span></td><td class="n">${fmt(w.Tbottom)}</td><td class="n">${fmt(w.Tout, 1)}</td>
          <td class="n"><b>${fmt(w.Q)}</b></td><td class="n">${fmt(w.mc.p10)}–${fmt(w.mc.p90)}</td><td><span class="badge ${w.integrity}">${t('int.' + w.integrity)}</span></td>
          <td class="n ${w.eco.npv < 0 ? 'npv-neg' : 'npv-pos'}">${fmt(w.eco.npv, 1)}</td><td class="use">${t(w.use)}</td>
          <td><div class="bar ${ok ? 'pass' : ''}"><i><b style="width:${w.score}%"></b></i><span>${w.score}</span></div></td></tr>`;
      }).join('')}</tbody></table></div></div>`;
  }
  $('#docArea').addEventListener('click', (e) => {
    const r = e.target.closest('#rankTbl tbody tr'); if (!r) return;
    S.sel = { t: 'well', uid: r.dataset.u };
    $$('#rankTbl tbody tr').forEach((x) => x.classList.toggle('sel', x === r));
    renderTree(); renderProps(); renderRibbon();
  });
  $('#docArea').addEventListener('dblclick', (e) => { const r = e.target.closest('#rankTbl tbody tr'); if (r) openDoc('rep:' + r.dataset.u); });

  /* ---------- charts helpers ---------- */
  Chart.defaults.font.family = '"Be Vietnam Pro", system-ui, sans-serif';
  Chart.defaults.color = '#52606d';
  Chart.defaults.borderColor = '#e3e8ee';
  Chart.defaults.animation = false;
  const numTick = (d = 0) => (v) => fmt(v, d);
  function mk(id, cfg) { const c = document.getElementById(id); if (!c) return null; charts[id] = new Chart(c, cfg); return charts[id]; }
  function flowChart(id, base) {
    const s = [0.5, 1, 1.5, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12].map((m) => Object.assign({ m }, M.wellOutput(Object.assign({}, base, { m }))));
    mk(id, {
      type: 'line',
      data: { labels: s.map((r) => fmt(r.m, 1)), datasets: [
        { label: t('ch.q'), data: s.map((r) => r.Q), borderColor: '#ef6c00', backgroundColor: '#ef6c00', yAxisID: 'y', tension: .3 },
        { label: t('ch.tout'), data: s.map((r) => r.Tout), borderColor: '#1976d2', backgroundColor: '#1976d2', yAxisID: 'y1', tension: .3, borderDash: [5, 4] },
      ] },
      options: { maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
        plugins: { tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${fmt(c.parsed.y, c.datasetIndex ? 1 : 0)}` } } },
        scales: { x: { title: { display: true, text: t('ch.flow') } }, y: { title: { display: true, text: t('ch.q') }, ticks: { callback: numTick() } },
          y1: { position: 'right', grid: { drawOnChartArea: false }, title: { display: true, text: t('ch.tout') }, ticks: { callback: numTick() } } } },
    });
  }

  /* ---------- well report ---------- */
  function renderReport(a, u) {
    const well = wellBy(u); const res = screen(); const P = modelParams();
    const w = res && res.ranked.find((x) => x.uid === u);
    if (!w) { a.innerHTML = `<div class="doc"><h2>${esc(wellLabel(well))}</h2><div class="warnbox">${t('det.invalid')}</div></div>`; return; }
    const cls = w.score >= P.threshold ? 'go' : w.score >= P.threshold * 0.6 ? '' : 'no';
    const recTxt = cls === 'go' ? t('det.recGo') : cls === '' ? t('det.recMaybe') : t('det.recNo');
    const subs = [['p.wT', w.subScores.thermal], ['p.wI', w.subScores.integrity], ['p.wD', w.subScores.distance], ['p.wE', w.subScores.econ]];
    const bn = S.lang === 'vi' ? 'tỷ đ' : 'bn VND';
    a.innerHTML = `<div class="doc">
      <div class="rep-head"><div><h2>${t('doc.rep')}: ${esc(wellLabel(well))}</h2><div class="hint">${esc(S.project.name)} · ${new Date().toLocaleDateString(loc())}</div></div><button class="btn no-print" id="btnPrint">${t('det.print')}</button></div>
      <div class="facts">
        <div class="fact"><span>${t('r.score')}</span><b>${w.score}/100</b></div>
        <div class="fact"><span>${t('r.q')}</span><b>${fmt(w.Q)}</b> <span class="hint">P10–P90 ${fmt(w.mc.p10)}–${fmt(w.mc.p90)}</span></div>
        <div class="fact"><span>${t('r.tout')}</span><b>${fmt(w.Tout, 1)}</b></div>
        <div class="fact"><span>${t('r.npv')}</span><b class="${w.eco.npv < 0 ? 'npv-neg' : 'npv-pos'}">${fmt(w.eco.npv, 1)}</b></div>
      </div>
      <div class="rec ${cls}"><b>${t('det.rec')}:</b> ${recTxt}<br><b>${t('r.use')}:</b> ${t(w.use)}</div>
      <div class="rep-grid">
        <div class="card"><h3>${t('det.summary')}</h3><table class="kv">
          <tr><td>${t('f.location')}</td><td>${t('loc.' + w.location)}</td></tr>
          <tr><td>${t('r.depth')}</td><td>${fmt(w.depth)}</td></tr>
          <tr><td>${t('r.g')}</td><td>${fmt(w.G, 2)}</td></tr>
          <tr><td>${t('det.gsrc')}</td><td>${t('src.' + srcOf(w))}</td></tr>
          ${well.gNote && w.gSource === 'given' ? `<tr><td colspan="2" class="hint" style="text-align:left;font-weight:400">${esc(well.gNote)}</td></tr>` : ''}
          ${isFinite(w.Tstatic) ? `<tr><td>${t('det.tstatic')}</td><td>${fmt(w.Tstatic, 1)} °C</td></tr>` : ''}
          <tr><td>${t('r.tb')}</td><td>${fmt(w.Tbottom, 1)}</td></tr>
          <tr><td>${t('r.integ')}</td><td><span class="badge ${w.integrity}">${t('int.' + w.integrity)}</span></td></tr>
          <tr><td>${t('f.dist')}</td><td>${fmt(w.distance, 1)}</td></tr>
          <tr><td>${t('det.energy')}</td><td>${fmt(w.eco.Qy[0] * P.eco.hours / 1000)} MWhth</td></tr>
          <tr><td>${t('det.capex')}</td><td>${fmt(w.eco.capex, 1)} ${bn}</td></tr>
          <tr><td>${t('det.lcoh')}</td><td>${fmt(w.eco.lcoh)} ${S.lang === 'vi' ? 'đ/kWhth' : 'VND/kWhth'}</td></tr>
          <tr><td>${t('det.payback')}</td><td>${w.eco.payback ? w.eco.payback + ' ' + t('det.yr') : t('det.never')}</td></tr></table>
          <h3 style="margin-top:14px">${t('det.subs')}</h3>
          <ul class="subs">${subs.map(([k, v]) => `<li><span>${t(k)}</span><div class="bar"><i><b style="width:${Math.round(v * 100)}%"></b></i></div><span>${Math.round(v * 100)}</span></li>`).join('')}</ul>
        </div>
        <div class="card"><h3>${t('det.profile')}</h3><div class="chart-box" style="height:380px"><canvas id="chProfile"></canvas></div></div>
        <div class="card"><h3>${t('det.flow')}</h3><div class="chart-box"><canvas id="chFlow"></canvas></div></div>
        <div class="card"><h3>${t('det.decline')}</h3><div class="chart-box"><canvas id="chDecline"></canvas></div></div>
      </div><p class="hint" style="margin-top:12px">${t('det.disclaimer')}</p></div>`;
    $('#btnPrint').onclick = () => window.print();
    const prof = M.wellOutput(Object.assign({}, w.base, { profile: true }));
    const ds = [
      { label: t('ch.rock'), data: prof.z.map((z, i) => ({ x: prof.Trock[i], y: z })), showLine: true, pointRadius: 0, borderColor: '#c62828', borderWidth: 2.4 },
      { label: t('ch.fluid'), data: prof.z.map((z, i) => ({ x: prof.Tfluid[i], y: z })), showLine: true, pointRadius: 0, borderColor: '#1976d2', borderWidth: 2.4, borderDash: [6, 4] },
    ];
    const tc = well.curves.find((c) => c.family === 'Temperature');
    if (tc && well.curves[0]) {
      const dd = well.curves[0].data; const toC = /f/i.test(tc.unit) && !/c/i.test(tc.unit) ? (v) => (v - 32) / 1.8 : (v) => v;
      const pts = []; const step = Math.max(1, Math.floor(dd.length / 300));
      for (let i = 0; i < dd.length; i += step) if (dd[i] !== null && tc.data[i] !== null) pts.push({ x: toC(tc.data[i]), y: dd[i] });
      ds.push({ label: `${t('ch.meas')} (${tc.mnemonic})`, data: pts, pointRadius: 1.5, borderColor: '#ef6c00', backgroundColor: '#ef6c00' });
    }
    if (Array.isArray(well.tempPoints) && well.tempPoints.length) {
      ds.push({ label: t('ch.dst'), data: well.tempPoints.map((p) => ({ x: p.T, y: p.z, src: p.src })), pointRadius: 6, pointStyle: 'rectRot', borderColor: '#2e7d32', backgroundColor: '#66bb6a' });
    }
    mk('chProfile', { type: 'scatter', data: { datasets: ds }, options: { maintainAspectRatio: false,
      plugins: { tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${fmt(c.parsed.x, 1)} °C @ ${fmt(c.parsed.y)} m${c.raw && c.raw.src ? ' – ' + c.raw.src : ''}` } } },
      scales: { y: { reverse: true, min: 0, title: { display: true, text: t('ch.depth') }, ticks: { callback: numTick() } }, x: { title: { display: true, text: t('ch.temp') }, ticks: { callback: numTick() } } } } });
    flowChart('chFlow', w.base);
    mk('chDecline', { data: { labels: w.eco.years, datasets: [
      { type: 'bar', label: t('ch.q'), data: w.eco.Qy, backgroundColor: 'rgba(239,108,0,.5)', yAxisID: 'y' },
      { type: 'line', label: t('ch.cum'), data: w.eco.cumCash, borderColor: '#1565c0', backgroundColor: '#1565c0', pointRadius: 0, yAxisID: 'y1', tension: .2 },
    ] }, options: { maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
      plugins: { tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${fmt(c.parsed.y, c.datasetIndex ? 1 : 0)}` } } },
      scales: { x: { title: { display: true, text: t('ch.year') } }, y: { title: { display: true, text: t('ch.q') }, ticks: { callback: numTick() } },
        y1: { position: 'right', grid: { drawOnChartArea: false }, title: { display: true, text: t('ch.cum') }, ticks: { callback: numTick() } } } } });
  }

  /* ---------- sensitivity ---------- */
  function heatColor(f) {
    const st = [[255, 247, 224], [253, 196, 120], [238, 120, 45], [196, 46, 30], [122, 18, 22]];
    const x = Math.max(0, Math.min(1, f)) * (st.length - 1); const i = Math.min(st.length - 2, Math.floor(x)); const r = x - i;
    return { bg: `rgb(${st[i].map((v, j) => Math.round(v + r * (st[i + 1][j] - v)))})`, fg: f > 0.55 ? '#fff' : '#2a1a0a' };
  }
  function renderSens(a) {
    const P = modelParams();
    const base = { T0: P.T0, k: P.k, m: P.m, Tin: P.Tin, years: P.years, Rw: P.Rw, upLoss: P.upLoss, n: 300 };
    const depths = [1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000]; const Gs = [2.6, 2.8, 3.0, 3.2, 3.4, 3.6, 3.8, 4.0];
    const grid = depths.map((Lz) => Gs.map((g) => M.wellOutput(Object.assign({}, base, { L: Lz, G: g })).Q));
    const all = grid.flat(); const lo = Math.min(...all), hi = Math.max(...all);
    let hm = `<div class="hl">m \\ G</div>` + Gs.map((g) => `<div class="hl">${fmt(g, 1)}</div>`).join('');
    depths.slice().reverse().forEach((Lz) => { hm += `<div class="hl">${fmt(Lz)}</div>` + grid[depths.indexOf(Lz)].map((q) => { const c = heatColor((q - lo) / (hi - lo || 1)); return `<div class="hc" style="background:${c.bg};color:${c.fg}">${fmt(q)}</div>`; }).join(''); });
    const rows = [[2000, 2.8], [2000, 3.6], [3000, 2.8], [3000, 3.6], [4000, 2.8], [4000, 3.3], [4000, 3.6]].map(([Lz, g]) => { const r = M.wellOutput(Object.assign({}, base, { L: Lz, G: g, n: 600 })); return `<tr><td class="n">${fmt(Lz)}</td><td class="n">${fmt(g, 1)}</td><td class="n">${fmt(r.Tbottom)}</td><td class="n">${fmt(r.Tout, 1)}</td><td class="n"><b>${fmt(r.Q)}</b></td><td class="n">${fmt(r.Q * P.eco.hours / 1000)}</td></tr>`; }).join('');
    a.innerHTML = `<div class="doc"><h2>${t('doc.sens')}</h2><p class="hint">m = ${fmt(P.m, 1)} kg/s · T in = ${fmt(P.Tin)} °C · ${fmt(P.years)} ${t('det.yr')} · k = ${fmt(P.k, 1)} W/m·K</p>
      <div class="rep-grid"><div class="card"><h3>${t('sens.map')}</h3><div class="heatmap" style="grid-template-columns:64px repeat(${Gs.length},1fr)">${hm}</div></div>
      <div class="card"><h3>${t('sens.t41')}</h3><div class="tscroll"><table class="tbl"><thead><tr><th class="n">${t('ch.depth')}</th><th class="n">G</th><th class="n">${t('r.tb')}</th><th class="n">${t('r.tout')}</th><th class="n">${t('r.q')}</th><th class="n">${t('sens.e')}</th></tr></thead><tbody>${rows}</tbody></table></div>
      <h3 style="margin-top:14px">${t('det.flow')} – ${t('sens.flow')}</h3><div class="chart-box" style="height:230px"><canvas id="chFlowRef"></canvas></div></div></div></div>`;
    flowChart('chFlowRef', Object.assign({}, base, { L: 4000, G: 3.3, n: 600 }));
  }

  /* ---------- log plot ---------- */
  const SCALES = { 'Gamma Ray': [0, 150], 'Bulk Density': [1.95, 2.95], 'Neutron Porosity': [0.45, -0.15], 'Sonic': [140, 40], 'Shear Sonic': [340, 40], 'Resistivity': [0.2, 2000, 'log'], 'Caliper': [6, 16], 'Photoelectric': [0, 10], 'Density Correction': [-0.25, 0.25], 'Shale Volume': [0, 1], 'Porosity': [0.5, 0], 'Water Saturation': [1, 0] };
  const COLORS = { 'Gamma Ray': '#2e7d32', 'Bulk Density': '#c62828', 'Neutron Porosity': '#1565c0', 'Sonic': '#6a1b9a', 'Shear Sonic': '#8e24aa', 'Resistivity': '#212121', 'Caliper': '#757575', 'Spontaneous Potential': '#00838f', 'Photoelectric': '#ad1457', 'Temperature': '#ef6c00' };
  function logViewOf(w) {
    if (!S.logView[w.uid]) {
      const st = w.curves[0] ? L.curveStats(w.curves[0].data) : { min: 0, max: 1 };
      S.logView[w.uid] = { curves: w.curves.slice(1, 7).map((c) => c.mnemonic), top: st.min, bottom: st.max };
    }
    return S.logView[w.uid];
  }
  function renderLog(a, u) {
    const w = wellBy(u);
    if (!w.curves.length) { a.innerHTML = `<div class="nolog">${t('log.noCurves')}</div>`; return; }
    const v = logViewOf(w);
    a.innerHTML = `<div class="logdoc"><div class="logbar">
        <b>${esc(wellLabel(w))}</b>
        <label>${t('log.top')} <input type="number" id="lgTop" value="${+v.top.toFixed(1)}" step="50"></label>
        <label>${t('log.bottom')} <input type="number" id="lgBot" value="${+v.bottom.toFixed(1)}" step="50"></label>
        <button class="btn ghost" id="lgReset">${t('log.reset')}</button>
        <span class="chips">${w.curves.slice(1).map((c) => `<label><input type="checkbox" data-cv="${esc(c.mnemonic)}" ${v.curves.includes(c.mnemonic) ? 'checked' : ''}><span style="color:${COLORS[c.family] || '#00796b'}">${esc(c.mnemonic)}</span></label>`).join('')}</span>
        <span class="logread" id="lgRead"></span></div>
      <div class="logwrap" id="lgWrap"><canvas id="lgCanvas"></canvas><canvas id="lgOver"></canvas></div></div>`;
    $('#lgTop').onchange = (e) => { v.top = +e.target.value; drawLog(w); };
    $('#lgBot').onchange = (e) => { v.bottom = +e.target.value; drawLog(w); };
    $('#lgReset').onclick = () => { const st = L.curveStats(w.curves[0].data); v.top = st.min; v.bottom = st.max; $('#lgTop').value = +st.min.toFixed(1); $('#lgBot').value = +st.max.toFixed(1); drawLog(w); };
    $$('[data-cv]', a).forEach((cb) => cb.onchange = () => {
      v.curves = w.curves.slice(1).map((c) => c.mnemonic).filter((m) => { const el = a.querySelector(`[data-cv="${CSS.escape(m)}"]`); return el && el.checked; });
      drawLog(w);
    });
    drawLog(w);
    const over = $('#lgOver');
    over.onmousemove = (e) => hoverLog(w, e);
    over.onmouseleave = () => { const ctx = over.getContext('2d'); ctx.clearRect(0, 0, over.width, over.height); $('#lgRead').textContent = ''; };
    over.onwheel = (e) => {
      e.preventDefault();
      const geo = over._geo; if (!geo) return;
      const z = geo.top + (e.offsetY - geo.headH) / geo.plotH * (geo.bottom - geo.top);
      const f = e.deltaY > 0 ? 1.25 : 0.8;
      const st = L.curveStats(w.curves[0].data);
      v.top = Math.max(st.min, z - (z - v.top) * f); v.bottom = Math.min(st.max, z + (v.bottom - z) * f);
      $('#lgTop').value = +v.top.toFixed(1); $('#lgBot').value = +v.bottom.toFixed(1);
      drawLog(w);
    };
  }
  function niceStep(range, target) { const raw = range / target; const p = Math.pow(10, Math.floor(Math.log10(raw))); const n = raw / p; return (n < 1.5 ? 1 : n < 3 ? 2 : n < 7 ? 5 : 10) * p; }
  function drawLog(w) {
    const wrap = $('#lgWrap'); if (!wrap) return;
    const cv = $('#lgCanvas'), ov = $('#lgOver');
    const W = wrap.clientWidth, H = Math.max(300, wrap.clientHeight), dpr = window.devicePixelRatio || 1;
    [cv, ov].forEach((c) => { c.width = W * dpr; c.height = H * dpr; c.style.width = W + 'px'; c.style.height = H + 'px'; });
    const ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
    const v = logViewOf(w);
    if (!(v.bottom > v.top)) { v.bottom = v.top + 10; }
    const dep = w.curves[0].data;
    const tracks = v.curves.map((m) => w.curves.find((c) => c.mnemonic === m)).filter(Boolean);
    const depthW = 66, headH = 62, plotH = H - headH - 6;
    const n = Math.max(1, tracks.length); const trackW = (W - depthW) / n;
    const y = (z) => headH + (z - v.top) / (v.bottom - v.top) * plotH;
    ov._geo = { top: v.top, bottom: v.bottom, headH, plotH, depthW, trackW, tracks };
    ctx.font = '11px "Be Vietnam Pro", sans-serif'; ctx.textBaseline = 'middle';
    // depth track
    const ds = niceStep(v.bottom - v.top, plotH / 45);
    ctx.strokeStyle = '#c5ced8'; ctx.lineWidth = 1; ctx.strokeRect(0.5, headH + 0.5, depthW - 1, plotH);
    ctx.fillStyle = '#1f2933'; ctx.textAlign = 'center';
    ctx.fillText('MD', depthW / 2, headH / 2 - 8); ctx.fillStyle = '#7b8794'; ctx.fillText(w.curves[0].unit || 'm', depthW / 2, headH / 2 + 8);
    ctx.textAlign = 'right';
    for (let z = Math.ceil(v.top / ds) * ds; z <= v.bottom; z += ds) { const yy = Math.round(y(z)) + 0.5; ctx.fillStyle = '#52606d'; ctx.fillText(fmt(z), depthW - 8, yy); ctx.strokeStyle = '#c5ced8'; ctx.beginPath(); ctx.moveTo(depthW - 5, yy); ctx.lineTo(depthW, yy); ctx.stroke(); }
    // index range
    let i0 = 0, i1 = dep.length - 1;
    while (i0 < dep.length && (dep[i0] === null || dep[i0] < v.top)) i0++;
    while (i1 > 0 && (dep[i1] === null || dep[i1] > v.bottom)) i1--;
    const stride = Math.max(1, Math.floor((i1 - i0) / (plotH * 2)));
    tracks.forEach((c, k) => {
      const x0 = depthW + k * trackW;
      const st = L.curveStats(c.data);
      let [lo, hi, mode] = SCALES[c.family] || [st.min, st.max];
      if (!SCALES[c.family]) { const pad = (hi - lo) * 0.05 || 1; lo -= pad; hi += pad; }
      const isLog = mode === 'log';
      const fx = isLog ? (val) => x0 + (Math.log10(Math.max(val, 1e-6)) - Math.log10(lo)) / (Math.log10(hi) - Math.log10(lo)) * trackW : (val) => x0 + (val - lo) / (hi - lo) * trackW;
      // frame & grid
      ctx.strokeStyle = '#c5ced8'; ctx.strokeRect(Math.round(x0) + 0.5, headH + 0.5, trackW - 1, plotH);
      ctx.strokeStyle = '#eef2f6';
      if (isLog) { for (let d = Math.ceil(Math.log10(lo)); d <= Math.log10(hi); d++) { const xx = Math.round(fx(Math.pow(10, d))) + 0.5; ctx.beginPath(); ctx.moveTo(xx, headH); ctx.lineTo(xx, headH + plotH); ctx.stroke(); } } else { for (let g = 1; g < 4; g++) { const xx = Math.round(x0 + g * trackW / 4) + 0.5; ctx.beginPath(); ctx.moveTo(xx, headH); ctx.lineTo(xx, headH + plotH); ctx.stroke(); } }
      for (let z = Math.ceil(v.top / ds) * ds; z <= v.bottom; z += ds) { const yy = Math.round(y(z)) + 0.5; ctx.beginPath(); ctx.moveTo(x0, yy); ctx.lineTo(x0 + trackW, yy); ctx.stroke(); }
      // header
      const col = COLORS[c.family] || '#00796b';
      ctx.fillStyle = col; ctx.textAlign = 'center'; ctx.font = '600 12px "Be Vietnam Pro", sans-serif';
      ctx.fillText(c.mnemonic, x0 + trackW / 2, 14); ctx.font = '11px "Be Vietnam Pro", sans-serif';
      ctx.fillStyle = '#7b8794'; ctx.fillText(c.unit || '', x0 + trackW / 2, 29);
      ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x0 + 6, 40); ctx.lineTo(x0 + trackW - 6, 40); ctx.stroke(); ctx.lineWidth = 1;
      ctx.fillStyle = '#52606d'; ctx.textAlign = 'left'; ctx.fillText(fmt(lo, Math.abs(lo) < 10 ? 2 : 0), x0 + 5, 51); ctx.textAlign = 'right'; ctx.fillText(fmt(hi, Math.abs(hi) < 10 ? 2 : 0), x0 + trackW - 5, 51);
      ctx.strokeStyle = '#c5ced8'; ctx.strokeRect(Math.round(x0) + 0.5, 0.5, trackW - 1, headH - 1);
      // curve
      ctx.save(); ctx.beginPath(); ctx.rect(x0 + 1, headH, trackW - 2, plotH); ctx.clip();
      ctx.strokeStyle = col; ctx.lineWidth = 1.2; if (c.family === 'Neutron Porosity') ctx.setLineDash([5, 3]);
      ctx.beginPath(); let pen = false;
      for (let i = i0; i <= i1; i += stride) {
        const z = dep[i], val = c.data[i];
        if (z === null || val === null || !isFinite(val)) { pen = false; continue; }
        const px = fx(val), py = y(z);
        if (pen) ctx.lineTo(px, py); else { ctx.moveTo(px, py); pen = true; }
      }
      ctx.stroke(); ctx.restore(); ctx.setLineDash([]);
    });
    ctx.strokeStyle = '#c5ced8'; ctx.strokeRect(0.5, 0.5, depthW - 1, headH - 1);
  }
  function hoverLog(w, e) {
    const ov = $('#lgOver'); const g = ov._geo; if (!g) return;
    const ctx = ov.getContext('2d'); const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, ov.width, ov.height);
    if (e.offsetY < g.headH) { $('#lgRead').textContent = ''; return; }
    const z = g.top + (e.offsetY - g.headH) / g.plotH * (g.bottom - g.top);
    ctx.strokeStyle = 'rgba(239,83,80,.8)'; ctx.beginPath(); ctx.moveTo(0, e.offsetY + 0.5); ctx.lineTo(ov.width, e.offsetY + 0.5); ctx.stroke();
    const dep = w.curves[0].data; let lo = 0, hi = dep.length - 1;
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if ((dep[mid] === null ? -Infinity : dep[mid]) < z) lo = mid; else hi = mid; }
    const i = dep[hi] !== null && Math.abs(dep[hi] - z) < Math.abs((dep[lo] === null ? Infinity : dep[lo]) - z) ? hi : lo;
    $('#lgRead').textContent = `MD ${fmt(dep[i], 1)} m · ` + g.tracks.map((c) => `${c.mnemonic} ${c.data[i] === null ? '–' : fmt(c.data[i], Math.abs(c.data[i]) < 10 ? 3 : 1)}`).join(' · ');
  }
  window.addEventListener('resize', () => { if (S.active.startsWith('log:')) { const w = wellBy(S.active.slice(4)); if (w) drawLog(w); } });

  /* ================= dialogs ================= */
  function dialog(title, body, buttons, collect) {
    return new Promise((res) => {
      $('#mTitle').textContent = title; $('#mBody').innerHTML = body;
      $('#mFoot').innerHTML = buttons.map((b, i) => `<button class="btn ${b.primary ? '' : 'ghost'}" data-bi="${i}">${b.label}</button>`).join('');
      $('#modal').hidden = false;
      const first = $('#mBody input'); if (first) { first.focus(); first.select(); }
      const done = (val) => { $('#modal').hidden = true; $('#mFoot').onclick = null; $('#mX').onclick = null; $('#mBody').onkeydown = null; res(val); };
      $('#mFoot').onclick = (e) => { const b = e.target.closest('[data-bi]'); if (!b) return; const bt = buttons[+b.dataset.bi]; done(bt.value === undefined ? null : (bt.collect && collect ? collect() : bt.value)); };
      $('#mX').onclick = () => done(null);
      $('#mBody').onkeydown = (e) => { if (e.key === 'Enter' && e.target.tagName === 'INPUT') { const p = buttons.find((b) => b.primary); if (p) done(p.collect && collect ? collect() : p.value); } };
      $('#mBody').onclick = (e) => { const o = e.target.closest('[data-pick]'); if (o) done({ pick: o.dataset.pick, act: o.dataset.a }); };
    });
  }
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('#modal').hidden) $('#mX').click(); });

  /* ================= actions ================= */
  const ACT = {
    async newProject() {
      const name = await dialog(t('dlg.newProject'), `<label>${t('dlg.projName')}<input id="dlgName" value="${S.lang === 'vi' ? 'Dự án' : 'Project'} ${new Date().toLocaleDateString(loc())}"></label>`,
        [{ label: t('dlg.cancel') }, { label: t('dlg.create'), primary: true, value: true, collect: true }], () => $('#dlgName').value.trim());
      if (!name) return;
      if (S.project) await Store.put(S.project);
      const p = makeProject(name); await Store.put(p);
      log(t('msg.created', { n: name }), 'ok');
      openProject(p);
    },
    async openProject() {
      const list = (await Store.all()).sort((x, y) => y.updated - x.updated);
      const body = list.length ? `<div class="plist">${list.map((p) => `<div class="item"><div><b>${esc(p.name)}</b><small>${p.wells.length} ${t('dlg.wells')} · ${new Date(p.updated).toLocaleString(loc())}</small></div><button class="btn" data-pick="${p.id}" data-a="open">${t('dlg.open')}</button><button class="btn ghost" data-pick="${p.id}" data-a="del" style="color:var(--poor)">${t('dlg.delete')}</button></div>`).join('')}</div>` : `<p class="muted">${t('start.none')}</p>`;
      const r = await dialog(t('dlg.openProject'), body, [{ label: t('dlg.close') }]);
      if (!r) return;
      const p = list.find((x) => x.id === r.pick);
      if (r.act === 'open') { if (S.project) await Store.put(S.project); openProject(await Store.get(p.id)); }
      if (r.act === 'del') {
        const ok = await dialog(t('dlg.delete'), `<p>${esc(t('dlg.confirmDel', { n: p.name }))}</p>`, [{ label: t('dlg.cancel') }, { label: t('dlg.delete'), primary: true, value: true }]);
        if (ok) { await Store.del(p.id); log(t('msg.deleted', { n: p.name })); if (S.project && S.project.id === p.id) { S.project = null; closeProject(); } else if (S.active === 'start') renderDoc(); }
        ACT.openProject();
      }
    },
    closeProject,
    saveFile() { download(safeName(S.project.name) + '.awproj.json', JSON.stringify(S.project), 'application/json'); },
    openFile() { $('#fileProj').click(); },
    async newWell() {
      const nm = await dialog(t('dlg.newWell'), `<label>${t('f.name')}<input id="dlgName" value="W-${S.project.wells.length + 1}"></label>`, [{ label: t('dlg.cancel') }, { label: t('dlg.create'), primary: true, value: true, collect: true }], () => $('#dlgName').value.trim());
      if (!nm) return;
      const w = newWellObj({ id: nm, name: nm });
      S.project.wells.push(w); S.sel = { t: 'well', uid: w.uid };
      touch(); renderAll();
      if (S.panes.paneProps) { const f = $('#props input[data-k="depth_m"]'); if (f) f.focus(); }
    },
    importLas() { $('#fileLas').click(); },
    importCsv() { $('#fileCsv').click(); },
    exportLas() { const w = selWell(); download(safeName(wellLabel(w)) + '.las', L.writeLAS(w)); },
    exportCsv() { download(safeName(S.project.name) + '_wells.csv', toCSV(S.project.wells, WELL_COLS), 'text/csv'); },
    async nullValue() {
      const w = selWell();
      const v = await dialog(t('dlg.null'), `<p class="muted">${t('dlg.nullText')}</p><label>${t('dlg.nullVal')}<input id="dlgNull" type="number" step="any" value="${isFinite(w.nullValue) ? w.nullValue : -999.25}"></label>`, [{ label: t('dlg.cancel') }, { label: t('dlg.ok'), primary: true, value: true, collect: true }], () => parseFloat($('#dlgNull').value));
      if (v === null || !isFinite(v)) return;
      let k = 0;
      w.curves.forEach((c) => { c.data = c.data.map((x) => { if (x !== null && Math.abs(x - v) < 1e-6) { k++; return null; } return x; }); });
      w.nullValue = v; deriveThermal(w, null);
      log(t('msg.null', { v, k: fmt(k) }), 'ok');
      touch(); renderAll();
    },
    async delete() {
      const s = S.sel; const w = wellBy(s.uid); if (!w) return;
      const label = s.t === 'curve' ? `${wellLabel(w)} / ${w.curves[s.ci].mnemonic}` : wellLabel(w);
      const ok = await dialog(t('dlg.delete'), `<p>${esc(t('dlg.confirmDelItem', { n: label }))}</p>`, [{ label: t('dlg.cancel') }, { label: t('dlg.delete'), primary: true, value: true }]);
      if (!ok) return;
      if (s.t === 'curve') { if (s.ci === 0) w.curves = []; else w.curves.splice(s.ci, 1); S.sel = { t: 'well', uid: w.uid }; delete S.logView[w.uid]; }
      else { S.project.wells = S.project.wells.filter((x) => x !== w); S.sel = { t: 'project' }; }
      log(t('msg.deleted', { n: label }));
      touch(); renderAll();
    },
    browser() { togglePane('paneBrowser'); }, props() { togglePane('paneProps'); }, output() { togglePane('paneOutput'); },
    params() { S.sel = { t: 'project' }; if (!S.panes.paneProps) togglePane('paneProps'); renderTree(); renderProps(); renderRibbon(); },
    run() {
      S.result = null; const r = screen(); const P = modelParams();
      log(t('msg.run', { n: r.ranked.length, p: r.ranked.filter((w) => w.score >= P.threshold).length, t: P.threshold }), 'ok');
      if (S.active === 'rank') renderDoc(); else openDoc('rank');
    },
    report() { openDoc('rep:' + selWell().uid); },
    sens() { openDoc('sens'); },
    exportRank() {
      const r = screen();
      const rows = r.ranked.map((w, i) => ({ rank: i + 1, id: w.id, name: w.name, location: w.location, depth_m: w.depth, gradient_c100m: w.G.toFixed(2), g_source: srcOf(w), t_bottom_c: w.Tbottom.toFixed(1), t_out_c: w.Tout.toFixed(1), q_kw: w.Q.toFixed(0), q_p10_kw: w.mc.p10.toFixed(0), q_p90_kw: w.mc.p90.toFixed(0), integrity: w.integrity, distance_km: w.distance, capex_bn_vnd: w.eco.capex.toFixed(2), npv_bn_vnd: w.eco.npv.toFixed(2), lcoh_vnd_kwh: w.eco.lcoh.toFixed(0), suggested_use: t(w.use), score: w.score }));
      download(safeName(S.project.name) + '_ranking.csv', toCSV(rows, Object.keys(rows[0] || { rank: 1 })), 'text/csv');
    },
    logPlot() { openDoc('log:' + selWell().uid); },
    about() { dialog(t('about.title'), t('about.body'), [{ label: t('dlg.close'), primary: true }]); },
    async lasHelp() {
      const r = await dialog(t('help.title'), t('help.body'), [{ label: t('help.csvTpl'), value: 'tpl' }, { label: t('b.sample'), value: 'las' }, { label: t('dlg.close'), primary: true }]);
      if (r === 'tpl') download('abandonedwell_template.csv', toCSV(DEMO_WELLS, WELL_COLS), 'text/csv');
      if (r === 'las') ACT.sample();
    },
    sample() {
      const w = newWellObj({ id: 'SAMPLE-1', name: 'SAMPLE-1', field: 'DEMO', bht_c: 118, curves: L.synthLogs(500, 3000, 0.5, 3.3, 99), nullValue: -999.25 });
      download('sample_SAMPLE-1.las', L.writeLAS(w));
    },
    async demo() {
      if (S.project) await Store.put(S.project);
      const p = demoProject(); await Store.put(p);
      openProject(p);
    },
    toggleTree() { const P = S.project; if (!P) return; const anyOpen = P.wells.some((w) => !S.collapsed['w' + w.uid]); P.wells.forEach((w) => { S.collapsed['w' + w.uid] = anyOpen; }); renderTree(); },
    focusProps() { if (!S.panes.paneProps) togglePane('paneProps'); const f = $('#props input, #props select'); if (f) f.focus(); },
    search() { const el = $('#treeSearch'); el.hidden = !el.hidden; if (!el.hidden) el.focus(); },
    clearFilter() { S.fam = ''; S.search = ''; $('#treeSearch').value = ''; $('#treeSearch').hidden = true; renderTree(); },
    clearLog() { S.logs = []; renderOutput(); },
  };
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]'); if (!b || b.disabled) return;
    const a = b.dataset.act;
    if (!S.project && !['newProject', 'openProject', 'openFile', 'about', 'lasHelp', 'sample', 'demo', 'browser', 'props', 'output', 'clearLog', 'search', 'clearFilter', 'toggleTree'].includes(a)) return;
    if (ACT[a]) Promise.resolve(ACT[a]()).catch((err) => log(String(err && err.message || err), 'err'));
  });
  $('#ribbonTabs').addEventListener('click', (e) => { const b = e.target.closest('[data-tab]'); if (b) { S.tab = b.dataset.tab; renderRibbon(); } });

  $('#fileLas').onchange = async (e) => { const fs = Array.from(e.target.files); e.target.value = ''; if (fs.length && S.project) await importLasFiles(fs); };
  $('#fileCsv').onchange = async (e) => {
    const f = e.target.files[0]; e.target.value = ''; if (!f || !S.project) return;
    try {
      const rows = parseCSV(await f.text());
      rows.forEach((r) => S.project.wells.push(newWellObj(r)));
      log(t('msg.csvOk', { n: rows.length, f: f.name }), 'ok');
      touch(); renderAll(); openDoc('rank');
    } catch (err) { log(t('msg.csvErr', { f: f.name }), 'err'); }
  };
  $('#fileProj').onchange = async (e) => {
    const f = e.target.files[0]; e.target.value = ''; if (!f) return;
    try {
      const p = JSON.parse(await f.text());
      if (!p || !Array.isArray(p.wells)) throw new Error('format');
      p.id = p.id || makeProject('x').id; p.name = p.name || f.name; p.created = p.created || Date.now(); p.updated = Date.now();
      p.wells.forEach((w) => { w.uid = w.uid || uid(); w.curves = w.curves || []; });
      if (S.project) await Store.put(S.project);
      await Store.put(p);
      log(t('msg.importProj', { f: f.name }), 'ok');
      openProject(p);
    } catch (err) { log(t('msg.lasErr', { f: f.name, e: err.message }), 'err'); }
  };

  /* ================= panes & splitters ================= */
  function togglePane(id) { S.panes[id] = !S.panes[id]; applyPanes(); renderRibbon(); }
  function applyPanes() {
    Object.entries(S.panes).forEach(([id, on]) => { $('#' + id).hidden = !on; });
    $$('.hsplit').forEach((h) => { h.hidden = !S.panes[h.dataset.split]; });
    const any = Object.values(S.panes).some(Boolean);
    $('#side').hidden = !any; $('#vsplit').hidden = !any;
    if (S.active.startsWith('log:')) setTimeout(() => { const w = wellBy(S.active.slice(4)); if (w) drawLog(w); }, 0);
  }
  $$('[data-close]').forEach((b) => b.addEventListener('click', () => togglePane(b.dataset.close)));
  (function splitters() {
    let drag = null;
    $('#vsplit').addEventListener('pointerdown', (e) => { drag = { t: 'v' }; e.target.setPointerCapture(e.pointerId); });
    $$('.hsplit').forEach((h) => h.addEventListener('pointerdown', (e) => { const p = $('#' + h.dataset.split); drag = { t: 'h', p, y0: e.clientY, h0: p.getBoundingClientRect().height }; h.setPointerCapture(e.pointerId); }));
    document.addEventListener('pointermove', (e) => {
      if (!drag) return;
      if (drag.t === 'v') document.documentElement.style.setProperty('--side-w', Math.min(800, Math.max(260, e.clientX)) + 'px');
      else drag.p.style.flex = `0 0 ${Math.max(70, drag.h0 + e.clientY - drag.y0)}px`;
    });
    document.addEventListener('pointerup', () => { if (drag) { drag = null; if (S.active.startsWith('log:')) { const w = wellBy(S.active.slice(4)); if (w) drawLog(w); } } });
  })();

  /* ================= i18n + render all ================= */
  function applyStatic() {
    document.documentElement.lang = S.lang;
    $$('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
    $$('[data-icon]').forEach((el) => { el.innerHTML = ICON[el.dataset.icon] || ''; });
    $$('[data-tip]').forEach((el) => { el.title = el.dataset.tip ? t(el.dataset.tip) : ''; });
    $('#treeSearch').placeholder = t('search');
    $('#logSearch').placeholder = t('searchMsg');
    $$('.lang button').forEach((b) => b.classList.toggle('on', b.dataset.lang === S.lang));
  }
  function renderAll() { applyStatic(); renderRibbon(); renderTree(); renderProps(); renderDocTabs(); renderDoc(); renderOutput(); }
  $$('.lang button').forEach((b) => b.addEventListener('click', () => { S.lang = b.dataset.lang; lsSet('aw-lang', S.lang); renderAll(); }));
  $('#logSearch').addEventListener('input', renderOutput);
  window.addEventListener('beforeunload', () => { if (S.project) Store.put(S.project); });

  /* ================= init ================= */
  (async function init() {
    await Store.open();
    if (!Store.db) log(t('msg.storage'), 'warn');
    log(t('msg.ready'));
    const last = lsGet('aw-last');
    if (last) { const p = await Store.get(last); if (p) { openProject(p); return; } }
    renderAll();
  })();
})();
