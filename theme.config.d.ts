type ColorSwatch = { light: string; dark: string };

type PaletteColors = {
  primary: ColorSwatch;
  background: ColorSwatch;
  surface: ColorSwatch;
  foreground: ColorSwatch;
  muted: ColorSwatch;
  border: ColorSwatch;
  success: ColorSwatch;
  warning: ColorSwatch;
  error: ColorSwatch;
};

export const themeColors: {
  classic: PaletteColors;
  apple: PaletteColors;
  rosegold: PaletteColors;
  lavender: PaletteColors;
  peach: PaletteColors;
};

declare const themeConfig: {
  themeColors: typeof themeColors;
};

export default themeConfig;
