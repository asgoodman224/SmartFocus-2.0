package com.example.smartfocus.ui.sheets

import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.selection.selectableGroup
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.smartfocus.data.Metric
import com.example.smartfocus.data.lastSevenDates
import com.example.smartfocus.data.lastSevenDays
import com.example.smartfocus.ui.theme.SheetColor
import com.example.smartfocus.ui.theme.TextPrimary
import com.example.smartfocus.ui.theme.TextSecondary
import com.example.smartfocus.ui.theme.TextTertiary

/** A metric's detail: pick a day, see its value, the week's chart and a short summary. */
@Composable
fun ColumnScope.MetricSheetContent(metric: Metric) {
    val days = lastSevenDays()
    val dates = lastSevenDates()
    var selected by remember(metric.id) { mutableIntStateOf(6) }

    DayPicker(days, dates, selected) { selected = it }
    Spacer(Modifier.height(18.dp))
    Text(metric.weekText[selected], color = TextPrimary, fontSize = 44.sp, fontWeight = FontWeight.Light)
    Text(
        "${if (selected == 6) "Today" else days[selected]}  ·  Goal ${metric.goal}",
        color = TextSecondary,
        fontSize = 15.sp,
    )
    Spacer(Modifier.height(20.dp))
    WeekChart(metric, days, selected) { selected = it }
    Spacer(Modifier.height(28.dp))
    SectionTitle("Daily summary")
    SheetCard { Text(metric.summary, color = TextPrimary, fontSize = 16.sp, lineHeight = 23.sp) }
    Spacer(Modifier.height(20.dp))
    SectionTitle("About ${metric.title.lowercase()}")
    SheetCard {
        Text("${metric.source} This is sample data for now.", color = TextSecondary, fontSize = 15.sp, lineHeight = 21.sp)
    }
}

@Composable
private fun DayPicker(days: List<String>, dates: List<Int>, selected: Int, onSelect: (Int) -> Unit) {
    Row(Modifier.fillMaxWidth().selectableGroup(), horizontalArrangement = Arrangement.SpaceBetween) {
        days.forEachIndexed { i, day ->
            val isSelected = i == selected
            Column(
                Modifier
                    .clip(RoundedCornerShape(14.dp))
                    .selectable(selected = isSelected, role = Role.Tab, onClick = { onSelect(i) })
                    .padding(horizontal = 4.dp, vertical = 4.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Text(if (day == "Today") "Now" else day.take(1), color = TextTertiary, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                Spacer(Modifier.height(6.dp))
                Box(
                    Modifier
                        .size(38.dp)
                        .clip(CircleShape)
                        .background(if (isSelected) Color.White else Color.Transparent),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        "${dates[i]}",
                        color = if (isSelected) SheetColor else TextPrimary,
                        fontSize = 16.sp,
                        fontWeight = if (isSelected) FontWeight.SemiBold else FontWeight.Normal,
                    )
                }
            }
        }
    }
}

/** Seven bars with the goal as a dashed line. Tap a bar to select that day. */
@Composable
private fun WeekChart(metric: Metric, days: List<String>, selected: Int, onSelect: (Int) -> Unit) {
    var grown by remember(metric.id) { mutableStateOf(false) }
    LaunchedEffect(metric.id) { grown = true }
    val growth by animateFloatAsState(
        if (grown) 1f else 0f,
        tween(800, delayMillis = 150, easing = FastOutSlowInEasing),
        label = "chart",
    )
    val max = maxOf(metric.week.maxOrNull() ?: 1f, metric.goalValue) * 1.15f
    val description = days.indices.joinToString(", ") { "${days[it]} ${metric.weekText[it]}" }

    Column(Modifier.clearAndSetSemantics { contentDescription = "${metric.title} this week: $description. Goal ${metric.goal}." }) {
        Canvas(
            Modifier
                .fillMaxWidth()
                .height(170.dp)
                .pointerInput(metric.id) {
                    detectTapGestures { offset -> onSelect((offset.x / (size.width / 7f)).toInt().coerceIn(0, 6)) }
                }
        ) {
            val slot = size.width / 7f
            val barWidth = slot * 0.46f
            metric.week.forEachIndexed { i, value ->
                val barHeight = size.height * (value / max) * growth
                val left = slot * i + (slot - barWidth) / 2f
                val top = size.height - barHeight
                drawRoundRect(
                    brush = if (i == selected) Brush.verticalGradient(metric.colors.reversed(), startY = top, endY = size.height)
                    else Brush.verticalGradient(listOf(Color.White.copy(alpha = 0.26f), Color.White.copy(alpha = 0.12f))),
                    topLeft = Offset(left, top),
                    size = Size(barWidth, barHeight),
                    cornerRadius = CornerRadius(barWidth / 3f),
                )
            }
            val goalY = size.height * (1f - metric.goalValue / max)
            drawLine(
                color = Color.White.copy(alpha = 0.45f),
                start = Offset(0f, goalY),
                end = Offset(size.width, goalY),
                strokeWidth = 1.dp.toPx(),
                pathEffect = PathEffect.dashPathEffect(floatArrayOf(6.dp.toPx(), 5.dp.toPx())),
            )
        }
        Spacer(Modifier.height(8.dp))
        Row(Modifier.fillMaxWidth()) {
            days.forEachIndexed { i, day ->
                Text(
                    if (day == "Today") "Now" else day,
                    color = if (i == selected) TextPrimary else TextTertiary,
                    fontSize = 12.sp,
                    modifier = Modifier.weight(1f),
                    textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                )
            }
        }
        Spacer(Modifier.height(6.dp))
        Text("- - -  Goal ${metric.goal}", color = TextTertiary, fontSize = 12.sp)
    }
}

@Composable
internal fun SectionTitle(text: String) {
    Text(
        text,
        color = TextPrimary,
        fontSize = 20.sp,
        fontWeight = FontWeight.SemiBold,
        modifier = Modifier.padding(bottom = 10.dp).semantics { heading() },
    )
}

/** A glass card on a sheet. */
@Composable
internal fun SheetCard(modifier: Modifier = Modifier, content: @Composable ColumnScope.() -> Unit) {
    Column(
        modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(18.dp))
            .background(Color.White.copy(alpha = 0.07f))
            .padding(16.dp),
        content = content,
    )
}
