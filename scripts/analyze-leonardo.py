"""Reproduce image measurements, not a 3D reconstruction. Requires Pillow and NumPy.
Usage: python3 scripts/analyze-leonardo.py diagram.png photo.jpeg output.json
Images are read only. Coordinates below refer to the supplied 1921 x 534 diagram.
No optical rating or facet-plane parameters are inferred from pixel slopes.
"""
import hashlib
import json
import math
import sys
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image


def regions(rgb, bbox, threshold):
    x0, y0, x1, y1 = bbox
    white = rgb[y0:y1, x0:x1].min(axis=2) > threshold
    h, w = white.shape
    enclosed = []
    for y in range(h):
        for x in range(w):
            if not white[y, x]:
                continue
            white[y, x] = False
            queue = deque([(x, y)])
            size = sx = sy = 0
            border = False
            while queue:
                xx, yy = queue.popleft()
                size += 1
                sx += xx
                sy += yy
                border |= xx in (0, w - 1) or yy in (0, h - 1)
                for nx, ny in ((xx - 1, yy), (xx + 1, yy), (xx, yy - 1), (xx, yy + 1)):
                    if 0 <= nx < w and 0 <= ny < h and white[ny, nx]:
                        white[ny, nx] = False
                        queue.append((nx, ny))
            # Reject exterior background and tiny antialiasing islands.
            if size > 100 and not border:
                enclosed.append({"areaPixels": size, "centroid": [sx / size + x0, sy / size + y0]})
    return sorted(enclosed, key=lambda r: -r["areaPixels"])


def rotation_agreement(rgb, cx, cy, angle):
    mask = rgb[:, cx - 260:cx + 261].min(axis=2) < 180
    nearby = mask.copy()
    for dx in range(-3, 4):
        for dy in range(-3, 4):
            nearby |= np.roll(np.roll(mask, dx, axis=1), dy, axis=0)
    yy, xx = np.where(mask)
    x, y = xx - 260, yy - cy
    keep = (x*x + y*y < 225**2) & (x*x + y*y > 25**2)
    x, y = x[keep], y[keep]
    a = math.radians(angle)
    X = np.rint(math.cos(a)*x - math.sin(a)*y + 260).astype(int)
    Y = np.rint(math.sin(a)*x + math.cos(a)*y + cy).astype(int)
    return float(nearby[Y, X].mean())


def main():
    diagram, photo, target = map(Path, sys.argv[1:])
    rgb = np.array(Image.open(diagram).convert("RGB"))
    if rgb.shape[:2] != (534, 1921):
        raise ValueError("Measurements are specific to the supplied 1921 x 534 diagram")
    measured = {}
    for name, box in {"crown": (0, 0, 553, 534), "pavilion": (1370, 0, 1921, 534)}.items():
        measured[name] = {"bbox": box, "countsByThreshold": {str(t): len(regions(rgb, box, t)) for t in (160, 180, 200, 220)}, "regionsAt200": regions(rgb, box, 200)}
    # Manually identified line-center landmarks, approximately +/-2 pixels.
    landmarks = {"girdleLeftX": 617, "girdleRightX": 1306, "tableLeftX": 838, "tableRightX": 1083, "tableY": 95, "girdleTopY": 194, "girdleBottomY": 208, "culetX": 961, "culetY": 484}
    p = landmarks
    D = p["girdleRightX"] - p["girdleLeftX"]
    heights = {"crown": p["girdleTopY"] - p["tableY"], "girdle": p["girdleBottomY"] - p["girdleTopY"], "pavilion": p["culetY"] - p["girdleBottomY"], "total": p["culetY"] - p["tableY"]}
    report = {"status": "image-analysis-only; insufficient for validated cut configuration", "sources": [{"file": path.name, "sha256": hashlib.sha256(path.read_bytes()).hexdigest(), "dimensions": list(Image.open(path).size)} for path in (diagram, photo)], "enclosedImageRegions": measured, "rotation72AgreementWithin3PixelSquare": {"crown": rotation_agreement(rgb, 275, 263, 72), "pavilion": rotation_agreement(rgb, 1647, 263, 72)}, "manualLandmarksPixels": landmarks, "landmarkUncertaintyPixelsApprox": 2, "projectedDiameterPixels": D, "projectedHeightsPixels": heights, "projectedHeightPercent": {key: 100 * value / D for key, value in heights.items()}, "projectedTableWidthPercent": 100 * (p["tableRightX"] - p["tableLeftX"]) / D, "apparentProfileAnglesNotFacetAnglesDeg": {"crownLeft": math.degrees(math.atan2(heights["crown"], p["tableLeftX"] - p["girdleLeftX"])), "pavilionLeft": math.degrees(math.atan2(heights["pavilion"], p["culetX"] - p["girdleLeftX"]))}}
    # A scanline through the drawn girdle, not a circumference facet count.
    xs = np.where(rgb[201, 600:1320].min(axis=1) < 180)[0] + 600
    runs = []
    for x in xs:
        if not runs or int(x) > runs[-1][-1] + 1:
            runs.append([int(x)])
        else:
            runs[-1].append(int(x))
    report["girdleScanline"] = {"y": 201, "threshold": 180, "lineCentersX": [sum(r) / len(r) for r in runs], "visibleIntervals": len(runs) - 1, "warning": "Projected strokes only; do not infer full 3D facet count by doubling"}
    target.write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps({"counts": {k: v["countsByThreshold"] for k,v in measured.items()}, "proportions": report["projectedHeightPercent"], "apparentAngles": report["apparentProfileAnglesNotFacetAnglesDeg"]}, indent=2))


if __name__ == "__main__":
    main()
