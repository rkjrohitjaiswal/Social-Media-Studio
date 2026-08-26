import { Metadata } from "next";
import { ContentCommandCenterStudio } from "@/components/ContentCommandCenterStudio";

export const metadata: Metadata = {
  title: "Content Command Center | AI Social Media Studio",
  description: "Unified Content Command Center orchestrating multi-platform content creation, versioning, approvals & scheduling.",
};

export default function ContentStudioPage() {
  return <ContentCommandCenterStudio />;
}
