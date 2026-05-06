package com.Colota.location

import org.junit.Assert.assertEquals
import org.junit.Test

class NativeLocationProviderTest {

    @Test
    fun `single-shot timeout uses short bounded window`() {
        assertEquals(5_000L, NativeLocationProvider.calculateSingleShotTimeoutMs(30_000L))
        assertEquals(10_000L, NativeLocationProvider.calculateSingleShotTimeoutMs(60_000L))
        assertEquals(12_000L, NativeLocationProvider.calculateSingleShotTimeoutMs(120_000L))
    }

    @Test
    fun `single-shot retry delay backs off after consecutive timeouts`() {
        assertEquals(60_000L, NativeLocationProvider.calculateSingleShotRetryDelayMs(60_000L, 1))
        assertEquals(120_000L, NativeLocationProvider.calculateSingleShotRetryDelayMs(60_000L, 2))
        assertEquals(240_000L, NativeLocationProvider.calculateSingleShotRetryDelayMs(60_000L, 4))
        assertEquals(240_000L, NativeLocationProvider.calculateSingleShotRetryDelayMs(60_000L, 7))
    }
}
