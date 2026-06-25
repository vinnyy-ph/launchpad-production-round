"use client";

import { useRef, useState } from "react";
import { FileText, Trash2, Upload } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { Button } from "../primitives/button";

function fileExtension(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(dot + 1).toLowerCase() : "";
}

function extensionBadgeClass(extension: string): string {
  if (extension === "xlsx" || extension === "xls") {
    return "bg-[color:var(--color-success-600)]";
  }
  if (extension === "pdf") {
    return "bg-[color:var(--color-error-500)]";
  }
  return "bg-[color:var(--text-tertiary)]";
}

export interface FileUploadBoxProps {
  accept: string;
  disabled?: boolean;
  helperText?: string;
  constraintsText?: string;
  onFileSelect: (file: File) => void;
  inputId?: string;
}

export function FileUploadBox({
  accept,
  disabled = false,
  helperText,
  constraintsText,
  onFileSelect,
  inputId = "file-upload-input",
}: FileUploadBoxProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  function handleFile(file: File | undefined) {
    if (!file || disabled) return;
    onFileSelect(file);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={accept}
        className="sr-only"
        disabled={disabled}
        onChange={(event) => handleFile(event.target.files?.[0])}
      />
      <button
        type="button"
        className={cn(
          "flex min-h-[104px] w-full items-center justify-center rounded-md border border-dashed border-[color:var(--border-secondary)] bg-white px-4 py-6 text-center transition-colors",
          dragActive && "border-[color:var(--gray-900)] bg-[color:var(--bg-secondary)]",
          disabled && "cursor-not-allowed opacity-[.38]",
        )}
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        onDragEnter={(event) => {
          event.preventDefault();
          if (!disabled) setDragActive(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setDragActive(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setDragActive(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setDragActive(false);
          handleFile(event.dataTransfer.files[0]);
        }}
      >
        <span className="flex flex-col items-center gap-2">
          <Upload className="h-8 w-8 text-[color:var(--text-tertiary)]" strokeWidth={1.5} aria-hidden="true" />
          <span className="text-sm text-[color:var(--text-tertiary)]">
            {helperText ?? (
              <>
                Drag and drop or{" "}
                <span className="font-semibold text-[color:var(--text-secondary)] underline underline-offset-2">
                  choose file
                </span>
                .
              </>
            )}
          </span>
        </span>
      </button>
      {constraintsText ? (
        <p className="mt-2 text-xs text-[color:var(--text-tertiary)]">{constraintsText}</p>
      ) : null}
    </div>
  );
}

export interface FileUploadChipProps {
  file: File;
  onRemove: () => void;
  formatFileSize?: (bytes: number) => string;
  statusLabel?: string;
  disabled?: boolean;
}

export function FileUploadChip({
  file,
  onRemove,
  formatFileSize = (bytes) => `${Math.round(bytes / 1024)} KB`,
  statusLabel = "Completed",
  disabled = false,
}: FileUploadChipProps) {
  const extension = fileExtension(file.name);
  const extensionLabel = extension.toUpperCase() || "FILE";

  return (
    <div className="flex items-center gap-3 rounded-lg border border-[color:var(--border-primary)] bg-[color:var(--bg-secondary)] p-3">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md border border-[color:var(--border-primary)] bg-white">
        <div className="flex flex-col items-center gap-0.5 text-[color:var(--text-tertiary)]">
          <FileText className="h-6 w-6" strokeWidth={1.5} aria-hidden="true" />
          <span
            className={`rounded-sm px-1 py-0.5 text-[10px] font-bold leading-none text-white ${extensionBadgeClass(extension)}`}
          >
            {extensionLabel}
          </span>
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <p
          className="truncate text-sm font-semibold text-[color:var(--text-primary)]"
          title={file.name}
        >
          {file.name}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[color:var(--text-tertiary)]">
          <span>{formatFileSize(file.size)}</span>
          <span aria-hidden="true">·</span>
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--color-success-600)]" />
            {statusLabel}
          </span>
        </div>
      </div>
      <Button
        type="button"
        size="icon-xs"
        variant="ghost"
        disabled={disabled}
        aria-label={`Remove ${file.name}`}
        onClick={onRemove}
      >
        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
      </Button>
    </div>
  );
}
