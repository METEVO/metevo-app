import json
import os
import sys
import tempfile
import threading
import time
import unittest
import urllib.error
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import mobile_helper as helper  # noqa: E402

PEER = "02e1c0ffee@127.0.0.1:9802"
ASSET = "rgb:DZgCsckL-wpY4~WV-NDRptzz-KtAy9r3-qwylBY9-cgLewQg"
RECIPIENT = "bcrt:utxob:one"


class BuildOpenChannelPayloadTest(unittest.TestCase):
    def test_exact_reference_flow4_body(self):
        payload = helper.build_openchannel_payload(PEER, 500000, ASSET, 2000000000, 250000000)
        self.assertEqual(
            set(payload),
            {
                "peer_pubkey_and_opt_addr",
                "capacity_sat",
                "push_msat",
                "asset_id",
                "asset_amount",
                "public",
                "with_anchors",
            },
        )
        self.assertNotIn("virtual_open_mode", payload)
        self.assertEqual(payload["peer_pubkey_and_opt_addr"], PEER)
        self.assertEqual(payload["capacity_sat"], 500000)
        self.assertEqual(payload["push_msat"], 250000000)
        self.assertEqual(payload["asset_id"], ASSET)
        self.assertEqual(payload["asset_amount"], 2000000000)
        self.assertIs(payload["public"], False)
        self.assertIs(payload["with_anchors"], True)

    def test_push_clamped_to_half_capacity(self):
        payload = helper.build_openchannel_payload(PEER, 500000, ASSET, 2000000000, 400000000)
        self.assertEqual(payload["push_msat"], 250000000)

    def test_default_channel_numbers_are_unchanged(self):
        payload = helper.build_openchannel_payload(PEER, 500000, ASSET, 2000000000, 250000000)
        self.assertEqual(payload["push_msat"], 250000000)
        self.assertGreaterEqual(payload["capacity_sat"], helper.MIN_CHANNEL_CAPACITY_SAT)

    def test_rejects_capacity_below_rgb_minimum(self):
        with self.assertRaises(ValueError):
            helper.build_openchannel_payload(PEER, 30049, ASSET, 2000000000, 0)

    def test_rejects_capacity_above_maximum(self):
        with self.assertRaises(ValueError):
            helper.build_openchannel_payload(PEER, 10000001, ASSET, 2000000000, 0)

    def test_rejects_push_at_or_above_capacity(self):
        with self.assertRaises(ValueError):
            helper.build_openchannel_payload(PEER, 30050, ASSET, 2000000000, 30050000)

    def test_rejects_negative_push(self):
        with self.assertRaises(ValueError):
            helper.build_openchannel_payload(PEER, 500000, ASSET, 2000000000, -1)

    def test_rejects_non_positive_asset_amount(self):
        with self.assertRaises(ValueError):
            helper.build_openchannel_payload(PEER, 500000, ASSET, 0, 0)


class ChannelReuseTest(unittest.TestCase):
    def test_channel_for_matches_peer_and_asset(self):
        rows = [
            {"peer_pubkey": "aa", "asset_id": "rgb:other"},
            {"peer_pubkey": PEER.split("@")[0].upper(), "asset_id": ASSET, "status": "Closed"},
        ]
        found = helper._channel_for(rows, PEER.split("@")[0], ASSET)
        self.assertIs(found, rows[1])

    def test_channel_for_requires_asset(self):
        rows = [{"peer_pubkey": PEER.split("@")[0], "asset_id": None}]
        self.assertIsNone(helper._channel_for(rows, PEER.split("@")[0], ASSET))

    def test_channel_reusable_only_open_or_opening(self):
        self.assertFalse(helper.channel_reusable(None))
        self.assertFalse(helper.channel_reusable({}))
        self.assertTrue(helper.channel_reusable({"status": "Opened"}))
        self.assertTrue(helper.channel_reusable({"status": "Opening"}))
        self.assertFalse(helper.channel_reusable({"status": "Closed"}))
        self.assertFalse(helper.channel_reusable({"status": "Cancelled"}))


class DeliveryKeyTest(unittest.TestCase):
    def test_deterministic(self):
        one = helper.delivery_key(ASSET, "02AbC", "bcrt:utxob:xyz")
        two = helper.delivery_key(ASSET, "02AbC", "bcrt:utxob:xyz")
        self.assertEqual(one, two)

    def test_order_independent_kwargs(self):
        one = helper.delivery_key(
            recipient_id="bcrt:utxob:xyz", asset_id=ASSET, peer_pubkey="02AbC"
        )
        two = helper.delivery_key(
            peer_pubkey="02AbC", asset_id=ASSET, recipient_id="bcrt:utxob:xyz"
        )
        self.assertEqual(one, two)

    def test_normalises_peer_case_and_whitespace(self):
        self.assertEqual(
            helper.delivery_key(ASSET, "02AbC", "bcrt:utxob:xyz"),
            helper.delivery_key(f" {ASSET} ", " 02abc ", " bcrt:utxob:xyz "),
        )

    def test_different_recipients_differ(self):
        self.assertNotEqual(
            helper.delivery_key(ASSET, "02AbC", "bcrt:utxob:one"),
            helper.delivery_key(ASSET, "02AbC", "bcrt:utxob:two"),
        )


