import React from "react"
import { render, fireEvent } from "@testing-library/react-native"
import { DEFAULT_SETTINGS, TRACKING_PRESETS, Settings } from "../../../../types/global"

jest.mock("../../../index", () => {
  const R = require("react")
  const { View, Text, TextInput } = require("react-native")
  return {
    SectionTitle: ({ children }: any) => R.createElement(Text, null, children),
    Card: ({ children }: any) => R.createElement(View, null, children),
    Divider: () => R.createElement(View, null),
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
      ),
    SettingRow: ({ label, hint, children }: any) =>
      R.createElement(
        View,
        null,
        R.createElement(Text, null, label),
        hint && R.createElement(Text, null, hint),
        children
      )
  }
})

jest.mock("../../../../utils/geo", () => ({
  shortDistanceUnit: () => "m",
  inputToMeters: (value: number) => value,
  metersToInput: (meters: number) => meters
}))

jest.mock("../PresetOption", () => ({
  PresetOption: ({ preset, isSelected, onSelect }: any) => {
    const R = require("react")
    const { Pressable, Text } = require("react-native")
    return R.createElement(
      Pressable,
      { testID: `preset-${preset}`, onPress: () => onSelect(preset) },
      R.createElement(Text, null, preset, isSelected ? " (selected)" : "")
    )
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
  textOnPrimary: "#fff"
} as any

import { TrackingSettingsSection } from "../TrackingSettingsSection"

describe("TrackingSettingsSection", () => {
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
      <TrackingSettingsSection
        settings={settings}
        onSettingsChange={mockOnSettingsChange}
        onDebouncedSave={mockOnDebouncedSave}
        onImmediateSave={mockOnImmediateSave}
        colors={mockColors}
      />
    )
  }

  it("renders all three presets", () => {
    const { getByTestId } = renderComponent()

    expect(getByTestId("preset-instant")).toBeTruthy()
    expect(getByTestId("preset-balanced")).toBeTruthy()
    expect(getByTestId("preset-powersaver")).toBeTruthy()
  })

  it("selecting a preset applies tracking and recommended sync config", () => {
    const { getByTestId } = renderComponent()

    fireEvent.press(getByTestId("preset-balanced"))

    expect(mockOnImmediateSave).toHaveBeenCalledWith(
      expect.objectContaining({
        syncPreset: "balanced",
        interval: TRACKING_PRESETS.balanced.interval,
        distance: TRACKING_PRESETS.balanced.distance,
        syncInterval: TRACKING_PRESETS.balanced.syncInterval
      })
    )
  })

  it("shows advanced tracking settings when toggled", () => {
    const { getByText } = renderComponent()

    fireEvent.press(getByText("Advanced Tracking"))

    expect(getByText("Tracking Parameters")).toBeTruthy()
    expect(getByText("Quality Filters")).toBeTruthy()
    expect(getByText("Screen-Off Sleep Mode")).toBeTruthy()
  })

  it("clamps interval to min 1 on blur", () => {
    const { getByText, getByDisplayValue } = renderComponent({ interval: 5 })

    fireEvent.press(getByText("Advanced Tracking"))

    const intervalInput = getByDisplayValue("5")
    fireEvent.changeText(intervalInput, "0")
    fireEvent(intervalInput, "blur")

    expect(mockOnSettingsChange).toHaveBeenCalledWith(expect.objectContaining({ interval: 1 }))
    expect(mockOnImmediateSave).toHaveBeenCalledWith(expect.objectContaining({ interval: 1 }))
  })

  it("clamps screen-off max interval to the screen-off check interval", () => {
    const { getByText, getAllByDisplayValue } = renderComponent({
      screenOffCheckInterval: 60,
      screenOffMaxInterval: 120
    })

    fireEvent.press(getByText("Advanced Tracking"))

    const maxInput = getAllByDisplayValue("120")[0]
    fireEvent.changeText(maxInput, "30")
    fireEvent(maxInput, "blur")

    expect(mockOnSettingsChange).toHaveBeenCalledWith(
      expect.objectContaining({
        screenOffCheckInterval: 60,
        screenOffMaxInterval: 60
      })
    )
    expect(mockOnImmediateSave).toHaveBeenCalledWith(
      expect.objectContaining({
        screenOffCheckInterval: 60,
        screenOffMaxInterval: 60
      })
    )
  })

  it("clamps screen-off backoff multiplier to default when outside 1.5 to 3.0", () => {
    const { getByText, getAllByDisplayValue } = renderComponent({
      screenOffBackoffMultiplier: 2.7
    })

    fireEvent.press(getByText("Advanced Tracking"))

    const multiplierInput = getAllByDisplayValue("2.7")[0]
    fireEvent.changeText(multiplierInput, "4")
    fireEvent(multiplierInput, "blur")

    expect(mockOnSettingsChange).toHaveBeenCalledWith(
      expect.objectContaining({
        screenOffBackoffMultiplier: 2
      })
    )
    expect(mockOnImmediateSave).toHaveBeenCalledWith(
      expect.objectContaining({
        screenOffBackoffMultiplier: 2
      })
    )
  })
})
