package com.example.smartfocus

import com.example.smartfocus.data.CheckIn
import com.example.smartfocus.data.CheckInKind
import com.example.smartfocus.data.buildDashboard
import com.example.smartfocus.data.formatDistance
import com.example.smartfocus.data.formatDuration
import com.example.smartfocus.data.health.HealthDay
import com.example.smartfocus.data.health.HealthStatus
import com.example.smartfocus.data.moodMetric
import com.example.smartfocus.data.usage.AppCatalog
import com.example.smartfocus.data.usage.AppCategory
import com.example.smartfocus.data.usage.AppTime
import com.example.smartfocus.data.usage.UsageDay
import com.example.smartfocus.data.usage.UsageHour
import com.example.smartfocus.sync.Sync
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.LocalDate
import java.time.ZoneId

class DashboardTest {
    private val zone = ZoneId.of("America/New_York")
    private val today = LocalDate.of(2026, 10, 27)
    private val apps = { pkg: String ->
        when (pkg) {
            "chat" -> AppCatalog.App("Chat", AppCategory.Communication)
            else -> AppCatalog.App(pkg.replaceFirstChar { it.uppercase() }, AppCategory.Social)
        }
    }

    /** A day with [minutesPerHour] of "insta" in each of the first [hours] hours and 10 min of chat at noon. */
    private fun usageDay(date: LocalDate, hours: Int, minutesPerHour: Int, pickups: Int = 10) = UsageDay(
        date,
        (0 until 24).map { h ->
            val apps = buildMap {
                if (h < hours) put("insta", AppTime(minutesPerHour * 60, 1))
                if (h == 12) put("chat", AppTime(600, 2))
            }
            UsageHour(h, if (h == 9) pickups else 0, 0, apps)
        },
        longestBreakMinutes = 45,
    )

    @Test fun phoneUseComparesWithUsualByThisTime() {
        val days = (6 downTo 1).map { usageDay(today.minusDays(it.toLong()), 24, 10) } + usageDay(today, 12, 5)
        val d = buildDashboard(true, HealthStatus.NotGranted, days, null, apps, today.atTime(12, 0), zone, true)
        val phone = d.phone!!
        // Today: 12 × 5 min + 10 min of chat = 70. Usual by noon: 12 × 10 = 120.
        assertEquals("42% less than usual by now", phone.changeText)
        assertEquals(70, phone.totalMinutes)
        assertEquals(listOf("social"), d.metrics.map { it.id })
        assertEquals("10m", d.metrics.single().value)
        assertEquals(7, d.focusWeek!!.size)
    }

    @Test fun emptyDaysHaveNoFocusScore() {
        val days = listOf(UsageDay(today.minusDays(1), (0 until 24).map { UsageHour(it, 0, 0, emptyMap()) }, 0), usageDay(today, 3, 20))
        val d = buildDashboard(true, HealthStatus.Granted, days, null, apps, today.atTime(18, 0), zone, true)
        assertNull(d.focusWeek!![0])
        assertEquals("Nothing to compare with yet", d.phone!!.changeText)
    }

    @Test fun healthMetrics() {
        val days = listOf(
            HealthDay(today.minusDays(1), sleepMinutes = 400, steps = 6000, exerciseMinutes = 0, distanceMeters = 3000.0),
            HealthDay(today, sleepMinutes = 450, steps = 8200, exerciseMinutes = 35, exerciseLabel = "Run · 6:10 PM", distanceMeters = 5471.8),
        )
        val d = buildDashboard(false, HealthStatus.Granted, null, days, apps, today.atTime(20, 0), zone, true)
        assertEquals(listOf("sleep", "activity", "exercise", "mobility"), d.metrics.map { it.id })
        val (sleep, steps, exercise, mobility) = d.metrics
        assertEquals("7h 30m", sleep.value)
        assertEquals("8,200", steps.value)
        assertEquals("8,200 steps so far today, 1,800 to go.", steps.summary)
        assertEquals("Run · 6:10 PM", exercise.detail)
        assertEquals("3.4 mi", mobility.value)
        assertNull(d.phone)
        assertNull(d.focusWeek)
    }

    @Test fun nothingRecordedShowsDashes() {
        val d = buildDashboard(false, HealthStatus.Granted, null, listOf(HealthDay(today)), apps, today.atTime(8, 0), zone, false)
        val sleep = d.metrics.first()
        assertEquals("--", sleep.value)
        assertFalse(sleep.hasData)
        assertEquals("0.0 km", d.metrics[3].value)
    }

    @Test fun moodFromCheckIns() {
        val noon = today.atTime(12, 0).atZone(zone).toInstant().toEpochMilli()
        val checkIns = listOf(
            CheckIn(noon, CheckInKind.Anytime, 4, 3, 3),
            CheckIn(noon + 3_600_000, CheckInKind.Anytime, 5, 3, 3),
            CheckIn(noon - 86_400_000, CheckInKind.Anytime, 2, 3, 3),
        )
        val mood = moodMetric(checkIns, today, zone)
        assertEquals("4.5 / 5", mood.value)
        assertEquals("Great", mood.detail) // 4.5 rounds up
        assertEquals(listOf("--", "--", "--", "--", "--", "2 / 5", "4.5 / 5"), mood.weekText)
        assertTrue(mood.hasData)
        assertFalse(moodMetric(emptyList(), today, zone).hasData)
    }

    @Test fun formatting() {
        assertEquals("45m", formatDuration(45))
        assertEquals("2h", formatDuration(120))
        assertEquals("3h 46m", formatDuration(226))
        assertEquals("1.0 mi", formatDistance(1609.344, true))
        assertEquals("1.6 km", formatDistance(1609.344, false))
    }

    @Test fun uploadsMatchTheBackendShape() {
        val usage = Sync.usageJson(usageDay(today, 1, 30, pickups = 4), apps)
        assertEquals(45, usage.getInt("longestFocusMinutes"))
        val hours = usage.getJSONArray("hours")
        assertEquals(3, hours.length()) // midnight (app use), 9 AM (pickups), noon (chat)
        val app = hours.getJSONObject(0).getJSONArray("apps").getJSONObject(0)
        assertEquals("insta", app.getString("appId"))
        assertEquals("Insta", app.getString("appName"))
        assertEquals("social", app.getString("category"))
        assertEquals(1800, app.getInt("seconds"))

        val health = Sync.healthJson(HealthDay(today, sleepMinutes = 420, distanceMeters = 1234.9))
        assertEquals(420, health.getInt("sleepMinutes"))
        assertTrue(health.isNull("steps"))
        assertEquals(1234, health.getLong("distanceMeters"))
    }
}
