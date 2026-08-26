import { Metadata } from "next";
import { ContentRepurposingStudio } from "@/components/ContentRepurposingStudio";

export const metadata: Metadata = {
  title: "Content Repurposing Studio | AI Social Media Studio",
  description: "Repurpose long-form content into YouTube videos, Shorts, Reels, TikToks, Carousels, and X Threads.",
};

export default function RepurposePage() {
  return <ContentRepurposingStudio />;
}
