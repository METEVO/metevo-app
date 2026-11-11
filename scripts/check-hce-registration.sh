#!/usr/bin/env bash
# Fails when Android has not routed the METEVO HCE AIDs to the app.
# Usage: scripts/check-hce-registration.sh [adb-serial]
set -euo pipefail

PACKAGE="app.metevo.wallet"
REQUIRED_AIDS=("F04D455445564F01" "F04D455445564F02")
ADB=(adb)
if [[ $# -ge 1 ]]; then
  ADB+=(-s "$1")
fi

nfc_state="$("${ADB[@]}" shell dumpsys nfc)"
missing=0
for aid in "${REQUIRED_AIDS[@]}"; do
  if grep -A2 "\"$aid\" (category: other)" <<<"$nfc_state" | grep -q "$PACKAGE"; then
    echo "OK      $aid routed to $PACKAGE"
  else
    echo "MISSING $aid is not in the card emulation AID cache"
    missing=1
  fi
done
exit "$missing"
