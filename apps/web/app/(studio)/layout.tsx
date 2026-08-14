"use client";

import React from "react";
import { StudioProvider } from "@/lib/studio-context";
import StudioLayout from "@/components/layout/StudioLayout";

export default function StudioAppLayout({ children }: { children: React.ReactNode }) {
  return (
    <StudioProvider>
      <StudioLayout>{children}</StudioLayout>
    </StudioProvider>
  );
}
