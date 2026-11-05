#!/usr/bin/env python3
"""
Bulk-uploads a folder of product images to Cloudinary via signed uploads.

Each file is uploaded with its filename stem as the public_id, so
`RC00006_00001.png` becomes public_id `RC00006_00001`, reachable at:
  https://res.cloudinary.com/<your-cloud>/image/upload/RC00006_00001.png

The cloud name and API secret are read from env vars so nothing org-specific
lives in the repo.

Usage:
    CLOUDINARY_CLOUD=... CLOUDINARY_API_KEY=... CLOUDINARY_API_SECRET=... \
    python3 scripts/upload-to-cloudinary.py <folder-of-images>

Standard library only (no cloudinary SDK needed).
"""
import hashlib
import os
import sys
import time
import urllib.request
import uuid
import mimetypes

CLOUD_NAME = os.environ.get("CLOUDINARY_CLOUD", "your-cloud-name")
UPLOAD_URL = f"https://api.cloudinary.com/v1_1/{CLOUD_NAME}/image/upload"
IMAGE_EXTS = {".png", ".jpg", ".jpeg", ".webp", ".gif"}


def sign(params: dict, secret: str) -> str:
    # Cloudinary signature: sorted "k=v" joined by &, + api secret, SHA-1.
    to_sign = "&".join(f"{k}={params[k]}" for k in sorted(params))
    return hashlib.sha1((to_sign + secret).encode()).hexdigest()


def multipart(fields: dict, file_field: str, filename: str, filedata: bytes):
    boundary = uuid.uuid4().hex
    crlf = b"\r\n"
    body = []
    for k, v in fields.items():
        body.append(b"--" + boundary.encode())
        body.append(f'Content-Disposition: form-data; name="{k}"'.encode())
        body.append(b"")
        body.append(str(v).encode())
    ctype = mimetypes.guess_type(filename)[0] or "application/octet-stream"
    body.append(b"--" + boundary.encode())
    body.append(
        f'Content-Disposition: form-data; name="{file_field}"; filename="{filename}"'.encode()
    )
    body.append(f"Content-Type: {ctype}".encode())
    body.append(b"")
    body.append(filedata)
    body.append(b"--" + boundary.encode() + b"--")
    body.append(b"")
    return crlf.join(body), f"multipart/form-data; boundary={boundary}"


def upload_one(path: str, public_id: str, api_key: str, secret: str) -> bool:
    ts = int(time.time())
    # Params that must be signed (public_id, timestamp, overwrite).
    signed = {"public_id": public_id, "overwrite": "true", "timestamp": ts}
    signature = sign(signed, secret)
    fields = {**signed, "api_key": api_key, "signature": signature}
    with open(path, "rb") as f:
        data = f.read()
    body, ctype = multipart(fields, "file", os.path.basename(path), data)
    req = urllib.request.Request(UPLOAD_URL, data=body, method="POST",
                                 headers={"Content-Type": ctype})
    try:
        urllib.request.urlopen(req).read()
        return True
    except urllib.error.HTTPError as e:
        print(f"    FAIL {public_id}: HTTP {e.code} {e.read().decode(errors='replace')[:200]}")
        return False


def main():
    if len(sys.argv) != 2:
        print("Usage: python3 scripts/upload-to-cloudinary.py <folder>")
        sys.exit(1)
    folder = os.path.expanduser(sys.argv[1])
    api_key = os.environ["CLOUDINARY_API_KEY"]
    secret = os.environ["CLOUDINARY_API_SECRET"]

    # Recurse into subfolders (images are batched in rc-products-XXX-YYY dirs,
    # plus an rc-images folder). De-dupe by public_id (filename stem).
    found = {}
    for root, _dirs, filenames in os.walk(folder):
        for fn in filenames:
            if os.path.splitext(fn)[1].lower() in IMAGE_EXTS:
                stem = os.path.splitext(fn)[0]
                found.setdefault(stem, os.path.join(root, fn))

    files = sorted(found.items())  # (public_id, path)
    print(f"Found {len(files)} unique images under {folder}")

    ok = 0
    for i, (public_id, path) in enumerate(files, 1):
        if upload_one(path, public_id, api_key, secret):
            ok += 1
            print(f"  [{i}/{len(files)}] uploaded {public_id}")
    print(f"\nDone: {ok}/{len(files)} uploaded to cloud '{CLOUD_NAME}'.")


if __name__ == "__main__":
    main()
