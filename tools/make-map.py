"""Coastline for the map: Natural Earth 1:50m land (public domain), from the world-atlas package,
clipped with shapely to the area between Berlin and Gorki and projected (equirectangular, scaled at 56° N).
Writes data/map.json with the projection and an SVG path.  Run:  python tools/make-map.py
"""
import json
import math
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/land-50m.json"
LON0, LON1, LAT0, LAT1 = 10.0, 47.0, 49.5, 61.5
W = 1000
K = W / ((LON1 - LON0) * math.cos(math.radians(56)))
H = round((LAT1 - LAT0) * K)


def proj(lon, lat):
    return ((lon - LON0) * math.cos(math.radians(56)) * K, (LAT1 - lat) * K)


def main():
    topo = json.load(urllib.request.urlopen(urllib.request.Request(URL, headers={"User-Agent": "IronHammer/0.1"})))
    sc, tr = topo["transform"]["scale"], topo["transform"]["translate"]
    arcs = []
    for arc in topo["arcs"]:
        x = y = 0
        pts = []
        for dx, dy in arc:
            x += dx; y += dy
            pts.append((x * sc[0] + tr[0], y * sc[1] + tr[1]))
        arcs.append(pts)

    def ring(idx):
        pts = []
        for i in idx:
            a = arcs[i] if i >= 0 else arcs[~i][::-1]
            pts.extend(a if not pts else a[1:])
        return pts

    from shapely.geometry import Polygon, box
    from shapely.ops import unary_union
    view = box(LON0 - 1, LAT0 - 1, LON1 + 1, LAT1 + 1)
    polys = []
    for geom in topo["objects"]["land"]["geometries"]:
        parts = geom["arcs"] if geom["type"] == "MultiPolygon" else [geom["arcs"]]
        for part in parts:
            rings = [ring(r) for r in part]
            # Eurasia crosses the 180th meridian: unwrap Chukotka eastwards
            rings = [[(lon + 360 if lon < -120 and max(x for x, _ in rr) > 150 else lon, lat) for lon, lat in rr] for rr in rings]
            try:
                poly = Polygon(rings[0], rings[1:]).buffer(0)
            except Exception:
                continue
            if poly.intersects(view):
                polys.append(poly.intersection(view))
    land = unary_union(polys).simplify(0.02)
    paths = []
    geoms = getattr(land, "geoms", [land])
    for g in geoms:
        for r in [g.exterior, *g.interiors]:
            d = []
            for lon, lat in r.coords:
                x, y = proj(lon, lat)
                q = f"{x:.0f},{y:.0f}"
                if not d or d[-1] != q:
                    d.append(q)
            paths.append("M" + "L".join(d) + "Z")
    out = {"w": W, "h": H, "lon0": LON0, "lat1": LAT1, "k": K, "cos": math.cos(math.radians(56)),
           "land": "".join(paths),
           "source": "Natural Earth 1:50m land (public domain), via the world-atlas package"}
    (ROOT / "data" / "map.json").write_text(json.dumps(out), encoding="utf-8")
    print("map.json", W, H, len(out["land"]) // 1024, "KB")


if __name__ == "__main__":
    main()
