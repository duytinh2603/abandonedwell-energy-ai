/* AbandonedWell Energy AI – machine-learning temperature model (Module 2)
 *
 * Physics-constrained ridge regression with bootstrap ensemble:
 *   target  : apparent gradient g = (T − T0) / z × 100   (°C/100 m)
 *   predict : T(z) = T0 + g(x(z)) · z / 100   → monotonic in z as long as g > 0 (g clipped to [gMin, gMax])
 *   features: depth z (km) + log averages from the top of the log down to z (GR, DT, RHOB, NPHI),
 *             i.e. a conductivity proxy of the section the heat flows through. Missing curves → training mean
 *             (+ a "has logs" flag), so wells without logs still get a prediction.
 *   training points: measured formation temperatures (DST), Horner static temperatures, corrected BHT.
 *   validation: leave-one-well-out (each well predicted by a model that never saw it) vs. the baseline of
 *               one field-average gradient.
 *   uncertainty: 60 bootstrap models (resampling points) → P10 / P50 / P90.
 */
(function (global) {
  'use strict';
  const LOGS = [
    { key: 'GR', fam: 'Gamma Ray' },
    { key: 'DT', fam: 'Sonic' },
    { key: 'RHOB', fam: 'Bulk Density' },
    { key: 'NPHI', fam: 'Neutron Porosity' },
  ];
  const FEATS = ['z_km'].concat(LOGS.map((l) => l.key)).concat(['hasLogs']);

  function rng(seed) { return function () { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  /** Mean of a log curve over measured depth [0, mdMax]; null when no samples. */
  function logMean(well, fam, mdMax) {
    if (!well.curves || !well.curves.length) return null;
    const c = well.curves.find((x) => x.family === fam);
    if (!c) return null;
    const d = well.curves[0].data;
    let s = 0, n = 0;
    for (let i = 0; i < d.length; i++) {
      const z = d[i], v = c.data[i];
      if (z === null || v === null || !isFinite(v) || z > mdMax) continue;
      s += v; n++;
    }
    return n > 20 ? s / n : null;
  }

  /** Measured depth at a vertical depth for this well (straight-hole ratio from TD MD/TVD). */
  function mdAt(well, z) {
    const tvd = +well.depth_m, md = +well.md_m;
    const ratio = tvd > 0 && md > tvd ? md / tvd : 1;
    return z * ratio;
  }

  function rawFeatures(well, z) {
    const md = mdAt(well, z);
    const f = { z_km: z / 1000 };
    let any = false;
    LOGS.forEach((l) => { const v = logMean(well, l.fam, md); f[l.key] = v; if (v !== null) any = true; });
    f.hasLogs = any ? 1 : 0;
    return f;
  }

  /** Training points from every well: [{well, z, T, src}] (z = TVD). */
  function trainingPoints(wells, T0, M) {
    const pts = [];
    wells.forEach((w) => {
      (w.tempPoints || []).forEach((p) => { if (isFinite(p.z) && isFinite(p.T) && p.z > 300 && p.T > T0 + 5) pts.push({ well: w, z: p.z, T: p.T, src: 'dst' }); });
      const nw = M.normaliseWell(w, T0);
      if ((nw.gSource === 'horner' || nw.gSource === 'bht') && isFinite(nw.Tstatic) && nw.depth > 300) pts.push({ well: w, z: nw.depth, T: nw.Tstatic, src: nw.gSource });
    });
    return pts;
  }

  /* ---------- linear algebra ---------- */
  function solve(A, b) { // Gauss–Jordan, A n×n
    const n = b.length, M = A.map((r, i) => r.concat([b[i]]));
    for (let c = 0; c < n; c++) {
      let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
      [M[c], M[p]] = [M[p], M[c]];
      const d = M[c][c] || 1e-12;
      for (let k = c; k <= n; k++) M[c][k] /= d;
      for (let r = 0; r < n; r++) if (r !== c) { const f = M[r][c]; for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k]; }
    }
    return M.map((r) => r[n]);
  }

  /** Fit ridge on rows of raw features → model {mean, sd, w, b, lambda}. */
  function fitRidge(X, y, lambda) {
    const p = FEATS.length, n = X.length;
    const mean = {}, sd = {};
    FEATS.forEach((k) => {
      const vals = X.map((r) => r[k]).filter((v) => v !== null && isFinite(v));
      const m = vals.length ? vals.reduce((a, c) => a + c, 0) / vals.length : 0;
      const s = vals.length > 1 ? Math.sqrt(vals.reduce((a, c) => a + (c - m) ** 2, 0) / (vals.length - 1)) : 0;
      mean[k] = m; sd[k] = s > 1e-9 ? s : 1;
    });
    const Z = X.map((r) => FEATS.map((k) => ((r[k] === null || !isFinite(r[k]) ? mean[k] : r[k]) - mean[k]) / sd[k]));
    const ym = y.reduce((a, c) => a + c, 0) / n;
    const A = Array.from({ length: p }, (_, i) => Array.from({ length: p }, (_, j) => Z.reduce((a, r) => a + r[i] * r[j], 0) + (i === j ? lambda : 0)));
    const bb = Array.from({ length: p }, (_, i) => Z.reduce((a, r, k) => a + r[i] * (y[k] - ym), 0));
    const w = solve(A, bb);
    return { mean, sd, w, b: ym, lambda };
  }
  function predictG(model, f, gMin, gMax) {
    let g = model.b;
    FEATS.forEach((k, i) => { const v = f[k] === null || !isFinite(f[k]) ? model.mean[k] : f[k]; g += model.w[i] * (v - model.mean[k]) / model.sd[k]; });
    return Math.min(gMax, Math.max(gMin, g));
  }

  function lowo(rows, lambda, T0, gMin, gMax) { // leave-one-well-out
    const wells = Array.from(new Set(rows.map((r) => r.well)));
    const out = [];
    wells.forEach((w) => {
      const tr = rows.filter((r) => r.well !== w), te = rows.filter((r) => r.well === w);
      if (tr.length < 4) return;
      const m = fitRidge(tr.map((r) => r.f), tr.map((r) => r.g), lambda);
      const gBase = tr.reduce((a, r) => a + r.g, 0) / tr.length;
      te.forEach((r) => out.push({ row: r, Tml: T0 + predictG(m, r.f, gMin, gMax) * r.z / 100, Tbase: T0 + gBase * r.z / 100 }));
    });
    const rmse = (k) => Math.sqrt(out.reduce((a, o) => a + (o[k] - o.row.T) ** 2, 0) / Math.max(1, out.length));
    return { preds: out, rmseML: rmse('Tml'), rmseBase: rmse('Tbase') };
  }

  /**
   * Train on a project. Returns {ok, reason?, n, wells, lambda, cv, model, ensemble, predictWell(well)}.
   */
  function train(wells, T0, M, opts = {}) {
    const gMin = opts.gMin || 1.5, gMax = opts.gMax || 6;
    const pts = trainingPoints(wells, T0, M);
    if (pts.length < 6) return { ok: false, reason: 'few', n: pts.length };
    const rows = pts.map((p) => ({ ...p, f: rawFeatures(p.well, p.z), g: (p.T - T0) / p.z * 100 }));
    const nWells = new Set(rows.map((r) => r.well)).size;
    if (nWells < 2) return { ok: false, reason: 'wells', n: pts.length };
    // choose lambda by leave-one-well-out RMSE
    const grid = [0.1, 0.3, 1, 3, 10, 30, 100];
    let best = null;
    grid.forEach((l) => { const cv = lowo(rows, l, T0, gMin, gMax); if (!best || cv.rmseML < best.cv.rmseML) best = { lambda: l, cv }; });
    const model = fitRidge(rows.map((r) => r.f), rows.map((r) => r.g), best.lambda);
    const r = rng(1234), ensemble = [];
    for (let b = 0; b < 60; b++) {
      const s = rows.map(() => rows[Math.floor(r() * rows.length)]);
      ensemble.push(fitRidge(s.map((x) => x.f), s.map((x) => x.g), best.lambda));
    }
    // in-sample residual spread adds to the ensemble spread
    const resid = rows.map((x) => x.T - (T0 + predictG(model, x.f, gMin, gMax) * x.z / 100));
    const sigma = Math.sqrt(resid.reduce((a, c) => a + c * c, 0) / Math.max(1, resid.length - FEATS.length));
    const q = (arr, p) => { const s = arr.slice().sort((a, b) => a - b); const i = (s.length - 1) * p, lo = Math.floor(i); return s[lo] + (s[Math.min(lo + 1, s.length - 1)] - s[lo]) * (i - lo); };
    function predictAt(well, z) {
      const f = rawFeatures(well, z);
      const g50 = predictG(model, f, gMin, gMax);
      const gs = ensemble.map((m) => predictG(m, f, gMin, gMax));
      const sg = sigma / z * 100; // residual (°C) expressed as gradient spread
      return { z, g: g50, g10: q(gs, 0.1) - 1.2816 * sg, g90: q(gs, 0.9) + 1.2816 * sg, T: T0 + g50 * z / 100, f };
    }
    return {
      ok: true, n: rows.length, nWells, lambda: best.lambda, cv: best.cv, model, sigma, rows, feats: FEATS,
      predictAt,
      predictWell: (well) => (+well.depth_m > 0 ? predictAt(well, +well.depth_m) : null),
    };
  }

  global.AWML = { train, FEATS, rawFeatures };
})(window);
