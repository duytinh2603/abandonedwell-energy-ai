# Build a compact public Volve dataset (Equinor open data) for AbandonedWell Energy AI.
# Read-only on the source folder. Usage: python build_volve.py <VolveRoot> <out.json>
import os, re, sys, json, csv, math, collections
import openpyxl

V, OUT = sys.argv[1], sys.argv[2]
NULLS = {-999.25, -999.0, -9999.0, -999.2500}

def wname(s):
    """'15_9-F-1 C' / '15-9-F-1-C' / '15-9-F-1C' -> '15/9-F-1 C'."""
    s = s.strip().upper().replace('NO ', '').replace('_', '-').replace('/', '-')
    m = re.match(r'15-9-(F-\d+|19)[- ]?([A-Z]{1,2}\d?)?$', s.replace(' ', '-').replace('--', '-'))
    if not m:
        return None
    base, suf = m.group(1), m.group(2)
    return '15/9-' + base + (' ' + suf if suf else '')

def read_las(path, want_data=True, max_head=4000):
    """Minimal LAS 2.0 reader: returns dict(W, P, C, rows)."""
    W, P, C, rows = {}, {}, [], []
    sec = ''
    with open(path, encoding='latin-1', errors='replace') as fh:
        for i, ln in enumerate(fh):
            s = ln.strip()
            if sec != 'A':
                if i > max_head:
                    break
                if not s or s.startswith('#'):
                    continue
                if s.startswith('~'):
                    sec = s[1:2].upper()
                    if sec == 'A' and not want_data:
                        break
                    continue
                if '.' not in s:
                    continue
                mn, rest = s.split('.', 1)
                mn = mn.strip().upper()
                unit = '' if rest[:1].isspace() else rest.split()[0] if rest.split() else ''
                body = rest[len(unit):]
                val = body.rsplit(':', 1)[0].strip() if ':' in body else body.strip()
                desc = body.rsplit(':', 1)[1].strip() if ':' in body else ''
                if sec == 'W':
                    W[mn] = (val, unit.upper(), desc)
                elif sec == 'P':
                    P.setdefault(mn, []).append((val, unit.upper(), desc))
                elif sec == 'C':
                    C.append((mn, unit.upper(), desc))
            else:
                if not s or s.startswith('#'):
                    continue
                parts = s.split()
                try:
                    rows.append([float(x) for x in parts])
                except ValueError:
                    continue
    return {'W': W, 'P': P, 'C': C, 'rows': rows}

def fnum(x):
    try:
        v = float(x)
        return None if v in NULLS or math.isnan(v) else v
    except Exception:
        return None

def dms(x):
    m = re.match(r"\s*(\d+)\D+(\d+)\D+([\d.]+)[^NSEW\d]*?([NSEW])\b", x or '')
    if not m:
        return fnum(x)
    v = int(m.group(1)) + int(m.group(2)) / 60 + float(m.group(3)) / 3600
    return -v if m.group(4) in 'SW' else v

def take_coords(w, H):
    for k, key in (('XCOORD', 'x'), ('X', 'x'), ('YCOORD', 'y'), ('Y', 'y'), ('LAT', 'lat'), ('LATI', 'lat'),
                   ('LON', 'lon'), ('LONG', 'lon'), ('ELEV', 'kb'), ('EKB', 'kb'), ('EREF', 'kb')):
        if w[key] is None and k in H:
            v = dms(H[k][0]) if key in ('lat', 'lon') else fnum(H[k][0])
            if v is not None and (key != 'kb' or 10 < v < 100) and (key not in ('x', 'y') or v > 1000):
                w[key] = v

wells = collections.OrderedDict()
def W(name):
    if name not in wells:
        wells[name] = {'name': name, 'x': None, 'y': None, 'lat': None, 'lon': None, 'kb': None,
                       'tdMD': 0, 'mdtvd': [], 'temps': [], 'logs': None, 'logSrc': '', 'files': 0}
    return wells[name]

# ---------- 1. Wellbore folders: header coordinates, TD, MD-TVD pairs, logs ----------
LOGS = ['GR', 'DT', 'RHOB', 'NPHI', 'RT']
PAT = {'GR': r'^(GR|GRC|GR_ARC|ARC_GR\w*|GRM\d?|GRARC\w*|EDTC_GR\w*|GR_\w+)$', 'DT': r'^(DT|DTC|AC|DTCO\w*|DT_\w+)$',
       'RHOB': r'^(RHOB|ROBB\w*|ROBS\w*|BDCX|DEN|RHOZ)$', 'NPHI': r'^(NPHI|TNPH\w*|NPL|BPHI\w*|NEU)$',
       'RT': r'^(RT|RD|RDEP|ILD|P40H\w*|RACEHM\w*|RPCEHM\w*|P28H\w*|AT90)$'}
