"""Vectorize AI-generated pixel art into crisp SVG rectangles.

Recovers the (slightly irregular) pixel grid from edge energy, samples one colour per
cell, quantizes to a palette and writes one path per colour in the ORIGINAL pixel
coordinate system, so the SVG is a drop-in replacement for the PNG (same intrinsic
size, same coordinates for viewBox crops).
"""
import base64, io, json, re, sys
import numpy as np
from PIL import Image


# ---------- loading ----------

def load_rgba(src):
    im = Image.open(src).convert('RGBA')
    return np.asarray(im).astype(np.float64)


def read_fake_svg(path):
    """Return (rgba array, attrs) for an SVG that just wraps a base64 PNG."""
    text = open(path, encoding='utf-8').read()
    m = re.search(r'href="data:image/png;base64,([^"]+)"', text)
    if not m:
        return None, None
    rgba = load_rgba(io.BytesIO(base64.b64decode(m.group(1))))
    svg_open = re.search(r'<svg[^>]*>', text).group(0)
    attrs = {k: v for k, v in re.findall(r'(\w[\w:-]*)="([^"]*)"', svg_open) if k != 'xmlns'}
    title = re.search(r'<title>(.*?)</title>', text)
    img = re.search(r'<image[^>]*>', text).group(0)
    iattrs = dict(re.findall(r'(\w[\w:-]*)="([^"]*)"', img))
    # The wrapped image must be drawn at native size at the origin for coordinates to carry over.
    assert float(iattrs.get('x', 0)) == 0 and float(iattrs.get('y', 0)) == 0, path
    assert int(float(iattrs['width'])) == rgba.shape[1] and int(float(iattrs['height'])) == rgba.shape[0], path
    attrs['title'] = title.group(1) if title else None
    return rgba, attrs


# ---------- grid detection ----------

def features(a):
    alpha = a[..., 3:4] / 255.0
    return np.concatenate([a[..., :3] * alpha, a[..., 3:4]], axis=2)


def edge_profiles(a):
    f = features(a)
    dx = np.abs(np.diff(f, axis=1)).sum(axis=2)
    dy = np.abs(np.diff(f, axis=0)).sum(axis=2)
    return dx.sum(axis=0), dy.sum(axis=1)


def autocorr(p):
    q = p - p.mean()
    n = len(q)
    f = np.fft.rfft(q, 2 * n)
    ac = np.fft.irfft(f * np.conj(f))[:n]
    return ac / (ac[0] + 1e-12)


def refine_peak(ac, i):
    if 0 < i < len(ac) - 1:
        y0, y1, y2 = ac[i - 1], ac[i], ac[i + 1]
        den = y0 - 2 * y1 + y2
        if abs(den) > 1e-12:
            return i + 0.5 * (y0 - y2) / den
    return float(i)


