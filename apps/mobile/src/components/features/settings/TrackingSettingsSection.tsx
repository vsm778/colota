/**
 * Copyright (C) 2026 Max Dietrich
 * Licensed under the GNU AGPLv3. See LICENSE in the project root for details.
 */

import React, { useState, useCallback, useEffect, useMemo } from "react"
import { Text, StyleSheet, Switch, View, Pressable } from "react-native"
import { Lightbulb, ChevronDown, ChevronUp } from "lucide-react-native"
import {
  Settings,
  TRACKING_PRESETS,
  SelectablePreset,
  ThemeColors,
  DEFAULT_SCREEN_OFF_CHECK_INTERVAL_SECONDS,
  DEFAULT_SCREEN_OFF_MAX_INTERVAL_SECONDS,
  DEFAULT_SCREEN_OFF_LONG_THRESHOLD_SECONDS,
  DEFAULT_SCREEN_OFF_BACKOFF_MULTIPLIER
} from "../../../types/global"
import { fonts } from "../../../styles/typography"
import { SectionTitle, Card, Divider, NumericInput, SettingRow } from "../../index"
import { PresetOption } from "./PresetOption"
import { shortDistanceUnit, inputToMeters, metersToInput } from "../../../utils/geo"

interface TrackingSettingsSectionProps {
  settings: Settings
  onSettingsChange: (newSettings: Settings) => void
  onDebouncedSave: (newSettings: Settings) => void
  onImmediateSave: (newSettings: Settings) => void
  colors: ThemeColors
}

function findMatchingTrackingPreset(settings: Settings): SelectablePreset | null {
  const match = (Object.entries(TRACKING_PRESETS) as [SelectablePreset, (typeof TRACKING_PRESETS)[SelectablePreset]][])
    .find(([, preset]) => preset.interval === settings.interval && preset.distance === settings.distance)
  return match?.[0] ?? null
}