def find_idx(cn, L):
    return next((i for i, c in enumerate(cn) if i > 0 and re.match(PAT[L], c)), None)
wb_root = os.path.join(V, 'Wellbore')
for d in sorted(os.listdir(wb_root)):
    p = os.path.join(wb_root, d)
    n = wname(d)
    if not os.path.isdir(p) or not n:
        continue
    w = W(n)
    cand_logs = []
    for dp, _, fn in os.walk(p):
        for f in fn:
            if not f.lower().endswith('.las'):
                continue
            fp = os.path.join(dp, f)
            head = read_las(fp, want_data=False)
            w['files'] += 1
            H = head['W']
            take_coords(w, H)
            unit = H.get('STRT', ('', 'M', ''))[1]
            mult = 0.3048 if unit.startswith('F') else 1.0
            stop = fnum(H.get('STOP', ('', '', ''))[0]); strt = fnum(H.get('STRT', ('', '', ''))[0])
            cn = [c[0] for c in head['C']]
            depth_like = cn and re.match(r'DEPT|DEPTH|MD', cn[0])
            if depth_like and unit in ('M', 'F', 'FT') and stop and strt:
                w['tdMD'] = max(w['tdMD'], max(stop, strt) * mult)
            tvdc = [i for i, c in enumerate(cn) if c in ('TVDE', 'TVD', 'TVD_RKB', 'TVDRKB')]
            if depth_like and tvdc:
                full = read_las(fp)
                j = tvdc[0]; last = -1e9
                for r in full['rows']:
                    if len(r) > j:
                        md, tv = fnum(r[0]), fnum(r[j])
                        if md and tv and md - last >= 25 and 0 < tv <= md + 1:
                            w['mdtvd'].append((round(md * mult, 1), round(tv * mult, 1))); last = md
            if 'Interpreted' in dp or 'Composite' in dp:
                score = sum(1 for L in LOGS if find_idx(cn, L) is not None)
                cand_logs.append((score, 'INPUT' in f.upper(), os.path.getsize(fp), fp))
    for sub in ('02.LWD_EWL', '05.PETROPHYSICAL INTERPRETATION'):
        q = os.path.join(V, 'Well_logs', sub, d.replace('15-9-', '15_9-').replace('-A', ' A').replace('-B', ' B').replace('-C', ' C').replace('-D', ' D').replace('-T2', ' T2').replace('-SR', ' SR').replace('-BT2', ' BT2'))
        if not os.path.isdir(q):
            continue
        for dp, _, fn in os.walk(q):
            for f in fn:
                if f.lower().endswith('.las'):
                    fp = os.path.join(dp, f)
                    head = read_las(fp, want_data=False)
                    take_coords(w, head['W'])
                    cn = [c[0] for c in head['C']]
                    if cn and re.match(r'DEPT|DEPTH|MD', cn[0]) and not w.get('_haslog'):
                        score = sum(1 for L in LOGS if find_idx(cn, L) is not None)
                        if score >= 1 and 'TIME' not in f.upper():
                            cand_logs.append((score - 0.5, False, os.path.getsize(fp), fp))
    cand_logs = [c for c in cand_logs if c[0] > 0]
    if cand_logs:
        cand_logs.sort(reverse=True)
        fp = cand_logs[0][3]
        full = read_las(fp)
        cn = [c[0] for c in full['C']]
        unit = full['W'].get('STRT', ('', 'M', ''))[1]
        mult = 0.3048 if unit.startswith('F') else 1.0
        idx = {L: find_idx(cn, L) for L in LOGS}
        step = 5.0; bins = collections.OrderedDict()
        for r in full['rows']:
            md = fnum(r[0])
            if md is None:
                continue
            b = round(md * mult / step) * step
            acc = bins.setdefault(b, {L: [] for L in LOGS})
            for L in LOGS:
                j = idx[L]
                if j is not None and j < len(r):
                    v = fnum(r[j])
                    if v is not None and (L != 'RT' or v > 0):
                        acc[L].append(v)
        out = {'step': step, 'md': [], **{L: [] for L in LOGS if idx[L] is not None}}
        for b, acc in bins.items():
            vals = {L: (sorted(acc[L])[len(acc[L]) // 2] if acc[L] else None) for L in out if L not in ('step', 'md')}
            if all(v is None for v in vals.values()):
                continue
            out['md'].append(b)
            for L, v in vals.items():
                out[L].append(None if v is None else round(v, 4 if L in ('RHOB', 'NPHI') else 2))
        w['logs'] = out; w['logSrc'] = os.path.relpath(fp, V).replace('\\', '/')
        w['tdMD'] = max(w['tdMD'], max(out['md'] or [0]))

# ---------- 2. Formation-pressure tests: (MD, TVD, T) points ----------
pr_root = os.path.join(V, 'Well_logs', '03.PRESSURE')
for d in sorted(os.listdir(pr_root)):
    p = os.path.join(pr_root, d)
    n = wname(d)
    if not os.path.isdir(p) or not n:
        continue
    w = W(n)
    for f in sorted(os.listdir(p)):
        if not f.lower().endswith('.las') or 'COMPUTED' in f.upper():
            continue
        fp = os.path.join(p, f)
        las = read_las(fp, want_data=True)
        H, P = las['W'], las['P']
        cn = [c[0] for c in las['C']]
        pts = []
        # (a) pMD/pTVD/pTEMP blocks (FT / DEGF), one per test
        if 'PTEMP' in P:
            mds, tvds, tps = P.get('PMD', []), P.get('PTVD', []), P['PTEMP']
            for k, (tv, tu, _) in enumerate(tps):
                T = fnum(tv)
                if T is None:
                    continue
                if tu.startswith('DEGF'):
                    T = (T - 32) / 1.8
                md = fnum(mds[k][0]) if k < len(mds) else None
                tvd = fnum(tvds[k][0]) if k < len(tvds) else None
                mm = 0.3048 if (k < len(mds) and mds[k][1].startswith('F')) else 1
                tm = 0.3048 if (k < len(tvds) and tvds[k][1].startswith('F')) else 1
                if md and tvd:
                    pts.append((md * mm, tvd * tm, T, 'pTEMP'))
        else:
            src = {**H, **{k: v[0] for k, v in P.items()}}
            md = tvd = None
            for k in ('DEPTHMD', 'MD'):
                if k in src and fnum(src[k][0]):
                    md = fnum(src[k][0]) * (0.3048 if src[k][1].startswith('F') else 1); break
            for k in ('DEPTHTVD', 'TVD'):
                if k in src and fnum(src[k][0]):
                    tvd = fnum(src[k][0]) * (0.3048 if src[k][1].startswith('F') else 1); break
            tcol = next((cn.index(c) for c in ('AQAT', 'TEMP', 'ACQ_SF_TMP') if c in cn), None)
            if md and tvd and tcol is not None:
                unit = las['C'][tcol][1]
                vals = [fnum(r[tcol]) for r in las['rows'] if len(r) > tcol]
                vals = [v for v in vals if v is not None and -10 < v < 400]
                if vals:
                    T = max(vals)
                    if unit.startswith('DEGF'):
                        T = (T - 32) / 1.8
                    pts.append((md, tvd, T, 'TEMP max'))
        for md, tvd, T, how in pts:
            if 20 < T < 250 and 100 < tvd <= md + 1:
                w['temps'].append({'md': round(md, 1), 'tvd': round(tvd, 1), 't': round(T, 2), 'how': how,
                                   'file': os.path.relpath(fp, V).replace('\\', '/')})
                w['mdtvd'].append((round(md, 1), round(tvd, 1)))

# ---------- 3. Per-well summary ----------
def interp_tvd(pairs, md):
    if not pairs:
        return None
    pairs = sorted(set(pairs))
    if md <= pairs[0][0]:
        return md * pairs[0][1] / pairs[0][0] if pairs[0][0] else md
    for (m0, t0), (m1, t1) in zip(pairs, pairs[1:]):
        if m0 <= md <= m1 and m1 > m0:
            return t0 + (t1 - t0) * (md - m0) / (m1 - m0)
    # extrapolate with the last 300 m of trajectory
    m1, t1 = pairs[-1]
    ref = [q for q in pairs if q[0] <= m1 - 300] or pairs[:1]
    m0, t0 = ref[-1]
    slope = (t1 - t0) / (m1 - m0) if m1 > m0 else 1
    return t1 + max(0, min(1, slope)) * (md - m1)

lats = sorted(w['lat'] for w in wells.values() if w['lat']); lons = sorted(w['lon'] for w in wells.values() if w['lon'])
for w in wells.values():
    w['coordSrc'] = 'LAS header' if w['lat'] else 'platform (median of F-wells)'
    if not w['lat'] and lats and w['name'].startswith('15/9-F'):
        w['lat'] = lats[len(lats) // 2]; w['lon'] = lons[len(lons) // 2]
    w['kbSrc'] = 'LAS header' if w['kb'] else 'assumed 54.9 m (F-12 header)'
    if not w['kb'] and w['name'].startswith('15/9-F'):
        w['kb'] = 54.9
T0 = 6.0  # mean seabed temperature, central North Sea (deg C), applied at mean sea level
WD = 91.0  # water depth (m) used as the origin of the geothermal profile
result = []
for n, w in wells.items():
    pairs = sorted(set(w['mdtvd']))
    # thin to <= 60 pairs
    if len(pairs) > 60:
        k = len(pairs) / 60.0
        pairs = [pairs[int(i * k)] for i in range(60)] + [pairs[-1]]
    tdTVD = interp_tvd(pairs, w['tdMD']) if w['tdMD'] else None
    # pseudo-stations (inclination from consecutive MD/TVD pairs; azimuth unknown) so the app's minimum-curvature code can use them
    st = [{'md': 0, 'inc': 0, 'azi': 0}]; pm, pt = 0.0, 0.0
    for md, tv in pairs:
        if md - pm < 1:
            continue
        c = max(-1, min(1, (tv - pt) / (md - pm)))
        st.append({'md': md, 'inc': round(math.degrees(math.acos(c)), 2), 'azi': 0}); pm, pt = md, tv
    temps = sorted({(t['md'], t['tvd'], t['t']): t for t in w['temps']}.values(), key=lambda t: t['md'])
    G = None
    if temps:
        z = [t['tvd'] - (w['kb'] or 54.9) for t in temps]
        num = sum(zi * (t['t'] - T0) for zi, t in zip(z, temps)); den = sum(zi * zi for zi in z)
        G = round(num / den * 100, 3) if den > 0 else None
    result.append({'name': n, 'x': w['x'], 'y': w['y'], 'lat': w['lat'], 'lon': w['lon'], 'kb': w['kb'],
                   'tdMD': round(w['tdMD'], 1) if w['tdMD'] else None,
                   'tdTVD': round(tdTVD, 1) if tdTVD else None,
                   'survey': pairs, 'stations': st if len(st) > 2 else None, 'temps': temps, 'gradient': G,
                   'logs': w['logs'], 'logSrc': w['logSrc'], 'coordSrc': w['coordSrc'], 'kbSrc': w['kbSrc'], 'lasFiles': w['files']})

# ---------- 4. Seismic inventory ----------
def read_csv(path):
    with open(path, encoding='utf-8-sig', errors='replace') as fh:
        return list(csv.reader(fh))
s3 = read_csv(os.path.join(V, 'Meta Data_3D_Seismic.csv'))
s2 = read_csv(os.path.join(V, 'Meta_Data_2D_Seismic.csv'))
corners = {}
for sv in ('ST10010', 'ST0202'):
    fp = os.path.join(V, 'Seismic', 'Navigation', 'SURVEY_%s.csv' % sv)
    if os.path.exists(fp):
        rr = read_csv(fp)[1:]
        corners[sv] = [{'il': int(r[0]), 'xl': int(r[1]), 'lat': float(r[2]), 'lon': float(r[3])} for r in rr if len(r) >= 4 and r[0].strip()]
status = {}
wb = openpyxl.load_workbook(os.path.join(V, 'Seismic Status Report.xlsx'), read_only=True, data_only=True)
for ws in wb.worksheets:
    status[ws.title] = [str(r[1]).strip().rstrip('.') for r in ws.iter_rows(min_row=2, values_only=True) if r and len(r) > 1 and r[1]]
cubes = []
for r in s3[1:]:
    if len(r) >= 6 and r[0].strip():
        name = r[0].strip()
        flags = [k for k, lst in status.items() if any(name.rstrip('.') == x for x in lst)]
        cubes.append({'name': name, 'il': [int(r[1]), int(r[2])], 'xl': [int(r[3]), int(r[4])], 'survey': r[5].strip(),
                      'domain': 'depth' if 'DEPTH' in name.upper() or '_D.' in name.upper() or '_D_' in name.upper() else 'time',
                      'flags': flags})
lines2d = [r[0].strip() for r in s2[1:] if r and r[0].strip()]
dataset = {
    'version': __import__('datetime').date.today().isoformat(),  # bump → projects built from older data refresh automatically
    'source': 'Equinor Volve Data Village (open data, 2018)',
    'licence': 'Equinor Open Data Licence - attribution required',
    'url': 'https://www.equinor.com/energy/volve-data-sharing',
    'field': {'name': 'Volve', 'block': '15/9 (PL046)', 'basin': 'North Sea (Norway)', 'operator': 'Equinor (Statoil)',
              'production': '2008-2016', 'waterDepth': WD, 'seabedT': T0, 'reservoir': 'Hugin Fm (Middle Jurassic sandstone)'},
    'wells': result,
    'seismic': {'cubes': cubes, 'lines2d': lines2d, 'corners': corners, 'statusSheets': list(status.keys())},
}
with open(OUT, 'w', encoding='utf-8') as fh:
    json.dump(dataset, fh, ensure_ascii=False, separators=(',', ':'))
for r in result:
    print('%-14s TD %6s/%6s  pts %2d  G %s  logs %s  xy %s' % (r['name'], r['tdMD'], r['tdTVD'], len(r['temps']), r['gradient'],
          (len(r['logs']['md']) if r['logs'] else 0), (r['x'], r['y'])))
print('cubes', len(cubes), 'lines2d', len(lines2d), 'size', os.path.getsize(OUT))
