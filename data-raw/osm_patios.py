"""
Pull OSM leisure=outdoor_seating polygons for downtown Toronto via Overpass
and conflate with our existing venues.

Matching rules (tuned for Toronto's sparse OSM coverage):
- For each OSM polygon, find its nearest venue.
- Accept if (a) name match within 120m, OR
            (b) no name match but polygon is within 60m of the nearest venue
                AND is at least 20m closer to that venue than any other venue.
- This avoids attributing a polygon on a park or random sidewalk to a venue
  500m away, while still catching obviously-adjacent unnamed polygons.
"""
import json
import math
import re
import urllib.request
import urllib.parse

OVERPASS_ENDPOINTS = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
    'https://overpass.private.coffee/api/interpreter',
]
BBOX = '43.62,-79.44,43.69,-79.34'
QUERY = f"""
[out:json][timeout:60];
(
  way["leisure"="outdoor_seating"]({BBOX});
  relation["leisure"="outdoor_seating"]({BBOX});
);
out tags geom;
"""

def fetch():
    import time
    data = urllib.parse.urlencode({'data': QUERY}).encode()
    last_err = None
    for ep in OVERPASS_ENDPOINTS:
        try:
            print(f'  trying {ep}')
            req = urllib.request.Request(ep, data=data,
                                         headers={'User-Agent': 'PatioSunBot/1.0 (research)'})
            with urllib.request.urlopen(req, timeout=120) as r:
                return json.loads(r.read())
        except Exception as e:
            last_err = e
            print(f'  failed: {e}; retrying next endpoint in 5s')
            time.sleep(5)
    raise last_err

def polygon_centroid(ring):
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

def norm_name(s):
    if not s:
        return ''
    s = s.lower().replace('\u2019', "'")
    s = re.sub(r'[^a-z0-9]+', ' ', s)
    return s.strip()

def name_match(a, b):
    a, b = norm_name(a), norm_name(b)
    if not a or not b:
        return False
    if a == b:
        return True
    if len(a) >= 4 and a in b: return True
    if len(b) >= 4 and b in a: return True
    ta, tb = set(a.split()), set(b.split())
    if len(ta & tb) >= 2 and len(ta & tb) / max(len(ta), len(tb)) >= 0.6:
        return True
    return False

def main():
    print('Querying Overpass...')
    raw = fetch()
    elements = raw.get('elements', [])
    print(f'OSM returned {len(elements)} elements')

    patios = []
    for el in elements:
        if el['type'] == 'way' and 'geometry' in el:
            ring = [(p['lon'], p['lat']) for p in el['geometry']]
        elif el['type'] == 'relation':
            ring = []
            for m in el.get('members', []):
                if m.get('role') == 'outer' and 'geometry' in m:
                    ring.extend((p['lon'], p['lat']) for p in m['geometry'])
            if not ring:
                continue
        else:
            continue
        if len(ring) < 3:
            continue
        tags = el.get('tags', {}) or {}
        cx, cy = polygon_centroid(ring)
        patios.append({
            'id': f"{el['type']}/{el['id']}",
            'name': tags.get('name') or '',
            'ring': ring,
            'centroid': (cx, cy),
        })
    print(f'Parsed {len(patios)} usable polygons')

    with open('src/data/venues.json', 'r') as f:
        venues = json.load(f)
    print(f'Existing venues: {len(venues)}\n')

    # For each OSM polygon, find nearest + second-nearest venue
    assignments = []  # (patio, venue, distance, reason)
    for p in patios:
        plng, plat = p['centroid']
        ranked = sorted(
            ((hav(plat, plng, v['lat'], v['lng']), v) for v in venues),
            key=lambda x: x[0]
        )
        if not ranked:
            continue
        d1, v1 = ranked[0]
        d2 = ranked[1][0] if len(ranked) > 1 else float('inf')

        # Name match up to 120m (liberal — if the name matches, we trust it)
        if p['name'] and name_match(p['name'], v1['name']) and d1 <= 120:
            assignments.append((p, v1, d1, f"name-match {p['name']} ≈ {v1['name']}"))
            continue
        # No-name-match: accept when within 60m AND unambiguous (runner-up ≥ 20m further)
        if d1 <= 60 and (d2 - d1) >= 20:
            assignments.append((p, v1, d1, 'nearest-unambiguous'))
            continue
        # Within 60m but ambiguous — log for manual review
        if d1 <= 60:
            print(f'  AMBIGUOUS  OSM#{p["id"]}  nearest={v1["name"]} ({d1:.0f}m) '
                  f'next={ranked[1][1]["name"]} ({d2:.0f}m)')

    # Apply: make sure each venue only gets assigned once (take closest if multiple)
    by_venue = {}
    for patio, venue, d, reason in assignments:
        vid = venue['id']
        if vid not in by_venue or d < by_venue[vid][2]:
            by_venue[vid] = (patio, venue, d, reason)

    matched = 0
    skipped_existing = 0
    for (patio, venue, d, reason) in by_venue.values():
        # Preserve hand-drawn polygons — only overwrite if venue has none
        # or the existing one came from OSM (re-run).
        existing = venue.get('patioPolygon')
        existing_source = venue.get('patioSource')
        if existing and existing_source not in (None, 'osm'):
            skipped_existing += 1
            print(f'  SKIP   {venue["name"]:36s} (has hand-drawn polygon)')
            continue
        venue['patioPolygon'] = [[round(lng, 7), round(lat, 7)] for lng, lat in patio['ring']]
        venue['patioSource'] = 'osm'
        matched += 1
        print(f'  MATCH  {venue["name"]:36s} ← OSM#{patio["id"]}  ({d:.0f}m)  [{reason}]')

    used_ids = {p['id'] for (p, _, _, _) in by_venue.values()}
    unmatched = [p for p in patios if p['id'] not in used_ids]

    print(f'\nMatched {matched}/{len(venues)} venues with OSM polygons')
    print(f'Unmatched OSM polygons: {len(unmatched)}')

    unmatched_named = [p for p in unmatched if p['name']]
    if unmatched_named:
        print(f'\nUnused NAMED OSM polygons (candidates for new venues):')
        for p in unmatched_named:
            print(f'  - {p["name"]} @ ({p["centroid"][1]:.5f}, {p["centroid"][0]:.5f})')

    with open('src/data/venues.json', 'w') as f:
        json.dump(venues, f, indent=2, ensure_ascii=False)
    print(f'\nWrote src/data/venues.json')

if __name__ == '__main__':
    main()
