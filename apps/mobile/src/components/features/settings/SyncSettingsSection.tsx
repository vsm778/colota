/**
 * Copyright (C) 2026 Max Dietrich
 * Licensed under the GNU AGPLv3. See LICENSE in the project root for details.
 */

import React, { useState, useCallback, useEffect } from "react"
import { Text, StyleSheet, View, Pressable, TextInput, AppState } from "react-native"
import { ChevronDown, ChevronUp, BatteryCharging } from "lucide-react-native"
import {
  Settings,
  ThemeColors,
  SyncCondition,
  DEFAULT_SCREEN_ON_SYNC_INTERVAL_SECONDS
} from "../../../types/global"
import { fonts, fontSizes } from "../../../styles/typography"
import { SYNC_INTERVAL_PRESETS, SYNC_INTERVAL_LABELS } from "../../../constants"
import { SectionTitle, Card, Divider, NumericInput, Button } from "../../index"
import NativeLocationService from "../../../services/NativeLocationService"
import { logger } from "../../../utils/logger"

interface SyncSettingsSectionProps {
  settings: Settings
  onSettingsChange: (newSettings: Settings) => void
  onDebouncedSave: (newSettings: Settings) => void
  onImmediateSave: (newSettings: Settings) => void
  colors: ThemeColors
}

