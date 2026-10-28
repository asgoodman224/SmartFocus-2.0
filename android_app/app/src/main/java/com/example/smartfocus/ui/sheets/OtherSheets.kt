package com.example.smartfocus.ui.sheets

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.selection.selectableGroup
import androidx.compose.foundation.selection.toggleable
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.smartfocus.CheckInEntry
import com.example.smartfocus.ui.theme.GlassEdge
import com.example.smartfocus.ui.theme.SheetColor
import com.example.smartfocus.ui.theme.TextPrimary
import com.example.smartfocus.ui.theme.TextSecondary
import com.example.smartfocus.ui.theme.TextTertiary
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

// ---- Check-in -------------------------------------------------------------------------------

@Composable
fun ColumnScope.CheckInSheetContent(initialMood: Int?, onSave: (CheckInEntry) -> Unit) {
    var mood by remember { mutableStateOf(initialMood) }
    var energy by remember { mutableStateOf<Int?>(null) }
    var focus by remember { mutableStateOf<Int?>(null) }
    var note by remember { mutableStateOf("") }
    val complete = mood != null && energy != null && focus != null

    Text("How are you doing right now?", color = TextSecondary, fontSize = 16.sp)
    Spacer(Modifier.height(20.dp))
    RatingRow("Mood", mood, "Low", "Great") { mood = it }
    Spacer(Modifier.height(22.dp))
    RatingRow("Energy", energy, "Drained", "Energized") { energy = it }
    Spacer(Modifier.height(22.dp))
    RatingRow("Focus", focus, "Scattered", "Sharp") { focus = it }
    Spacer(Modifier.height(24.dp))
    OutlinedTextField(
        value = note,
        onValueChange = { if (it.length <= 280) note = it },
        label = { Text("Note (optional)") },
        placeholder = { Text("Anything affecting your day?") },
        modifier = Modifier.fillMaxWidth().heightIn(min = 96.dp),
        shape = RoundedCornerShape(16.dp),
        colors = OutlinedTextFieldDefaults.colors(
            focusedBorderColor = Color.White.copy(alpha = 0.7f),
            unfocusedBorderColor = Color.White.copy(alpha = 0.25f),
            focusedLabelColor = TextSecondary,
            unfocusedLabelColor = TextTertiary,
            cursorColor = Color.White,
            focusedContainerColor = Color.White.copy(alpha = 0.05f),
            unfocusedContainerColor = Color.White.copy(alpha = 0.05f),
        ),
    )
    Spacer(Modifier.height(24.dp))
    PillButton(
        text = "Save check-in",
        enabled = complete,
        onClick = {
            onSave(
                CheckInEntry(
                    mood = mood!!, energy = energy!!, focus = focus!!, note = note.trim(),
                    timeText = SimpleDateFormat("h:mm a", Locale.getDefault()).format(Date()),
                )
            )
        },
    )
    if (!complete) {
        Spacer(Modifier.height(8.dp))
        Text("Rate all three to save.", color = TextTertiary, fontSize = 13.sp, modifier = Modifier.fillMaxWidth(), textAlign = TextAlign.Center)
    }
}

@Composable
private fun RatingRow(label: String, value: Int?, low: String, high: String, onChange: (Int) -> Unit) {
    Text(label, color = TextPrimary, fontSize = 17.sp, fontWeight = FontWeight.SemiBold)
    Spacer(Modifier.height(10.dp))
    Row(Modifier.fillMaxWidth().selectableGroup(), horizontalArrangement = Arrangement.SpaceBetween) {
        (1..5).forEach { rating ->
            val selected = value == rating
            Box(
                Modifier
                    .size(52.dp)
                    .clip(CircleShape)
                    .background(if (selected) Color.White else Color.White.copy(alpha = 0.09f))
                    .selectable(selected = selected, role = Role.RadioButton, onClick = { onChange(rating) })
                    .semantics { },
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    "$rating",
                    color = if (selected) SheetColor else TextPrimary,
                    fontSize = 18.sp,
                    fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Normal,
                )
            }
        }
    }
    Spacer(Modifier.height(6.dp))
    Row(Modifier.fillMaxWidth().clearAndSetSemantics { }, horizontalArrangement = Arrangement.SpaceBetween) {
        Text(low, color = TextTertiary, fontSize = 13.sp)
        Text(high, color = TextTertiary, fontSize = 13.sp)
    }
}

