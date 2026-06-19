"use client";

import { useRef } from "react";
import { FileText, Upload, X, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/shared/ui";
import { StatusBadge } from "@/shared/ui/patterns";
import {
  fileAcceptAttribute,
  MAX_ONBOARDING_FILE_SIZE_BYTES,
  parseAllowedFileTypes,
} from "../../constants/allowed-file-types";
import type { OnboardingDocStatus } from "../../types/onboarding.types";

function fileExtension(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(dot + 1).toLowerCase() : "";
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * One document on the "Upload your documents" step, styled as a bordered card
 * matching the Jia onboarding design. States: none → "Choose file"; rejected →
 * red note + "Re-upload"; pending → "Waiting for HR" badge (+ uploaded filename);
 * approved → "Approved" badge. A locally-staged file shows a "Ready" badge until
 * the employee submits onboarding. Status colorways come from StatusBadge so the
 * employee view matches HR's document review.
 */
export function DocumentUploadRow({
  id,
  name,
  instructions,
  allowedFileTypes,
  rejectionNote,
  status,
  submittedFileName,
  selectedFile,
  onSelect,
  onRemove,
}: {
  id: string;
  name: string;
  instructions?: string | null;
  allowedFileTypes?: string;
  rejectionNote: string | null;
  status: OnboardingDocStatus | null;
  submittedFileName?: string | null;
  selectedFile: File | null;
  onSelect: (file: File) => void;
  onRemove: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const allowed = parseAllowedFileTypes(allowedFileTypes ?? "pdf,jpg,jpeg,png");
  const accept = fileAcceptAttribute(allowedFileTypes ?? "pdf,jpg,jpeg,png");
  const inputId = `doc-file-${id}`;
  const canPickFile = status === null || status === "rejected";
  const isPending = status === "pending";
  const isApproved = status === "approved";
  const isRejected = status === "rejected";

  function handleFileChange(file: File | undefined) {
    if (!file) return;

    if (file.size > MAX_ONBOARDING_FILE_SIZE_BYTES) {
      toast.error("File is too large. Maximum size is 5 MB.");
      return;
    }

    const ext = fileExtension(file.name);
    if (!allowed.includes(ext as (typeof allowed)[number])) {
      toast.error(`This file type is not allowed. Use: ${allowed.join(", ")}`);
      return;
    }

    onSelect(file);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="flex gap-3.5 rounded-xl border border-[color:var(--border-primary)] bg-white p-[18px]">
      {/* Icon tile */}
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-[color:var(--border-primary)] bg-[color:var(--bg-secondary)] text-[color:var(--text-tertiary)]">
        <FileText className="h-5 w-5" strokeWidth={1.6} aria-hidden="true" />
      </span>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {/* Name + status badge */}
        <div className="flex flex-wrap items-center justify-between gap-x-2.5 gap-y-2">
          <span className="text-sm font-bold text-[color:var(--text-primary)]">{name}</span>
          {isPending ? <StatusBadge status="Waiting for HR" tone="warning" dot /> : null}
          {isApproved ? <StatusBadge status="APPROVED" dot /> : null}
        </div>

        {/* Description */}
        {instructions ? (
          <span className="text-sm text-[color:var(--text-tertiary)]">{instructions}</span>
        ) : null}

        {/* Pending: uploaded filename chip */}
        {isPending && submittedFileName ? (
          <div className="mt-1.5 flex items-center gap-2 self-start rounded-md border border-[color:var(--border-primary)] bg-[color:var(--bg-secondary)] px-3 py-2">
            <FileText
              className="h-4 w-4 shrink-0 text-[color:var(--text-tertiary)]"
              strokeWidth={1.6}
              aria-hidden="true"
            />
            <span className="text-sm text-[color:var(--text-secondary)]">{submittedFileName}</span>
          </div>
        ) : null}

        {/* Rejected: HR note (error colorway, matching StatusBadge) */}
        {isRejected ? (
          <div className="mt-2 flex gap-2 rounded-md border border-[#FECDCA] bg-[#FEF3F2] px-3 py-2.5">
            <AlertTriangle
              className="mt-px h-4 w-4 shrink-0 text-[#B42318]"
              strokeWidth={1.8}
              aria-hidden="true"
            />
            <span className="text-sm text-[#B42318]">
              {rejectionNote
                ? `HR asked for another upload: ${rejectionNote}`
                : "HR asked for another upload. Please review and re-upload."}
            </span>
          </div>
        ) : null}

        {/* Staged local file: Ready badge + remove (success colorway, matching StatusBadge) */}
        {selectedFile && canPickFile ? (
          <div className="mt-2 flex items-center justify-between gap-3 rounded-md border border-[#ABEFC6] bg-[#ECFDF3] px-3 py-2">
            <div className="flex min-w-0 items-center gap-2">
              <StatusBadge status="Ready" tone="success" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-[color:var(--text-primary)]">
                  {selectedFile.name}
                </p>
                <p className="text-xs text-[color:var(--text-tertiary)]">
                  {formatFileSize(selectedFile.size)} · Uploads when you finish onboarding
                </p>
              </div>
            </div>
            <Button
              type="button"
              size="icon-xs"
              variant="ghost"
              className="shrink-0"
              aria-label="Remove selected file"
              onClick={onRemove}
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
          </div>
        ) : null}

        {/* Types + action */}
        {canPickFile && !selectedFile ? (
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
            {allowed.length > 0 ? (
              <span className="text-xs text-[color:var(--text-tertiary)]">
                {allowed.map((t) => t.toUpperCase()).join(", ")} · up to 5 MB
              </span>
            ) : null}
            <input
              ref={inputRef}
              id={inputId}
              type="file"
              accept={accept}
              className="sr-only"
              onChange={(e) => handleFileChange(e.target.files?.[0])}
            />
            <Button size="sm" variant="secondary" onClick={() => inputRef.current?.click()}>
              <Upload className="h-3.5 w-3.5" aria-hidden="true" />
              {isRejected ? "Re-upload" : "Choose file"}
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
