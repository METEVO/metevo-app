#!/usr/bin/env python3
import json
import urllib.error
import urllib.request

req = urllib.request.Request(
    "http://127.0.0.1:3101/listtransfers",
    data=json.dumps({"asset_id": "rgb:G_UMjqXO-WDfjO0Z-K~ik1W2-7mhdFbx-yyv2LGo-hZZHkwo", "filter": []}).encode(),
    headers={"content-type": "application/json"})
with urllib.request.urlopen(req, timeout=60) as resp:
    data = json.loads(resp.read().decode())

transfers = data.get("transfers", [])
pending = [(t["idx"], t["status"]) for t in transfers if t["status"] in ("WaitingCounterparty", "WaitingConfirmations")]
print("pending:", pending)
for idx, status in pending:
    body = json.dumps({"batch_transfer_idx": idx, "no_asset_only": False, "skip_sync": False}).encode()
    req = urllib.request.Request(
        "http://127.0.0.1:3101/failtransfers", data=body,
        headers={"content-type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            print("fail", idx, "->", resp.read().decode()[:100])
    except urllib.error.HTTPError as exc:
        print("fail", idx, "->", exc.code, exc.read().decode()[:160])
