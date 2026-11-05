#!/usr/bin/env python3
"""
Parts have no variants, so the catalog (which resolves sellable products through
their variants via ec_sku) drops them — they never appear in the Commerce API.

Per Coveo's guidance for products with no variations, each product still needs
ONE variant whose id matches the product. This adds a single self-variant per
part so the catalog resolves it as a purchasable product.

Usage:
    python3 scripts/add-part-variants.py <rc-parts.json>
"""
import json
import os
import sys

# Storefront base URL for the synthetic variant DocumentId. Set STOREFRONT_BASE
# to your own storefront URL (the setup wizard records it in demo.config.json).
BASE = os.environ.get("STOREFRONT_BASE", "https://demo.example.com")


def main():
    path = sys.argv[1]
    with open(path) as f:
        d = json.load(f)
    items = d["AddOrUpdate"]

    existing_variant_parents = {
        i["ec_product_id"] for i in items if i.get("ObjectType") == "Variant"
    }
    new_variants = []
    for p in items:
        if p.get("ObjectType") != "Product":
            continue
        if p.get("cat_is_part") != "true":
            continue
        pid = p["ec_product_id"]
        if pid in existing_variant_parents:
            continue
        sku = f"{pid}_V"  # single self-variant sku
        new_variants.append({
            "DocumentId": f"{BASE}/pdp/{sku}",
            "FileExtension": "txt",
            "ObjectType": "Variant",
            "ec_product_id": pid,
            "ec_productid": pid,
            "ec_sku": sku,
            "permanentid": sku,
            "title": f"{p.get('ec_name','')} (variant)",
            "language": "English",
        })

    items.extend(new_variants)
    with open(path, "w") as f:
        json.dump(d, f, ensure_ascii=False)
    print(f"Added {len(new_variants)} self-variants for parts.")


if __name__ == "__main__":
    main()
