import { z } from "zod";

export const subscriptionPlanSchema = z.enum(["FREE", "PRO", "ADVANCED", "PREMIUM", "BUSINESS"]);
export type SubscriptionPlan = z.infer<typeof subscriptionPlanSchema>;

export const featureEntitlementSchema = z.enum([
  "BASIC_ANALYTICS",
  "ADVANCED_ANALYTICS",
  "BASIC_SCHEDULING",
  "ADVANCED_SCHEDULING",
  "BRAND_VOICE",
  "CONTENT_REPURPOSING",
  "PERFORMANCE_ADVISOR",
  "BULK_GENERATION",
  "BULK_PUBLISHING",
  "PRIORITY_QUEUE",
  "TEAM_WORKSPACES",
  "CLIENT_APPROVALS",
  "CLIENT_PORTAL",
]);
export type FeatureEntitlement = z.infer<typeof featureEntitlementSchema>;

export interface PlanDefinition {
  id: SubscriptionPlan;
  name: string;
  priceInr: number;
  monthlyWorkflows: number; // 3 for FREE (lifetime), otherwise per month
  isLifetimeLimit: boolean;
  socialAccountLimit: number;
  rateLimitPerHour: number;
  features: FeatureEntitlement[];
  description: string;
}

export const SAAS_PLANS_REGISTRY: Record<SubscriptionPlan, PlanDefinition> = {
  FREE: {
    id: "FREE",
    name: "Free Trial",
    priceInr: 0,
    monthlyWorkflows: 10,
    isLifetimeLimit: false,
    socialAccountLimit: 1,
    rateLimitPerHour: 10,
    features: ["BASIC_SCHEDULING", "BASIC_ANALYTICS"],
    description: "10 free credits for your first month, then 3 free credits every month after.",
  },
  PRO: {
    id: "PRO",
    name: "Pro Studio",
    priceInr: 59,
    monthlyWorkflows: 50,
    isLifetimeLimit: false,
    socialAccountLimit: 5,
    rateLimitPerHour: 30,
    features: [
      "BASIC_SCHEDULING",
      "ADVANCED_SCHEDULING",
      "BASIC_ANALYTICS",
      "BRAND_VOICE",
      "CONTENT_REPURPOSING",
    ],
    description: "Essential social content scheduling, Brand Voice, and content repurposing.",
  },
  ADVANCED: {
    id: "ADVANCED",
    name: "Advanced Atelier",
    priceInr: 99,
    monthlyWorkflows: 150,
    isLifetimeLimit: false,
    socialAccountLimit: 15,
    rateLimitPerHour: 60,
    features: [
      "BASIC_SCHEDULING",
      "ADVANCED_SCHEDULING",
      "BASIC_ANALYTICS",
      "ADVANCED_ANALYTICS",
      "BRAND_VOICE",
      "CONTENT_REPURPOSING",
      "PERFORMANCE_ADVISOR",
      "BULK_GENERATION",
    ],
    description: "High-volume creation with AI Performance Advisor and bulk generation.",
  },
  PREMIUM: {
    id: "PREMIUM",
    name: "Premium Engine",
    priceInr: 149,
    monthlyWorkflows: 300,
    isLifetimeLimit: false,
    socialAccountLimit: 30,
    rateLimitPerHour: 90,
    features: [
      "BASIC_SCHEDULING",
      "ADVANCED_SCHEDULING",
      "BASIC_ANALYTICS",
      "ADVANCED_ANALYTICS",
      "BRAND_VOICE",
      "CONTENT_REPURPOSING",
      "PERFORMANCE_ADVISOR",
      "BULK_GENERATION",
      "BULK_PUBLISHING",
      "PRIORITY_QUEUE",
    ],
    description: "Full multi-channel publishing engine with priority processing.",
  },
  BUSINESS: {
    id: "BUSINESS",
    name: "Business Enterprise",
    priceInr: 299,
    monthlyWorkflows: 500,
    isLifetimeLimit: false,
    socialAccountLimit: 50,
    rateLimitPerHour: 120,
    features: [
      "BASIC_SCHEDULING",
      "ADVANCED_SCHEDULING",
      "BASIC_ANALYTICS",
      "ADVANCED_ANALYTICS",
      "BRAND_VOICE",
      "CONTENT_REPURPOSING",
      "PERFORMANCE_ADVISOR",
      "BULK_GENERATION",
      "BULK_PUBLISHING",
      "PRIORITY_QUEUE",
      "TEAM_WORKSPACES",
      "CLIENT_APPROVALS",
      "CLIENT_PORTAL",
    ],
    description: "Maximum scale with team management, client approval portal, and dedicated workspaces.",
  },
};
