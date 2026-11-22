import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import mobile_helper as helper  # noqa: E402

PEER = "02e1c0ffee@127.0.0.1:9802"
ASSET = "rgb:DZgCsckL-wpY4~WV-NDRptzz-KtAy9r3-qwylBY9-cgLewQg"


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

    def test_channel_reusable_any_status(self):
        self.assertFalse(helper.channel_reusable(None))
        self.assertFalse(helper.channel_reusable({}))
        self.assertTrue(helper.channel_reusable({"status": "Opened"}))
        self.assertTrue(helper.channel_reusable({"status": "Closed"}))


if __name__ == "__main__":
    unittest.main()
