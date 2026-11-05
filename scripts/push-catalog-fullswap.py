#!/usr/bin/env python3
"""
FULL-REPLACE (load operation) for a Coveo Catalog source using the Stream API:
  1. open a stream  -> returns streamId + uploadUri + requiredHeaders
  2. PUT the full catalog JSON to that uploadUri
  3. close the stream -> commits; items NOT in the payload are removed

This overwrites the ENTIRE source content, so the old catalog is wiped.

Input: `{"AddOrUpdate": [ ...items... ]}` (our generated shape). Re-emitted as
the Stream API's `{"addOrUpdate": [ {documentId, objecttype, ...} ]}`.

Usage:
    COVEO_PUSH_KEY=... COVEO_ORG_ID=... COVEO_SOURCE_ID=... \
    python3 scripts/push-catalog-fullswap.py <catalog.json>
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
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        print(f"  !! {method} {url}\n     HTTP {e.code}: {e.read().decode(errors='replace')[:300]}")
        raise


def open_stream(org, source, key):
    url = f"{PLATFORM}/push/v1/organizations/{org}/sources/{source}/stream/open"
    return _req("POST", url, key, b"", {"Content-Type": "application/json", "Accept": "application/json"})


def upload(upload_uri, required_headers, data):
    req = urllib.request.Request(upload_uri, data=data, method="PUT", headers=required_headers)
    urllib.request.urlopen(req).read()


def close_stream(org, source, key, stream_id):
    url = f"{PLATFORM}/push/v1/organizations/{org}/sources/{source}/stream/{stream_id}/close"
    return _req("POST", url, key, b"", {"Content-Type": "application/json"})


def main():
    if len(sys.argv) != 2:
        print("Usage: python3 scripts/push-catalog-fullswap.py <catalog.json>")
        sys.exit(1)

    org = os.environ["COVEO_ORG_ID"]
    source = os.environ["COVEO_SOURCE_ID"]
    key = os.environ["COVEO_PUSH_KEY"]

    with open(sys.argv[1]) as f:
        src = json.load(f)
    items = src.get("AddOrUpdate", [])

    docs = []
    for it in items:
        doc = dict(it)
        if "documentId" not in doc and "DocumentId" in doc:
            doc["documentId"] = doc.pop("DocumentId")
        docs.append(doc)
    body = json.dumps({"addOrUpdate": docs}).encode()
    print(f"{len(docs)} documents prepared ({len(body)/1e6:.2f} MB)")

    print("1/3 opening stream…")
    stream = open_stream(org, source, key)
    stream_id = stream["streamId"]
    print(f"    streamId = {stream_id}")

    print("2/3 uploading full catalog to stream uploadUri…")
    upload(stream["uploadUri"], stream["requiredHeaders"], body)
    print("    upload complete")

    print("3/3 closing stream (commits full replace)…")
    result = close_stream(org, source, key, stream_id)
    print("    done:", result or "accepted")
    print("\nNote: expect ~15 min for old items to be removed from the index.")


if __name__ == "__main__":
    main()
