#!/usr/bin/env python3
"""Query the 'rgb-node-api-analysis' bitcoind (127.0.0.1:18443, dev/dev)."""
import base64
import json
import sys
import urllib.request

AUTH = base64.b64encode(b"dev:dev").decode()


def main() -> None:
    method = sys.argv[1]
    raw = sys.stdin.read()
    params = json.loads(raw) if raw else []
    payload = json.dumps({"jsonrpc": "1.0", "id": "q", "method": method, "params": params}).encode()
    req = urllib.request.Request(
        "http://127.0.0.1:18443",
        data=payload,
        headers={"content-type": "application/json", "authorization": f"Basic {AUTH}"},
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        body = json.loads(resp.read())
    print(json.dumps(body.get("result", body.get("error")), indent=1)[:2000])


if __name__ == "__main__":
    main()
