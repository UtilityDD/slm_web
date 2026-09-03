# Android APK development guide

Maintainer notes for the Capacitor Android app (`com.smartlineman.app`).  
**PWA and APK ship in parallel** — do not break one while updating the other.

## Mental model

| Channel | What users install | How updates arrive |
|--------|---------------------|--------------------|
| **PWA / website** | Browser or Add to Home Screen | `CURRENT_APP_VERSION` + service worker refresh |
| **Android APK** | Sideloaded signed APK (not Play Store) | `public/android-latest.json` vs installed `versionCode` |

Heavy media (most of `images/`, `audio/`, quiz images, etc.) is **not** packed into the APK.  
Native loads those from `https://smartlineman.in`. A small first-paint kit stays in the APK (loader WebPs, login emotional images, icons).

## File map

| Path | Role |
|------|------|
| `capacitor.config.json` | App id, splash, StatusBar (`overlaysWebView: false`) |
| `android/app/build.gradle` | `versionCode` / `versionName`, release signing |
| `android/key.properties` | Local secrets only (gitignored) |
| `scripts/android-slim-dist.mjs` | Strips heavy media from `dist/` before `cap sync` |
| `src/utils/nativeRemoteAssets.js` | Native URL rewrite + first-paint prefetch |
| `src/utils/androidAppUpdate.js` | Compares installed build to live `android-latest.json` |
| `public/android-latest.json` | Live APK update channel (must be deployed) |
| `public/download/index.html` | Simple download page |
| `public/downloads/smartlineman.apk` | Hosted sideload APK (tracked so Vercel/Git can serve it; other `*.apk` stay ignored) |
| `src/config.js` | `CURRENT_APP_VERSION`, `ANDROID_VERSION_CODE`, download URLs |

## How to ship

**Canonical checklist:** [Production deployment](./deployment.md)

Do not bump `public/android-latest.json` on a PWA-only release. That JSON must match `aapt` of `public/downloads/smartlineman.apk` or phones will loop the update modal.

GitHub push does **not** publish. Use `npx vercel --prod --yes`.

## Do

- **Do** treat APK and PWA as parallel products with separate update channels.
- **Do** bump `versionCode` on every APK (integer must always increase).
- **Do** use the **same keystore** for every release (`android/key.properties` → `smartlineman-release.jks`).
- **Do** run `npm run android:sync` (build → slim → `cap sync`) before generating a signed APK.
- **Do** keep first-paint essentials in `scripts/android-slim-dist.mjs` `KEEP_PACKED` (and matching entries in `nativeRemoteAssets.js`).
- **Do** test on a real phone: cold start, landing sticky CTA, login, training image load (online), visit count, status bar clearance, **system Back**, keyboard on login, bottom-nav haptics.
- **Do** host media on `smartlineman.in` — APK depends on it for images/audio.
- **Do** keep secrets out of git (`key.properties`, `*.jks`; only track `public/downloads/smartlineman.apk` for hosting).

## Native UX (Phase A + B)

| Behavior | Implementation |
|----------|----------------|
| System Back | `src/utils/nativeAndroidUx.js` LIFO handlers + shell in `SmartLinemanUI.jsx` |
| Soft keyboard | `@capacitor/keyboard` → `--keyboard-height` + `.native-keyboard-pad` |
| Haptics | `@capacitor/haptics` on nav / quiz (no-ops on web) |
| Splash | Hide after `appLoading` clears (`hideNativeSplash`) |
| Status / nav bars | Dynamic status via Capacitor; nav bar colors in `android/.../styles.xml` |
| Bottom sheets | `.native-sheet-scrim/panel/card` + `NativeSheetHandle` (forced bottom on native) |
| Touch polish | No tap flash, overscroll contained, `touch-action: manipulation` |
| Offline (native) | Media-aware banner in `NetworkStatusListener` |
| External links | `openExternalUrl()` → Custom Tabs / Browser plugin |
| Share | `shareContent()` + More page system share on native |
| Top bar + M3 nav | `NativeAppTopBar` (APK only) + 4-tab bottom nav (Home / Safety / Rank / Forum); More from Home |

## Don’t

