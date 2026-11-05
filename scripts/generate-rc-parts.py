#!/usr/bin/env python3
"""
Generates an RC PARTS catalog — enough parts to fully rebuild any vehicle in
every category (cars/trucks, airplanes, helicopters, boats, drones), plus a
generous universal set (LiPo batteries, chargers, radios, servos, connectors).

Same `AddOrUpdate` payload shape + field conventions as the vehicle catalog, so
it drops into the SAME source. Parts are flagged with cat_is_part="true" and
carry full compatibility (cat_fits_category / scale / brand) + part-type specs.

Products only (parts have no variants). Each part gets a unique Cloudinary image
keyed on its permanentid (public_id == permanentid), like the vehicles.

Usage:
    python3 scripts/generate-rc-parts.py <output.json> [approx_count]
"""
import json
import os
import random
import sys

random.seed(101)

# Cloudinary cloud name and storefront base URL come from the environment so
# this template carries no real org values. Set them to your own before running
# (the setup wizard writes them to demo.config.json; export them here):
#   CLOUDINARY_CLOUD   your Cloudinary cloud name
#   STOREFRONT_BASE    your storefront base URL (must match the CMH listing pages)
CLOUD = os.environ.get("CLOUDINARY_CLOUD", "your-cloud-name")
BASE = os.environ.get("STOREFRONT_BASE", "https://demo.example.com")

BRANDS = ["Traxxas", "Arrma", "HPI Racing", "Team Associated", "Losi", "Axial",
          "Horizon Hobby", "E-flite", "Blade", "Pro Boat", "DJI", "Spektrum",
          "Tamiya", "Redcat Racing", "ECX", "Kyosho", "Castle Creations",
          "Hobbywing", "Savox", "Gens Ace", "Futaba"]

GROUND = "Cars & Trucks"
AIR = "Airplanes"
HELI = "Helicopters"
BOAT = "Boats"
DRONE = "Drones"
ALL_CATS = [GROUND, AIR, HELI, BOAT, DRONE]

CONNECTORS = ["XT60", "XT90", "EC3", "EC5", "Deans", "JST", "Tamiya"]
SCALES = ["1/5", "1/8", "1/10", "1/16", "1/18"]

# Part-type templates. Each: (part_type, slug, fits_categories, name_parts, price_range, specs_fn)
def lipo_specs():
    cells = random.choice([2, 3, 4, 6])
    cap = random.choice([1300, 2200, 3300, 4000, 5000, 6500, 8000])
    return {
        "cat_battery_chemistry": "LiPo",
        "cat_cell_count": f"{cells}S",
        "cat_voltage_v": round(cells * 3.7, 1),
        "cat_capacity_mah": cap,
        "cat_c_rating": random.choice([35, 50, 75, 100, 130]),
        "cat_connector_type": random.choice(CONNECTORS),
    }

def nimh_specs():
    return {
        "cat_battery_chemistry": "NiMH",
        "cat_voltage_v": random.choice([6.0, 7.2, 8.4]),
        "cat_capacity_mah": random.choice([1800, 3000, 4200, 5000]),
        "cat_connector_type": random.choice(["Tamiya", "Deans"]),
    }

def motor_specs():
    return {"cat_motor_kv": random.choice([1800, 2200, 2700, 3300, 3900, 4500]),
            "cat_motor_type": random.choice(["Brushless", "Brushed"])}

def esc_specs():
    return {"cat_esc_amp": random.choice([30, 45, 60, 80, 120, 150]),
            "cat_connector_type": random.choice(CONNECTORS)}

def servo_specs():
    return {"cat_servo_torque_kg": random.choice([6, 9, 15, 20, 25]),
            "cat_channels": random.choice(["", ""])}

def radio_specs():
    return {"cat_channels": random.choice(["2CH", "3CH", "4CH", "6CH", "8CH"])}

def charger_specs():
    return {"cat_connector_type": random.choice(CONNECTORS),
            "cat_battery_chemistry": random.choice(["LiPo", "NiMH", "LiPo/NiMH"])}

def no_specs():
    return {}