export function TrackingSettingsSection({
  settings,
  onSettingsChange,
  onDebouncedSave,
  onImmediateSave,
  colors
}: TrackingSettingsSectionProps) {
  const [intervalInput, setIntervalInput] = useState(settings.interval.toString())
  const [distanceInput, setDistanceInput] = useState(metersToInput(settings.distance ?? 0).toString())
  const [accuracyThresholdInput, setAccuracyThresholdInput] = useState(
    metersToInput(settings.accuracyThreshold).toString()
  )
  const [screenOffCheckIntervalInput, setScreenOffCheckIntervalInput] = useState(
    settings.screenOffCheckInterval.toString()
  )
  const [screenOffMaxIntervalInput, setScreenOffMaxIntervalInput] = useState(settings.screenOffMaxInterval.toString())
  const [screenOffLongThresholdInput, setScreenOffLongThresholdInput] = useState(
    settings.screenOffLongThreshold.toString()
  )
  const [screenOffBackoffMultiplierInput, setScreenOffBackoffMultiplierInput] = useState(
    settings.screenOffBackoffMultiplier.toString()
  )
  const [showAdvanced, setShowAdvanced] = useState(false)

  const matchedPreset = useMemo(() => findMatchingTrackingPreset(settings), [settings])

  useEffect(() => {
    setIntervalInput(settings.interval.toString())
    setDistanceInput(metersToInput(settings.distance ?? 0).toString())
    setAccuracyThresholdInput(metersToInput(settings.accuracyThreshold).toString())
    setScreenOffCheckIntervalInput(settings.screenOffCheckInterval.toString())
    setScreenOffMaxIntervalInput(settings.screenOffMaxInterval.toString())
    setScreenOffLongThresholdInput(settings.screenOffLongThreshold.toString())
    setScreenOffBackoffMultiplierInput(settings.screenOffBackoffMultiplier.toString())
  }, [
    settings.interval,
    settings.distance,
    settings.accuracyThreshold,
    settings.screenOffCheckInterval,
    settings.screenOffMaxInterval,
    settings.screenOffLongThreshold,
    settings.screenOffBackoffMultiplier
  ])

  const handleNumericChange = useCallback(
    (key: "interval" | "distance" | "accuracyThreshold", value: string, min: number = 0) => {
      if (key === "interval") setIntervalInput(value)
      if (key === "distance") setDistanceInput(value)
      if (key === "accuracyThreshold") setAccuracyThresholdInput(value)

      const num = Number(value)
      if (!isNaN(num) && num >= min) {
        const stored = key === "distance" || key === "accuracyThreshold" ? inputToMeters(num) : num
        const next = { ...settings, [key]: stored, syncPreset: "custom" as const }
        onDebouncedSave(next)
      }
    },
    [settings, onDebouncedSave]
  )

  const handleNumericBlur = useCallback(
    (key: "interval" | "distance" | "accuracyThreshold", min: number = 0) => {
      const currentStr =
        key === "interval" ? intervalInput : key === "distance" ? distanceInput : accuracyThresholdInput
      let val = Number(currentStr)

      if (isNaN(val) || val < min) {
        val = min
        if (key === "interval") setIntervalInput(min.toString())
        if (key === "distance") setDistanceInput(min.toString())
        if (key === "accuracyThreshold") setAccuracyThresholdInput(min.toString())

        const stored = key === "distance" || key === "accuracyThreshold" ? inputToMeters(val) : val
        const next = { ...settings, [key]: stored }
        onSettingsChange(next)
        onImmediateSave(next)
      }
    },
    [intervalInput, distanceInput, accuracyThresholdInput, settings, onSettingsChange, onImmediateSave]
  )

  const handlePresetSelect = useCallback(
    (preset: SelectablePreset) => {
      const config = TRACKING_PRESETS[preset]
      const next: Settings = {
        ...settings,
        syncPreset: preset,
        interval: config.interval,
        distance: config.distance,
        ...(settings.isOfflineMode ? {} : { syncInterval: config.syncInterval, retryInterval: config.retryInterval })
      }

      onSettingsChange(next)
      onImmediateSave(next)
    },
    [settings, onSettingsChange, onImmediateSave]
  )

  const handleScreenOffSettingChange = useCallback(
    (
      key: "screenOffCheckInterval" | "screenOffMaxInterval" | "screenOffLongThreshold" | "screenOffBackoffMultiplier",
      value: string
    ) => {
      if (key === "screenOffCheckInterval") setScreenOffCheckIntervalInput(value)
      if (key === "screenOffMaxInterval") setScreenOffMaxIntervalInput(value)
      if (key === "screenOffLongThreshold") setScreenOffLongThresholdInput(value)
      if (key === "screenOffBackoffMultiplier") setScreenOffBackoffMultiplierInput(value)

      const num = Number(value)
      if (isNaN(num)) return

      const next = { ...settings, [key]: num, syncPreset: "custom" as const }
      onDebouncedSave(next)
    },
    [settings, onDebouncedSave]
  )

  const handleScreenOffSettingBlur = useCallback(
    (key: "screenOffCheckInterval" | "screenOffMaxInterval" | "screenOffLongThreshold" | "screenOffBackoffMultiplier") => {
      const raw =
        key === "screenOffCheckInterval"
          ? screenOffCheckIntervalInput
          : key === "screenOffMaxInterval"
            ? screenOffMaxIntervalInput
            : key === "screenOffLongThreshold"
              ? screenOffLongThresholdInput
              : screenOffBackoffMultiplierInput

      const currentCheck = Number(screenOffCheckIntervalInput)
      let nextCheck = Number.isFinite(currentCheck) && currentCheck >= 1 ? currentCheck : 1
      let nextMax = Number(screenOffMaxIntervalInput)
      nextMax = Number.isFinite(nextMax) && nextMax >= nextCheck ? nextMax : nextCheck
      let nextLong = Number(screenOffLongThresholdInput)
      nextLong = Number.isFinite(nextLong) && nextLong >= 0 ? nextLong : 0
      let nextMultiplier = Number(screenOffBackoffMultiplierInput)
      nextMultiplier =
        Number.isFinite(nextMultiplier) && nextMultiplier >= 1.5 && nextMultiplier <= 3
          ? nextMultiplier
          : DEFAULT_SCREEN_OFF_BACKOFF_MULTIPLIER

      if (key === "screenOffCheckInterval" && raw !== nextCheck.toString()) {
        setScreenOffCheckIntervalInput(nextCheck.toString())
      }
      if (
        (key === "screenOffCheckInterval" || key === "screenOffMaxInterval") &&
        screenOffMaxIntervalInput !== nextMax.toString()
      ) {
        setScreenOffMaxIntervalInput(nextMax.toString())
      }
      if (key === "screenOffLongThreshold" && raw !== nextLong.toString()) {
        setScreenOffLongThresholdInput(nextLong.toString())
      }
      if (key === "screenOffBackoffMultiplier" && raw !== nextMultiplier.toString()) {
        setScreenOffBackoffMultiplierInput(nextMultiplier.toString())
      }

      const next = {
        ...settings,
        screenOffCheckInterval: nextCheck,
        screenOffMaxInterval: nextMax,
        screenOffLongThreshold: nextLong,
        screenOffBackoffMultiplier: nextMultiplier
      }
      onSettingsChange(next)
      onImmediateSave(next)
    },
    [
      screenOffCheckIntervalInput,
      screenOffMaxIntervalInput,
      screenOffLongThresholdInput,
      screenOffBackoffMultiplierInput,
      settings,
      onSettingsChange,
      onImmediateSave
    ]
  )

  return (
    <View style={styles.section}>
      <SectionTitle>Tracking</SectionTitle>
      <Card>
        <Text style={[styles.introTitle, { color: colors.text }]}>Capture settings</Text>
        <Text style={[styles.introText, { color: colors.textSecondary }]}>
          Lower intervals and zero-distance tracking create more GPS wakeups. Presets keep tracking and upload defaults
          aligned for a reasonable battery balance.
        </Text>

        <View accessibilityRole="radiogroup">
          {(Object.keys(TRACKING_PRESETS) as SelectablePreset[]).map((preset, index) => (
            <View key={preset}>
              {index > 0 && <View style={styles.presetSpacer} />}
              <PresetOption
                preset={preset}
                isSelected={matchedPreset === preset}
                isOfflineMode={settings.isOfflineMode}
                onSelect={handlePresetSelect}
              />
            </View>
          ))}
        </View>

        <Divider />

        <Pressable
          style={({ pressed }) => [styles.advancedToggle, pressed && { opacity: colors.pressedOpacity }]}
          onPress={() => setShowAdvanced(!showAdvanced)}
        >
          <Text style={[styles.advancedText, { color: colors.text }]}>Advanced Tracking</Text>
          {showAdvanced ? (
            <ChevronUp size={20} color={colors.textLight} />
          ) : (
            <ChevronDown size={20} color={colors.textLight} />
          )}
        </Pressable>

        {showAdvanced && (
          <View style={styles.advancedPanel}>
            {matchedPreset == null && (
              <View style={[styles.customBanner, { backgroundColor: colors.info + "15" }]}>
                <View style={styles.bannerRow}>
                  <Lightbulb size={14} color={colors.info} />
                  <Text style={[styles.customBannerText, { color: colors.info }]}>Using custom tracking parameters</Text>
                </View>
              </View>
            )}

            <View style={styles.paramGroup}>
              <Text style={[styles.paramGroupTitle, { color: colors.text }]}>Tracking Parameters</Text>

              <NumericInput
                label="Tracking Interval"
                value={intervalInput}
                onChange={(val) => handleNumericChange("interval", val, 1)}
                onBlur={() => handleNumericBlur("interval", 1)}
                unit="seconds"
                placeholder="1"
                hint="How often to capture GPS position"
                colors={colors}
              />

              <NumericInput
                label="Movement Threshold"
                value={distanceInput}
                onChange={(val) => handleNumericChange("distance", val, 0)}
                onBlur={() => handleNumericBlur("distance", 0)}
                unit={shortDistanceUnit()}
                placeholder="10"
                hint="Only record if moved more than this distance"
                colors={colors}
              />
            </View>

            <Divider />

            <View style={styles.paramGroup}>
              <Text style={[styles.paramGroupTitle, { color: colors.text }]}>Quality Filters</Text>

              <SettingRow label="Filter Inaccurate Locations" hint="Reject low-accuracy GPS readings">
                <Switch
                  value={settings.filterInaccurateLocations}
                  onValueChange={(value) =>
                    onImmediateSave({
                      ...settings,
                      filterInaccurateLocations: value
                    })
                  }
                  trackColor={{
                    false: colors.border,
                    true: colors.primary + "80"
                  }}
                  thumbColor={settings.filterInaccurateLocations ? colors.primary : colors.border}
                />
              </SettingRow>

              {settings.filterInaccurateLocations && (
                <View style={[styles.nestedSetting, { borderLeftColor: colors.border }]}>
                  <NumericInput
                    label="Accuracy Threshold"
                    value={accuracyThresholdInput}
                    onChange={(val) => handleNumericChange("accuracyThreshold", val, 1)}
                    onBlur={() => handleNumericBlur("accuracyThreshold", 1)}
                    unit={shortDistanceUnit()}
                    placeholder="50"
                    hint="Reject readings with accuracy worse than this"
                    colors={colors}
                  />
                </View>
              )}
            </View>

            <Divider />

            <View style={styles.paramGroup}>
              <Text style={[styles.paramGroupTitle, { color: colors.text }]}>Screen-Off Sleep Mode</Text>

              <NumericInput
                label="Sleep Check Interval"
                value={screenOffCheckIntervalInput}
                onChange={(val) => handleScreenOffSettingChange("screenOffCheckInterval", val)}
                onBlur={() => handleScreenOffSettingBlur("screenOffCheckInterval")}
                unit="seconds"
                placeholder={DEFAULT_SCREEN_OFF_CHECK_INTERVAL_SECONDS.toString()}
                hint="After the screen turns off, start polling at this interval and grow it after each successful fix."
                colors={colors}
              />

              <NumericInput
                label="Sleep Max Interval"
                value={screenOffMaxIntervalInput}
                onChange={(val) => handleScreenOffSettingChange("screenOffMaxInterval", val)}
                onBlur={() => handleScreenOffSettingBlur("screenOffMaxInterval")}
                unit="seconds"
                placeholder={DEFAULT_SCREEN_OFF_MAX_INTERVAL_SECONDS.toString()}
                hint="Upper cap for screen-off polling. The service will not wait longer than this between wake-up checks."
                colors={colors}
              />

              <NumericInput
                label="Sleep Backoff Multiplier"
                value={screenOffBackoffMultiplierInput}
                onChange={(val) => handleScreenOffSettingChange("screenOffBackoffMultiplier", val)}
                onBlur={() => handleScreenOffSettingBlur("screenOffBackoffMultiplier")}
                unit="x"
                placeholder={DEFAULT_SCREEN_OFF_BACKOFF_MULTIPLIER.toString()}
                hint="How aggressively to grow the next screen-off interval after each successful fix. Allowed range: 1.5 to 3.0."
                colors={colors}
              />

              <NumericInput
                label="Long Sleep Threshold"
                value={screenOffLongThresholdInput}
                onChange={(val) => handleScreenOffSettingChange("screenOffLongThreshold", val)}
                onBlur={() => handleScreenOffSettingBlur("screenOffLongThreshold")}
                unit="seconds"
                placeholder={DEFAULT_SCREEN_OFF_LONG_THRESHOLD_SECONDS.toString()}
                hint="If the screen stays off this long, tracking sleeps until wake, then requests a fresh location immediately."
                colors={colors}
              />
            </View>
          </View>
        )}
      </Card>
    </View>
  )
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 24
  },
  introTitle: {
    ...fonts.semiBold,
    fontSize: 16,
    marginBottom: 6
  },
  introText: {
    ...fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16
  },
  presetSpacer: {
    height: 8
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
  customBanner: {
    padding: 14,
    borderRadius: 10,
    marginBottom: 20
  },
  bannerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  customBannerText: {
    fontSize: 13,
    ...fonts.medium
  },
  paramGroup: {
    marginBottom: 4
  },
  paramGroupTitle: {
    fontSize: 13,
    ...fonts.bold,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 16,
    opacity: 0.6
  },
  nestedSetting: {
    marginTop: 12,
    paddingLeft: 16,
    borderLeftWidth: 3
  }
})
