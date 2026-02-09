import { createServerFn } from "@tanstack/react-start";
import { ObjectId } from "mongodb";
import { z } from "zod";

import type {
  Block,
  ExperimentDay,
  LocalizedText,
  Overview,
  SelectOption,
  Task,
} from "@/types/shared";

import { adminMiddleware } from "./auth";
import { type Box, serializeBox } from "./boxes";

import { getExperiments, getSubscriptions } from "../db/client";
import type {
  BlockDoc,
  BoxDoc,
  ExperimentDayDoc,
  ExperimentDoc,
  OverviewDoc,
  SelectOptionDoc,
  TaskDoc,
} from "../db/types";

// ============ Validation ============

export const publishedExperimentSchema = z.object({
  name: z.object({
    en: z.string().min(1, "English name is required"),
    es: z.string().min(1, "Spanish name is required"),
  }),
  boxId: z.custom((val) => val != null, "A box must be selected"),
  days: z
    .array(
      z.object({
        dayNumber: z.number(),
        tasks: z
          .array(
            z.object({
              name: z.object({
                en: z.string().min(1, "Task English name is required"),
                es: z.string().min(1, "Task Spanish name is required"),
              }),
            })
          )
          .min(1, "Each day must have at least one task"),
      })
    )
    .min(1, "At least one day is required"),
});

function validateForPublish(experiment: ExperimentDoc) {
  const result = publishedExperimentSchema.safeParse(experiment);
  if (!result.success) {
    const errors = result.error.issues.map((e) => e.message).join(", ");
    throw new Error(`Cannot publish: ${errors}`);
  }
}

// ============ Types ============

export type ExperimentStatus = "draft" | "published";

// Base experiment fields shared between draft and published
interface BaseExperiment {
  id: string;
  name: LocalizedText;
  overviews?: Overview[];
  days: ExperimentDay[];
}

// Draft experiment - boxId is optional
export interface DraftExperiment extends BaseExperiment {
  status: "draft";
  boxId?: string;
}

// Published experiment - boxId is required
export interface PublishedExperiment extends BaseExperiment {
  status: "published";
  boxId: string;
}

// Union type for any experiment (used by admin)
export type Experiment = DraftExperiment | PublishedExperiment;


// ============ Serialization ============

function serializeSelectOption(doc: SelectOptionDoc): SelectOption {
  return {
    value: doc.value,
    label: {
      en: doc.label.en,
      es: doc.label.es,
    },
  };
}

function serializeOverview(doc: OverviewDoc): Overview {
  return {
    id: doc.id,
    title: {
      en: doc.title.en,
      es: doc.title.es,
    },
    thumbnail: doc.thumbnail,
    content: {
      en: doc.content.en,
      es: doc.content.es,
    },
  };
}

function serializeBlock(doc: BlockDoc): Block {
  if (doc.type === "markdown") {
    return {
      type: "markdown",
      id: doc.id,
      content: {
        en: doc.content?.en,
        es: doc.content?.es,
      },
    };
  }

  if (doc.type === "text" || doc.type === "number") {
    return {
      type: doc.type,
      id: doc.id!,
      label: {
        en: doc.label?.en || "",
        es: doc.label?.es || "",
      },
      helpText: doc.helpText
        ? { en: doc.helpText.en || "", es: doc.helpText.es || "" }
        : undefined,
      required: doc.required,
      placeholder: doc.placeholder
        ? { en: doc.placeholder.en || "", es: doc.placeholder.es || "" }
        : undefined,
    };
  }

  if (doc.type === "slider") {
    return {
      type: "slider",
      id: doc.id!,
      label: {
        en: doc.label?.en || "",
        es: doc.label?.es || "",
      },
      helpText: doc.helpText
        ? { en: doc.helpText.en || "", es: doc.helpText.es || "" }
        : undefined,
      required: doc.required,
      min: doc.min ?? 0,
      max: doc.max ?? 100,
      step: doc.step ?? 1,
      tickmarks: doc.tickmarks,
    };
  }

  // select
  return {
    type: "select",
    id: doc.id!,
    label: {
      en: doc.label?.en || "",
      es: doc.label?.es || "",
    },
    helpText: doc.helpText
      ? { en: doc.helpText.en || "", es: doc.helpText.es || "" }
      : undefined,
    required: doc.required,
    options: (doc.options || []).map(serializeSelectOption),
  };
}

export function serializeTask(doc: TaskDoc): Task {
  return {
    id: doc.id,
    name: {
      en: doc.name.en,
      es: doc.name.es,
    },
    icon: doc.icon,
    blocks: doc.blocks?.map(serializeBlock),
  };
}

function serializeExperimentDay(doc: ExperimentDayDoc): ExperimentDay {
  return {
    id: doc.id,
    dayNumber: doc.dayNumber,
    tasks: doc.tasks.map(serializeTask),
  };
}

