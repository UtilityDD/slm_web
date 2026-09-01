---
description: Build and Sync slim Android APK (media from live site)
---

Keep the Capacitor Android app in sync with the web release without changing PWA behavior.

**Ship rules (required):** `docs/developer-guides/deployment.md`  
Full Capacitor do’s/don’ts: `docs/developer-guides/android-apk.md`

On every **hosted** APK release, keep these in sync **after** the signed file is copied:

- `package.json` / `src/config.js` → `CURRENT_APP_VERSION` + `ANDROID_VERSION_CODE`
- `android/app/build.gradle` → `versionName` + `versionCode`
- `public/downloads/smartlineman.apk` → the signed APK
- `public/android-latest.json` → **only after** `aapt dump badging` matches `version_name` / `version_code`

**Never** raise `android-latest.json` because gradle is already at the next code. Live JSON = last file on the CDN. PWA-only ships must not touch the JSON or the APK.

GitHub push does not publish. After copy + matching JSON: `npx vercel --prod --yes`, then verify live JSON vs `aapt`.

Heavy media (`images`, `audio`, quiz images, etc.) is **not** packed into the APK.
The native app loads those paths from `https://smartlineman.in` (see `src/utils/nativeRemoteAssets.js`).
PWA/website builds are unchanged and still serve local `/…` assets.

// turbo-all
1. Build, slim dist, and sync into Android:
```powershell
npm run android:sync
```

2. Build signed release APK (requires `android/key.properties`):
```powershell
cd android
.\gradlew.bat assembleRelease
```

3. Copy APK to host path:
`android/app/build/outputs/apk/release/app-release.apk` → `public/downloads/smartlineman.apk`

4. Confirm `aapt dump badging public/downloads/smartlineman.apk` matches the JSON you are about to commit.

5. Confirm live site still hosts the media folders (`npx vercel --prod --yes`).

6. Smoke test on a phone with network: images/audio load; app opens normally; update modal only if installed `versionCode` is **lower** than live JSON.