import os
import sys
import threading
import time
import unittest

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

    PATCHED = ("rln", "send_rgb", "mine_blocks", "bootstrap_work")
    ENV = ("METEVO_PINNED_ASSET_ID", "REGTEST_AUTOMINE")

    def setUp(self):
        self._saved = {
            name: getattr(helper, name)
            for name in self.PATCHED
            if hasattr(helper, name)
        }
        self._env = {name: os.environ.get(name) for name in self.ENV}
        for name in ("JOBS", "ACTIVE_JOBS", "JOB_KEY_LOCKS"):
            registry = getattr(helper, name, None)
            if registry is not None:
                registry.clear()

    def tearDown(self):
        for name, value in self._saved.items():
            setattr(helper, name, value)
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


if __name__ == "__main__":
    unittest.main()
