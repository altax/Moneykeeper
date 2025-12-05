import { Platform, Dimensions } from "react-native";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export const Colors = {
  light: {
    text: "#1A1A1A",
    textSecondary: "#6B6B6B",
    textTertiary: "#999999",
    textDisabled: "#CCCCCC",
    buttonText: "#FFFFFF",
    
    tabIconDefault: "#999999",
    tabIconSelected: "#1A1A1A",
    
    link: "#1A1A1A",
    
    primary: "#1A1A1A",
    primaryLight: "#333333",
    primaryDark: "#000000",
    primaryMuted: "rgba(26, 26, 26, 0.08)",
    
    accent: "#B8A88A",
    accentLight: "#D4C4A8",
    accentMuted: "rgba(184, 168, 138, 0.15)",
    
    success: "#2D8A4E",
    successLight: "#4AA366",
    successMuted: "rgba(45, 138, 78, 0.10)",
    
    warning: "#C4841D",
    warningLight: "#E09B32",
    warningMuted: "rgba(196, 132, 29, 0.10)",
    
    error: "#C44536",
    errorLight: "#D65A4A",
    errorMuted: "rgba(196, 69, 54, 0.10)",
    
    backgroundRoot: "#FAFAFA",
    backgroundDefault: "#FFFFFF",
    backgroundSecondary: "#F5F5F5",
    backgroundTertiary: "#EBEBEB",
    backgroundElevated: "#FFFFFF",
    
    border: "rgba(0, 0, 0, 0.08)",
    borderLight: "rgba(0, 0, 0, 0.04)",
    divider: "rgba(0, 0, 0, 0.06)",
    
    card: "#FFFFFF",
    cardElevated: "#FFFFFF",
    cardBorder: "rgba(0, 0, 0, 0.06)",
    
    safe: "#2D8A4E",
    safeLight: "rgba(45, 138, 78, 0.10)",
    
    overlay: "rgba(0, 0, 0, 0.5)",
    overlayLight: "rgba(0, 0, 0, 0.3)",
    
    shift: {
      planned: "#1A1A1A",
      plannedBg: "rgba(26, 26, 26, 0.06)",
      active: "#C4841D",
      activeBg: "rgba(196, 132, 29, 0.10)",
      completed: "#2D8A4E",
      completedBg: "rgba(45, 138, 78, 0.10)",
    },
    
    gradient: {
      primary: ["#1A1A1A", "#333333"],
      success: ["#2D8A4E", "#3D9A5E"],
      card: ["#FFFFFF", "#FAFAFA"],
    },
  },
  dark: {
    text: "#FAFAFA",
    textSecondary: "#A0A0A0",
    textTertiary: "#707070",
    textDisabled: "#505050",
    buttonText: "#0A0A0A",
    
    tabIconDefault: "#606060",
    tabIconSelected: "#FAFAFA",
    
    link: "#FAFAFA",
    
    primary: "#FAFAFA",
    primaryLight: "#FFFFFF",
    primaryDark: "#E0E0E0",
    primaryMuted: "rgba(250, 250, 250, 0.08)",
    
    accent: "#C9B896",
    accentLight: "#DDD0B8",
    accentMuted: "rgba(201, 184, 150, 0.12)",
    
    success: "#4CAF7A",
    successLight: "#6BC294",
    successMuted: "rgba(76, 175, 122, 0.12)",
    
    warning: "#E0A840",
    warningLight: "#EBB960",
    warningMuted: "rgba(224, 168, 64, 0.12)",
    
    error: "#E05545",
    errorLight: "#E87065",
    errorMuted: "rgba(224, 85, 69, 0.12)",
    
    backgroundRoot: "#0A0A0A",
    backgroundDefault: "#0F0F0F",
    backgroundSecondary: "#1A1A1A",
    backgroundTertiary: "#252525",
    backgroundElevated: "#1A1A1A",
    
    border: "rgba(255, 255, 255, 0.08)",
    borderLight: "rgba(255, 255, 255, 0.04)",
    divider: "rgba(255, 255, 255, 0.06)",
    
    card: "#1A1A1A",
    cardElevated: "#252525",
    cardBorder: "rgba(255, 255, 255, 0.06)",
    
    safe: "#4CAF7A",
    safeLight: "rgba(76, 175, 122, 0.12)",
    
    overlay: "rgba(0, 0, 0, 0.8)",
    overlayLight: "rgba(0, 0, 0, 0.6)",
    
    shift: {
      planned: "#FAFAFA",
      plannedBg: "rgba(250, 250, 250, 0.06)",
      active: "#E0A840",
      activeBg: "rgba(224, 168, 64, 0.10)",
      completed: "#4CAF7A",
      completedBg: "rgba(76, 175, 122, 0.10)",
    },
    
    gradient: {
      primary: ["#FAFAFA", "#E0E0E0"],
      success: ["#4CAF7A", "#5CBF8A"],
      card: ["#1A1A1A", "#0F0F0F"],
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
  listItemHeight: 72,
  sectionGap: 40,
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
    fontSize: 56,
    fontWeight: "300" as const,
    letterSpacing: -2,
    lineHeight: 64,
  },
  h1: {
    fontSize: 34,
    fontWeight: "300" as const,
    letterSpacing: -0.5,
    lineHeight: 42,
  },
  h2: {
    fontSize: 28,
    fontWeight: "400" as const,
    letterSpacing: -0.3,
    lineHeight: 36,
  },
  h3: {
    fontSize: 22,
    fontWeight: "500" as const,
    letterSpacing: 0,
    lineHeight: 28,
  },
  h4: {
    fontSize: 18,
    fontWeight: "500" as const,
    letterSpacing: 0,
    lineHeight: 24,
  },
  body: {
    fontSize: 16,
    fontWeight: "400" as const,
    lineHeight: 24,
    letterSpacing: 0,
  },
  bodyLarge: {
    fontSize: 17,
    fontWeight: "400" as const,
    lineHeight: 24,
  },
  small: {
    fontSize: 14,
    fontWeight: "400" as const,
    lineHeight: 20,
  },
  caption: {
    fontSize: 12,
    fontWeight: "500" as const,
    lineHeight: 16,
    letterSpacing: 0.5,
    textTransform: "uppercase" as const,
  },
  link: {
    fontSize: 16,
    fontWeight: "500" as const,
  },
  amount: {
    fontSize: 32,
    fontWeight: "300" as const,
    letterSpacing: -0.5,
    lineHeight: 40,
  },
  amountLarge: {
    fontSize: 44,
    fontWeight: "200" as const,
    letterSpacing: -1,
    lineHeight: 52,
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
    sans: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', system-ui, sans-serif",
    mono: "'SF Mono', SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  },
});

export const Responsive = {
  isSmallScreen: SCREEN_WIDTH < 375,
  isMediumScreen: SCREEN_WIDTH >= 375 && SCREEN_WIDTH < 414,
  isLargeScreen: SCREEN_WIDTH >= 414,
  screenWidth: SCREEN_WIDTH,
  screenHeight: SCREEN_HEIGHT,
  horizontalPadding: 20,
  cardPadding: 20,
};

export const Shadows = {
  none: {},
  sm: Platform.select({
    ios: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 2,
    },
    android: {
      elevation: 1,
    },
    default: {},
  }),
  md: Platform.select({
    ios: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 4,
    },
    android: {
      elevation: 2,
    },
    default: {},
  }),
  lg: Platform.select({
    ios: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
    },
    android: {
      elevation: 4,
    },
    default: {},
  }),
  glow: (color: string) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 0,
  }),
};

export const GOAL_ICONS = [
  { name: "laptop", label: "Техника" },
  { name: "cellphone", label: "Телефон" },
  { name: "car", label: "Автомобиль" },
  { name: "home", label: "Недвижимость" },
  { name: "airplane", label: "Путешествие" },
  { name: "school", label: "Образование" },
  { name: "medical-bag", label: "Здоровье" },
  { name: "dumbbell", label: "Спорт" },
  { name: "tshirt-crew", label: "Одежда" },
  { name: "gift", label: "Подарок" },
  { name: "bike", label: "Велосипед" },
  { name: "gamepad-variant", label: "Развлечения" },
  { name: "camera", label: "Камера" },
  { name: "headphones", label: "Наушники" },
  { name: "watch", label: "Часы" },
  { name: "sofa", label: "Мебель" },
  { name: "television", label: "Телевизор" },
  { name: "baby-carriage", label: "Ребёнок" },
  { name: "paw", label: "Питомец" },
  { name: "cash", label: "Резерв" },
  { name: "target", label: "Другое" },
];

export const QUICK_AMOUNTS = [1000, 2000, 5000, 10000];
