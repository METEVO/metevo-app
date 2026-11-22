import base64
import json
import math
import os
import threading
import time
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

RPC = "http://127.0.0.1:19445"
AUTH = base64.b64encode(b"admin:passw").decode()
WALLET = "bdk-test"
RLN = "http://127.0.0.1:3101"
USDM_CACHE = "/tmp/metevo_usdm_asset.json"
ISSUE_LOCK = threading.Lock()


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


def mine_blocks(blocks):
    rpc("generatetoaddress", [blocks, rpc("getnewaddress", [])])


def rln(path, payload=None, timeout=60, tolerate_allocation=False):
    """POST to the RLN management API; returns the decoded JSON body."""
    req = urllib.request.Request(
        f"{RLN}{path}",
        data=None if payload is None else json.dumps(payload).encode(),
        headers={"content-type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read()
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode("utf-8", "replace")
        if tolerate_allocation and exc.code == 403 and "AllocationsAlreadyAvailable" in raw:
            return {}
        raise RuntimeError(f"{path} {exc.code}: {raw[:400]}") from None
    return json.loads(raw) if raw else {}


def rln_get(path, timeout=30):
    with urllib.request.urlopen(f"{RLN}{path}", timeout=timeout) as resp:
        raw = resp.read()
    return json.loads(raw) if raw else {}


def _spendable(value):
    return int((value or {}).get("spendable") or 0)


def issue_usdm(ticker="USDM"):
    """Issue the demo NIA once and cache it (single path for every caller)."""
    with ISSUE_LOCK:
        if os.path.exists(USDM_CACHE):
            with open(USDM_CACHE, encoding="utf-8") as handle:
                return {"asset": json.load(handle), "cached": True}
        # 100 USDm total; the device receives 1-20 USDm per delivery.
        rln(
            "/createutxos",
            {"up_to": False, "num": 3, "size": 20000, "fee_rate": 1, "skip_sync": False},
            120,
            tolerate_allocation=True,
        )
        mine_blocks(2)
        issued = rln(
            "/issueassetnia",
            {
                "ticker": ticker or "USDM",
                "name": "Metevo USDm",
                "precision": 8,
                "amounts": [10000000000],
            },
            120,
        )
        with open(USDM_CACHE, "w", encoding="utf-8") as handle:
            json.dump(issued["asset"], handle)
        return {**issued, "cached": False}


def list_assets():
    return rln(
        "/listassets",
        {"filter_asset_schemas": ["Nia", "Uda", "Cfa", "Ifa"]},
        30,
    )


def prepare_usdm_asset(asset_amount, ticker="USDM"):
    """Return (asset_id, source, balance) with spendable >= asset_amount."""
    ticker = (ticker or "USDM").strip() or "USDM"
    listed = list_assets()
    for schema in ("nia", "uda", "cfa", "ifa"):
        for asset in listed.get(schema) or []:
            if str(asset.get("ticker") or "").upper() != ticker.upper():
                continue
            asset_id = asset["asset_id"]
            balance = rln("/assetbalance", {"asset_id": asset_id}, 30)
            if _spendable(balance) < asset_amount:
                raise RuntimeError(
                    f"insufficient asset balance: {_spendable(balance)} < {asset_amount} required"
                )
            return asset_id, "listed", balance

    asset_id = None
    if os.path.exists(USDM_CACHE):
        try:
            with open(USDM_CACHE, encoding="utf-8") as handle:
                cached_id = json.load(handle).get("asset_id")
            known = {
                a.get("asset_id")
                for schema in ("nia", "uda", "cfa", "ifa")
                for a in listed.get(schema) or []
            }
            if cached_id in known:
                asset_id = cached_id
            else:
                os.remove(USDM_CACHE)  # stale id from another regtest chain
        except Exception:  # noqa: BLE001
            asset_id = None

    source = "cached"
    if not asset_id:
        asset_id = issue_usdm(ticker)["asset"]["asset_id"]
        source = "issued"
    mine_blocks(2)

    deadline = time.time() + 60
    balance = {}
    while time.time() < deadline:
        balance = rln("/assetbalance", {"asset_id": asset_id}, 30)
        if _spendable(balance) >= asset_amount:
            return asset_id, source, balance
        mine_blocks(1)
        time.sleep(1)
    raise RuntimeError(
        f"insufficient asset balance: {_spendable(balance)} < {asset_amount} required"
    )


def ensure_colored_spendable(capacity_sat, steps):
    """Reference ensureColoredSpendable: colorable BTC >= capacity_sat."""
    balance = rln("/btcbalance", {"skip_sync": False}, 120)
    spendable = _spendable(balance.get("colored"))
    steps.append({"step": "btcbalance", "colored_spendable": spendable})
    if spendable >= capacity_sat:
        return balance

    size = max(capacity_sat, 20000)
    num = max(1, math.ceil((capacity_sat - spendable) / size))
    rln(
        "/createutxos",
        {"up_to": False, "num": num, "size": size, "fee_rate": 1, "skip_sync": False},
        120,
    )
    steps.append({"step": "createutxos-colorable", "num": num, "size": size})
    mine_blocks(2)

    deadline = time.time() + 60
    while time.time() < deadline:
        balance = rln("/btcbalance", {"skip_sync": False}, 120)
        spendable = _spendable(balance.get("colored"))
        if spendable >= capacity_sat:
            steps.append({"step": "btcbalance", "colored_spendable": spendable})
            return balance
        time.sleep(2)
    raise RuntimeError(f"colored spendable {spendable} < {capacity_sat}")


def create_channel_utxo(capacity_sat):
    """Reference createColorableUtxosForChannel; 403 AlreadyAvailable is success."""
    try:
        rln(
            "/createutxos",
            {"up_to": False, "num": 1, "size": capacity_sat, "fee_rate": 1, "skip_sync": False},
            120,
        )
    except RuntimeError as exc:
        if "AllocationsAlreadyAvailable" not in str(exc):
            raise
    mine_blocks(2)


def send_rgb(asset_id, amount, recipient_id, transport_endpoints):
    """Existing on-chain delivery path: returns (status_code, body)."""
    payload = json.dumps(
        {
            "donation": False,
            "fee_rate": 1,
            "min_confirmations": 1,
            "expiration_timestamp": None,
            "recipient_map": {
                asset_id: [
                    {
                        "recipient_id": recipient_id,
                        "witness_data": None,
                        "assignment": {"type": "Fungible", "value": int(amount)},
                        "transport_endpoints": transport_endpoints,
                    }
                ]
            },
        }
    ).encode()

    def attempt():
        req = urllib.request.Request(
            f"{RLN}/sendrgb",
            data=payload,
            headers={"content-type": "application/json"},
        )
        with urllib.request.urlopen(req, timeout=60) as resp:
            return 200, json.loads(resp.read())

    try:
        return attempt()
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode("utf-8", "replace")
        if "Not enough assets" not in raw:
            try:
                return exc.code, json.loads(raw)
            except Exception:  # noqa: BLE001
                return exc.code, {"raw": raw[:400]}
        mine_blocks(1)
        try:
            rln(
                "/refreshtransfers",
                {"asset_id": asset_id, "filter": [], "skip_sync": False},
                60,
            )
            return attempt()
        except urllib.error.HTTPError as retry_exc:
            raw = retry_exc.read().decode("utf-8", "replace")
            try:
                return retry_exc.code, json.loads(raw)
            except Exception:  # noqa: BLE001
                return retry_exc.code, {"raw": raw[:400]}
        except Exception as retry_exc:  # noqa: BLE001
            return 502, {"raw": f"{type(retry_exc).__name__}: {retry_exc}"[:400]}


def _channel_for(channels, pubkey, asset_id):
    for channel in channels:
        if str(channel.get("peer_pubkey") or "").lower() != pubkey.lower():
            continue
        if str(channel.get("asset_id") or "") != asset_id:
            continue
        return channel
    return None


class Handler(BaseHTTPRequestHandler):
    def _handle_issueusdm(self):
        issued = issue_usdm()
        self._json(200, issued)

    def _handle_bootstrap(self, body):
        peer = str(body.get("peer_pubkey_and_opt_addr") or "").strip()
        if "@" not in peer:
            self._json(400, {"error": "peer_pubkey_and_opt_addr must be pubkey@host:port"})
            return
        pubkey = peer.split("@", 1)[0]
        ticker = str(body.get("ticker") or "USDM").strip() or "USDM"
        capacity_sat = int(body.get("capacity_sat", 500000))
        asset_amount = int(body.get("asset_amount", 2000000000))
        push_msat = int(body.get("push_msat", 250000000))
        recipient_id = str(body.get("recipient_id") or "").strip() or None
        transport_endpoints = body.get("transport_endpoints") or []
        steps = []

        # RLN rejects a push larger than the channel capacity ("Channel push
        # amount cannot be higher than the capacity"), and the opener needs to
        # keep sats for the asset HTLCs it sends. Split the capacity instead.
        max_push_msat = max(0, capacity_sat // 2) * 1000
        if push_msat > max_push_msat:
            steps.append(
                {"step": "push_msat-clamped", "requested": push_msat, "used": max_push_msat}
            )
            push_msat = max_push_msat

        asset_id, source, _ = prepare_usdm_asset(asset_amount, ticker)
        steps.append({"step": "asset", "asset_id": asset_id, "source": source})

        # Idempotent: one RGB channel per peer+asset, whatever its status.
        existing = _channel_for(rln_get("/listchannels").get("channels") or [], pubkey, asset_id)
        if existing:
            steps.append({"step": "channel-exists", "status": existing.get("status")})
            self._json(
                200,
                {
                    "ok": True,
                    "reused": True,
                    "asset_id": asset_id,
                    "temporary_channel_id": existing.get("channel_id"),
                    "channel": existing,
                    "send_rgb": None,
                    "steps": steps,
                },
            )
            return

        ensure_colored_spendable(capacity_sat, steps)

        balance = rln("/assetbalance", {"asset_id": asset_id}, 30)
        if _spendable(balance) < asset_amount:
            raise RuntimeError(
                f"insufficient asset balance: {_spendable(balance)} < {asset_amount} required"
            )

        create_channel_utxo(capacity_sat)
        payload = {
            "peer_pubkey_and_opt_addr": peer,
            "capacity_sat": capacity_sat,
            "push_msat": push_msat,
            "asset_id": asset_id,
            "asset_amount": asset_amount,
            "public": False,
            "with_anchors": True,
        }
        try:
            opened = rln("/openchannel", payload, 60)
        except RuntimeError as exc:
            if "NoAvailableUtxos" not in str(exc):
                raise
            create_channel_utxo(capacity_sat)
            opened = rln("/openchannel", payload, 60)
        temporary_id = opened.get("temporary_channel_id")
        steps.append({"step": "openchannel", "temporary_channel_id": temporary_id})

        # Reference poll: wait for status "Opened". Mining here is the regtest
        # stand-in for the external miner the reference environment runs.
        deadline = time.time() + 45
        channel = None
        while time.time() < deadline:
            channels = rln_get("/listchannels").get("channels") or []
            channel = _channel_for(channels, pubkey, asset_id)
            if channel and channel.get("status") == "Opened":
                break
            mine_blocks(1)
            time.sleep(1)
        if channel:
            steps.append({"step": "channel-status", "status": channel.get("status")})

        send_rgb_result = None
        if recipient_id:
            code, send_rgb_result = send_rgb(
                asset_id, asset_amount, recipient_id, transport_endpoints
            )
            steps.append({"step": "sendrgb", "status": code})

        self._json(
            200,
            {
                "ok": True,
                "asset_id": asset_id,
                "temporary_channel_id": temporary_id,
                "channel": channel,
                "send_rgb": send_rgb_result,
                "steps": steps,
            },
        )

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
            if self.path.startswith("/lsp/bootstrap"):
                self._handle_bootstrap(body)
                return
            if self.path.startswith("/lsp/issueusdm"):
                self._handle_issueusdm()
                return
            if self.path.startswith("/lsp/sendrgb"):
                code, data = send_rgb(
                    body["asset_id"],
                    int(body["amount"]),
                    body["recipient_id"],
                    body.get("transport_endpoints", []),
                )
                self._json(code, data)
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
            if self.path.startswith("/lsp/openchannel"):
                payload = json.dumps(
                    {
                        "peer_pubkey_and_opt_addr": body["peer_pubkey_and_opt_addr"],
                        "capacity_sat": int(body.get("capacity_sat", 10000)),
                        "push_msat": int(body.get("push_msat", 5000000)),
                        "public": False,
                        "with_anchors": True,
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
