import crypto from "crypto";
import { PaymentProvider, PaymentCustomer, PaymentSubscriptionResult, CancelSubscriptionResult } from "./payment-provider.js";
import { PLAN_PRICES, CURRENCY_DEFAULT } from "../config/billing.js";
import { SubscriptionPlan } from "@ai-social/shared";

export class RazorpayAdapter implements PaymentProvider {
  private keyId: string;
  private keySecret: string;
  private webhookSecret: string;

  constructor() {
    this.keyId = process.env.RAZORPAY_KEY_ID || "";
    this.keySecret = process.env.RAZORPAY_KEY_SECRET || "";
    this.webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || "";
  }

  public isConfigured(): boolean {
    return Boolean(this.keyId && this.keySecret);
  }

  public async createCustomer(userId: string, email: string, name?: string): Promise<PaymentCustomer> {
    if (!this.isConfigured()) {
      return { customerId: `cust_mock_${userId}` };
    }

    const authHeader = Buffer.from(`${this.keyId}:${this.keySecret}`).toString("base64");
    const response = await fetch("https://api.razorpay.com/v1/customers", {
      method: "POST",
      headers: {
        Authorization: `Basic ${authHeader}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: name || "Studio Client",
        email,
        fail_existing: 0,
        notes: { userId },
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(`Razorpay Customer Error: ${(err as any).error?.description || response.statusText}`);
    }

    const data = (await response.json()) as { id: string };
    return { customerId: data.id };
  }

  public async createSubscription(userId: string, plan: SubscriptionPlan, amountInr: number): Promise<PaymentSubscriptionResult> {
    const expectedPrice = PLAN_PRICES[plan] || 59;
    if (amountInr !== expectedPrice) {
      throw new Error(`Invalid billing amount: ${plan} plan price is strictly set to ₹${expectedPrice}/month by backend.`);
    }

    if (!this.isConfigured()) {
      const mockSubId = `sub_mock_${plan.toLowerCase()}_${Date.now()}`;
      return {
        subscriptionId: mockSubId,
        orderId: `order_mock_${Date.now()}`,
        keyId: "rzp_test_placeholder",
        amountInr,
        currency: CURRENCY_DEFAULT,
        checkoutUrl: `https://checkout.razorpay.com/v1/checkout.js`,
      };
    }

    const authHeader = Buffer.from(`${this.keyId}:${this.keySecret}`).toString("base64");
    const planIdEnv = process.env[`RAZORPAY_${plan}_PLAN_ID`] || "plan_pro_monthly";

    const response = await fetch("https://api.razorpay.com/v1/subscriptions", {
      method: "POST",
      headers: {
        Authorization: `Basic ${authHeader}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        plan_id: planIdEnv,
        total_count: 12,
        quantity: 1,
        customer_notify: 1,
        notes: { userId, plan },
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(`Razorpay Subscription Error: ${(err as any).error?.description || response.statusText}`);
    }

    const data = (await response.json()) as { id: string; short_url?: string };
    return {
      subscriptionId: data.id,
      keyId: this.keyId,
      amountInr,
      currency: CURRENCY_DEFAULT,
      checkoutUrl: data.short_url,
    };
  }

  public async cancelSubscription(userId: string, providerSubscriptionId: string): Promise<CancelSubscriptionResult> {
    if (!this.isConfigured() || providerSubscriptionId.startsWith("sub_mock_")) {
      return { canceled: true };
    }

    const authHeader = Buffer.from(`${this.keyId}:${this.keySecret}`).toString("base64");
    const response = await fetch(`https://api.razorpay.com/v1/subscriptions/${providerSubscriptionId}/cancel`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${authHeader}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        cancel_at_cycle_end: 1,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(`Razorpay Cancellation Error: ${(err as any).error?.description || response.statusText}`);
    }

    return { canceled: true };
  }

  public verifyPayment(paymentId: string, subscriptionId: string, signature: string): boolean {
    if (!this.keySecret || !signature || !paymentId || !subscriptionId) {
      return false;
    }

    const payload = `${paymentId}|${subscriptionId}`;
    const expectedSignature = crypto
      .createHmac("sha256", this.keySecret)
      .update(payload)
      .digest("hex");

    return expectedSignature === signature;
  }

  public verifyWebhookSignature(rawBody: string | Buffer, signature: string, secret?: string): boolean {
    const activeSecret = secret || this.webhookSecret;
    if (!activeSecret || !signature) {
      return false;
    }

    const expectedSignature = crypto
      .createHmac("sha256", activeSecret)
      .update(rawBody)
      .digest("hex");

    const expectedBuf = Buffer.from(expectedSignature);
    const sigBuf = Buffer.from(signature);

    if (expectedBuf.length !== sigBuf.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuf, sigBuf);
  }
}

export const razorpayAdapter = new RazorpayAdapter();
