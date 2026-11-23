import base64
import json
import math
import os
import re
import threading
import time
import traceback
import urllib.error
import urllib.request
import uuid
from collections import OrderedDict
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

RPC = "http://127.0.0.1:19445"
AUTH = base64.b64encode(b"admin:passw").decode()
WALLET = "bdk-test"
RLN = "http://127.0.0.1:3101"
USDM_CACHE = "/tmp/metevo_usdm_asset.json"
DELIVERIES = "/tmp/metevo_bootstrap_deliveries.json"
ISSUE_LOCK = threading.Lock()
MIN_CHANNEL_CAPACITY_SAT = 30050
MAX_CHANNEL_CAPACITY_SAT = 10000000
# RGB needs the receiver's ack, then a broadcast, then min_confirmations=1.
# Poll every 2.5 s and never give up before 10 minutes.
SETTLE_TIMEOUT_SECONDS = 600
SETTLE_POLL_SECONDS = 2.5
JOBS_MAX = 64
JOBS = OrderedDict()
JOBS_LOCK = threading.Lock()
ACTIVE_JOBS = {}
JOB_KEY_LOCKS = {}
JOB_KEY_LOCKS_LOCK = threading.Lock()


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


class AssetBusy(Exception):
    """A pinned asset cannot fund the operation; never issue a replacement."""

    def __init__(self, payload):
        super().__init__("asset_busy")
        self.payload = payload


class BootstrapFailure(Exception):
    """Failure carrying the step and RLN HTTP detail for the job record."""

    def __init__(self, step, reason, rln_status=None, rln_body=None):
        super().__init__(reason)
        self.step = step
        self.reason = reason
        self.rln_status = rln_status
        self.rln_body = rln_body


def _rln_error(exc):
    """Split `rln`'s `<path> <code>: <body>` message into (status, body)."""
    match = re.match(r"^\S+ (\d{3}): (.*)$", str(exc), re.S)
    if match:
        return int(match.group(1)), match.group(2)
    return None, str(exc)


def pinned_asset_id(request_asset_id=None):
    """Request pin wins over METEVO_PINNED_ASSET_ID; empty means unpinned."""
    return (
        str(request_asset_id or "").strip()
        or str(os.environ.get("METEVO_PINNED_ASSET_ID") or "").strip()
        or None
    )


def make_step(name, recipient_id=None, asset_id=None, http_status=None, error=None, **extra):
    """One structured step: every entry carries the same six fields."""
    entry = {
        "ts": int(time.time()),
        "step": name,
        "recipient_id": recipient_id,
        "asset_id": asset_id,
        "http_status": http_status,
        "error": error,
    }
    entry.update(extra)
    return entry


def _asset_busy_payload(asset_id, balance):
    return {
        "asset_id": asset_id,
        "spendable": _spendable(balance),
        "future": int((balance or {}).get("future") or 0),
        "offchain_outbound": int((balance or {}).get("offchain_outbound") or 0),
    }


def ticker_assets(listed, ticker):
    """NIA/UDA/CFA/IFA rows whose ticker matches (case-insensitive)."""
    wanted = (ticker or "USDM").strip().upper()
    for schema in ("nia", "uda", "cfa", "ifa"):
        for asset in listed.get(schema) or []:
            if str(asset.get("ticker") or "").upper() == wanted:
                yield asset


def issue_usdm(ticker="USDM"):
    """Issue the demo NIA once and cache it (single path for every caller).

    The whole list/delete/issue/write sequence runs under ISSUE_LOCK and starts
    with a re-list, so a second resolver that was already past its own
    list_assets() call adopts the asset the first one just issued instead of
    issuing another.
    """
    ticker = (ticker or "USDM").strip() or "USDM"
    with ISSUE_LOCK:
        existing = next(ticker_assets(list_assets(), ticker), None)
        if existing is not None:
            return {"asset": existing, "cached": True}
        try:
            os.remove(USDM_CACHE)
        except OSError:
            pass
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
                "ticker": ticker,
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


