# Production deployment

**Read this before any version bump, APK copy, git push, or Vercel publish.**  
PWA and APK are two products. Shipping one must not lie about the other.

Incident this guide exists to prevent (27 Aug 2026): live `android-latest.json` advertised **1.3.142 / versionCode 139**, but `public/downloads/smartlineman.apk` was still **1.3.141 / 138**. Users installed the “update”, stayed on 138, and were prompted forever.

---

## Hard rules

1. **GitHub push does not publish.** Always run `npx vercel --prod --yes` from this repo (project `slm`, login `utilitydd`). Confirm live URLs after it finishes.
2. **Never raise `public/android-latest.json` `version_code` until the hosted APK file is that build.** `aapt dump badging public/downloads/smartlineman.apk` must match the JSON **before** you deploy.
3. **PWA version ≠ APK channel.** `CURRENT_APP_VERSION` can be 1.3.143 while live APK stays 1.3.141. That is correct when no new APK is hosted.
4. **Gradle / `ANDROID_VERSION_CODE` may be ahead** (next APK on the signing PC). Live JSON must stay on the **last hosted** APK, not the next intended one.
5. **Do not empty-commit to “trigger Vercel”.** Git integration is not deploying this project.

---

## Two channels

| | **PWA / website** | **Android APK (sideload)** |
|--|-------------------|----------------------------|
| Users | Browser, Add to Home Screen | Installed `com.smartlineman.app` |
| What they see as “version” | `CURRENT_APP_VERSION` in the JS bundle | Native `versionName` / `versionCode` |
| Update signal | Built `src/config.js` `CURRENT_APP_VERSION` | Live `https://www.smartlineman.in/android-latest.json` vs installed `versionCode` |
| Publish | Vercel production | Same Vercel deploy **only if** `smartlineman.apk` + `android-latest.json` both match |

Live APK check (phones fetch this, not git):

- Manifest: `https://www.smartlineman.in/android-latest.json`
- File: `https://www.smartlineman.in/downloads/smartlineman.apk`

---

## Version files (what to touch)

| File | PWA-only ship | APK ship (hosted file replaced) |
|------|----------------|----------------------------------|
| `package.json` `version` | Yes | Yes (same name as this release) |
| `src/config.js` `CURRENT_APP_VERSION` + `CURRENT_APP_RELEASE_NOTES` | Yes | Yes |
| `src/config.js` `ANDROID_VERSION_CODE` | **No** (leave as next/last gradle code) | Yes = new `versionCode` |
| `android/app/build.gradle` `versionName` / `versionCode` | Only if you will sign an APK this round | Yes; `versionCode` must increase |
| `public/android-latest.json` | **Do not change** | Yes, **after** APK is copied and `aapt` matches |
| `public/downloads/smartlineman.apk` | **Do not replace** | Yes, copy signed release here first |

`ANDROID_VERSION_CODE` in `config.js` tracks **gradle** (what you will sign next).  
`android-latest.json` tracks **the file Vercel will serve**. Those two numbers may differ.

---

## 1) PWA-only ship

Use when the website should refresh and **no new APK is on the CDN**.

1. Bump `package.json` version and `src/config.js` `CURRENT_APP_VERSION` + notes (EN + BN).
2. Leave `public/android-latest.json` and `public/downloads/smartlineman.apk` unchanged.
3. Commit, push, then:

```powershell
npx vercel --prod --yes
```

4. Verify (must all pass):

```powershell
# PWA bundle contains the new version string
curl.exe -sL "https://www.smartlineman.in/" -o "$env:TEMP\slm.html"
$js = ([regex]::Match((Get-Content "$env:TEMP\slm.html" -Raw), '/assets/index-[^"]+\.js')).Value
curl.exe -sL "https://www.smartlineman.in$js" | Select-String "1\.3\.\d+" 

# APK channel unchanged and still matches the hosted file
curl.exe -sL "https://www.smartlineman.in/android-latest.json"
& "$env:LOCALAPPDATA\Android\Sdk\build-tools\36.0.0\aapt.exe" dump badging "public\downloads\smartlineman.apk" | Select-String "package:"
```

`android-latest.json` `version_code` **must equal** `aapt` `versionCode`. If they differ, **do not deploy** until you fix JSON or replace the APK.

---

## 2) APK ship (new sideload build)

Use only when a **signed** APK is ready (`android/key.properties` on the signing machine).

```powershell
$env:JAVA_HOME = "C:\Program Files\Microsoft\jdk-21.0.8.9-hotspot"
$env:PATH = "$env:JAVA_HOME\bin;$env:PATH"

npm run android:apk
Copy-Item -Force android\app\build\outputs\apk\release\app-release.apk public\downloads\smartlineman.apk
```

**Gate — run before touching JSON:**

```powershell
& "$env:LOCALAPPDATA\Android\Sdk\build-tools\36.0.0\aapt.exe" dump badging "public\downloads\smartlineman.apk" | Select-String "package:"
```

Only then set `public/android-latest.json` `version_name` / `version_code` / notes to **that** `versionName` / `versionCode`.  
Also set gradle + `ANDROID_VERSION_CODE` to the same integers.

Then commit, push, `npx vercel --prod --yes`, and re-run the verify commands in section 1 (live JSON must match new `aapt`).

---

## 3) Combined ship

Do **PWA-only first** (section 1) **or** finish **APK ship** (section 2) in one deploy.  
Never deploy a raised `android-latest.json` with the old `smartlineman.apk`.

---

## After deploy (required)

| Check | Pass |
|--------|------|
| Live HTML JS hash changed (new PWA) | New `/assets/index-….js` |
| Grep of that JS | Contains new `CURRENT_APP_VERSION` |
| Live `android-latest.json` | Equals git `public/android-latest.json` |
| Live APK `aapt` (download or local file just deployed) | `versionCode` = JSON `version_code` |
| Phone on current APK | **No** update modal if installed code ≥ live `version_code` |

Inspect: Vercel project `slm` under Dipankar’s team. Custom domain: `www.smartlineman.in`.

---

## If the APK update modal loops

Symptom: sheet says update to version X; user installs; sheet returns for the same X.

Cause: live `version_code` > installed code, but the downloaded APK is still the old `versionCode`.

Fix:

1. `aapt dump badging public/downloads/smartlineman.apk`
2. Set `android-latest.json` to **that** name/code (not the hoped-for next build).
3. `npx vercel --prod --yes` immediately (phones read the live JSON; they do not need a new APK for the nag to stop).

---

## Related

- Capacitor / signing / USB update test: [Android APK](./android-apk.md)
- Agent workflow: `.agent/workflows/android-deploy.md`
- Update checker: `src/utils/androidAppUpdate.js`
- Free-plan quota cuts (landing, avatars, Rank prefetch): [Free-plan / egress optimization](./free-plan-optimization.md) — **PWA-only**; do not raise `android-latest.json` for those ships
