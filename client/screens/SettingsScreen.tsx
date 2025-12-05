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
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
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
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.settingRow,
        pressed && styles.settingRowPressed,
      ]}
    >
      <View style={[styles.settingIcon, danger && styles.settingIconDanger]}>
        <MaterialCommunityIcons
          name={icon as any}
          size={20}
          color={danger ? Colors.light.error : Colors.light.primary}
        />
      </View>
      <ThemedText
        type="body"
        style={[styles.settingLabel, danger && styles.settingLabelDanger]}
      >
        {label}
      </ThemedText>
      {value}
      {onPress && !value ? (
        <MaterialCommunityIcons
          name="chevron-right"
          size={20}
          color={Colors.light.textSecondary}
        />
      ) : null}
    </Pressable>
  );
}

export default function SettingsScreen() {
  const navigation = useNavigation<NavigationProp>();
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
            paddingTop: headerHeight + Spacing.lg,
            paddingBottom: tabBarHeight + Spacing.xl,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <ThemedText type="small" secondary style={styles.sectionTitle}>
            ПРОФИЛЬ
          </ThemedText>
          <Card style={styles.card}>
            <View style={styles.profileRow}>
              <View style={styles.avatarContainer}>
                <MaterialCommunityIcons
                  name="account"
                  size={32}
                  color={Colors.light.textSecondary}
                />
              </View>
              {isEditing ? (
                <View style={styles.nameInputContainer}>
                  <TextInput
                    style={styles.nameInput}
                    value={nameInput}
                    onChangeText={setNameInput}
                    placeholder="Ваше имя"
                    placeholderTextColor={Colors.light.textDisabled}
                    autoFocus
                    onSubmitEditing={handleSaveName}
                    returnKeyType="done"
                  />
                  <Pressable onPress={handleSaveName} style={styles.saveButton}>
                    <MaterialCommunityIcons
                      name="check"
                      size={20}
                      color={Colors.light.success}
                    />
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  onPress={() => setIsEditing(true)}
                  style={styles.nameDisplay}
                >
                  <ThemedText type="bodyLarge">
                    {settings.userName || "Добавить имя"}
                  </ThemedText>
                  <MaterialCommunityIcons
                    name="pencil"
                    size={16}
                    color={Colors.light.textSecondary}
                  />
                </Pressable>
              )}
            </View>
          </Card>
        </View>

        <View style={styles.section}>
          <ThemedText type="small" secondary style={styles.sectionTitle}>
            РАСЧЁТ ДНЕЙ ДО ЦЕЛИ
          </ThemedText>
          <Card style={styles.card}>
            <View style={styles.earningRow}>
              <View style={styles.earningIcon}>
                <MaterialCommunityIcons
                  name="currency-rub"
                  size={20}
                  color={Colors.light.success}
                />
              </View>
              <View style={styles.earningContent}>
                <ThemedText type="body">Средний заработок в день</ThemedText>
                {isEditingEarning ? (
                  <View style={styles.earningInputContainer}>
                    <TextInput
                      style={styles.earningInput}
                      value={earningInput}
                      onChangeText={formatEarningInput}
                      placeholder="0"
                      placeholderTextColor={Colors.light.textDisabled}
                      keyboardType="numeric"
                      autoFocus
                      onSubmitEditing={handleSaveEarning}
                      returnKeyType="done"
                    />
                    <ThemedText type="body" secondary> руб.</ThemedText>
                    <Pressable onPress={handleSaveEarning} style={styles.saveButton}>
                      <MaterialCommunityIcons
                        name="check"
                        size={20}
                        color={Colors.light.success}
                      />
                    </Pressable>
                  </View>
                ) : (
                  <Pressable
                    onPress={() => setIsEditingEarning(true)}
                    style={styles.earningDisplay}
                  >
                    <ThemedText type="h4" style={styles.earningAmount}>
                      {settings.averageDailyEarning > 0 
                        ? `${settings.averageDailyEarning.toLocaleString("ru-RU")} руб.`
                        : "Не указано"}
                    </ThemedText>
                    <MaterialCommunityIcons
                      name="pencil"
                      size={16}
                      color={Colors.light.textSecondary}
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
          <ThemedText type="small" secondary style={styles.sectionTitle}>
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
                    false: Colors.light.backgroundSecondary,
                    true: Colors.light.primaryLight,
                  }}
                  thumbColor={
                    settings.notificationsEnabled
                      ? Colors.light.primary
                      : Colors.light.textSecondary
                  }
                />
              }
            />
          </Card>
          <ThemedText type="caption" secondary style={styles.hint}>
            Получайте напоминания о внесении накоплений
          </ThemedText>
        </View>

        <View style={styles.section}>
          <ThemedText type="small" secondary style={styles.sectionTitle}>
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
          <ThemedText type="caption" secondary style={styles.hint}>
            Просмотр выполненных и архивированных целей
          </ThemedText>
        </View>

        <View style={styles.section}>
          <ThemedText type="small" secondary style={styles.sectionTitle}>
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

        <View style={styles.section}>
          <ThemedText type="small" secondary style={styles.sectionTitle}>
            О ПРИЛОЖЕНИИ
          </ThemedText>
          <Card style={styles.card}>
            <View style={styles.aboutRow}>
              <ThemedText type="body">Версия</ThemedText>
              <ThemedText type="body" secondary>
                {appVersion}
              </ThemedText>
            </View>
          </Card>
        </View>

        <View style={styles.footer}>
          <ThemedText type="caption" secondary style={styles.footerText}>
            Копилка - приложение для накоплений
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
    paddingHorizontal: Spacing.md,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    marginBottom: Spacing.sm,
    marginLeft: Spacing.xs,
    letterSpacing: 0.5,
  },
  card: {
    padding: 0,
    overflow: "hidden",
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
  },
  avatarContainer: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.light.backgroundSecondary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.md,
  },
  nameInputContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  nameInput: {
    flex: 1,
    fontSize: 18,
    color: Colors.light.text,
    padding: Spacing.sm,
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: BorderRadius.sm,
  },
  saveButton: {
    padding: Spacing.sm,
    marginLeft: Spacing.sm,
  },
  nameDisplay: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  earningRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: Spacing.md,
  },
  earningIcon: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.light.backgroundSecondary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.sm,
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
    color: Colors.light.success,
    padding: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: BorderRadius.sm,
    minWidth: 100,
  },
  earningDisplay: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  earningAmount: {
    color: Colors.light.success,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
  },
  settingRowPressed: {
    backgroundColor: Colors.light.backgroundSecondary,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.light.backgroundSecondary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.sm,
  },
  settingIconDanger: {
    backgroundColor: "rgba(239, 83, 80, 0.1)",
  },
  settingLabel: {
    flex: 1,
  },
  settingLabelDanger: {
    color: Colors.light.error,
  },
  archiveCount: {
    marginRight: Spacing.sm,
  },
  hint: {
    marginTop: Spacing.xs,
    marginLeft: Spacing.xs,
  },
  aboutRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.md,
  },
  footer: {
    alignItems: "center",
    marginTop: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  footerText: {
    textAlign: "center",
  },
});
