#!/usr/bin/env python3
"""
Normalizes the Barca catalog payload so Coveo maps the commerce fields correctly.

Problem: three commerce fields were pushed with capitalized names that don't
match Coveo's lowercase `ec_*` convention, so they never populated the standard
commerce fields the Commerce API / CMH facets rely on:

    ec_Price   -> ec_price    (product base price, numeric)
    ec_Colors  -> ec_colors   (product color; enables labeled color swatches)
    ec_Sizes   -> ec_sizes    (variant size; enables the Size facet)

This script rewrites those keys to lowercase on every item and writes a new
file. It does NOT push anything — re-push the output with your existing tool.

Usage:
    python3 scripts/fix-catalog.py <input.json> <output.json>
"""
import json
import sys

RENAME = {
    "ec_Price": "ec_price",
    "ec_Colors": "ec_colors",
    "ec_Sizes": "ec_sizes",
}


def fix_item(item: dict) -> dict:
    out = {}
    for key, value in item.items():
        out[RENAME.get(key, key)] = value
    return out


def main() -> None:
    if len(sys.argv) != 3:
        print("Usage: python3 scripts/fix-catalog.py <input.json> <output.json>")
        sys.exit(1)

    src, dst = sys.argv[1], sys.argv[2]
    with open(src) as f:
        data = json.load(f)

    items = data.get("AddOrUpdate", [])
    renamed_counts = {v: 0 for v in RENAME.values()}
    for i, item in enumerate(items):
        for cap, low in RENAME.items():
            if cap in item:
                renamed_counts[low] += 1
        items[i] = fix_item(item)

    data["AddOrUpdate"] = items
    with open(dst, "w") as f:
        json.dump(data, f, ensure_ascii=False)

    print(f"Processed {len(items)} items.")
    for low, count in renamed_counts.items():
        print(f"  renamed -> {low}: {count}")
    print(f"Wrote {dst}")


if __name__ == "__main__":
    main()
