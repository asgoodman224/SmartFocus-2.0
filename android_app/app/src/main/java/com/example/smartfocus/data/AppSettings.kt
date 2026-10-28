package com.example.smartfocus.data

import android.content.Context
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/** What fills the big headline on Home. [Wellness] is the default. */
enum class HeroStyle(val label: String, val description: String) {
    Wellness("Wellness score", "One 0–100 score from body, mind and digital habits"),
    Ring("Score ring", "The score inside a ring showing each area"),
    RightNow("Right now", "What matters at this time of day"),
    Conditions("Conditions", "Your day described like the weather"),
    Focus("Focus", "How focused your phone use has been"),
}

/** User preferences, saved on the phone and observable from Compose. */
class AppSettings(context: Context) {
    private val prefs = context.getSharedPreferences("settings", Context.MODE_PRIVATE)

    var heroStyle by mutableStateOf(
        runCatching { HeroStyle.valueOf(prefs.getString("hero", null)!!) }.getOrDefault(HeroStyle.Wellness)
    )
        private set

    var remindersEnabled by mutableStateOf(prefs.getBoolean("reminders", true))
        private set

    /** Minutes after midnight. */
    var wakeMinutes by mutableStateOf(prefs.getInt("wake", 7 * 60 + 30))
        private set

    /** Minutes after midnight. */
    var bedMinutes by mutableStateOf(prefs.getInt("bed", 23 * 60))
        private set

    var middayEnabled by mutableStateOf(prefs.getBoolean("midday", false))
        private set

    fun updateHeroStyle(value: HeroStyle) { heroStyle = value; prefs.edit().putString("hero", value.name).apply() }
    fun updateReminders(value: Boolean) { remindersEnabled = value; prefs.edit().putBoolean("reminders", value).apply() }
    fun updateWake(minutes: Int) { wakeMinutes = minutes; prefs.edit().putInt("wake", minutes).apply() }
    fun updateBed(minutes: Int) { bedMinutes = minutes; prefs.edit().putInt("bed", minutes).apply() }
    fun updateMidday(value: Boolean) { middayEnabled = value; prefs.edit().putBoolean("midday", value).apply() }

    /** A plain snapshot of the reminder settings, for code that runs outside Compose. */
    fun schedule() = ReminderSchedule(remindersEnabled, wakeMinutes, bedMinutes, middayEnabled)

    /** The app opens each check-in by itself at most once a day, so dismissing it sticks. */
    fun autoPrompted(kind: CheckInKind, now: Long): Boolean = prefs.getString("prompted_${kind.name}", null) == dayKey(now)
    fun markAutoPrompted(kind: CheckInKind, now: Long) = prefs.edit().putString("prompted_${kind.name}", dayKey(now)).apply()

    /** Whether we've asked for notification permission yet (asked once, after the first check-in). */
    var askedNotifications: Boolean
        get() = prefs.getBoolean("asked_notifications", false)
        set(value) = prefs.edit().putBoolean("asked_notifications", value).apply()

    private fun dayKey(time: Long) = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date(time))
}

data class ReminderSchedule(
    val enabled: Boolean,
    val wakeMinutes: Int,
    val bedMinutes: Int,
    val middayEnabled: Boolean,
)

/** "7:30 AM" for minutes after midnight. */
fun formatMinutes(minutes: Int): String {
    val h = (minutes / 60) % 24
    val m = minutes % 60
    return "${if (h % 12 == 0) 12 else h % 12}:${m.toString().padStart(2, '0')} ${if (h < 12) "AM" else "PM"}"
}
