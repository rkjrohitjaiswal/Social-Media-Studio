"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Webhook,
  Plus,
  Play,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  ArrowLeft,
  X,
  Layers,
  ChevronRight,
  RotateCcw,
  Zap,
  ShieldCheck,
} from "lucide-react";

interface N8nIntegration {
  id: string;
  name: string;
  description?: string;
  isEnabled: boolean;
  eventFilters: string[];
  lastDeliveryAt?: string;
  lastDeliveryStatus?: string;
  failureCount: number;
  createdAt: string;
}

interface N8nDelivery {
  id: string;
  integrationId: string;
  eventId: string;
  eventType: string;
  payloadJson: Record<string, unknown>;
  attemptCount: number;
  status: "QUEUED" | "PROCESSING" | "DELIVERED" | "FAILED" | "CANCELLED";
  responseStatus?: number;
  responseBodyPreview?: string;
  lastAttemptAt?: string;
  nextAttemptAt?: string;
  deliveredAt?: string;
  errorCode?: string;
  errorMessage?: string;
  createdAt: string;
}

const EVENT_CATEGORIES = [
  {
    category: "CAMPAIGNS",
    events: [{ id: "campaign.created", label: "Campaign Created" }],
  },
  {
    category: "GENERATION",
    events: [
      { id: "campaign.generation.started", label: "Generation Started" },
      { id: "campaign.generation.completed", label: "Generation Completed" },
      { id: "campaign.generation.failed", label: "Generation Failed" },
    ],
  },
  {
    category: "SOCIAL COPY",
    events: [{ id: "social_copy.completed", label: "Copy Generation Completed" }],
  },
  {
    category: "QUALITY",
    events: [{ id: "quality.completed", label: "Quality Analysis Completed" }],
  },
  {
    category: "REVIEW",
    events: [
      { id: "review.approved", label: "Asset Approved" },
      { id: "review.changes_requested", label: "Changes Requested" },
      { id: "review.rejected", label: "Asset Rejected" },
    ],
  },
  {
    category: "INSTAGRAM",
    events: [{ id: "instagram.published", label: "Instagram Post Published" }],
  },
  {
    category: "SCHEDULING",
    events: [
      { id: "schedule.created", label: "Post Scheduled" },
      { id: "schedule.cancelled", label: "Schedule Cancelled" },
      { id: "schedule.published", label: "Scheduled Post Published" },
      { id: "schedule.failed", label: "Schedule Execution Failed" },
    ],
  },
  {
    category: "ANALYTICS",
    events: [
      { id: "analytics.sync.completed", label: "Analytics Sync Completed" },
      { id: "analytics.sync.failed", label: "Analytics Sync Failed" },
    ],
  },
];

