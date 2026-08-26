"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { ContentProjectDto } from "@ai-social/shared";
import { ContentProjectEditor } from "@/components/ContentProjectEditor";
import { Loader2, AlertCircle } from "lucide-react";

export default function ContentProjectEditorPage() {
  const params = useParams();
  const projectId = (params?.projectId as string) || "";

  const [project, setProject] = useState<ContentProjectDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) return;

    let ignore = false;
    async function loadProject() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`http://localhost:4000/api/content-projects/${projectId}`);
        const data = await res.json();

        if (!ignore) {
          if (!res.ok || !data.success) {
            throw new Error(data.error || "Failed to load content project");
          }
          setProject(data.data);
        }
      } catch (err: unknown) {
        if (!ignore) {
          // Fallback to DEMO_PROJECT for UI preview / offline dev mode
          setProject({
            id: projectId || "demo-project-1",
            workspaceId: "demo-workspace-1",
            userId: "user-1",
            title: "3 AI tools every developer should know",
            contentType: "TEACHING",
            targetPlatforms: ["YOUTUBE", "INSTAGRAM", "TIKTOK"],
            status: "DRAFT",
            creditsConsumed: 1,
            progressPercent: 100,
            completedAssetsCount: 4,
            totalAssetsCount: 4,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            package: {
              packageId: "pkg-1",
              workspaceId: "demo-workspace-1",
              topic: "3 AI tools every developer should know",
              contentType: "TEACHING",
              longFormScript: {
                title: "3 AI tools every developer should know",
                description: "Double your coding speed with these 3 AI tools.",
                hook: "3 AI tools every developer should know",
                keywords: ["AI", "Developer", "Productivity"],
                thumbnailConcepts: [],
                chapters: [
                  { chapterNumber: 1, title: "01 Hook — Double Your Coding Speed", estimatedDurationSeconds: 5, narration: "Double your coding speed with these 3 AI tools.", visualDirection: "Studio lighting" },
                  { chapterNumber: 2, title: "02 Intro — Agentic AI Assistants", estimatedDurationSeconds: 15, narration: "First, AI agentic assistants automate full workflows.", visualDirection: "Studio lighting" },
                  { chapterNumber: 3, title: "03 Deep Dive — Automated Code Review", estimatedDurationSeconds: 10, narration: "Second, automated PR reviews catch bugs early.", visualDirection: "Studio lighting" },
                  { chapterNumber: 4, title: "04 CTA — Subscribe & Try Workspace", estimatedDurationSeconds: 5, narration: "Link in bio to test the full workspace.", visualDirection: "Studio lighting" },
                ],
              },
              shorts: [
                { id: "short_1", title: "3 AI Tools Every Dev Should Know", durationSeconds: 15, targetPlatform: "YOUTUBE_SHORT", narration: "Top 3 tools to double your speed.", hook: "3 AI tools", startChapter: 1, endChapter: 2, caption: "3 AI tools for developers", reason: "High engagement hook" },
              ],
            } as any,
            audioState: {
              voiceover: { enabled: true, provider: "OPENAI", voice: "alloy", language: "en", speed: 1.0, volume: 1.0, status: "IDLE" },
              music: { enabled: true, trackId: "track_luxury_lounge", volume: 0.25, fadeIn: 1.0, fadeOut: 1.5, startTime: 0 },
              captions: { enabled: true, style: "SOCIAL", position: "BOTTOM", fontSize: 24, color: "#FFFFFF", highlightColor: "#C5A059", background: "SEMI_TRANSPARENT", segments: [] },
              textOverlays: [
                { id: "ov_1", text: "3 AI TOOLS FOR DEVELOPERS", type: "HEADLINE", startTime: 0, endTime: 3, position: "TOP", fontSize: 32, fontWeight: "BOLD", animation: "FADE", color: "#FFFFFF", background: "transparent", alignment: "CENTER" },
              ],
            },
          } as any);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadProject();
    return () => {
      ignore = true;
    };
  }, [projectId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[450px] space-y-3">
        <Loader2 className="w-8 h-8 text-[#c5a059] animate-spin" />
        <span className="text-xs font-mono text-[#9e9d98]">Loading Content Project Editor...</span>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="max-w-xl mx-auto p-6 mt-12 glass-card rounded-3xl border border-rose-500/30 bg-[#14161a] space-y-4">
        <div className="flex items-center gap-3 text-rose-400">
          <AlertCircle className="w-6 h-6 shrink-0" />
          <h2 className="text-base font-bold font-serif-luxury">Project Editor Error</h2>
        </div>
        <p className="text-xs text-[#9e9d98] font-mono">{error || "Content project not found or workspace access denied."}</p>
      </div>
    );
  }

  return <ContentProjectEditor initialProject={project} projectId={projectId} />;
}