class ReuseGateTest(unittest.TestCase):
    def test_only_opened_channels_may_deliver(self):
        self.assertFalse(helper.reuse_blocked({"status": "Opened"}))
        self.assertTrue(helper.reuse_blocked({"status": "Opening"}))
        self.assertTrue(helper.reuse_blocked({"status": "Closed"}))
        self.assertTrue(helper.reuse_blocked({"status": None}))
        self.assertTrue(helper.reuse_blocked(None))


class StubMixin(unittest.TestCase):
    """Restore patched module globals and registry state after every test."""

    PATCHED = (
        "rln",
        "rln_get",
        "send_rgb",
        "mine_blocks",
        "bootstrap_work",
        "prepare_usdm_asset",
        "refresh_until_settled",
        "remember_delivery",
        "USDM_CACHE",
        "DELIVERIES",
        "PEER_LEDGER",
    )
    ENV = ("METEVO_PINNED_ASSET_ID", "REGTEST_AUTOMINE")

    def setUp(self):
        self._saved = {
            name: getattr(helper, name)
            for name in self.PATCHED
            if hasattr(helper, name)
        }
        # Never touch the real ledger from a test.
        self._ledger_path = tempfile.mktemp(prefix="metevo-test-ledger-", suffix=".json")
        helper.PEER_LEDGER = self._ledger_path
        self._env = {name: os.environ.get(name) for name in self.ENV}
        for name in ("JOBS", "ACTIVE_JOBS", "JOB_KEY_LOCKS"):
            registry = getattr(helper, name, None)
            if registry is not None:
                registry.clear()

    def tearDown(self):
        for name, value in self._saved.items():
            setattr(helper, name, value)
        for path in (self._ledger_path, f"{self._ledger_path}.tmp"):
            try:
                os.remove(path)
            except OSError:
                pass
        for name, value in self._env.items():
            if value is None:
                os.environ.pop(name, None)
            else:
                os.environ[name] = value
        for name in ("JOBS", "ACTIVE_JOBS", "JOB_KEY_LOCKS"):
            registry = getattr(helper, name, None)
            if registry is not None:
                registry.clear()


class FakeTransfers:
    """Stub for rln(): /listtransfers reflects a shared transfer list."""

    def __init__(self, transfers):
        self.transfers = transfers
        self.calls = []

    def __call__(self, path, payload=None, timeout=60, tolerate_allocation=False):
        self.calls.append((path, payload))
        if path == "/listtransfers":
            return {"transfers": [dict(row) for row in self.transfers]}
        if path == "/refreshtransfers":
            return {}
        raise AssertionError(f"unexpected rln call: {path}")


class DeliveryConcurrencyTest(StubMixin):
    def test_five_concurrent_sends_for_same_recipient_call_sendrgb_once(self):
        transfers = []
        calls = []
        helper.rln = FakeTransfers(transfers)

        def fake_send(asset_id, amount, recipient_id, transport_endpoints):
            time.sleep(0.02)
            calls.append(recipient_id)
            row = {
                "idx": len(calls),
                "status": "WaitingCounterparty",
                "recipient_id": recipient_id,
                "kind": "Send",
                "txid": f"tx{len(calls)}",
            }
            transfers.append(row)
            return 200, {"txid": row["txid"]}

        helper.send_rgb = fake_send
        results = []
        results_lock = threading.Lock()

        def worker():
            code, _body, _transfer = helper.deliver_asset(
                ASSET, 10, RECIPIENT, []
            )
            with results_lock:
                results.append(code)

        threads = [threading.Thread(target=worker) for _ in range(5)]
        for thread in threads:
            thread.start()
        for thread in threads:
            thread.join(5)

        self.assertEqual(len(calls), 1, "sendrgb must run exactly once")
        self.assertEqual(results, [200] * 5)
        self.assertNotIn(502, results)

    def test_existing_transfer_is_adopted_without_send(self):
        transfers = [
            {
                "idx": 7,
                "status": "WaitingConfirmations",
                "recipient_id": RECIPIENT,
                "kind": "Send",
                "txid": "already",
            }
        ]
        helper.rln = FakeTransfers(transfers)
        helper.send_rgb = lambda *args, **kwargs: self.fail("sendrgb must not run")

        code, body, transfer = helper.deliver_asset(ASSET, 10, RECIPIENT, [])

        self.assertEqual(code, 200)
        self.assertTrue(body["adopted"])
        self.assertEqual(transfer["txid"], "already")

    def test_failed_transfer_is_not_adopted(self):
        transfers = [
            {
                "idx": 7,
                "status": "Failed",
                "recipient_id": RECIPIENT,
                "kind": "Send",
                "txid": "failed",
            }
        ]
        helper.rln = FakeTransfers(transfers)
        sent = []

        def fake_send(*_args):
            sent.append(1)
            row = {
                "idx": 8,
                "status": "WaitingCounterparty",
                "recipient_id": RECIPIENT,
                "kind": "Send",
                "txid": "fresh",
            }
            transfers.append(row)
            return 200, {"txid": "fresh"}

        helper.send_rgb = fake_send
        code, body, transfer = helper.deliver_asset(ASSET, 10, RECIPIENT, [])

        self.assertEqual(code, 200)
        self.assertEqual(len(sent), 1)
        self.assertNotEqual(code, 502)
        self.assertIsNone(transfer)
        self.assertEqual(body["txid"], "fresh")

    def test_send_raises_but_transfer_exists_is_success(self):
        transfers = []
        helper.rln = FakeTransfers(transfers)

        def exploding_send(asset_id, amount, recipient_id, transport_endpoints):
            transfers.append(
                {
                    "idx": 9,
                    "status": "WaitingCounterparty",
                    "recipient_id": recipient_id,
                    "kind": "Send",
                    "txid": "created",
                }
            )
            raise RuntimeError("transport exploded")

        helper.send_rgb = exploding_send
        code, body, transfer = helper.deliver_asset(ASSET, 10, RECIPIENT, [])

        self.assertEqual(code, 200)
        self.assertEqual(transfer["txid"], "created")
        self.assertTrue(body["adopted"])


