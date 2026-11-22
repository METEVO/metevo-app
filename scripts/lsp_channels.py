import json
import sys
import urllib.request

with urllib.request.urlopen("http://127.0.0.1:3101/listchannels", timeout=30) as resp:
    data = json.loads(resp.read())
channels = data.get("channels") if isinstance(data, dict) else data
print("count:", len(channels) if isinstance(channels, list) else "?")
if isinstance(channels, list):
    for c in channels:
        print(
            c.get("short_channel_id"),
            str(c.get("peer_pubkey") or c.get("remote_pubkey") or c.get("counterparty_node_id") or "?")[:12],
            "usable:", c.get("is_usable"),
            "ready:", c.get("ready"),
            "inbound:", c.get("inbound_balance_msat"),
            "virtual:", c.get("virtual_open_mode"),
            "status:", c.get("status"),
        )
