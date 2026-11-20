#!/usr/bin/env python3
"""Probe the rgb-proxy-server JSON-RPC endpoints (3000/3005)."""
import json
import urllib.request

BODIES = [
    {"jsonrpc": "2.0", "id": 1, "method": "server.info", "params": []},
    {"jsonrpc": "2.0", "id": 1, "method": "server.info"},
    {"method": "server.info"},
]

for port in (3000, 3005):
    for body in BODIES:
        req = urllib.request.Request(
            f"http://127.0.0.1:{port}/json-rpc",
            data=json.dumps(body).encode(),
            headers={"content-type": "application/json"},
        )
        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                print(port, body["method"], "->", resp.read().decode()[:200])
        except Exception as exc:
            print(port, body["method"], "ERR", str(exc)[:200])
