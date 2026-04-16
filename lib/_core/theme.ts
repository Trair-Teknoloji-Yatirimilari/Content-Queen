import { Platform } from "react-native";

import themeConfig from "@/theme.config";

export type ColorScheme = "light" | "dark";
export type ThemePalette = "classic" | "apple" | "rosegold" | "lavender" | "peach";

export const ThemeColors = themeConfig.themeColors;

type ColorTokenName = "primary" | "background" | "surface" | "foreground" | "muted" | "border" | "success" | "warning" | "error";

type SchemeColorMap = Record<ColorTokenName, string>;

function buildSchemeColors(palette: ThemePalette, scheme: ColorScheme): SchemeColorMap {
  const paletteColors = ThemeColors[palette];
  const result = {} as SchemeColorMap;
  for (const key of Object.keys(paletteColors) as ColorTokenName[]) {
    result[key] = paletteColors[key][scheme];
  }
  return result;
}

export const SchemeColors: Record<string, SchemeColorMap> = {
  light: buildSchemeColors("apple", "light"),
  dark: buildSchemeColors("apple", "dark"),
};

// Build for all palette + scheme combos
export function getSchemeColors(palette: ThemePalette, scheme: ColorScheme): SchemeColorMap {
  return buildSchemeColors(palette, scheme);
}

type RuntimePalette = SchemeColorMap & {
  text: string;
  background: string;
  tint: string;
  icon: string;
  tabIconDefault: string;
  tabIconSelected: string;
  border: string;
};

function buildRuntimePalette(base: SchemeColorMap): RuntimePalette {
  return {
    ...base,
    text: base.foreground,
    background: base.background,
    tint: base.primary,
    icon: base.muted,
    tabIconDefault: base.muted,
    tabIconSelected: base.primary,
    border: base.border,
  };
}

export const Colors = {
  light: buildRuntimePalette(SchemeColors.light),
  dark: buildRuntimePalette(SchemeColors.dark),
} satisfies Record<ColorScheme, RuntimePalette>;

export function getColors(palette: ThemePalette, scheme: ColorScheme): RuntimePalette {
  return buildRuntimePalette(getSchemeColors(palette, scheme));
}

export type ThemeColorPalette = RuntimePalette;

export const PALETTE_LABELS: Record<ThemePalette, string> = {
  classic: "Klasik Pembe",
  apple: "Profesyonel",
  rosegold: "Gold",
  lavender: "Lavanta",
  peach: "Şeftali",
};

export const Fonts = Platform.select({
  ios: {
    sans: "system-ui",
    serif: "ui-serif",
    rounded: "ui-rounded",
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
