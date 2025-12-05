import React, { useCallback, useState } from "react";
import { StyleSheet, ScrollView, View, Switch, Alert, TextInput, Pressable } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useHeaderHeight } from "@react-navigation/elements";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Constants from "expo-constants";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { storage } from "@/lib/storage";
import { AppSettings } from "@/lib/types";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface SettingRowProps {
  icon: string;
  label: string;
  value?: React.ReactNode;
  onPress?: () => void;
  danger?: boolean;
}

function SettingRow({ icon, label, value, onPress, danger }: SettingRowProps) {
  const { theme } = useTheme();
  
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.settingRow,
        pressed && { backgroundColor: theme.backgroundSecondary },
      ]}
    >
      <View style={[
        styles.settingIcon, 
        { backgroundColor: danger ? theme.errorMuted : theme.primaryMuted }
      ]}>
        <MaterialCommunityIcons
          name={icon as any}
          size={20}
          color={danger ? theme.error : theme.primary}
        />
      </View>
      <ThemedText
        type="body"
        style={[styles.settingLabel, danger && { color: theme.error }]}
      >
        {label}
      </ThemedText>
      {value}
      {onPress && !value ? (
        <MaterialCommunityIcons
          name="chevron-right"
          size={20}
          color={theme.textSecondary}
        />
      ) : null}
    </Pressable>
  );
}

