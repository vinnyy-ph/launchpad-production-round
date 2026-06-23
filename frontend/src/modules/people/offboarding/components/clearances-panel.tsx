import { useState } from "react";
import { Pencil, Plus, ShieldCheck, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/shared/components/layout/page-header";
import {
  Badge,
  Button,
  PageSkeleton,
  Separator,
  ErrorState,
  useConfirm,
} from "@/shared/ui";
import { EmptyState } from "@/shared/ui/patterns";
import {
  useClearanceTemplates,
  useClearanceTemplateMutations,
} from "@/modules/people/offboarding";
import type {
  ClearanceTemplate,
  CreateClearanceTemplateInput,
} from "@/modules/people/offboarding";
import { ClearanceVersionDialog } from "@/modules/people/offboarding/components/clearance-version-dialog";

const SECTION_TITLE = "Clearance versions";
const SECTION_SUBTITLE = "Manage the signatory lists offboarding uses to build clearances.";

function signatoryName(p: { firstName: string; lastName: string }): string {
  return `${p.firstName} ${p.lastName}`.trim();
}

/**
 * Clearance-version management for the HR Configurations page — the named signatory lists
 * offboarding draws from. HR can create versions, edit their signatories, pick the default,
 * and delete unused ones. Renders as a section panel (no page-level chrome) so it can sit
 * under the Configurations › Clearances tab.
 */
export function ClearancesPanel() {
  const confirm = useConfirm();

  const { templates, loading, error, reload } = useClearanceTemplates();
  const { create, update, setDefault, remove } = useClearanceTemplateMutations();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ClearanceTemplate | null>(null);

  const saving = create.isPending || update.isPending;

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(template: ClearanceTemplate) {
    setEditing(template);
    setDialogOpen(true);
  }

  function handleSubmit(values: CreateClearanceTemplateInput) {
    if (editing) {
      update.mutate(
        { id: editing.id, input: { name: values.name, signatories: values.signatories } },
        {
          onSuccess: () => {
            toast.success("Clearance version updated.");
            setDialogOpen(false);
          },
          onError: (e) =>
            toast.error(e instanceof Error ? e.message : "Could not update the version."),
        },
      );
      return;
    }
    create.mutate(values, {
      onSuccess: () => {
        toast.success("Clearance version created.");
        setDialogOpen(false);
      },
      onError: (e) => toast.error(e instanceof Error ? e.message : "Could not create the version."),
    });
  }

  async function handleSetDefault(template: ClearanceTemplate) {
    try {
      await setDefault.mutateAsync(template.id);
      toast.success(`"${template.name}" is now the default version.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not set the default version.");
    }
  }

  async function handleDelete(template: ClearanceTemplate) {
    if (template.inUseCount > 0) {
      toast.error("This version is in use by an offboarding case and cannot be deleted.");
      return;
    }
    const ok = await confirm({
      title: `Delete "${template.name}"?`,
      description: "This clearance version will no longer be available for new offboarding cases.",
      confirmLabel: "Delete",
      cancelLabel: "Cancel",
      destructive: true,
    });
    if (!ok) return;
    try {
      await remove.mutateAsync(template.id);
      toast.success("Clearance version deleted.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not delete the version.");
    }
  }

  if (loading && templates.length === 0) {
    return (
      <div>
        <PageHeader level="default" title={SECTION_TITLE} subtitle={SECTION_SUBTITLE} />
        <PageSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <PageHeader level="default" title={SECTION_TITLE} subtitle={SECTION_SUBTITLE} />
        <ErrorState message={error} onRetry={() => void reload()} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        level="default"
        title={SECTION_TITLE}
        subtitle={SECTION_SUBTITLE}
        action={
          <Button onClick={openCreate}>
            <Plus aria-hidden="true" />
            New version
          </Button>
        }
      />

      {templates.length === 0 ? (
        <div
          className="rounded-xl border border-[color:var(--border-primary)] bg-white"
          style={{ boxShadow: "var(--shadow-xs)" }}
        >
          <EmptyState
            icon={ShieldCheck}
            title="No clearance versions yet"
            body="Create a version to define who signs off when an employee is offboarded."
            action={{ label: "New version", onClick: openCreate }}
          />
        </div>
      ) : (
        <div className="space-y-4">
          {templates.map((template) => (
            <div
              key={template.id}
              className="rounded-xl border border-[color:var(--border-primary)] bg-white"
              style={{ boxShadow: "var(--shadow-xs)" }}
            >
              <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-[color:var(--text-primary)]">
                    {template.name}
                  </h2>
                  {template.isDefault ? (
                    <Badge
                      variant="outline"
                      pill
                      className="border-[#B2DDFF] bg-[#EFF8FF] font-semibold text-[#175CD3]"
                    >
                      <Star className="mr-1 h-3 w-3 fill-current" aria-hidden="true" />
                      Default
                    </Badge>
                  ) : null}
                  <span className="text-xs text-[color:var(--text-tertiary)]">
                    {template.signatories.length} signator
                    {template.signatories.length === 1 ? "y" : "ies"}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {!template.isDefault ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void handleSetDefault(template)}
                      disabled={setDefault.isPending}
                    >
                      <Star className="h-3.5 w-3.5" />
                      Set as default
                    </Button>
                  ) : null}
                  <Button size="sm" variant="outline" onClick={() => openEdit(template)}>
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-[#FECDCA] text-[#B42318] hover:bg-[#FEF3F2]"
                    onClick={() => void handleDelete(template)}
                    disabled={remove.isPending || template.inUseCount > 0}
                    title={
                      template.inUseCount > 0
                        ? "In use by an offboarding case"
                        : undefined
                    }
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </Button>
                </div>
              </div>
              <Separator />
              <ol className="divide-y divide-[color:var(--border-primary)]">
                {template.signatories.map((signatory, index) => (
                  <li key={signatory.id} className="px-5 py-3">
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs font-bold text-[color:var(--text-tertiary)]">
                        {index + 1}.
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[color:var(--text-primary)]">
                          {signatory.purpose}
                        </p>
                        <p className="text-xs text-[color:var(--text-secondary)]">
                          {signatoryName(signatory.employee)}
                          {signatory.employee.jobTitle ? ` · ${signatory.employee.jobTitle}` : ""}
                        </p>
                        <p className="mt-0.5 text-xs text-[color:var(--text-tertiary)]">
                          {signatory.requirements}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      )}

      <ClearanceVersionDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
          setDialogOpen(open);
        }}
        template={editing}
        saving={saving}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
