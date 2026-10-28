package com.example.smartfocus

import android.Manifest
import android.content.ActivityNotFoundException
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
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
import androidx.compose.runtime.mutableIntStateOf
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
import com.example.smartfocus.data.Dashboard
import com.example.smartfocus.data.DataRepository
import com.example.smartfocus.data.Metric
import com.example.smartfocus.data.health.HealthReader
import com.example.smartfocus.data.health.HealthStatus
import com.example.smartfocus.data.moodMetric
import com.example.smartfocus.data.usage.UsageReader
import com.example.smartfocus.sync.Account
import com.example.smartfocus.sync.Api
import com.example.smartfocus.sync.SyncWorker
import com.example.smartfocus.ui.sheets.DataSourcesSheetContent
import com.example.smartfocus.ui.sheets.SignInSheetContent
import androidx.health.connect.client.PermissionController
import androidx.lifecycle.compose.LifecycleResumeEffect
import java.time.LocalDate
import com.example.smartfocus.data.formatMinutes
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
    data object DataSources : Sheet
    data object SignIn : Sheet
}

/**
 * @param requestedCheckIn a check-in to open, e.g. from a tapped reminder; [onRequestHandled]
 *   is called once it's open.
 * @param autoPrompt open the morning or evening check-in by itself when the app is opened at
 *   that time of day and it hasn't been done yet.
 * @param preview fixed data for previews and screenshots; the app reads the phone's real data
 *   when it's null.
 */
