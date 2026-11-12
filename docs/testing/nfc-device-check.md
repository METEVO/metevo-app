# NFC device acceptance

Run `npm run test:nfc:device -- SERIAL` on **each** of two unlocked Android
phones after installing the release APK. A missing AID fails the command.
Record the commit SHA, APK checksum, phone model and Android version. Attach
the command output (only the AID routing lines, no contact/session payloads)
to the PR. Unit tests and a successful build do not prove device routing.

On phone A open Contacts → My contact → Show QR code; on B open the scanner.
Tap, confirm import, check the saved contact; repeat B → A. Record both
outcomes. Test only contacts created for this check.

While A shares, background it, then lock it: B must not read contact data.
Return to the share screen: sharing resumes. Close that screen: it must stop.
Repeat with local-link receive: backgrounding or locking invalidates the
session; returning must require starting a new receive session.

Send a four-byte SELECT (`00 A4 00 00`) with an APDU-capable reader: expect
`6D00`, no process crash. Repeat a SELECT whose declared AID length exceeds
the supplied data. These checks need real NFC hardware.

Current evidence: device acceptance has **not** been rerun for these changes.
The editing environment cannot start ADB. Do not mark this gate passed until
both phones have been tested and the sanitized outputs are attached.
