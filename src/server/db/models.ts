import mongoose, { type Document, Schema } from "mongoose";

// Supported languages
export type Language = "en" | "es";

// Localized text interface
interface LocalizedText {
  en: string;
  es: string;
}

// Content block types
export interface ContentBlock {
  type: "markdown";
  content: LocalizedText;
}

// Task Document
export interface ITask extends Document {
  name: LocalizedText;
  icon: string;
  blocks: ContentBlock[];
  order: number;
}

const TaskSchema = new Schema<ITask>({
  name: {
    en: { type: String, required: true },
    es: { type: String, required: true },
  },
  icon: { type: String, required: true },
  blocks: [
    {
      type: { type: String, enum: ["markdown"], required: true },
      content: {
        en: { type: String, required: true },
        es: { type: String, required: true },
      },
    },
  ],
  order: { type: Number, required: true },
});

// Day's tasks
export interface IDay {
  dayNumber: number;
  tasks: mongoose.Types.ObjectId[];
}

// Experiment Document
export interface IExperiment extends Document {
  name: LocalizedText;
  description: LocalizedText;
  days: IDay[];
  boxId: mongoose.Types.ObjectId;
}

const ExperimentSchema = new Schema<IExperiment>({
  name: {
    en: { type: String, required: true },
    es: { type: String, required: true },
  },
  description: {
    en: { type: String, required: true },
    es: { type: String, required: true },
  },
  days: [
    {
      dayNumber: { type: Number, required: true },
      tasks: [{ type: Schema.Types.ObjectId, ref: "Task" }],
    },
  ],
  boxId: { type: Schema.Types.ObjectId, ref: "Box", required: true },
});

// Box Document
export interface IBox extends Document {
  name: LocalizedText;
  description: LocalizedText;
  thumbnail: string;
  order: number;
}

const BoxSchema = new Schema<IBox>({
  name: {
    en: { type: String, required: true },
    es: { type: String, required: true },
  },
  description: {
    en: { type: String, required: true },
    es: { type: String, required: true },
  },
  thumbnail: { type: String, required: true },
  order: { type: Number, required: true },
});

// Journal Entry Document
export interface IJournalEntry extends Document {
  userId: string; // For now, just a string. In future, could be ObjectId
  experimentId: mongoose.Types.ObjectId;
  taskId: mongoose.Types.ObjectId;
  date: Date;
  response: string;
}

const JournalEntrySchema = new Schema<IJournalEntry>(
  {
    userId: { type: String, required: true },
    experimentId: {
      type: Schema.Types.ObjectId,
      ref: "Experiment",
      required: true,
    },
    taskId: { type: Schema.Types.ObjectId, ref: "Task", required: true },
    date: { type: Date, required: true },
    response: { type: String, required: true },
  },
  { timestamps: true },
);

// Export models
export const Task =
  mongoose.models.Task || mongoose.model<ITask>("Task", TaskSchema);
export const Experiment =
  mongoose.models.Experiment ||
  mongoose.model<IExperiment>("Experiment", ExperimentSchema);
export const Box =
  mongoose.models.Box || mongoose.model<IBox>("Box", BoxSchema);
export const JournalEntry =
  mongoose.models.JournalEntry ||
  mongoose.model<IJournalEntry>("JournalEntry", JournalEntrySchema);