- **Don’t** re-enable the old “App Retired” / force-PWA lockout for Capacitor users.
- **Don’t** point native fetches at relative `/api/...` without a live absolute origin (Capacitor origin is localhost).
- **Don’t** pack the whole `public/images` tree into the APK (huge). Only the listed first-paint files.
- **Don’t** delete Vite-hashed `dist/assets/*.js|*.css` during slim — only media folders listed in the slim script.
- **Don’t** commit extra APK/AAB builds or signing passwords — only replace `public/downloads/smartlineman.apk` when shipping.
- **Don’t** change `applicationId` (`com.smartlineman.app`) unless you intentionally break update-over-install.
- **Don’t** set `StatusBar.overlaysWebView: true` / immersive splash without re-testing every screen’s top bar.
- **Don’t** assume Play Store rules apply — this is sideload distribution; guide users to allow unknown apps.
- **Don’t** ship an APK without updating live `android-latest.json` (users will never get the in-app update prompt).
- **Don’t** raise `android-latest.json` `version_code` without replacing `public/downloads/smartlineman.apk` with that exact build (update modal loops forever).
- **Don’t** mix PWA “Refresh” updates with APK “Download Update” URLs in one code path.

## UI differences (by design)

| Surface | PWA / website | Native APK |
|---------|---------------|------------|
| Landing sticky CTA | **Download Android App** (highlighted) | **Login** |
| Floating PWA Install FAB | Removed | N/A |
| More → Android button | Shown | Hidden |
| Update modal | Refresh / SW | In-app APK download + system installer (`ApkInstaller`) |

## Signing

1. Create `android/key.properties` from `android/key.properties.example`.
2. Point `storeFile` at your release `.jks`.
3. Never commit `key.properties`.
4. Losing the keystore means users must uninstall the old app before installing a newly signed one.

## Common failures

| Symptom | Likely cause |
|---------|----------------|
| Update modal never appears on APK | Live `android-latest.json` not deployed or `version_code` not higher |
| Update modal repeats after install (same version name) | JSON `version_code` is higher than the **hosted** APK’s `aapt` `versionCode` — set JSON back to the file, deploy Vercel |
| Images missing in APK | Offline, or path not rewritten / not on live site |
| Visit count stuck on Android | Client not calling live `/api/landing-visits` (fixed via CapacitorHttp + absolute URL) |
| Status bar covers header | Overlay/immersive splash; keep overlay off + shell safe-area spacer |
| “App not installed” / **package conflicts** on update | Phone has a **different signature** than the new APK — usually Android Studio **Run (debug)** vs hosted **release** keystore |
| Huge APK again | Slim step skipped — always use `npm run android:sync` |

## Testing in-app updates on a USB phone

In-app update only works when **all** of these are true:

1. Phone app is a **release-signed** install (same `smartlineman-release.jks` as hosted APKs).
2. Installed `versionCode` &lt; live `android-latest.json` → `version_code`.
3. Live site has deployed the new `smartlineman.apk` + `android-latest.json`.

### Do not use Android Studio Run for update tests

`Run` installs a **debug-signed** build. Updating that with the hosted release APK fails with **package conflicts**. PWA refresh is unrelated.

### Correct USB test recipe

```powershell
# 0) JDK 21 for Gradle (Java 25 breaks assembleRelease)
$env:JAVA_HOME = "C:\Program Files\Microsoft\jdk-21.0.8.9-hotspot"
$env:PATH = "$env:JAVA_HOME\bin;$env:PATH"
$adb = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"

# 1) Baseline: wipe debug install, put current RELEASE APK on the phone
& $adb uninstall com.smartlineman.app
& $adb install -r public\downloads\smartlineman.apk

# 2) Bump versionCode (package.json, src/config.js, android/app/build.gradle, public/android-latest.json)

# 3) Build + host
npm run android:sync
cd android; .\gradlew.bat assembleRelease; cd ..
Copy-Item -Force android\app\build\outputs\apk\release\app-release.apk public\downloads\smartlineman.apk
# aapt must match android-latest.json, then: npx vercel --prod --yes
# GitHub push does not publish this project.

# 4) On the phone: cold-start SmartLineman → Update Available → Download Update
#    Allow “Install unknown apps” for SmartLineman if prompted, then confirm install.
```

### Verify signatures match (optional)

```powershell
$apksigner = "$env:LOCALAPPDATA\Android\Sdk\build-tools\36.0.0\apksigner.bat"
# Phone APK SHA-1 must match release APK SHA-1 (CN=SmartLineman …), not "Android Debug"
```

## Quick commands

```powershell
# Web + slim assets into android/
npm run android:sync

# Open Android Studio
npm run android:open

# Signed release (requires key.properties)
cd android
.\gradlew.bat assembleRelease
```

## Related

- **Ship procedure:** [Production deployment](./deployment.md)
- Workflow: `.agent/workflows/android-deploy.md`
- Update checker: `src/utils/androidAppUpdate.js`
- Remote media: `src/utils/nativeRemoteAssets.js`
- Quota / landing / Rank prefetch: [Free-plan / egress optimization](./free-plan-optimization.md) — those ships must not change `android-latest.json`