# (part_type, slug, fits[list], [name nouns], (price_lo, price_hi), specs_fn, scale_specific)
PART_TYPES = [
    # Universal electronics / power
    ("LiPo Battery", "lipo-battery", ALL_CATS, ["LiPo Pack", "Power Cell", "Race Pack"], (18, 120), lipo_specs, False),
    ("NiMH Battery", "nimh-battery", [GROUND, BOAT], ["NiMH Pack", "Stick Pack"], (14, 55), nimh_specs, False),
    ("Charger", "charger", ALL_CATS, ["Smart Charger", "AC/DC Charger", "Balance Charger"], (25, 180), charger_specs, False),
    ("Transmitter", "transmitter", ALL_CATS, ["2.4GHz Radio", "Transmitter", "Controller"], (45, 350), radio_specs, False),
    ("Receiver", "receiver", ALL_CATS, ["Receiver", "RX Module"], (15, 90), radio_specs, False),
    ("Servo", "servo", [GROUND, AIR, HELI, BOAT], ["Digital Servo", "Metal-Gear Servo", "Steering Servo"], (12, 95), servo_specs, False),
    ("ESC", "esc", [GROUND, AIR, HELI, BOAT, DRONE], ["ESC", "Speed Controller"], (25, 160), esc_specs, False),
    ("Motor", "motor", [GROUND, BOAT], ["Brushless Motor", "Sensored Motor"], (30, 160), motor_specs, True),
    ("Connector Set", "connectors", ALL_CATS, ["Connector Pack", "Adapter Set"], (6, 25), lambda: {"cat_connector_type": random.choice(CONNECTORS)}, False),
    # Cars & trucks
    ("Tires & Wheels", "tires-wheels", [GROUND], ["Tire Set", "Pre-Mounted Wheels", "Off-Road Tires"], (12, 60), no_specs, True),
    ("Shock Set", "shocks", [GROUND], ["Oil-Filled Shocks", "Big Bore Shocks"], (18, 75), no_specs, True),
    ("Body Shell", "body-shell", [GROUND], ["Body Shell", "Clear Body", "Painted Body"], (20, 70), no_specs, True),
    ("Gear Set", "gears", [GROUND, HELI], ["Pinion & Spur Gears", "Gear Set"], (8, 40), no_specs, True),
    ("Differential", "differential", [GROUND], ["Diff Set", "Gear Differential"], (15, 65), no_specs, True),
    ("Bearings", "bearings", [GROUND, BOAT], ["Bearing Kit", "Ball Bearing Set"], (10, 35), no_specs, True),
    ("Chassis", "chassis", [GROUND], ["Chassis Plate", "Aluminum Chassis"], (25, 120), no_specs, True),
    # Air
    ("Propeller", "propeller", [AIR, DRONE], ["Propeller Set", "Props"], (5, 30), no_specs, False),
    ("Landing Gear", "landing-gear", [AIR], ["Landing Gear", "Retracts"], (15, 90), no_specs, False),
    ("Wing Set", "wing-set", [AIR], ["Wing Set", "Replacement Wing"], (25, 110), no_specs, False),
    # Heli
    ("Main Rotor Blades", "rotor-blades", [HELI], ["Main Blades", "Carbon Rotor Blades"], (12, 70), no_specs, False),
    ("Flybarless Unit", "flybarless", [HELI], ["Flybarless System", "Gyro Unit"], (60, 220), no_specs, False),
    ("Canopy", "canopy", [HELI], ["Canopy", "Fuselage Shell"], (15, 80), no_specs, False),
    # Boat
    ("Boat Propeller", "boat-propeller", [BOAT], ["Boat Prop", "Beryllium Prop"], (8, 45), no_specs, False),
    ("Water Cooling Kit", "water-cooling", [BOAT], ["Cooling Kit", "Water-Cooled Jacket"], (12, 50), no_specs, False),
    ("Rudder", "rudder", [BOAT], ["Rudder Assembly", "Steering Rudder"], (15, 60), no_specs, False),
    # Drone
    ("Flight Controller", "flight-controller", [DRONE], ["Flight Controller", "FC Stack"], (40, 160), no_specs, False),
    ("FPV Camera", "fpv-camera", [DRONE], ["FPV Camera", "Nano Cam"], (25, 90), no_specs, False),
    ("FPV Goggles", "fpv-goggles", [DRONE], ["FPV Goggles", "Video Goggles"], (120, 650), no_specs, False),
    ("Drone Frame", "drone-frame", [DRONE], ["Carbon Frame", "Quad Frame"], (25, 120), no_specs, False),
    ("Gimbal", "gimbal", [DRONE], ["3-Axis Gimbal", "Camera Gimbal"], (90, 400), no_specs, False),
    # Universal finishing
    ("Tool Set", "tools", ALL_CATS, ["Tool Kit", "Hex Driver Set"], (15, 70), no_specs, False),
    ("Paint & Finish", "paint", [GROUND, AIR, BOAT], ["Polycarbonate Paint", "Paint Set"], (6, 30), no_specs, False),
]

