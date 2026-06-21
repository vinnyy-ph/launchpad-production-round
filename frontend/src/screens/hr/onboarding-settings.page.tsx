"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Settings2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/shared/components/layout/page-header";
import {
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  FormField,
  Input,
  PageSkeleton,
  Separator,
  Textarea,
  ErrorState,
  useConfirm,
} from "@/shared/ui";
import { CustomFieldBuilder } from "@/modules/people/onboarding/components/custom-fields/custom-field-builder";
import { CustomFieldForm } from "@/modules/people/onboarding/components/custom-fields/custom-field-form";
import { DocumentConfigBuilder } from "@/modules/people/onboarding/components/documents/document-config-builder";
import {
  useCreateCustomFieldConfig,
  useCustomFieldConfigs,
  useDeleteCustomFieldConfig,
  useUpdateCustomFieldConfig,
} from "@/modules/people/onboarding/hooks/use-custom-field-configs";
import {
  useCreateDocumentConfig,
  useDeleteDocumentConfig,
  useDocumentConfigs,
  useUpdateDocumentConfig,
} from "@/modules/people/onboarding/hooks/use-document-configs";
import type {
  OnboardingCustomFieldConfig,
  OnboardingDocumentConfig,
} from "@/modules/people/onboarding/types/onboarding.types";
import {
  ONBOARDING_ALLOWED_FILE_TYPES,
  parseAllowedFileTypes,
  serializeAllowedFileTypes,
} from "@/modules/people/onboarding/constants/allowed-file-types";

