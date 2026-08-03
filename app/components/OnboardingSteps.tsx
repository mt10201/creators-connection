type Step = {
  title: string;
  description: string;
};

type Props = {
  eyebrow?: string;
  steps: Step[];
};

/** For signed-in creators who haven't published anything yet. */
export const firstPostSteps: Step[] = [
  {
    title: "Share your work",
    description:
      "Add a few photos or a short clip, a title, and a product link. About a minute of work.",
  },
  {
    title: "Earn +1 for a new product link",
    description:
      "The first time you post a given product URL you earn +1 credit — not +5. Likes give the owner +1 and saves +2 (each capped per post). Credits are spendable after 24 hours.",
  },
  {
    title: "Get discovered",
    description:
      "Your post lands in Explore. You can post up to 10 products per day.",
  },
];

/** For visitors browsing an empty feed without an account. */
export const joinSteps: Step[] = [
  {
    title: "Create an account",
    description:
      "Sign up with email and a username — you get +5 credits once as a welcome bonus.",
  },
  {
    title: "Post something you made",
    description:
      "Photos or a short clip, a title, and a link. A new product URL earns +1 (you can post up to 10 per day).",
  },
  {
    title: "Earn more from engagement",
    description:
      "When others like your post you earn +1; when they save it you earn +2 (capped per post). Credits become spendable after 24 hours.",
  },
];

/** For the Saved page before anything has been kept. */
export const firstSaveSteps: Step[] = [
  {
    title: "Browse the feed",
    description:
      "Open Explore and follow whatever catches your eye — no account needed to look.",
  },
  {
    title: "Tap the star",
    description:
      "The ☆ on any product keeps a copy here. Nobody else sees what you save.",
  },
  {
    title: "Come back to it",
    description:
      "Your shelf stays put, so it's a good place to gather ideas before you post your own.",
  },
];

export default function OnboardingSteps({
  eyebrow = "How to get started",
  steps,
}: Props) {
  return (
    <div>
      <span className="eyebrow block text-center text-ink-faint">
        {eyebrow}
      </span>

      {/* An ordered list carries the sequence, so the numerals are decorative. */}
      <ol className="mt-7 grid gap-7 sm:grid-cols-3 sm:gap-6">
        {steps.map((step, index) => (
          <li key={step.title}>
            <span
              aria-hidden
              className="flex h-8 w-8 items-center justify-center rounded-full border border-clay bg-cream font-display text-sm font-semibold text-terracotta-deep"
            >
              {index + 1}
            </span>
            <p className="mt-3.5 font-display text-[1.05rem] font-semibold tracking-tight text-ink">
              {step.title}
            </p>
            <p className="mt-1.5 text-sm leading-[1.7] text-ink-muted">
              {step.description}
            </p>
          </li>
        ))}
      </ol>
    </div>
  );
}
