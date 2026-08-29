"use client";

import React, { useRef, useState, useCallback, useEffect } from "react";
import {
  Upload,
  Link2,
  X,
  Image as ImageIcon,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { uploadReferenceImage } from "@/lib/api-client";

// ─── Constants ───────────────────────────────────────────────────────────────
const ACCEPTED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"] as const;
const ACCEPTED_EXTENSIONS = ".jpg,.jpeg,.png,.webp";
const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

// Loose image-URL pattern: must start with http/https and have an image-like path
const IMAGE_URL_REGEX = /^https?:\/\/.+\.(jpe?g|png|webp|gif|avif|svg)(\?.*)?$/i;
// Also accept URLs without an extension (CDN URLs) — just validate http(s)
const GENERIC_URL_REGEX = /^https?:\/\/.+/i;

function isLikelyImageUrl(url: string): boolean {
  return IMAGE_URL_REGEX.test(url) || GENERIC_URL_REGEX.test(url);
}

// ─── Types ────────────────────────────────────────────────────────────────────
type ActiveTab = "upload" | "url";
type UploadStatus = "idle" | "uploading" | "done" | "error";

export interface ReferenceImageInputProps {
  /** Currently resolved URL (null = cleared) */
  value: string | null;
  /** Called when the resolved URL changes */
  onChange: (url: string | null) => void;
  className?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────
export function ReferenceImageInput({ value, onChange, className = "" }: ReferenceImageInputProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>("upload");
  const [isDragOver, setIsDragOver] = useState(false);

  // Upload tab state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>("idle");
  const [uploadProgress, setUploadProgress] = useState(0); // simulated 0-90 before server responds
  const [uploadError, setUploadError] = useState<string | null>(null);

  // URL tab state
  const [urlInput, setUrlInput] = useState("");
  const [urlError, setUrlError] = useState<string | null>(null);
  const [urlPreviewOk, setUrlPreviewOk] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Sync URL tab input when value changes externally
  useEffect(() => {
    if (value && activeTab === "url" && !urlInput) {
      setUrlInput(value);
    }
  }, [value, activeTab, urlInput]);

  // Cleanup blob URLs on unmount or file change
  useEffect(() => {
    return () => {
      if (localPreview?.startsWith("blob:")) URL.revokeObjectURL(localPreview);
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    };
  }, [localPreview]);

  // ── File validation ──────────────────────────────────────────────────────
  function validateFile(file: File): string | null {
    if (!ACCEPTED_TYPES.includes(file.type as (typeof ACCEPTED_TYPES)[number])) {
      return `Unsupported file type "${file.type}". Please upload a JPEG, PNG, or WEBP image.`;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return `File is too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). Maximum allowed size is ${MAX_FILE_SIZE_MB} MB.`;
    }
    return null;
  }

  // ── Upload flow ──────────────────────────────────────────────────────────
  async function processFile(file: File) {
    const error = validateFile(file);
    if (error) {
      setUploadError(error);
      setUploadStatus("error");
      return;
    }

    // Revoke previous blob
    if (localPreview?.startsWith("blob:")) URL.revokeObjectURL(localPreview);
    const blobUrl = URL.createObjectURL(file);

    setSelectedFile(file);
    setLocalPreview(blobUrl);
    setUploadStatus("uploading");
    setUploadError(null);
    setUploadProgress(5);

    // Simulate progress during upload (5 → 85)
    progressTimerRef.current = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 85) {
          if (progressTimerRef.current) clearInterval(progressTimerRef.current);
          return 85;
        }
        return prev + Math.random() * 15;
      });
    }, 400);

    try {
      const { url } = await uploadReferenceImage(file);
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
      setUploadProgress(100);
      setUploadStatus("done");
      onChange(url);
    } catch (err) {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
      setUploadProgress(0);
      setUploadStatus("error");
      const msg = err instanceof Error ? err.message : "Upload failed";
      setUploadError(msg);
      onChange(null);
    }
  }

  function handleFilesSelected(files: FileList | File[] | null) {
    if (!files || files.length === 0) return;
    processFile(files[0]);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    handleFilesSelected(e.target.files);
    // Reset input so re-selecting same file re-triggers
    e.target.value = "";
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => setIsDragOver(false), []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) handleFilesSelected(files);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleRemoveUpload() {
    if (localPreview?.startsWith("blob:")) URL.revokeObjectURL(localPreview);
    setSelectedFile(null);
    setLocalPreview(null);
    setUploadStatus("idle");
    setUploadError(null);
    setUploadProgress(0);
    onChange(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  // ── URL flow ─────────────────────────────────────────────────────────────
  function handleUrlChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value.trim();
    setUrlInput(val);
    setUrlPreviewOk(false);
    setUrlError(null);

    if (!val) {
      onChange(null);
      return;
    }
    if (!isLikelyImageUrl(val)) {
      setUrlError("Please enter a valid image URL starting with http:// or https://");
      onChange(null);
      return;
    }
    // Accept and let the img onError catch bad URLs
    onChange(val);
  }

  function handleClearUrl() {
    setUrlInput("");
    setUrlError(null);
    setUrlPreviewOk(false);
    onChange(null);
  }

  // ── Tab switch — clear state from the other tab ──────────────────────────
  function switchTab(tab: ActiveTab) {
    if (tab === activeTab) return;
    setActiveTab(tab);
    if (tab === "url") {
      // Clear upload state when switching to URL
      if (uploadStatus === "done") {
        // keep value — already forwarded
      } else {
        handleRemoveUpload();
      }
    } else {
      // Clear URL state when switching to upload
      setUrlInput("");
      setUrlError(null);
      setUrlPreviewOk(false);
      if (!selectedFile) onChange(null);
    }
  }

  // ─── Render helpers ───────────────────────────────────────────────────────
  const showUploadPreview = activeTab === "upload" && (localPreview || (uploadStatus === "done" && value));
  const uploadPreviewSrc = localPreview || value;
  const showUrlPreview = activeTab === "url" && value && isLikelyImageUrl(value);

  return (
    <div className={`space-y-3 ${className}`}>
      {/* ── Tab toggle ── */}
      <div className="flex items-center gap-1 bg-[#0b0c0e] p-1 rounded-xl border border-white/[0.08] w-fit">
        <button
          type="button"
          onClick={() => switchTab("upload")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
            activeTab === "upload"
              ? "bg-[#c5a059]/15 text-[#c5a059] border border-[#c5a059]/30"
              : "text-[#6b6a65] hover:text-[#9e9d98]"
          }`}
        >
          <Upload className="w-3 h-3" />
          Upload Image
        </button>
        <button
          type="button"
          onClick={() => switchTab("url")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
            activeTab === "url"
              ? "bg-[#c5a059]/15 text-[#c5a059] border border-[#c5a059]/30"
              : "text-[#6b6a65] hover:text-[#9e9d98]"
          }`}
        >
          <Link2 className="w-3 h-3" />
          Paste URL
        </button>
      </div>

      {/* ══════════════════ UPLOAD TAB ══════════════════ */}
      {activeTab === "upload" && (
        <div className="space-y-2">
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_EXTENSIONS}
            onChange={handleInputChange}
            className="sr-only"
            aria-label="Upload reference image"
          />

          {/* If no file selected — show drop zone */}
          {!selectedFile && uploadStatus === "idle" && (
            <div
              role="button"
              tabIndex={0}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`relative flex flex-col items-center justify-center gap-3 w-full rounded-xl border-2 border-dashed cursor-pointer transition-all py-8 px-4
                ${isDragOver
                  ? "border-[#c5a059] bg-[#c5a059]/5"
                  : "border-white/[0.12] bg-[#0b0c0e] hover:border-[#c5a059]/50 hover:bg-[#c5a059]/[0.03]"
                }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${isDragOver ? "bg-[#c5a059]/20" : "bg-white/[0.06]"}`}>
                <Upload className={`w-5 h-5 transition-colors ${isDragOver ? "text-[#c5a059]" : "text-[#6b6a65]"}`} />
              </div>
              <div className="text-center">
                <p className="text-xs font-semibold text-[#9e9d98]">
                  {isDragOver ? "Drop to upload" : "Drag & drop or click to browse"}
                </p>
                <p className="text-[10px] text-[#6b6a65] mt-0.5">
                  JPEG, PNG, WEBP · Max {MAX_FILE_SIZE_MB} MB
                </p>
              </div>
            </div>
          )}

          {/* File selected / uploading / done */}
          {selectedFile && (
            <div className="space-y-2">
              {/* Preview */}
              {uploadPreviewSrc && (
                <div className="relative aspect-video rounded-xl overflow-hidden border border-white/[0.10] bg-black/40">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={uploadPreviewSrc}
                    alt="Reference style preview"
                    className="w-full h-full object-cover"
                  />
                  {/* Status overlay during upload */}
                  {uploadStatus === "uploading" && (
                    <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2">
                      <Loader2 className="w-5 h-5 text-[#c5a059] animate-spin" />
                      <span className="text-[11px] text-white font-medium">Uploading…</span>
                      {/* Progress bar */}
                      <div className="w-32 h-1 bg-white/20 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#c5a059] rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(uploadProgress, 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                  {/* Done badge */}
                  {uploadStatus === "done" && (
                    <div className="absolute top-2 right-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 drop-shadow-lg" />
                    </div>
                  )}
                </div>
              )}

              {/* File meta row */}
              <div className="flex items-center gap-2 bg-[#0b0c0e] rounded-xl px-3 py-2 border border-white/[0.08]">
                <ImageIcon className="w-3.5 h-3.5 text-[#c5a059] shrink-0" />
                <span className="text-[11px] text-[#9e9d98] truncate flex-1 font-mono">
                  {selectedFile.name}
                </span>
                <span className="text-[10px] text-[#6b6a65] shrink-0">
                  {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB
                </span>
                <button
                  type="button"
                  onClick={handleRemoveUpload}
                  disabled={uploadStatus === "uploading"}
                  title="Remove image"
                  className="ml-1 p-1 rounded-lg hover:bg-white/[0.08] text-[#6b6a65] hover:text-[#f5f4f0] transition-colors disabled:opacity-40"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Error state with retry */}
          {uploadStatus === "error" && uploadError && (
            <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
              <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-red-400 leading-relaxed">{uploadError}</p>
                {selectedFile && (
                  <button
                    type="button"
                    onClick={() => { setUploadStatus("idle"); setUploadError(null); setSelectedFile(null); setLocalPreview(null); }}
                    className="text-[10px] text-[#c5a059] hover:underline mt-1"
                  >
                    Try again
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════ URL TAB ══════════════════ */}
      {activeTab === "url" && (
        <div className="space-y-2">
          <div className="relative flex items-center gap-2">
            <input
              type="text"
              value={urlInput}
              onChange={handleUrlChange}
              placeholder="https://example.com/image.jpg"
              className={`w-full bg-[#0b0c0e] border rounded-xl px-3 py-2 text-xs text-[#f5f4f0] placeholder-[#6b6a65] outline-none transition-colors pr-8
                ${urlError
                  ? "border-red-500/50 focus:border-red-500"
                  : urlPreviewOk
                  ? "border-emerald-500/40 focus:border-emerald-500/60"
                  : "border-white/[0.10] focus:border-[#c5a059]/50"
                }`}
            />
            {urlInput && (
              <button
                type="button"
                onClick={handleClearUrl}
                className="absolute right-2.5 p-0.5 text-[#6b6a65] hover:text-[#f5f4f0] transition-colors"
                title="Clear URL"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* URL validation error */}
          {urlError && (
            <div className="flex items-center gap-1.5 text-[11px] text-red-400">
              <AlertCircle className="w-3 h-3 shrink-0" />
              <span>{urlError}</span>
            </div>
          )}

          {/* URL preview */}
          {showUrlPreview && (
            <div className="relative aspect-video rounded-xl overflow-hidden border border-white/[0.10] bg-black/40">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={value!}
                alt="Reference style preview"
                className="w-full h-full object-cover"
                onLoad={() => setUrlPreviewOk(true)}
                onError={() => {
                  setUrlPreviewOk(false);
                  setUrlError("Could not load image from this URL. Please check the link.");
                  onChange(null);
                }}
              />
              {urlPreviewOk && (
                <div className="absolute top-2 right-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 drop-shadow-lg" />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
