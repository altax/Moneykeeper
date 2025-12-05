export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  icon?: string;
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
export type ShiftType = "day" | "night";

export interface WorkSession {
  id: string;
  date: string;
  operationType: WorkOperationType;
  shiftType: ShiftType;
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

export interface Safe {
  balance: number;
  updatedAt: string;
}

export interface SafeTransaction {
  id: string;
  amount: number;
  type: "deposit" | "withdrawal";
  note?: string;
  goalId?: string;
  date: string;
  createdAt: string;
}
