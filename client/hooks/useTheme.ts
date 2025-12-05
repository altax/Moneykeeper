import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/useColorScheme";

type ThemeColors = (typeof Colors)["dark"];

export function useTheme(): { theme: ThemeColors; isDark: boolean } {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark" || colorScheme === null;
  const theme = Colors[isDark ? "dark" : "light"];

  return {
    theme,
    isDark,
  };
}
