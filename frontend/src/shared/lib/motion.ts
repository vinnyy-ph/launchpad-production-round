import type { Variants } from "framer-motion";

// Jia entrance motion — tiara's fade + stagger pattern, retuned to Jia's tokens:
// calm and quick (~400ms), a soft decelerating stop (ease-out-quint), no bounce,
// and a small fade-translate. The single source of truth for entrance animations;
// tweak the values here and every animated surface updates (like the .skeleton class).

// Jia --ease-out-quint: cubic-bezier(.22, 1, .36, 1) — decelerates hard, never overshoots.
const JIA_EASE = [0.22, 1, 0.36, 1] as [number, number, number, number];

/** Fade in while settling down a few px. Use on a single element, or as the child
 *  variant under `stagger`. Matches tiara's `fadeDown`, tuned to Jia (~400ms, -12px). */
export const fadeDown: Variants = {
  hidden: { opacity: 0, y: -12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: JIA_EASE } },
};

/** Parent orchestrator: reveals children one after another. Pair with `fadeDown`
 *  children. Jia-snappy 60ms steps so a list doesn't feel sluggish. */
export const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};
