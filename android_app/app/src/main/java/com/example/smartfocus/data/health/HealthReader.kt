package com.example.smartfocus.data.health

import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.DistanceRecord
import androidx.health.connect.client.records.ExerciseSessionRecord
import androidx.health.connect.client.records.SleepSessionRecord
import androidx.health.connect.client.records.StepsRecord
import androidx.health.connect.client.request.AggregateGroupByPeriodRequest
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
import java.time.Instant
import java.time.LocalDate
import java.time.Period
import java.time.ZoneId

/** One local day from Health Connect. Null means nothing was recorded. */
data class HealthDay(
    val date: LocalDate,
    /** Asleep time for the night that ended this morning (awake stages left out). */
    val sleepMinutes: Int? = null,
    val sleepStart: Instant? = null,
    val sleepEnd: Instant? = null,
    val steps: Long? = null,
    val exerciseMinutes: Int? = null,
    /** e.g. "Run · 6:10 PM" for the day's longest workout. */
    val exerciseLabel: String? = null,
    val distanceMeters: Double? = null,
)

enum class HealthStatus {
    /** Health Connect isn't supported on this phone. */
    Unavailable,
    /** Needs installing or updating from the Play Store (Android 13 and older). */
    NeedsInstall,
    NotGranted,
    Granted,
}

/**
 * Reads sleep, steps, exercise and distance from Health Connect. Samsung Health, Google Fit
 * and most watches write there (in Samsung Health: Settings → Health Connect).
 */
class HealthReader(private val context: Context) {
    private val client by lazy { HealthConnectClient.getOrCreate(context) }

    suspend fun status(): HealthStatus = when (HealthConnectClient.getSdkStatus(context)) {
        HealthConnectClient.SDK_AVAILABLE ->
            if (client.permissionController.getGrantedPermissions().containsAll(Permissions)) HealthStatus.Granted
            else HealthStatus.NotGranted
        HealthConnectClient.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED -> HealthStatus.NeedsInstall
        else -> HealthStatus.Unavailable
    }

    /** The last [count] days, oldest first, ending today. */
    suspend fun lastDays(count: Int, zone: ZoneId = ZoneId.systemDefault()): List<HealthDay> {
        val today = LocalDate.now(zone)
        val first = today.minusDays(count - 1L)
        val dayRange = TimeRangeFilter.between(first.atStartOfDay(), today.plusDays(1).atStartOfDay())

        val totals = client.aggregateGroupByPeriod(
            AggregateGroupByPeriodRequest(
                metrics = setOf(StepsRecord.COUNT_TOTAL, DistanceRecord.DISTANCE_TOTAL),
                timeRangeFilter = dayRange,
                timeRangeSlicer = Period.ofDays(1),
            )
        ).associateBy { it.startTime.toLocalDate() }

        // Sleep belongs to the day you wake up on, so start the evening before the first day.
        val sleeps = readAll(
            SleepSessionRecord::class,
            TimeRangeFilter.between(first.minusDays(1).atTime(12, 0), today.plusDays(1).atStartOfDay()),
        )
        val workouts = readAll(ExerciseSessionRecord::class, dayRange)

        return (0 until count).map { i ->
            val date = first.plusDays(i.toLong())
            val nights = sleeps.filter { it.endTime.atZone(zone).toLocalDate() == date }
            val main = nights.maxByOrNull { it.endTime.toEpochMilli() - it.startTime.toEpochMilli() }
            val sessions = workouts.filter { it.startTime.atZone(zone).toLocalDate() == date }
            val longest = sessions.maxByOrNull { it.endTime.toEpochMilli() - it.startTime.toEpochMilli() }
            val dayTotals = totals[date]?.result
            HealthDay(
                date = date,
                sleepMinutes = nights.takeIf { it.isNotEmpty() }?.sumOf { asleepMinutes(it) },
                sleepStart = main?.startTime,
                sleepEnd = main?.endTime,
                steps = dayTotals?.get(StepsRecord.COUNT_TOTAL),
                exerciseMinutes = sessions.takeIf { it.isNotEmpty() }?.sumOf { minutesBetween(it.startTime, it.endTime) },
                exerciseLabel = longest?.let { "${exerciseName(it.exerciseType)} · ${formatTime(it.startTime, zone)}" },
                distanceMeters = dayTotals?.get(DistanceRecord.DISTANCE_TOTAL)?.inMeters,
            )
        }
    }

