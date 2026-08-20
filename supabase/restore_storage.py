#!/usr/bin/env python3
"""يرجّع كل ملفات التخزين (فيديوهات/صور/PDF) من supabase/storage-backup إلى مشروع Supabase.

الاستخدام:
    export SUPABASE_URL=https://xxx.supabase.co
    export SUPABASE_SERVICE_ROLE_KEY=...
    python3 supabase/restore_storage.py
"""
import json
import mimetypes
import os
import pathlib
import urllib.request

BASE = pathlib.Path(__file__).parent / "storage-backup"
URL = os.environ["SUPABASE_URL"].rstrip("/")
KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
HEADERS = {"apikey": KEY, "Authorization": f"Bearer {KEY}"}
PUBLIC_BUCKETS = {"course-covers"}


def request(method, path, data=None, headers=None, raw=False):
    req = urllib.request.Request(f"{URL}{path}", data=data, method=method)
    for k, v in {**HEADERS, **(headers or {})}.items():
        req.add_header(k, v)
    try:
        with urllib.request.urlopen(req) as res:
            return res.status, res.read() if raw else res.read().decode()
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode(errors="ignore")


def ensure_bucket(name):
    body = json.dumps({"name": name, "id": name, "public": name in PUBLIC_BUCKETS}).encode()
    request("POST", "/storage/v1/bucket", body, {"Content-Type": "application/json"})


def read_bytes(path: pathlib.Path):
    if path.exists():
        return path.read_bytes()
    pointer = path.with_suffix(path.suffix + ".asset.json")
    if pointer.exists():
        info = json.loads(pointer.read_text())
        url = info["url"]
        if url.startswith("/"):
            url = info.get("cdn_url") or f"https://craft-kindly-logic.lovable.app{url}"
        with urllib.request.urlopen(url) as res:
            return res.read()
    return None


def main():
    manifest = json.loads((BASE / "manifest.json").read_text())
    for bucket in {item["bucket"] for item in manifest}:
        ensure_bucket(bucket)
    ok = 0
    for item in manifest:
        target = BASE / item["bucket"] / item["path"]
        data = read_bytes(target)
        if data is None:
            print("missing:", item["bucket"], item["path"])
            continue
        ctype = mimetypes.guess_type(item["path"])[0] or "application/octet-stream"
        status, body = request(
            "POST",
            f"/storage/v1/object/{item['bucket']}/{item['path']}",
            data,
            {"Content-Type": ctype, "x-upsert": "true"},
        )
        if status in (200, 201):
            ok += 1
        else:
            print("failed:", item["path"], status, body[:200])
    print(f"restored {ok}/{len(manifest)} files")


if __name__ == "__main__":
    main()
