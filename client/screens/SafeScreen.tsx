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
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useHeaderHeight } from "@react-navigation/elements";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { storage } from "@/lib/storage";
import { Goal, Safe, SafeTransaction } from "@/lib/types";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "decimal",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function SafeScreen() {
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const [safe, setSafe] = useState<Safe>({ balance: 0, updatedAt: "" });
  const [transactions, setTransactions] = useState<SafeTransaction[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [selectedGoals, setSelectedGoals] = useState<{ [key: string]: string }>({});

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
    const distributions: { goalId: string; amount: number }[] = [];
    
    for (const [goalId, amountStr] of Object.entries(selectedGoals)) {
      const amount = parseFloat(amountStr.replace(/[^\d.]/g, "")) || 0;
      if (amount > 0) {
        distributions.push({ goalId, amount });
      }
    }

    if (distributions.length === 0) {
      setShowWithdrawModal(false);
      return;
    }

    const totalAmount = distributions.reduce((sum, d) => sum + d.amount, 0);
    if (totalAmount > safe.balance) {
      return;
    }

    await storage.distributeFromSafe(distributions);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowWithdrawModal(false);
    setSelectedGoals({});
    await loadData();
  };

  const toggleGoalSelection = (goalId: string) => {
    setSelectedGoals(prev => {
      if (prev[goalId] !== undefined) {
        const { [goalId]: removed, ...rest } = prev;
        return rest;
      }
      return { ...prev, [goalId]: "" };
    });
  };

  const updateGoalAmount = (goalId: string, amount: string) => {
    const cleaned = amount.replace(/[^\d]/g, "");
    if (!cleaned) {
      setSelectedGoals(prev => ({ ...prev, [goalId]: "" }));
      return;
    }
    const number = parseInt(cleaned, 10);
    const goal = goals.find(g => g.id === goalId);
    if (goal) {
      const remaining = goal.targetAmount - goal.currentAmount;
      const limitedAmount = Math.min(number, remaining);
      setSelectedGoals(prev => ({ ...prev, [goalId]: limitedAmount.toLocaleString("ru-RU") }));
    } else {
      setSelectedGoals(prev => ({ ...prev, [goalId]: number.toLocaleString("ru-RU") }));
    }
  };

  const getTotalWithdrawAmount = () => {
    return Object.values(selectedGoals).reduce((sum, amountStr) => {
      const amount = parseFloat(amountStr.replace(/[^\d.]/g, "")) || 0;
      return sum + amount;
    }, 0);
  };

  const recentTransactions = transactions.slice(0, 10);

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: headerHeight + Spacing.md,
            paddingBottom: tabBarHeight + Spacing.xl,
          },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.light.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.balanceCard}>
          <View style={styles.balanceIcon}>
            <MaterialCommunityIcons
              name="safe"
              size={40}
              color={Colors.light.safe}
            />
          </View>
          <ThemedText type="small" secondary style={styles.balanceLabel}>
            Баланс сейфа
          </ThemedText>
          <ThemedText type="hero" style={styles.balanceAmount}>
            {formatCurrency(safe.balance)} 
          </ThemedText>
          <ThemedText type="body" secondary>руб.</ThemedText>
        </View>

        <View style={styles.actionsRow}>
          <Pressable
            style={styles.actionButton}
            onPress={() => setShowDepositModal(true)}
          >
            <View style={[styles.actionIconContainer, styles.depositIcon]}>
              <MaterialCommunityIcons
                name="arrow-down"
                size={24}
                color={Colors.light.safe}
              />
            </View>
            <ThemedText type="small">Пополнить</ThemedText>
          </Pressable>

          <Pressable
            style={styles.actionButton}
            onPress={() => setShowWithdrawModal(true)}
          >
            <View style={[styles.actionIconContainer, styles.withdrawIcon]}>
              <MaterialCommunityIcons
                name="arrow-up"
                size={24}
                color={Colors.light.primary}
              />
            </View>
            <ThemedText type="small">На цели</ThemedText>
          </Pressable>
        </View>

        <Card style={styles.infoCard}>
          <View style={styles.infoContent}>
            <MaterialCommunityIcons
              name="information-outline"
              size={20}
              color={Colors.light.primary}
            />
            <ThemedText type="small" secondary style={styles.infoText}>
              Сейф хранит излишки средств. Вы можете распределить их на свои цели в любой момент.
            </ThemedText>
          </View>
        </Card>

        {recentTransactions.length > 0 ? (
          <View style={styles.historySection}>
            <ThemedText type="h4" style={styles.sectionTitle}>
              История операций
            </ThemedText>
            {recentTransactions.map((transaction) => (
              <View key={transaction.id} style={styles.transactionItem}>
                <View style={[
                  styles.transactionIcon,
                  transaction.type === "deposit" ? styles.depositBg : styles.withdrawBg,
                ]}>
                  <MaterialCommunityIcons
                    name={transaction.type === "deposit" ? "arrow-down" : "arrow-up"}
                    size={18}
                    color={transaction.type === "deposit" ? Colors.light.safe : Colors.light.primary}
                  />
                </View>
                <View style={styles.transactionInfo}>
                  <ThemedText type="body">
                    {transaction.type === "deposit" ? "Пополнение" : "Вывод на цель"}
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
                  style={transaction.type === "deposit" ? styles.positiveAmount : styles.negativeAmount}
                >
                  {transaction.type === "deposit" ? "+" : "-"}
                  {formatCurrency(transaction.amount)} руб.
                </ThemedText>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyHistory}>
            <MaterialCommunityIcons
              name="history"
              size={48}
              color={Colors.light.textSecondary}
            />
            <ThemedText type="body" secondary style={styles.emptyText}>
              История операций пуста
            </ThemedText>
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
          style={styles.modalOverlay}
          onPress={() => setShowDepositModal(false)}
        >
          <Pressable style={styles.modalContent} onPress={() => {}}>
            <View style={styles.modalHeader}>
              <ThemedText type="h4">Пополнить сейф</ThemedText>
              <ThemedText type="small" secondary>
                Введите сумму для пополнения
              </ThemedText>
            </View>

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={depositAmount}
                onChangeText={(text) => formatAmount(text, setDepositAmount)}
                placeholder="0"
                placeholderTextColor={Colors.light.textDisabled}
                keyboardType="numeric"
                autoFocus
              />
              <ThemedText type="h3" secondary> руб.</ThemedText>
            </View>

            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setShowDepositModal(false)}
                style={[styles.modalButton, styles.modalButtonCancel]}
              >
                <ThemedText type="body" secondary>Отмена</ThemedText>
              </Pressable>
              <Pressable
                onPress={handleDeposit}
                style={[styles.modalButton, styles.modalButtonConfirm]}
              >
                <ThemedText type="body" style={styles.confirmText}>Пополнить</ThemedText>
              </Pressable>
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
          style={styles.modalOverlay}
          onPress={() => setShowWithdrawModal(false)}
        >
          <Pressable style={styles.withdrawModalContent} onPress={() => {}}>
            <View style={styles.modalHeader}>
              <ThemedText type="h4">Распределить на цели</ThemedText>
              <ThemedText type="small" secondary>
                Доступно: {formatCurrency(safe.balance)} руб.
              </ThemedText>
            </View>

            {goals.length > 0 ? (
              <FlatList
                data={goals}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => {
                  const isSelected = selectedGoals[item.id] !== undefined;
                  const remaining = item.targetAmount - item.currentAmount;
                  return (
                    <Pressable
                      style={[
                        styles.goalItem,
                        isSelected && styles.goalItemSelected,
                      ]}
                      onPress={() => toggleGoalSelection(item.id)}
                    >
                      <View style={styles.goalCheckbox}>
                        {isSelected ? (
                          <MaterialCommunityIcons
                            name="checkbox-marked"
                            size={24}
                            color={Colors.light.primary}
                          />
                        ) : (
                          <MaterialCommunityIcons
                            name="checkbox-blank-outline"
                            size={24}
                            color={Colors.light.textSecondary}
                          />
                        )}
                      </View>
                      <View style={styles.goalInfo}>
                        <ThemedText type="body" numberOfLines={1}>{item.name}</ThemedText>
                        <ThemedText type="caption" secondary>
                          Осталось: {formatCurrency(remaining)} руб.
                        </ThemedText>
                      </View>
                      {isSelected && (
                        <TextInput
                          style={styles.goalAmountInput}
                          value={selectedGoals[item.id]}
                          onChangeText={(text) => updateGoalAmount(item.id, text)}
                          placeholder="Сумма"
                          placeholderTextColor={Colors.light.textDisabled}
                          keyboardType="numeric"
                        />
                      )}
                    </Pressable>
                  );
                }}
                style={styles.goalsList}
                showsVerticalScrollIndicator={false}
              />
            ) : (
              <View style={styles.noGoals}>
                <ThemedText type="body" secondary>
                  Нет активных целей для пополнения
                </ThemedText>
              </View>
            )}

            {Object.keys(selectedGoals).length > 0 && (
              <View style={styles.totalRow}>
                <ThemedText type="body">Итого к распределению:</ThemedText>
                <ThemedText type="h4" style={styles.totalAmount}>
                  {formatCurrency(getTotalWithdrawAmount())} руб.
                </ThemedText>
              </View>
            )}

            <View style={styles.modalActions}>
              <Pressable
                onPress={() => {
                  setShowWithdrawModal(false);
                  setSelectedGoals({});
                }}
                style={[styles.modalButton, styles.modalButtonCancel]}
              >
                <ThemedText type="body" secondary>Отмена</ThemedText>
              </Pressable>
              <Pressable
                onPress={handleWithdraw}
                style={[
                  styles.modalButton,
                  styles.modalButtonConfirm,
                  getTotalWithdrawAmount() > safe.balance && styles.modalButtonDisabled,
                ]}
                disabled={getTotalWithdrawAmount() > safe.balance}
              >
                <ThemedText type="body" style={styles.confirmText}>Распределить</ThemedText>
              </Pressable>
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
    paddingHorizontal: Spacing.md,
  },
  balanceCard: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  balanceIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.light.safeLight,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  balanceLabel: {
    marginBottom: Spacing.xs,
  },
  balanceAmount: {
    color: Colors.light.safe,
  },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  actionButton: {
    alignItems: "center",
    gap: Spacing.sm,
  },
  actionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  depositIcon: {
    backgroundColor: Colors.light.safeLight,
  },
  withdrawIcon: {
    backgroundColor: "rgba(0, 91, 255, 0.1)",
  },
  infoCard: {
    marginBottom: Spacing.lg,
    backgroundColor: "rgba(0, 91, 255, 0.05)",
  },
  infoContent: {
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
  sectionTitle: {
    marginBottom: Spacing.md,
  },
  transactionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  transactionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.sm,
  },
  depositBg: {
    backgroundColor: Colors.light.safeLight,
  },
  withdrawBg: {
    backgroundColor: "rgba(0, 91, 255, 0.1)",
  },
  transactionInfo: {
    flex: 1,
  },
  positiveAmount: {
    color: Colors.light.safe,
    fontWeight: "600",
  },
  negativeAmount: {
    color: Colors.light.primary,
    fontWeight: "600",
  },
  emptyHistory: {
    alignItems: "center",
    paddingVertical: Spacing.xxl,
  },
  emptyText: {
    marginTop: Spacing.md,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.md,
  },
  modalContent: {
    backgroundColor: Colors.light.card,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    width: "100%",
    maxWidth: 360,
  },
  withdrawModalContent: {
    backgroundColor: Colors.light.card,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    width: "100%",
    maxWidth: 360,
    maxHeight: "80%",
  },
  modalHeader: {
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  input: {
    fontSize: 32,
    fontWeight: "600",
    color: Colors.light.text,
    textAlign: "center",
    minWidth: 100,
  },
  modalActions: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  modalButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: "center",
  },
  modalButtonCancel: {
    backgroundColor: Colors.light.backgroundSecondary,
  },
  modalButtonConfirm: {
    backgroundColor: Colors.light.primary,
  },
  modalButtonDisabled: {
    opacity: 0.5,
  },
  confirmText: {
    color: Colors.light.buttonText,
    fontWeight: "600",
  },
  goalsList: {
    maxHeight: 300,
    marginBottom: Spacing.md,
  },
  goalItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.xs,
  },
  goalItemSelected: {
    backgroundColor: "rgba(0, 91, 255, 0.05)",
  },
  goalCheckbox: {
    marginRight: Spacing.sm,
  },
  goalInfo: {
    flex: 1,
  },
  goalAmountInput: {
    width: 100,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.light.backgroundSecondary,
    fontSize: 14,
    color: Colors.light.text,
    textAlign: "right",
  },
  noGoals: {
    paddingVertical: Spacing.xl,
    alignItems: "center",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
    marginBottom: Spacing.md,
  },
  totalAmount: {
    color: Colors.light.primary,
  },
});
