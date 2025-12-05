import React, { useState, useEffect, useLayoutEffect } from "react";
import { StyleSheet, View, TextInput, Alert, Pressable } from "react-native";
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
import { Contribution, Goal } from "@/lib/types";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteType = RouteProp<RootStackParamList, "AddContribution">;

export default function AddContributionModal() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteType>();
  const insets = useSafeAreaInsets();
  const { goalId, contributionId } = route.params;
  const isEditing = !!contributionId;

  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [goal, setGoal] = useState<Goal | null>(null);
  const [existingContribution, setExistingContribution] = useState<Contribution | null>(null);

  useEffect(() => {
    loadData();
  }, [goalId, contributionId]);

  const loadData = async () => {
    const goals = await storage.getGoals();
    const foundGoal = goals.find((g) => g.id === goalId);
    setGoal(foundGoal || null);

    if (isEditing) {
      const contributions = await storage.getContributions();
      const contribution = contributions.find((c) => c.id === contributionId);
      if (contribution) {
        setExistingContribution(contribution);
        setAmount(contribution.amount.toLocaleString("ru-RU"));
        setNote(contribution.note || "");
      }
    }
  };

  const handleSave = async () => {
    const numericAmount = parseFloat(amount.replace(/[^\d.]/g, ""));
    if (isNaN(numericAmount) || numericAmount <= 0) {
      Alert.alert("Ошибка", "Введите корректную сумму");
      return;
    }

    try {
      if (isEditing && existingContribution) {
        await storage.updateContribution(contributionId!, {
          amount: numericAmount,
          note: note.trim() || undefined,
        });
      } else {
        await storage.addContribution({
          goalId,
          amount: numericAmount,
          note: note.trim() || undefined,
          date: new Date().toISOString(),
        });
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.goBack();
    } catch (error) {
      Alert.alert("Ошибка", "Не удалось сохранить");
    }
  };

  const handleDelete = () => {
    Alert.alert("Удалить накопление?", "Это действие нельзя отменить.", [
      { text: "Отмена", style: "cancel" },
      {
        text: "Удалить",
        style: "destructive",
        onPress: async () => {
          await storage.deleteContribution(contributionId!);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          navigation.goBack();
        },
      },
    ]);
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: isEditing ? "Редактировать" : "Добавить сумму",
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
  }, [navigation, amount, note, isEditing]);

  const formatAmount = (text: string) => {
    const cleaned = text.replace(/[^\d]/g, "");
    if (!cleaned) {
      setAmount("");
      return;
    }
    const number = parseInt(cleaned, 10);
    setAmount(number.toLocaleString("ru-RU"));
  };

  const remaining = goal ? Math.max(0, goal.targetAmount - goal.currentAmount) : 0;

  return (
    <ThemedView style={styles.container}>
      <KeyboardAwareScrollViewCompat
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: Spacing.lg,
            paddingBottom: insets.bottom + Spacing.lg,
          },
        ]}
      >
        {goal ? (
          <View style={styles.goalInfo}>
            <ThemedText type="small" secondary>
              Цель: {goal.name}
            </ThemedText>
            <ThemedText type="small" secondary>
              Осталось: {remaining.toLocaleString("ru-RU")} руб.
            </ThemedText>
          </View>
        ) : null}

        <View style={styles.inputGroup}>
          <ThemedText type="small" secondary style={styles.label}>
            СУММА
          </ThemedText>
          <View style={styles.amountInputContainer}>
            <TextInput
              style={styles.amountInput}
              value={amount}
              onChangeText={formatAmount}
              placeholder="0"
              placeholderTextColor={Colors.dark.textDisabled}
              keyboardType="numeric"
              autoFocus
              returnKeyType="next"
            />
            <ThemedText type="h3" secondary style={styles.currency}>
              руб.
            </ThemedText>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <ThemedText type="small" secondary style={styles.label}>
            ПРИМЕЧАНИЕ (НЕОБЯЗАТЕЛЬНО)
          </ThemedText>
          <TextInput
            style={styles.noteInput}
            value={note}
            onChangeText={setNote}
            placeholder="Добавить примечание..."
            placeholderTextColor={Colors.dark.textDisabled}
            multiline
            numberOfLines={3}
            maxLength={200}
            textAlignVertical="top"
          />
        </View>

        {isEditing ? (
          <Pressable onPress={handleDelete} style={styles.deleteButton}>
            <MaterialCommunityIcons
              name="delete-outline"
              size={20}
              color={Colors.dark.error}
            />
            <ThemedText style={styles.deleteText}>Удалить накопление</ThemedText>
          </Pressable>
        ) : null}
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
  goalInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: Colors.dark.backgroundDefault,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  inputGroup: {
    marginBottom: Spacing.lg,
  },
  label: {
    marginBottom: Spacing.sm,
    marginLeft: Spacing.xs,
    letterSpacing: 0.5,
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
  noteInput: {
    backgroundColor: Colors.dark.backgroundSecondary,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: 16,
    color: Colors.dark.text,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    minHeight: 100,
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    marginTop: Spacing.xl,
  },
  deleteText: {
    color: Colors.dark.error,
    marginLeft: Spacing.xs,
  },
  saveText: {
    color: Colors.dark.primary,
    fontWeight: "600",
  },
});
