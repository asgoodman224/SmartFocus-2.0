package com.example.smartfocus.data.usage

import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.temporal.ChronoUnit

/** Time in one app during one hour. */
data class AppTime(val seconds: Int, val opens: Int)

data class UsageHour(val hour: Int, val pickups: Int, val notifications: Int, val apps: Map<String, AppTime>) {
    val seconds: Int get() = apps.values.sumOf { it.seconds }
}

/**
 * One local day of phone use, built from Android's usage events. [hours] always has 24 entries,
 * midnight first. Apps are keyed by package name.
 */
data class UsageDay(val date: LocalDate, val hours: List<UsageHour>, val longestBreakMinutes: Int) {
    val totalMinutes: Int get() = hours.sumOf { it.seconds } / 60
    val pickups: Int get() = hours.sumOf { it.pickups }
    val notifications: Int get() = hours.sumOf { it.notifications }

    /** Minutes used before [hour]:[minute] (for "compared with usual by this time"). */
    fun minutesBefore(hour: Int, minute: Int): Double =
        hours.take(hour).sumOf { it.seconds } / 60.0 + (hours.getOrNull(hour)?.seconds ?: 0) / 60.0 * minute / 60.0

    fun minutesIn(packages: (String) -> Boolean): Int =
        hours.sumOf { h -> h.apps.filterKeys(packages).values.sumOf { it.seconds } } / 60
}

/** A usage event reduced to what [aggregateDay] needs. [type] uses UsageEvents.Event's constants. */
data class UsageEvent(val time: Long, val type: Int, val pkg: String)

object EventTypes {
    const val ActivityResumed = 1
    const val ActivityPaused = 2
    /** Hidden from the SDK but delivered to apps; counts notifications without reading them. */
    const val NotificationInterruption = 12
    const val ScreenInteractive = 15
    const val ScreenNonInteractive = 16
    const val KeyguardShown = 17
    const val KeyguardHidden = 18
    const val DeviceShutdown = 26
}

/** Breaks only count between these hours, so sleeping doesn't win "longest break" every day. */
const val BreakWindowStartHour = 6
const val BreakWindowEndHour = 22

/**
 * Turns raw events into a [UsageDay]. Pass events from a few hours before the day starts too,
 * so the phone's state at midnight (locked, or in an app) is known.
 *
 * - Time in an app runs from its activity resuming until it pauses, the screen locks or
 *   another app resumes, split at hour boundaries.
 * - An open is switching into an app from something else (the home screen, another app or the
 *   lock screen); moving between screens of the same app isn't.
 * - A pickup is an unlock. Phones without a lock screen count the screen turning on instead.
 * - [ignored] packages (launchers, system UI) never count as app time.
 */
fun aggregateDay(
    events: List<UsageEvent>,
    date: LocalDate,
    zone: ZoneId,
    now: Long,
    ignored: Set<String> = emptySet(),
): UsageDay {
    fun millis(hour: Int) = date.atTime(hour % 24, 0).atZone(zone).toInstant().toEpochMilli()
    val dayStart = date.atStartOfDay(zone).toInstant().toEpochMilli()
    val end = minOf(now, date.plusDays(1).atStartOfDay(zone).toInstant().toEpochMilli())
    val breakStart = millis(BreakWindowStartHour)
    val breakEnd = millis(BreakWindowEndHour)

    val hasKeyguard = events.any { it.type == EventTypes.KeyguardHidden || it.type == EventTypes.KeyguardShown }
    val unlock = if (hasKeyguard) EventTypes.KeyguardHidden else EventTypes.ScreenInteractive
    val lock = if (hasKeyguard) EventTypes.KeyguardShown else EventTypes.ScreenNonInteractive

    val millisIn = List(24) { HashMap<String, Long>() }
    val opens = List(24) { HashMap<String, Int>() }
    val pickups = IntArray(24)
    val notifications = IntArray(24)
    var foreground: String? = null
    var foregroundSince = 0L
    var previous: String? = null
    var lockedSince: Long? = null
    var longestBreak = 0L

    fun hourOf(t: Long) = Instant.ofEpochMilli(t).atZone(zone).hour
    fun inDay(t: Long) = t in dayStart until end
    fun closeForeground(t: Long) {
        val pkg = foreground ?: return
        var a = maxOf(foregroundSince, dayStart)
        val b = minOf(t, end)
        while (a < b) {
            val at = Instant.ofEpochMilli(a).atZone(zone)
            val stop = minOf(b, at.truncatedTo(ChronoUnit.HOURS).plusHours(1).toInstant().toEpochMilli())
            millisIn[at.hour].merge(pkg, stop - a, Long::plus)
            a = stop
        }
        foreground = null
    }
    fun endBreak(t: Long) {
        val since = lockedSince ?: return
        // Only breaks that start in waking hours: the stretch before the first unlock is sleep.
        val length = if (since < breakStart) 0L else minOf(t, breakEnd) - since
        if (length > longestBreak) longestBreak = length
        lockedSince = null
    }

    for (e in events.sortedBy { it.time }) {
        if (e.time >= end) break
        when (e.type) {
            EventTypes.ActivityResumed -> {
                if (e.pkg in ignored) {
                    closeForeground(e.time)
                } else if (e.pkg != foreground) {
                    closeForeground(e.time)
                    if (e.pkg != previous && inDay(e.time)) opens[hourOf(e.time)].merge(e.pkg, 1, Int::plus)
                    foreground = e.pkg
                    foregroundSince = e.time
                }
                previous = e.pkg
            }
            // Only pauses end app time: a "stopped" event can arrive after the app's next screen resumed.
            EventTypes.ActivityPaused -> if (e.pkg == foreground) closeForeground(e.time)
            EventTypes.ScreenNonInteractive, EventTypes.KeyguardShown, EventTypes.DeviceShutdown -> {
                closeForeground(e.time)
                previous = null
                if ((e.type == lock || e.type == EventTypes.DeviceShutdown) && lockedSince == null) lockedSince = e.time
            }
            EventTypes.NotificationInterruption -> if (inDay(e.time)) notifications[hourOf(e.time)]++
        }
        if (e.type == unlock) {
            if (inDay(e.time)) pickups[hourOf(e.time)]++
            endBreak(e.time)
        }
    }
    closeForeground(end)
    endBreak(end)

    val hours = (0 until 24).map { h ->
        val apps = (millisIn[h].keys + opens[h].keys).associateWith { pkg ->
            AppTime(
                seconds = ((millisIn[h][pkg] ?: 0L) / 1000).toInt().coerceAtMost(3600),
                opens = opens[h][pkg] ?: 0,
            )
        }
        UsageHour(h, pickups[h], notifications[h], apps)
    }
    return UsageDay(date, hours, (longestBreak / 60_000).toInt())
}
