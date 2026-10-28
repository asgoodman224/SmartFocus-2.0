package com.example.smartfocus.data

import android.content.Context
import android.content.SharedPreferences
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.snapshots.SnapshotStateList
import org.json.JSONArray
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale

/** When a check-in happens. Morning check-ins also ask how you slept. */
enum class CheckInKind(val title: String, val prompt: String) {
    Morning("Morning check-in", "How did you wake up?"),
    Midday("Midday check-in", "How is your day going?"),
    Evening("Evening check-in", "How was your day?"),
    Anytime("Check-in", "How are you doing right now?"),
}

data class CheckIn(
    val timeMillis: Long,
    val kind: CheckInKind,
    val mood: Int,
    val energy: Int,
    val focus: Int,
    /** 1–5, morning check-ins only. */
    val sleepQuality: Int? = null,
    val note: String = "",
    /** Uploaded to the study server. */
    val synced: Boolean = false,
) {
    val timeText: String get() = SimpleDateFormat("h:mm a", Locale.getDefault()).format(Date(timeMillis))
}

/**
 * Check-ins saved on the phone. When signed in, background sync uploads the ones not yet
 * [CheckIn.synced]. Every instance reloads when another one saves, so the app and the sync
 * worker never overwrite each other's changes.
 */
class CheckInStore(context: Context) {
    private val prefs = context.getSharedPreferences("check_ins", Context.MODE_PRIVATE)
    val all: SnapshotStateList<CheckIn> = mutableStateListOf<CheckIn>().apply { addAll(load()) }
    // Held in a field: SharedPreferences only keeps a weak reference to listeners.
    private val listener = SharedPreferences.OnSharedPreferenceChangeListener { _, key ->
        if (key == KEY) {
            val fresh = load()
            if (fresh != all.toList()) { all.clear(); all.addAll(fresh) }
        }
    }

    init {
        prefs.registerOnSharedPreferenceChangeListener(listener)
    }

    fun add(checkIn: CheckIn) {
        all.add(checkIn)
        // Keep the last 90 days on the phone.
        val cutoff = System.currentTimeMillis() - 90L * 24 * 60 * 60 * 1000
        all.removeAll { it.timeMillis < cutoff }
        save()
    }

    fun markSynced(times: Set<Long>) {
        if (times.isEmpty()) return
        all.replaceAll { if (it.timeMillis in times) it.copy(synced = true) else it }
        save()
    }

    fun today(now: Long = System.currentTimeMillis()): List<CheckIn> = all.filter { isSameDay(it.timeMillis, now) }

    private fun load(): List<CheckIn> = runCatching {
        val array = JSONArray(prefs.getString(KEY, "[]"))
        List(array.length()) { i ->
            val o = array.getJSONObject(i)
            CheckIn(
                timeMillis = o.getLong("t"),
                kind = runCatching { CheckInKind.valueOf(o.getString("kind")) }.getOrDefault(CheckInKind.Anytime),
                mood = o.getInt("mood"),
                energy = o.getInt("energy"),
                focus = o.getInt("focus"),
                sleepQuality = if (o.has("sleep")) o.getInt("sleep") else null,
                note = o.optString("note"),
                synced = o.optBoolean("synced"),
            )
        }
    }.getOrDefault(emptyList())

    private fun save() {
        val array = JSONArray()
        all.forEach { c ->
            array.put(JSONObject().apply {
                put("t", c.timeMillis); put("kind", c.kind.name)
                put("mood", c.mood); put("energy", c.energy); put("focus", c.focus)
                c.sleepQuality?.let { put("sleep", it) }
                if (c.note.isNotEmpty()) put("note", c.note)
                if (c.synced) put("synced", true)
            })
        }
        // commit() rather than apply(), so the sync worker never reads a stale list.
        prefs.edit().putString(KEY, array.toString()).commit()
    }

    companion object {
        private const val KEY = "items"

        fun isSameDay(a: Long, b: Long): Boolean {
            val ca = Calendar.getInstance().apply { timeInMillis = a }
            val cb = Calendar.getInstance().apply { timeInMillis = b }
            return ca.get(Calendar.YEAR) == cb.get(Calendar.YEAR) && ca.get(Calendar.DAY_OF_YEAR) == cb.get(Calendar.DAY_OF_YEAR)
        }
    }
}
