import { Platform, Dimensions } from "react-native";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export const Colors = {
  light: {
    text: "#0F172A",
    textSecondary: "#64748B",
    textTertiary: "#94A3B8",
    textDisabled: "#CBD5E1",
    buttonText: "#FFFFFF",
    
    tabIconDefault: "#94A3B8",
    tabIconSelected: "#3B82F6",
    
    link: "#3B82F6",
    
    primary: "#3B82F6",
    primaryLight: "#60A5FA",
    primaryDark: "#2563EB",
    primaryMuted: "rgba(59, 130, 246, 0.12)",
    
    accent: "#22C55E",
    accentLight: "#4ADE80",
    accentMuted: "rgba(34, 197, 94, 0.12)",
    
    success: "#22C55E",
    successLight: "#4ADE80",
    successMuted: "rgba(34, 197, 94, 0.12)",
    
    warning: "#F59E0B",
    warningLight: "#FBBF24",
    warningMuted: "rgba(245, 158, 11, 0.12)",
    
    error: "#EF4444",
    errorLight: "#F87171",
    errorMuted: "rgba(239, 68, 68, 0.12)",
    
    backgroundRoot: "#F1F5F9",
    backgroundDefault: "#F8FAFC",
    backgroundSecondary: "#E2E8F0",
    backgroundTertiary: "#CBD5E1",
    backgroundElevated: "#FFFFFF",
    
    border: "rgba(15, 23, 42, 0.08)",
    borderLight: "rgba(15, 23, 42, 0.04)",
    divider: "rgba(15, 23, 42, 0.06)",
    
    card: "#FFFFFF",
    cardElevated: "#FFFFFF",
    cardBorder: "rgba(15, 23, 42, 0.06)",
    
    safe: "#22C55E",
    safeLight: "rgba(34, 197, 94, 0.12)",
    
    overlay: "rgba(15, 23, 42, 0.5)",
    overlayLight: "rgba(15, 23, 42, 0.3)",
    
    shift: {
      planned: "#3B82F6",
      plannedBg: "rgba(59, 130, 246, 0.12)",
      active: "#F59E0B",
      activeBg: "rgba(245, 158, 11, 0.12)",
      completed: "#22C55E",
      completedBg: "rgba(34, 197, 94, 0.12)",
    },
    
    gradient: {
      primary: ["#3B82F6", "#8B5CF6"],
      success: ["#22C55E", "#10B981"],
      card: ["rgba(255, 255, 255, 1)", "rgba(248, 250, 252, 1)"],
    },
  },
  dark: {
    text: "#F8FAFC",
    textSecondary: "#94A3B8",
    textTertiary: "#64748B",
    textDisabled: "#475569",
    buttonText: "#FFFFFF",
    
    tabIconDefault: "#64748B",
    tabIconSelected: "#60A5FA",
    
    link: "#60A5FA",
    
    primary: "#60A5FA",
    primaryLight: "#93C5FD",
    primaryDark: "#3B82F6",
    primaryMuted: "rgba(96, 165, 250, 0.15)",
    
    accent: "#34D399",
    accentLight: "#6EE7B7",
    accentMuted: "rgba(52, 211, 153, 0.15)",
    
    success: "#34D399",
    successLight: "#6EE7B7",
    successMuted: "rgba(52, 211, 153, 0.15)",
    
    warning: "#FBBF24",
    warningLight: "#FCD34D",
    warningMuted: "rgba(251, 191, 36, 0.15)",
    
    error: "#F87171",
    errorLight: "#FCA5A5",
    errorMuted: "rgba(248, 113, 113, 0.15)",
    
    backgroundRoot: "#0B1220",
    backgroundDefault: "#111827",
    backgroundSecondary: "#1E293B",
    backgroundTertiary: "#334155",
    backgroundElevated: "#1E293B",
    
    border: "rgba(248, 250, 252, 0.08)",
    borderLight: "rgba(248, 250, 252, 0.04)",
    divider: "rgba(248, 250, 252, 0.06)",
    
    card: "#1E293B",
    cardElevated: "#334155",
    cardBorder: "rgba(248, 250, 252, 0.08)",
    
    safe: "#34D399",
    safeLight: "rgba(52, 211, 153, 0.15)",
    
    overlay: "rgba(0, 0, 0, 0.7)",
    overlayLight: "rgba(0, 0, 0, 0.5)",
    
    shift: {
      planned: "#60A5FA",
      plannedBg: "rgba(96, 165, 250, 0.15)",
      active: "#FBBF24",
      activeBg: "rgba(251, 191, 36, 0.15)",
      completed: "#34D399",
      completedBg: "rgba(52, 211, 153, 0.15)",
    },
    
    gradient: {
      primary: ["#60A5FA", "#A78BFA"],
      success: ["#34D399", "#10B981"],
      card: ["rgba(30, 41, 59, 1)", "rgba(17, 24, 39, 1)"],
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
  inputHeight: 56,
  buttonHeight: 56,
  fabSize: 64,
};

export const BorderRadius = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 22,
  "2xl": 28,
  full: 9999,
};

export const Typography = {
  hero: {
    fontSize: 48,
    fontWeight: "700" as const,
    letterSpacing: -1.5,
  },
  h1: {
    fontSize: 32,
    fontWeight: "700" as const,
    letterSpacing: -0.8,
  },
  h2: {
    fontSize: 24,
    fontWeight: "600" as const,
    letterSpacing: -0.5,
  },
  h3: {
    fontSize: 20,
    fontWeight: "600" as const,
    letterSpacing: -0.3,
  },
  h4: {
    fontSize: 17,
    fontWeight: "600" as const,
    letterSpacing: -0.2,
  },
  body: {
    fontSize: 16,
    fontWeight: "400" as const,
    lineHeight: 24,
  },
  bodyLarge: {
    fontSize: 18,
    fontWeight: "400" as const,
    lineHeight: 26,
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
    letterSpacing: 0.3,
  },
  link: {
    fontSize: 16,
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
  horizontalPadding: SCREEN_WIDTH < 375 ? 16 : 20,
  cardPadding: SCREEN_WIDTH < 375 ? 16 : 20,
};

export const Shadows = {
  sm: Platform.select({
    ios: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 3,
    },
    android: {
      elevation: 2,
    },
    default: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 3,
      elevation: 2,
    },
  }),
  md: Platform.select({
    ios: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
    },
    android: {
      elevation: 4,
    },
    default: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 4,
    },
  }),
  lg: Platform.select({
    ios: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
    },
    android: {
      elevation: 8,
    },
    default: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
      elevation: 8,
    },
  }),
  glow: (color: string) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
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

export const QUICK_AMOUNTS = [500, 1000, 2000, 5000];
