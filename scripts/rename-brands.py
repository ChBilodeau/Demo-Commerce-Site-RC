#!/usr/bin/env python3
"""
rename-brands.py
Replaces real-world RC brand names with fictional-but-familiar ones across the
catalog, in every field they appear: ec_brand, ec_name, ec_description, and the
parts compatibility field cat_fits_brand.

Reads  ~/Documents/rc-combined.json  (the push payload: {"AddOrUpdate":[...]})
Writes ~/Documents/rc-combined.json  (in place, after a .bak backup)

Order matters: replace longer/multi-word brands before shorter ones so e.g.
"HPI Racing" is handled before a bare "HPI" would be, and "Redcat Racing"
before "Redcat".
"""
import json, os, re, shutil

SRC = os.path.expanduser('~/Documents/rc-combined.json')

# Ordered longest-first to avoid partial-overlap issues.
MAPPING = [
    ("Castle Creations", "Castle Dynamics"),
    ("Team Associated", "Team Assembled"),
    ("Redcat Racing", "Redpaw Racing"),
    ("Horizon Hobby", "Horizon Hobbies"),
    ("HPI Racing", "HPX Racing"),
    ("Gens Ace", "Genmax"),
    ("Pro Boat", "Pro Wake"),
    ("Hobbywing", "Hobbywinger"),
    ("Spektrum", "Spektra"),
    ("Traxxas", "Traxxon"),
    ("E-flite", "E-flyte"),
    ("Kyosho", "Kyoshi"),
    ("Futaba", "Futona"),
    ("Tamiya", "Tamika"),
    ("Savox", "Savix"),
    ("Blade", "Blayde"),
    ("Arrma", "Arruma"),
    ("Axial", "Axiom"),
    ("Losi", "Lossi"),
    ("DJI", "DJX"),
    ("ECX", "EXR"),
]

# Fields in which to replace brand strings.
TEXT_FIELDS = ("ec_brand", "ec_name", "ec_description", "cat_fits_brand")


def replace_all(s: str) -> str:
    for old, new in MAPPING:
        if old in s:
            s = s.replace(old, new)
    return s


def process_value(v):
    """Replace in a string, or recurse into a list of strings."""
    if isinstance(v, str):
        return replace_all(v)
    if isinstance(v, list):
        return [process_value(x) for x in v]
    return v


def main():
    with open(SRC, encoding="utf-8") as f:
        data = json.load(f)
    items = data.get("AddOrUpdate", [])

    shutil.copy(SRC, SRC + ".bak")

    changed_fields = {k: 0 for k in TEXT_FIELDS}
    changed_items = 0
    for it in items:
        item_changed = False
        for field in TEXT_FIELDS:
            if field in it and it[field] is not None:
                before = json.dumps(it[field], ensure_ascii=False)
                it[field] = process_value(it[field])
                after = json.dumps(it[field], ensure_ascii=False)
                if before != after:
                    changed_fields[field] += 1
                    item_changed = True
        if item_changed:
            changed_items += 1

    with open(SRC, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False)

    print(f"Items changed: {changed_items} of {len(items)}")
    for k, n in changed_fields.items():
        print(f"  {k}: {n} values changed")
    # Report resulting distinct brands
    from collections import Counter
    c = Counter(it.get("ec_brand") for it in items if it.get("ec_brand"))
    print("\nResulting brands:")
    for b, n in c.most_common():
        print(f"  {n:4}  {b}")


if __name__ == "__main__":
    main()
