import { Platform } from "react-native";

export const Colors = {
  light: {
    text: "#1A1A1A",
    textSecondary: "#6B7280",
    textDisabled: "#9CA3AF",
    buttonText: "#FFFFFF",
    tabIconDefault: "#9CA3AF",
    tabIconSelected: "#005BFF",
    link: "#005BFF",
    primary: "#005BFF",
    primaryLight: "#3B82F6",
    success: "#10B981",
    warning: "#F59E0B",
    error: "#EF4444",
    backgroundRoot: "#FFFFFF",
    backgroundDefault: "#F9FAFB",
    backgroundSecondary: "#F3F4F6",
    backgroundTertiary: "#E5E7EB",
    border: "#E5E7EB",
    divider: "#F3F4F6",
    card: "#FFFFFF",
    safe: "#10B981",
    safeLight: "#D1FAE5",
  },
  dark: {
    text: "#1A1A1A",
    textSecondary: "#6B7280",
    textDisabled: "#9CA3AF",
    buttonText: "#FFFFFF",
    tabIconDefault: "#9CA3AF",
    tabIconSelected: "#005BFF",
    link: "#005BFF",
    primary: "#005BFF",
    primaryLight: "#3B82F6",
    success: "#10B981",
    warning: "#F59E0B",
    error: "#EF4444",
    backgroundRoot: "#FFFFFF",
    backgroundDefault: "#F9FAFB",
    backgroundSecondary: "#F3F4F6",
    backgroundTertiary: "#E5E7EB",
    border: "#E5E7EB",
    divider: "#F3F4F6",
    card: "#FFFFFF",
    safe: "#10B981",
    safeLight: "#D1FAE5",
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
