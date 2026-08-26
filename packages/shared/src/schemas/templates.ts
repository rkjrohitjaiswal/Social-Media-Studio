import { z } from "zod";

export const templateCategorySchema = z.enum([
  "INSTAGRAM",
  "LINKEDIN",
  "YOUTUBE",
  "GENERAL",
]);

export type TemplateCategory = z.infer<typeof templateCategorySchema>;

export interface TemplateDefinition {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  platform: string;
  contentType: string;
  structure: string[];
  promptTemplate: string;
  previewText: string;
  badge?: string;
}

export const SEED_TEMPLATES: TemplateDefinition[] = [
  {
    id: "tpl-viral-hook-value-cta",
    name: "Viral Hook + Value + CTA",
    description: "High-retention structure designed to capture initial attention and guide readers to take action.",
    category: "GENERAL",
    platform: "INSTAGRAM",
    contentType: "Post",
    structure: [
      "1. Pattern Interrupt Hook (Bold statement/Question)",
      "2. Problem / Contrast Setup",
      "3. 3 Actionable Solution Steps",
      "4. Summary / Mindset Shift",
      "5. Explicit Clear CTA",
    ],
    promptTemplate: "Create a viral post about {topic} using a pattern-interrupt hook, 3 actionable tips, and a follow CTA.",
    previewText: "Stop making this common mistake when trying to scale your social reach...",
    badge: "VIRAL",
  },
  {
    id: "tpl-educational-carousel",
    name: "Educational 7-Slide Carousel",
    description: "Step-by-step framework presentation optimized for high save and share rates.",
    category: "INSTAGRAM",
    platform: "INSTAGRAM",
    contentType: "Carousel",
    structure: [
      "Slide 1: Cover Title & Bold Promise",
      "Slide 2: The Core Problem",
      "Slides 3-5: Step-by-Step Breakdown",
      "Slide 6: Pro Tip / Common Pitfall to Avoid",
      "Slide 7: Save & Share CTA",
    ],
    promptTemplate: "Generate a 7-slide educational carousel script about {topic} with clear slide titles and bullet points.",
    previewText: "7 Steps to Automate Your Brand Content Without Losing Authentic Tone",
    badge: "POPULAR",
  },
  {
    id: "tpl-thought-leadership",
    name: "LinkedIn Thought Leadership Post",
    description: "Authoritative, story-driven post for establishing industry expertise.",
    category: "LINKEDIN",
    platform: "LINKEDIN",
    contentType: "Thought Leadership",
    structure: [
      "1. Strong Contrarian Hook",
      "2. Personal Story / Real Industry Observation",
      "3. Key Takeaways & Lessons Learned",
      "4. Question for Industry Peers",
    ],
    promptTemplate: "Write a compelling LinkedIn thought-leadership post about {topic} sharing founder insights and an open question.",
    previewText: "Most brands fail at social media because they focus on output instead of outcome...",
    badge: "HIGH ENGAGEMENT",
  },
  {
    id: "tpl-product-launch",
    name: "Product Launch & Offer Announcement",
    description: "Persuasive product unveil structure with benefit highlights and offer urgency.",
    category: "GENERAL",
    platform: "INSTAGRAM",
    contentType: "Announcement",
    structure: [
      "1. Big Reveal Hook",
      "2. What It Solves (Customer Transformation)",
      "3. 3 Key Feature Highlights",
      "4. Launch Offer / Discount Detail",
      "5. Direct Link in Bio CTA",
    ],
    promptTemplate: "Draft an exciting product launch announcement post for {topic} with 3 feature highlights and launch discount CTA.",
    previewText: "It's finally here: Introducing the next evolution in brand content creation...",
    badge: "CONVERSION",
  },
  {
    id: "tpl-customer-testimonial",
    name: "Customer Case Study & Social Proof",
    description: "Showcase real client results to build trust and eliminate purchase friction.",
    category: "LINKEDIN",
    platform: "LINKEDIN",
    contentType: "Testimonial",
    structure: [
      "1. Before Result (Client Problem & Stagnation)",
      "2. The Pivot (System Implemented)",
      "3. The After Metric (Concrete Growth Metric)",
      "4. Key Lesson & Call To Action",
    ],
    promptTemplate: "Create a client success case study post for {topic} highlighting quantifiable results and transformation.",
    previewText: "How one agency scaled monthly content output 5x using structured prompt workflows...",
    badge: "SOCIAL PROOF",
  },
  {
    id: "tpl-lead-generation-post",
    name: "Lead Generation & Resource Drop",
    description: "Give away a high-value free resource or checklist in exchange for DMs or comments.",
    category: "GENERAL",
    platform: "LINKEDIN",
    contentType: "Lead Generation",
    structure: [
      "1. Free Resource Announcement",
      "2. What's Inside (Bullet List)",
      "3. Who This Is For",
      "4. Comment Keyword Trigger CTA",
    ],
    promptTemplate: "Write a lead generation resource drop post offering a free guide on {topic}. Instruct readers to comment a keyword.",
    previewText: "I put together our complete internal playbook for AI social workflows. Comment 'PLAYBOOK' and I'll send it over.",
    badge: "LEADS",
  },
  {
    id: "tpl-personal-brand-story",
    name: "Personal Brand Vulnerability & Lesson",
    description: "Connect deeply with your audience by sharing a lesson learned from a past struggle.",
    category: "GENERAL",
    platform: "X",
    contentType: "Personal Brand",
    structure: [
      "1. Vulnerable Failure / Struggle Hook",
      "2. The Turning Point Moment",
      "3. 3 Principles Learned",
      "4. Encouraging Closing Statement",
    ],
    promptTemplate: "Draft a personal brand story about {topic} sharing an early mistake, turning point, and 3 key principles.",
    previewText: "3 years ago I almost gave up on my studio. Here is the 1 shift that changed everything...",
  },
  {
    id: "tpl-reel-script-framework",
    name: "Reel Hook → Problem → Solution → CTA",
    description: "Pinchy short-form video framework structured for visual engagement and retention.",
    category: "YOUTUBE",
    platform: "YOUTUBE",
    contentType: "Short",
    structure: [
      "0-3s: Visual & Verbal Hook",
      "3-15s: Problem Explanation",
      "15-45s: 2 Fast Solution Tips",
      "45-60s: Strong Action CTA",
    ],
    promptTemplate: "Write a 60-second Short/Reel script for {topic} with visual directions, voiceover lines, and ending CTA.",
    previewText: "Visual: Quick cut of messy workspace. Voiceover: 'If your content creation takes more than 1 hour a day...'",
  },
];

export const createTemplateSchema = z.object({
  name: z.string().min(2, "Template name is required"),
  description: z.string().min(5, "Description is required"),
  category: templateCategorySchema.default("GENERAL"),
  platform: z.string().default("INSTAGRAM"),
  contentType: z.string().default("Post"),
  structure: z.array(z.string()).min(1),
  promptTemplate: z.string().min(10),
  previewText: z.string().optional(),
});

export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;
