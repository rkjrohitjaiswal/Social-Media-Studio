import { z } from "zod";

export const aiGoalIdSchema = z.enum([
  "GROW_AUDIENCE",
  "INCREASE_ENGAGEMENT",
  "GENERATE_LEADS",
  "SELL_PRODUCTS",
  "BUILD_PERSONAL_BRAND",
  "CREATE_VIRAL_CONTENT",
  "AUTOMATE_SOCIAL",
  "IMPROVE_PERFORMANCE",
]);

export type AiGoalId = z.infer<typeof aiGoalIdSchema>;

export interface AiGoalDefinition {
  id: AiGoalId;
  name: string;
  description: string;
  iconName: string;
  recommendedContentTypes: string[];
  recommendedPlatforms: string[];
  recommendedWorkflow: string[];
  campaignStructure: {
    recommendedPostsCount: number;
    funnelStage: string;
    ctaStrategy: string;
  };
}

export const AI_GOALS_REGISTRY: Record<AiGoalId, AiGoalDefinition> = {
  GROW_AUDIENCE: {
    id: "GROW_AUDIENCE",
    name: "Grow My Audience",
    description: "Expand your reach and attract relevant followers with discoverability-focused content.",
    iconName: "Users",
    recommendedContentTypes: ["Reel", "Carousel", "Infographic", "Short"],
    recommendedPlatforms: ["INSTAGRAM", "TIKTOK", "YOUTUBE", "LINKEDIN"],
    recommendedWorkflow: [
      "Target Audience Alignment",
      "High-Discovery Hook",
      "Educational Value Delivery",
      "Follower Growth CTA",
      "Platform Multi-Adaptation",
    ],
    campaignStructure: {
      recommendedPostsCount: 5,
      funnelStage: "Top of Funnel (Awareness)",
      ctaStrategy: "Follow for daily insights",
    },
  },
  INCREASE_ENGAGEMENT: {
    id: "INCREASE_ENGAGEMENT",
    name: "Increase Engagement",
    description: "Drive comments, saves, shares, and conversations with interactive content angles.",
    iconName: "MessageCircle",
    recommendedContentTypes: ["Carousel", "Question Post", "Poll", "Story"],
    recommendedPlatforms: ["INSTAGRAM", "LINKEDIN", "X", "THREADS"],
    recommendedWorkflow: [
      "Controversy/Question Angle",
      "Relatable Story Hook",
      "Value Breakdown",
      "Comment Trigger Question",
      "Cross-Platform Publish",
    ],
    campaignStructure: {
      recommendedPostsCount: 4,
      funnelStage: "Middle of Funnel (Engagement)",
      ctaStrategy: "Share your thoughts in the comments",
    },
  },
  GENERATE_LEADS: {
    id: "GENERATE_LEADS",
    name: "Generate Leads",
    description: "Capture qualified leads, DMs, and email signups with irresistible lead magnets.",
    iconName: "Target",
    recommendedContentTypes: ["Carousel", "Resource Drop", "Case Study"],
    recommendedPlatforms: ["LINKEDIN", "INSTAGRAM", "FACEBOOK", "X"],
    recommendedWorkflow: [
      "Problem/Pain Point Highlight",
      "Lead Magnet Reveal",
      "Value Teaser",
      "DM/Link Click CTA",
      "Follow-up Automation Trigger",
    ],
    campaignStructure: {
      recommendedPostsCount: 3,
      funnelStage: "Middle to Bottom of Funnel",
      ctaStrategy: "Comment 'VAULT' to receive the guide instantly",
    },
  },
  SELL_PRODUCTS: {
    id: "SELL_PRODUCTS",
    name: "Sell Products",
    description: "Highlight product features, customer transformations, and offer urgency to drive sales.",
    iconName: "ShoppingBag",
    recommendedContentTypes: ["Product Video", "Carousel Showcase", "Testimonial"],
    recommendedPlatforms: ["INSTAGRAM", "TIKTOK", "PINTEREST", "FACEBOOK"],
    recommendedWorkflow: [
      "Product Aesthetic Showcase",
      "Customer Problem & Solution",
      "Social Proof / Review",
      "Offer & Urgency CTA",
      "Direct Shop Link",
    ],
    campaignStructure: {
      recommendedPostsCount: 5,
      funnelStage: "Bottom of Funnel (Conversion)",
      ctaStrategy: "Tap link in bio to claim 20% off today",
    },
  },
  BUILD_PERSONAL_BRAND: {
    id: "BUILD_PERSONAL_BRAND",
    name: "Build My Personal Brand",
    description: "Establish authority, share founder lessons, and build trust through authentic voice.",
    iconName: "Award",
    recommendedContentTypes: ["Thought Leadership", "Behind the Scenes", "Story"],
    recommendedPlatforms: ["LINKEDIN", "X", "INSTAGRAM", "THREADS"],
    recommendedWorkflow: [
      "Personal Experience / Lesson",
      "Core Insight Extraction",
      "Actionable Takeaway",
      "Discussion Prompt CTA",
      "Personal Aesthetic Styling",
    ],
    campaignStructure: {
      recommendedPostsCount: 4,
      funnelStage: "Authority & Consideration",
      ctaStrategy: "Repost if this resonated with your journey",
    },
  },
  CREATE_VIRAL_CONTENT: {
    id: "CREATE_VIRAL_CONTENT",
    name: "Create Viral Content",
    description: "Capitalize on trending formats, punchy hooks, and high-shareability aesthetics.",
    iconName: "Flame",
    recommendedContentTypes: ["Reel Script", "Trending Hook", "Meme/Relatable"],
    recommendedPlatforms: ["INSTAGRAM", "TIKTOK", "YOUTUBE", "THREADS"],
    recommendedWorkflow: [
      "Pattern Interrupt Hook (First 3s)",
      "High-Pace Visual Concept",
      "Emotional Trigger Point",
      "Share/Tag a Friend CTA",
      "Multi-Format Export",
    ],
    campaignStructure: {
      recommendedPostsCount: 3,
      funnelStage: "Viral Reach",
      ctaStrategy: "Send this to someone who needs to see it",
    },
  },
  AUTOMATE_SOCIAL: {
    id: "AUTOMATE_SOCIAL",
    name: "Automate My Social Media",
    description: "Batch generate a full week of consistent content tailored across all platforms in minutes.",
    iconName: "Zap",
    recommendedContentTypes: ["Multi-Platform Batch", "Content Calendar"],
    recommendedPlatforms: ["INSTAGRAM", "LINKEDIN", "FACEBOOK", "X", "PINTEREST"],
    recommendedWorkflow: [
      "Pillar Topic Selection",
      "AI Batch Content Matrix Generation",
      "Brand Voice Verification",
      "Multi-Platform Format Adaptation",
      "Auto-Schedule to Queue",
    ],
    campaignStructure: {
      recommendedPostsCount: 7,
      funnelStage: "Full Funnel Batching",
      ctaStrategy: "Automated multi-channel scheduling",
    },
  },
  IMPROVE_PERFORMANCE: {
    id: "IMPROVE_PERFORMANCE",
    name: "Improve My Performance",
    description: "Use AI analytics insights to double down on winning hooks, formats, and posting times.",
    iconName: "TrendingUp",
    recommendedContentTypes: ["Top-Performer Remake", "Data-Driven Variation"],
    recommendedPlatforms: ["INSTAGRAM", "LINKEDIN", "YOUTUBE", "X"],
    recommendedWorkflow: [
      "Performance Intelligence Analysis",
      "Top-Performing Pattern Extraction",
      "AI Copy & Creative Optimization",
      "A/B Variant Generation",
      "Optimized Schedule Dispatch",
    ],
    campaignStructure: {
      recommendedPostsCount: 3,
      funnelStage: "Optimization & Scale",
      ctaStrategy: "Optimized based on historical analytics",
    },
  },
};

export const runGoalWorkflowSchema = z.object({
  goalId: aiGoalIdSchema,
  targetAudience: z.string().optional(),
  brandContext: z.string().optional(),
  productName: z.string().optional(),
  customNotes: z.string().optional(),
  targetPlatforms: z.array(z.string()).default(["INSTAGRAM", "LINKEDIN"]),
});

export type RunGoalWorkflowInput = z.infer<typeof runGoalWorkflowSchema>;
