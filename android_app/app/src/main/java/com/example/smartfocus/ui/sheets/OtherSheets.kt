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
import android.text.format.DateFormat
import android.text.format.DateUtils
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material3.Icon
import com.example.smartfocus.sync.Account
import androidx.compose.foundation.clickable
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.RadioButton
import androidx.compose.material3.TextButton
import androidx.compose.material3.TimePicker
import androidx.compose.material3.TimePickerDefaults
import androidx.compose.material3.rememberTimePickerState
import androidx.compose.ui.platform.LocalContext
import com.example.smartfocus.data.AppSettings
import com.example.smartfocus.data.CheckIn
import com.example.smartfocus.data.HeroStyle
import com.example.smartfocus.data.formatMinutes
import com.example.smartfocus.reminders.MiddayMinutes
import com.example.smartfocus.data.CheckInKind
import com.example.smartfocus.ui.theme.GlassEdge
import com.example.smartfocus.ui.theme.SheetColor
import com.example.smartfocus.ui.theme.TextPrimary
import com.example.smartfocus.ui.theme.TextSecondary
import com.example.smartfocus.ui.theme.TextTertiary

// ---- Check-in -------------------------------------------------------------------------------

@Composable
fun ColumnScope.CheckInSheetContent(kind: CheckInKind, initialMood: Int?, onSave: (CheckIn) -> Unit) {
    val asksSleep = kind == CheckInKind.Morning
    var sleep by remember { mutableStateOf<Int?>(null) }
    var mood by remember { mutableStateOf(initialMood) }
    var energy by remember { mutableStateOf<Int?>(null) }
    var focus by remember { mutableStateOf<Int?>(null) }
    var note by remember { mutableStateOf("") }
    val complete = mood != null && energy != null && focus != null && (sleep != null || !asksSleep)

    Text(kind.prompt, color = TextSecondary, fontSize = 16.sp)
    Spacer(Modifier.height(20.dp))
    if (asksSleep) {
        RatingRow("Sleep", sleep, "Restless", "Rested") { sleep = it }
        Spacer(Modifier.height(22.dp))
    }
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
                CheckIn(
                    timeMillis = System.currentTimeMillis(), kind = kind,
                    mood = mood!!, energy = energy!!, focus = focus!!, sleepQuality = sleep, note = note.trim(),
                )
            )
        },
    )
    if (!complete) {
        Spacer(Modifier.height(8.dp))
        Text(if (asksSleep) "Rate all four to save." else "Rate all three to save.", color = TextTertiary, fontSize = 13.sp, modifier = Modifier.fillMaxWidth(), textAlign = TextAlign.Center)
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
internal fun PillButton(
    text: String,
    onClick: () -> Unit,
    enabled: Boolean = true,
    destructive: Boolean = false,
    secondary: Boolean = false,
) {
    Box(
        Modifier
            .fillMaxWidth()
            .heightIn(min = 52.dp)
            .clip(CircleShape)
            .background(
                when {
                    destructive || secondary -> Color.White.copy(alpha = 0.08f)
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
                secondary -> TextPrimary
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
fun ColumnScope.ProfileSheetContent(
    settings: AppSettings,
    email: String?,
    sources: List<Pair<String, String>>,
    onManageSources: () -> Unit,
) {
    var name by remember { mutableStateOf(settings.name) }
    val initial = name.ifBlank { email.orEmpty() }.take(1).uppercase()
    Box(
        Modifier
            .align(Alignment.CenterHorizontally)
            .size(84.dp)
            .clip(CircleShape)
            .background(Color.White.copy(alpha = 0.14f))
            .clearAndSetSemantics { },
        contentAlignment = Alignment.Center,
    ) {
        if (initial.isEmpty()) Icon(Icons.Outlined.Person, contentDescription = null, tint = TextPrimary, modifier = Modifier.size(40.dp))
        else Text(initial, color = TextPrimary, fontSize = 36.sp, fontWeight = FontWeight.Light)
    }
    Spacer(Modifier.height(20.dp))
    OutlinedTextField(
        value = name,
        onValueChange = { if (it.length <= 40) { name = it; settings.updateName(it) } },
        label = { Text("Your name") },
        placeholder = { Text("What Home should call you") },
        singleLine = true,
        modifier = Modifier.fillMaxWidth(),
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
    SectionTitle("Account")
    RowGroup(listOf("Study account" to (email ?: "Not signed in"), "Platform" to "Android"))
    Spacer(Modifier.height(20.dp))
    SectionTitle("Data sources")
    RowGroup(sources)
    Spacer(Modifier.height(16.dp))
    PillButton("Manage data sources", onClick = onManageSources, secondary = true)
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
fun ColumnScope.SettingsSheetContent(
    settings: AppSettings,
    account: Account,
    /** Called after any reminder setting changes, so alarms can be rescheduled. */
    onRemindersChanged: (enabled: Boolean) -> Unit,
    onDataSources: () -> Unit,
    onSignIn: () -> Unit,
    onSyncNow: () -> Unit,
    onSignOut: () -> Unit,
) {
    var editing by remember { mutableStateOf<TimeSetting?>(null) }

    SectionTitle("Home headline")
    SheetCard(Modifier.selectableGroup()) {
        HeroStyle.entries.forEachIndexed { i, style ->
            if (i > 0) RowDivider()
            ChoiceRow(style.label, style.description, selected = settings.heroStyle == style) { settings.updateHeroStyle(style) }
        }
    }
    Spacer(Modifier.height(20.dp))
    SectionTitle("Check-in reminders")
    SheetCard {
        ToggleRow(
            "Reminders",
            settings.remindersEnabled,
            description = "A notification when you wake up and 30 minutes before bed. Your score appears once you check in.",
        ) { settings.updateReminders(it); onRemindersChanged(it) }
        if (settings.remindersEnabled) {
            RowDivider()
            ValueRow("Wake-up time", formatMinutes(settings.wakeMinutes)) { editing = TimeSetting.Wake }
            RowDivider()
            ValueRow("Bedtime", formatMinutes(settings.bedMinutes)) { editing = TimeSetting.Bed }
            RowDivider()
            ToggleRow(
                "Midday check-in",
                settings.middayEnabled,
                description = "Another reminder at ${formatMinutes(MiddayMinutes)}.",
            ) { settings.updateMidday(it); onRemindersChanged(true) }
        }
    }
    Spacer(Modifier.height(20.dp))
    SectionTitle("Data")
    SheetCard {
        ValueRow("Data sources", "Health, usage, reminders", onDataSources)
    }
    Spacer(Modifier.height(20.dp))
    SectionTitle("Study account")
    SheetCard {
        if (account.signedIn) {
            ValueRow("Signed in as", account.email.orEmpty(), onClick = null)
            RowDivider()
            ValueRow(
                "Last synced",
                if (account.lastSync == 0L) "Not yet"
                else DateUtils.getRelativeTimeSpanString(account.lastSync, System.currentTimeMillis(), DateUtils.MINUTE_IN_MILLIS).toString(),
                onClick = null,
            )
            account.syncError?.let { SyncError(it) }
            RowDivider()
            ValueRow("Sync now", "", onSyncNow)
        } else {
            Text(
                "Not signed in. Everything stays on this phone. Sign in to send your check-ins and daily totals to your study's server.",
                color = TextSecondary,
                fontSize = 14.sp,
                lineHeight = 20.sp,
                modifier = Modifier.padding(vertical = 6.dp),
            )
            account.syncError?.let { SyncError(it) }
            Spacer(Modifier.height(12.dp))
            PillButton("Sign in", onClick = onSignIn)
        }
    }
    if (account.signedIn) {
        Spacer(Modifier.height(28.dp))
        PillButton("Sign out", onClick = onSignOut, destructive = true)
    }

    editing?.let { which ->
        TimeDialog(
            title = if (which == TimeSetting.Wake) "Wake-up time" else "Bedtime",
            initialMinutes = if (which == TimeSetting.Wake) settings.wakeMinutes else settings.bedMinutes,
            onDismiss = { editing = null },
        ) { minutes ->
            if (which == TimeSetting.Wake) settings.updateWake(minutes) else settings.updateBed(minutes)
            editing = null
            onRemindersChanged(true)
        }
    }
}

private enum class TimeSetting { Wake, Bed }

@Composable
private fun RowDivider() = Box(Modifier.fillMaxWidth().height(1.dp).background(GlassEdge))

@Composable
private fun ChoiceRow(label: String, description: String, selected: Boolean, onSelect: () -> Unit) {
    Row(
        Modifier
            .fillMaxWidth()
            .heightIn(min = 56.dp)
            .selectable(selected = selected, role = Role.RadioButton, onClick = onSelect)
            .padding(vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(Modifier.weight(1f).padding(end = 12.dp)) {
            Text(label, color = TextPrimary, fontSize = 16.sp)
            Spacer(Modifier.height(2.dp))
            Text(description, color = TextSecondary, fontSize = 13.sp, lineHeight = 18.sp)
        }
        RadioButton(selected = selected, onClick = null)
    }
}

@Composable
private fun ValueRow(label: String, value: String, onClick: (() -> Unit)?) {
    Row(
        Modifier
            .fillMaxWidth()
            .heightIn(min = 52.dp)
            .then(if (onClick != null) Modifier.clickable(role = Role.Button, onClick = onClick) else Modifier)
            .semantics(mergeDescendants = true) { },
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(label, color = TextPrimary, fontSize = 16.sp, modifier = Modifier.weight(1f))
        Text(value, color = TextSecondary, fontSize = 16.sp, maxLines = 1, modifier = Modifier.padding(start = 12.dp))
    }
}

@Composable
private fun SyncError(message: String) {
    Text(message, color = Color(0xFFFFB4A9), fontSize = 13.sp, lineHeight = 18.sp, modifier = Modifier.padding(bottom = 8.dp))
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
internal fun TimeDialog(title: String, initialMinutes: Int, onDismiss: () -> Unit, onConfirm: (minutes: Int) -> Unit) {
    val state = rememberTimePickerState(
        initialHour = initialMinutes / 60,
        initialMinute = initialMinutes % 60,
        is24Hour = DateFormat.is24HourFormat(LocalContext.current),
    )
    val selected = Color.White.copy(alpha = 0.18f)
    val unselected = Color.White.copy(alpha = 0.08f)
    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = SheetColor,
        tonalElevation = 0.dp,
        title = { Text(title, color = TextPrimary) },
        text = {
            TimePicker(
                state,
                colors = TimePickerDefaults.colors(
                    clockDialColor = unselected,
                    selectorColor = Color.White,
                    clockDialSelectedContentColor = SheetColor,
                    clockDialUnselectedContentColor = TextPrimary,
                    periodSelectorBorderColor = Color.White.copy(alpha = 0.25f),
                    periodSelectorSelectedContainerColor = selected,
                    periodSelectorUnselectedContainerColor = Color.Transparent,
                    periodSelectorSelectedContentColor = TextPrimary,
                    periodSelectorUnselectedContentColor = TextSecondary,
                    timeSelectorSelectedContainerColor = selected,
                    timeSelectorUnselectedContainerColor = unselected,
                    timeSelectorSelectedContentColor = TextPrimary,
                    timeSelectorUnselectedContentColor = TextSecondary,
                ),
            )
        },
        confirmButton = {
            TextButton(onClick = { onConfirm(state.hour * 60 + state.minute) }) { Text("Done", color = TextPrimary) }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Cancel", color = TextSecondary) }
        },
    )
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
