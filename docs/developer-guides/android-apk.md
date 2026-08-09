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

## Release checklist (every APK + web ship)

Keep these **three** in sync on every release:

1. `package.json` → `version`
2. `src/config.js` → `CURRENT_APP_VERSION` + `ANDROID_VERSION_CODE` + `CURRENT_APP_RELEASE_NOTES`
3. `android/app/build.gradle` → `versionName` + `versionCode`
4. `public/android-latest.json` → `version_name` + `version_code` + notes + `apk_url`

Then:

```powershell
npm run android:sync
cd android
.\gradlew.bat assembleRelease
```

Copy:

`android/app/build/outputs/apk/release/app-release.apk`  
→ `public/downloads/smartlineman.apk`

Deploy the website so **both** the web build and `android-latest.json` / APK URL are live.

### PWA-only message

Bump `CURRENT_APP_VERSION` and set clear `CURRENT_APP_RELEASE_NOTES` (EN + BN).  
Stale PWA clients see the force refresh modal when the built version string changes.

### APK-only message

Update `public/android-latest.json` `release_notes` and raise `version_code`.  
Installed apps open the update modal when remote `version_code` > installed build.

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
| Top bar + M3 nav | `NativeAppTopBar` (APK only) + filled active bottom-nav icons |

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
| Images missing in APK | Offline, or path not rewritten / not on live site |
| Visit count stuck on Android | Client not calling live `/api/landing-visits` (fixed via CapacitorHttp + absolute URL) |
| Status bar covers header | Overlay/immersive splash; keep overlay off + shell safe-area spacer |
| “App not installed” on update | Different signing key than previous APK |
| Huge APK again | Slim step skipped — always use `npm run android:sync` |

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

- Workflow: `.agent/workflows/android-deploy.md`
- Update checker: `src/utils/androidAppUpdate.js`
- Remote media: `src/utils/nativeRemoteAssets.js`
