package com.example.smartfocus

import com.example.smartfocus.data.focusScore
import com.example.smartfocus.data.usage.EventTypes
import com.example.smartfocus.data.usage.UsageEvent
import com.example.smartfocus.data.usage.aggregateDay
import org.junit.Assert.assertEquals
import org.junit.Test
import java.time.LocalDate
import java.time.ZoneId

class UsageAggregationTest {
    private val zone = ZoneId.of("America/New_York")
    private val date = LocalDate.of(2026, 10, 27)
    private val endOfDay = date.plusDays(1).atStartOfDay(zone).toInstant().toEpochMilli()

    private fun at(hour: Int, minute: Int = 0, dayOffset: Long = 0) =
        date.plusDays(dayOffset).atTime(hour, minute).atZone(zone).toInstant().toEpochMilli()
    private fun ev(hour: Int, minute: Int, type: Int, pkg: String = "android", dayOffset: Long = 0) =
        UsageEvent(at(hour, minute, dayOffset), type, pkg)

    private fun unlock(h: Int, m: Int) = ev(h, m, EventTypes.KeyguardHidden)
    private fun lock(h: Int, m: Int, dayOffset: Long = 0) = ev(h, m, EventTypes.KeyguardShown, dayOffset = dayOffset)
    private fun open(h: Int, m: Int, pkg: String) = ev(h, m, EventTypes.ActivityResumed, pkg)
    private fun pause(h: Int, m: Int, pkg: String) = ev(h, m, EventTypes.ActivityPaused, pkg)

    @Test fun countsTimeOpensAndPickups() {
        val events = listOf(
            lock(23, 0, dayOffset = -1),
            unlock(9, 0), open(9, 0, "insta"), pause(9, 20, "insta"), lock(9, 20),
            unlock(12, 0), open(12, 0, "chat"), pause(12, 5, "chat"), open(12, 5, "insta"), lock(12, 15),
        )
        val day = aggregateDay(events, date, zone, now = at(13, 0))
        assertEquals(2, day.pickups)
        assertEquals(35, day.totalMinutes)
        assertEquals(20 * 60, day.hours[9].apps["insta"]!!.seconds)
        assertEquals(1, day.hours[9].apps["insta"]!!.opens)
        assertEquals(1, day.hours[12].apps["chat"]!!.opens)
        assertEquals(10 * 60, day.hours[12].apps["insta"]!!.seconds)
        // Overnight doesn't count as a break; 9:20 → 12:00 is the longest one in waking hours.
        assertEquals(160, day.longestBreakMinutes)
    }

    @Test fun splitsAtHourBoundaries() {
        val events = listOf(unlock(10, 50), open(10, 50, "video"), lock(11, 20))
        val day = aggregateDay(events, date, zone, endOfDay)
        assertEquals(10 * 60, day.hours[10].apps["video"]!!.seconds)
        assertEquals(20 * 60, day.hours[11].apps["video"]!!.seconds)
        assertEquals(0, day.hours[11].apps["video"]!!.opens)
    }

    @Test fun movingWithinAnAppIsNotANewOpen() {
        val events = listOf(
            unlock(8, 0), open(8, 0, "mail"), pause(8, 1, "mail"), open(8, 1, "mail"),
            // A late "stopped" event from the first screen must not end the app's time.
            ev(8, 2, 23, "mail"), lock(8, 10),
        )
        val day = aggregateDay(events, date, zone, endOfDay)
        assertEquals(1, day.hours[8].apps["mail"]!!.opens)
        assertEquals(10 * 60, day.hours[8].apps["mail"]!!.seconds)
    }

    @Test fun homeScreenEndsAppTimeAndIsntCounted() {
        val events = listOf(unlock(15, 0), open(15, 0, "game"), open(15, 30, "launcher"), lock(15, 40))
        val day = aggregateDay(events, date, zone, endOfDay, ignored = setOf("launcher"))
        assertEquals(30, day.totalMinutes)
        assertEquals(null, day.hours[15].apps["launcher"])
    }

    @Test fun stillOpenAppCountsUntilNow() {
        val events = listOf(unlock(14, 0), open(14, 0, "smartfocus"))
        val day = aggregateDay(events, date, zone, now = at(14, 45))
        assertEquals(45, day.totalMinutes)
    }

    @Test fun noLockScreenFallsBackToScreenOn() {
        val events = listOf(
            ev(7, 0, EventTypes.ScreenInteractive), ev(7, 5, EventTypes.ScreenNonInteractive),
            ev(8, 0, EventTypes.ScreenInteractive), ev(8, 5, EventTypes.ScreenNonInteractive),
        )
        assertEquals(2, aggregateDay(events, date, zone, endOfDay).pickups)
    }

    @Test fun countsNotifications() {
        val events = listOf(ev(10, 0, EventTypes.NotificationInterruption, "chat"), ev(10, 30, EventTypes.NotificationInterruption, "mail"))
        assertEquals(2, aggregateDay(events, date, zone, endOfDay).hours[10].notifications)
    }

    @Test fun focusMatchesBackendFormula() {
        assertEquals(100, focusScore(0, 0, 90))
        assertEquals(60, focusScore(0, 0, 0))
        // 40·(1−75/150) + 20·(1−150/300) + 40·(45/90) = 20 + 10 + 20
        assertEquals(50, focusScore(75, 150, 45))
        assertEquals(0, focusScore(400, 900, 0))
    }
}
