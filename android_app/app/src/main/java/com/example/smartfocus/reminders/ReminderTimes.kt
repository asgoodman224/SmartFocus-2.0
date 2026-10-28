package com.example.smartfocus.reminders

import com.example.smartfocus.data.CheckIn
import com.example.smartfocus.data.CheckInKind
import com.example.smartfocus.data.CheckInStore
import com.example.smartfocus.data.ReminderSchedule
import java.util.Calendar

// When check-ins are due. Kept free of Android APIs so it can be unit tested.

private const val Day = 24 * 60
const val MiddayMinutes = 13 * 60

/** Minutes after midnight each reminder fires: at wake-up, 30 minutes before bed, and 1 PM. */
fun reminderMinutes(schedule: ReminderSchedule): Map<CheckInKind, Int> = buildMap {
    put(CheckInKind.Morning, schedule.wakeMinutes)
    put(CheckInKind.Evening, Math.floorMod(schedule.bedMinutes - 30, Day))
    if (schedule.middayEnabled) put(CheckInKind.Midday, MiddayMinutes)
}

/** The next time after [now] that the clock reads [minuteOfDay]. */
fun nextOccurrence(now: Long, minuteOfDay: Int): Long {
    val cal = Calendar.getInstance().apply {
        timeInMillis = now
        set(Calendar.HOUR_OF_DAY, minuteOfDay / 60)
        set(Calendar.MINUTE, minuteOfDay % 60)
        set(Calendar.SECOND, 0)
        set(Calendar.MILLISECOND, 0)
    }
    if (cal.timeInMillis <= now) cal.add(Calendar.DAY_OF_YEAR, 1)
    return cal.timeInMillis
}

fun minuteOfDay(time: Long): Int = Calendar.getInstance().run {
    timeInMillis = time
    get(Calendar.HOUR_OF_DAY) * 60 + get(Calendar.MINUTE)
}

/**
 * Which check-in a given time belongs to: from 2 hours before wake-up to 4 hours after is the
 * morning, 3 hours either side of bedtime is the evening.
 */
fun kindAt(minute: Int, schedule: ReminderSchedule): CheckInKind {
    fun within(start: Int, length: Int) = Math.floorMod(minute - start, Day) < length
    return when {
        within(schedule.wakeMinutes - 120, 360) -> CheckInKind.Morning
        within(schedule.bedMinutes - 180, 360) -> CheckInKind.Evening
        schedule.middayEnabled && within(MiddayMinutes - 60, 240) -> CheckInKind.Midday
        else -> CheckInKind.Anytime
    }
}

/** Whether today already has this kind of check-in, so its reminder can be skipped. */
fun isDone(kind: CheckInKind, checkIns: List<CheckIn>, now: Long): Boolean =
    checkIns.any { it.kind == kind && CheckInStore.isSameDay(it.timeMillis, now) }

/** The next check-in still to do later today, with its time in minutes after midnight. */
fun nextDue(now: Long, schedule: ReminderSchedule, checkIns: List<CheckIn>): Pair<CheckInKind, Int>? {
    if (!schedule.enabled) return null
    val minute = minuteOfDay(now)
    return reminderMinutes(schedule).entries
        .filter { (kind, at) -> at > minute && !isDone(kind, checkIns, now) }
        .minByOrNull { it.value }
        ?.toPair()
}
