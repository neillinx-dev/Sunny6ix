"""
Hand-curated popularity tier (1-5) for Sunny Now list sort order.

Tier rationale (Toronto-resident judgement, not a real ranking):
  5 — destination patios people travel across the city for
  4 — very busy / well-known neighbourhood spots
  3 — solid neighbourhood favourites
  2 — default for unscored venues
  1 — would only be reserved for very niche / lesser-known
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
VENUES = ROOT / "src" / "data" / "venues.json"

POPULARITY = {
    # Tier 5 — destination patios
    "Cabana Pool Bar": 5,
    "The Drake Hotel": 5,
    "Broadview Hotel Rooftop": 5,
    "The Broadview Hotel - Rooftop": 5,
    "Lavelle": 5,
    "Kost": 5,
    "Harriet's Rooftop": 5,
    "Bar Raval": 5,
    "La Palma": 5,
    "Gusto 101": 5,
    "Bar Isabel": 5,
    "Le Swan": 5,

    # Tier 4 — very popular
    "Baro": 4,
    "Aloette Spadina": 4,
    "RendezViews": 4,
    "Cluny Bistro": 4,
    "El Catrin Destileria": 4,
    "Bellwoods Brewery": 4,
    "Cibo Wine Bar": 4,
    "Earls Kitchen + Bar King West": 4,
    "Maison Selby": 4,
    "Terroni on Adelaide": 4,
    "The Porch": 4,
    "Soluna": 4,
    "Beso by Patria": 4,
    "Giulietta": 4,
    "Foxley": 4,
    "Bar Vendetta": 4,
    "Grey Gardens": 4,
    "Bar Hop": 4,
    "Sneaky Dee's": 4,
    "Dakota Tavern": 4,
    "Handlebar": 4,
    "Reposado Bar & Bodega": 4,
    "The Cameron House": 4,
    "The Horseshoe Tavern": 4,
    "The Rivoli": 4,
    "The Rex Hotel Jazz & Blues Bar": 4,
    "El Rey": 4,
    "Côte de Bœuf": 4,
    "Aera": 4,
    "Maison T": 4,
    "OddSeoul": 4,
    "Bar Eugenie (formerly The Harbord Room)": 4,
    "Boxcar Social Harbourfront": 4,

    # Tier 3 — solid neighbourhood spots
    "Amsterdam BrewHouse": 3,
    "Trinity Market": 3,
    "Union": 3,
    "Sweaty Betty's": 3,
    "Valerie": 3,
    "Civil Liberties": 3,
    "Pauper's Pub": 3,
    "Wheat Sheaf Tavern": 3,
    "Writers Room": 3,
    "Bandit Brewery": 3,
    "Eastbound Brewing Co.": 3,
    "Henderson Brewing": 3,
    "Radical Road Brewing": 3,
    "Left Field Brewery": 3,
    "Blood Brothers Brewing": 3,
    "Get Well": 3,
    "Bar Poet": 3,
    "King Taps": 3,
    "Birreria Volo": 3,
    "Bar Piquette": 3,
    "WVRST Beer Hall": 3,
    "Northern Belle": 3,
    "Enoteca Sociale": 3,
    "Rasa": 3,
    "Chubby’s Jamaican": 3,
    "Belfast Love": 3,
    "Public Gardens": 3,
    "Paradise Grapevine": 3,
    "Supermarket": 3,
    "Superpoint": 3,
    "Little Jerry": 3,
    "Paris Paris": 3,
    "Ronnie’s Local": 3,
    "Archive": 3,
    "Miss Thing's": 3,
    "The Black Bull": 3,
    "Pennylick": 3,
    "Score on Queen": 3,
    "The Fifth Social Club": 3,
    "Chamberlain's Pony Bar": 3,
    "Evangeline": 3,
    "The Emmet Ray": 3,
    "The Dock Ellis": 3,
    "C'est What": 3,
    "Milou": 3,
    "Crack Burger": 3,
    "Nom Nom Nom Poutine": 3,
    "Betty's East": 3,
}


def main():
    venues = json.loads(VENUES.read_text())
    updated = 0
    missing = []
    for v in venues:
        n = v["name"]
        tier = POPULARITY.get(n, 2)  # default tier 2 for unmatched
        if v.get("popularity") != tier:
            v["popularity"] = tier
            updated += 1
        if n not in POPULARITY:
            missing.append(n)
    VENUES.write_text(json.dumps(venues, indent=2, ensure_ascii=False))
    print(f"updated {updated} of {len(venues)} venues")
    if missing:
        print(f"\n{len(missing)} venues fell back to default tier 2:")
        for n in missing:
            print(f"  - {n}")


if __name__ == "__main__":
    main()
