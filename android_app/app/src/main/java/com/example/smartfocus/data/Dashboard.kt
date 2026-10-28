package com.example.smartfocus.data

import com.example.smartfocus.data.health.HealthDay
import com.example.smartfocus.data.health.HealthStatus
import com.example.smartfocus.data.health.formatTime
import com.example.smartfocus.data.usage.AppCatalog
import com.example.smartfocus.data.usage.AppCategory
import com.example.smartfocus.data.usage.UsageDay
import com.example.smartfocus.ui.icons.AppIcons
import com.example.smartfocus.ui.icons.Exercise
import com.example.smartfocus.ui.icons.Explore
import com.example.smartfocus.ui.icons.Groups
import com.example.smartfocus.ui.icons.Mood
import com.example.smartfocus.ui.icons.Phone
import com.example.smartfocus.ui.icons.Sleep
import com.example.smartfocus.ui.icons.Walk
import com.example.smartfocus.ui.theme.MetricColors
import java.text.NumberFormat
import java.time.Instant
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.ZoneId
import java.util.Locale
import kotlin.math.abs
import kotlin.math.roundToInt

/** Everything Home shows that comes from the phone (check-ins are added separately). */
data class Dashboard(
    val usageAccess: Boolean,
    val health: HealthStatus,
    /** Sleep, activity, exercise and mobility when Health Connect is connected, then social. */
    val metrics: List<Metric>,
    val phone: PhoneUse?,
    val phoneMetric: Metric?,
    /** Focus score for each of the last 7 days, oldest first; null where there's no data. */
    val focusWeek: List<Int?>?,
)

// Daily goals. Placeholders until the research team sets them.
private const val SleepGoalMinutes = 8 * 60
private const val StepGoal = 10_000
private const val ExerciseGoalMinutes = 30
private const val DistanceGoalMeters = 6_437.0 // 4 miles
private const val SocialGoalMinutes = 30
private const val PhoneLimitMinutes = 4 * 60

fun buildDashboard(
    usageAccess: Boolean,
    health: HealthStatus,
    usageDays: List<UsageDay>?,
    healthDays: List<HealthDay>?,
    apps: (String) -> AppCatalog.App,
    now: LocalDateTime,
    zone: ZoneId = ZoneId.systemDefault(),
    useMiles: Boolean = usesMiles(Locale.getDefault()),
): Dashboard {
    val metrics = buildList {
        if (healthDays != null && healthDays.isNotEmpty()) {
            add(sleepMetric(healthDays, zone))
            add(activityMetric(healthDays, useMiles))
            add(exerciseMetric(healthDays))
            add(mobilityMetric(healthDays, useMiles))
        }
        if (usageDays != null && usageDays.isNotEmpty()) add(socialMetric(usageDays, apps))
    }
    val usage = usageDays?.takeIf { it.isNotEmpty() }
    return Dashboard(
        usageAccess = usageAccess,
        health = health,
        metrics = metrics,
        phone = usage?.let { phoneUse(it, now) },
        phoneMetric = usage?.let { phoneMetric(it, apps) },
        focusWeek = usage?.map { day ->
            if (day.totalMinutes == 0 && day.pickups == 0) null
            else focusScore(day.pickups, day.notifications, day.longestBreakMinutes)
        },
    )
}

// ---- Phone use ------------------------------------------------------------------------------

internal fun phoneUse(days: List<UsageDay>, now: LocalDateTime): PhoneUse {
    val today = days.last()
    val earlier = days.dropLast(1).filter { it.totalMinutes > 0 }
    val change = if (earlier.isEmpty()) {
        "Nothing to compare with yet"
    } else {
        // Compare with earlier days up to this time of day, not with whole days.
        val usual = earlier.map { it.minutesBefore(now.hour, now.minute) }.average()
        val diff = if (usual < 1) 0.0 else (today.totalMinutes - usual) / usual
        when {
            usual < 1 -> "Nothing to compare with yet"
            abs(diff) < 0.05 -> "About the same as usual by now"
            diff < 0 -> "${(-diff * 100).roundToInt()}% less than usual by now"
            else -> "${(diff * 100).roundToInt()}% more than usual by now"
        }
    }
    return PhoneUse(
        totalText = formatDuration(today.totalMinutes),
        totalMinutes = today.totalMinutes,
        changeText = change,
        pickups = today.pickups,
        longestBreakText = if (today.longestBreakMinutes == 0) "--" else formatDuration(today.longestBreakMinutes),
        hourly = today.hours.map { it.seconds / 60 },
    )
}

internal fun phoneMetric(days: List<UsageDay>, apps: (String) -> AppCatalog.App): Metric {
    val today = days.last()
    val top = topApps(today, apps, 3)
    return Metric(
        id = "phone", title = "Phone use", icon = AppIcons.Phone,
        value = formatDuration(today.totalMinutes), detail = "${today.pickups} pickups",
        goal = "${formatDuration(PhoneLimitMinutes)} limit",
        progress = today.totalMinutes / PhoneLimitMinutes.toFloat(),
        colors = MetricColors.Phone,
        week = days.map { it.totalMinutes.toFloat() },
        weekText = days.map { if (it.totalMinutes == 0 && it.pickups == 0) "--" else formatDuration(it.totalMinutes) },
        goalValue = PhoneLimitMinutes.toFloat(),
        summary = if (top.isEmpty()) "No phone use recorded yet today."
        else "${formatDuration(today.totalMinutes)} so far today. Most used: ${top.joinToString(", ") { (name, m) -> "$name ${formatDuration(m)}" }}.",
        source = "Screen time, app use and pickups from usage access.",
    )
}

