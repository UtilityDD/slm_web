# Android sideload APK (hosted)

Place the signed release APK here after building:

`android/app/build/outputs/apk/release/app-release.apk`
→ `public/downloads/smartlineman.apk`

**Expected public URL after deploy:**
https://www.smartlineman.in/downloads/smartlineman.apk

`smartlineman.apk` is tracked in git on purpose so Vercel (Git deploy) can serve it.
Keep the filename in sync with `public/android-latest.json` → `apk_url`.
Do not commit other APK/AAB files or signing secrets.

## Update channel

Live prompt uses `public/android-latest.json` (`version_code` must increase every APK ship).

In-app install uses the same **release** keystore as this file (`android/key.properties` → `smartlineman-release.jks`).

## Testing updates (important)

- **Do** install a release APK on the phone before testing updates (`adb install -r public/downloads/smartlineman.apk` after uninstalling any Studio debug build).
- **Don’t** expect Android Studio **Run** (debug-signed) installs to accept this hosted APK — that causes **package conflicts**.
- Full recipe: `docs/developer-guides/android-apk.md` → **Testing in-app updates on a USB phone**.
