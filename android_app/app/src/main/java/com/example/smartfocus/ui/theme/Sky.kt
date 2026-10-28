package com.example.smartfocus.ui.theme

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import java.util.Calendar
import kotlin.random.Random

/** The sky behind the app follows the user's day: the signature of the design. */
enum class TimeOfDay {
    Dawn, Day, Dusk, Night;

    companion object {
        fun now(): TimeOfDay = at(Calendar.getInstance().get(Calendar.HOUR_OF_DAY))

        fun at(hour: Int): TimeOfDay = when (hour) {
            in 5..10 -> Dawn
            in 11..16 -> Day
            in 17..20 -> Dusk
            else -> Night
        }
    }
}

// Top and bottom of each sky. Bottoms are kept deep enough that secondary text on glass stays
// at 6.5:1 or better and tertiary at 5.2:1 or better.
private fun TimeOfDay.colors(): List<Color> = when (this) {
    TimeOfDay.Dawn -> listOf(Color(0xFF22355F), Color(0xFF4A5D8C))
    TimeOfDay.Day -> listOf(Color(0xFF1D4472), Color(0xFF3D6A99))
    TimeOfDay.Dusk -> listOf(Color(0xFF26204A), Color(0xFF5E4470))
    TimeOfDay.Night -> listOf(Color(0xFF0A0F26), Color(0xFF252C57))
}

/** The bottom color of the sky; used where the sky needs to be filled in behind blur. */
fun TimeOfDay.horizon(): Color = colors().last()

@Composable
fun SkyBackground(time: TimeOfDay, modifier: Modifier = Modifier) {
    Box(modifier.fillMaxSize().background(Brush.verticalGradient(time.colors()))) {
        Glow(time)
        if (time == TimeOfDay.Night || time == TimeOfDay.Dusk) {
            Stars(brightness = if (time == TimeOfDay.Night) 1f else 0.45f)
        }
    }
}

/** A soft light source near the top: the sun by day, the moon at night. */
@Composable
private fun Glow(time: TimeOfDay) {
    val color = when (time) {
        TimeOfDay.Dawn -> Color(0xFFFFC9A8).copy(alpha = 0.22f)
        TimeOfDay.Day -> Color(0xFFFFF3D6).copy(alpha = 0.16f)
        TimeOfDay.Dusk -> Color(0xFFFF9EB1).copy(alpha = 0.16f)
        TimeOfDay.Night -> Color(0xFFDDE4FF).copy(alpha = 0.10f)
    }
    Canvas(Modifier.fillMaxSize()) {
        val center = Offset(size.width * 0.82f, size.height * 0.06f)
        drawCircle(
            brush = Brush.radialGradient(listOf(color, Color.Transparent), center, radius = size.width * 0.75f),
            radius = size.width * 0.75f,
            center = center,
        )
    }
}

@Composable
private fun Stars(brightness: Float) {
    // Fixed seed: the same sky every time, so it never flickers between recompositions.
    val stars = remember {
        val random = Random(7)
        List(80) { Triple(Offset(random.nextFloat(), random.nextFloat() * 0.7f), random.nextFloat(), random.nextFloat()) }
    }
    Canvas(Modifier.fillMaxSize()) {
        for ((position, size01, alpha01) in stars) {
            drawCircle(
                color = Color.White.copy(alpha = (0.18f + alpha01 * 0.55f) * brightness),
                radius = (0.5f + size01 * 1.1f).dp.toPx(),
                center = Offset(position.x * size.width, position.y * size.height),
            )
        }
    }
}
