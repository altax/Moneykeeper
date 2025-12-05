import React, { useState, useEffect, useLayoutEffect } from "react";
import { StyleSheet, View, TextInput, Alert } from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { HeaderButton } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { storage } from "@/lib/storage";
import { Goal } from "@/lib/types";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteType = RouteProp<RootStackParamList, "AddGoal">;

export default function AddGoalModal() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteType>();
  const insets = useSafeAreaInsets();
  const goalId = route.params?.goalId;
  const isEditing = !!goalId;

  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [existingGoal, setExistingGoal] = useState<Goal | null>(null);

  useEffect(() => {
    if (isEditing) {
      loadGoal();
    }
  }, [goalId]);

  const loadGoal = async () => {
    const goals = await storage.getGoals();
    const goal = goals.find((g) => g.id === goalId);
    if (goal) {
      setExistingGoal(goal);
      setName(goal.name);
      setTargetAmount(goal.targetAmount.toString());
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Ошибка", "Введите название цели");
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
          name: name.trim(),
          targetAmount: amount,
        });
      } else {
        await storage.addGoal({
          name: name.trim(),
          targetAmount: amount,
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
          <ThemedText type="body" style={styles.saveText}>
            Сохранить
          </ThemedText>
        </HeaderButton>
      ),
    });
  }, [navigation, name, targetAmount, isEditing]);

  const formatAmount = (text: string) => {
    const cleaned = text.replace(/[^\d]/g, "");
    if (!cleaned) {
      setTargetAmount("");
      return;
    }
    const number = parseInt(cleaned, 10);
    setTargetAmount(number.toLocaleString("ru-RU"));
  };

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
          <ThemedText type="small" secondary style={styles.label}>
            НАЗВАНИЕ ЦЕЛИ
          </ThemedText>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Например: Новый iPhone"
            placeholderTextColor={Colors.dark.textDisabled}
            autoFocus
            returnKeyType="next"
            maxLength={50}
          />
        </View>

        <View style={styles.inputGroup}>
          <ThemedText type="small" secondary style={styles.label}>
            СУММА ЦЕЛИ
          </ThemedText>
          <View style={styles.amountInputContainer}>
            <TextInput
              style={styles.amountInput}
              value={targetAmount}
              onChangeText={formatAmount}
              placeholder="0"
              placeholderTextColor={Colors.dark.textDisabled}
              keyboardType="numeric"
              returnKeyType="done"
            />
            <ThemedText type="h3" secondary style={styles.currency}>
              руб.
            </ThemedText>
          </View>
        </View>

        <View style={styles.tipContainer}>
          <MaterialCommunityIcons
            name="lightbulb-outline"
            size={20}
            color={Colors.dark.warning}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
  },
  inputGroup: {
    marginBottom: Spacing.lg,
  },
  label: {
    marginBottom: Spacing.sm,
    marginLeft: Spacing.xs,
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: Colors.dark.backgroundSecondary,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: 18,
    color: Colors.dark.text,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  amountInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.dark.backgroundSecondary,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  amountInput: {
    flex: 1,
    fontSize: 32,
    fontWeight: "700",
    color: Colors.dark.text,
    paddingVertical: Spacing.md,
  },
  currency: {
    marginLeft: Spacing.sm,
  },
  tipContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: Colors.dark.backgroundDefault,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginTop: Spacing.md,
  },
  tipText: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  saveText: {
    color: Colors.dark.primary,
    fontWeight: "600",
  },
});
