import { z } from "zod";
import { subscriptionPlanSchema, SubscriptionPlan, FeatureEntitlement } from "./plans";

export { subscriptionPlanSchema };
export type { SubscriptionPlan };

export const subscriptionStatusSchema = z.enum(["TRIAL", "ACTIVE", "PAST_DUE", "CANCELLED", "CANCELED", "EXPIRED", "TRIALING"]);
export type SubscriptionStatus = z.infer<typeof subscriptionStatusSchema>;

export interface BillingStatusResponse {
  plan: SubscriptionPlan | string;
  status: SubscriptionStatus;
  priceInr: number;
  monthlyWorkflowsLimit: number;
  workflowsUsed: number;
  workflowsRemaining: number;
  subscriptionSource?: "RAZORPAY" | "ADMIN_GRANT" | string;
  socialAccountLimit: number;
  socialAccountsConnected: number;
  rateLimitPerHour: number;
  features: FeatureEntitlement[];
  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;
  cancelAtPeriodEnd?: boolean;
}

export const createCheckoutSchema = z.object({
  plan: z.enum(["PRO", "ADVANCED", "PREMIUM", "BUSINESS"]),
});

export type CreateCheckoutInput = z.infer<typeof createCheckoutSchema>;

export interface CheckoutResponse {
  provider: "RAZORPAY" | string;
  plan: SubscriptionPlan;
  subscriptionId?: string;
  orderId?: string;
  keyId?: string;
  amountInr: number;
  currency: string;
  checkoutUrl?: string;
  message?: string;
}
