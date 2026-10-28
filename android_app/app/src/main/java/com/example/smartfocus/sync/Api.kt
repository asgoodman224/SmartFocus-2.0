package com.example.smartfocus.sync

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.io.IOException
import java.net.ConnectException
import java.net.HttpURLConnection
import java.net.SocketTimeoutException
import java.net.URL
import java.net.UnknownHostException

/** The server answered with an error. [message] is its `detail`, written for people. */
class ApiException(val status: Int, message: String) : IOException(message)

/** The SmartFocus Express API (see backend/README.md on the backend branch). */
class Api(private val baseUrl: String, private val token: String? = null) {

    data class Session(val token: String, val email: String)

    suspend fun signIn(email: String, password: String, timezone: String): Session =
        session(request("POST", "/v1/auth/sign-in", JSONObject().put("email", email).put("password", password).put("timezone", timezone)))

    suspend fun signUp(email: String, password: String, timezone: String): Session =
        session(request("POST", "/v1/auth/sign-up", JSONObject().put("email", email).put("password", password).put("timezone", timezone)))

    suspend fun signOut() {
        request("POST", "/v1/auth/sign-out", null)
    }

    suspend fun postCheckIn(body: JSONObject) {
        request("POST", "/v1/check-ins", body)
    }

    suspend fun putUsageDay(date: String, body: JSONObject) {
        request("PUT", "/v1/usage/days/$date", body)
    }

    suspend fun putHealthDay(date: String, body: JSONObject) {
        request("PUT", "/v1/health/days/$date", body)
    }

    suspend fun putDataSource(id: String, status: String) {
        request("PUT", "/v1/data-sources/$id", JSONObject().put("status", status))
    }

    private fun session(json: String?): Session {
        val o = JSONObject(json ?: "{}")
        return Session(o.getString("token"), o.getJSONObject("account").getString("email"))
    }

    private suspend fun request(method: String, path: String, body: JSONObject?): String? = withContext(Dispatchers.IO) {
        try {
            val conn = URL(baseUrl + path).openConnection() as HttpURLConnection
            try {
                conn.requestMethod = method
                conn.connectTimeout = 10_000
                conn.readTimeout = 20_000
                conn.setRequestProperty("Accept", "application/json")
                token?.let { conn.setRequestProperty("Authorization", "Bearer $it") }
                if (body != null) {
                    conn.doOutput = true
                    conn.setRequestProperty("Content-Type", "application/json; charset=utf-8")
                    conn.outputStream.use { it.write(body.toString().toByteArray()) }
                }
                val code = conn.responseCode
                val text = (if (code < 400) conn.inputStream else conn.errorStream)?.bufferedReader()?.use { it.readText() }
                if (code >= 400) {
                    val detail = runCatching { JSONObject(text!!).getString("detail") }.getOrNull()
                    throw ApiException(code, detail ?: "The server returned an error ($code).")
                }
                text
            } finally {
                conn.disconnect()
            }
        } catch (e: ApiException) {
            throw e
        } catch (e: IOException) {
            throw IOException(friendly(e), e)
        }
    }

    private fun friendly(e: IOException): String = when (e) {
        is ConnectException, is SocketTimeoutException, is UnknownHostException ->
            "Can't reach $baseUrl. Check the server is running and the phone is on the same Wi-Fi."
        else -> e.message ?: "Couldn't reach the server."
    }
}
