package com.example.smartfocus.data

import android.content.Context
import com.example.smartfocus.data.health.HealthDay
import com.example.smartfocus.data.health.HealthReader
import com.example.smartfocus.data.health.HealthStatus
import com.example.smartfocus.data.usage.AppCatalog
import com.example.smartfocus.data.usage.UsageDay
import com.example.smartfocus.data.usage.UsageReader
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import java.time.LocalDateTime

/** Reads the phone's data sources. One instance is shared by the app and background sync. */
class DataRepository private constructor(context: Context) {
    val usage = UsageReader(context)
    val health = HealthReader(context)
    val apps = AppCatalog(context)
    private val lock = Mutex()

    data class Raw(
        val usageAccess: Boolean,
        val health: HealthStatus,
        val usageDays: List<UsageDay>?,
        val healthDays: List<HealthDay>?,
    )

    /** The last [days] days of everything that's connected, oldest first. */
    suspend fun read(days: Int = 7): Raw = withContext(Dispatchers.IO) {
        lock.withLock {
            val usageAccess = usage.hasAccess()
            val healthStatus = runCatching { health.status() }.getOrDefault(HealthStatus.Unavailable)
            Raw(
                usageAccess = usageAccess,
                health = healthStatus,
                usageDays = if (usageAccess) runCatching { usage.lastDays(days) }.getOrNull() else null,
                healthDays = if (healthStatus == HealthStatus.Granted) runCatching { health.lastDays(days) }.getOrNull() else null,
            )
        }
    }

    suspend fun dashboard(): Dashboard {
        val raw = read()
        return buildDashboard(raw.usageAccess, raw.health, raw.usageDays, raw.healthDays, apps::get, LocalDateTime.now())
    }

    companion object {
        @Volatile private var instance: DataRepository? = null

        fun get(context: Context): DataRepository =
            instance ?: synchronized(this) { instance ?: DataRepository(context.applicationContext).also { instance = it } }
    }
}
