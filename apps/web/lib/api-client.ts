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
  NotificationItem,
} from "@ai-social/shared";

import { createClient } from "./supabase/client";

// Re-export for consumers that import from this file
export type { NotificationItem };

// Reads the active workspace ID from localStorage (set by StudioContext on switch).
// Falls back to "demo-workspace-1" for SSR / unauthenticated dev sessions.
function getActiveWorkspaceId(): string {
  if (typeof window !== "undefined") {
    return localStorage.getItem("activeWorkspaceId") || "demo-workspace-1";
  }
  return "demo-workspace-1";
}

// Base API fetch wrapper with cookie credentials.
// Automatically attaches x-workspace-id so the backend can validate membership
// for the currently active workspace. The backend still enforces that the
// authenticated user belongs to the requested workspace — this header does NOT
// bypass ownership or membership checks.
async function apiFetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
  const url = `${baseUrl}${endpoint}`;

  const defaultHeaders = await getAuthHeader();

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
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
  const res = await fetch(`${baseUrl}/api/approval-links/${token}`);
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
): Promise<ApprovalRequestResponse> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
  const endpoint = action === "APPROVE" ? "approve" : "request-changes";
  const res = await fetch(`${baseUrl}/api/approval-links/${token}/${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ comment }),
  });
  if (!res.ok) {
    const errorMsg = await parseErrorMessage(res, "Failed to submit approval review");
    throw new Error(errorMsg);
  }
  const body = (await (res.json() as Promise<unknown>)) as { data: ApprovalRequestResponse };
  return body.data;
}

export async function getAuthHeader(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-workspace-id": getActiveWorkspaceId(),
  };

  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      headers["Authorization"] = `Bearer ${session.access_token}`;
    }
  } catch {
    // Ignore error if Supabase session is unavailable
  }

  return headers;
}

/**
 * Upload a reference-style image file to the backend.
 * The backend handles secure storage via Supabase Storage (service-role key
 * never leaves the server). Only JPEG, PNG, and WEBP are accepted, max 10 MB.
 *
 * @returns The public/signed URL of the stored image.
 */
export async function uploadReferenceImage(file: File): Promise<{ url: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async () => {
      try {
        const dataUrl = reader.result as string;
        // Strip "data:<mime>;base64," prefix to get raw base64 string
        const base64 = dataUrl.split(",")[1];
        if (!base64) {
          reject(new Error("Failed to read file as base64"));
          return;
        }

        const res = await apiFetch("/api/upload/reference-image", {
          method: "POST",
          body: JSON.stringify({
            fileName: file.name,
            mimeType: file.type,
            data: base64,
          }),
        });

        if (!res.ok) {
          const errMsg = await parseErrorMessage(res, "Failed to upload reference image");
          reject(new Error(errMsg));
          return;
        }

        const body = (await (res.json() as Promise<unknown>)) as { url: string };
        resolve({ url: body.url });
      } catch (err) {
        reject(err instanceof Error ? err : new Error("Upload failed"));
      }
    };

    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Notifications API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch the current user's most recent notifications (newest first).
 * Throws on network/server error so callers can display an error state.
 */
export async function fetchNotifications(): Promise<NotificationItem[]> {
  const res = await apiFetch("/api/notifications");
  if (!res.ok) throw new Error(`Failed to fetch notifications: ${res.status}`);
  const body = (await res.json() as any);
  return body.notifications ?? [];
}

/** Fetch the unread notification count for the current user. */
export async function fetchUnreadNotificationCount(): Promise<number> {
  try {
    const res = await apiFetch("/api/notifications/unread-count");
    if (!res.ok) return 0;
    const body = (await res.json() as any);
    return body.unreadCount ?? 0;
  } catch {
    return 0;
  }
}

/** Mark a single notification as read. */
export async function markNotificationAsRead(id: string): Promise<void> {
  try {
    await apiFetch(`/api/notifications/${id}/read`, { method: "PATCH" });
  } catch {
    // Non-fatal
  }
}

/** Mark all notifications as read. */
export async function markAllNotificationsAsRead(): Promise<void> {
  try {
    await apiFetch("/api/notifications/mark-all-read", { method: "PATCH" });
  } catch {
    // Non-fatal
  }
}

/** Delete/dismiss a notification. */
export async function deleteNotificationApi(id: string): Promise<void> {
  try {
    await apiFetch(`/api/notifications/${id}`, { method: "DELETE" });
  } catch {
    // Non-fatal
  }
}

export interface UserUsageData {
  plan: string;
  monthlyLimit: number;
  usedCredits: number;
  remainingCredits: number;
  resetPeriod?: string;
}

/** Fetch current user/workspace usage & credit state. */
export async function fetchUserUsage(): Promise<UserUsageData | null> {
  try {
    const res = await apiFetch("/api/usage");
    if (!res.ok) return null;
    const body = (await res.json() as any);
    if (body.success && body.data) {
      return body.data as UserUsageData;
    }
    return null;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Admin & Profile API
// ─────────────────────────────────────────────────────────────────────────────

export interface AdminStats {
  totalUsers: number;
  paidUsers: number;
  freeUsers: number;
  activeSubscriptions: number;
}

export interface AdminUserListItem {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
  isAdmin: boolean;
  createdAt: string;
  currentPlan: string;
  subscriptionStatus: string;
  subscriptionSource: string;
  currentPeriodEnd?: string | null;
  creditsTotal: number;
  creditsUsed: number;
  creditsRemaining: number;
}

export async function fetchAdminStats(): Promise<AdminStats | null> {
  try {
    const res = await apiFetch("/api/admin/stats");
    if (!res.ok) return null;
    const body = (await res.json() as any);
    return body.stats || null;
  } catch {
    return null;
  }
}

export async function fetchAdminUsers(
  page: number = 1,
  limit: number = 20,
  search: string = ""
): Promise<{ users: AdminUserListItem[]; totalPages: number; total: number } | null> {
  try {
    const query = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      search,
    }).toString();

    const res = await apiFetch(`/api/admin/users?${query}`);
    if (!res.ok) return null;
    const body = (await res.json() as any);
    return {
      users: body.users || [],
      totalPages: body.pagination?.totalPages || 1,
      total: body.pagination?.total || 0,
    };
  } catch {
    return null;
  }
}

export async function grantUserSubscription(
  targetUserId: string,
  plan: string,
  durationDays: number = 30,
  notes?: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const res = await apiFetch(`/api/admin/users/${targetUserId}/subscription`, {
      method: "POST",
      body: JSON.stringify({ plan, durationDays, notes }),
    });
    const body = (await res.json() as any);
    if (!res.ok) return { success: false, error: body.error || "Failed to grant subscription" };
    return { success: true, message: body.message };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function revokeUserSubscription(
  targetUserId: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const res = await apiFetch(`/api/admin/users/${targetUserId}/subscription`, {
      method: "DELETE",
    });
    const body = (await res.json() as any);
    if (!res.ok) return { success: false, error: body.error || "Failed to revoke subscription" };
    return { success: true, message: body.message };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function uploadProfileAvatar(
  imageBase64: string,
  mimeType?: string
): Promise<{ success: boolean; avatarUrl?: string; error?: string }> {
  try {
    const res = await apiFetch("/api/profile/avatar", {
      method: "POST",
      body: JSON.stringify({ imageBase64, mimeType }),
    });
    const body = (await res.json() as any);
    if (!res.ok) return { success: false, error: body.error || "Upload failed" };
    return { success: true, avatarUrl: body.avatarUrl };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function deleteProfileAvatar(): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await apiFetch("/api/profile/avatar", {
      method: "DELETE",
    });
    if (!res.ok) return { success: false, error: "Failed to delete avatar" };
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}
