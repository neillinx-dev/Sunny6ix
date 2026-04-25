"""
One-off Places API discovery for patios in downtown Toronto.

Runs Text Search across several patio-related queries, filters to our
downtown bbox, dedupes against existing venues.json, and outputs a JSON
snippet ready to review (or auto-merge into venues.json).

Usage:
  python3 data-raw/places_discover.py            # writes discovered.json
  python3 data-raw/places_discover.py --merge    # also appends to venues.json

Requires GOOGLE_PLACES_API_KEY in .env.local.
"""
import json
import math
import os
import re
import sys
import time
import unicodedata
import urllib.request
import urllib.error
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
VENUES_PATH = ROOT / "src" / "data" / "venues.json"
ENV_PATH = ROOT / ".env.local"
OUT_PATH = ROOT / "data-raw" / "discovered.json"

# Same bbox we use for buildings + the OSM patio search.
BBOX = (43.62, -79.44, 43.69, -79.34)  # min_lat, min_lng, max_lat, max_lng

QUERIES = [
    "patio toronto",
    "rooftop bar toronto",
    "bar with patio toronto",
    "restaurant outdoor seating toronto",
    "rooftop patio downtown toronto",
]

# Field mask kept tight to minimize cost.
FIELD_MASK = (
    "places.id,places.displayName,places.formattedAddress,"
    "places.shortFormattedAddress,places.location,places.websiteUri,"
    "places.types,places.rating,places.userRatingCount,"
    "nextPageToken"
)

PLACES_URL = "https://places.googleapis.com/v1/places:searchText"


def load_env_key():
    if not ENV_PATH.exists():
        sys.exit(f"missing {ENV_PATH} — add GOOGLE_PLACES_API_KEY=… to it")
    for line in ENV_PATH.read_text().splitlines():
        line = line.strip()
        if line.startswith("GOOGLE_PLACES_API_KEY="):
            return line.split("=", 1)[1].strip()
    sys.exit("GOOGLE_PLACES_API_KEY not found in .env.local")


def slugify(name):
    s = name.lower()
    s = re.sub(r"[''`]", "", s)
    s = re.sub(r"&", "and", s)
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return s.strip("-")


def norm_name(n):
    """Loose comparison key for fuzzy dedupe — strips diacritics, punctuation,
    lowercases, drops common location/category suffixes."""
    s = unicodedata.normalize("NFKD", n)
    s = "".join(c for c in s if not unicodedata.combining(c))
    s = s.lower()
    # Drop neighborhood/branch suffixes that often differ between sources
    s = re.sub(r"\bking\s*(west|w|east|e)\b", "", s)
    s = re.sub(r"\b(downtown|liberty\s*village|little\s*italy|leslieville|riverside|distillery|harbourfront|entertainment\s*district|financial\s*district|yorkville|kensington|chinatown|parkdale|rosedale|cabbagetown|the\s*beaches?|annex|junction|danforth|greektown)\b", "", s)
    s = re.sub(r"\b(restaurant|bar|pub|tavern|cafe|kitchen|brewery|brewhouse|toronto|the)\b", "", s)
    s = re.sub(r"[^a-z0-9]+", "", s)
    return s


def is_substring_dup(new_name, existing_name):
    """Catch cases where the existing name has extra branch/location info,
    e.g. existing 'Earls Kitchen + Bar King West' vs new 'Earls Kitchen + Bar'."""
    a, b = norm_name(new_name), norm_name(existing_name)
    if not a or not b:
        return False
    if len(a) >= 5 and (a in b or b in a):
        return True
    return False


def in_bbox(lat, lng):
    return BBOX[0] <= lat <= BBOX[2] and BBOX[1] <= lng <= BBOX[3]