@Composable
fun SmartFocusApp(
    time: TimeOfDay = remember { TimeOfDay.now() },
    initialSheet: Sheet? = null,
    requestedCheckIn: CheckInKind? = null,
    onRequestHandled: () -> Unit = {},
    autoPrompt: Boolean = true,
    preview: Dashboard? = null,
) {
    val context = LocalContext.current
    val settings = remember { AppSettings(context) }
    val store = remember { CheckInStore(context) }
    val account = remember { Account(context) }
    val repository = remember { DataRepository.get(context) }
    var dashboard by remember { mutableStateOf(preview) }
    var reload by remember { mutableIntStateOf(0) }
    var sheet by remember { mutableStateOf(initialSheet) }
    // Keeps the last sheet's content on screen while it animates away.
    var shown by remember { mutableStateOf(initialSheet) }
    if (sheet != null && shown != sheet) shown = sheet
    val hazeState = rememberHazeState()
    val listState = rememberLazyListState()
    val scope = rememberCoroutineScope()

    val now = System.currentTimeMillis()
    val today = store.all.filter { CheckInStore.isSameDay(it.timeMillis, now) }
    val metrics = dashboard?.metrics.orEmpty() + moodMetric(store.all, LocalDate.now())
    val wellness = wellnessOf(metrics, dashboard?.phone, today)
    val missing = dashboard?.let { d ->
        listOfNotNull(
            "Health Connect".takeIf { d.health == HealthStatus.NotGranted || d.health == HealthStatus.NeedsInstall },
            "Usage access".takeIf { !d.usageAccess },
        )
    }.orEmpty()

    // Re-read the phone's data whenever the app comes back to the front (e.g. from Settings
    // after turning on usage access), and sync if signed in.
    if (preview == null) {
        LifecycleResumeEffect(reload) {
            val job = scope.launch { dashboard = repository.dashboard() }
            if (account.signedIn) SyncWorker.syncSoon(context)
            onPauseOrDispose { job.cancel() }
        }
    }
    val next = nextDue(now, settings.schedule(), today)?.let { (kind, minutes) -> "${kind.title} at ${formatMinutes(minutes)}" }

    val askPermission = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) {
        Reminders.scheduleAll(context)
        reload++
    }
    val askHealth = rememberLauncherForActivityResult(PermissionController.createRequestPermissionResultContract()) { granted ->
        if (!granted.containsAll(HealthReader.Permissions)) settings.healthDenials += 1
        reload++
    }
    fun open(intent: Intent) {
        try {
            context.startActivity(intent)
        } catch (_: ActivityNotFoundException) {
            // Nothing on this phone handles it; the source stays off.
        }
    }
    fun connectHealth() {
        when (dashboard?.health) {
            HealthStatus.NotGranted ->
                // Android stops showing the dialog after it's been dismissed twice.
                if (settings.healthDenials >= 2) open(HealthReader.settingsIntent(context)) else askHealth.launch(HealthReader.Permissions)
            HealthStatus.NeedsInstall -> open(HealthReader.installIntent())
            HealthStatus.Granted -> open(HealthReader.settingsIntent(context))
            else -> Unit
        }
    }
    fun allowNotifications() {
        if (Build.VERSION.SDK_INT >= 33 && !settings.askedNotifications) {
            settings.askedNotifications = true
            askPermission.launch(Manifest.permission.POST_NOTIFICATIONS)
        } else {
            open(Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE, context.packageName))
        }
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
                    name = settings.name,
                    heroStyle = settings.heroStyle,
                    wellness = wellness,
                    focusWeek = dashboard?.focusWeek,
                    metrics = metrics,
                    phone = dashboard?.phone,
                    missingSources = missing,
                    onConnect = { sheet = Sheet.DataSources },
                    bedMinutes = settings.bedMinutes,
                    todayCheckIns = today,
                    nextCheckIn = next,
                    onOpenScore = { sheet = Sheet.Score },
                    onOpenMetric = { sheet = Sheet.MetricDetail(it) },
                    onOpenPhone = { dashboard?.phoneMetric?.let { sheet = Sheet.MetricDetail(it) } },
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
                Sheet.DataSources -> "Data sources"
                Sheet.SignIn -> "Study account"
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
                    if (account.signedIn) SyncWorker.syncSoon(context)
                }
                Sheet.Score -> ScoreSheetContent(wellness, onCheckIn = { sheet = checkInNow(null) })
                Sheet.Profile -> ProfileSheetContent(
                    settings,
                    email = account.email,
                    sources = listOf(
                        "Health Connect" to if (dashboard?.health == HealthStatus.Granted) "On" else "Off",
                        "Usage access" to if (dashboard?.usageAccess == true) "On" else "Off",
                        "Reminders" to if (settings.remindersEnabled && Reminders.canNotify(context)) "On" else "Off",
                    ),
                    onManageSources = { sheet = Sheet.DataSources },
                )
                Sheet.Settings -> SettingsSheetContent(
                    settings,
                    account,
                    onRemindersChanged = { enabled ->
                        Reminders.scheduleAll(context)
                        if (enabled) requestNotifications()
                    },
                    onDataSources = { sheet = Sheet.DataSources },
                    onSignIn = { sheet = Sheet.SignIn },
                    onSyncNow = { SyncWorker.syncSoon(context) },
                    onSignOut = {
                        val server = account.serverUrl
                        val token = account.token
                        account.signOut()
                        SyncWorker.cancel(context)
                        // Ends the session on the server too; fine if it's unreachable.
                        scope.launch { runCatching { Api(server, token).signOut() } }
                    },
                )
                Sheet.DataSources -> DataSourcesSheetContent(
                    usageAccess = dashboard?.usageAccess == true,
                    health = dashboard?.health ?: HealthStatus.Unavailable,
                    notifications = Reminders.canNotify(context),
                    usageBlocked = settings.openedUsageAccess,
                    onUsage = {
                        settings.openedUsageAccess = true
                        open(UsageReader.settingsIntent(context))
                    },
                    onAppInfo = {
                        open(Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:${context.packageName}")))
                    },
                    onHealth = ::connectHealth,
                    onNotifications = ::allowNotifications,
                )
                Sheet.SignIn -> SignInSheetContent(account.serverUrl) { server, session ->
                    account.signIn(server, session.email, session.token)
                    SyncWorker.schedule(context)
                    SyncWorker.syncSoon(context)
                    sheet = Sheet.Settings
                }
                null -> Unit
            }
        }
    }
}
