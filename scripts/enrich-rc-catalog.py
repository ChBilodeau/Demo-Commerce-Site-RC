#!/usr/bin/env python3
"""
Enriches the existing RC catalog with richer, searchable attributes — assigned
intelligently per sub-category (a buggy is Off-Road/4WD/Electric, a drift car is
Drift/On-Road/RWD, etc.). Patches rc-catalog.json IN PLACE so permanentids (and
thus Cloudinary image mapping) stay stable.

Adds (Tiers 1-3):
  Universal: cat_use_type, cat_scale, cat_power, cat_skill_level, cat_readiness,
             cat_motor_type, cat_drivetrain, cat_speed_mph, ec_shortdesc
  Category-specific: terrain/tire, wingspan/wing_config/channels, rotor/gyro,
             hull/water, flight_time/camera/fpv/range
  Quality: cat_features, cat_battery_included, cat_age_range, cat_keywords,
           ec_reviews_count

Usage:
    python3 scripts/enrich-rc-catalog.py <catalog.json>
"""
import json
import random
import sys

random.seed(7)

# Per-subcategory attribute profiles. Keyed by the sub-category name that appears
# in ec_category (the part after "|"). Each profile supplies realistic values.
PROFILES = {
    # ── Cars & Trucks ──
    "Buggies": dict(use=["Off-Road", "Racing"], power="Electric", drive="4WD",
                    motor="Brushless", terrain=["Dirt", "Mixed"], tire="Knobby",
                    speed=(30, 55), skill="Intermediate",
                    feat=["Oil-Filled Shocks", "Waterproof Electronics"]),
    "Monster Trucks": dict(use=["Off-Road", "Freestyle"], power="Electric", drive="4WD",
                    motor="Brushless", terrain=["Dirt", "Rock", "Mixed"], tire="Knobby",
                    speed=(25, 45), skill="Beginner",
                    feat=["LED Lights", "Oil-Filled Shocks", "Metal Gears"]),
    "Short Course": dict(use=["Off-Road", "Racing"], power="Electric", drive="4WD",
                    motor="Brushless", terrain=["Dirt", "Mixed"], tire="Knobby",
                    speed=(30, 50), skill="Intermediate", feat=["Waterproof Electronics"]),
    "On-Road": dict(use=["On-Road", "Racing"], power="Electric", drive="4WD",
                    motor="Brushless", terrain=["Pavement", "Carpet"], tire="Slick",
                    speed=(40, 70), skill="Expert", feat=["Adjustable Suspension"]),
    "Rock Crawlers": dict(use=["Scale/Trail", "Off-Road"], power="Electric", drive="4WD",
                    motor="Brushed", terrain=["Rock", "Dirt"], tire="Spiked",
                    speed=(5, 15), skill="Beginner",
                    feat=["LED Lights", "Metal Gears", "Portal Axles"]),
    # Drift is added as an on-road variant below when name hints at it.
    # ── Airplanes ──
    "Trainers": dict(use=["Aerobatic"], power="Electric", skill="Beginner",
                     wingspan=(900, 1400), wing="High-wing", channels="4CH",
                     feat=["Self-Stabilization", "Gyro Assist"]),
    "Warbirds": dict(use=["Scale/Trail", "Aerobatic"], power="Electric", skill="Expert",
                     wingspan=(1000, 1600), wing="Low-wing", channels="6CH",
                     feat=["Retractable Landing Gear", "Flaps"]),
    "Sport": dict(use=["Aerobatic", "Freestyle"], power="Electric", skill="Intermediate",
                  wingspan=(1000, 1500), wing="Low-wing", channels="4CH",
                  feat=["3D Capable"]),
    "Gliders": dict(use=["Aerobatic"], power="Electric", skill="Intermediate",
                    wingspan=(1500, 2500), wing="High-wing", channels="4CH",
                    feat=["Thermal Soaring"]),
    # ── Helicopters ──
    "Collective Pitch": dict(use=["Freestyle", "Aerobatic"], power="Electric", skill="Expert",
                    rotor=(450, 700), channels="6CH", gyro="3-Axis",
                    feat=["3D Capable", "Flybarless"]),
    "Fixed Pitch": dict(use=["Aerobatic"], power="Electric", skill="Beginner",
                    rotor=(300, 450), channels="4CH", gyro="6-Axis",
                    feat=["Altitude Hold", "Gyro Assist"]),
    "Micro": dict(use=["Freestyle"], power="Electric", skill="Beginner",
                    rotor=(120, 250), channels="4CH", gyro="6-Axis",
                    feat=["Indoor Flight", "Altitude Hold"]),
    # ── Boats ──
    "Racing Boats": dict(use=["Racing"], power="Electric", skill="Intermediate",
                    hull="Catamaran", water=["Lake", "Pool"], speed=(30, 60),
                    feat=["Self-Righting", "Water-Cooled Motor"]),
    "Scale Boats": dict(use=["Scale/Trail"], power="Electric", skill="Beginner",
                    hull="Mono", water=["Pool", "Lake"], speed=(8, 20),
                    feat=["LED Lights", "Detailed Scale Hull"]),
    "Airboats": dict(use=["Scale/Trail", "Freestyle"], power="Electric", skill="Beginner",
                    hull="Mono", water=["Lake", "Shallow Water"], speed=(15, 30),
                    feat=["Amphibious", "LED Lights"]),
    # ── Drones ──
    "FPV Racing": dict(use=["Racing", "Freestyle"], power="Electric", skill="Expert",
                    flight=(4, 8), camera="FPV 1080p", fpv="Yes", rng=(500, 2000),
                    feat=["FPV Goggles Ready", "Carbon Frame"]),
    "Camera Drones": dict(use=["Aerial Photography"], power="Electric", skill="Intermediate",
                    flight=(20, 40), camera="4K", fpv="Yes", rng=(2000, 8000),
                    feat=["GPS", "Return-to-Home", "3-Axis Gimbal", "Obstacle Avoidance"]),
    "Beginner": dict(use=["Aerial Photography", "Freestyle"], power="Electric", skill="Beginner",
                    flight=(10, 20), camera="720p", fpv="No", rng=(50, 200),
                    feat=["Altitude Hold", "Headless Mode", "One-Key Takeoff"]),
}

