import { createServerFn } from "@tanstack/react-start";

import type { LocalizedText } from "@/types/shared";

import { Box as BoxModel, type BoxDoc } from "../db/models";

// ============ Types ============

export interface Box {
  _id: string;
  name: LocalizedText;
  description: LocalizedText;
  thumbnail: string;
  order: number;
}

// ============ Serialization ============

export function serializeBox(doc: BoxDoc): Box {
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
    thumbnail: doc.thumbnail,
    order: doc.order,
  };
}

// ============ RPC Functions ============

export const listBoxes = createServerFn({ method: "GET" }).handler(
  async (): Promise<Box[]> => {
    const boxes = await BoxModel.find().sort({ order: 1 }).lean<BoxDoc[]>();
    return boxes.map(serializeBox);
  }
);

export const getBox = createServerFn({ method: "POST" })
  .inputValidator((data: string) => data)
  .handler(async ({ data: boxId }): Promise<Box> => {
    const box = await BoxModel.findById(boxId).lean<BoxDoc>();
    if (!box) {
      throw new Error("Box not found");
    }
    return serializeBox(box);
  });
