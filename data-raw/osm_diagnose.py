"""Diagnose OSM outdoor_seating polygons — show each and its nearest venue."""
import json
import math
import urllib.request
import urllib.parse

OVERPASS = 'https://overpass-api.de/api/interpreter'
BBOX = '43.62,-79.44,43.69,-79.34'
QUERY = f"""
[out:json][timeout:60];
(
  way["leisure"="outdoor_seating"]({BBOX});
);
out tags geom;
"""

def fetch():
    data = urllib.parse.urlencode({'data': QUERY}).encode()
    req = urllib.request.Request(OVERPASS, data=data,
                                 headers={'User-Agent': 'PatioSunBot/1.0'})
    with urllib.request.urlopen(req, timeout=90) as r:
        return json.loads(r.read())

def centroid(ring):
    a = cx = cy = 0.0
    n = len(ring)
    for i in range(n):
        x1, y1 = ring[i]
        x2, y2 = ring[(i + 1) % n]
        c = x1 * y2 - x2 * y1
        a += c; cx += (x1 + x2) * c; cy += (y1 + y2) * c
    a *= 0.5
    if abs(a) < 1e-12:
        return sum(p[0] for p in ring)/n, sum(p[1] for p in ring)/n
    return cx / (6 * a), cy / (6 * a)

def hav(lat1, lng1, lat2, lng2):
    R = 6371000
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1); dl = math.radians(lng2 - lng1)
    a = math.sin(dp/2)**2 + math.cos(p1)*math.cos(p2)*math.sin(dl/2)**2
    return 2 * R * math.asin(math.sqrt(a))

raw = fetch()
with open('src/data/venues.json') as f: venues = json.load(f)

for el in raw.get('elements', []):
    if 'geometry' not in el: continue
    ring = [(p['lon'], p['lat']) for p in el['geometry']]
    if len(ring) < 3: continue
    cx, cy = centroid(ring)
    # find 3 nearest venues
    dists = sorted(
        ((hav(cy, cx, v['lat'], v['lng']), v['name'], v['neighborhood']) for v in venues),
        key=lambda x: x[0]
    )[:3]
    name = (el.get('tags') or {}).get('name') or '(unnamed)'
    print(f"\nOSM #{el['id']} — {name}")
    print(f"  centroid: ({cy:.5f}, {cx:.5f}), {len(ring)}pts")
    for d, vn, hood in dists:
        print(f"    {d:6.0f}m  {vn:30s} ({hood})")
