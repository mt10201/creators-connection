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
    title: "Earn credits",
    description:
      "+1 the first time you post a given product URL, +1 when someone likes it, +2 when someone saves it (both capped). Full rules on How It Works.",
  },
  {
    title: "Get discovered",
    description: "Your post lands in Explore for the community to find.",
  },
];

/** For visitors browsing an empty feed without an account. */
export const joinSteps: Step[] = [
  {
    title: "Create an account",
    description: "Sign up with an email and a username. It takes a minute.",
  },
  {
    title: "Post something you made",
    description: "Photos or a short clip, a title, and a product link.",
  },
  {
    title: "Earn credits",
    description:
      "+1 the first time you post a given product URL, +1 per like, +2 per save (both capped). Full rules on How It Works.",
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
