import type { CSSProperties } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "./avatar";

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
  /** Classes applied to the fallback content (text color, weight). */
  fallbackClassName?: string;
  /** Inline styles for the fallback — used to keep each caller's gradient background. */
  fallbackStyle?: CSSProperties;
  /** Accessible alt text; defaults to empty since the user's name is shown alongside. */
  alt?: string;
}

/**
 * A user avatar that shows a profile picture when one is available and gracefully falls back
 * to an initials "default avatar" otherwise. Built on the Radix Avatar primitive, so a missing
 * `src` or a failed image load both resolve to the fallback automatically.
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
      <AvatarFallback className={fallbackClassName} style={fallbackStyle}>
        {fallback}
      </AvatarFallback>
    </Avatar>
  );
}
