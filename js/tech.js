/* AbandonedWell Energy AI – geothermal technology comparison (screening level)
 * For one well, estimates what each technology could deliver and is worth:
 *   CLGS  – closed-loop coaxial retrofit of the existing well (conduction only)            TRL 7
 *   AGS   – advanced closed loop: U-loop with multilateral horizontal legs at reservoir depth TRL 6–7
 *   HYDRO – conventional hydrothermal doublet producing reservoir water (open loop)          TRL 9
 *   EGS   – enhanced system: hydraulic stimulation + new injector, water circulation          TRL 5–7
 *   CPG   – CO2-EGS / CO2-plume geothermal: supercritical CO2 circulated through the depleted
 *           reservoir (thermosiphon, no pump), part of the CO2 permanently stored             TRL 4–5
 * Each option picks the better use (electricity by ORC/direct turbine, or direct heat) by NPV.
 * Physics are deliberately simple and documented; results rank options, they do not design them.
 */
(function (global) {
  'use strict';
  const K = 273.15, CPW = 4180, SEC_YEAR = 365.25 * 86400;

  const DEF = {
    latN: 2, latL: 2000, capexLat: 30,          // AGS: number of laterals, length each (m), drilling bn VND per km
    egsFlow: 30, egsV: 0.2, egsRf: 0.2,         // EGS: circulation kg/s, stimulated rock volume km³, recovery of its heat
    egsImp: 0.15, capexStim: 60, capexWellM: 0.08, // impedance MPa per kg/s, stimulation bn VND, new well bn VND per m MD
    co2Gain: 1.5, co2Loss: 5, capexCPG: 40, co2Tmin: 31, // CPG: heat-extraction ratio vs water, fluid loss % of circulation, surface plant bn VND
    heatDemOff: 1000, heatDemOn: 5000, elecDem: 5000,  // local demand that can actually be sold: heat kWth (offshore / onshore), power kWe
  };

  const npv = (capex, yearly, rate, life) => { let v = -capex; for (let y = 1; y <= life; y++) v += yearly / Math.pow(1 + rate, y); return v; };
  /** Levelised cost of electricity (VND/kWh) or heat when Pe = 0. */
  const lcoe = (capex, opexYr, energyKWh, rate, life) => {
    if (!(energyKWh > 0)) return null;
    const crf = rate > 0 ? rate / (1 - Math.pow(1 + rate, -life)) : 1 / life;
    return (capex * crf + opexYr) * 1e9 / energyKWh;
  };

  /**
   * Best use of a hot stream (m kg/s at Ts °C, returned at Tret): electricity (best ORC fluid, or a CO2 direct
   * turbine) vs direct heat. Returns the NPV-best use with its numbers.
   * ctx: {U, eco, life, rate, hours, elecValue}
   */
  function bestUse(ctx, m, Ts, Tret, capexBase, pumpKW, opts = {}) {
    const U = ctx.U, A = global.AWUtil, Tcond = U.Tamb + U.approach, hours = ctx.hours;
    const cands = [];
    const finish = (o) => {
      o.capex = capexBase + o.capexSurf;
      o.opex = o.capex * ctx.eco.opexPct / 100;
      o.pumpCost = pumpKW * hours * ctx.eco.elecPrice / 1e9;
      o.extra = opts.extraValue || 0; // e.g. CO2 storage credit
      o.yearly = o.value + o.extra - o.opex - o.pumpCost;
      o.npv = npv(o.capex, o.yearly, ctx.rate, ctx.life);
      o.lcoe = lcoe(o.capex, o.opex + o.pumpCost, (o.Pe > 0 ? o.Pe + (o.Q2 || 0) : o.Q) * hours, ctx.rate, ctx.life); // per kWh of energy sold (power + heat for cogeneration)
      return o;
    };
    // electricity (and cogeneration)
    let best = null, bestCo = null;
    const capE = ctx.elecDem > 0 ? ctx.elecDem : Infinity, capH = ctx.heatDem > 0 ? ctx.heatDem : Infinity;
    const fluids = opts.directCO2 ? [{ id: 'sco2', name: 'CO₂ turbine', minT: 60, eps: 0.48, p40: null, tc: null }] : A.FLUIDS;
    fluids.forEach((f) => {
      const r = A.orc(f, Ts, m, Tcond, Tret, opts.directCO2 ? 2 : U.pinch);
      if (!r.feasible || !(r.Pe > 0)) return;
      const Pe = Math.min(r.Pe, capE);
      const o = finish({ use: 'power', fluid: f.name, Q: r.Qin * Pe / r.Pe, Qall: r.Qin, Pe, PeAll: r.Pe, capped: Pe < r.Pe, eta: r.eta, value: Pe * hours * ctx.elecValue / 1e9, capexSurf: Pe * U.capexORC / 1000 });
      if (!best || o.npv > best.npv) best = o;
      // cogeneration: ORC first, then direct heat from the ORC outlet down to the return temperature
      const Q2all = Math.max(0, m * (opts.cp || CPW) * (r.Tout - Tret) / 1000), Q2 = Math.min(Q2all, capH);
      if (Q2 > 0) {
        const price2 = r.Tout >= U.Tdry ? U.heatHigh : U.heatLow;
        const g = finish({ use: 'cogen', fluid: f.name, Q: r.Qin * Pe / r.Pe + Q2, Qall: r.Qin + Q2all, Q2, Pe, PeAll: r.Pe, capped: Pe < r.Pe || Q2 < Q2all, eta: r.eta, Tout: r.Tout,
          value: (Pe * ctx.elecValue + Q2 * price2) * hours / 1e9, capexSurf: (Pe * U.capexORC + Q2 * U.capexHX) / 1000 });
        if (!bestCo || g.npv > bestCo.npv) bestCo = g;
      }
    });
    if (best) cands.push(best);
    if (bestCo) cands.push(bestCo);
    // direct heat
    const Qall = Math.max(0, m * (opts.cp || CPW) * (Ts - Tret) / 1000);
    if (Qall > 0) {
      const price = Ts >= U.Tdry ? U.heatHigh : U.heatLow, Q = Math.min(Qall, capH);
      cands.push(finish({ use: Ts >= U.Tdry ? 'heatHigh' : 'heatLow', Q, Qall, capped: Q < Qall, Pe: 0, value: Q * hours * price / 1e9, capexSurf: Q * U.capexHX / 1000 }));
    }
    cands.sort((a, b) => b.npv - a.npv);
    return cands[0] || null;
  }

  /**
   * w: screened well from AWModel.screen (depth TVD, md, G, Tbottom, base, integrity, location)
   * ev: AWUtil.evaluate result for the well (closed loop and, if reservoir data exist, open loop)
   * ctx: {P, U, eco, resIn, T: technology parameters, wellCapex}
   */
  function evaluate(w, ev, ctx) {
    const M = global.AWModel, P = ctx.P, U = ctx.U, T = Object.assign({}, DEF, ctx.T || {});
    const eco = ctx.eco, life = eco.life, rate = eco.rate / 100, hours = eco.hours;
    const offshore = w.location === 'offshore';
    const c = { U, eco, life, rate, hours, elecValue: U.elecValue, heatDem: offshore ? T.heatDemOff : T.heatDemOn, elecDem: T.elecDem };
    const Trock = w.Tbottom, out = [];
    const reasons = (arr) => arr.filter(Boolean);

    /* ---- 1. CLGS: coaxial closed loop, flow optimised, same pricing and demand caps as the other technologies ---- */
    {
      let best = null;
      [1, 2, 3, 4, 5, 6, 8, 10, 12].forEach((m) => {
        const Ts = M.wellOutput(Object.assign({}, w.base, { m, Tin: U.Tret, n: 250 })).Tout;
        const pump = eco.pumpAuto ? M.pumpPower(m, w.md, P.geom).kW : eco.pumpKW * m / 5;
        const o = bestUse(c, m, Ts, U.Tret, ctx.wellCapex, pump);
        if (o && (!best || o.npv > best.npv)) best = Object.assign(o, { m, Ts });
      });
      out.push(Object.assign({ id: 'clgs', trl: '7', status: best ? 'ok' : 'no', reasons: reasons([!best && 'noFeasible', w.integrity === 'poor' && 'integrity']), co2t: 0 }, best || { Q: 0, Pe: 0, npv: null }));
    }

    /* ---- 2. AGS: U-loop, N laterals of length L at rock temperature Trock (line-source conduction, Ramey f(t)) ---- */
    {
      const f = M.rameyF(Math.max(1, P.years) * SEC_YEAR, 1e-6, 0.108);
      let best = null;
      [2, 4, 6, 8, 10, 15, 20, 30].forEach((m) => {
        const mi = m / T.latN; const Tin = U.Tret;
        const Tlat = Trock - (Trock - Tin) * Math.exp(-2 * Math.PI * P.k * T.latL / (f * mi * CPW));
        const Ts = Tin + (Tlat - Tin) * (1 - P.upLoss);
        const pump = M.pumpPower(m, w.md * 2 + T.latN * T.latL, P.geom).kW;
        const capex = ctx.wellCapex + T.latN * T.latL / 1000 * T.capexLat;
        const o = bestUse(c, m, Ts, Tin, capex, pump);
        if (o && (!best || o.npv > best.npv)) best = Object.assign(o, { m, Ts });
      });
      out.push(Object.assign({ id: 'ags', trl: '6–7', status: best ? 'cond' : 'no', reasons: reasons([w.integrity === 'poor' && 'integrity', 'sidetrack']), co2t: 0 }, best || {}));
    }

    /* ---- 3. Hydrothermal doublet (open loop) – needs reservoir data; flow and temperature from the reservoir model ---- */
    {
      const R = ev.reservoir;
      if (!ctx.resIn || !R) out.push({ id: 'hydro', trl: '9', status: 'nodata', reasons: ['noRes'], Q: 0, Pe: 0, npv: null, co2t: 0 });
      else {
        const m = R.mSust, Tinj = ctx.resIn.Treinj;
        const o = m > 0 ? bestUse(c, m, R.Twh, Tinj, U.capexOpen, eco.pumpKW * m / 5) : null;
        out.push(Object.assign({ id: 'hydro', trl: '9', status: o ? (R.co2High ? 'cond' : 'ok') : 'no', m, Ts: R.Twh, co2t: 0,
          reasons: reasons([!o && 'noFeasible', R.piLimited && 'piLimited', R.limited && 'resLimited', R.co2High && 'co2']) }, o || { Q: 0, Pe: 0, npv: null }));
      }
    }

    /* ---- 4. EGS: stimulated volume around the well + new injector, water circulation ---- */
    {
      const Tinj = Math.max(U.Treinj, U.Tret);
      const rc = 2.5e6; // J/(m³K) rock
      const Hrec = T.egsV * 1e9 * rc * Math.max(0, Trock - Tinj) * T.egsRf;
      const Psust = Hrec / (life * SEC_YEAR) / 1000; // kWth
      const Ts = Trock - U.whLoss;
      const mFull = T.egsFlow, PFull = mFull * CPW * Math.max(0, Ts - Tinj) / 1000;
      const m = PFull > 0 ? Math.min(mFull, mFull * Psust / PFull) : 0;
      const dp = T.egsImp * m; // MPa
      const pump = m * dp * 1e6 / 1000 / 0.7 / 1000; // kW
      const capex = ctx.wellCapex + T.capexStim + T.capexWellM * w.md;
      const o = m > 0 ? bestUse(c, m, Ts, Tinj, capex, pump) : null;
      out.push(Object.assign({ id: 'egs', trl: '5–7', status: o ? (Trock >= 150 ? 'cond' : 'low') : 'no',
        reasons: reasons([Trock < 150 && 'egsLowT', w.depth < 3000 && 'shallow', w.integrity !== 'good' && 'stimIntegrity', 'seismic', m < mFull - 1e-9 && 'srvLimited']), m, Ts, co2t: 0, Psust }, o || { Q: 0, Pe: 0, npv: null }));
    }

    /* ---- 5. CO2-EGS / CPG: CO2 through the depleted reservoir (or stimulated rock), thermosiphon, CO2 stored ---- */
    {
      const R = ev.reservoir;
      const water = R && R.mSust > 0 ? { Qw: R.mSust * CPW * Math.max(0, R.Twh - ctx.resIn.Treinj) / 1000, base: 'hydro' }
        : { Qw: (() => { const e = out.find((x) => x.id === 'egs'); return e.Qall || e.Q || 0; })(), base: 'egs' };
      const Ts = Trock - U.whLoss * 0.5; // smaller wellbore loss: higher mass rate, lower heat capacity, no pump heating
      const Tinj = Math.max(T.co2Tmin, U.Tamb + U.approach);
      const cpCO2 = 1900; // J/(kg K), supercritical average at reservoir conditions (screening value)
      const Q = water.Qw * T.co2Gain;
      const m = Q > 0 ? Q * 1000 / (cpCO2 * Math.max(1, Ts - Tinj)) : 0;
      const co2t = m * T.co2Loss / 100 * hours * 3600 / 1000; // t/yr permanently stored (fluid loss to the formation)
      const credit = co2t * (eco.co2Price || 0) / 1e9; // bn VND/yr
      const capex = (water.base === 'egs' ? ctx.wellCapex + T.capexStim + T.capexWellM * w.md : (U.capexOpen || 0)) + T.capexCPG;
      const o = m > 0 ? bestUse(c, m, Ts, Tinj, capex, 0, { directCO2: true, cp: cpCO2, extraValue: credit }) : null;
      out.push(Object.assign({ id: 'cpg', trl: '4–5', status: o ? 'cond' : (water.Qw > 0 ? 'no' : 'nodata'),
        reasons: reasons([w.depth < 800 && 'shallowCO2', 'co2Supply', water.base === 'egs' && 'cpgOnEgs', !(eco.co2Price > 0) && 'noCo2Price']), m, Ts, co2t, credit, base: water.base }, o || { Q: 0, Pe: 0, npv: null }));
    }

    out.forEach((o) => { if (o.capped) o.reasons = (o.reasons || []).concat(o.use === 'power' ? ['capElec'] : ['capHeat']); });
    const clgs = out[0];
    out.forEach((o) => { o.dNpv = Number.isFinite(o.npv) && Number.isFinite(clgs.npv) ? o.npv - clgs.npv : null; });
    const ranked = out.filter((o) => Number.isFinite(o.npv)).sort((a, b) => b.npv - a.npv);
    return { options: out, best: ranked[0] || null };
  }

  global.AWTech = { DEF, evaluate, bestUse };
})(window);
