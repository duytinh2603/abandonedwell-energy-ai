/* AbandonedWell Energy AI – geothermal technology comparison (screening level)
 *   CLGS  – closed-loop coaxial retrofit (conduction, Ramey 1962)                                   TRL 7
 *   AGS   – multilateral closed loop (Eavor-type U-loop; line-source conduction)                    TRL 6–7
 *   HYDRO – hydrothermal doublet (volumetric heat in place, Muffler & Cataldi 1978)                 TRL 9
 *   EGS   – stimulated rock + new injector (Tester et al. 2006 "The Future of Geothermal Energy")   TRL 5–7
 *   CPG   – CO2-EGS / CO2-plume geothermal (Brown 2000; Pruess 2006; Randolph & Saar 2011;
 *           Atrens et al. 2009; Adams et al. 2014): CO2 properties from the Peng–Robinson (1976)
 *           equation of state, flow from the CO2/water mobility ratio, driven by the thermosiphon      TRL 4–5
 * Each option picks the NPV-best use (power, direct heat, cogeneration) under local demand caps.
 */
(function (global) {
  'use strict';
  const CPW = 4180, SEC_YEAR = 365.25 * 86400, G0 = 9.81;

  const DEF = {
    latN: 2, latL: 2000, capexLat: 30,             // AGS: laterals, length each (m), drilling bn VND per km
    egsFlow: 30, egsV: 0.2, egsRf: 0.2,            // EGS: circulation kg/s, stimulated volume km³, heat recovery
    egsImp: 0.15, capexStim: 60, capexWellM: 0.08, // impedance MPa per kg/s, stimulation bn VND, new well bn VND per m MD
    co2Loss: 5, capexCPG: 40, co2Tmin: 35,         // CPG: CO2 lost to the formation (% of circulation), surface plant bn VND, min injection T °C
    heatDemOff: 1000, heatDemOn: 5000, elecDem: 5000, // saleable local demand: heat kWth (offshore / onshore), power kWe
    mcN: 200,
  };

  /* ---------------- fluid properties ---------------- */
  /** Water: density (kg/m³) and viscosity (Pa·s) vs temperature °C (liquid, screening accuracy ~1–3 %). */
  const rhoW = (T) => 1000 - 0.0178 * Math.pow(Math.abs(T - 4), 1.7);
  const muW = (T) => 2.414e-5 * Math.pow(10, 247.8 / (T + 133.15));
  /** CO2 by Peng–Robinson: state at P (Pa), T (°C) → {rho kg/m³, h J/kg, mu Pa·s}. Dense/supercritical branch. */
  function co2(P, Tc) {
    const R = 8.314462, TC = 304.13, PC = 7.3773e6, W = 0.22394, MW = 0.04401;
    const T = Tc + 273.15, kap = 0.37464 + 1.54226 * W - 0.26992 * W * W;
    const sq = 1 + kap * (1 - Math.sqrt(T / TC)), alpha = sq * sq;
    const a0 = 0.45724 * R * R * TC * TC / PC, a = a0 * alpha, b = 0.0778 * R * TC / PC;
    const A = a * P / (R * R * T * T), B = b * P / (R * T);
    // Z³ − (1−B)Z² + (A−3B²−2B)Z − (AB−B²−B³) = 0 : Newton from the liquid-like side, then from the gas side
    const f = (Z) => ((Z - (1 - B)) * Z + (A - 3 * B * B - 2 * B)) * Z - (A * B - B * B - B * B * B);
    const df = (Z) => (3 * Z - 2 * (1 - B)) * Z + (A - 3 * B * B - 2 * B);
    const newton = (Z) => { for (let i = 0; i < 60; i++) { const d = f(Z) / (df(Z) || 1e-12); Z -= d; if (Math.abs(d) < 1e-10) break; } return Z; };
    const zl = newton(B * 1.001 + 1e-6), zg = newton(1 + B);
    const Z = P > PC && zl > B ? zl : zg; // above the critical pressure the dense root applies
    const rho = P * MW / (Z * R * T);
    const dadT = -a0 * kap * Math.sqrt(alpha / (T * TC));
    const hig = (x) => 22.26 * x + 5.981e-2 * x * x / 2 - 3.501e-5 * x * x * x / 3 + 7.469e-9 * x * x * x * x / 4; // ∫cp_ig dT, J/mol
    const s2 = Math.SQRT2;
    const hdep = R * T * (Z - 1) + (T * dadT - a) / (2 * s2 * b) * Math.log((Z + (1 + s2) * B) / (Z + (1 - s2) * B));
    const h = (hig(T) - hig(298.15) + hdep) / MW;
    const mu = 1.5e-5 * Math.pow(T / 300, 0.8) + 8.9e-5 * Math.pow(rho / 1000, 2.07); // dilute gas + residual (fit to NIST data, ±10 %)
    return { rho, h, mu, Z };
  }
  /** Temperature (°C) of CO2 at pressure P with specific enthalpy h (bisection). */
  function co2TofH(P, h) {
    let lo = 5, hi = 350;
    for (let i = 0; i < 50; i++) { const m = (lo + hi) / 2; if (co2(P, m).h < h) lo = m; else hi = m; }
    return (lo + hi) / 2;
  }

  const npv = (capex, yearly, rate, life) => { let v = -capex; for (let y = 1; y <= life; y++) v += yearly / Math.pow(1 + rate, y); return v; };
  /** Levelised cost per kWh of energy sold (power; heat; power + heat for cogeneration). */
  const lcoe = (capex, opexYr, energyKWh, rate, life) => {
    if (!(energyKWh > 0)) return null;
    const crf = rate > 0 ? rate / (1 - Math.pow(1 + rate, -life)) : 1 / life;
    return (capex * crf + opexYr) * 1e9 / energyKWh;
  };
  function rng(seed) { return function () { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const gauss = (r) => Math.sqrt(-2 * Math.log(Math.max(1e-12, r()))) * Math.cos(2 * Math.PI * r());

  /**
   * NPV-best use of a hot stream (m kg/s at Ts °C, returned at Tret): power (best ORC fluid, or a CO2 direct
   * turbine), cogeneration, or direct heat; sales capped by ctx.heatDem / ctx.elecDem.
   */
  function bestUse(ctx, m, Ts, Tret, capexBase, pumpKW, opts = {}) {
    const U = ctx.U, A = global.AWUtil, Tcond = U.Tamb + U.approach, hours = ctx.hours;
    const cands = [];
    const finish = (o) => {
      o.capex = capexBase + o.capexSurf;
      o.opex = o.capex * ctx.eco.opexPct / 100;
      o.pumpCost = pumpKW * hours * ctx.eco.elecPrice / 1e9;
      o.extra = opts.extraValue || 0;
      o.yearly = o.value + o.extra - o.opex - o.pumpCost;
      o.npv = npv(o.capex, o.yearly, ctx.rate, ctx.life) + (ctx.eco.deferral || 0); // P&A deferral, same on every page
      o.lcoe = lcoe(o.capex, o.opex + o.pumpCost, (o.Pe > 0 ? o.Pe + (o.Q2 || 0) : o.Q) * hours, ctx.rate, ctx.life);
      return o;
    };
    let best = null, bestCo = null;
    const capE = ctx.elecDem > 0 ? ctx.elecDem : Infinity, capH = ctx.heatDem > 0 ? ctx.heatDem : Infinity;
    const cp = opts.cp || CPW;
    const fluids = opts.directCO2 ? [{ id: 'sco2', name: 'CO₂ turbine', minT: 60, eps: 0.48, p40: null, tc: null }] : A.FLUIDS;
    fluids.forEach((f) => {
      const r = A.orc(f, Ts, m * cp / CPW, Tcond, Tret, opts.directCO2 ? 2 : U.pinch); // orc() assumes water cp → pass the equivalent capacity rate
      if (!r.feasible || !(r.Pe > 0)) return;
      const Pe = Math.min(r.Pe, capE);
      const o = finish({ use: 'power', fluid: f.name, Q: r.Qin * Pe / r.Pe, Qall: r.Qin, Pe, PeAll: r.Pe, capped: Pe < r.Pe, eta: r.eta, value: Pe * hours * ctx.elecValue / 1e9, capexSurf: Pe * U.capexORC / 1000 });
      if (!best || o.npv > best.npv) best = o;
      const Q2all = Math.max(0, m * cp * (r.Tout - Tret) / 1000), Q2 = Math.min(Q2all, capH);
      if (Q2 > 0) {
        const price2 = r.Tout >= U.Tdry ? U.heatHigh : U.heatLow;
        const g = finish({ use: 'cogen', fluid: f.name, Q: r.Qin * Pe / r.Pe + Q2, Qall: r.Qin + Q2all, Q2, Pe, PeAll: r.Pe, capped: Pe < r.Pe || Q2 < Q2all, eta: r.eta, Tout: r.Tout,
          value: (Pe * ctx.elecValue + Q2 * price2) * hours / 1e9, capexSurf: (Pe * U.capexORC + Q2 * U.capexHX) / 1000 });
        if (!bestCo || g.npv > bestCo.npv) bestCo = g;
      }
    });
    if (best) cands.push(best);
    if (bestCo) cands.push(bestCo);
    const Qall = Math.max(0, m * cp * (Ts - Tret) / 1000);
    if (Qall > 0) {
      const price = Ts >= U.Tdry ? U.heatHigh : U.heatLow, Q = Math.min(Qall, capH);
      cands.push(finish({ use: Ts >= U.Tdry ? 'heatHigh' : 'heatLow', Q, Qall, capped: Q < Qall, Pe: 0, value: Q * hours * price / 1e9, capexSurf: Q * U.capexHX / 1000 }));
    }
    cands.sort((a, b) => b.npv - a.npv);
    return cands[0] || null;
  }

  /** Hydrothermal doublet for given reservoir inputs (same rules as AWUtil.evaluate): sustainable flow and wellhead temperature. */
  function hydroCase(res, U, life, hours) {
    const A = global.AWUtil, R = A.reservoir(res, life);
    const Twh = res.Tres - U.whLoss;
    const flowCap = res.PI > 0 ? res.PI * U.dpMax / 86.4 : Infinity;
    const flow = Math.min(res.flow, flowCap);
    const Pfull = flow * CPW * Math.max(0, Twh - res.Treinj) / 1000;
    if (U.RfSwept) { const sw = A.sweep(res, flow, life * hours * 3600, res.spacing); R.Psust = Pfull * Math.min(1, res.A / Math.max(sw.area, 1e-9)); }
    const m = Pfull > 0 ? Math.min(flow, flow * R.Psust / Pfull) : 0;
    return { m, Twh, flow, Pfull, Psust: R.Psust };
  }

  /**
   * w: screened well (depth TVD, md, G, Tbottom, base, integrity, location)
   * ev: AWUtil.evaluate result; ctx: {P, U, eco, resIn, T, wellCapex, hostCapex, conf:{A:'m'|'e', Q:'m'|'e'}}
   */
  function evaluate(w, ev, ctx) {
    const M = global.AWModel, P = ctx.P, U = ctx.U, T = Object.assign({}, DEF, ctx.T || {});
    const eco = ctx.eco, life = eco.life, rate = eco.rate / 100, hours = eco.hours;
    const offshore = w.location === 'offshore';
    const c = { U, eco, life, rate, hours, elecValue: U.elecValue, heatDem: offshore ? T.heatDemOff : T.heatDemOn, elecDem: T.elecDem };
    const host = ctx.hostCapex || 0, wellCapex = ctx.wellCapex + host;
    const Trock = w.Tbottom, out = [], D = {}; // D: derived engineering parameters
    const reasons = (arr) => arr.filter(Boolean);
    const R = ev.reservoir, res = ctx.resIn;

    /* ---- 1. CLGS ---- */
    {
      let best = null;
      [1, 2, 3, 4, 5, 6, 8, 10, 12].forEach((m) => {
        const Ts = M.wellOutput(Object.assign({}, w.base, { m, Tin: U.Tret, n: 250 })).Tout;
        const pump = eco.pumpAuto ? M.pumpPower(m, w.md, P.geom).kW : eco.pumpKW * m / 5;
        const o = bestUse(c, m, Ts, U.Tret, wellCapex, pump);
        if (o && (!best || o.npv > best.npv)) best = Object.assign(o, { m, Ts, pumpKW: pump });
      });
      out.push(Object.assign({ id: 'clgs', trl: '7', status: best ? 'ok' : 'no', reasons: reasons([!best && 'noFeasible', w.integrity === 'poor' && 'integrity', host > 0 && 'noHost']), co2t: 0 }, best || { Q: 0, Pe: 0, npv: null }));
      D.rameyF = M.rameyF(Math.max(1, P.years) * SEC_YEAR, 1e-6, 0.108);
      D.wPerM = best ? (best.Qall || best.Q) * 1000 / w.md : null;
    }

    /* ---- 2. AGS ---- */
    {
      const f = D.rameyF; let best = null;
      [2, 4, 6, 8, 10, 15, 20, 30].forEach((m) => {
        const mi = m / T.latN, Tin = U.Tret;
        const Tlat = Trock - (Trock - Tin) * Math.exp(-2 * Math.PI * P.k * T.latL / (f * mi * CPW));
        const Ts = Tin + (Tlat - Tin) * (1 - P.upLoss);
        const pump = M.pumpPower(m, w.md * 2 + T.latN * T.latL, P.geom).kW;
        const o = bestUse(c, m, Ts, Tin, wellCapex + T.latN * T.latL / 1000 * T.capexLat, pump);
        if (o && (!best || o.npv > best.npv)) best = Object.assign(o, { m, Ts, pumpKW: pump });
      });
      out.push(Object.assign({ id: 'ags', trl: '6–7', status: best ? 'cond' : 'no', reasons: reasons([w.integrity === 'poor' && 'integrity', 'sidetrack', host > 0 && 'noHost']), co2t: 0 }, best || {}));
    }

    /* ---- 3. Hydrothermal doublet, with P10–P90 from the uncertainty of the reservoir inputs ---- */
    {
      if (!res || !R) out.push({ id: 'hydro', trl: '9', status: 'nodata', reasons: ['noRes'], Q: 0, Pe: 0, npv: null, co2t: 0 });
      else {
        const run = (r) => { const h = hydroCase(r, U, life, hours); const o = h.m > 0 ? bestUse(c, h.m, h.Twh, r.Treinj, U.capexOpen + host, eco.pumpKW * h.m / 5) : null; return { h, o }; };
        const b = run(res), o = b.o;
        // uncertainty: lognormal factors; estimated inputs are much wider than documented ones
        const conf = ctx.conf || {}, sA = Math.log(conf.A === 'e' ? 3 : 1.3) / 1.2816, sQ = Math.log(conf.Q === 'e' ? 2 : 1.25) / 1.2816, sH = conf.A === 'e' ? 0.2 : 0.1;
        const r = rng(97 + Math.round(w.depth)), sims = [];
        for (let i = 0; i < T.mcN; i++) {
          const x = run(Object.assign({}, res, { A: res.A * Math.exp(sA * gauss(r)), flow: res.flow * Math.exp(sQ * gauss(r)), h: res.h * Math.max(0.3, 1 + sH * gauss(r)), phi: Math.min(0.4, Math.max(0.02, res.phi * (1 + sH * gauss(r)))) }));
          sims.push(x.o ? x.o.npv : -(U.capexOpen + host));
        }
        sims.sort((x, y) => x - y);
        const q = (p) => sims[Math.min(sims.length - 1, Math.floor(p * sims.length))];
        out.push(Object.assign({ id: 'hydro', trl: '9', status: o ? (R.co2High || conf.A === 'e' || conf.Q === 'e' ? 'cond' : 'ok') : 'no', m: b.h.m, Ts: b.h.Twh, co2t: 0,
          sims, p10: q(0.1), p50: q(0.5), p90: q(0.9), pPos: sims.filter((x) => x > 0).length / sims.length, est: conf.A === 'e' || conf.Q === 'e',
          reasons: reasons([!o && 'noFeasible', R.piLimited && 'piLimited', R.limited && 'resLimited', R.co2High && 'co2', conf.A === 'e' && 'estA', conf.Q === 'e' && 'estQ', host > 0 && 'noHost']) }, o || { Q: 0, Pe: 0, npv: null }));
      }
    }

    /* ---- 4. EGS ---- */
    let egs;
    {
      const Tinj = Math.max(U.Treinj, U.Tret), rc = 2.5e6;
      const Hrec = T.egsV * 1e9 * rc * Math.max(0, Trock - Tinj) * T.egsRf;
      const Psust = Hrec / (life * SEC_YEAR) / 1000;
      const Ts = Trock - U.whLoss;
      const mFull = T.egsFlow, PFull = mFull * CPW * Math.max(0, Ts - Tinj) / 1000;
      const m = PFull > 0 ? Math.min(mFull, mFull * Psust / PFull) : 0;
      const pump = m * (T.egsImp * m) * 1e6 / 1000 / 0.7 / 1000;
      const o = m > 0 ? bestUse(c, m, Ts, Tinj, wellCapex + T.capexStim + T.capexWellM * w.md, pump) : null;
      egs = Object.assign({ id: 'egs', trl: '5–7', status: o ? (Trock >= 150 ? 'cond' : 'low') : 'no', m, Ts, co2t: 0, Psust, pumpKW: pump,
        reasons: reasons([Trock < 150 && 'egsLowT', w.depth < 3000 && 'shallow', w.integrity !== 'good' && 'stimIntegrity', 'seismic', m < mFull - 1e-9 && 'srvLimited', host > 0 && 'noHost']) }, o || { Q: 0, Pe: 0, npv: null });
      out.push(egs);
    }

    /* ---- 5. CO2-EGS / CPG: PR-EOS properties, mobility ratio vs water, thermosiphon drive, wellbore cooling ---- */
    {
      const onRes = !!(R && res && R.flow > 0);
      const z = onRes ? (res.z || w.depth) : w.depth, Tres = onRes ? res.Tres : Trock;
      const Pres = 1e5 + 1000 * G0 * z; // hydrostatic
      const Tinj = Math.max(T.co2Tmin, U.Tamb + U.approach);
      const hot = co2(Pres, Tres), cold = co2(Pres, Tinj);
      const mobC = (hot.rho / hot.mu + cold.rho / cold.mu) / 2;
      const TinjW = onRes ? res.Treinj : Math.max(U.Treinj, U.Tret);
      const mobW = (rhoW(Tres) / muW(Tres) + rhoW(TinjW) / muW(TinjW)) / 2;
      const Mr = mobC / mobW;
      // thermosiphon: weight difference of the cold (injection) and hot (production) CO2 columns
      const colRho = (Tc) => (co2(Pres, Tc).rho + co2(Math.max(8e6, Pres / 2), Tc).rho) / 2;
      const rhoCold = colRho(Tinj), rhoHot = colRho(Tres);
      const dpTs = G0 * z * (rhoCold - rhoHot); // Pa
      // water reference: mass flow at its pressure drop across the reservoir
      const mW = onRes ? R.flow : T.egsFlow;
      const dpW = onRes ? 2 * U.dpMax * 1e5 : T.egsImp * T.egsFlow * 1e6; // doublet: drawdown + injection overpressure
      let m = dpTs > 0 ? mW * Mr * dpTs / dpW : 0;
      const dh = Math.max(0, hot.h - cold.h); // J/kg at reservoir pressure
      const Qfull = m * dh / 1000, Qcap = onRes ? R.Psust : egs.Psust;
      if (Qfull > Qcap && Qfull > 0) m *= Qcap / Qfull;
      // wellhead state: h falls by g·z on the way up, pressure by the hot column weight
      const Pwh = Math.max(7.5e6, Pres - rhoHot * G0 * z);
      const Twh = co2TofH(Pwh, hot.h - G0 * z);
      const cpEff = Twh > Tinj + 1 ? Math.max(800, (co2(Pwh, Twh).h - co2(Pwh, Tinj).h) / (Twh - Tinj)) : 1500;
      const co2t = m * T.co2Loss / 100 * hours * 3600 / 1000;
      const credit = co2t * (eco.co2Price || 0) / 1e9;
      const capex = (onRes ? (U.capexOpen || 0) + host : wellCapex + T.capexStim + T.capexWellM * w.md) + T.capexCPG;
      const o = m > 0 && Twh > Tinj + 5 ? bestUse(c, m, Twh, Tinj, capex, 0, { directCO2: true, cp: cpEff, extraValue: credit }) : null;
      const sameDp = Mr * dh / (CPW * Math.max(1, Tres - TinjW)); // heat extraction ratio CO2 / water at equal pressure drop
      Object.assign(D, { co2RhoHot: hot.rho, co2RhoCold: cold.rho, co2MuHot: hot.mu, mobRatio: Mr, heatRatio: sameDp, dpTsBar: dpTs / 1e5, co2Twh: Twh, co2Pres: Pres / 1e5, co2PwhBar: Pwh / 1e5 });
      out.push(Object.assign({ id: 'cpg', trl: '4–5', status: o ? 'cond' : (onRes || egs.m > 0 ? 'no' : 'nodata'), m, Ts: Twh, co2t, credit, base: onRes ? 'hydro' : 'egs', mobRatio: Mr, dpTsBar: dpTs / 1e5,
        reasons: reasons([z < 800 && 'shallowCO2', 'co2Supply', !onRes && 'cpgOnEgs', !(eco.co2Price > 0) && 'noCo2Price', dpTs <= 0 && 'noSiphon', host > 0 && onRes && 'noHost']) }, o || { Q: 0, Pe: 0, npv: null }));
    }

    out.forEach((o) => { if (o.capped) o.reasons = (o.reasons || []).concat(o.use === 'power' ? ['capElec'] : ['capHeat']); });
    const clgs = out[0];
    out.forEach((o) => { o.dNpv = Number.isFinite(o.npv) && Number.isFinite(clgs.npv) ? o.npv - clgs.npv : null; });
    const ranked = out.filter((o) => Number.isFinite(o.npv)).sort((a, b) => b.npv - a.npv);
    return { options: out, best: ranked[0] || null, derived: D };
  }

  /**
   * CO2 storage in the well's reservoir (screening).
   * Capacity: volumetric method G = A·h·φ·ρCO2·E (US DOE/NETL, Goodman et al. 2011); E = storage efficiency.
   * Rate: the smaller of capacity/life and the injectivity scaled from the tested water rate by the CO2/water mobility ratio.
   * res: {A km², h m, phi 0–1, z m, Tres °C, flow kg/s}; o: {E 0–1, life, hours, dpMax bar, fee VND/t, capex bn, opexPct, rate 0–1, integrity}
   */
  function co2Storage(res, o) {
    if (!res || !(res.A > 0 && res.h > 0)) return { status: 'nodata' };
    const z = res.z, P = 1e5 + 1000 * G0 * z, c = co2(P, res.Tres);
    const capT = res.A * 1e6 * res.h * res.phi * c.rho * o.E / 1000; // tonnes
    const Mr = (c.rho / c.mu) / (rhoW(res.Tres) / muW(res.Tres));
    const injT = res.flow > 0 ? res.flow * Mr * o.hours * 3.6 : Infinity; // t/yr at the same pressure difference as the water test
    const rateT = Math.min(capT / o.life, injT);
    const capex = o.capex, opex = capex * o.opexPct / 100;
    const ann = o.rate > 0 ? (1 - Math.pow(1 + o.rate, -o.life)) / o.rate : o.life;
    const yearly = rateT * o.fee / 1e9 - opex;
    const ok = z >= 800 && o.integrity !== 'poor';
    return { status: ok ? 'ok' : 'no', why: z < 800 ? 'shallowCO2' : o.integrity === 'poor' ? 'integrity' : '', capT, rateT, injLimited: injT < capT / o.life, rho: c.rho, Mr,
      capex, opex, yearly, revenue: rateT * o.fee / 1e9, ann, npv: -capex + yearly * ann, breakEvenFee: rateT > 0 ? (capex / ann + opex) * 1e9 / rateT : null };
  }

  /**
   * What to do with a well that must eventually be plugged: the four options as present values (bn VND, cost negative).
   * d: {C: P&A cost today, g: yearly escalation of that cost, r: discount rate, n: years of plain deferral, hold: yearly cost
   *     of keeping a suspended well, L: project life, geo: energy NPV of the best geothermal option (without P&A) or null,
   *     co2: storage NPV (without P&A) or null}
   * P&A paid in year y costs C·(1+g)^y, worth C·((1+g)/(1+r))^y today.
   */
  function decide(d) {
    const pv = (y) => d.C * Math.pow((1 + d.g) / (1 + d.r), y);
    const annN = d.r > 0 ? (1 - Math.pow(1 + d.r, -d.n)) / d.r : d.n;
    const opts = [
      { id: 'now', npv: -d.C, pa: -d.C },
    ];
    if (!d.noDefer) opts.push({ id: 'defer', npv: -d.hold * annN - pv(d.n), pa: -pv(d.n), hold: -d.hold * annN }); // not allowed for an unsafe well
    const Lg = d.Lgeo || d.L, Lc = d.Lco2 || d.L; // the well is plugged when its service life ends
    if (Number.isFinite(d.geo)) opts.push({ id: 'geo', npv: d.geo - pv(Lg), pa: -pv(Lg), ops: d.geo });
    if (Number.isFinite(d.co2)) opts.push({ id: 'co2', npv: d.co2 - pv(Lc), pa: -pv(Lc), ops: d.co2 });
    opts.forEach((o) => { o.gain = o.npv - (-d.C); });
    const best = opts.slice().sort((a, b) => b.npv - a.npv)[0];
    return { options: opts, best };
  }

  /**
   * End-of-life portfolio for one field (the wells share one host): which wells to convert and how much of the
   * host's limited demand each gets, so that the field total is highest.
   *   wells: [{id, alt: value of the best non-geothermal option, geo: [_, v1..vK] value of geothermal when the well is
   *           allotted k of K equal demand units (−Infinity when infeasible), needsHost: no host facility at this well}]
   *   tieback: one-off cost paid once if any well without a host is converted (shared infrastructure)
   * Exact dynamic programme over (well, demand units); solved with and without the tie-back and the better one kept.
   * Returns {plan: [{id, units, value}], total, tieback: bool}.  units = 0 means "take the non-geothermal option".
   */
  function portfolio(wells, K, tieback) {
    const solve = (allowNoHost) => {
      let dp = new Array(K + 1).fill(-Infinity); dp[0] = 0; const picks = [];
      wells.forEach((w) => {
        const nd = new Array(K + 1).fill(-Infinity), pk = new Array(K + 1).fill(0);
        for (let u = 0; u <= K; u++) {
          if (dp[u] === -Infinity) continue;
          if (dp[u] + w.alt > nd[u]) { nd[u] = dp[u] + w.alt; pk[u] = 0; }
          if (w.needsHost && !allowNoHost) continue;
          for (let k = 1; u + k <= K; k++) { const v = w.geo[k]; if (Number.isFinite(v) && dp[u] + v > nd[u + k]) { nd[u + k] = dp[u] + v; pk[u + k] = k; } }
        }
        dp = nd; picks.push(pk);
      });
      let bu = 0; for (let u = 1; u <= K; u++) if (dp[u] > dp[bu]) bu = u;
      const plan = []; let u = bu;
      for (let i = wells.length - 1; i >= 0; i--) { const k = picks[i][u]; plan.unshift({ id: wells[i].id, units: k, value: k ? wells[i].geo[k] : wells[i].alt }); u -= k; }
      const used = plan.some((p, i) => p.units > 0 && wells[i].needsHost);
      return { plan, total: dp[bu] - (used ? tieback : 0), tieback: used };
    };
    const a = solve(false), b = wells.some((w) => w.needsHost) ? solve(true) : a;
    return b.total > a.total ? b : a;
  }
  /**
   * Expected value of perfect information: how much better the decision becomes, on average, if the uncertain
   * option's value were known before choosing (sims: its simulated values; alt: value of the best certain option).
   */
  function evpi(sims, alt) {
    if (!sims || !sims.length) return 0;
    const mean = sims.reduce((a, b) => a + b, 0) / sims.length;
    const withInfo = sims.reduce((a, b) => a + Math.max(b, alt), 0) / sims.length;
    return Math.max(0, withInfo - Math.max(mean, alt));
  }

  /**
   * Well repurposing index Ψ (psi): one number that says whether re-using a well beats plugging it now.
   *
   *        a·V + C·(1 − ρ^L)            a = (1 − (1+r)^−L) / r      present-value factor of L yearly payments
   *   Ψ = ───────────────────           ρ = (1+g) / (1+r)           escalation of the P&A cost against discounting
   *          I + a·O                    V = yearly revenue, O = yearly running cost, I = capital, C = P&A cost today
   *
   * Numerator: everything gained (energy sold + P&A pushed to the end of the project).  Denominator: everything spent.
   * Ψ > 1  ⇔  NPV(re-use) > NPV(plug now).  Against plain deferral for n years with holding cost H the credit becomes
   * C·(ρ^n − ρ^L) + H·a_n  (psiDefer).  o: {V, O, I, C, g, r, L, n, H}
   */
  function psi(o) {
    const a = o.r > 0 ? (1 - Math.pow(1 + o.r, -o.L)) / o.r : o.L, rho = (1 + o.g) / (1 + o.r);
    const an = o.r > 0 ? (1 - Math.pow(1 + o.r, -(o.n || 0))) / o.r : (o.n || 0);
    const den = o.I + a * o.O;
    const credit = o.C * (1 - Math.pow(rho, o.L)), creditD = o.C * (Math.pow(rho, o.n || 0) - Math.pow(rho, o.L)) + (o.H || 0) * an;
    return { psi: (a * o.V + credit) / den, psiDefer: (a * o.V + creditD) / den, a, rho, credit, energyShare: a * o.V / Math.max(1e-12, a * o.V + credit),
      // smallest P&A cost / yearly revenue that makes Ψ = 1 (no such P&A cost when escalation ≥ discount rate)
      Cmin: 1 - Math.pow(rho, o.L) > 1e-9 ? (den - a * o.V) / (1 - Math.pow(rho, o.L)) : null, Vmin: (den - credit) / a };
  }
  /**
   * Closed form of Ψ for a hydrothermal (open-loop) well selling heat, straight from field data:
   *   T_res = T_sb + G·(z − z_w)/100 − δ                       reservoir temperature at the wellhead
   *   Q = min( ṁ·c_w·ΔT ,  R_f·A·h·(ρc)·ΔT / t_L ,  D )         kW: well rate, reservoir heat in place, local demand
   *   V = Q·τ·p_h ,   I = I_0 + i_x·Q ,   O = f·I + W_p·τ·p_e
   * f: {Tsb, G, z, zw, loss, Tinj, mdot, A km², h m, phi, Rf, D kW, hours, pHeat VND/kWh, I0 bn, ix bn/MW, opexPct, pumpKW, pElec, C, g, r, L, n, H}
   */
  function psiHydro(f) {
    const Tres = f.Tres !== undefined ? f.Tres : f.Tsb + f.G * (f.z - (f.zw || 0)) / 100, Twh = Tres - (f.loss || 0), dT = Math.max(0, Twh - f.Tinj);
    const rc = (1 - f.phi) * 2650 * 1000 + f.phi * 1000 * CPW;
    const Qwell = f.mdot * CPW * dT / 1000, Qres = f.Rf * f.A * 1e6 * f.h * rc * Math.max(0, Tres - f.Tinj) / (f.L * SEC_YEAR) / 1000;
    const Q = Math.min(Qwell, Qres, f.D > 0 ? f.D : Infinity);
    const I = f.I0 + f.ix * Q / 1000, V = Q * f.hours * f.pHeat / 1e9, O = I * f.opexPct / 100 + (f.pumpKW || 0) * f.hours * f.pElec / 1e9;
    return Object.assign(psi({ V, O, I, C: f.C, g: f.g, r: f.r, L: f.L, n: f.n, H: f.H }), { Q, Qwell, Qres, Tres, V, O, I, limit: Q === Qres ? 'reservoir' : Q === Qwell ? 'well' : 'demand' });
  }

  /**
   * Ψ* – the well repurposing index in its general, year-by-year form (the basis of the decision page):
   *
   *          Σ_{t=1..L} V_t/(1+r)^t  +  C0  −  C0·(1+gC)^L/(1+r)^L
   *   Ψ* = ───────────────────────────────────────────────────────
   *                    I0  +  Σ_{t=1..L} O_t/(1+r)^t
   *
   * V_t, O_t: revenue and running cost of year t (arrays of length L, or numbers when constant); I0: capital today;
   * C0: P&A cost today; gC: its yearly escalation; r: discount rate.  Ψ* > 1 ⇔ NPV(re-use, plug at L) > NPV(plug now).
   * With constant V_t, O_t it reduces to psi().  Against deferral for n years with holding cost H the P&A term is
   * C0·[(1+gC)^n/(1+r)^n − (1+gC)^L/(1+r)^L] + Σ_{t≤n} H/(1+r)^t.
   */
  function psiStar(o) {
    const L = o.L, at = (x, i) => (Array.isArray(x) ? (x[i] !== undefined ? x[i] : x[x.length - 1] || 0) : x);
    let pvV = 0, pvO = 0, pvH = 0;
    for (let y = 1; y <= L; y++) { const d = Math.pow(1 + o.r, -y); pvV += at(o.V, y - 1) * d; pvO += at(o.O, y - 1) * d; if (y <= (o.n || 0)) pvH += (o.H || 0) * d; }
    const rho = (1 + o.gC) / (1 + o.r), paL = o.C0 * Math.pow(rho, o.La || L), paN = o.C0 * Math.pow(rho, o.n || 0); // La: year of P&A (end of service life)
    const credit = o.C0 - paL, creditD = paN - paL + pvH, den = o.I0 + pvO;
    return { psi: (pvV + credit) / den, psiDefer: (pvV + creditD) / den, pvV, pvO, credit, paL, energyShare: pvV / Math.max(1e-12, pvV + credit), npvOps: pvV - pvO - o.I0 };
  }

  global.AWTech = { DEF, evaluate, bestUse, co2, co2TofH, rhoW, muW, hydroCase, co2Storage, decide, portfolio, evpi, psi, psiHydro, psiStar };
})(window);
