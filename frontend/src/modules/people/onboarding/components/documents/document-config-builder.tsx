"use client";

import { FileText, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/shared/ui";
import { EmptyState } from "@/shared/ui/patterns";
import type { OnboardingDocumentConfig } from "../../types/onboarding.types";

export function DocumentConfigBuilder({
  documents,
  onAdd,
  onEdit,
  onDelete,
  deletingId,
}: {
  documents: OnboardingDocumentConfig[];
  onAdd: () => void;
  onEdit: (doc: OnboardingDocumentConfig) => void;
  onDelete: (doc: OnboardingDocumentConfig) => void;
  deletingId?: string | null;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3 px-6 py-4">
        <div>
          <h2 className="text-sm font-bold text-[color:var(--text-primary)]">Required documents</h2>
          <p className="mt-1 text-[13px] text-[color:var(--text-secondary)]">
            Documents new hires must submit during onboarding.
          </p>
        </div>
        <Button size="sm" onClick={onAdd}>
          <Plus className="h-4 w-4" />
          Add document
        </Button>
      </div>

      {documents.length === 0 ? (
        <div className="px-6 pb-6">
          <EmptyState
            icon={FileText}
            title="No documents configured"
            body="Add required documents like NBI Clearance or government ID."
            action={{ label: "Add document", onClick: onAdd }}
          />
        </div>
      ) : (
        <div className="divide-y divide-[color:var(--border-primary)] border-t border-[color:var(--border-primary)]">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-[color:var(--text-primary)]">
                  {doc.documentName}
                </p>
                {doc.instructions ? (
                  <p className="mt-1 text-xs text-[color:var(--text-tertiary)]">{doc.instructions}</p>
                ) : null}
                <p className="mt-1 text-xs text-[color:var(--text-quaternary)]">
                  {doc.isRequired ? "Required" : "Optional"} · {doc.allowedFileTypes}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => onEdit(doc)}>
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-[#FECDCA] text-[#B42318] hover:bg-[#FEF3F2]"
                  onClick={() => onDelete(doc)}
                  disabled={deletingId === doc.id}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
