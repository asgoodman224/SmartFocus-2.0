package com.example.smartfocus

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.smartfocus.ui.sheets.PillButton
import com.example.smartfocus.ui.theme.SheetColor
import com.example.smartfocus.ui.theme.SmartFocusTheme
import com.example.smartfocus.ui.theme.TextPrimary
import com.example.smartfocus.ui.theme.TextSecondary

/**
 * Explains how SmartFocus uses health data. Health Connect opens this from its permission
 * screen ("Read privacy policy") and won't ask for permissions without it.
 */
class PermissionsRationaleActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            SmartFocusTheme {
                Column(
                    Modifier
                        .fillMaxSize()
                        .background(SheetColor)
                        .safeDrawingPadding()
                        .verticalScroll(rememberScrollState())
                        .padding(24.dp)
                ) {
                    Text("How SmartFocus uses your health data", color = TextPrimary, fontSize = 26.sp, fontWeight = FontWeight.SemiBold, lineHeight = 32.sp)
                    Spacer(Modifier.height(16.dp))
                    Paragraph("SmartFocus reads your sleep, steps, exercise sessions and distance from Health Connect. It never writes or changes anything there.")
                    Paragraph("This data goes into your daily wellness score and the Sleep, Activity, Exercise and Mobility panels on Home.")
                    Paragraph("It stays on this phone. If you sign in to a SmartFocus study account, daily totals (minutes asleep, steps, minutes of exercise and distance) are sent to that study's server. Individual records, locations and routes are never sent.")
                    Paragraph("You can remove SmartFocus's access at any time in Health Connect.")
                    Spacer(Modifier.height(12.dp))
                    PillButton("Done", onClick = { finish() })
                }
            }
        }
    }
}

@androidx.compose.runtime.Composable
private fun Paragraph(text: String) {
    Text(text, color = TextSecondary, fontSize = 16.sp, lineHeight = 23.sp)
    Spacer(Modifier.height(14.dp))
}
