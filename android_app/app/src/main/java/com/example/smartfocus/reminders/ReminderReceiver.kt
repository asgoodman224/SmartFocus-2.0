package com.example.smartfocus.reminders

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.example.smartfocus.data.AppSettings
import com.example.smartfocus.data.CheckInKind
import com.example.smartfocus.data.CheckInStore

/** A reminder alarm went off: post it unless that check-in is already done, then set tomorrow's. */
class ReminderReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Reminders.ActionRemind) return
        val kind = runCatching { CheckInKind.valueOf(intent.getStringExtra(Reminders.ExtraKind)!!) }.getOrNull()
        val now = System.currentTimeMillis()
        if (kind != null && AppSettings(context).remindersEnabled && !isDone(kind, CheckInStore(context).all, now)) {
            Reminders.notify(context, kind)
        }
        Reminders.scheduleAll(context)
    }
}

/** Alarms don't survive a restart, an app update or a clock change, so set them again. */
class RescheduleReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) = Reminders.scheduleAll(context)
}
