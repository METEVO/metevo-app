# Fast APK iteration (no Gradle)

Gradle builds cost 3–9 min because the 252 MB APK and the 23 MB wasm are read and
written through the `Z:` mount. For a change that touches only
`android/app/src/main/assets/wasm/harness.js`, patch the existing APK and re-sign:

```bash
# 1. stage the new asset
rm -rf /tmp/apkpatch && mkdir -p /tmp/apkpatch
unzip -o -q app/build/outputs/apk/release/app-release.apk "assets/wasm/harness.js" -d /tmp/apkpatch
cp android/app/src/main/assets/wasm/harness.js /tmp/apkpatch/assets/wasm/harness.js

# 2. rewrite the APK (python zipfile; `zip` is not installed in WSL)
#    then zipalign + apksigner with android/app/debug.keystore
#    (release is signed with the debug keystore: see app/build.gradle:106-124)

# 3. install
adb -s 45300DLAQ004TS install -r /tmp/apkwork/signed.apk
```

For an RN/TS change you must rebuild the bundle (`gradlew`), but a harness-only
change does not.

## Changing the baked LAN IP without a rebuild

`EXPO_PUBLIC_WASM_*` URLs end up as fixed-length strings in
`assets/index.android.bundle` (Hermes). Replacing `192.168.1.30` with
`192.168.0.59` (same length) and re-signing is enough:

```bash
python3 - <<'PY'
p = "/tmp/apkpatch/assets/index.android.bundle"
d = open(p, "rb").read()
print("replaced", d.count(b"192.168.1.30"))
open(p, "wb").write(d.replace(b"192.168.1.30", b"192.168.0.59"))
PY
```

Same length only: a different-length IP requires a rebuild.

## Current network (2026-11-23)

- Host LAN IP: `192.168.0.59` (WSL eth0, /23). The baked APK now uses this.
- Phone: Wi-Fi `BloxSpace`, `192.168.0.209/23`, USB serial `45300DLAQ004TS`.
- The host IP moved twice today (`.1.147` → `.1.30` → `.0.59`); prefer the
  alias trick if you have sudo, else patch the bundle as above.
