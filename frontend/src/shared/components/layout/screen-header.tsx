import type { ReactNode } from "react";
import { PageHeader } from "./page-header";
import { SCREEN_HEADERS, WORKSPACE_NAME } from "./nav-config";

/**
 * Renders a screen's content header from the single-source nav config: looks up
 * `SCREEN_HEADERS[id]`, interpolates `{workspaceName}`, and forwards to `PageHeader`.
 * Pass `action` for a right-aligned control (e.g. a primary button). Renders nothing
 * if the id has no header entry.
 */
export function ScreenHeader({
  id,
  level,
  action,
}: {
  id: string;
  level?: "default" | "page";
  action?: ReactNode;
}) {
  const copy = SCREEN_HEADERS[id];
  if (!copy) return null;
  return (
    <PageHeader
      title={copy.title}
      subtitle={copy.subtitle.replace("{workspaceName}", WORKSPACE_NAME)}
      level={level}
      action={action}
    />
  );
}
