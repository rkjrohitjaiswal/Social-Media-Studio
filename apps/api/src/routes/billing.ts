import { Router, Response } from "express";
import { requireAuth, AuthenticatedRequest } from "../middleware/auth.js";
import {
  getFullBillingDetails,
  updateUserSubscriptionState,
  getUserSubscription,
  isWebhookProcessed,
  recordWebhookEvent,
} from "../services/subscription-service.js";
import { razorpayAdapter } from "../services/razorpay-adapter.js";
import { PLAN_PRICES, RAZORPAY_PLAN_IDS } from "../config/billing.js";
import { createCheckoutSchema, SubscriptionPlan } from "@ai-social/shared";

export const billingRouter = Router();

// GET /api/billing/subscription -> Fetch current user subscription & usage details
billingRouter.get("/subscription", requireAuth as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const details = await getFullBillingDetails(userId);
    return res.json({
      success: true,
      data: details,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to fetch billing status";
    return res.status(500).json({ error: msg });
  }
});

// Helper function to process subscription creation
async function handleSubscribe(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user!.id;

    // Validate request body
    const parse = createCheckoutSchema.safeParse(req.body || {});
    if (!parse.success) {
      return res.status(400).json({ error: "Invalid checkout request format. Select PRO, ADVANCED, PREMIUM, or BUSINESS plan." });
    }

    const requestedPlan = parse.data.plan as SubscriptionPlan;

    if (requestedPlan === "FREE") {
      return res.status(400).json({ error: "Cannot subscribe to FREE plan via Razorpay payment gateway." });
    }

    const expectedPrice = PLAN_PRICES[requestedPlan];

    if (!expectedPrice) {
      return res.status(400).json({ error: `Invalid plan selected: ${requestedPlan}` });
    }

    // Backend determines price and Razorpay plan ID authoritatively
    const checkoutResult = await razorpayAdapter.createSubscription(userId, requestedPlan, expectedPrice);

    return res.json({
      success: true,
      data: {
        ...checkoutResult,
        plan: requestedPlan,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to create checkout session";
    return res.status(500).json({ error: msg });
  }
}

// POST /api/billing/subscribe -> Primary subscription creation endpoint
billingRouter.post("/subscribe", requireAuth as any, handleSubscribe);

// POST /api/billing/checkout -> Alias subscription creation endpoint
billingRouter.post("/checkout", requireAuth as any, handleSubscribe);

// POST /api/billing/verify -> Cryptographically verify Razorpay payment/subscription
billingRouter.post("/verify", requireAuth as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { razorpay_payment_id, razorpay_subscription_id, razorpay_signature, plan } = req.body || {};

    if (!razorpay_payment_id || !razorpay_subscription_id || !razorpay_signature) {
      return res.status(400).json({ error: "Missing required Razorpay payment verification parameter." });
    }

    const verified = razorpayAdapter.verifyPayment(razorpay_payment_id, razorpay_subscription_id, razorpay_signature);

    if (!verified) {
      return res.status(400).json({ error: "Invalid Razorpay payment verification signature." });
    }

    const targetPlan = (plan as SubscriptionPlan) || "PRO";
    const now = new Date();
    const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const updated = await updateUserSubscriptionState(userId, {
      plan: targetPlan,
      status: "ACTIVE",
      providerSubscriptionId: razorpay_subscription_id,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: false,
    });

    return res.json({
      success: true,
      message: "Payment verified successfully and subscription activated.",
      data: updated,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to verify payment signature";
    return res.status(500).json({ error: msg });
  }
});

// POST /api/billing/cancel -> Cancel current user subscription (sets cancelAtPeriodEnd)
billingRouter.post("/cancel", requireAuth as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const sub = await getUserSubscription(userId);

    if (sub.plan === "FREE" || sub.status === "EXPIRED" || sub.status === "CANCELLED" || sub.status === "CANCELED") {
      return res.status(400).json({ error: "No active paid subscription to cancel" });
    }

    if (sub.providerSubscriptionId) {
      await razorpayAdapter.cancelSubscription(userId, sub.providerSubscriptionId);
    }

    const updated = await updateUserSubscriptionState(userId, {
      cancelAtPeriodEnd: true,
    });

    return res.json({
      success: true,
      message: "Subscription set to cancel at end of billing cycle.",
      data: updated,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to cancel subscription";
    return res.status(500).json({ error: msg });
  }
});

// POST /api/billing/webhook -> Signature-verified & idempotent payment provider webhook
billingRouter.post("/webhook", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const signature = req.headers["x-razorpay-signature"] as string;
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!signature || !webhookSecret) {
      return res.status(400).json({ error: "Missing webhook signature or secret" });
    }

    const rawBody = (req as any).rawBody || (typeof req.body === "string" ? req.body : JSON.stringify(req.body));
    const isValid = razorpayAdapter.verifyWebhookSignature(rawBody, signature, webhookSecret);

    if (!isValid) {
      return res.status(401).json({ error: "Invalid webhook signature" });
    }

    const event = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const eventId = event.event_id || event.id || event.created_at;
    const eventType = event.event;

    // Idempotency check
    if (eventId) {
      const alreadyProcessed = await isWebhookProcessed("RAZORPAY", String(eventId));
      if (alreadyProcessed) {
        return res.json({ received: true, idempotent: true });
      }
      await recordWebhookEvent("RAZORPAY", String(eventId), eventType || "unknown");
    }

    const payload = event?.payload?.subscription?.entity || event?.payload?.payment?.entity;
    const userId = payload?.notes?.userId;
    const plan = (payload?.notes?.plan || "PRO") as SubscriptionPlan;

    if (userId) {
      const now = new Date();
      const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      if (eventType === "subscription.activated" || eventType === "subscription.charged" || eventType === "payment.captured") {
        await updateUserSubscriptionState(userId, {
          plan,
          status: "ACTIVE",
          providerSubscriptionId: payload.id,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          cancelAtPeriodEnd: false,
        });
      } else if (eventType === "payment.failed" || eventType === "subscription.halted" || eventType === "subscription.paused") {
        await updateUserSubscriptionState(userId, {
          status: "PAST_DUE",
        });
      } else if (eventType === "subscription.cancelled") {
        await updateUserSubscriptionState(userId, {
          status: "CANCELLED",
        });
      } else if (eventType === "subscription.completed") {
        await updateUserSubscriptionState(userId, {
          status: "EXPIRED",
        });
      }
    }

    return res.json({ received: true, event: eventType });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Webhook handler error";
    return res.status(500).json({ error: msg });
  }
});
