import {
  SubscriptionPlan,
  FeatureEntitlement,
  PlanDefinition,
  SAAS_PLANS_REGISTRY,
} from "@ai-social/shared";
import { getUserSubscription } from "./subscription-service.js";

const PLAN_HIERARCHY: Record<SubscriptionPlan, number> = {
  FREE: 0,
  PRO: 1,
  ADVANCED: 2,
  PREMIUM: 3,
  BUSINESS: 4,
};

export async function getUserPlan(userId: string): Promise<SubscriptionPlan> {
  const sub = await getUserSubscription(userId);
  if (sub.status === "ACTIVE" || sub.status === "TRIAL" || sub.status === "TRIALING") {
    if (sub.currentPeriodEnd && new Date() > sub.currentPeriodEnd) {
      return "FREE"; // Expired subscription falls back to FREE
    }
    return sub.plan;
  }
  return "FREE";
}

export function getPlanEntitlements(plan: SubscriptionPlan): PlanDefinition {
  return SAAS_PLANS_REGISTRY[plan] || SAAS_PLANS_REGISTRY.FREE;
}

export async function requirePlan(
  userId: string,
  minimumPlan: SubscriptionPlan
): Promise<{ allowed: boolean; code?: string; message?: string; plan: SubscriptionPlan }> {
  const userPlan = await getUserPlan(userId);
  const userTier = PLAN_HIERARCHY[userPlan] ?? 0;
  const requiredTier = PLAN_HIERARCHY[minimumPlan] ?? 0;

  if (userTier >= requiredTier) {
    return { allowed: true, plan: userPlan };
  }

  return {
    allowed: false,
    code: "PLAN_UPGRADE_REQUIRED",
    message: `This feature requires a minimum plan of ${minimumPlan}. Your current plan is ${userPlan}.`,
    plan: userPlan,
  };
}

export async function canUseFeature(
  userId: string,
  feature: FeatureEntitlement
): Promise<{ allowed: boolean; code?: string; message?: string; plan: SubscriptionPlan }> {
  const plan = await getUserPlan(userId);
  const entitlements = getPlanEntitlements(plan);

  if (entitlements.features.includes(feature)) {
    return { allowed: true, plan };
  }

  return {
    allowed: false,
    code: "FEATURE_NOT_AVAILABLE",
    message: `Feature '${feature}' requires an upgraded plan tier. Your current plan is ${plan}.`,
    plan,
  };
}

export async function canConnectSocialAccount(
  userId: string,
  currentAccountCount: number
): Promise<{ allowed: boolean; limit: number; current: number; code?: string; message?: string }> {
  const plan = await getUserPlan(userId);
  const entitlements = getPlanEntitlements(plan);

  if (currentAccountCount < entitlements.socialAccountLimit) {
    return {
      allowed: true,
      limit: entitlements.socialAccountLimit,
      current: currentAccountCount,
    };
  }

  return {
    allowed: false,
    limit: entitlements.socialAccountLimit,
    current: currentAccountCount,
    code: "SOCIAL_ACCOUNT_LIMIT_REACHED",
    message: `Social account limit reached for ${plan} plan (Max: ${entitlements.socialAccountLimit}). Upgrade your subscription to connect more accounts.`,
  };
}
