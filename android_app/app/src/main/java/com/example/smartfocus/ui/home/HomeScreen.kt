package com.example.smartfocus.ui.home

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.asPaddingValues
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyListState
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawWithContent
import androidx.compose.ui.graphics.BlendMode
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.CompositingStrategy
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.smartfocus.CheckInEntry
import com.example.smartfocus.data.Metric
import com.example.smartfocus.data.PhoneUse
import com.example.smartfocus.data.greeting
import com.example.smartfocus.data.lastSevenDays
import com.example.smartfocus.ui.components.GlassPanel
import com.example.smartfocus.ui.components.GradientBar
import com.example.smartfocus.ui.components.PanelLabel
import com.example.smartfocus.ui.components.entrance
import com.example.smartfocus.ui.icons.AppIcons
import com.example.smartfocus.ui.icons.Mood
import com.example.smartfocus.ui.icons.Phone
import com.example.smartfocus.ui.theme.GlassEdge
import com.example.smartfocus.ui.theme.MetricColors
import com.example.smartfocus.ui.theme.TextPrimary
import com.example.smartfocus.ui.theme.TextSecondary
import com.example.smartfocus.ui.theme.TextTertiary
import kotlinx.coroutines.delay

private val HeroCollapseDistance = 180.dp
private val CompactHeaderHeight = 64.dp

@Composable
fun HomeScreen(
    name: String,
    focusScore: Int,
    focusWeek: List<Int>,
    metrics: List<Metric>,
    phone: PhoneUse,
    checkIn: CheckInEntry?,
    onOpenMetric: (Metric) -> Unit,
    onOpenPhone: () -> Unit,
    onCheckIn: (mood: Int?) -> Unit,
    modifier: Modifier = Modifier,
    listState: LazyListState = rememberLazyListState(),
) {
    val density = LocalDensity.current
    val collapseDistance = with(density) { HeroCollapseDistance.toPx() }
    // 0 = full headline, 1 = collapsed into the pinned header.
    val collapse by remember {
        derivedStateOf {
            if (listState.firstVisibleItemIndex > 0) 1f
            else (listState.firstVisibleItemScrollOffset / collapseDistance).coerceIn(0f, 1f)
        }
    }
    var introPlayed by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) { delay(1200); introPlayed = true }

    val statusTop = WindowInsets.statusBars.asPaddingValues().calculateTopPadding()
    val navBottom = WindowInsets.navigationBars.asPaddingValues().calculateBottomPadding()
    val headerPx = with(density) { (statusTop + CompactHeaderHeight).toPx() }
    val fadePx = with(density) { 28.dp.toPx() }
    val stacked = density.fontScale >= 1.5f
    val focusLabel = focusLabel(focusScore)

    Box(modifier.fillMaxSize()) {
        LazyColumn(
            state = listState,
            modifier = Modifier
                .fillMaxSize()
                // Panels slide under the pinned header and fade out there, like content under glass.
                .graphicsLayer { compositingStrategy = CompositingStrategy.Offscreen }
                .drawWithContent {
                    drawContent()
                    if (collapse > 0.01f) {
                        val start = headerPx * collapse
                        drawRect(
                            brush = Brush.verticalGradient(
                                colors = listOf(Color.Transparent, Color.Black),
                                startY = start,
                                endY = start + fadePx * collapse,
                            ),
                            blendMode = BlendMode.DstIn,
                        )
                    }
                },
            contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = statusTop, bottom = navBottom + 104.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            item(key = "hero") {
                Hero(name, focusScore, focusLabel, metrics, Modifier.graphicsLayer {
                    alpha = (1f - collapse * 1.4f).coerceIn(0f, 1f)
                    translationY = collapse * collapseDistance * 0.35f
                })
            }
            item(key = "checkin") {
                CheckInPanel(checkIn, onCheckIn, Modifier.entrance(0, introPlayed))
            }
            item(key = "phone") {
                PhonePanel(phone, onOpenPhone, Modifier.entrance(1, introPlayed))
            }
            item(key = "week") {
                FocusWeekPanel(focusWeek, Modifier.entrance(2, introPlayed))
            }
            val rows = if (stacked) metrics.map { listOf(it) } else metrics.chunked(2)
            rows.forEachIndexed { rowIndex, row ->
                item(key = "metrics-$rowIndex") {
                    Row(
                        Modifier
                            .fillMaxWidth()
                            .height(IntrinsicSize.Min)
                            .entrance(3 + rowIndex, introPlayed),
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        row.forEach { metric ->
                            MetricTile(metric, onClick = { onOpenMetric(metric) }, Modifier.weight(1f).fillMaxHeight())
                        }
                    }
                }
            }
            item(key = "footer") {
                Text(
                    "Sample data. Health Connect, usage access and your check-ins will fill this in.",
                    color = Color.White.copy(alpha = 0.9f),
                    fontSize = 13.sp,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 24.dp, vertical = 8.dp),
                )
            }
        }

        CompactHeader(name, focusScore, focusLabel, collapse)
    }
}

