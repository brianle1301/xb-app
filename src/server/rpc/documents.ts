import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import type { LocalizedText } from "@/types/shared";

import { adminMiddleware } from "./auth";

import { getDocuments } from "../db/client";
import type { DocumentDoc } from "../db/types";

// ============ Predefined Document Slugs ============

export const DOCUMENT_SLUGS = [
  { slug: "pre-registration", name: "Pre-Registration", description: "Shown to visitors before they sign up" },
  { slug: "post-registration", name: "Post-Registration", description: "Shown to users after their first login" },
  { slug: "lab-overview", name: "Lab Overview", description: "Shown at the top of the Labs page" },
] as const;

export type DocumentSlug = (typeof DOCUMENT_SLUGS)[number]["slug"];


// ============ Validation ============

export const publishedDocumentSchema = z.object({
  title: z.object({
    en: z.string().min(1, "English title is required"),
    es: z.string().min(1, "Spanish title is required"),
  }),
  content: z.object({
    en: z.string().min(1, "English content is required"),
    es: z.string().min(1, "Spanish content is required"),
  }),
});

function validateForPublish(doc: DocumentDoc) {
  const result = publishedDocumentSchema.safeParse(doc);
  if (!result.success) {
    const errors = result.error.issues.map((e) => e.message).join(", ");
    throw new Error(`Cannot publish: ${errors}`);
  }
}

// ============ Types ============

export type DocumentStatus = "draft" | "published";

export interface Document {
  id: string;
  slug: string;
  title: LocalizedText;
  content: LocalizedText;
  status: DocumentStatus;
  createdAt: Date;
  updatedAt: Date;
}

// ============ Serialization ============

export function serializeDocument(doc: DocumentDoc): Document {
  return {
    id: doc._id.toString(),
    slug: doc.slug,
    title: {
      en: doc.title.en,
      es: doc.title.es,
    },
    content: {
      en: doc.content.en,
      es: doc.content.es,
    },
    status: doc.status,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

// ============ Public RPC Functions ============

// Fetch document by slug - NO AUTH (for pre-registration)
export const getDocumentBySlug = createServerFn({ method: "POST" })
  .inputValidator((data: string) => data)
  .handler(async ({ data: slug }): Promise<Document | null> => {
    const documents = await getDocuments();
    const doc = await documents.findOne({ slug, status: "published" });
    if (!doc) {
      return null;
    }
    return serializeDocument(doc);
  });

// ============ Admin RPC Functions ============

// Document info for admin list (includes predefined metadata)
export interface DocumentInfo {
  slug: string;
  name: string;
  description: string;
  document: Document | null;
}

// List all predefined documents with their data (admin)
export const listAllDocuments = createServerFn({ method: "GET" })
  .middleware([adminMiddleware])
  .handler(async (): Promise<DocumentInfo[]> => {
    const documents = await getDocuments();
    const docs = await documents.find({}).toArray();
    const docsBySlug = new Map(docs.map((d) => [d.slug, d]));

    return DOCUMENT_SLUGS.map((slugInfo) => ({
      slug: slugInfo.slug,
      name: slugInfo.name,
      description: slugInfo.description,
      document: docsBySlug.has(slugInfo.slug)
        ? serializeDocument(docsBySlug.get(slugInfo.slug)!)
        : null,
    }));
  });

// Get document by slug (admin)
export const getDocumentBySlugAdmin = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .inputValidator((data: string) => data)
  .handler(async ({ data: slug }): Promise<Document> => {
    // Validate slug is predefined
    const slugInfo = DOCUMENT_SLUGS.find((s) => s.slug === slug);
    if (!slugInfo) {
      throw new Error(`Invalid document slug: ${slug}`);
    }

    const documents = await getDocuments();
    const doc = await documents.findOne({ slug });
    if (!doc) {
      throw new Error(`Document "${slug}" not found. Documents must be pre-created.`);
    }

    return serializeDocument(doc);
  });

interface UpdateDocumentInput {
  slug: string;
  title: LocalizedText;
  content: LocalizedText;
}

export const updateDocument = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .inputValidator((data: UpdateDocumentInput) => data)
  .handler(async ({ data }): Promise<Document> => {
    const documents = await getDocuments();
    const doc = await documents.findOne({ slug: data.slug });
    if (!doc) {
      throw new Error(`Document "${data.slug}" not found`);
    }

    // If published, validate required fields
    if (doc.status === "published") {
      validateForPublish({
        ...doc,
        title: data.title,
        content: data.content,
      });
    }

    const updated = await documents.findOneAndUpdate(
      { slug: data.slug },
      {
        $set: {
          title: data.title,
          content: data.content,
          updatedAt: new Date(),
        },
      },
      { returnDocument: "after" },
    );
    return serializeDocument(updated!);
  });

export const publishDocument = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .inputValidator((data: string) => data)
  .handler(async ({ data: slug }): Promise<Document> => {
    const documents = await getDocuments();
    const doc = await documents.findOne({ slug });
    if (!doc) {
      throw new Error("Document not found");
    }
    if (doc.status !== "draft") {
      throw new Error("Document is already published");
    }

    // Validate required fields before publishing
    validateForPublish(doc);

    const updated = await documents.findOneAndUpdate(
      { slug },
      { $set: { status: "published", updatedAt: new Date() } },
      { returnDocument: "after" },
    );
    return serializeDocument(updated!);
  });

export const unpublishDocument = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .inputValidator((data: string) => data)
  .handler(async ({ data: slug }): Promise<Document> => {
    const documents = await getDocuments();
    const doc = await documents.findOne({ slug });
    if (!doc) {
      throw new Error("Document not found");
    }
    if (doc.status !== "published") {
      throw new Error("Document is not published");
    }

    const updated = await documents.findOneAndUpdate(
      { slug },
      { $set: { status: "draft", updatedAt: new Date() } },
      { returnDocument: "after" },
    );
    return serializeDocument(updated!);
  });
