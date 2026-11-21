#!/usr/bin/env python3
"""LSP-side RGB transfer tooling.

Usage:
  lsp_transfers.py [asset_id]          list transfers
  lsp_transfers.py [asset_id] recover  fail the oldest WaitingCounterparty batch
                                       (the RLN daemon has no deletetransfers
                                       route; failed transfers free the UTXO)
"""
import json
import sys
import urllib.error
import urllib.request

ASSET = "rgb:XqfNs5tL-tqOAD1j-thP6c4s-5B03Gsn-7pZqbn8-3aSi2Ns"


def post(path, payload, port=3101):
    req = urllib.request.Request(
        "http://127.0.0.1:%s%s" % (port, path),
        data=json.dumps(payload).encode(),
        headers={"content-type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            return resp.status, resp.read().decode()
    except urllib.error.HTTPError as exc:
        return exc.code, exc.read().decode("utf-8", "replace")


def main() -> None:
    asset = sys.argv[1] if len(sys.argv) > 1 and sys.argv[1].strip() else ASSET
    status, _last_list = post("/listtransfers", {"asset_id": asset, "filter": []})
    print("listtransfers %s: %s" % (status, _last_list[:3000]))
    if len(sys.argv) > 2 and sys.argv[2] == "balance":
        status, body = post("/assetbalance", {"asset_id": asset})
        print("assetbalance %s: %s" % (status, body[:500]))
    if len(sys.argv) > 2 and sys.argv[2] == "recover":
        waiting = [
            t["idx"]
            for t in json.loads(_last_list).get("transfers", [])
            if t.get("status") == "WaitingCounterparty"
        ]
        if not waiting:
            print("recover: nothing WaitingCounterparty")
            return
        payload = {"batch_transfer_idx": waiting[0], "no_asset_only": False, "skip_sync": False}
        status, body = post("/failtransfers", payload)
        print("failtransfers idx %s %s: %s" % (waiting[0], status, body[:500]))


if __name__ == "__main__":
    main()
