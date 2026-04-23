"""
Process Toronto 3D Massing shapefile:
- Filter to downtown bbox (Dufferin to Parliament, Lakeshore to Bloor)
- Reproject from Web Mercator (EPSG:3857) to WGS84 lat/lng
- Simplify footprints (Douglas-Peucker ~1m)
- Output compact JSON: [[lng,lat,...], height_m]
"""
import shapefile
import json
import math
import os

# Downtown Toronto bbox (lat/lng)
LNG_MIN, LNG_MAX = -79.432, -79.362   # Dufferin to Parliament
LAT_MIN, LAT_MAX = 43.635, 43.680     # Lake to Bloor

# Web Mercator <-> WGS84
R = 20037508.342789244
def merc_to_lnglat(x, y):
    lng = x / R * 180.0
    lat = math.degrees(2 * math.atan(math.exp(y / R * math.pi)) - math.pi / 2)
    return (lng, lat)

# Douglas-Peucker simplification (tolerance in degrees; ~1e-5 = ~1m)
def perp_dist(p, a, b):
    if a == b:
        return math.hypot(p[0]-a[0], p[1]-a[1])
    dx, dy = b[0]-a[0], b[1]-a[1]
    t = ((p[0]-a[0])*dx + (p[1]-a[1])*dy) / (dx*dx + dy*dy)
    t = max(0, min(1, t))
    px, py = a[0]+t*dx, a[1]+t*dy
    return math.hypot(p[0]-px, p[1]-py)

def rdp(pts, eps):
    if len(pts) < 3:
        return pts
    dmax, idx = 0, 0
    for i in range(1, len(pts)-1):
        d = perp_dist(pts[i], pts[0], pts[-1])
        if d > dmax:
            dmax, idx = d, i
    if dmax > eps:
        left = rdp(pts[:idx+1], eps)
        right = rdp(pts[idx:], eps)
        return left[:-1] + right
    return [pts[0], pts[-1]]

# ~1 meter at Toronto latitude ≈ 1e-5 degrees
SIMPLIFY_EPS = 3.0e-5      # ~3m simplification
MIN_HEIGHT = 8.0           # skip anything under 2 stories (houses, garages)

r = shapefile.Reader(os.path.join(os.path.dirname(__file__),
                                   'shapefile_outer',
                                   '3DMassingShapefile_2025_WGS84'))
out = []
count_total = 0
count_in_box = 0
count_kept = 0

for shape_rec in r.iterShapeRecords():
    count_total += 1
    rec = shape_rec.record
    lng_c = rec['LONGITUDE']
    lat_c = rec['LATITUDE']
    if not (LNG_MIN <= lng_c <= LNG_MAX and LAT_MIN <= lat_c <= LAT_MAX):
        continue
    count_in_box += 1

    max_h = rec['MAX_HEIGHT']
    avg_h = rec['AVG_HEIGHT']
    height = max_h if max_h and max_h > 0 else avg_h
    if not height or height < MIN_HEIGHT:
        continue

    shp = shape_rec.shape
    if not shp.points:
        continue

    # A polygon may have multiple rings; shp.parts gives ring start indices.
    parts = list(shp.parts) + [len(shp.points)]
    # Take outer ring only (largest by point count, usually first)
    best_ring = None
    best_len = 0
    for i in range(len(parts) - 1):
        ring = shp.points[parts[i]:parts[i+1]]
        if len(ring) > best_len:
            best_ring = ring
            best_len = len(ring)
    if not best_ring or len(best_ring) < 4:
        continue

    # Reproject to lng/lat
    coords = [merc_to_lnglat(p[0], p[1]) for p in best_ring]
    # Simplify
    coords = rdp(coords, SIMPLIFY_EPS)
    if len(coords) < 4:
        continue

    # Round to 6 decimals (~11cm) and flatten
    flat = []
    for (lng, lat) in coords:
        flat.append(round(lng, 5))
        flat.append(round(lat, 5))

    out.append([flat, round(float(height), 1)])
    count_kept += 1

print(f'Total records:     {count_total}')
print(f'In downtown bbox:  {count_in_box}')
print(f'Kept (>= {MIN_HEIGHT}m):   {count_kept}')

out_path = os.path.join(os.path.dirname(__file__), '..', 'src', 'data', 'torontoBuildings.json')
os.makedirs(os.path.dirname(out_path), exist_ok=True)
with open(out_path, 'w') as f:
    json.dump(out, f, separators=(',', ':'))

size = os.path.getsize(out_path)
print(f'Wrote {out_path} ({size/1024:.1f} KB, {size/1024/1024:.2f} MB)')
