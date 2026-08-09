# Android sideload APK (hosted)

Place the signed release APK here after building:

`android/app/build/outputs/apk/release/app-release.apk`
→ `public/downloads/smartlineman.apk`

**Expected public URL after deploy:**
https://smartlineman.in/downloads/smartlineman.apk

`smartlineman.apk` is tracked in git on purpose so Vercel (Git deploy) can serve it.
Keep the filename in sync with `public/android-latest.json` → `apk_url`.
Do not commit other APK/AAB files or signing secrets.