class BootstrapJobTest(StubMixin):
    def setUp(self):
        super().setUp()
        # The idempotency pre-check reads RLN; keep tests off the live node.
        helper.rln = FakeTransfers([])
        helper.rln_get = lambda path, timeout=30: {"channels": []}

    def _body(self, recipient=RECIPIENT):
        return {
            "peer_pubkey_and_opt_addr": PEER,
            "recipient_id": recipient,
            "transport_endpoints": ["http://127.0.0.1:3005/json-rpc"],
            "ticker": "USDM",
            "asset_id": ASSET,
            "channel": False,
            "deliver": False,
        }

    def _wait(self, job_id, timeout=3):
        deadline = time.time() + timeout
        while time.time() < deadline:
            job = helper.get_job(job_id)
            if job and job.get("state") != "running":
                return job
            time.sleep(0.01)
        self.fail(f"job {job_id} did not finish")

    def test_returns_202_with_job_record(self):
        helper.bootstrap_work = lambda body, record: {"ok": True, "asset_id": ASSET}
        status, payload = helper.start_bootstrap_job(self._body())

        self.assertEqual(status, 202)
        self.assertTrue(payload["ok"])
        self.assertTrue(payload["accepted"])
        self.assertEqual(payload["state"], "running")
        self.assertEqual(payload["recipient_id"], RECIPIENT)
        self.assertEqual(payload["asset_id"], ASSET)
        self.assertIn("job_id", payload)

        job = self._wait(payload["job_id"])
        self.assertEqual(job["state"], "done")
        self.assertEqual(job["http_status"], 200)
        self.assertIsNone(job["error"])
        for field in ("job_id", "recipient_id", "asset_id", "started_at", "updated_at", "steps"):
            self.assertIn(field, job)

    def test_identical_concurrent_requests_conflict_per_peer(self):
        entered = threading.Event()
        release = threading.Event()

        def blocking_work(body, record):
            record("blocked")
            entered.set()
            release.wait(5)
            return {"ok": True}

        helper.bootstrap_work = blocking_work
        status, first = helper.start_bootstrap_job(self._body())
        self.assertEqual(status, 202)
        self.assertTrue(entered.wait(2))
        try:
            # A second invoice for the same peer must not race the first job.
            status_same, body_same = helper.start_bootstrap_job(self._body())
            self.assertEqual(status_same, 409)
            self.assertEqual(body_same["job_id"], first["job_id"])

            status_other, other = helper.start_bootstrap_job(
                {
                    **self._body("bcrt:utxob:two"),
                    "peer_pubkey_and_opt_addr": "02deadbeef@127.0.0.1:9802",
                }
            )
            self.assertEqual(status_other, 202)
            self.assertNotEqual(other["job_id"], first["job_id"])
        finally:
            release.set()
            self._wait(first["job_id"])

    def test_failure_stores_step_and_rln_detail(self):
        def failing_work(body, record):
            record("sendrgb")
            raise helper.BootstrapFailure("sendrgb", "boom", 500, '{"error":"boom"}')

        helper.bootstrap_work = failing_work
        _status, payload = helper.start_bootstrap_job(self._body())
        job = self._wait(payload["job_id"])

        self.assertEqual(job["state"], "failed")
        self.assertEqual(job["http_status"], 502)
        self.assertEqual(
            set(job["error"]),
            {"step", "reason", "rln_status", "rln_body"},
        )
        self.assertEqual(job["error"]["step"], "sendrgb")
        self.assertEqual(job["error"]["rln_status"], 500)
        self.assertEqual(job["steps"][0]["step"], "sendrgb")
        self.assertEqual(job["steps"][0]["recipient_id"], RECIPIENT)

    def test_asset_busy_is_recorded_with_breakdown(self):
        payload = {
            "asset_id": ASSET,
            "spendable": 1,
            "future": 2,
            "offchain_outbound": 3,
        }

        def busy_work(body, record):
            raise helper.AssetBusy(payload)

        helper.bootstrap_work = busy_work
        _status, accepted = helper.start_bootstrap_job(self._body())
        job = self._wait(accepted["job_id"])

        self.assertEqual(job["state"], "asset_busy")
        self.assertEqual(job["http_status"], 409)
        self.assertEqual(job["asset_busy"], payload)
        self.assertEqual(job["error"]["reason"], "asset_busy")

    def test_unknown_job_is_none(self):
        self.assertIsNone(helper.get_job("missing"))


