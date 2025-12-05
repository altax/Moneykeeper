import { Platform, Dimensions } from "react-native";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export const Colors = {
  light: {
    text: "#FFFFFF",
    textSecondary: "rgba(255, 255, 255, 0.6)",
    textTertiary: "rgba(255, 255, 255, 0.4)",
    textDisabled: "rgba(255, 255, 255, 0.3)",
    buttonText: "#FFFFFF",
    
    tabIconDefault: "rgba(255, 255, 255, 0.4)",
    tabIconSelected: "#FFFFFF",
    
    link: "#60A5FA",
    
    primary: "#60A5FA",
    primaryLight: "#93C5FD",
    primaryDark: "#3B82F6",
    primaryMuted: "rgba(96, 165, 250, 0.15)",
    
    accent: "#818CF8",
    accentLight: "#A5B4FC",
    accentMuted: "rgba(129, 140, 248, 0.15)",
    
    success: "#34D399",
    successLight: "#6EE7B7",
    successMuted: "rgba(52, 211, 153, 0.15)",
    
    warning: "#FBBF24",
    warningMuted: "rgba(251, 191, 36, 0.15)",
    
    error: "#F87171",
    errorMuted: "rgba(248, 113, 113, 0.15)",
    
    backgroundRoot: "#0A0A0F",
    backgroundDefault: "#12121A",
    backgroundSecondary: "#1A1A24",
    backgroundTertiary: "#22222E",
    backgroundElevated: "#1E1E2A",
    
    border: "rgba(255, 255, 255, 0.08)",
    borderLight: "rgba(255, 255, 255, 0.04)",
    divider: "rgba(255, 255, 255, 0.06)",
    
    card: "#16161F",
    cardElevated: "#1C1C26",
    cardBorder: "rgba(255, 255, 255, 0.06)",
    
    safe: "#34D399",
    safeLight: "rgba(52, 211, 153, 0.12)",
    
    overlay: "rgba(0, 0, 0, 0.8)",
    overlayLight: "rgba(0, 0, 0, 0.6)",
    
    gradient: {
      primary: ["#60A5FA", "#818CF8"],
      success: ["#34D399", "#6EE7B7"],
      card: ["rgba(255, 255, 255, 0.03)", "rgba(255, 255, 255, 0.01)"],
    },
  },
  dark: {
    text: "#FFFFFF",
    textSecondary: "rgba(255, 255, 255, 0.6)",
    textTertiary: "rgba(255, 255, 255, 0.4)",
    textDisabled: "rgba(255, 255, 255, 0.3)",
    buttonText: "#FFFFFF",
    
    tabIconDefault: "rgba(255, 255, 255, 0.4)",
    tabIconSelected: "#FFFFFF",
    
    link: "#60A5FA",
    
    primary: "#60A5FA",
    primaryLight: "#93C5FD",
    primaryDark: "#3B82F6",
    primaryMuted: "rgba(96, 165, 250, 0.15)",
    
    accent: "#818CF8",
    accentLight: "#A5B4FC",
    accentMuted: "rgba(129, 140, 248, 0.15)",
    
    success: "#34D399",
    successLight: "#6EE7B7",
    successMuted: "rgba(52, 211, 153, 0.15)",
    
    warning: "#FBBF24",
    warningMuted: "rgba(251, 191, 36, 0.15)",
    
    error: "#F87171",
    errorMuted: "rgba(248, 113, 113, 0.15)",
    
    backgroundRoot: "#0A0A0F",
    backgroundDefault: "#12121A",
    backgroundSecondary: "#1A1A24",
    backgroundTertiary: "#22222E",
    backgroundElevated: "#1E1E2A",
    
    border: "rgba(255, 255, 255, 0.08)",
    borderLight: "rgba(255, 255, 255, 0.04)",
    divider: "rgba(255, 255, 255, 0.06)",
    
    card: "#16161F",
    cardElevated: "#1C1C26",
    cardBorder: "rgba(255, 255, 255, 0.06)",
    
    safe: "#34D399",
    safeLight: "rgba(52, 211, 153, 0.12)",
    
    overlay: "rgba(0, 0, 0, 0.8)",
    overlayLight: "rgba(0, 0, 0, 0.6)",
    
    gradient: {
      primary: ["#60A5FA", "#818CF8"],
      success: ["#34D399", "#6EE7B7"],
      card: ["rgba(255, 255, 255, 0.03)", "rgba(255, 255, 255, 0.01)"],
    },
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  inputHeight: 52,
  buttonHeight: 52,
  fabSize: 56,
};

export const BorderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  full: 9999,
};

export const Typography = {
  hero: {
    fontSize: 40,
    fontWeight: "700" as const,
    letterSpacing: -1,
  },
  h1: {
    fontSize: 28,
    fontWeight: "700" as const,
    letterSpacing: -0.5,
  },
  h2: {
    fontSize: 22,
    fontWeight: "600" as const,
    letterSpacing: -0.3,
  },
  h3: {
    fontSize: 18,
    fontWeight: "600" as const,
    letterSpacing: -0.2,
  },
  h4: {
    fontSize: 16,
    fontWeight: "600" as const,
  },
  body: {
    fontSize: 15,
    fontWeight: "400" as const,
    lineHeight: 22,
  },
  bodyLarge: {
    fontSize: 17,
    fontWeight: "400" as const,
    lineHeight: 24,
  },
  small: {
    fontSize: 13,
    fontWeight: "400" as const,
    lineHeight: 18,
  },
  caption: {
    fontSize: 12,
    fontWeight: "400" as const,
    lineHeight: 16,
  },
  link: {
    fontSize: 15,
    fontWeight: "500" as const,
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

export const Responsive = {
  isSmallScreen: SCREEN_WIDTH < 375,
  isMediumScreen: SCREEN_WIDTH >= 375 && SCREEN_WIDTH < 414,
  isLargeScreen: SCREEN_WIDTH >= 414,
  screenWidth: SCREEN_WIDTH,
  screenHeight: SCREEN_HEIGHT,
  horizontalPadding: SCREEN_WIDTH < 375 ? 12 : 16,
  cardPadding: SCREEN_WIDTH < 375 ? 12 : 16,
};

export const Shadows = {
  sm: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  lg: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  glow: (color: string) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 0,
  }),
};

export const GOAL_ICONS = [
  { name: "laptop", label: "Компьютер" },
  { name: "cellphone", label: "Телефон" },
  { name: "car", label: "Машина" },
  { name: "home", label: "Дом" },
  { name: "airplane", label: "Путешествие" },
  { name: "school", label: "Образование" },
  { name: "medical-bag", label: "Здоровье" },
  { name: "dumbbell", label: "Спорт" },
  { name: "tshirt-crew", label: "Одежда" },
  { name: "gift", label: "Подарок" },
  { name: "bike", label: "Велосипед" },
  { name: "gamepad-variant", label: "Игры" },
  { name: "camera", label: "Камера" },
  { name: "headphones", label: "Наушники" },
  { name: "watch", label: "Часы" },
  { name: "sofa", label: "Мебель" },
  { name: "television", label: "Телевизор" },
  { name: "baby-carriage", label: "Ребёнок" },
  { name: "paw", label: "Питомец" },
  { name: "cash", label: "Накопления" },
  { name: "target", label: "Другое" },
];
