package com.example.smartfocus.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

// Material components (switches, text fields, ripples) read these roles. The app itself draws
// on a sky with glass, so the scheme stays neutral: white primary, transparent surfaces.
private val SmartFocusColors = darkColorScheme(
    primary = Color.White,
    onPrimary = Color(0xFF121531),
    background = Color(0xFF0A0F26),
    onBackground = TextPrimary,
    surface = SheetColor,
    onSurface = TextPrimary,
    onSurfaceVariant = TextSecondary,
    outline = Color.White.copy(alpha = 0.40f),
    outlineVariant = GlassEdge,
)

@Composable
fun SmartFocusTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = SmartFocusColors,
        typography = Typography,
        content = content
    )
}