class PinnedAssetTest(StubMixin):
    PIN = "rgb:pin"

    def test_pinned_short_returns_asset_busy_and_never_issues(self):
        os.environ["METEVO_PINNED_ASSET_ID"] = self.PIN
        calls = []

        def fake_rln(path, payload=None, timeout=60, tolerate_allocation=False):
            calls.append(path)
            if path == "/assetbalance":
                return {"spendable": 5, "future": 7, "offchain_outbound": 9}
            if path == "/refreshtransfers":
                return {}
            raise AssertionError(f"unexpected call {path}")

        helper.rln = fake_rln
        with self.assertRaises(helper.AssetBusy) as caught:
            helper.prepare_usdm_asset(100, channel=False)

        self.assertEqual(
            caught.exception.payload,
            {
                "asset_id": self.PIN,
                "spendable": 5,
                "future": 7,
                "offchain_outbound": 9,
            },
        )
        self.assertNotIn("/issueassetnia", calls)
        self.assertNotIn("/listassets", calls)

    def test_request_pin_wins_over_env(self):
        os.environ["METEVO_PINNED_ASSET_ID"] = "rgb:env"
        asked = []

        def fake_rln(path, payload=None, timeout=60, tolerate_allocation=False):
            if path == "/assetbalance":
                asked.append(payload["asset_id"])
                return {"spendable": 100, "future": 0, "offchain_outbound": 0}
            raise AssertionError(f"unexpected call {path}")

        helper.rln = fake_rln
        asset_id, source, _balance = helper.prepare_usdm_asset(
            100, preferred_asset_id="rgb:request", channel=False
        )

        self.assertEqual(asset_id, "rgb:request")
        self.assertEqual(source, "pinned")
        self.assertEqual(asked, ["rgb:request"])

    def test_pinned_sufficient_skips_refresh(self):
        os.environ["METEVO_PINNED_ASSET_ID"] = self.PIN
        calls = []

        def fake_rln(path, payload=None, timeout=60, tolerate_allocation=False):
            calls.append(path)
            return {"spendable": 1000, "future": 0, "offchain_outbound": 0}

        helper.rln = fake_rln
        asset_id, source, _balance = helper.prepare_usdm_asset(100, channel=True)

        self.assertEqual(asset_id, self.PIN)
        self.assertEqual(source, "pinned")
        self.assertEqual(calls, ["/assetbalance"])


