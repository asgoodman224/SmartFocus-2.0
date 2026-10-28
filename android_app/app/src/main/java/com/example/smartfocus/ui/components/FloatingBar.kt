package com.example.smartfocus.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material.icons.outlined.Settings
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.smartfocus.ui.theme.GlassEdge
import com.example.smartfocus.ui.theme.SheetColor
import dev.chrisbanes.haze.HazeInput
import dev.chrisbanes.haze.HazeState
import dev.chrisbanes.haze.blur.HazeBlurStyle
import dev.chrisbanes.haze.blur.hazeBlur

/**
 * The floating glass bar at the bottom: Profile, the main action (Check in), and Settings.
 * The content scrolling behind it is blurred (Android 12+; a translucent tint on older versions).
 */
@Composable
fun FloatingBar(
    hazeState: HazeState,
    horizon: Color,
    onProfile: () -> Unit,
    onCheckIn: () -> Unit,
    onSettings: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier
            .clip(CircleShape)
            .hazeBlur(
                HazeInput.Sources(hazeState),
                style = HazeBlurStyle {
                    blurRadius(28.dp)
                    backgroundColor(horizon)
                    noiseFactor(0.06f)
                },
            )
            // Tint over the blur. Also keeps the bar readable where blur isn't available.
            .background(Color(0xFF0C1028).copy(alpha = 0.55f))
            .border(1.dp, GlassEdge, CircleShape)
            .padding(6.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        GlassIconButton(Icons.Outlined.Person, label = "Profile", onClick = onProfile)
        Spacer(Modifier.width(8.dp))
        Row(
            Modifier
                .height(48.dp)
                .clip(CircleShape)
                .background(Color.White.copy(alpha = 0.94f))
                .clickable(role = Role.Button, onClick = onCheckIn)
                .padding(horizontal = 20.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(Icons.Filled.Add, contentDescription = null, tint = SheetColor, modifier = Modifier.size(20.dp))
            Spacer(Modifier.width(6.dp))
            Text("Check in", color = SheetColor, fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
        }
        Spacer(Modifier.width(8.dp))
        GlassIconButton(Icons.Outlined.Settings, label = "Settings", onClick = onSettings)
    }
}
