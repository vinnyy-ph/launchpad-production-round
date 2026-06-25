import { redirect } from "next/navigation";

// The employee-facing "Performance" hub now lives at /employee/surveys
// (my evaluations to acknowledge + my pulse surveys to answer). This legacy
// analytics route redirects there so stale links/bookmarks still land correctly.
export default function PerformanceRedirect() {
  redirect("/employee/surveys");
}
