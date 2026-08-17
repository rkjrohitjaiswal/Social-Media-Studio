import {
  ApiCredentialResponse,
  SaveProviderKeyInput,
  SupportedProvider,
  BillingStatusResponse,
  CheckoutResponse,
  SubscriptionPlan,
  BrandProfileInput,
  BrandProfileResponse,
  RepurposeContentInput,
  AdaptContentInput,
  RepurposeResponse,
  CreateWorkspaceInput,
  WorkspaceResponse,
  ApprovalRequestResponse,
  ApprovalAuditLogResponse,
} from "@ai-social/shared";

// Base API fetch wrapper with cookie credentials
async function apiFetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
  const url = `${baseUrl}${endpoint}`;

  const defaultHeaders: HeadersInit = {
    "Content-Type": "application/json",
  };

  const response = await fetch(url, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
    credentials: "include",
  });

  return response;
}

async function parseErrorMessage(res: Response, fallbackMessage: string): Promise<string> {
  try {
    const json = (await (res.json() as Promise<unknown>)) as { error?: string };
    return json.error || fallbackMessage;
  } catch {
    return fallbackMessage;
  }
}

// User API Credential Endpoints
export async function getApiKeys(): Promise<ApiCredentialResponse[]> {
  const res = await apiFetch("/api/settings/api-keys");
  if (!res.ok) {
    throw new Error("Failed to fetch API keys");
  }
  const body = (await (res.json() as Promise<unknown>)) as { data?: ApiCredentialResponse[] };
  return body.data || [];
}

export async function saveProviderApiKey(provider: string, apiKey: string): Promise<ApiCredentialResponse> {
  const payload: SaveProviderKeyInput = {
    provider: provider.toUpperCase() as SupportedProvider,
    apiKey,
  };
  const res = await apiFetch("/api/settings/api-keys/save", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorMsg = await parseErrorMessage(res, "Failed to save API key");
    throw new Error(errorMsg);
  }
  const body = (await (res.json() as Promise<unknown>)) as { data: ApiCredentialResponse };
  return body.data;
}

export async function testProviderApiKey(provider: string): Promise<{ success: boolean; message: string }> {
  const res = await apiFetch(`/api/settings/api-keys/${provider.toLowerCase()}/test`, {
    method: "POST",
  });
  if (!res.ok) {
    const errorMsg = await parseErrorMessage(res, "API Key connection test failed");
    throw new Error(errorMsg);
  }
  return (await (res.json() as Promise<unknown>)) as { success: boolean; message: string };
}

