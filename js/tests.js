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
  test('Giá trị hoãn hủy giếng: 20 tỷ hoãn 10 năm ở 10% = 12,29 tỷ', () => {
    const e = M.economics({ L: 3000, G: 3.3 }, { life: 5, capexOn: 0, capexOff: 0, pipeCost: 0, opexPct: 0, rate: 10, hours: 0, heatPrice: 0, pumpKW: 0, elecPrice: 0, paCost: 20, paYears: 10 }, { location: 'onshore', distance: 0 });
    return { ok: near(e.deferral, 12.289, 0.01), detail: `${e.deferral.toFixed(3)} tỷ` };
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
