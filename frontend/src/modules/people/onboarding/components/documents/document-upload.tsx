"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Eye, FileText, RefreshCw, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/shared/ui";
import { StatusBadge } from "@/shared/ui/patterns";
import { cn } from "@/shared/lib/utils";
import {
  fileAcceptAttribute,
  formatOnboardingFileSize,
  MAX_ONBOARDING_FILE_SIZE_BYTES,
  parseAllowedFileTypes,
  validateOnboardingFile,
} from "../../constants/allowed-file-types";
import type { OnboardingDocStatus } from "../../types/onboarding.types";

function fileExtension(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(dot + 1).toLowerCase() : "";
}

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
  const [dragActive, setDragActive] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const allowed = parseAllowedFileTypes(allowedFileTypes ?? "pdf,jpg,jpeg,png");
  const accept = fileAcceptAttribute(allowedFileTypes ?? "pdf,jpg,jpeg,png");
  const inputId = `doc-file-${id}`;
  const canPickFile = status === null || status === "rejected";
  const isPending = status === "pending";
  const isApproved = status === "approved";
  const isRejected = status === "rejected";
  const selectedFileIsImage = selectedFile?.type.startsWith("image/");

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl(null);
      return;
    }

    const url = URL.createObjectURL(selectedFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [selectedFile]);

  async function handleFileChange(file: File | undefined) {
    if (!file) return;

    const validationError = await validateOnboardingFile(file, allowed);
    if (validationError) {
      toast.error(validationError);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    onSelect(file);
    if (inputRef.current) inputRef.current.value = "";
  }

  function handlePreview() {
    if (!previewUrl) return;
    window.open(previewUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-x-2.5 gap-y-2">
        <span className="text-sm font-semibold text-[color:var(--text-primary)]">
          {name}
          <span className="text-destructive"> *</span>
        </span>
        {isPending ? <StatusBadge status="Waiting for HR" tone="warning" dot /> : null}
        {isApproved ? <StatusBadge status="APPROVED" dot /> : null}
      </div>

      {instructions ? (
        <span className="text-sm text-[color:var(--text-tertiary)]">{instructions}</span>
      ) : null}

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

      {canPickFile ? (
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={accept}
          className="sr-only"
          onChange={(event) => void handleFileChange(event.target.files?.[0])}
        />
      ) : null}

      {selectedFile && canPickFile ? (
        <div className="mt-1 flex items-center gap-3 rounded-lg border border-[color:var(--border-primary)] bg-[color:var(--bg-secondary)] p-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md border border-[color:var(--border-primary)] bg-white">
            {selectedFileIsImage && previewUrl ? (
              <img
                src={previewUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center gap-0.5 text-[color:var(--text-tertiary)]">
                <FileText className="h-6 w-6" strokeWidth={1.5} aria-hidden="true" />
                <span className="rounded-sm bg-[#F04438] px-1 py-0.5 text-[9px] font-bold leading-none text-white">
                  {fileExtension(selectedFile.name).toUpperCase() || "FILE"}
                </span>
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p
              className="truncate text-sm font-semibold text-[color:var(--text-primary)]"
              title={selectedFile.name}
            >
              {selectedFile.name}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[color:var(--text-tertiary)]">
              <span>{formatOnboardingFileSize(selectedFile.size)}</span>
              <span aria-hidden="true">-</span>
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--color-success-600)]" />
                Completed
              </span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button
              type="button"
              size="icon-xs"
              variant="ghost"
              aria-label={`Preview ${selectedFile.name}`}
              onClick={handlePreview}
            >
              <Eye className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
            <Button
              type="button"
              size="icon-xs"
              variant="ghost"
              aria-label={`Replace ${selectedFile.name}`}
              onClick={() => inputRef.current?.click()}
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
            <Button
              type="button"
              size="icon-xs"
              variant="ghost"
              aria-label={`Remove ${selectedFile.name}`}
              onClick={onRemove}
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
          </div>
        </div>
      ) : null}

      {canPickFile && !selectedFile ? (
        <div className="mt-1">
          <button
            type="button"
            className={cn(
              "flex min-h-[104px] w-full items-center justify-center rounded-md border border-dashed border-[color:var(--border-secondary)] bg-white px-4 py-6 text-center transition-colors",
              dragActive && "border-[color:var(--gray-900)] bg-[color:var(--bg-secondary)]",
            )}
            onClick={() => inputRef.current?.click()}
            onDragEnter={(event) => {
              event.preventDefault();
              setDragActive(true);
            }}
            onDragOver={(event) => {
              event.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={(event) => {
              event.preventDefault();
              setDragActive(false);
            }}
            onDrop={(event) => {
              event.preventDefault();
              setDragActive(false);
              void handleFileChange(event.dataTransfer.files?.[0]);
            }}
          >
            <span className="flex items-center justify-center gap-2 text-sm text-[color:var(--text-tertiary)]">
              <Upload className="h-4 w-4 shrink-0" strokeWidth={1.7} aria-hidden="true" />
              <span>
                Drag and drop or{" "}
                <span className="font-semibold text-[color:var(--text-secondary)] underline underline-offset-2">
                  choose file
                </span>
                .
              </span>
            </span>
          </button>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-[color:var(--text-tertiary)]">
            <span>Files Supported: {allowed.map((type) => type.toUpperCase()).join(", ")}</span>
            <span>Max size: {formatOnboardingFileSize(MAX_ONBOARDING_FILE_SIZE_BYTES)}</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
