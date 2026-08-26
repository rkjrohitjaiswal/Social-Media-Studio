import { Router, Response } from "express";
import { AuthenticatedRequest, requireAuth } from "../middleware/auth.js";
import { SEED_TEMPLATES, createTemplateSchema } from "@ai-social/shared";
import { prisma } from "@ai-social/database";

export const templatesRouter = Router();

// GET /api/templates -> List all templates (built-in + user custom)
templatesRouter.get("/", requireAuth as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const category = req.query.category as string;
    const platform = req.query.platform as string;

    let userTemplates: any[] = [];
    try {
      userTemplates = await prisma.template.findMany({
        where: {
          OR: [{ isPublic: true }, { userId }],
        },
      });
    } catch {
      // In-memory fallback
    }

    let combined = [
      ...SEED_TEMPLATES.map((t) => ({ ...t, isPublic: true, isCustom: false })),
      ...userTemplates.map((ut) => ({
        id: ut.id,
        name: ut.name,
        description: ut.description,
        category: ut.category,
        platform: ut.platform,
        contentType: ut.contentType,
        structure: ut.structureJson,
        promptTemplate: ut.promptConfigJson?.promptTemplate || "",
        previewText: ut.description,
        isCustom: true,
      })),
    ];

    if (category) {
      combined = combined.filter((t) => t.category.toUpperCase() === category.toUpperCase());
    }

    if (platform) {
      combined = combined.filter((t) => t.platform.toUpperCase() === platform.toUpperCase());
    }

    return res.json({
      success: true,
      data: combined,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to fetch templates";
    return res.status(500).json({ error: msg });
  }
});

// POST /api/templates -> Create custom user template
templatesRouter.post("/", requireAuth as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const parse = createTemplateSchema.safeParse(req.body);

    if (!parse.success) {
      return res.status(400).json({ error: "Invalid template payload", details: parse.error.format() });
    }

    let created: any;
    try {
      created = await prisma.template.create({
        data: {
          userId,
          name: parse.data.name,
          description: parse.data.description,
          category: parse.data.category,
          platform: parse.data.platform,
          contentType: parse.data.contentType,
          structureJson: parse.data.structure,
          promptConfigJson: { promptTemplate: parse.data.promptTemplate },
          isPublic: false,
        },
      });
    } catch {
      created = {
        id: `tpl-${Date.now()}`,
        userId,
        ...parse.data,
        structure: parse.data.structure,
        isCustom: true,
        createdAt: new Date().toISOString(),
      };
    }

    return res.status(201).json({
      success: true,
      data: created,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to create template";
    return res.status(500).json({ error: msg });
  }
});
