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
DELIVERIES = "/tmp/metevo_bootstrap_deliveries.json"
ISSUE_LOCK = threading.Lock()
BOOTSTRAP_LOCK = threading.Lock()
MIN_CHANNEL_CAPACITY_SAT = 30050
MAX_CHANNEL_CAPACITY_SAT = 10000000


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


def prepare_usdm_asset(asset_amount, ticker="USDM", existing_asset_ids=()):
    """Return (asset_id, source, balance) with enough spendable USDM.

    An existing peer+asset channel only needs one asset_amount (the channel is
    already funded); a fresh open needs two (channel allocation + delivery).
    """
    existing = {str(asset_id) for asset_id in existing_asset_ids}
    ticker = (ticker or "USDM").strip() or "USDM"
    listed = list_assets()
    for schema in ("nia", "uda", "cfa", "ifa"):
        for asset in listed.get(schema) or []:
            if str(asset.get("ticker") or "").upper() != ticker.upper():
                continue
            asset_id = asset["asset_id"]
            needed = asset_amount if asset_id in existing else asset_amount * 2
            balance = rln("/assetbalance", {"asset_id": asset_id}, 30)
            if _spendable(balance) >= needed:
                return asset_id, "listed", balance
    # No (or only a short) ticker match: a fresh issue is the only way forward.
    try:
        os.remove(USDM_CACHE)  # issue_usdm would otherwise return the short asset
    except OSError:
        pass
    asset_id = issue_usdm(ticker)["asset"]["asset_id"]
    mine_blocks(2)

    needed = asset_amount * 2
    deadline = time.time() + 60
    balance = {}
    while time.time() < deadline:
        balance = rln("/assetbalance", {"asset_id": asset_id}, 30)
        if _spendable(balance) >= needed:
            return asset_id, "issued", balance
        mine_blocks(1)
        time.sleep(1)
    raise RuntimeError(
        f"insufficient asset balance: {_spendable(balance)} < {needed} required"
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
    """Reference createColorableUtxosForChannel.

    AllocationsAlreadyAvailable and NoAvailableUtxos both mean the wallet
    already has (or cannot add) a colorable UTXO; openchannel retries handle
    the latter, so neither is fatal here.
    """
    try:
        rln(
            "/createutxos",
            {"up_to": False, "num": 1, "size": capacity_sat, "fee_rate": 1, "skip_sync": False},
            120,
        )
    except RuntimeError as exc:
        text = str(exc)
        if "AllocationsAlreadyAvailable" not in text and "NoAvailableUtxos" not in text:
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


def _send_rgb_error(result):
    if isinstance(result, dict):
        if result.get("error"):
            return str(result["error"])
        if result.get("raw"):
            return str(result["raw"])
    return json.dumps(result)[:400]


def delivery_key(asset_id, peer_pubkey, recipient_id):
    """One on-chain delivery per (asset, peer, blind invoice)."""
    return "|".join(
        [
            str(asset_id or "").strip(),
            str(peer_pubkey or "").strip().lower(),
            str(recipient_id or "").strip(),
        ]
    )


def load_deliveries():
    """Bootstrap deliveries persisted across helper restarts."""
    try:
        with open(DELIVERIES, encoding="utf-8") as handle:
            data = json.load(handle)
    except (OSError, ValueError):
        return {}
    return data if isinstance(data, dict) else {}


def save_deliveries(deliveries):
    # Atomic replace: a crash mid-write must not corrupt the delivery log.
    tmp = f"{DELIVERIES}.tmp"
    with open(tmp, "w", encoding="utf-8") as handle:
        json.dump(deliveries, handle)
        handle.flush()
        os.fsync(handle.fileno())
    os.replace(tmp, DELIVERIES)


def clamp_push_msat(capacity_sat, push_msat):
    """RLN rejects push > capacity; the opener also needs sats for asset HTLCs."""
    return min(push_msat, max(0, capacity_sat // 2) * 1000)


def build_openchannel_payload(peer, capacity_sat, asset_id, asset_amount, push_msat):
    """Exact reference flow4 RGB openchannel body (regular channel, no virtual mode)."""
    if not (MIN_CHANNEL_CAPACITY_SAT <= capacity_sat <= MAX_CHANNEL_CAPACITY_SAT):
        raise ValueError(
            f"capacity_sat must be between {MIN_CHANNEL_CAPACITY_SAT} and {MAX_CHANNEL_CAPACITY_SAT}"
        )
    if asset_amount <= 0:
        raise ValueError("asset_amount must be positive")
    if push_msat < 0:
        raise ValueError("push_msat must be >= 0")
    if push_msat >= capacity_sat * 1000:
        raise ValueError("push_msat must be lower than capacity_sat * 1000")
    return {
        "peer_pubkey_and_opt_addr": peer,
        "capacity_sat": capacity_sat,
        "push_msat": clamp_push_msat(capacity_sat, push_msat),
        "asset_id": asset_id,
        "asset_amount": asset_amount,
        "public": False,
        "with_anchors": True,
    }


def _channel_for(channels, pubkey, asset_id):
    for channel in channels:
        if str(channel.get("peer_pubkey") or "").lower() != pubkey.lower():
            continue
        if str(channel.get("asset_id") or "") != asset_id:
            continue
        return channel
    return None


def channel_reusable(existing):
    """Only a live/opening channel is reused; Closed/Cancelled open a new one."""
    return bool(existing) and str(existing.get("status") or "") in ("Opened", "Opening")


def wait_for_opened(pubkey, asset_id, channel, seconds=45):
    """Poll listchannels until a reused (Opening) channel reports Opened."""
    deadline = time.time() + seconds
    while time.time() < deadline:
        if channel and str(channel.get("status") or "") == "Opened":
            return channel
        mine_blocks(1)
        time.sleep(1)
        current = _channel_for(
            rln_get("/listchannels").get("channels") or [], pubkey, asset_id
        )
        if current:
            channel = current
    return channel


def reuse_blocked(channel):
    """A reused channel can only deliver once it is Opened."""
    return not channel or str(channel.get("status") or "") != "Opened"


class Handler(BaseHTTPRequestHandler):
    def _handle_bootstrap(self, body):
        # Never queue a second caller: a concurrent run means the first is
        # still opening a channel and the second would race it.
        if not BOOTSTRAP_LOCK.acquire(blocking=False):
            self._json(409, {"error": "bootstrap already running"})
            return
        try:
            try:
                self._run_bootstrap(body)
            except ValueError as exc:
                self._json(400, {"error": str(exc)})
            except Exception as exc:  # noqa: BLE001
                self._json(502, {"error": f"{type(exc).__name__}: {exc}"})
        finally:
            BOOTSTRAP_LOCK.release()

    def _run_bootstrap(self, body):
        peer = str(body.get("peer_pubkey_and_opt_addr") or "").strip()
        if "@" not in peer:
            raise ValueError("peer_pubkey_and_opt_addr must be pubkey@host:port")
        pubkey = peer.split("@", 1)[0]
        ticker = str(body.get("ticker") or "USDM").strip() or "USDM"
        try:
            capacity_sat = int(body.get("capacity_sat", 500000))
            asset_amount = int(body.get("asset_amount", 2000000000))
            push_msat = int(body.get("push_msat", 250000000))
        except (TypeError, ValueError):
            raise ValueError(
                "capacity_sat, asset_amount and push_msat must be integers"
            ) from None
        recipient_id = str(body.get("recipient_id") or "").strip() or None
        transport_endpoints = body.get("transport_endpoints") or []
        # deliver=false: open/reuse the channel only, skip the on-chain send.
        deliver_asset = body.get("deliver")
        deliver_asset = True if deliver_asset is None else bool(deliver_asset)
        steps = []

        # Clamp first, then validate: RLN cannot carry a push above capacity, and
        # the opener keeps sats for the asset HTLCs it sends.
        requested_push_msat = push_msat
        push_msat = clamp_push_msat(capacity_sat, push_msat)
        build_openchannel_payload(peer, capacity_sat, "validate", asset_amount, push_msat)
        if push_msat != requested_push_msat:
            steps.append(
                {
                    "step": "push_msat-clamped",
                    "requested": requested_push_msat,
                    "used": push_msat,
                }
            )

        peer_channels = [
            channel
            for channel in rln_get("/listchannels").get("channels") or []
            if str(channel.get("peer_pubkey") or "").lower() == pubkey.lower()
        ]
        peer_asset_ids = {
            str(channel["asset_id"])
            for channel in peer_channels
            if channel.get("asset_id")
            and str(channel.get("status") or "") in ("Opened", "Opening")
        }
        asset_id, source, _ = prepare_usdm_asset(asset_amount, ticker, peer_asset_ids)
        steps.append({"step": "asset", "asset_id": asset_id, "source": source})

        deliveries = load_deliveries()

        def deliver():
            """Delivery is idempotent per (asset, peer, blind invoice)."""
            key = delivery_key(asset_id, pubkey, recipient_id)
            stored = deliveries.get(key)
            if stored:
                steps.append({"step": "sendrgb-cached", "status": stored.get("status")})
                return stored.get("status"), stored.get("body")
            code, body = send_rgb(asset_id, asset_amount, recipient_id, transport_endpoints)
            steps.append({"step": "sendrgb", "status": code})
            if code == 200:
                deliveries[key] = {"status": code, "body": body}
                save_deliveries(deliveries)
            return code, body

        # Idempotent: one RGB channel per peer+asset while it is Opened/Opening.
        # Closed/Cancelled fall through and open a fresh channel.
        existing = _channel_for(peer_channels, pubkey, asset_id)
        if channel_reusable(existing):
            steps.append({"step": "channel-exists", "status": existing.get("status")})
            temporary_id = existing.get("channel_id")
            if recipient_id and not deliver_asset:
                self._json(
                    200,
                    {
                        "ok": True,
                        "reused": True,
                        "delivered": False,
                        "asset_id": asset_id,
                        "temporary_channel_id": temporary_id,
                        "channel": existing,
                        "send_rgb": None,
                        "steps": steps,
                    },
                )
                return
            channel = existing
            if str(channel.get("status") or "") != "Opened":
                channel = wait_for_opened(pubkey, asset_id, channel)
                steps.append(
                    {"step": "channel-status", "status": channel.get("status") if channel else None}
                )
            send_rgb_result = None
            if recipient_id:
                if reuse_blocked(channel):
                    self._json(
                        502,
                        {
                            "ok": False,
                            "error": f"channel {channel.get('status') or 'unknown'} not Opened yet",
                            "asset_id": asset_id,
                            "temporary_channel_id": temporary_id,
                            "channel": channel,
                            "send_rgb": None,
                            "steps": steps,
                        },
                    )
                    return
                stored = deliveries.get(delivery_key(asset_id, pubkey, recipient_id))
                if stored:
                    steps.append({"step": "sendrgb-cached", "status": stored.get("status")})
                    code, send_rgb_result = stored.get("status"), stored.get("body")
                else:
                    balance = rln("/assetbalance", {"asset_id": asset_id}, 30)
                    if _spendable(balance) < asset_amount:
                        self._json(
                            502,
                            {
                                "ok": False,
                                "error": f"insufficient asset balance: {_spendable(balance)} < {asset_amount} required",
                                "asset_id": asset_id,
                                "temporary_channel_id": temporary_id,
                                "channel": channel,
                                "send_rgb": None,
                                "steps": steps,
                            },
                        )
                        return
                    code, send_rgb_result = deliver()
                if code != 200:
                    self._json(
                        502,
                        {
                            "ok": False,
                            "error": _send_rgb_error(send_rgb_result),
                            "asset_id": asset_id,
                            "temporary_channel_id": temporary_id,
                            "channel": channel,
                            "send_rgb": send_rgb_result,
                            "steps": steps,
                        },
                    )
                    return
            self._json(
                200,
                {
                    "ok": True,
                    "reused": True,
                    "delivered": bool(recipient_id and send_rgb_result is not None),
                    "asset_id": asset_id,
                    "temporary_channel_id": temporary_id,
                    "channel": channel,
                    "send_rgb": send_rgb_result,
                    "steps": steps,
                },
            )
            return

        ensure_colored_spendable(capacity_sat, steps)

        create_channel_utxo(capacity_sat)
        payload = build_openchannel_payload(
            peer, capacity_sat, asset_id, asset_amount, push_msat
        )
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
        steps.append(
            {"step": "channel-status", "status": channel.get("status") if channel else None}
        )
        if not channel or channel.get("status") != "Opened":
            self._json(
                502,
                {
                    "ok": False,
                    "error": f"channel with {pubkey} for asset {asset_id} is not Opened after the poll",
                    "asset_id": asset_id,
                    "temporary_channel_id": temporary_id,
                    "channel": channel,
                    "send_rgb": None,
                    "steps": steps,
                },
            )
            return

        send_rgb_result = None
        if recipient_id and deliver_asset:
            code, send_rgb_result = deliver()
            if code != 200:
                self._json(
                    502,
                    {
                        "ok": False,
                        "error": _send_rgb_error(send_rgb_result),
                        "asset_id": asset_id,
                        "temporary_channel_id": temporary_id,
                        "channel": channel,
                        "send_rgb": send_rgb_result,
                        "steps": steps,
                    },
                )
                return

        self._json(
            200,
            {
                "ok": True,
                "delivered": bool(recipient_id and send_rgb_result is not None),
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
        try:
            body = json.loads(self.rfile.read(length) or b"{}")
        except ValueError:
            self._json(400, {"error": "invalid json"})
            return
        if not isinstance(body, dict):
            self._json(400, {"error": "body must be a JSON object"})
            return
        try:
            if self.path.startswith("/lsp/bootstrap"):
                self._handle_bootstrap(body)
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


if __name__ == "__main__":
    ThreadingHTTPServer(("0.0.0.0", 3010), Handler).serve_forever()
