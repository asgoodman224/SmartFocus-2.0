# Collecting phone usage data

Research notes for SmartFocus (Expo SDK 57, React Native, FastAPI backend). Researched 2026-09-28. Platform docs and store policies change often, so re-check the linked pages before you commit to a design.

Legend: **Fact**: stated in the linked source. **Inference**: my own reading or engineering judgement, not confirmed by a source.

## Summary: feasibility by data point

| Data point (per local day and hour) | Android (own Expo module) | iOS, App Store app | iOS, approved research study |
|---|---|---|---|
| Per-app seconds in foreground | **Yes.** `UsageEvents` resume/pause pairs, aggregated to the hour | **No.** Screen Time data can be displayed inside a report extension, but it cannot be sent anywhere | **Partial.** SensorKit `SRDeviceUsageReport` gives app usage by category. Non-Apple apps come as an opaque per-report id, not a bundle id |
| App opens | **Yes, derived.** Count `ACTIVITY_RESUMED` events where the foreground package changes | **No** | **No direct field** |
| App name | **Yes** (`PackageManager` label with a `<queries>` launcher intent) | **No** (apps are opaque tokens) | **No** for third-party apps |
| Category (productivity, communication, social, entertainment, other) | **Partial.** `ApplicationInfo.category` is often unset, so you need your own mapping table | **No** | **Yes, by App Store category** (`CategoryKey`) |
| Pickups / unlocks | **Yes.** `KEYGUARD_HIDDEN` and `SCREEN_INTERACTIVE` events (API 28+) | **No** | **Yes.** `totalUnlocks` and `totalScreenWakes` |
| Notification counts (no content) | **Partial.** Needs NotificationListenerService (special access), or an undocumented usage event | **No** | **Yes.** `notificationUsageByCategory` |
| Longest stretch without unlocking | **Yes, derived** from keyguard event timestamps | **No** | **Probably no** (only aggregates per report) |
| Steps / activity | **Yes.** Health Connect, or the step sensor while the app runs | **Yes.** CoreMotion (7 days of history) or HealthKit | Yes, same as the App Store column |
| Automatic upload | WorkManager through `expo-background-task` (at least every 15 minutes, not guaranteed) | BGTaskScheduler (runs when the OS decides) | Same; SensorKit data is also held back for 24 hours |

**Conclusion:** Android can give the backend almost everything it expects, without special approval. On iOS the full schema is only possible through SensorKit, which Apple grants only to IRB-approved research studies. Otherwise iOS is limited to steps plus manual input (Screen Time screenshots or self-report).

---

## ANDROID

### 1. UsageStatsManager / UsageEvents

