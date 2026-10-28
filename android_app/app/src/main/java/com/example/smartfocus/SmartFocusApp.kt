package com.example.smartfocus

import android.Manifest
import android.os.Build
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.blur
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import com.example.smartfocus.data.AppSettings
import com.example.smartfocus.data.CheckInKind
import com.example.smartfocus.data.CheckInStore
import com.example.smartfocus.data.Metric
import com.example.smartfocus.data.formatMinutes
import com.example.smartfocus.data.sampleFocusWeek
import com.example.smartfocus.data.sampleMetrics
import com.example.smartfocus.data.samplePhoneMetric
import com.example.smartfocus.data.samplePhoneUse
import com.example.smartfocus.data.wellnessOf
import com.example.smartfocus.reminders.Reminders
import com.example.smartfocus.reminders.isDone
import com.example.smartfocus.reminders.kindAt
import com.example.smartfocus.reminders.minuteOfDay
import com.example.smartfocus.reminders.nextDue
import com.example.smartfocus.ui.components.FloatingBar
import com.example.smartfocus.ui.components.GlassSheet
import com.example.smartfocus.ui.home.HomeScreen
import com.example.smartfocus.ui.icons.AppIcons
import com.example.smartfocus.ui.icons.Mood
import com.example.smartfocus.ui.sheets.CheckInSheetContent
import com.example.smartfocus.ui.sheets.MetricSheetContent
import com.example.smartfocus.ui.sheets.ProfileSheetContent
import com.example.smartfocus.ui.sheets.ScoreSheetContent
import com.example.smartfocus.ui.sheets.SettingsSheetContent
import com.example.smartfocus.ui.theme.SkyBackground
import com.example.smartfocus.ui.theme.TimeOfDay
import com.example.smartfocus.ui.theme.horizon
import dev.chrisbanes.haze.hazeSource
import dev.chrisbanes.haze.rememberHazeState
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

/** What's open over the home screen. */
sealed interface Sheet {
    data class MetricDetail(val metric: Metric) : Sheet
    data class CheckIn(val mood: Int?, val kind: CheckInKind = CheckInKind.Anytime) : Sheet
    data object Score : Sheet
    data object Profile : Sheet
    data object Settings : Sheet
}

private const val NAME = "Aiden" // placeholder until sign-in
private const val EMAIL = "aiden@example.com"

/**
 * @param requestedCheckIn a check-in to open, e.g. from a tapped reminder; [onRequestHandled]
 *   is called once it's open.
 * @param autoPrompt open the morning or evening check-in by itself when the app is opened at
 *   that time of day and it hasn't been done yet.
 */
@Composable
fun SmartFocusApp(
    time: TimeOfDay = remember { TimeOfDay.now() },
    initialSheet: Sheet? = null,
    requestedCheckIn: CheckInKind? = null,
    onRequestHandled: () -> Unit = {},
    autoPrompt: Boolean = true,
) {
    val context = LocalContext.current
    val settings = remember { AppSettings(context) }
    val store = remember { CheckInStore(context) }
    var sheet by remember { mutableStateOf(initialSheet) }
    // Keeps the last sheet's content on screen while it animates away.
    var shown by remember { mutableStateOf(initialSheet) }
    if (sheet != null && shown != sheet) shown = sheet
    val hazeState = rememberHazeState()
    val listState = rememberLazyListState()
    val scope = rememberCoroutineScope()

    val now = System.currentTimeMillis()
    val today = store.all.filter { CheckInStore.isSameDay(it.timeMillis, now) }
    val wellness = wellnessOf(sampleMetrics, samplePhoneUse, today)
    val next = nextDue(now, settings.schedule(), today)?.let { (kind, minutes) -> "${kind.title} at ${formatMinutes(minutes)}" }

    val askPermission = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) {
        Reminders.scheduleAll(context)
    }
    fun requestNotifications() {
        if (Build.VERSION.SDK_INT >= 33 && !Reminders.canNotify(context)) {
            settings.askedNotifications = true
            askPermission.launch(Manifest.permission.POST_NOTIFICATIONS)
        }
    }
    /** The check-in for right now: morning or evening near those times, unless it's done already. */
    fun checkInNow(mood: Int?): Sheet {
        val at = System.currentTimeMillis()
        val kind = kindAt(minuteOfDay(at), settings.schedule())
        return Sheet.CheckIn(mood, if (isDone(kind, store.all, at)) CheckInKind.Anytime else kind)
    }

    LaunchedEffect(Unit) {
        Reminders.scheduleAll(context)
        val kind = kindAt(minuteOfDay(now), settings.schedule())
        if (autoPrompt && sheet == null && requestedCheckIn == null && settings.remindersEnabled &&
            kind != CheckInKind.Anytime && !isDone(kind, today, now) && !settings.autoPrompted(kind, now)
        ) {
            settings.markAutoPrompted(kind, now)
            delay(700) // Let the home screen settle first.
            sheet = Sheet.CheckIn(null, kind)
        }
    }
    LaunchedEffect(requestedCheckIn) {
        if (requestedCheckIn != null) {
            settings.markAutoPrompted(requestedCheckIn, now)
            sheet = Sheet.CheckIn(null, requestedCheckIn)
            onRequestHandled()
        }
    }

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
                    heroStyle = settings.heroStyle,
                    wellness = wellness,
                    focusScore = sampleFocusWeek.last(),
                    focusWeek = sampleFocusWeek,
                    metrics = sampleMetrics,
                    phone = samplePhoneUse,
                    bedMinutes = settings.bedMinutes,
                    todayCheckIns = today,
                    nextCheckIn = next,
                    onOpenScore = { sheet = Sheet.Score },
                    onOpenMetric = { sheet = Sheet.MetricDetail(it) },
                    onOpenPhone = { sheet = Sheet.MetricDetail(samplePhoneMetric) },
                    onCheckIn = { sheet = checkInNow(it) },
                    listState = listState,
                )
            }
            FloatingBar(
                hazeState = hazeState,
                horizon = time.horizon(),
                onProfile = { sheet = Sheet.Profile },
                onCheckIn = { sheet = checkInNow(null) },
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
                is Sheet.CheckIn -> current.kind.title
                Sheet.Score -> "Wellness"
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
                is Sheet.CheckIn -> CheckInSheetContent(current.kind, current.mood) {
                    store.add(it)
                    Reminders.dismiss(context, it.kind)
                    sheet = null
                    // Back to the top, where the score counts up.
                    scope.launch { listState.animateScrollToItem(0) }
                    if (!settings.askedNotifications && settings.remindersEnabled) requestNotifications()
                }
                Sheet.Score -> ScoreSheetContent(wellness, onCheckIn = { sheet = checkInNow(null) })
                Sheet.Profile -> ProfileSheetContent(NAME, EMAIL)
                Sheet.Settings -> SettingsSheetContent(
                    settings,
                    onRemindersChanged = { enabled ->
                        Reminders.scheduleAll(context)
                        if (enabled) requestNotifications()
                    },
                    onSignOut = { sheet = null },
                )
                null -> Unit
            }
        }
    }
}
