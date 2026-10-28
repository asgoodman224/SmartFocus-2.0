package com.example.smartfocus.ui.sheets

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.smartfocus.data.health.HealthStatus
import com.example.smartfocus.ui.icons.AppIcons
import com.example.smartfocus.ui.icons.Mood
import com.example.smartfocus.ui.icons.Phone
import com.example.smartfocus.ui.icons.Walk
import com.example.smartfocus.ui.theme.TextPrimary
import com.example.smartfocus.ui.theme.TextSecondary
import com.example.smartfocus.ui.theme.TextTertiary

/**
 * What SmartFocus reads and why, with a way to turn each source on. This is also the
 * "prominent disclosure" Google Play requires before reading usage data.
 */
@Composable
fun ColumnScope.DataSourcesSheetContent(
    usageAccess: Boolean,
    health: HealthStatus,
    notifications: Boolean,
    onUsage: () -> Unit,
    onHealth: () -> Unit,
    onNotifications: () -> Unit,
) {
    Text(
        "SmartFocus reads the data below to build your scores. It stays on this phone unless you " +
            "sign in to sync it with your study account, and you can turn any of it off in Android settings.",
        color = TextSecondary,
        fontSize = 15.sp,
        lineHeight = 21.sp,
    )
    Spacer(Modifier.height(20.dp))
    SourceCard(
        title = "Phone usage",
        icon = AppIcons.Phone,
        connected = usageAccess,
        about = "Which apps you use and for how long, how often you unlock your phone, and how many " +
            "notifications arrive (never what they say).",
        hint = if (usageAccess) null else "Android opens a list of apps. Find SmartFocus, switch it on, then come back.",
        action = if (usageAccess) "Manage in Settings" else "Turn on usage access",
        onAction = onUsage,
    )
    Spacer(Modifier.height(12.dp))
    SourceCard(
        title = "Health Connect",
        icon = AppIcons.Walk,
        connected = health == HealthStatus.Granted,
        about = "Sleep, steps, exercise and distance from Samsung Health, Google Fit or your watch.",
        hint = when (health) {
            HealthStatus.Granted -> null
            HealthStatus.Unavailable -> "Health Connect isn't available on this phone."
            else -> "On Samsung phones, also turn on Samsung Health → Settings → Health Connect."
        },
        action = when (health) {
            HealthStatus.Granted -> "Manage in Health Connect"
            HealthStatus.NeedsInstall -> "Install Health Connect"
            HealthStatus.NotGranted -> "Connect Health Connect"
            HealthStatus.Unavailable -> null
        },
        onAction = onHealth,
    )
    Spacer(Modifier.height(12.dp))
    SourceCard(
        title = "Check-in reminders",
        icon = AppIcons.Mood,
        connected = notifications,
        about = "Notifications when you wake up and before bed, so your score doesn't wait on you remembering.",
        hint = null,
        action = if (notifications) null else "Allow notifications",
        onAction = onNotifications,
    )
}

@Composable
private fun SourceCard(
    title: String,
    icon: ImageVector,
    connected: Boolean,
    about: String,
    hint: String?,
    action: String?,
    onAction: () -> Unit,
) {
    SheetCard {
        Row(Modifier.semantics(mergeDescendants = true) { }, verticalAlignment = Alignment.CenterVertically) {
            Icon(icon, contentDescription = null, tint = TextPrimary, modifier = Modifier.size(20.dp))
            Spacer(Modifier.width(10.dp))
            Text(title, color = TextPrimary, fontSize = 17.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.weight(1f))
            Box(Modifier.size(8.dp).clip(CircleShape).background(if (connected) Color(0xFF7BE0A8) else Color.White.copy(alpha = 0.3f)))
            Spacer(Modifier.width(6.dp))
            Text(if (connected) "On" else "Off", color = TextSecondary, fontSize = 14.sp)
        }
        Spacer(Modifier.height(8.dp))
        Text(about, color = TextSecondary, fontSize = 14.sp, lineHeight = 20.sp)
        if (hint != null) {
            Spacer(Modifier.height(6.dp))
            Text(hint, color = TextTertiary, fontSize = 13.sp, lineHeight = 18.sp)
        }
        if (action != null) {
            Spacer(Modifier.height(14.dp))
            PillButton(action, onClick = onAction, secondary = connected)
        }
    }
}
