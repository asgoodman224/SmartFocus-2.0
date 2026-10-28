package com.example.smartfocus

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.selection.toggleable
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.outlined.Settings
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.smartfocus.ui.theme.SmartFocusTheme

enum class Screen { HOME, PROFILE, SETTINGS }

data class Category(
    val name: String,
    val value: String,
    val weeklyAvg: String,
    val goal: String,
    /** Today's value as a share of the goal, 0..1. */
    val progress: Float,
    val note: String
)

private val categories = listOf(
    Category("Sleep", "7h 10m", "6h 52m", "8h", 0.90f, "Placeholder: sleep details will come from the API."),
    Category("Activity", "8,200", "7,450", "10,000", 0.82f, "Placeholder: step details will come from the API."),
    Category("Exercise", "35 min", "28 min", "45 min", 0.78f, "Placeholder: exercise details will come from the API."),
    Category("Mobility", "3.4 mi", "2.9 mi", "4 mi", 0.85f, "Placeholder: mobility details will come from the API."),
    Category("Social", "5", "4", "6", 0.83f, "Placeholder: social details will come from the API."),
    Category("Cognition", "4 / 5", "3.8 / 5", "4 / 5", 1.00f, "Placeholder: mood details will come from the API.")
)

private val CardShape = RoundedCornerShape(20.dp)

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            SmartFocusTheme {
                SmartFocusApp()
            }
        }
    }
}

@Composable
fun SmartFocusApp() {
    var screen by remember { mutableStateOf(Screen.HOME) }
    var selected by remember { mutableStateOf<Category?>(null) }
    Box(
        Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            // Keeps content clear of the status bar, navigation bar and display cutouts.
            .safeDrawingPadding()
    ) {
        val current = selected
        when {
            screen == Screen.PROFILE -> {
                BackHandler { screen = Screen.HOME }
                ProfileScreen { screen = Screen.HOME }
            }
            screen == Screen.SETTINGS -> {
                BackHandler { screen = Screen.HOME }
                SettingsScreen { screen = Screen.HOME }
            }
            current != null -> {
                BackHandler { selected = null }
                DetailScreen(current) { selected = null }
            }
            else -> HomeScreen(
                onSelect = { selected = it },
                onProfile = { screen = Screen.PROFILE },
                onSettings = { screen = Screen.SETTINGS }
            )
        }
    }
}

@Composable
fun HomeScreen(onSelect: (Category) -> Unit, onProfile: () -> Unit, onSettings: () -> Unit) {
    val colors = MaterialTheme.colorScheme
    // At very large text sizes two columns get cramped, so drop to one.
    val columns = if (LocalDensity.current.fontScale >= 1.5f) 1 else 2
    Column(Modifier.fillMaxSize().padding(20.dp)) {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text(
                    "SmartFocus",
                    color = colors.onBackground,
                    fontSize = 28.sp,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.semantics { heading() }
                )
                Text("Today's summary", color = colors.onSurfaceVariant, fontSize = 14.sp)
            }
            TopButton(label = "Settings", onClick = onSettings) {
                Icon(Icons.Outlined.Settings, contentDescription = null)
            }
            Spacer(Modifier.width(10.dp))
            TopButton(label = "Profile", onClick = onProfile) {
                Text("A", fontSize = 20.sp, fontWeight = FontWeight.Bold)
            }
        }
        Spacer(Modifier.height(20.dp))
        LazyVerticalGrid(
            columns = GridCells.Fixed(columns),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            items(categories) { MiniCard(it) { onSelect(it) } }
        }
    }
}

/** A round 44dp button (48dp touch target) that screen readers announce by [label]. */
@Composable
fun TopButton(label: String, onClick: () -> Unit, content: @Composable () -> Unit) {
    FilledIconButton(
        onClick = onClick,
        modifier = Modifier
            .size(44.dp)
            .semantics { contentDescription = label },
        shape = CircleShape,
        colors = IconButtonDefaults.filledIconButtonColors(
            containerColor = MaterialTheme.colorScheme.surface,
            contentColor = MaterialTheme.colorScheme.primary
        )
    ) {
        Box(Modifier.clearAndSetSemantics { }, contentAlignment = Alignment.Center) { content() }
    }
}

