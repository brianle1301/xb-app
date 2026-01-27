import { createServerFn } from "@tanstack/react-start";
import { ObjectId } from "mongodb";
import { z } from "zod";

import type { LocalizedText } from "@/types/shared";

import { adminMiddleware, authMiddleware } from "./auth";

import { getBoxes, getExperiments } from "../db/client";
import type { BoxDoc } from "../db/types";

// ============ Validation ============

export const publishedBoxSchema = z.object({
  name: z.object({
    en: z.string().min(1, "English name is required"),
    es: z.string().min(1, "Spanish name is required"),
  }),
  description: z.object({
    en: z.string().min(1, "English description is required"),
    es: z.string().min(1, "Spanish description is required"),
  }),
  icon: z.string().min(1, "Icon is required"),
  thumbnail: z.string().min(1, "Thumbnail is required"),
});

function validateForPublish(box: BoxDoc) {
  const result = publishedBoxSchema.safeParse(box);
  if (!result.success) {
    const errors = result.error.issues.map((e) => e.message).join(", ");
    throw new Error(`Cannot publish: ${errors}`);
  }
}

// ============ Types ============

export type BoxStatus = "draft" | "published";

export interface Box {
  id: string;
  name: LocalizedText;
  description: LocalizedText;
  thumbnail: string;
  icon: string;
  status: BoxStatus;
}

// ============ Serialization ============

export function serializeBox(doc: BoxDoc): Box {
  return {
    id: doc._id.toString(),
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
    status: doc.status,
  };
}

// ============ RPC Functions ============

// For non-admin app - only returns published boxes
export const listPublishedBoxes = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async (): Promise<Box[]> => {
    const boxes = await getBoxes();
    const docs = await boxes.find({ status: "published" }).sort({ order: 1 }).toArray();
    return docs.map(serializeBox);
  });

// For admin - returns all boxes
export const listAllBoxes = createServerFn({ method: "GET" })
  .middleware([adminMiddleware])
  .handler(async (): Promise<Box[]> => {
    const boxes = await getBoxes();
    const docs = await boxes.find({}).sort({ order: 1 }).toArray();
    return docs.map(serializeBox);
  });

export const getBox = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator((data: string) => data)
  .handler(async ({ data: boxId }): Promise<Box> => {
    const boxes = await getBoxes();
    const box = await boxes.findOne({ _id: new ObjectId(boxId) });
    if (!box) {
      throw new Error("Box not found");
    }
    return serializeBox(box);
  });

// ============ Admin RPC Functions ============

interface CreateBoxInput {
  name: LocalizedText;
  description: LocalizedText;
  icon: string;
  thumbnail: string;
}

export const createBox = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .inputValidator((data: CreateBoxInput) => data)
  .handler(async ({ data }): Promise<Box> => {
    const boxes = await getBoxes();
    const result = await boxes.insertOne({
      name: data.name,
      description: data.description,
      icon: data.icon,
      thumbnail: data.thumbnail,
      status: "draft",
    } as BoxDoc);
    const inserted = await boxes.findOne({ _id: result.insertedId });
    return serializeBox(inserted!);
  });

interface UpdateBoxInput {
  id: string;
  name: LocalizedText;
  description: LocalizedText;
  icon: string;
  thumbnail: string;
}

export const updateBox = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .inputValidator((data: UpdateBoxInput) => data)
  .handler(async ({ data }): Promise<Box> => {
    const boxes = await getBoxes();
    const box = await boxes.findOne({ _id: new ObjectId(data.id) });
    if (!box) {
      throw new Error("Box not found");
    }
    // If published, validate required fields
    if (box.status === "published") {
      validateForPublish({
        ...box,
        name: data.name,
        description: data.description,
        icon: data.icon,
        thumbnail: data.thumbnail,
      });
    }
    const updated = await boxes.findOneAndUpdate(
      { _id: new ObjectId(data.id) },
      {
        $set: {
          name: data.name,
          description: data.description,
          icon: data.icon,
          thumbnail: data.thumbnail,
        },
      },
      { returnDocument: "after" },
    );
    return serializeBox(updated!);
  });

export const publishBox = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .inputValidator((data: string) => data)
  .handler(async ({ data: boxId }): Promise<Box> => {
    const boxes = await getBoxes();
    const box = await boxes.findOne({ _id: new ObjectId(boxId) });
    if (!box) {
      throw new Error("Box not found");
    }
    if (box.status !== "draft") {
      throw new Error("Box is already published");
    }
    // Validate required fields before publishing
    validateForPublish(box);
    const updated = await boxes.findOneAndUpdate(
      { _id: new ObjectId(boxId) },
      { $set: { status: "published" } },
      { returnDocument: "after" },
    );
    return serializeBox(updated!);
  });

export const unpublishBox = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .inputValidator((data: string) => data)
  .handler(async ({ data: boxId }): Promise<Box> => {
    const boxes = await getBoxes();
    const experiments = await getExperiments();

    const box = await boxes.findOne({ _id: new ObjectId(boxId) });
    if (!box) {
      throw new Error("Box not found");
    }
    if (box.status !== "published") {
      throw new Error("Box is not published");
    }

    // Check for published experiments linked to this box
    const publishedExperimentCount = await experiments.countDocuments({
      boxId: new ObjectId(boxId),
      status: "published",
    });
    if (publishedExperimentCount > 0) {
      throw new Error(
        `Cannot unpublish: ${publishedExperimentCount} published experiment(s) are linked to this box`,
      );
    }

    const updated = await boxes.findOneAndUpdate(
      { _id: new ObjectId(boxId) },
      { $set: { status: "draft" } },
      { returnDocument: "after" },
    );
    return serializeBox(updated!);
  });

export const deleteBox = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .inputValidator((data: string) => data)
  .handler(async ({ data: boxId }): Promise<void> => {
    const boxes = await getBoxes();
    const experiments = await getExperiments();

    // Check for any experiments linked to this box
    const experimentCount = await experiments.countDocuments({
      boxId: new ObjectId(boxId),
    });
    if (experimentCount > 0) {
      throw new Error(
        `Cannot delete: ${experimentCount} experiment(s) are linked to this box`,
      );
    }

    const result = await boxes.deleteOne({ _id: new ObjectId(boxId) });
    if (result.deletedCount === 0) {
      throw new Error("Box not found");
    }
  });