export default function OnboardingSettingsPage() {
  const router = useRouter();
  const confirm = useConfirm();

  const { documents, loading: docsLoading, error: docsError, reload: reloadDocs } =
    useDocumentConfigs();
  const { fields, loading: fieldsLoading, error: fieldsError, reload: reloadFields } =
    useCustomFieldConfigs();

  const createDoc = useCreateDocumentConfig();
  const updateDoc = useUpdateDocumentConfig();
  const deleteDoc = useDeleteDocumentConfig();
  const createField = useCreateCustomFieldConfig();
  const updateField = useUpdateCustomFieldConfig();
  const deleteField = useDeleteCustomFieldConfig();

  const [docDialogOpen, setDocDialogOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<OnboardingDocumentConfig | null>(null);
  const [docName, setDocName] = useState("");
  const [docInstructions, setDocInstructions] = useState("");
  const [docFileTypes, setDocFileTypes] = useState<string[]>(["pdf", "jpg", "png"]);
  const [docRequired, setDocRequired] = useState(true);
  const [docErrors, setDocErrors] = useState<{ documentName?: string; allowedFileTypes?: string }>(
    {},
  );

  const [fieldDialogOpen, setFieldDialogOpen] = useState(false);
  const [editingField, setEditingField] = useState<OnboardingCustomFieldConfig | null>(null);
  const [fieldLabel, setFieldLabel] = useState("");
  const [fieldRequired, setFieldRequired] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ fieldLabel?: string }>({});

  const loading = docsLoading || fieldsLoading;
  const error = docsError || fieldsError;

  function resetDocForm() {
    setEditingDoc(null);
    setDocName("");
    setDocInstructions("");
    setDocFileTypes(["pdf", "jpg", "png"]);
    setDocRequired(true);
    setDocErrors({});
  }

  function openCreateDoc() {
    resetDocForm();
    setDocDialogOpen(true);
  }

  function openEditDoc(doc: OnboardingDocumentConfig) {
    setEditingDoc(doc);
    setDocName(doc.documentName);
    setDocInstructions(doc.instructions ?? "");
    setDocFileTypes(parseAllowedFileTypes(doc.allowedFileTypes));
    setDocRequired(doc.isRequired);
    setDocErrors({});
    setDocDialogOpen(true);
  }

  function submitDoc() {
    const next: typeof docErrors = {};
    if (!docName.trim()) next.documentName = "Document name is required.";
    if (docFileTypes.length === 0) next.allowedFileTypes = "Select at least one file type.";
    setDocErrors(next);
    if (Object.keys(next).length > 0) return;

    const payload = {
      documentName: docName.trim(),
      instructions: docInstructions.trim() || undefined,
      allowedFileTypes: serializeAllowedFileTypes(docFileTypes),
      isRequired: docRequired,
    };

    if (editingDoc) {
      updateDoc.mutate(
        { id: editingDoc.id, input: payload },
        {
          onSuccess: () => {
            toast.success("Document updated.");
            setDocDialogOpen(false);
            resetDocForm();
          },
          onError: (e) =>
            toast.error(e instanceof Error ? e.message : "Could not update the document."),
        },
      );
      return;
    }

    createDoc.mutate(payload, {
      onSuccess: () => {
        toast.success("Document added.");
        setDocDialogOpen(false);
        resetDocForm();
      },
      onError: (e) => toast.error(e instanceof Error ? e.message : "Could not add the document."),
    });
  }

  async function handleDeleteDoc(doc: OnboardingDocumentConfig) {
    const ok = await confirm({
      title: `Delete "${doc.documentName}"?`,
      description: "New hires will no longer be asked for this document.",
      confirmLabel: "Delete",
      cancelLabel: "Cancel",
      destructive: true,
    });
    if (!ok) return;
    deleteDoc.mutate(doc.id, {
      onSuccess: () => toast.success("Document deleted."),
      onError: (e) => toast.error(e instanceof Error ? e.message : "Could not delete the document."),
    });
  }

  function resetFieldForm() {
    setEditingField(null);
    setFieldLabel("");
    setFieldRequired(false);
    setFieldErrors({});
  }

  function openCreateField() {
    resetFieldForm();
    setFieldDialogOpen(true);
  }

  function openEditField(field: OnboardingCustomFieldConfig) {
    setEditingField(field);
    setFieldLabel(field.fieldLabel);
    setFieldRequired(field.isRequired);
    setFieldErrors({});
    setFieldDialogOpen(true);
  }

  function submitField() {
    const next: typeof fieldErrors = {};
    if (!fieldLabel.trim()) next.fieldLabel = "Field label is required.";
    setFieldErrors(next);
    if (Object.keys(next).length > 0) return;

    const payload = {
      fieldLabel: fieldLabel.trim(),
      isRequired: fieldRequired,
    };

    if (editingField) {
      updateField.mutate(
        { id: editingField.id, input: payload },
        {
          onSuccess: () => {
            toast.success("Custom field updated.");
            setFieldDialogOpen(false);
            resetFieldForm();
          },
          onError: (e) =>
            toast.error(e instanceof Error ? e.message : "Could not update the custom field."),
        },
      );
      return;
    }

    createField.mutate(payload, {
      onSuccess: () => {
        toast.success("Custom field added.");
        setFieldDialogOpen(false);
        resetFieldForm();
      },
      onError: (e) => toast.error(e instanceof Error ? e.message : "Could not add the custom field."),
    });
  }

  async function handleDeleteField(field: OnboardingCustomFieldConfig) {
    const ok = await confirm({
      title: `Delete "${field.fieldLabel}"?`,
      description: "New hires will no longer see this field during onboarding.",
      confirmLabel: "Delete",
      cancelLabel: "Cancel",
      destructive: true,
    });
    if (!ok) return;
    deleteField.mutate(field.id, {
      onSuccess: () => toast.success("Custom field deleted."),
      onError: (e) =>
        toast.error(e instanceof Error ? e.message : "Could not delete the custom field."),
    });
  }

  const docSaving = createDoc.isPending || updateDoc.isPending;
  const fieldSaving = createField.isPending || updateField.isPending;

  if (loading && documents.length === 0 && fields.length === 0) {
    return (
      <div>
        <PageHeader
          level="page"
          title="Onboarding settings"
          subtitle="Manage required documents and custom fields for new hires."
        />
        <PageSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <PageHeader
          level="page"
          title="Onboarding settings"
          subtitle="Manage required documents and custom fields for new hires."
        />
        <ErrorState
          message={error}
          onRetry={() => {
            void reloadDocs();
            void reloadFields();
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <nav className="text-xs text-[color:var(--text-tertiary)]" aria-label="Breadcrumb">
        <button
          onClick={() => router.push("/hr/directory/onboarding")}
          className="transition-colors hover:text-[color:var(--text-primary)]"
        >
          Onboarding
        </button>
        <span className="mx-1">›</span>
        <span className="text-[color:var(--text-secondary)]">Settings</span>
      </nav>

      <PageHeader
        level="page"
        title="Onboarding settings"
        subtitle="Manage required documents and custom fields for new hires."
        action={
          <Button variant="outline" onClick={() => router.push("/hr/directory/onboarding")}>
            <ArrowLeft aria-hidden="true" />
            Back to onboarding
          </Button>
        }
      />

      <div
        className="rounded-xl border border-[color:var(--border-primary)] bg-white"
        style={{ boxShadow: "var(--shadow-xs)" }}
      >
        <div className="flex items-center gap-2 px-6 pt-5 pb-4">
          <Settings2 className="h-4 w-4 text-[color:var(--text-tertiary)]" aria-hidden="true" />
          <p className="text-sm text-[color:var(--text-secondary)]">
            Changes apply to all new onboarding cases.
          </p>
        </div>
        <Separator />
        <DocumentConfigBuilder
          documents={documents}
          onAdd={openCreateDoc}
          onEdit={openEditDoc}
          onDelete={(doc) => void handleDeleteDoc(doc)}
          deletingId={deleteDoc.isPending ? deleteDoc.variables : null}
        />
      </div>

      <div
        className="rounded-xl border border-[color:var(--border-primary)] bg-white"
        style={{ boxShadow: "var(--shadow-xs)" }}
      >
        <CustomFieldBuilder
          fields={fields}
          onAdd={openCreateField}
          onEdit={openEditField}
          onDelete={(field) => void handleDeleteField(field)}
          deletingId={deleteField.isPending ? deleteField.variables : null}
        />
      </div>

      <Dialog
        open={docDialogOpen}
        onOpenChange={(open) => {
          if (docSaving) return;
          if (!open) resetDocForm();
          setDocDialogOpen(open);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingDoc ? "Edit document" : "Add document"}</DialogTitle>
            <DialogDescription>
              Define a document new hires must submit during onboarding.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <FormField
              label="Document name"
              htmlFor="doc-name"
              required
              error={docErrors.documentName}
            >
              <Input
                id="doc-name"
                value={docName}
                onChange={(e) => setDocName(e.target.value)}
                placeholder="e.g. NBI Clearance"
              />
            </FormField>
            <FormField label="Instructions" htmlFor="doc-instructions">
              <Textarea
                id="doc-instructions"
                value={docInstructions}
                onChange={(e) => setDocInstructions(e.target.value)}
                placeholder="Tell the employee what to upload."
                rows={3}
              />
            </FormField>
            <FormField
              label="Allowed file types"
              required
              error={docErrors.allowedFileTypes}
              hint="Choose which file types employees may upload for this document."
            >
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {ONBOARDING_ALLOWED_FILE_TYPES.map((option) => {
                  const checked = docFileTypes.includes(option.value);
                  return (
                    <label
                      key={option.value}
                      className="flex cursor-pointer items-center gap-2 rounded-md border border-[color:var(--border-primary)] px-3 py-2 text-sm"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(next) => {
                          setDocFileTypes((current) => {
                            if (next === true) {
                              return current.includes(option.value)
                                ? current
                                : [...current, option.value];
                            }
                            return current.filter((value) => value !== option.value);
                          });
                        }}
                      />
                      <span>{option.label}</span>
                    </label>
                  );
                })}
              </div>
            </FormField>
            <label className="flex items-center gap-2 text-sm text-[color:var(--text-secondary)]">
              <Checkbox
                checked={docRequired}
                onCheckedChange={(checked) => setDocRequired(checked === true)}
              />
              Required for onboarding completion
            </label>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDocDialogOpen(false)} disabled={docSaving}>
              Cancel
            </Button>
            <Button onClick={submitDoc} disabled={docSaving}>
              {docSaving ? "Saving…" : editingDoc ? "Save changes" : "Add document"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={fieldDialogOpen}
        onOpenChange={(open) => {
          if (fieldSaving) return;
          if (!open) resetFieldForm();
          setFieldDialogOpen(open);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingField ? "Edit custom field" : "Add custom field"}</DialogTitle>
            <DialogDescription>
              Add an extra question new hires answer during onboarding.
            </DialogDescription>
          </DialogHeader>
          <CustomFieldForm
            fieldLabel={fieldLabel}
            isRequired={fieldRequired}
            onFieldLabelChange={setFieldLabel}
            onIsRequiredChange={setFieldRequired}
            errors={fieldErrors}
          />
          <DialogFooter>
            <Button variant="secondary" onClick={() => setFieldDialogOpen(false)} disabled={fieldSaving}>
              Cancel
            </Button>
            <Button onClick={submitField} disabled={fieldSaving}>
              {fieldSaving ? "Saving…" : editingField ? "Save changes" : "Add field"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
