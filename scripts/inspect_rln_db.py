#!/usr/bin/env python3
"""Inspect the RLN LSP sqlite for the rgb-lib wallet's indexer/proxy config."""
import glob
import sqlite3

candidates = glob.glob(
    "/home/aballarini/rgb-lightning-node/.e2e-regular-rln-datadir/mobile/73c5da0a/rgb_lib_db*"
) + glob.glob(
    "/home/aballarini/rgb-lightning-node/.e2e-regular-rln-datadir/mobile/73c5da0a/rgb_lib_db/*"
)
print("files:", candidates)
for path in candidates:
    try:
        conn = sqlite3.connect(path)
        rows = conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table'"
        ).fetchall()
        print(path, "tables:", [r[0] for r in rows])
        for table in ("transport_endpoint", "wallet_transaction"):
            try:
                for row in conn.execute(f"SELECT * FROM {table} LIMIT 20"):
                    print(table, ":", str(row)[:400])
            except Exception as exc:
                pass
        conn.close()
    except Exception as exc:
        print(path, "ERR", exc)
