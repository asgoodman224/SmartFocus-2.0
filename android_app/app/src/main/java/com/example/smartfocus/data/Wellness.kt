package com.example.smartfocus.data

import kotlin.math.roundToInt

/**
 * Today's wellness, 0–100, from three areas:
 * - Body: sleep, steps, exercise and distance, each as a share of its goal.
 * - Mind: today's check-ins (mood, energy, focus and, in the morning, sleep quality).
 * - Digital: screen time, pickups and time spent socially.
 *
 * The overall [score] only exists once you've checked in today, because the check-in is the
 * only part the phone can't measure. Body and digital are null until Health Connect and usage
 * access are connected; the score then uses the areas it has. The weights are a starting point
 * for the research team to tune.
 */
data class Wellness(val body: Int?, val mind: Int?, val digital: Int?) {
    val score: Int? = mind?.let { m ->
        val parts = listOfNotNull(body?.let { BodyWeight to it }, MindWeight to m, digital?.let { DigitalWeight to it })
        (parts.sumOf { (w, v) -> w * v } / parts.sumOf { it.first }).roundToInt()
    }

    companion object {
        const val BodyWeight = 0.40
        const val MindWeight = 0.35
        const val DigitalWeight = 0.25
    }
}

fun wellnessOf(metrics: List<Metric>, phone: PhoneUse?, todayCheckIns: List<CheckIn>): Wellness {
    // Only what was actually recorded today counts.
    fun progress(id: String) = metrics.firstOrNull { it.id == id && it.hasData }?.progress?.coerceIn(0f, 1f)?.times(100)?.toDouble()

    val body = listOfNotNull(progress("sleep"), progress("activity"), progress("exercise"), progress("mobility"))
        .takeIf { it.isNotEmpty() }?.average()

    val ratings = todayCheckIns.flatMap { listOfNotNull(it.mood, it.energy, it.focus, it.sleepQuality) }
    val mind = if (ratings.isEmpty()) null else ratings.map { (it - 1) / 4.0 * 100 }.average()

    // Up to 2 hours of screen time and 30 pickups cost nothing; the score falls to 0 at 6 hours
    // and 150 pickups.
    val digital = phone?.let {
        val screen = 100 * (1 - (it.totalMinutes - 120).coerceAtLeast(0) / 240.0)
        val pickups = 100 * (1 - (it.pickups - 30).coerceAtLeast(0) / 120.0)
        listOfNotNull(screen.coerceIn(0.0, 100.0), pickups.coerceIn(0.0, 100.0), progress("social")).average()
    }

    return Wellness(body?.roundToInt(), mind?.roundToInt(), digital?.roundToInt())
}

fun conditionLabel(score: Int): String = when {
    score >= 85 -> "Recharged"
    score >= 70 -> "Balanced"
    score >= 55 -> "Stretched"
    else -> "Running low"
}

/** The same score described like weather, for the Conditions headline. */
fun weatherLabel(score: Int): String = when {
    score >= 85 -> "Clear skies"
    score >= 70 -> "Mostly clear"
    score >= 55 -> "Partly cloudy"
    else -> "Overcast"
}
