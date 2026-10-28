package com.example.smartfocus

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

private val BgColor = Color(0xFF1B1030)
private val CardColor = Color(0xFF2E1B52)
private val Accent = Color(0xFFC4A1FF)
private val TextSecondary = Color(0xFFB8A9D9)

enum class Screen { HOME, PROFILE, SETTINGS }

data class Category(
    val name: String,
    val value: String,
    val weeklyAvg: String,
    val goal: String,
    val note: String
)

private val categories = listOf(
    Category("Sleep", "7h 10m", "6h 52m", "8h", "Placeholder: sleep details will come from the API."),
    Category("Activity", "8,200", "7,450", "10,000", "Placeholder: step details will come from the API."),
    Category("Exercise", "35 min", "28 min", "45 min", "Placeholder: exercise details will come from the API."),
    Category("Mobility", "3.4 mi", "2.9 mi", "4 mi", "Placeholder: mobility details will come from the API."),
    Category("Social", "5", "4", "6", "Placeholder: social details will come from the API."),
    Category("Cognition", "4 / 5", "3.8 / 5", "4 / 5", "Placeholder: mood details will come from the API.")
)

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            MaterialTheme(
                colorScheme = darkColorScheme(
                    primary = Accent,
                    background = BgColor,
                    surface = CardColor
                )
            ) {
                SmartFocusApp()
            }
        }
    }
}

@Composable
fun SmartFocusApp() {
    var screen by remember { mutableStateOf(Screen.HOME) }
    var selected by remember { mutableStateOf<Category?>(null) }
    Box(Modifier.fillMaxSize().background(BgColor)) {
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
    Column(Modifier.fillMaxSize().statusBarsPadding().padding(20.dp)) {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text("SmartFocus", color = Color.White, fontSize = 28.sp, fontWeight = FontWeight.Bold)
                Text("Today's summary", color = TextSecondary, fontSize = 14.sp)
            }
            TopButton("⚙", onSettings)
            Spacer(Modifier.width(10.dp))
            TopButton("A", onProfile)
        }
        Spacer(Modifier.height(20.dp))
        LazyVerticalGrid(
            columns = GridCells.Fixed(2),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            items(categories) { MiniCard(it) { onSelect(it) } }
        }
    }
}

@Composable
fun TopButton(label: String, onClick: () -> Unit) {
    Box(
        Modifier.size(44.dp).background(CardColor, CircleShape).clickable { onClick() },
        contentAlignment = Alignment.Center
    ) {
        Text(label, color = Accent, fontSize = 20.sp, fontWeight = FontWeight.Bold)
    }
}

@Composable
fun MiniCard(category: Category, onClick: () -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .height(110.dp)
            .background(CardColor, RoundedCornerShape(20.dp))
            .clickable { onClick() }
            .padding(16.dp),
        verticalArrangement = Arrangement.Center
    ) {
        Text(category.name, color = Accent, fontSize = 14.sp)
        Spacer(Modifier.height(6.dp))
        Text(category.value, color = Color.White, fontSize = 22.sp, fontWeight = FontWeight.Bold)
    }
}

@Composable
fun BackRow(title: String, onBack: () -> Unit) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        TextButton(onClick = onBack) { Text("← Back", color = Accent, fontSize = 16.sp) }
        Spacer(Modifier.width(8.dp))
        Text(title, color = Color.White, fontSize = 24.sp, fontWeight = FontWeight.Bold)
    }
}

@Composable
fun DetailScreen(category: Category, onBack: () -> Unit) {
    Column(
        Modifier
            .fillMaxSize()
            .statusBarsPadding()
            .verticalScroll(rememberScrollState())
            .padding(20.dp)
    ) {
        BackRow(category.name, onBack)
        Spacer(Modifier.height(20.dp))
        Column(
            Modifier
                .fillMaxWidth()
                .background(CardColor, RoundedCornerShape(24.dp))
                .padding(28.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text("Today", color = TextSecondary, fontSize = 14.sp)
            Spacer(Modifier.height(8.dp))
            Text(category.value, color = Color.White, fontSize = 48.sp, fontWeight = FontWeight.Bold)
        }
        Spacer(Modifier.height(16.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
            StatCard("Weekly average", category.weeklyAvg, Modifier.weight(1f))
            StatCard("Goal", category.goal, Modifier.weight(1f))
        }
        Spacer(Modifier.height(16.dp))
        Text(
            category.note,
            color = TextSecondary,
            fontSize = 14.sp,
            modifier = Modifier
                .fillMaxWidth()
                .background(CardColor, RoundedCornerShape(20.dp))
                .padding(20.dp)
        )
    }
}

@Composable
fun StatCard(label: String, value: String, modifier: Modifier = Modifier) {
    Column(
        modifier
            .background(CardColor, RoundedCornerShape(20.dp))
            .padding(20.dp)
    ) {
        Text(label, color = TextSecondary, fontSize = 13.sp)
        Spacer(Modifier.height(6.dp))
        Text(value, color = Color.White, fontSize = 22.sp, fontWeight = FontWeight.Bold)
    }
}

@Composable
fun ProfileScreen(onBack: () -> Unit) {
    Column(Modifier.fillMaxSize().statusBarsPadding().padding(20.dp)) {
        BackRow("Profile", onBack)
        Spacer(Modifier.height(20.dp))
        Column(
            Modifier
                .fillMaxWidth()
                .background(CardColor, RoundedCornerShape(24.dp))
                .padding(28.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Box(
                Modifier.size(80.dp).background(Accent, CircleShape),
                contentAlignment = Alignment.Center
            ) {
                Text("A", color = BgColor, fontSize = 36.sp, fontWeight = FontWeight.Bold)
            }
            Spacer(Modifier.height(16.dp))
            Text("Aiden", color = Color.White, fontSize = 22.sp, fontWeight = FontWeight.Bold)
            Text("aiden@example.com", color = TextSecondary, fontSize = 14.sp)
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
            .background(CardColor, RoundedCornerShape(20.dp))
            .padding(20.dp)
    ) {
        Text(label, color = TextSecondary, fontSize = 14.sp, modifier = Modifier.weight(1f))
        Text(value, color = Color.White, fontSize = 14.sp)
    }
}

@Composable
fun SettingsScreen(onBack: () -> Unit) {
    var notifications by remember { mutableStateOf(true) }
    var reminders by remember { mutableStateOf(true) }
    var shareData by remember { mutableStateOf(false) }
    Column(Modifier.fillMaxSize().statusBarsPadding().padding(20.dp)) {
        BackRow("Settings", onBack)
        Spacer(Modifier.height(20.dp))
        ToggleRow("Notifications", notifications) { notifications = it }
        Spacer(Modifier.height(12.dp))
        ToggleRow("Sleep reminders", reminders) { reminders = it }
        Spacer(Modifier.height(12.dp))
        ToggleRow("Share anonymous data", shareData) { shareData = it }
        Spacer(Modifier.height(24.dp))
        Button(
            onClick = { },
            modifier = Modifier.fillMaxWidth(),
            colors = ButtonDefaults.buttonColors(containerColor = CardColor, contentColor = Accent)
        ) {
            Text("Log out")
        }
    }
}

@Composable
fun ToggleRow(label: String, checked: Boolean, onChange: (Boolean) -> Unit) {
    Row(
        Modifier
            .fillMaxWidth()
            .background(CardColor, RoundedCornerShape(20.dp))
            .padding(horizontal = 20.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(label, color = Color.White, fontSize = 16.sp, modifier = Modifier.weight(1f))
        Switch(checked = checked, onCheckedChange = onChange)
    }
}