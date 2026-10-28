package com.example.smartfocus.data.usage

import android.content.Context
import android.content.Intent
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager

/** The categories the backend groups apps into. [apiName] is what's sent to it. */
enum class AppCategory(val apiName: String) {
    Productivity("productivity"),
    Communication("communication"),
    Social("social"),
    Entertainment("entertainment"),
    Other("other"),
}

/**
 * Popular apps whose category Android doesn't report (or reports too broadly: Android files
 * messaging under "social"). Checked before the app's own category.
 */
private val KnownApps = mapOf(
    // Messaging and calls
    "com.whatsapp" to AppCategory.Communication,
    "org.telegram.messenger" to AppCategory.Communication,
    "org.thoughtcrime.securesms" to AppCategory.Communication,
    "com.google.android.apps.messaging" to AppCategory.Communication,
    "com.samsung.android.messaging" to AppCategory.Communication,
    "com.facebook.orca" to AppCategory.Communication,
    "com.discord" to AppCategory.Communication,
    "com.google.android.dialer" to AppCategory.Communication,
    "com.samsung.android.dialer" to AppCategory.Communication,
    "com.samsung.android.incallui" to AppCategory.Communication,
    "com.google.android.apps.tachyon" to AppCategory.Communication,
    "us.zoom.videomeetings" to AppCategory.Communication,
    "com.groupme.android" to AppCategory.Communication,
    "com.microsoft.teams" to AppCategory.Communication,
    "com.Slack" to AppCategory.Communication,
    // Social media
    "com.instagram.android" to AppCategory.Social,
    "com.zhiliaoapp.musically" to AppCategory.Social,
    "com.ss.android.ugc.trill" to AppCategory.Social,
    "com.snapchat.android" to AppCategory.Social,
    "com.twitter.android" to AppCategory.Social,
    "com.facebook.katana" to AppCategory.Social,
    "com.reddit.frontpage" to AppCategory.Social,
    "com.pinterest" to AppCategory.Social,
    "com.linkedin.android" to AppCategory.Social,
    "com.bereal.ft" to AppCategory.Social,
    "com.instagram.barcelona" to AppCategory.Social,
    "com.tumblr" to AppCategory.Social,
    // Video, music and games
    "com.google.android.youtube" to AppCategory.Entertainment,
    "com.netflix.mediaclient" to AppCategory.Entertainment,
    "com.spotify.music" to AppCategory.Entertainment,
    "tv.twitch.android.app" to AppCategory.Entertainment,
    "com.disney.disneyplus" to AppCategory.Entertainment,
    "com.hulu.plus" to AppCategory.Entertainment,
    "com.amazon.avod.thirdpartyclient" to AppCategory.Entertainment,
    "com.wbd.stream" to AppCategory.Entertainment,
    "com.roblox.client" to AppCategory.Entertainment,
    // Work and school
    "com.google.android.gm" to AppCategory.Productivity,
    "com.microsoft.office.outlook" to AppCategory.Productivity,
    "com.google.android.apps.docs" to AppCategory.Productivity,
    "com.google.android.apps.docs.editors.docs" to AppCategory.Productivity,
    "com.google.android.calendar" to AppCategory.Productivity,
    "com.samsung.android.calendar" to AppCategory.Productivity,
    "com.notion.id" to AppCategory.Productivity,
    "com.instructure.candroid" to AppCategory.Productivity,
)

fun categoryOf(pkg: String, androidCategory: Int?): AppCategory = KnownApps[pkg] ?: when (androidCategory) {
    ApplicationInfo.CATEGORY_SOCIAL -> AppCategory.Social
    ApplicationInfo.CATEGORY_VIDEO, ApplicationInfo.CATEGORY_AUDIO, ApplicationInfo.CATEGORY_GAME -> AppCategory.Entertainment
    ApplicationInfo.CATEGORY_PRODUCTIVITY -> AppCategory.Productivity
    else -> AppCategory.Other
}

/** App names and categories, looked up once per package. */
class AppCatalog(context: Context) {
    data class App(val name: String, val category: AppCategory)

    private val pm = context.packageManager
    private val cache = java.util.concurrent.ConcurrentHashMap<String, App>()

    operator fun get(pkg: String): App = cache.getOrPut(pkg) {
        val info = runCatching { pm.getApplicationInfo(pkg, 0) }.getOrNull()
        App(
            name = info?.let { pm.getApplicationLabel(it).toString() } ?: pkg,
            category = categoryOf(pkg, info?.category),
        )
    }

    companion object {
        /** Home screens: switching to them ends app time but isn't time "in" an app. */
        fun launchers(context: Context): Set<String> =
            context.packageManager
                .queryIntentActivities(Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME), PackageManager.MATCH_ALL)
                .map { it.activityInfo.packageName }
                .toSet() + "com.android.systemui"
    }
}