**Facts**
- Most methods need `android.permission.PACKAGE_USAGE_STATS`. Declaring it is not enough: "the user of the device still needs to grant permission through the Settings application. See `Settings.ACTION_USAGE_ACCESS_SETTINGS`" ([UsageStatsManager](https://developer.android.com/reference/android/app/usage/UsageStatsManager)). The permission's protection level is `signature|privileged|development|appop|retailDemo`, so it is an app-op the user switches on in Settings, not a runtime dialog ([Manifest.permission](https://developer.android.com/reference/android/Manifest.permission#PACKAGE_USAGE_STATS)).
- `queryUsageStats(interval, begin, end)` returns `UsageStats` per package in DAILY, WEEKLY, MONTHLY or YEARLY buckets. The begin and end "may be expanded to the nearest whole interval period" ([UsageStatsManager](https://developer.android.com/reference/android/app/usage/UsageStatsManager)). Public fields include `getTotalTimeInForeground()` and `getTotalTimeVisible()`. A launch counter exists (`getAppLaunchCount()`), but it is `@hide @SystemApi`, so third-party apps cannot use it ([AOSP UsageStats.java](https://github.com/aosp-mirror/platform_frameworks_base/blob/main/core/java/android/app/usage/UsageStats.java)).
- `queryEvents(begin, end)` returns raw timestamped events. The docs say "Events are only kept by the system for a few days", and the call returns `null` while the user is locked (Android 11+) ([UsageStatsManager](https://developer.android.com/reference/android/app/usage/UsageStatsManager)).
- Public event types ([UsageEvents.Event](https://developer.android.com/reference/android/app/usage/UsageEvents.Event)):
  - `ACTIVITY_RESUMED` and `ACTIVITY_PAUSED` / `ACTIVITY_STOPPED`, reported "for each activity" of a package
  - `KEYGUARD_HIDDEN` ("typically happens when the user unlocks their phone") and `KEYGUARD_SHOWN`
  - `SCREEN_INTERACTIVE` and `SCREEN_NON_INTERACTIVE`
  - `DEVICE_STARTUP`, `DEVICE_SHUTDOWN`, `USER_INTERACTION`, `FOREGROUND_SERVICE_START/STOP`
  - The keyguard and screen events were added in API 28.
- Notification events (`NOTIFICATION_INTERRUPTION = 12`, `NOTIFICATION_SEEN = 10`) are `@hide @SystemApi`. In AOSP, third-party callers still receive them, but with the notification channel ID obfuscated ([UsageEvents.java](https://github.com/aosp-mirror/platform_frameworks_base/blob/main/core/java/android/app/usage/UsageEvents.java), [UserUsageStatsService.java](https://github.com/aosp-mirror/platform_frameworks_base/blob/main/services/usage/java/com/android/server/usage/UserUsageStatsService.java)).
- How long data is kept, per AOSP `UsageStatsDatabase.prune()`: daily files 10 days, weekly 4 weeks, monthly 6 months, yearly 2 years. Raw events live in the daily files, so there are about 10 days of events ([UsageStatsDatabase.java](https://github.com/aosp-mirror/platform_frameworks_base/blob/main/services/usage/java/com/android/server/usage/UsageStatsDatabase.java)). Phone makers can change this.

**Inferences (how to compute each field)**
- Build per-hour data from **events, not `queryUsageStats`**, because the aggregated buckets are daily at best.
- **Seconds per app:** pair each `ACTIVITY_RESUMED` with the next pause or stop for the same package, then split the intervals at hour boundaries in the device's local time zone.
- **Opens:** count a `RESUMED` event whose package differs from the previous foreground package. Skip launchers and the system UI.
- **Pickups:** count `KEYGUARD_HIDDEN`. On phones with no lock screen, fall back to `SCREEN_INTERACTIVE`.
- **Longest stretch without unlocking:** the largest gap from `KEYGUARD_SHOWN` (or `SCREEN_NON_INTERACTIVE`) to the next `KEYGUARD_HIDDEN`.
- **Sync schedule:** sync at least daily. Events expire after about 10 days, so the upload has to be idempotent: key it on (device, date, hour) and re-send the last 2–3 days on every sync.
- **Permission flow:** check `AppOpsManager.unsafeCheckOpNoThrow(OPSTR_GET_USAGE_STATS, …)`, then open `Settings.ACTION_USAGE_ACCESS_SETTINGS` and check again when the app returns to the foreground.

### 2. Google Play policy

**Facts**
- I found **no dedicated Play declaration form** for `PACKAGE_USAGE_STATS` or for notification-listener access. The restricted-permissions policy page covers SMS/Call Log, location, photos, `QUERY_ALL_PACKAGES`, Accessibility, Health Connect and others, but does not list usage access ([Play restricted permissions](https://support.google.com/googleplay/android-developer/answer/16558241)). Re-check in Play Console at submission time.
- The **User Data policy** still applies:
  - The app inventory is "personal or sensitive" data.
  - It is a violation for "an app that uses restricted permissions in the background of the app including for tracking, research, or marketing purposes and does not comprehensively disclose its use and obtain consent".
  - An in-app **prominent disclosure** and an affirmative consent step are required *before* collection starts.
  - Source: [User Data policy](https://support.google.com/googleplay/android-developer/answer/10144311?hl=en).
- You must also fill in the Data safety form, covering app activity and installed apps ([Data safety](https://support.google.com/googleplay/android-developer/answer/10787469?hl=en)).
- **NotificationListenerService**: the manifest must declare `BIND_NOTIFICATION_LISTENER_SERVICE`, and the user enables it via `ACTION_NOTIFICATION_LISTENER_SETTINGS` ([NotificationListenerService](https://developer.android.com/reference/android/service/notification/NotificationListenerService)).
- On Android 13+, sideloaded apps can hit "restricted settings", which the user has to allow by hand ([Android Help](https://support.google.com/android/answer/12623953?hl=en)).
- **Distribution outside Play:** Android developer verification is enforced in BR, ID, SG and TH from 2026-09-30, and globally from 2027. "Limited distribution accounts" let students share with up to 20 devices without an ID or fee ([developer verification](https://developer.android.com/developer-verification)).

**Inferences**
- A self-tracking digital-wellbeing app with clear disclosure is a common, accepted use of usage access. The bigger review risk is the notification listener, because it *can* read notification content.
- To count notifications without reading content, keep the listener minimal: in `onNotificationPosted`, only increment a counter keyed by (package, hour) and never read `extras`. Say this in the disclosure.
- **Cheaper option:** try counting the undocumented `NOTIFICATION_INTERRUPTION` (type 12) events from `queryEvents`, which needs no extra permission. Treat the result as best-effort, validate it on several OEM phones, and document the choice. It may break without warning.

### 3. App names and categories

**Facts**
- `ApplicationInfo.category` (API 26+) comes from the app's manifest attribute `appCategory`, "or may have been provided by the installer". Values: GAME, AUDIO, VIDEO, IMAGE, SOCIAL, NEWS, MAPS, PRODUCTIVITY, ACCESSIBILITY, UNDEFINED ([ApplicationInfo](https://developer.android.com/reference/android/content/pm/ApplicationInfo#category)).
- "Apps should only define this value when they fit well", so many apps report `UNDEFINED`. SOCIAL covers "messaging, communication, email, or social network apps", so there is **no separate communication category** (same page).
- **Package visibility** (Android 11+): other apps are hidden unless declared. A `<queries>` intent for `ACTION_MAIN` + `CATEGORY_LAUNCHER` makes launchable apps visible ([declaring package needs](https://developer.android.com/training/package-visibility/declaring), [automatic visibility](https://developer.android.com/training/package-visibility/automatic)).
- `QUERY_ALL_PACKAGES` is limited to uses such as "device search, antivirus apps, file managers, and browsers" and needs a declaration. Wellbeing and research apps are not listed ([QUERY_ALL_PACKAGES policy](https://support.google.com/googleplay/android-developer/answer/10158779)).

**Inferences**
- Use the launcher `<queries>` intent (no `QUERY_ALL_PACKAGES`) to get labels.
- Map categories in this order: **(1)** a curated package→category table maintained on the backend (the top ~200 apps cover most usage), then **(2)** `ApplicationInfo.category` (SOCIAL goes to social unless the table says communication; VIDEO, AUDIO and GAME go to entertainment; PRODUCTIVITY stays productivity), then **(3)** "other".
- Doing the mapping on the server means you can fix mistakes without shipping a new app version.

### 4. Implementing it in Expo

**Facts**
- Custom native code needs a **development build**: "a development build is essentially your own version of Expo Go where you are free to use any native libraries" ([dev builds](https://docs.expo.dev/develop/development-builds/introduction/)).
- Write the native code with the Expo Modules API in Kotlin or Swift ([overview](https://docs.expo.dev/modules/overview/)). Create a local module with `npx create-expo-module@latest --local` ([get started](https://docs.expo.dev/modules/get-started/)), and use a config plugin for manifest changes ([config plugins](https://docs.expo.dev/config-plugins/introduction/)).
- **Community libraries** (npm registry, checked 2026-09-28). All have very low adoption, so none is a safe dependency:

  | Package | Latest release | Weekly downloads |
  |---|---|---|
  | `expo-android-usagestats` | 1.2.0, 2025-05 | ~41 |
  | `@brighthustle/react-native-usage-stats-manager` | 2023-10 | ~73 |
  | `react-native-usage-stats-manager` | 2018 | ~19 |
  | `react-native-usage-stats` | 2024-05 | ~39 |

  Notification listeners: `react-native-android-notification-listener` (last release 2022-12) and `expo-android-notification-listener-service` (2025-01).
- **`expo-background-task`** (SDK 57): WorkManager on Android and BGTaskScheduler on iOS. The default interval is 12 hours and the minimum is 15 minutes. Tasks run only with enough battery and a network connection, and "Background tasks are stopped if the user kills the app" ([docs](https://docs.expo.dev/versions/latest/sdk/background-task/)).

**Inferences**
- Write your own small local Kotlin module, about 300–500 lines, exposing:
  - `hasUsageAccess()` and `openUsageAccessSettings()`
  - `getHourlyAggregates(fromMs, toMs)`, which returns backend-shaped rows computed natively so thousands of events don't cross the JS bridge
  - `getAppLabels(pkgs)`
- Because Android stores the history itself, background upload does not have to be reliable. Sync when the app opens, plus a best-effort `expo-background-task` every few hours. You do not need a foreground service.

---

## iOS

### 5. Screen Time APIs (FamilyControls, DeviceActivity, ManagedSettings)

**Facts**
- `DeviceActivityReport`: the report extension "runs in a sandbox. This sandbox prevents your extension from making network requests or moving sensitive content outside the extension's address space" ([DeviceActivityReport](https://developer.apple.com/documentation/deviceactivity/deviceactivityreport)). Apple's answer on the forums: "No, moving Device Activity data outside of your extension's sandbox is not possible in order to preserve the user's privacy" ([forum 727958](https://developer.apple.com/forums/thread/727958)). Developers report that App Group writes from the extension also fail silently ([forum 818297](https://developer.apple.com/forums/thread/818297)).
- Apps, categories and domains are **opaque tokens** ([FamilyActivitySelection](https://developer.apple.com/documentation/familycontrols/familyactivityselection), [ApplicationToken](https://developer.apple.com/documentation/managedsettings/applicationtoken)).
- **Entitlement:** "Before submitting your app to the App Store, you must [request permission] to use the entitlement" `com.apple.developer.family-controls`. The request form is [here](https://developer.apple.com/contact/request/family-controls-distribution) ([entitlement](https://developer.apple.com/documentation/bundleresources/entitlements/com.apple.developer.family-controls)). The development variant works without approval. Per the library README, each extension bundle ID needs its own approval ([react-native-device-activity](https://github.com/kingstinct/react-native-device-activity)).
- `DeviceActivityMonitor` gets callbacks for schedule start and end and for `eventDidReachThreshold`. An event is time an app, category or domain is "frontmost". Monitoring "too many activities" throws an error ([DeviceActivityMonitor](https://developer.apple.com/documentation/deviceactivity/deviceactivitymonitor), [DeviceActivityEvent](https://developer.apple.com/documentation/deviceactivity/deviceactivityevent), [startMonitoring](https://developer.apple.com/documentation/deviceactivity/deviceactivitycenter/startmonitoring(_:during:events:))).
- On iOS 26.2 and 26.3, developers report thresholds firing falsely or not at all ([811305](https://developer.apple.com/forums/thread/811305), [812472](https://developer.apple.com/forums/thread/812472)).
- iOS 27 / WWDC 2026: per a third-party summary, the developer additions were the Declared Age Range API and PermissionKit, with no report-export change ([habitdoom](https://habitdoom.com/blog/ios-27-screen-time-changes)). I found no Apple doc stating otherwise.
- The React Native wrapper `react-native-device-activity` (v0.6.1, 2026-02, ~24k weekly downloads) has an Expo config plugin. It notes the API "is not designed for time tracking out-of-the-box" ([repo](https://github.com/kingstinct/react-native-device-activity)).

**Inferences**
- A coarse workaround exists: register threshold events (for example every 15 minutes of total or per-category usage) and log each crossing with a timestamp from the monitor extension. That gives *approximate* time per selected category or token, with no app names, no opens, no pickups and no notifications.
- It needs the distribution entitlement, extensions written in Swift, and the reliability is currently poor. **I don't recommend it for SmartFocus's schema.**

### 6. SensorKit

**Facts**
- `SRDeviceUsageReport` provides ([docs](https://developer.apple.com/documentation/sensorkit/srdeviceusagereport)):
  - `duration`, `totalScreenWakes`, `totalUnlocks`, `totalUnlockDuration`
  - `applicationUsageByCategory` (with `usageTime` and text-input sessions)
  - `notificationUsageByCategory`
  - `webUsageByCategory`
- `bundleIdentifier` is set "only if the bundle identifier corresponds to an Apple app". Other apps come as `reportApplicationIdentifier` ([bundleIdentifier](https://developer.apple.com/documentation/sensorkit/srdeviceusagereport/applicationusage/bundleidentifier)).
- Categories are App Store categories such as productivity, socialNetworking, entertainment and games ([CategoryKey](https://developer.apple.com/documentation/sensorkit/srdeviceusagereport/categorykey)).
- Other sensors include `messagesUsageReport` (incoming and outgoing message counts, unique contacts), `phoneUsageReport`, `pedometerData`, `visits`, `keyboardMetrics` and more ([SRSensor](https://developer.apple.com/documentation/sensorkit/srsensor), [SRMessagesUsageReport](https://developer.apple.com/documentation/sensorkit/srmessagesusagereport)).
- **Access:** "Apple only grants the entitlement for approved research studies… submit a research proposal". It needs a manual provisioning profile with an explicit App ID ([configuring](https://developer.apple.com/documentation/sensorkit/configuring-your-project-for-sensor-reading), [entitlement](https://developer.apple.com/documentation/bundleresources/entitlements/com.apple.developer.sensorkit.reader.allow)).
- Apple's research page adds ([Accessing SensorKit Data](https://www.researchandcare.org/resources/accessing-sensorkit-data/)):
  - "Once you have IRB (or comparable ethics board) approval… you'll be provided the entitlement to distribute your app to study participants."
  - The app must be submitted under the *researcher's* developer account.
  - The process "could impact" your timeline.
- **Timing:** "SensorKit places a 24-hour holding period on newly recorded data", and apps can access "7 days of prior recorded data" ([SRFetchRequest](https://developer.apple.com/documentation/sensorkit/srfetchrequest), [SRSensorReader](https://developer.apple.com/documentation/sensorkit/srsensorreader)).
- I found no SensorKit package on npm.

**Inferences**
- From Expo, this means a local Swift Expo module (`SRSensorReader` wrapper), a config plugin that adds the entitlement array and the `NSSensorKit*` Info.plist keys, and EAS builds with local or manual credentials ([local credentials](https://docs.expo.dev/app-signing/local-credentials/)).
- Data is at least 24 hours old, so iOS rows would arrive the next day. Rows are per report interval, not guaranteed hourly. There are no per-app opens and no "longest stretch".

### 7. Other iOS approaches used in research

**Facts**
- iOS Screen Time shows **Pickups** and **Notifications** per app to the user ([Apple Support](https://support.apple.com/guide/iphone/get-started-with-screen-time-iphbfa595995/ios)).
- Researchers collect **Screen Time screenshots** that participants upload ([Ohme et al. 2021](https://journals.sagepub.com/doi/10.1177/2050157920959106)). Self-reports are known to be inaccurate ([Sewall et al.](https://www.sciencedirect.com/science/article/abs/pii/S0747563220303630)). Screenshot donation is cumbersome and has high attrition ([PMC6277825](https://pmc.ncbi.nlm.nih.gov/articles/PMC6277825/)).

**Inferences**
- A practical iOS fallback: a daily or weekly in-app prompt to upload Screen Time screenshots, with server-side OCR (e.g. Tesseract or a vision model) and a confirm/edit step for the user. This gives daily totals, top apps, pickups and notification counts, but **not hourly** data.
- Add short self-report questions (EMA) for focus and context.
- There is no API for Screen Time's "Share Across Devices" or iCloud data.

---

## MOTION (both platforms)

### 8. Steps and physical activity

**Facts**
- **expo-sensors `Pedometer`** (SDK 57):
  - `getStepCountAsync(start, end)` works on **iOS only**, which stores "the past seven days".
  - `watchStepCount` works on both platforms but not in the background.
  - Source: [Pedometer](https://docs.expo.dev/versions/latest/sdk/pedometer/)
- Android step sensors require `ACTIVITY_RECOGNITION`, which is a "dangerous" runtime permission ([Manifest.permission](https://developer.android.com/reference/android/Manifest.permission#ACTIVITY_RECOGNITION)).
- **Health Connect (Android):**
  - Reads are limited to 30 days before the grant unless you add `PERMISSION_READ_HEALTH_DATA_HISTORY`. Background reads need `READ_HEALTH_DATA_IN_BACKGROUND`. Steps are aggregated with `StepsRecord.COUNT_TOTAL` ([read data](https://developer.android.com/health-and-fitness/guides/health-connect/develop/read-data)).
  - Play requires a Health Connect declaration with a justification for each permission. Research is allowed only with IRB/EC approval and documented consent ([Play Health guidance](https://support.google.com/googleplay/android-developer/answer/12991134?hl=en)).
  - `react-native-health-connect` (v4.1.3, 2026-08, ~155k weekly downloads) includes its Expo plugin and needs minSdk 26 ([docs](https://matinzd.github.io/react-native-health-connect/docs/get-started)).
- **HealthKit (iOS):** `@kingstinct/react-native-healthkit` (v16.0.0, 2026-09, ~198k weekly downloads) has an Expo config plugin and needs a dev client ([repo](https://github.com/kingstinct/react-native-healthkit)).
- **App Store guideline 5.1.3** covers HealthKit and Motion & Fitness data ([guidelines](https://developer.apple.com/app-store/review/guidelines/)):
  - (i) Health, fitness and research data can't be used for advertising or data mining.
  - (iii) Health-related human-subject research needs informed consent.
  - (iv) It needs independent ethics board approval.
  - Guideline 5.1.1 also forbids collecting "which other apps are installed… for analytics or advertising/marketing".

**Inferences**
- **iOS:** use HealthKit (hourly `stepCount` statistics, full history, works when the app opens). Fall back to CoreMotion via `Pedometer.getStepCountAsync` for 7-day backfill without HealthKit.
- **Android:** use Health Connect for hourly steps. It depends on another app writing steps (Google Fit, Samsung Health or Fitbit), or on the phone's built-in step recording on newer Android versions. Verify this on your test devices.

---

## RECOMMENDATION

**Phase 0: start now (in parallel, long lead times)**
1. Decide whether this is formal research. If yes, begin the IRB/ethics application now, since SensorKit, Health Connect research use and App Store 5.1.3 all depend on it.
2. If yes, submit the Apple SensorKit research proposal from the institution's developer account ([Accessing SensorKit Data](https://www.researchandcare.org/resources/accessing-sensorkit-data/)).
3. Write the consent text and the in-app prominent-disclosure screen (Play User Data policy). Prepare the Data safety and privacy policy.

**Phase 1: Android MVP (about 2–3 weeks for a student team; inference)**
1. Move to EAS development builds.
2. Build a local Expo module (Kotlin) that reads `UsageEvents`, aggregates per local hour on the device, and returns rows matching the backend schema:
   - app id, name and category (from the curated server table plus `ApplicationInfo.category`)
   - seconds and opens
   - pickups (`KEYGUARD_HIDDEN`)
   - longest stretch without unlocking
3. Add an onboarding screen: disclosure → consent → `ACTION_USAGE_ACCESS_SETTINGS` → re-check.
4. Sync on app open plus `expo-background-task` (for example every 6 hours), re-sending the last 3 days each time. The backend's `PUT /v1/usage/days/{date}` already replaces a whole day per upload, so re-sending is safe.
5. For notifications, first try the undocumented type-12 usage events and validate them. Only if they're unreliable, add a count-only NotificationListenerService as a separate opt-in.

**Phase 2: steps (about 1 week)**
- Health Connect on Android via `react-native-health-connect`, and HealthKit on iOS via `@kingstinct/react-native-healthkit`. Keep `Pedometer` as a fallback on iOS.

**Phase 3: iOS**
- **Without SensorKit:** collect steps automatically, and add a weekly Screen Time screenshot upload with OCR plus short self-reports. Mark iOS rows as "self-reported/daily" in the backend so analyses don't mix them with Android hourly logs.
- **With SensorKit approved:** add a Swift Expo module for `deviceUsageReport` (and optionally `messagesUsageReport`), and accept the 24-hour delay and category-level data.
- Don't invest in the DeviceActivity threshold workaround.

**Phase 4: hardening**
- Test on Samsung, Pixel and Xiaomi (OEM battery managers can kill WorkManager).
- Handle time-zone changes and daylight-saving time when bucketing by hour.
- Add a data-deletion endpoint.
- Choose a distribution channel: a Play internal or closed test track (still policy-reviewed), or sideloading through a limited-distribution account (up to 20 devices).

## Open questions for the team
1. Is this an IRB/ethics-approved study? Which institution holds the Apple developer account? (The SensorKit entitlement goes to the researcher's account.)
2. How are you distributing? Public Play and App Store, Play closed testing plus TestFlight for participants only, or sideloaded APKs? How many participants?
3. What share of participants use iPhones? If it's large, is daily self-reported or screenshot data acceptable for iOS, or is SensorKit essential?
4. Do you really need hourly notification counts on Android, given that the reliable route needs notification-listener access?
5. Is "communication" versus "social" important? Android doesn't separate them, so you'll need a curated package list.
6. What's the retention and anonymisation policy for package names? (App inventory counts as sensitive data under Play policy.)
7. Is a minimum Android version (for example API 28+ for keyguard events) acceptable?
