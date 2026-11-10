/* LAS 2.0 reader / writer + curve utilities + IndexedDB project store */
(function (global) {
  'use strict';

  /* ---------------- curve families ---------------- */
  const FAMILY_RULES = [
    [/^(DEPT|DEPTH|MD|TVD|TVDSS|INDEX)$/i, 'Depth'],
    [/^(GR|SGR|CGR|GRC|GR_.*|HGR)$/i, 'Gamma Ray'],
    [/^(RHOB|RHOZ|DEN|ZDEN|RHO)$/i, 'Bulk Density'],
    [/^(NPHI|TNPH|NPOR|CNC|PHIN|NEU)$/i, 'Neutron Porosity'],
    [/^(DT|DTC|AC|DTCO|DT4P)$/i, 'Sonic'],
    [/^(DTS|DTSM)$/i, 'Shear Sonic'],
    [/^(RT|ILD|LLD|RD|RDEP|AT90|RLA5|HDRS|RES.*|ILM|LLS|RM|MSFL|RXO|RS)$/i, 'Resistivity'],
    [/^(CALI|CAL|HCAL|C1|C2)$/i, 'Caliper'],
    [/^(SP|SSP)$/i, 'Spontaneous Potential'],
    [/^(PEF|PE|PEFZ)$/i, 'Photoelectric'],
    [/^(TEMP|MTEMP|TMP|BHT|TEMPC|TEMPF|WTEP|ETEMP|FTEMP)$/i, 'Temperature'],
    [/^(DRHO|HDRA)$/i, 'Density Correction'],
    [/^(VSH|VCL)$/i, 'Shale Volume'],
    [/^(PHIE|PHIT|POR)$/i, 'Porosity'],
    [/^(SW|SWE|SWT)$/i, 'Water Saturation'],
  ];
  const FAMILIES = ['Depth', 'Gamma Ray', 'Bulk Density', 'Neutron Porosity', 'Sonic', 'Shear Sonic', 'Resistivity', 'Caliper', 'Spontaneous Potential', 'Photoelectric', 'Temperature', 'Density Correction', 'Shale Volume', 'Porosity', 'Water Saturation', 'Unknown'];

  function familyOf(mnem, unit) {
    for (const [re, fam] of FAMILY_RULES) if (re.test(mnem)) return fam;
    if (/^deg|°c|°f|degc|degf$/i.test(unit || '')) return 'Temperature';
    if (/^ohm/i.test(unit || '')) return 'Resistivity';
    if (/^gapi|api$/i.test(unit || '')) return 'Gamma Ray';
    return 'Unknown';
  }

  /* ---------------- reader ---------------- */
  function parseHeaderLine(line) {
    const dot = line.indexOf('.');
    if (dot < 0) return null;
    const colon = line.lastIndexOf(':');
    const mnem = line.slice(0, dot).trim();
    const rest = colon > dot ? line.slice(dot + 1, colon) : line.slice(dot + 1);
    const desc = colon > dot ? line.slice(colon + 1).trim() : '';
    const m = rest.match(/^(\S*)\s*(.*)$/);
    let unit = m ? m[1] : '';
    let value = m ? m[2].trim() : '';
    // a space right after the dot means "no unit"
    if (rest[0] === ' ' || rest[0] === '\t') { value = rest.trim(); unit = ''; }
    return { mnem, unit, value, desc };
  }

  function parseLAS(text, fileName) {
    const lines = text.replace(/^﻿/, '').split(/\r?\n/);
    let sec = '';
    const version = {}, well = {}, params = {}, curves = [];
    const nums = [];
    for (const raw of lines) {
      const line = raw.replace(/\t/g, ' ');
      const tr = line.trim();
      if (!tr || tr[0] === '#') continue;
      if (tr[0] === '~') { sec = tr[1] ? tr[1].toUpperCase() : ''; continue; }
      if (sec === 'A') {
        const parts = tr.split(/[\s,]+/);
        for (const p of parts) nums.push(parseFloat(p));
        continue;
      }
      const h = parseHeaderLine(line);
      if (!h || !h.mnem) continue;
      const key = h.mnem.toUpperCase();
      if (sec === 'V') version[key] = h.value;
      else if (sec === 'W') well[key] = h;
      else if (sec === 'P') params[key] = h;
      else if (sec === 'C') curves.push({ mnemonic: h.mnem, unit: h.unit, desc: h.desc || h.value, family: familyOf(h.mnem, h.unit), data: [] });
    }
    if (!curves.length) throw new Error('No ~Curve section');
    if (!nums.length) throw new Error('No ~ASCII data');
    const wv = (k) => { const h = well[k]; if (!h) return ''; return (h.value || h.desc || '').trim(); };
    const nullVal = parseFloat(wv('NULL'));
    const nul = isFinite(nullVal) ? nullVal : -999.25;
    const n = curves.length;
    const rows = Math.floor(nums.length / n);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < n; c++) {
        const v = nums[r * n + c];
        curves[c].data.push(!isFinite(v) || Math.abs(v - nul) < 1e-6 ? null : v);
      }
    }
    // depth in metres
    const dc = curves[0];
    let depthConverted = false;
    if (/^f/i.test(dc.unit)) {
      dc.data = dc.data.map((v) => (v === null ? null : v * 0.3048));
      dc.unit = 'm'; depthConverted = true;
    }
    if (!dc.unit) dc.unit = 'm';
    dc.family = 'Depth';
    return {
      fileName: fileName || '',
      version: version.VERS || '',
      wrap: version.WRAP || '',
      wellName: wv('WELL') || (fileName || 'WELL').replace(/\.las$/i, ''),
      uwi: wv('UWI'), field: wv('FLD'), location: wv('LOC'), company: wv('COMP'), country: wv('CTRY'),
      nullValue: nul, depthConverted, rows,
      params: Object.fromEntries(Object.entries(params).map(([k, h]) => [k, { value: h.value, unit: h.unit, desc: h.desc }])),
      curves,
    };
  }

  /* ---------------- writer ---------------- */
  function writeLAS(w) {
    const pad = (s, n) => String(s).padEnd(n);
    const dc = w.curves[0];
    const d = dc.data.filter((v) => v !== null);
    const nul = isFinite(w.nullValue) ? w.nullValue : -999.25;
    const step = d.length > 1 ? (d[d.length - 1] - d[0]) / (d.length - 1) : 0;
    const out = [];
    out.push('~VERSION INFORMATION');
    out.push(' VERS.                 2.0 : CWLS LOG ASCII STANDARD - VERSION 2.0');
    out.push(' WRAP.                  NO : ONE LINE PER DEPTH STEP');
    out.push('~WELL INFORMATION');
    out.push(` STRT.M ${pad(d[0].toFixed(4), 14)} : START DEPTH`);
    out.push(` STOP.M ${pad(d[d.length - 1].toFixed(4), 14)} : STOP DEPTH`);
    out.push(` STEP.M ${pad(step.toFixed(4), 14)} : STEP`);
    out.push(` NULL.  ${pad(nul, 14)} : NULL VALUE`);
    out.push(` WELL.  ${pad(w.name || w.id, 14)} : WELL`);
    out.push(` FLD .  ${pad(w.field || '', 14)} : FIELD`);
    if (isFinite(w.bht_c) || Object.keys(w.lasParams || {}).length) {
      out.push('~PARAMETER INFORMATION');
      if (isFinite(w.bht_c)) out.push(` BHT .DEGC ${pad(w.bht_c, 12)} : BOTTOM HOLE TEMPERATURE`);
    }
    out.push('~CURVE INFORMATION');
    w.curves.forEach((c) => out.push(` ${pad(c.mnemonic, 8)}.${pad(c.unit || '', 8)} : ${c.desc || c.family}`));
    out.push('~A ' + w.curves.map((c) => pad(c.mnemonic, 11)).join(''));
    for (let i = 0; i < dc.data.length; i++) {
      out.push(w.curves.map((c) => { const v = c.data[i]; return pad(v === null || v === undefined ? nul : +v.toFixed(4), 11); }).join(' '));
    }
    return out.join('\n') + '\n';
  }

  /* ---------------- utilities ---------------- */
  function curveStats(data) {
    let min = Infinity, max = -Infinity, valid = 0;
    for (const v of data) { if (v === null || !isFinite(v)) continue; valid++; if (v < min) min = v; if (v > max) max = v; }
    return { min: valid ? min : NaN, max: valid ? max : NaN, valid, total: data.length };
  }

  /** Linear regression of a temperature log vs depth → gradient °C/100 m. */
  function gradientFromLog(depth, temp, unit) {
    const toC = /f/i.test(unit || '') && !/c/i.test(unit || '') ? (v) => (v - 32) / 1.8 : (v) => v;
    let n = 0, sx = 0, sy = 0, sxx = 0, sxy = 0, zmin = Infinity, zmax = -Infinity, tmax = -Infinity;
    for (let i = 0; i < depth.length; i++) {
      const z = depth[i], tv = temp[i];
      if (z === null || tv === null || !isFinite(z) || !isFinite(tv)) continue;
      const T = toC(tv);
      n++; sx += z; sy += T; sxx += z * z; sxy += z * T;
      zmin = Math.min(zmin, z); zmax = Math.max(zmax, z); tmax = Math.max(tmax, T);
    }
    if (n < 20 || zmax - zmin < 300) return null;
    const slope = (n * sxy - sx * sy) / (n * sxx - sx * sx);
    const G = slope * 100;
    if (!(G > 0.3 && G < 12)) return null;
    return { G, n, zmin, zmax, tmax };
  }

  /* ---------------- synthetic demo logs ---------------- */
  function rng(seed) { return function () { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function synthLogs(top, bottom, step, G, seed) {
    const r = rng(seed);
    const dep = [], gr = [], rhob = [], nphi = [], dt = [], rt = [], temp = [];
    let sh = 0.5;
    for (let z = top; z <= bottom + 1e-9; z += step) {
      if (r() < 0.04) sh = r() < 0.5 ? 0.15 + 0.2 * r() : 0.6 + 0.35 * r();
      const v = Math.min(1, Math.max(0, sh + 0.06 * (r() - 0.5)));
      const comp = (z - top) / (bottom - top);
      const phi = Math.max(0.03, (0.30 - 0.18 * comp) * (1 - 0.6 * v) + 0.02 * (r() - 0.5));
      dep.push(+z.toFixed(2));
      gr.push(+(25 + 110 * v + 8 * (r() - 0.5)).toFixed(2));
      rhob.push(+(2.71 - 1.71 * phi + 0.05 * v + 0.02 * (r() - 0.5)).toFixed(3));
      nphi.push(+(phi + 0.18 * v + 0.01 * (r() - 0.5)).toFixed(3));
      dt.push(+(55 + 130 * phi + 15 * v + 2 * (r() - 0.5)).toFixed(2));
      rt.push(+Math.pow(10, 0.3 + 1.6 * (1 - v) * (0.3 + comp) + 0.15 * (r() - 0.5)).toFixed(3));
      temp.push(+(27 + (G / 100) * z - 6 * comp + 0.6 * (r() - 0.5)).toFixed(2));
    }
    return [
      { mnemonic: 'DEPT', unit: 'm', desc: 'Measured depth', family: 'Depth', data: dep },
      { mnemonic: 'GR', unit: 'gAPI', desc: 'Gamma ray', family: 'Gamma Ray', data: gr },
      { mnemonic: 'RHOB', unit: 'g/cm3', desc: 'Bulk density', family: 'Bulk Density', data: rhob },
      { mnemonic: 'NPHI', unit: 'v/v', desc: 'Neutron porosity', family: 'Neutron Porosity', data: nphi },
      { mnemonic: 'DT', unit: 'us/ft', desc: 'Compressional slowness', family: 'Sonic', data: dt },
      { mnemonic: 'RT', unit: 'ohm.m', desc: 'Deep resistivity', family: 'Resistivity', data: rt },
      { mnemonic: 'TEMP', unit: 'degC', desc: 'Borehole temperature (synthetic)', family: 'Temperature', data: temp },
    ];
  }

  /* ---------------- IndexedDB store ---------------- */
  const Store = {
    db: null, mem: new Map(),
    open() {
      return new Promise((res) => {
        try {
          const rq = indexedDB.open('abandonedwell-ai', 1);
          rq.onupgradeneeded = () => rq.result.createObjectStore('projects', { keyPath: 'id' });
          rq.onsuccess = () => { this.db = rq.result; res(); };
          rq.onerror = () => res();
        } catch (e) { res(); }
      });
    },
    tx(mode) { return this.db.transaction('projects', mode).objectStore('projects'); },
    req(r) { return new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); },
    async all() {
      if (!this.db) return Array.from(this.mem.values());
      return this.req(this.tx('readonly').getAll());
    },
    async get(id) { if (!this.db) return this.mem.get(id); return this.req(this.tx('readonly').get(id)); },
    async put(p) { const c = JSON.parse(JSON.stringify(p)); if (!this.db) { this.mem.set(c.id, c); return; } return this.req(this.tx('readwrite').put(c)); },
    async del(id) { if (!this.db) { this.mem.delete(id); return; } return this.req(this.tx('readwrite').delete(id)); },
  };

  global.LAS = { parseLAS, writeLAS, familyOf, FAMILIES, curveStats, gradientFromLog, synthLogs };
  global.ProjectStore = Store;
})(window);