private fun focusLabel(score: Int): String = when {
    score >= 80 -> "Deep focus"
    score >= 65 -> "Steady focus"
    score >= 50 -> "Scattered"
    else -> "Restless"
}

@Composable
private fun Hero(name: String, score: Int, label: String, metrics: List<Metric>, modifier: Modifier) {
    val sleep = metrics.firstOrNull { it.id == "sleep" }
    val mood = metrics.firstOrNull { it.id == "mood" }
    val summary = listOfNotNull(sleep?.let { "Sleep ${it.value}" }, mood?.let { "Mood ${it.value.replace(" ", "")}" })
        .joinToString("  ·  ")
    Column(
        modifier
            .fillMaxWidth()
            .padding(top = 40.dp, bottom = 28.dp)
            .clearAndSetSemantics {
                contentDescription = "${greeting()}, $name. Focus score $score, ${label.lowercase()}. $summary"
            },
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text("${greeting()}, $name", color = TextPrimary, fontSize = 24.sp)
        Text(
            "$score",
            color = TextPrimary,
            fontSize = 104.sp,
            lineHeight = 108.sp,
            fontWeight = FontWeight.ExtraLight,
        )
        Text(label, color = TextPrimary, fontSize = 18.sp, fontWeight = FontWeight.Medium)
        Spacer(Modifier.height(2.dp))
        Text(summary, color = TextSecondary, fontSize = 16.sp)
    }
}

@Composable
private fun CompactHeader(name: String, score: Int, label: String, collapse: Float) {
    val alpha = ((collapse - 0.55f) / 0.45f).coerceIn(0f, 1f)
    Column(
        Modifier
            .fillMaxWidth()
            .statusBarsPadding()
            .height(CompactHeaderHeight)
            .graphicsLayer { this.alpha = alpha }
            .then(if (alpha < 0.5f) Modifier.clearAndSetSemantics { } else Modifier),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Text("${greeting()}, $name", color = TextPrimary, fontSize = 20.sp)
        Text("$score  |  $label", color = TextSecondary, fontSize = 15.sp)
    }
}

@Composable
private fun CheckInPanel(entry: CheckInEntry?, onCheckIn: (Int?) -> Unit, modifier: Modifier) {
    GlassPanel(modifier.fillMaxWidth(), onClick = { onCheckIn(null) }, onClickLabel = "Check in") {
        PanelLabel(if (entry == null) "How are you feeling?" else "Today's check-in", AppIcons.Mood)
        Spacer(Modifier.height(12.dp))
        if (entry == null) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                (1..5).forEach { rating ->
                    Box(
                        Modifier
                            .size(48.dp)
                            .clip(CircleShape)
                            .background(Color.White.copy(alpha = 0.10f))
                            .clickable(onClickLabel = "Mood $rating of 5", role = Role.Button) { onCheckIn(rating) },
                        contentAlignment = Alignment.Center,
                    ) {
                        Text("$rating", color = TextPrimary, fontSize = 18.sp)
                    }
                }
            }
            Spacer(Modifier.height(8.dp))
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text("Low", color = TextTertiary, fontSize = 13.sp)
                Text("Great", color = TextTertiary, fontSize = 13.sp)
            }
        } else {
            Text("Checked in at ${entry.timeText}", color = TextPrimary, fontSize = 18.sp)
            Spacer(Modifier.height(4.dp))
            Text(
                "Mood ${entry.mood}  ·  Energy ${entry.energy}  ·  Focus ${entry.focus}",
                color = TextSecondary,
                fontSize = 15.sp,
            )
            Spacer(Modifier.height(4.dp))
            Text("Tap to check in again", color = TextTertiary, fontSize = 13.sp)
        }
    }
}