def prepare_usdm_asset(
    asset_amount,
    ticker="USDM",
    existing_asset_ids=(),
    preferred_asset_id=None,
    channel=True,
):
    """Return (asset_id, source, balance) with enough spendable USDM.

    An existing peer+asset channel only needs one asset_amount (the channel is
    already funded); a fresh channel needs two (channel allocation + delivery);
    an on-chain-only delivery needs one.

    A pin (request `asset_id` or METEVO_PINNED_ASSET_ID) is never re-issued: if
    it cannot fund the operation the caller gets AssetBusy with the balance
    breakdown. Without a pin, a ticker match is refreshed once; a fresh issue is
    the last resort because each issue burns its own colorable UTXO.
    """
    existing = {str(asset_id) for asset_id in existing_asset_ids}
    ticker = (ticker or "USDM").strip() or "USDM"
    pin = pinned_asset_id(preferred_asset_id)

    def needed(asset_id):
        if not channel or asset_id in existing:
            return asset_amount
        return asset_amount * 2

    def balance_of(asset_id):
        return rln("/assetbalance", {"asset_id": asset_id}, 30)

    def refresh(asset_id):
        try:
            rln(
                "/refreshtransfers",
                {"asset_id": asset_id, "filter": [], "skip_sync": False},
                60,
            )
        except RuntimeError:
            pass

    if pin:
        # A request pin can be stale client state (asset id from another chain,
        # or from an older run): /assetbalance then answers UnknownContractId.
        # Treat that as "no usable pin" and fall through to the operator pin.
        try:
            balance = balance_of(pin)
        except RuntimeError:
            balance = None
        if balance is not None:
            if _spendable(balance) >= needed(pin):
                return pin, "pinned", balance
            refresh(pin)
            try:
                balance = balance_of(pin)
            except RuntimeError:
                balance = None
        if balance is not None and _spendable(balance) >= needed(pin):
            return pin, "pinned-refreshed", balance
        env_pin = str(os.environ.get("METEVO_PINNED_ASSET_ID") or "").strip()
        if env_pin and env_pin != pin:
            try:
                env_balance = balance_of(env_pin)
            except RuntimeError:
                env_balance = None
            if env_balance is not None and _spendable(env_balance) >= needed(env_pin):
                return env_pin, "env-pinned", env_balance
            if env_balance is not None:
                refresh(env_pin)
                try:
                    env_balance = balance_of(env_pin)
                except RuntimeError:
                    env_balance = None
                if env_balance is not None and _spendable(env_balance) >= needed(env_pin):
                    return env_pin, "env-pinned-refreshed", env_balance
        if balance is None:
            # Unknown request pin and no usable operator pin: resolve by ticker.
            pin = None
        else:
            raise AssetBusy(_asset_busy_payload(pin, balance))

    listed = list_assets()

    def matches():
        for asset in ticker_assets(listed, ticker):
            yield asset["asset_id"]

    candidates = []
    for asset_id in matches():
        balance = balance_of(asset_id)
        if _spendable(balance) >= needed(asset_id):
            return asset_id, "listed", balance
        candidates.append(asset_id)

    if candidates:
        best_id, best_balance = None, None
        for asset_id in candidates:
            refresh(asset_id)
            balance = balance_of(asset_id)
            if _spendable(balance) >= needed(asset_id):
                return asset_id, "refreshed", balance
            if best_balance is None or _spendable(balance) > _spendable(best_balance):
                best_id, best_balance = asset_id, balance
        raise RuntimeError(
            f"no spendable {ticker}: best asset {best_id} has "
            f"{_spendable(best_balance)} < {needed(best_id)} required"
        )

    # No ticker match at all: issue_usdm owns the cache delete and, under its
    # lock, re-lists before issuing so a concurrent resolver cannot double-issue.
    asset_id = issue_usdm(ticker)["asset"]["asset_id"]
    mine_blocks(2)

    need = needed(asset_id)
    deadline = time.time() + 60
    balance = {}
    while time.time() < deadline:
        balance = rln("/assetbalance", {"asset_id": asset_id}, 30)
        if _spendable(balance) >= need:
            return asset_id, "issued", balance
        mine_blocks(1)
        time.sleep(1)
    raise RuntimeError(
        f"insufficient asset balance: {_spendable(balance)} < {need} required"
    )


