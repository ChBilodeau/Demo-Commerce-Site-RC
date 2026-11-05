#!/usr/bin/env python3
"""
Patches an EXISTING catalog JSON in place: sets each product's ec_images to its
Cloudinary URL keyed on the product's permanentid. Does NOT regenerate the
catalog, so every permanentid (and thus the image filename mapping) stays stable.

Usage:
    python3 scripts/set-cloudinary-images.py <catalog.json>
"""
import json
import os
import sys

# Your Cloudinary cloud name. Set CLOUDINARY_CLOUD before running (the setup
# wizard records it in demo.config.json).
CLOUD = os.environ.get("CLOUDINARY_CLOUD", "your-cloud-name")


def url_for(pid: str) -> str:
    return f"https://res.cloudinary.com/{CLOUD}/image/upload/{pid}.png"


def main():
    if len(sys.argv) != 2:
        print("Usage: python3 scripts/set-cloudinary-images.py <catalog.json>")
        sys.exit(1)
    path = sys.argv[1]
    with open(path) as f:
        d = json.load(f)

    patched = 0
    for item in d.get("AddOrUpdate", []):
        if item.get("ObjectType") == "Product":
            item["ec_images"] = [url_for(item["permanentid"])]
            patched += 1

    with open(path, "w") as f:
        json.dump(d, f, ensure_ascii=False)
    print(f"Patched {patched} product images -> https://res.cloudinary.com/{CLOUD}/image/upload/<permanentid>.png")


if __name__ == "__main__":
    main()
