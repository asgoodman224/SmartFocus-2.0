package com.example.smartfocus.ui.theme

import androidx.compose.ui.graphics.Color

// Glass UI tokens. Color lives in the sky and in the data; the chrome stays neutral.
// Contrast is checked for every sky in Sky.kt: text on glass stays at 5.2:1 or better.

/** Translucent panel fill: a dark tint over the sky. */
val GlassFill = Color(0xFF080C1E).copy(alpha = 0.34f)
/** Hairline edge that catches the light, like the rim of a glass panel. */
val GlassEdge = Color.White.copy(alpha = 0.10f)
/** Pressed / selected glass. */
val GlassHighlight = Color.White.copy(alpha = 0.12f)
/** Background of sheets that slide over the sky. */
val SheetColor = Color(0xFF121531)

val TextPrimary = Color.White
val TextSecondary = Color.White.copy(alpha = 0.80f)
val TextTertiary = Color.White.copy(alpha = 0.68f)

/** One soft gradient per metric, used only inside data (bars, charts, rings). */
object MetricColors {
    val Sleep = listOf(Color(0xFF8E9CFF), Color(0xFFC9B8FF))
    val Activity = listOf(Color(0xFF5ED3B2), Color(0xFFB7EE85))
    val Exercise = listOf(Color(0xFFFFB45E), Color(0xFFFF8A7A))
    val Mobility = listOf(Color(0xFF5DC4F0), Color(0xFF9BE3FF))
    val Social = listOf(Color(0xFFFF9FCF), Color(0xFFC6A2FF))
    val Mood = listOf(Color(0xFFFFD36E), Color(0xFFFFA36E))
    val Focus = listOf(Color(0xFF7FB2FF), Color(0xFFB59CFF))
    val Phone = listOf(Color(0xFF9AB0D8), Color(0xFFD7E1F5))
}