def period_candidates(px, py, lo=3, hi=90):
    acx, acy = autocorr(px), autocorr(py)
    n = min(len(acx), len(acy))
    ac = (acx[:n] + acy[:n]) / 2
    hi = min(hi, n // 3)
    peaks = [i for i in range(lo, hi) if ac[i] >= ac[i - 1] and ac[i] >= ac[i + 1] and ac[i] > 0.05]
    if not peaks:
        return [float(np.argmax(ac[lo:hi]) + lo)]
    g = max(peaks, key=lambda i: ac[i])
    cands = {round(refine_peak(ac, g), 3)}
    # sub-harmonics of the global peak (global max can land on 2T/3T) and strong earlier peaks
    for k in (2, 3, 4):
        t = g / k
        if t < lo:
            break
        near = [i for i in peaks if abs(i - t) <= max(1.0, 0.12 * t)]
        if near:
            i = max(near, key=lambda j: ac[j])
            if ac[i] > 0.35 * ac[g]:
                cands.add(round(refine_peak(ac, i), 3))
    for i in peaks:
        if ac[i] > 0.6 * ac[g] and i < g:
            cands.add(round(refine_peak(ac, i), 3))
    return sorted(cands)


def axis_period(p, t):
    """Refine a shared period estimate for one axis (AI resizes can make pixels non-square)."""
    ac = autocorr(p)
    lo, hi = int(np.floor(t * 0.88)), int(np.ceil(t * 1.12)) + 1
    hi = min(hi, len(ac) - 2)
    if hi <= lo:
        return t
    i = lo + int(np.argmax(ac[lo:hi]))
    r = refine_peak(ac, i)
    return r if abs(r - t) <= 0.12 * t else t


def cuts_for(p, per):
    """Choose cut positions (0..n) with spacing near `per` that sit on strong edges."""
    n = len(p) + 1
    nz = p[p > 0]
    scale = np.percentile(nz, 75) if len(nz) else 1.0
    e = np.minimum(p / (scale + 1e-12), 4.0)
    reward = np.zeros(n + 1)
    reward[1:n] = e - e.mean()
    lo, hi = max(1, int(np.floor(per * 0.7))), max(2, int(np.ceil(per * 1.35)))
    lam = 1.0 / (0.18 * per) ** 2
    score = np.full(n + 1, -np.inf)
    prev = np.zeros(n + 1, dtype=np.int64)
    score[0] = 0.0
    for c in range(1, n + 1):
        a, b = max(0, c - hi), c - lo
        if c == n or b < a:
            a, b = max(0, c - hi), c - 1  # last cell may be short
        cand = np.arange(a, b + 1)
        sp = c - cand
        dev = np.where(sp < per, (sp - per) ** 2, (sp - per) ** 2)
        w = 1.0 if c < n else 0.0
        s = score[cand] + reward[c] - lam * dev * w
        k = int(np.argmax(s))
        score[c] = s[k]
        prev[c] = cand[k]
    cuts, c = [n], n
    while c > 0:
        c = int(prev[c])
        cuts.append(c)
    return np.array(cuts[::-1], dtype=np.int64)


# ---------- sampling ----------

def sample_cells(a, bx, by, margin=0.22):
    """Premultiplied mean RGBA over each cell's interior (borders are blurry in AI art)."""
    f = features(a)  # premultiplied rgb, alpha
    H, W = a.shape[:2]
    ii = np.zeros((H + 1, W + 1, 4))
    ii[1:, 1:] = f.cumsum(0).cumsum(1)

    def inner(b):
        s, e = b[:-1].astype(float), b[1:].astype(float)
        w = e - s
        m = np.floor(w * margin)
        s2 = (s + m).astype(int)
        e2 = (e - m).astype(int)
        e2 = np.maximum(e2, s2 + 1)
        return s2, e2

    x0, x1 = inner(bx)
    y0, y1 = inner(by)
    Y0, X0 = np.meshgrid(y0, x0, indexing='ij')
    Y1, X1 = np.meshgrid(y1, x1, indexing='ij')
    tot = ii[Y1, X1] - ii[Y0, X1] - ii[Y1, X0] + ii[Y0, X0]
    area = ((Y1 - Y0) * (X1 - X0))[..., None]
    mean = tot / area
    alpha = mean[..., 3]
    rgb = np.where(alpha[..., None] > 1e-6, mean[..., :3] / np.maximum(alpha[..., None], 1e-6) * 255.0, 0)
    return np.clip(rgb, 0, 255), alpha


def reconstruct(rgb_cells, alpha_cells, bx, by, shape):
    """Paint cells back at their pixel spans (what the SVG will show)."""
    H, W = shape[:2]
    xi = np.searchsorted(bx, np.arange(W), side='right') - 1
    yi = np.searchsorted(by, np.arange(H), side='right') - 1
    xi = np.clip(xi, 0, len(bx) - 2)
    yi = np.clip(yi, 0, len(by) - 2)
    rgb = rgb_cells[yi][:, xi]
    al = alpha_cells[yi][:, xi]
    return rgb, al


def error_of(a, rgb, al):
    """Mean abs error in premultiplied RGB + alpha, over pixels where either side is visible."""
    fa = features(a)
    fr = np.concatenate([rgb * (al[..., None] / 255.0), al[..., None]], axis=2)
    vis = (a[..., 3] > 16) | (al > 16)
    if not vis.any():
        return 0.0
    return float(np.abs(fa - fr)[vis].mean())


# ---------- quantization ----------

def quantize(rgb_cells, opaque, colors):
    pts = rgb_cells[opaque].astype(np.uint8)
    idx = np.full(opaque.shape, -1, dtype=np.int64)
    if len(pts) == 0:
        return idx, np.zeros((0, 3), dtype=np.uint8)
    img = Image.fromarray(pts.reshape(1, -1, 3), 'RGB')
    q = img.quantize(colors=min(colors, 256), method=Image.Quantize.FASTOCTREE, kmeans=4, dither=Image.Dither.NONE)
    pal = np.array(q.getpalette()[: 3 * 256], dtype=np.uint8).reshape(-1, 3)
    lab = np.asarray(q).reshape(-1)
    used = np.unique(lab)
    remap = np.full(256, -1)
    remap[used] = np.arange(len(used))
    idx[opaque] = remap[lab]
    return idx, pal[used]


# ---------- svg output ----------

def merge_rects(idx):
    """Greedy: horizontal runs per row, extended downward while an identical run continues."""
    H, W = idx.shape
    out = []
    active = {}
    for y in range(H + 1):
        row = idx[y] if y < H else np.full(W, -1)
        runs = set()
        x = 0
        while x < W:
            c = row[x]
            if c < 0:
                x += 1
                continue
            s = x
            while x < W and row[x] == c:
                x += 1
            runs.add((int(c), s, x))
        for key in list(active):
            if key not in runs:
                c, s, e = key
                out.append((c, s, active.pop(key), e, y))
        for key in runs:
            if key not in active:
                active[key] = y
    return out  # (color, x0, y0, x1, y1) in cell units


def hexcol(c):
    h = '%02x%02x%02x' % tuple(int(v) for v in c)
    if h[0] == h[1] and h[2] == h[3] and h[4] == h[5]:
        h = h[0] + h[2] + h[4]
    return '#' + h


def path_d(rects):
    rects = sorted(rects, key=lambda r: (r[1], r[0]))
    parts, cx, cy = [], None, None
    for x0, y0, x1, y1 in rects:
        if cx is None:
            parts.append(f'M{x0} {y0}')
        else:
            parts.append(f'm{x0 - cx} {y0 - cy}')
        parts.append(f'h{x1 - x0}v{y1 - y0}h{x0 - x1}z')
        cx, cy = x0, y0
    d = ''.join(parts)
    return d.replace(' -', '-')


def build_svg(rects_px, pal, attrs, title=None):
    by_color = {}
    for c, x0, y0, x1, y1 in rects_px:
        by_color.setdefault(c, []).append((x0, y0, x1, y1))
    # Draw largest-area colours first so adjacent paths read in a stable order.
    order = sorted(by_color, key=lambda c: -sum((r[2] - r[0]) * (r[3] - r[1]) for r in by_color[c]))
    head = '<svg xmlns="http://www.w3.org/2000/svg" ' + ' '.join(f'{k}="{v}"' for k, v in attrs.items()) + ' shape-rendering="crispEdges">'
    body = []
    if title:
        body.append(f'<title>{title}</title>')
    for c in order:
        body.append(f'<path fill="{hexcol(pal[c])}" d="{path_d(by_color[c])}"/>')
    return head + ''.join(body) + '</svg>\n'


# ---------- pipeline ----------

def grid_for(a, forced=None, verbose=False):
    px, py = edge_profiles(a)
    if forced:
        cands = [forced]
    else:
        base = period_candidates(px, py)
        # AI pixel art mixes pixel sizes; always try half the detected period as well.
        cands = sorted(set(base) | {round(t / 2, 3) for t in base if t / 2 >= 3})
    results = []
    for t in cands:
        tx, ty = axis_period(px, t), axis_period(py, t)
        bx, by = cuts_for(px, tx), cuts_for(py, ty)
        rgb, al = sample_cells(a, bx, by)
        r, l = reconstruct(rgb, al, bx, by, a.shape)
        err = error_of(a, r, l)
        results.append(dict(t=t, tx=tx, ty=ty, bx=bx, by=by, rgb=rgb, al=al, err=err))
    if verbose:
        for r in results:
            print(f"   cand T={r['t']:.2f} ({r['tx']:.2f},{r['ty']:.2f}) cells={len(r['bx'])-1}x{len(r['by'])-1} err={r['err']:.2f}")
    best_err = min(r['err'] for r in results)
    # Fidelity first: a finer grid always lowers error a little (AI noise inside each "pixel"),
    # so take the coarsest grid that is within a tolerance of the best, or already very close.
    ok = [r for r in results if r['err'] <= max(best_err * 1.12 + 0.4, 4.5)]
    return max(ok, key=lambda r: r['t'])


def vectorize(a, colors=128, forced=None, alpha_cut=128, verbose=False, crop=None):
    g = grid_for(a, forced=forced, verbose=verbose)
    opaque = g['al'] >= alpha_cut
    idx, pal = quantize(g['rgb'], opaque, colors)
    rects = merge_rects(idx)
    bx, by = g['bx'], g['by']
    rects_px = []
    for c, x0, y0, x1, y1 in rects:
        X0, X1, Y0, Y1 = int(bx[x0]), int(bx[x1]), int(by[y0]), int(by[y1])
        if crop:
            cx, cy, cw, ch = crop
            X0, X1 = max(X0, cx), min(X1, cx + cw)
            Y0, Y1 = max(Y0, cy), min(Y1, cy + ch)
            if X0 >= X1 or Y0 >= Y1:
                continue
        rects_px.append((c, X0, Y0, X1, Y1))
    # error of the final quantized result
    qrgb = np.zeros(g['rgb'].shape)
    qrgb[idx >= 0] = pal[idx[idx >= 0]]
    qal = np.where(idx >= 0, 255.0, 0.0)
    r, l = reconstruct(qrgb, qal, bx, by, a.shape)
    g['qerr'] = error_of(a, r, l)
    g['colors'] = len(pal)
    return rects_px, pal, g


def main():
    jobs = json.load(open(sys.argv[1]))
    report = []
    for job in jobs:
        src, dst = job['src'], job['dst']
        if src.endswith('.svg'):
            a, attrs = read_fake_svg(src)
            title = attrs.pop('title', None)
            vb = [int(float(v)) for v in attrs['viewBox'].split()]
            crop = tuple(vb)
        else:
            a = load_rgba(src)
            attrs = {'viewBox': f'0 0 {a.shape[1]} {a.shape[0]}', 'width': str(a.shape[1]), 'height': str(a.shape[0])}
            title, crop = job.get('title'), None
        rects, pal, g = vectorize(a, colors=job.get('colors', 128), forced=job.get('period'), verbose=job.get('verbose', False), crop=crop)
        svg = build_svg(rects, pal, attrs, title)
        with open(dst, 'w', encoding='utf-8') as fh:
            fh.write(svg)
        row = dict(src=src, dst=dst, T=round(g['t'], 2), cells=f"{len(g['bx'])-1}x{len(g['by'])-1}", err=round(g['err'], 2),
                   qerr=round(g['qerr'], 2), colors=g['colors'], rects=len(rects), bytes=len(svg.encode()))
        report.append(row)
        print(json.dumps(row), flush=True)
    if len(sys.argv) > 2:
        json.dump(report, open(sys.argv[2], 'w'), indent=1)


if __name__ == '__main__':
    main()
