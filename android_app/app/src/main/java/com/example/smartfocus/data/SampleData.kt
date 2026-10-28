package com.example.smartfocus.data

import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import com.example.smartfocus.ui.icons.AppIcons
import com.example.smartfocus.ui.icons.Exercise
import com.example.smartfocus.ui.icons.Explore
import com.example.smartfocus.ui.icons.Groups
import com.example.smartfocus.ui.icons.Mood
import com.example.smartfocus.ui.icons.Phone
import com.example.smartfocus.ui.icons.Sleep
import com.example.smartfocus.ui.icons.Walk
import com.example.smartfocus.ui.theme.MetricColors
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale

// SAMPLE DATA. Everything here stands in for Health Connect, usage access and check-ins until
// those are connected. Week lists run oldest first; the last value is today.

data class Metric(
    val id: String,
    val title: String,
    val icon: ImageVector,
    /** Today's value, formatted. */
    val value: String,
    /** One supporting line under the value. */
    val detail: String,
    val goal: String,
    /** Today as a share of the goal, 0..1. */
    val progress: Float,
    val colors: List<Color>,
    val week: List<Float>,
    val weekText: List<String>,
    val goalValue: Float,
    val summary: String,
    val source: String,
)

data class PhoneUse(
    val totalText: String,
    val changeText: String,
    val pickups: Int,
    val longestBreakText: String,
    /** Minutes of use in each hour of today, midnight first. */
    val hourly: List<Int>,
)

val sampleMetrics = listOf(
    Metric(
        id = "sleep", title = "Sleep", icon = AppIcons.Sleep,
        value = "7h 10m", detail = "11:40 PM – 6:50 AM", goal = "8h", progress = 0.90f,
        colors = MetricColors.Sleep,
        week = listOf(6.8f, 7.4f, 6.2f, 7.9f, 6.5f, 8.1f, 7.17f),
        weekText = listOf("6h 48m", "7h 24m", "6h 12m", "7h 54m", "6h 30m", "8h 6m", "7h 10m"),
        goalValue = 8f,
        summary = "You slept 7h 10m, a little above your weekly average. Nights you went to bed " +
            "before midnight were your longest.",
        source = "Sleep sessions from Health Connect.",
    ),
    Metric(
        id = "activity", title = "Activity", icon = AppIcons.Walk,
        value = "8,200", detail = "steps · 3.9 mi", goal = "10,000", progress = 0.82f,
        colors = MetricColors.Activity,
        week = listOf(6400f, 9100f, 7200f, 10400f, 5800f, 7300f, 8200f),
        weekText = listOf("6,400", "9,100", "7,200", "10,400", "5,800", "7,300", "8,200"),
        goalValue = 10000f,
        summary = "8,200 steps so far today. A 20-minute walk would get you to your goal.",
        source = "Step count from Health Connect.",
    ),
    Metric(
        id = "exercise", title = "Exercise", icon = AppIcons.Exercise,
        value = "35 min", detail = "Run · 6:10 PM", goal = "45 min", progress = 0.78f,
        colors = MetricColors.Exercise,
        week = listOf(20f, 45f, 0f, 30f, 40f, 25f, 35f),
        weekText = listOf("20 min", "45 min", "0 min", "30 min", "40 min", "25 min", "35 min"),
        goalValue = 45f,
        summary = "One 35-minute run today. You exercised on 6 of the last 7 days.",
        source = "Exercise sessions from Health Connect.",
    ),
    Metric(
        id = "mobility", title = "Mobility", icon = AppIcons.Explore,
        value = "3.4 mi", detail = "4 places visited", goal = "4 mi", progress = 0.85f,
        colors = MetricColors.Mobility,
        week = listOf(2.1f, 3.8f, 2.6f, 4.2f, 1.9f, 3.0f, 3.4f),
        weekText = listOf("2.1 mi", "3.8 mi", "2.6 mi", "4.2 mi", "1.9 mi", "3.0 mi", "3.4 mi"),
        goalValue = 4f,
        summary = "You covered 3.4 miles today, more than on most days this week.",
        source = "Distance from Health Connect.",
    ),
    Metric(
        id = "social", title = "Social", icon = AppIcons.Groups,
        value = "5", detail = "conversations", goal = "6", progress = 0.83f,
        colors = MetricColors.Social,
        week = listOf(3f, 6f, 4f, 5f, 2f, 7f, 5f),
        weekText = listOf("3", "6", "4", "5", "2", "7", "5"),
        goalValue = 6f,
        summary = "5 conversations today, mostly in messaging apps.",
        source = "Time in messaging and social apps, from usage access.",
    ),
    Metric(
        id = "mood", title = "Mood", icon = AppIcons.Mood,
        value = "4 / 5", detail = "Good", goal = "4 / 5", progress = 1.0f,
        colors = MetricColors.Mood,
        week = listOf(3f, 4f, 3f, 4f, 3f, 5f, 4f),
        weekText = listOf("3 / 5", "4 / 5", "3 / 5", "4 / 5", "3 / 5", "5 / 5", "4 / 5"),
        goalValue = 4f,
        summary = "You've rated your mood 4 or higher on 4 of the last 7 days.",
        source = "Your check-ins.",
    ),
)

val samplePhoneUse = PhoneUse(
    totalText = "3h 46m",
    changeText = "9% less than usual",
    pickups = 61,
    longestBreakText = "1h 24m",
    hourly = listOf(2, 0, 0, 0, 0, 0, 4, 14, 12, 10, 9, 8, 16, 11, 9, 10, 12, 14, 18, 22, 24, 17, 10, 4),
)

/** Phone use as a metric, for its detail sheet. The goal is a daily limit: lower is better. */
val samplePhoneMetric = Metric(
    id = "phone", title = "Phone use", icon = AppIcons.Phone,
    value = "3h 46m", detail = "61 pickups", goal = "4h limit", progress = 226f / 240f,
    colors = MetricColors.Phone,
    week = listOf(262f, 241f, 298f, 205f, 233f, 318f, 226f),
    weekText = listOf("4h 22m", "4h 1m", "4h 58m", "3h 25m", "3h 53m", "5h 18m", "3h 46m"),
    goalValue = 240f,
    summary = "3h 46m so far today, 9% less than usual. Evenings are your heaviest phone time, " +
        "mostly social and video apps.",
    source = "Screen time, app use and pickups from usage access.",
)

/** Focus score (0–100) for each of the last 7 days, oldest first. */
val sampleFocusWeek = listOf(64, 71, 58, 76, 69, 61, 72)

/** Short weekday names for the last 7 days, oldest first, with "Today" last. */
fun lastSevenDays(): List<String> {
    val format = SimpleDateFormat("EEE", Locale.getDefault())
    return (6 downTo 0).map { daysAgo ->
        if (daysAgo == 0) "Today"
        else format.format(Calendar.getInstance().apply { add(Calendar.DAY_OF_YEAR, -daysAgo) }.time)
    }
}

/** Day-of-month numbers for the last 7 days, oldest first. */
fun lastSevenDates(): List<Int> = (6 downTo 0).map { daysAgo ->
    Calendar.getInstance().apply { add(Calendar.DAY_OF_YEAR, -daysAgo) }.get(Calendar.DAY_OF_MONTH)
}

fun greeting(hour: Int = Calendar.getInstance().get(Calendar.HOUR_OF_DAY)): String = when (hour) {
    in 5..11 -> "Good morning"
    in 12..17 -> "Good afternoon"
    else -> "Good evening"
}
