"""
Merge filtered discovered.json into venues.json.

Filter: rating >= 4.0 AND rating_count >= 100 — drops long-tail spots that
are unlikely to be legitimate patio destinations.
"""
import json
import math
import re
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
VENUES = ROOT / "src" / "data" / "venues.json"
DISCOVERED = ROOT / "data-raw" / "discovered.json"

MIN_RATING = 4.0
MIN_REVIEWS = 100


def slugify(name):
    s = unicodedata.normalize("NFKD", name)
    s = "".join(c for c in s if not unicodedata.combining(c))
    s = s.lower()
    s = re.sub(r"[''`]", "", s)
    s = re.sub(r"&", "and", s)
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return s.strip("-")


def popularity_tier(rating, count):
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


def main():
    venues = json.loads(VENUES.read_text())
    discovered = json.loads(DISCOVERED.read_text())
    existing_ids = {v["id"] for v in venues}

    eligible = [
        d for d in discovered
        if (d.get("rating") or 0) >= MIN_RATING and (d.get("rating_count") or 0) >= MIN_REVIEWS
    ]
    print(f"discovered: {len(discovered)}, eligible: {len(eligible)}")

    added = 0
    skipped_id = 0
    for d in eligible:
        slug = slugify(d["name"])
        if slug in existing_ids:
            skipped_id += 1
            continue
        v = {
            "id": slug,
            "name": d["name"],
            "address": d.get("short_address") or d.get("address") or "",
            "neighborhood": "",
            "lat": d["lat"],
            "lng": d["lng"],
            "patioType": "rooftop" if any("rooftop" in (t or "").lower() for t in d.get("types", [])) else "sidewalk",
            "covered": False,
            "patioFloor": 0,
            "orientation": 180,
            "samplePoints": [[d["lng"], d["lat"]]],
            "tags": [],
            "popularity": popularity_tier(d.get("rating"), d.get("rating_count")),
            "place_id": d["place_id"],
        }
        if d.get("website"):
            v["website"] = d["website"]
        venues.append(v)
        existing_ids.add(slug)
        added += 1

    VENUES.write_text(json.dumps(venues, indent=2, ensure_ascii=False) + "\n")
    print(f"added {added}, skipped {skipped_id} (id collision), total venues: {len(venues)}")


if __name__ == "__main__":
    main()
