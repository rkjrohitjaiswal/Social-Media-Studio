import { SubscriptionPlan } from "@ai-social/shared";

export interface PaymentCustomer {
  customerId: string;
}

export interface PaymentSubscriptionResult {
  subscriptionId: string;
  orderId?: string;
  checkoutUrl?: string;
  keyId?: string;
  amountInr: number;
  currency: string;
}

export interface CancelSubscriptionResult {
  canceled: boolean;
}

export interface VerifyPaymentResult {
  verified: boolean;
}

export interface PaymentProvider {
  createCustomer(userId: string, email: string, name?: string): Promise<PaymentCustomer>;
  createSubscription(userId: string, plan: SubscriptionPlan, amountInr: number): Promise<PaymentSubscriptionResult>;
  cancelSubscription(userId: string, providerSubscriptionId: string): Promise<CancelSubscriptionResult>;
  verifyPayment(paymentId: string, subscriptionId: string, signature: string): boolean;
  verifyWebhookSignature(rawBody: string | Buffer, signature: string, secret: string): boolean;
}
