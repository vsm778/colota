import React from "react"
import { render, fireEvent } from "@testing-library/react-native"
import { DEFAULT_SETTINGS, Settings } from "../../../../types/global"

jest.mock("../../../index", () => {
  const R = require("react")
  const { View, Text, TextInput, Pressable } = require("react-native")
  return {
    SectionTitle: ({ children }: any) => R.createElement(Text, null, children),
    Card: ({ children }: any) => R.createElement(View, null, children),
    Divider: () => R.createElement(View, null),
    Button: ({ title, onPress, disabled }: any) =>
      R.createElement(
        Pressable,
        { onPress, disabled },
        R.createElement(Text, null, title)
      ),
    NumericInput: ({ label, value, onChange, onBlur, unit, hint, placeholder: ph }: any) =>
      R.createElement(
        View,
        null,
        R.createElement(Text, null, label),
        hint && R.createElement(Text, null, hint),
        R.createElement(TextInput, {
          value,
          onChangeText: onChange,
          onBlur,
          placeholder: ph,
          keyboardType: "numeric"
        }),
        R.createElement(Text, null, unit)
      )
  }
})

jest.mock("../../../../services/NativeLocationService", () => ({
  __esModule: true,
  default: {
    getCurrentSsid: jest.fn().mockResolvedValue("HomeWiFi"),
    manualFlush: jest.fn().mockResolvedValue(true)
  }
}))

const mockColors = {
  primary: "#0d9488",
  primaryDark: "#115E59",
  border: "#e5e7eb",
  text: "#000",
  textSecondary: "#6b7280",
  textLight: "#9ca3af",
  background: "#fff",
  info: "#3b82f6",
  card: "#fff",
  backgroundElevated: "#f9fafb",
  placeholder: "#9ca3af",
  textOnPrimary: "#fff",
  pressedOpacity: 0.7
} as any

import { SyncSettingsSection } from "../SyncSettingsSection"
import NativeLocationService from "../../../../services/NativeLocationService"

describe("SyncSettingsSection", () => {
  let mockOnSettingsChange: jest.Mock
  let mockOnDebouncedSave: jest.Mock
  let mockOnImmediateSave: jest.Mock
  let baseSettings: Settings

  beforeEach(() => {
    mockOnSettingsChange = jest.fn()
    mockOnDebouncedSave = jest.fn()
    mockOnImmediateSave = jest.fn()
    baseSettings = { ...DEFAULT_SETTINGS }
  })

  function renderComponent(settingsOverride?: Partial<Settings>) {
    const settings = { ...baseSettings, ...settingsOverride }
    return render(
      <SyncSettingsSection
        settings={settings}
        onSettingsChange={mockOnSettingsChange}
        onDebouncedSave={mockOnDebouncedSave}
        onImmediateSave={mockOnImmediateSave}
        colors={mockColors}
      />
    )
  }

  it("renders sync interval options", () => {
    const { getByText, getAllByText } = renderComponent()

    expect(getAllByText("Instant").length).toBeGreaterThan(0)
    expect(getByText("1 min")).toBeTruthy()
    expect(getByText("5 min")).toBeTruthy()
    expect(getByText("15 min")).toBeTruthy()
  })

  it("selecting a sync interval sets preset to custom", () => {
    const { getByText } = renderComponent()

    fireEvent.press(getByText("5 min"))

    expect(mockOnSettingsChange).toHaveBeenCalledWith(
      expect.objectContaining({
        syncInterval: 300,
        syncPreset: "custom"
      })
    )
    expect(mockOnDebouncedSave).toHaveBeenCalledWith(
      expect.objectContaining({
        syncInterval: 300,
        syncPreset: "custom"
      })
    )
  })

  it("renders screen-on sync input in advanced sync settings", () => {
    const { getByText } = renderComponent()

    fireEvent.press(getByText("Advanced Sync"))

    expect(getByText("Screen-On Sync")).toBeTruthy()
  })

  it("clamps screen-on sync interval to min 0 on blur", () => {
    const { getByText, getByDisplayValue } = renderComponent({
      screenOnSyncInterval: 300
    })

    fireEvent.press(getByText("Advanced Sync"))

    const input = getByDisplayValue("300")
    fireEvent.changeText(input, "-1")
    fireEvent(input, "blur")

    expect(mockOnSettingsChange).toHaveBeenCalledWith(
      expect.objectContaining({
        screenOnSyncInterval: 0
      })
    )
    expect(mockOnImmediateSave).toHaveBeenCalledWith(
      expect.objectContaining({
        screenOnSyncInterval: 0
      })
    )
  })

  it("shows offline copy when offline mode is enabled", () => {
    const { getByText, queryByText } = renderComponent({ isOfflineMode: true })

    expect(getByText("Offline mode is enabled. Locations stay local until you disable offline mode.")).toBeTruthy()
    expect(queryByText("Advanced Sync")).toBeNull()
  })

  it("manual sync button triggers native flush", async () => {
    const { getByText } = renderComponent({ endpoint: "https://example.com" })

    fireEvent.press(getByText("Sync Now"))

    expect(NativeLocationService.manualFlush).toHaveBeenCalledTimes(1)
  })
})
