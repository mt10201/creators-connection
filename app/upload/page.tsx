import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import UploadForm from "./UploadForm";

export const metadata: Metadata = {
  title: "Upload Product | Creators Connection",
  description: "Share your work with the Creators Connection community.",
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
