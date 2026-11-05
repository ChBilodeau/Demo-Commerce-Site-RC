#!/usr/bin/env python3
"""
Uploads a SINGLE image to Cloudinary with an explicit public_id (signed).

Usage:
    CLOUDINARY_API_KEY=... CLOUDINARY_API_SECRET=... \
    python3 scripts/upload-one-to-cloudinary.py <image-path> <public_id>

Example:
    ... upload-one-to-cloudinary.py ~/Documents/Commerce_images/07605...png bg-texture
"""
import hashlib
import mimetypes
import os
import sys
import time
import urllib.request
import uuid

CLOUD_NAME = "dazzh5qm"
UPLOAD_URL = f"https://api.cloudinary.com/v1_1/{CLOUD_NAME}/image/upload"


def sign(params, secret):
    to_sign = "&".join(f"{k}={params[k]}" for k in sorted(params))
    return hashlib.sha1((to_sign + secret).encode()).hexdigest()


def multipart(fields, filename, filedata):
    boundary = uuid.uuid4().hex
    crlf = b"\r\n"
    parts = []
    for k, v in fields.items():
        parts += [b"--" + boundary.encode(),
                  f'Content-Disposition: form-data; name="{k}"'.encode(), b"", str(v).encode()]
    ctype = mimetypes.guess_type(filename)[0] or "application/octet-stream"
    parts += [b"--" + boundary.encode(),
              f'Content-Disposition: form-data; name="file"; filename="{filename}"'.encode(),
              f"Content-Type: {ctype}".encode(), b"", filedata,
              b"--" + boundary.encode() + b"--", b""]
    return crlf.join(parts), f"multipart/form-data; boundary={boundary}"


def main():
    if len(sys.argv) != 3:
        print("Usage: upload-one-to-cloudinary.py <image-path> <public_id>")
        sys.exit(1)
    path, public_id = os.path.expanduser(sys.argv[1]), sys.argv[2]
    api_key = os.environ["CLOUDINARY_API_KEY"]
    secret = os.environ["CLOUDINARY_API_SECRET"]

    ts = int(time.time())
    signed = {"public_id": public_id, "overwrite": "true", "timestamp": ts}
    fields = {**signed, "api_key": api_key, "signature": sign(signed, secret)}
    with open(path, "rb") as f:
        data = f.read()
    body, ctype = multipart(fields, os.path.basename(path), data)
    req = urllib.request.Request(UPLOAD_URL, data=body, method="POST", headers={"Content-Type": ctype})
    try:
        import json
        resp = json.loads(urllib.request.urlopen(req).read())
        print("uploaded:", resp.get("secure_url"))
    except urllib.error.HTTPError as e:
        print(f"FAIL HTTP {e.code}: {e.read().decode(errors='replace')[:300]}")
        sys.exit(1)


if __name__ == "__main__":
    main()
