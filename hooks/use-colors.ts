import { getColors, type ColorScheme, type ThemeColorPalette } from "@/constants/theme";
import { useColorScheme } from "./use-color-scheme";
import { useThemeContext } from "@/lib/theme-provider";

/**
 * Returns the current theme's color palette based on palette + scheme.
 */
export function useColors(colorSchemeOverride?: ColorScheme): ThemeColorPalette {
  const colorSchema = useColorScheme();
  const scheme = (colorSchemeOverride ?? colorSchema ?? "light") as ColorScheme;

  try {
    const { palette } = useThemeContext();
    return getColors(palette, scheme);
  } catch {
    // Fallback if not inside ThemeProvider
    return getColors("apple", scheme);
  }
}
