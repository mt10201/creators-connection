import { redirect } from "next/navigation";

/**
 * Saved products now live on the dashboard alongside your posts and likes.
 * This route stays so existing links and bookmarks still land in the right
 * place. Deliberately a temporary redirect: a 308 would be cached by browsers
 * long after this route could be repurposed.
 */
export default function SavedPage() {
  redirect("/dashboard?view=saved");
}
