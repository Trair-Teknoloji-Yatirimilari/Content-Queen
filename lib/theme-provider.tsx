import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Appearance, View, useColorScheme as useSystemColorScheme } from "react-native";
import { colorScheme as nativewindColorScheme, vars } from "nativewind";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { getSchemeColors, getColors, type ColorScheme, type ThemePalette } from "@/constants/theme";

type ThemeContextValue = {
  colorScheme: ColorScheme;
  palette: ThemePalette;
  setColorScheme: (scheme: ColorScheme) => void;
  setPalette: (palette: ThemePalette) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useSystemColorScheme() ?? "light";
  const [colorScheme, setColorSchemeState] = useState<ColorScheme>(systemScheme);
  const [palette, setPaletteState] = useState<ThemePalette>("classic");

  // Load saved palette on mount
  useEffect(() => {
    AsyncStorage.getItem("content_queen_palette").then((saved) => {
      if (saved === "classic" || saved === "rosegold" || saved === "lavender" || saved === "peach") {
        setPaletteState(saved);
      }
    });
    AsyncStorage.getItem("content_queen_theme").then((saved) => {
      if (saved === "light" || saved === "dark") {
        setColorSchemeState(saved);
        applyScheme(saved);
      }
    });
  }, []);

  const applyScheme = useCallback((scheme: ColorScheme) => {
    nativewindColorScheme.set(scheme);
    Appearance.setColorScheme?.(scheme);
    if (typeof document !== "undefined") {
      const root = document.documentElement;
      root.dataset.theme = scheme;
      root.classList.toggle("dark", scheme === "dark");
      const colors = getSchemeColors(palette, scheme);
      Object.entries(colors).forEach(([token, value]) => {
        root.style.setProperty(`--color-${token}`, value);
      });
    }
  }, [palette]);

  const setColorScheme = useCallback((scheme: ColorScheme) => {
    setColorSchemeState(scheme);
    applyScheme(scheme);
  }, [applyScheme]);

  const setPalette = useCallback((newPalette: ThemePalette) => {
    setPaletteState(newPalette);
    AsyncStorage.setItem("content_queen_palette", newPalette);
    // Re-apply scheme with new palette
    if (typeof document !== "undefined") {
      const root = document.documentElement;
      const colors = getSchemeColors(newPalette, colorScheme);
      Object.entries(colors).forEach(([token, value]) => {
        root.style.setProperty(`--color-${token}`, value);
      });
    }
  }, [colorScheme]);

  useEffect(() => {
    applyScheme(colorScheme);
  }, [applyScheme, colorScheme]);

  const schemeColors = useMemo(() => getSchemeColors(palette, colorScheme), [palette, colorScheme]);

  const themeVariables = useMemo(
    () =>
      vars({
        "color-primary": schemeColors.primary,
        "color-background": schemeColors.background,
        "color-surface": schemeColors.surface,
        "color-foreground": schemeColors.foreground,
        "color-muted": schemeColors.muted,
        "color-border": schemeColors.border,
        "color-success": schemeColors.success,
        "color-warning": schemeColors.warning,
        "color-error": schemeColors.error,
      }),
    [schemeColors],
  );

  const value = useMemo(
    () => ({
      colorScheme,
      palette,
      setColorScheme,
      setPalette,
    }),
    [colorScheme, palette, setColorScheme, setPalette],
  );

  return (
    <ThemeContext.Provider value={value}>
      <View style={[{ flex: 1 }, themeVariables]}>{children}</View>
    </ThemeContext.Provider>
  );
}

export function useThemeContext(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useThemeContext must be used within ThemeProvider");
  }
  return ctx;
}
