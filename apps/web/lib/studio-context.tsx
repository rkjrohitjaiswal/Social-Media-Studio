import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { WorkspaceResponse } from "@ai-social/shared";
import { getWorkspaces } from "./api-client";
import {
  fetchNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  NotificationItem,
} from "./api-client";
import { createClient } from "./supabase/client";
import {
  Brand,
  Campaign,
  GeneratedAsset,
  INITIAL_BRANDS,
  MOCK_CAMPAIGNS,
  MOCK_SCHEDULED_POSTS,
  ScheduledPost,
} from "./mock-data";

interface StudioContextType {
  brands: Brand[];
  activeBrand: Brand;
  setActiveBrand: (brand: Brand) => void;
  addBrand: (brand: Brand) => void;
  updateBrand: (brand: Brand) => void;
  campaigns: Campaign[];
  activeCampaign: Campaign | null;
  setActiveCampaignId: (id: string) => void;
  createCampaign: (data: {
    name: string;
    description: string;
    brandId: string;
    referenceAssetUrl: string;
    inputAssetUrls: string[];
    aspectRatio: string;
    aiCreativity: number;
    customPromptOverride?: string;
  }) => string;
  approveAsset: (assetId: string) => void;
  rejectAsset: (assetId: string, reason?: string) => void;
  updateAssetCopy: (
    assetId: string,
    copy: { text: string; cta: string; altText: string; hashtags: string[] }
  ) => void;
  regenerateAssetVersion: (assetId: string, customPrompt: string) => void;
  scheduledPosts: ScheduledPost[];
  scheduleAssetToInstagram: (assetId: string, dateIso: string) => void;
  notifications: NotificationItem[];
  unreadCount: number;
  isLoadingNotifications: boolean;
  notifError: string | null;
  markNotificationsRead: () => void;
  markOneNotificationRead: (id: string) => void;
  refreshNotifications: () => Promise<void>;
  workspaces: WorkspaceResponse[];
  activeWorkspace: WorkspaceResponse | null;
  setActiveWorkspace: (ws: WorkspaceResponse) => void;
  loadWorkspaces: () => Promise<void>;
}

const StudioContext = createContext<StudioContextType | undefined>(undefined);