class SettleLoopTest(StubMixin):
    def _stub(self, statuses):
        position = {"i": 0}

        def fake_rln(path, payload=None, timeout=60, tolerate_allocation=False):
            if path == "/refreshtransfers":
                return {}
            if path == "/listtransfers":
                index = min(position["i"], len(statuses) - 1)
                position["i"] += 1
                return {
                    "transfers": [
                        {
                            "idx": 99,
                            "status": "Settled",
                            "recipient_id": "bcrt:utxob:other",
                            "kind": "Send",
                        },
                        {
                            "idx": 2,
                            "status": statuses[index],
                            "recipient_id": RECIPIENT,
                            "kind": "Send",
                        },
                    ]
                }
            raise AssertionError(f"unexpected call {path}")

        helper.rln = fake_rln

    def test_polls_only_this_recipient_and_mines_only_on_confirmations(self):
        os.environ["REGTEST_AUTOMINE"] = "1"
        self._stub(["WaitingCounterparty", "WaitingConfirmations", "Settled"])
        mines = []
        helper.mine_blocks = lambda count: mines.append(count)

        settled, detail = helper.refresh_until_settled(
            ASSET, RECIPIENT, timeout_seconds=5, interval=0.001
        )

        self.assertTrue(settled)
        self.assertEqual(detail["status"], "Settled")
        self.assertEqual(detail["polls"], 3)
        self.assertEqual(mines, [1], "one block per WaitingConfirmations poll")

    def test_failed_transfer_stops_the_loop(self):
        self._stub(["Failed"])
        helper.mine_blocks = lambda count: None

        settled, detail = helper.refresh_until_settled(
            ASSET, RECIPIENT, timeout_seconds=5, interval=0.001
        )

        self.assertFalse(settled)
        self.assertEqual(detail["status"], "Failed")
        self.assertEqual(detail["polls"], 1)

    def test_defaults_are_ten_minutes_and_two_to_three_seconds(self):
        self.assertEqual(helper.SETTLE_TIMEOUT_SECONDS, 600)
        self.assertGreaterEqual(helper.SETTLE_POLL_SECONDS, 2)
        self.assertLessEqual(helper.SETTLE_POLL_SECONDS, 3)

    def test_transition_steps_are_recorded(self):
        os.environ["REGTEST_AUTOMINE"] = "0"
        self._stub(["WaitingCounterparty", "WaitingConfirmations", "Settled"])
        helper.mine_blocks = lambda count: None
        steps = []

        def record(name, **fields):
            steps.append(helper.make_step(name, **fields))

        settled, _detail = helper.refresh_until_settled(
            ASSET, RECIPIENT, timeout_seconds=5, interval=0.001, record=record
        )

        self.assertTrue(settled)
        self.assertEqual(
            [entry["status"] for entry in steps],
            ["WaitingCounterparty", "WaitingConfirmations", "Settled"],
        )
        self.assertTrue(all(entry["step"] == "transfer-wait" for entry in steps))


class StructuredStepTest(unittest.TestCase):
    def test_every_step_has_the_six_fields(self):
        entry = helper.make_step(
            "sendrgb",
            recipient_id=RECIPIENT,
            asset_id=ASSET,
            http_status=200,
        )
        self.assertEqual(
            set(entry),
            {
                "ts",
                "step",
                "recipient_id",
                "asset_id",
                "http_status",
                "error",
            },
        )
        self.assertIsInstance(entry["ts"], int)


class EmptyRecipientTest(StubMixin):
    def test_matching_transfers_rejects_blank_recipient(self):
        rows = [
            {
                "idx": 1,
                "status": "WaitingCounterparty",
                "recipient_id": RECIPIENT,
                "kind": "Send",
            }
        ]
        self.assertEqual(helper.matching_transfers(rows, ""), [])
        self.assertEqual(helper.matching_transfers(rows, "   "), [])
        self.assertEqual(len(helper.matching_transfers(rows, RECIPIENT)), 1)


class IssueRaceTest(StubMixin):
    def setUp(self):
        super().setUp()
        self.cache = tempfile.mktemp(prefix="metevo-test-usdm-", suffix=".json")
        helper.USDM_CACHE = self.cache
        self.assets = {"nia": []}
        self.issue_calls = 0
        self.calls_lock = threading.Lock()

    def tearDown(self):
        try:
            os.remove(self.cache)
        except OSError:
            pass
        super().tearDown()

    def test_concurrent_no_pin_resolves_issue_once(self):
        def fake_rln(path, payload=None, timeout=60, tolerate_allocation=False):
            if path == "/listassets":
                return {"nia": [dict(row) for row in self.assets["nia"]]}
            if path == "/createutxos":
                return {}
            if path == "/issueassetnia":
                with self.calls_lock:
                    self.issue_calls += 1
                asset = {
                    "asset_id": "rgb:issued",
                    "ticker": "USDM",
                    "precision": 8,
                    "issued_supply": 10000000000,
                }
                self.assets["nia"].append(asset)
                return {"asset": asset}
            if path == "/assetbalance":
                return {"spendable": 100, "future": 100, "offchain_outbound": 0}
            if path == "/refreshtransfers":
                return {}
            raise AssertionError(f"unexpected rln call: {path}")

        helper.rln = fake_rln
        helper.mine_blocks = lambda count: None

        results = []
        results_lock = threading.Lock()

        def worker():
            asset_id, source, _balance = helper.prepare_usdm_asset(
                100, channel=False
            )
            with results_lock:
                results.append((asset_id, source))

        threads = [threading.Thread(target=worker) for _ in range(2)]
        for thread in threads:
            thread.start()
        for thread in threads:
            thread.join(5)

        self.assertEqual(self.issue_calls, 1, "only one /issueassetnia")
        self.assertEqual([row[0] for row in results], ["rgb:issued", "rgb:issued"])
        self.assertEqual(len(results), 2)


