package com.example.smartfocus.ui.sheets

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.smartfocus.sync.Account
import com.example.smartfocus.sync.Api
import com.example.smartfocus.ui.theme.TextPrimary
import com.example.smartfocus.ui.theme.TextSecondary
import com.example.smartfocus.ui.theme.TextTertiary
import kotlinx.coroutines.launch
import java.io.IOException
import java.time.ZoneId

/** Signs in to (or creates) a study account on a SmartFocus server. */
@Composable
fun ColumnScope.SignInSheetContent(initialServer: String, onSignedIn: (server: String, session: Api.Session) -> Unit) {
    var creating by remember { mutableStateOf(false) }
    var server by remember { mutableStateOf(initialServer) }
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()
    val ready = server.isNotBlank() && email.contains('@') && password.length >= (if (creating) 8 else 1) && !busy

    Text(
        "Your check-ins and daily totals are sent to your study's server, so the research team " +
            "can see them. App names and times are sent; nothing you type in other apps is.",
        color = TextSecondary,
        fontSize = 15.sp,
        lineHeight = 21.sp,
    )
    Spacer(Modifier.height(20.dp))
    Field(
        server, { server = it }, "Server address",
        placeholder = "192.168.1.20:3000",
        keyboard = KeyboardOptions(keyboardType = KeyboardType.Uri, imeAction = ImeAction.Next),
    )
    Text(
        "For testing: the laptop running the backend, on the same Wi-Fi. Its address is in System Settings → Wi-Fi → Details.",
        color = TextTertiary,
        fontSize = 13.sp,
        lineHeight = 18.sp,
        modifier = Modifier.padding(top = 6.dp, bottom = 14.dp),
    )
    Field(email, { email = it.trim() }, "Email", keyboard = KeyboardOptions(keyboardType = KeyboardType.Email, imeAction = ImeAction.Next))
    Spacer(Modifier.height(12.dp))
    Field(
        password, { password = it }, if (creating) "Password (at least 8 characters)" else "Password",
        keyboard = KeyboardOptions(keyboardType = KeyboardType.Password, imeAction = ImeAction.Done),
        secret = true,
    )
    if (error != null) {
        Spacer(Modifier.height(12.dp))
        Text(
            error!!,
            color = Color(0xFFFF8A80),
            fontSize = 14.sp,
            lineHeight = 20.sp,
            modifier = Modifier.semantics { liveRegion = LiveRegionMode.Polite },
        )
    }
    Spacer(Modifier.height(20.dp))
    PillButton(
        text = when {
            busy -> "Connecting…"
            creating -> "Create account"
            else -> "Sign in"
        },
        enabled = ready,
        onClick = {
            busy = true
            error = null
            val url = Account.normalizeServer(server)
            scope.launch {
                try {
                    val api = Api(url)
                    val zone = ZoneId.systemDefault().id
                    val session = if (creating) api.signUp(email, password, zone) else api.signIn(email, password, zone)
                    onSignedIn(url, session)
                } catch (e: IOException) {
                    error = e.message
                } finally {
                    busy = false
                }
            }
        },
    )
    Spacer(Modifier.height(12.dp))
    Text(
        if (creating) "Already have an account? Sign in" else "New here? Create an account",
        color = TextPrimary,
        fontSize = 15.sp,
        textAlign = TextAlign.Center,
        modifier = Modifier
            .fillMaxWidth()
            .clickable(role = Role.Button) { creating = !creating; error = null }
            .padding(vertical = 12.dp),
    )
}

@Composable
private fun Field(
    value: String,
    onChange: (String) -> Unit,
    label: String,
    placeholder: String? = null,
    keyboard: KeyboardOptions,
    secret: Boolean = false,
) {
    OutlinedTextField(
        value = value,
        onValueChange = onChange,
        label = { Text(label) },
        placeholder = placeholder?.let { { Text(it) } },
        singleLine = true,
        keyboardOptions = keyboard,
        visualTransformation = if (secret) PasswordVisualTransformation() else androidx.compose.ui.text.input.VisualTransformation.None,
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = OutlinedTextFieldDefaults.colors(
            focusedBorderColor = Color.White.copy(alpha = 0.7f),
            unfocusedBorderColor = Color.White.copy(alpha = 0.25f),
            focusedLabelColor = TextSecondary,
            unfocusedLabelColor = TextTertiary,
            cursorColor = Color.White,
            focusedContainerColor = Color.White.copy(alpha = 0.05f),
            unfocusedContainerColor = Color.White.copy(alpha = 0.05f),
        ),
    )
}