@Composable
fun MiniCard(category: Category, onClick: () -> Unit) {
    val colors = MaterialTheme.colorScheme
    Column(
        modifier = Modifier
            .fillMaxWidth()
            // A minimum, not a fixed height: the card grows with larger text instead of clipping.
            .heightIn(min = 110.dp)
            .clip(CardShape)
            .background(colors.surface)
            .border(1.dp, colors.outlineVariant, CardShape)
            .clickable(onClickLabel = "Open ${category.name} details", role = Role.Button) { onClick() }
            .padding(16.dp),
        verticalArrangement = Arrangement.Center
    ) {
        Text(category.name, color = colors.primary, fontSize = 14.sp)
        Spacer(Modifier.height(6.dp))
        Text(category.value, color = colors.onSurface, fontSize = 22.sp, fontWeight = FontWeight.Bold)
        Spacer(Modifier.height(10.dp))
        GoalBar(category.progress)
        Spacer(Modifier.height(6.dp))
        Text(
            "${(category.progress * 100).toInt()}% of goal (${category.goal})",
            color = colors.onSurfaceVariant,
            fontSize = 13.sp
        )
    }
}

/** Progress toward the day's goal. Decorative: the text beside it says the same thing. */
@Composable
fun GoalBar(progress: Float) {
    Box(
        Modifier
            .fillMaxWidth()
            .height(4.dp)
            .clip(RoundedCornerShape(2.dp))
            .background(MaterialTheme.colorScheme.background)
    ) {
        Box(
            Modifier
                .fillMaxWidth(progress.coerceIn(0f, 1f))
                .fillMaxHeight()
                .background(MaterialTheme.colorScheme.primary)
        )
    }
}

@Composable
fun BackRow(title: String, onBack: () -> Unit) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        IconButton(onClick = onBack) {
            Icon(
                Icons.AutoMirrored.Filled.ArrowBack,
                contentDescription = "Back",
                tint = MaterialTheme.colorScheme.primary
            )
        }
        Spacer(Modifier.width(4.dp))
        Text(
            title,
            color = MaterialTheme.colorScheme.onBackground,
            fontSize = 24.sp,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.semantics { heading() }
        )
    }
}