/** The day's most used apps by name, with minutes. */
internal fun topApps(day: UsageDay, apps: (String) -> AppCatalog.App, count: Int): List<Pair<String, Int>> =
    day.hours.flatMap { it.apps.entries }
        .groupBy({ it.key }, { it.value.seconds })
        .mapValues { it.value.sum() / 60 }
        .filterValues { it > 0 }
        .entries.sortedByDescending { it.value }
        .take(count)
        .map { apps(it.key).name to it.value }

internal fun socialMetric(days: List<UsageDay>, apps: (String) -> AppCatalog.App): Metric {
    val isSocial = { pkg: String -> apps(pkg).category == AppCategory.Communication }
    val minutes = days.map { it.minutesIn(isSocial) }
    val today = minutes.last()
    val topApp = days.last().hours.flatMap { it.apps.entries }
        .filter { isSocial(it.key) }
        .groupBy({ it.key }, { it.value.seconds })
        .maxByOrNull { it.value.sum() }
        ?.let { apps(it.key).name }
    return Metric(
        id = "social", title = "Social", icon = AppIcons.Groups,
        value = formatDuration(today), detail = "messaging and calls",
        goal = formatDuration(SocialGoalMinutes), progress = today / SocialGoalMinutes.toFloat(),
        colors = MetricColors.Social,
        week = minutes.map { it.toFloat() },
        weekText = minutes.map { formatDuration(it) },
        goalValue = SocialGoalMinutes.toFloat(),
        summary = if (today == 0) "No time in messaging or call apps yet today."
        else "${formatDuration(today)} in messaging and call apps today" +
            (topApp?.let { ", mostly $it." } ?: "."),
        source = "Time in messaging and call apps, from usage access.",
    )
}

// ---- Health ---------------------------------------------------------------------------------

internal fun sleepMetric(days: List<HealthDay>, zone: ZoneId): Metric {
    val today = days.last()
    val minutes = today.sleepMinutes
    val earlier = days.dropLast(1).mapNotNull { it.sleepMinutes }
    val average = earlier.takeIf { it.isNotEmpty() }?.average()?.roundToInt()
    return Metric(
        id = "sleep", title = "Sleep", icon = AppIcons.Sleep,
        value = minutes?.let(::formatDuration) ?: "--",
        detail = if (today.sleepStart != null && today.sleepEnd != null)
            "${formatTime(today.sleepStart, zone)} – ${formatTime(today.sleepEnd, zone)}" else "No sleep recorded",
        goal = formatDuration(SleepGoalMinutes), progress = (minutes ?: 0) / SleepGoalMinutes.toFloat(),
        colors = MetricColors.Sleep,
        week = days.map { (it.sleepMinutes ?: 0) / 60f },
        weekText = days.map { d -> d.sleepMinutes?.let(::formatDuration) ?: "--" },
        goalValue = SleepGoalMinutes / 60f,
        summary = when {
            minutes == null -> "No sleep recorded last night. Sleep tracked by Samsung Health or a watch shows up here."
            average == null -> "You slept ${formatDuration(minutes)}."
            else -> "You slept ${formatDuration(minutes)}, ${compare(minutes, average)} your average of ${formatDuration(average)} this week."
        },
        source = "Sleep sessions from Health Connect.",
        hasData = minutes != null,
    )
}

internal fun activityMetric(days: List<HealthDay>, useMiles: Boolean): Metric {
    val today = days.last()
    val steps = today.steps ?: 0L
    val left = StepGoal - steps
    return Metric(
        id = "activity", title = "Activity", icon = AppIcons.Walk,
        value = formatCount(steps), detail = "steps · ${formatDistance(today.distanceMeters ?: 0.0, useMiles)}",
        goal = formatCount(StepGoal.toLong()), progress = steps / StepGoal.toFloat(),
        colors = MetricColors.Activity,
        week = days.map { (it.steps ?: 0L).toFloat() },
        weekText = days.map { d -> d.steps?.let(::formatCount) ?: "--" },
        goalValue = StepGoal.toFloat(),
        summary = if (left <= 0) "${formatCount(steps)} steps today. You reached your goal."
        else "${formatCount(steps)} steps so far today, ${formatCount(left)} to go.",
        source = "Step count from Health Connect.",
        hasData = today.steps != null,
    )
}

