package com.example.smartfocus.ui.home

import androidx.compose.animation.core.Animatable
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.smartfocus.data.HeroStyle
import com.example.smartfocus.data.Metric
import com.example.smartfocus.data.PhoneUse
import com.example.smartfocus.data.Wellness
import com.example.smartfocus.data.conditionLabel
import com.example.smartfocus.data.formatMinutes
import com.example.smartfocus.data.salutation
import com.example.smartfocus.data.weatherLabel
import com.example.smartfocus.ui.theme.MetricColors
import com.example.smartfocus.ui.theme.TextPrimary
import com.example.smartfocus.ui.theme.TextSecondary
import com.example.smartfocus.ui.theme.TextTertiary
import kotlin.math.roundToInt

/** What the big headline says, in whichever style is chosen in Settings. */
internal data class Headline(
    val value: String,
    val label: String,
    val detail: String,
    /** Set when [value] is the wellness score, which counts up when it appears. */
    val score: Int? = null,
    /** Waiting for today's check-in before there's a score to show. */
    val pending: Boolean = false,
)

internal fun headline(
    style: HeroStyle,
    wellness: Wellness,
    focusScore: Int?,
    metrics: List<Metric>,
    phone: PhoneUse?,
    bedMinutes: Int,
    hour: Int,
): Headline {
    // Non-breaking spaces keep each "Body 84" together when large text wraps the line.
    val pillars = listOfNotNull(
        wellness.body?.let { "Body\u00A0$it" }, wellness.mind?.let { "Mind\u00A0$it" }, wellness.digital?.let { "Digital\u00A0$it" },
    )
        .joinToString("  ·  ")
    val score = wellness.score
    fun metric(id: String) = metrics.firstOrNull { it.id == id }
    return when (style) {
        HeroStyle.Wellness, HeroStyle.Ring ->
            if (score == null) Headline("--", "Check in to see today's score", pillars, pending = true)
            else Headline("$score", conditionLabel(score), pillars, score = score)
        HeroStyle.Conditions ->
            if (score == null) Headline("Forecast pending", "Check in to see today's conditions", pillars, pending = true)
            else {
                val parts = listOf("Body" to wellness.body, "Mind" to wellness.mind, "Digital" to wellness.digital)
                    .mapNotNull { (name, v) -> v?.let { name to it } }
                val high = parts.maxBy { it.second }
                val low = parts.minBy { it.second }
                Headline(weatherLabel(score), "Wellness $score", "H: ${high.first} ${high.second}    L: ${low.first} ${low.second}")
            }
        HeroStyle.Focus -> if (focusScore == null) Headline("--", "Turn on usage access to see focus", "") else Headline(
            "$focusScore",
            focusLabel(focusScore),
            listOfNotNull(metric("sleep")?.let { "Sleep ${it.value}" }, metric("mood")?.let { "Mood ${it.value.replace(" ", "")}" })
                .joinToString("  ·  "),
        )
        HeroStyle.RightNow -> when (hour) {
            in 5..10 -> metric("sleep").let { Headline(it?.value ?: "--", "Sleep last night", it?.detail.orEmpty()) }
            in 11..16 -> metric("activity").let {
                Headline(it?.value ?: "--", "Steps so far", it?.let { m -> "${(m.progress * 100).toInt()}% of your ${m.goal} goal" }.orEmpty())
            }
            in 17..21 -> Headline(phone?.totalText ?: "--", "On your phone today", phone?.changeText.orEmpty())
            else -> Headline(formatMinutes(bedMinutes), "Bedtime", "Time to wind down")
        }
    }
}

internal fun focusLabel(score: Int): String = when {
    score >= 80 -> "Deep focus"
    score >= 65 -> "Steady focus"
    score >= 50 -> "Scattered"
    else -> "Restless"
}

/**
 * The headline at the top of Home. Tapping it opens the wellness breakdown, or the check-in
 * while today's score is still waiting on one.
 */