@Composable
fun DetailScreen(category: Category, onBack: () -> Unit) {
    val colors = MaterialTheme.colorScheme
    Column(
        Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(20.dp)
    ) {
        BackRow(category.name, onBack)
        Spacer(Modifier.height(20.dp))
        Column(
            Modifier
                .fillMaxWidth()
                .background(colors.surface, RoundedCornerShape(24.dp))
                .padding(28.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text("Today", color = colors.onSurfaceVariant, fontSize = 14.sp)
            Spacer(Modifier.height(8.dp))
            Text(category.value, color = colors.onSurface, fontSize = 48.sp, fontWeight = FontWeight.Bold)
            Spacer(Modifier.height(16.dp))
            GoalBar(category.progress)
            Spacer(Modifier.height(8.dp))
            Text(
                "${(category.progress * 100).toInt()}% of today's goal",
                color = colors.onSurfaceVariant,
                fontSize = 14.sp
            )
        }
        Spacer(Modifier.height(16.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
            StatCard("Weekly average", category.weeklyAvg, Modifier.weight(1f))
            StatCard("Goal", category.goal, Modifier.weight(1f))
        }
        Spacer(Modifier.height(16.dp))
        Text(
            category.note,
            color = colors.onSurfaceVariant,
            fontSize = 14.sp,
            modifier = Modifier
                .fillMaxWidth()
                .background(colors.surface, CardShape)
                .padding(20.dp)
        )
    }
}

@Composable
fun StatCard(label: String, value: String, modifier: Modifier = Modifier) {
    Column(
        modifier
            .background(MaterialTheme.colorScheme.surface, CardShape)
            .padding(20.dp)
    ) {
        Text(label, color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 13.sp)
        Spacer(Modifier.height(6.dp))
        Text(value, color = MaterialTheme.colorScheme.onSurface, fontSize = 22.sp, fontWeight = FontWeight.Bold)
    }
}

@Composable
fun ProfileScreen(onBack: () -> Unit) {
    val colors = MaterialTheme.colorScheme
    Column(
        Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(20.dp)
    ) {
        BackRow("Profile", onBack)
        Spacer(Modifier.height(20.dp))
        Column(
            Modifier
                .fillMaxWidth()
                .background(colors.surface, RoundedCornerShape(24.dp))
                .padding(28.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Box(
                Modifier
                    .size(80.dp)
                    .background(colors.primary, CircleShape)
                    .clearAndSetSemantics { },
                contentAlignment = Alignment.Center
            ) {
                Text("A", color = colors.onPrimary, fontSize = 36.sp, fontWeight = FontWeight.Bold)
            }
            Spacer(Modifier.height(16.dp))
            Text("Aiden", color = colors.onSurface, fontSize = 22.sp, fontWeight = FontWeight.Bold)
            Text("aiden@example.com", color = colors.onSurfaceVariant, fontSize = 14.sp)
        }
        Spacer(Modifier.height(16.dp))
        InfoRow("Platform", "Android")
        Spacer(Modifier.height(12.dp))
        InfoRow("Study ID", "Not enrolled yet")
        Spacer(Modifier.height(12.dp))
        InfoRow("Member since", "Oct 2026")
    }
}

@Composable
fun InfoRow(label: String, value: String) {
    Row(
        Modifier
            .fillMaxWidth()
            .background(MaterialTheme.colorScheme.surface, CardShape)
            .semantics(mergeDescendants = true) { }
            .padding(20.dp)
    ) {
        Text(label, color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 14.sp, modifier = Modifier.weight(1f))
        Text(value, color = MaterialTheme.colorScheme.onSurface, fontSize = 14.sp)
    }
}

@Composable
fun SettingsScreen(onBack: () -> Unit) {
    var notifications by remember { mutableStateOf(true) }
    var reminders by remember { mutableStateOf(true) }
    var shareData by remember { mutableStateOf(false) }
    Column(
        Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(20.dp)
    ) {
        BackRow("Settings", onBack)
        Spacer(Modifier.height(20.dp))
        ToggleRow("Notifications", notifications) { notifications = it }
        Spacer(Modifier.height(12.dp))
        ToggleRow("Sleep reminders", reminders) { reminders = it }
        Spacer(Modifier.height(12.dp))
        ToggleRow(
            "Share anonymous data",
            shareData,
            description = "Sends your data to the research team without your name or email."
        ) { shareData = it }
        Spacer(Modifier.height(24.dp))
        Button(
            onClick = { },
            modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp),
            colors = ButtonDefaults.buttonColors(
                containerColor = MaterialTheme.colorScheme.surface,
                contentColor = MaterialTheme.colorScheme.primary
            )
        ) {
            Text("Sign out")
        }
    }
}

/**
 * A settings row whose whole surface toggles the switch, so the label and the switch are one
 * control for touch and for screen readers.
 */
@Composable
fun ToggleRow(label: String, checked: Boolean, description: String? = null, onChange: (Boolean) -> Unit) {
    val colors = MaterialTheme.colorScheme
    Row(
        Modifier
            .fillMaxWidth()
            .heightIn(min = 56.dp)
            .clip(CardShape)
            .background(colors.surface)
            .toggleable(value = checked, role = Role.Switch, onValueChange = onChange)
            .padding(horizontal = 20.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column(Modifier.weight(1f).padding(end = 12.dp)) {
            Text(label, color = colors.onSurface, fontSize = 16.sp)
            if (description != null) {
                Spacer(Modifier.height(2.dp))
                Text(description, color = colors.onSurfaceVariant, fontSize = 13.sp)
            }
        }
        Switch(checked = checked, onCheckedChange = null)
    }
}
