/* AbandonedWell Energy AI — Vietnamese well suspension & abandonment rules.
 * Source: Thông tư 16/2024/TT-BCT (in force 04/11/2024; replaces TT 17/2020/TT-BCT, which replaced QĐ 37/2005/QĐ-BCN).
 * Article numbers ("Đ") refer to TT 16/2024. Screening logic only: it does not replace the operator's well
 * termination plan agreed with PVN (Đ9). */
(function (global) {
  'use strict';

  const DEF = {
    maxYears: 6,      // Đ8.1: a category-1 suspended well must be put to use or abandoned within 6 years
    hphtT: 150,       // HPHT threshold (°C) — industry convention; TT 16 uses the term without a number
    offshoreBP: 200,  // Đ15.2: bridge plug 200 m below the seabed before cutting surface casing
    surfPlug: 100,    // Đ15.2: cement on top of that bridge plug (m)
    shoePlug: 100,    // Đ12.1: balanced plug 50 m above + 50 m below the deepest casing shoe (m)
    perfMargin: 30,   // Đ13.1: 15–30 m above and below a perforated interval (upper value)
    leaveWD: 500,     // Đ26.2đ: wellhead may be left in water ≥ 500 m
    survey: 90,       // Đ23.2c: debris survey radius around a well (m)
  };

  /** Đ3.2: category of a suspended well from the planned suspension time (years). */
  const category = (y) => (y >= 3 ? 1 : y >= 1 ? 2 : 3);

  /** Đ7.2–7.3: number of inspections over the suspension period. Subsea wellheads (cat. 1–2): first after 1 year, then every 2 years. */
  function inspections(years, cat, subsea) {
    if (!(years > 0)) return 0;
    if (subsea && cat <= 2) { let n = 0; for (let t = 1; t <= years + 1e-9; t += 2) n++; return n; }
    if (cat === 1) return Math.floor(years + 1e-9);
    if (cat === 2) return Math.floor(years * 4 + 1e-9);
    return Math.ceil(years * 12 - 1e-9);
  }

  /**
   * Can the well be suspended (deferred P&A) under TT 16/2024?
   * x: { years: planned deferral, cls: integrity class (good|fair|poor|unknown), scp: 'yes'|'no'|'',
   *      fund: decommissioning fund paid up 'yes'|'no'|'', ext: extension beyond 6 years applied for (bool),
   *      reuse: a reuse option (geothermal / CO2) is under study for the well (bool), subsea (bool), wd (m) }
   * Returns { status: ok|cond|fail, years: years allowed, cat, insp, issues: [{code, art, lvl}] }.
   */
  function deferCheck(x) {
    const issues = []; let status = 'ok';
    const add = (code, art, lvl) => { issues.push({ code, art, lvl }); if (lvl === 'fail') status = 'fail'; else if (lvl === 'cond' && status !== 'fail') status = 'cond'; };
    if (x.cls === 'poor') add('poorInt', 'Đ3.1a, Đ25.1a', 'fail');
    if (x.scp === 'yes') add('scp', 'Đ3.1a, Đ10.4b', 'fail');
    if (x.cls === 'unknown') add('unkInt', 'Đ25.1a, Đ25.1e', 'cond');
    if (x.fund === 'no') add('fundNo', 'Đ25.1d', 'fail'); else if (x.fund !== 'yes') add('fundUnk', 'Đ25.1d', 'cond');
    if (!x.reuse) add('noReason', 'Đ3.2a, Đ25.1c', 'cond');
    let years = Math.max(0, +x.years || 0);
    if (years > DEF.maxYears) {
      if (x.ext) add('ext', 'Đ8.2', 'cond');
      else { years = DEF.maxYears; add('cap', 'Đ8.1', 'info'); }
    }
    const cat = category(years);
    if (cat === 1) add('pull', 'Đ4.2', 'info');
    if (x.subsea && x.wd > 0 && x.wd < 20) add('buoy', 'Đ3.1d, Đ5.3', 'info');
    add('liab', 'Đ25.1đ', 'info');
    return { status, years, cat, insp: inspections(years, cat, !!x.subsea), issues };
  }

  /**
   * Minimum abandonment scope from the well data the web has (TT 16/2024 Đ10–Đ19, Đ23).
   * x: { tvd, wd, offshore, resZ (top of the open/perforated zone, m), resH (its thickness, m), Tb (bottom T, °C) }
   * Depths are below the drill floor / sea level as entered; plug depths are indicative, the shoe depth is not known here.
   */
  function paScope(x) {
    const plugs = [];
    if (x.resZ > 0) {
      const top = Math.max(0, x.resZ - DEF.perfMargin), bot = Math.min(x.tvd || Infinity, x.resZ + (x.resH > 0 ? x.resH : 0) + DEF.perfMargin);
      plugs.push({ code: 'perf', top, bot, len: bot - top, art: 'Đ13.1' });
    } else plugs.push({ code: 'perfUnk', top: null, bot: null, len: 2 * DEF.perfMargin, art: 'Đ13' });
    plugs.push({ code: 'shoe', top: null, bot: null, len: DEF.shoePlug, art: 'Đ12.1' });
    const bp = (x.offshore ? (x.wd > 0 ? x.wd : 0) : 0) + DEF.offshoreBP;
    plugs.push({ code: x.offshore ? 'surf' : 'surfLand', top: bp - DEF.surfPlug, bot: bp, len: DEF.surfPlug, art: 'Đ15.2' });
    const cement = plugs.reduce((s, p) => s + p.len, 0);
    const hpht = x.Tb >= DEF.hphtT;
    const cut = !x.offshore ? 'land' : x.wd >= DEF.leaveWD ? 'deep' : 'seabed';
    return { plugs, cement, hpht, cut, bp, survey: x.offshore ? DEF.survey : 0 };
  }

  global.AWReg = { DEF, category, inspections, deferCheck, paScope, REF: 'TT 16/2024/TT-BCT' };
})(typeof window !== 'undefined' ? window : globalThis);