@Composable
internal fun PillButton(text: String, onClick: () -> Unit, enabled: Boolean = true, destructive: Boolean = false) {
    Box(
        Modifier
            .fillMaxWidth()
            .heightIn(min = 52.dp)
            .clip(CircleShape)
            .background(
                when {
                    destructive -> Color.White.copy(alpha = 0.08f)
                    enabled -> Color.White
                    else -> Color.White.copy(alpha = 0.25f)
                }
            )
            .selectable(selected = false, enabled = enabled, role = Role.Button, onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text,
            color = when {
                destructive -> Color(0xFFFF8A80)
                enabled -> SheetColor
                else -> SheetColor.copy(alpha = 0.6f)
            },
            fontSize = 16.sp,
            fontWeight = FontWeight.SemiBold,
        )
    }
}

// ---- Profile --------------------------------------------------------------------------------

@Composable
fun ColumnScope.ProfileSheetContent(name: String, email: String) {
    Box(
        Modifier
            .align(Alignment.CenterHorizontally)
            .size(84.dp)
            .clip(CircleShape)
            .background(Color.White.copy(alpha = 0.14f))
            .clearAndSetSemantics { },
        contentAlignment = Alignment.Center,
    ) {
        Text(name.take(1), color = TextPrimary, fontSize = 36.sp, fontWeight = FontWeight.Light)
    }
    Spacer(Modifier.height(12.dp))
    Text(name, color = TextPrimary, fontSize = 22.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.align(Alignment.CenterHorizontally))
    Text(email, color = TextSecondary, fontSize = 15.sp, modifier = Modifier.align(Alignment.CenterHorizontally))
    Spacer(Modifier.height(24.dp))
    SectionTitle("Account")
    RowGroup(listOf("Platform" to "Android", "Study ID" to "Not enrolled yet", "Member since" to "Oct 2026"))
    Spacer(Modifier.height(20.dp))
    SectionTitle("Data sources")
    RowGroup(listOf("Health Connect" to "Not connected", "Usage access" to "Not connected", "Notifications" to "Not connected"))
}

@Composable
private fun RowGroup(rows: List<Pair<String, String>>) {
    SheetCard(Modifier) {
        rows.forEachIndexed { i, (label, value) ->
            if (i > 0) Box(Modifier.fillMaxWidth().height(1.dp).background(GlassEdge))
            Row(
                Modifier.fillMaxWidth().heightIn(min = 48.dp).semantics(mergeDescendants = true) { },
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(label, color = TextPrimary, fontSize = 16.sp, modifier = Modifier.weight(1f))
                Text(value, color = TextSecondary, fontSize = 15.sp)
            }
        }
    }
}

// ---- Settings -------------------------------------------------------------------------------

@Composable
fun ColumnScope.SettingsSheetContent(onSignOut: () -> Unit) {
    var notifications by remember { mutableStateOf(true) }
    var reminders by remember { mutableStateOf(true) }
    var shareData by remember { mutableStateOf(false) }

    SectionTitle("Notifications")
    SheetCard {
        ToggleRow("Notifications", notifications) { notifications = it }
        Box(Modifier.fillMaxWidth().height(1.dp).background(GlassEdge))
        ToggleRow("Sleep reminders", reminders) { reminders = it }
    }
    Spacer(Modifier.height(20.dp))
    SectionTitle("Privacy")
    SheetCard {
        ToggleRow(
            "Share anonymous data",
            shareData,
            description = "Sends your data to the research team without your name or email.",
        ) { shareData = it }
    }
    Spacer(Modifier.height(28.dp))
    PillButton("Sign out", onClick = onSignOut, destructive = true)
}

@Composable
private fun ToggleRow(label: String, checked: Boolean, description: String? = null, onChange: (Boolean) -> Unit) {
    Row(
        Modifier
            .fillMaxWidth()
            .heightIn(min = 56.dp)
            .toggleable(value = checked, role = Role.Switch, onValueChange = onChange)
            .padding(vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(Modifier.weight(1f).padding(end = 12.dp)) {
            Text(label, color = TextPrimary, fontSize = 16.sp)
            if (description != null) {
                Spacer(Modifier.height(2.dp))
                Text(description, color = TextSecondary, fontSize = 13.sp, lineHeight = 18.sp)
            }
        }
        Switch(checked = checked, onCheckedChange = null)
    }
}
