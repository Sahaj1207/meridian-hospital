import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Register plugins once
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

export { gsap, ScrollTrigger };

/**
 * Standard utility to create a scoped GSAP context with automatic cleanup.
 * Prevents orphaned listeners and memory leaks.
 */
export function createGsapContext(
  scope: HTMLElement | React.RefObject<HTMLElement | null> | null,
  callback: () => void
) {
  if (!scope) return () => {};
  const target = 'current' in scope ? scope.current : scope;
  if (!target) return () => {};

  const ctx = gsap.context(callback, target);
  return () => ctx.revert();
}
