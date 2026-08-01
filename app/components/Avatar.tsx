import Image from "next/image";

type Size = "sm" | "md" | "lg";

const sizes: Record<Size, { box: string; text: string; px: number }> = {
  sm: { box: "h-8 w-8", text: "text-xs", px: 32 },
  md: { box: "h-10 w-10", text: "text-sm", px: 40 },
  lg: { box: "h-20 w-20", text: "text-2xl", px: 80 },
};

type Props = {
  name?: string | null;
  photoUrl?: string | null;
  size?: Size;
  className?: string;
};

/** Circular maker stamp: photo when available, otherwise a letter monogram. */
export default function Avatar({
  name,
  photoUrl,
  size = "md",
  className = "",
}: Props) {
  const { box, text, px } = sizes[size];
  const initial = (name?.trim().charAt(0) || "?").toUpperCase();

  if (photoUrl) {
    return (
      <span
        className={`relative inline-block shrink-0 overflow-hidden rounded-full border border-clay bg-parchment ${box} ${className}`}
      >
        <Image
          src={photoUrl}
          alt=""
          width={px}
          height={px}
          className="h-full w-full object-cover"
        />
      </span>
    );
  }

  return (
    <span
      aria-hidden
      className={`inline-flex shrink-0 items-center justify-center rounded-full border border-clay bg-terracotta-soft font-display font-semibold uppercase text-terracotta-deep ${box} ${text} ${className}`}
    >
      {initial}
    </span>
  );
}
