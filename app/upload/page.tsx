import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PRIVATE_PAGE_ROBOTS } from "@/lib/seo";
import UploadForm from "./UploadForm";

export const metadata: Metadata = {
  title: "Upload Product",
  description: "Share your work with the Creators Connection community.",
  robots: PRIVATE_PAGE_ROBOTS,
};

export default async function UploadPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // The proxy already guards this route; this is a second check so the page is
  // never rendered without a user id to attach the post to.
  if (!user) {
    redirect("/login?redirectTo=/upload");
  }

  return <UploadForm userId={user.id} />;
}
