"use client";

import React, { useRef, useState } from "react";
import Image from "next/image";
import {
  Upload,
  Plus,
  Trash2,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X
} from "lucide-react";
import { validateCampaignAssetFile } from "@ai-social/shared";

export interface BulkUploadItem {
  id: string;
  file?: File;
  fileName: string;
  fileSize: number;
  mimeType: string;
  previewUrl: string;
  storagePath?: string;
  signedUrl?: string;
  status: "SELECTED" | "UPLOADING" | "UPLOADED" | "FAILED" | "REMOVING";
  progress: number;
  errorMessage?: string;
}

interface BulkImageUploaderProps {
  campaignId: string;
  items: BulkUploadItem[];
  onChange: (items: BulkUploadItem[]) => void;
}

export default function BulkImageUploader({ campaignId, items, onChange }: BulkImageUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const totalCount = items.length;
  const uploadedCount = items.filter((i) => i.status === "UPLOADED").length;
  const failedCount = items.filter((i) => i.status === "FAILED").length;
  const uploadingCount = items.filter((i) => i.status === "UPLOADING").length;
  const overallProgress =
    totalCount === 0
      ? 0
      : Math.round(
          items.reduce((acc, curr) => acc + (curr.status === "UPLOADED" ? 100 : curr.progress), 0) / totalCount
        );

  const handleFilesSelect = (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const newItems: BulkUploadItem[] = [];

    fileArray.forEach((file) => {
      const check = validateCampaignAssetFile({
        type: file.type,
        size: file.size,
        name: file.name,
      });

      const previewUrl = URL.createObjectURL(file);

      if (!check.valid) {
        newItems.push({
          id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          file,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
          previewUrl,
          status: "FAILED",
          progress: 0,
          errorMessage: check.error || "Validation error",
        });
      } else {
        newItems.push({
          id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          file,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
          previewUrl,
          status: "SELECTED",
          progress: 0,
        });
      }
    });

    const updated = [...items, ...newItems];
    onChange(updated);
    uploadSelectedFiles(updated);
  };

  // Direct-to-Supabase Storage Upload Worker
  const uploadSelectedFiles = async (currentItems: BulkUploadItem[]) => {
    const pendingItems = currentItems.filter((i) => i.status === "SELECTED");
    if (pendingItems.length === 0) return;

    for (const item of pendingItems) {
      if (!item.file) continue;

      // Update transient state to UPLOADING
      updateItemState(item.id, { status: "UPLOADING", progress: 20 });

      try {
        // Step 1: Request direct upload capability URL from server
        const capabilityRes = await fetch((process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000") + `/api/campaigns/${campaignId}/assets/upload-url`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: item.fileName,
            mimeType: item.mimeType,
            fileSizeBytes: item.fileSize,
            isReference: false,
          }),
        });

        const capabilityResult = await capabilityRes.json();
        if (!capabilityResult.success) {
          updateItemState(item.id, {
            status: "FAILED",
            progress: 0,
            errorMessage: capabilityResult.error || "Upload authorization failed",
          });
          continue;
        }

        updateItemState(item.id, { progress: 50 });

        // Step 2: Direct browser binary upload to Supabase Storage
        const uploadRes = await fetch(capabilityResult.uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": item.mimeType },
          body: item.file,
        });

        // Fallback OK check for direct bucket upload
        if (!uploadRes.ok && uploadRes.status !== 200) {
          updateItemState(item.id, {
            status: "FAILED",
            progress: 0,
            errorMessage: "Direct Supabase Storage upload failed",
          });
          continue;
        }

        updateItemState(item.id, { progress: 80 });

        // Step 3: Confirm completion & register MediaAsset in DB
        const completeRes = await fetch((process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000") + `/api/campaigns/${campaignId}/assets/complete`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            storagePath: capabilityResult.storagePath,
            fileName: item.fileName,
            mimeType: item.mimeType,
            fileSizeBytes: item.fileSize,
            isReference: false,
          }),
        });

        const completeResult = await completeRes.json();

        if (completeResult.success && completeResult.asset) {
          // Dispose heavy File object from React state after successful upload
          updateItemState(item.id, {
            file: undefined,
            status: "UPLOADED",
            progress: 100,
            storagePath: completeResult.asset.storagePath,
            signedUrl: completeResult.asset.signedUrl,
          });
        } else {
          updateItemState(item.id, {
            status: "FAILED",
            progress: 0,
            errorMessage: completeResult.error || "Upload completion registration failed",
          });
        }
      } catch {
        updateItemState(item.id, {
          status: "FAILED",
          progress: 0,
          errorMessage: "Network error during upload workflow",
        });
      }
    }
  };

  const updateItemState = (id: string, partial: Partial<BulkUploadItem>) => {
    onChange(
      items.map((it) => (it.id === id ? { ...it, ...partial } : it))
    );
  };

  const handleRetryItem = (item: BulkUploadItem) => {
    updateItemState(item.id, { status: "SELECTED", progress: 0, errorMessage: undefined });
    uploadSelectedFiles(
      items.map((it) => (it.id === item.id ? { ...it, status: "SELECTED", progress: 0 } : it))
    );
  };

  const handleRemoveItem = (id: string) => {
    onChange(items.filter((it) => it.id !== id));
  };

  const handleClearAll = () => {
    onChange([]);
  };

  return (
    <div className="space-y-6">
      {/* MULTI-FILE DROPZONE */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragOver(false);
          if (e.dataTransfer.files?.length) {
            handleFilesSelect(e.dataTransfer.files);
          }
        }}
        onClick={() => fileInputRef.current?.click()}
        className={`p-8 rounded-3xl border-2 border-dashed text-center cursor-pointer transition-all ${
          isDragOver
            ? "border-[#c5a059] bg-[#c5a059]/10"
            : "border-white/10 hover:border-[#c5a059]/40 bg-[#0b0c0e]/80"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => e.target.files?.length && handleFilesSelect(e.target.files)}
          className="hidden"
        />

        <div className="w-12 h-12 rounded-2xl bg-[#1c1f26] border border-white/10 text-[#c5a059] flex items-center justify-center mx-auto mb-3">
          <Upload className="w-6 h-6" />
        </div>
        <div className="text-sm font-semibold text-[#f5f4f0]">
          Drag & Drop batch product images or <span className="text-[#c5a059] underline">browse files</span>
        </div>
        <p className="text-xs text-[#9e9d98] mt-1">
          Supports JPEG, PNG, WebP • Max 20MB per asset • Direct Supabase Storage Upload Pipeline
        </p>
      </div>

      {/* OVERALL BATCH PROGRESS METRICS */}
      {totalCount > 0 && (
        <div className="glass-card p-5 rounded-2xl space-y-3">
          <div className="flex flex-wrap items-center justify-between text-xs gap-2">
            <div className="flex items-center gap-4">
              <span className="font-semibold text-[#f5f4f0]">
                Batch Status: <span className="text-[#c5a059]">{totalCount} Images</span>
              </span>
              <span className="text-[#4e8765] font-medium">{uploadedCount} uploaded</span>
              {failedCount > 0 && <span className="text-[#a84b4b] font-medium">{failedCount} failed</span>}
              {uploadingCount > 0 && <span className="text-[#c5a059] font-medium">{uploadingCount} uploading...</span>}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 rounded-lg bg-[#1c1f26] border border-white/10 text-[11px] font-semibold text-[#c5a059] hover:bg-white/5 transition-colors flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Add More
              </button>
              <button
                type="button"
                onClick={handleClearAll}
                className="px-3 py-1.5 rounded-lg bg-[#0b0c0e] border border-[#a84b4b]/30 text-[11px] font-semibold text-[#a84b4b] hover:bg-[#a84b4b]/10 transition-colors flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear All
              </button>
            </div>
          </div>

          {/* OVERALL PROGRESS BAR */}
          <div className="w-full bg-[#0b0c0e] h-2 rounded-full overflow-hidden border border-white/5">
            <div
              className="bg-gradient-to-r from-[#c5a059] to-[#4e8765] h-full transition-all duration-300"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* INPUT IMAGES GALLERY GRID */}
      {totalCount > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="group relative rounded-2xl overflow-hidden border border-white/10 bg-[#14161a] aspect-square flex flex-col justify-between p-2 shadow-lg transition-transform hover:scale-[1.02]"
            >
              {/* IMAGE PREVIEW */}
              <div className="absolute inset-0 z-0">
                <Image
                  src={item.signedUrl || item.previewUrl}
                  alt={item.fileName}
                  fill
                  className="object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                />
              </div>

              {/* TOP ACTIONS */}
              <div className="relative z-10 flex items-center justify-between">
                <span className="text-[10px] font-mono bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded text-[#f5f4f0] truncate max-w-[70%]">
                  {(item.fileSize / (1024 * 1024)).toFixed(1)}MB
                </span>
                <button
                  type="button"
                  onClick={() => handleRemoveItem(item.id)}
                  className="p-1 rounded-full bg-black/70 hover:bg-[#a84b4b] text-white transition-colors"
                  title="Remove asset"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* BOTTOM STATUS FOOTER */}
              <div className="relative z-10 bg-black/80 backdrop-blur-md p-2 rounded-xl border border-white/10 text-center space-y-1">
                {item.status === "UPLOADED" && (
                  <div className="flex items-center justify-center gap-1 text-[11px] text-[#4e8765] font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#4e8765]" />
                    <span>Uploaded</span>
                  </div>
                )}

                {item.status === "UPLOADING" && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-center gap-1 text-[10px] text-[#c5a059] font-medium">
                      <Loader2 className="w-3 h-3 animate-spin text-[#c5a059]" />
                      <span>{item.progress}%</span>
                    </div>
                    <div className="w-full bg-white/10 h-1 rounded-full overflow-hidden">
                      <div
                        className="bg-[#c5a059] h-full transition-all"
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {item.status === "FAILED" && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-center gap-1 text-[10px] text-[#a84b4b] font-medium truncate">
                      <AlertCircle className="w-3 h-3 text-[#a84b4b]" />
                      <span>Failed</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRetryItem(item)}
                      className="w-full py-0.5 rounded bg-[#a84b4b]/20 hover:bg-[#a84b4b] text-[#f5f4f0] text-[10px] font-bold transition-colors flex items-center justify-center gap-1"
                    >
                      <RefreshCw className="w-2.5 h-2.5" />
                      Retry
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
