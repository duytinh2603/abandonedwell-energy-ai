/* Automated checks of the computation core. Open tests.html in a browser. */
(function () {
  'use strict';
  const M = window.AWModel, L = window.LAS, U = window.AWUtil, ML = window.AWML;
  const results = [];
  const near = (a, b, tol) => Math.abs(a - b) <= tol;
  function test(name, fn) {
    try { const r = fn(); results.push({ name, ok: r.ok, detail: r.detail }); }
    catch (e) { results.push({ name, ok: false, detail: 'Lỗi: ' + e.message }); }
  }

  /* 1. Closed-loop model reproduces Table 4.1 of the Python prototype v0.1 */
  const T41 = [[2000, 2.8, 34.5, 93], [2000, 3.6, 35.9, 123], [3000, 2.8, 40.1, 211], [3000, 3.6, 43.2, 276], [4000, 2.8, 47.7, 370], [4000, 3.3, 51.0, 440], [4000, 3.6, 53.0, 482]];
  T41.forEach(([Lz, G, Tout, Q]) => test(`Bảng 4.1: L=${Lz} m, G=${G}`, () => {
    const r = M.wellOutput({ L: Lz, G });
    return { ok: near(r.Tout, Tout, 0.06) && near(r.Q, Q, 0.6), detail: `T ra ${r.Tout.toFixed(2)} (chuẩn ${Tout}), Q ${r.Q.toFixed(1)} (chuẩn ${Q})` };
  }));
  test('Suy giảm theo thời gian: 512 → 416 kW (năm 1 → 25)', () => {
    const a = M.wellOutput({ L: 4000, G: 3.3, years: 1 }).Q, b = M.wellOutput({ L: 4000, G: 3.3, years: 25 }).Q;
    return { ok: near(a, 512, 1) && near(b, 416, 1), detail: `${a.toFixed(1)} → ${b.toFixed(1)} kW` };
  });
  test('Lưu lượng: 1 kg/s → 97 °C/281 kW; 10 kg/s → 41 °C/470 kW', () => {
    const a = M.wellOutput({ L: 4000, G: 3.3, m: 1 }), b = M.wellOutput({ L: 4000, G: 3.3, m: 10 });
    return { ok: near(a.Tout, 97, 0.6) && near(a.Q, 281, 1) && near(b.Tout, 41, 0.6) && near(b.Q, 470, 1), detail: `${a.Tout.toFixed(1)}/${a.Q.toFixed(0)}; ${b.Tout.toFixed(1)}/${b.Q.toFixed(0)}` };
  });
  test('Giếng xiên: MD > TVD → nhiều nhiệt hơn, T đáy theo TVD', () => {
    const v = M.wellOutput({ L: 4337, G: 3.49 }), d = M.wellOutput({ L: 4555, Lv: 4337, G: 3.49 });
    return { ok: d.Q > v.Q && near(d.Tbottom, v.Tbottom, 1e-9), detail: `Q ${v.Q.toFixed(0)} → ${d.Q.toFixed(0)} kW, T đáy ${d.Tbottom.toFixed(1)} °C` };
  });

  /* 2. Temperature corrections */
  test('Horner: BHT 112/121 °C, Δt 6/12 h, tc 4 h → 132,6 °C', () => {
    const v = M.hornerStatic(112, 6, 121, 12, 4); return { ok: near(v, 132.6, 0.1), detail: v.toFixed(2) };
  });
  test('Harrison (1983) ở 4.000 m ≈ 19,0 °C', () => { const v = M.harrisonCorrection(4000); return { ok: near(v, 19.0, 0.2), detail: v.toFixed(2) }; });
  test('BHT = 0 bị bỏ qua, dùng gradient', () => {
    const w = M.normaliseWell({ depth_m: 3774, gradient_c100m: 3.372, bht_c: 0 }, 27);
    return { ok: w.gSource === 'given' && near(w.G, 3.372, 1e-9) && w.warnings.includes('bhtIgnored'), detail: `${w.gSource}, G ${w.G}` };
  });

  /* 3. LAS */
  test('LAS 1.2 đơn vị ft/°F + NULL', () => {
    const txt = ['~V', 'VERS. 1.2 :', 'WRAP. NO :', '~W', 'NULL. -999.25 :', 'WELL. : T-1', '~P', 'BHT .DEGF 230 :', '~C', 'DEPT.FT :', 'TEMP.DEGF :', '~A']
      .concat(Array.from({ length: 100 }, (_, i) => `${3000 + i * 10} ${i === 50 ? -999.25 : (80 + 0.016 * (3000 + i * 10)).toFixed(3)}`)).join('\n');
    const p = L.parseLAS(txt, 't.las');
    return { ok: p.wellName === 'T-1' && p.depthConverted && near(p.curves[0].data[0], 914.4, 0.01) && p.curves[1].data[50] === null && p.curves[1].family === 'Temperature', detail: `${p.wellName}, ${p.rows} mẫu, độ sâu đầu ${p.curves[0].data[0].toFixed(1)} m` };
  });
  test('LAS: ghi rồi đọc lại giữ nguyên dữ liệu', () => {
    const w = { name: 'X', curves: L.synthLogs(500, 700, 1, 3, 1), nullValue: -999.25 };
    const p = L.parseLAS(L.writeLAS(w), 'x.las');
    return { ok: p.curves.length === 7 && p.rows === 201 && p.curves[3].data[100] === w.curves[3].data[100], detail: `${p.curves.length} đường cong, ${p.rows} mẫu` };
  });
  test('Gradient từ log nhiệt độ (°F) = 2,92 °C/100 m', () => {
    const d = [], t = []; for (let i = 0; i <= 3000; i++) { const ft = 3000 + i * 2; d.push(ft * 0.3048); t.push(80 + 0.016 * ft); }
    const g = L.gradientFromLog(d, t, 'DEGF'); return { ok: near(g.G, 2.916, 0.01), detail: g.G.toFixed(3) };
  });

  /* 4. Hydraulics, ORC, reservoir */
  test('Bơm thủy lực: 5 kg/s, 4.000 m, 7"/3½" → 4–10 kW', () => { const p = M.pumpPower(5, 4000, {}); return { ok: p.kW > 4 && p.kW < 10 && p.dpBar > 5, detail: `${p.kW.toFixed(1)} kW, ${p.dpBar.toFixed(1)} bar` }; });
  test('ORC: hiệu suất tăng theo nhiệt độ nguồn, < Carnot', () => {
    const f = U.FLUIDS.find((x) => x.id === 'isobutane');
    const a = U.orc(f, 100, 5, 40, null, 5), b = U.orc(f, 140, 5, 40, null, 5);
    return { ok: b.eta > a.eta && b.eta < 1 - 313.15 / 413.15, detail: `η 100 °C ${(a.eta * 100).toFixed(1)}%, 140 °C ${(b.eta * 100).toFixed(1)}%` };
  });
  test('ORC: ethanol không khả thi với nguồn 120 °C', () => { const f = U.FLUIDS.find((x) => x.id === 'ethanol'); const r = U.orc(f, 120, 5, 40); return { ok: !r.feasible, detail: r.reasons.concat(r.notes).join(', ') }; });
  test('Vỉa: nhiệt tại chỗ (1,156 km² × 11,7 m, φ 20%, 129→40 °C) ≈ 988 GWh', () => {
    const r = U.reservoir({ A: 1.156, h: 11.7, phi: 0.2, Tres: 129, Treinj: 40, Rf: 0.1 }, 25); return { ok: near(r.HGWh, 988, 2), detail: `${r.HGWh.toFixed(0)} GWh` };
  });
  test('Vùng nước lạnh: 5,3 kg/s, h 17,5 m, φ 16%, 25 năm × 8.000 h ≈ 317 m', () => {
    const s = U.sweep({ h: 17.5, phi: 0.16 }, 5.3, 25 * 8000 * 3600, 550); return { ok: near(s.r, 317, 5) && near(s.spacing, Math.sqrt(3) * s.r, 1e-9), detail: `r ${s.r.toFixed(0)} m, L ${s.spacing.toFixed(0)} m, đột phá ${s.tbYears.toFixed(1)} năm` };
  });

  /* 5. Economics */
  test('NPV = −vốn + dòng tiền × hệ số niên kim (10%, 25 năm = 9,077)', () => {
    const base = { L: 4000, G: 3.3, years: 1 };
    const e = M.economics(base, { life: 25, capexOn: 10, capexOff: 10, pipeCost: 0, opexPct: 0, rate: 10, hours: 8000, heatPrice: 0, pumpKW: 0, elecPrice: 0 }, { location: 'onshore', distance: 0 });
    return { ok: near(e.npv, -10, 1e-6) && near(e.annuity, 9.077, 0.001), detail: `NPV ${e.npv.toFixed(3)}, niên kim ${e.annuity.toFixed(3)}` };
  });
  test('Giá trị hoãn hủy giếng: 20 tỷ hủy sau 10 năm ở 10 % = 12,29 tỷ; trượt giá 3 %/năm còn 9,64 tỷ', () => {
    const eco = { life: 10, capexOn: 0, capexOff: 0, pipeCost: 0, opexPct: 0, rate: 10, hours: 0, heatPrice: 0, pumpKW: 0, elecPrice: 0, paCost: 20 };
    const e = M.economics({ L: 3000, G: 3.3 }, eco, { location: 'onshore', distance: 0 });
    const f = M.economics({ L: 3000, G: 3.3 }, Object.assign({}, eco, { paEsc: 3 }), { location: 'onshore', distance: 0 });
    return { ok: near(e.deferral, 12.289, 0.01) && near(f.deferral, 20 * (1 - Math.pow(1.03 / 1.1, 10)), 0.01), detail: `${e.deferral.toFixed(3)} và ${f.deferral.toFixed(3)} tỷ` };
  });

  /* 6. Machine learning */
  test('Học máy: tìm lại quan hệ gradient–log trên dữ liệu tổng hợp', () => {
    // synthetic wells: gradient rises with mean GR (shalier section conducts worse)
    const wells = [];
    for (let i = 0; i < 6; i++) {
      const g = 2.8 + 0.25 * i, curves = L.synthLogs(500, 3500, 5, g, 100 + i);
      const gr = curves.find((c) => c.family === 'Gamma Ray'); gr.data = gr.data.map((v) => v + 15 * i);
      wells.push({ uid: 'w' + i, name: 'S' + i, depth_m: 3500, md_m: 3500, curves, tempPoints: [2000, 2600, 3200].map((z) => ({ z, T: 27 + g * z / 100 })) });
    }
    const m = ML.train(wells, 27, M);
    return { ok: m.ok && m.cv.rmseML < m.cv.rmseBase, detail: m.ok ? `RMSE ML ${m.cv.rmseML.toFixed(2)} °C < trung bình ${m.cv.rmseBase.toFixed(2)} °C` : m.reason };
  });

  /* 7. Volve open dataset (Equinor) */
  test('Dữ liệu Volve: 24 giếng, điểm nhiệt độ hợp lệ, gradient mỏ 2–4 °C/100 m, mô hình giếng chạy được', () => {
    const x = new XMLHttpRequest(); x.open('GET', 'data/volve.json', false); x.send();
    if (x.status !== 200) return { ok: false, detail: 'HTTP ' + x.status };
    const D = JSON.parse(x.responseText);
    const pts = D.wells.flatMap((w) => w.temps.map((q) => ({ z: q.tvd - (w.kb || 54.9), T: q.t, md: q.md, tvd: q.tvd })));
    const okPts = pts.every((p) => p.T > 20 && p.T < 250 && p.tvd <= p.md + 1);
    const T0 = 6, sz2 = pts.reduce((a, p) => a + p.z * p.z, 0), G = pts.reduce((a, p) => a + p.z * (p.T - T0), 0) / sz2 * 100;
    const wells = D.wells.filter((w) => w.tdTVD > 0).map((w, i) => ({ uid: 'v' + i, id: w.name, name: w.name, depth_m: w.tdTVD - (w.kb || 54.9), md_m: w.tdMD, gradient_c100m: G, location: 'offshore', integrity: 'fair', distance_km: 0 }));
    const outs = wells.map((w) => M.wellOutput({ L: w.md_m, Lv: w.depth_m, G, T0, Tin: 25 }));
    const okScreen = outs.length >= 15 && outs.every((o) => isFinite(o.Q) && isFinite(o.Tout));
    return { ok: D.wells.length === 24 && pts.length >= 100 && okPts && G > 2 && G < 4 && okScreen,
      detail: `${D.wells.length} giếng, ${pts.length} điểm, G = ${G.toFixed(2)} °C/100 m, ${wells.length} giếng tính được; ${D.seismic.cubes.length} khối 3D` };
  });

  /* 8. Technology comparison (CLGS / AGS / hydrothermal / EGS / CO2-EGS) */
  const techSetup = () => {
    const P = { T0: 27, k: 2.5, years: 10, upLoss: 0.1, geom: {} };
    const eco = { heatPrice: 735, capexOn: 6, capexOff: 25, pipeCost: 1.5, opexPct: 3, pumpKW: 15, hours: 8000, rate: 10, life: 25, elecPrice: 2204, pumpAuto: true, co2Price: 0 };
    const U = { Tamb: 30, approach: 10, Tdry: 60, elecValue: 2204, heatHigh: 950, heatLow: 735, capexORC: 100, capexHX: 2, capexOpen: 30, whLoss: 5, Tret: 30, Treinj: 40, Rf: 0.1, pinch: 5, dpMax: 20 };
    const base = { L: 4000, Lv: 4000, G: 3.5, T0: 27, k: 2.5, m: 5, Tin: 30, years: 10, Rw: 0.1, upLoss: 0.1 };
    const w = { depth: 4000, md: 4000, G: 3.5, Tbottom: 167, location: 'offshore', integrity: 'good', base };
    const resIn = { A: 2, h: 20, phi: 0.15, flow: 5, z: 4000, Tres: 160, Treinj: 40, Rf: 0.1, PI: 0, spacing: 0, co2: 0 };
    const ev = window.AWUtil.evaluate(base, U, eco, 25, resIn);
    const run = (T, extra) => window.AWTech.evaluate(w, ev, Object.assign({ P, U, eco, resIn, wellCapex: 25, T }, extra || {}));
    return { run, ev };
  };
  test('So sánh công nghệ: đủ 5 công nghệ, AGS thu nhiệt > CLGS, EGS vốn lớn nhất, giới hạn nhu cầu, vốn kết nối khi không có giàn', () => {
    const { run } = techSetup();
    const r = run({ heatDemOff: 0, elecDem: 0 });
    const o = (id, rr = r) => rr.options.find((x) => x.id === id);
    const capped = run({ heatDemOff: 500, elecDem: 200 });
    const capOk = capped.options.every((x) => !(x.Pe > 200.01) && !(x.use && x.use.startsWith('heat') && x.Q > 500.01));
    const noHost = run({ heatDemOff: 0, elecDem: 0 }, { hostCapex: 250 });
    const hostOk = Math.abs(o('clgs', noHost).capex - o('clgs').capex - 250) < 1e-6 && o('hydro', noHost).npv < o('hydro').npv;
    const all5 = ['clgs', 'ags', 'hydro', 'egs', 'cpg'].every((k) => r.options.some((x) => x.id === k));
    const ok = all5 && (o('ags').Qall || o('ags').Q) > o('clgs').Q && o('egs').capex > o('ags').capex && capOk && hostOk && !!r.best;
    return { ok, detail: `Q CLGS ${o('clgs').Q.toFixed(0)}, AGS ${(o('ags').Qall || o('ags').Q).toFixed(0)} kWth; vốn EGS ${o('egs').capex.toFixed(0)} tỷ đ; không giàn: +250 tỷ đ; tốt nhất ${r.best.id}` };
  });
  test('CO₂ (Peng–Robinson): khối lượng riêng 200 bar/40 °C ≈ 840, 300 bar/150 °C ≈ 480 kg/m³ (NIST ±8 %); linh động CO₂ > nước; có tự tuần hoàn', () => {
    const a = window.AWTech.co2(200e5, 40), b = window.AWTech.co2(300e5, 150);
    const { run } = techSetup(); const r = run({ heatDemOff: 0, elecDem: 0 }); const D = r.derived;
    const ok = Math.abs(a.rho / 840 - 1) < 0.08 && Math.abs(b.rho / 480 - 1) < 0.08 && a.mu > 5e-5 && a.mu < 1.1e-4 && D.mobRatio > 1.5 && D.mobRatio < 8 && D.dpTsBar > 20 && D.co2Twh < 160 && D.co2Twh > 60;
    return { ok, detail: `ρ ${a.rho.toFixed(0)} / ${b.rho.toFixed(0)} kg/m³, μ ${(a.mu * 1e6).toFixed(0)} µPa·s; linh động ×${D.mobRatio.toFixed(1)}, nhiệt ×${D.heatRatio.toFixed(2)}, Δp tự tuần hoàn ${D.dpTsBar.toFixed(0)} bar, T miệng giếng ${D.co2Twh.toFixed(0)} °C` };
  });
  test('Vỉa: P10 ≤ P50 ≤ P90 và khoảng rộng hơn khi thông số là ước tính', () => {
    const { run } = techSetup();
    const m = run({}, { conf: { A: 'm', Q: 'm' } }).options.find((x) => x.id === 'hydro'), e = run({}, { conf: { A: 'e', Q: 'e' } }).options.find((x) => x.id === 'hydro');
    const ok = m.p10 <= m.p50 && m.p50 <= m.p90 && (e.p90 - e.p10) > (m.p90 - m.p10) * 1.3;
    return { ok, detail: `tài liệu: ${m.p10.toFixed(0)}…${m.p90.toFixed(0)}; ước tính: ${e.p10.toFixed(0)}…${e.p90.toFixed(0)} tỷ đ` };
  });
  test('Độ sâu nước biển: gradient tính từ đáy biển, nhiệt độ đáy giếng không đổi', () => {
    const a = M.normaliseWell({ id: 'x', depth_m: 3000, bht_c: 120, location: 'offshore' }, 20, 0), b = M.normaliseWell({ id: 'x', depth_m: 3000, bht_c: 120, location: 'offshore' }, 20, 120);
    const Ta = 20 + a.G / 100 * 3000, Tb = 20 + b.G / 100 * (3000 - 120);
    return { ok: b.G > a.G && Math.abs(Ta - Tb) < 1e-6 && b.wd === 120, detail: `G ${a.G.toFixed(3)} → ${b.G.toFixed(3)} °C/100 m, T đáy ${Tb.toFixed(1)} °C` };
  });

  /* 9. Well decision and CO2 storage */
  test('Quyết định giếng: hủy ngay = −C; hoãn có trượt giá; trượt giá bằng lãi suất thì hoãn không lợi', () => {
    const base = { C: 100, g: 0, r: 0.10, n: 10, hold: 0, L: 25, geo: 20, co2: null };
    const a = window.AWTech.decide(base), o = (r, id) => r.options.find((x) => x.id === id);
    const b = window.AWTech.decide(Object.assign({}, base, { g: 0.10 })), c = window.AWTech.decide(Object.assign({}, base, { hold: 3 }));
    const ok = o(a, 'now').npv === -100 && near(o(a, 'defer').npv, -100 / Math.pow(1.1, 10), 1e-9) && near(o(a, 'geo').npv, 20 - 100 / Math.pow(1.1, 25), 1e-9)
      && near(o(b, 'defer').npv, -100, 1e-9) && o(c, 'defer').npv < o(a, 'defer').npv && a.best.id === 'geo' && near(a.best.gain, a.best.npv + 100, 1e-9);
    return { ok, detail: `hủy ngay −100; hoãn 10 năm ${o(a, 'defer').npv.toFixed(1)}; địa nhiệt ${o(a, 'geo').npv.toFixed(1)}; trượt giá 10 %: hoãn ${o(b, 'defer').npv.toFixed(1)}` };
  });
  test('Lưu trữ CO₂: sức chứa = A·h·φ·ρ·E; phí hòa vốn làm NPV = 0', () => {
    const res = { A: 2, h: 20, phi: 0.15, z: 3000, Tres: 120, flow: 5 };
    const o = { E: 0.05, life: 25, hours: 8000, fee: 0, capex: 80, opexPct: 3, rate: 0.10, integrity: 'good' };
    const s0 = window.AWTech.co2Storage(res, o), exp = 2e6 * 20 * 0.15 * s0.rho * 0.05 / 1000;
    const s1 = window.AWTech.co2Storage(res, Object.assign({}, o, { fee: s0.breakEvenFee }));
    const none = window.AWTech.co2Storage(null, o), shallow = window.AWTech.co2Storage(Object.assign({}, res, { z: 500 }), o);
    const ok = near(s0.capT, exp, 1) && s0.rho > 400 && s0.rho < 800 && Math.abs(s1.npv) < 1e-6 && none.status === 'nodata' && shallow.status === 'no';
    return { ok, detail: `ρ ${s0.rho.toFixed(0)} kg/m³, sức chứa ${(s0.capT / 1000).toFixed(0)} nghìn tấn, ${(s0.rateT / 1000).toFixed(1)} nghìn tấn/năm, phí hòa vốn ${(s0.breakEvenFee / 1000).toFixed(0)} nghìn đ/tấn` };
  });

  /* 10. Field portfolio and value of information */
  test('Danh mục mỏ: chia nhu cầu chung cho giếng lợi nhất, vốn kết nối chỉ trả một lần, không tệ hơn "không làm gì"', () => {
    const P = window.AWTech.portfolio;
    // two wells, 4 demand units: A earns more per unit than B; both prefer geothermal when alone
    const A = { id: 'A', alt: -100, geo: [0, -80, -60, -45, -35], needsHost: false }, B = { id: 'B', alt: -100, geo: [0, -90, -82, -76, -72], needsHost: false };
    const r = P([A, B], 4, 0), u = (id) => r.plan.find((x) => x.id === id).units;
    // brute force
    let best = -Infinity; for (let a = 0; a <= 4; a++) for (let b = 0; a + b <= 4; b++) best = Math.max(best, (a ? A.geo[a] : A.alt) + (b ? B.geo[b] : B.alt));
    // tie-back: two no-host wells share one 50 bn tie-back
    const C1 = { id: 'C1', alt: -100, geo: [0, -70, -60, -55, -50], needsHost: true }, C2 = { id: 'C2', alt: -100, geo: [0, -75, -65, -60, -58], needsHost: true };
    const r2 = P([C1, C2], 4, 50), r3 = P([C1, C2], 4, 500);
    const ok = near(r.total, best, 1e-9) && u('A') + u('B') <= 4 && u('A') >= u('B') && r2.tieback && near(r2.total, (-60) + (-65) - 50, 1e-9) && !r3.tieback && near(r3.total, -200, 1e-9);
    return { ok, detail: `A ${u('A')}/4, B ${u('B')}/4 đơn vị, tổng ${r.total.toFixed(0)} (vét cạn ${best.toFixed(0)}); kết nối chung: ${r2.total.toFixed(0)}; kết nối quá đắt → giữ nguyên ${r3.total.toFixed(0)}` };
  });
  test('Giá trị đo thêm (EVPI): bằng 0 khi quyết định không đổi, dương khi kết quả đo có thể đổi quyết định', () => {
    const E = window.AWTech.evpi;
    const sure = E([10, 12, 14, 16], 0), flip = E([-30, -10, 10, 30], 0), none = E([], 5);
    return { ok: sure === 0 && near(flip, 10, 1e-9) && none === 0, detail: `chắc chắn: ${sure}; có thể đổi quyết định: ${flip}` };
  });

  const tb = document.getElementById('rows'); let pass = 0;
  results.forEach((r, i) => {
    if (r.ok) pass++;
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${i + 1}</td><td>${r.name}</td><td class="${r.ok ? 'ok' : 'fail'}">${r.ok ? 'ĐẠT' : 'LỖI'}</td><td><code>${r.detail || ''}</code></td>`;
    tb.appendChild(tr);
  });
  document.getElementById('sum').innerHTML = `<span class="${pass === results.length ? 'ok' : 'fail'}">${pass}/${results.length} kiểm tra đạt</span>`;
  window.__testResults = { pass, total: results.length, results };
})();
