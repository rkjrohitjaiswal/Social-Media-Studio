import { Router, Response } from "express";
import { requireAuth, AuthenticatedRequest } from "../middleware/auth.js";
import { getFullBillingDetails, updateUserSubscriptionState, getUserSubscription } from "../services/subscription-service.js";
import { razorpayAdapter } from "../services/razorpay-adapter.js";
import { PLAN_PRICES } from "../config/billing.js";
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

// POST /api/billing/checkout -> Create a subscription checkout order
billingRouter.post("/checkout", requireAuth as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    // Validate request body
    const parse = createCheckoutSchema.safeParse(req.body || {});
    if (!parse.success) {
      return res.status(400).json({ error: "Invalid checkout request format. Select PRO, ADVANCED, PREMIUM, or BUSINESS plan." });
    }

    const requestedPlan = parse.data.plan as SubscriptionPlan;
    const expectedPrice = PLAN_PRICES[requestedPlan];

    if (!expectedPrice) {
      return res.status(400).json({ error: `Invalid plan selected: ${requestedPlan}` });
    }

    // Backend determines price authoritatively
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
});

// POST /api/billing/cancel -> Cancel current user subscription
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
      status: "CANCELLED",
    });

    return res.json({
      success: true,
      message: "Subscription canceled successfully. You maintain access until the end of your billing cycle.",
      data: updated,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to cancel subscription";
    return res.status(500).json({ error: msg });
  }
});

// POST /api/billing/webhook -> Signature-verified payment provider webhook
billingRouter.post("/webhook", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const signature = req.headers["x-razorpay-signature"] as string;
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!signature || !webhookSecret) {
      return res.status(400).json({ error: "Missing webhook signature or secret" });
    }

    const rawBody = typeof req.body === "string" ? req.body : JSON.stringify(req.body);
    const isValid = razorpayAdapter.verifyWebhookSignature(rawBody, signature, webhookSecret);

    if (!isValid) {
      return res.status(401).json({ error: "Invalid webhook signature" });
    }

    const event = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const payload = event?.payload?.subscription?.entity || event?.payload?.payment?.entity;
    const userId = payload?.notes?.userId;
    const plan = (payload?.notes?.plan || "PRO") as SubscriptionPlan;

    if (!userId) {
      return res.status(200).json({ received: true, note: "No userId in event payload notes" });
    }

    const eventType = event.event;

    if (eventType === "subscription.charged" || eventType === "payment.captured") {
      const now = new Date();
      const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
      await updateUserSubscriptionState(userId, {
        plan,
        status: "ACTIVE",
        providerSubscriptionId: payload.id,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: false,
      });
    } else if (eventType === "subscription.cancelled" || eventType === "subscription.halted") {
      await updateUserSubscriptionState(userId, {
        plan: "FREE",
        status: "CANCELLED",
      });
    }

    return res.json({ received: true, event: eventType });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Webhook handler error";
    return res.status(500).json({ error: msg });
  }
});
