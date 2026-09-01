import { z } from "zod";
import { documentStatuses, documentTypes } from "@/lib/documents";

export const documentInputSchema = z.object({
  title: z.string().trim().min(3).max(180),
  summary: z.string().trim().max(500).default(""),
  type: z.enum(documentTypes),
  status: z.enum(documentStatuses).default("draft"),
  author: z.string().trim().max(100).default(""),
  team: z.string().trim().max(100).default(""),
  tags: z.array(z.string().trim().min(1).max(40)).max(12).default([]),
  content: z.string().max(250_000).default(""),
});

export const documentUpdateSchema = documentInputSchema.partial();