export function serializeExperiment(doc: ExperimentDoc): Experiment {
  const base = {
    id: doc._id.toString(),
    name: {
      en: doc.name.en,
      es: doc.name.es,
    },
    overviews: doc.overviews?.map(serializeOverview),
    days: doc.days.map(serializeExperimentDay),
  };

  if (doc.status === "published") {
    return {
      ...base,
      status: "published",
      boxId: doc.boxId!.toString(),
    } as PublishedExperiment;
  }

  return {
    ...base,
    status: "draft",
    ...(doc.boxId && { boxId: doc.boxId.toString() }),
  } as DraftExperiment;
}


// ============ Admin RPC Functions ============

interface OverviewInput {
  id: string;
  title: LocalizedText;
  thumbnail: string;
  content: LocalizedText;
}

interface SelectOptionInput {
  value: string;
  label: { en: string; es: string };
}

type BlockInput =
  | { type: "markdown"; id: string; content: { en?: string; es?: string } }
  | {
      type: "text";
      id: string;
      label: { en: string; es: string };
      helpText?: { en: string; es: string };
      placeholder?: { en: string; es: string };
      required?: boolean;
    }
  | {
      type: "number";
      id: string;
      label: { en: string; es: string };
      helpText?: { en: string; es: string };
      placeholder?: { en: string; es: string };
      required?: boolean;
    }
  | {
      type: "select";
      id: string;
      label: { en: string; es: string };
      helpText?: { en: string; es: string };
      required?: boolean;
      options: SelectOptionInput[];
    }
  | {
      type: "slider";
      id: string;
      label: { en: string; es: string };
      helpText?: { en: string; es: string };
      required?: boolean;
      min: number;
      max: number;
      step: number;
      tickmarks?: { value: number; label: string }[];
    };

interface TaskInput {
  id: string;
  name: LocalizedText;
  icon: string;
  blocks?: BlockInput[];
}

interface DayInput {
  id: string;
  dayNumber: number;
  tasks: TaskInput[];
}

interface CreateExperimentInput {
  name: LocalizedText;
  boxId?: string;
  overviews?: OverviewInput[];
  days?: DayInput[];
}

// Helper to convert overview input to doc format
function overviewInputToDoc(o: OverviewInput): OverviewDoc {
  return {
    id: o.id,
    title: o.title,
    thumbnail: o.thumbnail,
    content: o.content,
  };
}

// Helper to convert block input to doc format
function blockInputToDoc(b: BlockInput): BlockDoc {
  if (b.type === "markdown") {
    return {
      type: "markdown",
      id: b.id,
      content: b.content,
    };
  }
  if (b.type === "text" || b.type === "number") {
    return {
      type: b.type,
      id: b.id,
      label: b.label,
      helpText: b.helpText,
      placeholder: b.placeholder,
      required: b.required,
    };
  }
  if (b.type === "slider") {
    return {
      type: "slider",
      id: b.id,
      label: b.label,
      helpText: b.helpText,
      required: b.required,
      min: b.min,
      max: b.max,
      step: b.step,
      tickmarks: b.tickmarks,
    };
  }
  // select
  return {
    type: "select",
    id: b.id,
    label: b.label,
    helpText: b.helpText,
    required: b.required,
    options: b.options.map((opt) => ({
      value: opt.value,
      label: opt.label,
    })),
  };
}

// Helper to convert day input to doc format
function dayInputToDoc(d: DayInput): ExperimentDayDoc {
  return {
    id: d.id,
    dayNumber: d.dayNumber,
    tasks: d.tasks.map((t) => ({
      id: t.id,
      name: t.name,
      icon: t.icon,
      blocks: t.blocks?.map(blockInputToDoc),
    })),
  };
}

export const createExperiment = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .inputValidator((data: CreateExperimentInput) => data)
  .handler(async ({ data }): Promise<Experiment> => {
    const experiments = await getExperiments();
    const overviewDocs = data.overviews?.map(overviewInputToDoc) ?? [];
    const dayDocs = data.days?.map(dayInputToDoc) ?? [];

    const result = await experiments.insertOne({
      name: data.name,
      ...(data.boxId && { boxId: new ObjectId(data.boxId) }),
      overviews: overviewDocs,
      days: dayDocs,
      status: "draft",
    } as ExperimentDoc);
    const inserted = await experiments.findOne({ _id: result.insertedId });
    return serializeExperiment(inserted!);
  });

interface UpdateExperimentInput {
  id: string;
  name: LocalizedText;
  boxId?: string;
  overviews?: OverviewInput[];
  days?: DayInput[];
}

