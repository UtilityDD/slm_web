---
description: Build and Sync web assets for Android deployment
---

Maintain the Android app by building the latest web assets and syncing them to the native platform.

// turbo-all
1. Build the production application:
```powershell
npm run build
```

2. Sync the built assets with the Android platform:
```powershell
npx cap sync android
```

3. Open Android Studio to run on a device or emulator:
- Open the `android` directory in Android Studio.
- Click "Run" to deploy the application.
