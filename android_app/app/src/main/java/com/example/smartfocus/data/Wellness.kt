package com.example.smartfocus.data

import kotlin.math.roundToInt

/**
 * Today's wellness, 0–100, from three areas:
 * - Body: sleep, steps, exercise and distance, each as a share of its goal.
 * - Mind: today's check-ins (mood, energy, focus and, in the morning, sleep quality).
 * - Digital: screen time, pickups and time spent socially.
 *
 * The overall [score] only exists once you've checked in today, because the check-in is the
 * only part the phone can't measure. The weights are a starting point for the research team
 * to tune.
 */
data class Wellness(val body: Int, val mind: Int?, val digital: Int) {
    val score: Int? = mind?.let { (BodyWeight * body + MindWeight * it + DigitalWeight * digital).roundToInt() }

    companion object {
        const val BodyWeight = 0.40
        const val MindWeight = 0.35
        const val DigitalWeight = 0.25
    }
}

fun wellnessOf(metrics: List<Metric>, phone: PhoneUse, todayCheckIns: List<CheckIn>): Wellness {
    fun progress(id: String) = metrics.firstOrNull { it.id == id }?.progress?.coerceIn(0f, 1f)?.times(100)

    val body = listOfNotNull(progress("sleep"), progress("activity"), progress("exercise"), progress("mobility"))
        .average().takeUnless { it.isNaN() } ?: 0.0

    val ratings = todayCheckIns.flatMap { listOfNotNull(it.mood, it.energy, it.focus, it.sleepQuality) }
    val mind = if (ratings.isEmpty()) null else ratings.map { (it - 1) / 4.0 * 100 }.average()

    // Up to 2 hours of screen time and 30 pickups cost nothing; the score falls to 0 at 6 hours
    // and 150 pickups.
    val screen = 100 * (1 - (phone.totalMinutes - 120).coerceAtLeast(0) / 240.0)
    val pickups = 100 * (1 - (phone.pickups - 30).coerceAtLeast(0) / 120.0)
    val digital = listOfNotNull(screen.coerceIn(0.0, 100.0), pickups.coerceIn(0.0, 100.0), progress("social")?.toDouble())
        .average()

    return Wellness(body.roundToInt(), mind?.roundToInt(), digital.roundToInt())
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
