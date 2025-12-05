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

export type WorkOperationType = "reception" | "returns";

export interface WorkSession {
  id: string;
  date: string;
  operationType: WorkOperationType;
  plannedEarning: number;
  plannedContribution: number;
  goalId?: string;
  createdAt: string;
  isCompleted?: boolean;
}

export interface AppSettings {
  userName: string;
  notificationsEnabled: boolean;
  averageDailyEarning: number;
}
