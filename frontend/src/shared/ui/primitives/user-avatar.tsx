import type { CSSProperties } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "./avatar";
import { cn } from "@/shared/lib/utils";

/**
 * Muted on-brand tints for initials avatars. White initials read clearly on these (unlike the
 * light peach/pink pastels), and a deterministic pick gives each person a stable, distinct colour.
 */
const AVATAR_TINTS = [
  "var(--brand-peach-dark)", // terracotta
  "var(--brand-pink-dark)", // mauve
  "var(--brand-lilac-dark)", // purple
  "var(--brand-blue-dark)", // steel
] as const;

/** Stable hash → tint, so the same seed (a person's initials) always maps to one colour. */
function tintFor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_TINTS[hash % AVATAR_TINTS.length];
}

interface UserAvatarProps {
  /**
   * Profile picture URL (e.g. the signed-in account's Google photo). When absent — or when
   * the image fails to load — the `fallback` initials are shown as the default avatar.
   */
  src?: string | null;
  /** Initials (or short text) rendered as the default avatar when no image is available. */
  fallback: string;
  /** Sizing/shape classes for the avatar circle (e.g. "h-9 w-9", borders). */
  className?: string;
  /** Extra classes on the fallback (e.g. text size). White bold initials are applied by default. */
  fallbackClassName?: string;
  /**
   * Optional override for the fallback background. By default each person gets a deterministic
   * on-brand tint keyed off `fallback` — pass this only to deviate.
   */
  fallbackStyle?: CSSProperties;
  /** Accessible alt text; defaults to empty since the user's name is shown alongside. */
  alt?: string;
}

/**
 * A user avatar that shows a profile picture when one is available and gracefully falls back to an
 * initials "default avatar" otherwise. The initials sit on a deterministic muted-brand tint (one of
 * four), so people are visually distinguishable and the same person keeps the same colour.
 *
 * `referrerPolicy="no-referrer"` is set because Google-hosted photo URLs (lh3.googleusercontent.com)
 * can return 403 when a referrer header is sent.
 */
export function UserAvatar({
  src,
  fallback,
  className,
  fallbackClassName,
  fallbackStyle,
  alt = "",
}: UserAvatarProps) {
  return (
    <Avatar className={className}>
      {src ? <AvatarImage src={src} alt={alt} referrerPolicy="no-referrer" /> : null}
      <AvatarFallback
        className={cn("font-bold text-white", fallbackClassName)}
        style={{ background: tintFor(fallback), ...fallbackStyle }}
      >
        {fallback}
      </AvatarFallback>
    </Avatar>
  );
}
