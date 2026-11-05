#!/usr/bin/env python3
"""
Generates a Remote-Control vehicles catalog (cars, trucks, buggies, planes,
helicopters, boats, drones) in the Coveo Catalog `AddOrUpdate` payload shape,
matching the field structure the existing storefront + catalog config expect.

Output mirrors the original catalog.json:
  - Products (objecttype "Product") with ec_* fields the storefront reads.
  - Variants (objecttype "Variant") linked by ec_product_id, identified by ec_sku.
  - Variants carry ec_sizes (reused for RC "scale/edition" so the Size facet works).
  - ~25% of products are on discount (ec_promo_price < ec_price).
  - Images are labelled placeholders (placehold.co) so everything renders.

Usage:
    python3 scripts/generate-rc-catalog.py <output.json> [num_products]
"""
import json
import random
import sys

random.seed(42)  # reproducible

BASE = "https://chbi-shop.example.com"

# Cloudinary: each product image is stored with public_id = product permanentid.
CLOUDINARY_CLOUD = "dazzh5qm"


def product_image_url(permanentid: str) -> str:
    return (
        f"https://res.cloudinary.com/{CLOUDINARY_CLOUD}"
        f"/image/upload/{permanentid}.png"
    )

# category -> (slug, [subcategories]), with per-subcat product name parts
CATEGORIES = {
    "Cars & Trucks": {
        "slug": "cars-trucks",
        "subs": {
            "Buggies": ["Buggy", "Desert Buggy", "Sand Rail"],
            "Monster Trucks": ["Monster Truck", "Stadium Truck", "Bash Truck"],
            "Short Course": ["Short Course Truck", "SCT"],
            "On-Road": ["Touring Car", "Drift Car", "GT"],
            "Rock Crawlers": ["Rock Crawler", "Trail Rig", "Scaler"],
        },
    },
    "Airplanes": {
        "slug": "airplanes",
        "subs": {
            "Trainers": ["Trainer", "Beginner Plane"],
            "Warbirds": ["Warbird", "Mustang", "Spitfire"],
            "Sport": ["Sport Plane", "Aerobatic Flyer"],
            "Gliders": ["Glider", "Sailplane"],
        },
    },
    "Helicopters": {
        "slug": "helicopters",
        "subs": {
            "Collective Pitch": ["CP Heli", "3D Helicopter"],
            "Fixed Pitch": ["FP Heli", "Trainer Heli"],
            "Micro": ["Micro Heli", "Indoor Heli"],
        },
    },
    "Boats": {
        "slug": "boats",
        "subs": {
            "Racing Boats": ["Race Boat", "Catamaran", "Mono Hull"],
            "Scale Boats": ["Scale Boat", "Tug", "Yacht"],
            "Airboats": ["Airboat", "Swamp Runner"],
        },
    },
    "Drones": {
        "slug": "drones",
        "subs": {
            "FPV Racing": ["FPV Racer", "Freestyle Quad"],
            "Camera Drones": ["Camera Drone", "Aerial Photo Drone"],
            "Beginner": ["Starter Drone", "Trainer Quad"],
        },
    },
}

BRANDS = [
    "Traxxas", "Arrma", "HPI Racing", "Team Associated", "Losi", "Axial",
    "Horizon Hobby", "E-flite", "Blade", "Pro Boat", "DJI", "Spektrum",
    "Tamiya", "Redcat Racing", "ECX", "Kyosho",
]

COLORS = ["Red", "Blue", "Black", "Green", "Orange", "Yellow", "White", "Silver", "Camo"]

# Variant attribute reused into ec_sizes so the existing Size facet works.
SCALES = ["1/5", "1/8", "1/10", "1/16", "1/18", "1/24"]
EDITIONS = ["RTR", "Kit", "BNF", "RTF", "Brushless", "Brushed"]

ADJECTIVES = ["Apex", "Vortex", "Titan", "Blaze", "Fury", "Rogue", "Nitro", "Volt",
              "Storm", "Raptor", "Havoc", "Comet", "Phantom", "Blitz", "Maverick",
              "Cyclone", "Rampage", "Talon", "Striker", "Hurricane"]


def price_for(category: str) -> int:
    ranges = {
        "Cars & Trucks": (80, 650),
        "Airplanes": (120, 800),
        "Helicopters": (90, 700),
        "Boats": (70, 550),
        "Drones": (60, 1200),
    }
    lo, hi = ranges[category]
    return round(random.uniform(lo, hi), 2)


