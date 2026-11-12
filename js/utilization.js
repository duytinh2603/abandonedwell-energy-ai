/* AbandonedWell Energy AI – utilisation optimiser
 * Which way of using a well's heat gives the most value?
 *   - Direct heat (heat-pump substitute / drying & industrial heat)
 *   - ORC / Kalina power with a choice of low-boiling working fluids
 *   - Cascade: ORC first, then direct heat from the ORC outlet
 * for two heat sources:
 *   - closed-loop coaxial well (conduction only, Ramey model, flow rate optimised)
 *   - open loop producing reservoir fluid (volumetric heat in place: area × thickness × porosity)
 * Screening-level physics: ORC efficiency = exergy factor × Carnot efficiency at the log-mean source
 * temperature, brine outlet at the max-work optimum sqrt(Ts·Tc). Fluid data are approximate.
 */
(function (global) {
  'use strict';
  const K = 273.15, CP = 4180;
  const SEC_YEAR = 365.25 * 86400;

  /* bp: normal boiling point °C; tc: critical temperature °C; p40: saturation pressure at 40 °C (bar);
     minT: practical minimum source temperature °C; eps: exergy (second-law) factor incl. parasitics */
  const FLUIDS = [
    { id: 'r134a', name: 'R134a', bp: -26.1, tc: 101.1, p40: 10.2, minT: 70, eps: 0.40, gwp: 1430, flam: false, tox: false },
    { id: 'r1233zd', name: 'R1233zd(E)', bp: 18.3, tc: 166.5, p40: 2.2, minT: 80, eps: 0.42, gwp: 1, flam: false, tox: false },
    { id: 'r245fa', name: 'R245fa', bp: 15.1, tc: 154.0, p40: 2.5, minT: 80, eps: 0.42, gwp: 1030, flam: false, tox: false },
    { id: 'isobutane', name: 'Isobutane (R600a)', bp: -11.7, tc: 134.7, p40: 5.3, minT: 90, eps: 0.45, gwp: 3, flam: true, tox: false },
    { id: 'isopentane', name: 'Isopentane', bp: 27.8, tc: 187.2, p40: 1.5, minT: 110, eps: 0.45, gwp: 5, flam: true, tox: false },
    { id: 'npentane', name: 'n-Pentane', bp: 36.1, tc: 196.6, p40: 1.15, minT: 120, eps: 0.44, gwp: 5, flam: true, tox: false },
    { id: 'kalina', name: 'Kalina (NH₃–H₂O)', bp: -33.3, tc: null, p40: null, minT: 80, eps: 0.50, gwp: 0, flam: false, tox: true },
    { id: 'ethanol', name: 'Ethanol', bp: 78.4, tc: 241.0, p40: 0.18, minT: 150, eps: 0.35, gwp: 0, flam: true, tox: false },
  ];

  /** ORC on a sensible-heat source stream (mdot kg/s at Ts °C). */
  function orc(f, Ts, mdot, Tcond, Tfloor, pinch = 5) {
    const r = { fluid: f, reasons: [], notes: [] };
    const Tout = Math.max(Tcond + 10, Math.sqrt((Ts + K) * (Tcond + K)) - K, Tfloor || -Infinity);
    if (Ts < f.minT) r.reasons.push('lowT');
    if (Ts - Tout < 8) r.reasons.push('smallDT');
    let eps = f.eps;
    if (f.p40 !== null && f.p40 < 1) { eps *= 0.8; r.notes.push('vacuum'); }
    if (f.tc !== null && Ts > f.tc - 5) r.notes.push('transcritical');
    const Thm = Ts > Tout ? ((Ts + K) - (Tout + K)) / Math.log((Ts + K) / (Tout + K)) : Ts + K;
    const carnot = Math.max(0, 1 - (Tcond + K) / Math.max(Tcond + K + 1, Thm - pinch)); // evaporator pinch lowers the usable source temperature
    r.Tout = Tout;
    r.Qin = Math.max(0, mdot * CP * (Ts - Tout) / 1000); // kWth
    r.eta = eps * carnot;
    r.feasible = r.reasons.length === 0;
    r.Pe = r.feasible ? r.Qin * r.eta : 0; // kWe net
    return r;
  }

  /** Volumetric heat in place (USGS method). res: {A km², h m, phi 0-1, Tres, Treinj, Rf 0-1} */
  function reservoir(res, life) {
    const V = res.A * 1e6 * res.h;
    const rc = (1 - res.phi) * 2650 * 1000 + res.phi * 1000 * CP; // J/(m³·K)
    const H = V * rc * Math.max(0, res.Tres - res.Treinj); // J
    const Hrec = H * res.Rf;
    const Psust = Hrec / (life * SEC_YEAR) / 1000; // kWth sustained over the project life
    return { V, rc, H, Hrec, Psust, perKm2: Psust / Math.max(res.A, 1e-9), HGWh: H / 3.6e12, HrecGWh: Hrec / 3.6e12 };
  }

  /** Cold-front geometry of an injector over `seconds` at mdot kg/s: swept radius (m), area (km²),
   *  recommended producer–injector spacing √3·r, and breakthrough time (yr) for a given spacing (Gringarten-type). */
  function sweep(res, mdot, seconds, spacing) {
    const rc = (1 - res.phi) * 2650 * 1000 + res.phi * 1000 * CP;
    const r = Math.sqrt(Math.max(0, mdot * CP * seconds / (Math.PI * res.h * rc)));
    const tb = spacing > 0 && mdot > 0 ? Math.PI * res.h * spacing * spacing * rc / (3 * mdot * CP) / SEC_YEAR : null;
    return { r, area: Math.PI * r * r / 1e6, spacing: Math.sqrt(3) * r, tbYears: tb };
  }

  /** NPV (bn VND) of a constant yearly cash flow. */
  function npv(capex, yearly, rate, life) {
    let v = -capex;
    for (let y = 1; y <= life; y++) v += yearly / Math.pow(1 + rate, y);
    return v;
  }

  /**
   * Evaluate every option for one well.
   * base: wellOutput params for the closed loop (L, G, T0, k, years, Rw, upLoss)
   * U: utilisation parameters, eco: project economics, wellCapex: bn VND retrofit cost
   * resIn: optional reservoir inputs for the open-loop source
   */
  function evaluate(base, U, eco, wellCapex, resIn) {
    const M = global.AWModel;
    const Tcond = U.Tamb + U.approach;
    const hours = eco.hours, life = eco.life, rate = eco.rate / 100;
    const toBn = (vnd) => vnd / 1e9;
    const flows = [0.5, 1, 1.5, 2, 3, 4, 5, 6, 8, 10, 12];
    const pumpCost = (m) => toBn((eco.pumpAt ? eco.pumpAt(m) : eco.pumpKW * (m / 5)) * hours * eco.elecPrice);

    function finish(o, capexWell, m) {
      o.capex = capexWell + o.capexSurf;
      o.opex = o.capex * eco.opexPct / 100;
      o.yearly = o.value - o.opex - pumpCost(m);
      o.npv = npv(o.capex, o.yearly, rate, life) + (eco.deferral || 0); // re-use defers the plugging & abandonment spend
      o.m = m;
      return o;
    }
    const heatGrade = (T) => (T >= U.Tdry ? U.heatHigh : U.heatLow);
    // only what the local consumers can take is sold (0 = no limit)
    const capH = (Q) => (U.heatDem > 0 ? Math.min(Q, U.heatDem) : Q), capE = (P) => (U.elecDem > 0 ? Math.min(P, U.elecDem) : P);

    // ---- option builders for a source returning {Ts} for given (m, Treturn)
    function options(src) {
      const out = [];
      const best = (build) => { let b = null; for (const m of src.flows) { const o = build(m); if (o && (!b || o.npv > b.npv)) b = o; } return b; };
      // A. direct heat, heat-pump substitute
      out.push(best((m) => {
        const Ts = src.Ts(m, src.Tret); const Q = capH(Math.max(0, m * CP * (Ts - src.Tret) / 1000));
        return finish({ id: 'hp', src: src.id, Ts, Q, Pe: 0, value: toBn(Q * hours * U.heatLow), capexSurf: Q * U.capexHX / 1000, feasible: Q > 0 }, src.capex, m);
      }));
      // B. direct heat for drying / industry (needs Ts >= Tdry)
      out.push(best((m) => {
        const Ts = src.Ts(m, src.Tret); const Q = capH(Math.max(0, m * CP * (Ts - src.Tret) / 1000));
        const ok = Ts >= U.Tdry;
        return finish({ id: 'dry', src: src.id, Ts, Q, Pe: 0, value: ok ? toBn(Q * hours * U.heatHigh) : 0, capexSurf: Q * U.capexHX / 1000, feasible: ok && Q > 0 }, src.capex, m);
      }));
      // C. ORC per fluid (closed loop: water returns to the well at the ORC outlet temperature)
      const perFluid = FLUIDS.map((f) => {
        const o = best((m) => {
          let Tret = Tcond + 10, Ts = src.Ts(m, Tret), r = null;
          for (let i = 0; i < 6; i++) { r = orc(f, Ts, m, Tcond, src.open ? src.Tret : null, U.pinch); Tret = r.Tout; Ts = src.Ts(m, Tret); }
          r = orc(f, Ts, m, Tcond, src.open ? src.Tret : null, U.pinch); r.Pe = capE(r.Pe);
          return finish({ id: 'orc', fluid: f, src: src.id, Ts, Q: r.Qin, Pe: r.Pe, eta: r.eta, Tout: r.Tout, reasons: r.reasons, notes: r.notes,
            value: toBn(r.Pe * hours * U.elecValue), capexSurf: r.Pe * U.capexORC / 1000, feasible: r.feasible && r.Pe > 0 }, src.capex, m);
        });
        return o;
      });
      const okF = perFluid.filter((o) => o.feasible).sort((a, b) => b.npv - a.npv);
      const bestOrc = okF[0] || perFluid.slice().sort((a, b) => b.Pe - a.Pe)[0];
      out.push(Object.assign({}, bestOrc));
      // D. cascade: ORC (best fluid) then direct heat from ORC outlet down to Tret
      if (okF.length) {
        const f = okF[0].fluid;
        out.push(best((m) => {
          const Ts = src.Ts(m, src.Tret); const r = orc(f, Ts, m, Tcond, null, U.pinch);
          if (!r.feasible) return null;
          r.Pe = capE(r.Pe);
          const Q2 = capH(Math.max(0, m * CP * (r.Tout - src.Tret) / 1000));
          return finish({ id: 'cascade', fluid: f, src: src.id, Ts, Q: r.Qin + Q2, Q2, Pe: r.Pe, eta: r.eta, Tout: r.Tout,
            value: toBn(r.Pe * hours * U.elecValue + Q2 * hours * heatGrade(r.Tout)), capexSurf: (r.Pe * U.capexORC + Q2 * U.capexHX) / 1000, feasible: true }, src.capex, m);
        }));
      }
      return { options: out.filter(Boolean), fluids: perFluid };
    }

    const result = { Tcond, sources: [] };
    // closed loop
    const closed = {
      id: 'closed', open: false, capex: wellCapex, flows, Tret: U.Tret,
      Ts: (m, Tret) => M.wellOutput(Object.assign({}, base, { m, Tin: Tret, n: 250 })).Tout,
    };
    const rc = options(closed);
    result.sources.push({ id: 'closed', ...rc });

    // open loop (reservoir fluid) when reservoir data are given
    if (resIn && resIn.A > 0 && resIn.h > 0 && resIn.flow > 0 && isFinite(resIn.Tres)) {
      const R = reservoir(resIn, life);
      const Twh = resIn.Tres - U.whLoss;
      // deliverability: DST flow, capped by productivity index × allowed drawdown when PI is known
      const flowCap = resIn.PI > 0 ? resIn.PI * U.dpMax / 86.4 : Infinity;
      const flow = Math.min(resIn.flow, flowCap);
      const PwellFull = flow * CP * Math.max(0, Twh - resIn.Treinj) / 1000;
      const sw = sweep(resIn, flow, life * hours * 3600, resIn.spacing);
      if (U.RfSwept) R.Psust = PwellFull * Math.min(1, resIn.A / Math.max(sw.area, 1e-9)); // physics of the swept cold zone instead of a fixed Rf
      R.perKm2 = R.Psust / Math.max(resIn.A, 1e-9);
      const mSust = PwellFull > 0 ? Math.min(flow, flow * R.Psust / PwellFull) : 0;
      const open = { id: 'open', open: true, capex: U.capexOpen, flows: [mSust], Tret: resIn.Treinj, Ts: () => Twh };
      const ro = mSust > 0 ? options(open) : { options: [], fluids: [] };
      const breakthroughYears = PwellFull > 0 ? R.Hrec / (PwellFull * 1000 * hours * 3600) : Infinity;
      const Amin = R.perKm2 > 0 ? PwellFull / R.perKm2 : Infinity;
      result.reservoir = Object.assign(R, { Twh, PwellFull, mSust, flow, flowCap, piLimited: flowCap < resIn.flow, limited: mSust < flow - 1e-9, breakthroughYears, Amin, sweep: sw, co2High: resIn.co2 > 10, input: resIn });
      result.sources.push({ id: 'open', ...ro });
    }
    // co-produced water from a still-producing platform/field: no well retrofit capex
    if (U.coprod && U.coprod.flow > 0 && isFinite(U.coprod.T)) {
      const Tcp = U.coprod.T - U.whLoss;
      const cp = { id: 'coprod', open: true, capex: 0, flows: [U.coprod.flow], Tret: U.Treinj, Ts: () => Tcp };
      result.sources.push({ id: 'coprod', ...options(cp) });
    }
    const all = result.sources.flatMap((s) => s.options).filter((o) => o.feasible);
    all.sort((a, b) => b.npv - a.npv);
    result.ranked = all;
    result.best = all[0] || null;
    return result;
  }

  global.AWUtil = { FLUIDS, orc, reservoir, sweep, evaluate };
})(window);
