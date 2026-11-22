#!/usr/bin/env python3
"""Close stuck RLN channels (rotated identities) to release reserved UTXOs."""
import json
import urllib.error
import urllib.request

with urllib.request.urlopen("http://127.0.0.1:3101/listchannels", timeout=30) as resp:
    channels = json.loads(resp.read().decode()).get("channels", [])

DEVICE_OK = "03186f75620a0880805fd659d02c713aa3acba4825035dd91a1fe30f5cd631d898"
for c in channels:
    peer = c.get("peer_pubkey", "")
    if peer == DEVICE_OK:
        continue  # keep the live wallet's channel
    body = {
        "channel_id": c.get("channel_id"),
        "peer_pubkey": peer,
        "force": True,
    }
    req = urllib.request.Request(
        "http://127.0.0.1:3101/closechannel",
        data=json.dumps(body).encode(),
        headers={"content-type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            print("close", peer[:12], c.get("status"), "->", resp.read().decode()[:100])
    except urllib.error.HTTPError as exc:
        print("close", peer[:12], c.get("status"), "->", exc.code, exc.read().decode()[:140])
    except Exception as exc:
        print("close", peer[:12], "->", exc)