class ReusedChannelAdoptTest(StubMixin):
    def _run(self, transfers, spendable, sent):
        def fake_rln(path, payload=None, timeout=30, tolerate_allocation=False):
            if path == "/listtransfers":
                return {"transfers": [dict(row) for row in transfers]}
            if path == "/assetbalance":
                return {
                    "spendable": spendable,
                    "future": spendable,
                    "offchain_outbound": 0,
                }
            if path == "/refreshtransfers":
                return {}
            raise AssertionError(f"unexpected rln call: {path}")

        helper.rln = fake_rln
        helper.rln_get = lambda path, timeout=30: {
            "channels": [
                {
                    "peer_pubkey": PEER.split("@")[0],
                    "asset_id": ASSET,
                    "status": "Opened",
                    "channel_id": "chan-1",
                }
            ]
        }
        helper.prepare_usdm_asset = lambda *args, **kwargs: (ASSET, "pinned", {})
        helper.refresh_until_settled = lambda *args, **kwargs: (
            True,
            {"status": "Settled"},
        )
        helper.remember_delivery = lambda *args, **kwargs: None

        def fake_send(*_args, **_kwargs):
            sent.append(1)
            return 200, {"txid": "new"}

        helper.send_rgb = fake_send
        return helper.bootstrap_work(
            {
                "peer_pubkey_and_opt_addr": PEER,
                "recipient_id": RECIPIENT,
                "channel": True,
                "deliver": True,
                "ticker": "USDM",
                "asset_id": ASSET,
            },
            lambda name, **fields: None,
        )

    def test_existing_transfer_wins_before_spendable_gate(self):
        sent = []
        result = self._run(
            transfers=[
                {
                    "idx": 5,
                    "status": "WaitingConfirmations",
                    "recipient_id": RECIPIENT,
                    "kind": "Send",
                    "txid": "old",
                }
            ],
            spendable=0,
            sent=sent,
        )

        self.assertTrue(result["ok"])
        self.assertTrue(result["delivered"])
        self.assertTrue(result["send_rgb"]["adopted"])
        self.assertEqual(result["send_rgb"]["txid"], "old")
        self.assertEqual(sent, [], "adopted delivery must not send")

    def test_no_existing_transfer_gates_on_spendable(self):
        sent = []
        with self.assertRaises(helper.AssetBusy) as caught:
            self._run(transfers=[], spendable=0, sent=sent)

        self.assertEqual(caught.exception.payload["spendable"], 0)
        self.assertEqual(caught.exception.payload["asset_id"], ASSET)
        self.assertEqual(sent, [], "asset_busy must fire before a send")