@Composable
internal fun Hero(
    style: HeroStyle,
    name: String,
    headline: Headline,
    wellness: Wellness,
    countUp: Animatable<Float, *>,
    onOpen: () -> Unit,
    onCheckIn: () -> Unit,
    modifier: Modifier,
) {
    val counting = headline.score != null && countUp.isRunning
    val value = if (headline.score != null) "${countUp.value.roundToInt()}" else headline.value
    val label = if (counting) "Calculating…" else headline.label
    Column(
        modifier
            .fillMaxWidth()
            .padding(top = 40.dp, bottom = 28.dp)
            .clickable(
                interactionSource = remember { MutableInteractionSource() },
                indication = null,
                role = Role.Button,
                onClickLabel = if (headline.pending) "Check in" else "Open wellness details",
                onClick = if (headline.pending) onCheckIn else onOpen,
            )
            .clearAndSetSemantics {
                contentDescription = "${salutation(name)}. ${headline.value}, ${headline.label}. ${headline.detail}"
            },
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(salutation(name), color = TextPrimary, fontSize = 24.sp)
        if (style == HeroStyle.Ring) {
            Spacer(Modifier.height(16.dp))
            val shown = if (headline.score != null) countUp.value / headline.score else 1f
            ScoreRings(wellness, shown, value, label)
        } else {
            val big = value.length <= 3
            Text(
                value,
                color = if (headline.pending) TextTertiary else TextPrimary,
                fontSize = if (big) 104.sp else 48.sp,
                lineHeight = if (big) 108.sp else 60.sp,
                fontWeight = FontWeight.ExtraLight,
                textAlign = TextAlign.Center,
                modifier = if (big) Modifier else Modifier.padding(vertical = 18.dp),
            )
            Text(label, color = TextPrimary, fontSize = 18.sp, fontWeight = FontWeight.Medium)
            Spacer(Modifier.height(2.dp))
            Text(headline.detail, color = TextSecondary, fontSize = 16.sp, textAlign = TextAlign.Center)
        }
        if (headline.pending) {
            Spacer(Modifier.height(14.dp))
            Box(
                Modifier
                    .clip(CircleShape)
                    .background(Color.White.copy(alpha = 0.14f))
                    .padding(horizontal = 18.dp, vertical = 10.dp)
            ) {
                Text("Check in now", color = TextPrimary, fontSize = 15.sp, fontWeight = FontWeight.SemiBold)
            }
        }
    }
}

private val RingColors = listOf(MetricColors.Activity, MetricColors.Mood, MetricColors.Focus)

/** Three rings, outside in: body, mind, digital. Mind stays empty until today's check-in. */
@Composable
private fun ScoreRings(wellness: Wellness, shown: Float, value: String, label: String) {
    val parts = listOf(wellness.body ?: 0, wellness.mind ?: 0, wellness.digital ?: 0)
    Box(Modifier.size(212.dp), contentAlignment = Alignment.Center) {
        Canvas(Modifier.fillMaxSize()) {
            val stroke = 13.dp.toPx()
            val gap = 5.dp.toPx()
            parts.forEachIndexed { i, part ->
                val inset = stroke / 2 + i * (stroke + gap)
                val topLeft = Offset(inset, inset)
                val arcSize = Size(size.width - 2 * inset, size.height - 2 * inset)
                drawArc(Color.White.copy(alpha = 0.10f), 0f, 360f, false, topLeft, arcSize, style = Stroke(stroke))
                val sweep = 360f * (part / 100f) * shown.coerceIn(0f, 1f)
                if (sweep > 0f) {
                    drawArc(
                        Brush.sweepGradient(RingColors[i] + RingColors[i].first()),
                        -90f, sweep, false, topLeft, arcSize,
                        style = Stroke(stroke, cap = StrokeCap.Round),
                    )
                }
            }
        }
        Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.width(120.dp)) {
            Text(value, color = TextPrimary, fontSize = 48.sp, lineHeight = 52.sp, fontWeight = FontWeight.ExtraLight)
            Text(label, color = TextSecondary, fontSize = 13.sp, textAlign = TextAlign.Center, lineHeight = 16.sp)
        }
    }
    Spacer(Modifier.height(12.dp))
    Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
        listOf("Body" to wellness.body, "Mind" to wellness.mind, "Digital" to wellness.digital).forEachIndexed { i, (name, part) ->
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(Modifier.size(8.dp).clip(CircleShape).background(RingColors[i].first()))
                Spacer(Modifier.width(6.dp))
                Text("$name ${part ?: "--"}", color = TextSecondary, fontSize = 15.sp)
            }
        }
    }
}

@Composable
internal fun CompactHeader(name: String, headline: Headline, countUp: Animatable<Float, *>, collapse: Float) {
    val alpha = ((collapse - 0.55f) / 0.45f).coerceIn(0f, 1f)
    val value = if (headline.score != null) "${countUp.value.roundToInt()}" else headline.value
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
        Text(salutation(name), color = TextPrimary, fontSize = 20.sp)
        Text(
            if (headline.pending) headline.label else "$value  |  ${headline.label}",
            color = TextSecondary,
            fontSize = 15.sp,
            maxLines = 1,
        )
    }
}
