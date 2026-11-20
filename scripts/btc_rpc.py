#!/usr/bin/env python3
"""bitcoind JSON-RPC via the helper's credentials (127.0.0.1:19445, wallet bdk-test)."""
import base64
import json
import sys
import urllib.request

AUTH = base64.b64encode(b"admin:passw").decode()


def main() -> None:
    method = sys.argv[1]
    params = json.loads(sys.argv[2]) if len(sys.argv) > 2 else []
    payload = json.dumps({"jsonrpc": "1.0", "id": "q", "method": method, "params": params}).encode()
    req = urllib.request.Request(
        "http://127.0.0.1:19445/wallet/bdk-test",
        data=payload,
        headers={"content-type": "application/json", "authorization": f"Basic {AUTH}"},
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        body = json.loads(resp.read())
    out = json.dumps(body.get("result", body.get("error")), indent=1)
    print(out[:3000])


if __name__ == "__main__":
    main()
