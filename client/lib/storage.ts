import AsyncStorage from "@react-native-async-storage/async-storage";
import { Goal, Contribution, AppSettings } from "./types";

const GOALS_KEY = "@kopilka_goals";
const CONTRIBUTIONS_KEY = "@kopilka_contributions";
const SETTINGS_KEY = "@kopilka_settings";

const defaultSettings: AppSettings = {
  userName: "",
  notificationsEnabled: false,
};

export const storage = {
  async getGoals(): Promise<Goal[]> {
    try {
      const data = await AsyncStorage.getItem(GOALS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error("Error reading goals:", error);
      return [];
    }
  },

  async saveGoals(goals: Goal[]): Promise<void> {
    try {
      await AsyncStorage.setItem(GOALS_KEY, JSON.stringify(goals));
    } catch (error) {
      console.error("Error saving goals:", error);
    }
  },

  async addGoal(goal: Omit<Goal, "id" | "currentAmount" | "createdAt" | "updatedAt">): Promise<Goal> {
    const goals = await this.getGoals();
    const newGoal: Goal = {
      ...goal,
      id: Date.now().toString(),
      currentAmount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    goals.push(newGoal);
    await this.saveGoals(goals);
    return newGoal;
  },

  async updateGoal(id: string, updates: Partial<Goal>): Promise<Goal | null> {
    const goals = await this.getGoals();
    const index = goals.findIndex((g) => g.id === id);
    if (index === -1) return null;
    
    goals[index] = {
      ...goals[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    await this.saveGoals(goals);
    return goals[index];
  },

  async deleteGoal(id: string): Promise<void> {
    const goals = await this.getGoals();
    const filtered = goals.filter((g) => g.id !== id);
    await this.saveGoals(filtered);
    
    const contributions = await this.getContributions();
    const filteredContributions = contributions.filter((c) => c.goalId !== id);
    await this.saveContributions(filteredContributions);
  },

  async getContributions(): Promise<Contribution[]> {
    try {
      const data = await AsyncStorage.getItem(CONTRIBUTIONS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error("Error reading contributions:", error);
      return [];
    }
  },

  async saveContributions(contributions: Contribution[]): Promise<void> {
    try {
      await AsyncStorage.setItem(CONTRIBUTIONS_KEY, JSON.stringify(contributions));
    } catch (error) {
      console.error("Error saving contributions:", error);
    }
  },

  async addContribution(
    contribution: Omit<Contribution, "id" | "createdAt">
  ): Promise<Contribution> {
    const contributions = await this.getContributions();
    const newContribution: Contribution = {
      ...contribution,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    };
    contributions.push(newContribution);
    await this.saveContributions(contributions);

    const goals = await this.getGoals();
    const goalIndex = goals.findIndex((g) => g.id === contribution.goalId);
    if (goalIndex !== -1) {
      goals[goalIndex].currentAmount += contribution.amount;
      goals[goalIndex].updatedAt = new Date().toISOString();
      await this.saveGoals(goals);
    }

    return newContribution;
  },

  async updateContribution(
    id: string,
    updates: Partial<Contribution>
  ): Promise<Contribution | null> {
    const contributions = await this.getContributions();
    const index = contributions.findIndex((c) => c.id === id);
    if (index === -1) return null;

    const oldContribution = contributions[index];
    const goals = await this.getGoals();
    const goalIndex = goals.findIndex((g) => g.id === oldContribution.goalId);
    
    if (goalIndex !== -1 && updates.amount !== undefined) {
      const difference = updates.amount - oldContribution.amount;
      goals[goalIndex].currentAmount += difference;
      goals[goalIndex].updatedAt = new Date().toISOString();
      await this.saveGoals(goals);
    }

    contributions[index] = {
      ...contributions[index],
      ...updates,
    };
    await this.saveContributions(contributions);
    return contributions[index];
  },

  async deleteContribution(id: string): Promise<void> {
    const contributions = await this.getContributions();
    const contribution = contributions.find((c) => c.id === id);
    if (!contribution) return;

    const goals = await this.getGoals();
    const goalIndex = goals.findIndex((g) => g.id === contribution.goalId);
    if (goalIndex !== -1) {
      goals[goalIndex].currentAmount -= contribution.amount;
      goals[goalIndex].updatedAt = new Date().toISOString();
      await this.saveGoals(goals);
    }

    const filtered = contributions.filter((c) => c.id !== id);
    await this.saveContributions(filtered);
  },

  async getContributionsByGoal(goalId: string): Promise<Contribution[]> {
    const contributions = await this.getContributions();
    return contributions
      .filter((c) => c.goalId === goalId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  },

  async getSettings(): Promise<AppSettings> {
    try {
      const data = await AsyncStorage.getItem(SETTINGS_KEY);
      return data ? { ...defaultSettings, ...JSON.parse(data) } : defaultSettings;
    } catch (error) {
      console.error("Error reading settings:", error);
      return defaultSettings;
    }
  },

  async saveSettings(settings: AppSettings): Promise<void> {
    try {
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error("Error saving settings:", error);
    }
  },

  async clearAllData(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([GOALS_KEY, CONTRIBUTIONS_KEY, SETTINGS_KEY]);
    } catch (error) {
      console.error("Error clearing data:", error);
    }
  },
};
