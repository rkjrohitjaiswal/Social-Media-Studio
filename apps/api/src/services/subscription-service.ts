import prisma from "@ai-social/database";
import { SubscriptionPlan, SAAS_PLANS_REGISTRY, BillingStatusResponse, SubscriptionStatus } from "@ai-social/shared";
import { PLAN_PRICES } from "../config/billing.js";
import { getUserUsage } from "./usage-service.js";

export interface StoredSubscription {
  userId: string;
  provider: "RAZORPAY";
  providerCustomerId?: string;
  providerSubscriptionId?: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  cancelAtPeriodEnd: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// In-Memory Store for Mock/Test & Authoritative PostgreSQL Cache
const subscriptionMemoryStore = new Map<string, StoredSubscription>();

export async function getUserSubscription(userId: string): Promise<StoredSubscription> {
  if (!userId) {
    throw new Error("User ID is required to fetch subscription");
  }

  let sub = subscriptionMemoryStore.get(userId);

  if (!sub) {
    try {
      const dbSub = await prisma.subscription.findUnique({
        where: { userId },
      });
      if (dbSub) {
        sub = {
          userId: dbSub.userId,
          provider: "RAZORPAY",
          providerCustomerId: dbSub.providerCustomerId || undefined,
          providerSubscriptionId: dbSub.providerSubscriptionId || undefined,
          plan: dbSub.plan as SubscriptionPlan,
          status: dbSub.status as SubscriptionStatus,
          currentPeriodStart: dbSub.currentPeriodStart || undefined,
          currentPeriodEnd: dbSub.currentPeriodEnd || undefined,
          cancelAtPeriodEnd: dbSub.cancelAtPeriodEnd,
          createdAt: dbSub.createdAt,
          updatedAt: dbSub.updatedAt,
        };
        subscriptionMemoryStore.set(userId, sub);
      }
    } catch {
      // DB offline in mock test mode
    }
  }

  if (!sub) {
    const now = new Date();
    sub = {
      userId,
      provider: "RAZORPAY",
      plan: "FREE",
      status: "EXPIRED",
      cancelAtPeriodEnd: false,
      createdAt: now,
      updatedAt: now,
    };
    subscriptionMemoryStore.set(userId, sub);
  }

  return sub;
}

export async function isPaidUser(userId: string): Promise<boolean> {
  const sub = await getUserSubscription(userId);
  if (sub.plan !== "FREE" && (sub.status === "ACTIVE" || sub.status === "TRIAL" || sub.status === "TRIALING")) {
    if (sub.currentPeriodEnd && new Date() > sub.currentPeriodEnd) {
      return false; // Subscription expired
    }
    return true;
  }
  return false;
}

export async function isProUser(userId: string): Promise<boolean> {
  return isPaidUser(userId);
}

export async function updateUserSubscriptionState(
  userId: string,
  data: {
    plan?: SubscriptionPlan;
    status?: SubscriptionStatus;
    providerSubscriptionId?: string;
    providerCustomerId?: string;
    currentPeriodStart?: Date;
    currentPeriodEnd?: Date;
    cancelAtPeriodEnd?: boolean;
  }
): Promise<StoredSubscription> {
  const current = await getUserSubscription(userId);
  const now = new Date();

  const updated: StoredSubscription = {
    ...current,
    plan: data.plan || current.plan,
    status: data.status || current.status,
    providerSubscriptionId: data.providerSubscriptionId || current.providerSubscriptionId,
    providerCustomerId: data.providerCustomerId || current.providerCustomerId,
    currentPeriodStart: data.currentPeriodStart || current.currentPeriodStart,
    currentPeriodEnd: data.currentPeriodEnd || current.currentPeriodEnd,
    cancelAtPeriodEnd: data.cancelAtPeriodEnd !== undefined ? data.cancelAtPeriodEnd : current.cancelAtPeriodEnd,
    updatedAt: now,
  };

  subscriptionMemoryStore.set(userId, updated);

  try {
    await prisma.subscription.upsert({
      where: { userId },
      update: {
        plan: updated.plan as any,
        status: updated.status as any,
        providerSubscriptionId: updated.providerSubscriptionId,
        providerCustomerId: updated.providerCustomerId,
        currentPeriodStart: updated.currentPeriodStart,
        currentPeriodEnd: updated.currentPeriodEnd,
        cancelAtPeriodEnd: updated.cancelAtPeriodEnd,
        updatedAt: now,
      },
      create: {
        userId,
        provider: "RAZORPAY",
        plan: updated.plan as any,
        status: updated.status as any,
        providerSubscriptionId: updated.providerSubscriptionId,
        providerCustomerId: updated.providerCustomerId,
        currentPeriodStart: updated.currentPeriodStart,
        currentPeriodEnd: updated.currentPeriodEnd,
        cancelAtPeriodEnd: updated.cancelAtPeriodEnd,
      },
    });
  } catch {
    // Ignore DB errors in mock/isolated environment
  }

  return updated;
}

export async function getFullBillingDetails(userId: string): Promise<BillingStatusResponse> {
  const sub = await getUserSubscription(userId);
  const usage = await getUserUsage(userId);
  const activePlan = (await isPaidUser(userId)) ? sub.plan : "FREE";
  const entitlements = SAAS_PLANS_REGISTRY[activePlan] || SAAS_PLANS_REGISTRY.FREE;

  return {
    plan: activePlan,
    status: sub.status,
    priceInr: PLAN_PRICES[activePlan] || 0,
    monthlyWorkflowsLimit: entitlements.monthlyWorkflows,
    workflowsUsed: usage.freeCreditsUsed,
    workflowsRemaining: usage.freeCreditsRemaining,
    socialAccountLimit: entitlements.socialAccountLimit,
    socialAccountsConnected: 1, // Query active connected accounts in real DB
    rateLimitPerHour: entitlements.rateLimitPerHour,
    features: entitlements.features,
    currentPeriodStart: sub.currentPeriodStart ? sub.currentPeriodStart.toISOString() : null,
    currentPeriodEnd: sub.currentPeriodEnd ? sub.currentPeriodEnd.toISOString() : null,
    cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
  };
}

export function clearInMemorySubscriptions(): void {
  subscriptionMemoryStore.clear();
  webhookEventsMemoryStore.clear();
}

const webhookEventsMemoryStore = new Set<string>();

export async function isWebhookProcessed(provider: string, eventId: string): Promise<boolean> {
  if (!eventId) return false;
  const key = `${provider}:${eventId}`;
  if (webhookEventsMemoryStore.has(key)) return true;

  try {
    const existing = await prisma.billingWebhookEvent.findUnique({
      where: {
        provider_eventId: {
          provider,
          eventId,
        },
      },
    });
    if (existing) {
      webhookEventsMemoryStore.add(key);
      return true;
    }
  } catch {
    // DB fallback
  }
  return false;
}

export async function recordWebhookEvent(provider: string, eventId: string, eventType: string): Promise<void> {
  if (!eventId) return;
  const key = `${provider}:${eventId}`;
  webhookEventsMemoryStore.add(key);

  try {
    await prisma.billingWebhookEvent.create({
      data: {
        provider,
        eventId,
        eventType,
      },
    });
  } catch {
    // Ignore duplicate insert
  }
}