def make_description(name, category, sub, brand, color, scale):
    bits = [
        f"The {brand} {name} is a {color.lower()} {sub.lower()[:-1] if sub.endswith('s') else sub.lower()} "
        f"built for {category.lower()} enthusiasts.",
        f"Featuring a durable chassis and responsive control, this {scale} scale model "
        f"delivers thrilling performance right out of the box.",
        random.choice([
            "Great for beginners and experienced hobbyists alike.",
            "Designed for high-speed runs and rugged terrain.",
            "Precision engineering meets everyday fun.",
            "Tuned for stability, speed, and durability.",
        ]),
    ]
    return " ".join(bits)


def image_url(label: str) -> str:
    text = label.replace(" ", "+")
    return f"https://placehold.co/600x600/1a1d26/ffffff?text={text}"


def main():
    if len(sys.argv) < 2:
        print("Usage: python3 scripts/generate-rc-catalog.py <output.json> [num_products]")
        sys.exit(1)
    out = sys.argv[1]
    num = int(sys.argv[2]) if len(sys.argv) > 2 else 200

    items = []
    pid_counter = 1

    for _ in range(num):
        category = random.choice(list(CATEGORIES.keys()))
        cat = CATEGORIES[category]
        sub = random.choice(list(cat["subs"].keys()))
        noun = random.choice(cat["subs"][sub])
        brand = random.choice(BRANDS)
        adj = random.choice(ADJECTIVES)
        color = random.choice(COLORS)
        scale = random.choice(SCALES)
        name = f"{adj} {noun}"

        group_id = f"RC{pid_counter:05d}"
        product_id = f"{group_id}_00001"
        pid_counter += 1

        price = price_for(category)
        on_sale = random.random() < 0.25
        promo = round(price * random.uniform(0.6, 0.85), 2) if on_sale else price

        sub_slug = sub.lower().replace(" ", "-").replace("&", "and")
        cat_slug = cat["slug"]
        category_full = f"{category};{category}|{sub}"
        category_slug = f"{cat_slug};{cat_slug}/{sub_slug}"
        listing = f"/{cat_slug}/{sub_slug}"
        # Per-product Cloudinary image (public_id == permanentid).
        img = product_image_url(product_id)

        product = {
            "DocumentId": f"https://chbi-shop.example.com/pdp/{product_id}",
            "FileExtension": "html",
            "ObjectType": "Product",
            "ec_name": name,
            "ec_description": make_description(name, category, sub, brand, color, scale),
            "ec_brand": brand,
            "ec_category": category_full,
            "ec_category_slug": category_slug,
            "ec_listing": [listing],
            "ec_images": [img],
            "ec_price": price,
            "ec_promo_price": promo,
            "ec_in_stock": "TRUE" if random.random() > 0.08 else "FALSE",
            "ec_rating": round(random.uniform(3.0, 5.0) * 2, 1),  # 0-10 scale
            "ec_colors": color,
            "ec_item_group_id": group_id,
            "ec_product_id": product_id,
            "ec_productid": product_id,
            "permanentid": product_id,
            "title": name,
            "language": "English",
        }
        items.append(product)

        # 1-3 variants per product, by scale/edition. Reused into ec_sizes.
        n_variants = random.randint(1, 3)
        chosen = random.sample(EDITIONS, n_variants)
        for ed in chosen:
            sku = f"{product_id}_{ed}"
            variant = {
                "DocumentId": f"https://chbi-shop.example.com/pdp/{sku}",
                "FileExtension": "txt",
                "ObjectType": "Variant",
                "ec_product_id": product_id,
                "ec_productid": product_id,
                "ec_sku": sku,
                "ec_sizes": ed,  # reuse the existing size field/facet for "edition"
                "permanentid": sku,
                "title": f"{name} [{ed}]",
                "language": "English",
            }
            items.append(variant)

    payload = {"AddOrUpdate": items}
    with open(out, "w") as f:
        json.dump(payload, f, ensure_ascii=False)

    products = sum(1 for i in items if i["ObjectType"] == "Product")
    variants = sum(1 for i in items if i["ObjectType"] == "Variant")
    discounted = sum(
        1 for i in items
        if i["ObjectType"] == "Product" and i["ec_promo_price"] < i["ec_price"]
    )
    print(f"Wrote {out}")
    print(f"  products:   {products}")
    print(f"  variants:   {variants}")
    print(f"  discounted: {discounted}")


if __name__ == "__main__":
    main()
