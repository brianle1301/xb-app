import mongoose, { Schema } from "mongoose";

// Supported languages
export type Language = "en" | "es";

// Localized text schema (reusable)
const localizedText = {
  en: { type: String, required: true },
  es: { type: String, required: true },
} as const;

// Task schema (embedded in Experiment days)
const TaskSchema = new Schema(
  {
    name: localizedText,
    icon: { type: String, required: true },
    blocks: [
      {
        type: { type: String, enum: ["markdown"], required: true },
        content: localizedText,
      },
    ],
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
const BoxSchema = new Schema({
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
    experimentId: {
      type: Schema.Types.ObjectId,
      ref: "Experiment",
      required: true,
    },
    taskId: { type: Schema.Types.ObjectId, required: true },
    date: { type: Date, required: true },
    response: { type: String, required: true },
  },
  { timestamps: true },
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

// Export models
export const Experiment = mongoose.model("Experiment", ExperimentSchema);
export const Box = mongoose.model("Box", BoxSchema);
export const Subscription = mongoose.model("Subscription", SubscriptionSchema);
export const JournalEntry = mongoose.model("JournalEntry", JournalEntrySchema);
export const TaskCompletion = mongoose.model(
  "TaskCompletion",
  TaskCompletionSchema,
);
