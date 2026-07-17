"""Signed direct-upload helper for Cloudinary.

We don't use the official `cloudinary` SDK here to keep the dependency
footprint small. Generating a signed upload signature is just a SHA-1 hash
over the sorted params + the API secret, documented at:
https://cloudinary.com/documentation/upload_images#generating_authentication_signatures

The actual image bytes never touch our backend: the browser uploads
directly to Cloudinary's REST API using this short-lived signature. Only
`timestamp` and `folder` are signed here -- those are the only extra
params the frontend sends along with `file` and `api_key` (which is never
signed, only the secret is).
"""
import hashlib
import time


def build_signature(params: dict[str, str], api_secret: str) -> str:
    """Sign a dict of upload params the way Cloudinary expects.

    Only params that will be sent to Cloudinary's /upload endpoint should be
    included here -- never api_key, never the file itself.
    """
    to_sign = "&".join(f"{k}={v}" for k, v in sorted(params.items()))
    return hashlib.sha1(f"{to_sign}{api_secret}".encode()).hexdigest()


def new_signed_upload(*, cloud_name: str, api_key: str, api_secret: str, folder: str) -> dict:
    """Build the short-lived params a browser needs to upload directly to Cloudinary."""
    timestamp = str(int(time.time()))
    params = {"timestamp": timestamp, "folder": folder}
    signature = build_signature(params, api_secret)
    return {
        "cloud_name": cloud_name,
        "api_key": api_key,
        "timestamp": timestamp,
        "folder": folder,
        "signature": signature,
    }
