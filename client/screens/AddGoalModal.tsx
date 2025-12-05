import React, { useState, useEffect, useLayoutEffect, useCallback } from "react";
import { StyleSheet, View, TextInput, Alert, Pressable, ScrollView } from "react-native";
import { useNavigation, useRoute, RouteProp, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { HeaderButton } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, GOAL_ICONS } from "@/constants/theme";
import { storage } from "@/lib/storage";
import { Goal, AppSettings } from "@/lib/types";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteType = RouteProp<RootStackParamList, "AddGoal">;

export default function AddGoalModal() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteType>();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const goalId = route.params?.goalId;
  const isEditing = !!goalId;

  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [selectedIcon, setSelectedIcon] = useState("target");
  const [existingGoal, setExistingGoal] = useState<Goal | null>(null);
  const [nameError, setNameError] = useState("");
  const [settings, setSettings] = useState<AppSettings | null>(null);

  useEffect(() => {
    if (isEditing) {
      loadGoal();
    }
  }, [goalId]);

  useFocusEffect(
    useCallback(() => {
      const loadSettings = async () => {
        const appSettings = await storage.getSettings();
        setSettings(appSettings);
      };
      loadSettings();
    }, [])
  );

  const loadGoal = async () => {
    const goals = await storage.getGoals();
    const goal = goals.find((g) => g.id === goalId);
    if (goal) {
      setExistingGoal(goal);
      setName(goal.name);
      setTargetAmount(goal.targetAmount.toString());
      setSelectedIcon(goal.icon || "target");
    }
  };

  const checkDuplicateName = async (goalName: string): Promise<boolean> => {
    const goals = await storage.getActiveGoals();
    const trimmedName = goalName.trim().toLowerCase();
    
    return goals.some((g) => {
      if (isEditing && g.id === goalId) return false;
      return g.name.trim().toLowerCase() === trimmedName;
    });
  };

  const handleNameChange = (text: string) => {
    setName(text);
    if (nameError) setNameError("");
  };

  const handleSave = async () => {
    const trimmedName = name.trim();
    
    if (!trimmedName) {
      Alert.alert("Ошибка", "Введите название цели");
      return;
    }

    const isDuplicate = await checkDuplicateName(trimmedName);
    if (isDuplicate) {
      setNameError("Цель с таким названием уже существует");
      Alert.alert(
        "Название занято",
        "Цель с таким названием уже существует. Пожалуйста, выберите другое название.",
        [{ text: "Понятно", style: "default" }]
      );
      return;
    }

    const amount = parseFloat(targetAmount.replace(/[^\d.]/g, ""));
    if (isNaN(amount) || amount <= 0) {
      Alert.alert("Ошибка", "Введите корректную сумму");
      return;
    }

    try {
      if (isEditing && existingGoal) {
        await storage.updateGoal(goalId!, {
          name: trimmedName,
          targetAmount: amount,
          icon: selectedIcon,
        });
      } else {
        await storage.addGoal({
          name: trimmedName,
          targetAmount: amount,
          icon: selectedIcon,
        });
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.goBack();
    } catch (error) {
      Alert.alert("Ошибка", "Не удалось сохранить цель");
    }
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: isEditing ? "Редактировать цель" : "Новая цель",
      headerLeft: () => (
        <HeaderButton onPress={() => navigation.goBack()}>
          <ThemedText type="body">Отмена</ThemedText>
        </HeaderButton>
      ),
      headerRight: () => (
        <HeaderButton onPress={handleSave}>
          <ThemedText type="body" style={[styles.saveText, { color: theme.primary }]}>
            Сохранить
          </ThemedText>
        </HeaderButton>
      ),
    });
  }, [navigation, name, targetAmount, isEditing, selectedIcon, theme]);

  const formatAmount = (text: string) => {
    const cleaned = text.replace(/[^\d]/g, "");
    if (!cleaned) {
      setTargetAmount("");
      return;
    }
    const number = parseInt(cleaned, 10);
    setTargetAmount(number.toLocaleString("ru-RU"));
  };

  const handleIconSelect = (iconName: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedIcon(iconName);
  };

  const estimatedDays = () => {
    const amount = parseFloat(targetAmount.replace(/[^\d.]/g, "")) || 0;
    if (amount <= 0) return null;
    const avgDaily = settings?.averageDailyEarning || 0;
    if (avgDaily <= 0) return null;
    return Math.ceil(amount / avgDaily);
  };

  const days = estimatedDays();

  return (
    <ThemedView style={styles.container}>
      <KeyboardAwareScrollViewCompat
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: Spacing.xl,
            paddingBottom: insets.bottom + Spacing.lg,
          },
        ]}
      >
        <View style={styles.inputGroup}>
          <ThemedText type="caption" secondary style={styles.label}>
            НАЗВАНИЕ ЦЕЛИ
          </ThemedText>
          <TextInput
            style={[
              styles.input,
              { 
                backgroundColor: theme.card,
                color: theme.text,
                borderColor: nameError ? theme.error : theme.border,
              },
            ]}
            value={name}
            onChangeText={handleNameChange}
            placeholder="Например: Новый iPhone"
            placeholderTextColor={theme.textTertiary}
            autoFocus
            returnKeyType="next"
            maxLength={50}
          />
          {nameError ? (
            <ThemedText type="small" style={{ color: theme.error, marginTop: Spacing.xs }}>
              {nameError}
            </ThemedText>
          ) : null}
        </View>

        <View style={styles.inputGroup}>
          <ThemedText type="caption" secondary style={styles.label}>
            СУММА ЦЕЛИ
          </ThemedText>
          <View style={[
            styles.amountInputContainer,
            { backgroundColor: theme.card, borderColor: theme.border }
          ]}>
            <TextInput
              style={[styles.amountInput, { color: theme.text }]}
              value={targetAmount}
              onChangeText={formatAmount}
              placeholder="0"
              placeholderTextColor={theme.textTertiary}
              keyboardType="numeric"
              returnKeyType="done"
            />
            <ThemedText type="h3" secondary style={styles.currency}>
              ₽
            </ThemedText>
          </View>
          {days !== null && days > 0 && (
            <View style={[styles.estimateRow, { backgroundColor: theme.backgroundSecondary }]}>
              <MaterialCommunityIcons
                name="clock-outline"
                size={16}
                color={theme.textSecondary}
              />
              <ThemedText type="small" secondary style={{ marginLeft: Spacing.xs }}>
                Примерно {days} {getDaysWord(days)} при среднем заработке
              </ThemedText>
            </View>
          )}
        </View>

        <View style={styles.inputGroup}>
          <ThemedText type="caption" secondary style={styles.label}>
            ИКОНКА ЦЕЛИ
          </ThemedText>
          <View style={styles.iconsGrid}>
            {GOAL_ICONS.map((icon) => (
              <Pressable
                key={icon.name}
                style={[
                  styles.iconButton,
                  { 
                    backgroundColor: theme.card,
                    borderColor: selectedIcon === icon.name ? theme.primary : "transparent",
                  },
                  selectedIcon === icon.name && { backgroundColor: theme.primaryMuted },
                ]}
                onPress={() => handleIconSelect(icon.name)}
              >
                <MaterialCommunityIcons
                  name={icon.name as any}
                  size={28}
                  color={selectedIcon === icon.name ? theme.primary : theme.textSecondary}
                />
              </Pressable>
            ))}
          </View>
        </View>

        <View style={[styles.tipContainer, { backgroundColor: theme.backgroundSecondary }]}>
          <MaterialCommunityIcons
            name="lightbulb-outline"
            size={20}
            color={theme.warning}
          />
          <ThemedText type="small" secondary style={styles.tipText}>
            Ставьте реалистичные цели и регулярно вносите накопления для
            достижения результата
          </ThemedText>
        </View>
      </KeyboardAwareScrollViewCompat>
    </ThemedView>
  );
}

function getDaysWord(days: number): string {
  const lastTwo = days % 100;
  const lastOne = days % 10;

  if (lastTwo >= 11 && lastTwo <= 19) {
    return "дней";
  }
  if (lastOne === 1) {
    return "день";
  }
  if (lastOne >= 2 && lastOne <= 4) {
    return "дня";
  }
  return "дней";
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
  },
  inputGroup: {
    marginBottom: Spacing.xl,
  },
  label: {
    marginBottom: Spacing.sm,
    marginLeft: Spacing.xs,
    letterSpacing: 0.5,
  },
  input: {
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: 18,
    borderWidth: 1,
  },
  amountInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
  },
  amountInput: {
    flex: 1,
    fontSize: 36,
    fontWeight: "300",
    paddingVertical: Spacing.md,
  },
  currency: {
    marginLeft: Spacing.sm,
  },
  estimateRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  iconsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  iconButton: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.md,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
  },
  tipContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginTop: Spacing.md,
  },
  tipText: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  saveText: {
    fontWeight: "600",
  },
});
