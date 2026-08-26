import { z } from "zod";

export const savedItemTypeSchema = z.enum(["CONTENT", "TEMPLATE", "TOOL", "IDEA"]);
export type SavedItemType = z.infer<typeof savedItemTypeSchema>;

export const saveItemSchema = z.object({
  itemType: savedItemTypeSchema,
  itemId: z.string().min(1, "Item ID is required"),
  title: z.string().min(1, "Title is required"),
  contentJson: z.any().optional(),
});

export type SaveItemInput = z.infer<typeof saveItemSchema>;

export interface SavedItemRecord {
  id: string;
  userId: string;
  itemType: SavedItemType;
  itemId: string;
  title: string;
  contentJson?: any;
  createdAt: string;
  updatedAt: string;
}
