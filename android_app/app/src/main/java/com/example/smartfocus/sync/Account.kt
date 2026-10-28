package com.example.smartfocus.sync

import android.content.Context
import android.content.SharedPreferences
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue

/**
 * The study account this phone is signed in to, if any. Saved on the phone; the token is the
 * server's session token (it can be revoked by signing out).
 */
class Account(context: Context) {
    private val prefs = context.getSharedPreferences("account", Context.MODE_PRIVATE)

    var serverUrl by mutableStateOf(prefs.getString("server", "") ?: "")
        private set
    var email by mutableStateOf(prefs.getString("email", null))
        private set
    /** When the last sync finished, in epoch millis, or 0. */
    var lastSync by mutableStateOf(prefs.getLong("last_sync", 0L))
        private set
    /** Why the last sync failed, or null if it worked. */
    var syncError by mutableStateOf(prefs.getString("sync_error", null))
        private set

    val token: String? get() = prefs.getString("token", null)
    val signedIn: Boolean get() = email != null && token != null

    // Another instance (e.g. the sync worker) changed something: show it.
    private val listener = SharedPreferences.OnSharedPreferenceChangeListener { p, _ ->
        serverUrl = p.getString("server", "") ?: ""
        email = p.getString("email", null)
        lastSync = p.getLong("last_sync", 0L)
        syncError = p.getString("sync_error", null)
    }

    init {
        prefs.registerOnSharedPreferenceChangeListener(listener)
    }

    fun signIn(server: String, email: String, token: String) {
        prefs.edit()
            .putString("server", server).putString("email", email).putString("token", token)
            .remove("last_sync").remove("sync_error")
            .commit()
    }

    /** Forgets the session. [reason] is shown in Settings, e.g. when the session expired. */
    fun signOut(reason: String? = null) {
        prefs.edit().remove("email").remove("token").remove("last_sync").putString("sync_error", reason).commit()
    }

    fun recordSync(time: Long, error: String?) {
        prefs.edit().putLong("last_sync", time).putString("sync_error", error).commit()
    }

    companion object {
        /** Adds http:// when there's no scheme, and drops a trailing slash. */
        fun normalizeServer(input: String): String {
            val trimmed = input.trim().trimEnd('/')
            return if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) trimmed else "http://$trimmed"
        }
    }
}
