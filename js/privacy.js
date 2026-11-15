/* AbandonedWell Energy AI — privacy helpers: anonymised project copies. */
(function (global) {
  'use strict';

  const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const pad = (i, n) => String(i).padStart(Math.max(2, String(n).length), '0');
  const reEsc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  /** Generic label for a temperature point source, so no well or company name survives. */
  function genericSrc(s) {
    s = String(s || '');
    if (/dst/i.test(s)) return 'DST';
    if (/bht/i.test(s)) return 'BHT';
    if (/log|las/i.test(s)) return 'log';
    return 'data';
  }

  /** Replace every token in every string of an object tree (curve sample arrays are skipped). */
  function scrub(o, swaps) {
    if (!swaps.length) return o;
    const walk = (x) => {
      if (typeof x === 'string') { let s = x; swaps.forEach(([re, to]) => { s = s.replace(re, to); }); return s; }
      if (Array.isArray(x)) { for (let i = 0; i < x.length; i++) x[i] = walk(x[i]); return x; }
      if (x && typeof x === 'object') { Object.keys(x).forEach((k) => { if (k !== 'data') x[k] = walk(x[k]); }); return x; }
      return x;
    };
    return walk(o);
  }

  /**
   * Copy a project with identifying text replaced. The original is not touched.
   * opts: prefix (well code prefix), fieldBase (field name base), name (project name),
   *       notes (drop notes, file names, generic point sources), coords (drop lat/lon).
   * Returns { project, map, leaks }: map = old → new names (keep it private), leaks = old names still present.
   */
  function anonymize(p, opts) {
    const o = Object.assign({ prefix: 'W-', fieldBase: 'Field', name: 'Project', notes: true, coords: true }, opts);
    const q = JSON.parse(JSON.stringify(p));
    const n = q.wells.length, fields = new Map(), map = [];
    const fieldName = (f) => {
      if (!fields.has(f)) { const k = fields.size; fields.set(f, `${o.fieldBase} ${LETTERS[k % 26]}${k >= 26 ? Math.floor(k / 26) : ''}`); }
      return fields.get(f);
    };
    const tokens = new Map();
    const add = (from, to) => { from = String(from || '').trim(); if (from.length >= 2 && from !== to && !tokens.has(from)) tokens.set(from, to); };
    q.wells.forEach((w, i) => {
      const code = o.prefix + pad(i + 1, n);
      const f = w.field ? fieldName(w.field) : '';
      map.push({ new_id: code, old_id: w.id || '', old_name: w.name || '', new_field: f, old_field: w.field || '' });
      add(w.name, code); add(w.id, code); if (w.field) add(w.field, f);
      w.id = code; w.name = code; w.field = f;
      if (o.notes) {
        delete w.note; delete w.gNote; delete w.res_note; delete w.fileName;
        if (Array.isArray(w.tempPoints)) w.tempPoints.forEach((t) => { t.src = genericSrc(t.src); });
      }
      if (o.coords) { delete w.lat; delete w.lon; delete w.coordSrc; }
    });
    add(p.name, o.name);
    q.name = o.name;
    if (Array.isArray(q.bench) && o.notes) q.bench.forEach((b, i) => { b.name = 'B-' + pad(i + 1, q.bench.length); });
    // longest first, so "AB-12X" is replaced before "AB-1"
    const swaps = Array.from(tokens.entries()).sort((a, b) => b[0].length - a[0].length).map(([from, to]) => [new RegExp(reEsc(from), 'gi'), to]);
    q.wells.forEach((w) => { const keep = { id: w.id, name: w.name, field: w.field }; scrub(w, swaps); Object.assign(w, keep); });
    if (q.bench) scrub(q.bench, swaps);
    const text = JSON.stringify(Object.assign({}, q, { wells: q.wells.map((w) => Object.assign({}, w, { curves: (w.curves || []).map((c) => Object.assign({}, c, { data: undefined })) })) }));
    const leaks = Array.from(tokens.keys()).filter((k) => text.toLowerCase().includes(k.toLowerCase()));
    return { project: q, map, leaks };
  }

  global.AWPriv = { anonymize, genericSrc };
})(typeof window !== 'undefined' ? window : globalThis);