export function SyncSettingsSection({
  settings,
  onSettingsChange,
  onDebouncedSave,
  onImmediateSave,
  colors
}: SyncSettingsSectionProps) {
  const [syncIntervalInput, setSyncIntervalInput] = useState(settings.syncInterval.toString())
  const [screenOnSyncIntervalInput, setScreenOnSyncIntervalInput] = useState(settings.screenOnSyncInterval.toString())
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [currentSsid, setCurrentSsid] = useState("")
  const [isSyncingNow, setIsSyncingNow] = useState(false)

  useEffect(() => {
    if (settings.syncCondition !== "wifi_ssid") return

    const fetchSsid = () =>
      NativeLocationService.getCurrentSsid()
        .then(setCurrentSsid)
        .catch(() => {})
    fetchSsid()

    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") fetchSsid()
    })
    return () => sub.remove()
  }, [settings.syncCondition])

  useEffect(() => {
    setSyncIntervalInput(settings.syncInterval.toString())
    setScreenOnSyncIntervalInput(settings.screenOnSyncInterval.toString())
  }, [settings.syncInterval, settings.screenOnSyncInterval])

  const isCustomSyncInterval = !SYNC_INTERVAL_PRESETS.includes(settings.syncInterval)

  const handleGridSelect = useCallback(
    (key: "syncInterval", value: number) => {
      const next = {
        ...settings,
        [key]: value,
        syncPreset: "custom" as const
      }
      onSettingsChange(next)
      onDebouncedSave(next)
    },
    [settings, onSettingsChange, onDebouncedSave]
  )

  const handleManualSync = useCallback(async () => {
    setIsSyncingNow(true)
    try {
      await NativeLocationService.manualFlush()
    } catch (error) {
      logger.error("[SyncSettingsSection] Manual sync failed:", error)
    } finally {
      setIsSyncingNow(false)
    }
  }, [])

  return (
    <View style={styles.section}>
      <SectionTitle>Sync</SectionTitle>
      <Card>
        <View style={[styles.batteryCard, { backgroundColor: colors.info + "12" }]}>
          <View style={styles.batteryRow}>
            <BatteryCharging size={16} color={colors.info} />
            <Text style={[styles.batteryTitle, { color: colors.text }]}>Battery-aware upload</Text>
          </View>
          <Text style={[styles.batteryText, { color: colors.textSecondary }]}>
            For lower battery use, batch uploads, prefer Wi-Fi or VPN rules, and keep screen-on sync infrequent or off.
          </Text>
        </View>

        <Button
          title="Sync Now"
          onPress={() => {
            void handleManualSync()
          }}
          variant="secondary"
          loading={isSyncingNow}
          disabled={settings.isOfflineMode || !settings.endpoint.trim()}
        />

        {settings.isOfflineMode ? (
          <Text style={[styles.offlineText, { color: colors.textSecondary }]}>
            Offline mode is enabled. Locations stay local until you disable offline mode.
          </Text>
        ) : (
          <>
            <View style={styles.settingBlock}>
              <Text style={[styles.blockLabel, { color: colors.text }]}>Sync Interval</Text>
              <Text style={[styles.blockHint, { color: colors.textSecondary }]}>
                Instant uploads are freshest but use the most radio wakeups. Batched sync is easier on battery.
              </Text>

              <View style={styles.optionsGrid}>
                {SYNC_INTERVAL_PRESETS.map((sec) => {
                  const isSelected = settings.syncInterval === sec && !isCustomSyncInterval
                  return (
                    <Pressable
                      key={sec}
                      style={({ pressed }) => [
                        styles.gridOption,
                        {
                          borderColor: colors.border,
                          backgroundColor: colors.background
                        },
                        isSelected && {
                          borderColor: colors.primary,
                          backgroundColor: colors.primary + "20"
                        },
                        pressed && { opacity: colors.pressedOpacity }
                      ]}
                      onPress={() => handleGridSelect("syncInterval", sec)}
                    >
                      <Text style={[styles.gridLabel, { color: isSelected ? colors.primary : colors.text }]}>
                        {SYNC_INTERVAL_LABELS[sec]}
                      </Text>
                    </Pressable>
                  )
                })}
                <Pressable
                  style={({ pressed }) => [
                    styles.gridOption,
                    {
                      borderColor: colors.border,
                      backgroundColor: colors.background
                    },
                    isCustomSyncInterval && {
                      borderColor: colors.primary,
                      backgroundColor: colors.primary + "20"
                    },
                    pressed && { opacity: colors.pressedOpacity }
                  ]}
                  onPress={() => {
                    if (!isCustomSyncInterval) {
                      const customValue = 1800
                      setSyncIntervalInput(customValue.toString())
                      handleGridSelect("syncInterval", customValue)
                    }
                  }}
                >
                  <Text style={[styles.gridLabel, { color: isCustomSyncInterval ? colors.primary : colors.text }]}>
                    Custom
                  </Text>
                </Pressable>
              </View>
            </View>

            {isCustomSyncInterval && (
              <View style={styles.customSyncInput}>
                <NumericInput
                  label="Custom Sync Interval"
                  value={syncIntervalInput}
                  onChange={(val) => {
                    setSyncIntervalInput(val)
                    const num = Number(val)
                    if (!isNaN(num) && num >= 1) {
                      const next = { ...settings, syncInterval: num, syncPreset: "custom" as const }
                      onDebouncedSave(next)
                    }
                  }}
                  onBlur={() => {
                    let val = Number(syncIntervalInput)
                    if (isNaN(val) || val < 1) {
                      val = 1
                      setSyncIntervalInput("1")
                      const next = { ...settings, syncInterval: val, syncPreset: "custom" as const }
                      onSettingsChange(next)
                      onImmediateSave(next)
                    }
                  }}
                  unit="seconds"
                  placeholder="1800"
                  hint="Custom interval in seconds"
                  colors={colors}
                />
              </View>
            )}

            <Divider />

            <Pressable
              style={({ pressed }) => [styles.advancedToggle, pressed && { opacity: colors.pressedOpacity }]}
              onPress={() => setShowAdvanced(!showAdvanced)}
            >
              <Text style={[styles.advancedText, { color: colors.text }]}>Advanced Sync</Text>
              {showAdvanced ? (
                <ChevronUp size={20} color={colors.textLight} />
              ) : (
                <ChevronDown size={20} color={colors.textLight} />
              )}
            </Pressable>

            {showAdvanced && (
              <View style={styles.advancedPanel}>
                <NumericInput
                  label="Screen-On Sync"
                  value={screenOnSyncIntervalInput}
                  onChange={(val) => {
                    setScreenOnSyncIntervalInput(val)
                    const num = Number(val)
                    if (!isNaN(num) && num >= 0) {
                      const next = { ...settings, screenOnSyncInterval: num }
                      onDebouncedSave(next)
                    }
                  }}
                  onBlur={() => {
                    let val = Number(screenOnSyncIntervalInput)
                    if (isNaN(val) || val < 0) {
                      val = 0
                      setScreenOnSyncIntervalInput("0")
                      const next = { ...settings, screenOnSyncInterval: val }
                      onSettingsChange(next)
                      onImmediateSave(next)
                    }
                  }}
                  unit="seconds"
                  placeholder={DEFAULT_SCREEN_ON_SYNC_INTERVAL_SECONDS.toString()}
                  hint="When the screen turns on, flush queued locations at most once per this interval. Set 0 to disable."
                  colors={colors}
                />

                <View style={styles.settingRowSpaced}>
                  <Text style={[styles.blockLabel, { color: colors.text }]}>Sync Only On</Text>
                  <Text style={[styles.blockHint, { color: colors.textSecondary }]}>
                    Restricting uploads to Wi-Fi or VPN reduces mobile radio use, but queued locations may wait longer.
                  </Text>
                  <View style={styles.syncConditionChips}>
                    {(
                      [
                        { value: "any", label: "Any" },
                        { value: "wifi_any", label: "Wi-Fi" },
                        { value: "wifi_ssid", label: "SSID" },
                        { value: "vpn", label: "VPN" }
                      ] as { value: SyncCondition; label: string }[]
                    ).map((option) => (
                      <Pressable
                        key={option.value}
                        onPress={() => {
                          const next = {
                            ...settings,
                            syncCondition: option.value,
                            syncPreset: "custom" as const
                          }
                          onSettingsChange(next)
                          onImmediateSave(next)
                        }}
                        style={[
                          styles.syncConditionChip,
                          {
                            backgroundColor:
                              settings.syncCondition === option.value ? colors.primary + "20" : colors.background,
                            borderColor: settings.syncCondition === option.value ? colors.primary : colors.border
                          }
                        ]}
                      >
                        <Text
                          style={[
                            styles.syncConditionChipText,
                            { color: settings.syncCondition === option.value ? colors.primary : colors.textSecondary }
                          ]}
                        >
                          {option.label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                  {settings.syncCondition === "wifi_ssid" && (
                    <View style={styles.ssidRow}>
                      <TextInput
                        style={[
                          styles.ssidInput,
                          { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }
                        ]}
                        value={settings.syncSsid}
                        onChangeText={(text) => {
                          const next = { ...settings, syncSsid: text }
                          onSettingsChange(next)
                          onDebouncedSave(next)
                        }}
                        placeholder="Enter Wi-Fi SSID"
                        placeholderTextColor={colors.placeholder}
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                      {currentSsid !== "" && currentSsid.toLowerCase() !== settings.syncSsid.toLowerCase() && (
                        <Pressable
                          style={({ pressed }) => [
                            styles.ssidFillButton,
                            { borderColor: colors.primary, backgroundColor: colors.primary + "15" },
                            pressed && { opacity: colors.pressedOpacity }
                          ]}
                          onPress={() => {
                            const next = { ...settings, syncSsid: currentSsid }
                            onSettingsChange(next)
                            onImmediateSave(next)
                          }}
                        >
                          <Text style={[styles.ssidFillText, { color: colors.primary }]}>Use current</Text>
                        </Pressable>
                      )}
                    </View>
                  )}
                </View>
              </View>
            )}
          </>
        )}
      </Card>
    </View>
  )
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 24
  },
  batteryCard: {
    padding: 14,
    borderRadius: 10,
    marginBottom: 16
  },
  batteryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6
  },
  batteryTitle: {
    ...fonts.semiBold,
    fontSize: 15
  },
  batteryText: {
    ...fonts.regular,
    fontSize: 13,
    lineHeight: 18
  },
  offlineText: {
    ...fonts.regular,
    fontSize: 14,
    lineHeight: 20
  },
  settingBlock: {
    marginBottom: 20
  },
  blockLabel: {
    fontSize: fontSizes.label,
    ...fonts.semiBold,
    marginBottom: 4
  },
  blockHint: {
    fontSize: 13,
    ...fonts.regular,
    marginBottom: 12,
    lineHeight: 18
  },
  optionsGrid: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap"
  },
  gridOption: {
    width: "31%",
    borderWidth: 2,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center"
  },
  gridLabel: {
    fontSize: 14,
    ...fonts.semiBold
  },
  customSyncInput: {
    marginTop: 12
  },
  advancedToggle: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12
  },
  advancedText: {
    fontSize: 16,
    ...fonts.semiBold
  },
  advancedPanel: {
    marginTop: 16
  },
  settingRowSpaced: {
    marginTop: 16
  },
  syncConditionChips: {
    flexDirection: "row",
    gap: 6,
    marginTop: 8
  },
  syncConditionChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1
  },
  syncConditionChipText: {
    ...fonts.medium,
    fontSize: 12
  },
  ssidRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    gap: 8
  },
  ssidInput: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 13,
    fontFamily: "monospace"
  },
  ssidFillButton: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1
  },
  ssidFillText: {
    ...fonts.medium,
    fontSize: 12
  }
})
