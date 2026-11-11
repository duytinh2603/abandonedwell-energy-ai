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
    // utilisation optimiser
    u_Tamb: 30, u_approach: 10, u_Tdry: 60, u_elec: 2204, u_heatHigh: 2204, u_heatLow: 735,
    u_capexORC: 100, u_capexHX: 2, u_capexOpen: 30, u_whLoss: 5, u_Rf: 10, u_Treinj: 40,
    u_elecOff: 2204, u_pinch: 5, u_dpMax: 20, u_RfSwept: 0,
    // hydraulics & extra economics
    pumpAuto: 1, csgID: 157, tubOD: 89, tubID: 76, paCost: 0, paYears: 10, co2Factor: 0.2, co2Price: 0,
    // technology comparison (AGS, EGS, CO2-EGS/CPG)
    t_latN: 2, t_latL: 2000, t_capexLat: 30, t_egsFlow: 30, t_egsV: 0.2, t_egsRf: 20, t_egsImp: 0.15, t_capexStim: 60, t_capexWellM: 0.08, t_co2Gain: 1.5, t_co2Loss: 5, t_capexCPG: 40, t_heatDemOff: 1000, t_heatDemOn: 5000, t_elecDem: 5000,
  };
  const APP_VERSION = 'v0.6.0'; const APP_DATE = '11/11/2026';
  const ELEC_PRICE = 2204;
  const PURPOSE_PRICE = { res: 2204, hp: Math.round(2204 / 3) };
  const WELL_COLS = ['id', 'name', 'location', 'depth_m', 'md_m', 'gradient_c100m', 'bht_c', 'bht1_c', 'dt1_h', 'bht2_c', 'dt2_h', 'tc_h', 'integrity', 'distance_km'];

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
  ICON.optimize = svg(`<circle cx="17" cy="20" r="11" fill="#e3f0fc" stroke="${B}" stroke-width="2"/><path d="M17 20 17 10M17 20l8.7 5M17 20l-8.7 5" stroke="${B}" stroke-width="2.4" stroke-linecap="round"/><circle cx="17" cy="20" r="2.6" fill="${R}"/><path d="M29 8l6-3v8z" fill="${R}"/><path d="M30 30h6M33 27v6" stroke="#2e7d32" stroke-width="2.4"/>`);
  ICON.guide = svg(`<path d="M6 8c5-2 10-2 14 1v24c-4-3-9-3-14-1z" fill="#e3f0fc" stroke="${B}" stroke-width="2" stroke-linejoin="round"/><path d="M34 8c-5-2-10-2-14 1v24c4-3 9-3 14-1z" fill="#fff" stroke="${B}" stroke-width="2" stroke-linejoin="round"/><path d="M24 15h6M24 20h6M24 25h4" stroke="${R}" stroke-width="2"/>`);
  ICON.ml = svg(`<circle cx="9" cy="12" r="3.2" fill="#fff" stroke="${B}" stroke-width="1.8"/><circle cx="9" cy="28" r="3.2" fill="#fff" stroke="${B}" stroke-width="1.8"/><circle cx="20" cy="9" r="3.2" fill="#fff" stroke="${B}" stroke-width="1.8"/><circle cx="20" cy="20" r="3.2" fill="#fff" stroke="${B}" stroke-width="1.8"/><circle cx="20" cy="31" r="3.2" fill="#fff" stroke="${B}" stroke-width="1.8"/><circle cx="32" cy="20" r="4" fill="${R}"/><path d="M12 12l5-2M12 12l5 7M12 28l5-7M12 28l5 3M23 9l6 9M23 20h5M23 31l6-9" stroke="${G}" stroke-width="1.3"/>`);
  ICON.undo = svg(`<path d="M12 14H25a8 8 0 0 1 0 16H14" fill="none" stroke="${B}" stroke-width="2.6" stroke-linecap="round"/><path d="M17 8l-6 6 6 6" fill="none" stroke="${R}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>`);
  ICON.importSurvey = svg(`<path d="M10 4v12c0 8 6 12 16 16" fill="none" stroke="${B}" stroke-width="2.4"/><circle cx="10" cy="10" r="2" fill="${R}"/><circle cx="12" cy="20" r="2" fill="${R}"/><circle cx="19" cy="28" r="2" fill="${R}"/><circle cx="26" cy="32" r="2" fill="${R}"/><path d="M28 8h8M32 4v8" stroke="#2e7d32" stroke-width="2.2"/>`);
  ICON.importDst = svg(badge('DST', '#2e7d32') + `<path d="M13 31h14m-3-3 3 3-3 3" stroke="#2e7d32" stroke-width="1.6"/>`);
  ICON.volve = svg(`<path d="M6 30h28" stroke="${B}" stroke-width="2"/><path d="M4 34c4-2 8 2 12 0s8 2 12 0 6 1 8 0" stroke="#4fc3f7" stroke-width="2"/><rect x="12" y="14" width="16" height="10" fill="#e3f0fc" stroke="${B}" stroke-width="2"/><path d="M14 24v6M26 24v6M20 4v10M16 8h8" stroke="${B}" stroke-width="2"/><circle cx="31" cy="11" r="6" fill="#2e7d32"/><path d="M28.5 11l2 2 3.5-4" stroke="#fff" stroke-width="1.8" fill="none"/>`);
  ICON.volveData = svg(`<rect x="5" y="6" width="30" height="28" fill="#fff" stroke="${B}" stroke-width="2"/><path d="M9 28l6-8 5 4 6-10 5 6" stroke="#ef6c00" stroke-width="2" fill="none"/><path d="M5 12h30" stroke="${B}" stroke-width="2"/><circle cx="29" cy="29" r="6" fill="#2e7d32"/><path d="M26.5 29l2 2 3.5-4" stroke="#fff" stroke-width="1.8" fill="none"/>`);
  ICON.tech = svg(`<rect x="4" y="22" width="6" height="12" fill="#90caf9"/><rect x="12" y="15" width="6" height="19" fill="#66bb6a"/><rect x="20" y="9" width="6" height="25" fill="#ef6c00"/><rect x="28" y="18" width="6" height="16" fill="#ab47bc"/><path d="M3 34h33" stroke="${B}" stroke-width="2"/><path d="M6 8h6M9 5v6" stroke="${R}" stroke-width="2"/>`);
  ICON.syncFile = svg(`<path d="M8 22a12 12 0 0 1 21-8" fill="none" stroke="${B}" stroke-width="2.6" stroke-linecap="round"/><path d="M30 8v7h-7" fill="none" stroke="${B}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M32 18a12 12 0 0 1-21 8" fill="none" stroke="#2e7d32" stroke-width="2.6" stroke-linecap="round"/><path d="M10 32v-7h7" fill="none" stroke="#2e7d32" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>`);
  ICON.optAll = svg(`<rect x="5" y="6" width="30" height="28" fill="#fff" stroke="${B}" stroke-width="2"/><path d="M5 13h30M5 20h30M5 27h30" stroke="${G}" stroke-width="1.4"/><path d="M14 6v28" stroke="${G}" stroke-width="1.4"/><circle cx="25" cy="16.5" r="2.6" fill="#2e7d32"/><circle cx="21" cy="23.5" r="2.6" fill="${R}"/><circle cx="29" cy="30.5" r="2.6" fill="#ef6c00"/>`);

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
  const fmt = (x, d = 0) => {
    if (x === null || x === undefined || !isFinite(x)) return '–';
    const v = Math.abs(x) < 0.5 * Math.pow(10, -d) ? 0 : Number(x); // avoid "-0"
    return v.toLocaleString(loc(), { minimumFractionDigits: d, maximumFractionDigits: d });
  };
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
    if (w.gSource === 'given' && well && ['dst', 'lwd', 'field', 'log', 'ml'].includes(well.gSource)) return well.gSource;
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
  /* undo: lightweight snapshots (curve objects are shared and never mutated in place) */
  S.undo = [];
  function snapshot() {
    if (!S.project) return;
    const p = S.project;
    S.undo.push({ json: JSON.stringify(Object.assign({}, p, { wells: p.wells.map((w) => Object.assign({}, w, { curves: undefined })) })), curves: new Map(p.wells.map((w) => [w.uid, w.curves])) });
    if (S.undo.length > 30) S.undo.shift();
  }
  function touch(opts = {}) {
    if (!S.project) return;
    S.project.updated = Date.now();
    if (opts.data !== false) { S.result = null; scheduleDocRefresh(); }
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => Store.put(S.project).then(() => { syncPush(); if (chan && S.project) chan.postMessage({ id: S.project.id, updated: S.project.updated }); }).catch((e) => log(String(e), 'err')), 400);
  }
  let docTimer = null;
  function scheduleDocRefresh() {
    clearTimeout(docTimer);
    docTimer = setTimeout(() => { const a = S.active; if (a === 'rank' || a === 'sens' || a === 'optall' || a === 'tech' || a.startsWith('rep:') || a.startsWith('opt:')) renderDoc(); }, 300);
  }

  /* ================= project ops ================= */
  function makeProject(name) {
    const now = Date.now();
    return { id: 'p' + now.toString(36) + uid().slice(0, 4), name, created: now, updated: now, params: Object.assign({}, DEFAULTS), wells: [] };
  }
  function openProject(p, msgKey = 'msg.opened', opts = {}) {
    S.project = p; S.sel = { t: 'project' }; S.result = null; S.collapsed = {}; S.logView = {};
    p.params = Object.assign({}, DEFAULTS, p.params || {});
    S.docs = p.wells.length ? ['rank'] : ['start'];
    S.active = S.docs[0];
    lsSet('aw-last', p.id);
    log(t(msgKey, { n: p.name, w: p.wells.length }), 'ok');
    if (!p.wells.length) log(t('proj.empty'), 'warn');
    renderAll();
    if (!p.wells.length && /volve/i.test(p.name || '')) { log(t('msg.volveAuto'), 'ok'); setTimeout(() => ACT.volveAdd(), 0); }
    if (!opts.noSync) syncAttach(p);
    if (p.source === 'volve' && p.wells.length) setTimeout(() => volveRefresh(p), 0);
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
      // only fill depth when the well has none: a TD entered from reports (often TVD) must not be replaced by the log bottom (MD)
      if (isFinite(st.max) && !(w.depth_m > 0)) w.depth_m = Math.round(st.max * 10) / 10;
      const tc = w.curves.find((c) => c.family === 'Temperature');
      if (tc) {
        const g = L.gradientFromLog(dc.data, tc.data, tc.unit);
        if (g && (w.gSource === 'dst' || w.gSource === 'lwd' || w.gSource === 'field')) {
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
    if (parsed && parsed.params && w.gSource !== 'dst' && w.gSource !== 'lwd') {
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
    { id: 'A-01', name: 'Giếng A-01', location: 'offshore', depth_m: 4200, gradient_c100m: 3.4, integrity: 'good', distance_km: 0.5, logs: [1000, 4200, 3.4, 11], gSource: 'dst', tempPoints: [{ z: 2650, T: 117, src: 'DST (giả lập)' }, { z: 3300, T: 139, src: 'DST (giả lập)' }, { z: 3950, T: 161, src: 'DST (giả lập)' }] },
    { id: 'A-07', name: 'Giếng A-07', location: 'offshore', depth_m: 3800, gradient_c100m: 3.6, integrity: 'good', distance_km: 1 },
    { id: 'B-03', name: 'Giếng B-03', location: 'onshore', depth_m: 3500, gradient_c100m: 3.1, integrity: 'fair', distance_km: 3, res_A: 2, res_h: 25, res_phi: 15, res_z: 3300, res_flow: 10 },
    { id: 'B-11', name: 'Giếng B-11', location: 'onshore', depth_m: 3000, gradient_c100m: 3.3, integrity: 'good', distance_km: 2, logs: [800, 3000, 3.3, 23], gSource: 'dst', tempPoints: [{ z: 2100, T: 96, src: 'DST (giả lập)' }, { z: 2850, T: 121, src: 'DST (giả lập)' }] },
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

  /* ================= automatic sync: linked project file, other tabs, app version ================= */
  const SYNC = { handle: null, state: 'off', name: '', timer: null };
  const chan = 'BroadcastChannel' in window ? new BroadcastChannel('aw-projects') : null;
  const canSync = () => !!(window.AWSync && window.AWSync.supported());
  /** Swap in a newer copy of the open project without closing the user's tabs. */
  function replaceProject(q) {
    const docs = S.docs, active = S.active;
    q.params = Object.assign({}, DEFAULTS, q.params || {});
    S.project = q; S.result = null; S.docs = docs; S.active = active;
    if (S.sel && S.sel.uid && !wellBy(S.sel.uid)) S.sel = { t: 'project' };
    renderAll();
  }
  async function syncAttach(p) {
    SYNC.handle = null; SYNC.state = 'off'; SYNC.name = '';
    if (!canSync()) return;
    const h = await AWSync.getHandle(p.id);
    if (!h || !S.project || S.project.id !== p.id) { renderRibbon(); return; }
    SYNC.handle = h; SYNC.name = h.name;
    SYNC.state = (await AWSync.permission(h, false)) === 'granted' ? 'on' : 'need';
    if (SYNC.state === 'on') await syncPull(); else log(t('sync.needPerm', { f: h.name }), 'warn');
    renderRibbon();
  }
  /** Load the linked file when it is newer than the copy in this browser; write it when ours is newer. */
  async function syncPull() {
    if (!SYNC.handle || SYNC.state !== 'on' || !S.project) return;
    try {
      const f = await AWSync.read(SYNC.handle); let q = null;
      try { q = JSON.parse(f.text); } catch (e) { q = null; }
      if (!q || !Array.isArray(q.wells)) { await syncPush(true); return; }
      const fileT = +q.updated || f.lastModified, mine = +S.project.updated || 0;
      if (fileT > mine + 1000) {
        q.id = S.project.id; q.updated = fileT;
        q.wells.forEach((w) => { w.uid = w.uid || uid(); w.curves = w.curves || []; });
        await Store.put(q); replaceProject(q);
        log(t('sync.pulled', { f: f.name, d: new Date(fileT).toLocaleString(loc()) }), 'ok');
      } else if (mine > fileT + 1000) await syncPush(true);
    } catch (e) { SYNC.state = 'err'; log(t('sync.err', { e: e.message }), 'err'); renderRibbon(); }
  }
  async function syncPush(now) {
    if (!SYNC.handle || SYNC.state !== 'on' || !S.project) return;
    clearTimeout(SYNC.timer);
    const go = async () => { try { await AWSync.write(SYNC.handle, JSON.stringify(S.project)); } catch (e) { SYNC.state = 'err'; log(t('sync.err', { e: e.message }), 'err'); renderRibbon(); } };
    if (now) return go();
    SYNC.timer = setTimeout(go, 1500);
  }
  if (chan) chan.onmessage = async (e) => {
    const d = e.data || {};
    if (S.project && d.id === S.project.id && d.updated > (S.project.updated || 0)) { const q = await Store.get(d.id); if (q) { replaceProject(q); log(t('sync.tab')); } }
  };
  /** New web version on the server → save, refresh the offline cache and reload once. */
  async function checkVersion() {
    try {
      const r = await fetch('version.json?t=' + Date.now(), { cache: 'no-store' }); if (!r.ok) return;
      const v = await r.json();
      if (!v.version || v.version === APP_VERSION) return;
      if (S.project) { await Store.put(S.project); await syncPush(true); }
      let tried = null; try { tried = sessionStorage.getItem('aw-upd'); } catch (e) { /* ignore */ }
      if (tried === v.version) { log(t('upd.manual', { v: v.version }), 'warn'); return; }
      try { sessionStorage.setItem('aw-upd', v.version); } catch (e) { /* ignore */ }
      log(t('upd.found', { v: v.version }), 'ok');
      try { const reg = navigator.serviceWorker && await navigator.serviceWorker.getRegistration(); if (reg) await reg.update(); } catch (e) { /* ignore */ }
      try { if (window.caches) for (const k of await caches.keys()) await caches.delete(k); } catch (e) { /* ignore */ }
      setTimeout(() => location.reload(), 300);
    } catch (e) { /* offline: keep running */ }
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { syncPull(); checkVersion(); } });
  window.addEventListener('focus', () => syncPull());
  setInterval(checkVersion, 5 * 60 * 1000);

  /* ================= Volve (Equinor open data) ================= */
  let VOLVE = null;
  async function loadVolve() {
    if (VOLVE) return VOLVE;
    const r = await fetch('data/volve.json', { cache: 'no-cache' });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    VOLVE = await r.json();
    return VOLVE;
  }
  const VOLVE_PARAMS = { T0: 6, Tin: 25, u_Tamb: 10, purpose: 'res', capexOff: 25 };
  /** Rebuild the wells of a Volve project when data/volve.json has a newer version (parameters are kept). */
  async function volveRefresh(p) {
    let D; try { D = await loadVolve(); } catch (e) { return; }
    if (!D.version || p.dataVersion === D.version || !S.project || S.project.id !== p.id) return;
    const fresh = volveProject(D);
    S.project.wells = fresh.wells; S.project.dataVersion = D.version; S.project.source = 'volve';
    touch(); renderAll();
    log(t('volve.updated', { v: D.version, n: fresh.wells.length }), 'ok');
  }
  /** Wells usable for screening: TVD at TD is known. */
  const volveUsable = (vw) => vw.tdTVD > 0 && vw.tdMD > 0;
  function volveProject(D) {
    const p = makeProject(t('volve.projName'));
    Object.assign(p.params, VOLVE_PARAMS);
    p.source = 'volve'; p.dataVersion = D.version || '';
    const T0 = p.params.T0;
    const fieldPts = [];
    D.wells.filter(volveUsable).forEach((vw) => {
      const kb = vw.kb || 54.9;
      const w = newWellObj({
        id: vw.name, name: vw.name, field: 'Volve', location: 'offshore', integrity: 'fair', distance_km: 0,
        depth_m: Math.round(vw.tdTVD - kb), md_m: Math.round(vw.tdMD), lat: vw.lat, lon: vw.lon, kb,
        note: t('volve.wellNote', { src: vw.logSrc || '–' }),
      });
      if (vw.stations) { w.survey = vw.stations; w.surveyMD = Math.round(vw.tdMD); w.surveyTVD = Math.round(vw.tdTVD); }
      if (vw.temps.length) {
        w.tempPoints = vw.temps.map((q) => ({ z: Math.round(q.tvd - kb), T: q.t, src: `${q.how === 'pTEMP' ? 'LWD FPWD' : 'LWD FT'} · MD ${fmt(q.md)} m · ${q.file.split('/').pop()}` }));
        w.tempPoints.forEach((q) => fieldPts.push(q));
        const g = fitGradient(w.tempPoints, T0);
        w.gradient_c100m = Math.round(g.G * 1000) / 1000; w.gSource = 'lwd';
        w.gNote = t('volve.gNote', { n: w.tempPoints.length, rms: fmt(g.rms, 1) });
      }
      if (vw.logs && vw.logs.md.length) {
        const fam = { GR: ['Gamma Ray', 'gAPI', 'Gamma ray'], DT: ['Sonic', 'us/ft', 'Compressional slowness'], RHOB: ['Bulk Density', 'g/cm3', 'Bulk density'], NPHI: ['Neutron Porosity', 'v/v', 'Neutron porosity'], RT: ['Resistivity', 'ohm.m', 'Deep resistivity'] };
        w.curves = [{ mnemonic: 'DEPT', unit: 'm', desc: 'Measured depth (5 m median bins)', family: 'Depth', data: vw.logs.md.slice() }];
        Object.keys(fam).forEach((k) => { if (vw.logs[k]) w.curves.push({ mnemonic: k, unit: fam[k][1], desc: fam[k][2], family: fam[k][0], data: vw.logs[k].slice() }); });
        w.nullValue = -999.25; w.fileName = vw.logSrc.split('/').pop();
      }
      p.wells.push(w);
    });
    // wells with no temperature measurement get the field gradient (all LWD points, T0 fixed)
    if (fieldPts.length) {
      const g = fitGradient(fieldPts, T0);
      p.wells.filter((w) => !(w.tempPoints || []).length).forEach((w) => { w.gradient_c100m = Math.round(g.G * 1000) / 1000; w.gSource = 'field'; w.gNote = t('volve.gField', { n: fieldPts.length }); });
    }
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
      eco: { heatPrice: n('heatPrice'), capexOn: n('capexOn'), capexOff: n('capexOff'), pipeCost: n('pipe'), opexPct: n('opex'), pumpKW: n('pump'), hours: n('hours'), rate: n('rate'), life: Math.round(Math.min(50, Math.max(1, n('life')))), elecPrice: ELEC_PRICE,
        pumpAuto: n('pumpAuto') > 0, paCost: n('paCost'), paYears: n('paYears'), co2Factor: n('co2Factor'), co2Price: n('co2Price') },
      geom: { csgID: n('csgID'), tubOD: n('tubOD'), tubID: n('tubID') },
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
    home: [['g.project', ['newProject', 'openProject', 'closeProject', 'saveFile', 'openFile', 'syncFile', 'undo']], ['g.well', ['newWell', 'importLas', 'importCsv']], ['g.view', ['browser', 'props', 'output']]],
    data: [['g.import', ['importLas', 'importCsv', 'importSurvey', 'importDst']], ['g.export', ['exportLas', 'exportCsv']], ['g.tools', ['nullValue', 'delete']]],
    geo: [['g.eval', ['params', 'run', 'report', 'sens']], ['g.ai', ['ml']], ['g.util', ['optimize', 'optAll', 'tech']], ['g.export', ['exportRank']]],
    plot: [['g.plots', ['logPlot', 'report', 'sens']]],
    help: [['g.help', ['guide', 'about', 'lasHelp', 'sample', 'demo']], ['g.volve', ['volve', 'volveData']]],
  };
  const selWell = () => (S.sel && (S.sel.t === 'well' || S.sel.t === 'curve') ? wellBy(S.sel.uid) : null);
  function enabled(a) {
    if (['newProject', 'openProject', 'openFile', 'guide', 'about', 'lasHelp', 'sample', 'demo', 'volve', 'volveData', 'volveAdd', 'browser', 'props', 'output'].includes(a)) return true;
    if (!S.project) return false;
    if (['report', 'optimize', 'exportLas', 'nullValue', 'logPlot'].includes(a)) return !!selWell() && (a === 'report' || a === 'optimize' || selWell().curves.length > 0);
    if (a === 'optAll' || a === 'ml' || a === 'importDst') return S.project.wells.length > 0;
    if (a === 'importSurvey') return !!selWell();
    if (a === 'undo') return S.undo.length > 0;
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
    $('#projName').textContent = S.project ? S.project.name + (SYNC.state !== 'off' ? ' · ' + t('sync.st.' + SYNC.state, { f: SYNC.name }) : '') : '';
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
    ['pg.tech', [['m', 'p.m', 0.5], ['Tin', 'p.Tin', 1], ['years', 'p.years', 1], ['T0', 'p.T0', 1], ['k', 'p.k', 0.1], ['Rw', 'p.Rw', 0.01], ['upLoss', 'p.upLoss', 1], ['sigmaG', 'p.sigmaG', 0.05],
      ['pumpAuto', 'p.pumpAuto', 'yesno'], ['csgID', 'p.csgID', 1], ['tubOD', 'p.tubOD', 1], ['tubID', 'p.tubID', 1]]],
    ['pg.econ', [['purpose', 'p.purpose', 'purpose'], ['heatPrice', 'p.heatPrice', 10], ['capexOn', 'p.capexOn', 0.5], ['capexOff', 'p.capexOff', 0.5], ['pipe', 'p.pipe', 0.1], ['opex', 'p.opex', 0.5], ['pump', 'p.pump', 1], ['hours', 'p.hours', 100], ['rate', 'p.rate', 0.5], ['life', 'p.life', 1],
      ['paCost', 'p.paCost', 1], ['paYears', 'p.paYears', 1], ['co2Factor', 'p.co2Factor', 0.01], ['co2Price', 'p.co2Price', 10000]]],
    ['pg.score', [['w_thermal', 'p.wT', 0.05], ['w_integrity', 'p.wI', 0.05], ['w_distance', 'p.wD', 0.05], ['w_econ', 'p.wE', 0.05], ['threshold', 'p.threshold', 5]]],
    ['pg.util', [['u_Tamb', 'u.Tamb', 1], ['u_approach', 'u.approach', 1], ['u_Tdry', 'u.Tdry', 5], ['u_elec', 'u.elec', 50], ['u_heatHigh', 'u.heatHigh', 50], ['u_heatLow', 'u.heatLow', 50],
      ['u_capexORC', 'u.capexORC', 5], ['u_capexHX', 'u.capexHX', 0.5], ['u_capexOpen', 'u.capexOpen', 1], ['u_whLoss', 'u.whLoss', 1], ['u_Treinj', 'u.Treinj', 1], ['u_Rf', 'u.Rf', 1],
      ['u_RfSwept', 'u.RfSwept', 'yesno'], ['u_elecOff', 'u.elecOff', 50], ['u_pinch', 'u.pinch', 1], ['u_dpMax', 'u.dpMax', 1]]],
    ['pg.tech', [['t_latN', 'tp.latN', 1], ['t_latL', 'tp.latL', 100], ['t_capexLat', 'tp.capexLat', 1], ['t_egsFlow', 'tp.egsFlow', 5], ['t_egsV', 'tp.egsV', 0.05], ['t_egsRf', 'tp.egsRf', 5],
      ['t_egsImp', 'tp.egsImp', 0.01], ['t_capexStim', 'tp.capexStim', 5], ['t_capexWellM', 'tp.capexWellM', 0.01], ['t_co2Gain', 'tp.co2Gain', 0.1], ['t_co2Loss', 'tp.co2Loss', 1], ['t_capexCPG', 'tp.capexCPG', 5], ['t_heatDemOff', 'tp.heatDemOff', 100], ['t_heatDemOn', 'tp.heatDemOn', 100], ['t_elecDem', 'tp.elecDem', 100]]],
  ];
  const WELL_FIELDS = [
    ['pg.general', [['id', 'f.id', 'text'], ['name', 'f.name', 'text'], ['field', 'f.field', 'text'], ['location', 'f.location', 'location'], ['depth_m', 'f.depth', 1], ['md_m', 'f.md', 1]]],
    ['pg.thermal', [['gradient_c100m', 'f.g', 0.01], ['bht_c', 'f.bht', 0.1], ['bht1_c', 'f.bht1', 0.1], ['dt1_h', 'f.dt1', 0.5], ['bht2_c', 'f.bht2', 0.1], ['dt2_h', 'f.dt2', 0.5], ['tc_h', 'f.tc', 0.5]]],
    ['pg.status', [['integrity', 'f.integrity', 'integrity'], ['distance_km', 'f.dist', 0.5]]],
    ['pg.res', [['res_A', 'r2.A', 0.1], ['res_h', 'r2.h', 1], ['res_phi', 'r2.phi', 1], ['res_z', 'r2.z', 10], ['res_T', 'r2.T', 1], ['res_flow', 'r2.flow', 0.5], ['res_PI', 'r2.PI', 1], ['res_spacing', 'r2.spacing', 50], ['res_co2', 'r2.co2', 1]]],
    ['pg.coprod', [['cp_flow', 'cp.flow', 0.5], ['cp_T', 'cp.T', 1]]],
  ];
  const roRow = (k, v) => `<tr><td>${t(k)}</td><td><span class="ro" title="${esc(v)}">${esc(v)}</span></td></tr>`;
  const grpRow = (k) => `<tr class="grp"><td colspan="2">${t(k)}</td></tr>`;
  function inputFor(obj, key, kind) {
    const v = obj[key];
    if (kind === 'text') return `<input data-k="${key}" value="${esc(v)}">`;
    if (kind === 'location') return `<select data-k="${key}">${['onshore', 'offshore'].map((o) => `<option value="${o}"${v === o ? ' selected' : ''}>${t('loc.' + o)}</option>`).join('')}</select>`;
    if (kind === 'integrity') return `<select data-k="${key}">${['good', 'fair', 'poor'].map((o) => `<option value="${o}"${v === o ? ' selected' : ''}>${t('int.' + o)}</option>`).join('')}</select>`;
    if (kind === 'purpose') return `<select data-k="${key}">${[['hp', 'p.purpHP'], ['res', 'p.purpRes'], ['custom', 'p.purpCustom']].map(([o, l]) => `<option value="${o}"${v === o ? ' selected' : ''}>${t(l)}</option>`).join('')}</select>`;
    if (kind === 'yesno') return `<select data-k="${key}" data-num="1">${[[1, 'yes'], [0, 'no']].map(([o, l]) => `<option value="${o}"${+v === o ? ' selected' : ''}>${t('opt.' + l)}</option>`).join('')}</select>`;
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
        if (isFinite(w.lat) && w.lat !== null) h += roRow('f.coord', `${fmt(w.lat, 5)}°N, ${fmt(w.lon, 5)}°E${w.kb ? ` · KB ${fmt(w.kb, 1)} m` : ''}`);
        if (w.note) h += roRow('f.note', w.note);
        if (w.gNote) h += roRow('f.gNote', w.gNote);
        if (Array.isArray(w.survey) && w.survey.length) h += roRow('f.survey', `${w.survey.length} ${t('f.stations')} · TVD ${fmt(w.surveyTVD)} m / MD ${fmt(w.surveyMD)} m`);
        if (w.res_note) h += roRow('r2.note', w.res_note);
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
    if (e.target.dataset.num) numeric = true;
    snapshot();
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
    if (id === 'optall') return [ICON.optAll, t('doc.optall')];
    if (id === 'tech') return [ICON.tech, t('doc.tech')];
    if (id === 'guide') return [ICON.guide, t('b.guide')];
    if (id === 'volve') return [ICON.volveData, t('doc.volve')];
    if (id === 'ml') return [ICON.ml, t('doc.ml')];
    const [k, u] = id.split(':'); const w = wellBy(u);
    const ic = { log: ICON.docLog, rep: ICON.docRep, opt: ICON.optimize }[k];
    return [ic, `${t('doc.' + k)}: ${w ? wellLabel(w) : '?'}`];
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
    if (id === 'guide') return renderGuide(a);
    if (id === 'volve') return renderVolve(a);
    if (!S.project) { a.innerHTML = ''; return; }
    if (id === 'rank') return renderRank(a);
    if (id === 'sens') return renderSens(a);
    if (id.startsWith('rep:')) return renderReport(a, id.slice(4));
    if (id.startsWith('opt:')) return renderOpt(a, id.slice(4));
    if (id === 'optall') return renderOptAll(a);
    if (id === 'tech') return renderTech(a);
    if (id === 'ml') return renderML(a);
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
          <button class="big-act" data-act="volve">${ICON.volve}${t('start.volve')}</button>
          ${S.project && !S.project.wells.length ? `<button class="big-act" data-act="volveAdd">${ICON.volve}${t('volve.addTo', { p: esc(S.project.name) })}</button>` : ''}
        </div>
        <div class="recent"><h3>${t('start.recent')}</h3><div id="recentList"></div></div>
      </div>
      <ol class="steps"><li>${t('start.s1')}</li><li>${t('start.s2')}</li><li>${t('start.s3')}</li><li>${t('start.s4')}</li></ol>
      <p class="hint" style="margin-top:16px">${t('start.local')} · ${t('start.version')} ${APP_VERSION} · ${APP_DATE}</p></div>`;
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
      ${(() => { const bad = res.ranked.concat(res.invalid).filter((w) => w.warnings.includes('bhtIgnored') || w.warnings.includes('hornerIgnored')); return bad.length ? `<div class="warnbox">${esc(t('rank.bhtIgnored', { list: bad.map((w) => w.name || w.id || '?').join(', '), t0: fmt(modelParams().T0) }))}</div>` : ''; })()}
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
          <tr><td>${t('det.npvRange')}</td><td>${fmt(w.eco.range.p10, 1)} – ${fmt(w.eco.range.p90, 1)} ${bn} · ${t('det.probPos', { p: fmt(w.eco.range.probPos * 100) })}</td></tr>
          ${w.eco.deferral > 0 ? `<tr><td>${t('det.deferral')}</td><td>${fmt(w.eco.deferral, 1)} ${bn}</td></tr>` : ''}
          <tr><td>${t('det.pump')}</td><td>${fmt(w.pumpKW, 1)} kW${w.dpBar ? ` · ${fmt(w.dpBar, 1)} bar` : ''}</td></tr>
          ${w.md > w.depth + 1 ? `<tr><td>${t('det.mdtvd')}</td><td>${fmt(w.md)} / ${fmt(w.depth)} m</td></tr>` : ''}
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

  /* ---------- user guide ---------- */
  function renderGuide(a) {
    a.innerHTML = `<div class="doc guide"><div class="rep-head no-print" style="justify-content:flex-end"><button class="btn" id="btnPrint">${t('det.print')}</button></div>${window.GUIDE[S.lang] || window.GUIDE.vi}</div>`;
    $('#btnPrint').onclick = () => window.print();
    $$('.guide .toc a', a).forEach((l) => l.addEventListener('click', (e) => { e.preventDefault(); const el = a.querySelector(l.getAttribute('href')); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }));
  }

  /* ---------- utilisation optimiser ---------- */
  function utilParams() {
    const p = Object.assign({}, DEFAULTS, S.project ? S.project.params : {});
    const n = (k) => (isFinite(+p[k]) ? +p[k] : DEFAULTS[k]);
    return {
      Tamb: n('u_Tamb'), approach: n('u_approach'), Tdry: n('u_Tdry'), elecValue: n('u_elec'), heatHigh: n('u_heatHigh'), heatLow: n('u_heatLow'),
      capexORC: n('u_capexORC'), capexHX: n('u_capexHX'), capexOpen: n('u_capexOpen'), whLoss: n('u_whLoss'), Tret: n('Tin'),
      Treinj: n('u_Treinj'), Rf: n('u_Rf') / 100, elecOff: n('u_elecOff'), pinch: n('u_pinch'), dpMax: n('u_dpMax'), RfSwept: n('u_RfSwept') > 0,
    };
  }
  /** Reservoir inputs of a well (open loop), or null when the area/thickness/flow are not filled in. */
  function reservoirInput(well, w, P, U) {
    const A = +well.res_A, h = +well.res_h, flow = +well.res_flow;
    if (!(A > 0 && h > 0 && flow > 0)) return null;
    const z = +well.res_z > 0 ? +well.res_z : w.depth;
    const Tres = +well.res_T > 0 ? +well.res_T : P.T0 + (w.G / 100) * z;
    const phi = +well.res_phi > 0 ? +well.res_phi / 100 : 0.1;
    return { A, h, phi, flow, z, Tres, Treinj: Math.max(U.Treinj, U.Tret), Rf: U.Rf, PI: +well.res_PI || 0, spacing: +well.res_spacing || 0, co2: +well.res_co2 || 0 };
  }
  function evalWell(w) {
    const P = modelParams(), U = utilParams(), well = wellBy(w.uid);
    const resIn = reservoirInput(well, w, P, U);
    if (w.location === 'offshore') U.elecValue = U.elecOff; // platform power displaces gas-turbine/diesel generation
    if (+well.cp_flow > 0 && +well.cp_T > 0) U.coprod = { flow: +well.cp_flow, T: +well.cp_T };
    const eco = Object.assign({}, P.eco, { pumpKW: w.pumpKW });
    if (P.eco.pumpAuto) eco.pumpAt = (m) => M.pumpPower(m, w.md, P.geom).kW;
    const ev = AWUtil.evaluate(w.base, U, eco, w.eco.capex, resIn);
    return { ev, resIn, U, P };
  }
  const optLabel = (o) => o.id === 'orc' ? `${t('opt.orc')} – ${o.fluid.name}` : o.id === 'cascade' ? `${t('opt.cascade')} (${o.fluid.name})` : t('opt.' + o.id);
  const bnU = () => (S.lang === 'vi' ? 'tỷ đ' : 'bn VND');

  function renderOpt(a, u) {
    const well = wellBy(u); const res = screen();
    const w = res && res.ranked.find((x) => x.uid === u);
    if (!w) { a.innerHTML = `<div class="doc"><h2>${esc(wellLabel(well))}</h2><div class="warnbox">${t('det.invalid')}</div></div>`; return; }
    const { ev, resIn, U, P } = evalWell(w);
    const best = ev.best;
    const rows = ev.sources.flatMap((s) => s.options).sort((x, y) => (y.feasible - x.feasible) || (y.npv - x.npv));
    const R = ev.reservoir;
    const orcSrc = ev.sources.find((s) => s.id === 'open') || ev.sources[0];
    const fl = orcSrc.fluids.slice().sort((x, y) => (y.feasible - x.feasible) || (y.npv - x.npv));
    const safety = (f) => [f.flam ? t('fl.flam') : '', f.tox ? t('fl.tox') : '', f.gwp > 150 ? `GWP ${fmt(f.gwp)}` : ''].filter(Boolean).join(', ') || '–';
    const why = (o) => (o.reasons || []).map((r) => t('why.' + r)).concat((o.notes || []).map((r) => t('why.' + r))).join('; ');
    a.innerHTML = `<div class="doc">
      <div class="rep-head"><div><h2>${t('doc.opt')}: ${esc(wellLabel(well))}</h2><div class="hint">${t('opt.sub')}</div></div><button class="btn no-print" id="btnPrint">${t('det.print')}</button></div>
      ${best ? `<div class="rec go"><b>${t('opt.best')}:</b> ${esc(optLabel(best))} · ${t('src2.' + best.src)} · ${fmt(best.m, 1)} kg/s · NPV ${fmt(best.npv, 1)} ${bnU()}${best.Pe > 0 ? ` · ${fmt(best.Pe, 0)} kWe` : ''}${best.Q > 0 ? ` · ${fmt(best.Q, 0)} kWth` : ''}</div>` : `<div class="rec no">${t('opt.none')}</div>`}
      <div class="card" style="margin-bottom:14px"><h3>${t('opt.table')}</h3><div class="tscroll"><table class="tbl"><thead><tr>
        <th>${t('opt.col.opt')}</th><th>${t('opt.col.src')}</th><th class="n">${t('opt.col.m')}</th><th class="n">${t('opt.col.Ts')}</th><th class="n">${t('opt.col.Q')}</th><th class="n">${t('opt.col.Pe')}</th>
        <th class="n">${t('opt.col.val')}</th><th class="n">${t('opt.col.capex')}</th><th class="n">NPV (${bnU()})</th><th>${t('opt.col.note')}</th></tr></thead><tbody>
        ${rows.map((o) => `<tr class="${o === best ? 'sel' : ''}" style="${o.feasible ? '' : 'color:var(--muted)'}"><td><b>${esc(optLabel(o))}</b></td><td>${t('src2.' + o.src)}</td>
          <td class="n">${fmt(o.m, 1)}</td><td class="n">${fmt(o.Ts, 1)}</td><td class="n">${fmt(o.Q)}</td><td class="n">${o.Pe > 0 ? fmt(o.Pe, 1) : '–'}</td>
          <td class="n">${fmt(o.value, 2)}</td><td class="n">${fmt(o.capex, 1)}</td><td class="n ${o.npv < 0 ? 'npv-neg' : 'npv-pos'}">${fmt(o.npv, 1)}</td>
          <td class="use">${o.feasible ? (o.id === 'cascade' ? t('opt.note.cascade', { T: fmt(o.Tout, 0) }) : o.id === 'orc' ? `η ${fmt(o.eta * 100, 1)}%` : '') : esc(why(o) || t('why.lowTdry'))}</td></tr>`).join('')}
      </tbody></table></div></div>
      <div class="rep-grid">
        <div class="card"><h3>${t('opt.fluids')} – ${t('src2.' + orcSrc.id)}</h3><div class="tscroll"><table class="tbl"><thead><tr>
          <th>${t('fl.name')}</th><th class="n">${t('fl.bp')}</th><th class="n">${t('fl.tc')}</th><th class="n">${t('fl.p40')}</th><th class="n">${t('fl.minT')}</th><th class="n">${t('opt.col.Pe')}</th><th>${t('fl.status')}</th><th>${t('fl.safety')}</th></tr></thead><tbody>
          ${fl.map((o) => `<tr style="${o.feasible ? '' : 'color:var(--muted)'}"><td><b>${esc(o.fluid.name)}</b></td><td class="n">${fmt(o.fluid.bp, 1)}</td><td class="n">${o.fluid.tc === null ? '–' : fmt(o.fluid.tc, 0)}</td>
            <td class="n">${o.fluid.p40 === null ? '–' : fmt(o.fluid.p40, 2)}</td><td class="n">${fmt(o.fluid.minT)}</td><td class="n">${o.Pe > 0 ? fmt(o.Pe, 1) : '–'}</td>
            <td class="use">${o.feasible ? '✓ ' + esc(why(o)) : esc(why(o))}</td><td class="use">${safety(o.fluid)}</td></tr>`).join('')}
          </tbody></table></div><p class="hint">${t('fl.hint')}</p></div>
        <div class="card"><h3>${t('res.title')}</h3>
          ${R ? `<table class="kv">
            <tr><td>${t('r2.A')} × ${t('r2.h')}</td><td>${fmt(resIn.A, 2)} km² × ${fmt(resIn.h)} m</td></tr>
            <tr><td>${t('r2.phi')} · ${t('r2.T')}</td><td>${fmt(resIn.phi * 100, 0)}% · ${fmt(resIn.Tres, 1)} °C</td></tr>
            <tr><td>${t('res.H')}</td><td>${fmt(R.HGWh, 0)} GWhth</td></tr>
            <tr><td>${t('res.Hrec')} (Rf ${fmt(resIn.Rf * 100)}%)</td><td>${fmt(R.HrecGWh, 0)} GWhth</td></tr>
            <tr><td>${t('res.Psust')}</td><td>${fmt(R.Psust)} kWth</td></tr>
            <tr><td>${t('res.Pwell')} (${fmt(resIn.flow, 1)} kg/s, ${fmt(R.Twh, 0)} °C)</td><td>${fmt(R.PwellFull)} kWth</td></tr>
            <tr><td>${t('res.limit')}</td><td>${R.limited ? t('res.limRes', { m: fmt(R.mSust, 1) }) : t('res.limWell')}</td></tr>
            <tr><td>${t('res.Amin')}</td><td>${fmt(R.Amin, 2)} km²</td></tr>
            <tr><td>${t('res.life')}</td><td>${isFinite(R.breakthroughYears) ? fmt(R.breakthroughYears, 0) + ' ' + t('det.yr') : '–'}</td></tr>
            <tr><td>${t('res.sweepR')}</td><td>${fmt(R.sweep.r)} m · ${fmt(R.sweep.area, 2)} km²</td></tr>
            <tr><td>${t('res.spacing')}</td><td>≈ ${fmt(R.sweep.spacing)} m${R.sweep.tbYears ? ` · ${t('res.tb', { L: fmt(resIn.spacing), y: fmt(R.sweep.tbYears, 0) })}` : ''}</td></tr>
            ${R.piLimited ? `<tr><td>${t('res.pi')}</td><td>${fmt(R.flowCap, 1)} kg/s</td></tr>` : ''}</table>
            ${R.co2High ? `<div class="warnbox" style="margin-top:8px">${t('res.co2', { c: fmt(resIn.co2) })}</div>` : ''}
            <div class="chart-box" style="height:230px;margin-top:10px"><canvas id="chArea"></canvas></div>`
          : `<p class="muted">${t('res.empty')}</p>`}
          <p class="hint">${t('res.hint')}</p></div>
      </div>
      <div class="card" style="margin-top:14px"><h3>${t('opt.chart')}</h3><div class="chart-box" style="height:${Math.max(200, rows.length * 26)}px"><canvas id="chOpt"></canvas></div></div>
      <p class="hint" style="margin-top:12px">${t('opt.disclaimer')}</p></div>`;
    $('#btnPrint').onclick = () => window.print();
    const feas = rows.filter((o) => o.feasible);
    mk('chOpt', { type: 'bar', data: { labels: feas.map((o) => `${optLabel(o)} · ${t('src2.' + o.src)}`), datasets: [{ label: `NPV (${bnU()})`, data: feas.map((o) => o.npv), backgroundColor: feas.map((o) => (o === best ? '#2e7d32' : o.npv >= 0 ? '#66bb6a' : '#ef9a9a')) }] },
      options: { indexAxis: 'y', maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => `NPV ${fmt(c.parsed.x, 1)} ${bnU()}` } } }, scales: { x: { ticks: { callback: numTick(0) } } } } });
    if (R) {
      const As = Array.from({ length: 31 }, (_, i) => Math.pow(10, -1.3 + i * 0.1));
      const per = R.perKm2;
      mk('chArea', { type: 'line', data: { datasets: [
        { label: t('res.Psust'), data: As.map((x) => ({ x, y: per * x })), borderColor: '#ef6c00', pointRadius: 0, borderWidth: 2.4 },
        { label: t('res.Pwell'), data: As.map((x) => ({ x, y: R.PwellFull })), borderColor: '#1565c0', borderDash: [6, 4], pointRadius: 0 },
        { label: t('res.now'), data: [{ x: resIn.A, y: Math.min(per * resIn.A, R.PwellFull) }], borderColor: '#2e7d32', backgroundColor: '#2e7d32', pointRadius: 6, showLine: false },
      ] }, options: { maintainAspectRatio: false, parsing: false,
        plugins: { tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${fmt(c.parsed.y)} kWth @ ${fmt(c.parsed.x, 2)} km²` } } },
        scales: { x: { type: 'logarithmic', title: { display: true, text: t('r2.A') }, ticks: { callback: (v) => ([0.1, 0.2, 0.5, 1, 2, 5, 10, 20].includes(+v) ? fmt(v, v < 1 ? 1 : 0) : '') } },
          y: { title: { display: true, text: 'kWth' }, ticks: { callback: numTick() } } } } });
    }
  }

  function renderOptAll(a) {
    const res = screen();
    if (!res || !res.ranked.length) { a.innerHTML = `<div class="doc"><h2>${t('doc.optall')}</h2><p class="muted">${t('proj.empty')}</p></div>`; return; }
    const rows = res.ranked.map((w) => {
      const { ev } = evalWell(w);
      const bc = ev.sources[0].options.filter((o) => o.feasible).sort((x, y) => y.npv - x.npv)[0];
      return { w, best: ev.best, bc, R: ev.reservoir };
    }).sort((x, y) => (y.best ? y.best.npv : -1e9) - (x.best ? x.best.npv : -1e9));
    a.innerHTML = `<div class="doc"><h2>${t('doc.optall')}</h2><div class="hint">${t('optall.hint')}</div>
      <div class="tscroll" style="margin-top:12px"><table class="tbl" id="optTbl"><thead><tr><th>${t('r.well')}</th><th class="n">${t('r.tb')}</th><th>${t('opt.best')}</th><th>${t('opt.col.src')}</th>
        <th class="n">${t('opt.col.Q')}</th><th class="n">${t('opt.col.Pe')}</th><th class="n">NPV (${bnU()})</th><th>${t('optall.closed')}</th><th class="n">${t('res.Psust')}</th></tr></thead><tbody>
        ${rows.map(({ w, best, bc, R }) => `<tr data-u="${w.uid}"><td><b>${esc(w.name || w.id)}</b></td><td class="n">${fmt(w.Tbottom)}</td>
          <td>${best ? esc(optLabel(best)) : '–'}</td><td>${best ? t('src2.' + best.src) : ''}</td><td class="n">${best ? fmt(best.Q) : '–'}</td><td class="n">${best && best.Pe > 0 ? fmt(best.Pe, 1) : '–'}</td>
          <td class="n ${best && best.npv < 0 ? 'npv-neg' : 'npv-pos'}">${best ? fmt(best.npv, 1) : '–'}</td>
          <td class="use">${bc ? `${esc(optLabel(bc))} · NPV ${fmt(bc.npv, 1)}` : '–'}</td><td class="n">${R ? fmt(R.Psust) : '–'}</td></tr>`).join('')}
      </tbody></table></div>
      ${(() => { // cluster view: wells grouped by field share surface plant decisions
        const g = new Map();
        rows.forEach(({ w, best }) => { const k = (wellBy(w.uid) || {}).field || '–'; const o = g.get(k) || { n: 0, q: 0, pe: 0, npv: 0, pos: 0 }; o.n++; if (best) { o.q += best.Q || 0; o.pe += best.Pe || 0; if (best.npv > 0) { o.npv += best.npv; o.pos++; } } g.set(k, o); });
        return `<h3 style="margin-top:18px">${t('optall.cluster')}</h3><div class="tscroll"><table class="tbl"><thead><tr><th>${t('f.field')}</th><th class="n">${t('f.wellCount')}</th><th class="n">${t('optall.pos')}</th><th class="n">${t('opt.col.Q')}</th><th class="n">${t('opt.col.Pe')}</th><th class="n">${t('optall.npvPos')}</th></tr></thead><tbody>${Array.from(g.entries()).map(([k, o]) => `<tr><td><b>${esc(k)}</b></td><td class="n">${o.n}</td><td class="n">${o.pos}</td><td class="n">${fmt(o.q)}</td><td class="n">${o.pe > 0 ? fmt(o.pe, 1) : '–'}</td><td class="n">${fmt(o.npv, 1)}</td></tr>`).join('')}</tbody></table></div><p class="hint">${t('optall.clusterHint')}</p>`;
      })()}
      <p class="hint" style="margin-top:12px">${t('opt.disclaimer')}</p></div>`;
  }
  $('#docArea').addEventListener('dblclick', (e) => { const r = e.target.closest('#optTbl tbody tr'); if (r) openDoc('opt:' + r.dataset.u); });

  /* ---------- technology comparison: CLGS / AGS / hydrothermal / EGS / CO2-EGS ---------- */
  const TECHS = ['clgs', 'ags', 'hydro', 'egs', 'cpg'];
  function techParams() {
    const p = Object.assign({}, DEFAULTS, S.project ? S.project.params : {});
    const n = (k) => (isFinite(+p[k]) ? +p[k] : DEFAULTS[k]);
    return { latN: Math.max(1, Math.round(n('t_latN'))), latL: Math.max(100, n('t_latL')), capexLat: n('t_capexLat'), egsFlow: Math.max(1, n('t_egsFlow')), egsV: Math.max(0.001, n('t_egsV')), egsRf: n('t_egsRf') / 100,
      egsImp: n('t_egsImp'), capexStim: n('t_capexStim'), capexWellM: n('t_capexWellM'), co2Gain: n('t_co2Gain'), co2Loss: n('t_co2Loss'), capexCPG: n('t_capexCPG'), heatDemOff: n('t_heatDemOff'), heatDemOn: n('t_heatDemOn'), elecDem: n('t_elecDem') };
  }
  function techWell(w) {
    const { ev, resIn, U, P } = evalWell(w);
    const eco = Object.assign({}, P.eco);
    return window.AWTech.evaluate(w, ev, { P, U, eco, resIn, T: techParams(), wellCapex: w.eco.capex });
  }
  function techAll() {
    const res = screen(); if (!res) return [];
    return res.ranked.map((w) => ({ w, r: techWell(w) }));
  }
  const useLabel = (o) => (o && o.use ? t('tuse.' + o.use) + ((o.use === 'power' || o.use === 'cogen') && o.fluid ? ` (${o.fluid})` : '') : '–');
  const techWhy = (o) => (o.reasons || []).map((r) => t('tw.' + r)).join('; ');
  function renderTech(a) {
    const rows = techAll();
    if (!rows.length) { a.innerHTML = `<div class="doc"><h2>${t('doc.tech')}</h2><p class="muted">${t('proj.empty')}</p></div>`; return; }
    const tot = {}; TECHS.forEach((k) => { tot[k] = { n: 0, pos: 0, npv: 0, pe: 0, q: 0, co2: 0 }; });
    rows.forEach(({ r }) => r.options.forEach((o) => { const x = tot[o.id]; if (isFinite(o.npv) && o.npv !== null) { x.n++; x.q += o.Q || 0; x.pe += o.Pe || 0; x.co2 += o.co2t || 0; if (o.npv > 0) { x.pos++; x.npv += o.npv; } } }));
    const cell = (o) => (o && isFinite(o.npv) && o.npv !== null ? `<td class="n ${o.npv < 0 ? 'npv-neg' : 'npv-pos'}" title="${esc(useLabel(o))}">${fmt(o.npv, 1)}</td>` : `<td class="n" style="color:var(--muted)" title="${esc(o ? techWhy(o) : '')}">${o && o.status === 'nodata' ? t('tech.nodata') : '–'}</td>`);
    a.innerHTML = `<div class="doc"><h2>${t('doc.tech')}</h2><p class="muted">${t('tech.intro')}</p>
      <div class="card"><h3>${t('tech.matrix')}</h3><div class="tscroll"><table class="tbl" id="techTbl"><thead><tr><th>${t('r.well')}</th><th class="n">${t('r.tb')}</th>
        ${TECHS.map((k) => `<th class="n">${t('tech.' + k)}<br><small>NPV (${bnU()})</small></th>`).join('')}<th>${t('tech.best')}</th><th class="n">${t('tech.dnpv')}</th></tr></thead><tbody>
        ${rows.map(({ w, r }) => `<tr data-u="${w.uid}"><td><b>${esc(w.name || w.id)}</b></td><td class="n">${fmt(w.Tbottom)}</td>${TECHS.map((k) => cell(r.options.find((o) => o.id === k))).join('')}
          <td>${r.best ? `<b>${t('tech.' + r.best.id)}</b> · ${esc(useLabel(r.best))}` : '–'}</td><td class="n">${r.best && r.best.dNpv !== null ? (r.best.dNpv > 0 ? '+' : '') + fmt(r.best.dNpv, 1) : '–'}</td></tr>`).join('')}
        </tbody></table></div><p class="hint">${t('tech.matrixHint')}</p></div>
      <div class="card" style="margin-top:14px"><h3>${t('tech.totals')}</h3><div class="tscroll"><table class="tbl"><thead><tr><th>${t('tech.col.tech')}</th><th>TRL</th><th class="n">${t('tech.col.n')}</th><th class="n">${t('optall.pos')}</th><th class="n">${t('opt.col.Q')}</th><th class="n">${t('opt.col.Pe')}</th><th class="n">${t('optall.npvPos')}</th><th class="n">${t('tech.col.co2')}</th></tr></thead><tbody>
        ${TECHS.map((k) => { const x = tot[k]; const trl = (rows[0].r.options.find((o) => o.id === k) || {}).trl; return `<tr><td><b>${t('tech.' + k)}</b></td><td>${trl || ''}</td><td class="n">${x.n}</td><td class="n">${x.pos}</td><td class="n">${fmt(x.q)}</td><td class="n">${x.pe > 0 ? fmt(x.pe, 0) : '–'}</td><td class="n">${fmt(x.npv, 1)}</td><td class="n">${x.co2 > 0 ? fmt(x.co2 / 1000, 1) : '–'}</td></tr>`; }).join('')}
      </tbody></table></div></div>
      <div class="card" style="margin-top:14px"><h3>${t('tech.chart')}</h3><div class="chart-box" style="height:${Math.max(240, rows.length * 34)}px"><canvas id="chTech"></canvas></div></div>
      <div class="card" style="margin-top:14px"><div class="rep-head"><h3 style="margin:0">${t('tech.detail')}</h3><button class="btn no-print" id="btnTechCsv">${t('b.exportCsv')}</button></div><div class="tscroll"><table class="tbl"><thead><tr>
        <th>${t('r.well')}</th><th>${t('tech.col.tech')}</th><th>${t('tech.col.status')}</th><th>${t('tech.col.use')}</th><th class="n">${t('opt.col.m')}</th><th class="n">${t('opt.col.Ts')}</th><th class="n">${t('opt.col.Q')}</th><th class="n">${t('opt.col.Pe')}</th>
        <th class="n">${t('opt.col.capex')}</th><th class="n">${t('tech.col.cash')}</th><th class="n">NPV (${bnU()})</th><th class="n">${t('tech.col.lcoe')}</th><th class="n">${t('tech.col.co2')}</th><th>${t('opt.col.note')}</th></tr></thead><tbody>
        ${rows.flatMap(({ w, r }) => r.options.map((o, i) => `<tr${i === 0 ? ' style="border-top:2px solid var(--line)"' : ''}><td>${i === 0 ? `<b>${esc(w.name || w.id)}</b>` : ''}</td><td>${t('tech.' + o.id)}</td><td><span class="src ${o.status === 'ok' ? 'dst' : o.status === 'cond' ? 'log' : 'field'}">${t('tst.' + o.status)}</span></td>
          <td>${esc(useLabel(o))}</td><td class="n">${fmt(o.m, 1)}</td><td class="n">${fmt(o.Ts, 0)}</td><td class="n">${fmt(o.Q)}</td><td class="n">${o.Pe > 0 ? fmt(o.Pe, 0) : '–'}</td><td class="n">${fmt(o.capex, 0)}</td><td class="n">${fmt(o.yearly, 2)}</td>
          <td class="n ${o.npv < 0 ? 'npv-neg' : 'npv-pos'}">${fmt(o.npv, 1)}</td><td class="n">${fmt(o.lcoe)}</td><td class="n">${o.co2t > 0 ? fmt(o.co2t / 1000, 1) : '–'}</td><td class="use">${esc(techWhy(o))}</td></tr>`)).join('')}
      </tbody></table></div><p class="hint">${t('tech.detailHint')}</p></div>
      <div class="card" style="margin-top:14px"><h3>${t('tech.about')}</h3><div class="tscroll"><table class="tbl"><thead><tr><th>${t('tech.col.tech')}</th><th>TRL</th><th>${t('tech.col.how')}</th><th>${t('tech.col.need')}</th><th>${t('tech.col.risk')}</th></tr></thead><tbody>
        ${TECHS.map((k) => `<tr><td><b>${t('tech.' + k)}</b></td><td>${(rows[0].r.options.find((o) => o.id === k) || {}).trl || ''}</td><td class="use">${t('tinfo.' + k + '.how')}</td><td class="use">${t('tinfo.' + k + '.need')}</td><td class="use">${t('tinfo.' + k + '.risk')}</td></tr>`).join('')}
      </tbody></table></div><p class="hint">${t('tech.disclaimer', { g: fmt(techParams().co2Gain, 1) })}</p></div></div>`;
    const col = { clgs: '#90caf9', ags: '#1565c0', hydro: '#2e7d32', egs: '#ef6c00', cpg: '#8e24aa' };
    mk('chTech', { type: 'bar', data: { labels: rows.map(({ w }) => w.name || w.id), datasets: TECHS.map((k) => ({ label: t('tech.' + k), backgroundColor: col[k], data: rows.map(({ r }) => { const o = r.options.find((x) => x.id === k); return o && isFinite(o.npv) && o.npv !== null ? o.npv : null; }) })) },
      options: { indexAxis: 'y', maintainAspectRatio: false, plugins: { tooltip: { callbacks: { label: (c) => `${c.dataset.label}: NPV ${fmt(c.parsed.x, 1)} ${bnU()}` } } }, scales: { x: { title: { display: true, text: `NPV (${bnU()})` }, ticks: { callback: numTick(0) } } } } });
    $('#btnTechCsv').onclick = () => download(safeName(S.project.name) + '_technologies.csv', toCSV(techRows(rows), TECH_CSV), 'text/csv');
  }
  const TECH_CSV = ['well', 'T_bottom_C', 'technology', 'trl', 'status', 'use', 'flow_kg_s', 'T_source_C', 'heat_kWth', 'power_kWe', 'capex_bnVND', 'net_cash_bnVND_yr', 'npv_bnVND', 'dNPV_vs_CLGS', 'lcoe_VND_kWh', 'co2_stored_t_yr', 'notes'];
  function techRows(rows) {
    return rows.flatMap(({ w, r }) => r.options.map((o) => ({ well: w.name || w.id, T_bottom_C: Math.round(w.Tbottom), technology: t('tech.' + o.id), trl: o.trl, status: t('tst.' + o.status), use: useLabel(o),
      flow_kg_s: o.m === undefined || o.m === null ? '' : +(+o.m).toFixed(1), T_source_C: isFinite(o.Ts) ? Math.round(o.Ts) : '', heat_kWth: Math.round(o.Q || 0), power_kWe: Math.round(o.Pe || 0),
      capex_bnVND: isFinite(o.capex) ? +o.capex.toFixed(1) : '', net_cash_bnVND_yr: isFinite(o.yearly) ? +o.yearly.toFixed(2) : '', npv_bnVND: isFinite(o.npv) && o.npv !== null ? +o.npv.toFixed(1) : '',
      dNPV_vs_CLGS: o.dNpv !== null && isFinite(o.dNpv) ? +o.dNpv.toFixed(1) : '', lcoe_VND_kWh: isFinite(o.lcoe) && o.lcoe !== null ? Math.round(o.lcoe) : '', co2_stored_t_yr: Math.round(o.co2t || 0), notes: techWhy(o) })));
  }
  $('#docArea').addEventListener('dblclick', (e) => { const r = e.target.closest('#techTbl tbody tr'); if (r) openDoc('opt:' + r.dataset.u); });
  /* read-only hook used to export results into the private results workbook */
  window.AWApp = { techTable: () => techRows(techAll()), project: () => S.project && { name: S.project.name, wells: S.project.wells.length } };

  /* ---------- machine learning (temperature model) ---------- */
  function trainML() {
    const P = modelParams();
    return AWML.train(S.project.wells, P.T0, M);
  }
  const MEASURED = ['dst', 'lwd', 'horner', 'bht'];
  /* ---------- Volve data view ---------- */
  async function renderVolve(a) {
    a.innerHTML = `<div class="doc"><h2>${t('doc.volve')}</h2><p class="muted">${t('volve.loading')}</p></div>`;
    let D;
    try { D = await loadVolve(); } catch (e) { a.innerHTML = `<div class="doc"><h2>${t('doc.volve')}</h2><div class="warnbox">${t('volve.loadErr', { e: esc(e.message) })}</div></div>`; return; }
    if (S.active !== 'volve') return;
    const T0 = VOLVE_PARAMS.T0, F = D.field;
    const pts = []; D.wells.forEach((w) => w.temps.forEach((q) => pts.push({ w: w.name, z: q.tvd - (w.kb || 54.9), T: q.t, md: q.md, how: q.how })));
    const fg = pts.length ? fitGradient(pts, T0) : null;
    const usable = D.wells.filter(volveUsable);
    const cubes = D.seismic.cubes, by = (s) => cubes.filter((c) => c.survey === s);
    const flagTxt = (f) => t(/view/i.test(f) ? 'volve.flag.view' : /to[aạ]\s*đ|coord/i.test(f) ? 'volve.flag.coord' : 'volve.flag.other');
    const curvesOf = (w) => (w.logs ? ['GR', 'DT', 'RHOB', 'NPHI', 'RT'].filter((k) => w.logs[k]).join(', ') : '–');
    a.innerHTML = `<div class="doc"><h2>${t('doc.volve')}</h2>
      <div class="rec">${t('volve.attrib', { url: esc(D.url) })}</div>
      <p class="muted">${t('volve.intro', { block: esc(F.block), prod: esc(F.production), res: esc(F.reservoir), wd: fmt(F.waterDepth) })}</p>
      <div class="kpis">
        <div class="kpi"><span>${t('volve.k.wells')}</span><b>${D.wells.length}</b></div>
        <div class="kpi"><span>${t('volve.k.usable')}</span><b>${usable.length}</b></div>
        <div class="kpi"><span>${t('volve.k.pts')}</span><b>${pts.length}</b></div>
        <div class="kpi"><span>${t('volve.k.g')}</span><b>${fg ? fmt(fg.G, 2) : '–'}</b></div>
        <div class="kpi"><span>${t('volve.k.cubes')}</span><b>${cubes.length}</b></div>
        <div class="kpi"><span>${t('volve.k.lines')}</span><b>${D.seismic.lines2d.length}</b></div>
      </div>
      <div class="rep-head no-print" style="justify-content:flex-start;gap:8px;flex-wrap:wrap">
        <button class="btn" data-act="volve">${t('volve.open')}</button>
        ${S.project && S.project.source !== 'volve' ? `<button class="btn" data-act="volveAdd">${t('volve.addTo', { p: esc(S.project.name) })}</button>` : ''}
        <button class="btn" id="btnVolveDst">${t('volve.dlDst')}</button>
        <button class="btn" id="btnVolveWells">${t('volve.dlWells')}</button>
      </div>
      <div class="rep-grid">
        <div class="card"><h3>${t('volve.chT')}</h3><div class="chart-box" style="height:340px"><canvas id="chVolveT"></canvas></div><p class="hint">${t('volve.chTHint', { T0: fmt(T0), g: fg ? fmt(fg.G, 2) : '–', rms: fg ? fmt(fg.rms, 1) : '–' })}</p></div>
        <div class="card"><h3>${t('volve.map')}</h3><div id="volveMap"></div><p class="hint">${t('volve.mapHint')}</p></div>
      </div>
      <div class="card" style="margin-top:14px"><h3>${t('volve.tWells')}</h3><div class="tscroll"><table class="tbl"><thead><tr>
        <th>${t('r.well')}</th><th class="n">MD TD (m)</th><th class="n">TVD TD (m RKB)</th><th class="n">KB (m)</th><th class="n">${t('volve.nT')}</th><th class="n">T (°C)</th><th class="n">${t('volve.gW')}</th><th>${t('volve.logs')}</th><th>${t('volve.status')}</th></tr></thead><tbody>
        ${D.wells.map((w) => { const ts = w.temps.map((q) => q.t); const g = w.temps.length ? fitGradient(w.temps.map((q) => ({ z: q.tvd - (w.kb || 54.9), T: q.t })), T0).G : null; return `<tr><td><b>${esc(w.name)}</b></td><td class="n">${fmt(w.tdMD)}</td><td class="n">${fmt(w.tdTVD)}</td><td class="n" title="${esc(w.kbSrc)}">${fmt(w.kb, 1)}</td>
          <td class="n">${w.temps.length || '–'}</td><td class="n">${ts.length ? `${fmt(Math.min(...ts), 1)}–${fmt(Math.max(...ts), 1)}` : '–'}</td><td class="n">${g ? fmt(g, 2) : '–'}</td><td>${esc(curvesOf(w))}</td>
          <td>${volveUsable(w) ? `<span class="src dst">${t('volve.inProj')}</span>` : `<span class="src field">${t('volve.noTvd')}</span>`}</td></tr>`; }).join('')}
        </tbody></table></div><p class="hint">${t('volve.wellsFoot')}</p></div>
      <div class="card" style="margin-top:14px"><h3>${t('volve.tCubes')}</h3>
        <p class="hint">${['ST10010', 'ST0202'].map((s) => { const c = by(s); if (!c.length) return ''; const il = [Math.min(...c.map((x) => x.il[0])), Math.max(...c.map((x) => x.il[1]))], xl = [Math.min(...c.map((x) => x.xl[0])), Math.max(...c.map((x) => x.xl[1]))]; return t('volve.surveySum', { s, n: c.length, il0: il[0], il1: il[1], xl0: xl[0], xl1: xl[1] }); }).join(' · ')}</p>
        <div class="tscroll"><table class="tbl"><thead><tr><th>#</th><th>${t('volve.cube')}</th><th>${t('volve.survey')}</th><th>${t('volve.domain')}</th><th class="n">Inline</th><th class="n">Crossline</th><th>${t('volve.note')}</th></tr></thead><tbody>
        ${cubes.map((c, i) => `<tr><td class="n">${i + 1}</td><td style="word-break:break-all">${esc(c.name)}</td><td>${esc(c.survey)}</td><td>${t('volve.dom.' + c.domain)}</td><td class="n">${c.il[0]}–${c.il[1]}</td><td class="n">${c.xl[0]}–${c.xl[1]}</td><td>${c.flags.map((f) => `<span class="src field">${flagTxt(f)}</span>`).join(' ') || '–'}</td></tr>`).join('')}
        </tbody></table></div></div>
      <div class="card" style="margin-top:14px"><h3>${t('volve.t2d', { n: D.seismic.lines2d.length })}</h3><p class="hint" style="line-height:1.9">${D.seismic.lines2d.map((l) => `<code>${esc(l)}</code>`).join(' ')}</p></div>
      <div class="card" style="margin-top:14px"><h3>${t('volve.limits')}</h3><ul class="hint" style="text-align:left">${t('volve.limitList')}</ul></div>
    </div>`;
    // T–z chart
    const names = Array.from(new Set(pts.map((p) => p.w)));
    const pal = ['#1565c0', '#c62828', '#2e7d32', '#ef6c00', '#6a1b9a', '#00838f', '#ad1457', '#5d4037', '#455a64', '#9e9d24', '#283593', '#d84315', '#00695c', '#8e24aa'];
    const zmax = Math.max(3600, ...pts.map((p) => p.z)) + 100;
    const ds = names.map((n, i) => ({ label: n, data: pts.filter((p) => p.w === n).map((p) => ({ x: p.T, y: p.z, md: p.md, how: p.how })), backgroundColor: pal[i % pal.length], pointRadius: 3.5 }));
    if (fg) ds.push({ label: t('volve.fit', { g: fmt(fg.G, 2) }), data: [{ x: T0, y: 0 }, { x: T0 + fg.G / 100 * zmax, y: zmax }], showLine: true, pointRadius: 0, borderColor: '#212121', borderDash: [6, 4] });
    mk('chVolveT', { type: 'scatter', data: { datasets: ds }, options: { maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } }, tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${fmt(c.parsed.x, 1)} °C @ ${fmt(c.parsed.y)} m TVDSS${c.raw.md ? ` (MD ${fmt(c.raw.md)} m, ${c.raw.how})` : ''}` } } },
      scales: { x: { title: { display: true, text: t('ch.temp') } }, y: { reverse: true, min: 0, max: zmax, title: { display: true, text: 'TVDSS (m)' } } } } });
    // survey outline map (equirectangular, km from platform)
    const plat = D.wells.find((w) => w.coordSrc === 'LAS header' && w.lat) || D.wells.find((w) => w.lat);
    const lat0 = plat ? plat.lat : 58.44, lon0 = plat ? plat.lon : 1.887, kx = 111.32 * Math.cos(lat0 * Math.PI / 180), ky = 110.57;
    const polys = Object.entries(D.seismic.corners).map(([s, cs]) => ({ s, p: cs.map((c) => [(c.lon - lon0) * kx, (c.lat - lat0) * ky]) }));
    const all = polys.flatMap((q) => q.p).concat([[0, 0]]);
    const x0 = Math.min(...all.map((p) => p[0])) - 1, x1 = Math.max(...all.map((p) => p[0])) + 1, y0 = Math.min(...all.map((p) => p[1])) - 1, y1 = Math.max(...all.map((p) => p[1])) + 1;
    const W = 420, H = Math.round(W * (y1 - y0) / (x1 - x0)), sx = (x) => ((x - x0) / (x1 - x0) * W).toFixed(1), sy = (y) => ((y1 - y) / (y1 - y0) * H).toFixed(1);
    const colr = { ST10010: '#1565c0', ST0202: '#ef6c00' };
    const grid = []; for (let g = Math.ceil(x0); g <= x1; g++) grid.push(`<line x1="${sx(g)}" y1="0" x2="${sx(g)}" y2="${H}" stroke="#eceff1"/>`); for (let g = Math.ceil(y0); g <= y1; g++) grid.push(`<line x1="0" y1="${sy(g)}" x2="${W}" y2="${sy(g)}" stroke="#eceff1"/>`);
    $('#volveMap').innerHTML = `<svg viewBox="0 0 ${W} ${H}" style="width:100%;max-height:340px;background:#fbfdff;border:1px solid #e0e6ed;border-radius:4px" role="img" aria-label="${esc(t('volve.map'))}">
      ${grid.join('')}
      ${polys.map((q) => `<polygon points="${q.p.map((p) => sx(p[0]) + ',' + sy(p[1])).join(' ')}" fill="${colr[q.s] || '#607d8b'}" fill-opacity=".10" stroke="${colr[q.s] || '#607d8b'}" stroke-width="2"/><text x="${sx(q.p[0][0])}" y="${sy(q.p[0][1])}" dy="${q.s === 'ST0202' ? -6 : 14}" font-size="12" fill="${colr[q.s] || '#607d8b'}" font-weight="700">${esc(q.s)}</text>`).join('')}
      <circle cx="${sx(0)}" cy="${sy(0)}" r="6" fill="#c62828" stroke="#fff" stroke-width="2"/><text x="${sx(0)}" y="${sy(0)}" dx="9" dy="4" font-size="12" fill="#c62828" font-weight="700">${t('volve.platform')}</text>
      <text x="6" y="${H - 6}" font-size="10" fill="#78909c">1 ô = 1 km · N ↑ · ${fmt(lat0, 4)}°N ${fmt(lon0, 4)}°E</text></svg>`;
    // downloads
    $('#btnVolveDst').onclick = () => download('volve_lwd_temperatures.csv', toCSV(D.wells.flatMap((w) => w.temps.map((q) => ({ well: w.name, tvd_m: Math.round(q.tvd - (w.kb || 54.9)), md_m: q.md, temp_c: q.t, label: `${q.how} ${q.file.split('/').pop()}` }))), ['well', 'tvd_m', 'md_m', 'temp_c', 'label']), 'text/csv');
    $('#btnVolveWells').onclick = () => download('volve_wells.csv', toCSV(D.wells.map((w) => ({ name: w.name, md_td_m: w.tdMD, tvd_td_m_rkb: w.tdTVD, kb_m: w.kb, lat: w.lat, lon: w.lon, coord_source: w.coordSrc, n_temp: w.temps.length, logs: curvesOf(w), log_source: w.logSrc })), ['name', 'md_td_m', 'tvd_td_m_rkb', 'kb_m', 'lat', 'lon', 'coord_source', 'n_temp', 'logs', 'log_source']), 'text/csv');
  }

  function renderML(a) {
    const P = modelParams(); const ml = trainML(); S.ml = ml;
    if (!ml.ok) { a.innerHTML = `<div class="doc"><h2>${t('doc.ml')}</h2><div class="warnbox">${t(ml.reason === 'wells' ? 'ml.needWells' : 'ml.needPts', { n: ml.n })}</div><p class="muted">${t('ml.intro')}</p></div>`; return; }
    const gain = ml.cv.rmseBase > 0 ? (1 - ml.cv.rmseML / ml.cv.rmseBase) * 100 : 0;
    const rows = S.project.wells.map((w) => {
      const pr = ml.predictWell(w), nw = M.normaliseWell(w, P.T0), measured = (w.tempPoints || []).length || MEASURED.includes(nw.gSource) || w.gSource === 'dst';
      return { w, pr, nw, measured };
    });
    const target = rows.filter((r) => !r.measured && r.pr && (r.w.gSource === 'field' || r.w.gSource === 'ml' || !(+r.w.gradient_c100m > 0))); // never overwrite an entered gradient
    const lab = (k) => ({ z_km: t('ml.f.z'), GR: 'GR', DT: 'DT', RHOB: 'RHOB', NPHI: 'NPHI', hasLogs: t('ml.f.has') }[k]);
    a.innerHTML = `<div class="doc"><h2>${t('doc.ml')}</h2><p class="muted">${t('ml.intro')}</p>
      <div class="kpis">
        <div class="kpi"><span>${t('ml.k.pts')}</span><b>${ml.n}</b></div>
        <div class="kpi"><span>${t('ml.k.wells')}</span><b>${ml.nWells}</b></div>
        <div class="kpi"><span>${t('ml.k.rmse')}</span><b>${fmt(ml.cv.rmseML, 1)} °C</b></div>
        <div class="kpi"><span>${t('ml.k.base')}</span><b>${fmt(ml.cv.rmseBase, 1)} °C</b></div>
      </div>
      <div class="${gain > 0 ? 'rec go' : 'rec'}">${gain > 0 ? t('ml.better', { p: fmt(gain) }) : t('ml.worse', { p: fmt(-gain) })} ${t('ml.lambda', { l: ml.lambda })}</div>
      <div class="rep-grid">
        <div class="card"><h3>${t('ml.cvChart')}</h3><div class="chart-box" style="height:300px"><canvas id="chMLcv"></canvas></div></div>
        <div class="card"><h3>${t('ml.coef')}</h3><div class="chart-box" style="height:300px"><canvas id="chMLcoef"></canvas></div><p class="hint">${t('ml.coefHint')}</p></div>
      </div>
      <div class="card" style="margin-top:14px"><div class="rep-head"><h3 style="margin:0">${t('ml.table')}</h3>
        <button class="btn" id="btnMLapply" ${target.length ? '' : 'disabled'}>${t('ml.apply', { n: target.length })}</button></div>
        <div class="tscroll"><table class="tbl"><thead><tr><th>${t('r.well')}</th><th class="n">${t('r.depth')}</th><th>${t('r.src')}</th><th class="n">${t('ml.gNow')}</th><th class="n">${t('ml.gML')}</th><th class="n">P10–P90</th><th class="n">${t('ml.Ttd')}</th><th>${t('ml.logs')}</th></tr></thead><tbody>
        ${rows.map((r) => `<tr><td><b>${esc(wellLabel(r.w))}</b>${r.measured ? '' : ` <span class="src field">${t('ml.noData')}</span>`}</td><td class="n">${fmt(+r.w.depth_m)}</td><td><span class="src ${r.w.gSource || r.nw.gSource}">${t('src.' + (r.w.gSource || r.nw.gSource))}</span></td>
          <td class="n">${fmt(r.nw.G, 2)}</td><td class="n"><b>${r.pr ? fmt(r.pr.g, 2) : '–'}</b></td><td class="n">${r.pr ? `${fmt(r.pr.g10, 2)}–${fmt(r.pr.g90, 2)}` : '–'}</td>
          <td class="n">${r.pr ? fmt(r.pr.T) : '–'}</td><td>${r.pr && r.pr.f.hasLogs ? ['GR', 'DT', 'RHOB', 'NPHI'].filter((k) => r.pr.f[k] !== null).join(', ') : '–'}</td></tr>`).join('')}
        </tbody></table></div><p class="hint">${t('ml.foot')}</p></div></div>`;
    const pts = ml.cv.preds;
    const lo = Math.min(...pts.map((p) => Math.min(p.row.T, p.Tml, p.Tbase))) - 5, hi = Math.max(...pts.map((p) => Math.max(p.row.T, p.Tml, p.Tbase))) + 5;
    mk('chMLcv', { type: 'scatter', data: { datasets: [
      { label: t('ml.s.ml'), data: pts.map((p) => ({ x: p.row.T, y: p.Tml, w: wellLabel(p.row.well) })), backgroundColor: '#1565c0', pointRadius: 4 },
      { label: t('ml.s.base'), data: pts.map((p) => ({ x: p.row.T, y: p.Tbase, w: wellLabel(p.row.well) })), backgroundColor: 'rgba(239,108,0,.55)', pointRadius: 3, pointStyle: 'triangle' },
      { label: '1:1', data: [{ x: lo, y: lo }, { x: hi, y: hi }], showLine: true, pointRadius: 0, borderColor: '#9aa5b1', borderDash: [5, 4] },
    ] }, options: { maintainAspectRatio: false, plugins: { tooltip: { callbacks: { label: (c) => `${c.raw.w || ''} ${t('ml.meas')} ${fmt(c.parsed.x, 1)} → ${fmt(c.parsed.y, 1)} °C` } } },
      scales: { x: { min: lo, max: hi, title: { display: true, text: t('ml.ax.meas') } }, y: { min: lo, max: hi, title: { display: true, text: t('ml.ax.pred') } } } } });
    mk('chMLcoef', { type: 'bar', data: { labels: ml.feats.map(lab), datasets: [{ label: t('ml.coef'), data: ml.model.w, backgroundColor: ml.model.w.map((v) => (v >= 0 ? '#ef6c00' : '#1565c0')) }] },
      options: { indexAxis: 'y', maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => `${fmt(c.parsed.x, 3)} °C/100 m / σ` } } } } });
    const btn = $('#btnMLapply');
    if (btn) btn.onclick = () => {
      snapshot();
      target.forEach((r) => { r.w.gradient_c100m = Math.round(r.pr.g * 1000) / 1000; r.w.gSource = 'ml'; r.w.gNote = `ML: P10–P90 ${fmt(r.pr.g10, 2)}–${fmt(r.pr.g90, 2)} °C/100 m (${t('ml.k.rmse')} ${fmt(ml.cv.rmseML, 1)} °C)`; });
      log(t('msg.mlApplied', { n: target.length }), 'ok');
      touch(); renderAll(); openDoc('ml');
    };
  }

  /* ---------- deviation survey & DST import ---------- */
  function minCurvature(st) {
    const rad = Math.PI / 180, out = [{ md: st[0].md, tvd: st[0].md }];
    for (let i = 1; i < st.length; i++) {
      const a = st[i - 1], b = st[i], dmd = b.md - a.md;
      const i1 = a.inc * rad, i2 = b.inc * rad, a1 = a.azi * rad, a2 = b.azi * rad;
      const cosDL = Math.min(1, Math.max(-1, Math.cos(i2 - i1) - Math.sin(i1) * Math.sin(i2) * (1 - Math.cos(a2 - a1))));
      const dl = Math.acos(cosDL), rf = dl > 1e-7 ? 2 / dl * Math.tan(dl / 2) : 1;
      out.push({ md: b.md, tvd: out[i - 1].tvd + dmd / 2 * (Math.cos(i1) + Math.cos(i2)) * rf, inc: b.inc });
    }
    return out;
  }
  function tvdAt(traj, md) {
    if (md <= traj[0].md) return md;
    for (let i = 1; i < traj.length; i++) if (md <= traj[i].md) { const a = traj[i - 1], b = traj[i]; return a.tvd + (md - a.md) / (b.md - a.md) * (b.tvd - a.tvd); }
    const l = traj[traj.length - 1]; return l.tvd + (md - l.md) * Math.cos((l.inc || 0) * Math.PI / 180);
  }
  function parseSurvey(text) {
    const st = [];
    text.split(/\r?\n/).forEach((ln) => {
      const n = ln.trim().split(/[\s,;]+/).map((x) => parseFloat(x.replace(',', '.')));
      if (n.length >= 3 && n.slice(0, 3).every(isFinite) && n[1] >= 0 && n[1] <= 120) st.push({ md: n[0], inc: n[1], azi: n[2] });
    });
    st.sort((x, y) => x.md - y.md);
    if (st.length && st[0].md > 0) st.unshift({ md: 0, inc: 0, azi: st[0].azi });
    return st;
  }
  $('#fileSurvey').onchange = async (e) => {
    const f = e.target.files[0]; e.target.value = ''; const w = selWell(); if (!f || !w) return;
    const st = parseSurvey(await f.text());
    if (st.length < 3) { log(t('msg.surveyErr', { f: f.name }), 'err'); return; }
    snapshot();
    const traj = minCurvature(st);
    const logBottom = w.curves.length ? L.curveStats(w.curves[0].data).max : NaN;
    const mdTD = +w.md_m > 0 ? +w.md_m : isFinite(logBottom) ? logBottom : st[st.length - 1].md;
    const tvdTD = tvdAt(traj, mdTD);
    w.survey = st; w.surveyMD = Math.round(mdTD); w.surveyTVD = Math.round(tvdTD);
    if (!(+w.md_m > 0)) w.md_m = Math.round(mdTD);
    if (!(+w.depth_m > 0)) w.depth_m = Math.round(tvdTD);
    else if (Math.abs(+w.depth_m - tvdTD) / tvdTD > 0.02) log(t('msg.surveyKeep', { d: fmt(+w.depth_m), t: fmt(tvdTD) }), 'warn');
    log(t('msg.surveyOk', { f: f.name, w: wellLabel(w), n: st.length, md: fmt(mdTD), tvd: fmt(tvdTD), inc: fmt(Math.max(...st.map((x) => x.inc)), 1) }), 'ok');
    touch(); renderAll();
  };
  /** Gradient fitted to measured temperatures with T0 fixed: G = Σz(T−T0)/Σz² ×100. */
  function fitGradient(points, T0) {
    const sz2 = points.reduce((a, p) => a + p.z * p.z, 0), szt = points.reduce((a, p) => a + p.z * (p.T - T0), 0);
    const g = szt / sz2, rms = Math.sqrt(points.reduce((a, p) => a + (p.T - T0 - g * p.z) ** 2, 0) / points.length);
    return { G: g * 100, rms };
  }
  $('#fileDst').onchange = async (e) => {
    const f = e.target.files[0]; e.target.value = ''; if (!f || !S.project) return;
    const lines = (await f.text()).replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim());
    const delim = (lines[0].match(/;/g) || []).length > (lines[0].match(/,/g) || []).length ? ';' : ',';
    const head = lines.shift().split(delim).map((h) => h.trim().toLowerCase());
    const ix = (k) => head.findIndex((h) => h === k);
    const iW = ix('well'), iT = ix('temp_c'), iZ = ix('tvd_m'), iMD = ix('md_m'), iL = ix('label');
    if (iW < 0 || iT < 0 || (iZ < 0 && iMD < 0)) { log(t('msg.dstErr', { f: f.name }), 'err'); return; }
    snapshot();
    const T0 = modelParams().T0, touched = new Set(); let n = 0, miss = new Set();
    lines.forEach((ln) => {
      const c = ln.split(delim).map((x) => x.trim());
      const w = S.project.wells.find((x) => normWell(x.name) === normWell(c[iW]) || normWell(x.id) === normWell(c[iW]));
      if (!w) { miss.add(c[iW]); return; }
      const T = parseFloat((c[iT] || '').replace(',', '.'));
      let z = iZ >= 0 ? parseFloat((c[iZ] || '').replace(',', '.')) : NaN;
      if (!isFinite(z) && iMD >= 0) { const md = parseFloat((c[iMD] || '').replace(',', '.')); z = w.survey ? tvdAt(minCurvature(w.survey), md) : md * ((+w.depth_m > 0 && +w.md_m > 0) ? w.depth_m / w.md_m : 1); }
      if (!isFinite(T) || !isFinite(z) || T <= T0 + 5) return;
      (w.tempPoints = w.tempPoints || []).push({ z: Math.round(z), T, src: (iL >= 0 && c[iL]) || `DST ${fmt(z)} m` }); n++; touched.add(w);
    });
    touched.forEach((w) => { const g = fitGradient(w.tempPoints, T0); w.gradient_c100m = Math.round(g.G * 1000) / 1000; w.gSource = 'dst'; w.gNote = `DST: ${w.tempPoints.length} ${t('ml.pts')}, rms ${fmt(g.rms, 1)} °C`; });
    log(t('msg.dstOk', { n, w: touched.size, f: f.name }), 'ok');
    if (miss.size) log(t('msg.dstMiss', { list: Array.from(miss).join(', ') }), 'warn');
    touch(); renderAll();
  };

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
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !$('#modal').hidden) $('#mX').click();
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName) && S.undo.length) { e.preventDefault(); ACT.undo(); }
  });

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
      const note = `<div class="hint" style="margin-bottom:10px">${t('dlg.localNote')}</div><div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px"><button class="btn" data-pick="_file" data-a="file">${t('dlg.fromFile')}</button><button class="btn ghost" data-pick="_volve" data-a="volve">${t('b.volve')}</button></div>`;
      const body = note + (list.length ? `<div class="plist">${list.map((p) => `<div class="item"><div><b>${esc(p.name)}</b>${p.wells.length ? '' : ` <span class="src field">${t('dlg.empty')}</span>`}<small>${p.wells.length} ${t('dlg.wells')} · ${new Date(p.updated).toLocaleString(loc())}</small></div><button class="btn" data-pick="${p.id}" data-a="open">${t('dlg.open')}</button><button class="btn ghost" data-pick="${p.id}" data-a="del" style="color:var(--poor)">${t('dlg.delete')}</button></div>`).join('')}</div>` : `<p class="muted">${t('start.none')}</p>`);
      const r = await dialog(t('dlg.openProject'), body, [{ label: t('dlg.close') }]);
      if (!r) return;
      if (r.act === 'file') { ACT.openFile(); return; }
      if (r.act === 'volve') { ACT.volve(); return; }
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
    /** Open a project file; on Chrome/Edge the file stays linked so later changes sync both ways. */
    async openFile() {
      if (!canSync()) { $('#fileProj').click(); return; }
      try {
        const h = await AWSync.pickExisting();
        const f = await AWSync.read(h);
        const p = await importProjectText(f.text, f.name, { noSync: true });
        if (!p) return;
        const perm = await AWSync.permission(h, true);
        await AWSync.setHandle(p.id, h);
        SYNC.handle = h; SYNC.name = h.name; SYNC.state = perm === 'granted' ? 'on' : 'need';
        log(t('sync.linkedOk', { f: h.name }), 'ok'); renderRibbon();
      } catch (e) { if (e.name !== 'AbortError') log(t('sync.err', { e: e.message }), 'err'); }
    },
    async syncFile() {
      if (!canSync()) { dialog(t('sync.title'), t('sync.unsupported'), [{ label: t('dlg.close'), primary: true }]); return; }
      const P = S.project, h = await AWSync.getHandle(P.id);
      const body = `<p>${t('sync.intro')}</p>` + (h ? `<p><b>${esc(t('sync.linked', { f: h.name }))}</b> · ${t('sync.st.' + (SYNC.state === 'off' ? 'need' : SYNC.state), { f: h.name })}</p>` : '');
      const btns = [{ label: t('dlg.close') }];
      if (h) { btns.push({ label: t('sync.unlink'), value: 'unlink' }); btns.push({ label: t(SYNC.state === 'on' ? 'sync.now' : 'sync.grant'), value: 'grant', primary: true }); }
      else { btns.push({ label: t('sync.existing'), value: 'existing' }); btns.push({ label: t('sync.create'), value: 'create', primary: true }); }
      const r = await dialog(t('sync.title'), body, btns);
      if (!r) return;
      try {
        if (r === 'unlink') { await AWSync.unlink(P.id); SYNC.handle = null; SYNC.state = 'off'; SYNC.name = ''; log(t('sync.unlinked')); }
        if (r === 'grant') { const perm = await AWSync.permission(h, true); SYNC.handle = h; SYNC.name = h.name; SYNC.state = perm === 'granted' ? 'on' : 'need'; await syncPull(); if (SYNC.state === 'on') log(t('sync.ok', { f: h.name }), 'ok'); }
        if (r === 'create') { const nh = await AWSync.pickNew(safeName(P.name) + '.awproj.json'); await AWSync.setHandle(P.id, nh); SYNC.handle = nh; SYNC.name = nh.name; SYNC.state = 'on'; await syncPush(true); log(t('sync.created', { f: nh.name }), 'ok'); }
        if (r === 'existing') { const nh = await AWSync.pickExisting(); const perm = await AWSync.permission(nh, true); await AWSync.setHandle(P.id, nh); SYNC.handle = nh; SYNC.name = nh.name; SYNC.state = perm === 'granted' ? 'on' : 'need'; await syncPull(); log(t('sync.linkedOk', { f: nh.name }), 'ok'); }
      } catch (e) { if (e.name !== 'AbortError') log(t('sync.err', { e: e.message }), 'err'); }
      renderRibbon();
    },
    async newWell() {
      const nm = await dialog(t('dlg.newWell'), `<label>${t('f.name')}<input id="dlgName" value="W-${S.project.wells.length + 1}"></label>`, [{ label: t('dlg.cancel') }, { label: t('dlg.create'), primary: true, value: true, collect: true }], () => $('#dlgName').value.trim());
      if (!nm) return;
      const w = newWellObj({ id: nm, name: nm });
      snapshot();
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
      snapshot();
      w.curves = w.curves.map((c) => Object.assign({}, c, { data: c.data.map((x) => { if (x !== null && Math.abs(x - v) < 1e-6) { k++; return null; } return x; }) }));
      w.nullValue = v; deriveThermal(w, null);
      log(t('msg.null', { v, k: fmt(k) }), 'ok');
      touch(); renderAll();
    },
    async delete() {
      const s = S.sel; const w = wellBy(s.uid); if (!w) return;
      const label = s.t === 'curve' ? `${wellLabel(w)} / ${w.curves[s.ci].mnemonic}` : wellLabel(w);
      const ok = await dialog(t('dlg.delete'), `<p>${esc(t('dlg.confirmDelItem', { n: label }))}</p>`, [{ label: t('dlg.cancel') }, { label: t('dlg.delete'), primary: true, value: true }]);
      if (!ok) return;
      snapshot();
      if (s.t === 'curve') { if (s.ci === 0) w.curves = []; else w.curves = w.curves.filter((_, i) => i !== s.ci); S.sel = { t: 'well', uid: w.uid }; delete S.logView[w.uid]; }
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
    optimize() { openDoc('opt:' + selWell().uid); },
    optAll() { openDoc('optall'); },
    tech() { openDoc('tech'); },
    ml() { openDoc('ml'); },
    importSurvey() { $('#fileSurvey').click(); },
    importDst() { $('#fileDst').click(); },
    undo() {
      const snap = S.undo.pop(); if (!snap) return;
      const p = JSON.parse(snap.json);
      p.wells.forEach((w) => { w.curves = snap.curves.get(w.uid) || []; });
      S.project = p; S.result = null;
      if (S.sel && S.sel.uid && !wellBy(S.sel.uid)) S.sel = { t: 'project' };
      log(t('msg.undo'));
      touch(); renderAll();
    },
    sens() { openDoc('sens'); },
    exportRank() {
      const r = screen();
      const rows = r.ranked.map((w, i) => ({ rank: i + 1, id: w.id, name: w.name, location: w.location, depth_m: w.depth, gradient_c100m: w.G.toFixed(2), g_source: srcOf(w), t_bottom_c: w.Tbottom.toFixed(1), t_out_c: w.Tout.toFixed(1), q_kw: w.Q.toFixed(0), q_p10_kw: w.mc.p10.toFixed(0), q_p90_kw: w.mc.p90.toFixed(0), integrity: w.integrity, distance_km: w.distance, capex_bn_vnd: w.eco.capex.toFixed(2), npv_bn_vnd: w.eco.npv.toFixed(2), lcoh_vnd_kwh: w.eco.lcoh.toFixed(0), suggested_use: t(w.use), score: w.score }));
      download(safeName(S.project.name) + '_ranking.csv', toCSV(rows, Object.keys(rows[0] || { rank: 1 })), 'text/csv');
    },
    logPlot() { openDoc('log:' + selWell().uid); },
    guide() { openDoc('guide'); },
    about() { dialog(t('about.title'), t('about.body') + `<p class="hint">${t('start.version')} ${APP_VERSION} · ${APP_DATE}</p>`, [{ label: t('dlg.close'), primary: true }]); },
    async lasHelp() {
      const r = await dialog(t('help.title'), t('help.body'), [{ label: t('help.csvTpl'), value: 'tpl' }, { label: t('b.sample'), value: 'las' }, { label: t('dlg.close'), primary: true }]);
      if (r === 'tpl') download('abandonedwell_template.csv', toCSV(DEMO_WELLS, WELL_COLS), 'text/csv');
      if (r === 'las') ACT.sample();
    },
    sample() {
      const w = newWellObj({ id: 'SAMPLE-1', name: 'SAMPLE-1', field: 'DEMO', bht_c: 118, curves: L.synthLogs(500, 3000, 0.5, 3.3, 99), nullValue: -999.25 });
      download('sample_SAMPLE-1.las', L.writeLAS(w));
    },
    /** Open the Volve project: reuse the one saved in this browser, otherwise build it from data/volve.json. */
    async volve(opts = {}) {
      let D;
      try { D = await loadVolve(); } catch (e) { log(t('volve.loadErr', { e: e.message }), 'err'); return; }
      if (S.project && S.project.source === 'volve' && S.project.wells.length) { if (!opts.stay) openDoc('rank'); return; }
      if (S.project) await Store.put(S.project);
      const saved = (await Store.all()).filter((q) => q.source === 'volve' && q.wells.length).sort((x, y) => y.updated - x.updated)[0];
      if (saved) { openProject(saved, 'msg.opened'); log(t('volve.reopen'), 'ok'); if (!opts.stay) openDoc('rank'); return; }
      const p = volveProject(D); await Store.put(p);
      openProject(p, 'msg.opened');
      log(t('volve.loaded', { n: p.wells.length, k: p.wells.filter((w) => w.gSource === 'lwd').length, s: D.wells.length - p.wells.length }), 'ok');
      log(t('volve.paramsSet', { T0: p.params.T0, Tin: p.params.Tin, Ta: p.params.u_Tamb }));
      if (!opts.stay) openDoc('rank');
    },
    /** Volve data page; without an open project with wells, the Volve project is opened too so the browser tree is never empty. */
    async volveData() {
      if (!S.project || !S.project.wells.length) await ACT.volve({ stay: true });
      openDoc('volve');
    },
    /** Add the Volve wells to the project that is open (e.g. an empty project the user created and named "Volve"). */
    async volveAdd() {
      if (!S.project) return ACT.volve();
      let D;
      try { D = await loadVolve(); } catch (e) { log(t('volve.loadErr', { e: e.message }), 'err'); return; }
      snapshot();
      const P = S.project, empty = !P.wells.length;
      if (empty) { Object.assign(P.params, VOLVE_PARAMS); P.source = 'volve'; }
      const have = new Set(P.wells.map((w) => normWell(w.name)));
      const add = volveProject(D).wells.filter((w) => !have.has(normWell(w.name)));
      add.forEach((w) => P.wells.push(w));
      log(t('volve.added', { n: add.length, p: P.name }), 'ok');
      if (!empty && +P.params.T0 !== VOLVE_PARAMS.T0) log(t('volve.t0Warn', { T0: P.params.T0 }), 'warn');
      S.docs = S.docs.filter((d) => d !== 'start'); touch(); renderAll(); openDoc('rank');
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
    if (!S.project && !['newProject', 'openProject', 'openFile', 'guide', 'about', 'lasHelp', 'sample', 'demo', 'volve', 'volveData', 'volveAdd', 'browser', 'props', 'output', 'clearLog', 'search', 'clearFilter', 'toggleTree'].includes(a)) return;
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
    await importProjectText(await f.text(), f.name);
  };
  /** Open a project from file text; asks before replacing a matching project. Returns the opened project or null. */
  async function importProjectText(text, fname, opts = {}) {
    const f = { name: fname };
    try {
      const p = JSON.parse(text);
      if (!p || !Array.isArray(p.wells)) throw new Error('format');
      p.id = p.id || makeProject('x').id; p.name = p.name || f.name; p.created = p.created || Date.now(); p.updated = Date.now();
      p.wells.forEach((w) => { w.uid = w.uid || uid(); w.curves = w.curves || []; });
      const key = (x) => String(x || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const fileKey = key(f.name.replace(/\.awproj\.json$|\.json$/i, ''));
      const same = (await Store.all()).filter((q) => q.id === p.id || key(q.name) === key(p.name) || (fileKey && key(q.name) && (fileKey.includes(key(q.name)) || key(q.name).includes(fileKey))));
      if (same.length) {
        const old = same.sort((x, y) => y.updated - x.updated)[0];
        const ans = await dialog(t('dlg.replaceTitle'), `<p>${esc(t('dlg.replaceBody', { o: old.name, n: old.wells.length, d: new Date(old.updated).toLocaleString(loc()), f: f.name, m: p.wells.length }))}</p>`,
          [{ label: t('dlg.cancel') }, { label: t('dlg.keepBoth'), value: 'both' }, { label: t('dlg.replace'), primary: true, value: 'replace' }]);
        if (!ans) return null;
        if (ans === 'replace') { p.id = old.id; if (S.project && S.project.id === old.id) S.project = null; }
        else if (same.some((q) => q.id === p.id)) p.id = makeProject('x').id;
      }
      if (S.project) await Store.put(S.project);
      await Store.put(p);
      log(t('msg.importProj', { f: f.name }), 'ok');
      openProject(p, 'msg.opened', opts);
      return p;
    } catch (err) { log(t('msg.lasErr', { f: f.name, e: err.message }), 'err'); return null; }
  }

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
    renderAll(); // draw the workstation immediately; the project store may take a moment
    await Store.open();
    if (!Store.db) log(t('msg.storage'), 'warn');
    log(t('msg.ready'));
    checkVersion();
    const last = lsGet('aw-last');
    if (last) { const p = await Store.get(last); if (p) { openProject(p); return; } }
    renderAll();
  })();
})();
