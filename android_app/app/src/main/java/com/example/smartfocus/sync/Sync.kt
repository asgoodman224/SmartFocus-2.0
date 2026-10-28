package com.example.smartfocus.sync

import android.content.Context
import com.example.smartfocus.data.CheckInStore
import com.example.smartfocus.data.DataRepository
import com.example.smartfocus.data.health.HealthDay
import com.example.smartfocus.data.health.HealthStatus
import com.example.smartfocus.data.usage.AppCatalog
import com.example.smartfocus.data.usage.UsageDay
import org.json.JSONArray
import org.json.JSONObject
import java.io.IOException
import java.time.Instant
import java.time.OffsetDateTime
import java.time.ZoneId

/**
 * Uploads to the study server: new check-ins, then the last few days of phone use and health
 * totals (days are re-sent each time and replace what the server had, so retries are safe).
 */
object Sync {
    /** Days re-sent on every sync. Today keeps changing; earlier days fill in late from watches. */
    private const val RecentDays = 3
    /** The server rejects check-ins older than this. */
    private const val CheckInMaxAgeMillis = 29L * 24 * 60 * 60 * 1000

    data class Outcome(val error: String?, val retry: Boolean)

    suspend fun run(context: Context): Outcome {
        val account = Account(context)
        val token = account.token ?: return Outcome(null, false)
        val api = Api(account.serverUrl, token)
        val now = System.currentTimeMillis()
        return try {
            uploadCheckIns(context, api, now)
            val repo = DataRepository.get(context)
            val raw = repo.read(RecentDays)
            raw.usageDays?.forEach { api.putUsageDay(it.date.toString(), usageJson(it, repo.apps::get)) }
            raw.healthDays?.forEach { api.putHealthDay(it.date.toString(), healthJson(it)) }
            val usage = if (raw.usageAccess) "connected" else "notConnected"
            api.putDataSource("appUsage", usage)
            api.putDataSource("notifications", usage)
            api.putDataSource(
                "motion",
                when (raw.health) {
                    HealthStatus.Granted -> "connected"
                    HealthStatus.Unavailable -> "unavailable"
                    else -> "notConnected"
                },
            )
            account.recordSync(System.currentTimeMillis(), null)
            Outcome(null, false)
        } catch (e: ApiException) {
            if (e.status == 401) {
                account.signOut("Your session ended. Sign in again to keep syncing.")
                Outcome(e.message, false)
            } else {
                account.recordSync(account.lastSync, e.message)
                Outcome(e.message, e.status >= 500)
            }
        } catch (e: IOException) {
            account.recordSync(account.lastSync, e.message)
            Outcome(e.message, true)
        }
    }

    private suspend fun uploadCheckIns(context: Context, api: Api, now: Long) {
        val store = CheckInStore(context)
        val pending = store.all.filter { !it.synced }
        val tooOld = pending.filter { now - it.timeMillis > CheckInMaxAgeMillis }.map { it.timeMillis }.toSet()
        store.markSynced(tooOld)
        for (c in pending.filter { it.timeMillis !in tooOld }) {
            api.postCheckIn(
                JSONObject()
                    .put("mood", c.mood).put("energy", c.energy).put("focus", c.focus)
                    .put("kind", c.kind.name.lowercase())
                    .put("createdAt", OffsetDateTime.ofInstant(Instant.ofEpochMilli(c.timeMillis), ZoneId.systemDefault()).toString())
                    .apply {
                        c.sleepQuality?.let { put("sleepQuality", it) }
                        if (c.note.isNotEmpty()) put("note", c.note)
                    }
            )
            // One at a time, so a failure part way never re-sends the ones already uploaded.
            store.markSynced(setOf(c.timeMillis))
        }
    }

    internal fun usageJson(day: UsageDay, apps: (String) -> AppCatalog.App): JSONObject {
        val hours = JSONArray()
        day.hours.filter { it.pickups > 0 || it.notifications > 0 || it.apps.isNotEmpty() }.forEach { h ->
            val list = JSONArray()
            h.apps.forEach { (pkg, time) ->
                val app = apps(pkg)
                list.put(
                    JSONObject()
                        .put("appId", pkg).put("appName", app.name.take(255).ifBlank { pkg })
                        .put("category", app.category.apiName)
                        .put("seconds", time.seconds).put("opens", time.opens)
                )
            }
            hours.put(JSONObject().put("hour", h.hour).put("pickups", h.pickups).put("notifications", h.notifications).put("apps", list))
        }
        return JSONObject().put("longestFocusMinutes", day.longestBreakMinutes.coerceIn(0, 1440)).put("hours", hours)
    }

    internal fun healthJson(day: HealthDay): JSONObject = JSONObject()
        .put("sleepMinutes", day.sleepMinutes?.coerceIn(0, 1440) ?: JSONObject.NULL)
        .put("steps", day.steps ?: JSONObject.NULL)
        .put("exerciseMinutes", day.exerciseMinutes?.coerceIn(0, 1440) ?: JSONObject.NULL)
        .put("distanceMeters", day.distanceMeters?.toLong() ?: JSONObject.NULL)
}
