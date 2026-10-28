package com.example.smartfocus

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import com.example.smartfocus.data.CheckInKind
import com.example.smartfocus.reminders.Reminders
import com.example.smartfocus.ui.theme.SmartFocusTheme

class MainActivity : ComponentActivity() {
    /** Set when a check-in reminder was tapped. */
    private var requestedCheckIn by mutableStateOf<CheckInKind?>(null)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        // Only on a fresh start, so rotating the phone doesn't reopen the check-in.
        if (savedInstanceState == null) requestedCheckIn = checkInFrom(intent)
        setContent {
            SmartFocusTheme {
                SmartFocusApp(requestedCheckIn = requestedCheckIn, onRequestHandled = { requestedCheckIn = null })
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        checkInFrom(intent)?.let { requestedCheckIn = it }
    }

    private fun checkInFrom(intent: Intent?): CheckInKind? =
        intent?.getStringExtra(Reminders.ExtraKind)?.let { runCatching { CheckInKind.valueOf(it) }.getOrNull() }
}
