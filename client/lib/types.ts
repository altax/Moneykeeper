export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  createdAt: string;
  updatedAt: string;
  isArchived?: boolean;
  archivedAt?: string;
}

export interface Contribution {
  id: string;
  goalId: string;
  amount: number;
  note?: string;
  date: string;
  createdAt: string;
}

export interface AppSettings {
  userName: string;
  notificationsEnabled: boolean;
  averageDailyEarning: number;
}
