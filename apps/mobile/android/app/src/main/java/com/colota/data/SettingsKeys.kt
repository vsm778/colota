/**
 * Copyright (C) 2026 Max Dietrich
 * Licensed under the GNU AGPLv3. See LICENSE in the project root for details.
 */

package com.Colota.data

/** Runtime state keys persisted via DatabaseHelper.saveSetting/getSetting. */
object SettingsKeys {
    const val TRACKING_ENABLED = "tracking_enabled"
    const val PAUSE_ZONE_NAME = "pause_zone_name"
    const val PAUSE_ZONE_WIFI_ACTIVE = "pause_zone_wifi_active"
    const val PAUSE_ZONE_MOTIONLESS_ACTIVE = "pause_zone_motionless_active"
    const val SCREEN_ON_SYNC_INTERVAL = "screenOnSyncInterval"
    const val SCREEN_OFF_CHECK_INTERVAL = "screenOffCheckInterval"
    const val SCREEN_OFF_MAX_INTERVAL = "screenOffMaxInterval"
    const val SCREEN_OFF_BACKOFF_MULTIPLIER = "screenOffBackoffMultiplier"

    const val DEFAULT_SCREEN_ON_SYNC_INTERVAL_SECONDS = 300
    const val DEFAULT_SCREEN_OFF_CHECK_INTERVAL_SECONDS = 60
    const val DEFAULT_SCREEN_OFF_MAX_INTERVAL_SECONDS = 900
    const val DEFAULT_SCREEN_OFF_BACKOFF_MULTIPLIER = 2.0
}
