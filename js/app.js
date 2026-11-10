/* AbandonedWell Energy AI – UI controller */
(function () {
  'use strict';
  const M = window.AWModel;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  /* ---------------- state ---------------- */
  const DEFAULTS = {
    m: 5, Tin: 30, years: 10, T0: 27, k: 2.5, Rw: 0.10, upLoss: 10, sigmaG: 0.3,
    purpose: 'hp', heatPrice: 735, capexOn: 6, capexOff: 25, pipe: 1.5, opex: 3, pump: 15, hours: 8000, rate: 10, life: 25,
    w_thermal: 0.5, w_integrity: 0.25, w_distance: 0.15, w_econ: 0.10, threshold: 60,
  };
  const ELEC_PRICE = 2204; // VND/kWh, retail average from 10/5/2025 [13]
  const PURPOSE_PRICE = { res: 2204, hp: Math.round(2204 / 3) };

  const DEMO = [
    { id: 'A-01', name: 'Giếng A-01', location: 'offshore', depth_m: 4200, gradient_c100m: 3.4, integrity: 'good', distance_km: 0.5 },
    { id: 'A-07', name: 'Giếng A-07', location: 'offshore', depth_m: 3800, gradient_c100m: 3.6, integrity: 'good', distance_km: 1 },
    { id: 'B-03', name: 'Giếng B-03', location: 'onshore', depth_m: 3500, gradient_c100m: 3.1, integrity: 'fair', distance_km: 3 },
    { id: 'B-11', name: 'Giếng B-11', location: 'onshore', depth_m: 3000, gradient_c100m: 3.3, integrity: 'good', distance_km: 2 },
    { id: 'C-02', name: 'Giếng C-02', location: 'onshore', depth_m: 2600, gradient_c100m: 2.9, integrity: 'poor', distance_km: 6 },
    { id: 'C-05', name: 'Giếng C-05', location: 'onshore', depth_m: 2200, gradient_c100m: 2.7, integrity: 'fair', distance_km: 10 },
    { id: 'D-01', name: 'Giếng D-01', location: 'onshore', depth_m: 3200, bht1_c: 112, dt1_h: 6, bht2_c: 121, dt2_h: 12, tc_h: 4, integrity: 'good', distance_km: 4 },
    { id: 'D-02', name: 'Giếng D-02', location: 'onshore', depth_m: 2800, bht_c: 105, integrity: 'fair', distance_km: 8 },
  ];
  const COLS = ['id', 'name', 'location', 'depth_m', 'gradient_c100m', 'bht_c', 'bht1_c', 'dt1_h', 'bht2_c', 'dt2_h', 'tc_h', 'integrity', 'distance_km'];

  let lang = 'vi';
  let wells = [];
  let result = null;
  let charts = {};
  try { lang = new URLSearchParams(location.search).get('lang') || localStorage.getItem('aw-lang') || 'vi'; } catch (e) { /* ignore */ }
  if (!['vi', 'en'].includes(lang)) lang = 'vi';

  const t = (k) => (I18N[lang] && I18N[lang][k]) || I18N.vi[k] || k;
  const loc = () => (lang === 'vi' ? 'vi-VN' : 'en-US');
  const fmt = (x, d = 0) => (isFinite(x) ? Number(x).toLocaleString(loc(), { minimumFractionDigits: d, maximumFractionDigits: d }) : '–');

  /* ---------------- i18n ---------------- */
  function applyLang() {
    document.documentElement.lang = lang;
    $$('[data-i18n]').forEach((el) => {
      const txt = t(el.dataset.i18n);
      if (el.tagName === 'text' && el.dataset.wrap) wrapSvg(el, txt, +el.dataset.wrap);
      else el.textContent = txt;
    });
    $$('.num-loc').forEach((el) => { el.textContent = el.dataset[lang]; });
    $$('.lang button').forEach((b) => b.classList.toggle('on', b.dataset.lang === lang));
    renderStatic();
    renderWellTable();
    if (result) renderResults();
    renderSensitivity();
  }
  function wrapSvg(el, txt, width) {
    const words = txt.split(' '); const lines = []; let cur = '';
    words.forEach((w) => { if ((cur + ' ' + w).trim().length > width && cur) { lines.push(cur); cur = w; } else cur = (cur + ' ' + w).trim(); });
    if (cur) lines.push(cur);
    el.textContent = '';
    const x = el.getAttribute('x');
    lines.forEach((ln, i) => {
      const ts = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
      ts.setAttribute('x', x); ts.setAttribute('dy', i === 0 ? `${-(lines.length - 1) * 0.6}em` : '1.2em');
      ts.textContent = ln; el.appendChild(ts);
    });
  }

  /* ---------------- static tables ---------------- */
  function renderStatic() {
    $('#cmpBody').innerHTML = [1, 2, 3, 4, 5, 6].map((i) => `<tr><td><b>${t('cmp.r' + i)}</b></td>${['a', 'b', 'c', 'd'].map((c) => `<td>${t('cmp.r' + i + c)}</td>`).join('')}</tr>`).join('');
    $('#planBody').innerHTML = [1, 2, 3, 4, 5, 6].map((i) => `<tr><td style="white-space:nowrap"><b>${t('pl.' + i + 't')}</b></td><td>${t('pl.' + i)}</td><td>${t('pl.' + i + 'p')}</td></tr>`).join('');
    const bud = [[1, 2000000, 1], [2, 3000000, 2], [3, 5000000, 3], [4, 4000000, 4], [5, 3000000, 0], [6, 1700000, 0]];
    $('#budgetBody').innerHTML = bud.map(([i, v, n]) => `<tr><td>${t('bd.' + i)}</td><td class="n">${fmt(v)}</td><td>${n ? t('bd.' + n + 'n') : ''}</td></tr>`).join('')
      + `<tr class="total"><td>${t('bd.total')}</td><td class="n">${fmt(18700000)}</td><td></td></tr>`;
    const risks = [['h', 'h'], ['m', 'h'], ['m', 'h'], ['h', 'm'], ['m', 'm'], ['m', 'm']];
    $('#riskBody').innerHTML = risks.map(([a, b], i) => `<tr><td>${t('rk.' + (i + 1))}</td><td class="lv ${a}">${t('lv.' + a)}</td><td class="lv ${b}">${t('lv.' + b)}</td><td>${t('rk.' + (i + 1) + 'm')}</td></tr>`).join('');
  }

  /* ---------------- params ---------------- */
  const PARAM_IDS = { m: 'p_m', Tin: 'p_Tin', years: 'p_years', T0: 'p_T0', k: 'p_k', Rw: 'p_Rw', upLoss: 'p_upLoss', sigmaG: 'p_sigmaG', purpose: 'p_purpose', heatPrice: 'p_heatPrice', capexOn: 'p_capexOn', capexOff: 'p_capexOff', pipe: 'p_pipe', opex: 'p_opex', pump: 'p_pump', hours: 'p_hours', rate: 'p_rate', life: 'p_life', w_thermal: 'w_thermal', w_integrity: 'w_integrity', w_distance: 'w_distance', w_econ: 'w_econ', threshold: 'p_threshold' };
  function setParams(p) { Object.entries(PARAM_IDS).forEach(([k, id]) => { $('#' + id).value = p[k]; }); }
  function readParams() {
    const v = (id, d) => { const x = parseFloat($('#' + id).value); return isFinite(x) ? x : d; };
    const k = v('p_k', 2.5);
    return {
      m: Math.max(0.1, v('p_m', 5)), Tin: v('p_Tin', 30), years: Math.max(0.1, v('p_years', 10)), T0: v('p_T0', 27), k: Math.max(0.3, k), Rw: Math.max(0, v('p_Rw', 0.1)),
      upLoss: Math.min(0.9, Math.max(0, v('p_upLoss', 10) / 100)), sigmaG: Math.max(0, v('p_sigmaG', 0.3)), kMin: Math.max(0.5, k - 0.5), kMax: k + 0.5, mcN: 150,
      maxDist: 20, threshold: v('p_threshold', 60),
      eco: { heatPrice: v('p_heatPrice', 735), capexOn: v('p_capexOn', 6), capexOff: v('p_capexOff', 25), pipeCost: v('p_pipe', 1.5), opexPct: v('p_opex', 3), pumpKW: v('p_pump', 15), hours: v('p_hours', 8000), rate: v('p_rate', 10), life: Math.round(Math.min(50, Math.max(1, v('p_life', 25)))), elecPrice: ELEC_PRICE },
      weights: { thermal: v('w_thermal', 0.5), integrity: v('w_integrity', 0.25), distance: v('w_distance', 0.15), econ: v('w_econ', 0.1) },
    };
  }

  /* ---------------- well table ---------------- */
  function renderWellTable() {
    const tb = $('#wellTable tbody');
    if (!wells.length) { tb.innerHTML = `<tr><td colspan="10" class="empty">${t('msg.noWells')}</td></tr>`; return; }
    const val = (x) => (x === undefined || x === null || Number.isNaN(x) ? '' : String(x));
    tb.innerHTML = wells.map((w, i) => `
      <tr data-i="${i}">
        <td><input data-f="id" value="${esc(val(w.id))}" style="min-width:60px"></td>
        <td><input data-f="name" value="${esc(val(w.name))}" style="min-width:110px"></td>
        <td><select data-f="location"><option value="onshore"${w.location !== 'offshore' ? ' selected' : ''}>${t('loc.onshore')}</option><option value="offshore"${w.location === 'offshore' ? ' selected' : ''}>${t('loc.offshore')}</option></select></td>
        <td><input data-f="depth_m" type="number" step="50" value="${val(w.depth_m)}"></td>
        <td><input data-f="gradient_c100m" type="number" step="0.1" value="${val(w.gradient_c100m)}"></td>
        <td><input data-f="bht_c" type="number" step="1" value="${val(w.bht_c)}"></td>
        <td><div class="horner">${['bht1_c', 'dt1_h', 'bht2_c', 'dt2_h', 'tc_h'].map((f) => `<input data-f="${f}" type="number" step="any" value="${val(w[f])}" placeholder="${f.split('_')[0]}">`).join('')}</div></td>
        <td><select data-f="integrity">${['good', 'fair', 'poor'].map((g) => `<option value="${g}"${w.integrity === g ? ' selected' : ''}>${t('int.' + g)}</option>`).join('')}</select></td>
        <td><input data-f="distance_km" type="number" step="0.5" value="${val(w.distance_km)}"></td>
        <td><button class="del" title="✕" data-del="${i}">✕</button></td>
      </tr>`).join('');
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

  $('#wellTable').addEventListener('input', (e) => {
    const f = e.target.dataset.f; const tr = e.target.closest('tr'); if (!f || !tr) return;
    const w = wells[+tr.dataset.i];
    const numeric = !['id', 'name', 'location', 'integrity'].includes(f);
    w[f] = numeric ? (e.target.value === '' ? undefined : parseFloat(e.target.value)) : e.target.value;
    scheduleRun();
  });
  $('#wellTable').addEventListener('click', (e) => {
    const d = e.target.dataset.del; if (d === undefined) return;
    wells.splice(+d, 1); renderWellTable(); scheduleRun();
  });

  /* ---------------- CSV ---------------- */
  function parseCSV(text) {
    text = text.replace(/^﻿/, '');
    const firstLine = text.split(/\r?\n/)[0];
    const delim = (firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length ? ';' : ',';
    const rows = []; let row = [], cell = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
      else if (c === '"') q = true;
      else if (c === delim) { row.push(cell); cell = ''; }
      else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
      else cell += c;
    }
    if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
    const head = rows.shift().map((h) => h.trim().toLowerCase());
    if (!head.includes('depth_m')) throw new Error('no depth_m');
    return rows.filter((r) => r.some((c) => c.trim() !== '')).map((r) => {
      const o = {};
      head.forEach((h, i) => {
        const v = (r[i] || '').trim();
        if (['id', 'name', 'location', 'integrity', 'field'].includes(h)) o[h] = v;
        else if (v !== '') o[h] = parseFloat(v.replace(',', '.'));
      });
      if (!o.location) o.location = 'onshore';
      o.location = /off|ngoài/i.test(o.location) ? 'offshore' : 'onshore';
      const ig = (o.integrity || 'fair').toLowerCase();
      o.integrity = /good|tốt/.test(ig) ? 'good' : /poor|kém/.test(ig) ? 'poor' : 'fair';
      return o;
    });
  }
  function toCSV(rows, cols) {
    const q = (v) => { const s = v === undefined || v === null || (typeof v === 'number' && !isFinite(v)) ? '' : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    return '﻿' + [cols.join(',')].concat(rows.map((r) => cols.map((c) => q(r[c])).join(','))).join('\n');
  }
  function download(name, text) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
    a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  $('#btnDemo').onclick = () => { wells = DEMO.map((w) => Object.assign({}, w)); renderWellTable(); run(); };
  $('#btnAdd').onclick = () => { wells.push({ id: 'W-' + (wells.length + 1), name: '', location: 'onshore', integrity: 'fair', distance_km: 5 }); renderWellTable(); };
  $('#btnClear').onclick = () => { wells = []; result = null; renderWellTable(); renderResults(); };
  $('#btnTemplate').onclick = () => download('abandonedwell_template.csv', toCSV(DEMO, COLS));
  $('#fileCsv').onchange = (e) => {
    const f = e.target.files[0]; if (!f) return;
    const rd = new FileReader();
    rd.onload = () => { try { wells = parseCSV(rd.result); renderWellTable(); run(); } catch (err) { alert(t('msg.csvErr')); } e.target.value = ''; };
    rd.readAsText(f, 'utf-8');
  };
  $('#btnExport').onclick = () => {
    if (!result) return;
    const rows = result.ranked.map((w, i) => ({
      rank: i + 1, id: w.id, name: w.name, location: w.location, depth_m: w.depth, gradient_c100m: w.G.toFixed(2), g_source: w.gSource,
      t_bottom_c: w.Tbottom.toFixed(1), t_out_c: w.Tout.toFixed(1), q_kw: w.Q.toFixed(0), q_p10_kw: w.mc.p10.toFixed(0), q_p90_kw: w.mc.p90.toFixed(0),
      integrity: w.integrity, distance_km: w.distance, capex_bn_vnd: w.eco.capex.toFixed(2), npv_bn_vnd: w.eco.npv.toFixed(2), lcoh_vnd_kwh: w.eco.lcoh.toFixed(0),
      suggested_use: t(w.use), score: w.score,
    }));
    download('abandonedwell_ranking.csv', toCSV(rows, Object.keys(rows[0] || { rank: 1 })));
  };

  /* ---------------- run ---------------- */
  let timer = null;
  function scheduleRun() { clearTimeout(timer); timer = setTimeout(() => { if (wells.length) run(); renderSensitivity(); }, 350); }
  function run() {
    if (!wells.length) { result = null; renderResults(); return; }
    result = M.screen(wells, readParams());
    renderResults();
  }
  $('#btnRun').onclick = () => { run(); $('#rankTable').scrollIntoView({ behavior: 'smooth', block: 'center' }); };
  $('#btnReset').onclick = () => { setParams(DEFAULTS); scheduleRun(); };
  $$('.params input, .params select').forEach((el) => el.addEventListener('input', () => {
    if (el.id === 'p_purpose' && el.value !== 'custom') $('#p_heatPrice').value = PURPOSE_PRICE[el.value];
    if (el.id === 'p_heatPrice') $('#p_purpose').value = 'custom';
    scheduleRun();
  }));

  function renderResults() {
    const P = readParams();
    $('#k_thr').textContent = fmt(P.threshold);
    const tb = $('#rankTable tbody');
    const inv = $('#invalidMsg');
    if (!result || !result.ranked.length) {
      tb.innerHTML = `<tr><td colspan="14" class="empty">${t('tool.empty')}</td></tr>`;
      ['#k_n', '#k_pass', '#k_q', '#k_e'].forEach((s) => { $(s).textContent = '–'; });
      inv.hidden = !(result && result.invalid.length);
      if (result && result.invalid.length) inv.textContent = t('tool.invalid').replace('{n}', result.invalid.length).replace('{list}', result.invalid.map((w) => w.id || '?').join(', '));
      return;
    }
    const pass = result.ranked.filter((w) => w.score >= P.threshold);
    const qPass = pass.reduce((s, w) => s + w.Q, 0);
    $('#k_n').textContent = fmt(result.ranked.length);
    $('#k_pass').textContent = fmt(pass.length);
    $('#k_q').textContent = qPass >= 1000 ? fmt(qPass / 1000, 2) + ' MW' : fmt(qPass) + ' kW';
    $('#k_e').textContent = fmt(qPass * P.eco.hours / 1e6, 1) + ' GWh';
    inv.hidden = !result.invalid.length;
    if (result.invalid.length) inv.textContent = t('tool.invalid').replace('{n}', result.invalid.length).replace('{list}', result.invalid.map((w) => w.id || '?').join(', '));
    tb.innerHTML = result.ranked.map((w, i) => {
      const ok = w.score >= P.threshold;
      return `<tr class="${ok ? 'pass' : ''}">
        <td>${i + 1}</td><td><b>${esc(w.name || w.id)}</b><br><small class="hint">${t('loc.' + w.location)}</small></td>
        <td class="n">${fmt(w.depth)}</td><td class="n">${fmt(w.G, 2)}</td><td><span class="src ${w.gSource}">${t('src.' + w.gSource)}</span></td>
        <td class="n">${fmt(w.Tbottom)}</td><td class="n">${fmt(w.Tout, 1)}</td><td class="n"><b>${fmt(w.Q)}</b></td>
        <td class="n">${fmt(w.mc.p10)}–${fmt(w.mc.p90)}</td>
        <td><span class="badge ${w.integrity}">${t('int.' + w.integrity)}</span></td>
        <td class="n ${w.eco.npv < 0 ? 'npv-neg' : 'npv-pos'}">${fmt(w.eco.npv, 1)}</td>
        <td class="use">${t(w.use)}</td>
        <td><div class="bar ${ok ? 'pass' : ''}"><i><b style="width:${w.score}%"></b></i><span>${w.score}</span></div></td>
        <td><button class="btn sm ghost" data-detail="${i}">${t('r.detail')}</button></td></tr>`;
    }).join('');
  }
  $('#rankTable').addEventListener('click', (e) => { const d = e.target.dataset.detail; if (d !== undefined) openReport(result.ranked[+d]); });

  /* ---------------- charts ---------------- */
  Chart.defaults.font.family = '"Be Vietnam Pro", system-ui, sans-serif';
  Chart.defaults.color = '#4a5867';
  Chart.defaults.borderColor = '#e3e8ee';
  function mkChart(id, cfg) { if (charts[id]) charts[id].destroy(); charts[id] = new Chart(document.getElementById(id), cfg); return charts[id]; }
  const numTick = (d = 0) => (v) => fmt(v, d);

  function flowSweep(base) {
    const ms = [0.5, 1, 1.5, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12];
    return ms.map((m) => Object.assign({ m }, M.wellOutput(Object.assign({}, base, { m }))));
  }
  function flowChart(id, base) {
    const s = flowSweep(base);
    return mkChart(id, {
      type: 'line',
      data: { labels: s.map((r) => r.m), datasets: [
        { label: t('ch.q'), data: s.map((r) => r.Q), borderColor: '#e07b1f', backgroundColor: '#e07b1f', yAxisID: 'y', tension: .3 },
        { label: t('ch.tout'), data: s.map((r) => r.Tout), borderColor: '#1f6fb2', backgroundColor: '#1f6fb2', yAxisID: 'y1', tension: .3, borderDash: [5, 4] },
      ] },
      options: { maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
        plugins: { tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${fmt(c.parsed.y, c.datasetIndex ? 1 : 0)}` } } },
        scales: { x: { title: { display: true, text: t('ch.flow') }, ticks: { callback: function (v) { return fmt(this.getLabelForValue(v), 1); } } },
          y: { position: 'left', title: { display: true, text: t('ch.q') }, ticks: { callback: numTick() } },
          y1: { position: 'right', grid: { drawOnChartArea: false }, title: { display: true, text: t('ch.tout') }, ticks: { callback: numTick() } } } },
    });
  }

  /* ---------------- report modal ---------------- */
  function openReport(w) {
    const P = readParams();
    $('#m_name').textContent = w.name || w.id;
    const recCls = w.score >= P.threshold ? 'go' : w.score >= P.threshold * 0.6 ? '' : 'no';
    const recTxt = recCls === 'go' ? t('det.recGo') : recCls === '' ? t('det.recMaybe') : t('det.recNo');
    const subs = [['p.wT', w.subScores.thermal], ['p.wI', w.subScores.integrity], ['p.wD', w.subScores.distance], ['p.wE', w.subScores.econ]];
    $('#m_body').innerHTML = `
      <div class="facts">
        <div class="fact"><span>${t('r.score')}</span><b>${w.score}/100</b></div>
        <div class="fact"><span>${t('r.q')}</span><b>${fmt(w.Q)}</b> <small class="hint">P10–P90: ${fmt(w.mc.p10)}–${fmt(w.mc.p90)}</small></div>
        <div class="fact"><span>${t('r.tout')}</span><b>${fmt(w.Tout, 1)}</b></div>
        <div class="fact"><span>${t('r.npv')}</span><b class="${w.eco.npv < 0 ? 'npv-neg' : 'npv-pos'}">${fmt(w.eco.npv, 1)}</b></div>
      </div>
      <div class="rec ${recCls}"><b>${t('det.rec')}:</b> ${recTxt}<br><b>${t('r.use')}:</b> ${t(w.use)}</div>
      <div class="rep-grid">
        <div class="panel"><h3>${t('det.summary')}</h3>
          <table class="kv">
            <tr><td>${t('col.loc')}</td><td>${t('loc.' + w.location)}</td></tr>
            <tr><td>${t('r.depth')}</td><td>${fmt(w.depth)}</td></tr>
            <tr><td>${t('r.g')}</td><td>${fmt(w.G, 2)}</td></tr>
            <tr><td>${t('det.gsrc')}</td><td>${t('src.' + w.gSource)}</td></tr>
            ${isFinite(w.Tstatic) ? `<tr><td>${t('det.tstatic')}</td><td>${fmt(w.Tstatic, 1)} °C</td></tr>` : ''}
            <tr><td>${t('r.tb')}</td><td>${fmt(w.Tbottom, 1)}</td></tr>
            <tr><td>${t('r.integ')}</td><td><span class="badge ${w.integrity}">${t('int.' + w.integrity)}</span></td></tr>
            <tr><td>${t('col.dist')}</td><td>${fmt(w.distance, 1)}</td></tr>
            <tr><td>${t('det.energy')}</td><td>${fmt(w.eco.Qy[0] * P.eco.hours / 1000)} MWhth</td></tr>
            <tr><td>${t('det.capex')}</td><td>${fmt(w.eco.capex, 1)} ${lang === 'vi' ? 'tỷ đ' : 'bn VND'}</td></tr>
            <tr><td>${t('det.lcoh')}</td><td>${fmt(w.eco.lcoh)} ${lang === 'vi' ? 'đ/kWhth' : 'VND/kWhth'}</td></tr>
            <tr><td>${t('det.payback')}</td><td>${w.eco.payback ? w.eco.payback + ' ' + t('det.yr') : t('det.never')}</td></tr>
          </table>
          <h3 class="mt">${t('det.subs')}</h3>
          <ul class="subs">${subs.map(([k, v]) => `<li><span>${t(k)}</span><div class="bar"><i><b style="width:${Math.round(v * 100)}%"></b></i></div><span>${Math.round(v * 100)}</span></li>`).join('')}</ul>
        </div>
        <div class="panel"><h3>${t('det.profile')}</h3><div class="chart-box" style="height:360px"><canvas id="chProfile"></canvas></div></div>
        <div class="panel"><h3>${t('det.flow')}</h3><div class="chart-box"><canvas id="chFlow"></canvas></div></div>
        <div class="panel"><h3>${t('det.decline')}</h3><div class="chart-box"><canvas id="chDecline"></canvas></div></div>
      </div>
      <p class="hint mt">${t('det.disclaimer')}</p>`;
    $('#modal').hidden = false;
    document.body.style.overflow = 'hidden';

    const prof = M.wellOutput(Object.assign({}, w.base, { profile: true }));
    mkChart('chProfile', {
      type: 'scatter',
      data: { datasets: [
        { label: t('ch.rock'), data: prof.z.map((z, i) => ({ x: prof.Trock[i], y: z })), showLine: true, pointRadius: 0, borderColor: '#b3261e', borderWidth: 2.5 },
        { label: t('ch.fluid'), data: prof.z.map((z, i) => ({ x: prof.Tfluid[i], y: z })), showLine: true, pointRadius: 0, borderColor: '#1f6fb2', borderWidth: 2.5, borderDash: [6, 4] },
      ] },
      options: { maintainAspectRatio: false,
        plugins: { tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${fmt(c.parsed.x, 1)} °C @ ${fmt(c.parsed.y)} m` } } },
        scales: { y: { reverse: true, min: 0, title: { display: true, text: t('ch.depth') }, ticks: { callback: numTick() } }, x: { title: { display: true, text: t('ch.temp') }, ticks: { callback: numTick() } } } },
    });
    flowChart('chFlow', w.base);
    mkChart('chDecline', {
      data: { labels: w.eco.years, datasets: [
        { type: 'bar', label: t('ch.q'), data: w.eco.Qy, backgroundColor: 'rgba(224,123,31,.55)', yAxisID: 'y' },
        { type: 'line', label: t('ch.cum'), data: w.eco.cumCash, borderColor: '#0f4c75', backgroundColor: '#0f4c75', pointRadius: 0, yAxisID: 'y1', tension: .2 },
      ] },
      options: { maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
        plugins: { tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${fmt(c.parsed.y, c.datasetIndex ? 1 : 0)}` } } },
        scales: { x: { title: { display: true, text: t('ch.year') } }, y: { title: { display: true, text: t('ch.q') }, ticks: { callback: numTick() } },
          y1: { position: 'right', grid: { drawOnChartArea: false }, title: { display: true, text: t('ch.cum') }, ticks: { callback: numTick() } } } },
    });
  }
  function closeModal() { $('#modal').hidden = true; document.body.style.overflow = ''; }
  $('#btnClose').onclick = closeModal;
  $('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal') closeModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('#modal').hidden) closeModal(); });
  $('#btnPrint').onclick = () => window.print();

  /* ---------------- sensitivity ---------------- */
  function heatColor(f) {
    const stops = [[255, 247, 224], [253, 196, 120], [238, 120, 45], [196, 46, 30], [122, 18, 22]];
    const x = Math.max(0, Math.min(1, f)) * (stops.length - 1); const i = Math.min(stops.length - 2, Math.floor(x)); const r = x - i;
    const c = stops[i].map((v, j) => Math.round(v + r * (stops[i + 1][j] - v)));
    return { bg: `rgb(${c})`, fg: f > 0.55 ? '#fff' : '#2a1a0a' };
  }
  function renderSensitivity() {
    const P = readParams();
    const base = { T0: P.T0, k: P.k, m: P.m, Tin: P.Tin, years: P.years, Rw: P.Rw, upLoss: P.upLoss, n: 300 };
    const depths = [1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000];
    const Gs = [2.6, 2.8, 3.0, 3.2, 3.4, 3.6, 3.8, 4.0];
    const grid = depths.map((L) => Gs.map((G) => M.wellOutput(Object.assign({}, base, { L, G })).Q));
    const all = grid.flat(); const qMin = Math.min(...all), qMax = Math.max(...all);
    const hm = $('#heatmap');
    hm.style.gridTemplateColumns = `64px repeat(${Gs.length}, 1fr)`;
    let html = `<div class="hl">${lang === 'vi' ? 'Sâu \\ G' : 'Depth \\ G'}</div>` + Gs.map((g) => `<div class="hl">${fmt(g, 1)}</div>`).join('');
    depths.slice().reverse().forEach((L) => {
      const row = grid[depths.indexOf(L)];
      html += `<div class="hl">${fmt(L)}</div>` + row.map((q, j) => { const c = heatColor((q - qMin) / (qMax - qMin || 1)); return `<div class="hc" style="background:${c.bg};color:${c.fg}" title="L=${fmt(L)} m, G=${fmt(Gs[j], 1)} → ${fmt(q)} kW">${fmt(q)}</div>`; }).join('');
    });
    html += `<div class="ax">${t('ch.depth')} × G (°C/100 m) · m = ${fmt(P.m, 1)} kg/s · ${fmt(P.years)} ${t('det.yr')}</div>`;
    hm.innerHTML = html;

    const rows = [[2000, 2.8], [2000, 3.6], [3000, 2.8], [3000, 3.6], [4000, 2.8], [4000, 3.3], [4000, 3.6]];
    $('#t41 tbody').innerHTML = rows.map(([L, G]) => {
      const r = M.wellOutput(Object.assign({}, base, { L, G, n: 600 }));
      return `<tr><td class="n">${fmt(L)}</td><td class="n">${fmt(G, 1)}</td><td class="n">${fmt(r.Tbottom)}</td><td class="n">${fmt(r.Tout, 1)}</td><td class="n"><b>${fmt(r.Q)}</b></td><td class="n">${fmt(r.Q * P.eco.hours / 1000)}</td></tr>`;
    }).join('');
    flowChart('chFlowRef', Object.assign({}, base, { L: 4000, G: 3.3, n: 600 }));
  }

  /* ---------------- nav ---------------- */
  $$('.lang button').forEach((b) => b.addEventListener('click', () => { lang = b.dataset.lang; try { localStorage.setItem('aw-lang', lang); } catch (e) { /* ignore */ } applyLang(); }));
  $('#menuBtn').onclick = () => $('#nav').classList.toggle('open');
  $$('#nav a').forEach((a) => a.addEventListener('click', () => $('#nav').classList.remove('open')));
  const secs = $$('main section[id]');
  const obs = new IntersectionObserver((ents) => ents.forEach((en) => {
    if (en.isIntersecting) $$('#nav a').forEach((a) => a.classList.toggle('active', a.getAttribute('href') === '#' + en.target.id));
  }), { rootMargin: '-45% 0px -50% 0px' });
  secs.forEach((s) => obs.observe(s));

  /* ---------------- init ---------------- */
  setParams(DEFAULTS);
  wells = DEMO.map((w) => Object.assign({}, w));
  result = M.screen(wells, readParams());
  applyLang();
})();
