import { createServerFn } from "@tanstack/react-start";
import { ObjectId } from "mongodb";

import type { LocalizedText } from "@/types/shared";

import { getBoxes } from "../db/client";
import type { BoxDoc } from "../db/types";

// ============ Types ============

export interface Box {
  _id: string;
  name: LocalizedText;
  description: LocalizedText;
  thumbnail: string;
  icon: string;
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
    icon: doc.icon,
    order: doc.order,
  };
}

// ============ RPC Functions ============

export const listBoxes = createServerFn({ method: "GET" }).handler(
  async (): Promise<Box[]> => {
    const boxes = await getBoxes();
    const docs = await boxes.find().sort({ order: 1 }).toArray();
    return docs.map(serializeBox);
  }
);

export const getBox = createServerFn({ method: "POST" })
  .inputValidator((data: string) => data)
  .handler(async ({ data: boxId }): Promise<Box> => {
    const boxes = await getBoxes();
    const box = await boxes.findOne({ _id: new ObjectId(boxId) });
    if (!box) {
      throw new Error("Box not found");
    }
    return serializeBox(box);
  });
