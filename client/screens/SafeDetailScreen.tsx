import React, { useCallback, useState } from "react";
import {
  StyleSheet,
  ScrollView,
  View,
  RefreshControl,
  Modal,
  TextInput,
  Pressable,
  FlatList,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Shadows, QUICK_AMOUNTS } from "@/constants/theme";
import { storage } from "@/lib/storage";
import { Goal, Safe, SafeTransaction } from "@/lib/types";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "decimal",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function SafeDetailScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [safe, setSafe] = useState<Safe>({ balance: 0, updatedAt: "" });
  const [transactions, setTransactions] = useState<SafeTransaction[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [depositAmount, setDepositAmount] = useState("");
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [withdrawAmount, setWithdrawAmount] = useState("");

  const loadData = useCallback(async () => {
    const safeData = await storage.getSafe();
    setSafe(safeData);
    
    const transactionsData = await storage.getSafeTransactions();
    setTransactions(transactionsData.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ));
    
    const activeGoals = await storage.getActiveGoals();
    setGoals(activeGoals.filter(g => g.currentAmount < g.targetAmount));
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const formatAmount = (text: string, setter: (value: string) => void) => {
    const cleaned = text.replace(/[^\d]/g, "");
    if (!cleaned) {
      setter("");
      return;
    }
    const number = parseInt(cleaned, 10);
    setter(number.toLocaleString("ru-RU"));
  };

  const handleDeposit = async () => {
    const amount = parseFloat(depositAmount.replace(/[^\d.]/g, "")) || 0;
    if (amount <= 0) {
      setShowDepositModal(false);
      return;
    }

    await storage.addToSafe(amount, "Пополнение сейфа");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowDepositModal(false);
    setDepositAmount("");
    await loadData();
  };

  const handleWithdraw = async () => {
    if (!selectedGoal) return;
    
    const amount = parseFloat(withdrawAmount.replace(/[^\d.]/g, "")) || 0;
    if (amount <= 0 || amount > safe.balance) return;

    await storage.distributeFromSafe([{ goalId: selectedGoal.id, amount }]);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowWithdrawModal(false);
    setSelectedGoal(null);
    setWithdrawAmount("");
    await loadData();
  };

  const openWithdrawModal = (goal: Goal) => {
    setSelectedGoal(goal);
    const remaining = goal.targetAmount - goal.currentAmount;
    const suggested = Math.min(remaining, safe.balance);
    setWithdrawAmount(suggested.toLocaleString("ru-RU"));
    setShowWithdrawModal(true);
  };

  const recentTransactions = transactions.slice(0, 10);

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + Spacing.xl },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.balanceCard, { backgroundColor: theme.success }]}>
          <View style={styles.balanceIcon}>
            <MaterialCommunityIcons
              name="safe"
              size={40}
              color="rgba(255,255,255,0.9)"
            />
          </View>
          <ThemedText type="caption" style={styles.balanceLabel}>
            Баланс сейфа
          </ThemedText>
          <ThemedText type="hero" style={styles.balanceAmount}>
            {formatCurrency(safe.balance)} ₽
          </ThemedText>
        </View>

        <View style={styles.actionsRow}>
          <Button
            variant="success"
            onPress={() => setShowDepositModal(true)}
            style={styles.actionButton}
          >
            Пополнить
          </Button>
        </View>

        {goals.length > 0 && safe.balance > 0 && (
          <View style={styles.goalsSection}>
            <ThemedText type="h4" style={styles.sectionTitle}>
              Распределить на цели
            </ThemedText>
            {goals.map((goal) => {
              const remaining = goal.targetAmount - goal.currentAmount;
              return (
                <Card
                  key={goal.id}
                  onPress={() => openWithdrawModal(goal)}
                  style={styles.goalCard}
                >
                  <View style={styles.goalRow}>
                    <View style={[styles.goalIcon, { backgroundColor: theme.primaryMuted }]}>
                      <MaterialCommunityIcons
                        name={(goal.icon || "target") as any}
                        size={20}
                        color={theme.primary}
                      />
                    </View>
                    <View style={styles.goalInfo}>
                      <ThemedText type="body" numberOfLines={1}>
                        {goal.name}
                      </ThemedText>
                      <ThemedText type="caption" secondary>
                        Осталось: {formatCurrency(remaining)} ₽
                      </ThemedText>
                    </View>
                    <MaterialCommunityIcons
                      name="arrow-right"
                      size={20}
                      color={theme.primary}
                    />
                  </View>
                </Card>
              );
            })}
          </View>
        )}

        <Card style={{...styles.infoCard, borderColor: theme.primaryMuted}}>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons
              name="information-outline"
              size={20}
              color={theme.primary}
            />
            <ThemedText type="small" secondary style={styles.infoText}>
              Сейф хранит излишки средств. Распределите их на цели в любой момент.
            </ThemedText>
          </View>
        </Card>

        {recentTransactions.length > 0 && (
          <View style={styles.historySection}>
            <ThemedText type="h4" style={styles.sectionTitle}>
              История операций
            </ThemedText>
            <Card style={styles.transactionsList}>
              {recentTransactions.map((transaction, index) => (
                <View key={transaction.id} style={[
                  styles.transactionItem,
                  index < recentTransactions.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.borderLight }
                ]}>
                  <View style={[
                    styles.transactionIcon,
                    { backgroundColor: transaction.type === "deposit" ? theme.successMuted : theme.primaryMuted },
                  ]}>
                    <MaterialCommunityIcons
                      name={transaction.type === "deposit" ? "arrow-down" : "arrow-up"}
                      size={18}
                      color={transaction.type === "deposit" ? theme.success : theme.primary}
                    />
                  </View>
                  <View style={styles.transactionInfo}>
                    <ThemedText type="body">
                      {transaction.type === "deposit" ? "Пополнение" : "На цель"}
                    </ThemedText>
                    <ThemedText type="caption" secondary>
                      {new Date(transaction.date).toLocaleDateString("ru-RU", {
                        day: "numeric",
                        month: "short",
                      })}
                    </ThemedText>
                  </View>
                  <ThemedText
                    type="body"
                    style={{ color: transaction.type === "deposit" ? theme.success : theme.primary, fontWeight: "600" }}
                  >
                    {transaction.type === "deposit" ? "+" : "-"}
                    {formatCurrency(transaction.amount)} ₽
                  </ThemedText>
                </View>
              ))}
            </Card>
          </View>
        )}
      </ScrollView>

      <Modal
        visible={showDepositModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDepositModal(false)}
      >
        <Pressable
          style={[styles.modalOverlay, { backgroundColor: theme.overlay }]}
          onPress={() => setShowDepositModal(false)}
        >
          <Pressable style={[styles.modalContent, { backgroundColor: theme.card }]} onPress={() => {}}>
            <View style={styles.modalHeader}>
              <ThemedText type="h3">Пополнить сейф</ThemedText>
            </View>

            <View style={styles.quickAmounts}>
              {QUICK_AMOUNTS.map((amount) => (
                <Pressable
                  key={amount}
                  style={[styles.quickAmountButton, { backgroundColor: theme.backgroundSecondary }]}
                  onPress={() => setDepositAmount(amount.toLocaleString("ru-RU"))}
                >
                  <ThemedText type="body" style={{ color: theme.primary }}>
                    {amount.toLocaleString("ru-RU")} ₽
                  </ThemedText>
                </Pressable>
              ))}
            </View>

            <View style={styles.inputContainer}>
              <TextInput
                style={[styles.amountInput, { color: theme.text }]}
                value={depositAmount}
                onChangeText={(text) => formatAmount(text, setDepositAmount)}
                placeholder="0"
                placeholderTextColor={theme.textTertiary}
                keyboardType="numeric"
                autoFocus
              />
              <ThemedText type="h3" style={{ color: theme.textTertiary }}>₽</ThemedText>
            </View>

            <View style={styles.modalActions}>
              <Button variant="secondary" onPress={() => setShowDepositModal(false)} style={styles.modalButton}>
                Отмена
              </Button>
              <Button variant="success" onPress={handleDeposit} style={styles.modalButton}>
                Пополнить
              </Button>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={showWithdrawModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowWithdrawModal(false)}
      >
        <Pressable
          style={[styles.modalOverlay, { backgroundColor: theme.overlay }]}
          onPress={() => setShowWithdrawModal(false)}
        >
          <Pressable style={[styles.modalContent, { backgroundColor: theme.card }]} onPress={() => {}}>
            <View style={styles.modalHeader}>
              <ThemedText type="h3">Перевести на цель</ThemedText>
              <ThemedText type="body" secondary style={{ marginTop: Spacing.xs }}>
                {selectedGoal?.name}
              </ThemedText>
            </View>

            <View style={styles.inputContainer}>
              <TextInput
                style={[styles.amountInput, { color: theme.text }]}
                value={withdrawAmount}
                onChangeText={(text) => formatAmount(text, setWithdrawAmount)}
                placeholder="0"
                placeholderTextColor={theme.textTertiary}
                keyboardType="numeric"
                autoFocus
              />
              <ThemedText type="h3" style={{ color: theme.textTertiary }}>₽</ThemedText>
            </View>

            <ThemedText type="small" secondary style={styles.availableHint}>
              Доступно: {formatCurrency(safe.balance)} ₽
            </ThemedText>

            <View style={styles.modalActions}>
              <Button variant="secondary" onPress={() => setShowWithdrawModal(false)} style={styles.modalButton}>
                Отмена
              </Button>
              <Button onPress={handleWithdraw} style={styles.modalButton}>
                Перевести
              </Button>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
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
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  balanceCard: {
    alignItems: "center",
    paddingVertical: Spacing.xxl,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.lg,
    ...Shadows.lg,
  },
  balanceIcon: {
    marginBottom: Spacing.md,
  },
  balanceLabel: {
    color: "rgba(255,255,255,0.8)",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: Spacing.xs,
  },
  balanceAmount: {
    color: "#FFFFFF",
  },
  actionsRow: {
    marginBottom: Spacing.xl,
  },
  actionButton: {
    width: "100%",
  },
  goalsSection: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    marginBottom: Spacing.md,
  },
  goalCard: {
    marginBottom: Spacing.sm,
  },
  goalRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  goalIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.md,
  },
  goalInfo: {
    flex: 1,
  },
  infoCard: {
    marginBottom: Spacing.xl,
    borderWidth: 1,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  infoText: {
    flex: 1,
  },
  historySection: {
    marginBottom: Spacing.lg,
  },
  transactionsList: {
    padding: 0,
    overflow: "hidden",
  },
  transactionItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
  },
  transactionIcon: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.md,
  },
  transactionInfo: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.lg,
  },
  modalContent: {
    width: "100%",
    maxWidth: 360,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    ...Shadows.lg,
  },
  modalHeader: {
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  quickAmounts: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  quickAmountButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  amountInput: {
    fontSize: 40,
    fontWeight: "700",
    textAlign: "center",
    minWidth: 120,
  },
  availableHint: {
    textAlign: "center",
    marginBottom: Spacing.lg,
  },
  modalActions: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  modalButton: {
    flex: 1,
  },
});
