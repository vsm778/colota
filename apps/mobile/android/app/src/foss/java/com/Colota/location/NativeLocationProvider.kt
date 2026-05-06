/**
 * Copyright (C) 2026 Max Dietrich
 * Licensed under the GNU AGPLv3. See LICENSE in the project root for details.
 */

package com.Colota.location

import android.annotation.SuppressLint
import android.content.Context
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.os.Handler
import android.os.Bundle
import android.os.Looper
import com.Colota.util.AppLogger

/**
 * LocationManager-based GPS provider for FOSS flavor (no Google Play Services).
 */
@SuppressLint("MissingPermission")
class NativeLocationProvider(context: Context) : LocationProvider {

    companion object {
        private const val TAG = "NativeLocationProvider"
        private const val SINGLE_SHOT_MIN_TIMEOUT_MS = 4_000L
        private const val SINGLE_SHOT_MAX_TIMEOUT_MS = 10_000L
        private const val SINGLE_SHOT_TIMEOUT_DIVISOR = 4L
        private const val SINGLE_SHOT_MAX_RETRY_MULTIPLIER = 4L

        internal fun calculateSingleShotTimeoutMs(intervalMs: Long): Long =
            (intervalMs / SINGLE_SHOT_TIMEOUT_DIVISOR).coerceIn(
                SINGLE_SHOT_MIN_TIMEOUT_MS,
                SINGLE_SHOT_MAX_TIMEOUT_MS
            )

        internal fun calculateSingleShotRetryDelayMs(intervalMs: Long, consecutiveTimeouts: Int): Long {
            val multiplier = consecutiveTimeouts.coerceIn(1, SINGLE_SHOT_MAX_RETRY_MULTIPLIER.toInt()).toLong()
            return intervalMs * multiplier
        }
    }

    private val locationManager: LocationManager =
        context.getSystemService(Context.LOCATION_SERVICE) as LocationManager

    private val sessionMap = java.util.concurrent.ConcurrentHashMap<LocationUpdateCallback, LocationSession>()
    @Volatile private var singleShotMode = false

    override fun setSingleShotMode(enabled: Boolean) {
        singleShotMode = enabled
    }

    override fun requestLocationUpdates(
        intervalMs: Long,
        minDistanceMeters: Float,
        looper: Looper,
        callback: LocationUpdateCallback
    ) {
        removeLocationUpdates(callback)

        if (singleShotMode) {
            val session = SingleShotSession(intervalMs, looper, callback)
            sessionMap[callback] = session
            session.start()
            AppLogger.d(TAG, "Started GPS single-shot polling: interval=${intervalMs}ms")
            return
        }

        val listener = object : LocationListener {
            override fun onLocationChanged(location: Location) {
                callback.onLocationUpdate(location)
            }
            @Deprecated("Deprecated in API 29")
            override fun onStatusChanged(provider: String?, status: Int, extras: Bundle?) {}
            override fun onProviderEnabled(provider: String) {}
            override fun onProviderDisabled(provider: String) {}
        }

        try {
            locationManager.requestLocationUpdates(
                LocationManager.GPS_PROVIDER,
                intervalMs,
                minDistanceMeters,
                listener,
                looper
            )
            AppLogger.d(TAG, "Started GPS_PROVIDER updates: interval=${intervalMs}ms, distance=${minDistanceMeters}m")
        } catch (e: SecurityException) {
            locationManager.removeUpdates(listener)
            throw e
        }

        sessionMap[callback] = ContinuousSession(listener)
    }

    override fun removeLocationUpdates(callback: LocationUpdateCallback) {
        sessionMap.remove(callback)?.let { session ->
            session.stop()
            AppLogger.d(TAG, "Stopped GPS_PROVIDER updates")
        }
    }

    override fun getLastLocation(
        onSuccess: (Location?) -> Unit,
        onFailure: (Exception) -> Unit
    ) {
        try {
            onSuccess(locationManager.getLastKnownLocation(LocationManager.GPS_PROVIDER))
        } catch (e: SecurityException) {
            onFailure(e)
        }
    }

    private interface LocationSession {
        fun stop()
    }

    private inner class ContinuousSession(
        private val listener: LocationListener
    ) : LocationSession {
        override fun stop() {
            locationManager.removeUpdates(listener)
        }
    }

    private inner class SingleShotSession(
        private val intervalMs: Long,
        private val looper: Looper,
        private val callback: LocationUpdateCallback
    ) : LocationSession {
        private val handler = Handler(looper)
        @Volatile private var cancelled = false
        @Volatile private var activeListener: LocationListener? = null
        @Volatile private var timeoutRunnable: Runnable? = null
        @Volatile private var consecutiveTimeouts = 0
        private val restartRunnable = Runnable {
            if (!cancelled) requestNextFix()
        }

        fun start() {
            handler.post(restartRunnable)
        }

        @Suppress("DEPRECATION", "MissingPermission")
        private fun requestNextFix() {
            if (cancelled) return

            val listener = object : LocationListener {
                override fun onLocationChanged(location: Location) {
                    if (cancelled) return
                    timeoutRunnable?.let(handler::removeCallbacks)
                    timeoutRunnable = null
                    consecutiveTimeouts = 0
                    clearActiveListener(this)
                    callback.onLocationUpdate(location)
                    handler.postDelayed(restartRunnable, intervalMs)
                }

                @Deprecated("Deprecated in API 29")
                override fun onStatusChanged(provider: String?, status: Int, extras: Bundle?) {}
                override fun onProviderEnabled(provider: String) {}
                override fun onProviderDisabled(provider: String) {}
            }

            activeListener = listener
            val timeoutMs = calculateSingleShotTimeoutMs(intervalMs)
            val timeoutRunnable = Runnable {
                if (cancelled) return@Runnable
                if (activeListener === listener) {
                    consecutiveTimeouts++
                    val retryDelayMs = calculateSingleShotRetryDelayMs(intervalMs, consecutiveTimeouts)
                    AppLogger.d(TAG, "GPS single-shot timed out after ${timeoutMs}ms, retrying in ${retryDelayMs}ms (timeouts=$consecutiveTimeouts)")
                    this.timeoutRunnable = null
                    clearActiveListener(listener)
                    handler.postDelayed(restartRunnable, retryDelayMs)
                }
            }
            this.timeoutRunnable = timeoutRunnable

            try {
                locationManager.requestSingleUpdate(LocationManager.GPS_PROVIDER, listener, looper)
                handler.postDelayed(timeoutRunnable, timeoutMs)
            } catch (e: SecurityException) {
                this.timeoutRunnable = null
                clearActiveListener(listener)
                throw e
            }
        }

        override fun stop() {
            cancelled = true
            handler.removeCallbacksAndMessages(null)
            timeoutRunnable = null
            activeListener?.let { listener ->
                locationManager.removeUpdates(listener)
                activeListener = null
            }
        }

        private fun clearActiveListener(listener: LocationListener) {
            if (activeListener !== listener) return
            locationManager.removeUpdates(listener)
            activeListener = null
        }
    }
}
