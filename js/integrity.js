/* AbandonedWell Energy AI – well integrity assessment (screening level)
 * Classifies a well as good / fair / poor / unknown from barrier evidence, following the two-barrier principle of
 * NORSOK D-010 (rev. 5, 2021) and the well-integrity life-cycle of ISO 16530-1:2017; sustained casing pressure as in
 * API RP 90. A well with no evidence is "unknown" – never assumed fair.
 * Then: which re-use technologies are technically allowed (feasibility is separate from economics), the probability
 * that integrity proves adequate, the remaining casing life under corrosion, and the expected value of an option that
 * needs an inspection first (decision tree: inspect → re-use if adequate, otherwise plug).
 *
 * Probabilities are screening assumptions (editable). The unknown-well value 0.8 follows the share of offshore wells
 * found with integrity failures or uncertainties (≈ 18 % of 406 wells, Vignes & Aadnøy 2010, SPE 124554).
 */
(function (global) {
  'use strict';
  const DEF = {
    wallMin: 70, wallFair: 85, ageFair: 30,   // % of nominal casing wall: minimum to keep using, below this "fair"; well age (yr) above which "fair"
    tWall: 12,                                 // nominal casing wall thickness (mm), 9-5/8" 47 lb/ft ≈ 12 mm
    corrOpen: 0.2, corrClosed: 0.05, corrCO2x: 2.5, // corrosion rate (mm/yr) with produced fluid / with clean closed-loop water; factor for CO2-rich fluid without CRA
    pGood: 0.95, pFair: 0.7, pUnknown: 0.8, inspCost: 5, // probability that integrity proves adequate; cost of an integrity survey (bn VND)
  };
  const num = (v) => (v === '' || v === null || v === undefined || !isFinite(+v) ? NaN : +v);

  /** well: the project well (int_* fields, manual integrity, res_co2). Returns the class and the evidence behind it. */
  function assess(well, p, year) {
    const P = Object.assign({}, DEF, p || {});
    const cbl = well.int_cbl || '', wall = num(well.int_wall), scp = well.int_scp || '', bar = num(well.int_bar), yr = num(well.int_year), cra = well.int_cra || '';
    const age = isFinite(yr) ? (year || new Date().getFullYear()) - yr : NaN;
    const corrosive = (+well.res_co2 || 0) > 10 && cra !== 'yes';
    const has = !!cbl || isFinite(wall) || !!scp || isFinite(bar);
    const issues = [], missing = [];
    let cls, source;
    if (!has) {
      const m = String(well.integrity || '').toLowerCase();
      cls = ['good', 'fair', 'poor'].includes(m) ? m : 'unknown'; source = cls === 'unknown' ? 'none' : 'manual';
      if (cls === 'unknown') missing.push('cbl', 'wall', 'scp', 'bar');
    } else {
      source = 'data';
      if (scp === 'yes') issues.push('scp');
      if (cbl === 'poor') issues.push('cblPoor');
      if (isFinite(wall) && wall < P.wallMin) issues.push('wallLow');
      if (isFinite(bar) && bar < 1) issues.push('noBarrier');
      if (issues.length) cls = 'poor';
      else {
        if (cbl === 'partial') issues.push('cblPartial');
        if (isFinite(wall) && wall < P.wallFair) issues.push('wallThin');
        if (isFinite(bar) && bar < 2) issues.push('oneBarrier');
        if (isFinite(age) && age > P.ageFair) issues.push('old');
        if (corrosive) issues.push('corrosive');
        if (!cbl) missing.push('cbl'); if (!isFinite(wall)) missing.push('wall'); if (!scp) missing.push('scp'); if (!isFinite(bar)) missing.push('bar');
        cls = issues.length ? 'fair' : missing.length ? 'unknown' : 'good';
      }
    }
    const Pi = { good: P.pGood, fair: P.pFair, unknown: P.pUnknown, poor: 0 }[cls];
    return { cls, source, issues, missing, corrosive, age, wall, scp, Pi };
  }

  /* technology × integrity class → ok / cond (inspect & repair first) / fail */
  const M = {
    clgs: { good: 'ok', fair: 'ok', poor: 'fail', unknown: 'cond' },   // closed, low pressure, no formation contact
    ags: { good: 'ok', fair: 'cond', poor: 'fail', unknown: 'cond' },   // sidetrack from the existing casing
    hydro: { good: 'ok', fair: 'cond', poor: 'fail', unknown: 'cond' }, // produces/injects hot brine
    egs: { good: 'ok', fair: 'fail', poor: 'fail', unknown: 'cond' },   // stimulation pressure
    cpg: { good: 'ok', fair: 'cond', poor: 'fail', unknown: 'cond' },   // CO2 must stay in the formation
    co2: { good: 'ok', fair: 'cond', poor: 'fail', unknown: 'cond' },
    defer: { good: 'ok', fair: 'ok', poor: 'cond', unknown: 'ok' },     // a suspended well must still be safe
  };
  const FLUID = ['hydro', 'egs', 'cpg', 'co2'];
  function feasible(a, tech) {
    let f = (M[tech] || M.hydro)[a.cls];
    if (f === 'ok' && a.corrosive && FLUID.includes(tech)) f = 'cond';
    if (tech === 'defer' && a.scp === 'yes') f = 'fail';
    return f;
  }
  /** Remaining casing life (years) for a technology, or null when the wall thickness is not known. */
  function casingLife(a, tech, p) {
    const P = Object.assign({}, DEF, p || {});
    if (!isFinite(a.wall)) return null;
    const rate = FLUID.includes(tech) ? P.corrOpen * (a.corrosive ? P.corrCO2x : 1) : P.corrClosed;
    return Math.max(0, (a.wall - P.wallMin) / 100 * P.tWall / rate);
  }
  /** Expected value of an option: inspect first when needed; if integrity fails, the well is plugged now. */
  function expected(full, plugNow, a, feas, p) {
    const P = Object.assign({}, DEF, p || {});
    if (feas === 'fail') return null;
    const insp = feas === 'cond' ? P.inspCost : 0;
    return { ev: -insp + a.Pi * full + (1 - a.Pi) * plugNow, insp };
  }
  /** Standard normal quantile (Acklam's rational approximation) – used for deterministic Monte Carlo quantiles. */
  function zq(p) {
    const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239];
    const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572];
    const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
    const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
    const pl = 0.02425;
    if (p < pl) { const q = Math.sqrt(-2 * Math.log(p)); return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
    if (p > 1 - pl) { const q = Math.sqrt(-2 * Math.log(1 - p)); return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
    const q = p - 0.5, r = q * q;
    return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  }
  global.AWInt = { DEF, assess, feasible, casingLife, expected, zq, MATRIX: M };
})(window);
