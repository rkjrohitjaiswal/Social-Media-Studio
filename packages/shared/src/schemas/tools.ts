import { z } from "zod";

export const toolCategoryIdSchema = z.enum([
  "COPYWRITING",
  "VIDEO_SCRIPTS",
  "VISUAL_FORMATS",
  "STRATEGY_PLANNING",
  "GROWTH_LEADS",
  "ANALYTICS_AI",
]);

export type ToolCategoryId = z.infer<typeof toolCategoryIdSchema>;

export interface AiToolDefinition {
  id: string;
  name: string;
  description: string;
  category: ToolCategoryId;
  iconName: string;
  supportedPlatforms: string[];
  inputPlaceholder: string;
  workflowCreditCost: number;
  featured?: boolean;
}

export const AI_TOOLS_REGISTRY: AiToolDefinition[] = [
  {
    id: "caption-generator",
    name: "Caption Generator",
    description: "Generate high-converting, brand-aligned captions with structured hooks and CTAs.",
    category: "COPYWRITING",
    iconName: "FileText",
    supportedPlatforms: ["INSTAGRAM", "LINKEDIN", "FACEBOOK", "X", "THREADS"],
    inputPlaceholder: "Describe your post topic, launch, or message...",
    workflowCreditCost: 1,
    featured: true,
  },
  {
    id: "hook-generator",
    name: "Hook Generator",
    description: "Generate 10 scroll-stopping hooks rated by virality score.",
    category: "COPYWRITING",
    iconName: "Sparkles",
    supportedPlatforms: ["INSTAGRAM", "TIKTOK", "YOUTUBE", "LINKEDIN", "X"],
    inputPlaceholder: "Enter your video/post topic or core benefit...",
    workflowCreditCost: 1,
    featured: true,
  },
  {
    id: "reel-script-generator",
    name: "Reel & Short Script Generator",
    description: "Create timed 15s - 60s Reel scripts with scene directions, audio cues, and voiceovers.",
    category: "VIDEO_SCRIPTS",
    iconName: "Video",
    supportedPlatforms: ["INSTAGRAM", "TIKTOK", "YOUTUBE"],
    inputPlaceholder: "What is your Reel or Short about?",
    workflowCreditCost: 1,
    featured: true,
  },
  {
    id: "carousel-generator",
    name: "Carousel Slide Generator",
    description: "Generate 5-10 slide outlines complete with visual headlines and detailed copy.",
    category: "VISUAL_FORMATS",
    iconName: "Layers",
    supportedPlatforms: ["INSTAGRAM", "LINKEDIN"],
    inputPlaceholder: "What educational topic or framework do you want to teach?",
    workflowCreditCost: 1,
    featured: true,
  },
  {
    id: "content-calendar-ai",
    name: "Content Calendar AI",
    description: "Generate a 7-day or 30-day strategic content calendar with daily post ideas.",
    category: "STRATEGY_PLANNING",
    iconName: "Calendar",
    supportedPlatforms: ["INSTAGRAM", "LINKEDIN", "X", "FACEBOOK"],
    inputPlaceholder: "Enter your niche, brand focus, or upcoming product launch goals...",
    workflowCreditCost: 1,
  },
  {
    id: "campaign-generator",
    name: "Campaign Generator",
    description: "Create a complete multi-asset social campaign from a single product brief.",
    category: "STRATEGY_PLANNING",
    iconName: "Megaphone",
    supportedPlatforms: ["INSTAGRAM", "LINKEDIN", "FACEBOOK", "PINTEREST"],
    inputPlaceholder: "Describe your campaign goal, product, or promotional offer...",
    workflowCreditCost: 1,
  },
  {
    id: "hashtag-assistant",
    name: "Hashtag & Keyword Assistant",
    description: "Find niche-specific hashtags and SEO search keywords to maximize post reach.",
    category: "COPYWRITING",
    iconName: "Hash",
    supportedPlatforms: ["INSTAGRAM", "TIKTOK", "LINKEDIN", "PINTEREST"],
    inputPlaceholder: "Enter primary industry or post topic keywords...",
    workflowCreditCost: 1,
  },
  {
    id: "cta-generator",
    name: "CTA & Lead Magnet Generator",
    description: "Generate irresistible call-to-action triggers for DMs, comments, and link clicks.",
    category: "GROWTH_LEADS",
    iconName: "Target",
    supportedPlatforms: ["INSTAGRAM", "LINKEDIN", "X", "FACEBOOK"],
    inputPlaceholder: "What action do you want readers to take?",
    workflowCreditCost: 1,
  },
  {
    id: "product-promotion-ai",
    name: "Product Promotion AI",
    description: "Transform product features into persuasive benefit-driven sales copy.",
    category: "GROWTH_LEADS",
    iconName: "ShoppingBag",
    supportedPlatforms: ["INSTAGRAM", "FACEBOOK", "PINTEREST", "TIKTOK"],
    inputPlaceholder: "Enter product details, price, key benefit, and offer details...",
    workflowCreditCost: 1,
  },
  {
    id: "lead-generation-ai",
    name: "Lead Generation AI",
    description: "Craft high-converting DM outreach templates and lead capture posts.",
    category: "GROWTH_LEADS",
    iconName: "UserPlus",
    supportedPlatforms: ["LINKEDIN", "INSTAGRAM", "X"],
    inputPlaceholder: "What lead magnet or free offer are you giving away?",
    workflowCreditCost: 1,
  },
  {
    id: "viral-idea-generator",
    name: "Viral Idea Generator",
    description: "Brainstorm 10 high-probability viral content concepts for your industry.",
    category: "STRATEGY_PLANNING",
    iconName: "Flame",
    supportedPlatforms: ["INSTAGRAM", "TIKTOK", "LINKEDIN", "THREADS", "X"],
    inputPlaceholder: "What is your target audience or niche interest?",
    workflowCreditCost: 1,
  },
  {
    id: "content-analyzer",
    name: "Content Quality & Tone Analyzer",
    description: "Analyze draft copy for brand voice alignment, clarity, and engagement score.",
    category: "ANALYTICS_AI",
    iconName: "CheckCircle2",
    supportedPlatforms: ["INSTAGRAM", "LINKEDIN", "X", "FACEBOOK"],
    inputPlaceholder: "Paste your draft copy or caption to evaluate...",
    workflowCreditCost: 1,
  },
];

export const executeToolSchema = z.object({
  toolId: z.string(),
  topicInput: z.string().min(2, "Topic or prompt is required"),
  platform: z.string().default("INSTAGRAM"),
  contentType: z.string().optional(),
  brandContext: z.string().optional(),
});

export type ExecuteToolInput = z.infer<typeof executeToolSchema>;
