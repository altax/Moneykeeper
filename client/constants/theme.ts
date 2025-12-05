import { Platform } from "react-native";

export const Colors = {
  light: {
    text: "#FFFFFF",
    textSecondary: "#B0B0B0",
    textDisabled: "#707070",
    buttonText: "#FFFFFF",
    tabIconDefault: "#707070",
    tabIconSelected: "#6C63FF",
    link: "#6C63FF",
    primary: "#6C63FF",
    primaryLight: "#8C84FF",
    success: "#4CAF50",
    warning: "#FFA726",
    error: "#EF5350",
    backgroundRoot: "#0F0F0F",
    backgroundDefault: "#1A1A1A",
    backgroundSecondary: "#242424",
    backgroundTertiary: "#2A2A2A",
    border: "#2A2A2A",
    divider: "#1F1F1F",
  },
  dark: {
    text: "#FFFFFF",
    textSecondary: "#B0B0B0",
    textDisabled: "#707070",
    buttonText: "#FFFFFF",
    tabIconDefault: "#707070",
    tabIconSelected: "#6C63FF",
    link: "#6C63FF",
    primary: "#6C63FF",
    primaryLight: "#8C84FF",
    success: "#4CAF50",
    warning: "#FFA726",
    error: "#EF5350",
    backgroundRoot: "#0F0F0F",
    backgroundDefault: "#1A1A1A",
    backgroundSecondary: "#242424",
    backgroundTertiary: "#2A2A2A",
    border: "#2A2A2A",
    divider: "#1F1F1F",
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  inputHeight: 56,
  buttonHeight: 56,
  fabSize: 56,
};

export const BorderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  "2xl": 28,
  full: 9999,
};

export const Typography = {
  hero: {
    fontSize: 48,
    fontWeight: "700" as const,
  },
  h1: {
    fontSize: 32,
    fontWeight: "700" as const,
  },
  h2: {
    fontSize: 24,
    fontWeight: "600" as const,
  },
  h3: {
    fontSize: 20,
    fontWeight: "600" as const,
  },
  h4: {
    fontSize: 18,
    fontWeight: "600" as const,
  },
  body: {
    fontSize: 16,
    fontWeight: "400" as const,
  },
  bodyLarge: {
    fontSize: 18,
    fontWeight: "400" as const,
  },
  small: {
    fontSize: 14,
    fontWeight: "400" as const,
  },
  caption: {
    fontSize: 12,
    fontWeight: "400" as const,
  },
  link: {
    fontSize: 16,
    fontWeight: "400" as const,
  },
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
    rounded:
      "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
