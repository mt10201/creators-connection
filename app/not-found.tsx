import Link from "next/link";
import EmptyState from "./components/EmptyState";

export default function NotFound() {
  return (
    <div className="flex min-h-full items-center px-5 py-20 sm:px-8">
      <div className="mx-auto w-full max-w-2xl">
        <EmptyState
          eyebrow="404"
          title="This page has wandered off"
          description="The link may be old, or the work you're looking for was taken down. The feed is still full of things worth seeing."
        >
          <Link href="/explore" className="btn-primary">
            Start Exploring
          </Link>
          <Link href="/" className="btn-secondary">
            Back Home
          </Link>
        </EmptyState>
      </div>
    </div>
  );
}
