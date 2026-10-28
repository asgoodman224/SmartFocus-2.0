package com.example.smartfocus.reminders

import android.Manifest
import android.app.AlarmManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import com.example.smartfocus.MainActivity
import com.example.smartfocus.R
import com.example.smartfocus.data.AppSettings
import com.example.smartfocus.data.CheckInKind

/**
 * Check-in reminders. Each one is an inexact alarm (no special permission needed) that may
 * arrive up to 10 minutes late, so the phone can batch it with other work.
 */
object Reminders {
    private const val Channel = "check_ins"
    private const val Window = 10 * 60 * 1000L
    const val ExtraKind = "check_in_kind"
    const val ActionRemind = "com.example.smartfocus.REMIND"

    /** Sets or clears every reminder to match the current settings. Safe to call often. */
    fun scheduleAll(context: Context) {
        val schedule = AppSettings(context).schedule()
        val alarms = context.getSystemService(AlarmManager::class.java) ?: return
        val times = if (schedule.enabled) reminderMinutes(schedule) else emptyMap()
        val now = System.currentTimeMillis()
        for (kind in listOf(CheckInKind.Morning, CheckInKind.Midday, CheckInKind.Evening)) {
            val intent = alarmIntent(context, kind)
            val minute = times[kind]
            if (minute == null) alarms.cancel(intent)
            else alarms.setWindow(AlarmManager.RTC_WAKEUP, nextOccurrence(now, minute), Window, intent)
        }
    }

    fun canNotify(context: Context): Boolean =
        Build.VERSION.SDK_INT < 33 ||
            ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED

    fun notify(context: Context, kind: CheckInKind) {
        if (!canNotify(context)) return
        createChannel(context)
        val (title, text) = when (kind) {
            CheckInKind.Morning -> "Good morning. How did you sleep?" to "Check in to see today's wellness score."
            CheckInKind.Midday -> "How's your day going?" to "A quick midday check-in."
            CheckInKind.Evening -> "How was your day?" to "Check in before bed. It takes about 20 seconds."
            CheckInKind.Anytime -> return
        }
        val open = PendingIntent.getActivity(
            context,
            kind.ordinal,
            Intent(context, MainActivity::class.java)
                .putExtra(ExtraKind, kind.name)
                .addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        val notification = NotificationCompat.Builder(context, Channel)
            .setSmallIcon(R.drawable.ic_stat_check_in)
            .setContentTitle(title)
            .setContentText(text)
            .setContentIntent(open)
            .setAutoCancel(true)
            .setCategory(NotificationCompat.CATEGORY_REMINDER)
            .build()
        try {
            NotificationManagerCompat.from(context).notify(kind.ordinal, notification)
        } catch (_: SecurityException) {
            // Permission was revoked between the check and the post.
        }
    }

    /** Clears a reminder that's still showing once that check-in is done. */
    fun dismiss(context: Context, kind: CheckInKind) = NotificationManagerCompat.from(context).cancel(kind.ordinal)

    private fun createChannel(context: Context) {
        if (Build.VERSION.SDK_INT < 26) return
        val channel = NotificationChannel(Channel, "Check-in reminders", NotificationManager.IMPORTANCE_DEFAULT).apply {
            description = "Morning and evening reminders to check in."
        }
        context.getSystemService(NotificationManager::class.java)?.createNotificationChannel(channel)
    }

    private fun alarmIntent(context: Context, kind: CheckInKind): PendingIntent = PendingIntent.getBroadcast(
        context,
        kind.ordinal,
        Intent(context, ReminderReceiver::class.java).setAction(ActionRemind).putExtra(ExtraKind, kind.name),
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )
}