export async function deleteProviderApiKey(provider: string): Promise<void> {
  const res = await apiFetch(`/api/settings/api-keys/${provider.toLowerCase()}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const errorMsg = await parseErrorMessage(res, "Failed to remove API key");
    throw new Error(errorMsg);
  }
}

// SaaS Billing Endpoints
export async function getBillingStatus(): Promise<BillingStatusResponse> {
  const res = await apiFetch("/api/billing/subscription");
  if (!res.ok) {
    throw new Error("Failed to fetch billing status");
  }
  const body = (await (res.json() as Promise<unknown>)) as { data: BillingStatusResponse };
  return body.data;
}

export async function createSubscriptionCheckout(
  plan: SubscriptionPlan = "PRO"
): Promise<CheckoutResponse> {
  return subscribeToPlan(plan);
}

export async function subscribeToPlan(plan: SubscriptionPlan = "PRO"): Promise<CheckoutResponse> {
  const res = await apiFetch("/api/billing/subscribe", {
    method: "POST",
    body: JSON.stringify({ plan }),
  });
  if (!res.ok) {
    const errorMsg = await parseErrorMessage(res, "Failed to create subscription order");
    throw new Error(errorMsg);
  }
  const body = (await (res.json() as Promise<unknown>)) as { data: CheckoutResponse };
  return body.data;
}

export async function verifyPayment(payload: {
  razorpay_payment_id: string;
  razorpay_subscription_id: string;
  razorpay_signature: string;
  plan: SubscriptionPlan;
}): Promise<{ message: string }> {
  const res = await apiFetch("/api/billing/verify", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorMsg = await parseErrorMessage(res, "Payment verification failed");
    throw new Error(errorMsg);
  }
  const body = (await (res.json() as Promise<unknown>)) as { message: string };
  return body;
}

export async function cancelSubscription(): Promise<{ message: string }> {
  const res = await apiFetch("/api/billing/cancel", {
    method: "POST",
  });
  if (!res.ok) {
    const errorMsg = await parseErrorMessage(res, "Failed to cancel subscription");
    throw new Error(errorMsg);
  }
  return (await (res.json() as Promise<unknown>)) as { message: string };
}

// Brand Kit APIs
export async function getBrandProfile(): Promise<BrandProfileResponse | null> {
  const res = await apiFetch("/api/brand");
  if (!res.ok) return null;
  const body = (await (res.json() as Promise<unknown>)) as { data: BrandProfileResponse };
  return body.data;
}

export async function saveBrandProfile(data: BrandProfileInput): Promise<BrandProfileResponse> {
  const res = await apiFetch("/api/brand", {
    method: "PUT",
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errorMsg = await parseErrorMessage(res, "Failed to save Brand Kit");
    throw new Error(errorMsg);
  }
  const body = (await (res.json() as Promise<unknown>)) as { data: BrandProfileResponse };
  return body.data;
}

// Repurposing & Adaptation APIs
export async function repurposeContent(data: RepurposeContentInput): Promise<RepurposeResponse> {
  const res = await apiFetch("/api/content/repurpose", {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errorMsg = await parseErrorMessage(res, "Failed to repurpose content");
    throw new Error(errorMsg);
  }
  const body = (await (res.json() as Promise<unknown>)) as { data: RepurposeResponse };
  return body.data;
}

export async function adaptContent(data: AdaptContentInput): Promise<RepurposeResponse> {
  const res = await apiFetch("/api/content/adapt", {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errorMsg = await parseErrorMessage(res, "Failed to adapt content");
    throw new Error(errorMsg);
  }
  const body = (await (res.json() as Promise<unknown>)) as { data: RepurposeResponse };
  return body.data;
}

// Performance Advisor API
export async function getPerformanceAdvisorReport(): Promise<Record<string, unknown>> {
  const res = await apiFetch("/api/analytics/advisor");
  if (!res.ok) {
    const errorMsg = await parseErrorMessage(res, "Failed to fetch performance report");
    throw new Error(errorMsg);
  }
  const body = (await (res.json() as Promise<unknown>)) as { data: Record<string, unknown> };
  return body.data;
}

// Workspace & Team APIs
export async function getWorkspaces(): Promise<WorkspaceResponse[]> {
  const res = await apiFetch("/api/workspaces");
  if (!res.ok) return [];
  const body = (await (res.json() as Promise<unknown>)) as { data?: WorkspaceResponse[] };
  return body.data || [];
}

export async function createWorkspace(name: string): Promise<WorkspaceResponse> {
  const payload: CreateWorkspaceInput = { name };
  const res = await apiFetch("/api/workspaces", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorMsg = await parseErrorMessage(res, "Failed to create workspace");
    throw new Error(errorMsg);
  }
  const body = (await (res.json() as Promise<unknown>)) as { data: WorkspaceResponse };
  return body.data;
}

// Public Client Approval Link API
export async function getPublicApprovalLink(token: string): Promise<ApprovalRequestResponse> {
  const res = await fetch(`/api/approval-links/${token}`);
  if (!res.ok) {
    const errorMsg = await parseErrorMessage(res, "Approval link invalid or expired");
    throw new Error(errorMsg);
  }
  const body = (await (res.json() as Promise<unknown>)) as { data: ApprovalRequestResponse };
  return body.data;
}

export async function reviewPublicApproval(
  token: string,
  action: "APPROVE" | "REQUEST_CHANGES",
  comment?: string
): Promise<{ status: string; auditLogs: ApprovalAuditLogResponse[] }> {
  const endpoint = action === "APPROVE" ? `/api/approval-links/${token}/approve` : `/api/approval-links/${token}/request-changes`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ comment }),
  });
  if (!res.ok) {
    const errorMsg = await parseErrorMessage(res, "Failed to process review");
    throw new Error(errorMsg);
  }
  const body = (await (res.json() as Promise<unknown>)) as { data: { status: string; auditLogs: ApprovalAuditLogResponse[] } };
  return body.data;
}
