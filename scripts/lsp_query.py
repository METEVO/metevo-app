#!/usr/bin/env python3
"""Query the local LSP RLN daemon (127.0.0.1:3101) or helper (3010).

Usage: echo '{"asset_id":"rgb:...","filter":[]}' | lsp_query.py /listtransfers [port]
"""
import json
import sys
import urllib.error
import urllib.request


def main() -> None:
    path = sys.argv[1]
    port = sys.argv[2] if len(sys.argv) > 2 else "3101"
    data = sys.stdin.read().encode() or b"{}"
    req = urllib.request.Request(
        f"http://127.0.0.1:{port}{path}",
        data=data,
        headers={"content-type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            body = resp.read().decode()
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", "replace")
    try:
        print(json.dumps(json.loads(body), indent=1)[:4000])
    except Exception:
        print(body[:4000])


if __name__ == "__main__":
    main()
