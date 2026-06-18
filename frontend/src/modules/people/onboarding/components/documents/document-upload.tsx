"use client";

import { useRef } from "react";
import { FileText, Upload, CheckCircle2, X } from "lucide-react";
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

export function DocumentUploadRow({
  id,
  name,
  instructions,
  allowedFileTypes,
  rejectionNote,
  status,
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
  selectedFile: File | null;
  onSelect: (file: File) => void;
  onRemove: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const allowed = parseAllowedFileTypes(allowedFileTypes ?? "pdf,jpg,jpeg,png");
  const accept = fileAcceptAttribute(allowedFileTypes ?? "pdf,jpg,jpeg,png");
  const inputId = `doc-file-${id}`;
  const canPickFile = status === null || status === "rejected";

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
    <div className="border-t border-[color:var(--border-primary)] py-3 first:border-t-0">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-start gap-2.5">
          <FileText
            className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--text-tertiary)]"
            aria-hidden="true"
          />
          <div className="min-w-0">
            <span className="truncate text-sm font-medium text-[color:var(--text-primary)]">
              {name}
            </span>
            {instructions ? (
              <p className="mt-0.5 text-xs text-[color:var(--text-tertiary)]">{instructions}</p>
            ) : null}
            {allowed.length > 0 ? (
              <p className="mt-0.5 text-xs text-[color:var(--text-quaternary)]">
                Allowed types: {allowed.join(", ")} · Max 5 MB
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {status && !selectedFile ? <StatusBadge status={status} /> : null}
          {selectedFile && canPickFile ? (
            <span className="rounded-full border border-[#ABEFC6] bg-[#ECFDF3] px-2 py-0.5 text-xs font-medium text-[#067647]">
              Ready
            </span>
          ) : null}
          {canPickFile && !selectedFile && (
            <>
              <input
                ref={inputRef}
                id={inputId}
                type="file"
                accept={accept}
                className="sr-only"
                onChange={(e) => handleFileChange(e.target.files?.[0])}
              />
              <Button
                size="sm"
                variant={status === "rejected" ? "destructive" : "secondary"}
                onClick={() => inputRef.current?.click()}
              >
                <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                {status === "rejected" ? "Choose new file" : "Choose file"}
              </Button>
            </>
          )}
          {status === "pending" && !selectedFile && (
            <span className="text-xs text-[color:var(--text-tertiary)]">Awaiting review</span>
          )}
          {status === "approved" && (
            <CheckCircle2 className="h-4 w-4 text-[#067647]" aria-hidden="true" />
          )}
        </div>
      </div>

      {selectedFile && canPickFile && (
        <div className="mt-2 flex items-center justify-between gap-3 rounded-lg border border-[color:var(--border-primary)] bg-[color:var(--bg-secondary)] px-3 py-2">
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-[color:var(--text-primary)]">
              {selectedFile.name}
            </p>
            <p className="text-[11px] text-[color:var(--text-tertiary)]">
              {formatFileSize(selectedFile.size)} · Will upload when you finish onboarding
            </p>
          </div>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-7 w-7 shrink-0"
            aria-label="Remove selected file"
            onClick={onRemove}
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
        </div>
      )}

      {status === "rejected" && rejectionNote && (
        <p className="mt-2 text-xs text-[#B42318]">Rejected: {rejectionNote}</p>
      )}
    </div>
  );
}