class PeerBootstrapIdempotencyTest(StubMixin):
    """A repeat bootstrap for one peer costs two reads and never sends again."""

    PUBKEY = PEER.split("@")[0]

    def setUp(self):
        super().setUp()
        os.environ["METEVO_PINNED_ASSET_ID"] = ASSET
        self.channels = []
        self.transfers = []
        self.events = []
        self.sends = 0

        def fake_rln(path, payload=None, timeout=60, tolerate_allocation=False):
            self.events.append(path)
            if path == "/listtransfers":
                return {"transfers": [dict(row) for row in self.transfers]}
            if path == "/refreshtransfers":
                return {}
            if path == "/assetbalance":
                return {"settled": 10**9, "future": 10**9, "spendable": 10**9}
            raise AssertionError(f"unexpected rln call: {path}")

        helper.rln = fake_rln
        helper.rln_get = lambda path, timeout=30: {
            "channels": [dict(row) for row in self.channels]
        }
        helper.mine_blocks = lambda count: None
        helper.remember_delivery = lambda *args, **kwargs: None

    def _settle_ledger(self, txid="tx-settled", status="Settled"):
        helper._save_peer_mutation(
            self.PUBKEY,
            ASSET,
            2000000000,
            delivery={"recipient_id": RECIPIENT, "txid": txid, "status": status},
        )

    def test_repeat_with_settled_delivery_is_existing_with_zero_sends(self):
        self._settle_ledger()

        payload = helper.existing_bootstrap(
            self.PUBKEY, ASSET, RECIPIENT, amount=2000000000
        )

        self.assertTrue(payload["existing"])
        self.assertTrue(payload["delivered"])
        self.assertEqual(payload["asset_id"], ASSET)
        self.assertEqual(payload["delivery"]["txid"], "tx-settled")
        self.assertEqual(payload["lsp_balance"]["settled"], 10**9)
        self.assertNotIn("/sendrgb", self.events)
        self.assertNotIn("/openchannel", self.events)
        self.assertEqual(helper.load_peer_ledger()[self.PUBKEY]["amount"], 2000000000)
        self.assertEqual(
            set(payload["delivery"]), {"recipient_id", "txid", "status"}
        )

    def test_repeat_with_opened_channel_is_existing_with_no_open_or_send(self):
        self.channels = [
            {
                "peer_pubkey": self.PUBKEY,
                "asset_id": ASSET,
                "status": "Opened",
                "channel_id": "chan-1",
                "capacity_sat": 500000,
                "funding_txid": "fund-1",
            }
        ]

        payload = helper.existing_bootstrap(self.PUBKEY, ASSET, RECIPIENT)

        self.assertTrue(payload["existing"])
        self.assertTrue(payload["delivered"])
        self.assertEqual(payload["channel"]["status"], "Opened")
        self.assertNotIn("/sendrgb", self.events)
        self.assertNotIn("/openchannel", self.events)

    def test_opened_channel_is_recorded_for_the_peer(self):
        self.channels = [
            {
                "peer_pubkey": self.PUBKEY,
                "asset_id": ASSET,
                "status": "Opened",
                "channel_id": "chan-1",
                "capacity_sat": 500000,
            }
        ]
        helper._save_peer_mutation(self.PUBKEY, ASSET, 2000000000)

        helper.reconcile_peer(self.PUBKEY, ASSET)

        record = helper.load_peer_ledger()[self.PUBKEY]
        self.assertEqual(record["channel"]["channel_id"], "chan-1")
        self.assertEqual(record["channel"]["status"], "Opened")
        self.assertEqual(record["channel"]["capacity_sat"], 500000)

    def test_fresh_peer_runs_exactly_one_send(self):
        self.assertIsNone(helper.existing_bootstrap(self.PUBKEY, ASSET, RECIPIENT))
        helper.prepare_usdm_asset = lambda *args, **kwargs: (ASSET, "pinned", {})
        helper.refresh_until_settled = lambda *args, **kwargs: (
            True,
            {"status": "Settled"},
        )

        def fake_send(asset_id, amount, recipient_id, transport_endpoints):
            self.sends += 1
            self.transfers.append(
                {
                    "idx": 11,
                    "status": "Settled",
                    "recipient_id": recipient_id,
                    "kind": "Send",
                    "txid": "tx-new",
                }
            )
            return 200, {"txid": "tx-new"}

        helper.send_rgb = fake_send
        result = helper.bootstrap_work(
            {
                "peer_pubkey_and_opt_addr": PEER,
                "recipient_id": RECIPIENT,
                "channel": False,
                "deliver": True,
                "ticker": "USDM",
                "asset_id": ASSET,
            },
            lambda name, **fields: None,
        )

        self.assertEqual(self.sends, 1)
        self.assertTrue(result["delivered"])
        record = helper.load_peer_ledger()[self.PUBKEY]
        self.assertEqual(record["asset_id"], ASSET)
        self.assertEqual(record["amount"], 2000000000)
        self.assertEqual(record["deliveries"][0]["txid"], "tx-new")
        self.assertEqual(record["deliveries"][0]["status"], "Settled")
        # A repeat now answers from the ledger, not from a new send.
        self.assertTrue(helper.existing_bootstrap(self.PUBKEY, ASSET, RECIPIENT)["existing"])
        self.assertEqual(self.sends, 1)

    def test_pending_transfer_counts_as_existing_and_is_not_resent(self):
        self.transfers = [
            {
                "idx": 4,
                "status": "WaitingCounterparty",
                "recipient_id": RECIPIENT,
                "kind": "Send",
                "txid": "tx-pending",
            }
        ]

        payload = helper.existing_bootstrap(self.PUBKEY, ASSET, RECIPIENT)

        self.assertTrue(payload["existing"])
        self.assertEqual(payload["delivery"]["status"], "WaitingCounterparty")
        self.assertEqual(payload["delivery"]["txid"], "tx-pending")
        self.assertNotIn("/sendrgb", self.events)

    def test_failed_transfer_is_not_existing(self):
        self.transfers = [
            {
                "idx": 5,
                "status": "Failed",
                "recipient_id": RECIPIENT,
                "kind": "Send",
                "txid": "tx-failed",
            }
        ]

        self.assertIsNone(helper.existing_bootstrap(self.PUBKEY, ASSET, RECIPIENT))

    def test_ledger_survives_a_restart(self):
        self._settle_ledger(txid="tx-restart")
        # A restart loses process memory only; the file is the ledger.
        reloaded = helper.load_peer_ledger()
        self.assertEqual(reloaded[self.PUBKEY]["deliveries"][0]["txid"], "tx-restart")
        self.assertFalse(os.path.exists(f"{helper.PEER_LEDGER}.tmp"))

    def test_concurrent_reposts_for_one_peer_send_once(self):
        entered = threading.Event()
        release = threading.Event()
        sends = []

        def slow_work(body, record):
            entered.set()
            release.wait(5)
            sends.append(1)
            return {"ok": True}

        helper.bootstrap_work = slow_work
        body = {
            "peer_pubkey_and_opt_addr": PEER,
            "recipient_id": RECIPIENT,
            "channel": False,
            "deliver": True,
            "ticker": "USDM",
            "asset_id": ASSET,
        }
        status_first, first = helper.start_bootstrap_job(body)
        self.assertEqual(status_first, 202)
        self.assertTrue(entered.wait(2))
        try:
            status_second, second = helper.start_bootstrap_job(
                {**body, "recipient_id": "bcrt:utxob:second"}
            )
            self.assertEqual(status_second, 409)
            self.assertEqual(second["job_id"], first["job_id"])
        finally:
            release.set()
        deadline = time.time() + 3
        while time.time() < deadline:
            job = helper.get_job(first["job_id"])
            if job and job.get("state") != "running":
                break
            time.sleep(0.01)
        self.assertEqual(sends, [1], "one send for one peer")