ADJ = ["Pro", "Race", "Sport", "HD", "Ultra", "Elite", "Turbo", "Max", "Apex", "Titan", "Vortex"]


def part_image_url(pid):
    return f"https://res.cloudinary.com/{CLOUD}/image/upload/{pid}.png"


def main():
    out = sys.argv[1] if len(sys.argv) > 1 else "/tmp/rc-parts.json"
    target = int(sys.argv[2]) if len(sys.argv) > 2 else 400

    items = []
    pid = 1
    # Distribute `target` parts across the part types (round-robin + weighting
    # so common consumables like batteries get more entries).
    weights = {"LiPo Battery": 5, "Charger": 2, "Servo": 3, "ESC": 3, "Motor": 3,
               "Tires & Wheels": 3, "Propeller": 2}
    weighted = []
    for pt in PART_TYPES:
        weighted += [pt] * weights.get(pt[0], 1)

    while len(items) < target:
        part_type, slug, fits, nouns, (lo, hi), specs_fn, scale_specific = random.choice(weighted)
        brand = random.choice(BRANDS)
        adj = random.choice(ADJ)
        noun = random.choice(nouns)
        name = f"{brand} {adj} {noun}"

        group_id = f"PT{pid:05d}"
        product_id = f"{group_id}_00001"
        pid += 1

        price = round(random.uniform(lo, hi), 2)
        on_sale = random.random() < 0.2
        promo = round(price * random.uniform(0.6, 0.85), 2) if on_sale else price

        specs = specs_fn()
        fits_scale = random.sample(SCALES, random.randint(1, 3)) if scale_specific else ["Any"]
        fits_brand = random.sample(BRANDS, random.randint(1, 3)) if random.random() < 0.5 else ["Universal"]

        cat_top = "Parts"
        category_full = f"Parts;Parts|{part_type}"
        category_slug = f"parts;parts/{slug}"

        desc = (f"{name} — a {part_type.lower()} compatible with "
                f"{', '.join(fits)} RC vehicles. "
                f"{'Fits scales ' + ', '.join(fits_scale) + '. ' if fits_scale != ['Any'] else 'Universal fitment. '}"
                f"Genuine replacement/upgrade part for rebuilds and repairs.")

        product = {
            "DocumentId": f"{BASE}/pdp/{product_id}",
            "FileExtension": "html",
            "ObjectType": "Product",
            "ec_name": name,
            "ec_description": desc,
            "ec_shortdesc": f"{part_type} · fits {', '.join(fits)}",
            "ec_brand": brand,
            "ec_category": category_full,
            "ec_category_slug": category_slug,
            "ec_listing": [f"/parts/{slug}"],
            "ec_images": [part_image_url(product_id)],
            "ec_price": price,
            "ec_promo_price": promo,
            "ec_in_stock": "TRUE" if random.random() > 0.05 else "FALSE",
            "ec_rating": round(random.uniform(3.2, 5.0) * 2, 1),
            "ec_reviews_count": random.randint(0, 300),
            "ec_item_group_id": group_id,
            "ec_product_id": product_id,
            "ec_productid": product_id,
            "permanentid": product_id,
            "title": name,
            "language": "English",
            # Parts-specific compatibility + flags
            "cat_is_part": "true",
            "cat_part_type": part_type,
            "cat_fits_category": fits,
            "cat_fits_scale": fits_scale,
            "cat_fits_brand": fits_brand,
            "cat_keywords": [part_type, brand] + fits + fits_scale,
        }
        product.update(specs)
        items.append(product)

    payload = {"AddOrUpdate": items}
    with open(out, "w") as f:
        json.dump(payload, f, ensure_ascii=False)

    from collections import Counter
    types = Counter(i["cat_part_type"] for i in items)
    print(f"Wrote {out}: {len(items)} parts")
    print("by type:")
    for t, c in types.most_common():
        print(f"  {t}: {c}")


if __name__ == "__main__":
    main()
