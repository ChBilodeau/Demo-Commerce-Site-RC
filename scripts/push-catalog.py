#!/usr/bin/env python3
"""
Pushes a large catalog file to a Coveo source via the file-container flow, so
you never have to put the 26MB payload in a request body (which is why Postman
was failing).

Flow (works for both Push and Catalog/Stream sources):
  1. Create a file container  -> Coveo returns a temporary S3 upload URL + fileId
  2. Upload the file to that S3 URL (PUT, with the required headers)
  3. Tell the source to ingest that fileId

You supply the push API key and source id via environment variables so nothing
sensitive is hard-coded:

    COVEO_PUSH_KEY=xxxxxxxx \
    COVEO_ORG_ID=__COVEO_ORG_ID__ \
    COVEO_SOURCE_ID=__COVEO_ORG_ID__-vluokepoujysq7vuicty4m2oqi \
    COVEO_PUSH_MODE=stream \
    python3 scripts/push-catalog.py /Users/christianbilodeau/Documents/catalog-fixed.json

COVEO_PUSH_MODE:
    "stream"  -> Catalog/Stream source full replace (stream/open + chunk + close-ish).
                 Use this if your Postman URL contained ".../stream/".
    "push"    -> Push API batch (documents/batch?fileId=...).
                 Use this if your Postman URL contained ".../documents/".

NOTE: This script is a scaffold. Confirm the mode against your Postman URL
before running. It performs a real write to a shared source — run deliberately.
"""
import json
import os
import sys
import urllib.request
from typing import Optional

PLATFORM = "https://api.cloud.coveo.com"  # push/management host


def _req(method: str, url: str, key: str, body: Optional[bytes], headers: dict) -> dict:
    h = {"Authorization": f"Bearer {key}", **headers}
    req = urllib.request.Request(url, data=body, method=method, headers=h)
    with urllib.request.urlopen(req) as resp:
        raw = resp.read()
        return json.loads(raw) if raw else {}


def create_file_container(org: str, key: str) -> dict:
    url = f"{PLATFORM}/push/v1/organizations/{org}/files"
    return _req("POST", url, key, b"", {"Content-Type": "application/json"})


def upload_to_container(container: dict, data: bytes) -> None:
    # Coveo returns uploadUri + requiredHeaders for the S3 PUT.
    req = urllib.request.Request(
        container["uploadUri"], data=data, method="PUT",
        headers=container["requiredHeaders"],
    )
    urllib.request.urlopen(req).read()


def ingest_stream(org: str, source: str, key: str, file_id: str) -> dict:
    # Catalog/Stream full replace.
    url = (
        f"{PLATFORM}/push/v1/organizations/{org}/sources/{source}"
        f"/stream/update?fileId={file_id}"
    )
    return _req("PUT", url, key, b"", {"Content-Type": "application/json"})


def ingest_push_batch(org: str, source: str, key: str, file_id: str) -> dict:
    # Push API batch.
    url = (
        f"{PLATFORM}/push/v1/organizations/{org}/sources/{source}"
        f"/documents/batch?fileId={file_id}"
    )
    return _req("PUT", url, key, b"", {"Content-Type": "application/json"})


def main() -> None:
    if len(sys.argv) != 2:
        print("Usage: python3 scripts/push-catalog.py <catalog-fixed.json>")
        sys.exit(1)

    path = sys.argv[1]
    org = os.environ["COVEO_ORG_ID"]
    source = os.environ["COVEO_SOURCE_ID"]
    key = os.environ["COVEO_PUSH_KEY"]
    mode = os.environ.get("COVEO_PUSH_MODE", "stream")

    with open(path, "rb") as f:
        data = f.read()
    print(f"Read {len(data) / 1e6:.1f} MB from {path}")

    print("1/3 creating file container…")
    container = create_file_container(org, key)
    file_id = container["fileId"]
    print(f"    fileId = {file_id}")

    print("2/3 uploading file to container…")
    upload_to_container(container, data)
    print("    upload complete")

    print(f"3/3 ingesting via '{mode}' mode…")
    if mode == "push":
        result = ingest_push_batch(org, source, key, file_id)
    else:
        result = ingest_stream(org, source, key, file_id)
    print("    done:", result or "accepted")


if __name__ == "__main__":
    main()
