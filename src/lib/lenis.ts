import Lenis from 'lenis';
import { gsap } from './gsap';
import { ScrollTrigger } from './gsap';

export interface LenisInstanceOptions {
  autoRaf?: boolean;
}

/**
 * Initializes Lenis smooth scrolling and binds it cleanly to GSAP ScrollTrigger.
 * When reduced motion is enabled, returns null so the browser uses native instant scroll.
 */
export function initSmoothScroll(reducedMotion = false): {
  lenis: Lenis | null;
  destroy: () => void;
} {
  if (typeof window === 'undefined' || reducedMotion) {
    return {
      lenis: null,
      destroy: () => {}
    };
  }

  const lenis = new Lenis({
    duration: 1.05,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    orientation: 'vertical',
    gestureOrientation: 'vertical',
    smoothWheel: true,
    touchMultiplier: 1.5
  });

  // Synchronize Lenis scroll position with GSAP ScrollTrigger
  lenis.on('scroll', ScrollTrigger.update);

  const tickerCallback = (time: number) => {
    lenis.raf(time * 1000);
  };

  gsap.ticker.add(tickerCallback);
  gsap.ticker.lagSmoothing(0);

  return {
    lenis,
    destroy: () => {
      gsap.ticker.remove(tickerCallback);
      lenis.destroy();
    }
  };
}