class ChannelOnlyAssetTest(StubMixin):
    def test_channel_false_deliver_false_still_resolves_asset(self):
        calls = []

        def fake_prepare(*args, **kwargs):
            calls.append((args, kwargs))
            return ASSET, "listed", {"spendable": 1}

        helper.prepare_usdm_asset = fake_prepare
        result = helper.bootstrap_work(
            {
                "peer_pubkey_and_opt_addr": PEER,
                "channel": False,
                "deliver": False,
                "ticker": "USDM",
            },
            lambda name, **fields: None,
        )

        self.assertEqual(result["asset_id"], ASSET)
        self.assertFalse(result["delivered"])
        self.assertEqual(len(calls), 1)

    def test_pin_is_returned_without_resolution(self):
        helper.prepare_usdm_asset = lambda *args, **kwargs: self.fail(
            "pin must not re-resolve"
        )
        result = helper.bootstrap_work(
            {
                "peer_pubkey_and_opt_addr": PEER,
                "channel": False,
                "deliver": False,
                "ticker": "USDM",
                "asset_id": ASSET,
            },
            lambda name, **fields: None,
        )

        self.assertEqual(result["asset_id"], ASSET)


class RouteExactnessTest(StubMixin):
    def setUp(self):
        super().setUp()
        self.server = helper.ThreadingHTTPServer(("127.0.0.1", 0), helper.Handler)
        threading.Thread(target=self.server.serve_forever, daemon=True).start()
        self.base = f"http://127.0.0.1:{self.server.server_address[1]}"

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()
        super().tearDown()

    def _post(self, path, body):
        req = urllib.request.Request(
            self.base + path,
            data=json.dumps(body).encode(),
            headers={"content-type": "application/json"},
        )
        try:
            with urllib.request.urlopen(req, timeout=5) as resp:
                return resp.status, json.loads(resp.read())
        except urllib.error.HTTPError as exc:
            return exc.code, json.loads(exc.read())

    def _get(self, path):
        try:
            with urllib.request.urlopen(self.base + path, timeout=5) as resp:
                return resp.status, json.loads(resp.read())
        except urllib.error.HTTPError as exc:
            return exc.code, json.loads(exc.read())

    def test_sendrgb_blank_recipient_is_400(self):
        status, body = self._post(
            "/lsp/sendrgb",
            {"asset_id": ASSET, "amount": 1, "recipient_id": "   "},
        )
        self.assertEqual(status, 400)
        self.assertIn("recipient_id", body["error"])

    def test_bootstrap_suffix_is_not_the_bootstrap_route(self):
        status, body = self._post("/lsp/bootstrapX", {})
        self.assertEqual(status, 404)
        self.assertIn("error", body)

    def test_peer_route_unknown_is_404(self):
        helper.rln_get = lambda path, timeout=30: {"channels": []}
        status, body = self._get("/lsp/peer/02deadbeef")
        self.assertEqual(status, 404)
        self.assertEqual(body, {"error": "unknown peer"})

    def test_peer_route_reports_the_ledger_record(self):
        helper.rln_get = lambda path, timeout=30: {"channels": []}
        helper.rln = lambda *args, **kwargs: {
            "transfers": [],
            "settled": 7,
            "future": 7,
            "spendable": 7,
        }
        helper._save_peer_mutation(
            "02abc",
            ASSET,
            5,
            delivery={"recipient_id": RECIPIENT, "txid": "t9", "status": "Settled"},
        )

        status, body = self._get("/lsp/peer/02abc")

        self.assertEqual(status, 200)
        self.assertTrue(body["ok"])
        self.assertEqual(body["peer"], "02abc")
        self.assertEqual(body["record"]["deliveries"][0]["txid"], "t9")
        self.assertIsNone(body["channel"])
        self.assertEqual(body["transfers"], [])
        self.assertEqual(body["lsp_balance"]["settled"], 7)

    def test_unknown_job_is_404_json(self):
        status, body = self._get("/lsp/bootstrap/nope")
        self.assertEqual(status, 404)
        self.assertEqual(body, {"error": "unknown job"})


if __name__ == "__main__":
    unittest.main()
