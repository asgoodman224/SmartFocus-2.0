package com.example.smartfocus.sync

import android.content.Context
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import java.util.concurrent.TimeUnit

/** Runs [Sync] in the background: every few hours, and soon after a check-in or opening the app. */
class SyncWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {
    override suspend fun doWork(): Result {
        val outcome = Sync.run(applicationContext)
        return if (outcome.error != null && outcome.retry && runAttemptCount < 3) Result.retry() else Result.success()
    }

    companion object {
        private val online = Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build()

        /** Turns on periodic sync (after signing in). Safe to call repeatedly. */
        fun schedule(context: Context) {
            WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                "sync",
                ExistingPeriodicWorkPolicy.KEEP,
                PeriodicWorkRequestBuilder<SyncWorker>(6, TimeUnit.HOURS).setConstraints(online).build(),
            )
        }

        fun syncSoon(context: Context) {
            WorkManager.getInstance(context).enqueueUniqueWork(
                "sync-now",
                ExistingWorkPolicy.REPLACE,
                OneTimeWorkRequestBuilder<SyncWorker>().setConstraints(online).build(),
            )
        }

        fun cancel(context: Context) {
            WorkManager.getInstance(context).run {
                cancelUniqueWork("sync")
                cancelUniqueWork("sync-now")
            }
        }
    }
}