    private suspend fun <T : androidx.health.connect.client.records.Record> readAll(
        type: kotlin.reflect.KClass<T>,
        range: TimeRangeFilter,
    ): List<T> {
        val records = ArrayList<T>()
        var token: String? = null
        do {
            val response = client.readRecords(ReadRecordsRequest(type, range, pageToken = token))
            records += response.records
            token = response.pageToken
        } while (token != null)
        return records
    }

    companion object {
        val Permissions = setOf(
            HealthPermission.getReadPermission(SleepSessionRecord::class),
            HealthPermission.getReadPermission(StepsRecord::class),
            HealthPermission.getReadPermission(ExerciseSessionRecord::class),
            HealthPermission.getReadPermission(DistanceRecord::class),
        )

        /** SmartFocus's page in Health Connect, where permissions can be changed after denying twice. */
        fun settingsIntent(context: Context): Intent = HealthConnectClient.getHealthConnectManageDataIntent(context)

        fun installIntent(): Intent = Intent(
            Intent.ACTION_VIEW,
            Uri.parse("market://details?id=com.google.android.apps.healthdata&url=healthconnect%3A%2F%2Fonboarding"),
        ).setPackage("com.android.vending")
    }
}

private fun minutesBetween(start: Instant, end: Instant) = ((end.toEpochMilli() - start.toEpochMilli()) / 60_000).toInt()

private val AwakeStages = setOf(
    SleepSessionRecord.STAGE_TYPE_AWAKE,
    SleepSessionRecord.STAGE_TYPE_AWAKE_IN_BED,
    SleepSessionRecord.STAGE_TYPE_OUT_OF_BED,
)

/** Time asleep: the whole session, minus awake stages when the tracker recorded stages. */
internal fun asleepMinutes(session: SleepSessionRecord): Int {
    val total = minutesBetween(session.startTime, session.endTime)
    val awake = session.stages.filter { it.stage in AwakeStages }.sumOf { minutesBetween(it.startTime, it.endTime) }
    return (total - awake).coerceAtLeast(0)
}

internal fun formatTime(instant: Instant, zone: ZoneId): String {
    val t = instant.atZone(zone)
    val h = t.hour % 12
    return "${if (h == 0) 12 else h}:${t.minute.toString().padStart(2, '0')} ${if (t.hour < 12) "AM" else "PM"}"
}

internal fun exerciseName(type: Int): String = when (type) {
    ExerciseSessionRecord.EXERCISE_TYPE_RUNNING, ExerciseSessionRecord.EXERCISE_TYPE_RUNNING_TREADMILL -> "Run"
    ExerciseSessionRecord.EXERCISE_TYPE_WALKING -> "Walk"
    ExerciseSessionRecord.EXERCISE_TYPE_HIKING -> "Hike"
    ExerciseSessionRecord.EXERCISE_TYPE_BIKING, ExerciseSessionRecord.EXERCISE_TYPE_BIKING_STATIONARY -> "Ride"
    ExerciseSessionRecord.EXERCISE_TYPE_SWIMMING_POOL, ExerciseSessionRecord.EXERCISE_TYPE_SWIMMING_OPEN_WATER -> "Swim"
    ExerciseSessionRecord.EXERCISE_TYPE_STRENGTH_TRAINING, ExerciseSessionRecord.EXERCISE_TYPE_WEIGHTLIFTING -> "Strength"
    ExerciseSessionRecord.EXERCISE_TYPE_YOGA -> "Yoga"
    ExerciseSessionRecord.EXERCISE_TYPE_HIGH_INTENSITY_INTERVAL_TRAINING -> "HIIT"
    ExerciseSessionRecord.EXERCISE_TYPE_ELLIPTICAL -> "Elliptical"
    ExerciseSessionRecord.EXERCISE_TYPE_ROWING_MACHINE, ExerciseSessionRecord.EXERCISE_TYPE_ROWING -> "Row"
    ExerciseSessionRecord.EXERCISE_TYPE_DANCING -> "Dance"
    ExerciseSessionRecord.EXERCISE_TYPE_BASKETBALL -> "Basketball"
    ExerciseSessionRecord.EXERCISE_TYPE_SOCCER -> "Soccer"
    ExerciseSessionRecord.EXERCISE_TYPE_TENNIS -> "Tennis"
    else -> "Workout"
}
