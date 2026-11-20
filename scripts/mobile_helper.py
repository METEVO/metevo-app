import base64
import json
import os
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

RPC = "http://127.0.0.1:19445"
AUTH = base64.b64encode(b"admin:passw").decode()
WALLET = "bdk-test"


def rpc(method, params):
    payload = json.dumps({"jsonrpc": "1.0", "id": "mobile", "method": method, "params": params}).encode()
    req = urllib.request.Request(
        f"{RPC}/wallet/{WALLET}",
        data=payload,
        headers={"content-type": "application/json", "authorization": f"Basic {AUTH}"},
    )
    with urllib.request.urlopen(req, timeout=20) as resp:
        body = json.loads(resp.read())
    if body.get("error"):
        raise RuntimeError(body["error"])
    return body["result"]


class Handler(BaseHTTPRequestHandler):
    def _cors(self):
        self.send_header("access-control-allow-origin", "*")
        self.send_header("access-control-allow-headers", "content-type")
        self.send_header("access-control-allow-methods", "GET,POST,OPTIONS")

    def _json(self, code, data):
        body = json.dumps(data).encode()
        self.send_response(code)
        self.send_header("content-type", "application/json")
        self._cors()
        self.send_header("content-length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        self._cors()
        self.end_headers()

    def do_GET(self):
        if self.path.startswith("/lspinfo") or self.path.startswith("/lsp/info"):
            with urllib.request.urlopen("http://127.0.0.1:3101/nodeinfo", timeout=5) as resp:
                self._json(200, json.loads(resp.read()))
            return
        if self.path.startswith("/lsp/peers"):
            with urllib.request.urlopen("http://127.0.0.1:3101/listpeers", timeout=5) as resp:
                self._json(200, json.loads(resp.read()))
            return
        if self.path.startswith("/txstatus"):
            from urllib.parse import parse_qs, urlparse

            txid = (parse_qs(urlparse(self.path).query).get("txid") or [""])[0]
            if not txid:
                self._json(400, {"error": "txid required"})
                return
            try:
                with urllib.request.urlopen(
                    f"http://127.0.0.1:3002/tx/{txid}/status", timeout=5
                ) as resp:
                    self._json(200, {"seen": resp.status == 200, "status": json.loads(resp.read())})
            except Exception:  # noqa: BLE001
                self._json(200, {"seen": False})
            return
        self._json(404, {"error": "not found"})

    def do_POST(self):
        length = int(self.headers.get("content-length", "0"))
        body = json.loads(self.rfile.read(length) or b"{}")
        try:
            if self.path.startswith("/lsp/issueusdm"):
                cache = "/tmp/metevo_usdm_asset.json"
                if os.path.exists(cache):
                    with open(cache, encoding="utf-8") as handle:
                        self._json(200, {"asset": json.load(handle), "cached": True})
                    return
                post_url = "http://127.0.0.1:3101/createutxos"
                post = json.dumps(
                    {"up_to": False, "num": 3, "size": 20000, "fee_rate": 1, "skip_sync": False}
                ).encode()
                try:
                    with urllib.request.urlopen(
                        urllib.request.Request(post_url, data=post, headers={"content-type": "application/json"}),
                        timeout=60,
                    ) as resp:
                        resp.read()
                except Exception:  # noqa: BLE001
                    pass
                post_url = "http://127.0.0.1:3101/issueassetnia"
                post = json.dumps(
                    {
                        "ticker": "USDM",
                        "name": "Metevo USDm",
                        "precision": 8,
                        "amounts": [100000000],
                    }
                ).encode()
                with urllib.request.urlopen(
                    urllib.request.Request(post_url, data=post, headers={"content-type": "application/json"}),
                    timeout=60,
                ) as resp:
                    issued = json.loads(resp.read())
                with open(cache, "w", encoding="utf-8") as handle:
                    json.dump(issued["asset"], handle)
                self._json(200, issued)
                return
            if self.path.startswith("/lsp/sendrgb"):
                amount = int(body["amount"])
                asset_id = body["asset_id"]
                payload = json.dumps(
                    {
                        "donation": False,
                        "fee_rate": 1,
                        "min_confirmations": 1,
                        "expiration_timestamp": None,
                        "recipient_map": {
                            asset_id: [
                                {
                                    "recipient_id": body["recipient_id"],
                                    "witness_data": None,
                                    "assignment": {"type": "Fungible", "value": amount},
                                    "transport_endpoints": body.get("transport_endpoints", []),
                                }
                            ]
                        },
                    }
                ).encode()
                req = urllib.request.Request(
                    "http://127.0.0.1:3101/sendrgb",
                    data=payload,
                    headers={"content-type": "application/json"},
                )
                try:
                    with urllib.request.urlopen(req, timeout=60) as resp:
                        self._json(200, json.loads(resp.read()))
                except urllib.error.HTTPError as exc:
                    raw = exc.read().decode("utf-8", "replace")
                    if "Not enough assets" in raw:
                        rpc("generatetoaddress", [1, rpc("getnewaddress", [])])
                        try:
                            refresh = urllib.request.Request(
                                "http://127.0.0.1:3101/refreshtransfers",
                                data=json.dumps(
                                    {"asset_id": asset_id, "filter": [], "skip_sync": False}
                                ).encode(),
                                headers={"content-type": "application/json"},
                            )
                            with urllib.request.urlopen(refresh, timeout=60) as resp:
                                resp.read()
                            req = urllib.request.Request(
                                "http://127.0.0.1:3101/sendrgb",
                                data=payload,
                                headers={"content-type": "application/json"},
                            )
                            with urllib.request.urlopen(req, timeout=60) as resp:
                                self._json(200, json.loads(resp.read()))
                                return
                        except urllib.error.HTTPError as retry_exc:
                            raw = retry_exc.read().decode("utf-8", "replace")
                        except Exception as retry_exc:  # noqa: BLE001
                            raw = f"{type(retry_exc).__name__}: {retry_exc}"
                    try:
                        self._json(exc.code, json.loads(raw))
                    except Exception:  # noqa: BLE001
                        self._json(exc.code, {"raw": raw[:400]})
                return
            if self.path.startswith("/lsp/refresh"):
                payload = json.dumps(
                    {
                        "asset_id": body.get("asset_id"),
                        "filter": [],
                        "skip_sync": False,
                    }
                ).encode()
                req = urllib.request.Request(
                    "http://127.0.0.1:3101/refreshtransfers",
                    data=payload,
                    headers={"content-type": "application/json"},
                )
                with urllib.request.urlopen(req, timeout=60) as resp:
                    self._json(200, json.loads(resp.read()))
                return
            if self.path.startswith("/lsp/keysend"):
                payload = json.dumps(
                    {
                        "dest_pubkey": body["dest_pubkey"],
                        "amt_msat": int(body.get("amt_msat", 3000000)),
                    }
                ).encode()
                req = urllib.request.Request(
                    "http://127.0.0.1:3101/keysend",
                    data=payload,
                    headers={"content-type": "application/json"},
                )
                try:
                    with urllib.request.urlopen(req, timeout=60) as resp:
                        self._json(200, json.loads(resp.read()))
                except urllib.error.HTTPError as exc:
                    raw = exc.read()
                    try:
                        self._json(exc.code, json.loads(raw))
                    except Exception:  # noqa: BLE001
                        self._json(exc.code, {"raw": raw.decode("utf-8", "replace")[:400]})
                return
            if self.path.startswith("/lsp/openvirtual"):
                payload = json.dumps(
                    {
                        "peer_pubkey_and_opt_addr": f"{body['peer_pubkey']}@127.0.0.1:9735",
                        "capacity_sat": int(body.get("capacity_sat", 500000)),
                        "push_msat": int(body.get("push_msat", 250000000)),
                        "asset_id": None,
                        "asset_amount": None,
                        "push_asset_amount": None,
                        "public": False,
                        "with_anchors": False,
                        "fee_base_msat": None,
                        "fee_proportional_millionths": None,
                        "temporary_channel_id": None,
                        "virtual_open_mode": "trusted_no_broadcast",
                    }
                ).encode()
                req = urllib.request.Request(
                    "http://127.0.0.1:3101/openchannel",
                    data=payload,
                    headers={"content-type": "application/json"},
                )
                try:
                    with urllib.request.urlopen(req, timeout=30) as resp:
                        self._json(200, json.loads(resp.read()))
                except urllib.error.HTTPError as exc:
                    raw = exc.read()
                    try:
                        self._json(exc.code, json.loads(raw))
                    except Exception:  # noqa: BLE001
                        self._json(exc.code, {"raw": raw.decode("utf-8", "replace")[:400]})
                return
            if self.path.startswith("/lsp/invoice"):
                amt = int(body.get("amt_msat", 3000000))
                payload = json.dumps({"amt_msat": amt, "expiry_sec": 3600}).encode()
                req = urllib.request.Request(
                    "http://127.0.0.1:3101/lninvoice",
                    data=payload,
                    headers={"content-type": "application/json"},
                )
                with urllib.request.urlopen(req, timeout=20) as resp:
                    self._json(200, json.loads(resp.read()))
                return
            if self.path.startswith("/lsp/pay"):
                payload = json.dumps({"invoice": body["invoice"]}).encode()
                req = urllib.request.Request(
                    "http://127.0.0.1:3101/sendpayment",
                    data=payload,
                    headers={"content-type": "application/json"},
                )
                with urllib.request.urlopen(req, timeout=60) as resp:
                    self._json(200, json.loads(resp.read()))
                return
            if self.path.startswith("/fund"):
                address = body["address"]
                btc = float(body.get("btc", 0.05))
                txid = rpc("sendtoaddress", [address, btc])
                mine_address = rpc("getnewaddress", [])
                rpc("generatetoaddress", [6, mine_address])
                self._json(200, {"txid": txid})
                return
            if self.path.startswith("/mine"):
                blocks = int(body.get("blocks", 12))
                mine_address = rpc("getnewaddress", [])
                hashes = rpc("generatetoaddress", [blocks, mine_address])
                self._json(200, {"blocks": len(hashes)})
                return
        except Exception as exc:  # noqa: BLE001
            self._json(500, {"error": str(exc)})
            return
        self._json(404, {"error": "not found"})


ThreadingHTTPServer(("0.0.0.0", 3010), Handler).serve_forever()
