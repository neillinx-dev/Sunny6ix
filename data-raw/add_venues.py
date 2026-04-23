"""
Add missing venues from user's list. Geocodes each via Nominatim
(free, rate-limited to 1 req/sec) and merges into venues.json.

Each missing venue includes a known-address hint for accurate geocoding.
Neighborhoods and patioType guessed from known Toronto geography.
"""
import json
import time
import urllib.request
import urllib.parse
import re

# (name, address hint, neighborhood, patio_type)
MISSING = [
    ('The Porch',                '250 Adelaide St W, Toronto',         'Entertainment District', 'patio'),
    ('Bar Poet',                 '1090 Queen St W, Toronto',           'Queen West',             'sidewalk'),
    ('Cabana Pool Bar',          '11 Polson St, Toronto',              'Port Lands',             'rooftop'),
    ('Soluna',                   '568 College St, Toronto',            'Little Italy',           'patio'),
    ('Writers Room',             '4 Avenue Rd, Toronto',               'Yorkville',              'rooftop'),
    ('Evangeline',               '51 Camden St, Toronto',              'Queen West',             'patio'),
    ('Valerie',                  '18 Mercer St, Toronto',              'Entertainment District', 'patio'),
    ('Broadview Hotel Rooftop',  '106 Broadview Ave, Toronto',         'Riverside',              'rooftop'),
    ('Aera',                     '81 Bay St, Toronto',                 'Financial District',     'rooftop'),
    ('Grey Gardens',             '199 Augusta Ave, Toronto',           'Kensington Market',      'sidewalk'),
    ('Bar Piquette',             '197 Baldwin St, Toronto',            'Kensington Market',      'sidewalk'),
    ('Le Swan',                  '892 Queen St W, Toronto',            'Queen West',             'sidewalk'),
    ('La Palma',                 '849 Dundas St W, Toronto',           'Little Portugal',        'patio'),
    ('Rasa',                     '196 Robert St, Toronto',             'Harbord',                'patio'),
    ('Enoteca Sociale',          '1288 Dundas St W, Toronto',          'Little Portugal',        'sidewalk'),
    ('Cluny Bistro',             '35 Tank House Lane, Toronto',        'Distillery District',    'patio'),
    ('Chubby\u2019s Jamaican',   '104 Portland St, Toronto',           'King West',              'patio'),
    ('Giulietta',                '972 College St, Toronto',            'Little Italy',           'sidewalk'),
    ('Maison Selby',             '592 Sherbourne St, Toronto',         'Cabbagetown',            'patio'),
    ('Paris Paris',              '119 Ossington Ave, Toronto',         'Ossington',              'patio'),
    ('Bar Vendetta',             '900 Queen St W, Toronto',            'Queen West',             'sidewalk'),
    ('Union',                    '72 Ossington Ave, Toronto',          'Ossington',              'patio'),
    ('C\u00f4te de B\u0153uf',   '130 Ossington Ave, Toronto',         'Ossington',              'sidewalk'),
    ('Foxley',                   '207 Ossington Ave, Toronto',         'Ossington',              'sidewalk'),
    ('OddSeoul',                 '90 Ossington Ave, Toronto',          'Ossington',              'sidewalk'),
    ('Dakota Tavern',            '249 Ossington Ave, Toronto',         'Ossington',              'sidewalk'),
    ('Milou',                    '1375 Queen St W, Toronto',           'Parkdale',               'patio'),
    ('Archive',                  '909 Dundas St W, Toronto',           'Trinity-Bellwoods',      'sidewalk'),
    ('Ronnie\u2019s Local',      '69 Nassau St, Toronto',              'Kensington Market',      'patio'),
    ('Superpoint',               '184 Ossington Ave, Toronto',         'Ossington',              'sidewalk'),
    ('Paradise Grapevine',       '841 Bloor St W, Toronto',            'Bloorcourt',             'sidewalk'),
    ('El Rey',                   '2A Kensington Ave, Toronto',         'Kensington Market',      'patio'),
    ('Little Jerry',             '1078 Queen St W, Toronto',           'Queen West',             'sidewalk'),
    ('Civil Liberties',          '878 Bloor St W, Toronto',            'Bloorcourt',             'patio'),
    ('Maison T',                 '200 Bay St, Toronto',                'Financial District',     'patio'),
    ('Public Gardens',           '1051 Yonge St, Toronto',             'Rosedale',               'patio'),
    ('Crack Burger',             '78 Ossington Ave, Toronto',          'Ossington',              'sidewalk'),
    ('Nom Nom Nom Poutine',      '707 Dundas St W, Toronto',           'Chinatown',              'sidewalk'),
    ('Trinity Market',           '1026 Queen St W, Toronto',           'Trinity-Bellwoods',      'sidewalk'),
    ('The Black Bull',           '298 Queen St W, Toronto',            'Queen West',             'patio'),
    ('Belfast Love',             '194 Queen St W, Toronto',            'Queen West',             'sidewalk'),
]

def slug(name: str) -> str:
    s = name.lower()
    s = re.sub(r'[^a-z0-9]+', '-', s)
    return s.strip('-')

def geocode(q: str):
    url = 'https://nominatim.openstreetmap.org/search?' + urllib.parse.urlencode({
        'q': q,
        'format': 'json',
        'limit': 1,
        'countrycodes': 'ca',
    })
    req = urllib.request.Request(url, headers={'User-Agent': 'PatioSunBot/1.0 (dev)'})
    with urllib.request.urlopen(req, timeout=10) as r:
        data = json.loads(r.read())
    if not data:
        return None
    return float(data[0]['lat']), float(data[0]['lon'])

with open('src/data/venues.json', 'r') as f:
    venues = json.load(f)

existing_ids = {v['id'] for v in venues}
existing_names_lower = {v['name'].lower().replace('\u2019', "'") for v in venues}

added = 0
for name, addr, hood, ptype in MISSING:
    key = name.lower().replace('\u2019', "'")
    if key in existing_names_lower or any(key in n or n in key for n in existing_names_lower):
        # Already exists under slightly different name
        print(f'SKIP (exists): {name}')
        continue
    try:
        coords = geocode(addr)
    except Exception as e:
        print(f'FAIL {name}: {e}')
        coords = None
        time.sleep(1.1)
        continue
    if not coords:
        print(f'NO HIT: {name} ({addr})')
        time.sleep(1.1)
        continue
    lat, lng = coords
    # Skip if coordinates are WAY outside Toronto (sanity: lat 43.55-43.85, lng -79.6..-79.1)
    if not (43.55 <= lat <= 43.85 and -79.6 <= lng <= -79.1):
        print(f'BAD COORDS {name}: ({lat}, {lng}) — outside Toronto bbox')
        time.sleep(1.1)
        continue
    venue = {
        'id': slug(name),
        'name': name,
        'address': addr.replace(', Toronto', ''),
        'neighborhood': hood,
        'lat': round(lat, 7),
        'lng': round(lng, 7),
        'patioType': ptype,
        'covered': False,
        'patioFloor': 1 if ptype == 'rooftop' else 0,
        'orientation': 180,  # default south-facing
        'samplePoints': [[round(lng, 7), round(lat, 7)]],
        'tags': [],
        'website': '',
    }
    venues.append(venue)
    added += 1
    print(f'ADD {name}: ({lat:.5f}, {lng:.5f}) — {hood}')
    time.sleep(1.1)  # nominatim rate limit

with open('src/data/venues.json', 'w') as f:
    json.dump(venues, f, indent=2, ensure_ascii=False)

print(f'\nTotal venues: {len(venues)} (added {added})')
