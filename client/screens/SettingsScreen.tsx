import React, { useCallback, useState } from "react";
import { StyleSheet, ScrollView, View, Switch, Alert, TextInput, Pressable } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
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
          color={danger ? Colors.dark.error : Colors.dark.primary}
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
          color={Colors.dark.textSecondary}
        />
      ) : null}
    </Pressable>
  );
}

export default function SettingsScreen() {
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const [settings, setSettings] = useState<AppSettings>({
    userName: "",
    notificationsEnabled: false,
  });
  const [isEditing, setIsEditing] = useState(false);
  const [nameInput, setNameInput] = useState("");

  const loadSettings = useCallback(async () => {
    const data = await storage.getSettings();
    setSettings(data);
    setNameInput(data.userName);
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
            setSettings({ userName: "", notificationsEnabled: false });
            setNameInput("");
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert("Готово", "Все данные очищены");
          },
        },
      ]
    );
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
                  color={Colors.dark.textSecondary}
                />
              </View>
              {isEditing ? (
                <View style={styles.nameInputContainer}>
                  <TextInput
                    style={styles.nameInput}
                    value={nameInput}
                    onChangeText={setNameInput}
                    placeholder="Ваше имя"
                    placeholderTextColor={Colors.dark.textDisabled}
                    autoFocus
                    onSubmitEditing={handleSaveName}
                    returnKeyType="done"
                  />
                  <Pressable onPress={handleSaveName} style={styles.saveButton}>
                    <MaterialCommunityIcons
                      name="check"
                      size={20}
                      color={Colors.dark.success}
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
                    color={Colors.dark.textSecondary}
                  />
                </Pressable>
              )}
            </View>
          </Card>
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
                    false: Colors.dark.backgroundSecondary,
                    true: Colors.dark.primaryLight,
                  }}
                  thumbColor={
                    settings.notificationsEnabled
                      ? Colors.dark.primary
                      : Colors.dark.textSecondary
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
    backgroundColor: Colors.dark.backgroundSecondary,
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
    color: Colors.dark.text,
    padding: Spacing.sm,
    backgroundColor: Colors.dark.backgroundSecondary,
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
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
  },
  settingRowPressed: {
    backgroundColor: Colors.dark.backgroundSecondary,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.dark.backgroundSecondary,
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
    color: Colors.dark.error,
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