def ensure_colored_spendable(capacity_sat, record):
    """Reference ensureColoredSpendable: colorable BTC >= capacity_sat."""
    balance = rln("/btcbalance", {"skip_sync": False}, 120)
    spendable = _spendable(balance.get("colored"))
    record("btcbalance", colored_spendable=spendable)
    if spendable >= capacity_sat:
        return balance

    size = max(capacity_sat, 20000)
    num = max(1, math.ceil((capacity_sat - spendable) / size))
    rln(
        "/createutxos",
        {"up_to": False, "num": num, "size": size, "fee_rate": 1, "skip_sync": False},
        120,
    )
    record("createutxos-colorable", num=num, size=size)
    mine_blocks(2)

    deadline = time.time() + 60
    while time.time() < deadline:
        balance = rln("/btcbalance", {"skip_sync": False}, 120)
        spendable = _spendable(balance.get("colored"))
        if spendable >= capacity_sat:
            record("btcbalance", colored_spendable=spendable)
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


def list_transfers(asset_id):
    return rln("/listtransfers", {"asset_id": asset_id}, 30)


def matching_transfers(transfers, recipient_id):
    """Sender-side Send transfers for one blind invoice, newest first."""
    wanted = str(recipient_id or "").strip()
    if not wanted:
        return []
    rows = [
        transfer
        for transfer in transfers
        if str(transfer.get("recipient_id") or "").strip() == wanted
        and str(transfer.get("kind") or "") in ("", "Send")
    ]
    rows.sort(key=lambda transfer: int(transfer.get("idx") or 0), reverse=True)
    return rows


def adopt_transfer(asset_id, recipient_id):
    """A non-Failed transfer already exists for this invoice: never resend."""
    for transfer in matching_transfers(
        list_transfers(asset_id).get("transfers") or [], recipient_id
    ):
        if str(transfer.get("status") or "") != "Failed":
            return transfer
    return None


def refresh_until_settled(
    asset_id,
    recipient_id,
    timeout_seconds=None,
    interval=None,
    record=None,
):
    """Poll the sender until THIS recipient's transfer settles.

    The ack is pull-only: the sender only learns about it inside
    /refreshtransfers. Poll every 2.5 s, mine only while WaitingConfirmations
    (REGTEST_AUTOMINE=1), and give the receiver up to 10 minutes.
    """
    timeout_seconds = SETTLE_TIMEOUT_SECONDS if timeout_seconds is None else timeout_seconds
    interval = SETTLE_POLL_SECONDS if interval is None else interval
    started = time.time()
    polls = 0
    mined = 0
    last = None
    while time.time() - started < timeout_seconds:
        polls += 1
        try:
            rln(
                "/refreshtransfers",
                {"asset_id": asset_id, "filter": [], "skip_sync": False},
                60,
            )
            rows = matching_transfers(
                list_transfers(asset_id).get("transfers") or [], recipient_id
            )
        except RuntimeError as exc:
            rows = []
            last = f"refresh/list failed: {exc}"
        if rows:
            transfer = rows[0]
            status = str(transfer.get("status") or "")
            detail = {
                "status": status,
                "transfer_idx": transfer.get("idx"),
                "txid": transfer.get("txid"),
                "elapsed_s": round(time.time() - started, 1),
                "polls": polls,
                "mined": mined,
            }
            if status != last and record is not None:
                record("transfer-wait", **detail)
            last = status
            if status == "Settled":
                return True, detail
            if status == "Failed":
                return False, detail
            if status == "WaitingConfirmations" and os.environ.get("REGTEST_AUTOMINE") == "1":
                try:
                    mine_blocks(1)
                    mined += 1
                except Exception:  # noqa: BLE001
                    last = f"{status} (mine failed)"
        elif last is None:
            last = "transfer not listed yet"
        time.sleep(interval)
    return False, {
        "status": last,
        "elapsed_s": round(time.time() - started, 1),
        "polls": polls,
        "mined": mined,
        "timeout": True,
    }


