import json
import urllib.request

body = {
    "dest_pubkey": "037023459feeb180903fbd976cde6ef5870ef540086796c7a570d0e300ce926bc5",
    "amt_msat": 3000000,
}
req = urllib.request.Request(
    "http://127.0.0.1:3010/lsp/keysend",
    data=json.dumps(body).encode(),
    headers={"content-type": "application/json"},
)
try:
    with urllib.request.urlopen(req, timeout=60) as resp:
        print(resp.status, resp.read().decode()[:400])
except Exception as exc:
    print("ERR", exc)
