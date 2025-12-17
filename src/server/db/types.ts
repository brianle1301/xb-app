import type { ObjectId } from "mongodb";

// Supported languages
export type Language = "en" | "es";

// ============ Document Types ============
// These represent what MongoDB returns (plain objects with ObjectId)

export interface LocalizedText {
  en: string;
  es: string;
}

export interface SelectOptionDoc {
  value: string;
  label: LocalizedText;
}

export interface BlockDoc {
  type: "markdown" | "text" | "number" | "select";
  content?: { en?: string; es?: string };
  id?: string;
  label?: { en?: string; es?: string };
  helpText?: { en?: string; es?: string };
  required?: boolean;
  placeholder?: { en?: string; es?: string };
  options?: SelectOptionDoc[];
}

export interface TaskDoc {
  _id?: ObjectId;
  name: LocalizedText;
  icon: string;
  blocks?: BlockDoc[];
}

// Content-only block for overviews (only markdown)
export interface ContentBlockDoc {
  type: "markdown";
  content?: { en?: string; es?: string };
}

export interface OverviewDoc {
  _id?: ObjectId;
  title: LocalizedText;
  thumbnail: string;
  blocks?: ContentBlockDoc[];
}

export interface ExperimentDayDoc {
  dayNumber: number;
  tasks: TaskDoc[];
}

export interface BoxDoc {
  _id: ObjectId;
  name: LocalizedText;
  description: LocalizedText;
  thumbnail: string;
  icon: string;
  order: number;
}

export interface ExperimentDoc {
  _id: ObjectId;
  name: LocalizedText;
  description: LocalizedText;
  boxId: ObjectId;
  overviews?: OverviewDoc[];
  days: ExperimentDayDoc[];
}

// For populated experiment (with box data)
export interface ExperimentWithBoxDoc extends Omit<ExperimentDoc, "boxId"> {
  boxId: BoxDoc;
}

export interface SubscriptionDoc {
  _id: ObjectId;
  userId: string;
  experimentId: ObjectId;
  status: "offered" | "started" | "completed" | "abandoned";
  offeredAt: Date;
  startedAt?: Date;
  endedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// For populated subscription (with experiment and box data)
export interface SubscriptionWithExperimentDoc extends Omit<SubscriptionDoc, "experimentId"> {
  experimentId: ExperimentWithBoxDoc;
}

export interface JournalEntryDoc {
  _id: ObjectId;
  userId: string;
  subscriptionId: ObjectId;
  experimentId: ObjectId;
  taskId: ObjectId;
  dayNumber: number;
  date: Date;
  responses: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
}

// For populated journal entry
export interface JournalEntryWithPopulatedDoc extends Omit<JournalEntryDoc, "experimentId" | "taskId"> {
  experimentId: ExperimentDoc;
  taskId: TaskDoc;
}

export interface TaskCompletionDoc {
  _id: ObjectId;
  userId: string;
  subscriptionId: ObjectId;
  taskId: ObjectId;
  dayNumber: number;
  completedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}