def send_rgb(asset_id, amount, recipient_id, transport_endpoints):
    """One on-chain send attempt: returns (status_code, body). No blind retry."""
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

    req = urllib.request.Request(
        f"{RLN}/sendrgb",
        data=payload,
        headers={"content-type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            return 200, json.loads(resp.read())
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode("utf-8", "replace")
        try:
            return exc.code, json.loads(raw)
        except ValueError:
            return exc.code, {"raw": raw[:400]}


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


_DELIVERY_LOCKS = {}
_DELIVERY_LOCKS_LOCK = threading.Lock()


def _delivery_lock(asset_id, recipient_id):
    """Serialise deliveries for one invoice; other invoices run concurrently."""
    key = (str(asset_id or ""), str(recipient_id or ""))
    with _DELIVERY_LOCKS_LOCK:
        return _DELIVERY_LOCKS.setdefault(key, threading.Lock())


def _transfer_body(transfer):
    return {
        "txid": transfer.get("txid"),
        "transfer_idx": transfer.get("idx"),
        "status": transfer.get("status"),
        "adopted": True,
    }


def remember_delivery(asset_id, peer_pubkey, recipient_id, transfer):
    """Audit cache only; /listtransfers is the source of truth."""
    try:
        deliveries = load_deliveries()
        deliveries[delivery_key(asset_id, peer_pubkey, recipient_id)] = {
            "status": 200,
            "body": _transfer_body(transfer),
        }
        save_deliveries(deliveries)
    except OSError:
        pass


def deliver_asset(
    asset_id,
    amount,
    recipient_id,
    transport_endpoints,
    steps=None,
    before_send=None,
):
    """Exactly one /sendrgb per (asset, recipient_id).

    Adopt an existing non-Failed transfer first, send at most once, and adopt
    again if the send raised but RLN created the transfer anyway. `before_send`
    runs only when there is no existing transfer to adopt, so a spendable gate
    never blocks an idempotent re-delivery.
    """
    steps = steps if steps is not None else []
    with _delivery_lock(asset_id, recipient_id):
        adopted = adopt_transfer(asset_id, recipient_id)
        if adopted:
            steps.append(
                make_step(
                    "sendrgb-adopted",
                    recipient_id=recipient_id,
                    asset_id=asset_id,
                    http_status=200,
                    transfer_idx=adopted.get("idx"),
                    status=adopted.get("status"),
                )
            )
            return 200, _transfer_body(adopted), adopted

        if before_send is not None:
            before_send()

        try:
            code, body = send_rgb(asset_id, amount, recipient_id, transport_endpoints)
        except Exception as exc:  # noqa: BLE001
            code, body = 502, {"raw": f"{type(exc).__name__}: {exc}"[:400]}

        if code != 200:
            adopted = adopt_transfer(asset_id, recipient_id)
            if adopted:
                steps.append(
                    make_step(
                        "sendrgb-adopted",
                        recipient_id=recipient_id,
                        asset_id=asset_id,
                        http_status=200,
                        transfer_idx=adopted.get("idx"),
                        status=adopted.get("status"),
                        recovered=True,
                    )
                )
                return 200, _transfer_body(adopted), adopted

        steps.append(
            make_step(
                "sendrgb",
                recipient_id=recipient_id,
                asset_id=asset_id,
                http_status=code,
                error=None if code == 200 else _send_rgb_error(body),
            )
        )
        return code, body, None


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


def _job_key(parsed):
    """One running job per (asset pin, recipient); peers may run in parallel."""
    return (
        pinned_asset_id(parsed.get("asset_id")) or "",
        str(parsed.get("recipient_id") or parsed.get("peer") or "").strip().lower(),
    )


def _job_key_lock(key):
    with JOB_KEY_LOCKS_LOCK:
        return JOB_KEY_LOCKS.setdefault(key, threading.Lock())


def _prune_jobs_locked():
    while len(JOBS) >= JOBS_MAX:
        victim = next(
            (job_id for job_id, job in JOBS.items() if job.get("state") != "running"),
            None,
        )
        if victim is None:
            return
        JOBS.pop(victim, None)


def _parse_bootstrap(body):
    peer = str(body.get("peer_pubkey_and_opt_addr") or "").strip()
    if "@" not in peer:
        raise ValueError("peer_pubkey_and_opt_addr must be pubkey@host:port")
    try:
        capacity_sat = int(body.get("capacity_sat", 500000))
        asset_amount = int(body.get("asset_amount", 2000000000))
        push_msat = int(body.get("push_msat", 250000000))
    except (TypeError, ValueError):
        raise ValueError(
            "capacity_sat, asset_amount and push_msat must be integers"
        ) from None
    deliver = body.get("deliver")
    channel = body.get("channel")
    return {
        "peer": peer,
        "capacity_sat": capacity_sat,
        "asset_amount": asset_amount,
        "push_msat": push_msat,
        "recipient_id": str(body.get("recipient_id") or "").strip() or None,
        "asset_id": pinned_asset_id(body.get("asset_id")),
        "deliver": True if deliver is None else bool(deliver),
        "channel": True if channel is None else bool(channel),
    }


def _job_record(job_id, name, **fields):
    with JOBS_LOCK:
        job = JOBS.get(job_id)
        if job is None:
            return
        fields.setdefault("recipient_id", job.get("recipient_id"))
        fields.setdefault("asset_id", job.get("asset_id"))
        job["steps"].append(make_step(name, **fields))
        job["updated_at"] = time.time()
        job["current_step"] = name
        if fields.get("asset_id"):
            job["asset_id"] = fields["asset_id"]


def start_bootstrap_job(body, run=True):
    """Create the job and answer 202 immediately; the work runs in a thread."""
    parsed = _parse_bootstrap(body)
    key = _job_key(parsed)
    with JOBS_LOCK:
        running_id = ACTIVE_JOBS.get(key)
        running = JOBS.get(running_id) if running_id else None
        if running and running.get("state") == "running":
            return 409, {
                "ok": False,
                "error": "bootstrap already running",
                "job_id": running_id,
                "recipient_id": parsed["recipient_id"],
                "asset_id": running.get("asset_id") or parsed["asset_id"],
                "state": "running",
            }
        _prune_jobs_locked()
        job_id = uuid.uuid4().hex[:12]
        JOBS[job_id] = {
            "job_id": job_id,
            "state": "running",
            "steps": [],
            "error": None,
            "result": None,
            "recipient_id": parsed["recipient_id"],
            "asset_id": parsed["asset_id"],
            "http_status": 202,
            "current_step": None,
            "started_at": time.time(),
            "updated_at": time.time(),
        }
        ACTIVE_JOBS[key] = job_id
    if run:
        threading.Thread(
            target=_run_bootstrap_job, args=(job_id, body, key), daemon=True
        ).start()
    return 202, {
        "ok": True,
        "accepted": True,
        "job_id": job_id,
        "recipient_id": parsed["recipient_id"],
        "asset_id": parsed["asset_id"],
        "state": "running",
    }


def get_job(job_id):
    with JOBS_LOCK:
        job = JOBS.get(job_id)
        if job is None:
            return None
        snapshot = dict(job)
        snapshot["steps"] = [dict(entry) for entry in job["steps"]]
        snapshot["error"] = dict(job["error"]) if job.get("error") else None
        return snapshot


def _run_bootstrap_job(job_id, body, key):
    recipient_id = str(body.get("recipient_id") or "").strip()

    def record(name, **fields):
        _job_record(job_id, name, **fields)

    try:
        with _job_key_lock(key):
            result = bootstrap_work(body, record)
        with JOBS_LOCK:
            job = JOBS.get(job_id)
            if job:
                job.update(
                    state="done",
                    result=result,
                    http_status=200,
                    current_step="done",
                    updated_at=time.time(),
                )
    except AssetBusy as exc:
        record("asset-busy", http_status=409, error="asset_busy", **exc.payload)
        with JOBS_LOCK:
            job = JOBS.get(job_id)
            if job:
                job.update(
                    state="asset_busy",
                    http_status=409,
                    asset_busy=exc.payload,
                    error={
                        "step": "asset",
                        "reason": "asset_busy",
                        "rln_status": None,
                        "rln_body": None,
                    },
                    current_step="asset-busy",
                    updated_at=time.time(),
                )
    except BootstrapFailure as exc:
        traceback.print_exc()
        print(
            f"bootstrap {job_id} failed for recipient {recipient_id}: "
            f"{exc.step}: {exc.reason}",
            flush=True,
        )
        with JOBS_LOCK:
            job = JOBS.get(job_id)
            if job:
                job.update(
                    state="failed",
                    http_status=502,
                    error={
                        "step": exc.step,
                        "reason": exc.reason,
                        "rln_status": exc.rln_status,
                        "rln_body": exc.rln_body,
                    },
                    current_step=exc.step,
                    updated_at=time.time(),
                )
    except Exception as exc:  # noqa: BLE001
        traceback.print_exc()
        print(
            f"bootstrap {job_id} failed for recipient {recipient_id}: "
            f"{type(exc).__name__}: {exc}",
            flush=True,
        )
        status, detail = _rln_error(exc) if isinstance(exc, RuntimeError) else (None, str(exc))
        with JOBS_LOCK:
            job = JOBS.get(job_id)
            if job:
                job.update(
                    state="failed",
                    http_status=502,
                    error={
                        "step": job.get("current_step") or "bootstrap",
                        "reason": str(exc),
                        "rln_status": status,
                        "rln_body": detail,
                    },
                    updated_at=time.time(),
                )
    finally:
        with JOBS_LOCK:
            if ACTIVE_JOBS.get(key) == job_id:
                ACTIVE_JOBS.pop(key, None)


def bootstrap_work(body, record):
    """Runs one bootstrap; raises BootstrapFailure/AssetBusy on failure."""
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
    deliver_wanted = body.get("deliver")
    deliver_wanted = True if deliver_wanted is None else bool(deliver_wanted)
    open_channel = body.get("channel")
    open_channel = True if open_channel is None else bool(open_channel)
    pin = pinned_asset_id(body.get("asset_id"))

    requested_push_msat = push_msat
    push_msat = clamp_push_msat(capacity_sat, push_msat)
    build_openchannel_payload(peer, capacity_sat, "validate", asset_amount, push_msat)
    if push_msat != requested_push_msat:
        record("push_msat-clamped", requested=requested_push_msat, used=push_msat)
    record("start", asset_id=pin)

    def resolve_asset(peer_channels):
        peer_asset_ids = {
            str(channel["asset_id"])
            for channel in peer_channels
            if channel.get("asset_id")
            and str(channel.get("status") or "") in ("Opened", "Opening")
        }
        asset_id, source, balance = prepare_usdm_asset(
            asset_amount,
            ticker,
            peer_asset_ids,
            pin,
            channel=open_channel,
        )
        record("asset", asset_id=asset_id, source=source, spendable=_spendable(balance))
        return asset_id

    def deliver(asset_id, before_send=None):
        send_steps = []
        code, send_body, transfer = deliver_asset(
            asset_id,
            asset_amount,
            recipient_id,
            transport_endpoints,
            steps=send_steps,
            before_send=before_send,
        )
        for entry in send_steps:
            fields = dict(entry)
            name = fields.pop("step")
            fields.pop("ts", None)
            record(name, **fields)
        if code != 200:
            raise BootstrapFailure(
                "sendrgb", _send_rgb_error(send_body), code, send_body
            )
        if transfer is not None:
            remember_delivery(asset_id, pubkey, recipient_id, transfer)
        if str((transfer or {}).get("status") or "") != "Settled":
            settled, detail = refresh_until_settled(
                asset_id, recipient_id, record=record
            )
            record("transfer-settled" if settled else "transfer-pending", **detail)
        return send_body

    asset_id = pin
    if not open_channel:
        record("channel-skipped", asset_id=asset_id)
        need_delivery = bool(recipient_id and deliver_wanted)
        if asset_id is None or need_delivery:
            asset_id = resolve_asset([])
        send_body = None
        if need_delivery:
            send_body = deliver(asset_id)
        return {
            "ok": True,
            "asset_id": asset_id,
            "temporary_channel_id": None,
            "channel": None,
            "delivered": send_body is not None,
            "send_rgb": send_body,
        }

    peer_channels = [
        channel
        for channel in rln_get("/listchannels").get("channels") or []
        if str(channel.get("peer_pubkey") or "").lower() == pubkey.lower()
    ]
    asset_id = resolve_asset(peer_channels)

    # Idempotent: one RGB channel per peer+asset while it is Opened/Opening.
    # Closed/Cancelled fall through and open a fresh channel.
    existing = _channel_for(peer_channels, pubkey, asset_id)
    if channel_reusable(existing):
        record("channel-exists", status=existing.get("status"))
        temporary_id = existing.get("channel_id")
        if recipient_id and not deliver_wanted:
            return {
                "ok": True,
                "reused": True,
                "delivered": False,
                "asset_id": asset_id,
                "temporary_channel_id": temporary_id,
                "channel": existing,
                "send_rgb": None,
            }
        channel = existing
        if str(channel.get("status") or "") != "Opened":
            channel = wait_for_opened(pubkey, asset_id, channel)
            record(
                "channel-status",
                status=channel.get("status") if channel else None,
            )
        send_body = None
        if recipient_id:
            def require_spendable():
                balance = rln("/assetbalance", {"asset_id": asset_id}, 30)
                if _spendable(balance) < asset_amount:
                    raise AssetBusy(_asset_busy_payload(asset_id, balance))

            # Adopt first: an existing transfer is delivered even when the asset
            # is locked in it, so the spendable gate runs only before a new send.
            send_body = deliver(asset_id, before_send=require_spendable)
        return {
            "ok": True,
            "reused": True,
            "delivered": bool(recipient_id and send_body is not None),
            "asset_id": asset_id,
            "temporary_channel_id": temporary_id,
            "channel": channel,
            "send_rgb": send_body,
        }

    ensure_colored_spendable(capacity_sat, record)

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
    record("openchannel", temporary_channel_id=temporary_id)

    # Reference poll: wait for status "Opened". Mining here is the regtest
    # stand-in for the external miner the reference environment runs.
    deadline = time.time() + 120
    channel = None
    while time.time() < deadline:
        channels = rln_get("/listchannels").get("channels") or []
        channel = _channel_for(channels, pubkey, asset_id)
        if channel and channel.get("status") == "Opened":
            break
        mine_blocks(1)
        time.sleep(1)
    record("channel-status", status=channel.get("status") if channel else None)

    send_body = None
    if recipient_id and deliver_wanted:
        send_body = deliver(asset_id)

    return {
        "ok": True,
        "delivered": bool(recipient_id and send_body is not None),
        "asset_id": asset_id,
        "temporary_channel_id": temporary_id,
        "channel": channel,
        "send_rgb": send_body,
    }


class Handler(BaseHTTPRequestHandler):
    def _handle_bootstrap(self, body):
        try:
            status, payload = start_bootstrap_job(body)
        except ValueError as exc:
            self._json(400, {"error": str(exc)})
            return
        self._json(status, payload)

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
        route = self.path.split("?", 1)[0]
        if route.startswith("/lsp/bootstrap/"):
            job_id = route[len("/lsp/bootstrap/") :]
            if not job_id or "/" in job_id:
                self._json(404, {"error": "unknown job"})
                return
            job = get_job(job_id)
            if job is None:
                self._json(404, {"error": "unknown job"})
            else:
                self._json(200, job)
            return
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
            route = self.path.split("?", 1)[0]
            if route == "/lsp/bootstrap":
                self._handle_bootstrap(body)
                return
            if route == "/lsp/sendrgb":
                recipient_id = str(body.get("recipient_id") or "").strip()
                if not recipient_id:
                    self._json(400, {"error": "recipient_id required"})
                    return
                code, data, _ = deliver_asset(
                    body["asset_id"],
                    int(body["amount"]),
                    recipient_id,
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