internal fun exerciseMetric(days: List<HealthDay>): Metric {
    val today = days.last()
    val minutes = today.exerciseMinutes ?: 0
    val activeDays = days.count { (it.exerciseMinutes ?: 0) > 0 }
    return Metric(
        id = "exercise", title = "Exercise", icon = AppIcons.Exercise,
        value = "$minutes min", detail = today.exerciseLabel ?: "No workouts yet",
        goal = "$ExerciseGoalMinutes min", progress = minutes / ExerciseGoalMinutes.toFloat(),
        colors = MetricColors.Exercise,
        week = days.map { (it.exerciseMinutes ?: 0).toFloat() },
        weekText = days.map { "${it.exerciseMinutes ?: 0} min" },
        goalValue = ExerciseGoalMinutes.toFloat(),
        summary = (if (minutes == 0) "No workouts recorded today." else "$minutes minutes of exercise today.") +
            " You exercised on $activeDays of the last ${days.size} days.",
        source = "Exercise sessions from Health Connect.",
        hasData = today.exerciseMinutes != null,
    )
}

internal fun mobilityMetric(days: List<HealthDay>, useMiles: Boolean): Metric {
    val today = days.last()
    val meters = today.distanceMeters ?: 0.0
    val earlier = days.dropLast(1).mapNotNull { it.distanceMeters }
    val unit = if (useMiles) 1609.344 else 1000.0
    return Metric(
        id = "mobility", title = "Mobility", icon = AppIcons.Explore,
        value = formatDistance(meters, useMiles),
        detail = earlier.takeIf { it.isNotEmpty() }?.let { "Week average ${formatDistance(it.average(), useMiles)}" } ?: "Distance moved",
        goal = formatDistance(DistanceGoalMeters, useMiles), progress = (meters / DistanceGoalMeters).toFloat(),
        colors = MetricColors.Mobility,
        week = days.map { ((it.distanceMeters ?: 0.0) / unit).toFloat() },
        weekText = days.map { d -> d.distanceMeters?.let { formatDistance(it, useMiles) } ?: "--" },
        goalValue = (DistanceGoalMeters / unit).toFloat(),
        summary = if (earlier.isEmpty()) "You've covered ${formatDistance(meters, useMiles)} today."
        else "You've covered ${formatDistance(meters, useMiles)} today, ${compare(meters, earlier.average())} your daily average this week.",
        source = "Distance from Health Connect.",
        hasData = today.distanceMeters != null,
    )
}

// ---- Mood -----------------------------------------------------------------------------------

/** Mood from check-ins: each day's average rating, for the last 7 days. */
fun moodMetric(checkIns: List<CheckIn>, today: LocalDate, zone: ZoneId = ZoneId.systemDefault()): Metric {
    val days = (6 downTo 0).map { today.minusDays(it.toLong()) }
    val byDay = days.map { date ->
        checkIns.filter { Instant.ofEpochMilli(it.timeMillis).atZone(zone).toLocalDate() == date }
            .takeIf { it.isNotEmpty() }?.map { it.mood }?.average()
    }
    val now = byDay.last()
    val good = byDay.count { it != null && it >= 4 }
    return Metric(
        id = "mood", title = "Mood", icon = AppIcons.Mood,
        value = now?.let { "${formatRating(it)} / 5" } ?: "--",
        detail = now?.let { moodWord(it) } ?: "Check in to log it",
        goal = "4 / 5", progress = ((now ?: 0.0) / 4).toFloat(),
        colors = MetricColors.Mood,
        week = byDay.map { (it ?: 0.0).toFloat() },
        weekText = byDay.map { d -> d?.let { "${formatRating(it)} / 5" } ?: "--" },
        goalValue = 4f,
        summary = if (byDay.all { it == null }) "No check-ins yet. Your mood from each check-in shows up here."
        else "You've rated your mood 4 or higher on $good of the last 7 days.",
        source = "Your check-ins.",
        hasData = now != null,
    )
}

private fun moodWord(rating: Double) = when (rating.roundToInt()) {
    5 -> "Great"
    4 -> "Good"
    3 -> "Okay"
    2 -> "Low"
    else -> "Very low"
}

private fun formatRating(r: Double) = if (r % 1.0 == 0.0) "${r.toInt()}" else String.format(Locale.US, "%.1f", r)

// ---- Formatting -----------------------------------------------------------------------------

fun formatDuration(minutes: Int): String = when {
    minutes < 60 -> "${minutes}m"
    minutes % 60 == 0 -> "${minutes / 60}h"
    else -> "${minutes / 60}h ${minutes % 60}m"
}

fun formatCount(n: Long): String = NumberFormat.getIntegerInstance(Locale.US).format(n)

fun formatDistance(meters: Double, useMiles: Boolean): String =
    if (useMiles) String.format(Locale.US, "%.1f mi", meters / 1609.344)
    else String.format(Locale.US, "%.1f km", meters / 1000)

/** The US, Liberia and Myanmar use miles. */
fun usesMiles(locale: Locale) = locale.country in setOf("US", "LR", "MM")

private fun compare(value: Number, average: Number): String {
    val diff = (value.toDouble() - average.toDouble()) / average.toDouble().coerceAtLeast(1.0)
    return when {
        abs(diff) < 0.05 -> "about the same as"
        diff > 0 -> "above"
        else -> "below"
    }
}
