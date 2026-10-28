package com.example.smartfocus.ui.sheets

import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.smartfocus.data.Wellness
import com.example.smartfocus.data.conditionLabel
import com.example.smartfocus.ui.components.GradientBar
import com.example.smartfocus.ui.theme.MetricColors
import com.example.smartfocus.ui.theme.TextPrimary
import com.example.smartfocus.ui.theme.TextSecondary
import com.example.smartfocus.ui.theme.TextTertiary
import kotlin.math.roundToInt

/** How today's wellness score breaks down. */
@Composable
fun ColumnScope.ScoreSheetContent(wellness: Wellness, onCheckIn: () -> Unit) {
    val score = wellness.score
    Text(score?.toString() ?: "--", color = if (score == null) TextTertiary else TextPrimary, fontSize = 64.sp, fontWeight = FontWeight.ExtraLight)
    Text(
        if (score == null) "Check in to finish today's score" else conditionLabel(score),
        color = TextSecondary,
        fontSize = 16.sp,
    )
    Spacer(Modifier.height(20.dp))
    SectionTitle("What goes into it")
    Pillar("Body", wellness.body, Wellness.BodyWeight, MetricColors.Activity, "Sleep, steps, exercise and distance, compared with your goals.")
    Spacer(Modifier.height(12.dp))
    Pillar("Mind", wellness.mind, Wellness.MindWeight, MetricColors.Mood, "Your check-ins today: mood, energy, focus and how you slept.")
    Spacer(Modifier.height(12.dp))
    Pillar("Digital", wellness.digital, Wellness.DigitalWeight, MetricColors.Focus, "Screen time and pickups (less is better), plus time spent with people.")
    Spacer(Modifier.height(20.dp))
    Text(
        "The score is a weighted average of the three. It only appears after you check in, " +
            "because how you feel is the one thing your phone can't measure.",
        color = TextSecondary,
        fontSize = 14.sp,
        lineHeight = 20.sp,
    )
    if (score == null) {
        Spacer(Modifier.height(24.dp))
        PillButton("Check in", onClick = onCheckIn)
    }
}

@Composable
private fun Pillar(name: String, value: Int?, weight: Double, colors: List<Color>, about: String) {
    SheetCard(Modifier.semantics(mergeDescendants = true) { }) {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.Bottom) {
            Text(name, color = TextPrimary, fontSize = 17.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.weight(1f))
            Text(value?.toString() ?: "Waiting on check-in", color = if (value == null) TextTertiary else TextPrimary, fontSize = if (value == null) 14.sp else 22.sp)
        }
        Spacer(Modifier.height(10.dp))
        GradientBar((value ?: 0) / 100f, colors)
        Spacer(Modifier.height(10.dp))
        Text(about, color = TextSecondary, fontSize = 14.sp, lineHeight = 19.sp)
        Text("${(weight * 100).roundToInt()}% of the score", color = TextTertiary, fontSize = 13.sp)
    }
}
