import { subscribeToPlan, verifyPayment } from "./api-client";
import { SubscriptionPlan } from "@ai-social/shared";

interface RazorpayFailureResponse {
  error?: {
    code?: string;
    description?: string;
    source?: string;
    step?: string;
    reason?: string;
  };
}

interface RazorpayWindow extends Window {
  Razorpay?: new (options: Record<string, unknown>) => {
    open: () => void;
    on: (event: string, callback: (response: RazorpayFailureResponse) => void) => void;
  };
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve(false);
      return;
    }
    const win = window as unknown as RazorpayWindow;
    if (win.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export async function handleRazorpaySubscribeFlow(
  plan: SubscriptionPlan,
  onSuccess: (message: string) => void,
  onError: (error: string) => void
): Promise<void> {
  if (plan === "FREE") {
    onError("Cannot subscribe to FREE plan via payment gateway.");
    return;
  }

  // 1. Initiate backend subscription order
  const checkout = await subscribeToPlan(plan);

  // 2. Load Razorpay Checkout SDK
  const loaded = await loadRazorpayScript();
  const win = typeof window !== "undefined" ? (window as unknown as RazorpayWindow) : undefined;

  if (!loaded || !win?.Razorpay) {
    // If SDK block or mock test mode, inform user
    onSuccess(
      `Subscription order generated for ${plan} (₹${checkout.amountInr}/mo). [Provider Sub ID: ${
        checkout.subscriptionId || checkout.orderId
      }]. Complete payment via Razorpay.`
    );
    return;
  }

  // 3. Open Razorpay TEST Checkout Modal
  const options = {
    key: checkout.keyId || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "rzp_test_key",
    subscription_id: checkout.subscriptionId,
    name: "AI Social Media Studio",
    description: `Upgrade to ${plan} Plan (₹${checkout.amountInr}/month)`,
    image: "/favicon.ico",
    handler: async (response: {
      razorpay_payment_id: string;
      razorpay_subscription_id: string;
      razorpay_signature: string;
    }) => {
      try {
        const verifyRes = await verifyPayment({
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_subscription_id: response.razorpay_subscription_id,
          razorpay_signature: response.razorpay_signature,
          plan,
        });
        onSuccess(verifyRes.message || `Successfully upgraded to ${plan}!`);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Payment signature verification failed";
        onError(msg);
      }
    },
    notes: {
      plan,
    },
    theme: {
      color: "#C5A059",
    },
  };

  const razorpayInstance = new win.Razorpay(options);
  razorpayInstance.on("payment.failed", (response: RazorpayFailureResponse) => {
    onError(`Payment Failed: ${response.error?.description || "Transaction declined"}`);
  });
  razorpayInstance.open();
}
