import { Platform, Dimensions } from "react-native";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export const Colors = {
  light: {
    text: "#F5F5F7",
    textSecondary: "rgba(245, 245, 247, 0.65)",
    textTertiary: "rgba(245, 245, 247, 0.45)",
    textDisabled: "rgba(245, 245, 247, 0.30)",
    buttonText: "#F5F5F7",
    
    tabIconDefault: "rgba(245, 245, 247, 0.45)",
    tabIconSelected: "#F5F5F7",
    
    link: "#7EB8DA",
    
    primary: "#7EB8DA",
    primaryLight: "#A3CDEA",
    primaryDark: "#5A9BC4",
    primaryMuted: "rgba(126, 184, 218, 0.15)",
    
    accent: "#9B8FD4",
    accentLight: "#B8AFDF",
    accentMuted: "rgba(155, 143, 212, 0.15)",
    
    success: "#7ECBA1",
    successLight: "#9FD9BA",
    successMuted: "rgba(126, 203, 161, 0.15)",
    
    warning: "#E5C07A",
    warningMuted: "rgba(229, 192, 122, 0.15)",
    
    error: "#D99393",
    errorMuted: "rgba(217, 147, 147, 0.15)",
    
    backgroundRoot: "#16171D",
    backgroundDefault: "#1A1B23",
    backgroundSecondary: "#22232D",
    backgroundTertiary: "#2A2B37",
    backgroundElevated: "#252631",
    
    border: "rgba(245, 245, 247, 0.08)",
    borderLight: "rgba(245, 245, 247, 0.04)",
    divider: "rgba(245, 245, 247, 0.06)",
    
    card: "#1E1F28",
    cardElevated: "#24252F",
    cardBorder: "rgba(245, 245, 247, 0.06)",
    
    safe: "#7ECBA1",
    safeLight: "rgba(126, 203, 161, 0.12)",
    
    overlay: "rgba(22, 23, 29, 0.85)",
    overlayLight: "rgba(22, 23, 29, 0.65)",
    
    shift: {
      planned: "#7EB8DA",
      plannedBg: "rgba(126, 184, 218, 0.12)",
      active: "#E5C07A",
      activeBg: "rgba(229, 192, 122, 0.12)",
      completed: "#7ECBA1",
      completedBg: "rgba(126, 203, 161, 0.12)",
    },
    
    gradient: {
      primary: ["#7EB8DA", "#9B8FD4"],
      success: ["#7ECBA1", "#9FD9BA"],
      card: ["rgba(245, 245, 247, 0.03)", "rgba(245, 245, 247, 0.01)"],
    },
  },
  dark: {
    text: "#F5F5F7",
    textSecondary: "rgba(245, 245, 247, 0.65)",
    textTertiary: "rgba(245, 245, 247, 0.45)",
    textDisabled: "rgba(245, 245, 247, 0.30)",
    buttonText: "#F5F5F7",
    
    tabIconDefault: "rgba(245, 245, 247, 0.45)",
    tabIconSelected: "#F5F5F7",
    
    link: "#7EB8DA",
    
    primary: "#7EB8DA",
    primaryLight: "#A3CDEA",
    primaryDark: "#5A9BC4",
    primaryMuted: "rgba(126, 184, 218, 0.15)",
    
    accent: "#9B8FD4",
    accentLight: "#B8AFDF",
    accentMuted: "rgba(155, 143, 212, 0.15)",
    
    success: "#7ECBA1",
    successLight: "#9FD9BA",
    successMuted: "rgba(126, 203, 161, 0.15)",
    
    warning: "#E5C07A",
    warningMuted: "rgba(229, 192, 122, 0.15)",
    
    error: "#D99393",
    errorMuted: "rgba(217, 147, 147, 0.15)",
    
    backgroundRoot: "#16171D",
    backgroundDefault: "#1A1B23",
    backgroundSecondary: "#22232D",
    backgroundTertiary: "#2A2B37",
    backgroundElevated: "#252631",
    
    border: "rgba(245, 245, 247, 0.08)",
    borderLight: "rgba(245, 245, 247, 0.04)",
    divider: "rgba(245, 245, 247, 0.06)",
    
    card: "#1E1F28",
    cardElevated: "#24252F",
    cardBorder: "rgba(245, 245, 247, 0.06)",
    
    safe: "#7ECBA1",
    safeLight: "rgba(126, 203, 161, 0.12)",
    
    overlay: "rgba(22, 23, 29, 0.85)",
    overlayLight: "rgba(22, 23, 29, 0.65)",
    
    shift: {
      planned: "#7EB8DA",
      plannedBg: "rgba(126, 184, 218, 0.12)",
      active: "#E5C07A",
      activeBg: "rgba(229, 192, 122, 0.12)",
      completed: "#7ECBA1",
      completedBg: "rgba(126, 203, 161, 0.12)",
    },
    
    gradient: {
      primary: ["#7EB8DA", "#9B8FD4"],
      success: ["#7ECBA1", "#9FD9BA"],
      card: ["rgba(245, 245, 247, 0.03)", "rgba(245, 245, 247, 0.01)"],
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
