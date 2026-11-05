#!/usr/bin/env python3
"""
Pushes the catalog via a Stream API UPDATE operation, then deletes every item
older than that push — removing stale data the load-operation safety guard
refused to delete (it skips deletion when ALL existing items would be removed).

Flow:
  1. create file container + upload the catalog + PUT stream/update  -> orderingId
  2. POST stream/deleteolderthan/<orderingId>  -> removes everything older

Usage:
    COVEO_PUSH_KEY=... COVEO_ORG_ID=... COVEO_SOURCE_ID=... \
    python3 scripts/push-and-prune.py <catalog.json>
"""
import json
import os
import sys
import urllib.request

PLATFORM = "https://api.cloud.coveo.com"


def _req(method, url, key, body, headers):
    h = {"Authorization": f"Bearer {key}", **headers}
    req = urllib.request.Request(url, data=body, method=method, headers=h)
    try:
        with urllib.request.urlopen(req) as resp:
            raw = resp.read()
            return (json.loads(raw) if raw else {}), resp.status
    except urllib.error.HTTPError as e:
        print(f"  !! {method} {url}\n     HTTP {e.code}: {e.read().decode(errors='replace')[:300]}")
        raise


def main():
    if len(sys.argv) != 2:
        print("Usage: python3 scripts/push-and-prune.py <catalog.json>")
        sys.exit(1)
    org = os.environ["COVEO_ORG_ID"]
    source = os.environ["COVEO_SOURCE_ID"]
    key = os.environ["COVEO_PUSH_KEY"]

    with open(sys.argv[1]) as f:
        src = json.load(f)
    docs = []
    for it in src.get("AddOrUpdate", []):
        d = dict(it)
        if "documentId" not in d and "DocumentId" in d:
            d["documentId"] = d.pop("DocumentId")
        docs.append(d)
    body = json.dumps({"addOrUpdate": docs}).encode()
    print(f"{len(docs)} documents ({len(body)/1e6:.2f} MB)")

    print("1/4 create file container…")
    container, _ = _req("POST", f"{PLATFORM}/push/v1/organizations/{org}/files", key, b"",
                        {"Content-Type": "application/json", "Accept": "application/json"})
    file_id = container["fileId"]

    print("2/4 upload catalog to container…")
    up = urllib.request.Request(container["uploadUri"], data=body, method="PUT",
                                headers=container["requiredHeaders"])
    urllib.request.urlopen(up).read()

    print("3/4 stream/update…")
    res, _ = _req("PUT",
                  f"{PLATFORM}/push/v1/organizations/{org}/sources/{source}/stream/update?fileId={file_id}",
                  key, b"{}", {"Content-Type": "application/json"})
    ordering_id = res.get("orderingId")
    print(f"    orderingId = {ordering_id}")
    if not ordering_id:
        print("    no orderingId returned; cannot prune. Response:", res)
        sys.exit(1)

    print(f"4/4 deleteolderthan/{ordering_id} (removes all older items)…")
    _req("POST",
         f"{PLATFORM}/push/v1/organizations/{org}/sources/{source}/stream/deleteolderthan/{ordering_id}",
         key, b"", {"Content-Type": "application/json"})
    print("    delete-older enqueued. Expect a few minutes for old items to clear.")


if __name__ == "__main__":
    main()
