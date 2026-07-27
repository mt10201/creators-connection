import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { productCategories, type ProductCategory } from "@/lib/categories";
import EditForm, { type EditablePost } from "./EditForm";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return {
    title: "Edit Product | Creators Connection",
    description: `Edit your product post ${id}.`,
  };
}

function isProductCategory(value: string | null): value is ProductCategory {
  return Boolean(
    value && (productCategories as readonly string[]).includes(value)
  );
}

export default async function EditPostPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirectTo=/edit/${id}`);
  }

  const { data: post } = await supabase
    .from("posts")
    .select(
      "id, product_title, description, product_link, category, media_urls, media_paths, video_url, video_path, creator_id, status"
    )
    .eq("id", id)
    .maybeSingle();

  if (!post || post.status !== "active") {
    notFound();
  }

  if (post.creator_id !== user.id) {
    redirect(`/products/${id}`);
  }

  const category = isProductCategory(post.category)
    ? post.category
    : productCategories[0];

  const editable: EditablePost = {
    id: post.id,
    product_title: post.product_title?.trim() || "",
    description: post.description?.trim() || "",
    product_link: post.product_link?.trim() || "",
    category,
    media_urls: (post.media_urls ?? []).filter(Boolean),
    media_paths: ((post.media_paths ?? []) as string[]).filter(
      (path) => typeof path === "string"
    ),
    video_url: post.video_url,
    video_path: post.video_path,
  };

  // Align paths with urls if lengths differ (legacy rows).
  if (editable.media_paths.length < editable.media_urls.length) {
    editable.media_paths = editable.media_urls.map(
      (_, index) => editable.media_paths[index] ?? ""
    );
  }

  return <EditForm userId={user.id} post={editable} />;
}
