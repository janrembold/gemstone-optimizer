"""Fit fivefold planar envelopes to the supplied Leonardo line diagram.
Requires Pillow/NumPy. Usage: python3 scripts/fit-leonardo.py diagram.png output.json
The fit is an approximate design, not recovered manufacturer cutting instructions.
Edge equality weight 10 and soft zero-height rim anchors are explicit assumptions.
"""
import sys, json, hashlib
from pathlib import Path
from PIL import Image
import numpy as np
from collections import deque, defaultdict
source = Path(sys.argv[1])
output = Path(sys.argv[2])
im = np.array(Image.open(source).convert('RGB'))
if im.shape[:2] != (534, 1921):
    raise ValueError('Expected supplied 1921 x 534 diagram')
edge_weight = float(sys.argv[4]) if len(sys.argv) > 4 else 10.0
if not np.isfinite(edge_weight) or edge_weight <= 0:
    raise ValueError('Edge weight must be positive and finite')
report = {'sourceSHA256': hashlib.sha256(source.read_bytes()).hexdigest(), 'edgeWeight': edge_weight, 'crownHeightRadiusUnits': 198 / 689, 'pavilionDepthRadiusUnits': 552 / 689, 'regions': {}}
for name, cx, cy in [('crown', 275, 263), ('pavilion', 1647, 263)]:
    rgb = im[:, cx - 260:cx + 261]
    white = rgb.min(axis=2) > 200
    h, w = white.shape
    labels = np.full((h, w), -1)
    regions = []
    for y in range(h):
        for x in range(w):
            if not white[y, x]:
                continue
            white[y, x] = False
            q = deque([(x, y)])
            pts = []
            edge = False
            while q:
                xx, yy = q.popleft()
                pts.append((xx, yy))
                edge |= xx in (0, w - 1) or yy in (0, h - 1)
                for nx, ny in ((xx - 1, yy), (xx + 1, yy), (xx, yy - 1), (xx, yy + 1)):
                    if 0 <= nx < w and 0 <= ny < h and white[ny, nx]:
                        white[ny, nx] = False
                        q.append((nx, ny))
            if len(pts) > 100 and (not edge):
                i = len(regions)
                p = np.array(pts)
                labels[p[:, 1], p[:, 0]] = i
                regions.append(p)
    centers = np.array([(p.mean(axis=0) - [260, cy]) * [1, -1] / 251 for p in regions])
    N = len(centers)
    orbit = []
    mapping = {}
    remain = set(range(N))
    while remain:
        i = min(remain)
        members = []
        base = centers[i]
        for k in range(5):
            a = k * 2 * np.pi / 5
            R = np.array([[np.cos(a), -np.sin(a)], [np.sin(a), np.cos(a)]])
            j = int(np.argmin(np.linalg.norm(centers - base @ R.T, axis=1)))
            if j not in members:
                members.append(j)
                mapping[j] = (len(orbit), k)
        orbit.append(members)
        remain -= set(members)
    print(name, 'orbits', orbit)
    edges = defaultdict(list)
    yy, xx = np.where(rgb.min(axis=2) < 180)
    for x, y in zip(xx, yy):
        if x < 4 or y < 4 or x >= w - 4 or (y >= h - 4):
            continue
        neighbors = set(labels[y - 3:y + 4, x - 3:x + 4].flatten()) - {-1}
        if len(neighbors) == 2:
            i, j = sorted(neighbors)
            edges[i, j].append([(x - 260) / 251, (cy - y) / 251])
    size = 3 * len(orbit)

    def row(i, x, y):
        o, k = mapping[i]
        a = k * 2 * np.pi / 5
        r = np.zeros(size)
        r[3 * o:3 * o + 3] = [np.cos(a) * x + np.sin(a) * y, -np.sin(a) * x + np.cos(a) * y, 1]
        return r
    A = []
    b = []
    for (i, j), pts in edges.items():
        if len(pts) < 10:
            continue
        pts = np.array(pts)
        mean = pts.mean(axis=0)
        _, _, v = np.linalg.svd(pts - mean, full_matrices=False)
        axis = v[0]
        pos = (pts - mean) @ axis
        for t in np.quantile(pos, [0.15, 0.85]):
            x, y = mean + t * axis
            A.append(edge_weight * (row(i, x, y) - row(j, x, y)))
            b.append(0)
    for i, p in enumerate(regions):
        xy = (p - [260, cy]) * [1, -1] / 251
        r = np.linalg.norm(xy, axis=1)
        rim = xy[r > 0.97]
        if len(rim):
            x, y = rim.mean(axis=0)
            A.append(row(i, x, y))
            b.append(0)
    if name == 'crown':
        t = int(np.argmin(np.linalg.norm(centers, axis=1)))
        o, k = mapping[t]
        for offset, value in [(0, 0), (1, 0), (2, 198 / 689)]:
            r = np.zeros(size)
            r[3 * o + offset] = 1000
            A.append(r)
            b.append(1000 * value)
    else:
        for i, c in enumerate(centers):
            if np.linalg.norm(c) < 0.24:
                A.append(1000 * row(i, 0, 0))
                b.append(-1000 * 552 / 689)
    x = np.linalg.lstsq(A, b, rcond=None)[0]
    if name == 'crown':
        x[3 * o:3 * o + 3] = [0, 0, 198 / 689]
    print('coefs', x.reshape(-1, 3))
    print('residual', np.linalg.norm(np.array(A) @ x - b))
    errors = []
    for (i, j), pts in edges.items():
        if len(pts) < 10:
            continue
        r0 = row(i, 0, 0) - row(j, 0, 0)
        ax = (row(i, 1, 0) - row(j, 1, 0) - r0) @ x
        ay = (row(i, 0, 1) - row(j, 0, 1) - r0) @ x
        den = np.hypot(ax, ay)
        if den > 1e-08:
            errors.extend([abs((row(i, px, py) - row(j, px, py)) @ x) / den * 251 for px, py in pts])
    print('pixel boundary errors median/p95/max', np.quantile(errors, [0.5, 0.95, 1]))
    planes = []
    for i in range(N):
        o, k = mapping[i]
        a = k * 2 * np.pi / 5
        aa, bb, c = x[3 * o:3 * o + 3]
        aa, bb = (np.cos(a) * aa - np.sin(a) * bb, np.sin(a) * aa + np.cos(a) * bb)
        n = np.array([-aa, -bb, 1.0]) * (1 if name == 'crown' else -1)
        d = c * (1 if name == 'crown' else -1)
        length = np.linalg.norm(n)
        planes.append(dict(n=(n / length).tolist(), d=d / length, region=name, family=f'{name}{o}'))
    import json
    report['regions'][name] = {'planes': planes, 'orbitCoefficients': x.reshape(-1, 3).tolist(), 'pixelEdgeErrorsMedianP95Max': np.quantile(errors, [0.5, 0.95, 1]).tolist(), 'regionCount': N, 'regionCentersXY': centers.tolist()}
output.write_text(json.dumps(report, indent=2) + '\n')
if len(sys.argv) > 3:
    all_planes = report['regions']['crown']['planes'] + report['regions']['pavilion']['planes']
    Path(sys.argv[3]).write_text('// Generated by scripts/fit-leonardo.py; image-derived assumptions, not original cutting data.\nexport const fittedPlanes = ' + json.dumps(all_planes, indent=2) + ';\n')
