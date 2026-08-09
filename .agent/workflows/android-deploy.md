---
description: Build and Sync slim Android APK (media from live site)
---

Keep the Capacitor Android app in sync with the web release without changing PWA behavior.

Full do’s/don’ts: `docs/developer-guides/android-apk.md`

On every APK release, keep these three in sync:
- `package.json` / `src/config.js` → `CURRENT_APP_VERSION` + `ANDROID_VERSION_CODE`
- `android/app/build.gradle` → `versionName` + `versionCode`
- `public/android-latest.json` → live sideload update channel

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

4. Confirm live site still hosts the media folders (deploy web as usual).

5. Smoke test on a phone with network: images/audio load; app opens normally.
