import mongoose, { Schema, type Types } from "mongoose";

// Supported languages
export type Language = "en" | "es";

// ============ Document Types ============
// Define interfaces first, then use them as schema generics
// These represent what .lean() returns (plain objects)

interface LocalizedText {
  en: string;
  es: string;
}

export interface SelectOptionDoc {
  value: string;
  label: LocalizedText;
}

export interface BlockDoc {
  type: "markdown" | "input" | "select";
  content?: { en?: string; es?: string };
  id?: string;
  label?: { en?: string; es?: string };
  helpText?: { en?: string; es?: string };
  required?: boolean;
  inputType?: "text" | "number" | "textarea";
  placeholder?: { en?: string; es?: string };
  options?: SelectOptionDoc[];
}

export interface TaskDoc {
  _id?: Types.ObjectId;
  name: LocalizedText;
  icon: string;
  blocks?: BlockDoc[];
}

export interface ExperimentDayDoc {
  dayNumber: number;
  tasks: TaskDoc[];
}

export interface BoxDoc {
  _id: Types.ObjectId;
  name: LocalizedText;
  description: LocalizedText;
  thumbnail: string;
  order: number;
}

export interface ExperimentDoc {
  _id: Types.ObjectId;
  name: LocalizedText;
  description: LocalizedText;
  boxId: Types.ObjectId | BoxDoc;
  days: ExperimentDayDoc[];
}

export interface SubscriptionDoc {
  _id: Types.ObjectId;
  userId: string;
  experimentId: Types.ObjectId | ExperimentDoc;
  status: "offered" | "started" | "completed" | "abandoned";
  offeredAt: Date;
  startedAt?: Date;
  endedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface JournalEntryDoc {
  _id: Types.ObjectId;
  userId: string;
  subscriptionId: Types.ObjectId;
  experimentId: Types.ObjectId | ExperimentDoc;
  taskId: Types.ObjectId | TaskDoc;
  dayNumber: number;
  date: Date;
  responses: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskCompletionDoc {
  _id: Types.ObjectId;
  userId: string;
  subscriptionId: Types.ObjectId;
  taskId: Types.ObjectId;
  dayNumber: number;
  completedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ============ Schemas ============

// Localized text schema (reusable)
const localizedText = {
  en: { type: String, required: true },
  es: { type: String, required: true },
} as const;

// Select option schema for select blocks
const SelectOptionSchema = new Schema<SelectOptionDoc>(
  {
    value: { type: String, required: true },
    label: localizedText,
  },
  { _id: false },
);

// Block schema - supports markdown, input, and select types
const BlockSchema = new Schema<BlockDoc>(
  {
    type: { type: String, enum: ["markdown", "input", "select"], required: true },
    // For markdown blocks
    content: {
      en: { type: String },
      es: { type: String },
    },
    // For input/select blocks
    id: { type: String }, // unique identifier for the input within the task
    label: {
      en: { type: String },
      es: { type: String },
    },
    helpText: {
      en: { type: String },
      es: { type: String },
    },
    required: { type: Boolean, default: false },
    // For input blocks
    inputType: { type: String, enum: ["text", "number", "textarea"] },
    placeholder: {
      en: { type: String },
      es: { type: String },
    },
    // For select blocks
    options: [SelectOptionSchema],
  },
  { _id: false },
);

// Task schema (embedded in Experiment days)
const TaskSchema = new Schema<TaskDoc>(
  {
    name: localizedText,
    icon: { type: String, required: true },
    blocks: [BlockSchema],
  },
  { _id: true },
);

// Experiment
const ExperimentSchema = new Schema({
  name: localizedText,
  description: localizedText,
  boxId: { type: Schema.Types.ObjectId, ref: "Box", required: true },
  days: [
    {
      dayNumber: { type: Number, required: true },
      tasks: [TaskSchema],
    },
  ],
});

// Box
const BoxSchema = new Schema<BoxDoc>({
  name: localizedText,
  description: localizedText,
  thumbnail: { type: String, required: true },
  order: { type: Number, required: true },
});

// Subscription
const SubscriptionSchema = new Schema(
  {
    userId: { type: String, required: true },
    experimentId: {
      type: Schema.Types.ObjectId,
      ref: "Experiment",
      required: true,
    },
    status: {
      type: String,
      enum: ["offered", "started", "completed", "abandoned"],
      default: "offered",
      required: true,
    },
    offeredAt: { type: Date, required: true, default: Date.now },
    startedAt: { type: Date },
    endedAt: { type: Date },
  },
  { timestamps: true },
);

// Compound index to ensure unique active subscription per user/experiment
SubscriptionSchema.index(
  { userId: 1, experimentId: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: ["offered", "started"] } },
  },
);

// Journal Entry
const JournalEntrySchema = new Schema(
  {
    userId: { type: String, required: true },
    subscriptionId: {
      type: Schema.Types.ObjectId,
      ref: "Subscription",
      required: true,
    },
    experimentId: {
      type: Schema.Types.ObjectId,
      ref: "Experiment",
      required: true,
    },
    taskId: { type: Schema.Types.ObjectId, required: true },
    dayNumber: { type: Number, required: true },
    date: { type: Date, required: true },
    // responses is a map of block id -> user response value
    // For tasks without inputs, this will be empty
    responses: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

// Unique index: one journal entry per user/subscription/task/day
JournalEntrySchema.index(
  { userId: 1, subscriptionId: 1, taskId: 1, dayNumber: 1 },
  { unique: true },
);

// Task Completion - tracks when a user completes a task for a specific day
const TaskCompletionSchema = new Schema(
  {
    userId: { type: String, required: true },
    subscriptionId: {
      type: Schema.Types.ObjectId,
      ref: "Subscription",
      required: true,
    },
    taskId: { type: Schema.Types.ObjectId, required: true },
    dayNumber: { type: Number, required: true },
    completedAt: { type: Date, required: true, default: Date.now },
  },
  { timestamps: true },
);

// Unique index: one completion per user/subscription/task/day
TaskCompletionSchema.index(
  { userId: 1, subscriptionId: 1, taskId: 1, dayNumber: 1 },
  { unique: true },
);

// Clear existing models for HMR compatibility
delete mongoose.models.Experiment;
delete mongoose.models.Box;
delete mongoose.models.Subscription;
delete mongoose.models.JournalEntry;
delete mongoose.models.TaskCompletion;

// Export models
export const Experiment = mongoose.model("Experiment", ExperimentSchema);
export const Box = mongoose.model("Box", BoxSchema);
export const Subscription = mongoose.model("Subscription", SubscriptionSchema);
export const JournalEntry = mongoose.model("JournalEntry", JournalEntrySchema);
export const TaskCompletion = mongoose.model(
  "TaskCompletion",
  TaskCompletionSchema,
);