def search_text(api_key, query, page_token=None):
    body = {
        "textQuery": query,
        "locationRestriction": {
            "rectangle": {
                "low": {"latitude": BBOX[0], "longitude": BBOX[1]},
                "high": {"latitude": BBOX[2], "longitude": BBOX[3]},
            }
        },
        "pageSize": 20,
    }
    if page_token:
        body["pageToken"] = page_token

    req = urllib.request.Request(
        PLACES_URL,
        data=json.dumps(body).encode(),
        headers={
            "Content-Type": "application/json",
            "X-Goog-Api-Key": api_key,
            "X-Goog-FieldMask": FIELD_MASK,
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        print(f"  HTTP {e.code}: {e.read().decode()[:200]}", file=sys.stderr)
        return {}


def discover(api_key):
    seen_place_ids = set()
    found = []

    for q in QUERIES:
        print(f"\n› {q}")
        token = None
        for page in range(3):  # max 3 pages = 60 results per query
            data = search_text(api_key, q, token)
            places = data.get("places", [])
            print(f"  page {page + 1}: {len(places)} results")
            for p in places:
                pid = p.get("id")
                if not pid or pid in seen_place_ids:
                    continue
                seen_place_ids.add(pid)
                loc = p.get("location") or {}
                lat = loc.get("latitude")
                lng = loc.get("longitude")
                if lat is None or lng is None:
                    continue
                if not in_bbox(lat, lng):
                    continue
                found.append({
                    "place_id": pid,
                    "name": (p.get("displayName") or {}).get("text"),
                    "address": p.get("formattedAddress"),
                    "short_address": p.get("shortFormattedAddress"),
                    "website": p.get("websiteUri"),
                    "types": p.get("types") or [],
                    "rating": p.get("rating"),
                    "rating_count": p.get("userRatingCount"),
                    "lat": lat,
                    "lng": lng,
                })
            token = data.get("nextPageToken")
            if not token:
                break
            time.sleep(2)  # token activation delay
    return found


def dedupe_against_existing(found, venues):
    by_norm_name = {norm_name(v["name"]): v for v in venues}
    by_id = {v.get("place_id"): v for v in venues if v.get("place_id")}

    new_only = []
    matched = 0
    for f in found:
        if f["place_id"] in by_id:
            matched += 1
            continue
        nn = norm_name(f["name"] or "")
        if nn and nn in by_norm_name:
            matched += 1
            continue
        # Dedupe by slug
        f_slug = slugify(f["name"] or "")
        if any(slugify(v["name"]) == f_slug for v in venues):
            matched += 1
            continue
        # Substring dedupe — catches "Earls" vs "Earls King West"
        if any(is_substring_dup(f["name"] or "", v["name"]) for v in venues):
            matched += 1
            continue
        new_only.append(f)
    return new_only, matched


def popularity_score(rating, count):
    if not rating or not count:
        return 0
    return rating * math.log10(max(10, count))


def main():
    merge = "--merge" in sys.argv
    api_key = load_env_key()
    venues = json.loads(VENUES_PATH.read_text())

    print(f"existing venues: {len(venues)}")
    print(f"bbox: {BBOX}")

    found = discover(api_key)
    print(f"\nfound {len(found)} unique places in bbox across {len(QUERIES)} queries")

    new_only, dup_count = dedupe_against_existing(found, venues)
    print(f"already in db: {dup_count}")
    print(f"new candidates: {len(new_only)}")

    # Sort by Google's relevance proxy — rating × log(reviews)
    new_only.sort(key=lambda f: -popularity_score(f.get("rating"), f.get("rating_count")))

    OUT_PATH.write_text(json.dumps(new_only, indent=2, ensure_ascii=False))
    print(f"\nwrote {OUT_PATH.relative_to(ROOT)} ({len(new_only)} venues)")
    print("\nTop 10 by popularity proxy:")
    for f in new_only[:10]:
        score = popularity_score(f.get("rating"), f.get("rating_count"))
        print(f"  {score:5.1f}  {f['rating']}/{f['rating_count']:>5}  {f['name']:<40}  {f['short_address']}")

    if merge:
        # Convert each candidate to our venue schema with sensible defaults.
        added = 0
        for f in new_only:
            v = {
                "id": slugify(f["name"]),
                "name": f["name"],
                "address": f.get("short_address") or f.get("address") or "",
                "neighborhood": "",  # filled by user via admin tool later
                "lat": f["lat"],
                "lng": f["lng"],
                "patioType": "rooftop" if any("rooftop" in t.lower() for t in f.get("types", [])) else "sidewalk",
                "covered": False,
                "patioFloor": 0,
                "orientation": 180,
                "samplePoints": [[f["lng"], f["lat"]]],
                "tags": [],
                "popularity": _popularity_tier(f.get("rating"), f.get("rating_count")),
                "place_id": f["place_id"],
            }
            if f.get("website"):
                v["website"] = f["website"]
            # Skip if id collides
            if any(existing["id"] == v["id"] for existing in venues):
                continue
            venues.append(v)
            added += 1
        VENUES_PATH.write_text(json.dumps(venues, indent=2, ensure_ascii=False))
        print(f"\nmerged {added} new venues into venues.json (now {len(venues)} total)")


def _popularity_tier(rating, count):
    if not rating or not count:
        return 2
    score = rating * math.log10(max(10, count))
    if score >= 16:
        return 5
    if score >= 13:
        return 4
    if score >= 10:
        return 3
    return 2


if __name__ == "__main__":
    main()