export function StudioProvider({ children }: { children: React.ReactNode }) {
  const [brands, setBrands] = useState<Brand[]>(INITIAL_BRANDS);
  const [activeBrand, setActiveBrand] = useState<Brand>(INITIAL_BRANDS[0]);
  const [campaigns, setCampaigns] = useState<Campaign[]>(MOCK_CAMPAIGNS);
  const [activeCampaignId, setActiveCampaignId] = useState<string>("camp-101");
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>(MOCK_SCHEDULED_POSTS);

  const [workspaces, setWorkspaces] = useState<WorkspaceResponse[]>([
    {
      id: "demo-workspace-1",
      name: "Maison Lumière Studio",
      slug: "demo-workspace-1",
      ownerId: "demo-user-id",
      plan: "BUSINESS",
      members: [],
      invitations: [],
      createdAt: new Date().toISOString(),
    },
  ]);
  const [activeWorkspace, setActiveWorkspaceState] = useState<WorkspaceResponse | null>(null);

  const loadWorkspaces = async () => {
    try {
      const fetched = await getWorkspaces();
      if (fetched && fetched.length > 0) {
        setWorkspaces(fetched);
        const storedId = typeof window !== "undefined" ? localStorage.getItem("activeWorkspaceId") : null;
        const matched = fetched.find((w) => w.id === storedId) || fetched[0];
        setActiveWorkspaceState(matched);
        if (typeof window !== "undefined") {
          localStorage.setItem("activeWorkspaceId", matched.id);
        }
      }
    } catch {
      // Fallback
    }
  };

  useEffect(() => {
    let isSubscribed = true;
    async function initWorkspaces() {
      try {
        const fetched = await getWorkspaces();
        if (isSubscribed && fetched && fetched.length > 0) {
          setWorkspaces(fetched);
          const storedId = typeof window !== "undefined" ? localStorage.getItem("activeWorkspaceId") : null;
          const matched = fetched.find((w) => w.id === storedId) || fetched[0];
          setActiveWorkspaceState(matched);
          if (typeof window !== "undefined") {
            localStorage.setItem("activeWorkspaceId", matched.id);
          }
        }
      } catch {
        // Fallback
      }
    }
    initWorkspaces();
    return () => {
      isSubscribed = false;
    };
  }, []);

  const setActiveWorkspace = (ws: WorkspaceResponse) => {
    setActiveWorkspaceState(ws);
    if (typeof window !== "undefined") {
      localStorage.setItem("activeWorkspaceId", ws.id);
    }
  };

  // ── Real Notification State ──────────────────────────────────────────────
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
  const [notifError, setNotifError] = useState<string | null>(null);
  const notifChannelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null);

  const refreshNotifications = useCallback(async () => {
    setIsLoadingNotifications(true);
    setNotifError(null);
    try {
      const items = await fetchNotifications();
      setNotifications(items);
      setUnreadCount(items.filter((n) => !n.read).length);
    } catch (err) {
      setNotifError(err instanceof Error ? err.message : "Couldn't load notifications");
    } finally {
      setIsLoadingNotifications(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    refreshNotifications();
  }, [refreshNotifications]);

  // Supabase Realtime — listen for INSERT/UPDATE on the notifications table
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("notifications-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        () => {
          // Refresh the list whenever a new notification is inserted for this user
          refreshNotifications();
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "notifications" },
        () => {
          refreshNotifications();
        }
      )
      .subscribe();

    notifChannelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refreshNotifications]);

  const markNotificationsRead = useCallback(async () => {
    // Optimistic update
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    // Persist to API
    await markAllNotificationsAsRead();
  }, []);

  const markOneNotificationRead = useCallback(async (id: string) => {
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
    // Persist to API
    await markNotificationAsRead(id);
  }, []);

  const activeCampaign = campaigns.find((c) => c.id === activeCampaignId) || campaigns[0] || null;

  const addBrand = (newBrand: Brand) => {
    setBrands((prev) => [...prev, newBrand]);
    setActiveBrand(newBrand);
  };

  const updateBrand = (updatedBrand: Brand) => {
    setBrands((prev) => prev.map((b) => (b.id === updatedBrand.id ? updatedBrand : b)));
    if (activeBrand.id === updatedBrand.id) {
      setActiveBrand(updatedBrand);
    }
  };

  const createCampaign = (data: {
    name: string;
    description: string;
    brandId: string;
    referenceAssetUrl: string;
    inputAssetUrls: string[];
    aspectRatio: string;
    aiCreativity: number;
    customPromptOverride?: string;
  }): string => {
    const newId = `camp-${Date.now().toString().slice(-4)}`;
    
    // Construct generated assets based on inputs
    const generatedAssets: GeneratedAsset[] = data.inputAssetUrls.map((inputUrl, idx) => {
      const gId = `gen-${Date.now()}-${idx}`;
      return {
        id: gId,
        campaignId: newId,
        inputAsset: {
          id: `in-${Date.now()}-${idx}`,
          url: inputUrl,
          fileName: `input-product-${idx + 1}.jpg`,
          mimeType: "image/jpeg",
          width: 800,
          height: 1000,
        },
        currentVersion: {
          id: `v-${gId}-1`,
          versionNumber: 1,
          url: inputUrl, // Will update during simulated processing
          promptUsed: data.customPromptOverride || `Editorial luxury presentation matching reference aesthetic with warm golden hour lighting and dark shadows.`,
          qualityScore: Math.floor(Math.random() * 8) + 91, // 91-98
          qualityReport: {
            lighting: 96,
            styleConsistency: 94,
            clarity: 97,
            brandAlignment: 95,
            feedback: "Perfect style vector alignment with reference image.",
          },
          createdAt: new Date().toISOString(),
        },
        versions: [],
        caption: {
          text: `Haute couture luxury piece for ${activeBrand.name}. Sculpted with timeless elegance and precision craftsmanship.`,
          cta: `Discover the exclusive collection online now.`,
          altText: `Luxury product presented in dramatic editorial studio lighting.`,
        },
        hashtags: [`#${activeBrand.name.replace(/\s+/g, "")}`, "#HauteCouture", "#LuxuryEditorial", "#AW26"],
        status: "PENDING",
        createdAt: new Date().toISOString(),
      };
    });

    const newCampaign: Campaign = {
      id: newId,
      brandId: data.brandId,
      name: data.name,
      description: data.description,
      status: "PROCESSING",
      progressPercent: 15,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      referenceAsset: {
        id: `ref-${newId}`,
        url: data.referenceAssetUrl,
        fileName: "reference-style-anchor.jpg",
        mimeType: "image/jpeg",
        width: 1200,
        height: 1500,
        isReference: true,
      },
      inputAssets: data.inputAssetUrls.map((url, i) => ({
        id: `in-${newId}-${i}`,
        url,
        fileName: `input-product-${i + 1}.jpg`,
        mimeType: "image/jpeg",
        width: 800,
        height: 1000,
      })),
      generatedAssets,
    };

    setCampaigns((prev) => [newCampaign, ...prev]);
    setActiveCampaignId(newId);

    // Simulate real-time progress update
    let currentProgress = 15;
    const interval = setInterval(() => {
      currentProgress += 25;
      if (currentProgress >= 100) {
        currentProgress = 100;
        clearInterval(interval);
        setCampaigns((prev) =>
          prev.map((c) =>
            c.id === newId
              ? {
                  ...c,
                  status: "READY_FOR_REVIEW",
                  progressPercent: 100,
                  generatedAssets: c.generatedAssets.map((ga, idx) => ({
                    ...ga,
                    currentVersion: {
                      ...ga.currentVersion,
                      // Assign high-res generated demonstration images
                      url: [
                        "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?q=80&w=1200&auto=format&fit=crop",
                        "https://images.unsplash.com/photo-1523293182086-7651a899d37f?q=80&w=1200&auto=format&fit=crop",
                        "https://images.unsplash.com/photo-1511499767150-a48a237f0083?q=80&w=1200&auto=format&fit=crop",
                        "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?q=80&w=1200&auto=format&fit=crop",
                      ][idx % 4],
                    },
                  })),
                }
              : c
          )
        );
      } else {
        setCampaigns((prev) =>
          prev.map((c) => (c.id === newId ? { ...c, progressPercent: currentProgress } : c))
        );
      }
    }, 1500);

    return newId;
  };

  const approveAsset = (assetId: string) => {
    setCampaigns((prev) =>
      prev.map((c) => ({
        ...c,
        generatedAssets: c.generatedAssets.map((ga) =>
          ga.id === assetId ? { ...ga, status: "APPROVED" } : ga
        ),
      }))
    );
  };

  const rejectAsset = (assetId: string) => {
    setCampaigns((prev) =>
      prev.map((c) => ({
        ...c,
        generatedAssets: c.generatedAssets.map((ga) =>
          ga.id === assetId ? { ...ga, status: "REJECTED" } : ga
        ),
      }))
    );
  };

  const updateAssetCopy = (
    assetId: string,
    copy: { text: string; cta: string; altText: string; hashtags: string[] }
  ) => {
    setCampaigns((prev) =>
      prev.map((c) => ({
        ...c,
        generatedAssets: c.generatedAssets.map((ga) =>
          ga.id === assetId
            ? {
                ...ga,
                caption: { text: copy.text, cta: copy.cta, altText: copy.altText },
                hashtags: copy.hashtags,
              }
            : ga
        ),
      }))
    );
  };

  const regenerateAssetVersion = (assetId: string, customPrompt: string) => {
    setCampaigns((prev) =>
      prev.map((c) => ({
        ...c,
        generatedAssets: c.generatedAssets.map((ga) => {
          if (ga.id !== assetId) return ga;
          const nextVerNum = ga.versions.length + 1;
          const newVer = {
            id: `v-${assetId}-${nextVerNum}`,
            versionNumber: nextVerNum,
            url: ga.currentVersion.url,
            promptUsed: customPrompt,
            qualityScore: 95.8,
            qualityReport: {
              lighting: 97,
              styleConsistency: 96,
              clarity: 96,
              brandAlignment: 94,
              feedback: `Regeneration version ${nextVerNum} created with custom prompt tweaks.`,
            },
            createdAt: new Date().toISOString(),
          };
          return {
            ...ga,
            currentVersion: newVer,
            versions: [newVer, ...ga.versions],
          };
        }),
      }))
    );
  };

  const scheduleAssetToInstagram = (assetId: string, dateIso: string) => {
    const asset = activeCampaign?.generatedAssets.find((a) => a.id === assetId);
    if (!asset) return;

    approveAsset(assetId);

    const newSchedule: ScheduledPost = {
      id: `sched-${Date.now()}`,
      campaignId: activeCampaign.id,
      campaignName: activeCampaign.name,
      assetUrl: asset.currentVersion.url,
      caption: asset.caption.text,
      platform: "INSTAGRAM",
      scheduledAt: dateIso,
      published: false,
    };

    setScheduledPosts((prev) => [newSchedule, ...prev]);
  };

  const markNotificationsReadLegacy = useCallback(() => {
    // Legacy shim — kept for type safety, but actual logic is in markNotificationsRead above
  }, []);

  return (
    <StudioContext.Provider
      value={{
        brands,
        activeBrand,
        setActiveBrand,
        addBrand,
        updateBrand,
        campaigns,
        activeCampaign,
        setActiveCampaignId,
        createCampaign,
        approveAsset,
        rejectAsset,
        updateAssetCopy,
        regenerateAssetVersion,
        scheduledPosts,
        scheduleAssetToInstagram,
        notifications,
        unreadCount,
        isLoadingNotifications,
        notifError,
        markNotificationsRead,
        markOneNotificationRead,
        refreshNotifications,
        workspaces,
        activeWorkspace,
        setActiveWorkspace,
        loadWorkspaces,
      }}
    >
      {children}
    </StudioContext.Provider>
  );
}

export function useStudio() {
  const context = useContext(StudioContext);
  if (!context) {
    throw new Error("useStudio must be used within a StudioProvider");
  }
  return context;
}
