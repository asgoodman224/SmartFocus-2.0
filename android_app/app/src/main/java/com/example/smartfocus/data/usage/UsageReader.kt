package com.example.smartfocus.data.usage

import android.app.AppOpsManager
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Process
import android.provider.Settings
import java.time.LocalDate
import java.time.ZoneId

/** Reads phone use from Android's usage access (Settings → Usage access → SmartFocus). */
class UsageReader(private val context: Context) {
    private val manager = context.getSystemService(UsageStatsManager::class.java)
    /** Finished days don't change, so they're only aggregated once. */
    private val pastDays = HashMap<LocalDate, UsageDay>()

    fun hasAccess(): Boolean {
        val ops = context.getSystemService(AppOpsManager::class.java) ?: return false
        val mode = if (Build.VERSION.SDK_INT >= 29) {
            ops.unsafeCheckOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, Process.myUid(), context.packageName)
        } else {
            @Suppress("DEPRECATION")
            ops.checkOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, Process.myUid(), context.packageName)
        }
        return mode == AppOpsManager.MODE_ALLOWED
    }

    /**
     * The last [count] days, oldest first, ending today. Android keeps raw events for about
     * 10 days, so older days come back empty.
     */
    fun lastDays(count: Int, now: Long = System.currentTimeMillis(), zone: ZoneId = ZoneId.systemDefault()): List<UsageDay> {
        val today = LocalDate.now(zone)
        val ignored = AppCatalog.launchers(context)
        return (count - 1 downTo 0).map { ago ->
            val date = today.minusDays(ago.toLong())
            if (ago == 0) readDay(date, zone, now, ignored)
            else pastDays.getOrPut(date) { readDay(date, zone, now, ignored) }
        }
    }

    private fun readDay(date: LocalDate, zone: ZoneId, now: Long, ignored: Set<String>): UsageDay {
        // Start early enough to know whether the phone was locked, or in an app, at midnight.
        val from = date.atStartOfDay(zone).minusHours(12).toInstant().toEpochMilli()
        val to = minOf(now, date.plusDays(1).atStartOfDay(zone).toInstant().toEpochMilli())
        val events = ArrayList<UsageEvent>()
        val raw = manager?.queryEvents(from, to)
        if (raw != null) {
            val event = UsageEvents.Event()
            while (raw.getNextEvent(event)) events += UsageEvent(event.timeStamp, event.eventType, event.packageName)
        }
        return aggregateDay(events, date, zone, now, ignored)
    }

    companion object {
        /** Android's usage access list. Some phones open SmartFocus's page directly. */
        fun settingsIntent(context: Context): Intent {
            val direct = Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS, Uri.parse("package:${context.packageName}"))
            return if (direct.resolveActivity(context.packageManager) != null) direct
            else Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS)
        }
    }
}
