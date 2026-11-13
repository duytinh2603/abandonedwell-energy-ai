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
    // L = length along the hole (MD), Lv = vertical depth (TVD) of the bottom; rock T follows TVD.
    const Lv = o.Lv > 0 ? Math.min(o.Lv, o.L) : o.L, vr = Lv / o.L;
    const n = o.n;
    const dz = o.L / (n - 1);
    const R = rameyF(o.years * SEC_PER_YEAR, o.alpha, o.rw) / (2 * Math.PI * o.k) + o.Rw; // m·K/W
    const coef = dz / (R * o.m * o.cp);
    let Tf = o.Tin;
    let zs, Trs, Tfs;
    if (o.profile) { zs = [0]; Trs = [o.T0]; Tfs = [o.Tin]; }
    for (let i = 1; i < n; i++) {
      const Tr = o.T0 + (o.G / 100) * ((i - 1) * dz) * vr;
      Tf = Tf + (Tr - Tf) * coef;
      if (o.profile && (i % 10 === 0 || i === n - 1)) {
        const z = i * dz;
        zs.push(z * vr); Trs.push(o.T0 + (o.G / 100) * z * vr); Tfs.push(Tf);
      }
    }
    const Tout = Tf - o.upLoss * (Tf - o.Tin);
    const Q = (o.m * o.cp * (Tout - o.Tin)) / 1000;
    const res = { Tout, Q, Tbottom: o.T0 + (o.G / 100) * Lv, R };
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
  function normaliseWell(raw, T0, wd = 0) {
    const w = {
      uid: raw.uid,
      id: String(raw.id || '').trim(),
      name: String(raw.name || raw.id || '').trim(),
      field: String(raw.field || '').trim(),
      location: /off|ngoài/i.test(String(raw.location || '')) ? 'offshore' : 'onshore',
      depth: num(raw.depth_m),
      md: num(raw.md_m),
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
    if (!(w.md >= w.depth)) w.md = w.depth; // MD defaults to TVD (vertical well)
    w.wd = w.location === 'offshore' && wd > 0 && wd < w.depth ? wd : 0; // rock starts at the seabed: T(z) = T0 + G·(z − wd)

    // A downhole temperature must exceed the surface temperature; 0 or tiny values are typos
    // (e.g. a gradient typed into the BHT box) and must not override a valid gradient.
    const plausible = (T) => isFinite(T) && T > T0 + 5 && T < 400;
    let Tstatic = NaN;
    if ([w.bht1, w.dt1, w.bht2, w.dt2, w.tc].every(isFinite)) {
      const h = hornerStatic(w.bht1, w.dt1, w.bht2, w.dt2, w.tc);
      if (h !== null && plausible(h) && plausible(w.bht1) && plausible(w.bht2) && w.dt1 > 0 && w.dt2 > 0 && w.tc > 0) { Tstatic = h; w.gSource = 'horner'; }
      else w.warnings.push('hornerIgnored');
    }
    if (!isFinite(Tstatic) && isFinite(w.bht)) {
      if (plausible(w.bht)) { Tstatic = w.bht + harrisonCorrection(w.depth); w.gSource = 'bht'; }
      else w.warnings.push('bhtIgnored');
    }
    if (isFinite(Tstatic) && isFinite(w.depth) && w.depth > 0) {
      w.Tstatic = Tstatic;
      w.G = ((Tstatic - T0) / (w.depth - w.wd)) * 100;
    } else if (isFinite(w.gIn)) {
      w.G = w.gIn; w.gSource = 'given';
    } else {
      w.G = NaN; w.gSource = 'none'; w.warnings.push('gradient');
    }
    if (isFinite(w.G) && (w.G < 1 || w.G > 8)) w.warnings.push('gRange');
    w.valid = isFinite(w.G) && w.G > 0 && isFinite(w.depth) && w.depth > 0;
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

  /* ---------------- hydraulics ---------------- */

  /** Circulation pump power (kW) for a coaxial well: down the annulus, up the tubing (Darcy–Weisbach, Swamee–Jain),
   *  plus a fixed surface-loop / heat-exchanger loss. Water at ~50 °C. Diameters in mm. */
  function pumpPower(m, L, g = {}) {
    const D = (g.csgID || 157) / 1000, dOut = (g.tubOD || 89) / 1000, dIn = (g.tubID || 76) / 1000;
    const rho = 990, mu = 6e-4, eps = 4.6e-5, eff = g.eff || 0.7, dpSurf = (g.dpSurf ?? 1) * 1e5;
    const q = m / rho;
    const fr = (Re, Dh) => (Re < 2300 ? 64 / Math.max(Re, 1) : 0.25 / Math.pow(Math.log10(eps / (3.7 * Dh) + 5.74 / Math.pow(Re, 0.9)), 2));
    const seg = (A, Dh) => { const v = q / A, Re = rho * v * Dh / mu; return fr(Re, Dh) * (L / Dh) * rho * v * v / 2; };
    const dpAnn = D > dOut ? seg(Math.PI / 4 * (D * D - dOut * dOut), D - dOut) : 0;
    const dpTub = seg(Math.PI / 4 * dIn * dIn, dIn);
    const dp = dpAnn + dpTub + dpSurf;
    return { kW: dp * q / eff / 1000, dpBar: dp / 1e5 };
  }

  /* ---------------- Module 4: economics ---------------- */

  /** Returns NPV (bn VND), LCOH (VND/kWh_th), yearly series. */
  function economics(base, eco, well) {
    const life = eco.life;
    const capex = (well.location === 'offshore' ? eco.capexOff : eco.capexOn) + eco.pipeCost * well.distance; // bn VND
    const opex = capex * eco.opexPct / 100; // bn VND / yr
    const r = eco.rate / 100;
    // value of deferring plugging & abandonment: the P&A spend moves paYears later
    const deferral = (eco.paCost || 0) * (1 - Math.pow((1 + (eco.paEsc || 0) / 100) / (1 + r), life)); // P&A moves to the end of the project and escalates meanwhile
    let npv = -capex + deferral, discCost = capex, discEnergy = 0, cum = -capex + deferral, annuity = 0;
    const years = [], Qy = [], cumCash = [];
    for (let y = 1; y <= life; y++) {
      const Q = wellOutput(Object.assign({}, base, { years: y, n: 300 })).Q; // kW
      const E = Q * eco.hours; // kWh_th
      const revenue = E * eco.heatPrice / 1e9 + E * (eco.co2Factor || 0) / 1000 * (eco.co2Price || 0) / 1e9; // bn VND (heat + avoided CO2)
      const pump = eco.pumpKW * eco.hours * eco.elecPrice / 1e9;
      const df = Math.pow(1 + r, y);
      const cash = revenue - pump - opex;
      npv += cash / df;
      cum += cash;
      discCost += (pump + opex) / df;
      discEnergy += E / df;
      annuity += 1 / df;
      years.push(y); Qy.push(Q); cumCash.push(cum);
    }
    const lcoh = discEnergy > 0 ? (discCost * 1e9) / discEnergy : NaN;
    let payback = null;
    for (let i = 0; i < cumCash.length; i++) if (cumCash[i] >= 0) { payback = i + 1; break; }
    const pumpCost = eco.pumpKW * eco.hours * eco.elecPrice / 1e9;
    return { capex, opex, npv, lcoh, years, Qy, cumCash, payback, deferral, discEnergy, annuity, pumpCost };
  }

  /** NPV P10/P50/P90: capex ×[0.8–1.4], heat value ×[0.75–1.25], opex ×[0.7–1.5], heat output from its P10–P90. */
  function npvRange(e, eco, mc, Q, seed) {
    const rng = mulberry32(seed || 99);
    const tri = (a, c, b) => { const u = rng(), f = (c - a) / (b - a); return u < f ? a + Math.sqrt(u * (b - a) * (c - a)) : b - Math.sqrt((1 - u) * (b - a) * (b - c)); };
    const sq = Q > 0 && mc ? (mc.p90 - mc.p10) / (2 * 1.2816 * Q) : 0;
    const co2v = (eco.co2Factor || 0) / 1000 * (eco.co2Price || 0);
    const out = [];
    for (let i = 0; i < 400; i++) {
      const fc = tri(0.8, 1, 1.4), fp = tri(0.75, 1, 1.25), fo = tri(0.7, 1, 1.5);
      let u = 1 - rng(), v = rng(); const fq = Math.max(0, 1 + sq * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v));
      const capex = e.capex * fc;
      out.push(-capex + e.deferral + e.discEnergy * fq * (eco.heatPrice * fp + co2v) / 1e9 - (e.opex * fc * fo + e.pumpCost) * e.annuity);
    }
    out.sort((a, b) => a - b);
    return { p10: quantile(out, 0.1), p50: quantile(out, 0.5), p90: quantile(out, 0.9), probPos: out.filter((x) => x > 0).length / out.length };
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
    const wells = rawWells.map((r) => normaliseWell(r, params.T0, params.wd || 0));
    const ok = wells.filter((w) => w.valid);
    ok.forEach((w) => {
      const base = { L: w.md, Lv: w.depth, G: w.G, T0: params.T0 - w.G / 100 * w.wd, k: params.k, m: params.m, Tin: params.Tin, years: params.years, Rw: params.Rw, upLoss: params.upLoss };
      const hyd = params.eco.pumpAuto ? pumpPower(params.m, w.md, params.geom) : null;
      w.pumpKW = hyd ? hyd.kW : params.eco.pumpKW; w.dpBar = hyd ? hyd.dpBar : null;
      const r = wellOutput(base);
      w.Tbottom = r.Tbottom; w.Tout = r.Tout; w.Q = r.Q;
      w.base = base;
      w.mc = monteCarlo(base, params.sigmaG, params.kMin, params.kMax, params.mcN, 7 + w.depth);
      w.eco = economics(base, Object.assign({}, params.eco, { pumpKW: w.pumpKW }), w);
      w.eco.range = npvRange(w.eco, params.eco, w.mc, r.Q, 11 + w.depth);
      w.use = suggestUse(w.Tout);
    });
    const qMax = Math.max(1, ...ok.map((w) => w.Q));
    const wt = params.weights; const wsum = wt.thermal + wt.integrity + wt.distance + wt.econ || 1;
    const npvs = ok.map((w) => w.eco.npv);
    const nMin = Math.min(...npvs), nMax = Math.max(...npvs);
    ok.forEach((w) => {
      const sT = Math.max(0, w.Q) / qMax; // a well that cools the water (Q <= 0) scores 0, never negative
      const sI = INTEGRITY_SCORE[w.integrity] ?? 0.6;
      const sD = Math.max(0, 1 - w.distance / params.maxDist);
      const sE = nMax > nMin ? (w.eco.npv - nMin) / (nMax - nMin) : 1;
      w.subScores = { thermal: sT, integrity: sI, distance: sD, econ: sE };
      w.score = Math.max(0, Math.min(100, Math.round(100 * (wt.thermal * sT + wt.integrity * sI + wt.distance * sD + wt.econ * sE) / wsum)));
      if (w.Q <= 0) { w.score = 0; w.warnings.push('noHeat'); }
    });
    ok.sort((a, b) => b.score - a.score);
    return { ranked: ok, invalid: wells.filter((w) => !w.valid) };
  }

  global.AWModel = { rameyF, wellOutput, hornerStatic, harrisonCorrection, normaliseWell, monteCarlo, economics, npvRange, pumpPower, suggestUse, screen };
})(window);
