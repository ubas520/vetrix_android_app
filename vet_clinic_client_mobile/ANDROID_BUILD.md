# Android APK

This native app connects to the website through its PHP mobile API.

Before building, verify that the deployed website includes `api/mobile/v1`
and its required database migrations and shared PHP services. See
`../vet_clinic/api/mobile/v1/README.md` for backend setup.

The `apk` profile in `eas.json` and local `.env.local` are configured with:

```dotenv
EXPO_PUBLIC_VETRIX_API_URL=https://vetrixwebapp-production.up.railway.app/api/mobile/v1
EXPO_PUBLIC_VETRIX_WEBSITE_URL=https://vetrixwebapp-production.up.railway.app
```

Update both configurations if the website address changes. Never put server
credentials in these public variables. The deployed `me.php` endpoint was checked
and returned the expected JSON 401 response for a request without a login token.
Authenticated account flows still require testing with a client account.

From this directory, sign in and link the project to your Expo account:

```powershell
npx eas-cli@latest login
npx eas-cli@latest init
```

Build:

```powershell
npx eas-cli@latest build --platform android --profile apk
```

On the first build, EAS may prompt to generate an Android signing keystore.
Keep using the same Expo project and signing credentials for future updates.
Download the APK from the completed build's link and install it on Android.
This release build runs without Expo Go or a development computer.

The `apk` profile explicitly produces an installable APK and uses the production
EAS environment with the deployed URLs supplied by the build profile. Expo project
linkage must be configured before creating a release.

Reference: https://docs.expo.dev/build-reference/apk/

## Over-the-air updates

Version 1.0.1 (Android version code 4) enables Expo Updates on the `production`
channel for the existing `justinegrape/vet-clinic-client-mobile` project. Install
this APK once; older APKs built without Expo Updates cannot receive this change
remotely. Keep the existing signing key and package name when building.

Updates check in the background at launch and apply on the next cold launch after
download. Users can close and reopen the app twice to fetch and apply an update.
The app still starts with its installed/cached bundle when offline; it does not
restart in the middle of a booking or payment.

Publish tested JavaScript, styles, or assets from this directory:

```powershell
npx.cmd --yes eas-cli@latest update --channel production --platform android --environment production --message "Describe the change"
```

Both public Railway URL variables must exist in the EAS `production` environment:
`EXPO_PUBLIC_VETRIX_API_URL` and `EXPO_PUBLIC_VETRIX_WEBSITE_URL`, with the values
shown above. EAS Update uses that environment, not `build.apk.env` in eas.json.

The runtime version is explicitly `1.0.1`. Only publish an update with this runtime
when it is compatible with the native code in the 1.0.1 APK. Native module, Expo
SDK, permissions, config plugin, or Android/iOS native-code changes require a new
runtime version and APK. Bump `runtimeVersion`, app version, and Android version
code before that build. If building the local generated Android project, also
sync `expo_runtime_version` in strings.xml and version values in build.gradle.
Never reuse an old runtime for a native dependency change.

The Android directory is generated and ignored for EAS uploads, so app.json is
the source of truth for cloud builds. Do not change the Expo project ID or update
URL between builds and updates. Railway deployments update the PHP server only;
mobile OTA releases are published separately with the command above.

Initial OTA release: `3f864aaa-5cf9-4650-bc04-413fdd98eadd` on `production`,
Android runtime `1.0.1`. The production manifest endpoint was checked and serves
update `01a09c16-cc55-7919-bdba-bb4bd2afc44e` for that channel and runtime.
The one-time compatible APK build is available at:
https://expo.dev/accounts/justinegrape/projects/vet-clinic-client-mobile/builds/5acdc139-560b-485b-97fe-e182a53f2d0f

If Git is not installed, set `$env:EAS_NO_VCS='1'` before running EAS commands from
this directory. This workspace uses that mode; review the uploaded source before
publishing because there is no Git commit recorded for the release.