export default function N8nSettingsPage() {
  const [integrations, setIntegrations] = useState<N8nIntegration[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [secret, setSecret] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>(["ALL"]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Deliveries Drawer State
  const [selectedIntegrationForDeliveries, setSelectedIntegrationForDeliveries] = useState<string | null>(null);
  const [deliveries, setDeliveries] = useState<N8nDelivery[]>([]);
  const [deliveriesLoading, setDeliveriesLoading] = useState(false);
  const [selectedDeliveryPayload, setSelectedDeliveryPayload] = useState<N8nDelivery | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);

  const fetchIntegrations = async () => {
    setLoading(true);
    try {
      const res = await fetch((process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000") + "/api/integrations/n8n");
      const json = await res.json();
      if (json.success) {
        setIntegrations(json.data);
      }
    } catch {
      // Ignore network errors
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    async function loadIntegrations() {
      setLoading(true);
      try {
        const res = await fetch((process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000") + "/api/integrations/n8n");
        const json = await res.json();
        if (isMounted && json.success) {
          setIntegrations(json.data);
        }
      } catch {
        // Ignore network errors
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadIntegrations();
    return () => {
      isMounted = false;
    };
  }, []);

  const fetchDeliveries = async (integrationId: string) => {
    setSelectedIntegrationForDeliveries(integrationId);
    setDeliveriesLoading(true);
    try {
      const res = await fetch((process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000") + `/api/integrations/n8n/${integrationId}/deliveries`);
      const json = await res.json();
      if (json.success) {
        setDeliveries(json.data);
      }
    } catch {
      // Ignore error
    } finally {
      setDeliveriesLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditingId(null);
    setName("");
    setDescription("");
    setWebhookUrl("");
    setSecret("");
    setSelectedEvents(["ALL"]);
    setFormError(null);
    setShowModal(true);
  };

  const handleOpenEditModal = (integration: N8nIntegration) => {
    setEditingId(integration.id);
    setName(integration.name);
    setDescription(integration.description || "");
    setWebhookUrl("");
    setSecret("");
    setSelectedEvents(integration.eventFilters);
    setFormError(null);
    setShowModal(true);
  };

  const handleSaveIntegration = async () => {
    setIsSubmitting(true);
    setFormError(null);

    try {
      const payload = {
        name,
        description,
        webhookUrl: webhookUrl || undefined,
        secret: secret || undefined,
        eventFilters: selectedEvents,
      };

      const url = editingId ? `/api/integrations/n8n/${editingId}` : "/api/integrations/n8n";
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.success) {
        setShowModal(false);
        fetchIntegrations();
      } else {
        setFormError(json.error || "Failed to save integration");
      }
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Failed to save integration");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleEnabled = async (integration: N8nIntegration) => {
    try {
      await fetch((process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000") + `/api/integrations/n8n/${integration.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isEnabled: !integration.isEnabled }),
      });
      fetchIntegrations();
    } catch {
      // Ignore toggle error
    }
  };

  const handleDeleteIntegration = async (id: string) => {
    if (!confirm("Are you sure you want to delete this n8n integration?")) return;
    try {
      await fetch((process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000") + `/api/integrations/n8n/${id}`, { method: "DELETE" });
      fetchIntegrations();
    } catch {
      // Ignore delete error
    }
  };

  const handleTestWebhook = async (id: string) => {
    setTestingId(id);
    try {
      const res = await fetch((process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000") + `/api/integrations/n8n/${id}/test`, { method: "POST" });
      const json = await res.json();
      if (json.success) {
        alert("Test webhook dispatched successfully!");
        fetchIntegrations();
      } else {
        alert(`Test webhook failed: ${json.error}`);
      }
    } catch {
      alert("Failed to send test webhook");
    } finally {
      setTestingId(null);
    }
  };

  const handleRetryDelivery = async (deliveryId: string) => {
    try {
      const res = await fetch((process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000") + `/api/integrations/n8n/deliveries/${deliveryId}/retry`, {
        method: "POST",
      });
      const json = await res.json();
      if (json.success && selectedIntegrationForDeliveries) {
        fetchDeliveries(selectedIntegrationForDeliveries);
      }
    } catch {
      // Ignore retry error
    }
  };

  const handleToggleEvent = (eventId: string) => {
    if (eventId === "ALL") {
      setSelectedEvents(["ALL"]);
      return;
    }

    let updated = selectedEvents.filter((e) => e !== "ALL");
    if (updated.includes(eventId)) {
      updated = updated.filter((e) => e !== eventId);
    } else {
      updated.push(eventId);
    }

    if (updated.length === 0) {
      updated = ["ALL"];
    }

    setSelectedEvents(updated);
  };

  const handleSelectAllEvents = () => {
    const allIds = EVENT_CATEGORIES.flatMap((c) => c.events.map((e) => e.id));
    setSelectedEvents(allIds);
  };

  const handleClearAllEvents = () => {
    setSelectedEvents([]);
  };

  return (
    <div className="space-y-8 pb-16">
      {/* NAVIGATION HEADER */}
      <div className="flex items-center justify-between border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#c5a059] uppercase tracking-widest font-semibold mb-1">
            <Webhook className="w-4 h-4" />
            <span>N8n Automation Hub</span>
          </div>
          <h1 className="font-serif-luxury text-3xl md:text-4xl font-bold text-[#f5f4f0]">
            N8n Webhook Integrations
          </h1>
          <p className="text-xs text-[#9e9d98] mt-1">
            Connect AI Social Media Studio to your external n8n automation workflows.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/settings/integrations"
            className="px-4 py-2 rounded-xl bg-[#14161a] border border-white/10 text-xs font-mono font-bold text-[#9e9d98] hover:text-[#f5f4f0] transition-all flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" /> Integrations
          </Link>

          <button
            onClick={handleOpenAddModal}
            className="px-5 py-2.5 rounded-2xl bg-[#c5a059] text-black font-bold text-xs hover:brightness-110 transition-all flex items-center gap-2 shadow-lg"
          >
            <Plus className="w-4 h-4" /> Add Integration
          </button>
        </div>
      </div>

      {/* INBOUND WEBHOOK CALLBACK CONFIGURATION CARD */}
      <div className="glass-card p-6 rounded-3xl space-y-3 border-l-4 border-l-[#c5a059] bg-[#14161a]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#c5a059] uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4 text-[#c5a059]" />
            <span>Inbound Webhook Callback Endpoint</span>
          </div>
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            HMAC SECURED
          </span>
        </div>
        <p className="text-xs text-[#9e9d98]">
          External n8n workflows can send status updates and render completion events back to AI Social Media Studio using HMAC-SHA256 request signing.
        </p>
        <div className="flex items-center gap-3 bg-[#0b0c0e] p-3 rounded-xl border border-white/10 text-xs font-mono text-[#f5f4f0] select-all">
          <span className="text-[#9e9d98] uppercase">Endpoint:</span>
          <code className="text-[#c5a059]">{(process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000")}/api/integrations/n8n/webhook-callback</code>
        </div>
        <div className="flex items-center justify-between text-[11px] text-[#9e9d98]">
          <span>Header: <code className="text-[#f5f4f0]">X-Studio-Signature: sha256=&lt;hmac_hex&gt;</code></span>
          <span className="text-amber-400 font-bold">Signing secrets are stored as encrypted hashes and never exposed</span>
        </div>
      </div>

      {/* INTEGRATIONS LIST / EMPTY STATE */}
      {loading ? (
        <div className="py-24 text-center space-y-4">
          <div className="w-8 h-8 border-2 border-[#c5a059] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-mono text-[#9e9d98]">Loading n8n integrations...</p>
        </div>
      ) : integrations.length === 0 ? (
        <div className="glass-card p-12 rounded-3xl text-center space-y-4 border border-white/10">
          <div className="w-16 h-16 rounded-2xl bg-[#14161a] border border-white/10 flex items-center justify-center mx-auto text-[#c5a059]">
            <Zap className="w-8 h-8" />
          </div>
          <h3 className="font-serif-luxury text-xl font-bold text-[#f5f4f0]">
            No N8n Integrations Configured
          </h3>
          <p className="text-xs text-[#9e9d98] max-w-md mx-auto">
            Connect n8n to automate your approved social media workflows. Receive instant events for campaign creation, quality scores, review approvals, and publishing.
          </p>
          <button
            onClick={handleOpenAddModal}
            className="px-5 py-2.5 rounded-xl bg-[#c5a059] text-black font-bold text-xs hover:brightness-110 transition-all inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Create First Integration
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {integrations.map((int) => (
            <div
              key={int.id}
              className="glass-card p-6 rounded-3xl space-y-5 border border-white/10 hover:border-[#c5a059]/40 transition-all relative overflow-hidden"
            >
              {/* TOP HEADER */}
              <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-serif-luxury text-lg font-bold text-[#f5f4f0]">{int.name}</h3>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        int.isEnabled
                          ? "bg-[#4e8765]/20 text-[#4e8765] border border-[#4e8765]/30"
                          : "bg-[#6b6a65]/20 text-[#9e9d98] border border-white/10"
                      }`}
                    >
                      {int.isEnabled ? "Active" : "Paused"}
                    </span>
                  </div>
                  {int.description && (
                    <p className="text-xs text-[#9e9d98] mt-1 line-clamp-2">{int.description}</p>
                  )}
                </div>

                {/* TOGGLE ENABLED BUTTON */}
                <button
                  onClick={() => handleToggleEnabled(int)}
                  className={`px-3 py-1 rounded-xl text-xs font-mono font-bold transition-all ${
                    int.isEnabled
                      ? "bg-[#14161a] border border-white/10 text-[#9e9d98] hover:text-[#f5f4f0]"
                      : "bg-[#c5a059]/20 text-[#c5a059] border border-[#c5a059]/30"
                  }`}
                >
                  {int.isEnabled ? "Pause" : "Enable"}
                </button>
              </div>

              {/* DETAILS & EVENT FILTERS */}
              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-[10px] font-mono text-[#9e9d98] uppercase tracking-wider block mb-1">
                    Subscribed Events ({int.eventFilters.includes("ALL") ? "ALL" : int.eventFilters.length})
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {int.eventFilters.includes("ALL") ? (
                      <span className="px-2 py-0.5 rounded bg-[#c5a059]/15 text-[#c5a059] font-mono text-[10px] font-bold">
                        ALL EVENTS
                      </span>
                    ) : (
                      int.eventFilters.slice(0, 4).map((evt) => (
                        <span
                          key={evt}
                          className="px-2 py-0.5 rounded bg-[#14161a] border border-white/10 text-[10px] font-mono text-[#f5f4f0]"
                        >
                          {evt}
                        </span>
                      ))
                    )}
                    {!int.eventFilters.includes("ALL") && int.eventFilters.length > 4 && (
                      <span className="px-2 py-0.5 rounded bg-[#14161a] text-[10px] font-mono text-[#9e9d98]">
                        +{int.eventFilters.length - 4} more
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono pt-1">
                  <div>
                    <span className="text-[#9e9d98] block text-[9px] uppercase">Last Delivery</span>
                    <span className="text-[#f5f4f0]">
                      {int.lastDeliveryAt ? new Date(int.lastDeliveryAt).toLocaleTimeString() : "Never"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#9e9d98] block text-[9px] uppercase">Failure Count</span>
                    <span className={int.failureCount > 0 ? "text-[#a84b4b] font-bold" : "text-[#4e8765]"}>
                      {int.failureCount} failures
                    </span>
                  </div>
                </div>
              </div>

              {/* ACTION FOOTER */}
              <div className="border-t border-white/10 pt-4 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleTestWebhook(int.id)}
                    disabled={testingId === int.id}
                    className="px-3 py-1.5 rounded-xl bg-[#14161a] border border-white/10 text-xs font-mono text-[#c5a059] hover:bg-[#1c1f26] transition-all flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Play className={`w-3 h-3 ${testingId === int.id ? "animate-spin" : ""}`} />
                    <span>{testingId === int.id ? "Testing..." : "Test Webhook"}</span>
                  </button>

                  <button
                    onClick={() => fetchDeliveries(int.id)}
                    className="px-3 py-1.5 rounded-xl bg-[#14161a] border border-white/10 text-xs font-mono text-[#9e9d98] hover:text-[#f5f4f0] transition-all flex items-center gap-1"
                  >
                    Deliveries <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEditModal(int)}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-mono text-[#9e9d98] hover:text-[#f5f4f0] transition-all"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteIntegration(int.id)}
                    className="p-1.5 rounded-lg text-[#a84b4b] hover:bg-[#a84b4b]/10 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ADD / EDIT INTEGRATION MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-card max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 md:p-8 rounded-3xl border-[#c5a059]/40 space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="font-serif-luxury text-xl font-bold text-[#f5f4f0] flex items-center gap-2">
                <Webhook className="w-5 h-5 text-[#c5a059]" />
                {editingId ? "Edit N8n Integration" : "Configure N8n Webhook"}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-[#9e9d98] hover:text-[#f5f4f0]">
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3.5 rounded-xl bg-[#a84b4b]/10 border border-[#a84b4b]/30 text-xs text-[#a84b4b] flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="space-y-4 text-xs">
              {/* Name */}
              <div className="space-y-1.5">
                <label className="block text-[#9e9d98] uppercase tracking-wider font-semibold text-[10px]">
                  Integration Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Production n8n Marketing Automation"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#0b0c0e] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-[#f5f4f0] focus:border-[#c5a059] focus:outline-none"
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="block text-[#9e9d98] uppercase tracking-wider font-semibold text-[10px]">
                  Description (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Triggers n8n workflows on approved publications & quality events"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-[#0b0c0e] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-[#f5f4f0] focus:border-[#c5a059] focus:outline-none"
                />
              </div>

              {/* Webhook URL */}
              <div className="space-y-1.5">
                <label className="block text-[#9e9d98] uppercase tracking-wider font-semibold text-[10px]">
                  n8n Webhook Endpoint URL {editingId ? "(Leave blank to keep unchanged)" : "*"}
                </label>
                <input
                  type="url"
                  placeholder="https://n8n.example.com/webhook/ai-studio-events"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  className="w-full bg-[#0b0c0e] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-[#f5f4f0] font-mono focus:border-[#c5a059] focus:outline-none"
                />
                <p className="text-[10px] text-[#9e9d98]">
                  Production webhooks require HTTPS. Webhook URL is encrypted at rest using AES-256-GCM.
                </p>
              </div>

              {/* Signing Secret */}
              <div className="space-y-1.5">
                <label className="block text-[#9e9d98] uppercase tracking-wider font-semibold text-[10px]">
                  HMAC Signing Secret (Optional — Auto-generated if left blank)
                </label>
                <input
                  type="password"
                  placeholder="••••••••••••••••••••••••••••••••"
                  value={secret}
                  onChange={(e) => setSecret(e.target.value)}
                  className="w-full bg-[#0b0c0e] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-[#f5f4f0] font-mono focus:border-[#c5a059] focus:outline-none"
                />
              </div>

              {/* CATEGORIZED EVENT SELECTOR */}
              <div className="space-y-3 border-t border-white/10 pt-4">
                <div className="flex items-center justify-between">
                  <label className="block text-[#9e9d98] uppercase tracking-wider font-semibold text-[10px]">
                    Subscribed Events
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSelectAllEvents}
                      className="text-[10px] font-mono text-[#c5a059] hover:underline"
                    >
                      Select All
                    </button>
                    <span className="text-[#9e9d98]">|</span>
                    <button
                      type="button"
                      onClick={handleClearAllEvents}
                      className="text-[10px] font-mono text-[#9e9d98] hover:text-[#f5f4f0]"
                    >
                      Clear All
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#0b0c0e] p-4 rounded-2xl border border-white/5">
                  {EVENT_CATEGORIES.map((cat) => (
                    <div key={cat.category} className="space-y-1.5">
                      <span className="text-[10px] font-mono font-bold text-[#c5a059] uppercase tracking-wider block">
                        {cat.category}
                      </span>
                      {cat.events.map((evt) => {
                        const isChecked =
                          selectedEvents.includes("ALL") || selectedEvents.includes(evt.id);
                        return (
                          <label
                            key={evt.id}
                            className="flex items-center gap-2 text-xs text-[#f5f4f0] cursor-pointer hover:opacity-80"
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleEvent(evt.id)}
                              className="accent-[#c5a059] rounded"
                            />
                            <span>{evt.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* MODAL FOOTER */}
            <div className="flex items-center justify-end gap-3 border-t border-white/10 pt-4">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-xl bg-[#14161a] border border-white/10 text-xs font-mono text-[#9e9d98] hover:text-[#f5f4f0]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting || !name}
                onClick={handleSaveIntegration}
                className="px-5 py-2.5 rounded-xl bg-[#c5a059] text-black font-bold text-xs disabled:opacity-40 hover:brightness-110 transition-all"
              >
                {isSubmitting ? "Saving..." : editingId ? "Update Integration" : "Create Integration"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELIVERY HISTORY DRAWER / PANEL */}
      {selectedIntegrationForDeliveries && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-card max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 md:p-8 rounded-3xl border-[#c5a059]/40 space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h3 className="font-serif-luxury text-xl font-bold text-[#f5f4f0] flex items-center gap-2">
                  <Webhook className="w-5 h-5 text-[#c5a059]" /> Webhook Delivery History
                </h3>
                <p className="text-xs text-[#9e9d98] mt-0.5">
                  Audit log of asynchronous n8n event deliveries and retry attempts.
                </p>
              </div>

              <button
                onClick={() => setSelectedIntegrationForDeliveries(null)}
                className="text-[#9e9d98] hover:text-[#f5f4f0]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {deliveriesLoading ? (
              <div className="py-12 text-center text-xs font-mono text-[#9e9d98]">
                Loading delivery history...
              </div>
            ) : deliveries.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <Layers className="w-8 h-8 text-[#6b6a65] mx-auto" />
                <p className="text-xs text-[#9e9d98]">No webhook deliveries yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-[#9e9d98]">
                    <thead className="border-b border-white/10 uppercase font-mono text-[10px] text-[#f5f4f0]">
                      <tr>
                        <th className="py-3 px-4">Event Type</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Attempts</th>
                        <th className="py-3 px-4">HTTP</th>
                        <th className="py-3 px-4">Time</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 font-mono">
                      {deliveries.map((del) => (
                        <tr
                          key={del.id}
                          onClick={() => setSelectedDeliveryPayload(del)}
                          className="hover:bg-white/[0.02] cursor-pointer transition-all"
                        >
                          <td className="py-3 px-4 font-bold text-[#f5f4f0]">{del.eventType}</td>
                          <td className="py-3 px-4">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                del.status === "DELIVERED"
                                  ? "bg-[#4e8765]/20 text-[#4e8765]"
                                  : del.status === "FAILED"
                                  ? "bg-[#a84b4b]/20 text-[#a84b4b]"
                                  : "bg-[#c5a059]/20 text-[#c5a059]"
                              }`}
                            >
                              {del.status}
                            </span>
                          </td>
                          <td className="py-3 px-4">{del.attemptCount}</td>
                          <td className="py-3 px-4">{del.responseStatus || "-"}</td>
                          <td className="py-3 px-4 text-[11px]">
                            {new Date(del.createdAt).toLocaleTimeString()}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {del.status === "FAILED" && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRetryDelivery(del.id);
                                }}
                                className="inline-flex items-center gap-1 text-[10px] text-[#c5a059] hover:underline"
                              >
                                <RotateCcw className="w-3 h-3" /> Retry
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SAFE PAYLOAD PREVIEW MODAL */}
      {selectedDeliveryPayload && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-card max-w-lg w-full p-6 rounded-3xl border-[#c5a059]/40 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-bold text-[#f5f4f0] font-mono flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#c5a059]" /> Event Payload Preview
              </h3>
              <button
                onClick={() => setSelectedDeliveryPayload(null)}
                className="text-[#9e9d98] hover:text-[#f5f4f0]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-[#0b0c0e] border border-white/10 space-y-1">
                <span className="text-[10px] text-[#9e9d98] font-mono uppercase block">Event Details</span>
                <p className="text-[#f5f4f0] font-mono text-[11px]">
                  ID: {selectedDeliveryPayload.eventId} | Type: {selectedDeliveryPayload.eventType}
                </p>
              </div>

              <div>
                <span className="text-[10px] text-[#9e9d98] font-mono uppercase block mb-1">
                  Sanitized JSON Payload
                </span>
                <pre className="p-3 rounded-xl bg-[#0b0c0e] border border-white/10 text-[10px] font-mono text-[#c5a059] overflow-x-auto max-h-48">
                  {JSON.stringify(selectedDeliveryPayload.payloadJson, null, 2)}
                </pre>
              </div>

              {selectedDeliveryPayload.responseBodyPreview && (
                <div>
                  <span className="text-[10px] text-[#9e9d98] font-mono uppercase block mb-1">
                    n8n Response Preview
                  </span>
                  <pre className="p-3 rounded-xl bg-[#0b0c0e] border border-white/10 text-[10px] font-mono text-[#9e9d98] overflow-x-auto max-h-32">
                    {selectedDeliveryPayload.responseBodyPreview}
                  </pre>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-white/10">
              <button
                onClick={() => setSelectedDeliveryPayload(null)}
                className="px-4 py-2 rounded-xl bg-[#c5a059] text-black font-bold text-xs"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
