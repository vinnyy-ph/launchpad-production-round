import { redirect } from "next/navigation";

// The standalone profile page was replaced by the Settings modal (opened from the topbar
// account menu → "Settings"). This route redirects so stale links/bookmarks and any old
// notification deep links still land somewhere valid instead of 404-ing.
export default function EmployeeProfileRedirect() {
  redirect("/");
}
