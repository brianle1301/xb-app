import { createServerFn } from "@tanstack/react-start";
import { Types } from "mongoose";

import type { Block, ExperimentDay, LocalizedText, SelectOption, Task } from "@/types/shared";

import {
  type BlockDoc,
  type BoxDoc,
  type ExperimentDayDoc,
  type ExperimentDoc,
  Experiment as ExperimentModel,
  type SelectOptionDoc,
  type TaskDoc,
} from "../db/models";
import { type Box, serializeBox } from "./boxes";

// ============ Types ============

export interface Experiment {
  _id: string;
  name: LocalizedText;
  description: LocalizedText;
  boxId: string;
  days: ExperimentDay[];
}

// Experiment with populated box
export interface ExperimentWithBox extends Omit<Experiment, "boxId"> {
  boxId: Box;
}

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

function serializeBlock(doc: BlockDoc): Block {
  if (doc.type === "markdown") {
    return {
      type: "markdown",
      content: {
        en: doc.content?.en,
        es: doc.content?.es,
      },
    };
  }

  if (doc.type === "input") {
    return {
      type: "input",
      id: doc.id!,
      label: {
        en: doc.label?.en || "",
        es: doc.label?.es || "",
      },
      helpText: doc.helpText
        ? { en: doc.helpText.en || "", es: doc.helpText.es || "" }
        : undefined,
      required: doc.required,
      inputType: doc.inputType!,
      placeholder: doc.placeholder
        ? { en: doc.placeholder.en || "", es: doc.placeholder.es || "" }
        : undefined,
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
    _id: doc._id!.toString(),
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
    dayNumber: doc.dayNumber,
    tasks: doc.tasks.map(serializeTask),
  };
}

// Type guard to check if boxId is populated
function isPopulatedBox(boxId: Types.ObjectId | BoxDoc): boxId is BoxDoc {
  return typeof boxId === "object" && "name" in boxId;
}

export function serializeExperiment(doc: ExperimentDoc): Experiment {
  // Handle boxId which might be ObjectId or populated BoxDoc
  const boxId = isPopulatedBox(doc.boxId)
    ? doc.boxId._id.toString()
    : doc.boxId.toString();

  return {
    _id: doc._id.toString(),
    name: {
      en: doc.name.en,
      es: doc.name.es,
    },
    description: {
      en: doc.description.en,
      es: doc.description.es,
    },
    boxId,
    days: doc.days.map(serializeExperimentDay),
  };
}

// Type for experiment with populated box
interface ExperimentWithBoxDoc extends Omit<ExperimentDoc, "boxId"> {
  boxId: BoxDoc;
}

export function serializeExperimentWithBox(doc: ExperimentWithBoxDoc): ExperimentWithBox {
  return {
    _id: doc._id.toString(),
    name: {
      en: doc.name.en,
      es: doc.name.es,
    },
    description: {
      en: doc.description.en,
      es: doc.description.es,
    },
    boxId: serializeBox(doc.boxId),
    days: doc.days.map(serializeExperimentDay),
  };
}

// ============ RPC Functions ============

export const listExperimentsByBox = createServerFn({ method: "POST" })
  .inputValidator((data: string) => data)
  .handler(async ({ data: boxId }): Promise<Experiment[]> => {
    const experiments = await ExperimentModel.find({ boxId }).lean<ExperimentDoc[]>();
    return experiments.map(serializeExperiment);
  });

export const getExperiment = createServerFn({ method: "POST" })
  .inputValidator((data: string) => data)
  .handler(async ({ data: experimentId }): Promise<Experiment> => {
    const experiment = await ExperimentModel.findById(experimentId).lean<ExperimentDoc>();
    if (!experiment) {
      throw new Error("Experiment not found");
    }
    return serializeExperiment(experiment);
  });

export const listAllExperiments = createServerFn({ method: "GET" }).handler(
  async (): Promise<Experiment[]> => {
    const experiments = await ExperimentModel.find().lean<ExperimentDoc[]>();
    return experiments.map(serializeExperiment);
  },
);
