/* AbandonedWell Energy AI – computation core (JS port of prototype model v0.1)
 * Module 1: data normalisation + BHT correction
 * Module 2: temperature–depth model
 * Module 3: heat-recovery simulation (closed-loop coaxial well, Ramey 1962)
 * Module 4: economics (NPV, LCOH) + risk/score
 */
(function (global) {
  'use strict';

  const SEC_PER_YEAR = 365.25 * 86400;

  /** Ramey (1962) time function for heat transmission around a wellbore. */
  function rameyF(tSeconds, alpha = 1.0e-6, rw = 0.108) {
    return Math.log((2 * Math.sqrt(alpha * tSeconds)) / rw) - 0.29;
  }

  /**
   * Closed-loop coaxial well: cold water flows down the annulus, returns up the
   * insulated inner tubing. Faithful port of well_output() in the appendix.
   * G in °C/100 m. Returns outlet temperature (°C), Q (kWth) and the profiles.
   */
  function wellOutput(p) {
    const o = Object.assign({
      L: 3000, G: 3.3, T0: 27.0, k: 2.5, m: 5.0, Tin: 30.0, years: 10,
      Rw: 0.10, cp: 4180.0, n: 600, upLoss: 0.10, alpha: 1.0e-6, rw: 0.108,
      profile: false,
    }, p);
    const n = o.n;
    const dz = o.L / (n - 1);
    const R = rameyF(o.years * SEC_PER_YEAR, o.alpha, o.rw) / (2 * Math.PI * o.k) + o.Rw; // m·K/W
    const coef = dz / (R * o.m * o.cp);
    let Tf = o.Tin;
    let zs, Trs, Tfs;
    if (o.profile) { zs = [0]; Trs = [o.T0]; Tfs = [o.Tin]; }
    for (let i = 1; i < n; i++) {
      const Tr = o.T0 + (o.G / 100) * ((i - 1) * dz);
      Tf = Tf + (Tr - Tf) * coef;
      if (o.profile && (i % 10 === 0 || i === n - 1)) {
        const z = i * dz;
        zs.push(z); Trs.push(o.T0 + (o.G / 100) * z); Tfs.push(Tf);
      }
    }
    const Tout = Tf - o.upLoss * (Tf - o.Tin);
    const Q = (o.m * o.cp * (Tout - o.Tin)) / 1000;
    const res = { Tout, Q, Tbottom: o.T0 + (o.G / 100) * o.L, R };
    if (o.profile) { res.z = zs; res.Trock = Trs; res.Tfluid = Tfs; }
    return res;
  }

  /* ---------------- Module 1: BHT correction ---------------- */

  /** Horner method from two BHT readings at different shut-in times. */
  function hornerStatic(bht1, dt1, bht2, dt2, tc) {
    const x1 = Math.log10((tc + dt1) / dt1);
    const x2 = Math.log10((tc + dt2) / dt2);
    if (!(x1 > 0) || !(x2 > 0) || Math.abs(x1 - x2) < 1e-9) return null;
    const slope = (bht2 - bht1) / (x1 - x2);
    return bht1 + slope * x1;
  }

  /** Empirical single-reading BHT correction (Harrison et al., 1983), depth in m, °C. */
  function harrisonCorrection(depthM) {
    const d = Math.max(0, -16.51 + 0.01826 * depthM - 2.345e-6 * depthM * depthM);
    return d;
  }

  const num = (v) => {
    if (v === null || v === undefined) return NaN;
    if (typeof v === 'number') return v;
    const s = String(v).trim().replace(/\s/g, '');
    if (s === '') return NaN;
    return parseFloat(s.replace(',', '.'));
  };

  /**
   * Normalise a raw well record and derive the geothermal gradient.
   * Priority: Horner (2 BHT readings) > single BHT (empirical) > gradient given.
   */
  function normaliseWell(raw, T0) {
    const w = {
      uid: raw.uid,
      id: String(raw.id || '').trim(),
      name: String(raw.name || raw.id || '').trim(),
      field: String(raw.field || '').trim(),
      location: /off|ngoài/i.test(String(raw.location || '')) ? 'offshore' : 'onshore',
      depth: num(raw.depth_m),
      gIn: num(raw.gradient_c100m),
      bht: num(raw.bht_c),
      bht1: num(raw.bht1_c), dt1: num(raw.dt1_h),
      bht2: num(raw.bht2_c), dt2: num(raw.dt2_h), tc: num(raw.tc_h),
      integrity: (String(raw.integrity || 'fair').toLowerCase().match(/good|fair|poor|tốt|trung|kém/) || ['fair'])[0],
      distance: num(raw.distance_km),
      warnings: [],
    };
    const map = { 'tốt': 'good', 'trung': 'fair', 'kém': 'poor' };
    w.integrity = map[w.integrity] || w.integrity;
    if (!isFinite(w.distance)) w.distance = 5;
    if (!isFinite(w.depth) || w.depth <= 0) { w.warnings.push('depth'); }

    let Tstatic = NaN;
    if ([w.bht1, w.dt1, w.bht2, w.dt2, w.tc].every(isFinite)) {
      const h = hornerStatic(w.bht1, w.dt1, w.bht2, w.dt2, w.tc);
      if (h !== null) { Tstatic = h; w.gSource = 'horner'; }
    }
    if (!isFinite(Tstatic) && isFinite(w.bht)) {
      Tstatic = w.bht + harrisonCorrection(w.depth);
      w.gSource = 'bht';
    }
    if (isFinite(Tstatic) && isFinite(w.depth) && w.depth > 0) {
      w.Tstatic = Tstatic;
      w.G = ((Tstatic - T0) / w.depth) * 100;
    } else if (isFinite(w.gIn)) {
      w.G = w.gIn; w.gSource = 'given';
    } else {
      w.G = NaN; w.gSource = 'none'; w.warnings.push('gradient');
    }
    if (isFinite(w.G) && (w.G < 1 || w.G > 8)) w.warnings.push('gRange');
    w.valid = isFinite(w.G) && isFinite(w.depth) && w.depth > 0;
    return w;
  }

  /* ---------------- Uncertainty (Monte Carlo) ---------------- */

  function mulberry32(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function gauss(rng) {
    const u = 1 - rng(), v = rng();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
  function quantile(sorted, q) {
    const pos = (sorted.length - 1) * q, b = Math.floor(pos), r = pos - b;
    return sorted[b + 1] !== undefined ? sorted[b] + r * (sorted[b + 1] - sorted[b]) : sorted[b];
  }
  function monteCarlo(base, sigmaG, kMin, kMax, nSamples, seed) {
    const rng = mulberry32(seed || 42);
    const Qs = [];
    for (let i = 0; i < nSamples; i++) {
      const G = Math.max(0.5, base.G + sigmaG * gauss(rng));
      const k = kMin + (kMax - kMin) * rng();
      Qs.push(wellOutput(Object.assign({}, base, { G, k, n: 200 })).Q);
    }
    Qs.sort((a, b) => a - b);
    return { p10: quantile(Qs, 0.1), p50: quantile(Qs, 0.5), p90: quantile(Qs, 0.9) };
  }

  /* ---------------- Module 4: economics ---------------- */

  /** Returns NPV (bn VND), LCOH (VND/kWh_th), yearly series. */
  function economics(base, eco, well) {
    const life = eco.life;
    const capex = (well.location === 'offshore' ? eco.capexOff : eco.capexOn) + eco.pipeCost * well.distance; // bn VND
    const opex = capex * eco.opexPct / 100; // bn VND / yr
    const r = eco.rate / 100;
    let npv = -capex, discCost = capex, discEnergy = 0, cum = -capex;
    const years = [], Qy = [], cumCash = [];
    for (let y = 1; y <= life; y++) {
      const Q = wellOutput(Object.assign({}, base, { years: y, n: 300 })).Q; // kW
      const E = Q * eco.hours; // kWh_th
      const revenue = E * eco.heatPrice / 1e9; // bn VND
      const pump = eco.pumpKW * eco.hours * eco.elecPrice / 1e9;
      const df = Math.pow(1 + r, y);
      const cash = revenue - pump - opex;
      npv += cash / df;
      cum += cash;
      discCost += (pump + opex) / df;
      discEnergy += E / df;
      years.push(y); Qy.push(Q); cumCash.push(cum);
    }
    const lcoh = discEnergy > 0 ? (discCost * 1e9) / discEnergy : NaN;
    let payback = null;
    for (let i = 0; i < cumCash.length; i++) if (cumCash[i] >= 0) { payback = i + 1; break; }
    return { capex, opex, npv, lcoh, years, Qy, cumCash, payback };
  }

  /** Suggest a use category from outlet temperature (°C). */
  function suggestUse(Tout) {
    if (Tout >= 90) return 'useHigh';
    if (Tout >= 60) return 'useDry';
    if (Tout >= 40) return 'useDirect';
    return 'useHP';
  }

  const INTEGRITY_SCORE = { good: 1.0, fair: 0.6, poor: 0.2 };

  /** Full screening of a list of raw well records. */
  function screen(rawWells, params) {
    const wells = rawWells.map((r) => normaliseWell(r, params.T0));
    const ok = wells.filter((w) => w.valid);
    ok.forEach((w) => {
      const base = { L: w.depth, G: w.G, T0: params.T0, k: params.k, m: params.m, Tin: params.Tin, years: params.years, Rw: params.Rw, upLoss: params.upLoss };
      const r = wellOutput(base);
      w.Tbottom = r.Tbottom; w.Tout = r.Tout; w.Q = r.Q;
      w.base = base;
      w.mc = monteCarlo(base, params.sigmaG, params.kMin, params.kMax, params.mcN, 7 + w.depth);
      w.eco = economics(base, params.eco, w);
      w.use = suggestUse(w.Tout);
    });
    const qMax = Math.max(1, ...ok.map((w) => w.Q));
    const wt = params.weights; const wsum = wt.thermal + wt.integrity + wt.distance + wt.econ || 1;
    const npvs = ok.map((w) => w.eco.npv);
    const nMin = Math.min(...npvs), nMax = Math.max(...npvs);
    ok.forEach((w) => {
      const sT = w.Q / qMax;
      const sI = INTEGRITY_SCORE[w.integrity] ?? 0.6;
      const sD = Math.max(0, 1 - w.distance / params.maxDist);
      const sE = nMax > nMin ? (w.eco.npv - nMin) / (nMax - nMin) : 1;
      w.subScores = { thermal: sT, integrity: sI, distance: sD, econ: sE };
      w.score = Math.round(100 * (wt.thermal * sT + wt.integrity * sI + wt.distance * sD + wt.econ * sE) / wsum);
    });
    ok.sort((a, b) => b.score - a.score);
    return { ranked: ok, invalid: wells.filter((w) => !w.valid) };
  }

  global.AWModel = { rameyF, wellOutput, hornerStatic, harrisonCorrection, normaliseWell, monteCarlo, economics, suggestUse, screen };
})(window);
