/**
 * Copyright (C) 2026 Max Dietrich
 * Licensed under the GNU AGPLv3. See LICENSE in the project root for details.
 */

import React, { useCallback } from "react"
import { StyleSheet, ScrollView } from "react-native"
import { ScreenProps, Settings } from "../types/global"
import { useTheme } from "../hooks/useTheme"
import { useAutoSave } from "../hooks/useAutoSave"
import { useTracking } from "../contexts/TrackingProvider"
import { FloatingSaveIndicator } from "../components/ui/FloatingSaveIndicator"
import { Container } from "../components"
import { TrackingSettingsSection } from "../components/features/settings/TrackingSettingsSection"

export function TrackingScreen({}: ScreenProps) {
  const { settings, setSettings, updateSettingsLocal, restartTracking } = useTracking()
  const { colors } = useTheme()
  const { saving, saveSuccess, debouncedSaveAndRestart, immediateSaveAndRestart } = useAutoSave()

  const handleDebouncedSave = useCallback(
    (newSettings: Settings) => {
      debouncedSaveAndRestart(
        () => setSettings(newSettings),
        () => restartTracking(newSettings)
      )
    },
    [setSettings, debouncedSaveAndRestart, restartTracking]
  )

  const handleImmediateSave = useCallback(
    (newSettings: Settings) => {
      immediateSaveAndRestart(
        () => setSettings(newSettings),
        () => restartTracking(newSettings)
      )
    },
    [setSettings, immediateSaveAndRestart, restartTracking]
  )

  return (
    <Container>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <TrackingSettingsSection
          settings={settings}
          onSettingsChange={updateSettingsLocal}
          onDebouncedSave={handleDebouncedSave}
          onImmediateSave={handleImmediateSave}
          colors={colors}
        />
      </ScrollView>

      <FloatingSaveIndicator saving={saving} success={saveSuccess} colors={colors} />
    </Container>
  )
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40
  }
})