export default function ProfileScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useTheme();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const [settings, setSettings] = useState<AppSettings>({
    userName: "",
    notificationsEnabled: false,
    averageDailyEarning: 0,
  });
  const [isEditing, setIsEditing] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [isEditingEarning, setIsEditingEarning] = useState(false);
  const [earningInput, setEarningInput] = useState("");
  const [archivedCount, setArchivedCount] = useState(0);

  const loadSettings = useCallback(async () => {
    const data = await storage.getSettings();
    setSettings(data);
    setNameInput(data.userName);
    setEarningInput(data.averageDailyEarning > 0 ? data.averageDailyEarning.toString() : "");
    
    const archived = await storage.getArchivedGoals();
    setArchivedCount(archived.length);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSettings();
    }, [loadSettings])
  );

  const handleToggleNotifications = async (value: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newSettings = { ...settings, notificationsEnabled: value };
    setSettings(newSettings);
    await storage.saveSettings(newSettings);
  };

  const handleSaveName = async () => {
    const newSettings = { ...settings, userName: nameInput.trim() };
    setSettings(newSettings);
    await storage.saveSettings(newSettings);
    setIsEditing(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleSaveEarning = async () => {
    const amount = parseFloat(earningInput.replace(/[^\d.]/g, "")) || 0;
    const newSettings = { ...settings, averageDailyEarning: amount };
    setSettings(newSettings);
    await storage.saveSettings(newSettings);
    setIsEditingEarning(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const formatEarningInput = (text: string) => {
    const cleaned = text.replace(/[^\d]/g, "");
    if (!cleaned) {
      setEarningInput("");
      return;
    }
    const number = parseInt(cleaned, 10);
    setEarningInput(number.toLocaleString("ru-RU"));
  };

  const handleClearData = () => {
    Alert.alert(
      "Очистить все данные?",
      "Все ваши цели и накопления будут удалены безвозвратно.",
      [
        { text: "Отмена", style: "cancel" },
        {
          text: "Очистить",
          style: "destructive",
          onPress: async () => {
            await storage.clearAllData();
            setSettings({ userName: "", notificationsEnabled: false, averageDailyEarning: 0 });
            setNameInput("");
            setEarningInput("");
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert("Готово", "Все данные очищены");
          },
        },
      ]
    );
  };

  const handleViewArchive = () => {
    navigation.navigate("ArchivedGoals");
  };

  const appVersion = Constants.expoConfig?.version || "1.0.0";

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
        showsVerticalScrollIndicator={false}
      >
        <Card style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <View style={[styles.avatarContainer, { backgroundColor: theme.primaryMuted }]}>
              <MaterialCommunityIcons
                name="account"
                size={40}
                color={theme.primary}
              />
            </View>
            {isEditing ? (
              <View style={styles.nameInputContainer}>
                <TextInput
                  style={[styles.nameInput, { backgroundColor: theme.backgroundSecondary, color: theme.text }]}
                  value={nameInput}
                  onChangeText={setNameInput}
                  placeholder="Ваше имя"
                  placeholderTextColor={theme.textDisabled}
                  autoFocus
                  onSubmitEditing={handleSaveName}
                  returnKeyType="done"
                />
                <Pressable onPress={handleSaveName} style={[styles.saveButton, { backgroundColor: theme.successMuted }]}>
                  <MaterialCommunityIcons
                    name="check"
                    size={20}
                    color={theme.success}
                  />
                </Pressable>
              </View>
            ) : (
              <Pressable
                onPress={() => setIsEditing(true)}
                style={styles.nameDisplay}
              >
                <ThemedText type="h3">
                  {settings.userName || "Добавить имя"}
                </ThemedText>
                <MaterialCommunityIcons
                  name="pencil"
                  size={18}
                  color={theme.textSecondary}
                />
              </Pressable>
            )}
          </View>
        </Card>

        <View style={styles.section}>
          <ThemedText type="caption" secondary style={styles.sectionTitle}>
            РАСЧЁТ ДНЕЙ ДО ЦЕЛИ
          </ThemedText>
          <Card style={styles.card}>
            <View style={styles.earningRow}>
              <View style={[styles.earningIcon, { backgroundColor: theme.successMuted }]}>
                <MaterialCommunityIcons
                  name="currency-rub"
                  size={20}
                  color={theme.success}
                />
              </View>
              <View style={styles.earningContent}>
                <ThemedText type="body">Средний заработок в день</ThemedText>
                {isEditingEarning ? (
                  <View style={styles.earningInputContainer}>
                    <TextInput
                      style={[styles.earningInput, { backgroundColor: theme.backgroundSecondary, color: theme.success }]}
                      value={earningInput}
                      onChangeText={formatEarningInput}
                      placeholder="0"
                      placeholderTextColor={theme.textDisabled}
                      keyboardType="numeric"
                      autoFocus
                      onSubmitEditing={handleSaveEarning}
                      returnKeyType="done"
                    />
                    <ThemedText type="body" secondary> руб.</ThemedText>
                    <Pressable onPress={handleSaveEarning} style={[styles.saveButton, { backgroundColor: theme.successMuted }]}>
                      <MaterialCommunityIcons
                        name="check"
                        size={20}
                        color={theme.success}
                      />
                    </Pressable>
                  </View>
                ) : (
                  <Pressable
                    onPress={() => setIsEditingEarning(true)}
                    style={styles.earningDisplay}
                  >
                    <ThemedText type="h4" style={{ color: theme.success }}>
                      {settings.averageDailyEarning > 0 
                        ? `${settings.averageDailyEarning.toLocaleString("ru-RU")} руб.`
                        : "Не указано"}
                    </ThemedText>
                    <MaterialCommunityIcons
                      name="pencil"
                      size={16}
                      color={theme.textSecondary}
                    />
                  </Pressable>
                )}
              </View>
            </View>
          </Card>
          <ThemedText type="caption" secondary style={styles.hint}>
            Используется для расчёта количества дней до достижения цели
          </ThemedText>
        </View>

        <View style={styles.section}>
          <ThemedText type="caption" secondary style={styles.sectionTitle}>
            УВЕДОМЛЕНИЯ
          </ThemedText>
          <Card style={styles.card}>
            <SettingRow
              icon="bell-outline"
              label="Напоминания"
              value={
                <Switch
                  value={settings.notificationsEnabled}
                  onValueChange={handleToggleNotifications}
                  trackColor={{
                    false: theme.backgroundSecondary,
                    true: theme.primaryLight,
                  }}
                  thumbColor={
                    settings.notificationsEnabled
                      ? theme.primary
                      : theme.textSecondary
                  }
                />
              }
            />
          </Card>
        </View>

        <View style={styles.section}>
          <ThemedText type="caption" secondary style={styles.sectionTitle}>
            АРХИВ
          </ThemedText>
          <Card style={styles.card}>
            <SettingRow
              icon="archive-outline"
              label="Архивированные цели"
              value={
                <ThemedText type="body" secondary style={styles.archiveCount}>
                  {archivedCount}
                </ThemedText>
              }
              onPress={handleViewArchive}
            />
          </Card>
        </View>

        <View style={styles.section}>
          <ThemedText type="caption" secondary style={styles.sectionTitle}>
            ДАННЫЕ
          </ThemedText>
          <Card style={styles.card}>
            <SettingRow
              icon="delete-outline"
              label="Очистить все данные"
              onPress={handleClearData}
              danger
            />
          </Card>
        </View>

        <View style={styles.footer}>
          <View style={[styles.appIcon, { backgroundColor: theme.primaryMuted }]}>
            <MaterialCommunityIcons name="piggy-bank" size={24} color={theme.primary} />
          </View>
          <ThemedText type="h4" style={styles.appName}>Копилка</ThemedText>
          <ThemedText type="caption" secondary>
            Версия {appVersion}
          </ThemedText>
        </View>
      </ScrollView>
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
  },
  profileCard: {
    marginBottom: Spacing.xl,
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.lg,
  },
  nameInputContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  nameInput: {
    flex: 1,
    fontSize: 18,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  saveButton: {
    padding: Spacing.sm,
    marginLeft: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  nameDisplay: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    marginBottom: Spacing.sm,
    marginLeft: Spacing.xs,
    letterSpacing: 1,
  },
  card: {
    padding: 0,
    overflow: "hidden",
  },
  earningRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: Spacing.lg,
  },
  earningIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.md,
  },
  earningContent: {
    flex: 1,
  },
  earningInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.xs,
  },
  earningInput: {
    fontSize: 18,
    fontWeight: "600",
    padding: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.sm,
    minWidth: 100,
  },
  earningDisplay: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.md,
  },
  settingLabel: {
    flex: 1,
  },
  archiveCount: {
    marginRight: Spacing.sm,
  },
  hint: {
    marginTop: Spacing.sm,
    marginLeft: Spacing.xs,
  },
  footer: {
    alignItems: "center",
    marginTop: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  appIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  appName: {
    marginBottom: Spacing.xs,
  },
});