@Composable
private fun PhonePanel(phone: PhoneUse, onOpen: () -> Unit, modifier: Modifier) {
    GlassPanel(modifier.fillMaxWidth(), onClick = onOpen, onClickLabel = "Open phone use details") {
        PanelLabel("Phone use", AppIcons.Phone)
        Spacer(Modifier.height(10.dp))
        val pickups = @Composable {
            Text("${phone.pickups} pickups", color = TextPrimary, fontSize = 15.sp)
            Text("Longest break ${phone.longestBreakText}", color = TextSecondary, fontSize = 13.sp)
        }
        if (LocalDensity.current.fontScale >= 1.3f) {
            // Large text: stack instead of squeezing two columns side by side.
            Text(phone.totalText, color = TextPrimary, fontSize = 34.sp, fontWeight = FontWeight.Light)
            pickups()
        } else {
            Row(verticalAlignment = Alignment.Bottom) {
                Text(phone.totalText, color = TextPrimary, fontSize = 34.sp, fontWeight = FontWeight.Light)
                Spacer(Modifier.weight(1f))
                Column(horizontalAlignment = Alignment.End) { pickups() }
            }
        }
        Text(phone.changeText, color = TextSecondary, fontSize = 14.sp)
        Spacer(Modifier.height(14.dp))
        HourlyBars(phone.hourly)
    }
}

@Composable
private fun HourlyBars(hourly: List<Int>) {
    val max = (hourly.maxOrNull() ?: 1).coerceAtLeast(1)
    val peak = hourly.indexOf(max)
    Column(Modifier.clearAndSetSemantics { contentDescription = "Phone use by hour, busiest around ${hourLabel(peak)}" }) {
        Row(
            Modifier.fillMaxWidth().height(48.dp),
            horizontalArrangement = Arrangement.spacedBy(3.dp),
            verticalAlignment = Alignment.Bottom,
        ) {
            hourly.forEachIndexed { hour, minutes ->
                val fraction = minutes / max.toFloat()
                Box(
                    Modifier
                        .weight(1f)
                        .fillMaxHeight(fraction.coerceAtLeast(0.04f))
                        .clip(RoundedCornerShape(topStart = 2.dp, topEnd = 2.dp))
                        .background(
                            if (hour == peak) Brush.verticalGradient(MetricColors.Phone.reversed())
                            else Brush.verticalGradient(listOf(Color.White.copy(alpha = 0.30f), Color.White.copy(alpha = 0.18f)))
                        )
                )
            }
        }
        Spacer(Modifier.height(6.dp))
        Row(Modifier.fillMaxWidth()) {
            listOf("12 AM", "6 AM", "12 PM", "6 PM").forEach {
                Text(it, color = TextTertiary, fontSize = 12.sp, maxLines = 1, softWrap = false, modifier = Modifier.weight(1f))
            }
        }
    }
}

private fun hourLabel(hour: Int): String = "${if (hour % 12 == 0) 12 else hour % 12} ${if (hour < 12) "AM" else "PM"}"

@Composable
private fun FocusWeekPanel(week: List<Int>, modifier: Modifier) {
    val days = lastSevenDays()
    GlassPanel(modifier.fillMaxWidth()) {
        PanelLabel("Focus this week")
        Spacer(Modifier.height(6.dp))
        // Newest first, like a forecast reads.
        week.indices.reversed().forEachIndexed { position, i ->
            if (position > 0) Box(Modifier.fillMaxWidth().height(1.dp).background(GlassEdge))
            Row(
                Modifier
                    .fillMaxWidth()
                    .heightIn(min = 44.dp)
                    .semantics(mergeDescendants = true) { contentDescription = "${days[i]}, focus ${week[i]}" },
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(days[i], color = TextPrimary, fontSize = 16.sp, modifier = Modifier.width(72.dp))
                GradientBar(
                    progress = week[i] / 100f,
                    colors = MetricColors.Focus,
                    modifier = Modifier.weight(1f),
                    delayMillis = 200 + position * 60,
                )
                Text(
                    "${week[i]}",
                    color = TextPrimary,
                    fontSize = 16.sp,
                    textAlign = TextAlign.End,
                    modifier = Modifier.width(44.dp),
                )
            }
        }
    }
}

@Composable
private fun MetricTile(metric: Metric, onClick: () -> Unit, modifier: Modifier) {
    GlassPanel(
        modifier.heightIn(min = 176.dp),
        onClick = onClick,
        onClickLabel = "Open ${metric.title} details",
    ) {
        PanelLabel(metric.title, metric.icon)
        Spacer(Modifier.height(10.dp))
        Text(metric.value, color = TextPrimary, fontSize = 30.sp, fontWeight = FontWeight.Light)
        Text(metric.detail, color = TextSecondary, fontSize = 14.sp)
        Spacer(Modifier.weight(1f).heightIn(min = 14.dp))
        GradientBar(metric.progress, metric.colors)
        Spacer(Modifier.height(8.dp))
        Text("${(metric.progress * 100).toInt()}% of ${metric.goal} goal", color = TextTertiary, fontSize = 13.sp)
    }
}
