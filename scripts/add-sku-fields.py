#!/usr/bin/env python3
"""
Adds commerce/compat fields to BOTH vehicle and parts catalogs, in place
(permanentids unchanged → Cloudinary images stay mapped):

  cat_sku                store SKU: FA-<permanentid>
  cat_mpn                manufacturer part number: <BRANDCODE>-<digits>
  cat_availability_status  In Stock / Backorder / Pre-Order / Discontinued
  cat_shipping_class     Standard / Hazmat (LiPo/NiMH batteries -> Hazmat)
  cat_weight_g           numeric shipping weight (by part/vehicle type)
  cat_sold_as            Each / Pair / Set of 4 (parts; tires/props -> sets)
  cat_warranty           1 Year / 90 Days / 30 Days
  cat_fits_subcategory   (parts only) sharper fitment by vehicle sub-category

Usage:
    python3 scripts/add-sku-fields.py <catalog.json> [<catalog2.json> ...]
"""
import json
import random
import sys

random.seed(55)

BRAND_CODE = {
    "Traxxas": "TRX", "Arrma": "ARA", "HPI Racing": "HPI", "Team Associated": "ASC",
    "Losi": "LOS", "Axial": "AXI", "Horizon Hobby": "HRZ", "E-flite": "EFL",
    "Blade": "BLH", "Pro Boat": "PRB", "DJI": "DJI", "Spektrum": "SPM",
    "Tamiya": "TAM", "Redcat Racing": "RED", "ECX": "ECX", "Kyosho": "KYO",
    "Castle Creations": "CSE", "Hobbywing": "HWI", "Savox": "SAV",
    "Gens Ace": "GEA", "Futaba": "FUT",
}

# sub-category options per vehicle category, for parts fitment
SUBCATS = {
    "Cars & Trucks": ["Buggies", "Monster Trucks", "Short Course", "On-Road", "Rock Crawlers"],
    "Airplanes": ["Trainers", "Warbirds", "Sport", "Gliders"],
    "Helicopters": ["Collective Pitch", "Fixed Pitch", "Micro"],
    "Boats": ["Racing Boats", "Scale Boats", "Airboats"],
    "Drones": ["FPV Racing", "Camera Drones", "Beginner"],
}

# weight by part type (grams), rough but realistic
PART_WEIGHT = {
    "LiPo Battery": (150, 700), "NiMH Battery": (200, 500), "Charger": (300, 1500),
    "Transmitter": (400, 900), "Receiver": (5, 20), "Servo": (10, 70),
    "ESC": (30, 180), "Motor": (80, 400), "Connector Set": (10, 40),
    "Tires & Wheels": (100, 600), "Shock Set": (40, 160), "Body Shell": (80, 300),
    "Gear Set": (10, 60), "Differential": (40, 150), "Bearings": (10, 50),
    "Chassis": (120, 500), "Propeller": (5, 40), "Landing Gear": (20, 120),
    "Wing Set": (150, 600), "Main Rotor Blades": (10, 60), "Flybarless Unit": (10, 40),
    "Canopy": (20, 120), "Boat Propeller": (10, 60), "Water Cooling Kit": (20, 80),
    "Rudder": (20, 90), "Flight Controller": (5, 30), "FPV Camera": (5, 20),
    "FPV Goggles": (300, 700), "Drone Frame": (40, 180), "Gimbal": (60, 250),
    "Tool Set": (100, 600), "Paint & Finish": (50, 200),
}
SET_TYPES = {"Tires & Wheels", "Propeller", "Main Rotor Blades", "Shock Set",
             "Connector Set", "Bearings", "Boat Propeller"}


def mpn(brand):
    return f"{BRAND_CODE.get(brand, 'FA')}-{random.randint(1000, 9999)}"


def availability(in_stock):
    if in_stock != "TRUE":
        return random.choice(["Backorder", "Discontinued"])
    return random.choices(
        ["In Stock", "Pre-Order", "Backorder"], weights=[88, 7, 5])[0]


def enrich(item):
    pid = item["permanentid"]
    brand = item.get("ec_brand", "")
    is_part = item.get("cat_is_part") == "true"

    item["cat_sku"] = f"FA-{pid}"
    item["cat_mpn"] = mpn(brand)
    item["cat_availability_status"] = availability(item.get("ec_in_stock", "TRUE"))
    item["cat_warranty"] = random.choice(["1 Year", "90 Days", "30 Days"])

    if is_part:
        pt = item.get("cat_part_type", "")
        lo, hi = PART_WEIGHT.get(pt, (20, 300))
        item["cat_weight_g"] = random.randint(lo, hi)
        # Hazmat for batteries, standard otherwise
        item["cat_shipping_class"] = "Hazmat" if "Battery" in pt else "Standard"
        item["cat_sold_as"] = (
            random.choice(["Set of 4", "Pair", "Set of 2"]) if pt in SET_TYPES else "Each"
        )
        item["cat_oem_replacement"] = random.choice(["OEM", "Aftermarket"])
        # sharper fitment: pick sub-categories within the fits categories
        subs = []
        for cat in item.get("cat_fits_category", []):
            opts = SUBCATS.get(cat, [])
            if opts:
                subs += random.sample(opts, random.randint(1, min(2, len(opts))))
        item["cat_fits_subcategory"] = subs or ["Any"]
        # keywords get SKU/MPN for findability
        kw = item.get("cat_keywords", [])
        item["cat_keywords"] = kw + [item["cat_sku"], item["cat_mpn"]]
    else:
        # vehicle weights are heftier
        item["cat_weight_g"] = random.randint(800, 4500)
        item["cat_shipping_class"] = "Standard"
        item["cat_sold_as"] = "Each"


def main():
    for path in sys.argv[1:]:
        with open(path) as f:
            d = json.load(f)
        n = 0
        for item in d.get("AddOrUpdate", []):
            if item.get("ObjectType") == "Product":
                enrich(item)
                n += 1
        with open(path, "w") as f:
            json.dump(d, f, ensure_ascii=False)
        print(f"{path}: enriched {n} products")


if __name__ == "__main__":
    main()
