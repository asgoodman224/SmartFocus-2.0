package com.example.smartfocus

import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.blur
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.unit.dp
import com.example.smartfocus.data.Metric
import com.example.smartfocus.data.sampleFocusWeek
import com.example.smartfocus.data.sampleMetrics
import com.example.smartfocus.data.samplePhoneMetric
import com.example.smartfocus.data.samplePhoneUse
import com.example.smartfocus.ui.components.FloatingBar
import com.example.smartfocus.ui.components.GlassSheet
import com.example.smartfocus.ui.home.HomeScreen
import com.example.smartfocus.ui.icons.AppIcons
import com.example.smartfocus.ui.icons.Mood
import com.example.smartfocus.ui.sheets.CheckInSheetContent
import com.example.smartfocus.ui.sheets.MetricSheetContent
import com.example.smartfocus.ui.sheets.ProfileSheetContent
import com.example.smartfocus.ui.sheets.SettingsSheetContent
import com.example.smartfocus.ui.theme.SkyBackground
import com.example.smartfocus.ui.theme.TimeOfDay
import com.example.smartfocus.ui.theme.horizon
import dev.chrisbanes.haze.hazeSource
import dev.chrisbanes.haze.rememberHazeState

data class CheckInEntry(val mood: Int, val energy: Int, val focus: Int, val note: String, val timeText: String)

/** What's open over the home screen. */
sealed interface Sheet {
    data class MetricDetail(val metric: Metric) : Sheet
    data class CheckIn(val mood: Int?) : Sheet
    data object Profile : Sheet
    data object Settings : Sheet
}

private const val NAME = "Aiden" // placeholder until sign-in
private const val EMAIL = "aiden@example.com"

@Composable
fun SmartFocusApp(time: TimeOfDay = remember { TimeOfDay.now() }, initialSheet: Sheet? = null) {
    var sheet by remember { mutableStateOf(initialSheet) }
    // Keeps the last sheet's content on screen while it animates away.
    var shown by remember { mutableStateOf(initialSheet) }
    if (sheet != null && shown != sheet) shown = sheet
    var checkIn by remember { mutableStateOf<CheckInEntry?>(null) }
    val hazeState = rememberHazeState()

    // While a sheet is open, the home screen recedes: it shrinks slightly, rounds its corners
    // and blurs (blur needs Android 12+; older versions just dim).
    val open by animateFloatAsState(
        if (sheet != null) 1f else 0f,
        tween(380, easing = FastOutSlowInEasing),
        label = "sheet",
    )

    Box(Modifier.fillMaxSize().background(Color.Black)) {
        Box(
            Modifier
                .fillMaxSize()
                .graphicsLayer {
                    val scale = 1f - 0.06f * open
                    scaleX = scale
                    scaleY = scale
                    shape = RoundedCornerShape(28.dp * open)
                    clip = open > 0f
                }
                .blur(14.dp * open)
        ) {
            Box(Modifier.fillMaxSize().hazeSource(hazeState)) {
                SkyBackground(time)
                HomeScreen(
                    name = NAME,
                    focusScore = sampleFocusWeek.last(),
                    focusWeek = sampleFocusWeek,
                    metrics = sampleMetrics,
                    phone = samplePhoneUse,
                    checkIn = checkIn,
                    onOpenMetric = { sheet = Sheet.MetricDetail(it) },
                    onOpenPhone = { sheet = Sheet.MetricDetail(samplePhoneMetric) },
                    onCheckIn = { sheet = Sheet.CheckIn(it) },
                )
            }
            FloatingBar(
                hazeState = hazeState,
                horizon = time.horizon(),
                onProfile = { sheet = Sheet.Profile },
                onCheckIn = { sheet = Sheet.CheckIn(null) },
                onSettings = { sheet = Sheet.Settings },
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .navigationBarsPadding()
                    .padding(bottom = 14.dp),
            )
        }

        val current = shown
        GlassSheet(
            visible = sheet != null,
            title = when (current) {
                is Sheet.MetricDetail -> current.metric.title
                is Sheet.CheckIn -> "Check-in"
                Sheet.Profile -> "Profile"
                Sheet.Settings -> "Settings"
                null -> ""
            },
            icon = when (current) {
                is Sheet.MetricDetail -> current.metric.icon
                is Sheet.CheckIn -> AppIcons.Mood
                else -> null
            },
            onDismiss = { sheet = null },
        ) {
            when (current) {
                is Sheet.MetricDetail -> MetricSheetContent(current.metric)
                is Sheet.CheckIn -> CheckInSheetContent(current.mood) { checkIn = it; sheet = null }
                Sheet.Profile -> ProfileSheetContent(NAME, EMAIL)
                Sheet.Settings -> SettingsSheetContent(onSignOut = { sheet = null })
                null -> Unit
            }
        }
    }
}
