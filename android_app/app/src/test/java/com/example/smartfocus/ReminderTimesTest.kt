package com.example.smartfocus

import com.example.smartfocus.data.CheckIn
import com.example.smartfocus.data.CheckInKind
import com.example.smartfocus.data.ReminderSchedule
import com.example.smartfocus.data.formatMinutes
import com.example.smartfocus.reminders.isDone
import com.example.smartfocus.reminders.kindAt
import com.example.smartfocus.reminders.minuteOfDay
import com.example.smartfocus.reminders.nextDue
import com.example.smartfocus.reminders.nextOccurrence
import com.example.smartfocus.reminders.reminderMinutes
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.util.Calendar

class ReminderTimesTest {
    private val schedule = ReminderSchedule(enabled = true, wakeMinutes = 7 * 60 + 30, bedMinutes = 23 * 60, middayEnabled = false)

    private fun at(hour: Int, minute: Int = 0, daysLater: Int = 0): Long = Calendar.getInstance().apply {
        set(2026, Calendar.OCTOBER, 28, hour, minute, 0)
        set(Calendar.MILLISECOND, 0)
        add(Calendar.DAY_OF_YEAR, daysLater)
    }.timeInMillis

    private fun checkIn(kind: CheckInKind, time: Long) = CheckIn(time, kind, 3, 3, 3)

    @Test fun remindersAtWakeAndBeforeBed() {
        assertEquals(mapOf(CheckInKind.Morning to 450, CheckInKind.Evening to 1350), reminderMinutes(schedule))
        assertEquals(780, reminderMinutes(schedule.copy(middayEnabled = true))[CheckInKind.Midday])
        // A 12:15 AM bedtime puts the evening reminder before midnight.
        assertEquals(1425, reminderMinutes(schedule.copy(bedMinutes = 15))[CheckInKind.Evening])
    }

    @Test fun nextOccurrenceIsTodayOrTomorrow() {
        assertEquals(at(7, 30), nextOccurrence(at(6), 450))
        assertEquals(at(7, 30, daysLater = 1), nextOccurrence(at(7, 30), 450))
        assertEquals(at(7, 30, daysLater = 1), nextOccurrence(at(22), 450))
    }

    @Test fun kindFollowsTheClock() {
        assertEquals(CheckInKind.Morning, kindAt(minuteOfDay(at(5, 30)), schedule))
        assertEquals(CheckInKind.Morning, kindAt(minuteOfDay(at(11, 29)), schedule))
        assertEquals(CheckInKind.Anytime, kindAt(minuteOfDay(at(13)), schedule))
        assertEquals(CheckInKind.Midday, kindAt(minuteOfDay(at(13)), schedule.copy(middayEnabled = true)))
        assertEquals(CheckInKind.Evening, kindAt(minuteOfDay(at(20)), schedule))
        assertEquals(CheckInKind.Evening, kindAt(minuteOfDay(at(1, 30)), schedule))
        assertEquals(CheckInKind.Anytime, kindAt(minuteOfDay(at(3)), schedule))
    }

    @Test fun doneOnlyCountsToday() {
        val morning = checkIn(CheckInKind.Morning, at(8))
        assertTrue(isDone(CheckInKind.Morning, listOf(morning), at(12)))
        assertFalse(isDone(CheckInKind.Evening, listOf(morning), at(12)))
        assertFalse(isDone(CheckInKind.Morning, listOf(morning), at(8, daysLater = 1)))
    }

    @Test fun nextDueSkipsDoneAndPast() {
        assertEquals(CheckInKind.Morning to 450, nextDue(at(6), schedule, emptyList()))
        assertEquals(CheckInKind.Evening to 1350, nextDue(at(9), schedule, emptyList()))
        assertNull(nextDue(at(9), schedule, listOf(checkIn(CheckInKind.Evening, at(9)))))
        assertNull(nextDue(at(9), schedule.copy(enabled = false), emptyList()))
    }

    @Test fun formatsTimes() {
        assertEquals("7:30 AM", formatMinutes(450))
        assertEquals("12:05 AM", formatMinutes(5))
        assertEquals("12:00 PM", formatMinutes(720))
        assertEquals("10:30 PM", formatMinutes(1350))
    }
}