export const updateExperiment = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .inputValidator((data: UpdateExperimentInput) => data)
  .handler(async ({ data }): Promise<Experiment> => {
    const experiments = await getExperiments();
    const experiment = await experiments.findOne({ _id: new ObjectId(data.id) });
    if (!experiment) {
      throw new Error("Experiment not found");
    }

    const overviewDocs = data.overviews?.map(overviewInputToDoc);
    const dayDocs = data.days?.map(dayInputToDoc);

    // If published, validate the new data
    if (experiment.status === "published") {
      validateForPublish({
        ...experiment,
        name: data.name,
        ...(data.boxId !== undefined && { boxId: new ObjectId(data.boxId) }),
        ...(dayDocs !== undefined && { days: dayDocs }),
      });
    }

    const updated = await experiments.findOneAndUpdate(
      { _id: new ObjectId(data.id) },
      {
        $set: {
          name: data.name,
          ...(data.boxId !== undefined && { boxId: new ObjectId(data.boxId) }),
          ...(overviewDocs !== undefined && { overviews: overviewDocs }),
          ...(dayDocs !== undefined && { days: dayDocs }),
        },
      },
      { returnDocument: "after" },
    );
    return serializeExperiment(updated!);
  });

// For admin - get single experiment
export const getExperiment = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .inputValidator((data: string) => data)
  .handler(async ({ data: experimentId }): Promise<Experiment> => {
    const experiments = await getExperiments();
    const experiment = await experiments.findOne({
      _id: new ObjectId(experimentId),
    });
    if (!experiment) {
      throw new Error("Experiment not found");
    }
    return serializeExperiment(experiment);
  });

// Experiment with box data for display
export type ExperimentWithBox = Experiment & { box?: Box };

export const listAllExperiments = createServerFn({ method: "GET" })
  .middleware([adminMiddleware])
  .handler(async (): Promise<ExperimentWithBox[]> => {
    const experiments = await getExperiments();
    const docs = await experiments
      .aggregate<ExperimentDoc & { box?: BoxDoc[] }>([
        {
          $lookup: {
            from: "boxes",
            localField: "boxId",
            foreignField: "_id",
            as: "box",
          },
        },
      ])
      .toArray();
    return docs.map((doc) => ({
      ...serializeExperiment(doc),
      ...(doc.box?.[0] && { box: serializeBox(doc.box[0]) }),
    }));
  });

// Publish an experiment
export const publishExperiment = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .inputValidator((data: string) => data)
  .handler(async ({ data: experimentId }): Promise<Experiment> => {
    const experiments = await getExperiments();
    const experiment = await experiments.findOne({
      _id: new ObjectId(experimentId),
    });
    if (!experiment) {
      throw new Error("Experiment not found");
    }
    if (experiment.status !== "draft") {
      throw new Error("Experiment is already published");
    }
    // Validate required fields before publishing
    validateForPublish(experiment);
    const updated = await experiments.findOneAndUpdate(
      { _id: new ObjectId(experimentId) },
      { $set: { status: "published" } },
      { returnDocument: "after" }
    );
    return serializeExperiment(updated!);
  });

// Unpublish an experiment
export const unpublishExperiment = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .inputValidator((data: string) => data)
  .handler(async ({ data: experimentId }): Promise<Experiment> => {
    const experiments = await getExperiments();
    const subscriptions = await getSubscriptions();

    const experiment = await experiments.findOne({
      _id: new ObjectId(experimentId),
    });
    if (!experiment) {
      throw new Error("Experiment not found");
    }
    if (experiment.status !== "published") {
      throw new Error("Experiment is not published");
    }

    // Check for active subscriptions (offered or started)
    const activeSubscriptionCount = await subscriptions.countDocuments({
      experimentId: new ObjectId(experimentId),
      status: { $in: ["offered", "started"] },
    });
    if (activeSubscriptionCount > 0) {
      throw new Error(
        `Cannot unpublish: ${activeSubscriptionCount} active subscription(s) exist for this experiment`,
      );
    }

    const updated = await experiments.findOneAndUpdate(
      { _id: new ObjectId(experimentId) },
      { $set: { status: "draft" } },
      { returnDocument: "after" }
    );
    return serializeExperiment(updated!);
  });

// Delete an experiment
export const deleteExperiment = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .inputValidator((data: string) => data)
  .handler(async ({ data: experimentId }): Promise<void> => {
    const experiments = await getExperiments();
    const subscriptions = await getSubscriptions();

    // Check for any subscriptions linked to this experiment
    const subscriptionCount = await subscriptions.countDocuments({
      experimentId: new ObjectId(experimentId),
    });
    if (subscriptionCount > 0) {
      throw new Error(
        `Cannot delete: ${subscriptionCount} subscription(s) exist for this experiment`,
      );
    }

    const result = await experiments.deleteOne({
      _id: new ObjectId(experimentId),
    });
    if (result.deletedCount === 0) {
      throw new Error("Experiment not found");
    }
  });
