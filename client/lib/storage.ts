import AsyncStorage from "@react-native-async-storage/async-storage";
import { Goal, Contribution, AppSettings, WorkSession, Safe, SafeTransaction } from "./types";

const GOALS_KEY = "@kopilka_goals";
const CONTRIBUTIONS_KEY = "@kopilka_contributions";
const SETTINGS_KEY = "@kopilka_settings";
const WORK_SESSIONS_KEY = "@kopilka_work_sessions";
const SAFE_KEY = "@kopilka_safe";
const SAFE_TRANSACTIONS_KEY = "@kopilka_safe_transactions";

const defaultSettings: AppSettings = {
  userName: "",
  notificationsEnabled: false,
  averageDailyEarning: 0,
};

const defaultSafe: Safe = {
  balance: 0,
  updatedAt: new Date().toISOString(),
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

  async getActiveGoals(): Promise<Goal[]> {
    const goals = await this.getGoals();
    return goals.filter((g) => !g.isArchived);
  },

  async getArchivedGoals(): Promise<Goal[]> {
    const goals = await this.getGoals();
    return goals.filter((g) => g.isArchived);
  },

  async saveGoals(goals: Goal[]): Promise<void> {
    try {
      await AsyncStorage.setItem(GOALS_KEY, JSON.stringify(goals));
    } catch (error) {
      console.error("Error saving goals:", error);
    }
  },

  async isGoalNameUnique(name: string, excludeId?: string): Promise<boolean> {
    const goals = await this.getActiveGoals();
    const trimmedName = name.trim().toLowerCase();
    return !goals.some((g) => {
      if (excludeId && g.id === excludeId) return false;
      return g.name.trim().toLowerCase() === trimmedName;
    });
  },

  async addGoal(goal: Omit<Goal, "id" | "currentAmount" | "createdAt" | "updatedAt">): Promise<Goal> {
    const goals = await this.getGoals();
    const newGoal: Goal = {
      ...goal,
      id: Date.now().toString(),
      currentAmount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isArchived: false,
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

  async archiveGoal(id: string): Promise<Goal | null> {
    return this.updateGoal(id, {
      isArchived: true,
      archivedAt: new Date().toISOString(),
    });
  },

  async unarchiveGoal(id: string): Promise<Goal | null> {
    return this.updateGoal(id, {
      isArchived: false,
      archivedAt: undefined,
    });
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
      await AsyncStorage.multiRemove([
        GOALS_KEY, 
        CONTRIBUTIONS_KEY, 
        SETTINGS_KEY, 
        WORK_SESSIONS_KEY,
        SAFE_KEY,
        SAFE_TRANSACTIONS_KEY,
      ]);
    } catch (error) {
      console.error("Error clearing data:", error);
    }
  },

  async getWorkSessions(): Promise<WorkSession[]> {
    try {
      const data = await AsyncStorage.getItem(WORK_SESSIONS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error("Error reading work sessions:", error);
      return [];
    }
  },

  async saveWorkSessions(sessions: WorkSession[]): Promise<void> {
    try {
      await AsyncStorage.setItem(WORK_SESSIONS_KEY, JSON.stringify(sessions));
    } catch (error) {
      console.error("Error saving work sessions:", error);
    }
  },

  async isDuplicateShift(date: Date, shiftType: ShiftType): Promise<boolean> {
    const sessions = await this.getWorkSessions();
    const dateString = date.toISOString().split("T")[0];

    return sessions.some((session) => {
      const sessionDateString = new Date(session.date).toISOString().split("T")[0];
      return (
        sessionDateString === dateString &&
        session.shiftType === shiftType &&
        !session.isCompleted
      );
    });
  },

  async addWorkSession(session: Omit<WorkSession, "id" | "createdAt">): Promise<WorkSession | null> {
    const isDuplicate = await this.isDuplicateShift(new Date(session.date), session.shiftType);
    if (isDuplicate) {
      return null;
    }

    const sessions = await this.getWorkSessions();
    const newSession: WorkSession = {
      ...session,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    };
    sessions.push(newSession);
    await this.saveWorkSessions(sessions);
    return newSession;
  },

  async updateWorkSession(id: string, updates: Partial<WorkSession>): Promise<WorkSession | null> {
    const sessions = await this.getWorkSessions();
    const index = sessions.findIndex((s) => s.id === id);
    if (index === -1) return null;

    sessions[index] = {
      ...sessions[index],
      ...updates,
    };
    await this.saveWorkSessions(sessions);
    return sessions[index];
  },

  async deleteWorkSession(id: string): Promise<void> {
    const sessions = await this.getWorkSessions();
    const filtered = sessions.filter((s) => s.id !== id);
    await this.saveWorkSessions(filtered);
  },

  async getActiveWorkSession(): Promise<WorkSession | null> {
    const sessions = await this.getWorkSessions();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return sessions.find((s) => {
      const sessionDate = new Date(s.date);
      sessionDate.setHours(0, 0, 0, 0);
      return sessionDate >= today && !s.isCompleted;
    }) || null;
  },

  async getActiveWorkSessions(): Promise<WorkSession[]> {
    const sessions = await this.getWorkSessions();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return sessions.filter((s) => {
      const sessionDate = new Date(s.date);
      sessionDate.setHours(0, 0, 0, 0);
      return sessionDate >= today && !s.isCompleted;
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  },

  async getSafe(): Promise<Safe> {
    try {
      const data = await AsyncStorage.getItem(SAFE_KEY);
      return data ? JSON.parse(data) : defaultSafe;
    } catch (error) {
      console.error("Error reading safe:", error);
      return defaultSafe;
    }
  },

  async saveSafe(safe: Safe): Promise<void> {
    try {
      await AsyncStorage.setItem(SAFE_KEY, JSON.stringify(safe));
    } catch (error) {
      console.error("Error saving safe:", error);
    }
  },

  async getSafeTransactions(): Promise<SafeTransaction[]> {
    try {
      const data = await AsyncStorage.getItem(SAFE_TRANSACTIONS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error("Error reading safe transactions:", error);
      return [];
    }
  },

  async saveSafeTransactions(transactions: SafeTransaction[]): Promise<void> {
    try {
      await AsyncStorage.setItem(SAFE_TRANSACTIONS_KEY, JSON.stringify(transactions));
    } catch (error) {
      console.error("Error saving safe transactions:", error);
    }
  },

  async addToSafe(amount: number, note?: string): Promise<SafeTransaction> {
    const safe = await this.getSafe();
    safe.balance += amount;
    safe.updatedAt = new Date().toISOString();
    await this.saveSafe(safe);

    const transactions = await this.getSafeTransactions();
    const newTransaction: SafeTransaction = {
      id: Date.now().toString(),
      amount,
      type: "deposit",
      note,
      date: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    transactions.push(newTransaction);
    await this.saveSafeTransactions(transactions);

    return newTransaction;
  },

  async withdrawFromSafe(amount: number, goalId?: string, note?: string): Promise<SafeTransaction | null> {
    const safe = await this.getSafe();
    if (safe.balance < amount) return null;

    safe.balance -= amount;
    safe.updatedAt = new Date().toISOString();
    await this.saveSafe(safe);

    const transactions = await this.getSafeTransactions();
    const newTransaction: SafeTransaction = {
      id: Date.now().toString(),
      amount,
      type: "withdrawal",
      note,
      goalId,
      date: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    transactions.push(newTransaction);
    await this.saveSafeTransactions(transactions);

    if (goalId) {
      await this.addContribution({
        goalId,
        amount,
        note: note || "Пополнение из сейфа",
        date: new Date().toISOString(),
      });
    }

    return newTransaction;
  },

  async distributeFromSafe(distributions: { goalId: string; amount: number }[]): Promise<void> {
    const safe = await this.getSafe();
    const totalAmount = distributions.reduce((sum, d) => sum + d.amount, 0);
    
    if (safe.balance < totalAmount) return;

    for (const dist of distributions) {
      await this.withdrawFromSafe(dist.amount, dist.goalId, "Распределение из сейфа");
    }
  },

  async completeWorkSession(
    id: string,
    actualEarning: number,
    actualContribution: number,
    goalId?: string
  ): Promise<WorkSession | null> {
    const sessions = await this.getWorkSessions();
    const index = sessions.findIndex((s) => s.id === id);
    if (index === -1) return null;

    const session = sessions[index];

    sessions[index] = {
      ...session,
      status: "completed",
      isCompleted: true,
      actualEarning,
      actualContribution,
      goalId: goalId || session.goalId,
      completedAt: new Date().toISOString(),
    };
    await this.saveWorkSessions(sessions);

    if (actualContribution > 0 && (goalId || session.goalId)) {
      await this.addContribution({
        goalId: goalId || session.goalId!,
        amount: actualContribution,
        note: `Смена ${new Date(session.date).toLocaleDateString("ru-RU")}`,
        date: new Date().toISOString(),
      });
    }

    await this.updateAverageDailyEarning();

    return sessions[index];
  },

  async skipWorkSession(id: string): Promise<void> {
    const sessions = await this.getWorkSessions();
    const index = sessions.findIndex((s) => s.id === id);
    if (index === -1) return;

    sessions[index] = {
      ...sessions[index],
      status: "skipped",
      isCompleted: true,
      completedAt: new Date().toISOString(),
    };
    await this.saveWorkSessions(sessions);
  },

  async getPlannedWorkSessions(): Promise<WorkSession[]> {
    const sessions = await this.getWorkSessions();
    return sessions.filter((s) => !s.isCompleted && s.status !== "completed" && s.status !== "skipped")
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  },

  async getCompletedWorkSessions(): Promise<WorkSession[]> {
    const sessions = await this.getWorkSessions();
    return sessions.filter((s) => s.status === "completed" || (s.isCompleted && s.actualEarning !== undefined))
      .sort((a, b) => new Date(b.completedAt || b.date).getTime() - new Date(a.completedAt || a.date).getTime());
  },

  async getPlannedSessionsSummary(): Promise<{
    totalEarnings: number;
    totalContributions: number;
    freeToSafe: number;
    sessionsCount: number;
  }> {
    const sessions = await this.getPlannedWorkSessions();
    const totalEarnings = sessions.reduce((sum, s) => sum + s.plannedEarning, 0);
    const totalContributions = sessions.reduce((sum, s) => sum + s.plannedContribution, 0);
    return {
      totalEarnings,
      totalContributions,
      freeToSafe: totalEarnings - totalContributions,
      sessionsCount: sessions.length,
    };
  },

  async getTodayOrPastUncompletedSessions(): Promise<WorkSession[]> {
    const sessions = await this.getWorkSessions();
    const now = new Date();
    now.setHours(23, 59, 59, 999);
    
    return sessions.filter((s) => {
      const sessionDate = new Date(s.date);
      sessionDate.setHours(23, 59, 59, 999);
      return sessionDate <= now && !s.isCompleted && s.status !== "completed" && s.status !== "skipped";
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  },

  async getExpiredUncompletedSessions(): Promise<WorkSession[]> {
    const sessions = await this.getWorkSessions();
    const now = new Date();
    const expiredSessions: WorkSession[] = [];

    for (const session of sessions) {
      if (session.isCompleted || session.status === "completed" || session.status === "skipped") {
        continue;
      }

      const shiftDate = new Date(session.date);
      if (session.shiftType === "day") {
        shiftDate.setHours(8, 0, 0, 0);
      } else {
        shiftDate.setHours(20, 0, 0, 0);
      }

      const shiftEndDate = new Date(shiftDate);
      shiftEndDate.setHours(shiftEndDate.getHours() + 12);

      if (now >= shiftEndDate) {
        expiredSessions.push(session);
      }
    }

    return expiredSessions;
  },

  async autoCompleteExpiredSessions(): Promise<{ skipped: number; sessions: WorkSession[] }> {
    return { skipped: 0, sessions: [] };
  },

  async updateAverageDailyEarning(): Promise<void> {
    const completedSessions = await this.getCompletedWorkSessions();
    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);

    const recentSessions = completedSessions.filter((s) => {
      const date = new Date(s.completedAt || s.date);
      return date >= last30Days;
    });

    if (recentSessions.length === 0) return;

    const totalEarnings = recentSessions.reduce((sum, s) => sum + (s.actualEarning || 0), 0);
    const daysWithShifts = new Set(
      recentSessions.map((s) => new Date(s.date).toDateString())
    ).size;

    const averagePerShiftDay = daysWithShifts > 0 ? totalEarnings / daysWithShifts : 0;

    const settings = await this.getSettings();
    settings.averageDailyEarning = Math.round(averagePerShiftDay);
    await this.saveSettings(settings);
  },

  async calculateDaysToGoal(goalId: string): Promise<number | null> {
    const goals = await this.getGoals();
    const goal = goals.find((g) => g.id === goalId);
    if (!goal) return null;

    const remaining = goal.targetAmount - goal.currentAmount;
    if (remaining <= 0) return 0;

    const settings = await this.getSettings();
    if (!settings.averageDailyEarning || settings.averageDailyEarning <= 0) {
      return null;
    }

    return Math.ceil(remaining / settings.averageDailyEarning);
  },

  async getEarningsStats(): Promise<{
    today: number;
    thisWeek: number;
    thisMonth: number;
    allTime: number;
  }> {
    const sessions = await this.getCompletedWorkSessions();
    const now = new Date();
    
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay() + 1);
    weekStart.setHours(0, 0, 0, 0);
    
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    let today = 0;
    let thisWeek = 0;
    let thisMonth = 0;
    let allTime = 0;

    for (const session of sessions) {
      const earning = session.actualEarning || 0;
      const date = new Date(session.completedAt || session.date);
      
      allTime += earning;
      
      if (date >= monthStart) {
        thisMonth += earning;
      }
      
      if (date >= weekStart) {
        thisWeek += earning;
      }
      
      if (date >= todayStart) {
        today += earning;
      }
    }

    return { today, thisWeek, thisMonth, allTime };
  },

  async getGoalProgress(goalId: string): Promise<{
    percentage: number;
    remaining: number;
    daysToGoal: number | null;
    contributionsCount: number;
    lastContribution: Contribution | null;
  }> {
    const goals = await this.getGoals();
    const goal = goals.find((g) => g.id === goalId);
    
    if (!goal) {
      return {
        percentage: 0,
        remaining: 0,
        daysToGoal: null,
        contributionsCount: 0,
        lastContribution: null,
      };
    }

    const contributions = await this.getContributionsByGoal(goalId);
    const daysToGoal = await this.calculateDaysToGoal(goalId);

    return {
      percentage: goal.targetAmount > 0 
        ? Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100))
        : 0,
      remaining: Math.max(0, goal.targetAmount - goal.currentAmount),
      daysToGoal,
      contributionsCount: contributions.length,
      lastContribution: contributions[0] || null,
    };
  },
};