SCALES_GROUND = ["1/5", "1/8", "1/10", "1/16", "1/18"]
READINESS = ["RTR", "Kit", "BNF", "RTF", "PNP"]
AGE = ["8+", "14+", "Adult"]


def shortdesc(name, sub, use):
    return f"{name} — {sub} built for {', '.join(use).lower()} RC action."


def enrich_product(p):
    # Sub-category from ec_category "Top|Sub"
    sub = p["ec_category"].split("|")[-1]
    name = (p.get("ec_name") or "").lower()
    prof = PROFILES.get(sub, {})

    use = list(prof.get("use", ["On-Road"]))
    # Drift heuristic: on-road cars whose name hints at drift
    if sub == "On-Road" and any(w in name for w in ["drift"]):
        use = ["Drift", "On-Road"]
    # Some touring cars are drift-capable
    if sub == "On-Road" and random.random() < 0.3 and "Drift" not in use:
        use.append("Drift")

    p["cat_use_type"] = use
    p["cat_power"] = prof.get("power", "Electric")
    p["cat_skill_level"] = prof.get("skill", "Intermediate")
    p["cat_readiness"] = random.choice(READINESS)
    p["cat_age_range"] = random.choice(AGE)
    p["cat_battery_included"] = random.choice(["Yes", "No"])
    p["ec_reviews_count"] = random.randint(0, 420)
    p["ec_shortdesc"] = shortdesc(p.get("ec_name", ""), sub, use)

    # Scale (ground vehicles) + drivetrain/motor/terrain/tire/speed
    is_ground = sub in {"Buggies", "Monster Trucks", "Short Course", "On-Road", "Rock Crawlers"}
    if is_ground:
        p["cat_scale"] = random.choice(SCALES_GROUND)
        p["cat_drivetrain"] = prof.get("drive", "4WD")
        if "Drift" in use:
            p["cat_drivetrain"] = "RWD"
        p["cat_motor_type"] = prof.get("motor", "Brushless")
        p["cat_terrain"] = prof.get("terrain", ["Mixed"])
        p["cat_tire_type"] = prof.get("tire", "Knobby")

    # Speed (ground + boats)
    if "speed" in prof:
        lo, hi = prof["speed"]
        p["cat_speed_mph"] = random.randint(lo, hi)

    # Airplane-specific
    if "wingspan" in prof:
        lo, hi = prof["wingspan"]
        p["cat_wingspan_mm"] = random.randint(lo, hi)
        p["cat_wing_config"] = prof["wing"]
        p["cat_channels"] = prof["channels"]

    # Helicopter-specific
    if "rotor" in prof:
        lo, hi = prof["rotor"]
        p["cat_rotor_size_mm"] = random.randint(lo, hi)
        p["cat_channels"] = prof["channels"]
        p["cat_gyro"] = prof["gyro"]

    # Boat-specific
    if "hull" in prof:
        p["cat_hull_type"] = prof["hull"]
        p["cat_water_type"] = prof["water"]

    # Drone-specific
    if "flight" in prof:
        lo, hi = prof["flight"]
        p["cat_flight_time_min"] = random.randint(lo, hi)
        p["cat_camera"] = prof["camera"]
        p["cat_fpv"] = prof["fpv"]
        lo, hi = prof["rng"]
        p["cat_range_m"] = random.randint(lo, hi)

    # Features + keywords (searchable)
    feats = list(prof.get("feat", []))
    p["cat_features"] = feats
    top = p["ec_category"].split(";")[0]
    keywords = use + [sub, top, p.get("ec_brand", ""), p.get("cat_power", "")]
    keywords += [p.get("cat_drivetrain", ""), p.get("cat_scale", "")]
    p["cat_keywords"] = [k for k in keywords if k]

    return p


def main():
    if len(sys.argv) != 2:
        print("Usage: python3 scripts/enrich-rc-catalog.py <catalog.json>")
        sys.exit(1)
    path = sys.argv[1]
    with open(path) as f:
        d = json.load(f)

    n = 0
    for item in d.get("AddOrUpdate", []):
        if item.get("ObjectType") == "Product":
            enrich_product(item)
            n += 1

    with open(path, "w") as f:
        json.dump(d, f, ensure_ascii=False)
    print(f"Enriched {n} products with richer attributes.")


if __name__ == "__main__":
    main()
