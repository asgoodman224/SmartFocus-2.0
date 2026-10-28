package com.example.smartfocus.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable

// Screens read colors by role (MaterialTheme.colorScheme.surface, .primary, ...), never by
// hex value, so a light variant can be added here later without touching any screen.
private val SmartFocusColors = darkColorScheme(
    primary = Lavender,
    onPrimary = Plum950,
    background = Plum950,
    onBackground = OnPlum,
    surface = Plum800,
    onSurface = OnPlum,
    onSurfaceVariant = LavenderMuted,
    outlineVariant = Plum500,
)

/**
 * The app's theme. Dark only for now: the plum palette is the app's look. Dynamic (wallpaper)
 * color is deliberately off so the brand colors stay consistent.
 * TODO: add a light color scheme so the app follows the system appearance.
 */
@Composable
fun SmartFocusTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = SmartFocusColors,
        typography = Typography,
        content = content
    )
}
